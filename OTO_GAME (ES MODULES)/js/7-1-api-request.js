// Модуль 7.1: API REQUEST - Построение и отправка запросов (7-1-api-request.js)
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
 * Подготовка полного тела запроса (Payload) для отправки в API LLM.
 * @param {Object} state - Состояние игры ПОСЛЕ применения изменений от действий
 * @param {string} actionResultsText - Форматированные результаты действий
 * @param {number|null} d10 - Результат броска виртуального d10 (если требуется)
 * @param {string|null} customContext - Опциональный пользовательский контекст
 * @returns {Object} Объект payload, готовый к JSON.stringify и отправке через fetch
 */
function prepareRequestPayload(state, actionResultsText, d10 = null, customContext = null) {
    // Проверяем, нужно ли запросить новые "мысли героя"
    const needsHeroPhrases = State.needsHeroPhrases();
    
    // 1. Формируем ПОЛНЫЙ СИСТЕМНЫЙ ПРОМПТ
    const dynamicSystemPart = getDynamicSystemInjections(state);
    
    const systemPromptFull = `${Prompts.system.main}
    
${dynamicSystemPart}

${Prompts.format.jsonFormatStrict}

ВАЖНОЕ ИЗМЕНЕНИЕ ФОРМАТА:
1. Вместо "inventory_all" теперь используй "inventory_changes" с полями "add" и "remove"
2. Вместо "relations_all" теперь используй "relations_changes" с объектом NPC->изменение
3. Добавь поле "skill_add" для нового навыка героя (если уместно)
4. Поля "inventory_all" и "relations_all" больше НЕ ДОЛЖНЫ использоваться!`;
    
    // 2. Формируем ПОЛНЫЙ ПОЛЬЗОВАТЕЛЬСКИЙ ПРОМПТ
    const contextBlock = customContext || buildContextBlock(state);
    
    // Дополнительная задача по генерации мыслей героя
    const thoughtsRequestInstruction = needsHeroPhrases ? Prompts.userHeaders.reqThoughts : "";
    
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

${d10 !== null ? `${Prompts.userHeaders.d10Luck}${d10}` : ''}

${Prompts.userHeaders.historyPrefix}
${contextBlock || "История отсутствует"}

${Prompts.userHeaders.currentScene}
${state.currentScene.text}

${Prompts.userHeaders.actualStatesValues}
[Воля: ${state.stats.will}, Скрытность: ${state.stats.stealth}, Влияние: ${state.stats.influence}, Разум: ${state.stats.sanity}]
[Степень: ${CONFIG.degrees[state.degreeIndex].name}]
[Личность: ${state.personality}]

${Prompts.userHeaders.inventory_all || '[ИНВЕНТАРЬ]:'}
${JSON.stringify(state.inventory, null, 2)}

${Prompts.userHeaders.relations_all || '[ОТНОШЕНИЯ]:'}
${JSON.stringify(state.relations, null, 2)}

${state.skills && state.skills.length > 0 ? `${Prompts.userHeaders.skills || '[НАВЫКИ]:'}\n${JSON.stringify(state.skills, null, 2)}` : ''}

${Prompts.userHeaders.action_results || '[РЕЗУЛЬТАТЫ ДЕЙСТВИЙ]:'}
${actionResultsText}

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