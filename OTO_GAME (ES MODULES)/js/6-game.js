// Модуль 6: GAME - Игровая логика (ФОРМАТ 4.1 - УНИФИЦИРОВАННАЯ СИСТЕМА GAME_ITEM)
// ИСПРАВЛЕННАЯ ВЕРСИЯ: удалены функции создания HTML, теперь они в turn-updates-ui.js
'use strict';

import { CONFIG } from './1-config.js';
import { State } from './3-state.js';
import { DOM } from './4-dom.js';
import { Render } from './5-render.js';
import { Utils } from './2-utils.js';
import { API } from './7-api-facade.js';
import { Saveload } from './9-saveload.js';
import { UI } from './ui.js';
import { OperationsServiceInstance, OPERATIONS } from './operations-service.js';
import { Logger, log, LOG_CATEGORIES, LOG_LEVELS } from './logger.js';
import { TurnUpdatesUI } from './turn-updates-ui.js'; // Импортируем модуль

const dom = DOM.getDOM();

// Переменные состояния
let matrixInterval = null;
let activeAbortController = null;
let pendingOriginalHeroState = null;
let pendingActionResults = null;
let pendingD10 = null;

// Операции над game_item
const OPERATION_TYPES = OPERATIONS;

/**
 * Создает HTML для отображения информации об организациях героя (для сцены)
 */
function createOrganizationsHTML() {
    const organizations = State.getHeroOrganizations();
    
    if (organizations.length === 0) {
        return '';
    }
    
    let html = `
    <div class="organizations-container">
      <div class="organizations-header">
        <i class="fas fa-users"></i>
        <span>ВАШИ ОРГАНИЗАЦИИ</span>
      </div>
  `;
    
    organizations.forEach(org => {
        html += `
      <div class="organization-item">
        <div class="organization-header">
          <span class="organization-id">${org.id.toUpperCase()}</span>
          <span class="organization-rank">${org.rankName}</span>
        </div>
        <div class="organization-description">${org.description}</div>
    `;
        
        if (org.hierarchy && org.hierarchy.description) {
            html += `
        <div class="organization-hierarchy">
          <div class="hierarchy-title">Путь в организации:</div>
          <div class="hierarchy-ranks">
      `;
            
            org.hierarchy.description.forEach(rank => {
                const isCurrent = rank.lvl === org.rank;
                const isPast = rank.lvl < org.rank;
                
                html += `
          <div class="hierarchy-rank ${isCurrent ? 'current' : isPast ? 'past' : 'future'}">
            ${rank.rank}
          </div>
        `;
            });
            
            html += `</div></div>`;
        }
        
        html += `</div>`;
    });
    
    html += `</div>`;
    
    return html;
}

// Функция calculateChoiceResult (без изменений, улучшенная версия)
function calculateChoiceResult(choice, d10) {
    log.debug(LOG_CATEGORIES.TURN_PROCESSING, 'calculateChoiceResult', { choice, d10 });
    
    if (!choice || typeof choice !== 'object') {
        log.error(LOG_CATEGORIES.VALIDATION, 'Некорректный choice для расчета', choice);
        return null;
    }
    
    if (choice.difficulty_level === 0) {
        return {
            success: true,
            partial: false,
            reason: 'Свободный ввод: Автоматический успех',
            d10: d10,
            difficulty: 0,
            operations: []
        };
    }
    
    const requirementsCheck = checkRequirements(choice.requirements || []);
    
    if (!requirementsCheck.success) {
        return {
            success: false,
            partial: false,
            reason: `Провал: отсутствуют требования: ${requirementsCheck.missing.join(', ')}`,
            d10: d10,
            difficulty: choice.difficulty_level,
            operations: choice.fail_penalties || []
        };
    }
    
    const stats = requirementsCheck.stats;
    const difficulty = choice.difficulty_level || 5;
    
    if (d10 === 10) {
        return {
            success: true,
            partial: false,
            reason: 'Критический успех! Бросок 10.',
            d10: d10,
            difficulty: difficulty,
            operations: choice.success_rewards || []
        };
    }
    if (d10 === 1) {
        return {
            success: false,
            partial: false,
            reason: 'Критический провал! Бросок 1.',
            d10: d10,
            difficulty: difficulty,
            operations: choice.fail_penalties || []
        };
    }
    
    if (stats.length === 0) {
        const success = d10 >= difficulty;
        return {
            success: success,
            partial: false,
            reason: success ? `Успех: ${d10} ≥ ${difficulty}` : `Провал: ${d10} < ${difficulty}`,
            d10: d10,
            difficulty: difficulty,
            operations: success ? (choice.success_rewards || []) : (choice.fail_penalties || [])
        };
    }
    
    const TARGET_MULTIPLIER = 10;
    const target = difficulty * TARGET_MULTIPLIER;
    
    const statChecks = stats.map(stat => {
        const total = stat.value + d10;
        const passed = total >= target;
        return {
            id: stat.id,
            base: stat.value,
            withLuck: total,
            passed: passed,
            target: target
        };
    });
    
    const passedCount = statChecks.filter(s => s.passed).length;
    const totalStats = statChecks.length;
    
    let success, partial, reason;
    if (passedCount === totalStats) {
        success = true;
        partial = false;
        reason = `Полный успех: все статы прошли проверку (цель ${target})`;
    } else if (passedCount === 0) {
        success = false;
        partial = false;
        reason = `Полный провал: ни один стат не прошёл проверку (цель ${target})`;
    } else {
        success = true;
        partial = true;
        reason = `Частичный успех: ${passedCount}/${totalStats} статов прошли проверку (цель ${target})`;
    }
    
    let operations = [];
    if (success && !partial) {
        operations = choice.success_rewards || [];
    } else if (success && partial) {
        operations = modifyOperationsForPartialResult(choice.success_rewards || []);
    } else {
        operations = choice.fail_penalties || [];
    }
    
    log.debug(LOG_CATEGORIES.TURN_PROCESSING, 'Результат расчета', { success, partial, operationsCount: operations.length, target });
    
    return {
        success: success,
        partial: partial,
        reason: reason,
        d10: d10,
        difficulty: difficulty,
        statChecks: statChecks,
        threshold: target,
        operations: operations
    };
}

function modifyOperationsForPartialResult(operations) {
    if (!Array.isArray(operations)) return [];
    
    return operations.map(op => {
        if (op.operation === 'MODIFY' && typeof op.delta === 'number') {
            const modifiedDelta = Math.ceil(op.delta * 0.5);
            const finalDelta = modifiedDelta === 0 ?
                (op.delta > 0 ? 1 : -1) :
                modifiedDelta;
            
            return {
                ...op,
                delta: finalDelta,
                description: `${op.description || ''} (частичный результат: ${finalDelta})`
            };
        }
        return op;
    });
}

function checkRequirements(requirements) {
    if (!Array.isArray(requirements) || requirements.length === 0) {
        return { success: true, missing: [], stats: [] };
    }
    
    const missing = [];
    const stats = [];
    
    requirements.forEach(reqId => {
        const hasItem = State.hasGameItem(reqId);
        if (!hasItem) {
            missing.push(reqId);
        }
        
        if (reqId.startsWith('stat:')) {
            const statValue = State.getGameItemValue(reqId);
            if (statValue !== null) {
                stats.push({
                    id: reqId,
                    value: statValue
                });
            }
        }
    });
    
    return {
        success: missing.length === 0,
        missing: missing,
        stats: stats
    };
}

function toggleChoice(idx) {
    const state = State.getState();
    const selectedActions = [...state.gameState.selectedActions];
    
    const pos = selectedActions.indexOf(idx);
    if (pos >= 0) {
        selectedActions.splice(pos, 1);
    } else {
        if (selectedActions.length < CONFIG.maxChoices) {
            selectedActions.push(idx);
        }
    }
    
    State.setState({
        gameState: {
            ...state.gameState,
            selectedActions: selectedActions
        }
    });
    
    Render.renderChoices();
    UI.updateActionButtons();
}

// Завершение и отправка хода (без изменений, кроме вызова TurnUpdatesUI)
async function submitTurn(retries = CONFIG.maxRetries) {
    log.debug(LOG_CATEGORIES.TURN_PROCESSING, 'submitTurn called');
    
    const state = State.getState();
    const turnNumber = state.turnCount;
    
    // Начинаем логирование хода
    Logger.startTurnLogging(turnNumber);
    log.info(LOG_CATEGORIES.TURN_PROCESSING, `🔄 НАЧАЛО ОБРАБОТКИ ХОДА ${turnNumber}`, {
        timestamp: new Date().toISOString(),
        selectedActionsCount: state.freeMode ? 'free' : state.gameState.selectedActions?.length || 0,
        freeMode: state.freeMode,
        freeText: state.freeMode ? state.freeModeText : null
    });
    
    console.log('🔍 submitTurn called');
    console.log(`🎯 Отправка ХОДА ${state.turnCount} к ИИ...`);
    
    if (activeAbortController) {
        activeAbortController.abort();
        activeAbortController = null;
    }
    
    // Сбрасываем изменения статов за предыдущий ход
    State.setState({ lastTurnStatChanges: null });
    
    let selectedChoicesData = [];
    
    if (state.freeMode) {
        const requestText = state.freeModeText.trim();
        if (requestText.length === 0) {
            log.warn(LOG_CATEGORIES.VALIDATION, 'Свободный ввод пуст');
            return;
        }
        
        selectedChoicesData = [{
            text: requestText,
            difficulty_level: 0,
            requirements: [],
            success_rewards: [],
            fail_penalties: []
        }];
        
        dom.freeInputText.disabled = true;
        dom.freeInputText.style.opacity = '0.7';
    } else {
        if (!state.gameState.selectedActions || state.gameState.selectedActions.length === 0) {
            log.warn(LOG_CATEGORIES.VALIDATION, 'Нет выбранных действий');
            return;
        }
        
        log.debug(LOG_CATEGORIES.TURN_PROCESSING, 'Выбранные действия', state.gameState.selectedActions);
        
        selectedChoicesData = state.gameState.selectedActions.map(i => {
            if (!state.gameState.currentScene || !state.gameState.currentScene.choices) {
                log.error(LOG_CATEGORIES.ERROR_TRACKING, 'Нет currentScene или choices');
                return null;
            }
            
            if (!state.gameState.currentScene.choices[i]) {
                log.error(LOG_CATEGORIES.ERROR_TRACKING, `Choice с индексом ${i} не найден`);
                return null;
            }
            return state.gameState.currentScene.choices[i];
        }).filter(Boolean);
        
        log.debug(LOG_CATEGORIES.TURN_PROCESSING, 'Данные выбранных choices', selectedChoicesData);
    }
    
    if (selectedChoicesData.length === 0) {
        log.error(LOG_CATEGORIES.ERROR_TRACKING, 'Нет данных для выбранных действий');
        Render.showErrorAlert("Ошибка", "Нет выбранных действий или данных о них");
        return;
    }
    
    const d10 = Math.round(Math.random() * 10) + 1;
    log.info(LOG_CATEGORIES.TURN_PROCESSING, `🎲 Общий бросок удачи на ход: d10 = ${d10}`, {
        d10: d10,
        turn: turnNumber
    });
    
    const actionResults = [];
    
    selectedChoicesData.forEach((choice, idx) => {
        const result = calculateChoiceResult(choice, d10);
        if (result) {
            actionResults.push({
                ...result,
                choice_text: choice.text,
                choice_index: state.freeMode ? null : state.gameState.selectedActions[idx]
            });
            
            // Логируем результат каждого действия
            log.info(LOG_CATEGORIES.TURN_PROCESSING, `🎯 Результат действия ${idx + 1}`, {
                success: result.success,
                partial: result.partial,
                reason: result.reason,
                difficulty: result.difficulty,
                d10: result.d10,
                operationsCount: result.operations?.length || 0
            });
        }
    });
    
    log.debug(LOG_CATEGORIES.TURN_PROCESSING, 'Результаты действий', actionResults);
    
    // Сохраняем оригинальное состояние и результаты действий
    pendingOriginalHeroState = JSON.parse(JSON.stringify(state.heroState));
    pendingActionResults = actionResults;
    pendingD10 = d10;
    
    // Логируем оригинальное состояние
    log.debug(LOG_CATEGORIES.GAME_STATE, 'Оригинальное состояние героя', {
        stats: pendingOriginalHeroState.filter(item => item.id.startsWith('stat:')).map(s => ({ id: s.id, value: s.value })),
        totalItems: pendingOriginalHeroState.length
    });
    
    // Создаем расчетное состояние для ИИ с использованием OperationsService
    const stateForAI = OperationsServiceInstance.calculateStateForAI(pendingOriginalHeroState, actionResults);
    
    log.info(LOG_CATEGORIES.TURN_PROCESSING, '🧮 Расчетное состояние для ИИ готово', {
        calculatedStats: stateForAI.filter(item => item.id.startsWith('stat:')).map(s => ({ id: s.id, value: s.value })),
        changesCount: actionResults.reduce((acc, r) => acc + (r.operations?.length || 0), 0)
    });
    
    // Подготавливаем данные для отправки ИИ
    const selectedActions = actionResults.map(result => ({
        text: result.choice_text,
        difficulty_level: result.difficulty,
        requirements: selectedChoicesData.find(c => c.text === result.choice_text)?.requirements || [],
        success: result.success,
        partial_success: result.partial,
        d10_roll: result.d10
    }));
    
    log.debug(LOG_CATEGORIES.AI_REQUESTS, 'Данные для отправки ИИ', selectedActions);
    
    dom.btnSubmit.innerHTML = '<span class="spinner"></span>';
    dom.btnSubmit.disabled = true;
    dom.btnClear.disabled = true;
    
    activeAbortController = new AbortController();
    const timeoutId = setTimeout(() => {
        if (activeAbortController) {
            activeAbortController.abort();
            Render.showErrorAlert(
                "Таймаут запроса",
                "Запрос превысил лимит времени (120 секунд). Попробуйте снова.",
                new Error("Request timeout after 120000ms")
            );
        }
    }, CONFIG.requestTimeout);
    
    try {
        log.info(LOG_CATEGORIES.AI_REQUESTS, '📡 Отправляем запрос к ИИ с РАСЧЕТНЫМ состоянием...', {
            turn: turnNumber,
            selectedActionsCount: selectedActions.length,
            calculatedStateSummary: {
                stats: stateForAI.filter(item => item.id.startsWith('stat:')).length,
                items: stateForAI.length
            }
        });
        
        Render.startThoughtsOfHeroDisplay();
        
        // Создаем временное состояние с расчетными данными для отправки ИИ
        const stateForAIRequest = {
            ...state,
            heroState: stateForAI
        };
        
        // Логируем AI запрос
        log.aiRequest(stateForAIRequest, selectedActions, turnNumber);
        
        const startTime = Date.now();
        const data = await API.sendAIRequest(stateForAIRequest, selectedActions, activeAbortController, d10);
        const processingTime = Date.now() - startTime;
        
        clearTimeout(timeoutId);
        activeAbortController = null;
        
        if (!data || !data.scene) {
            // Очищаем pending данные
            pendingOriginalHeroState = null;
            pendingActionResults = null;
            pendingD10 = null;
            
            if (retries > 0) {
                log.warn(LOG_CATEGORIES.AI_REQUESTS, `Ответ ИИ не содержит сцены. Повторная попытка ${CONFIG.maxRetries - retries + 1}.`);
                await new Promise(r => setTimeout(r, CONFIG.retryDelayMs));
                return submitTurn(retries - 1);
            } else {
                throw new Error("ИИ не смог сгенерировать сцену после нескольких попыток.");
            }
        }
        
        log.info(LOG_CATEGORIES.AI_REQUESTS, '✅ Получен ответ от ИИ', {
            hasScene: !!data.scene,
            sceneLength: data.scene?.length || 0,
            choicesCount: data.choices?.length || 0,
            eventsCount: data.events?.length || 0,
            hasOrganizationsHierarchy: !!data._organizationsHierarchy
        });
        
        // Логируем AI ответ
        log.aiResponse(data, processingTime);
        
        // Обрабатываем ход с сохраненными данными
        processTurn(data);
        
    } catch (e) {
        clearTimeout(timeoutId);
        activeAbortController = null;
        
        // Очищаем pending данные при ошибке
        pendingOriginalHeroState = null;
        pendingActionResults = null;
        pendingD10 = null;
        
        Render.stopThoughtsOfHeroDisplay();
        
        if (e.name === 'AbortError') {
            log.info(LOG_CATEGORIES.AI_REQUESTS, 'Запрос отменен');
            return;
        }
        
        if (e.message.includes("парсинга JSON") && retries > 0) {
            log.warn(LOG_CATEGORIES.AI_REQUESTS, `JSON повреждён. Повторяем запрос... (${retries} попыток осталось)`);
            await new Promise(r => setTimeout(r, 1500));
            return submitTurn(retries - 1);
        }
        
        log.error(LOG_CATEGORIES.ERROR_TRACKING, '💥 Ошибка в submitTurn', {
            error: e.message,
            stack: e.stack,
            turn: turnNumber
        });
        
        if (state.freeMode) {
            dom.freeInputText.disabled = false;
            dom.freeInputText.style.opacity = '1';
        }
        
        let errorMsg = e.message;
        if (e.message === 'Failed to fetch') {
            errorMsg += '\n\n🔍 Проверьте:\n- Запущен ли локальный сервер? (не file://)\n- Интернет/VPN?\n- DevTools → Network (ищите красный запрос).';
        } else if (e.message.includes('Введите API ключ')) {
            errorMsg += '\n\n🔑 Введите валидный API-ключ в настройках.';
        }
        
        Render.showErrorAlert("Ошибка соединения", errorMsg, e);
        
        dom.btnSubmit.innerHTML = '<i class="fas fa-paper-plane"></i> ОТПРАВИТЬ';
        dom.btnSubmit.disabled = false;
        dom.btnClear.disabled = false;
    } finally {
        if (state.freeMode) {
            dom.freeInputText.disabled = false;
            dom.freeInputText.style.opacity = '1';
            dom.freeInputText.focus();
        }
        State.saveStateToLocalStorage();
        
        // Завершаем логирование хода
        Logger.endTurnLogging(turnNumber, {
            operationsCount: actionResults.reduce((acc, r) => acc + (r.operations?.length || 0), 0),
            successfulOperations: actionResults.filter(r => r.success).length,
            failedOperations: actionResults.filter(r => !r.success).length
        });
    }
}

// Обработка результатов хода (изменён вызов создания HTML)
function processTurn(data) {
    log.debug(LOG_CATEGORIES.TURN_PROCESSING, 'processTurn called with pending data');
    Render.stopThoughtsOfHeroDisplay();
    
    if (!pendingOriginalHeroState || !pendingActionResults) {
        log.error(LOG_CATEGORIES.ERROR_TRACKING, 'Нет pending данных для обработки хода');
        return;
    }
    
    const state = State.getState();
    const completedTurn = state.turnCount;
    
    log.info(LOG_CATEGORIES.TURN_PROCESSING, `🎯 Обработка ответа на ХОД ${completedTurn}...`, {
        hasScene: !!data.scene,
        choicesCount: data.choices?.length || 0,
        eventsCount: data.events?.length || 0
    });
    
    const previousScene = state.gameState.currentScene;
    
    // 1. Уменьшаем длительность эффектов в реальном состоянии
    const buffResult = OperationsServiceInstance.decreaseBuffDurations(state.heroState);
    log.info(LOG_CATEGORIES.OPERATIONS, `🕐 Уменьшена длительность эффектов`, {
        processed: buffResult.processed,
        removed: buffResult.removed
    });
    
    // 2. Применяем операции от действий к реальному состоянию
    let totalActionOperations = 0;
    pendingActionResults.forEach(result => {
        if (result.operations && Array.isArray(result.operations)) {
            totalActionOperations += result.operations.length;
            log.debug(LOG_CATEGORIES.OPERATIONS, `Применяем операции от действия`, {
                operationsCount: result.operations.length,
                actionText: result.choice_text
            });
            
            const operationResult = OperationsServiceInstance.applyOperations(result.operations, state.heroState);
            if (!operationResult.success) {
                log.warn(LOG_CATEGORIES.OPERATIONS, 'Некоторые операции от действий не были применены', operationResult);
            }
        }
    });
    
    // 3. Применяем операции от событий
    let totalEventOperations = 0;
    if (data.events && Array.isArray(data.events)) {
        const eventOperations = [];
        data.events.forEach(event => {
            if (event.effects && Array.isArray(event.effects)) {
                eventOperations.push(...event.effects);
            }
        });
        
        totalEventOperations = eventOperations.length;
        if (eventOperations.length > 0) {
            log.info(LOG_CATEGORIES.OPERATIONS, 'Применяем операции от событий', {
                operationsCount: eventOperations.length,
                eventsCount: data.events.length
            });
            
            const eventResult = OperationsServiceInstance.applyOperations(eventOperations, state.heroState);
            if (!eventResult.success) {
                log.warn(LOG_CATEGORIES.OPERATIONS, 'Некоторые операции от событий не были применены', eventResult);
            }
        }
    }
    
    // 4. Рассчитываем изменения статов
    const changes = OperationsServiceInstance.calculateChanges(pendingOriginalHeroState, state.heroState);
    log.info(LOG_CATEGORIES.GAME_STATE, '📊 Изменения за ход', {
        totalChanges: Object.keys(changes).reduce((acc, key) => acc + Object.keys(changes[key]).length, 0),
        stats: changes.stats ? Object.keys(changes.stats).length : 0,
        items: changes.items ? Object.keys(changes.items).length : 0
    });
    
    // Логируем детальные изменения состояния
    if (changes.stats && Object.keys(changes.stats).length > 0) {
        log.stateChange(changes.stats, pendingOriginalHeroState, state.heroState);
    }
    
    // Сохраняем изменения статов для отображения
    const statChanges = {};
    if (changes.stats) {
        Object.keys(changes.stats).forEach(statId => {
            statChanges[statId] = changes.stats[statId].delta;
        });
    }
    
    // 5. Обновляем память ИИ и сцену
    const updatedAiMemory = (data.aiMemory && typeof data.aiMemory === 'object' && Object.keys(data.aiMemory).length > 0) ?
        data.aiMemory : state.gameState.aiMemory;
    
    if (data.thoughts && Array.isArray(data.thoughts)) {
        State.addHeroPhrases(data.thoughts);
        log.info(LOG_CATEGORIES.GAME_STATE, '💭 Получены мысли героя', {
            thoughtsCount: data.thoughts.length
        });
    }
    
    const updatedScene = {
        scene: data.scene || state.gameState.currentScene.scene,
        reflection: data.reflection || "",
        choices: data.choices || state.gameState.currentScene.choices,
        typology: data.typology || "",
        design_notes: data.design_notes || "",
        aiMemory: updatedAiMemory,
        thoughts: data.thoughts || [],
        summary: data.summary || "",
        personality: data.personality || ""
    };
    
    // Добавляем запись в историю
    const newHistoryEntry = {
        fullText: data.scene || "",
        summary: data.summary || "",
        timestamp: new Date().toISOString(),
        d10: pendingD10,
        actionResults: pendingActionResults.map(a => ({
            text: a.choice_text,
            success: a.success,
            partial: a.partial
        }))
    };
    
    const updatedHistory = [...state.gameState.history, newHistoryEntry];
    if (updatedHistory.length > CONFIG.historyContext) {
        updatedHistory.shift();
    }
    
    // 6. ОБРАБОТКА ОРГАНИЗАЦИЙ
    if (data._organizationsHierarchy && typeof data._organizationsHierarchy === 'object') {
        log.info(LOG_CATEGORIES.ORGANIZATIONS, '🏛️ Обновление иерархий организаций из ответа ИИ');
        
        let updatedHierarchies = 0;
        for (const orgId in data._organizationsHierarchy) {
            const hierarchy = data._organizationsHierarchy[orgId];
            if (hierarchy && hierarchy.value && hierarchy.description) {
                const success = State.setOrganizationHierarchy(orgId, hierarchy);
                if (success) {
                    updatedHierarchies++;
                    log.organization('UPDATE_HIERARCHY', orgId, null, null);
                }
            }
        }
        
        if (updatedHierarchies > 0) {
            log.info(LOG_CATEGORIES.ORGANIZATIONS, `✅ Обновлено иерархий организаций: ${updatedHierarchies}`);
        }
    }
    
    // 7. Проверяем операции с организациями
    const organizationOperations = [];
    pendingActionResults.forEach(result => {
        if (result.operations && Array.isArray(result.operations)) {
            result.operations.forEach(op => {
                if (op.id && op.id.startsWith('organization_rank:')) {
                    organizationOperations.push({
                        operation: op.operation,
                        id: op.id,
                        value: op.value,
                        delta: op.delta,
                        description: op.description,
                        source: 'action'
                    });
                }
            });
        }
    });
    
    if (data.events && Array.isArray(data.events)) {
        data.events.forEach(event => {
            if (event.effects && Array.isArray(event.effects)) {
                event.effects.forEach(effect => {
                    if (effect.id && effect.id.startsWith('organization_rank:')) {
                        organizationOperations.push({
                            operation: effect.operation,
                            id: effect.id,
                            value: effect.value,
                            delta: effect.delta,
                            description: effect.description,
                            source: 'event'
                        });
                    }
                });
            }
        });
    }
    
    if (organizationOperations.length > 0) {
        log.info(LOG_CATEGORIES.ORGANIZATIONS, 'Найдены операции с организациями', {
            operationsCount: organizationOperations.length
        });
    }
    
    // ========== ВЫЗОВ МЕТОДА ДЛЯ ГЕНЕРАЦИИ И СОХРАНЕНИЯ HTML ==========
    TurnUpdatesUI.generateUpdatesHTML(pendingActionResults, data.events || [], completedTurn);
    
    // 9. Увеличиваем счетчик ходов
    const nextTurn = State.incrementTurnCount();
    log.info(LOG_CATEGORIES.TURN_PROCESSING, `➡️ Переход к ХОДУ ${nextTurn}`, {
        completedTurn: completedTurn,
        nextTurn: nextTurn,
        totalOperations: totalActionOperations + totalEventOperations
    });
    
    // 10. Сохраняем все изменения
    State.setState({
        gameState: {
            ...state.gameState,
            currentScene: updatedScene,
            history: updatedHistory,
            summary: data.summary || state.gameState.summary,
            selectedActions: [],
            aiMemory: updatedAiMemory,
            organizationsHierarchy: state.gameState.organizationsHierarchy || {}
        },
        thoughtsOfHero: State.getHeroPhrasesCount() > 0 ? state.thoughtsOfHero : [],
        lastTurnStatChanges: statChanges,
        // lastTurnUpdates уже обновлён в TurnUpdatesUI.generateUpdatesHTML
    });
    
    // 11. Очищаем pending данные
    pendingOriginalHeroState = null;
    pendingActionResults = null;
    pendingD10 = null;
    
    // 12. Обновляем UI
    UI.setFreeModeUI(false);
    
    // 13. Эмитим события
    const safePreviousScene = previousScene || {
        scene: "В начале игры предыдущая сцена отсутствует.",
        choices: []
    };
    
    State.emit(State.EVENTS.HERO_CHANGED, {
        statChanges: statChanges,
        actionResults: pendingActionResults,
        events: data.events || [],
        changes: changes
    });
    
    State.emit(State.EVENTS.SCENE_CHANGED, {
        scene: updatedScene,
        previousScene: safePreviousScene
    });
    
    State.emit(State.EVENTS.TURN_COMPLETED, {
        actions: pendingActionResults,
        statChanges: statChanges,
        turnNumber: completedTurn,
        operationsCount: totalActionOperations + totalEventOperations
    });
    
    // 14. Восстанавливаем UI
    dom.freeInputText.disabled = false;
    dom.freeInputText.style.opacity = '1';
    dom.freeModeToggle.checked = false;
    dom.btnSubmit.innerHTML = '<i class="fas fa-paper-plane"></i> ОТПРАВИТЬ';
    UI.updateActionButtons();
    
    // 15. Сохраняем состояние
    State.saveStateToLocalStorage();
    
    log.info(LOG_CATEGORIES.TURN_PROCESSING, '✅ processTurn завершен с сохранением состояния', {
        turn: completedTurn,
        sceneLength: updatedScene.scene?.length || 0,
        choicesCount: updatedScene.choices?.length || 0
    });
    
    State.checkHeroDeath();
    Render.applyStateEffects();
}

function showEndScreen(title, msg, color, isVictory = false) {
    log.info(LOG_CATEGORIES.GAME_STATE, "showEndScreen called", { title, isVictory });
    
    const canvas = document.getElementById('matrixCanvas');
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    
    const letters = '93 ΘΈΛΗΜΑ 93 ἈΓΆΠΗ 93 THELEMA 93 AGAPE93';
    let letterIndex = 0;
    
    const layers = [
    {
        fontSize: 18,
        speed: 1.8,
        alpha: 0.9,
        colorFactor: 1.0,
        density: 0.7,
        resetChance: 0.98
    },
    {
        fontSize: 14,
        speed: 1.0,
        alpha: 0.7,
        colorFactor: 0.7,
        density: 0.85,
        resetChance: 0.975
    },
    {
        fontSize: 10,
        speed: 0.6,
        alpha: 0.4,
        colorFactor: 0.4,
        density: 1.0,
        resetChance: 0.97
    }];
    
    const layerData = [];
    for (let i = 0; i < layers.length; i++) {
        const layer = layers[i];
        const columns = Math.floor(canvas.width / layer.fontSize);
        
        layerData.push({
            fontSize: layer.fontSize,
            speed: layer.speed,
            alpha: layer.alpha,
            colorFactor: layer.colorFactor,
            resetChance: layer.resetChance,
            columns: columns,
            drops: Array(columns).fill(0).map(() => Math.random() * -canvas.height / layer.fontSize),
            waves: Array(columns).fill(0).map(() => Math.random() * Math.PI * 2),
            waveSpeed: 0.05 + Math.random() * 0.05
        });
    }
    
    function adjustColor(factor) {
        var red = Math.floor(0x88 * factor);
        return 'rgb(' + red + ',0,0)';
    }
    
    if (matrixInterval) clearInterval(matrixInterval);
    
    matrixInterval = setInterval(function() {
        ctx.fillStyle = 'rgba(0,0,0,0.05)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        for (let layerIdx = 0; layerIdx < layerData.length; layerIdx++) {
            const layer = layerData[layerIdx];
            ctx.globalAlpha = layer.alpha;
            ctx.fillStyle = adjustColor(layer.colorFactor);
            ctx.font = 'bold ' + layer.fontSize + 'px monospace';
            
            for (let i = 0; i < layer.drops.length; i++) {
                if (Math.random() > layer.density) continue;
                
                const x = i * layer.fontSize + Math.sin(layer.waves[i]) * layer.fontSize * 0.3;
                layer.waves[i] += layer.waveSpeed;
                const text = letters.charAt(letterIndex % letters.length);
                letterIndex++;
                const y = layer.drops[i] * layer.fontSize;
                
                if (y > -layer.fontSize && y < canvas.height) {
                    if (layerIdx === 0) {
                        ctx.shadowColor = '#880000';
                        ctx.shadowBlur = 8;
                    }
                    ctx.fillText(text, x, y);
                    ctx.shadowColor = 'transparent';
                    ctx.shadowBlur = 0;
                }
                
                layer.drops[i] += layer.speed;
                
                if (layer.drops[i] * layer.fontSize > canvas.height && Math.random() > layer.resetChance) {
                    layer.drops[i] = 0;
                    layer.waves[i] = Math.random() * Math.PI * 2;
                }
            }
        }
        
        ctx.globalAlpha = 1.0;
    }, 33);
    
    document.getElementById('endTitle').textContent = title;
    document.getElementById('endTitle').style.color = color;
    document.getElementById('endMsg').textContent = msg;
    document.getElementById('btnContinueGame').style.display = isVictory ? 'inline-block' : 'none';
    dom.overlay.style.display = 'block';
}

function continueGame() {
    dom.overlay.style.display = 'none';
    if (matrixInterval) {
        clearInterval(matrixInterval);
        matrixInterval = null;
    }
}

function restartGame() {
    if (confirm("Начать путь заново?")) {
        if (matrixInterval) {
            clearInterval(matrixInterval);
            matrixInterval = null;
        }
        dom.overlay.style.display = 'none';
        State.resetGameProgress(true);
    }
}

function handleClear() {
    const state = State.getState();
    
    if (state.freeMode) {
        state.freeModeText = '';
        dom.freeInputText.value = '';
        dom.choicesCounter.textContent = '0/∞';
        State.setState({ freeModeText: '' });
    } else {
        State.setState({
            gameState: {
                ...state.gameState,
                selectedActions: []
            }
        });
        Render.renderChoices();
    }
    
    UI.updateActionButtons();
}

function handleFreeModeToggle(e) {
    const state = State.getState();
    const isFreeMode = e.target.checked;
    
    log.info(LOG_CATEGORIES.UI_EVENTS, 'Переключение режима', {
        mode: isFreeMode ? 'free' : 'choices',
        previousMode: state.freeMode ? 'free' : 'choices'
    });
    
    State.setState({
        freeMode: isFreeMode,
    });
    
    UI.setFreeModeUI(isFreeMode);
    UI.updateActionButtons();
    
    State.emit(State.EVENTS.MODE_CHANGED, { mode: isFreeMode ? 'free' : 'choices' });
}

// Подписка на события состояния
function setupGameObservers() {
    log.debug(LOG_CATEGORIES.GAME_STATE, 'Настройка игровых подписок...');
    
    // Обработка ритуалов
    State.on(State.EVENTS.RITUAL_STARTED, (data) => {
        log.info(LOG_CATEGORIES.GAME_STATE, '🕯️ Начался ритуал', data);
        document.body.classList.add('ritual-mode');
    });
    
    State.on(State.EVENTS.RITUAL_PROGRESS, (data) => {
        const ritualProgress = document.getElementById('ritualProgress');
        if (ritualProgress) {
            ritualProgress.style.width = `${data.progress}%`;
        }
    });
    
    State.on(State.EVENTS.DEGREE_UPGRADED, (data) => {
        log.info(LOG_CATEGORIES.ORGANIZATIONS, `🎓 Повышение степени: ${data.oldDegree} → ${data.newDegree}`, data);
        Render.showSuccessAlert('🎓 Новый ранг!',
            `Вы достигли степени: ${data.degreeName}. Получен бонус ко всем характеристикам!`);
    });
    
    // Подписка на мысли героя
    State.on(State.EVENTS.THOUGHTS_UPDATED, (data) => {
        const thoughtsContainer = document.getElementById('heroThoughts');
        if (thoughtsContainer && data.thoughts) {
            thoughtsContainer.innerHTML = data.thoughts
                .map(t => `<div class="thought">💭 ${t}</div>`)
                .join('');
        }
    });
    
    // Подписка на смерть героя
    State.on(State.EVENTS.HERO_DEATH, (data) => {
        log.error(LOG_CATEGORIES.GAME_STATE, '☠️ Герой умер', data);
        showEndScreen("ПОРАЖЕНИЕ", "Твоя воля иссякла, рассудок померк, скрытность раскрыта, влияние утрачено.", "#800");
    });
    
    // Подписка на победу
    State.on(State.EVENTS.VICTORY, () => {
        log.info(LOG_CATEGORIES.GAME_STATE, '🎉 Победа достигнута');
        showEndScreen("ПОБЕДА", "Ты достиг высшей степени посвящения. Орден признал тебя равным.", "#d4af37", true);
    });
}

export const Game = {
    toggleChoice,
    submitTurn,
    continueGame,
    restartGame,
    handleClear,
    handleFreeModeToggle,
    checkRequirements,
    // createTurnUpdatesHTML больше не экспортируется
    createOrganizationsHTML,
    setupGameObservers
};