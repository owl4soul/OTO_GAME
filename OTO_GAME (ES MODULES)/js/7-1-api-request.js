// Модуль 7.1: API REQUEST - Построение и отправка запросов (ПОЛНОСТЬЮ ПЕРЕПИСАН)
'use strict';

import { CONFIG } from './1-config.js';
import { State } from './3-state.js';

const Prompts = CONFIG.prompts;

/**
 * Динамическое формирование системных инъекций
 */
function getDynamicSystemInjections(state) {
    const injections = [];
    const turn = state.turnCount;
    
    // 1. ИНЪЕКЦИЯ СЮЖЕТНОГО ПОВОРОТА
    if (turn > 0 && turn % 10 === 0) {
        console.log(`🌀 [Client Director] Turn ${turn}: Injecting Narrative Twist.`);
        injections.push(`>>> [TRIGGER: TURN ${turn}] ${Prompts.injections.twist}`);
    }
    
    // 2. ИНЪЕКЦИЯ БЕЗУМИЯ
    if (state.stats.sanity < 20) {
        console.log(`🌀 [Client Director] Sanity Low (${state.stats.sanity}): Injecting Insanity.`);
        injections.push(`>>> [TRIGGER: LOW SANITY] ${Prompts.injections.insanity}`);
    }
    
    // 3. ИНЪЕКЦИЯ ЗАЩИТЫ ОТ ПЕТЕЛЬ СЮЖЕТА
    if (state.history.length > 0) {
        const lastSceneText = state.history[state.history.length - 1].fullText;
        const currentSceneText = state.currentScene.text;
        const comparisonLength = 50;
        
        if (lastSceneText.length >= comparisonLength && currentSceneText.length >= comparisonLength) {
            const startOfLastScene = lastSceneText.substring(0, comparisonLength).trim();
            const startOfCurrentScene = currentSceneText.substring(0, comparisonLength).trim();
            
            if (startOfLastScene === startOfCurrentScene ||
                lastSceneText.includes(startOfCurrentScene) ||
                currentSceneText.includes(startOfLastScene))
            {
                console.log(`🌀 [Client Director] Loop/Repetition Detected: Injecting Anti-Loop.`);
                injections.push(`>>> [TRIGGER: LOOP DETECTED] ${Prompts.injections.antiLoop}`);
            }
        }
    }
    
    // 4. ИНЪЕКЦИЯ РИТУАЛА
    if (state.isRitualActive) {
        console.log(`🕯️ [Client Director] RITUAL MODE ACTIVE.`);
        injections.push(`>>> [CRITICAL MODE: RITUAL OF INITIATION]
        ТЕКУЩИЙ СТАТУС: Игрок проходит Ритуал Посвящения.
        
        ИНСТРУКЦИИ ДЛЯ РИТУАЛА:
        1. ТОН: Торжественный, архаичный, мистический, пугающий. Используй символизм Телемы.
        2. СТРУКТУРА: Ритуал — это испытание. Не давай простых путей. Проверяй Волю и Разум.
        3. ПРОГРЕСС: Не начисляй очки прогресса (progress_change: 0) пока ритуал не завершится успехом.
        4. ЗАВЕРШЕНИЕ: Когда игрок пройдет испытание, ОБЯЗАТЕЛЬНО добавь в JSON поле "end_ritual": true и начисли награду прогресса.
        5. ВИЗУАЛ: Описывай запахи, звуки, свет свечей, тени.`);
    }
    
    // 5. БАЗОВЫЕ ИНСТРУКЦИИ
    injections.push(Prompts.injections.coreMovement);
    injections.push(Prompts.format.summaryAndMemoryInstructions);
    injections.push(Prompts.format.jsonFewShot);
    
    return injections.join('\n\n');
}

/**
 * Сборка блока контекста для USER-промпта
 */
function buildContextBlock(state) {
    let parts = [];
    
    // А. ГЛОБАЛЬНАЯ ЛЕТОПИСЬ
    if (state.summary && state.summary.length > 0) {
        parts.push(`${Prompts.userHeaders.contextGlobal}\n${state.summary}`);
    }
    
    // Б. ДИНАМИЧЕСКАЯ ПАМЯТЬ МИРА (aiMemory)
    if (state.aiMemory && Object.keys(state.aiMemory).length > 0) {
        parts.push(`${Prompts.userHeaders.aiMemory}\n${JSON.stringify(state.aiMemory, null, 2)}`);
    }
    
    // В. КРАТКОСРОЧНАЯ ИСТОРИЯ
    const turnsToTake = state.summary ? CONFIG.activeContextTurns : CONFIG.historyContext;
    const historySlice = state.history.slice(-turnsToTake);
    
    if (historySlice.length > 0) {
        const historyString = historySlice.map(entry =>
            `СЦЕНА: ${entry.fullText}\nВЫБОР: ${entry.choice}\n(Изменения состояния: ${entry.changes || 'Нет явных изменений'})`
        ).join('\n---\n');
        parts.push(`${Prompts.userHeaders.contextShort}\n${historyString}`);
    }
    
    return parts.length > 0 ? parts.join('\n\n') : "История: Это начало пути. Предыдущих событий нет.";
}

/**
 * Форматирование selectedActions для промпта
 */
function formatSelectedActionsForPrompt(selectedActions) {
    if (!selectedActions || selectedActions.length === 0) {
        return "Действия не выбраны";
    }
    
    return selectedActions.map(action =>
        `"${action.text}" → ${action.result} (${action.delta})`
    ).join('\n');
}

/**
 * Подготовка полного тела запроса для нового формата
 * @param {Object} state - Состояние игры ПОСЛЕ применения изменений от действий
 * @param {Array} selectedActions - Результаты действий в новом формате [{text, result, delta}]
 * @param {number} d10 - Результат броска d10
 * @returns {Object} Объект payload для отправки через fetch
 */
function prepareRequestPayload(state, selectedActions, d10) {
    // 1. Формируем ПОЛНЫЙ СИСТЕМНЫЙ ПРОМПТ
    const dynamicSystemPart = getDynamicSystemInjections(state);
    
    const systemPromptFull = `${Prompts.system.main}
    
${dynamicSystemPart}

${Prompts.format.jsonFormatStrict}`;
    
    // 2. Формируем ПОЛНЫЙ ПОЛЬЗОВАТЕЛЬСКИЙ ПРОМПТ
    const contextBlock = buildContextBlock(state);
    
    // Проверяем, нужно ли запросить новые "мысли героя"
    const needsHeroPhrases = State.needsHeroPhrases();
    const thoughtsRequestInstruction = needsHeroPhrases ? Prompts.userHeaders.reqThoughts : "";
    
    // Строим основной User-промпт
    const userPrompt = `
${Prompts.format.mainTaskPrefix}
${Prompts.format.mainTask}
${Prompts.format.rulesAndProtocols}

${Prompts.userHeaders.d10Luck}${d10}

${Prompts.userHeaders.historyPrefix}
${contextBlock || "История отсутствует"}

${Prompts.userHeaders.currentScene}
${state.currentScene.text}

${Prompts.userHeaders.actualStatesValues}
[Воля: ${state.stats.will}, Скрытность: ${state.stats.stealth}, Влияние: ${state.stats.influence}, Разум: ${state.stats.sanity}]
[Степень: ${CONFIG.degrees[state.degreeIndex].name}]
[Личность: ${state.personality}]
[Прогресс: ${state.progress}]

${Prompts.userHeaders.inventory_all}
${JSON.stringify(state.inventory, null, 2)}

${Prompts.userHeaders.relations_all}
${JSON.stringify(state.relations, null, 2)}

${state.skills && state.skills.length > 0 ? `${Prompts.userHeaders.skills}\n${JSON.stringify(state.skills, null, 2)}` : ''}

${Prompts.userHeaders.selectedActions}
${formatSelectedActionsForPrompt(selectedActions)}

${thoughtsRequestInstruction}

${Prompts.userHeaders.reqJsonEnd}`;
    
    return {
        messages: [
            { role: "system", content: systemPromptFull },
            { role: "user", content: userPrompt }
        ],
        model: state.settings.model,
        temperature: 0.7,
        max_tokens: 4000
    };
}

/**
 * Базовая функция выполнения сетевого запроса
 */
async function executeFetch(url, headers, payload, abortController) {
    const maxAttempts = CONFIG.maxRetries || 3;
    let lastError;
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            const options = {
                method: 'POST',
                headers: headers,
                body: JSON.stringify(payload)
            };
            
            if (abortController) {
                options.signal = abortController.signal;
            }
            
            const response = await fetch(url, options);
            
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`HTTP Error ${response.status}: ${errorText}`);
            }
            
            return await response.json();
        } catch (error) {
            lastError = error;
            
            if (error.name === 'AbortError') throw error;
            
            console.warn(`[API_Request] Попытка ${attempt}/${maxAttempts} не удалась: ${error.message}`);
            
            if (attempt < maxAttempts) {
                await new Promise(resolve => setTimeout(resolve, CONFIG.retryDelayMs));
            }
        }
    }
    
    throw lastError;
}

// Экспортируем публичные методы модуля
export const API_Request = {
    prepareRequestPayload,
    executeFetch
};