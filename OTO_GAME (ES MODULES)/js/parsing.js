// ====================================================================
// ФАЙЛ: parsing.js (v7.5 — ПОЛНАЯ ОБРАБОТКА ВСЕХ ТИПОВ ДАННЫХ + ГАРАНТИЯ СТРОК В REQUIREMENTS)
// НАЗНАЧЕНИЕ: Единственный модуль парсинга ответов от ИИ. Гарантирует извлечение
//             данных даже из сильно повреждённых или обрезанных JSON-ответов.
// ИСТОРИЯ ИЗМЕНЕНИЙ:
//   v6.9 – базовая многоуровневая защита.
//   v7.0 – улучшенное извлечение массивов через ручной разбор + восстановление объектов.
//   v7.1 – финальный аудит и доработка (extractFieldFromBrokenObject, счётчик recovered).
//   v7.2 – улучшенная обработка aiMemory (любой тип → объект);
//          валидация difficulty_level (диапазон 1-10);
//          сбор нормализационных заметок (normalizationNotes) в parsing_info.
//   v7.3 – ПОЛНАЯ ОБРАБОТКА requirements (массив game_item):
//          * добавлена функция normalizeRequirement для приведения каждого требования
//            к объекту с полем id (если строка – преобразуется в объект { id }); [ЭТО БЫЛО ИЗМЕНЕНО В v7.4]
//   v7.4 – ИСПРАВЛЕНИЕ СОВМЕСТИМОСТИ: normalizeRequirement больше НЕ преобразует строки в объекты,
//          а оставляет их строками, если они пришли как строки. Объекты проходят проверку на наличие id.
//   v7.5 – ГАРАНТИЯ СТРОК В REQUIREMENTS: normalizeRequirement теперь преобразует любые объекты
//          в строку, извлекая поле id (если есть), иначе отбрасывает. Таким образом, итоговый
//          массив requirements всегда состоит только из строк. Добавлена защита в checkRequirements,
//          но основное исправление на стороне парсера.
// ====================================================================

'use strict';

import { CONFIG } from './1-config.js';
import { log, LOG_CATEGORIES } from './logger.js';

/**
 * @typedef {Object} ParsingInfo
 * @property {string} status - 'OK' | 'WARN' | 'ERROR' — итоговый статус парсинга.
 * @property {string} approach - Какой уровень парсинга сработал (standard_json_parse, truncated_repair, aggressive_multi_level).
 * @property {Object} knownFieldErrors - Детальная информация об ошибках по полям (ключ -> описание ошибки).
 * @property {number} extractedOperationsCount - Сколько операций (success_rewards, fail_penalties, effects) извлечено суммарно.
 * @property {string} rawResponseText - Исходный сырой текст ответа (если был строкой).
 * @property {string[]} parsingSteps - Пошаговая история выполнения (для отладки).
 * @property {string} choicesCount - Статистика choices в формате "успешно/всего_найдено".
 * @property {string} eventsCount - Статистика events в формате "успешно/всего_найдено".
 * @property {number} thoughtsCount - Количество мыслей.
 * @property {number} recoveredCount - Количество объектов, восстановленных из повреждённых.
 * @property {string[]} normalizationNotes - Заметки о корректировках, внесённых в процессе нормализации.
 * @property {number} durationMs - Время выполнения в миллисекундах.
 */

// ============================================================================
// ГЛОБАЛЬНЫЕ НАСТРОЙКИ И DEBUG-РЕЖИМ
// ============================================================================

/** @type {boolean} Глобальный флаг детальной отладки парсера (сохраняется в localStorage). */
let DEBUG_MODE = localStorage.getItem('parser_debug') === 'true';

/**
 * Переключает режим отладки парсера.
 * Вызывать из консоли браузера: window.toggleParserDebug(true)
 * @param {boolean} enable - true для включения подробного логирования, false для отключения.
 */
window.toggleParserDebug = (enable) => {
    DEBUG_MODE = !!enable;
    localStorage.setItem('parser_debug', enable.toString());
    console.log(`🛠️ [Parser v7.5] DEBUG_MODE = ${DEBUG_MODE}`);
    if (DEBUG_MODE) console.log('📋 Теперь каждый шаг парсинга будет логироваться в консоль (группами).');
};

// ============================================================================
// DEBUG-БУФЕР + ИНТЕГРАЦИЯ С ОСНОВНЫМ ЛОГГЕРОМ (категория PARSING)
// ============================================================================
const debugBuffer = [];

/**
 * Добавляет сообщение в отладочный буфер и одновременно в основной логгер с категорией PARSING.
 * @param {string} message - Текст сообщения.
 * @param {Object} [data] - Дополнительные данные (будут переданы в log.debug).
 */
function debugLog(message, data = null) {
    debugBuffer.push(message);
    log.debug(LOG_CATEGORIES.PARSING, message, data);
}

/**
 * Выводит содержимое отладочного буфера в консоль (свёрнутой группой) и очищает буфер.
 * Вызывается только если включён DEBUG_MODE и есть сообщения.
 * @param {ParsingInfo} info - Объект parsing_info, используется для заголовка группы.
 */
function flushDebugBuffer(info) {
    if (!DEBUG_MODE || debugBuffer.length === 0) return;
    console.groupCollapsed(`🧪 [PARSER v7.5 DEBUG] ${info.approach} | ${info.extractedOperationsCount} ops | ${info.durationMs}ms | recovered: ${info.recoveredCount || 0}`);
    debugBuffer.forEach(line => console.log(line));
    console.groupEnd();
    debugBuffer.length = 0;
}

// ============================================================================
// КЭШ РЕГУЛЯРНЫХ ВЫРАЖЕНИЙ (для производительности)
// ============================================================================
const REGEX_CACHE = Object.freeze({
    scene: /"scene"\s*:\s*"((?:[^"\\]|\\.)*)"/s,
    reflection: /"reflection"\s*:\s*"((?:[^"\\]|\\.)*)"/s,
    typology: /"typology"\s*:\s*"((?:[^"\\]|\\.)*)"/s,
    personality: /"personality"\s*:\s*"((?:[^"\\]|\\.)*)"/s,
    summary: /"summary"\s*:\s*"((?:[^"\\]|\\.)*)"/s,
    design_notes: /"design_notes"\s*:\s*"((?:[^"\\]|\\.)*)"/s,
    choicesArray: /"choices"\s*:\s*\[([\s\S]*?)\](?=,|\s*}|$)/i,
    eventsArray: /"events"\s*:\s*\[([\s\S]*?)\](?=,|\s*}|$)/i,
    thoughtsArray: /"thoughts"\s*:\s*\[([\s\S]*?)\](?=,|\s*}|$)/i,
    aiMemory: /"(?:aiMemory|ai_memory|aimemory)"\s*:\s*(\{[\s\S]*?\}|\[[\s\S]*?\]|"[^"]*")/i
});

// ============================================================================
// ПРЕДОБРАБОТКА JSON (ДЛЯ СТРОК)
// ============================================================================

/**
 * Предварительная обработка JSON-строки: удаляет markdown-обёртки ```json,
 * экранирует реальные переносы строк внутри строк, удаляет висячие запятые.
 * Это первый шаг перед попыткой стандартного JSON.parse.
 * @param {string} jsonText - Сырой текст ответа (может быть с обёртками).
 * @returns {string} Обработанный текст, готовый к парсингу.
 */
function preprocessJson(jsonText) {
    debugLog('🔧 preprocessJson: НАЧАЛО', { originalLength: jsonText?.length });

    // Если входные данные не строка или пустые — возвращаем как есть.
    if (!jsonText || typeof jsonText !== 'string') {
        debugLog('⚠️ preprocessJson: входные данные не строка — возвращаем без изменений');
        return jsonText;
    }

    // Удаляем обрамление ```json в начале и конце (если есть).
    let result = jsonText.trim()
        .replace(/^```json\s*/i, '')
        .replace(/\s*```$/i, '');

    debugLog('📝 preprocessJson: удалены обёртки ```json');

    // Экранируем реальные переносы строк ВНУТРИ строк (они должны быть представлены как \n).
    let inString = false;
    let escapeNext = false;
    let fixed = '';

    for (let i = 0; i < result.length; i++) {
        const char = result[i];

        // Обработка escape-последовательностей
        if (escapeNext) {
            fixed += char;
            escapeNext = false;
            continue;
        }
        if (char === '\\') {
            escapeNext = true;
            fixed += char;
            continue;
        }
        // Переключение состояния "внутри строки"
        if (char === '"') {
            inString = !inString;
            fixed += char;
            continue;
        }

        if (inString) {
            // Внутри строки заменяем реальные переводы строк на экранированные.
            if (char === '\n') {
                fixed += '\\n';
                debugLog(`   → экранирован \\n на позиции ${i}`);
            } else if (char === '\r') {
                fixed += '\\r';
            } else {
                fixed += char;
            }
        } else {
            fixed += char;
        }
    }

    debugLog('✅ preprocessJson: экранированы переносы строк');

    // Удаляем висячие запятые перед закрывающими скобками (например: "field": "value",] → "field": "value"]).
    fixed = fixed.replace(/,\s*([}\]])/g, '$1');
    debugLog('✅ preprocessJson: удалены висячие запятые');

    return fixed;
}

/**
 * Балансирует скобки и удаляет висячие запятые — резервный ремонт обрезанного JSON.
 * Применяется, когда стандартный JSON.parse не удался из-за незакрытых строк или скобок.
 * @param {string} str - Сырой текст от ИИ (может быть обрезан).
 * @returns {string} Исправленный текст, который должен стать валидным JSON.
 */
function balanceBrackets(str) {
    debugLog('🔧 balanceBrackets: НАЧАЛО');
    let result = str.trim()
        .replace(/^```json\s*/i, '')
        .replace(/\s*```$/i, '');

    // ШАГ 1: закрываем незакрытую строку (если кавычка открыта, а закрывающая отсутствует).
    let inString = false, escape = false;
    for (let i = 0; i < result.length; i++) {
        const ch = result[i];
        if (escape) { escape = false; continue; }
        if (ch === '\\') { escape = true; continue; }
        if (ch === '"') inString = !inString;
    }
    if (inString) result += '"'; // добавляем закрывающую кавычку

    // ШАГ 2: удаляем висячие запятые (аналогично preprocessJson).
    result = result.replace(/,\s*([}\]])/g, '$1');

    // ШАГ 3: считаем и добавляем недостающие скобки (фигурные и квадратные).
    let openCurly = 0, closeCurly = 0, openSquare = 0, closeSquare = 0;
    inString = false; escape = false;
    for (let i = 0; i < result.length; i++) {
        const ch = result[i];
        if (escape) { escape = false; continue; }
        if (ch === '\\') { escape = true; continue; }
        if (ch === '"') { inString = !inString; continue; }
        if (!inString) {
            if (ch === '{') openCurly++;
            if (ch === '}') closeCurly++;
            if (ch === '[') openSquare++;
            if (ch === ']') closeSquare++;
        }
    }
    // Добавляем недостающие закрывающие скобки в конец.
    if (openSquare > closeSquare) result += ']'.repeat(openSquare - closeSquare);
    if (openCurly > closeCurly) result += '}'.repeat(openCurly - closeCurly);

    debugLog('✅ balanceBrackets: завершено');
    return result;
}

// ============================================================================
// ФУНКЦИИ ДЛЯ ИЗВЛЕЧЕНИЯ МАССИВОВ (v7.0+)
// ============================================================================

/**
 * Извлекает все top-level объекты (не вложенные) из текста, который представляет собой массив.
 * Функция вручную обходит строку, учитывая escape-последовательности и вложенность,
 * чтобы корректно выделить каждый объект даже в сильно повреждённом массиве.
 * @param {string} text - Фрагмент текста, предположительно начинающийся с '[' и заканчивающийся ']'.
 * @returns {string[]} Массив строк, каждая из которых должна быть отдельным JSON-объектом.
 */
function extractTopLevelObjects(text) {
    debugLog('🔍 extractTopLevelObjects: начало', { textLength: text.length });
    const objects = [];
    let i = 0;
    const len = text.length;

    // Пропускаем всё до открывающей квадратной скобки (должна быть, но на всякий случай ищем).
    while (i < len && text[i] !== '[') i++;
    if (i >= len) {
        debugLog('⚠️ extractTopLevelObjects: не найдена открывающая скобка массива');
        return objects;
    }
    i++; // переходим за '['

    let inString = false;      // флаг нахождения внутри строки (в кавычках)
    let escape = false;        // флаг экранирования следующего символа
    let braceDepth = 0;        // текущая глубина вложенности фигурных скобок
    let currentStart = -1;     // индекс начала текущего объекта

    while (i < len) {
        const ch = text[i];

        // Обработка escape-последовательностей: если предыдущий символ был '\', то этот символ не управляющий.
        if (escape) {
            escape = false;
            i++;
            continue;
        }

        if (ch === '\\') {
            escape = true;
            i++;
            continue;
        }

        // Переключение состояния строки при встрече неэкранированной кавычки.
        if (ch === '"') {
            inString = !inString;
            i++;
            continue;
        }

        // Если мы не внутри строки, анализируем фигурные скобки.
        if (!inString) {
            if (ch === '{') {
                if (braceDepth === 0) {
                    currentStart = i; // начало нового объекта
                }
                braceDepth++;
            } else if (ch === '}') {
                braceDepth--;
                if (braceDepth === 0 && currentStart !== -1) {
                    // Найден полный объект: от currentStart до текущей позиции включительно.
                    const objStr = text.substring(currentStart, i + 1);
                    objects.push(objStr);
                    debugLog(`   → найден объект #${objects.length}, длина ${objStr.length}`);
                    currentStart = -1;
                }
            } else if (ch === ']' && braceDepth === 0) {
                // Достигнут конец массива, выходим.
                break;
            }
        }
        i++;
    }

    debugLog(`📊 extractTopLevelObjects: извлечено ${objects.length} объектов`);
    return objects;
}

/**
 * Улучшенная функция извлечения строкового поля из повреждённого объекта.
 * Использует регулярное выражение для поиска поля и корректно обрабатывает экранированные кавычки.
 * @param {string} text - Фрагмент, предположительно содержащий объект.
 * @param {string} fieldName - Имя поля (например, "text" или "description").
 * @returns {string|null} Значение поля (уже разэкранированное) или null, если поле не найдено.
 */
function extractFieldFromBrokenObject(text, fieldName) {
    debugLog(`🔍 extractFieldFromBrokenObject: ищем "${fieldName}"`);
    try {
        // Строим регулярное выражение для поиска поля с учётом возможных пробелов.
        // Используем модификатор s, чтобы точка захватывала переводы строк.
        const fieldRegex = new RegExp(`"${fieldName}"\\s*:\\s*"((?:[^"\\\\]|\\\\.)*)"`, 's');
        const match = fieldRegex.exec(text);
        if (match) {
            // Извлечённое значение содержит escape-последовательности (например, \", \\). Преобразуем их.
            let value = match[1];
            // Заменяем экранированные кавычки на обычные, двойной слеш на одинарный.
            value = value.replace(/\\"/g, '"').replace(/\\\\/g, '\\');
            debugLog(`   → извлечено: "${value.substring(0, 50)}..."`);
            return value;
        } else {
            debugLog(`   → поле "${fieldName}" не найдено`);
        }
    } catch (e) {
        debugLog(`⚠️ Ошибка извлечения поля ${fieldName}: ${e.message}`);
    }
    return null;
}

/**
 * Пытается извлечь числовое поле difficulty_level из повреждённого объекта.
 * @param {string} text - Фрагмент объекта.
 * @returns {number} Значение difficulty_level или 5 по умолчанию.
 */
function extractDifficultyFromBrokenObject(text) {
    try {
        const regex = /"difficulty_level"\s*:\s*(\d+)/i;
        const match = regex.exec(text);
        if (match) {
            const val = parseInt(match[1], 10);
            return isNaN(val) ? 5 : val;
        }
    } catch (e) {}
    return 5;
}

/**
 * Пытается извлечь массив requirements из повреждённого объекта.
 * @param {string} text - Фрагмент объекта.
 * @returns {Array} Массив требований (может быть пустым). Сохраняет исходный тип элементов (строки или объекты).
 */
function extractRequirementsFromBrokenObject(text) {
    debugLog('🔍 extractRequirementsFromBrokenObject: попытка извлечь массив requirements');
    try {
        // Ищем массив requirements: ["...", "..."] или [{...}, {...}]
        const regex = /"requirements"\s*:\s*(\[[\s\S]*?\])/i;
        const match = regex.exec(text);
        if (match) {
            const arrayStr = match[1];
            // Пробуем распарсить как JSON-массив
            const parsed = JSON.parse(arrayStr);
            if (Array.isArray(parsed)) {
                debugLog(`   → извлечён массив requirements длиной ${parsed.length}`);
                return parsed;
            }
        }
    } catch (e) {
        debugLog(`⚠️ Не удалось распарсить requirements: ${e.message}`);
    }
    return [];
}

/**
 * Извлекает массив (choices или events) с поэлементным разбором и восстановлением повреждённых объектов.
 * @param {string} text - Полный текст ответа.
 * @param {string} key - 'choices' или 'events'.
 * @returns {{items: Array, stats: string, recovered: number}} 
 *          items - массив извлечённых/восстановленных объектов,
 *          stats - строка статистики "успешно/всего_найдено",
 *          recovered - количество восстановленных объектов.
 */
function extractArrayWithStats(text, key) {
    debugLog(`📍 extractArrayWithStats v7.5: извлекаем "${key}"`);
    const regex = REGEX_CACHE[`${key}Array`];
    const match = regex.exec(text);
    if (!match) {
        debugLog(`   → массив "${key}" не найден`);
        return { items: [], stats: '0/0', recovered: 0 };
    }

    // Получаем фрагмент содержимого массива (между [ и ]) — это может быть обрезано.
    let content = match[1];
    // Оборачиваем в квадратные скобки для балансировки и последующего ручного разбора.
    content = balanceBrackets(`[${content}]`);

    // Извлекаем отдельные объекты (как строки).
    const objectStrings = extractTopLevelObjects(content);
    const totalFound = objectStrings.length;
    const items = [];
    let recoveredCount = 0;

    for (let idx = 0; idx < objectStrings.length; idx++) {
        const objStr = objectStrings[idx];
        try {
            // Пробуем распарсить объект стандартным способом.
            const obj = JSON.parse(objStr);
            items.push(obj);
            debugLog(`   → объект ${key}[${idx}] успешно распарсен`);
        } catch (parseErr) {
            debugLog(`   → объект ${key}[${idx}] повреждён: ${parseErr.message}. Пытаемся восстановить...`);

            // Попытка восстановить объект, извлекая минимально необходимые поля.
            let recovered = null;
            if (key === 'choices') {
                const textField = extractFieldFromBrokenObject(objStr, 'text');
                const difficulty = extractDifficultyFromBrokenObject(objStr);
                // Извлекаем requirements (может быть массивом строк или объектов)
                const requirements = extractRequirementsFromBrokenObject(objStr);
                if (textField) {
                    recovered = {
                        text: textField,
                        difficulty_level: difficulty,
                        requirements: requirements, // сохраняем как есть (строки/объекты) — дальше normalizeRequirement приведёт к строкам
                        success_rewards: [],
                        fail_penalties: []
                    };
                    debugLog(`   → восстановлен choice с текстом: "${textField.substring(0, 50)}..."`);
                    recoveredCount++;
                } else {
                    // Если даже текст не удалось извлечь — создаём заглушку.
                    recovered = {
                        text: `Повреждённый выбор #${idx + 1}`,
                        difficulty_level: 5,
                        requirements: [],
                        success_rewards: [],
                        fail_penalties: []
                    };
                    debugLog(`   → создана заглушка для choice (не удалось извлечь текст)`);
                    recoveredCount++;
                }
            } else if (key === 'events') {
                const descField = extractFieldFromBrokenObject(objStr, 'description');
                const typeField = extractFieldFromBrokenObject(objStr, 'type');
                const reasonField = extractFieldFromBrokenObject(objStr, 'reason');
                if (descField) {
                    recovered = {
                        type: typeField || 'world_event',
                        description: descField,
                        effects: [], // вложенный массив effects при повреждении пуст
                        reason: reasonField || ''
                    };
                    debugLog(`   → восстановлено событие с description: "${descField.substring(0, 50)}..."`);
                    recoveredCount++;
                } else {
                    recovered = {
                        type: 'world_event',
                        description: `Повреждённое событие #${idx + 1}`,
                        effects: [],
                        reason: ''
                    };
                    debugLog(`   → создана заглушка для события (не удалось извлечь description)`);
                    recoveredCount++;
                }
            }

            if (recovered) {
                items.push(recovered);
            } else {
                debugLog(`   → объект ${key}[${idx}] не удалось восстановить, пропускаем`);
            }
        }
    }

    debugLog(`   → извлечено ${items.length} объектов из ${totalFound} найденных (восстановлено: ${recoveredCount})`);
    return { items, stats: `${items.length}/${totalFound}`, recovered: recoveredCount };
}

// ============================================================================
// ИЗВЛЕЧЕНИЕ КОРНЕВЫХ ПОЛЕЙ (для агрессивного режима)
// ============================================================================

/**
 * Универсальное извлечение любого корневого поля (scene, reflection, typology и т.д.).
 * Работает путём поиска ключа и последующего захвата значения с учётом вложенности.
 * @param {string} text - Текст ответа.
 * @param {string} key - Имя поля (регистронезависимо).
 * @returns {any} Значение поля (может быть строкой, объектом, массивом) или null, если поле не найдено.
 */
function extractRootField(text, key) {
    debugLog(`📍 extractRootField: ищем "${key}"`);
    const regex = new RegExp(`"${key}"\\s*:\\s*`, 'i');
    const match = regex.exec(text);
    if (!match) {
        debugLog(`   → поле "${key}" не найдено`);
        return null;
    }

    let pos = match.index + match[0].length;
    // Пропускаем пробелы после двоеточия.
    while (pos < text.length && /\s/.test(text[pos])) pos++;

    const firstChar = text[pos];
    // Если значение начинается с '{' или '[' — это сложная структура.
    if (firstChar === '{' || firstChar === '[') {
        let count = 1;
        let inStr = false, escape = false;
        let end = pos + 1;
        while (end < text.length) {
            const ch = text[end];
            if (escape) { escape = false; }
            else if (ch === '\\') escape = true;
            else if (ch === '"') inStr = !inStr;
            else if (!inStr) {
                if (ch === (firstChar === '{' ? '}' : ']')) { count--; if (count === 0) break; }
                if (ch === firstChar) count++;
            }
            end++;
        }
        const fragment = text.substring(pos, end + 1);
        try { 
            const result = JSON.parse(fragment);
            debugLog(`   → поле "${key}" успешно извлечено (объект/массив)`);
            return result;
        } catch { 
            debugLog(`   → поле "${key}" извлечено как строка (не удалось распарсить)`);
            return fragment; 
        }
    }

    // Иначе значение — примитив (число, буль, null, строка).
    const primitiveMatch = text.slice(pos).match(/^(true|false|null|-?\d+(\.\d+)?([eE][+-]?\d+)?|"((?:[^"\\]|\\.)*)")/);
    if (primitiveMatch) {
        try { 
            const result = JSON.parse(primitiveMatch[0]);
            debugLog(`   → поле "${key}" успешно извлечено (примитив)`);
            return result;
        } catch { 
            debugLog(`   → поле "${key}" извлечено как строка`);
            return primitiveMatch[0]; 
        }
    }
    debugLog(`   → поле "${key}" не удалось извлечь`);
    return null;
}

// ============================================================================
// НОРМАЛИЗАЦИЯ (с полной защитой от undefined) — v7.5 с гарантией строк в requirements
// ============================================================================

/**
 * Нормализует один элемент requirements (game_item).
 * В v7.5 гарантируется, что результатом будет строка (или null).
 * - Если элемент — строка, возвращается строка (после trim).
 * - Если элемент — объект, пытаемся извлечь поле id как строку, иначе отбрасываем.
 * - Прочие типы отбрасываются.
 * @param {any} req - Сырое требование.
 * @returns {string|null} Нормализованное требование (строка) или null.
 */
function normalizeRequirement(req) {
    debugLog(`🔧 normalizeRequirement: обработка`, req);
    try {
        if (!req) return null;
        
        // Если строка — возвращаем строку (после trim)
        if (typeof req === 'string') {
            const trimmed = req.trim();
            if (trimmed) {
                debugLog(`   → строка: "${trimmed}"`);
                return trimmed;
            }
            return null;
        }
        
        // Если объект — пытаемся извлечь id как строку
        if (typeof req === 'object' && req !== null) {
            if (req.id && typeof req.id === 'string') {
                const id = req.id.trim();
                if (id) {
                    debugLog(`   → объект преобразован в строку по id: "${id}"`);
                    return id;
                }
            }
            // Если нет id, пробуем другие поля? Пока отбрасываем.
            debugLog(`   → объект не содержит строкового id, отбрасываем`);
            return null;
        }
        
        // Прочие типы — игнорируем
        debugLog(`   → не строка и не объект, отбрасываем`);
        return null;
    } catch (e) {
        debugLog(`❌ Ошибка normalizeRequirement: ${e.message}`);
        return null;
    }
}

/**
 * Нормализует одну операцию (success_reward, fail_penalty, effect).
 * Проверяет наличие обязательных полей, приводит типы, фильтрует некорректные.
 * @param {Object} op - Сырая операция от ИИ.
 * @returns {Object|null} Нормализованная операция или null, если операция невалидна.
 */
function normalizeOperation(op) {
    debugLog(`🔧 normalizeOperation: обработка ${op?.id || 'unknown'}`);
    try {
        // Операция должна быть объектом и иметь поле id.
        if (!op || typeof op !== 'object' || !op.id) {
            debugLog('[normalizeOperation] Отклонена: нет объекта или id');
            return null;
        }

        const norm = { ...op };

        // Приводим id к нижнему регистру, заменяем пробелы на подчёркивания.
        norm.id = String(norm.id).toLowerCase().replace(/\s+/g, '_');

        // Приводим operation к верхнему регистру.
        if (typeof norm.operation === 'string') {
            norm.operation = norm.operation.toUpperCase().trim();
        }

        // delta и duration должны быть числами.
        if (norm.delta !== undefined) norm.delta = Number(norm.delta) || 0;
        if (norm.duration !== undefined) norm.duration = Math.max(1, Number(norm.duration) || 1);

        // description — строка.
        norm.description = norm.description ? String(norm.description).trim() : '';

        // Валидация: id должен содержать двоеточие (категория:имя). Если нет — предупреждаем, но не отбрасываем.
        if (!norm.id.includes(':')) {
            debugLog(`[normalizeOperation] Предупреждение: id="${norm.id}" не содержит ":" — операция может быть некорректной, но оставляем.`);
        }

        debugLog(`[normalizeOperation] ${norm.id} → ${norm.operation || '(без типа)'}`);
        return norm;
    } catch (e) {
        debugLog(`❌ Ошибка normalizeOperation: ${e.message}`);
        return null;
    }
}

/**
 * Нормализует choice и все операции внутри него, включая requirements.
 * @param {Object} choice - Сырой объект choice.
 * @param {number} index - Индекс в массиве (для логирования).
 * @param {ParsingInfo} [info] - Объект для сбора нормализационных заметок (опционально).
 * @returns {Object|null} Нормализованный choice или null, если choice невалиден.
 */
function normalizeChoice(choice, index, info = null) {
    debugLog(`📌 normalizeChoice[${index}]`);
    try {
        // Минимальное требование: наличие текста.
        if (!choice || typeof choice.text !== 'string' || !choice.text.trim()) {
            debugLog(`[normalizeChoice] Выбор ${index} пропущен — нет текста`);
            return null;
        }

        // Приводим difficulty_level к числу и ограничиваем диапазоном 1–10.
        let difficulty = Number(choice.difficulty_level);
        if (isNaN(difficulty) || difficulty < 1 || difficulty > 10) {
            const original = difficulty;
            difficulty = Math.min(10, Math.max(1, difficulty || 5));
            if (info) {
                info.normalizationNotes.push(`choice[${index}].difficulty_level скорректирован с ${original} на ${difficulty} (допустимый диапазон 1-10)`);
            }
            debugLog(`   → difficulty_level скорректирован с ${original} на ${difficulty}`);
        }

        const norm = {
            text: choice.text.trim(),
            difficulty_level: difficulty,
            // Вложенный массив requirements: каждый элемент нормализуем через normalizeRequirement,
            // который теперь гарантированно возвращает строку или null. Фильтруем null.
            requirements: Array.isArray(choice.requirements)
                ? choice.requirements.map(normalizeRequirement).filter(Boolean)
                : [],
            // Вложенный массив success_rewards: каждый элемент пропускаем через normalizeOperation
            success_rewards: Array.isArray(choice.success_rewards)
                ? choice.success_rewards.map(normalizeOperation).filter(Boolean)
                : [],
            // Вложенный массив fail_penalties: аналогично
            fail_penalties: Array.isArray(choice.fail_penalties)
                ? choice.fail_penalties.map(normalizeOperation).filter(Boolean)
                : []
        };

        debugLog(`[normalizeChoice] Выбор ${index}: "${norm.text.substring(0, 60)}..."`);
        return norm;
    } catch (e) {
        debugLog(`❌ Ошибка normalizeChoice[${index}]: ${e.message}`);
        return null;
    }
}

/**
 * Нормализует event и все effects внутри него.
 * @param {Object} event - Сырой объект event.
 * @param {number} index - Индекс в массиве (для логирования).
 * @param {ParsingInfo} [info] - Объект для сбора нормализационных заметок (опционально).
 * @returns {Object|null} Нормализованный event или null, если event невалиден.
 */
function normalizeEvent(event, index, info = null) {
    debugLog(`📌 normalizeEvent[${index}]`);
    try {
        // Минимальное требование: наличие description.
        if (!event || typeof event.description !== 'string' || !event.description.trim()) {
            debugLog(`[normalizeEvent] Событие ${index} пропущено — нет description`);
            return null;
        }

        const norm = {
            type: String(event.type || 'world_event').toLowerCase(),
            description: event.description.trim(),
            // Вложенный массив effects: обрабатываем каждый элемент
            effects: Array.isArray(event.effects)
                ? event.effects.map(normalizeOperation).filter(Boolean)
                : [],
            reason: String(event.reason || '').trim()
        };

        debugLog(`[normalizeEvent] Событие ${index} (${norm.type})`);
        return norm;
    } catch (e) {
        debugLog(`❌ Ошибка normalizeEvent[${index}]: ${e.message}`);
        return null;
    }
}

/**
 * Нормализует уже распарсенный объект (применяет все необходимые преобразования).
 * Вызывается после успешного JSON.parse или после агрессивного извлечения.
 * @param {Object} parsedData - Объект, полученный из JSON.parse (или частично заполненный).
 * @param {ParsingInfo} [info] - Объект для сбора нормализационных заметок (опционально).
 * @returns {Object} Нормализованный объект с гарантированными полями.
 */
function normalizeParsedObject(parsedData, info = null) {
    debugLog('🔧 normalizeParsedObject: начало нормализации');
    const result = { ...parsedData };

    // Гарантируем, что поля-массивы существуют.
    result.choices = Array.isArray(result.choices) ? result.choices : [];
    result.events = Array.isArray(result.events) ? result.events : [];
    result.thoughts = Array.isArray(result.thoughts) ? result.thoughts : [];

    // --- УЛУЧШЕННАЯ ОБРАБОТКА aiMemory (v7.2) ---
    // aiMemory может быть объектом, массивом или строкой. Мы должны привести к объекту.
    if (result.aiMemory !== undefined && result.aiMemory !== null) {
        const originalType = typeof result.aiMemory;
        const isArray = Array.isArray(result.aiMemory);
        
        // Если это строка, похожая на JSON, пробуем распарсить.
        if (typeof result.aiMemory === 'string') {
            const trimmed = result.aiMemory.trim();
            if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
                try {
                    const parsed = JSON.parse(trimmed);
                    result.aiMemory = parsed;
                    if (info) {
                        info.normalizationNotes.push('aiMemory преобразован из строки в объект через JSON.parse');
                    }
                    debugLog('✅ aiMemory распознан как JSON-строка и преобразован в объект');
                } catch (e) {
                    // Если не удалось распарсить, оставляем как строку, но оборачиваем в объект.
                    result.aiMemory = { rawValue: trimmed };
                    if (info) {
                        info.normalizationNotes.push('aiMemory не удалось распарсить как JSON, сохранён как { rawValue }');
                    }
                    debugLog('⚠️ aiMemory не удалось распарсить, обёрнут в объект');
                }
            } else {
                // Просто строка, не похожая на JSON
                result.aiMemory = { value: trimmed };
                if (info) {
                    info.normalizationNotes.push('aiMemory был простой строкой, обёрнут в объект');
                }
                debugLog('ℹ️ aiMemory был простой строкой, обёрнут в объект');
            }
        } else if (isArray) {
            // Если массив, оборачиваем в объект с полем 'array'
            result.aiMemory = { array: result.aiMemory };
            if (info) {
                info.normalizationNotes.push('aiMemory был массивом, обёрнут в объект с полем array');
            }
            debugLog('ℹ️ aiMemory был массивом, обёрнут в объект');
        } else if (typeof result.aiMemory === 'object' && !isArray) {
            // Уже объект — оставляем как есть.
            debugLog('✅ aiMemory уже объект');
        } else {
            // Прочие типы (number, boolean) — оборачиваем в объект.
            result.aiMemory = { value: result.aiMemory };
            if (info) {
                info.normalizationNotes.push(`aiMemory был примитивом (${typeof result.aiMemory}), обёрнут в объект`);
            }
            debugLog(`ℹ️ aiMemory был примитивом, обёрнут в объект`);
        }
    } else {
        // Если aiMemory отсутствует, создаём пустой объект.
        result.aiMemory = {};
        if (info) {
            info.normalizationNotes.push('aiMemory отсутствовал, создан пустой объект');
        }
        debugLog('ℹ️ aiMemory отсутствовал, создан пустой объект');
    }

    // Нормализация choices: применяем normalizeChoice к каждому, отбрасываем невалидные.
    if (Array.isArray(result.choices)) {
        result.choices = result.choices
            .map((c, i) => normalizeChoice(c, i, info))
            .filter(Boolean);
    }

    // Нормализация events.
    if (Array.isArray(result.events)) {
        result.events = result.events
            .map((e, i) => normalizeEvent(e, i, info))
            .filter(Boolean);
    }

    return result;
}

// ============================================================================
// ГЛАВНЫЙ МЕТОД ПАРСИНГА (v7.5)
// ============================================================================

/**
 * Основная точка входа парсинга ответа от ИИ.
 * Принимает как строку (сырой ответ), так и уже готовый объект.
 * Реализует многоуровневую стратегию:
 *   1. Прямая передача объекта (если вход — объект).
 *   2. Стандартный JSON.parse (с предобработкой).
 *   3. Ремонт через balanceBrackets + JSON.parse.
 *   4. Агрессивное извлечение всех полей вручную.
 * Гарантирует, что ни одна ошибка не прервёт выполнение.
 * @param {string|Object} input - Сырая строка или уже распарсенный объект.
 * @returns {Object} Нормализованные данные с полем parsing_info.
 */
function processAIResponse(input) {
    const startTime = Date.now();
    debugBuffer.length = 0;

    debugLog('🚀 processAIResponse: НАЧАЛО v7.5', { type: typeof input });

    // --- СЛУЧАЙ 1: вход — готовый объект (не строка) ---
    if (input && typeof input === 'object' && !Array.isArray(input)) {
        debugLog('📦 Получен объект, пропускаем парсинг, применяем нормализацию');
        
        // Создаём info до нормализации, чтобы собирать заметки
        const info = {
            status: 'OK',
            approach: 'direct_object',
            knownFieldErrors: {},
            extractedOperationsCount: 0,
            rawResponseText: null,
            parsingSteps: ['Объект получен напрямую, применена нормализация'],
            choicesCount: '0/0',
            eventsCount: '0/0',
            thoughtsCount: 0,
            recoveredCount: 0,
            normalizationNotes: [],
            durationMs: 0
        };

        // Нормализуем объект, передавая info для сбора заметок
        const normalized = normalizeParsedObject(input, info);

        // Подсчёт операций для parsing_info.
        const opCount = (normalized.choices?.reduce((acc, c) => 
            acc + (c.success_rewards?.length || 0) + (c.fail_penalties?.length || 0), 0) || 0) +
            (normalized.events?.reduce((acc, e) => acc + (e.effects?.length || 0), 0) || 0);

        info.extractedOperationsCount = opCount;
        info.choicesCount = `${normalized.choices?.length || 0}/${normalized.choices?.length || 0}`;
        info.eventsCount = `${normalized.events?.length || 0}/${normalized.events?.length || 0}`;
        info.thoughtsCount = normalized.thoughts?.length || 0;
        info.durationMs = Date.now() - startTime;

        normalized.parsing_info = info;
        addCopyToClipboard(normalized, info);

        debugLog(`🏁 processAIResponse завершён (объект)`, { status: info.status, durationMs: info.durationMs, notes: info.normalizationNotes.length });
        flushDebugBuffer(info);
        return normalized;
    }

    // --- СЛУЧАЙ 2: вход — строка (обычный случай) ---
    const rawText = (input || '').trim();
    const info = {
        status: 'WARN',                        // По умолчанию WARN, станет OK или ERROR позже.
        approach: 'unknown',
        knownFieldErrors: {},
        extractedOperationsCount: 0,
        rawResponseText: rawText,
        parsingSteps: [],
        choicesCount: '0/0',
        eventsCount: '0/0',
        thoughtsCount: 0,
        recoveredCount: 0,
        normalizationNotes: [],
        durationMs: 0
    };

    let text = rawText;

    // УРОВЕНЬ 0: предобработка (декодирование unicode, удаление обёрток, экранирование переводов строк)
    info.parsingSteps.push('Уровень 0: предобработка (decode + preprocess)');
    text = decodeUnicodeEscapes(text);
    text = preprocessJson(text);

    let parsedData = { 
        scene: '', 
        choices: [], 
        events: [], 
        thoughts: [], 
        aiMemory: {},
        reflection: '',
        personality: '',
        typology: '',
        summary: '',
        design_notes: ''
    };

    // УРОВЕНЬ 1: стандартный JSON.parse
    info.parsingSteps.push('Уровень 1: стандартный JSON.parse');
    try {
        const parsed = JSON.parse(text);
        parsedData = { ...parsedData, ...parsed };
        info.approach = 'standard_json_parse';
        info.status = 'OK';
        debugLog('✅ Уровень 1: УСПЕХ');
    } catch (e) {
        const errorPos = e.message.match(/position (\d+)/)?.[1] || 'unknown';
        debugLog(`❌ Уровень 1: JSON.parse упал`, {
            message: e.message,
            position: errorPos,
            snippet: text.substring(Math.max(0, errorPos - 100), errorPos + 100)
        });
        info.knownFieldErrors.root = `JSON.parse: ${e.message} (позиция ~${errorPos})`;
    }

    // УРОВЕНЬ 2: ремонт через balanceBrackets и повторный parse
    if (info.status !== 'OK') {
        info.parsingSteps.push('Уровень 2: баланс скобок + parse');
        const repaired = balanceBrackets(text);
        try {
            const parsed = JSON.parse(repaired);
            parsedData = { ...parsedData, ...parsed };
            info.approach = 'truncated_repair';
            info.status = 'WARN';   // Частичный успех
            debugLog('✅ Уровень 2: УСПЕХ');
        } catch (e) {
            debugLog(`❌ Уровень 2 провал: ${e.message}`);
        }
    }

    // УРОВЕНЬ 3: агрессивное извлечение (если предыдущие уровни не дали полного успеха)
    if (info.status !== 'OK') {
        info.approach = 'aggressive_multi_level';
        info.parsingSteps.push('Уровень 3: агрессивное извлечение (улучшенное v7.5)');

        // Извлекаем все простые поля через extractRootField
        parsedData.scene = extractRootField(text, 'scene') || '';
        parsedData.reflection = extractRootField(text, 'reflection') || '';
        parsedData.typology = extractRootField(text, 'typology') || '';
        parsedData.personality = extractRootField(text, 'personality') || '';
        parsedData.summary = extractRootField(text, 'summary') || '';
        parsedData.design_notes = extractRootField(text, 'design_notes') || '';

        // Извлекаем массивы с восстановлением
        const choicesRes = extractArrayWithStats(text, 'choices');
        parsedData.choices = choicesRes.items;
        info.choicesCount = choicesRes.stats;
        info.recoveredCount += choicesRes.recovered || 0;

        const eventsRes = extractArrayWithStats(text, 'events');
        parsedData.events = eventsRes.items;
        info.eventsCount = eventsRes.stats;
        info.recoveredCount += eventsRes.recovered || 0;

        parsedData.thoughts = extractRootField(text, 'thoughts') || [];
        info.thoughtsCount = parsedData.thoughts.length;
        
        // aiMemory извлекаем через extractRootField, но затем нормализуем
        parsedData.aiMemory = extractRootField(text, 'aiMemory') || {};
    }

    // Применяем общую нормализацию ко всем данным (чистит, приводит к единому виду, обрабатывает aiMemory и requirements)
    parsedData = normalizeParsedObject(parsedData, info);

    // Подсчёт общего количества операций (для статистики)
    let opCount = 0;
    parsedData.choices.forEach(c => {
        opCount += (c.success_rewards || []).length + (c.fail_penalties || []).length;
    });
    parsedData.events.forEach(e => {
        opCount += (e.effects || []).length;
    });
    info.extractedOperationsCount = opCount;
    info.thoughtsCount = parsedData.thoughts.length;

    // Финальная валидация (минимальная: сцена не пуста, choices — массив)
    const isValid = typeof parsedData.scene === 'string' && 
                   parsedData.scene.trim().length > 0 &&
                   Array.isArray(parsedData.choices);

    if (!isValid) {
        info.status = 'ERROR';
        debugLog('❌ Финальная валидация провалена (нет сцены или choices не массив)');
    } else {
        // Если мы дошли до уровня 3 и получили валидные данные, статус остаётся WARN (не идеально, но данные есть)
        info.status = info.status === 'WARN' ? 'WARN' : 'OK';
    }

    parsedData.parsing_info = info;
    info.durationMs = Date.now() - startTime;

    addCopyToClipboard(parsedData, info);
    flushDebugBuffer(info);

    debugLog(`🏁 processAIResponse завершён`, { status: info.status, durationMs: info.durationMs, notes: info.normalizationNotes.length });

    return parsedData;
}

/**
 * Добавляет метод copyToClipboard к результату парсинга для удобного копирования отчёта.
 * @param {Object} parsedData - Объект с данными.
 * @param {ParsingInfo} info - Информация о парсинге.
 */
function addCopyToClipboard(parsedData, info) {
    parsedData.copyToClipboard = () => {
        const report = {
            status: info.status,
            approach: info.approach,
            sceneLength: parsedData.scene?.length || 0,
            choicesCount: parsedData.choices.length,
            eventsCount: parsedData.events.length,
            thoughtsCount: parsedData.thoughts.length,
            operationsCount: info.extractedOperationsCount,
            recoveredCount: info.recoveredCount || 0,
            normalizationNotes: info.normalizationNotes,
            errors: Object.keys(info.knownFieldErrors).length > 0 ? info.knownFieldErrors : null,
            timestamp: new Date().toISOString()
        };
        navigator.clipboard.writeText(JSON.stringify(report, null, 2)).then(() => {
            console.log('📋 Результат парсинга успешно скопирован в буфер обмена');
        }).catch(err => {
            console.error('❌ Не удалось скопировать:', err);
        });
    };
}

// ============================================================================
// ДОПОЛНИТЕЛЬНЫЕ УТИЛИТЫ
// ============================================================================

/**
 * Декодирует Unicode escape-последовательности (например, \u041f) в читаемые символы.
 * Также заменяет экранированные спецсимволы на их реальные аналоги.
 * @param {string} text - Текст с escape-последовательностями.
 * @returns {string} Декодированный текст.
 */
function decodeUnicodeEscapes(text) {
    debugLog('🔤 decodeUnicodeEscapes: начало');
    if (!text || typeof text !== 'string') return text;
    
    // Замена \uXXXX на соответствующий символ
    let result = text.replace(/\\u[\dA-F]{4}/gi, function(match) {
        try {
            return String.fromCharCode(parseInt(match.replace(/\\u/g, ''), 16));
        } catch (e) {
            return match;
        }
    });
    // Замена прочих escape-последовательностей
    result = result.replace(/\\n/g, '\n')
                   .replace(/\\r/g, '\r')
                   .replace(/\\t/g, '\t')
                   .replace(/\\"/g, '"')
                   .replace(/\\\\/g, '\\');
    return result;
}

/**
 * Глобальная функция копирования (для использования из других модулей).
 * @param {Object} data - Данные для копирования.
 * @param {string} type - 'result' или 'error' (определяет, что именно копировать).
 */
function copyToClipboard(data, type = 'result') {
    const text = JSON.stringify(type === 'result' ? data : (data.parsing_info || data), null, 2);
    navigator.clipboard.writeText(text).then(() => {
        console.log(`📋 ${type === 'result' ? 'Результат парсинга' : 'Ошибки парсинга'} скопированы в буфер обмена`);
    });
}

// ============================================================================
// ЭКСПОРТ
// ============================================================================
export const Parser = {
    processAIResponse,
    normalizeOperation,
    normalizeChoice,
    normalizeEvent,
    decodeUnicodeEscapes,
    preprocessJson,
    copyToClipboard,
    debugLog
};

