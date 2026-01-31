// Модуль 2: UTILS - Вспомогательные функции (2-utils.js)
'use strict';

import { CONFIG } from './1-config.js';


/**
 * Пытается починить обрезанный JSON (Auto-Heal)
 * Восстанавливает закрывающие кавычки и скобки, включая обрезанные строки в массивах.
 * @param {string} text - Битая JSON строка
 * @returns {string} - Потенциально валидная JSON строка
 */
/**
 * Пытается починить обрезанный JSON (Auto-Heal)
 * Восстанавливает закрывающие кавычки и скобки, включая обрезанные строки в массивах.
 * @param {string} text - Битая JSON строка
 * @returns {string} - Потенциально валидная JSON строка
 */
function repairTruncatedJSON(text) {
    let repaired = text.trim();
    
    // 1. Сначала исправляем неэкранированные символы новой строки и кавычки внутри строк
    let inString = false;
    let escapeNext = false;
    let result = '';
    
    for (let i = 0; i < repaired.length; i++) {
        const char = repaired[i];
        
        if (escapeNext) {
            result += char;
            escapeNext = false;
            continue;
        }
        
        if (char === '\\') {
            escapeNext = true;
            result += char;
            continue;
        }
        
        if (char === '"') {
            inString = !inString;
            result += char;
            continue;
        }
        
        if (inString) {
            // Экранируем проблемные символы внутри строк
            if (char === '\n') {
                result += '\\n';
            } else if (char === '\r') {
                result += '\\r';
            } else if (char === '\t') {
                result += '\\t';
            } else if (char === '"') {
                // Это не должно случиться, так как мы уже обрабатываем кавычки выше
                result += '\\"';
            } else if (char === '\\') {
                result += '\\\\';
            } else {
                result += char;
            }
        } else {
            result += char;
        }
    }
    
    repaired = result;
    
    // 2. Теперь балансируем скобки и кавычки
    let openCurly = 0, closeCurly = 0;
    let openSquare = 0, closeSquare = 0;
    let inString2 = false;
    let escapeNext2 = false;
    
    for (let i = 0; i < repaired.length; i++) {
        const char = repaired[i];
        
        if (escapeNext2) {
            escapeNext2 = false;
            continue;
        }
        
        if (char === '\\') {
            escapeNext2 = true;
            continue;
        }
        
        if (char === '"') {
            inString2 = !inString2;
            continue;
        }
        
        if (!inString2) {
            if (char === '{') openCurly++;
            if (char === '}') closeCurly++;
            if (char === '[') openSquare++;
            if (char === ']') closeSquare++;
        }
    }
    
    // Добавляем недостающие закрывающие скобки для массивов
    if (openSquare > closeSquare) {
        repaired += ']'.repeat(openSquare - closeSquare);
    }
    
    // Добавляем недостающие закрывающие скобки для объектов
    if (openCurly > closeCurly) {
        repaired += '}'.repeat(openCurly - closeCurly);
    }
    
    // 3. Особый случай: обрыв в середине массива thoughts
    const arrayMatches = repaired.matchAll(/"thoughts"\s*:\s*\[/g);
    for (const match of arrayMatches) {
        const start = match.index + match[0].length;
        let depth = 1;
        let i = start;
        let inString3 = false;
        let escapeNext3 = false;
        
        while (i < repaired.length && depth > 0) {
            const char = repaired[i];
            
            if (escapeNext3) {
                escapeNext3 = false;
                i++;
                continue;
            }
            
            if (char === '\\') {
                escapeNext3 = true;
                i++;
                continue;
            }
            
            if (char === '"') {
                inString3 = !inString3;
            }
            
            if (!inString3) {
                if (char === '[') depth++;
                if (char === ']') depth--;
            }
            
            i++;
        }
        
        // Если массив не закрыт, добавляем закрывающую скобку
        if (depth > 0) {
            repaired += ']';
        }
    }
    
    // 4. Удаляем "висячую" запятую в конце (частая проблема обрыва массивов/объектов)
    repaired = repaired.replace(/,\s*([}\]]*)$/, '$1');
    
    // 5. Удаляем возможные повторяющиеся закрывающие скобки
    repaired = repaired.replace(/\}\}/g, '}').replace(/\]\]/g, ']');
    
    return repaired;
}

function fixCommonAIJsonErrors(text) {
    if (!text || typeof text !== 'string') return text;
    
    let fixed = text;
    
    // 1. Исправляем двойное экранирование: \\\" -> \"
    fixed = fixed.replace(/\\\\\"/g, '"');
    
    // 2. Исправляем незакрытые строки с переносами
    fixed = fixed.replace(/"([^"\\]*(?:\\.[^"\\]*)*)\n/g, '"$1\\n');
    fixed = fixed.replace(/\n([^"\\]*(?:\\.[^"\\]*)*")/g, '\\n$1');
    
    // 3. Удаляем лишние кавычки в конце строковых значений
    fixed = fixed.replace(/\"(\s*:\s*\"[^\"]*)\"\"(\s*[,\}])/g, '"$1"$2');
    
    // 4. Исправляем одиночные обратные слэши перед кавычками
    fixed = fixed.replace(/([^\\])\\\"/g, '$1\"');
    
    // 5. Убираем висячие кавычки после значений
    fixed = fixed.replace(/\"\"([,\}\]])/g, '"$1');
    
    // 6. Заменяем неэкранированные переносы строк внутри строк
    fixed = fixed.replace(/"([^"\\]*(?:\\.[^"\\]*)*?)(?<!\\)\n(?!\\)([^"\\]*(?:\\.[^"\\]*)*)"/g, '"$1\\n$2"');
    
    return fixed;
}

/**
 * Надежный парсинг JSON из ответа ИИ (ФОРМАТ 4.1)
 */
function robustJsonParse(rawContent) {
    if (!rawContent) {
        throw new Error('Пустой ответ от ИИ');
    }
    
    let text = rawContent.trim();
    
    // Удаляем обертки markdown
    text = text.replace(/^```json\s*/i, '').replace(/\s*```$/i, '');
    text = text.replace(/^```\s*/i, '').replace(/\s*```$/i, '');
    
    // Шаг 0. Предварительная обработка для экранирования символов
    text = preprocessJson(text);
    
    // Шаг 1. Исправляем типичные ошибки ИИ
    text = fixCommonAIJsonErrors(text);
    
    // Шаг 2. Сначала пробуем стандартный парсинг
    try {
        return JSON.parse(text);
    } catch (e) {
        console.warn('Стандартный JSON.parse не удался, пытаемся починить JSON:', e.message);
    }
    
    // Шаг 3. Пробуем починить и распарсить
    try {
        const repaired = repairTruncatedJSON(text);
        return JSON.parse(repaired);
    } catch (e) {
        console.warn('Парсинг починенного JSON не удался, переходим к агрессивному парсингу:', e.message);
    }

    // Шаг 3: Агрессивный парсинг для извлечения хотя бы сцены
    const result = {
        design_notes: "",
        scene: "",
        reflection: "",
        typology: "",
        choices: [],
        events: [],
        aiMemory: {},
        thoughts: [],
        summary: ""
    };
    
    // Извлекаем сцену - это самое важное
    const sceneRegex = /"scene"\s*:\s*"((?:[^"\\]|\\.|\\n)*)"/i;
    const sceneMatch = text.match(sceneRegex);
    if (sceneMatch && sceneMatch[1]) {
        result.scene = sceneMatch[1].replace(/\\"/g, '"').replace(/\\n/g, '\n');
    } else {
        // Если не нашли scene, создаем дефолтную сцену с ошибкой
        result.scene = `<p>⚠️ <b>ОШИБКА ПАРСИНГА</b></p><p>Ответ ИИ был обрезан, но мы продолжаем игру.</p>`;
    }
    
    // Пытаемся извлечь choices
    const choicesStart = text.indexOf('"choices":[');
    if (choicesStart !== -1) {
        let choicesText = '';
        let bracketCount = 1;
        let inString = false;
        let escapeNext = false;
        
        for (let i = choicesStart + 10; i < text.length; i++) {
            const char = text[i];
            
            if (escapeNext) {
                choicesText += char;
                escapeNext = false;
                continue;
            }
            
            if (char === '\\') {
                choicesText += char;
                escapeNext = true;
                continue;
            }
            
            if (char === '"') {
                inString = !inString;
            }
            
            if (!inString) {
                if (char === '[') {
                    bracketCount++;
                } else if (char === ']') {
                    bracketCount--;
                    if (bracketCount === 0) {
                        break;
                    }
                }
            }
            
            choicesText += char;
        }
        
        // Пытаемся распарсить choices
        try {
            const choicesArray = JSON.parse(`[${choicesText}]`);
            if (Array.isArray(choicesArray)) {
                result.choices = choicesArray.slice(0, 5).map(choice => {
                    if (typeof choice !== 'object') return createDefaultChoice();
                    
                    return {
                        text: choice.text || "Действие",
                        difficulty_level: typeof choice.difficulty_level === 'number' ?
                            Math.max(1, Math.min(10, choice.difficulty_level)) : 5,
                        requirements: Array.isArray(choice.requirements) ?
                            choice.requirements.filter(req => typeof req === 'string') : [],
                        success_rewards: [],
                        fail_penalties: []
                    };
                });
            }
        } catch (e) {
            console.warn('Не удалось распарсить choices:', e.message);
        }
    }
    
    // Если choices пустой, добавляем хотя бы один дефолтный
    if (result.choices.length === 0) {
        result.choices = [createDefaultChoice()];
    }
    
    // Пытаемся извлечь summary
    const summaryRegex = /"summary"\s*:\s*"((?:[^"\\]|\\.)*)"/i;
    const summaryMatch = text.match(summaryRegex);
    if (summaryMatch && summaryMatch[1]) {
        result.summary = summaryMatch[1].replace(/\\"/g, '"');
    } else {
        // Генерируем summary из сцены
        result.summary = result.scene
            .replace(/<[^>]*>/g, ' ')
            .substring(0, 100)
            .trim() + '...';
    }
    
    return result;
}

function createDefaultChoice() {
    return {
        text: "Продолжить...",
        difficulty_level: 5,
        requirements: [],
        success_rewards: [],
        fail_penalties: []
    };
}
/**
 * Безопасный парсинг ответа ИИ
 * Обертка над robustJsonParse с дополнительным извлечением фраз
 * @param {string} text - Текст ответа ИИ
 * @returns {Object} Распарсенные данные
 */
function safeParseAIResponse(text) {
    try {
        const data = robustJsonParse(text);
        
        // Попытка извлечь фразы, если их нет в основном объекте
        if (!data.thoughtsOfHero || data.thoughtsOfHero.length === 0) {
            const extraPhrases = parseHeroPhrases(text);
            if (extraPhrases.length > 0) {
                data.thoughtsOfHero = extraPhrases;
            }
        }
        
        return data;
    } catch (mainError) {
        console.error('Критическая ошибка парсинга ответа ИИ:', mainError);
        // Возвращаем аварийный объект в новом формате
        return {
            scene: "Ошибка генерации сцены. Ответ ИИ некорректен.",
            short_summary: "Ошибка парсинга",
            choices: [
            {
                text: "Попробовать снова",
                requirements: {
                    stats: {},
                    inventory: null
                },
                success_rewards: {
                    stats: {},
                    inventory_add: [],
                    inventory_remove: []
                },
                fail_penalties: {
                    stats: {},
                    inventory_add: [],
                    inventory_remove: []
                }
            }],
            stat_changes: {},
            progress_change: 0,
            thoughtsOfHero: ["Что-то пошло не так..."]
        };
    }
}

/**
 * Получение иконки статуса
 * @param {string} status - Статус (success, error, pending)
 * @returns {string} Emoji иконка
 */
function getStatusEmoji(status) {
    return status === 'success' ? '✅' : status === 'error' ? '❌' : '⏳';
}

/**
 * Форматирование деталей ошибки
 * @param {Error|string|Object} error - Объект ошибки
 * @returns {string} Форматированное описание ошибки
 */
function formatErrorDetails(error) {
    if (!error) return "Нет информации об ошибке";
    
    let details = "";
    
    if (error instanceof Error) {
        details += `Сообщение: ${error.message}\n\n`;
        details += `Тип: ${error.name}\n\n`;
        
        if (error.stack) {
            details += `Стек вызовов:\n${error.stack}\n\n`;
        }
        
        if (error.code) {
            details += `Код ошибки: ${error.code}\n\n`;
        }
    } else if (typeof error === 'string') {
        details = error;
    } else if (typeof error === 'object') {
        try {
            details = JSON.stringify(error, null, 2);
        } catch (e) {
            details = String(error);
        }
    } else {
        details = String(error);
    }
    
    return details;
}

/**
 * Экспорт данных в файл (автоматическое скачивание)
 * @param {string} data - Данные для экспорта
 * @param {string} filename - Имя файла
 * @param {string} type - MIME тип файла
 */
function exportToFile(data, filename, type = 'application/json') {
    const blob = new Blob([data], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

/**
 * Генерация уникального ID
 * @returns {string} Уникальный идентификатор
 */
function generateUniqueId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

/**
 * Получение московского времени
 * @returns {Date} Дата в московском часовом поясе
 */
function getMoscowTime() {
    const now = new Date();
    try {
        return new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Moscow' }));
    } catch (e) {
        return now;
    }
}

/**
 * Форматирование московского времени
 * @param {Date} date - Дата для форматирования
 * @returns {string} Отформатированная строка времени
 */
function formatMoscowTime(date) {
    const moscowTime = getMoscowTime();
    return moscowTime.toLocaleString('ru-RU', {
        timeZone: 'Europe/Moscow',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
}

/**
 * Нормализация названий характеристик
 * @param {string} key - Ключ характеристики
 * @returns {string|null} Нормализованный ключ или null
 */
function normalizeStatKey(key) {
    if (!key) return null;
    const lowerKey = key.toLowerCase().trim();
    return CONFIG.statAliases[lowerKey] ||
        (CONFIG.startStats.hasOwnProperty(lowerKey) ? lowerKey : null);
}

/**
 * Выбор файла (работает на телефонах и ПК)
 * @param {string} accept - Тип принимаемых файлов
 * @returns {Promise<File|null>} Выбранный файл или null
 */
function selectFile(accept = '.json') {
    return new Promise((resolve) => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = accept;
        input.style.display = 'none';
        
        input.onchange = function(e) {
            const file = e.target.files[0];
            resolve(file);
            document.body.removeChild(input);
        };
        
        input.oncancel = function() {
            resolve(null);
            document.body.removeChild(input);
        };
        
        document.body.appendChild(input);
        input.click();
    });
}

/**
 * Выбор папки (через input с атрибутом webkitdirectory)
 * @returns {Promise<Object|null>} Объект с файлами и путем к папке
 */
function selectFolder() {
    return new Promise((resolve) => {
        const input = document.createElement('input');
        input.type = 'file';
        input.webkitdirectory = true;
        input.multiple = true;
        input.style.display = 'none';
        
        input.onchange = function(e) {
            const files = Array.from(e.target.files);
            const folderPath = files.length > 0 ?
                files[0].webkitRelativePath.split('/')[0] : null;
            
            resolve({
                files: files,
                folderPath: folderPath
            });
            document.body.removeChild(input);
        };
        
        input.oncancel = function() {
            resolve(null);
            document.body.removeChild(input);
        };
        
        document.body.appendChild(input);
        input.click();
    });
}

/**
 * Сохранение файла с выбором папки
 * @param {string} data - Данные для сохранения
 * @param {string} defaultFileName - Имя файла по умолчанию
 * @param {string} fileType - MIME тип файла
 * @returns {Promise<Object>} Результат сохранения
 */
async function saveFileWithFolderPicker(data, defaultFileName, fileType = 'application/json') {
    try {
        if ('showSaveFilePicker' in window) {
            const options = {
                suggestedName: defaultFileName,
                types: [{
                    description: 'JSON файл',
                    accept: { 'application/json': ['.json'] }
                }]
            };
            
            const fileHandle = await window.showSaveFilePicker(options);
            const writable = await fileHandle.createWritable();
            await writable.write(data);
            await writable.close();
            return { success: true, fileName: fileHandle.name };
        }
    } catch (error) {
        console.log('File System Access API не поддерживается или отменено:', error);
    }
    
    exportToFile(data, defaultFileName, fileType);
    return { success: true, fileName: defaultFileName };
}

/**
 * Вибрация (поддержка мобильных устройств)
 * @param {number|Array} pattern - Паттерн вибрации
 */
function vibrate(pattern) {
    if (navigator.vibrate && pattern) {
        try {
            navigator.vibrate(pattern);
        } catch (e) {
            console.log('Vibration not supported');
        }
    }
}

/**
 * Улучшенный парсинг фраз героя из ответа модели
 * @param {string} text - Текст ответа ИИ
 * @returns {Array<string>} Массив фраз героя
 */
function parseHeroPhrases(text) {
    if (!text || typeof text !== 'string') return [];
    
    try {
        const jsonMatch = text.match(/\{.*"thoughtsOfHero".*\}/s);
        if (jsonMatch) {
            try {
                const parsed = JSON.parse(jsonMatch[0]);
                if (parsed.thoughtsOfHero && Array.isArray(parsed.thoughtsOfHero)) {
                    return parsed.thoughtsOfHero;
                }
            } catch (jsonError) {
                // Ignore
            }
        }
        
        const lines = text.split('\n');
        const phraseCandidates = lines
            .map(line => line.trim())
            .filter(line => {
                return line.length >= 20 &&
                    line.length <= 300 &&
                    !line.includes('{') &&
                    !line.includes('}') &&
                    !line.includes('"scene"') &&
                    !line.includes('"choices"') &&
                    !line.includes('json') &&
                    /[.!?;:]$/.test(line);
            });
        
        if (phraseCandidates.length >= 3) {
            return phraseCandidates.slice(0, 10);
        }
        
        return [];
    } catch (e) {
        return [];
    }
}

/**
 * Декодирует Unicode escape-последовательности в читаемые символы
 * @param {string} text - Текст с escape-последовательностями
 * @returns {string} Декодированный текст
 */
/**
 * Декодирует Unicode escape-последовательности в читаемые символы
 * @param {string} text - Текст с escape-последовательностями
 * @returns {string} Декодированный текст
 */
function decodeUnicodeEscapes(text) {
    if (!text || typeof text !== 'string') return text;
    
    return text.replace(/\\u[\dA-F]{4}/gi, function(match) {
            try {
                return String.fromCharCode(parseInt(match.replace(/\\u/g, ''), 16));
            } catch (e) {
                return match;
            }
        }).replace(/\\n/g, '\n')
        .replace(/\\r/g, '\r')
        .replace(/\\t/g, '\t')
        .replace(/\\"/g, '"')
        .replace(/\\\\/g, '\\');
}

/**
 * Предварительная обработка JSON: экранирует неэкранированные символы внутри строк
 * @param {string} jsonText - JSON текст
 * @returns {string} Обработанный JSON текст
 */
function preprocessJson(jsonText) {
    let result = '';
    let inString = false;
    let escapeNext = false;
    
    for (let i = 0; i < jsonText.length; i++) {
        const char = jsonText[i];
        
        if (escapeNext) {
            result += char;
            escapeNext = false;
            continue;
        }
        
        if (char === '\\') {
            escapeNext = true;
            result += char;
            continue;
        }
        
        if (char === '"') {
            inString = !inString;
            result += char;
            continue;
        }
        
        if (inString) {
            // Экранируем проблемные символы
            if (char === '\n') {
                result += '\\n';
            } else if (char === '\r') {
                result += '\\r';
            } else if (char === '\t') {
                result += '\\t';
            } else if (char === '"') {
                result += '\\"';
            } else if (char === '\\') {
                result += '\\\\';
            } else {
                result += char;
            }
        } else {
            result += char;
        }
    }
    
    return result;
}

/**
 * Красиво форматирует JSON с декодированием Unicode
 * @param {string} jsonString - JSON строка
 * @returns {string} Форматированная и декодированная строка
 */
function formatJsonWithUnicode(jsonString) {
    if (!jsonString) return '';
    
    try {
        // Сначала декодируем Unicode escapes
        const decoded = decodeUnicodeEscapes(jsonString);
        
        // Пытаемся распарсить JSON
        const obj = JSON.parse(decoded);
        
        // Форматируем с красивыми отступами
        return JSON.stringify(obj, null, 2);
    } catch (e) {
        // Если не JSON, возвращаем декодированный текст
        return decodeUnicodeEscapes(jsonString);
    }
}

// Публичный интерфейс модуля
export const Utils = {
    repairTruncatedJSON,
    robustJsonParse,
    getStatusEmoji,
    formatErrorDetails,
    exportToFile,
    generateUniqueId,
    getMoscowTime,
    formatMoscowTime,
    normalizeStatKey,
    selectFile,
    selectFolder,
    saveFileWithFolderPicker,
    vibrate,
    parseHeroPhrases,
    safeParseAIResponse,
    decodeUnicodeEscapes,
    formatJsonWithUnicode
};