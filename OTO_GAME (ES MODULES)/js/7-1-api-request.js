// Модуль 7.1: API REQUEST - Построение и отправка запросов (ФОРМАТ 4.1)
'use strict';

import { CONFIG } from './1-config.js';
import { State } from './3-state.js';
import { PROMPTS } from './prompts.js';

/**
 * Динамическое формирование системных инъекций для формата 4.1
 */
function getDynamicSystemInjections(state) {
    const injections = [];
    const turn = state.turnCount;
    
    // 1. ИНЪЕКЦИЯ СЮЖЕТНОГО ПОВОРОТА
    if (turn > 0 && turn % 10 === 0) {
        console.log(`🌀 [Client Director] Turn ${turn}: Injecting Narrative Twist.`);
        injections.push(`>>> [TRIGGER: TURN ${turn}] ${PROMPTS.injections.twist}`);
    }
    
    // 2. ИНЪЕКЦИЯ БЕЗУМИЯ
    const sanityItem = State.getGameItem('stat:sanity');
    if (sanityItem && sanityItem.value < 20) {
        console.log(`🌀 [Client Director] Sanity Low (${sanityItem.value}): Injecting Insanity.`);
        injections.push(`>>> [TRIGGER: LOW SANITY] ${PROMPTS.injections.insanity}`);
    }
    
    // 3. ИНЪЕКЦИЯ ЗАЩИТЫ ОТ ПЕТЕЛЬ СЮЖЕТА
    if (state.gameState.history.length > 0) {
        const lastHistory = state.gameState.history[state.gameState.history.length - 1];
        const lastSceneText = lastHistory.fullText || '';
        const currentSceneText = state.gameState.currentScene.text || '';
        const comparisonLength = 50;
        
        if (lastSceneText.length >= comparisonLength && currentSceneText.length >= comparisonLength) {
            const startOfLastScene = lastSceneText.substring(0, comparisonLength).trim();
            const startOfCurrentScene = currentSceneText.substring(0, comparisonLength).trim();
            
            if (startOfLastScene === startOfCurrentScene ||
                lastSceneText.includes(startOfCurrentScene) ||
                currentSceneText.includes(startOfLastScene))
            {
                console.log(`🌀 [Client Director] Loop/Repetition Detected: Injecting Anti-Loop.`);
                injections.push(`>>> [TRIGGER: LOOP DETECTED] ${PROMPTS.injections.antiLoop}`);
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
        3. ПРОГРЕСС: Не начисляй очки прогресса (progress:oto) пока ритуал не завершится успехом.
        4. ЗАВЕРШЕНИЕ: Когда игрок пройдет испытание, ОБЯЗАТЕЛЬНО добавь в JSON поле "ritual_completed": true.
        5. ВИЗУАЛ: Описывай запахи, звуки, свет свечей, тени.`);
    }
    
    // 5. БАЗОВЫЕ ИНСТРУКЦИИ
    injections.push(PROMPTS.injections.coreMovement);
    
    return injections.join('\n\n');
}

/**
 * Сборка блока контекста для USER-промпта (ФОРМАТ 4.1)
 */
function buildContextBlock(state) {
    let parts = [];
    
    // А. ГЛОБАЛЬНАЯ ЛЕТОПИСЬ
    if (state.gameState.summary && state.gameState.summary.length > 0) {
        parts.push(`### ГЛОБАЛЬНАЯ ЛЕТОПИСЬ\n${state.gameState.summary}`);
    }
    
    // Б. ДИНАМИЧЕСКАЯ ПАМЯТЬ МИРА (aiMemory)
    if (state.gameState.aiMemory && Object.keys(state.gameState.aiMemory).length > 0) {
        parts.push(`### ДИНАМИЧЕСКАЯ ПАМЯТЬ МИРА\n${JSON.stringify(state.gameState.aiMemory, null, 2)}`);
    }
    
    // В. КРАТКОСРОЧНАЯ ИСТОРИЯ
    const turnsToTake = state.gameState.summary ? CONFIG.activeContextTurns : CONFIG.historyContext;
    const historySlice = state.gameState.history.slice(-turnsToTake);
    
    if (historySlice.length > 0) {
        const historyString = historySlice.map(entry =>
            `СЦЕНА: ${entry.fullText}\nВЫБОР: ${entry.choice}\n(Изменения состояния: ${entry.changes || 'Нет явных изменений'})`
        ).join('\n---\n');
        parts.push(`### КРАТКОСРОЧНАЯ ИСТОРИЯ (последние ${historySlice.length} ходов)\n${historyString}`);
    }
    
    return parts.length > 0 ? parts.join('\n\n') : "История: Это начало пути. Предыдущих событий нет.";
}

/**
 * Форматирование selectedActions для промпта (ФОРМАТ 4.1)
 */
function formatSelectedActionsForPrompt(selectedActions) {
    if (!selectedActions || selectedActions.length === 0) {
        return "Действия не выбраны";
    }
    
    return selectedActions.map(action => {
        const status = action.success ? '✅ УСПЕХ' :
            action.partial_success ? '⚠️ ЧАСТИЧНЫЙ УСПЕХ' : '❌ ПРОВАЛ';
        return `"${action.text}" → ${status} (Сложность: ${action.difficulty_level})`;
    }).join('\n');
}

/**
 * Подготовка полного тела запроса для формата 4.1
 */
function prepareRequestPayload(state, selectedActions, d10) {
    // 1. Формируем ПОЛНЫЙ СИСТЕМНЫЙ ПРОМПТ
    const dynamicSystemPart = getDynamicSystemInjections(state);
    
    const systemPromptFull = `${PROMPTS.system.gameMaster}

${PROMPTS.corePrinciples}

${PROMPTS.absoluteProhibitions}

${PROMPTS.fundamentalProtocols}

${PROMPTS.heroStateDescription}

### ТИПЫ GAME_ITEM И ИХ ФОРМАТЫ:
${PROMPTS.gameItemProtocol}

### ОПЕРАЦИИ НАД GAME_ITEM:
${PROMPTS.operationsProtocol}

### СТРУКТУРА CHOICE (ВАРИАНТА ВЫБОРА):
${PROMPTS.choicesProtocol}

### СТРУКТУРА EVENT (СОБЫТИЯ):
${PROMPTS.eventsProtocol}

### РАСЧЁТ УСПЕХА/ПРОВАЛА:
${PROMPTS.calculationsExplanation}

### ПОШАГОВЫЙ АЛГОРИТМ ГЕНЕРАЦИИ ОТВЕТА:
${PROMPTS.workflowAlgorithm}

### ПРОВЕРОЧНЫЙ СПИСОК:
${PROMPTS.validationChecklist}

### ФОРМАТ ВХОДНЫХ ДАННЫХ:
${PROMPTS.inputFormat}

### ФОРМАТ ВЫХОДНЫХ ДАННЫХ:
${PROMPTS.outputFormat}

### СТРУКТУРА JSON ОТВЕТА:
${PROMPTS.jsonStructure}

${dynamicSystemPart}

### ПРИМЕР CHOICE СО ВСЕМИ ТИПАМИ ТРЕБОВАНИЙ:
${PROMPTS.exampleChoiceWithAllTypes}

### ЧАСТЫЕ ОШИБКИ:
${PROMPTS.commonErrors}`;
    
    // 2. Формируем ПОЛЬЗОВАТЕЛЬСКИЙ ПРОМПТ
    const contextBlock = buildContextBlock(state);
    
    // Собираем геройское состояние в читаемом формате
    const heroStateSummary = state.heroState.map(item => {
        let line = `• ${item.id}: ${item.value}`;
        if (item.description) line += ` (${item.description})`;
        if (item.duration !== undefined) line += ` [длительность: ${item.duration}]`;
        return line;
    }).join('\n');
    
    // Проверяем, нужно ли запросить новые "мысли героя"
    const needsHeroPhrases = State.needsHeroPhrases();
    
    const userPrompt = `### ЗАДАНИЕ:
Сгенерируй следующую сцену на основе выбранных действий и текущего состояния героя.

### ИНСТРУКЦИИ:
1. Используй ПОШАГОВЫЙ АЛГОРИТМ ГЕНЕРАЦИИ ОТВЕТА из системного промпта.
2. ВСЕ изменения состояния должны быть явно указаны через операции (ADD, REMOVE, SET, MODIFY).
3. Генерируй 5-10 choices, 0-3 events, 10+ thoughts.
4. Используй HTML-разметку для сцены.

### БРОСОК УДАЧИ НА ХОД:
d10 = ${d10}

### КОНТЕКСТ ИГРЫ:
${contextBlock}

### ТЕКУЩАЯ СЦЕНА:
${state.gameState.currentScene.text}

### СОСТОЯНИЕ ГЕРОЯ (GAME_ITEMS):
${heroStateSummary}

### ВЫБРАННЫЕ ДЕЙСТВИЯ И ИХ РЕЗУЛЬТАТЫ:
${formatSelectedActionsForPrompt(selectedActions)}

${needsHeroPhrases ? '### ЗАПРОС: Пожалуйста, сгенерируй 10+ мыслей героя (thoughts) для отображения в интерфейсе.' : ''}

### ТРЕБОВАНИЯ К ОТВЕТУ:
Верни ТОЛЬКО валидный JSON объект согласно указанной структуре, без пояснений или дополнительного текста.`;
    
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
 * @returns {Promise<Object>} Распарсенный JSON-ответ
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

/**
 * Выполняет запрос и возвращает сырой текст ответа (до парсинга)
 * @returns {Promise<string>} Сырой текст ответа
 */
async function executeFetchRaw(url, headers, payload, abortController) {
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
            
            // Возвращаем сырой текст (важно для аудита)
            return await response.text();
            
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
    executeFetch,
    executeFetchRaw
};