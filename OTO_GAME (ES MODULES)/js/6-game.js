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

// Подписка на события состояния
function setupGameObservers() {
    console.log('🔍 Настройка игровых подписок...');
    
    // Обработка ритуалов
    State.on(State.EVENTS.RITUAL_STARTED, (data) => {
        console.log('🕯️ Начался ритуал:', data);
        document.body.classList.add('ritual-mode');
    });
    
    State.on(State.EVENTS.RITUAL_PROGRESS, (data) => {
        const ritualProgress = document.getElementById('ritualProgress');
        if (ritualProgress) {
            ritualProgress.style.width = `${data.progress}%`;
        }
    });
    
    State.on(State.EVENTS.DEGREE_UPGRADED, (data) => {
        console.log(`🎓 Повышение степени: ${data.oldDegree} → ${data.newDegree}`);
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
        showEndScreen("ПОРАЖЕНИЕ", "Твоя воля иссякла, рассудок померк, скрытность раскрыта, влияние утрачено.", "#800");
    });
    
    // Подписка на победу
    State.on(State.EVENTS.VICTORY, () => {
        showEndScreen("ПОБЕДА", "Ты достиг высшей степени посвящения. Орден признал тебя равным.", "#d4af37", true);
    });
}

// Переменные состояния
let matrixInterval = null;
let activeAbortController = null;

// Операции над game_item
const OPERATION_TYPES = {
    ADD: 'ADD',
    REMOVE: 'REMOVE',
    SET: 'SET',
    MODIFY: 'MODIFY'
};

function getRussianStatName(key) {
    const map = {
        'will': 'Воля',
        'stealth': 'Скрытность',
        'influence': 'Влияние',
        'sanity': 'Разум'
    };
    return map[key] || key;
}

// ПЕРЕПИСАНО ПОЛНОСТЬЮ: Функция для создания HTML операций с отображением всех полей
function createOperationHTML(operation, source) {
    if (!operation || !operation.id || !operation.operation) {
        console.warn('Некорректная операция:', operation);
        return '';
    }
    
    const sourceColor = source === 'action' ? '#4cd137' : '#00a8ff';
    const [type, name] = operation.id.split(':');
    
    let displayName = name;
    let icon = 'fas fa-question';
    let valueDisplay = '';
    let color = '#ccc';
    
    // Используем value для отображения, а не id
    let displayValue = operation.value || '';
    
    // Унифицируем отображение длительности
    let displayDuration = '';
    if (operation.duration !== undefined) {
        displayDuration = `[${operation.duration} ход.]`;
    }
    
    switch (type) {
        case 'stat':
            icon = 'fas fa-chart-line';
            color = '#fbc531';
            displayName = getRussianStatName(name);
            break;
        case 'skill':
            icon = 'fas fa-scroll';
            color = '#9c88ff';
            displayName = displayValue || name;
            break;
        case 'inventory':
            icon = 'fas fa-box-open';
            color = '#d4af37';
            displayName = displayValue || name;
            break;
        case 'relations':
            icon = 'fas fa-handshake';
            color = '#ff9ff3';
            displayName = name.replace(/_/g, ' ');
            break;
        case 'bless':
            icon = 'fas fa-star';
            color = '#fbc531';
            displayName = displayValue || name;
            break;
        case 'curse':
            icon = 'fas fa-skull-crossbones';
            color = '#c23616';
            displayName = displayValue || name;
            break;
        case 'buff':
            icon = 'fas fa-arrow-up';
            color = '#4cd137';
            displayName = getRussianStatName(name);
            break;
        case 'debuff':
            icon = 'fas fa-arrow-down';
            color = '#e84118';
            displayName = getRussianStatName(name);
            break;
        case 'progress':
            icon = 'fas fa-chart-line';
            color = '#00a8ff';
            displayName = displayValue || name;
            break;
        case 'personality':
            icon = 'fas fa-brain';
            color = '#1dd1a1';
            displayName = displayValue || name;
            break;
        case 'initiation_degree':
            icon = 'fas fa-graduation-cap';
            color = '#ff9ff3';
            displayName = displayValue || name;
            break;
    }
    
    // Форматируем значение в зависимости от типа операции
    switch (operation.operation) {
        case OPERATION_TYPES.ADD:
            if (type === 'buff' || type === 'debuff') {
                const sign = operation.value > 0 ? '+' : '';
                valueDisplay = `<span style="color: ${sourceColor}; font-weight: bold;">
                    ${displayName} ${sign}${operation.value} ${displayDuration}
                </span>`;
            } else {
                const addedValue = displayValue ? `: "${displayValue}"` : '';
                valueDisplay = `<span style="color: ${sourceColor}; font-weight: bold;">
                    Добавить ${displayName}${addedValue}
                </span>`;
            }
            break;
            
        case OPERATION_TYPES.REMOVE:
            valueDisplay = `<span style="color: ${sourceColor}; font-weight: bold;">
                Удалить: ${displayName}
            </span>`;
            break;
            
        case OPERATION_TYPES.SET:
            valueDisplay = `<span style="color: ${sourceColor}; font-weight: bold;">
                Установить ${displayName}: "${String(displayValue).substring(0, 50)}"
            </span>`;
            break;
            
        case OPERATION_TYPES.MODIFY:
            const sign = operation.delta > 0 ? '+' : '';
            const deltaColor = operation.delta > 0 ? '#4cd137' : '#e84118';
            valueDisplay = `<span style="color: ${deltaColor}; font-weight: bold;">
                ${displayName} ${sign}${operation.delta}
            </span>`;
            break;
    }
    
    // Добавляем описание, если есть
    let description = '';
    if (operation.description) {
        description = `<div style="color: #aaa; font-size: 0.75rem; margin-top: 4px; font-style: italic;">
            ${operation.description}
        </div>`;
    }
    
    // ОТОБРАЖЕНИЕ ВСЕХ НЕПУСТЫХ ПОЛЕЙ
    let extraFields = '';
    const ignoredKeys = ['id', 'value', 'operation', 'description', 'duration', 'delta']; // Эти поля уже обработаны выше
    
    Object.keys(operation).forEach(key => {
        if (!ignoredKeys.includes(key)) {
            const val = operation[key];
            if (val !== undefined && val !== null && val !== '') {
                extraFields += `<div style="color: #666; font-size: 0.7rem;">${key}: ${val}</div>`;
            }
        }
    });
    
    return `
        <div style="display: flex; align-items: flex-start; padding: 8px 0; border-bottom: 1px dotted #333;">
            <div style="margin-right: 10px;">
                <i class="${icon}" style="color: ${color}; font-size: 0.9rem;"></i>
            </div>
            <div style="flex: 1;">
                <div style="color: #ccc; font-size: 0.85rem; margin-bottom: 2px;">${displayName}</div>
                <div style="font-size: 0.9rem;">
                    ${valueDisplay}
                </div>
                ${description}
                ${extraFields}
            </div>
        </div>
    `;
}

// ИСПРАВЛЕНО: Функция для создания HTML изменений за ход
// ПЕРЕРАБОТАННАЯ ФУНКЦИЯ: Компактный блок изменений за ход
function createTurnUpdatesHTML(actionResults, events) {
    console.log('🔍 createTurnUpdatesHTML called with:', { actionResults, events });
    
    if ((!actionResults || actionResults.length === 0) &&
        (!events || events.length === 0)) {
        return '';
    }
    
    let html = `
        <div class="turn-updates-container" style="margin: 8px 0; padding: 10px; background: rgba(10, 0, 0, 0.7); border: 1px solid #4a0a0a; border-radius: 4px; font-size: 0.85em;">
            <div style="color: #d4af37; font-weight: bold; font-size: 0.9em; margin-bottom: 8px; padding-bottom: 4px; border-bottom: 1px solid #4a0a0a; letter-spacing: 0.5px;">
                <i class="fas fa-exchange-alt"></i> ИЗМЕНЕНИЯ ЗА ХОД
            </div>
    `;
    
    let hasActionOperations = false;
    if (actionResults && actionResults.length > 0) {
        html += `
            <div style="margin-bottom: 12px;">
                <div style="color: #4cd137; font-size: 0.85em; font-weight: bold; margin-bottom: 6px; padding-bottom: 2px; border-bottom: 1px solid #4cd13740;">
                    <i class="fas fa-user-check"></i> По результатам действий
                </div>
                <div style="font-size: 0.82em;">
        `;
        
        actionResults.forEach((result, idx) => {
            const operations = result.operations || [];
            if (operations.length === 0 && !result.reason) return;
            
            hasActionOperations = true;
            const successColor = result.success ? '#4cd137' : '#e84118';
            const successIcon = result.success ? 'fa-check-circle' : 'fa-times-circle';
            const partialText = result.partial ? ' (частично)' : '';
            
            html += `
                <div style="margin-bottom: 8px; padding: 6px; background: rgba(0, 0, 0, 0.3); border-radius: 3px; border-left: 3px solid ${successColor};">
                    <div style="color: ${successColor}; font-weight: bold; font-size: 0.85em; display: flex; align-items: center; gap: 5px;">
                        <i class="fas ${successIcon}" style="font-size: 0.9em;"></i> 
                        <span>Действие ${idx + 1}${partialText}</span>
                    </div>
                    <div style="color: #ddd; font-size: 0.85em; margin-top: 4px; padding: 3px; background: rgba(0,0,0,0.2); border-radius: 2px;">
                        ${result.choice_text || 'Действие'}
                    </div>
                    <div style="color: #aaa; font-size: 0.75em; margin-top: 3px; display: flex; gap: 8px;">
                        <span>🎯 Сложность: ${result.difficulty}</span>
                        <span>🎲 d10: ${result.d10}</span>
                        <span>${result.reason || ''}</span>
                    </div>
            `;
            
            if (operations.length > 0) {
                html += `<div style="margin-top: 6px; padding-left: 8px; border-left: 2px solid ${successColor}40;">`;
                operations.forEach(op => {
                    html += createCompactOperationHTML(op, 'action');
                });
                html += `</div>`;
            }
            
            html += `</div>`;
        });
        
        if (!hasActionOperations) {
            html += `<div style="color: #888; font-style: italic; font-size: 0.85em; text-align: center; padding: 8px;">Нет операций от действий</div>`;
        }
        
        html += `</div></div>`;
    }
    
    let hasEventOperations = false;
    if (events && events.length > 0) {
        html += `
            <div style="margin-bottom: 8px;">
                <div style="color: #00a8ff; font-size: 0.85em; font-weight: bold; margin-bottom: 6px; padding-bottom: 2px; border-bottom: 1px solid #00a8ff40;">
                    <i class="fas fa-bolt"></i> По результатам событий
                </div>
                <div style="font-size: 0.82em;">
        `;
        
        events.forEach((event, idx) => {
            const effects = event.effects || [];
            
            hasEventOperations = true;
            const eventTypeIcons = {
                discovery: 'fa-search',
                character_interaction: 'fa-comments',
                world_event: 'fa-globe',
                ritual: 'fa-fire',
                twist: 'fa-random'
            };
            
            const icon = eventTypeIcons[event.type] || 'fa-star';
            const eventDesc = event.description || 'Событие';
            
            html += `
                <div style="margin-bottom: 8px; padding: 6px; background: rgba(0, 170, 255, 0.08); border-radius: 3px; border-left: 3px solid #00a8ff;">
                    <div style="color: #00a8ff; font-weight: bold; font-size: 0.85em; display: flex; align-items: center; gap: 5px;">
                        <i class="fas ${icon}" style="font-size: 0.9em;"></i>
                        <span>${event.type ? event.type.toUpperCase() : 'СОБЫТИЕ'}</span>
                    </div>
                    <div style="color: #ddd; font-size: 0.85em; margin-top: 4px; padding: 3px; background: rgba(0,170,255,0.05); border-radius: 2px;">
                        ${eventDesc}
                    </div>
                    <div style="color: #aaa; font-size: 0.75em; margin-top: 3px;">
                        <i class="fas fa-info-circle"></i> ${event.reason || 'Нет описания'}
                    </div>
            `;
            
            if (effects.length > 0) {
                html += `<div style="margin-top: 6px; padding-left: 8px; border-left: 2px solid #00a8ff40;">`;
                effects.forEach(effect => {
                    html += createCompactOperationHTML(effect, 'event');
                });
                html += `</div>`;
            }
            
            html += `</div>`;
        });
        
        if (!hasEventOperations) {
            html += `<div style="color: #888; font-style: italic; font-size: 0.85em; text-align: center; padding: 8px;">Нет операций от событий</div>`;
        }
        
        html += `</div></div>`;
    }
    
    html += `</div>`;
    return html;
}

// НОВАЯ ФУНКЦИЯ: Компактное отображение операции
function createCompactOperationHTML(operation, source) {
    if (!operation || !operation.id || !operation.operation) {
        console.warn('Некорректная операция:', operation);
        return '';
    }
    
    const sourceColor = source === 'action' ? '#4cd137' : '#00a8ff';
    const [type, name] = operation.id.split(':');
    
    let displayName = name;
    let icon = 'fas fa-question';
    let valueDisplay = '';
    let color = '#ccc';
    
    // Используем value для отображения, а не id
    let displayValue = operation.value || '';
    
    // Унифицируем отображение длительности
    let displayDuration = '';
    if (operation.duration !== undefined) {
        displayDuration = `[${operation.duration} ход.]`;
    }
    
    switch (type) {
        case 'stat':
            icon = 'fas fa-chart-line';
            color = '#fbc531';
            displayName = getRussianStatName(name);
            break;
        case 'skill':
            icon = 'fas fa-scroll';
            color = '#9c88ff';
            displayName = displayValue || name;
            break;
        case 'inventory':
            icon = 'fas fa-box-open';
            color = '#d4af37';
            displayName = displayValue || name;
            break;
        case 'relations':
            icon = 'fas fa-handshake';
            color = '#ff9ff3';
            displayName = name.replace(/_/g, ' ');
            break;
        case 'bless':
            icon = 'fas fa-star';
            color = '#fbc531';
            displayName = displayValue || name;
            break;
        case 'curse':
            icon = 'fas fa-skull-crossbones';
            color = '#c23616';
            displayName = displayValue || name;
            break;
        case 'buff':
            icon = 'fas fa-arrow-up';
            color = '#4cd137';
            displayName = getRussianStatName(name);
            break;
        case 'debuff':
            icon = 'fas fa-arrow-down';
            color = '#e84118';
            displayName = getRussianStatName(name);
            break;
        case 'progress':
            icon = 'fas fa-chart-line';
            color = '#00a8ff';
            displayName = displayValue || name;
            break;
        case 'personality':
            icon = 'fas fa-brain';
            color = '#1dd1a1';
            displayName = displayValue || name;
            break;
        case 'initiation_degree':
            icon = 'fas fa-graduation-cap';
            color = '#ff9ff3';
            displayName = displayValue || name;
            break;
    }
    
    // Форматируем значение в зависимости от типа операции
    switch (operation.operation) {
        case OPERATION_TYPES.ADD:
            if (type === 'buff' || type === 'debuff') {
                const sign = operation.value > 0 ? '+' : '';
                valueDisplay = `<span style="color: ${sourceColor}; font-weight: bold;">
                    ${displayName} ${sign}${operation.value} ${displayDuration}
                </span>`;
            } else {
                const addedValue = displayValue ? `: "${displayValue}"` : '';
                valueDisplay = `<span style="color: ${sourceColor}; font-weight: bold;">
                    Добавить ${displayName}${addedValue}
                </span>`;
            }
            break;
            
        case OPERATION_TYPES.REMOVE:
            valueDisplay = `<span style="color: ${sourceColor}; font-weight: bold;">
                Удалить: ${displayName}
            </span>`;
            break;
            
        case OPERATION_TYPES.SET:
            valueDisplay = `<span style="color: ${sourceColor}; font-weight: bold;">
                Установить ${displayName}: "${String(displayValue).substring(0, 50)}"
            </span>`;
            break;
            
        case OPERATION_TYPES.MODIFY:
            const sign = operation.delta > 0 ? '+' : '';
            const deltaColor = operation.delta > 0 ? '#4cd137' : '#e84118';
            valueDisplay = `<span style="color: ${deltaColor}; font-weight: bold;">
                ${displayName} ${sign}${operation.delta}
            </span>`;
            break;
    }
    
    // Добавляем описание, если есть
    let description = '';
    if (operation.description) {
        description = `<div style="color: #aaa; font-size: 0.75em; margin-top: 2px; font-style: italic;">
            ${operation.description}
        </div>`;
    }
    
    // ОТОБРАЖЕНИЕ ВСЕХ НЕПУСТЫХ ПОЛЕЙ
    let extraFields = '';
    const ignoredKeys = ['id', 'value', 'operation', 'description', 'duration', 'delta'];
    
    Object.keys(operation).forEach(key => {
        if (!ignoredKeys.includes(key)) {
            const val = operation[key];
            if (val !== undefined && val !== null && val !== '') {
                extraFields += `<div style="color: #666; font-size: 0.7em;">${key}: ${val}</div>`;
            }
        }
    });
    
    return `
        <div style="display: flex; align-items: flex-start; padding: 5px 0; border-bottom: 1px dotted #333;">
            <div style="margin-right: 8px; margin-top: 2px;">
                <i class="${icon}" style="color: ${color}; font-size: 0.8em;"></i>
            </div>
            <div style="flex: 1; min-width: 0;">
                <div style="color: #ddd; font-size: 0.85em; margin-bottom: 1px; word-wrap: break-word;">
                    ${valueDisplay}
                </div>
                ${description}
                ${extraFields}
            </div>
        </div>
    `;
}

function calculateChoiceResult(choice, d10) {
    console.log('🔍 calculateChoiceResult:', { choice, d10 });
    
    if (!choice || typeof choice !== 'object') {
        console.error('❌ Некорректный choice для расчета:', choice);
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
    
    let success = false;
    let partial = false;
    let reason = '';
    
    if (requirementsCheck.stats.length === 0) {
        const difficulty = choice.difficulty_level || 5;
        success = d10 > difficulty;
        reason = success ? 'Успех: d10 > difficulty' : 'Провал: d10 ≤ difficulty';
        
        return {
            success: success,
            partial: false,
            reason: reason,
            d10: d10,
            difficulty: difficulty,
            operations: success ?
                (choice.success_rewards || []) : (choice.fail_penalties || [])
        };
    }
    
    const difficulty = choice.difficulty_level || 5;
    const statValues = requirementsCheck.stats.map(s => s.value);
    const averageStat = statValues.reduce((a, b) => a + b, 0) / statValues.length;
    const threshold = averageStat + difficulty;
    
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
    
    if (passedCount === totalStats) {
        success = true;
        partial = false;
        reason = 'Полный успех: все статы прошли проверку';
    } else if (passedCount === 0) {
        success = false;
        partial = false;
        reason = 'Полный провал: ни один стат не прошел проверку';
    } else {
        success = true;
        partial = true;
        reason = `Частичный успех: ${passedCount}/${totalStats} статов прошли проверку`;
    }
    
    let operations = [];
    if (success && !partial) {
        operations = choice.success_rewards || [];
    } else if (success && partial) {
        operations = modifyOperationsForPartialResult(choice.success_rewards || []);
    } else {
        operations = choice.fail_penalties || [];
    }
    
    console.log('📊 Результат расчета:', { success, partial, operationsCount: operations.length });
    
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

// ИСПРАВЛЕНО: submitTurn для правильной последовательности применения изменений
async function submitTurn(retries = CONFIG.maxRetries) {
    console.log('🔍 submitTurn called');
    
    const state = State.getState();
    
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
            console.log('⚠️ Свободный ввод пуст');
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
            console.log('⚠️ Нет выбранных действий');
            return;
        }
        
        console.log('📋 Выбранные действия:', state.gameState.selectedActions);
        
        selectedChoicesData = state.gameState.selectedActions.map(i => {
            if (!state.gameState.currentScene || !state.gameState.currentScene.choices) {
                console.error('❌ Нет currentScene или choices');
                return null;
            }
            
            if (!state.gameState.currentScene.choices[i]) {
                console.error(`❌ Choice с индексом ${i} не найден`);
                return null;
            }
            return state.gameState.currentScene.choices[i];
        }).filter(Boolean);
        
        console.log('📊 Данные выбранных choices:', selectedChoicesData);
    }
    
    if (selectedChoicesData.length === 0) {
        console.error('❌ Нет данных для выбранных действий');
        Render.showErrorAlert("Ошибка", "Нет выбранных действий или данных о них");
        return;
    }
    
    const d10 = Math.floor(Math.random() * 10) + 1;
    console.log(`🎲 Общий бросок удачи на ход: d10 = ${d10}`);
    
    const actionResults = [];
    
    selectedChoicesData.forEach((choice, idx) => {
        const result = calculateChoiceResult(choice, d10);
        if (result) {
            actionResults.push({
                ...result,
                choice_text: choice.text,
                choice_index: state.freeMode ? null : state.gameState.selectedActions[idx]
            });
        }
    });
    
    console.log('📊 Результаты действий:', actionResults);
    
    // ВАЖНО: НЕ применяем изменения тут! Только готовим данные для ИИ
    const selectedActions = actionResults.map(result => ({
        text: result.choice_text,
        difficulty_level: result.difficulty,
        requirements: selectedChoicesData.find(c => c.text === result.choice_text)?.requirements || [],
        success: result.success,
        partial_success: result.partial,
        d10_roll: result.d10
    }));
    
    console.log('📤 Данные для отправки ИИ:', selectedActions);
    
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
        console.log('📡 Отправляем запрос к ИИ...');
        Render.startThoughtsOfHeroDisplay();
        const data = await API.sendAIRequest(state, selectedActions, activeAbortController, d10);
        
        clearTimeout(timeoutId);
        activeAbortController = null;
        
        if (!data || !data.scene) {
            if (retries > 0) {
                console.warn(`Ответ ИИ не содержит сцены. Повторная попытка ${CONFIG.maxRetries - retries + 1}.`);
                await new Promise(r => setTimeout(r, CONFIG.retryDelayMs));
                return submitTurn(retries - 1);
            } else {
                throw new Error("ИИ не смог сгенерировать сцену после нескольких попыток.");
            }
        }
        
        console.log('✅ Получен ответ от ИИ:', data);
        
        // Проверяем, что данные от ИИ валидны
if (!data) {
    throw new Error("Ответ от ИИ пустой");
}

if (!data.scene || typeof data.scene !== 'string' || data.scene.trim() === '') {
    console.warn('⚠️ Ответ ИИ не содержит сцены:', data);
    // Пытаемся исправить
    data.scene = data.scene || "Сцена не была сгенерирована. Пожалуйста, попробуйте еще раз.";
}

if (!data.choices || !Array.isArray(data.choices)) {
    console.warn('⚠️ Ответ ИИ не содержит choices или это не массив:', data);
    data.choices = data.choices || [];
}

console.log('✅ Данные от ИИ проверены:', {
    hasScene: !!data.scene,
    sceneLength: data.scene ? data.scene.length : 0,
    choicesCount: data.choices ? data.choices.length : 0
});


        // Теперь передаем actionResults для правильного применения
        processTurn(data, actionResults, d10);
        
    } catch (e) {
        clearTimeout(timeoutId);
        activeAbortController = null;
        Render.stopThoughtsOfHeroDisplay();
        
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

// Обработка ответа от ИИ после отправленного хода
function processTurn(data, actionResults, d10) {
    console.log('🔍 processTurn called with:', { data, actionResults, d10 });
    Render.stopThoughtsOfHeroDisplay();
    
    const state = State.getState();
    const previousScene = state.gameState.currentScene;
    
    // Шаг 1: Сохраняем старые значения статов
    const oldStats = {
        will: State.getGameItemValue('stat:will') || 50,
        stealth: State.getGameItemValue('stat:stealth') || 50,
        influence: State.getGameItemValue('stat:influence') || 50,
        sanity: State.getGameItemValue('stat:sanity') || 50
    };
    
    // Шаг 2: Уменьшаем длительность ВСЕХ временных эффектов ПЕРЕД применением новых
    // Это обеспечивает правильный отсчет: эффект, примененный в этом ходу, будет иметь полную длительность
    // И это ЕДИНСТВЕННОЕ место, где время идет вперед.
    decreaseBuffDurations();
    
    // Шаг 3: Применяем операции от действий
    actionResults.forEach(result => {
        if (result.operations && Array.isArray(result.operations)) {
            console.log('📦 Применяем операции от действия:', result.operations);
            State.applyOperations(result.operations);
        }
    });
    
    // Шаг 4: Применяем операции от событий
    if (data.events && Array.isArray(data.events)) {
        const eventOperations = [];
        data.events.forEach(event => {
            if (event.effects && Array.isArray(event.effects)) {
                eventOperations.push(...event.effects);
            }
        });
        
        if (eventOperations.length > 0) {
            console.log('📦 Применяем операции от событий:', eventOperations);
            State.applyOperations(eventOperations);
        }
    }
    
    // Шаг 5: Получаем новые значения статов
    const newStats = {
        will: State.getGameItemValue('stat:will') || 50,
        stealth: State.getGameItemValue('stat:stealth') || 50,
        influence: State.getGameItemValue('stat:influence') || 50,
        sanity: State.getGameItemValue('stat:sanity') || 50
    };
    
    // Шаг 6: Рассчитываем изменения статов за этот ход
    const statChanges = {
        will: newStats.will - oldStats.will,
        stealth: newStats.stealth - oldStats.stealth,
        influence: newStats.influence - oldStats.influence,
        sanity: newStats.sanity - oldStats.sanity
    };
    
    console.log('📊 Изменения статов за ход:', statChanges);
    
    // Обновляем память ИИ (заменяем только непустым значением)
const updatedAiMemory = (data.aiMemory && typeof data.aiMemory === 'object' && Object.keys(data.aiMemory).length > 0) 
    ? data.aiMemory 
    : state.gameState.aiMemory;
    
    // Добавляем мысли героя
    if (data.thoughts && Array.isArray(data.thoughts)) {
        State.addHeroPhrases(data.thoughts);
    }
    
    // Обновляем сцену
    const updatedScene = {
    scene: data.scene || state.gameState.currentScene.scene,
    reflection: data.reflection || "",
    choices: data.choices || state.gameState.currentScene.choices,
    typology: data.typology || "",
    design_notes: data.design_notes || "",
    aiMemory: updatedAiMemory,
    thoughts: data.thoughts || [],
    summary: data.summary || ""
};
    

    
    // Добавляем запись в историю
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
    
    // ------------------------------------------------------------------
    // ВАЖНО: СНАЧАЛА создаем HTML изменений, ПОТОМ используем!
    // ------------------------------------------------------------------
    // Шаг 7: Создаем и отображаем блок изменений за ход
    const updatesHTML = createTurnUpdatesHTML(actionResults, data.events || []);
    console.log('📄 Созданный HTML изменений:', updatesHTML);
    
    if (updatesHTML && updatesHTML.trim() !== '') {
        dom.updates.style.display = 'block';
        dom.updates.innerHTML = updatesHTML;
    } else {
        dom.updates.style.display = 'none';
        dom.updates.innerHTML = '';
    }
    
    // Шаг 8: Сохраняем все изменения в состоянии (ТЕПЕРЬ updatesHTML уже создан!)
    State.setState({
    gameState: {
        ...state.gameState,
        currentScene: updatedScene,
        history: updatedHistory,
        summary: data.summary || state.gameState.summary,
        selectedActions: [],
        aiMemory: updatedAiMemory
    },
    thoughtsOfHero: State.getHeroPhrasesCount() > 0 ? state.thoughtsOfHero : [],
    lastTurnStatChanges: statChanges,
    lastTurnUpdates: updatesHTML
});
    
    // Увеличиваем счетчик ходов
    State.incrementTurnCount();
    
    // Обновляем UI
    UI.setFreeModeUI(false);
    
    // Отправляем события
// В начале игры previousScene не существует
const safePreviousScene = previousScene || {
    scene: "В начале игры предыдущая сцена отсутствует.",
    choices: []
};

// Отправляем событие изменения сцены
State.emit(State.EVENTS.SCENE_CHANGED, {
    scene: updatedScene,
    previousScene: safePreviousScene
});

// Отправляем событие завершения хода
State.emit(State.EVENTS.TURN_COMPLETED, {
    turnCount: state.turnCount,
    actions: actionResults,
    statChanges: statChanges
});
    
    // Восстанавливаем UI элементы
    dom.freeInputText.disabled = false;
    dom.freeInputText.style.opacity = '1';
    dom.freeModeToggle.checked = false;
    dom.btnSubmit.innerHTML = '<i class="fas fa-paper-plane"></i> ОТПРАВИТЬ';
    UI.updateActionButtons();
    
    // Сохраняем состояние
    Saveload.saveState();
    
    console.log('✅ processTurn завершен');
}

// ДОБАВЛЕНО: Функция для уменьшения длительности временных эффектов
function decreaseBuffDurations() {
    console.log('🕐 Уменьшаем длительность временных эффектов');
    
    const state = State.getState();
    let hasChanges = false;
    
    // Обрабатываем баффы
    const buffs = state.heroState.filter(item => item.id.startsWith('buff:'));
    buffs.forEach(buff => {
        if (buff.duration !== undefined && buff.duration > 0) {
            buff.duration -= 1;
            hasChanges = true;
            console.log(`📉 Уменьшаем длительность ${buff.id}: ${buff.duration + 1} → ${buff.duration}`);
            
            if (buff.duration <= 0) {
                // Удаляем истекший эффект
                const index = state.heroState.findIndex(item => item.id === buff.id);
                if (index !== -1) {
                    state.heroState.splice(index, 1);
                    console.log(`🗑️ Удален истекший бафф: ${buff.id}`);
                }
            }
        }
    });
    
    // Обрабатываем дебаффы
    const debuffs = state.heroState.filter(item => item.id.startsWith('debuff:'));
    debuffs.forEach(debuff => {
        if (debuff.duration !== undefined && debuff.duration > 0) {
            debuff.duration -= 1;
            hasChanges = true;
            console.log(`📉 Уменьшаем длительность ${debuff.id}: ${debuff.duration + 1} → ${debuff.duration}`);
            
            if (debuff.duration <= 0) {
                // Удаляем истекший эффект
                const index = state.heroState.findIndex(item => item.id === debuff.id);
                if (index !== -1) {
                    state.heroState.splice(index, 1);
                    console.log(`🗑️ Удален истекший дебафф: ${debuff.id}`);
                }
            }
        }
    });
    
    if (hasChanges) {
        // Сохраняем изменения
        State.setState({ heroState: state.heroState });
        console.log('✅ Длительность временных эффектов уменьшена');
    }
}

function showEndScreen(title, msg, color, isVictory = false) {
    console.log("showEndScreen called");
    
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
            density: layer.density,
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
        localStorage.removeItem('oto_v4_state');
        location.reload();
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
    
    State.setState({
        freeMode: isFreeMode,
        freeModeText: isFreeMode ? dom.freeInputText.value : ''
    });
    
    UI.setFreeModeUI(isFreeMode);
    UI.updateActionButtons();
    Saveload.saveState();
    
    State.emit(State.EVENTS.MODE_CHANGED, { mode: isFreeMode ? 'free' : 'choices' });
}


/**
 * Упрощенный блок для Истории ходов: без детализации операций, только статусы действий и итоги
 */

/**
 * Упрощенный блок для Истории ходов: без детализации операций, только статусы действий и итоги
 */
function createSimplifiedTurnUpdatesHTML(actionResults, events) {
    console.log('🔍 createSimplifiedTurnUpdatesHTML called');
    
    if ((!actionResults || actionResults.length === 0) &&
        (!events || events.length === 0)) {
        return '';
    }
    
    let html = `
        <div style="margin: 10px 0; padding: 10px; background: rgba(0, 0, 0, 0.3); border-radius: 4px; border: 1px solid #444;">
            <div style="color: #d4af37; font-weight: bold; margin-bottom: 8px; border-bottom: 1px solid #d4af37; padding-bottom: 3px;">
                <i class="fas fa-exchange-alt"></i> ИЗМЕНЕНИЯ
            </div>
    `;
    
    // Действия (только статус)
    if (actionResults && actionResults.length > 0) {
        actionResults.forEach((result, idx) => {
            const statusIcon = result.success ? '✅' : result.partial ? '⚠️' : '❌';
            const statusText = result.success ? 'УСПЕХ' : result.partial ? 'ЧАСТИЧНО' : 'ПРОВАЛ';
            const statusColor = result.success ? '#4cd137' : result.partial ? '#fbc531' : '#e84118';
            
            html += `
                <div style="margin-bottom: 5px; padding: 5px; background: rgba(0,0,0,0.2); border-left: 3px solid ${statusColor}; border-radius: 3px;">
                    <span style="color: ${statusColor}; font-weight: bold;">${statusIcon} Действие ${idx + 1}:</span>
                    <span style="color: #ccc; margin-left: 5px;">"${result.choice_text}"</span>
                    <span style="color: ${statusColor}; font-weight: bold; margin-left: 10px;">${statusText}</span>
                </div>
            `;
        });
    }
    
    // События (только название)
    if (events && events.length > 0) {
        events.forEach((event, idx) => {
            html += `
                <div style="margin-bottom: 5px; padding: 5px; background: rgba(0,170,255,0.1); border-left: 3px solid #00a8ff; border-radius: 3px;">
                    <span style="color: #00a8ff; font-weight: bold;">⚡ Событие:</span>
                    <span style="color: #ccc; margin-left: 5px;">${event.description.substring(0, 60)}${event.description.length > 60 ? '...' : ''}</span>
                </div>
            `;
        });
    }
    
    // ИТОГИ (без детализации операций)
    html += `
        <div style="margin-top: 10px; padding-top: 10px; border-top: 1px solid #444;">
            <div style="color: #fbc531; font-weight: bold; margin-bottom: 5px;">ИТОГИ:</div>
            <div style="color: #ccc; font-size: 0.9em;">
                Характеристики героя изменились
            </div>
        </div>
    `;
    
    html += `</div>`;
    return html;
}

setupGameObservers();

export const Game = {
    toggleChoice,
    submitTurn,
    continueGame,
    restartGame,
    handleClear,
    handleFreeModeToggle,
    checkRequirements,
    calculateChoiceResult,
    decreaseBuffDurations,
    createTurnUpdatesHTML,
    createSimplifiedTurnUpdatesHTML
};