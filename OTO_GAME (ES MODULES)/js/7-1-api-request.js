// Модуль 7.1: API REQUEST - Построение и отправка запросов (7-1-api-request.js)
'use strict';

import { CONFIG } from './1-config.js';
import { State } from './3-state.js';

const Prompts = CONFIG.prompts;

/**
 * Динамическое формирование системных инъекций на основе текущего состояния игры.
 * Это позволяет "режиссеру" вмешиваться в нарратив, добавляя повороты,
 * корректируя стиль при безумии героя или защищаясь от зацикливания сюжета.
 * 
 * @param {Object} state - Текущее состояние игры.
 * @returns {string} Строка с дополнительными, динамически генерируемыми инструкциями для LLM.
 */
function getDynamicSystemInjections(state) {
    const injections = [];
    const turn = state.turnCount;
    
    // 1. ИНЪЕКЦИЯ СЮЖЕТНОГО ПОВОРОТА (TRIGGER: TWIST)
    // Если номер хода является кратным 10 (каждый 10-й ход), заставляем ИИ сделать поворот.
    if (turn > 0 && turn % 10 === 0) {
        console.log(`🌀 [Client Director] Turn ${turn}: Injecting Narrative Twist.`);
        injections.push(`>>> [TRIGGER: TURN ${turn}] ${Prompts.injections.twist}`);
    }
    
    // 2. ИНЪЕКЦИЯ БЕЗУМИЯ (TRIGGER: LOW SANITY)
    // Если показатель Рассудка (Sanity) героя опускается ниже 20, LLM получает инструкцию изменить стиль.
    if (state.stats.sanity < 20) {
        console.log(`🌀 [Client Director] Sanity Low (${state.stats.sanity}): Injecting Insanity.`, );
        injections.push(`>>> [TRIGGER: LOW SANITY] ${Prompts.injections.insanity}`);
    }
    
    // 3. ИНЪЕКЦИЯ ЗАЩИТЫ ОТ ПЕТЕЛЬ СЮЖЕТА (TRIGGER: LOOP DETECTED)
    // Сравниваем начальную часть текущей сцены с предыдущей в истории.
    // Если обнаруживается слишком сильное совпадение, заставляем ИИ кардинально сменить обстановку.
    if (state.history.length > 0) {
        const lastSceneText = state.history[state.history.length - 1].fullText;
        const currentSceneText = state.currentScene.text;
        const comparisonLength = 50; // Количество символов для сравнения
        
        if (lastSceneText.length >= comparisonLength && currentSceneText.length >= comparisonLength) {
            const startOfLastScene = lastSceneText.substring(0, comparisonLength).trim();
            const startOfCurrentScene = currentSceneText.substring(0, comparisonLength).trim();
            
            // Проверяем, не содержат ли сцены друг друга в начале или не очень ли похожи
            if (startOfLastScene === startOfCurrentScene ||
                lastSceneText.includes(startOfCurrentScene) ||
                currentSceneText.includes(startOfLastScene))
            {
                console.log(`🌀 [Client Director] Loop/Repetition Detected: Injecting Anti-Loop.`);
                injections.push(`>>> [TRIGGER: LOOP DETECTED] ${Prompts.injections.antiLoop}`);
            }
        }
    }
    
    // --- ИНЪЕКЦИЯ РИТУАЛА (НОВОЕ) ---
    if (state.isRitualActive) {
        console.log(`🕯️ [Client Director] RITUAL MODE ACTIVE.`);
        injections.push(`>>> [CRITICAL MODE: RITUAL OF INITIATION]
        ТЕКУЩИЙ СТАТУС: Игрок проходит Ритуал Посвящения.
        
        ИНСТРУКЦИИ ДЛЯ РИТУАЛА:
        1. ТОН: Торжественный, архаичный, мистический, пугающий. Используй символизм Телемы (Кроули, Египетские боги, Таро).
        2. СТРУКТУРА: Ритуал — это испытание. Не давай простых путей. Проверяй Волю и Разум.
        3. ПРОГРЕСС: Не начисляй очки прогресса (progress_change: 0) пока ритуал не завершится успехом.
        4. ЗАВЕРШЕНИЕ: Когда игрок пройдет испытание, ОБЯЗАТЕЛЬНО добавь в JSON поле "end_ritual": true и начисли награду прогресса.
        5. ВИЗУАЛ: Описывай запахи, звуки, свет свечей, тени.`);
    }
    
    // 4. БАЗОВЫЕ ИНСТРУКЦИИ ДЛЯ ВСЕХ ЗАПРОСОВ
    // Эти инструкции всегда присутствуют для LLM, они направляют базовую логику генерации.
    injections.push(Prompts.injections.coreMovement); // Основные правила нарратива
    injections.push(Prompts.format.summaryAndMemoryInstructions); // Требования по short_summary и aiMemory
    injections.push(Prompts.format.jsonFewShot); // Пример ожидаемого JSON (few-shot learning)
    
    return injections.join('\n\n'); // Собираем все динамические инструкции в одну строку
}

/**
 * Сборка блока контекста для USER-промпта.
 * Включает глобальную сводку, динамическую память ИИ и краткосрочную историю.
 * Это ключевой механизм для управления объемом контекстного окна и сохранениями.
 * 
 * @param {Object} state - Текущее состояние игры.
 * @returns {string} Форматированный текстовый блок контекста.
 */
function buildContextBlock(state) {
    let parts = [];
    
    // А. ГЛОБАЛЬНАЯ ЛЕТОПИСЬ (Summary)
    // Содержит краткие сводки всех предыдущих ходов. Это "долгосрочная память" ИИ.
    if (state.summary && state.summary.length > 0) {
        parts.push(`${Prompts.userHeaders.contextGlobal}\n${state.summary}`);
    }
    
    // Б. ДИНАМИЧЕСКАЯ ПАМЯТЬ МИРА (aiMemory)
    // Неструктурированные данные (инвентарь, флаги квестов, статусы NPC), которые ИИ сам добавил в прошлых ходах.
    // LLM видит эти данные и может их обновлять в своем ответе.
    if (state.aiMemory && Object.keys(state.aiMemory).length > 0) {
        parts.push(`${Prompts.userHeaders.aiMemory}\n${JSON.stringify(state.aiMemory, null, 2)}`);
    }
    
    // В. КРАТКОСРОЧНАЯ ИСТОРИЯ (Short-Term Memory)
    // Последние N полных ходов (сцена, выбор, изменения) для сохранения непрерывности текущего диалога.
    const turnsToTake = state.summary ? CONFIG.activeContextTurns : CONFIG.historyContext;
    const historySlice = state.history.slice(-turnsToTake);
    
    if (historySlice.length > 0) {
        const historyString = historySlice.map(entry =>
            `СЦЕНА: ${entry.fullText}\nВЫБОР: ${entry.choice}\n(Изменения состояния: ${entry.changes || 'Нет явных изменений'})`
        ).join('\n---\n'); // Разделитель для ясности
        parts.push(`${Prompts.userHeaders.contextShort}\n${historyString}`);
    }
    
    // Если контекст пуст (самое начало игры), даем соответствующее сообщение.
    return parts.length > 0 ? parts.join('\n\n') : "История: Это начало пути. Предыдущих событий нет.";
}

/**
 * Подготовка полного тела запроса (Payload) для отправки в API LLM.
 * @param {Object} state - Состояние игры.
 * @param {Array} selectedChoices - Массив выбранных объектов действий.
 * @param {number} d10 - Результат броска виртуального d10.
 * @param {string|null} customContext - Опциональный пользовательский контекст.
 * @returns {Object} Объект payload, готовый к JSON.stringify и отправке через fetch.
 */
function prepareRequestPayload(state, selectedChoices, d10, customContext = null) {
    // Проверяем, нужно ли запросить новые "мысли героя"
    const needsHeroPhrases = State.needsHeroPhrases();
    
    // 1. Формируем ПОЛНЫЙ СИСТЕМНЫЙ ПРОМПТ
    const dynamicSystemPart = getDynamicSystemInjections(state);
    
    const systemPromptFull = `${Prompts.system.main}
    
${dynamicSystemPart}

${Prompts.format.jsonFormatStrict}`;
    
    // 2. Формируем ПОЛНЫЙ ПОЛЬЗОВАТЕЛЬСКИЙ ПРОМПТ
    const contextBlock = customContext || buildContextBlock(state);
    
    // Дополнительная задача по генерации мыслей героя (если нужно)
    const thoughtsRequestInstruction = needsHeroPhrases ? Prompts.userHeaders.reqThoughts : "";
    
    // Формируем информацию о выбранных действиях
    let actionText;
    let selectedActions = null;
    
    if (selectedChoices.length === 1 && selectedChoices[0].text) {
        // Режим свободного ввода или одиночный выбор
        actionText = selectedChoices[0].text;
        selectedActions = JSON.stringify(selectedChoices, null, 2);
    } else {
        // Множественный выбор
        actionText = selectedChoices.map(choice => choice.text).join(' + ');
        selectedActions = JSON.stringify(selectedChoices, null, 2);
    }
    
    // Строим основной User-промпт
    const userPrompt = `
${Prompts.format.mainTaskPrefix}
${Prompts.format.mainTask}

${Prompts.format.statAndProgressLogic}
${Prompts.format.choicesFormat}
${Prompts.format.progressAndDegrees}
Текущий прогресс игрока: ${state.progress}
Следующая степень: ${CONFIG.degrees.find(d => d.threshold > state.progress)?.name || "XI° и выше"}
Порог следующей степени: ${CONFIG.degrees.find(d => d.threshold > state.progress)?.threshold || "∞"}

${Prompts.userHeaders.d10Luck}${d10}

${Prompts.userHeaders.historyPrefix}
${contextBlock || "История отсутствует"}

${Prompts.userHeaders.currentScene}
${state.currentScene.text}

${Prompts.userHeaders.actualStatesValues}
[Воля: ${state.stats.will},
Скрытность: ${state.stats.stealth},
Влияние: ${state.stats.influence},
Разум: ${state.stats.sanity}]
[Степень: ${CONFIG.degrees[state.degreeIndex].name}]
[Личность: ${state.personality}]

${Prompts.userHeaders.action}
"${actionText}"

[СТРУКТУРИРОВАННЫЕ ВЫБРАННЫЕ ДЕЙСТВИЯ]:
${selectedActions}

${thoughtsRequestInstruction}
    
${Prompts.userHeaders.reqJsonEnd}`;
    
    return {
        messages: [
            { role: "system", content: systemPromptFull },
            { role: "user", content: userPrompt }
        ],
        model: state.settings.model
    };
}

/**
 * Базовая функция выполнения сетевого запроса.
 * Это низкоуровневая обертка над `fetch`, которая только отправляет запрос и возвращает RAW ответ API.
 * Не занимается игровой логикой, парсингом JSON или состоянием игры.
 * 
 * @param {string} url - URL конечной точки API (например, OpenRouter или VseGpt).
 * @param {Object} headers - Объект заголовков HTTP (например, Authorization).
 * @param {Object} payload - Объект с данными запроса, который будет конвертирован в JSON (например, messages, model).
 * @param {AbortController} abortController - Инструмент для отмены запроса (таймауты, пользовательская отмена).
 * @returns {Promise<Object>} JSON-объект, полученный напрямую от API LLM.
 * @throws {Error} В случае ошибки сети или неуспешного HTTP-ответа (статус 4xx, 5xx).
 */
async function executeFetch(url, headers, payload, abortController) {
    // Инициализация цикла повторных попыток на основе глобального конфига
    const maxAttempts = CONFIG.maxRetries || 3;
    // Переменная для сохранения ошибки последней неудачной попытки
    let lastError;
    
    // Цикл выполнения сетевого запроса с лимитом попыток
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            const options = {
                method: 'POST',
                headers: headers,
                body: JSON.stringify(payload) // Конвертируем payload в JSON строку
            };
            
            // Если предоставлен AbortController, привязываем его к сигналу запроса.
            if (abortController) {
                options.signal = abortController.signal;
            }
            
            // Выполняем HTTP-запрос.
            const response = await fetch(url, options);
            
            // Проверяем статус ответа: если не OK (2xx), считаем это ошибкой.
            if (!response.ok) {
                // Читаем текст ошибки для подробной информации и бросаем исключение.
                const errorText = await response.text();
                throw new Error(`HTTP Error ${response.status}: ${errorText}`);
            }
            
            // Если запрос успешен, парсим ответ как JSON и возвращаем его.
            return await response.json();
        } catch (error) {
            // Сохранение ошибки текущей итерации
            lastError = error;
            
            // Если запрос был отменен намеренно, прекращаем цикл без ретраев
            if (error.name === 'AbortError') throw error;
            
            console.warn(`[API_Request] Попытка ${attempt}/${maxAttempts} не удалась: ${error.message}`);
            
            // Проверка необходимости ожидания перед следующей попыткой
            if (attempt < maxAttempts) {
                // Асинхронная пауза между запросами (по умолчанию 1000мс из CONFIG)
                await new Promise(resolve => setTimeout(resolve, CONFIG.retryDelayMs));
            }
        }
    }
    // Выброс финального исключения после исчерпания всех попыток
    throw lastError;
    
}

// Экспортируем публичные методы модуля для использования другими модулями (например, API_Facade).
export const API_Request = {
    prepareRequestPayload,
    executeFetch
};