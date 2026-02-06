// Модуль 2: UTILS - Вспомогательные функции (2-utils.js)
'use strict';

import { CONFIG } from './1-config.js';

// Категории обрабатываемых game_item:
const GAME_ITEM_CATEGORIES = {
    STAT: 'stat',
    SKILL: 'skill',
    INVENTORY: 'inventory',
    RELATIONS: 'relations',
    ORGANIZATION: 'organization',
    BLESSING: 'bless',
    CURSE: 'curse',
    BUFF: 'buff',
    DEBUFF: 'debuff',
    PERSONALITY: 'personality',
    PROGRESS: 'progress'
};

function categorizeGameItem(id) {
    if (!id || typeof id !== 'string') return null;
    
    const [category] = id.split(':');
    
    // Специальная обработка организаций
    if (category === 'organization_rank') return GAME_ITEM_CATEGORIES.ORGANIZATION;
    
    // Для остальных - первая часть
    const categoryMap = {
        'stat': GAME_ITEM_CATEGORIES.STAT,
        'skill': GAME_ITEM_CATEGORIES.SKILL,
        'inventory': GAME_ITEM_CATEGORIES.INVENTORY,
        'relations': GAME_ITEM_CATEGORIES.RELATIONS,
        'bless': GAME_ITEM_CATEGORIES.BLESSING,
        'curse': GAME_ITEM_CATEGORIES.CURSE,
        'buff': GAME_ITEM_CATEGORIES.BUFF,
        'debuff': GAME_ITEM_CATEGORIES.DEBUFF,
        'personality': GAME_ITEM_CATEGORIES.PERSONALITY,
        'progress': GAME_ITEM_CATEGORIES.PROGRESS
    };
    
    return categoryMap[category] || null;
}

function getOperationDetails(operation) {
    const category = categorizeGameItem(operation.id);
    const [type, name] = operation.id.split(':');
    
    return {
        category,
        type,
        name,
        operation: operation.operation,
        value: operation.value,
        delta: operation.delta
    };
}

/**
 * УЛУЧШЕННАЯ ВЕРСИЯ: Пытается починить обрезанный JSON (Auto-Heal)
 * Восстанавливает закрывающие кавычки и скобки, включая обрезанные строки в массивах.
 * @param {string} text - Битая JSON строка
 * @returns {string} - Потенциально валидная JSON строка
 */
function repairTruncatedJSON(text) {
    let repaired = text.trim();
    
    console.log(`🔧 [JSON Repair] Начинаем ремонт JSON (длина: ${repaired.length} символов)`);
    
    // 1. Убираем возможные markdown обертки
    repaired = repaired.replace(/^```json\s*/i, '').replace(/\s*```$/i, '');
    repaired = repaired.replace(/^```\s*/i, '').replace(/\s*```$/i, '');
    
    // 2. Проверяем, не обрывается ли JSON в середине строки
    let inString = false;
    let escapeNext = false;
    let lastQuoteIndex = -1;
    
    for (let i = 0; i < repaired.length; i++) {
        const char = repaired[i];
        
        if (escapeNext) {
            escapeNext = false;
            continue;
        }
        
        if (char === '\\') {
            escapeNext = true;
            continue;
        }
        
        if (char === '"') {
            inString = !inString;
            lastQuoteIndex = i;
        }
    }
    
    // Если мы закончили внутри строки, закрываем её
    if (inString) {
        console.log('⚠️ [JSON Repair] Обнаружена незакрытая строка, закрываем');
        repaired += '"';
    }
    
    // 3. Балансируем скобки
    let openCurly = 0,
        closeCurly = 0;
    let openSquare = 0,
        closeSquare = 0;
    inString = false;
    escapeNext = false;
    
    for (let i = 0; i < repaired.length; i++) {
        const char = repaired[i];
        
        if (escapeNext) {
            escapeNext = false;
            continue;
        }
        
        if (char === '\\') {
            escapeNext = true;
            continue;
        }
        
        if (char === '"') {
            inString = !inString;
            continue;
        }
        
        if (!inString) {
            if (char === '{') openCurly++;
            if (char === '}') closeCurly++;
            if (char === '[') openSquare++;
            if (char === ']') closeSquare++;
        }
    }
    
    console.log(`📊 [JSON Repair] Баланс скобок: { ${openCurly}/${closeCurly} } [ ${openSquare}/${closeSquare} ]`);
    
    // 4. Удаляем "висячие" запятые и незакрытые конструкции перед добавлением скобок
    // Ищем последнюю запятую вне строки
    let lastCommaIndex = -1;
    inString = false;
    escapeNext = false;
    
    for (let i = repaired.length - 1; i >= 0; i--) {
        const char = repaired[i];
        
        if (!inString && char === ',') {
            lastCommaIndex = i;
            break;
        }
        
        if (char === '"' && !escapeNext) {
            inString = !inString;
        }
        
        escapeNext = (char === '\\' && !escapeNext);
    }
    
    // Если последняя запятая находится близко к концу (в пределах 50 символов), удаляем её
    if (lastCommaIndex > 0 && (repaired.length - lastCommaIndex) < 50) {
        const afterComma = repaired.substring(lastCommaIndex + 1).trim();
        // Проверяем, что после запятой нет значимого контента
        if (!afterComma || afterComma.match(/^[\s\}\]]*$/)) {
            console.log('⚠️ [JSON Repair] Удаляем висячую запятую');
            repaired = repaired.substring(0, lastCommaIndex) + repaired.substring(lastCommaIndex + 1);
        }
    }
    
    // 5. Закрываем массивы (сначала массивы, потом объекты - важно!)
    if (openSquare > closeSquare) {
        const missing = openSquare - closeSquare;
        console.log(`🔧 [JSON Repair] Добавляем ${missing} закрывающих скобок для массивов`);
        repaired += ']'.repeat(missing);
        closeSquare = openSquare;
    }
    
    // 6. Закрываем объекты
    if (openCurly > closeCurly) {
        const missing = openCurly - closeCurly;
        console.log(`🔧 [JSON Repair] Добавляем ${missing} закрывающих скобок для объектов`);
        repaired += '}'.repeat(missing);
        closeCurly = openCurly;
    }
    
    // 7. Финальная очистка - удаляем дублирующиеся закрывающие скобки
    let cleaned = '';
    let prevChar = '';
    for (let i = 0; i < repaired.length; i++) {
        const char = repaired[i];
        // Не добавляем дублирующиеся } или ]
        if ((char === '}' && prevChar === '}') || (char === ']' && prevChar === ']')) {
            continue;
        }
        cleaned += char;
        prevChar = char;
    }
    
    console.log(`✅ [JSON Repair] Ремонт завершён (новая длина: ${cleaned.length} символов)`);
    return cleaned;
}

/**
 * УЛУЧШЕННАЯ ВЕРСИЯ: Надежный парсинг JSON из ответа ИИ (ФОРМАТ 4.1)
 * Многоуровневая система восстановления данных
 */
function robustJsonParse(rawContent) {
    if (!rawContent || typeof rawContent !== 'string') {
        throw new Error('Пустой ответ от ИИ');
    }
    
    let text = rawContent.trim();
    
    // Удаляем обертки markdown
    text = text.replace(/^```json\s*/i, '').replace(/\s*```$/i, '');
    text = text.replace(/^```\s*/i, '').replace(/\s*```$/i, '');
    
    console.log(`📝 [Robust Parse] Попытка парсинга JSON (длина: ${text.length} символов)`);
    
    // УРОВЕНЬ 1: Стандартный парсинг
    try {
        const result = JSON.parse(text);
        console.log('✅ [Robust Parse] Стандартный JSON.parse успешен');
        return result;
    } catch (e) {
        console.warn(`⚠️ [Robust Parse] Стандартный парсинг не удался: ${e.message}`);
    }
    
    // УРОВЕНЬ 2: Парсинг с предварительным ремонтом
    try {
        const repaired = repairTruncatedJSON(text);
        const result = JSON.parse(repaired);
        console.log('✅ [Robust Parse] Парсинг после ремонта успешен');
        return result;
    } catch (e) {
        console.warn(`⚠️ [Robust Parse] Парсинг после ремонта не удался: ${e.message}`);
    }
    
    // УРОВЕНЬ 3: Агрессивное извлечение данных через regex
    console.warn('🚨 [Robust Parse] Переход к агрессивному извлечению данных');
    
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
    
    // 3.1. Извлекаем scene (КРИТИЧЕСКИ ВАЖНО)
    const scenePatterns = [
        /"scene"\s*:\s*"((?:[^"\\]|\\["\\\/bfnrt]|\\u[0-9a-fA-F]{4})*)"/s,
        /"scene"\s*:\s*"([^"]*)"/s, // Более простой паттерн
        /"scene"\s*:\s*"([\s\S]*?)(?:"|$)/s // Максимально агрессивный
    ];
    
    for (const pattern of scenePatterns) {
        const match = text.match(pattern);
        if (match && match[1]) {
            result.scene = match[1]
                .replace(/\\"/g, '"')
                .replace(/\\n/g, '\n')
                .replace(/\\t/g, '\t')
                .replace(/\\r/g, '\r')
                .replace(/\\\\/g, '\\');
            console.log(`✅ [Robust Parse] Scene извлечена (длина: ${result.scene.length})`);
            break;
        }
    }
    
    if (!result.scene) {
        console.error('❌ [Robust Parse] Не удалось извлечь scene - это критическая ошибка');
        result.scene = '<p><b>Критическая ошибка:</b> Не удалось извлечь сцену из ответа ИИ.</p>';
    }
    
    // 3.2. Извлекаем остальные текстовые поля
    const extractTextField = (fieldName, defaultValue = "") => {
        const pattern = new RegExp(`"${fieldName}"\\s*:\\s*"([^"]*)"`, 's');
        const match = text.match(pattern);
        if (match && match[1]) {
            return match[1].replace(/\\"/g, '"').replace(/\\n/g, '\n');
        }
        return defaultValue;
    };
    
    result.design_notes = extractTextField('design_notes');
    result.reflection = extractTextField('reflection');
    result.typology = extractTextField('typology');
    result.summary = extractTextField('summary');
    
    // 3.3. Извлекаем choices (МАКСИМАЛЬНО АГРЕССИВНО)
    console.log('🔍 [Robust Parse] Извлечение choices...');
    
    // Ищем начало массива choices
    const choicesStart = text.indexOf('"choices"');
    if (choicesStart !== -1) {
        const arrayStart = text.indexOf('[', choicesStart);
        if (arrayStart !== -1) {
            // Пытаемся найти конец массива
            let depth = 0;
            let inString = false;
            let escapeNext = false;
            let arrayEnd = -1;
            
            for (let i = arrayStart; i < text.length; i++) {
                const char = text[i];
                
                if (escapeNext) {
                    escapeNext = false;
                    continue;
                }
                
                if (char === '\\') {
                    escapeNext = true;
                    continue;
                }
                
                if (char === '"') {
                    inString = !inString;
                    continue;
                }
                
                if (!inString) {
                    if (char === '[') depth++;
                    if (char === ']') {
                        depth--;
                        if (depth === 0) {
                            arrayEnd = i;
                            break;
                        }
                    }
                }
            }
            
            // Если нашли конец, пытаемся парсить массив
            if (arrayEnd > arrayStart) {
                const choicesText = text.substring(arrayStart, arrayEnd + 1);
                console.log(`📋 [Robust Parse] Найден массив choices (длина: ${choicesText.length})`);
                
                try {
                    const choicesArray = JSON.parse(choicesText);
                    if (Array.isArray(choicesArray)) {
                        // Фильтруем и нормализуем каждый choice
                        choicesArray.forEach((choice, idx) => {
                            if (choice && typeof choice === 'object' && choice.text) {
                                result.choices.push({
                                    text: choice.text,
                                    difficulty_level: typeof choice.difficulty_level === 'number' ?
                                        Math.max(1, Math.min(10, choice.difficulty_level)) : 5,
                                    requirements: Array.isArray(choice.requirements) ?
                                        choice.requirements.filter(r => typeof r === 'string' && r.includes(':')) : [],
                                    success_rewards: Array.isArray(choice.success_rewards) ?
                                        choice.success_rewards.filter(op => op && op.operation && op.id) : [],
                                    fail_penalties: Array.isArray(choice.fail_penalties) ?
                                        choice.fail_penalties.filter(op => op && op.operation && op.id) : []
                                });
                            }
                        });
                        console.log(`✅ [Robust Parse] Извлечено ${result.choices.length} choices из массива`);
                    }
                } catch (e) {
                    console.warn(`⚠️ [Robust Parse] Парсинг массива choices не удался: ${e.message}`);
                }
            } else {
                console.warn('⚠️ [Robust Parse] Не найден конец массива choices');
            }
            
            // Если парсинг массива не удался, пытаемся извлечь хотя бы text полей
            if (result.choices.length === 0) {
                console.log('🔍 [Robust Parse] Попытка извлечь choices через regex поиск text полей...');
                const textMatches = text.matchAll(/"text"\s*:\s*"([^"]+)"/g);
                let count = 0;
                for (const match of textMatches) {
                    if (match[1] && count < 10) { // Ограничиваем 10 choices
                        result.choices.push({
                            text: match[1].replace(/\\"/g, '"').replace(/\\n/g, '\n'),
                            difficulty_level: 5,
                            requirements: [],
                            success_rewards: [],
                            fail_penalties: []
                        });
                        count++;
                    }
                }
                console.log(`✅ [Robust Parse] Извлечено ${result.choices.length} choices через regex`);
            }
        }
    }
    
    // Если choices пустой, добавляем дефолтные
    if (result.choices.length === 0) {
        console.warn('⚠️ [Robust Parse] Choices пустой, добавляем дефолтные');
        result.choices = [
        {
            text: "Осмотреться",
            difficulty_level: 3,
            requirements: [],
            success_rewards: [],
            fail_penalties: []
        },
        {
            text: "Подумать",
            difficulty_level: 2,
            requirements: [],
            success_rewards: [],
            fail_penalties: []
        },
        {
            text: "Действовать",
            difficulty_level: 5,
            requirements: [],
            success_rewards: [],
            fail_penalties: []
        }];
    }
    
    // 3.4. Извлекаем thoughts
    console.log('🔍 [Robust Parse] Извлечение thoughts...');
    const thoughtsStart = text.indexOf('"thoughts"');
    if (thoughtsStart !== -1) {
        const arrayStart = text.indexOf('[', thoughtsStart);
        if (arrayStart !== -1) {
            // Ищем строки в массиве thoughts
            const thoughtMatches = text.substring(arrayStart).matchAll(/"([^"]+)"/g);
            for (const match of thoughtMatches) {
                if (match[1] && result.thoughts.length < 20) {
                    const thought = match[1].replace(/\\"/g, '"').replace(/\\n/g, '\n').trim();
                    if (thought.length > 0) {
                        result.thoughts.push(thought);
                    }
                }
            }
            console.log(`✅ [Robust Parse] Извлечено ${result.thoughts.length} thoughts`);
        }
    }
    
    // Добавляем дефолтные thoughts если мало
    if (result.thoughts.length < 5) {
        console.warn(`⚠️ [Robust Parse] Мало thoughts (${result.thoughts.length}), добавляем дефолтные`);
        const defaultThoughts = [
            "Что здесь происходит?",
            "Нужно разобраться в ситуации",
            "Каждое решение имеет последствия",
            "Я чувствую странное напряжение",
            "Что-то здесь не так"
        ];
        result.thoughts = result.thoughts.concat(defaultThoughts).slice(0, 10);
    }
    
    // 3.5. Извлекаем events (если есть)
    console.log('🔍 [Robust Parse] Извлечение events...');
    const eventsStart = text.indexOf('"events"');
    if (eventsStart !== -1) {
        const arrayStart = text.indexOf('[', eventsStart);
        if (arrayStart !== -1) {
            try {
                // Пытаемся найти конец массива events
                let depth = 0;
                let inString = false;
                let escapeNext = false;
                let arrayEnd = -1;
                
                for (let i = arrayStart; i < text.length; i++) {
                    const char = text[i];
                    
                    if (escapeNext) {
                        escapeNext = false;
                        continue;
                    }
                    
                    if (char === '\\') {
                        escapeNext = true;
                        continue;
                    }
                    
                    if (char === '"') {
                        inString = !inString;
                        continue;
                    }
                    
                    if (!inString) {
                        if (char === '[') depth++;
                        if (char === ']') {
                            depth--;
                            if (depth === 0) {
                                arrayEnd = i;
                                break;
                            }
                        }
                    }
                }
                
                if (arrayEnd > arrayStart) {
                    const eventsText = text.substring(arrayStart, arrayEnd + 1);
                    const eventsArray = JSON.parse(eventsText);
                    if (Array.isArray(eventsArray)) {
                        eventsArray.forEach((event, idx) => {
                            if (event && typeof event === 'object' && event.description) {
                                result.events.push({
                                    type: event.type || "world_event",
                                    description: event.description,
                                    effects: Array.isArray(event.effects) ?
                                        event.effects.filter(op => op && op.operation && op.id) : [],
                                    reason: event.reason || ""
                                });
                            }
                        });
                        console.log(`✅ [Robust Parse] Извлечено ${result.events.length} events`);
                    }
                }
            } catch (e) {
                console.warn(`⚠️ [Robust Parse] Парсинг events не удался: ${e.message}`);
            }
        }
    }
    
    // 3.6. Извлекаем aiMemory (если есть)
    const memoryMatch = text.match(/"aiMemory"\s*:\s*\{([^}]*)\}/s);
    if (memoryMatch) {
        try {
            result.aiMemory = JSON.parse(`{${memoryMatch[1]}}`);
            console.log('✅ [Robust Parse] Извлечена aiMemory');
        } catch (e) {
            console.warn('⚠️ [Robust Parse] Парсинг aiMemory не удался');
        }
    }
    
    // Генерируем summary если пустой
    if (!result.summary && result.scene) {
        result.summary = result.scene.replace(/<[^>]*>/g, ' ').substring(0, 200).trim() + '...';
    }
    
    console.log('✅ [Robust Parse] Агрессивное извлечение завершено');
    console.log(`📊 [Robust Parse] Результат: scene=${!!result.scene}, choices=${result.choices.length}, events=${result.events.length}, thoughts=${result.thoughts.length}`);
    
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

/**
 * Показывает всплывающее уведомление (toast)
 * @param {string} message - Сообщение для показа
 * @param {string} type - Тип уведомления: 'success', 'error', 'warning', 'info'
 * @param {number} duration - Время показа в миллисекундах
 */
function showToast(message, type = 'info', duration = 3000) {
    try {
        // Удаляем существующие toast, чтобы не накапливались
        const existingToasts = document.querySelectorAll('.utils-toast');
        existingToasts.forEach(toast => {
            if (toast.parentNode) {
                document.body.removeChild(toast);
            }
        });
        
        // Создаем новый toast элемент
        const toast = document.createElement('div');
        toast.className = `utils-toast utils-toast-${type}`;
        toast.textContent = message;
        
        // Устанавливаем стили
        const toastStyles = `
            .utils-toast {
                position: fixed;
                top: 20px;
                right: 20px;
                padding: 12px 20px;
                border-radius: 5px;
                z-index: 999999;
                font-size: 0.9em;
                font-weight: 500;
                color: #fff;
                background: #333;
                box-shadow: 0 4px 12px rgba(0,0,0,0.3);
                max-width: 400px;
                word-wrap: break-word;
                opacity: 0;
                transform: translateY(-20px);
                transition: all 0.3s cubic-bezier(0.68, -0.55, 0.27, 1.55);
                backdrop-filter: blur(5px);
                border: 1px solid rgba(255,255,255,0.1);
            }
            
            .utils-toast-success {
                background: linear-gradient(135deg, #4cd137 0%, #2d8b57 100%);
                border-color: #4cd137;
            }
            
            .utils-toast-error {
                background: linear-gradient(135deg, #e84118 0%, #c23616 100%);
                border-color: #e84118;
            }
            
            .utils-toast-warning {
                background: linear-gradient(135deg, #fbc531 0%, #e1b12c 100%);
                border-color: #fbc531;
                color: #333;
            }
            
            .utils-toast-info {
                background: linear-gradient(135deg, #3498db 0%, #2980b9 100%);
                border-color: #3498db;
            }
            
            .utils-toast::before {
                content: '';
                position: absolute;
                top: 0;
                left: 0;
                width: 5px;
                height: 100%;
                border-radius: 5px 0 0 5px;
            }
            
            .utils-toast-success::before {
                background: #fff;
            }
            
            .utils-toast-error::before {
                background: #fff;
            }
            
            .utils-toast-warning::before {
                background: #333;
            }
            
            .utils-toast-info::before {
                background: #fff;
            }
            
            @keyframes utils-toast-show {
                0% {
                    opacity: 0;
                    transform: translateY(-20px);
                }
                100% {
                    opacity: 1;
                    transform: translateY(0);
                }
            }
            
            @keyframes utils-toast-hide {
                0% {
                    opacity: 1;
                    transform: translateY(0);
                }
                100% {
                    opacity: 0;
                    transform: translateY(-20px);
                }
            }
        `;
        
        // Добавляем стили, если их еще нет
        if (!document.getElementById('utils-toast-styles')) {
            const styleEl = document.createElement('style');
            styleEl.id = 'utils-toast-styles';
            styleEl.textContent = toastStyles;
            document.head.appendChild(styleEl);
        }
        
        // Добавляем иконку в зависимости от типа
        let icon = 'ℹ️';
        switch (type) {
            case 'success':
                icon = '✅';
                break;
            case 'error':
                icon = '❌';
                break;
            case 'warning':
                icon = '⚠️';
                break;
            case 'info':
                icon = 'ℹ️';
                break;
        }
        
        toast.innerHTML = `
            <div style="display: flex; align-items: center; gap: 8px;">
                <span style="font-size: 1.1em;">${icon}</span>
                <span>${message}</span>
            </div>
        `;
        
        // Добавляем в DOM
        document.body.appendChild(toast);
        
        // Анимация появления
        setTimeout(() => {
            toast.style.animation = 'utils-toast-show 0.3s forwards';
            toast.style.opacity = '1';
            toast.style.transform = 'translateY(0)';
        }, 10);
        
        // Автоматическое скрытие через указанное время
        const hideToast = () => {
            toast.style.animation = 'utils-toast-hide 0.3s forwards';
            setTimeout(() => {
                if (toast.parentNode) {
                    document.body.removeChild(toast);
                }
            }, 300);
        };
        
        // Устанавливаем таймер скрытия
        const timer = setTimeout(hideToast, duration);
        
        // Закрытие по клику
        toast.onclick = () => {
            clearTimeout(timer);
            hideToast();
        };
        
        // Возвращаем объект для ручного управления
        return {
            element: toast,
            hide: hideToast,
            updateMessage: (newMessage) => {
                const textSpan = toast.querySelector('span:last-child');
                if (textSpan) {
                    textSpan.textContent = newMessage;
                }
            },
            updateType: (newType) => {
                const classList = toast.classList;
                classList.remove('utils-toast-success', 'utils-toast-error', 'utils-toast-warning', 'utils-toast-info');
                classList.add(`utils-toast-${newType}`);
                
                // Обновляем иконку
                let newIcon = 'ℹ️';
                switch (newType) {
                    case 'success':
                        newIcon = '✅';
                        break;
                    case 'error':
                        newIcon = '❌';
                        break;
                    case 'warning':
                        newIcon = '⚠️';
                        break;
                    case 'info':
                        newIcon = 'ℹ️';
                        break;
                }
                
                const iconSpan = toast.querySelector('span:first-child');
                if (iconSpan) {
                    iconSpan.textContent = newIcon;
                }
            }
        };
        
    } catch (error) {
        console.error('❌ Ошибка при показе toast-уведомления:', error);
        // Резервный вариант - простой alert
        alert(`${type.toUpperCase()}: ${message}`);
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
    formatJsonWithUnicode,
    getOperationDetails,
    showToast // <-- ВОТ ТУТ ДОБАВЛЯЕМ НОВУЮ ФУНКЦИЮ
};