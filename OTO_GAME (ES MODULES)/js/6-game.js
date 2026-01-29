// Модуль 6: GAME - Игровая логика (ФОРМАТ 4.1 - УНИФИЦИРОВАННАЯ СИСТЕМА GAME_ITEM)
'use strict';

import { CONFIG } from './1-config.js';
import { State } from './3-state.js';
import { DOM } from './4-dom.js';
import { Render } from './5-render.js';
import { Utils } from './2-utils.js';
import { API } from './7-api-facade.js';
import { Saveload } from './9-saveload.js';
import { UI } from './ui.js';

const dom = DOM.getDOM();

// Переменные состояния
let matrixInterval = null;
let activeAbortController = null;
let thoughtsOfHeroInterval = null;

/**
 * Проверка требований для выбора действия (ФОРМАТ 4.1)
 * @param {Array} requirements - Массив ID game_items
 * @returns {Object} {success: boolean, missing: Array, stats: Array}
 */
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
        
        // Собираем статы для расчета
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

/**
 * Расчет результата одного действия (ФОРМАТ 4.1)
 * @param {Object} choice - Вариант выбора
 * @param {number} d10 - Бросок удачи на ход
 * @returns {Object} Результат расчета
 */
function calculateChoiceResult(choice, d10) {
    if (!choice || typeof choice !== 'object') {
        console.error('❌ Некорректный choice для расчета:', choice);
        return null;
    }
    
    const requirementsCheck = checkRequirements(choice.requirements || []);
    
    // 1. Если нет требований или требования не содержат статов
    if (requirementsCheck.stats.length === 0) {
        const success = d10 > (choice.difficulty_level || 5);
        return {
            success: success,
            partial: false,
            reason: success ? 'Успех: d10 > difficulty' : 'Провал: d10 ≤ difficulty',
            d10: d10,
            difficulty: choice.difficulty_level,
            operations: success ? 
                (choice.success_rewards || []) : 
                (choice.fail_penalties || [])
        };
    }
    
    // 2. Расчет для статов
    const difficulty = choice.difficulty_level || 5;
    const statValues = requirementsCheck.stats.map(s => s.value);
    const averageStat = statValues.reduce((a, b) => a + b, 0) / statValues.length;
    const threshold = averageStat + difficulty;
    
    // Проверяем каждый стат с учетом d10
    const statChecks = requirementsCheck.stats.map(stat => {
        const valueWithLuck = stat.value + d10;
        return {
            id: stat.id,
            base: stat.value,
            withLuck: valueWithLuck,
            passed: valueWithLuck > threshold
        };
    });
    
    const passedCount = statChecks.filter(s => s.passed).length;
    const totalStats = statChecks.length;
    
    let success = false;
    let partial = false;
    let reason = '';
    
    if (passedCount === totalStats) {
        success = true;
        partial = false;
        reason = 'Полный успех: все статы прошли проверку';
    } else if (passedCount === 0) {
        success = false;
        partial = false;
        reason = 'Полный провал: ни один стат не прошел проверку';
    } else {
        success = true; // Частичный успех все же считается успехом
        partial = true;
        reason = `Частичный успех: ${passedCount}/${totalStats} статов прошли проверку`;
    }
    
    // Выбираем операции в зависимости от результата
    let operations = [];
    if (success && !partial) {
        operations = choice.success_rewards || [];
    } else if (success && partial) {
        // Для частичного успеха модифицируем числовые операции
        operations = modifyOperationsForPartialResult(choice.success_rewards || [], 0.5);
    } else {
        operations = choice.fail_penalties || [];
    }
    
    return {
        success: success,
        partial: partial,
        reason: reason,
        d10: d10,
        difficulty: difficulty,
        statChecks: statChecks,
        threshold: threshold,
        operations: operations
    };
}

/**
 * Модификация операций для частичного результата (уменьшает числовые изменения на 50%)
 */
function modifyOperationsForPartialResult(operations, multiplier = 0.5) {
    if (!Array.isArray(operations)) return [];
    
    return operations.map(op => {
        if (op.operation === 'MODIFY' && typeof op.delta === 'number') {
            const modifiedDelta = Math.ceil(op.delta * multiplier);
            if (modifiedDelta === 0 && op.delta > 0) {
                modifiedDelta = 1; // Минимальное изменение при округлении вверх
            } else if (modifiedDelta === 0 && op.delta < 0) {
                modifiedDelta = -1;
            }
            
            return {
                ...op,
                delta: modifiedDelta,
                description: `${op.description || ''} (частичный результат: ${modifiedDelta})`
            };
        }
        return op;
    });
}

/**
 * Формирование HTML для отображения изменений за ход
 * @param {Array} actionResults - Результаты действий
 * @param {Array} events - События от ИИ
 * @returns {string} HTML строка
 */
function createTurnUpdatesHTML(actionResults, events) {
    if ((!actionResults || actionResults.length === 0) && 
        (!events || events.length === 0)) {
        return '';
    }
    
    let html = `
        <div style="margin: 20px 0; padding: 15px; background: rgba(0, 0, 0, 0.3); border-radius: 8px; border: 1px solid #333;">
            <div style="color: #d4af37; font-family: 'Roboto Mono', monospace; font-size: 1rem; font-weight: bold; margin-bottom: 15px; letter-spacing: 1px;">
                <i class="fas fa-clipboard-list"></i> ИЗМЕНЕНИЯ ЗА ХОД
            </div>
    `;
    
    // Раздел 1: Результаты выбранных действий
    if (actionResults && actionResults.length > 0) {
        html += `
            <div style="margin-bottom: 20px;">
                <div style="color: #4cd137; font-size: 0.9rem; font-weight: bold; margin-bottom: 10px; padding-bottom: 5px; border-bottom: 1px solid #4cd137;">
                    <i class="fas fa-user-check"></i> По результатам выбранных действий
                </div>
                <div style="font-size: 0.85rem;">
        `;
        
        actionResults.forEach((result, idx) => {
            const successColor = result.success ? '#4cd137' : '#e84118';
            const successIcon = result.success ? 'fa-check-circle' : 'fa-times-circle';
            const partialText = result.partial ? ' (частично)' : '';
            
            html += `
                <div style="margin-bottom: 8px; padding: 8px; background: rgba(0, 0, 0, 0.2); border-radius: 4px; border-left: 3px solid ${successColor};">
                    <div style="color: ${successColor}; font-weight: bold;">
                        <i class="fas ${successIcon}"></i> Действие ${idx + 1}${partialText}
                    </div>
                    <div style="color: #ccc; font-size: 0.8rem; margin-top: 4px;">${result.reason}</div>
                    <div style="color: #888; font-size: 0.75rem; margin-top: 4px;">
                        🎯 Сложность: ${result.difficulty} | 🎲 d10: ${result.d10}
                    </div>
            `;
            
            // Операции от действия
            if (result.operations && result.operations.length > 0) {
                html += `<div style="margin-top: 6px; padding-left: 15px;">`;
                result.operations.forEach(op => {
                    html += createOperationHTML(op, 'action');
                });
                html += `</div>`;
            }
            
            html += `</div>`;
        });
        
        html += `</div></div>`;
    }
    
    // Раздел 2: Результаты произошедших событий
    if (events && events.length > 0) {
        html += `
            <div style="margin-bottom: 10px;">
                <div style="color: #00a8ff; font-size: 0.9rem; font-weight: bold; margin-bottom: 10px; padding-bottom: 5px; border-bottom: 1px solid #00a8ff;">
                    <i class="fas fa-bolt"></i> По результатам произошедших событий
                </div>
                <div style="font-size: 0.85rem;">
        `;
        
        events.forEach((event, idx) => {
            const eventTypeIcons = {
                discovery: 'fa-search',
                character_interaction: 'fa-comments',
                world_event: 'fa-globe',
                ritual: 'fa-fire',
                twist: 'fa-random'
            };
            
            const icon = eventTypeIcons[event.type] || 'fa-star';
            
            html += `
                <div style="margin-bottom: 8px; padding: 8px; background: rgba(0, 170, 255, 0.1); border-radius: 4px; border-left: 3px solid #00a8ff;">
                    <div style="color: #00a8ff; font-weight: bold;">
                        <i class="fas ${icon}"></i> ${event.type.toUpperCase()}: ${event.description.substring(0, 60)}...
                    </div>
                    <div style="color: #888; font-size: 0.75rem; margin-top: 2px;">
                        <i class="fas fa-info-circle"></i> ${event.reason}
                    </div>
            `;
            
            // Эффекты события
            if (event.effects && event.effects.length > 0) {
                html += `<div style="margin-top: 6px; padding-left: 15px;">`;
                event.effects.forEach(effect => {
                    html += createOperationHTML(effect, 'event');
                });
                html += `</div>`;
            }
            
            html += `</div>`;
        });
        
        html += `</div></div>`;
    }
    
    html += `</div>`;
    return html;
}

/**
 * Создание HTML для отдельной операции
 */
function createOperationHTML(operation, source) {
    const sourceColor = source === 'action' ? '#4cd137' : '#00a8ff';
    const [type, name] = operation.id.split(':');
    
    let displayName = name;
    let icon = 'fas fa-question';
    let valueDisplay = '';
    let color = '#ccc';
    
    // Определяем иконку и цвет по типу
    switch (type) {
        case 'stat':
            icon = 'fas fa-chart-line';
            color = '#fbc531';
            displayName = getRussianStatName(name);
            break;
        case 'skill':
            icon = 'fas fa-scroll';
            color = '#9c88ff';
            break;
        case 'inventory':
            icon = 'fas fa-box-open';
            color = '#d4af37';
            break;
        case 'relations':
            icon = 'fas fa-handshake';
            color = '#ff9ff3';
            displayName = name.replace(/_/g, ' ');
            break;
        case 'bless':
            icon = 'fas fa-star';
            color = '#fbc531';
            break;
        case 'curse':
            icon = 'fas fa-skull-crossbones';
            color = '#c23616';
            break;
        case 'buff':
            icon = 'fas fa-arrow-up';
            color = '#4cd137';
            break;
        case 'debuff':
            icon = 'fas fa-arrow-down';
            color = '#e84118';
            break;
        case 'progress':
            icon = 'fas fa-chart-line';
            color = '#00a8ff';
            break;
        case 'personality':
            icon = 'fas fa-brain';
            color = '#1dd1a1';
            break;
    }
    
    // Определяем отображение значения
    switch (operation.operation) {
        case 'ADD':
            if (type === 'buff' || type === 'debuff') {
                const sign = operation.value > 0 ? '+' : '';
                valueDisplay = `<span style="color: ${sourceColor};">+ Добавить: ${sign}${operation.value} на ${operation.duration} ходов</span>`;
            } else {
                valueDisplay = `<span style="color: ${sourceColor};">+ Добавить: "${operation.value}"</span>`;
            }
            break;
        case 'REMOVE':
            valueDisplay = `<span style="color: ${sourceColor};">- Удалить</span>`;
            break;
        case 'SET':
            valueDisplay = `<span style="color: ${sourceColor};">= "${String(operation.value).substring(0, 30)}"</span>`;
            break;
        case 'MODIFY':
            const sign = operation.delta > 0 ? '+' : '';
            const deltaColor = operation.delta > 0 ? '#4cd137' : '#e84118';
            valueDisplay = `<span style="color: ${deltaColor};">${sign}${operation.delta}</span>`;
            break;
    }
    
    const description = operation.description ? 
        `<div style="color: #888; font-size: 0.75rem; margin-top: 2px;">${operation.description}</div>` : '';
    
    return `
        <div style="display: flex; align-items: center; justify-content: space-between; padding: 4px 0; border-bottom: 1px dotted #333;">
            <div style="display: flex; align-items: center; gap: 6px; flex: 1;">
                <i class="${icon}" style="color: ${color}; font-size: 0.8rem;"></i>
                <span style="color: #ccc; font-size: 0.8rem; min-width: 80px;">${displayName}:</span>
            </div>
            <div style="margin-left: 10px; text-align: right;">
                <span style="color: #fff; font-weight: bold; font-size: 0.8rem;">${valueDisplay}</span>
            </div>
        </div>
        ${description}
    `;
}

/**
 * Получение русского названия стата
 */
function getRussianStatName(key) {
    const map = { 
        'will': 'Воля', 
        'stealth': 'Скрыт.', 
        'influence': 'Влияние', 
        'sanity': 'Разум' 
    };
    return map[key] || key;
}

/**
 * Переключение выбора варианта
 */
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

/**
 * Запуск показа фраз героя на подложке
 */
function startThoughtsOfHeroDisplay() {
    if (thoughtsOfHeroInterval) clearInterval(thoughtsOfHeroInterval);
    Render.showThoughtsOfHeroLayout();
    
    thoughtsOfHeroInterval = setInterval(() => {
        let phrase = null;
        
        if (State.getHeroPhrasesCount() > 0) {
            phrase = State.getHeroPhrase();
        } else if (CONFIG.thoughtsOfHeroFakes.length > 0) {
            const fakePhrases = CONFIG.thoughtsOfHeroFakes;
            phrase = fakePhrases[Math.floor(Math.random() * fakePhrases.length)];
        }
        
        if (phrase) {
            Render.updateThoughtsOfHeroText(phrase);
        }
    }, 5000);
    
    // Показываем первую фразу сразу
    setTimeout(() => {
        let phrase = null;
        
        if (State.getHeroPhrasesCount() > 0) {
            phrase = State.getHeroPhrase();
        } else if (CONFIG.thoughtsOfHeroFakes.length > 0) {
            const fakePhrases = CONFIG.thoughtsOfHeroFakes;
            phrase = fakePhrases[Math.floor(Math.random() * fakePhrases.length)];
        }
        
        if (phrase) {
            Render.updateThoughtsOfHeroText(phrase);
        }
    }, 100);
}

/**
 * Остановка показа фраз героя
 */
function stopThoughtsOfHeroDisplay() {
    if (thoughtsOfHeroInterval) {
        clearInterval(thoughtsOfHeroInterval);
        thoughtsOfHeroInterval = null;
    }
    
    Render.hideThoughtsOfHeroLayout();
}

/**
 * Отправка хода игры (ФОРМАТ 4.1)
 */
async function submitTurn(retries = CONFIG.maxRetries) {
    const state = State.getState();
    
    // Отменяем предыдущий запрос, если он существует
    if (activeAbortController) {
        activeAbortController.abort();
        activeAbortController = null;
    }
    
    let selectedChoicesData = [];
    
    // Собираем данные выбранных действий
    if (state.freeMode) {
        const requestText = state.freeModeText.trim();
        if (requestText.length === 0) return;
        
        // Для свободного режима создаем фиктивный выбор
        selectedChoicesData = [{
            text: requestText,
            difficulty_level: 5,
            requirements: [],
            success_rewards: [],
            fail_penalties: []
        }];
        
        dom.freeInputText.disabled = true;
        dom.freeInputText.style.opacity = '0.7';
    } else {
        if (state.gameState.selectedActions.length === 0) return;
        
        selectedChoicesData = state.gameState.selectedActions.map(i => {
            if (!state.gameState.currentScene.choices[i]) {
                console.error(`❌ Choice с индексом ${i} не найден`);
                return null;
            }
            return state.gameState.currentScene.choices[i];
        }).filter(Boolean);
    }
    
    if (selectedChoicesData.length === 0) {
        Render.showErrorAlert("Ошибка", "Нет выбранных действий");
        return;
    }
    
    // Генерация общего d10 на ход
    const d10 = Math.floor(Math.random() * 10) + 1;
    console.log(`🎲 Общий бросок удачи на ход: d10 = ${d10}`);
    
    // Расчет результатов каждого выбранного действия
    const actionResults = [];
    const allOperations = [];
    
    selectedChoicesData.forEach((choice, idx) => {
        const result = calculateChoiceResult(choice, d10);
        if (result) {
            actionResults.push({
                ...result,
                choice_text: choice.text,
                choice_index: state.freeMode ? null : state.gameState.selectedActions[idx]
            });
            
            // Собираем все операции для применения
            if (result.operations && result.operations.length > 0) {
                allOperations.push(...result.operations);
            }
        }
    });
    
    // Применяем операции от действий
    if (allOperations.length > 0) {
        State.applyOperations(allOperations);
    }
    
    // Формируем selectedActions для отправки ИИ
    const selectedActions = actionResults.map(result => ({
        choice_text: result.choice_text,
        difficulty_level: result.difficulty,
        requirements: selectedChoicesData.find(c => c.text === result.choice_text)?.requirements || [],
        success: result.success,
        partial_success: result.partial,
        d10_roll: result.d10
    }));
    
    dom.btnSubmit.innerHTML = '<span class="spinner"></span>';
    dom.btnSubmit.disabled = true;
    dom.btnClear.disabled = true;
    
    // Запускаем показ фраз на подложке
    startThoughtsOfHeroDisplay();
    
    // Создаем AbortController для таймаута
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
        // Отправляем запрос к ИИ
        const data = await API.sendAIRequest(state, selectedActions, activeAbortController, d10);
        
        clearTimeout(timeoutId);
        activeAbortController = null;
        
        // Останавливаем показ фраз на подложке
        stopThoughtsOfHeroDisplay();
        
        if (!data || !data.scene) {
            if (retries > 0) {
                console.warn(`Ответ ИИ не содержит сцены. Повторная попытка ${CONFIG.maxRetries - retries + 1}.`);
                await new Promise(r => setTimeout(r, CONFIG.retryDelayMs));
                return submitTurn(retries - 1);
            } else {
                throw new Error("ИИ не смог сгенерировать сцену после нескольких попыток.");
            }
        }
        
        // Обрабатываем ход
        processTurn(data, actionResults, d10);
        
    } catch (e) {
        clearTimeout(timeoutId);
        activeAbortController = null;
        
        // Останавливаем показ фраз на подложке
        stopThoughtsOfHeroDisplay();
        
        // Игнорируем ошибки отмены запроса
        if (e.name === 'AbortError') {
            console.log('Запрос отменен');
            return;
        }
        
        if (e.message.includes("парсинга JSON") && retries > 0) {
            console.warn(`JSON повреждён. Повторяем запрос... (${retries} попыток осталось)`);
            await new Promise(r => setTimeout(r, 1500));
            return submitTurn(retries - 1);
        }
        
        console.error('💥 Ошибка в submitTurn:', e);
        
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
        Saveload.saveState();
    }
}

/**
 * Обработка ответа ИИ (ФОРМАТ 4.1)
 */
function processTurn(data, actionResults, d10) {
    const state = State.getState();
    
    // 1. Применяем операции из событий (новый формат)
    if (data.events && Array.isArray(data.events)) {
        const eventOperations = [];
        data.events.forEach(event => {
            if (event.effects && Array.isArray(event.effects)) {
                eventOperations.push(...event.effects);
            }
        });
        
        if (eventOperations.length > 0) {
            State.applyOperations(eventOperations);
        }
    }
    
    // 2. Обновляем память ИИ (новый формат)
    if (data.aiMemory && typeof data.aiMemory === 'object') {
        State.setState({
            gameState: {
                ...state.gameState,
                aiMemory: { ...state.gameState.aiMemory, ...data.aiMemory }
            }
        });
    }
    
    // 3. Обновляем мысли героя (новый формат)
    if (data.thoughts && Array.isArray(data.thoughts) && data.thoughts.length >= 10) {
        State.addHeroPhrases(data.thoughts);
    }
    
    // 4. Обновляем текущую сцену (новый формат)
    const updatedScene = {
        scene: data.scene || state.gameState.currentScene.scene,
        reflection: data.reflection || "",
        choices: data.choices || state.gameState.currentScene.choices
    };
    
    // 5. Добавляем в историю (новый формат)
    const newHistoryEntry = {
        fullText: data.scene || "",
        summary: data.summary || "",
        timestamp: new Date().toISOString(),
        d10: d10,
        actionResults: actionResults.map(a => ({
            text: a.choice_text,
            success: a.success,
            partial: a.partial
        }))
    };
    
    const updatedHistory = [...state.gameState.history, newHistoryEntry];
    if (updatedHistory.length > CONFIG.historyContext) {
        updatedHistory.shift();
    }
    
    // 6. Обновляем общее состояние
    State.setState({
        gameState: {
            ...state.gameState,
            currentScene: updatedScene,
            history: updatedHistory,
            summary: data.summary || state.gameState.summary,
            selectedActions: [], // Сбрасываем выбранные действия
            turnCount: state.turnCount + 1
        },
        freeMode: false,
        freeModeText: '',
        thoughtsOfHero: State.getHeroPhrasesCount() > 0 ? state.thoughtsOfHero : []
    });
    
    // Увеличиваем счетчик ходов
    State.incrementTurnCount();
    
    // 7. Создаем и показываем блок изменений за ход (адаптировано для нового формата)
    const updatesHTML = createTurnUpdatesHTML(actionResults, data.events || []);
    if (updatesHTML) {
        dom.updates.style.display = 'block';
        dom.updates.innerHTML = updatesHTML;
        
        // Сохраняем для восстановления после перезагрузки
        State.setState({
            lastTurnUpdates: updatesHTML
        });
    }
    
    // 8. Обновляем интерфейс
    Render.renderAll();
    UI.setFreeModeUI(false);
    dom.freeInputText.disabled = false;
    dom.freeInputText.style.opacity = '1';
    dom.freeModeToggle.checked = false;
    dom.btnSubmit.innerHTML = '<i class="fas fa-paper-plane"></i> ОТПРАВИТЬ';
    UI.updateActionButtons();
    
    // 9. Проверяем смерть героя
    checkHeroDeath();
    
    // 10. Сохраняем состояние
    Saveload.saveState();
}

/**
 * Проверка смерти героя (любой стат = 0)
 */
function checkHeroDeath() {
    const state = State.getState();
    const stats = State.getGameItemsByType('stat:');
    const deadStats = stats.filter(stat => stat.value <= 0);
    
    if (deadStats.length > 0) {
        console.warn('☠️ Герой мертв! Статы достигли 0:', deadStats.map(s => s.id));
        showEndScreen("ПОРАЖЕНИЕ", "Твоя воля иссякла, рассудок померк, скрытность раскрыта, влияние утрачено.", "#800");
    }
}

/**
 * Проверка достижения победы (прогресс = 100)
 */
function checkVictory() {
    const progress = State.getGameItemValue('progress:oto');
    if (progress >= 100) {
        showEndScreen("ПОБЕДА", "Ты достиг высшей степени посвящения. Орден признал тебя равным.", "#d4af37", true);
    }
}

/**
 * Показать экран окончания игры (МАТРИЦА)
 */
function showEndScreen(title, msg, color, isVictory = false) {
    console.log("showEndScreen called");
    
    const canvas = document.getElementById('matrixCanvas');
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    
    const letters = '93 ΘΈΛΗΜΑ 93 ἈΓΆΠΗ 93 THELEMA 93 AGAPE93';
    let letterIndex = 0;
    
    // Слои матричного эффекта
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
    
    // Инициализация данных для каждого слоя
    const layerData = [];
    for (let i = 0; i < layers.length; i++) {
        const layer = layers[i];
        const columns = Math.floor(canvas.width / layer.fontSize);
        
        layerData.push({
            fontSize: layer.fontSize,
            speed: layer.speed,
            alpha: layer.alpha,
            colorFactor: layer.colorFactor,
            density: layer.density,
            resetChance: layer.resetChance,
            columns: columns,
            drops: Array(columns).fill(0).map(() => Math.random() * -canvas.height / layer.fontSize),
            waves: Array(columns).fill(0).map(() => Math.random() * Math.PI * 2),
            waveSpeed: 0.05 + Math.random() * 0.05
        });
    }
    
    // Функция для корректировки цвета
    function adjustColor(factor) {
        var red = Math.floor(0x88 * factor);
        return 'rgb(' + red + ',0,0)';
    }
    
    // Очищаем предыдущий интервал
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
    
    // Устанавливаем текст и стили
    document.getElementById('endTitle').textContent = title;
    document.getElementById('endTitle').style.color = color;
    document.getElementById('endMsg').textContent = msg;
    document.getElementById('btnContinueGame').style.display = isVictory ? 'inline-block' : 'none';
    dom.overlay.style.display = 'block';
}

/**
 * Продолжение игры после победы
 */
function continueGame() {
    dom.overlay.style.display = 'none';
    if (matrixInterval) {
        clearInterval(matrixInterval);
        matrixInterval = null;
    }
}

/**
 * Начать заново игру после победы/поражения
 */
function restartGame() {
    if (confirm("Начать путь заново?")) {
        if (matrixInterval) {
            clearInterval(matrixInterval);
            matrixInterval = null;
        }
        dom.overlay.style.display = 'none';
        localStorage.removeItem('oto_v4_state');
        location.reload();
    }
}

/**
 * Очистка выбранных вариантов или свободного ввода
 */
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

/**
 * Обработчик переключения режима ввода
 */
function handleFreeModeToggle(e) {
    const state = State.getState();
    const isFreeMode = e.target.checked;
    
    State.setState({
        freeMode: isFreeMode,
        freeModeText: isFreeMode ? dom.freeInputText.value : ''
    });
    
    UI.setFreeModeUI(isFreeMode);
    UI.updateActionButtons();
    Saveload.saveState();
}

// Публичный интерфейс модуля
export const Game = {
    toggleChoice,
    submitTurn,
    continueGame,
    restartGame,
    handleClear,
    handleFreeModeToggle,
    checkRequirements,
    calculateChoiceResult
};