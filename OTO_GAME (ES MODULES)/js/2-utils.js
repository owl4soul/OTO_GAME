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
    
    // 2. Удаляем "висячую" запятую в конце (частая проблема обрыва массивов/объектов)
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
 * Извлекает объекты choices из текста массива (новый формат)
 * Знаем структуру: text, requirements{stats{}, inventory}, success_changes, failure_changes
 * @param {string} choicesText - Текст массива choices
 * @returns {Array} Массив объектов choice
 */
function extractChoiceObjects(choicesText) {
    const choiceObjects = [];
    let currentObject = '';
    let braceDepth = 0;
    let inString = false;
    let escapeNext = false;
    
    for (let i = 0; i < choicesText.length; i++) {
        const char = choicesText[i];
        
        if (escapeNext) {
            currentObject += char;
            escapeNext = false;
            continue;
        }
        
        if (char === '\\') {
            currentObject += char;
            escapeNext = true;
            continue;
        }
        
        if (char === '"') {
            inString = !inString;
        }
        
        if (!inString) {
            if (char === '{') {
                if (braceDepth === 0) {
                    currentObject = '';
                }
                braceDepth++;
            } else if (char === '}') {
                braceDepth--;
                if (braceDepth === 0) {
                    currentObject += char;
                    try {
                        const parsedObject = JSON.parse(currentObject);
                        // Валидируем структуру объекта choice
                        if (parsedObject.text && typeof parsedObject.text === 'string') {
                            choiceObjects.push(parsedObject);
                        }
                    } catch (e) {
                        console.warn('Не удалось распарсить объект choice:', currentObject.substring(0, 100));
                    }
                    currentObject = '';
                    continue;
                }
            } else if (char === ',' && braceDepth === 0) {
                // Разделитель между объектами - пропускаем
                continue;
            }
        }
        
        if (braceDepth > 0) {
            currentObject += char;
        }
    }
    
    return choiceObjects;
}

/**
 * Надежный парсинг JSON из ответа ИИ
 * Специально для нового формата с requirements, success_changes, failure_changes
 * @param {string} rawContent - Сырой текст ответа
 * @returns {Object} Распарсенный JSON объект
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
    
    // Извлекаем основные поля через regex
    const sceneMatch = text.match(/"scene"\s*:\s*"((?:[^"\\]|\\.)*)"/);
    const shortSummaryMatch = text.match(/"short_summary"\s*:\s*"((?:[^"\\]|\\.)*)"/);
    
    const fallback = {
        scene: sceneMatch ? sceneMatch[1].replace(/\\"/g, '"').replace(/\\n/g, '\n') : "Сцена не сгенерирована",
        short_summary: shortSummaryMatch ? shortSummaryMatch[1].replace(/\\"/g, '"') : "",
        choices: [],
        stat_changes: {},
        progress_change: 0,
        thoughtsOfHero: []
    };
    
    const personalityMatch = text.match(/"personality"\s*:\s*"((?:[^"\\]|\\.)*)"/);
    if (personalityMatch) {
        fallback.personality = personalityMatch[1].replace(/\\"/g, '"');
    } else {
        fallback.personality = null;
    }
    
    const inventoryAllMatch = text.match(/"inventory_all"\s*:\s*(\[.*?\])/s);
    if (inventoryAllMatch) {
        try {
            fallback.inventory_all = JSON.parse(inventoryAllMatch[1]);
        } catch (e) {
            fallback.inventory_all = [];
        }
    } else {
        fallback.inventory_all = [];
    }
    
    const relationsAllMatch = text.match(/"relations_all"\s*:\s*(\{.*?\})/s);
    if (relationsAllMatch) {
        try {
            fallback.relations_all = JSON.parse(relationsAllMatch[1]);
        } catch (e) {
            fallback.relations_all = {};
        }
    } else {
        fallback.relations_all = {};
    }
    
    const thoughtsMatch = text.match(/"thoughtsOfHero"\s*:\s*\[(.*?)\]/s);
    if (thoughtsMatch) {
        try {
            fallback.thoughtsOfHero = JSON.parse(`[${thoughtsMatch[1]}]`);
        } catch (e) {
            fallback.thoughtsOfHero = thoughtsMatch[1].split(',').map(s => s.trim().replace(/^"|"$/g, '')).filter(Boolean);
        }
    } else {
        fallback.thoughtsOfHero = [];
    }
    
    // Специальный парсинг для массива choices в новом формате
    // Агрессивный парсинг для нового формата
    console.warn('⚠️ Агрессивный парсинг для нового формата choices...');
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
        const choiceObjects = extractChoiceObjects(choicesText);
        fallback.choices = choiceObjects;
    }
    
    // Парсим stat_changes
    const statChangesMatch = text.match(/"stat_changes"\s*:\s*(\{[^}]*\})/);
    if (statChangesMatch) {
        try {
            fallback.stat_changes = JSON.parse(statChangesMatch[1]);
        } catch (e) {
            // Ручной парсинг stat_changes
            const statRegex = /"(\w+)"\s*:\s*(-?\d+)/g;
            let match;
            while ((match = statRegex.exec(statChangesMatch[1])) !== null) {
                fallback.stat_changes[match[1]] = parseInt(match[2]);
            }
        }
    }
    
    return validateAndFixStructure(fallback);
}


/**
 * Проверяет структуру и добавляет дефолтные значения (Safety Layer)
 * Только новый формат: requirements, success_changes, failure_changes
 * @param {Object} data - Распарсенный объект
 * @returns {Object} - Валидный игровой объект
 */
function validateAndFixStructure(data) {
    if (typeof data !== 'object' || data === null) {
        throw new Error('Результат парсинга не является объектом');
    }
    
    // 1. Гарантируем обязательные текстовые поля
    data.scene = data.scene || "Сцена не сгенерирована (Ошибка данных).";
    data.short_summary = data.short_summary || "";
    
    // 2. Пробрасываем поля изменений, если они есть
    // Если ИИ решил изменить личность, сохраняем это, иначе null
    data.personality_change = data.personality_change || null;
    
    // 3. Инвентарь
    if (data.inventory_all) {
        if (!Array.isArray(data.inventory_all)) {
            data.inventory_all = [];
        }
    } else {
        data.inventory_all = [];
    }
    
    // Отношенич
    if (data.relations_all) {
        if (typeof data.relations_all !== 'object') {
            data.relations_all = {};
        }
    } else {
        data.relations_all = {};
    }
    
    // Личность
    if (!data.personality) {
        data.personality = null;
    }
    
    // Мысли
    if (data.thoughtsOfHero) {
        if (!Array.isArray(data.thoughtsOfHero)) {
            data.thoughtsOfHero = [data.thoughtsOfHero.toString()];
        }
    } else {
        data.thoughtsOfHero = [];
    }
    
    // 4. Валидация выборов (choices)
    if (!data.choices || !Array.isArray(data.choices) || data.choices.length === 0) {
        data.choices = [{
            text: "Продолжить...",
            requirements: {},
            success_changes: {},
            failure_changes: {}
        }];
    } else {
        data.choices = data.choices.map(choice => {
            // Создаем безопасную копию объекта выбора
            const safeChoice = {
                text: (typeof choice === 'string') ? choice : (choice.text || "Действие"),
                requirements: choice.requirements || {},
                success_changes: choice.success_changes || {},
                failure_changes: choice.failure_changes || {}
            };
            
            // Гарантируем вложенную структуру для рендера
            if (!safeChoice.requirements.stats) safeChoice.requirements.stats = {};
            // Inventory в требованиях может быть строкой или null
            
            if (!safeChoice.success_changes.stats) safeChoice.success_changes.stats = {};
            if (!safeChoice.success_changes.inventory_add) safeChoice.success_changes.inventory_add = [];
            if (!safeChoice.success_changes.inventory_remove) safeChoice.success_changes.inventory_remove = [];
            
            if (!safeChoice.failure_changes.stats) safeChoice.failure_changes.stats = {};
            if (!safeChoice.failure_changes.inventory_add) safeChoice.failure_changes.inventory_add = [];
            if (!safeChoice.failure_changes.inventory_remove) safeChoice.failure_changes.inventory_remove = [];
            
            return safeChoice;
        });
    }
    
    data.stat_changes = data.stat_changes || {};
    data.progress_change = data.progress_change || 0;
    
    // Исправление мыслей героя (иногда ИИ возвращает строку вместо массива)
    if (data.thoughtsOfHero && !Array.isArray(data.thoughtsOfHero)) {
        data.thoughtsOfHero = [String(data.thoughtsOfHero)];
    } else if (!data.thoughtsOfHero) {
        data.thoughtsOfHero = [];
    }
    
    return data;
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
                success_changes: {
                    stats: {},
                    inventory_add: [],
                    inventory_remove: []
                },
                failure_changes: {
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

// Публичный интерфейс модуля
export const Utils = {
    repairTruncatedJSON,
    validateAndFixStructure,
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
    safeParseAIResponse
};