// ====================================================================
// ФАЙЛ: parsing.js
// ВЕРСИЯ: v8.1 — ПОЛНОЕ КОММЕНТИРОВАНИЕ, ПОНЯТНЫЕ ИМЕНА, УЛУЧШЕННАЯ ДОКУМЕНТАЦИЯ
// ====================================================================
//
// @module Parser
// @description
//   Единственный модуль парсинга ответов от ИИ. Гарантирует извлечение данных
//   даже из сильно повреждённых или обрезанных JSON-ответов.
//   Входные данные: сырая строка от AI (может содержать markdown, обрезанные скобки, лишние символы)
//   или готовый объект (тогда применяется только нормализация).
//   Выходные данные: объект типа ParsedAIResponse, содержащий все игровые поля
//   и мета-информацию о процессе парсинга (ParsingInfo).
//
// АЛГОРИТМ РАБОТЫ (ПОДРОБНО):
//   0. Если вход — объект → применяется нормализация напрямую, без парсинга.
//   1. Если вход — строка, проверяем, не является ли она полным API-ответом
//      вида { choices: [ { message: { content: "...JSON..." } } ] }.
//      Если да — извлекаем вложенный JSON.
//   2. Уровень 0: предобработка строки:
//      - удаление обёрток ```json ... ```
//      - экранирование буквальных переносов строк внутри строк (замена \n на \\n)
//      - удаление висячих запятых перед } и ]
//   3. Уровень 1: стандартный JSON.parse. Если успешно — данные считаются чистыми.
//   4. Уровень 2: если парсинг не удался, применяем balanceBrackets()
//      (закрываем незакрытые строки, добавляем недостающие скобки, убираем лишние запятые)
//      и повторяем JSON.parse.
//   5. Уровень 3: если всё ещё не удалось — агрессивное извлечение методом подсчёта скобок
//      (bracket‑counting). Для каждого известного поля (scene, choices, events и т.д.)
//      находим его содержимое, извлекаем, при необходимости восстанавливаем вложенные объекты.
//      Используются функции findArrayContent, findObjectContent, extractArrayWithStats,
//      extractOperationsFromBrokenObject и др.
//   6. После получения объекта (любым способом) применяется нормализация:
//      - приведение типов, диапазонов, формата идентификаторов,
//      - очистка массивов от невалидных элементов,
//      - преобразование aiMemory в единый объектный формат.
//   7. Формируется ParsingInfo с деталями процесса (статус, количество восстановленных,
//      время, ошибки и т.д.) и добавляется в результирующий объект как поле parsing_info.
//   8. В режиме отладки (DEBUG_MODE) в консоль выводится детальный лог.
//
// ГЛУБИНА ИЗВЛЕЧЕНИЯ:
//   - Корневые поля: scene, reflection, typology, personality, summary, design_notes (строки).
//   - Массивы: choices (с вложенными success_rewards, fail_penalties, requirements),
//              events (с вложенными effects), thoughts (строки).
//   - Объект: aiMemory (произвольная структура, нормализуется к объекту).
//   - Рекурсивное восстановление вложенных операций из повреждённых объектов.
//
// ТИПЫ ДАННЫХ:
//   - GameOperation — игровая операция (ADD, REMOVE, MODIFY, SET) с id, value/delta и пр.
//   - ParsedChoice — вариант выбора с текстом, сложностью, требованиями, наградами/штрафами.
//   - ParsedEvent — событие с типом, описанием, эффектами и причиной.
//   - ParsingInfo — мета-информация о парсинге (статус, подход, счётчики, ошибки).
//   - ParsedAIResponse — итоговый объект, содержащий все данные + parsing_info.
//
// ИСТОРИЯ ИЗМЕНЕНИЙ:
//   v6.9–v7.8 – предшествующие версии.
//   v8.0      – bracket-counting вместо lazy regex; исправлен decodeUnicodeEscapes;
//               переписан extractOperationsFromBrokenObject; добавлен getLastDebugLog().
//   v8.1      – полное комментирование, понятные имена переменных, улучшенная документация.
// ====================================================================

'use strict';

import { CONFIG } from './1-config.js';
import { log, LOG_CATEGORIES } from './logger.js';

// ----------------------------------------------------------------------------
// ТИПЫ ДАННЫХ (JSDoc)
// ----------------------------------------------------------------------------

/**
 * @typedef {Object} GameOperation
 * @property {string}  operation   - Тип операции: 'ADD' | 'REMOVE' | 'MODIFY' | 'SET'
 * @property {string}  id          - Идентификатор целевого элемента в формате "категория:имя", например 'stat:sanity' или 'inventory:gold'
 * @property {number}  [delta]     - Изменение для операции MODIFY (число)
 * @property {*}       [value]     - Значение для ADD или SET (может быть числом, строкой, объектом)
 * @property {number}  [duration]  - Длительность эффекта в ходах (для временных модификаторов)
 * @property {string}  [description] - Пояснение к операции (для отладки)
 */

/**
 * @typedef {Object} ParsedChoice
 * @property {string}         text              - Текст выбора, отображаемый игроку
 * @property {number}         difficulty_level - Уровень сложности от 1 до 10 (нормализуется)
 * @property {string[]}       requirements      - Массив идентификаторов требований (например, "stat:will")
 * @property {GameOperation[]} success_rewards  - Операции, выполняемые при успехе
 * @property {GameOperation[]} fail_penalties   - Операции, выполняемые при провале
 */

/**
 * @typedef {Object} ParsedEvent
 * @property {string}         type        - Тип события (например, 'world_event', 'combat')
 * @property {string}         description - Текстовое описание события
 * @property {GameOperation[]} effects     - Операции, вызываемые событием
 * @property {string}         reason      - Причина или триггер события
 */

/**
 * @typedef {Object} ParsingInfo
 * @property {'OK'|'WARN'|'ERROR'} status          - Итоговый статус парсинга
 * @property {string}   approach                    - Название уровня, который сработал (standard_json_parse, truncated_repair, aggressive_bracket_counting, direct_object)
 * @property {Object}   knownFieldErrors            - Объект с ошибками по конкретным полям (ключ – имя поля, значение – текст ошибки)
 * @property {number}   extractedOperationsCount    - Общее количество извлечённых операций (сумма success_rewards, fail_penalties, effects)
 * @property {string}   rawResponseText             - Исходный текст ответа (может быть очень длинным)
 * @property {string[]} parsingSteps                 - Массив строк с описанием последовательности шагов парсинга
 * @property {string}   choicesCount                 - Строка вида "успешно/найдено" для choices
 * @property {string}   eventsCount                   - Строка вида "успешно/найдено" для events
 * @property {number}   thoughtsCount                 - Количество элементов в массиве thoughts после нормализации
 * @property {number}   recoveredCount                - Количество объектов (choices или events), восстановленных вручную
 * @property {string[]} normalizationNotes            - Заметки о нестандартных преобразованиях во время нормализации
 * @property {number}   durationMs                     - Время выполнения функции в миллисекундах
 * @property {string[]} debugLog                       - Полный отладочный лог (доступен при DEBUG_MODE)
 */

/**
 * @typedef {Object} ParsedAIResponse
 * @property {string} scene              - Текст текущей сцены (локация, атмосфера)
 * @property {string} reflection         - Внутренний монолог или рефлексия персонажа
 * @property {string} typology           - Типологические характеристики (архетип, класс, раса)
 * @property {string} personality        - Описание личности, настроения, поведенческих черт
 * @property {string} summary            - Краткое резюме произошедшего
 * @property {string} design_notes       - Заметки дизайнера, мета-информация
 * @property {Array<ParsedChoice>} choices - Варианты выбора
 * @property {Array<ParsedEvent>} events - События мира
 * @property {Array<string>} thoughts    - Массив мыслей / внутренних реплик
 * @property {Object} aiMemory           - Память ИИ (произвольная структура, нормализована к объекту)
 * @property {ParsingInfo} parsing_info  - Мета-информация о парсинге
 */

/**
 * @typedef {Object} ArrayExtractionResult
 * @property {Array} items      - Извлечённые объекты (после попыток восстановления)
 * @property {number} totalFound - Общее количество найденных в сыром тексте элементов
 * @property {number} recovered  - Количество объектов, восстановленных вручную
 */

// ----------------------------------------------------------------------------
// ГЛОБАЛЬНЫЕ НАСТРОЙКИ И DEBUG-РЕЖИМ
// ----------------------------------------------------------------------------

/** @type {boolean} */
let DEBUG_MODE = typeof localStorage !== 'undefined' && localStorage.getItem('parser_debug') === 'true';

/**
 * Переключает режим детального логирования парсера.
 * Вызов из консоли: window.toggleParserDebug(true)
 * @param {boolean} enable
 */
if (typeof window !== 'undefined') {
    window.toggleParserDebug = (enable) => {
        DEBUG_MODE = !!enable;
        localStorage.setItem('parser_debug', enable.toString());
        console.log(`🛠️ [Parser v8.1] DEBUG_MODE = ${DEBUG_MODE}`);
    };
}

// ----------------------------------------------------------------------------
// DEBUG-БУФЕР
// ----------------------------------------------------------------------------

/** @type {string[]} Буфер текущего вызова processAIResponse */
const debugBuffer = [];

/** @type {string[]} Буфер последнего завершённого вызова (экспортируется для дебаггера) */
let lastDebugBuffer = [];

/**
 * Добавляет сообщение в debug-буфер и основной логгер.
 * @param {string} message
 * @param {*} [data]
 */
function debugLog(message, data = null) {
    const entry = data ? `${message} ${JSON.stringify(data)}` : message;
    debugBuffer.push(entry);
    if (typeof log !== 'undefined') {
        try { log.debug(LOG_CATEGORIES.PARSING, message, data); } catch {}
    }
}

/**
 * Выводит буфер в консоль и перемещает в lastDebugBuffer.
 * @param {ParsingInfo} info
 */
function flushDebugBuffer(info) {
    lastDebugBuffer = [...debugBuffer];
    info.debugLog = lastDebugBuffer;

    if (DEBUG_MODE && debugBuffer.length > 0) {
        console.groupCollapsed(
            `🧪 [PARSER v8.1] ${info.approach} | ops:${info.extractedOperationsCount} | ` +
            `${info.durationMs}ms | recovered:${info.recoveredCount || 0}`
        );
        debugBuffer.forEach(line => console.log(line));
        console.groupEnd();
    }
    debugBuffer.length = 0;
}

/**
 * Возвращает массив строк из последнего вызова processAIResponse — для дебаггера.
 * @returns {string[]}
 */
function getLastDebugLog() {
    return [...lastDebugBuffer];
}

// ----------------------------------------------------------------------------
// ПРЕДОБРАБОТКА JSON
// ----------------------------------------------------------------------------

/**
 * Предварительная обработка JSON-строки перед парсингом:
 * - Удаляет обёртки ```json ... ```
 * - Экранирует РЕАЛЬНЫЕ (буквальные) переносы строк внутри JSON-строк → `\n`
 * - Удаляет висячие запятые перед `}` и `]`
 *
 * ВАЖНО: не трогает escape-последовательности (`\"`, `\\`),
 * чтобы не сломать JSON до вызова JSON.parse.
 *
 * @param {string} jsonText - Сырая строка, возможно с обёртками и неэкранированными переводами строк
 * @returns {string} - Очищенная строка, готовая к JSON.parse
 */
function preprocessJson(jsonText) {
    debugLog('🔧 preprocessJson: start', { len: jsonText?.length });
    if (!jsonText || typeof jsonText !== 'string') return jsonText;

    let result = jsonText.trim()
        .replace(/^```json\s*/i, '')
        .replace(/\s*```$/i, '');

    // Экранируем буквальные переносы строк внутри JSON-строк
    let inString = false;
    let escapeNext = false;
    let fixed = '';
    for (let i = 0; i < result.length; i++) {
        const character = result[i];
        if (escapeNext) {
            fixed += character;
            escapeNext = false;
            continue;
        }
        if (character === '\\') {
            escapeNext = true;
            fixed += character;
            continue;
        }
        if (character === '"') {
            inString = !inString;
            fixed += character;
            continue;
        }
        if (inString) {
            if (character === '\n') {
                fixed += '\\n';
            } else if (character === '\r') {
                fixed += '\\r';
            } else {
                fixed += character;
            }
        } else {
            fixed += character;
        }
    }

    // Висячие запятые
    fixed = fixed.replace(/,\s*([}\]])/g, '$1');
    debugLog('✅ preprocessJson: done');
    return fixed;
}

/**
 * Балансирует скобки и удаляет висячие запятые — резервный ремонт обрезанного JSON.
 * Алгоритм:
 * 1. Удаляет markdown-обёртки.
 * 2. Если строка осталась незакрытой (кавычка без пары), добавляет закрывающую кавычку.
 * 3. Удаляет висячие запятые перед } и ].
 * 4. Считает количество открытых и закрытых фигурных и квадратных скобок вне строк.
 * 5. Добавляет недостающие закрывающие скобки в правильном порядке.
 *
 * @param {string} str - Частично повреждённая JSON-строка
 * @returns {string} - Строка с попыткой восстановить баланс скобок
 */
function balanceBrackets(str) {
    let result = (str || '').trim()
        .replace(/^```json\s*/i, '')
        .replace(/\s*```$/i, '');

    // Закрываем незакрытую строку
    let inString = false;
    let escapeNext = false;
    for (let i = 0; i < result.length; i++) {
        const character = result[i];
        if (escapeNext) {
            escapeNext = false;
            continue;
        }
        if (character === '\\') {
            escapeNext = true;
            continue;
        }
        if (character === '"') {
            inString = !inString;
        }
    }
    if (inString) result += '"';

    // Висячие запятые
    result = result.replace(/,\s*([}\]])/g, '$1');

    // Добавляем недостающие скобки
    let openBraces = 0;      // {
    let closeBraces = 0;     // }
    let openBrackets = 0;    // [
    let closeBrackets = 0;   // ]
    inString = false;
    escapeNext = false;

    for (let i = 0; i < result.length; i++) {
        const character = result[i];
        if (escapeNext) {
            escapeNext = false;
            continue;
        }
        if (character === '\\') {
            escapeNext = true;
            continue;
        }
        if (character === '"') {
            inString = !inString;
            continue;
        }
        if (!inString) {
            if (character === '{') openBraces++;
            if (character === '}') closeBraces++;
            if (character === '[') openBrackets++;
            if (character === ']') closeBrackets++;
        }
    }

    if (openBrackets > closeBrackets) {
        result += ']'.repeat(openBrackets - closeBrackets);
    }
    if (openBraces > closeBraces) {
        result += '}'.repeat(openBraces - closeBraces);
    }

    return result;
}

// ----------------------------------------------------------------------------
// ★ BRACKET-COUNTING: КЛЮЧЕВЫЕ ФУНКЦИИ v8.0 ★
// ----------------------------------------------------------------------------

/**
 * Находит полное содержимое JSON-массива для заданного ключа методом подсчёта скобок.
 * Заменяет ВСЕ ленивые regex `[\s\S]*?` — они останавливались на ПЕРВОМ `]`,
 * уничтожая вложенные массивы success_rewards / fail_penalties / effects.
 *
 * @param {string} text   - Полный текст ответа
 * @param {string} key    - Имя поля (например 'choices', 'success_rewards')
 * @returns {string|null} - Строка вида `[...]` или null если поле не найдено
 */
function findArrayContent(text, key) {
    debugLog(`🔍 findArrayContent: "${key}"`);
    // Ищем  "key"   :   [
    const startRegex = new RegExp(`"${key}"\\s*:\\s*\\[`, 'i');
    const startMatch = startRegex.exec(text);
    if (!startMatch) {
        debugLog(`   → "${key}" не найден`);
        return null;
    }

    // Позиция открывающей `[`
    const openPosition = startMatch.index + startMatch[0].length - 1;
    let depth = 0;
    let inString = false;
    let escapeNext = false;

    for (let i = openPosition; i < text.length; i++) {
        const character = text[i];
        if (escapeNext) {
            escapeNext = false;
            continue;
        }
        if (character === '\\') {
            escapeNext = true;
            continue;
        }
        if (character === '"') {
            inString = !inString;
            continue;
        }
        if (!inString) {
            if (character === '[') depth++;
            else if (character === ']') {
                depth--;
                if (depth === 0) {
                    const result = text.substring(openPosition, i + 1);
                    debugLog(`   → найден "${key}" длиной ${result.length}`);
                    return result;
                }
            }
        }
    }
    // Обрезанный JSON — возвращаем с конца, balanceBrackets исправит
    const truncated = text.substring(openPosition);
    debugLog(`   → "${key}" обрезан, длина ${truncated.length}`);
    return truncated;
}

/**
 * Находит полное содержимое JSON-объекта для заданного ключа методом подсчёта скобок.
 * @param {string} text - Полный текст ответа
 * @param {string} key  - Имя поля (например 'aiMemory')
 * @returns {string|null} - Строка вида `{...}` или null
 */
function findObjectContent(text, key) {
    const startRegex = new RegExp(`"${key}"\\s*:\\s*\\{`, 'i');
    const startMatch = startRegex.exec(text);
    if (!startMatch) return null;

    const openPosition = startMatch.index + startMatch[0].length - 1;
    let depth = 0;
    let inString = false;
    let escapeNext = false;

    for (let i = openPosition; i < text.length; i++) {
        const character = text[i];
        if (escapeNext) {
            escapeNext = false;
            continue;
        }
        if (character === '\\') {
            escapeNext = true;
            continue;
        }
        if (character === '"') {
            inString = !inString;
            continue;
        }
        if (!inString) {
            if (character === '{') depth++;
            else if (character === '}') {
                depth--;
                if (depth === 0) return text.substring(openPosition, i + 1);
            }
        }
    }
    return text.substring(openPosition);
}

// ----------------------------------------------------------------------------
// ИЗВЛЕЧЕНИЕ ВЛОЖЕННОГО JSON ИЗ API-ОТВЕТА
// ----------------------------------------------------------------------------

/**
 * Проверяет, является ли текст полным ответом API (choices[0].message.content).
 * Если да — извлекает и возвращает content.
 * @param {string} text - Строка, предположительно полный JSON от API
 * @returns {string|null} - Извлечённый content или null
 */
function extractNestedJsonFromApiResponse(text) {
    debugLog('🔍 extractNestedJsonFromApiResponse');
    try {
        const parsed = JSON.parse(text);
        if (parsed?.choices?.[0]?.message?.content) {
            let content = parsed.choices[0].message.content;
            if (typeof content === 'string') {
                content = content.trim()
                    .replace(/^```json\s*/i, '')
                    .replace(/\s*```$/i, '');
                debugLog(`   → вложенный content, длина ${content.length}`);
                return content;
            }
            if (typeof content === 'object') {
                return JSON.stringify(content);
            }
        }
    } catch {
        // ignore
    }
    return null;
}

// ----------------------------------------------------------------------------
// ДЕКОДИРОВАНИЕ UNICODE
// ----------------------------------------------------------------------------

/**
 * Декодирует ТОЛЬКО `\uXXXX` escape-последовательности в читаемые символы.
 *
 * ВАЖНО v8.0: НЕ трогает `\"`, `\\`, `\n`, `\t` — эти замены РАЗРУШАЛИ JSON
 * до вызова JSON.parse, что приводило к "He said "hello"" вместо "He said \"hello\"".
 *
 * @param {string} text - Строка, возможно содержащая юникод-экранирование
 * @returns {string} - Строка с декодированными символами
 */
function decodeUnicodeEscapes(text) {
    if (!text || typeof text !== 'string') return text;
    return text.replace(/\\u[\dA-Fa-f]{4}/g, match => {
        try {
            return String.fromCharCode(parseInt(match.slice(2), 16));
        } catch {
            return match;
        }
    });
}

// ----------------------------------------------------------------------------
// ИЗВЛЕЧЕНИЕ ОБЪЕКТОВ ИЗ МАССИВА (посимвольный разбор)
// ----------------------------------------------------------------------------

/**
 * Извлекает все top-level объекты из строки, представляющей JSON-массив.
 * Корректно обрабатывает вложенность и escape-последовательности.
 *
 * @param {string} text - Строка вида `[{...}, {...}]`
 * @returns {string[]} - Массив строк-объектов (каждый объект как строка JSON)
 */
function extractTopLevelObjects(text) {
    debugLog(`🔍 extractTopLevelObjects`, { len: text?.length });
    const objects = [];
    let i = 0;
    while (i < text.length && text[i] !== '[') i++;
    if (i >= text.length) return objects;
    i++; // пропускаем '['

    let inString = false;
    let escapeNext = false;
    let depth = 0;
    let start = -1;

    while (i < text.length) {
        const character = text[i];
        if (escapeNext) {
            escapeNext = false;
            i++;
            continue;
        }
        if (character === '\\') {
            escapeNext = true;
            i++;
            continue;
        }
        if (character === '"') {
            inString = !inString;
            i++;
            continue;
        }
        if (!inString) {
            if (character === '{') {
                if (depth === 0) start = i;
                depth++;
            } else if (character === '}') {
                depth--;
                if (depth === 0 && start !== -1) {
                    objects.push(text.substring(start, i + 1));
                    start = -1;
                }
            } else if (character === ']' && depth === 0) {
                break;
            }
        }
        i++;
    }
    debugLog(`   → извлечено ${objects.length} объектов`);
    return objects;
}

// ----------------------------------------------------------------------------
// ИЗВЛЕЧЕНИЕ ПОЛЕЙ ИЗ ПОВРЕЖДЁННЫХ ОБЪЕКТОВ
// ----------------------------------------------------------------------------

/**
 * Извлекает строковое поле из повреждённого объекта.
 * @param {string} text - Фрагмент JSON, содержащий повреждённый объект
 * @param {string} fieldName - Имя поля
 * @returns {string|null} - Извлечённое значение или null
 */
function extractFieldFromBrokenObject(text, fieldName) {
    try {
        const regex = new RegExp(`"${fieldName}"\\s*:\\s*"((?:[^"\\\\]|\\\\.)*)"`, 's');
        const match = regex.exec(text);
        if (match) return match[1].replace(/\\"/g, '"').replace(/\\\\/g, '\\');
    } catch {
        // ignore
    }
    return null;
}

/**
 * Извлекает числовое поле из повреждённого объекта.
 * @param {string} text - Фрагмент JSON, содержащий повреждённый объект
 * @param {string} fieldName - Имя поля
 * @param {number} [defaultValue=0] - Значение по умолчанию
 * @returns {number}
 */
function extractNumberFromBrokenObject(text, fieldName, defaultValue = 0) {
    try {
        const regex = new RegExp(`"${fieldName}"\\s*:\\s*(-?\\d+(?:\\.\\d+)?)`, 'i');
        const match = regex.exec(text);
        if (match) return parseFloat(match[1]);
    } catch {
        // ignore
    }
    return defaultValue;
}

/**
 * Извлекает difficulty_level из повреждённого объекта.
 * @param {string} text - Фрагмент JSON, содержащий повреждённый choice
 * @returns {number}
 */
function extractDifficultyFromBrokenObject(text) {
    return extractNumberFromBrokenObject(text, 'difficulty_level', 5);
}

/**
 * Извлекает массив requirements из повреждённого объекта.
 * Использует bracket-counting через findArrayContent.
 * @param {string} text - Фрагмент JSON, содержащий повреждённый choice
 * @returns {Array} - Массив требований (может быть пустым)
 */
function extractRequirementsFromBrokenObject(text) {
    debugLog('🔍 extractRequirementsFromBrokenObject');
    try {
        const arrayContent = findArrayContent(text, 'requirements');
        if (!arrayContent) return [];
        const balanced = balanceBrackets(arrayContent);
        const parsed = JSON.parse(balanced);
        if (Array.isArray(parsed)) return parsed;
    } catch (error) {
        debugLog(`   ⚠️ requirements parse failed: ${error.message}`);
    }
    return [];
}

// ----------------------------------------------------------------------------
// ★ ИСПРАВЛЕНО v8.0: ИЗВЛЕЧЕНИЕ ОПЕРАЦИЙ ЧЕРЕЗ BRACKET-COUNTING ★
// ----------------------------------------------------------------------------

/**
 * Извлекает массив операций (success_rewards / fail_penalties / effects)
 * из фрагмента объекта методом bracket-counting (v8.0).
 *
 * Ранее здесь использовался ленивый regex `[\s\S]*?`, останавливающийся на
 * первом `]` внутри вложенных структур — полный массив операций терялся.
 *
 * @param {string} text - Фрагмент объекта choice или event
 * @param {string} key  - 'success_rewards' | 'fail_penalties' | 'effects'
 * @returns {GameOperation[]}
 */
function extractOperationsFromBrokenObject(text, key) {
    debugLog(`🔍 extractOperationsFromBrokenObject: "${key}"`);

    // Шаг 1: bracket-counting extraction
    const arrayContent = findArrayContent(text, key);
    if (!arrayContent) {
        debugLog(`   → массив "${key}" не найден`);
        return [];
    }

    const balanced = balanceBrackets(arrayContent);

    // Шаг 2: попытка прямого JSON.parse всего массива
    try {
        const parsed = JSON.parse(balanced);
        if (Array.isArray(parsed)) {
            debugLog(`   → "${key}" распарсен напрямую (${parsed.length} операций)`);
            return parsed;
        }
    } catch (error) {
        debugLog(`   ⚠️ прямой parse "${key}" провалился: ${error.message}`);
    }

    // Шаг 3: извлечение объектов по одному
    const objectStrings = extractTopLevelObjects(balanced);
    const result = [];

    for (const objectString of objectStrings) {
        // Пробуем прямой parse объекта
        try {
            const repaired = balanceBrackets(objectString);
            const operation = JSON.parse(repaired);
            if (operation && typeof operation === 'object') {
                result.push(operation);
                continue;
            }
        } catch {
            // fallback к ручному извлечению
        }

        // Fallback: ручное извлечение полей операции
        const operation = {};
        const operationValue = extractFieldFromBrokenObject(objectString, 'operation');
        const idValue = extractFieldFromBrokenObject(objectString, 'id');
        const descriptionValue = extractFieldFromBrokenObject(objectString, 'description');

        if (operationValue) operation.operation = operationValue;
        if (idValue) operation.id = idValue;
        if (descriptionValue) operation.description = descriptionValue;

        // delta (для MODIFY)
        const deltaMatch = /"delta"\s*:\s*(-?\d+(?:\.\d+)?)/.exec(objectString);
        if (deltaMatch) operation.delta = parseFloat(deltaMatch[1]);

        // duration
        const durationMatch = /"duration"\s*:\s*(\d+)/.exec(objectString);
        if (durationMatch) operation.duration = parseInt(durationMatch[1], 10);

        // value (для ADD/SET): может быть числом или строкой
        const valueNumberMatch = /"value"\s*:\s*(-?\d+(?:\.\d+)?)/.exec(objectString);
        const valueStringMatch = /"value"\s*:\s*"((?:[^"\\]|\\.)*)"/.exec(objectString);
        if (valueNumberMatch && !valueStringMatch) {
            operation.value = parseFloat(valueNumberMatch[1]);
        } else if (valueStringMatch) {
            operation.value = valueStringMatch[1].replace(/\\"/g, '"').replace(/\\\\/g, '\\');
        }

        if (operation.id) {
            result.push(operation);
            debugLog(`   → ручное извлечение операции: ${operation.operation || '?'} ${operation.id}`);
        }
    }

    debugLog(`   → "${key}": извлечено ${result.length} операций`);
    return result;
}

// ----------------------------------------------------------------------------
// ИЗВЛЕЧЕНИЕ МАССИВА С ВОССТАНОВЛЕНИЕМ (v8.0 — bracket-counting)
// ----------------------------------------------------------------------------

/**
 * Извлекает массив choices или events с посимвольным восстановлением повреждённых объектов.
 * Использует findArrayContent() вместо lazy regex.
 *
 * @param {string} text - Полный текст ответа
 * @param {'choices'|'events'} key - Имя массива
 * @returns {ArrayExtractionResult}
 */
function extractArrayWithStats(text, key) {
    debugLog(`📍 extractArrayWithStats v8.0: "${key}"`);

    // ★ v8.0: bracket-counting вместо REGEX_CACHE с lazy match
    const arrayContent = findArrayContent(text, key);
    if (!arrayContent) {
        debugLog(`   → "${key}" не найден`);
        return { items: [], totalFound: 0, recovered: 0 };
    }

    const balanced = balanceBrackets(arrayContent);
    const objectStrings = extractTopLevelObjects(balanced);
    const totalFound = objectStrings.length;
    const items = [];
    let recoveredCount = 0;

    for (let index = 0; index < objectStrings.length; index++) {
        const objectString = objectStrings[index];

        // Попытка прямого JSON.parse
        try {
            const object = JSON.parse(objectString);
            items.push(object);
            debugLog(`   → ${key}[${index}] распарсен`);
            continue;
        } catch {
            // пробуем следующий метод
        }

        // Попытка с balanceBrackets
        try {
            const object = JSON.parse(balanceBrackets(objectString));
            items.push(object);
            debugLog(`   → ${key}[${index}] восстановлен через balanceBrackets`);
            recoveredCount++;
            continue;
        } catch (error) {
            debugLog(`   → ${key}[${index}] повреждён: ${error.message}, ручное восстановление`);
        }

        // Ручное восстановление
        if (key === 'choices') {
            const textField = extractFieldFromBrokenObject(objectString, 'text');
            const recovered = {
                text:             textField || `Выбор #${index + 1}`,
                difficulty_level: extractDifficultyFromBrokenObject(objectString),
                requirements:     extractRequirementsFromBrokenObject(objectString),
                success_rewards:  extractOperationsFromBrokenObject(objectString, 'success_rewards'),
                fail_penalties:   extractOperationsFromBrokenObject(objectString, 'fail_penalties'),
            };
            items.push(recovered);
            recoveredCount++;
            debugLog(`   → choice[${index}] восстановлен вручную: "${(recovered.text || '').substring(0, 50)}"`);
        } else if (key === 'events') {
            const descriptionField = extractFieldFromBrokenObject(objectString, 'description');
            const recovered = {
                type:        extractFieldFromBrokenObject(objectString, 'type') || 'world_event',
                description: descriptionField || `Событие #${index + 1}`,
                effects:     extractOperationsFromBrokenObject(objectString, 'effects'),
                reason:      extractFieldFromBrokenObject(objectString, 'reason') || '',
            };
            items.push(recovered);
            recoveredCount++;
            debugLog(`   → event[${index}] восстановлен вручную: "${(recovered.description || '').substring(0, 50)}"`);
        }
    }

    debugLog(`   → ${key}: ${items.length}/${totalFound} (recovered: ${recoveredCount})`);
    return { items, totalFound, recovered: recoveredCount };
}

// ----------------------------------------------------------------------------
// ИЗВЛЕЧЕНИЕ КОРНЕВЫХ ПОЛЕЙ (агрессивный режим)
// ----------------------------------------------------------------------------

/**
 * Извлекает любое корневое поле методом bracket-counting для объектов/массивов
 * или regex для примитивов.
 *
 * @param {string} text - Полный текст ответа
 * @param {string} key  - Имя поля (например 'scene', 'aiMemory')
 * @returns {any} - Извлечённое значение (может быть строкой, числом, объектом, массивом) или null
 */
function extractRootField(text, key) {
    debugLog(`📍 extractRootField: "${key}"`);
    const regex = new RegExp(`"${key}"\\s*:\\s*`, 'i');
    const match = regex.exec(text);
    if (!match) {
        debugLog(`   → не найдено`);
        return null;
    }

    let position = match.index + match[0].length;
    while (position < text.length && /\s/.test(text[position])) position++;

    const firstChar = text[position];

    if (firstChar === '[') {
        const arrayContent = findArrayContent(text, key);
        if (!arrayContent) return [];
        try {
            const result = JSON.parse(balanceBrackets(arrayContent));
            debugLog(`   → "${key}" массив [${Array.isArray(result) ? result.length : '?'}]`);
            return result;
        } catch {
            return [];
        }
    }

    if (firstChar === '{') {
        const objectContent = findObjectContent(text, key);
        if (!objectContent) return {};
        try {
            const result = JSON.parse(balanceBrackets(objectContent));
            debugLog(`   → "${key}" объект`);
            return result;
        } catch {
            return objectContent; // возвращаем как строку, если не удалось распарсить
        }
    }

    // Примитив (строка, число, true, false, null)
    const primitiveMatch = text.slice(position).match(/^(true|false|null|-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?|"(?:[^"\\]|\\.)*")/);
    if (primitiveMatch) {
        try {
            const result = JSON.parse(primitiveMatch[0]);
            debugLog(`   → "${key}" примитив: ${String(result).substring(0, 30)}`);
            return result;
        } catch {
            return primitiveMatch[0];
        }
    }

    debugLog(`   → "${key}" не удалось извлечь`);
    return null;
}

// ----------------------------------------------------------------------------
// НОРМАЛИЗАЦИЯ
// ----------------------------------------------------------------------------

/**
 * Нормализует элемент requirements к строке.
 * Если передан объект, пытается извлечь поле id.
 *
 * @param {*} requirement - Входное значение (строка, объект или null)
 * @param {ParsingInfo} [info] - Объект информации для записи заметок
 * @returns {string|null} - Нормализованная строка или null
 */
function normalizeRequirement(requirement, info = null) {
    if (!requirement) return null;
    if (typeof requirement === 'string') return requirement.trim() || null;
    if (typeof requirement === 'object' && requirement !== null) {
        if (requirement.id && typeof requirement.id === 'string') return requirement.id.trim() || null;
        info?.normalizationNotes.push(`requirement-объект без id: ${JSON.stringify(requirement)}`);
        return null;
    }
    return null;
}

/**
 * Нормализует одну операцию (success_reward / fail_penalty / effect).
 * Приводит id к нижнему регистру, заменяет пробелы на подчёркивания,
 * проверяет обязательные поля, корректирует числовые значения.
 *
 * @param {Object} operation - Сырая операция
 * @returns {GameOperation|null} - Нормализованная операция или null, если невалидна
 */
function normalizeOperation(operation) {
    try {
        if (!operation || typeof operation !== 'object' || !operation.id) return null;

        const normalized = { ...operation };
        normalized.id = String(normalized.id).toLowerCase().replace(/\s+/g, '_');

        if (typeof normalized.operation === 'string') {
            normalized.operation = normalized.operation.toUpperCase().trim();
        }

        // delta — числовой
        if (normalized.delta !== undefined) normalized.delta = Number(normalized.delta) || 0;

        // value — сохраняем тип, но если число — приводим к Number
        if (normalized.value !== undefined && typeof normalized.value === 'number') {
            normalized.value = Number(normalized.value);
        }

        // duration — не менее 1
        if (normalized.duration !== undefined) {
            normalized.duration = Math.max(1, Number(normalized.duration) || 1);
        }

        normalized.description = normalized.description ? String(normalized.description).trim() : '';

        if (!normalized.id.includes(':')) {
            debugLog(`⚠️ normalizeOperation: id="${normalized.id}" без ":" — возможно некорректно`);
        }
        return normalized;
    } catch (error) {
        debugLog(`❌ normalizeOperation: ${error.message}`);
        return null;
    }
}

/**
 * Нормализует объект choice.
 * Проверяет наличие текста, корректирует difficulty_level,
 * обрабатывает requirements, success_rewards, fail_penalties.
 *
 * @param {Object} choice - Сырой объект choice
 * @param {number} index - Индекс в массиве (для логирования)
 * @param {ParsingInfo} [info] - Объект информации для записи заметок
 * @returns {ParsedChoice|null} - Нормализованный choice или null
 */
function normalizeChoice(choice, index, info = null) {
    try {
        if (!choice || typeof choice.text !== 'string' || !choice.text.trim()) return null;

        let difficulty = Number(choice.difficulty_level);
        if (isNaN(difficulty) || difficulty < 1 || difficulty > 10) {
            const original = difficulty;
            difficulty = Math.min(10, Math.max(1, difficulty || 5));
            info?.normalizationNotes.push(
                `choice[${index}].difficulty_level ${original} → ${difficulty}`
            );
        }

        return {
            text:             choice.text.trim(),
            difficulty_level: difficulty,
            requirements:     Array.isArray(choice.requirements)
                                ? choice.requirements.map(req => normalizeRequirement(req, info)).filter(Boolean)
                                : [],
            success_rewards:  Array.isArray(choice.success_rewards)
                                ? choice.success_rewards.map(normalizeOperation).filter(Boolean)
                                : [],
            fail_penalties:   Array.isArray(choice.fail_penalties)
                                ? choice.fail_penalties.map(normalizeOperation).filter(Boolean)
                                : [],
        };
    } catch (error) {
        debugLog(`❌ normalizeChoice[${index}]: ${error.message}`);
        return null;
    }
}

/**
 * Нормализует объект event.
 * Проверяет наличие описания, приводит type к нижнему регистру,
 * обрабатывает effects.
 *
 * @param {Object} event - Сырой объект event
 * @param {number} index - Индекс в массиве (для логирования)
 * @param {ParsingInfo} [info] - Объект информации для записи заметок
 * @returns {ParsedEvent|null} - Нормализованный event или null
 */
function normalizeEvent(event, index, info = null) {
    try {
        if (!event || typeof event.description !== 'string' || !event.description.trim()) return null;
        return {
            type:        String(event.type || 'world_event').toLowerCase(),
            description: event.description.trim(),
            effects:     Array.isArray(event.effects)
                           ? event.effects.map(normalizeOperation).filter(Boolean)
                           : [],
            reason:      String(event.reason || '').trim(),
        };
    } catch (error) {
        debugLog(`❌ normalizeEvent[${index}]: ${error.message}`);
        return null;
    }
}

/**
 * Применяет полную нормализацию к распарсенному объекту.
 * Приводит к единой структуре ParsedAIResponse.
 *
 * @param {Object} parsedData - Объект, полученный после парсинга
 * @param {ParsingInfo} [info] - Объект информации для записи заметок
 * @returns {ParsedAIResponse}
 */
function normalizeParsedObject(parsedData, info = null) {
    debugLog('🔧 normalizeParsedObject: start');
    const result = { ...parsedData };

    result.choices  = Array.isArray(result.choices)  ? result.choices  : [];
    result.events   = Array.isArray(result.events)   ? result.events   : [];
    result.thoughts = Array.isArray(result.thoughts) ? result.thoughts : [];

    // --- aiMemory: нормализация к объекту ---
    if (result.aiMemory !== undefined && result.aiMemory !== null) {
        if (typeof result.aiMemory === 'string') {
            const trimmed = result.aiMemory.trim();
            if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
                try {
                    const parsed = JSON.parse(trimmed);
                    result.aiMemory = Array.isArray(parsed) ? { array: parsed } : parsed;
                    info?.normalizationNotes.push('aiMemory: string→object (JSON.parse)');
                } catch {
                    result.aiMemory = { rawValue: trimmed };
                    info?.normalizationNotes.push('aiMemory: string не удалось распарсить → { rawValue }');
                }
            } else {
                result.aiMemory = { value: trimmed };
                info?.normalizationNotes.push('aiMemory: простая строка → { value }');
            }
        } else if (Array.isArray(result.aiMemory)) {
            result.aiMemory = { array: result.aiMemory };
            info?.normalizationNotes.push('aiMemory: массив → { array }');
        } else if (typeof result.aiMemory !== 'object') {
            result.aiMemory = { value: result.aiMemory };
            info?.normalizationNotes.push(`aiMemory: примитив → { value }`);
        }
    } else {
        result.aiMemory = {};
    }

    // --- choices & events: фильтрация и нормализация каждого элемента ---
    result.choices = result.choices.map((choice, idx) => normalizeChoice(choice, idx, info)).filter(Boolean);
    result.events  = result.events.map((event, idx) => normalizeEvent(event, idx, info)).filter(Boolean);

    return result;
}

// ----------------------------------------------------------------------------
// ГЛАВНАЯ ТОЧКА ВХОДА
// ----------------------------------------------------------------------------

/**
 * Основная функция парсинга ответа от ИИ.
 * Принимает строку (сырой ответ) или уже готовый объект.
 * Гарантирует возврат объекта с полем `parsing_info` даже при критических ошибках.
 *
 * @param {string|Object} input - Сырая строка ответа или объект
 * @returns {ParsedAIResponse} - Нормализованные данные + мета-информация
 */
function processAIResponse(input) {
    const startTime = Date.now();
    debugBuffer.length = 0;
    debugLog('🚀 processAIResponse v8.1 start', { type: typeof input });

    // --- Случай: готовый объект (не массив) ---
    if (input && typeof input === 'object' && !Array.isArray(input)) {
        debugLog('📦 Объект → нормализация напрямую');
        const info = createEmptyInfo();
        info.approach = 'direct_object';
        info.parsingSteps.push('Объект получен напрямую');

        const normalized = normalizeParsedObject(input, info);
        finalizeInfo(info, normalized, 0, 0, startTime);
        normalized.parsing_info = info;
        flushDebugBuffer(info);
        return normalized;
    }

    // --- Случай: строка ---
    const rawText = (input || '').trim();
    const info = createEmptyInfo();
    info.rawResponseText = rawText;
    info.status = 'WARN';

    let text = rawText;

    // Уровень 0.5: вложенный API-ответ
    const nested = extractNestedJsonFromApiResponse(text);
    if (nested) {
        text = nested;
        info.parsingSteps.push('0.5: извлечение из choices[0].message.content');
        debugLog('📦 Обнаружен вложенный JSON API');
    }

    // Уровень 0: предобработка
    info.parsingSteps.push('0: предобработка (decodeUnicode + preprocessJson)');
    text = decodeUnicodeEscapes(text);
    text = preprocessJson(text);

    let parsedData = emptyResult();
    let originalChoicesTotal = 0;
    let originalEventsTotal = 0;

    // Уровень 1: стандартный JSON.parse
    info.parsingSteps.push('1: JSON.parse');
    try {
        const parsed = JSON.parse(text);
        parsedData = { ...parsedData, ...parsed };
        info.approach = 'standard_json_parse';
        info.status   = 'OK';
        originalChoicesTotal = Array.isArray(parsedData.choices) ? parsedData.choices.length : 0;
        originalEventsTotal  = Array.isArray(parsedData.events)  ? parsedData.events.length  : 0;
        debugLog('✅ Уровень 1: SUCCESS');
    } catch (error) {
        const position = error.message.match(/position (\d+)/)?.[1] || '?';
        info.knownFieldErrors.root = `JSON.parse: ${error.message} (~pos ${position})`;
        debugLog(`❌ Уровень 1: FAIL pos=${position}`);
    }

    // Уровень 2: balanceBrackets + parse
    if (info.status !== 'OK') {
        info.parsingSteps.push('2: balanceBrackets + JSON.parse');
        try {
            const repaired = balanceBrackets(text);
            const parsed   = JSON.parse(repaired);
            parsedData = { ...parsedData, ...parsed };
            info.approach = 'truncated_repair';
            info.status   = 'WARN';
            originalChoicesTotal = Array.isArray(parsedData.choices) ? parsedData.choices.length : 0;
            originalEventsTotal  = Array.isArray(parsedData.events)  ? parsedData.events.length  : 0;
            debugLog('✅ Уровень 2: SUCCESS');
        } catch (error) {
            debugLog(`❌ Уровень 2: FAIL: ${error.message}`);
        }
    }

    // Уровень 3: агрессивное извлечение (bracket-counting)
    if (info.status !== 'OK') {
        info.approach = 'aggressive_bracket_counting';
        info.parsingSteps.push('3: агрессивное извлечение (bracket-counting v8.0)');

        parsedData.scene        = extractRootField(text, 'scene')        || '';
        parsedData.reflection   = extractRootField(text, 'reflection')   || '';
        parsedData.typology     = extractRootField(text, 'typology')     || '';
        parsedData.personality  = extractRootField(text, 'personality')  || '';
        parsedData.summary      = extractRootField(text, 'summary')      || '';
        parsedData.design_notes = extractRootField(text, 'design_notes') || '';
        parsedData.aiMemory     = extractRootField(text, 'aiMemory')     || {};

        const choicesResult = extractArrayWithStats(text, 'choices');
        parsedData.choices = choicesResult.items;
        originalChoicesTotal = choicesResult.totalFound;
        info.recoveredCount += choicesResult.recovered;

        const eventsResult = extractArrayWithStats(text, 'events');
        parsedData.events = eventsResult.items;
        originalEventsTotal = eventsResult.totalFound;
        info.recoveredCount += eventsResult.recovered;

        parsedData.thoughts = (extractRootField(text, 'thoughts') || []);
    }

    // Нормализация
    parsedData = normalizeParsedObject(parsedData, info);

    // Финализация info
    finalizeInfo(info, parsedData, originalChoicesTotal, originalEventsTotal, startTime);
    parsedData.parsing_info = info;
    flushDebugBuffer(info);

    debugLog('🏁 processAIResponse DONE', { status: info.status, ms: info.durationMs });
    return parsedData;
}

// ----------------------------------------------------------------------------
// ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ДЛЯ INFO
// ----------------------------------------------------------------------------

/**
 * Создаёт пустой объект ParsingInfo с значениями по умолчанию.
 * @returns {ParsingInfo}
 */
function createEmptyInfo() {
    return {
        status: 'WARN',
        approach: 'unknown',
        knownFieldErrors: {},
        extractedOperationsCount: 0,
        rawResponseText: '',
        parsingSteps: [],
        choicesCount: '0/0',
        eventsCount: '0/0',
        thoughtsCount: 0,
        recoveredCount: 0,
        normalizationNotes: [],
        durationMs: 0,
        debugLog: [],
    };
}

/**
 * Создаёт пустой объект ParsedAIResponse со всеми полями.
 * @returns {ParsedAIResponse}
 */
function emptyResult() {
    return {
        scene: '', reflection: '', personality: '',
        typology: '', summary: '', design_notes: '',
        choices: [], events: [], thoughts: [], aiMemory: {},
    };
}

/**
 * Заполняет итоговую информацию о парсинге:
 * - подсчитывает общее количество операций,
 * - устанавливает счётчики,
 * - вычисляет статус.
 *
 * @param {ParsingInfo} info - Объект информации для заполнения
 * @param {ParsedAIResponse} data - Нормализованные данные
 * @param {number} originalChoicesTotal - Количество найденных choices до фильтрации
 * @param {number} originalEventsTotal - Количество найденных events до фильтрации
 * @param {number} startTime - Время начала выполнения (ms)
 */
function finalizeInfo(info, data, originalChoicesTotal, originalEventsTotal, startTime) {
    let totalOperations = 0;
    (data.choices || []).forEach(choice => {
        totalOperations += (choice.success_rewards?.length || 0) + (choice.fail_penalties?.length || 0);
    });
    (data.events || []).forEach(event => {
        totalOperations += (event.effects?.length || 0);
    });

    info.extractedOperationsCount = totalOperations;
    info.thoughtsCount = (data.thoughts || []).length;
    info.choicesCount  = `${(data.choices || []).length}/${originalChoicesTotal}`;
    info.eventsCount   = `${(data.events  || []).length}/${originalEventsTotal}`;
    info.durationMs    = Date.now() - startTime;

    // Определяем итоговый статус
    const isValid = typeof data.scene === 'string' &&
                    data.scene.trim().length > 0 &&
                    Array.isArray(data.choices);

    if (!isValid && info.status !== 'ERROR') {
        info.status = 'ERROR';
    }
    // если статус уже WARN и данные валидны — остаётся WARN (предупреждение о восстановлении)
}

/**
 * Копирует краткий отчёт о парсинге в буфер обмена.
 * @param {ParsedAIResponse} data - результат processAIResponse
 */
function copyToClipboard(data) {
    const info = data?.parsing_info || {};
    const report = {
        status: info.status,
        approach: info.approach,
        sceneLength: data.scene?.length || 0,
        choicesCount: info.choicesCount,
        eventsCount: info.eventsCount,
        thoughtsCount: info.thoughtsCount,
        operationsCount: info.extractedOperationsCount,
        recoveredCount: info.recoveredCount || 0,
        normalizationNotes: info.normalizationNotes,
        errors: Object.keys(info.knownFieldErrors || {}).length ? info.knownFieldErrors : null,
        timestamp: new Date().toISOString(),
    };
    navigator.clipboard
        .writeText(JSON.stringify(report, null, 2))
        .then(() => console.log('📋 Отчёт скопирован'))
        .catch(err => console.error('❌ Clipboard error:', err));
}

// ----------------------------------------------------------------------------
// ЭКСПОРТ
// ----------------------------------------------------------------------------
export const Parser = {
    processAIResponse,
    normalizeOperation,
    normalizeChoice,
    normalizeEvent,
    decodeUnicodeEscapes,
    preprocessJson,
    copyToClipboard,
    debugLog,
    getLastDebugLog,
    // Утилиты (для тестирования и 7-2-api-response.js)
    findArrayContent,
    extractOperationsFromBrokenObject,
    balanceBrackets,
};

console.log('✅ Parser v8.1 (полное комментирование, понятные имена) загружен');