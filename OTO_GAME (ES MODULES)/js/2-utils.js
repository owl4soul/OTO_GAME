// Модуль 2: UTILS - Вспомогательные функции (2-utils.js)
'use strict';

import { CONFIG } from './1-config.js';

/**
 * Пытается починить обрезанный JSON (Auto-Heal)
 * Восстанавливает закрывающие кавычки и скобки.
 * @param {string} text - Битая JSON строка
 * @returns {string} - Потенциально валидная JSON строка
 */
function repairTruncatedJSON(text) {
    let repaired = text.trim();
    
    // 1. Если обрыв внутри строки (нечетное кол-во кавычек), закрываем кавычку
    // Считаем неэкранированные кавычки
    let quoteCount = 0;
    for (let i = 0; i < repaired.length; i++) {
        if (repaired[i] === '"' && (i === 0 || repaired[i - 1] !== '\\')) {
            quoteCount++;
        }
    }
    
    if (quoteCount % 2 !== 0) {
        // Если обрыв произошел прямо на экранирующем слеше, убираем его
        if (repaired.endsWith('\\')) {
            repaired = repaired.slice(0, -1);
        }
        repaired += '"';
    }
    
    // 2. Удаляем "висячую" запяту в конце (частая проблема обрыва массивов/объектов)
    // Например: {"items": ["key",], -> {"items": ["key"]}
    repaired = repaired.replace(/,\s*([}\]]*)$/, '$1');
    
    // 3. Балансируем скобки
    // Считаем фигурные { и }
    const openCurly = (repaired.match(/\{/g) || []).length;
    const closeCurly = (repaired.match(/\}/g) || []).length;
    // Считаем квадратные [ и ]
    const openSquare = (repaired.match(/\[/g) || []).length;
    const closeSquare = (repaired.match(/\]/g) || []).length;
    
    // Добавляем недостающие закрывающие скобки.
    // Эвристика: обычно в JSON сначала закрывают массивы, потом объекты.
    if (openSquare > closeSquare) {
        repaired += ']'.repeat(openSquare - closeSquare);
    }
    if (openCurly > closeCurly) {
        repaired += '}'.repeat(openCurly - closeCurly);
    }
    
    return repaired;
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
    
    // Пытаемся стандартный парсинг
    try {
        return JSON.parse(text);
    } catch (e) {
        console.warn('Стандартный JSON.parse не удался, переходим к агрессивному парсингу:', e.message);
    }
    
    // Агрессивный парсинг для ФОРМАТА 4.1
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
    
    // Извлекаем основные поля через regex для ФОРМАТ 4.1
    const designNotesMatch = text.match(/"design_notes"\s*:\s*"((?:[^"\\]|\\.)*)"/);
    if (designNotesMatch) {
        result.design_notes = designNotesMatch[1].replace(/\\"/g, '"').replace(/\\n/g, '\n');
    }
    
    const sceneMatch = text.match(/"scene"\s*:\s*"((?:[^"\\]|\\.)*)"/);
    if (sceneMatch) {
        result.scene = sceneMatch[1].replace(/\\"/g, '"').replace(/\\n/g, '\n');
    } else {
        result.scene = "Сцена не сгенерирована";
    }
    
    const reflectionMatch = text.match(/"reflection"\s*:\s*"((?:[^"\\]|\\.)*)"/);
    if (reflectionMatch) {
        result.reflection = reflectionMatch[1].replace(/\\"/g, '"');
    }
    
    const typologyMatch = text.match(/"typology"\s*:\s*"((?:[^"\\]|\\.)*)"/);
    if (typologyMatch) {
        result.typology = typologyMatch[1].replace(/\\"/g, '"');
    }
    
    const summaryMatch = text.match(/"summary"\s*:\s*"((?:[^"\\]|\\.)*)"/);
    if (summaryMatch) {
        result.summary = summaryMatch[1].replace(/\\"/g, '"');
    }
    
    // Парсинг thoughts
    const thoughtsMatch = text.match(/"thoughts"\s*:\s*\[(.*?)\]/s);
    if (thoughtsMatch) {
        try {
            result.thoughts = JSON.parse(`[${thoughtsMatch[1]}]`);
        } catch (e) {
            // Ручной парсинг массива строк
            const thoughtsText = thoughtsMatch[1];
            const thoughtRegex = /"((?:[^"\\]|\\.)*)"/g;
            let match;
            while ((match = thoughtRegex.exec(thoughtsText)) !== null) {
                result.thoughts.push(match[1].replace(/\\"/g, '"'));
            }
        }
    }
    
    // Парсинг choices (новый формат)
    const choicesStartMatch = text.match(/"choices"\s*:\s*\[/);
    if (choicesStartMatch) {
        const startIdx = choicesStartMatch.index + choicesStartMatch[0].length;
        let choicesText = '';
        let bracketCount = 1;
        let inString = false;
        let escapeNext = false;
        
        // Извлекаем содержимое массива choices
        for (let i = startIdx; i < text.length; i++) {
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
        
        // Парсим объекты choices из извлеченного текста
        try {
            result.choices = JSON.parse(`[${choicesText}]`);
        } catch (e) {
            console.warn('Не удалось распарсить choices:', e.message);
            // Создаем дефолтные choices
            result.choices = [
                {
                    text: "Продолжить...",
                    difficulty_level: 5,
                    requirements: [],
                    success_rewards: [],
                    fail_penalties: []
                }
            ];
        }
    }
    
    return result;
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
function decodeUnicodeEscapes(text) {
    if (!text || typeof text !== 'string') return text;
    
    return text.replace(/\\u[\dA-F]{4}/gi, function(match) {
        try {
            return String.fromCharCode(parseInt(match.replace(/\\u/g, ''), 16));
        } catch (e) {
            return match;
        }
    });
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