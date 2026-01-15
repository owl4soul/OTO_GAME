// Модуль 2: UTILS - Вспомогательные функции (2-utils.js)
'use strict';

import { CONFIG } from './1-config.js';

/**
 * Надежный парсинг JSON из ответа ИИ
 * @param {string} rawContent - Сырой текст ответа
 * @returns {Object} Распарсенный JSON объект
 */
/**
 * Надежный парсинг JSON из ответа ИИ
 * @param {string} rawContent - Сырой текст ответа
 * @returns {Object} Распарсенный JSON объект
 */
function robustJsonParse(rawContent) {
    let text = rawContent.trim();

    // Удаляем обертки ```json ``` если они есть
    text = text.replace(/^```json\s*/i, '').replace(/\s*```$/i, '');
    text = text.replace(/^```\s*/i, '').replace(/\s*```$/i, '');

    // Пытаемся разные способы парсинга
    const attempts = [];

    // Способ 1: Стандартный JSON.parse (Самый чистый)
    attempts.push(() => JSON.parse(text));

    // Способ 2: Убираем лишние запятые перед закрывающими скобками (Частая ошибка ИИ)
    attempts.push(() => JSON.parse(text.replace(/,\s*([}\]])/g, '$1')));

    // Способ 3: Ищем первый { и последний } (Если есть мусор до/после JSON)
    attempts.push(() => {
        let start = text.indexOf('{');
        if (start === -1) throw new Error('No { found');
        let braceCount = 0;
        let lastValidPos = -1;
        for (let i = start; i < text.length; i++) {
            if (text[i] === '{') braceCount++;
            if (text[i] === '}') {
                braceCount--;
                if (braceCount === 0) lastValidPos = i + 1;
            }
        }
        if (lastValidPos > start) {
            let candidate = text.substring(start, lastValidPos);
            // Удаляем висячую запятую, если она есть
            candidate = candidate.replace(/,\s*$/, '');
            return JSON.parse(candidate);
        }
        throw new Error('No complete JSON object found');
    });

    // Способ 4: АГРЕССИВНЫЙ FALLBACK (Исправленный)
    // Работает, если JSON сломан синтаксически (нет кавычек, запятых и т.д.)
    attempts.push(() => {
        console.warn('⚠️ Использован агрессивный парсинг (JSON сломан)');
        
        const fallback = {
            scene: "",
            choices: [],
            reflection: "",
            stat_changes: {},
            progress_change: 0
        };

        // 1. Вытаскиваем сцену (Ищем поле "scene": "..." или берем текст до choices)
        const sceneMatch = text.match(/"scene"\s*:\s*"((?:[^"\\]|\\.)*)"/s);
        if (sceneMatch) {
            fallback.scene = sceneMatch[1].replace(/\\"/g, '"').replace(/\\n/g, '\n');
        } else {
            // Если ключ scene не найден, берем всё до начала массива choices
            const splitPoint = text.search(/"choices"|\[/);
            fallback.scene = (splitPoint > -1) ? text.substring(0, splitPoint) : text.substring(0, 800);
            // Чистим от мусора JSON
            fallback.scene = fallback.scene.replace(/[{}]/g, '').trim(); 
        }

        // 2. Агрессивно ищем варианты (исправляет баг "одного варианта")
        // Ищем содержимое квадратных скобок choices: [...]
        const jsonArrayMatch = text.match(/"choices"\s*:\s*\[(.*?)\]/s);
        
        if (jsonArrayMatch) {
            const content = jsonArrayMatch[1];
            // Регулярка ищет текст в кавычках, ИГНОРИРУЯ отсутствие запятых между ними
            // Это чинит баг, когда ИИ пишет ["Вариант 1" "Вариант 2"] без запятой
            const choicesFound = [...content.matchAll(/"((?:[^"\\]|\\.)*)"/g)].map(m => m[1]);
            
            if (choicesFound.length > 0) {
                fallback.choices = choicesFound;
            }
        }

        // 3. Если JSON-массив не нашелся, ищем списки в тексте (1. Вариант, - Вариант)
        if (fallback.choices.length === 0) {
             const listRegex = /(?:^|\n)\s*(?:[-*]|\d+\.)\s+(.+)/g;
             const listMatches = [...text.matchAll(listRegex)];
             if (listMatches.length > 0) {
                 fallback.choices = listMatches.map(m => m[1].trim());
             }
        }

        // Страховка, если совсем ничего не нашли
        if (fallback.choices.length === 0) {
            fallback.choices = ["Продолжить... (Ошибка парсинга вариантов)"];
        }

        return fallback;
    });

    // === ЦИКЛ ПО ВСЕМ ПОПЫТКАМ (ОН ОСТАЛСЯ!) ===
    for (const attempt of attempts) {
        try {
            return attempt(); // Если попытка успешна, возвращаем результат
        } catch (e) {
            // Если ошибка — идем к следующему способу
        }
    }

    // Если все способы провалились
    throw new Error("Все способы парсинга провалились. Ответ ИИ некорректен.");
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
    const moscowTime = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Moscow' }));
    return moscowTime;
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
        // Создаем невидимый элемент input для выбора файла
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = accept;
        input.style.display = 'none';
        
        // Когда файл выбран
        input.onchange = function(e) {
            const file = e.target.files[0];
            resolve(file); // Возвращаем выбранный файл
            document.body.removeChild(input); // Удаляем input из DOM
        };
        
        // Если выбор отменен
        input.oncancel = function() {
            resolve(null); // Возвращаем null
            document.body.removeChild(input); // Удаляем input из DOM
        };
        
        // Добавляем input в DOM и запускаем выбор файла
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
        // Создаем невидимый элемент input для выбора папки
        const input = document.createElement('input');
        input.type = 'file';
        input.webkitdirectory = true; // Атрибут для выбора папки
        input.multiple = true; // Разрешаем множественный выбор
        input.style.display = 'none';
        
        // Когда папка выбрана
        input.onchange = function(e) {
            const files = Array.from(e.target.files);
            // Получаем путь к папке из первого файла
            const folderPath = files.length > 0 ?
                files[0].webkitRelativePath.split('/')[0] : null;
            
            resolve({
                files: files, // Список файлов в папке
                folderPath: folderPath // Название папки
            });
            
            document.body.removeChild(input); // Удаляем input из DOM
        };
        
        // Если выбор отменен
        input.oncancel = function() {
            resolve(null); // Возвращаем null
            document.body.removeChild(input); // Удаляем input из DOM
        };
        
        // Добавляем input в DOM и запускаем выбор папки
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
        // Пытаемся использовать File System Access API если доступен
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
        // Если пользователь отменил выбор или API не поддерживается
        console.log('File System Access API не поддерживается или отменено:', error);
    }
    
    // Fallback: используем стандартное сохранение
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
        // Способ 1: Ищем JSON структуру с thoughtsOfHeroResponse
        const jsonMatch = text.match(/\{.*"thoughtsOfHeroResponse".*\}/s);
        if (jsonMatch) {
            try {
                const parsed = JSON.parse(jsonMatch[0]);
                if (parsed.thoughtsOfHeroResponse && Array.isArray(parsed.thoughtsOfHeroResponse)) {
                    console.log('Нашли фразы в JSON:', parsed.thoughtsOfHeroResponse.length);
                    return parsed.thoughtsOfHeroResponse;
                }
            } catch (jsonError) {
                // Если JSON не парсится, пробуем другие способы
                console.log('Не удалось распарсить JSON с фразами:', jsonError.message);
            }
        }
        
        // Способ 2: Ищем нумерованный список (1. 2. 3. или 1) 2) 3))
        const numberedListRegex = /(?:^|\n)(?:\d+[\.\)]\s*)(.+?)(?=(?:\n\d+[\.\)]\s*)|\n\n|$)/gs;
        const numberedMatches = [...text.matchAll(numberedListRegex)];
        if (numberedMatches.length >= 3) {
            const phrases = numberedMatches.map(match => match[1].trim()).filter(p => p.length > 10);
            if (phrases.length > 0) {
                console.log('Нашли фразы в нумерованном списке:', phrases.length);
                return phrases.slice(0, 10);
            }
        }
        
        // Способ 3: Ищем маркированный список (• - * )
        const bulletListRegex = /(?:^|\n)(?:[•\-\*]\s*)(.+?)(?=(?:\n[•\-\*]\s*)|\n\n|$)/gs;
        const bulletMatches = [...text.matchAll(bulletListRegex)];
        if (bulletMatches.length >= 3) {
            const phrases = bulletMatches.map(match => match[1].trim()).filter(p => p.length > 10);
            if (phrases.length > 0) {
                console.log('Нашли фразы в маркированном списке:', phrases.length);
                return phrases.slice(0, 10);
            }
        }
        
        // Способ 4: Ищем фразы в кавычках
        const quoteMatches = text.match(/["']([^"']+)["']/g);
        if (quoteMatches && quoteMatches.length >= 3) {
            const phrases = quoteMatches.map(q => q.replace(/["']/g, '').trim())
                .filter(p => p.length > 10 && p.length < 200);
            if (phrases.length > 0) {
                console.log('Нашли фразы в кавычках:', phrases.length);
                return phrases.slice(0, 10);
            }
        }
        
        // Способ 5: Ищем строки, которые выглядят как фразы (длинные предложения)
        const lines = text.split('\n');
        const phraseCandidates = lines
            .map(line => line.trim())
            .filter(line => {
                // Отбираем строки, которые похожи на фразы:
                // 1. Длина от 20 до 300 символов
                // 2. Не содержат технических слов (JSON, {, }, и т.д.)
                // 3. Заканчиваются знаком препинания
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
            console.log('Нашли фразы по паттерну предложений:', phraseCandidates.length);
            return phraseCandidates.slice(0, 10);
        }
        
        // Если ничего не нашли, возвращаем пустой массив
        console.log('Фразы героя не найдены в ответе');
        return [];
    } catch (e) {
        // ВАЖНО: Ловим ВСЕ ошибки и возвращаем пустой массив
        console.error('Ошибка парсинга фраз героя (безопасно обработана):', e.message);
        return [];
    }
}

/**
 * Безопасный парсинг ответа ИИ
 * @param {string} text - Текст ответа ИИ
 * @returns {Object} Распарсенные данные
 */
function safeParseAIResponse(text) {
    try {
        // Сначала парсим основной JSON
        const data = robustJsonParse(text);
        
        // Затем безопасно пытаемся извлечь фразы героя
        try {
            if (data.thoughtsOfHeroResponse && Array.isArray(data.thoughtsOfHeroResponse)) {
                // Уже есть в JSON
                console.log('Фразы уже в JSON:', data.thoughtsOfHeroResponse.length);
            } else {
                // Пытаемся извлечь из текста
                const phrases = parseHeroPhrases(text);
                if (phrases.length > 0) {
                    data.thoughtsOfHeroResponse = phrases;
                }
            }
        } catch (phraseError) {
            // Игнорируем ошибки парсинга фраз - они не должны ломать основной ответ
            console.warn('Ошибка парсинга фраз героя (проигнорирована):', phraseError.message);
            // Гарантируем, что поле существует
            if (!data.thoughtsOfHeroResponse) {
                data.thoughtsOfHeroResponse = [];
            }
        }
        
        // Гарантируем, что все обязательные поля существуют
        data.scene = data.scene || "Сцена не сгенерирована.";
        data.choices = data.choices || ["Продолжить..."];
        data.stat_changes = data.stat_changes || {};
        data.progress_change = data.progress_change || 0;
        data.thoughtsOfHeroResponse = data.thoughtsOfHeroResponse || [];
        
        return data;
    } catch (mainError) {
        // Если не удалось распарсить вообще, возвращаем запасной вариант
        console.error('Критическая ошибка парсинга ответа ИИ:', mainError);
        return {
            scene: "Ошибка генерации сцены. " + text.substring(0, 500),
            choices: ["Попробовать снова", "Вернуться назад"],
            reflection: "Что-то пошло не так...",
            stat_changes: {},
            progress_change: 0,
            thoughtsOfHeroResponse: []
        };
    }
}

// Публичный интерфейс модуля
export const Utils = {
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