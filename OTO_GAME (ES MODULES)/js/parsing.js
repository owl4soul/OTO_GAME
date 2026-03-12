// ====================================================================
// ФАЙЛ: parsing.js
// ВЕРСИЯ: v8.0 — BRACKET-COUNTING EXTRACTION + ПОЛНОЕ ВОССТАНОВЛЕНИЕ ВЛОЖЕННЫХ ОПЕРАЦИЙ
// ====================================================================
//
// @module Parser
// @description
//   Единственный модуль парсинга ответов от ИИ. Гарантирует извлечение данных
//   даже из сильно повреждённых или обрезанных JSON-ответов.
//
// ИСПРАВЛЕНЫ КРИТИЧЕСКИЕ БАГИ v7.x:
//   1. REGEX-баг: все ленивые regex `[\s\S]*?` заменены на bracket-counting функцию
//      `findArrayContent()`. Ленивый regex останавливался на ПЕРВОМ `]`, убивая
//      все вложенные массивы (success_rewards, fail_penalties, effects).
//   2. decodeUnicodeEscapes теперь декодирует ТОЛЬКО `\uXXXX`. Ранее он заменял
//      `\"` → `"` ДО JSON.parse, разрушая границы строк.
//   3. extractOperationsFromBrokenObject переписан с bracket-counting +
//      посимвольным fallback для каждого объекта отдельно.
//   4. Добавлен `getLastDebugLog()` — экспорт буфера для дебаггера.
//   5. Нормализация ADD-операций: поле `value` корректно обрабатывается.
//
// АЛГОРИТМ РАБОТЫ:
//   0. Если вход — объект → нормализация без парсинга.
//   1. Строка → проверяем на вложенный API-ответ (choices[0].message.content).
//   2. Уровень 0: предобработка (markdown, экранирование newline, висячие запятые).
//   3. Уровень 1: стандартный JSON.parse.
//   4. Уровень 2: balanceBrackets + повторный JSON.parse.
//   5. Уровень 3: агрессивное извлечение через bracket-counting для всех полей.
//   6. Нормализация: aiMemory, choices, events, operations, requirements.
//   7. Сбор ParsingInfo + debugBuffer для дебаггера.
//
// ГЛУБИНА ИЗВЛЕЧЕНИЯ:
//   - Корневые поля: scene, reflection, typology, personality, summary, design_notes.
//   - Массивы: choices (+ success_rewards, fail_penalties, requirements),
//              events (+ effects), thoughts.
//   - Объект: aiMemory (любая сложность).
//   - Рекурсивное восстановление вложенных операций из повреждённых объектов.
//
// ИСТОРИЯ ИЗМЕНЕНИЙ:
//   v6.9–v7.8 – см. предыдущие версии.
//   v8.0      – bracket-counting вместо lazy regex; исправлен decodeUnicodeEscapes;
//               переписан extractOperationsFromBrokenObject; добавлен getLastDebugLog().
// ====================================================================

'use strict';

import { CONFIG } from './1-config.js';
import { log, LOG_CATEGORIES } from './logger.js';

/**
 * @typedef {Object} GameOperation
 * @property {string}  operation   - 'ADD' | 'REMOVE' | 'MODIFY' | 'SET'
 * @property {string}  id          - идентификатор game_item, например 'stat:sanity'
 * @property {number}  [delta]     - изменение для MODIFY
 * @property {*}       [value]     - значение для ADD/SET
 * @property {number}  [duration]  - длительность в ходах
 * @property {string}  [description]
 */

/**
 * @typedef {Object} ParsedChoice
 * @property {string}         text
 * @property {number}         difficulty_level  - 1–10
 * @property {string[]}       requirements
 * @property {GameOperation[]} success_rewards
 * @property {GameOperation[]} fail_penalties
 */

/**
 * @typedef {Object} ParsedEvent
 * @property {string}         type
 * @property {string}         description
 * @property {GameOperation[]} effects
 * @property {string}         reason
 */

/**
 * @typedef {Object} ParsingInfo
 * @property {'OK'|'WARN'|'ERROR'} status
 * @property {string}   approach           - какой уровень сработал
 * @property {Object}   knownFieldErrors   - ошибки по полям
 * @property {number}   extractedOperationsCount
 * @property {string}   rawResponseText
 * @property {string[]} parsingSteps
 * @property {string}   choicesCount       - "успешно/найдено"
 * @property {string}   eventsCount
 * @property {number}   thoughtsCount
 * @property {number}   recoveredCount
 * @property {string[]} normalizationNotes
 * @property {number}   durationMs
 * @property {string[]} debugLog           - полный лог шагов (для дебаггера)
 */

// ============================================================================
// ГЛОБАЛЬНЫЕ НАСТРОЙКИ И DEBUG-РЕЖИМ
// ============================================================================

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
        console.log(`🛠️ [Parser v8.0] DEBUG_MODE = ${DEBUG_MODE}`);
    };
}

// ============================================================================
// DEBUG-БУФЕР
// ============================================================================

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
            `🧪 [PARSER v8.0] ${info.approach} | ops:${info.extractedOperationsCount} | ` +
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

// ============================================================================
// ПРЕДОБРАБОТКА JSON
// ============================================================================

/**
 * Предварительная обработка JSON-строки перед парсингом:
 * - Удаляет обёртки ```json ... ```
 * - Экранирует РЕАЛЬНЫЕ (буквальные) переносы строк внутри JSON-строк → `\n`
 * - Удаляет висячие запятые перед `}` и `]`
 *
 * ВАЖНО: не трогает escape-последовательности (`\"`, `\\`),
 * чтобы не сломать JSON до вызова JSON.parse.
 *
 * @param {string} jsonText
 * @returns {string}
 */
function preprocessJson(jsonText) {
    debugLog('🔧 preprocessJson: start', { len: jsonText?.length });
    if (!jsonText || typeof jsonText !== 'string') return jsonText;

    let result = jsonText.trim()
        .replace(/^```json\s*/i, '')
        .replace(/\s*```$/i, '');

    // Экранируем буквальные переносы строк внутри JSON-строк
    let inString = false, escapeNext = false, fixed = '';
    for (let i = 0; i < result.length; i++) {
        const ch = result[i];
        if (escapeNext) { fixed += ch; escapeNext = false; continue; }
        if (ch === '\\') { escapeNext = true; fixed += ch; continue; }
        if (ch === '"') { inString = !inString; fixed += ch; continue; }
        if (inString) {
            if (ch === '\n') { fixed += '\\n'; }
            else if (ch === '\r') { fixed += '\\r'; }
            else { fixed += ch; }
        } else {
            fixed += ch;
        }
    }

    // Висячие запятые
    fixed = fixed.replace(/,\s*([}\]])/g, '$1');
    debugLog('✅ preprocessJson: done');
    return fixed;
}

/**
 * Балансирует скобки и удаляет висячие запятые — резервный ремонт обрезанного JSON.
 * @param {string} str
 * @returns {string}
 */
function balanceBrackets(str) {
    let result = (str || '').trim()
        .replace(/^```json\s*/i, '')
        .replace(/\s*```$/i, '');

    // Закрываем незакрытую строку
    let inStr = false, esc = false;
    for (let i = 0; i < result.length; i++) {
        const ch = result[i];
        if (esc) { esc = false; continue; }
        if (ch === '\\') { esc = true; continue; }
        if (ch === '"') inStr = !inStr;
    }
    if (inStr) result += '"';

    // Висячие запятые
    result = result.replace(/,\s*([}\]])/g, '$1');

    // Добавляем недостающие скобки
    let oc = 0, cc = 0, os = 0, cs = 0;
    inStr = false; esc = false;
    for (let i = 0; i < result.length; i++) {
        const ch = result[i];
        if (esc) { esc = false; continue; }
        if (ch === '\\') { esc = true; continue; }
        if (ch === '"') { inStr = !inStr; continue; }
        if (!inStr) {
            if (ch === '{') oc++;
            if (ch === '}') cc++;
            if (ch === '[') os++;
            if (ch === ']') cs++;
        }
    }
    if (os > cs) result += ']'.repeat(os - cs);
    if (oc > cc) result += '}'.repeat(oc - cc);

    return result;
}

// ============================================================================
// ★ BRACKET-COUNTING: КЛЮЧЕВАЯ НОВАЯ ФУНКЦИЯ v8.0 ★
// ============================================================================

/**
 * Находит полное содержимое JSON-массива для заданного ключа методом подсчёта скобок.
 * Заменяет ВСЕ ленивые regex `[\s\S]*?` — они останавливались на ПЕРВОМ `]`,
 * уничтожая вложенные массивы success_rewards / fail_penalties / effects.
 *
 * @param {string} text   - полный текст ответа
 * @param {string} key    - имя поля (например 'choices', 'success_rewards')
 * @returns {string|null} - строка вида `[...]` или null если поле не найдено
 */
function findArrayContent(text, key) {
    debugLog(`🔍 findArrayContent: "${key}"`);
    // Ищем  "key"   :   [
    const startRe = new RegExp(`"${key}"\\s*:\\s*\\[`, 'i');
    const startMatch = startRe.exec(text);
    if (!startMatch) {
        debugLog(`   → "${key}" не найден`);
        return null;
    }

    // Позиция открывающей `[`
    const openPos = startMatch.index + startMatch[0].length - 1;
    let depth = 0, inStr = false, esc = false;

    for (let i = openPos; i < text.length; i++) {
        const ch = text[i];
        if (esc) { esc = false; continue; }
        if (ch === '\\') { esc = true; continue; }
        if (ch === '"') { inStr = !inStr; continue; }
        if (!inStr) {
            if (ch === '[') depth++;
            else if (ch === ']') {
                depth--;
                if (depth === 0) {
                    const result = text.substring(openPos, i + 1);
                    debugLog(`   → найден "${key}" длиной ${result.length}`);
                    return result;
                }
            }
        }
    }
    // Обрезанный JSON — возвращаем с конца, balanceBrackets исправит
    const truncated = text.substring(openPos);
    debugLog(`   → "${key}" обрезан, длина ${truncated.length}`);
    return truncated;
}

/**
 * Находит полное содержимое JSON-объекта для заданного ключа (bracket counting).
 * @param {string} text
 * @param {string} key
 * @returns {string|null} - строка вида `{...}` или null
 */
function findObjectContent(text, key) {
    const startRe = new RegExp(`"${key}"\\s*:\\s*\\{`, 'i');
    const startMatch = startRe.exec(text);
    if (!startMatch) return null;

    const openPos = startMatch.index + startMatch[0].length - 1;
    let depth = 0, inStr = false, esc = false;

    for (let i = openPos; i < text.length; i++) {
        const ch = text[i];
        if (esc) { esc = false; continue; }
        if (ch === '\\') { esc = true; continue; }
        if (ch === '"') { inStr = !inStr; continue; }
        if (!inStr) {
            if (ch === '{') depth++;
            else if (ch === '}') {
                depth--;
                if (depth === 0) return text.substring(openPos, i + 1);
            }
        }
    }
    return text.substring(openPos);
}

// ============================================================================
// ИЗВЛЕЧЕНИЕ ВЛОЖЕННОГО JSON ИЗ API-ОТВЕТА
// ============================================================================

/**
 * Проверяет, является ли текст полным ответом API (choices[0].message.content).
 * Если да — извлекает и возвращает content.
 * @param {string} text
 * @returns {string|null}
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
    } catch {}
    return null;
}

// ============================================================================
// ДЕКОДИРОВАНИЕ UNICODE
// ============================================================================

/**
 * Декодирует ТОЛЬКО `\uXXXX` escape-последовательности в читаемые символы.
 *
 * ВАЖНО v8.0: НЕ трогает `\"`, `\\`, `\n`, `\t` — эти замены РАЗРУШАЛИ JSON
 * до вызова JSON.parse, что приводило к "He said "hello"" вместо "He said \"hello\"".
 *
 * @param {string} text
 * @returns {string}
 */
function decodeUnicodeEscapes(text) {
    if (!text || typeof text !== 'string') return text;
    return text.replace(/\\u[\dA-Fa-f]{4}/g, match => {
        try {
            return String.fromCharCode(parseInt(match.slice(2), 16));
        } catch { return match; }
    });
}

// ============================================================================
// ИЗВЛЕЧЕНИЕ ОБЪЕКТОВ ИЗ МАССИВА (посимвольный разбор)
// ============================================================================

/**
 * Извлекает все top-level объекты из строки, представляющей JSON-массив.
 * Корректно обрабатывает вложенность и escape-последовательности.
 * @param {string} text - строка вида `[{...}, {...}]`
 * @returns {string[]} - массив строк-объектов
 */
function extractTopLevelObjects(text) {
    debugLog(`🔍 extractTopLevelObjects`, { len: text?.length });
    const objects = [];
    let i = 0;
    while (i < text.length && text[i] !== '[') i++;
    if (i >= text.length) return objects;
    i++; // за '['

    let inStr = false, esc = false, depth = 0, start = -1;
    while (i < text.length) {
        const ch = text[i];
        if (esc) { esc = false; i++; continue; }
        if (ch === '\\') { esc = true; i++; continue; }
        if (ch === '"') { inStr = !inStr; i++; continue; }
        if (!inStr) {
            if (ch === '{') {
                if (depth === 0) start = i;
                depth++;
            } else if (ch === '}') {
                depth--;
                if (depth === 0 && start !== -1) {
                    objects.push(text.substring(start, i + 1));
                    start = -1;
                }
            } else if (ch === ']' && depth === 0) {
                break;
            }
        }
        i++;
    }
    debugLog(`   → извлечено ${objects.length} объектов`);
    return objects;
}

// ============================================================================
// ИЗВЛЕЧЕНИЕ ПОЛЕЙ ИЗ ПОВРЕЖДЁННЫХ ОБЪЕКТОВ
// ============================================================================

/**
 * Извлекает строковое поле из повреждённого объекта.
 * @param {string} text
 * @param {string} fieldName
 * @returns {string|null}
 */
function extractFieldFromBrokenObject(text, fieldName) {
    try {
        const re = new RegExp(`"${fieldName}"\\s*:\\s*"((?:[^"\\\\]|\\\\.)*)"`, 's');
        const m = re.exec(text);
        if (m) return m[1].replace(/\\"/g, '"').replace(/\\\\/g, '\\');
    } catch {}
    return null;
}

/**
 * Извлекает числовое поле из повреждённого объекта.
 * @param {string} text
 * @param {string} fieldName
 * @param {number} [defaultValue=0]
 * @returns {number}
 */
function extractNumberFromBrokenObject(text, fieldName, defaultValue = 0) {
    try {
        const re = new RegExp(`"${fieldName}"\\s*:\\s*(-?\\d+(?:\\.\\d+)?)`, 'i');
        const m = re.exec(text);
        if (m) return parseFloat(m[1]);
    } catch {}
    return defaultValue;
}

/**
 * Извлекает difficulty_level из повреждённого объекта.
 * @param {string} text
 * @returns {number}
 */
function extractDifficultyFromBrokenObject(text) {
    return extractNumberFromBrokenObject(text, 'difficulty_level', 5);
}

/**
 * Извлекает массив requirements из повреждённого объекта.
 * Использует bracket-counting через findArrayContent.
 * @param {string} text
 * @returns {Array}
 */
function extractRequirementsFromBrokenObject(text) {
    debugLog('🔍 extractRequirementsFromBrokenObject');
    try {
        const arrContent = findArrayContent(text, 'requirements');
        if (!arrContent) return [];
        const balanced = balanceBrackets(arrContent);
        const parsed = JSON.parse(balanced);
        if (Array.isArray(parsed)) return parsed;
    } catch (e) {
        debugLog(`   ⚠️ requirements parse failed: ${e.message}`);
    }
    return [];
}

// ============================================================================
// ★ ИСПРАВЛЕНО v8.0: ИЗВЛЕЧЕНИЕ ОПЕРАЦИЙ ЧЕРЕЗ BRACKET-COUNTING ★
// ============================================================================

/**
 * Извлекает массив операций (success_rewards / fail_penalties / effects)
 * из фрагмента объекта методом bracket-counting (v8.0).
 *
 * Ранее здесь использовался ленивый regex `[\s\S]*?`, останавливающийся на
 * первом `]` внутри вложенных структур — полный массив операций терялся.
 *
 * @param {string} text - фрагмент объекта choice или event
 * @param {string} key  - 'success_rewards' | 'fail_penalties' | 'effects'
 * @returns {GameOperation[]}
 */
function extractOperationsFromBrokenObject(text, key) {
    debugLog(`🔍 extractOperationsFromBrokenObject: "${key}"`);

    // Шаг 1: bracket-counting extraction
    const arrContent = findArrayContent(text, key);
    if (!arrContent) {
        debugLog(`   → массив "${key}" не найден`);
        return [];
    }

    const balanced = balanceBrackets(arrContent);

    // Шаг 2: попытка прямого JSON.parse всего массива
    try {
        const parsed = JSON.parse(balanced);
        if (Array.isArray(parsed)) {
            debugLog(`   → "${key}" распарсен напрямую (${parsed.length} операций)`);
            return parsed;
        }
    } catch (e) {
        debugLog(`   ⚠️ прямой parse "${key}" провалился: ${e.message}`);
    }

    // Шаг 3: извлечение объектов по одному
    const objectStrings = extractTopLevelObjects(balanced);
    const result = [];

    for (const objStr of objectStrings) {
        // Пробуем прямой parse объекта
        try {
            const repaired = balanceBrackets(objStr);
            const op = JSON.parse(repaired);
            if (op && typeof op === 'object') {
                result.push(op);
                continue;
            }
        } catch {}

        // Fallback: ручное извлечение полей операции
        const op = {};
        const operationVal = extractFieldFromBrokenObject(objStr, 'operation');
        const idVal        = extractFieldFromBrokenObject(objStr, 'id');
        const descVal      = extractFieldFromBrokenObject(objStr, 'description');

        if (operationVal) op.operation   = operationVal;
        if (idVal)        op.id          = idVal;
        if (descVal)      op.description = descVal;

        // delta (для MODIFY)
        const delta = /"delta"\s*:\s*(-?\d+(?:\.\d+)?)/.exec(objStr);
        if (delta) op.delta = parseFloat(delta[1]);

        // duration
        const dur = /"duration"\s*:\s*(\d+)/.exec(objStr);
        if (dur) op.duration = parseInt(dur[1], 10);

        // value (для ADD/SET): может быть числом или строкой
        const valNum = /"value"\s*:\s*(-?\d+(?:\.\d+)?)/.exec(objStr);
        const valStr = /"value"\s*:\s*"((?:[^"\\]|\\.)*)"/.exec(objStr);
        if (valNum && !valStr) {
            op.value = parseFloat(valNum[1]);
        } else if (valStr) {
            op.value = valStr[1].replace(/\\"/g, '"').replace(/\\\\/g, '\\');
        }

        if (op.id) {
            result.push(op);
            debugLog(`   → ручное извлечение операции: ${op.operation || '?'} ${op.id}`);
        }
    }

    debugLog(`   → "${key}": извлечено ${result.length} операций`);
    return result;
}

// ============================================================================
// ИЗВЛЕЧЕНИЕ МАССИВА С ВОССТАНОВЛЕНИЕМ (v8.0 — bracket-counting)
// ============================================================================

/**
 * Извлекает массив choices или events с посимвольным восстановлением повреждённых объектов.
 * Использует findArrayContent() вместо lazy regex.
 *
 * @param {string} text - полный текст ответа
 * @param {'choices'|'events'} key
 * @returns {{ items: Array, totalFound: number, recovered: number }}
 */
function extractArrayWithStats(text, key) {
    debugLog(`📍 extractArrayWithStats v8.0: "${key}"`);

    // ★ v8.0: bracket-counting вместо REGEX_CACHE с lazy match
    const arrContent = findArrayContent(text, key);
    if (!arrContent) {
        debugLog(`   → "${key}" не найден`);
        return { items: [], totalFound: 0, recovered: 0 };
    }

    const balanced  = balanceBrackets(arrContent);
    const objStrs   = extractTopLevelObjects(balanced);
    const totalFound = objStrs.length;
    const items = [];
    let recoveredCount = 0;

    for (let idx = 0; idx < objStrs.length; idx++) {
        const objStr = objStrs[idx];

        // Попытка прямого JSON.parse
        try {
            const obj = JSON.parse(objStr);
            items.push(obj);
            debugLog(`   → ${key}[${idx}] распарсен`);
            continue;
        } catch {}

        // Попытка с balanceBrackets
        try {
            const obj = JSON.parse(balanceBrackets(objStr));
            items.push(obj);
            debugLog(`   → ${key}[${idx}] восстановлен через balanceBrackets`);
            recoveredCount++;
            continue;
        } catch (e) {
            debugLog(`   → ${key}[${idx}] повреждён: ${e.message}, ручное восстановление`);
        }

        // Ручное восстановление
        if (key === 'choices') {
            const textField = extractFieldFromBrokenObject(objStr, 'text');
            const recovered = {
                text:             textField || `Выбор #${idx + 1}`,
                difficulty_level: extractDifficultyFromBrokenObject(objStr),
                requirements:     extractRequirementsFromBrokenObject(objStr),
                success_rewards:  extractOperationsFromBrokenObject(objStr, 'success_rewards'),
                fail_penalties:   extractOperationsFromBrokenObject(objStr, 'fail_penalties'),
            };
            items.push(recovered);
            recoveredCount++;
            debugLog(`   → choice[${idx}] восстановлен вручную: "${(recovered.text || '').substring(0, 50)}"`);

        } else if (key === 'events') {
            const descField = extractFieldFromBrokenObject(objStr, 'description');
            const recovered = {
                type:        extractFieldFromBrokenObject(objStr, 'type') || 'world_event',
                description: descField || `Событие #${idx + 1}`,
                effects:     extractOperationsFromBrokenObject(objStr, 'effects'),
                reason:      extractFieldFromBrokenObject(objStr, 'reason') || '',
            };
            items.push(recovered);
            recoveredCount++;
            debugLog(`   → event[${idx}] восстановлен вручную: "${(recovered.description || '').substring(0, 50)}"`);
        }
    }

    debugLog(`   → ${key}: ${items.length}/${totalFound} (recovered: ${recoveredCount})`);
    return { items, totalFound, recovered: recoveredCount };
}

// ============================================================================
// ИЗВЛЕЧЕНИЕ КОРНЕВЫХ ПОЛЕЙ (агрессивный режим)
// ============================================================================

/**
 * Извлекает любое корневое поле методом bracket-counting для объектов/массивов
 * или regex для примитивов.
 * @param {string} text
 * @param {string} key
 * @returns {any}
 */
function extractRootField(text, key) {
    debugLog(`📍 extractRootField: "${key}"`);
    const re = new RegExp(`"${key}"\\s*:\\s*`, 'i');
    const m  = re.exec(text);
    if (!m) { debugLog(`   → не найдено`); return null; }

    let pos = m.index + m[0].length;
    while (pos < text.length && /\s/.test(text[pos])) pos++;

    const first = text[pos];

    if (first === '[') {
        const arrContent = findArrayContent(text, key);
        if (!arrContent) return [];
        try {
            const r = JSON.parse(balanceBrackets(arrContent));
            debugLog(`   → "${key}" массив [${Array.isArray(r) ? r.length : '?'}]`);
            return r;
        } catch { return []; }
    }

    if (first === '{') {
        const objContent = findObjectContent(text, key);
        if (!objContent) return {};
        try {
            const r = JSON.parse(balanceBrackets(objContent));
            debugLog(`   → "${key}" объект`);
            return r;
        } catch { return objContent; }
    }

    // Примитив
    const prim = text.slice(pos).match(/^(true|false|null|-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?|"(?:[^"\\]|\\.)*")/);
    if (prim) {
        try {
            const r = JSON.parse(prim[0]);
            debugLog(`   → "${key}" примитив: ${String(r).substring(0, 30)}`);
            return r;
        } catch { return prim[0]; }
    }

    debugLog(`   → "${key}" не удалось извлечь`);
    return null;
}

// ============================================================================
// НОРМАЛИЗАЦИЯ
// ============================================================================

/**
 * Нормализует элемент requirements к строке.
 * @param {*} req
 * @param {ParsingInfo} [info]
 * @returns {string|null}
 */
function normalizeRequirement(req, info = null) {
    if (!req) return null;
    if (typeof req === 'string') return req.trim() || null;
    if (typeof req === 'object' && req !== null) {
        if (req.id && typeof req.id === 'string') return req.id.trim() || null;
        info?.normalizationNotes.push(`requirement-объект без id: ${JSON.stringify(req)}`);
        return null;
    }
    return null;
}

/**
 * Нормализует одну операцию (success_reward / fail_penalty / effect).
 * Поддерживает: MODIFY (delta), ADD/SET (value), REMOVE.
 * @param {Object} op
 * @returns {Object|null}
 */
function normalizeOperation(op) {
    try {
        if (!op || typeof op !== 'object' || !op.id) return null;

        const norm = { ...op };
        norm.id = String(norm.id).toLowerCase().replace(/\s+/g, '_');

        if (typeof norm.operation === 'string') {
            norm.operation = norm.operation.toUpperCase().trim();
        }

        // delta — числовой
        if (norm.delta !== undefined) norm.delta = Number(norm.delta) || 0;

        // value — сохраняем тип (строка для ADD:skill, число для ADD:debuff)
        // Только числовой тип нормируем если явно число
        if (norm.value !== undefined && typeof norm.value === 'number') {
            norm.value = Number(norm.value);
        }

        // duration — не менее 1
        if (norm.duration !== undefined) {
            norm.duration = Math.max(1, Number(norm.duration) || 1);
        }

        norm.description = norm.description ? String(norm.description).trim() : '';

        if (!norm.id.includes(':')) {
            debugLog(`⚠️ normalizeOperation: id="${norm.id}" без ":" — возможно некорректно`);
        }
        return norm;
    } catch (e) {
        debugLog(`❌ normalizeOperation: ${e.message}`);
        return null;
    }
}

/**
 * Нормализует объект choice.
 * @param {Object} choice
 * @param {number} index
 * @param {ParsingInfo} [info]
 * @returns {ParsedChoice|null}
 */
function normalizeChoice(choice, index, info = null) {
    try {
        if (!choice || typeof choice.text !== 'string' || !choice.text.trim()) return null;

        let diff = Number(choice.difficulty_level);
        if (isNaN(diff) || diff < 1 || diff > 10) {
            const orig = diff;
            diff = Math.min(10, Math.max(1, diff || 5));
            info?.normalizationNotes.push(
                `choice[${index}].difficulty_level ${orig} → ${diff}`
            );
        }

        return {
            text:             choice.text.trim(),
            difficulty_level: diff,
            requirements:     Array.isArray(choice.requirements)
                                ? choice.requirements.map(r => normalizeRequirement(r, info)).filter(Boolean)
                                : [],
            success_rewards:  Array.isArray(choice.success_rewards)
                                ? choice.success_rewards.map(normalizeOperation).filter(Boolean)
                                : [],
            fail_penalties:   Array.isArray(choice.fail_penalties)
                                ? choice.fail_penalties.map(normalizeOperation).filter(Boolean)
                                : [],
        };
    } catch (e) {
        debugLog(`❌ normalizeChoice[${index}]: ${e.message}`);
        return null;
    }
}

/**
 * Нормализует объект event.
 * @param {Object} event
 * @param {number} index
 * @param {ParsingInfo} [info]
 * @returns {ParsedEvent|null}
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
    } catch (e) {
        debugLog(`❌ normalizeEvent[${index}]: ${e.message}`);
        return null;
    }
}

/**
 * Применяет полную нормализацию к распарсенному объекту.
 * @param {Object} parsedData
 * @param {ParsingInfo} [info]
 * @returns {Object}
 */
function normalizeParsedObject(parsedData, info = null) {
    debugLog('🔧 normalizeParsedObject: start');
    const result = { ...parsedData };

    result.choices  = Array.isArray(result.choices)  ? result.choices  : [];
    result.events   = Array.isArray(result.events)   ? result.events   : [];
    result.thoughts = Array.isArray(result.thoughts) ? result.thoughts : [];

    // --- aiMemory ---
    if (result.aiMemory !== undefined && result.aiMemory !== null) {
        if (typeof result.aiMemory === 'string') {
            const t = result.aiMemory.trim();
            if (t.startsWith('{') || t.startsWith('[')) {
                try {
                    const parsed = JSON.parse(t);
                    result.aiMemory = Array.isArray(parsed) ? { array: parsed } : parsed;
                    info?.normalizationNotes.push('aiMemory: string→object (JSON.parse)');
                } catch {
                    result.aiMemory = { rawValue: t };
                    info?.normalizationNotes.push('aiMemory: string не удалось распарсить → { rawValue }');
                }
            } else {
                result.aiMemory = { value: t };
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

    // --- choices & events ---
    result.choices = result.choices.map((c, i) => normalizeChoice(c, i, info)).filter(Boolean);
    result.events  = result.events.map((e, i) => normalizeEvent(e, i, info)).filter(Boolean);

    return result;
}

// ============================================================================
// ГЛАВНАЯ ТОЧКА ВХОДА
// ============================================================================

/**
 * Основная функция парсинга ответа от ИИ.
 * Принимает строку (сырой ответ) или уже готовый объект.
 * Гарантирует возврат объекта с полем `parsing_info` даже при критических ошибках.
 *
 * @param {string|Object} input - Сырая строка ответа или объект
 * @returns {Object} Нормализованные данные + `parsing_info: ParsingInfo`
 */
function processAIResponse(input) {
    const startTime = Date.now();
    debugBuffer.length = 0;
    debugLog('🚀 processAIResponse v8.0 start', { type: typeof input });

    // --- Случай: готовый объект ---
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
    let origChoicesTotal = 0, origEventsTotal = 0;

    // Уровень 1: стандартный JSON.parse
    info.parsingSteps.push('1: JSON.parse');
    try {
        const parsed = JSON.parse(text);
        parsedData = { ...parsedData, ...parsed };
        info.approach = 'standard_json_parse';
        info.status   = 'OK';
        origChoicesTotal = Array.isArray(parsedData.choices) ? parsedData.choices.length : 0;
        origEventsTotal  = Array.isArray(parsedData.events)  ? parsedData.events.length  : 0;
        debugLog('✅ Уровень 1: SUCCESS');
    } catch (e) {
        const pos = e.message.match(/position (\d+)/)?.[1] || '?';
        info.knownFieldErrors.root = `JSON.parse: ${e.message} (~pos ${pos})`;
        debugLog(`❌ Уровень 1: FAIL pos=${pos}`);
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
            origChoicesTotal = Array.isArray(parsedData.choices) ? parsedData.choices.length : 0;
            origEventsTotal  = Array.isArray(parsedData.events)  ? parsedData.events.length  : 0;
            debugLog('✅ Уровень 2: SUCCESS');
        } catch (e) {
            debugLog(`❌ Уровень 2: FAIL: ${e.message}`);
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

        const choicesRes = extractArrayWithStats(text, 'choices');
        parsedData.choices = choicesRes.items;
        origChoicesTotal   = choicesRes.totalFound;
        info.recoveredCount += choicesRes.recovered;

        const eventsRes  = extractArrayWithStats(text, 'events');
        parsedData.events  = eventsRes.items;
        origEventsTotal    = eventsRes.totalFound;
        info.recoveredCount += eventsRes.recovered;

        parsedData.thoughts = (extractRootField(text, 'thoughts') || []);
    }

    // Нормализация
    parsedData = normalizeParsedObject(parsedData, info);

    // Финализация info
    finalizeInfo(info, parsedData, origChoicesTotal, origEventsTotal, startTime);
    parsedData.parsing_info = info;
    flushDebugBuffer(info);

    debugLog('🏁 processAIResponse DONE', { status: info.status, ms: info.durationMs });
    return parsedData;
}

// ============================================================================
// ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ДЛЯ INFO
// ============================================================================

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

function emptyResult() {
    return {
        scene: '', reflection: '', personality: '',
        typology: '', summary: '', design_notes: '',
        choices: [], events: [], thoughts: [], aiMemory: {},
    };
}

function finalizeInfo(info, data, origChoicesTotal, origEventsTotal, startTime) {
    let ops = 0;
    (data.choices || []).forEach(c => {
        ops += (c.success_rewards?.length || 0) + (c.fail_penalties?.length || 0);
    });
    (data.events || []).forEach(e => {
        ops += (e.effects?.length || 0);
    });

    info.extractedOperationsCount = ops;
    info.thoughtsCount = (data.thoughts || []).length;
    info.choicesCount  = `${(data.choices || []).length}/${origChoicesTotal}`;
    info.eventsCount   = `${(data.events  || []).length}/${origEventsTotal}`;
    info.durationMs    = Date.now() - startTime;

    const valid = typeof data.scene === 'string' &&
                  data.scene.trim().length > 0 &&
                  Array.isArray(data.choices);

    if (!valid && info.status !== 'ERROR') {
        info.status = 'ERROR';
    } else if (info.status === 'WARN' && valid) {
        // остаётся WARN
    }
}

/**
 * Копирует краткий отчёт о парсинге в буфер обмена.
 * @param {Object} data - результат processAIResponse
 */
function copyToClipboard(data) {
    const info   = data?.parsing_info || {};
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
    debugLog,
    getLastDebugLog,
    // Утилиты (для тестирования и 7-2-api-response.js)
    findArrayContent,
    extractOperationsFromBrokenObject,
    balanceBrackets,
};

console.log('✅ Parser v8.0 (bracket-counting) загружен');