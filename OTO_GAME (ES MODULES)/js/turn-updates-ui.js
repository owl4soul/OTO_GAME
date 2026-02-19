// Файл: turn-updates-ui.js (ПОЛНАЯ ВЕРСИЯ С ТУЛТИПОМ ЧЕРЕЗ INLINE ONCLICK)
// Модуль отображения блока "Изменения за ход". Теперь сам генерирует HTML и сохраняет в State.
// Использует глобальную функцию showCalculationTooltip для вызова TooltipUI, аналогично gameitem-ui.
'use strict';

import { State } from './3-state.js';
import { DOM } from './4-dom.js';
import { Utils } from './2-utils.js';
import { OPERATIONS } from './operations-service.js';
import { log, LOG_CATEGORIES } from './logger.js';
import { TooltipUI } from './tooltip-ui.js';

const dom = DOM.getDOM();

class TurnUpdatesUI {
    constructor() {
        console.log('🔧 TurnUpdatesUI: конструктор');
        this.container = null;
        this.initialized = false;
    }

    initialize() {
        if (this.initialized) return;
        console.log('🎮 Инициализация TurnUpdatesUI...');
        this.ensureContainer();
        this.setupEventListeners();
        this.renderFromState();
        this.initialized = true;
        console.log('✅ TurnUpdatesUI готов');
    }

    ensureContainer() {
        this.container = document.getElementById('turnUpdatesContainer');
        if (!this.container) {
            console.error('❌ turnUpdatesContainer не найден, создаём аварийно');
            this.container = document.createElement('div');
            this.container.id = 'turnUpdatesContainer';
            this.container.className = 'turn-updates-container';
            const sceneArea = dom.sceneArea;
            if (sceneArea) {
                const sceneText = sceneArea.querySelector('.scene-text');
                if (sceneText) sceneArea.insertBefore(this.container, sceneText);
                else sceneArea.appendChild(this.container);
            }
        } else {
            this.container.classList.add('turn-updates-container');
        }
    }

    setupEventListeners() {
        State.on(State.EVENTS.TURN_COMPLETED, () => {
            this.ensureContainer();
            this.renderFromState();
        });
        State.on(State.EVENTS.SCENE_CHANGED, () => {
            setTimeout(() => {
                this.ensureContainer();
                this.renderFromState();
            }, 100);
        });
        State.on(State.EVENTS.HERO_CHANGED, (data) => {
            if (data.type === 'import' || data.type === 'reset') {
                setTimeout(() => {
                    this.ensureContainer();
                    this.renderFromState();
                }, 100);
            }
        });
    }

    // ========== ГЛОБАЛЬНАЯ ФУНКЦИЯ ДЛЯ ТУЛТИПА (добавляется в window) ==========
    static registerGlobalTooltipFunction() {
        if (window.showCalculationTooltip) return;
        window.showCalculationTooltip = (element, detailsJson) => {
            try {
                const details = JSON.parse(detailsJson);
                // Формируем HTML для тултипа
                let html = `<div style="font-weight: bold; margin-bottom: 8px; color: #d4af37;">🔍 Детали расчёта</div>`;

                html += `<div><span style="color: #888;">Результат:</span> <span style="color: ${details.success ? '#8f8' : '#f88'}">${details.success ? (details.partial ? 'ЧАСТИЧНЫЙ УСПЕХ' : 'ПОЛНЫЙ УСПЕХ') : 'ПРОВАЛ'}</span></div>`;
                html += `<div><span style="color: #888;">Причина:</span> ${details.reason || '—'}</div>`;
                html += `<div><span style="color: #888;">Бросок d10:</span> ${details.d10}</div>`;
                html += `<div><span style="color: #888;">Сложность:</span> ${details.difficulty}</div>`;

                if (details.threshold || details.target) {
                    const target = details.threshold || details.target;
                    html += `<div><span style="color: #888;">Цель (сложность×10):</span> ${target}</div>`;
                }

                if (details.statChecks && details.statChecks.length) {
                    html += `<div style="margin-top: 8px; font-weight: bold;">📊 Проверки статов:</div>`;
                    details.statChecks.forEach(stat => {
                        const statName = stat.id.replace('stat:', '');
                        const successText = stat.passed ? '✅' : '❌';
                        html += `<div style="margin-left: 8px;">${successText} ${statName}: ${stat.base} + ${details.d10} = ${stat.withLuck} ${stat.passed ? '≥' : '<'} ${stat.target || details.threshold} </div>`;
                    });
                }

                if (details.operations && details.operations.length) {
                    html += `<div style="margin-top: 8px; font-weight: bold;">${details.success ? (details.partial ? '⚖️ Частичные эффекты' : '✨ Получено') : '💔 Потери'}:</div>`;
                    details.operations.forEach(op => {
                        let opText = `${op.operation} ${op.id}`;
                        if (op.delta !== undefined) opText += ` ${op.delta > 0 ? '+' : ''}${op.delta}`;
                        if (op.value !== undefined) opText += ` = "${op.value}"`;
                        html += `<div style="margin-left: 8px;">• ${opText}</div>`;
                    });
                }

                TooltipUI.show(element, html, { autoHide: true, offsetY: 8 });
            } catch (err) {
                console.error('Ошибка в showCalculationTooltip:', err);
            }
        };
    }

    // ========== МЕТОДЫ ГЕНЕРАЦИИ HTML ==========
    generateUpdatesHTML(actionResults, events, turnNumber) {
        log.debug(LOG_CATEGORIES.TURN_PROCESSING, `TurnUpdatesUI.generateUpdatesHTML for turn ${turnNumber}`, { actionResults, events });
        
        const html = this._createTurnUpdatesHTML(actionResults, events, turnNumber);
        
        // Сохраняем в состояние
        State.setState({ lastTurnUpdates: html });
        
        // Если контейнер уже инициализирован, сразу обновляем отображение
        if (this.initialized && this.container) {
            this.renderFromState();
        }
        
        return html;
    }

    _createTurnUpdatesHTML(actionResults, events, turnNumber) {
        // ВСЕГДА возвращаем блок, даже если нет изменений
        let html = `
            <div class="turn-updates-container">
                <div class="turn-updates-header">
                    <i class="fas fa-exchange-alt"></i> ИЗМЕНЕНИЯ ЗА ХОД ${turnNumber}
                </div>
        `;
        
        const hasActions = actionResults && actionResults.length > 0;
        const hasEvents = events && events.length > 0;
        
        if (!hasActions && !hasEvents) {
            html += `
                <div class="turn-updates-empty">
                    Нет изменений за этот ход
                </div>
            `;
            html += `</div>`;
            return html;
        }
        
        if (actionResults && actionResults.length > 0) {
            html += `
                <div class="turn-updates-actions-section">
                    <div class="turn-updates-subheader actions-subheader">
                        <i class="fas fa-user-check"></i> По результатам действий
                    </div>
                    <div class="turn-updates-list actions-list">
            `;
            
            actionResults.forEach((result, idx) => {
                const operations = result.operations || [];
                if (operations.length === 0 && !result.reason) return;
                
                const statusClass = result.success 
                    ? (result.partial ? 'action-partial' : 'action-success')
                    : 'action-failure';
                
                const details = {
                    success: result.success,
                    partial: result.partial,
                    reason: result.reason,
                    d10: result.d10,
                    difficulty: result.difficulty,
                    threshold: result.threshold,
                    statChecks: result.statChecks || [],
                    operations: (result.operations || []).map(op => ({
                        operation: op.operation,
                        id: op.id,
                        delta: op.delta,
                        value: op.value
                    }))
                };
                
                // Экранируем двойные и одинарные кавычки для безопасной вставки в HTML-атрибут onclick
                const detailsJson = JSON.stringify(details)
                    .replace(/"/g, '&quot;')
                    .replace(/'/g, '&apos;');
                
                html += `
                    <div class="turn-update-action ${statusClass}" onclick="window.showCalculationTooltip(this, '${detailsJson}')">
                        <div class="action-header">
                            <i class="fas ${result.success ? 'fa-check-circle' : 'fa-times-circle'}"></i>
                            <span class="action-title">Действие ${idx + 1}${result.partial ? ' (частично)' : ''}</span>
                        </div>
                        <div class="action-text">${result.choice_text || 'Действие'}</div>
                        <div class="action-details">
                            <span class="action-difficulty">🎯 Сложность: ${result.difficulty}</span>
                            <span class="action-d10">🎲 d10: ${result.d10}</span>
                            <span class="action-reason">${result.reason || ''}</span>
                        </div>
                `;
                
                if (operations.length > 0) {
                    html += `<div class="action-operations">`;
                    operations.forEach(op => {
                        html += this._createCompactOperationHTML(op, 'action');
                    });
                    html += `</div>`;
                }
                
                html += `</div>`;
            });
            
            html += `</div></div>`;
        }
        
        if (events && events.length > 0) {
            html += `
                <div class="turn-updates-events-section">
                    <div class="turn-updates-subheader events-subheader">
                        <i class="fas fa-bolt"></i> По результатам событий
                    </div>
                    <div class="turn-updates-list events-list">
            `;
            
            events.forEach((event, idx) => {
                const effects = event.effects || [];
                
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
                    <div class="turn-update-event">
                        <div class="event-header">
                            <i class="fas ${icon}"></i>
                            <span class="event-type">${event.type ? event.type.toUpperCase() : 'СОБЫТИЕ'}</span>
                        </div>
                        <div class="event-description">${eventDesc}</div>
                        <div class="event-reason">${event.reason || 'Нет описания'}</div>
                `;
                
                if (effects.length > 0) {
                    html += `<div class="event-effects">`;
                    effects.forEach(effect => {
                        html += this._createCompactOperationHTML(effect, 'event');
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

    _createCompactOperationHTML(operation, source) {
        if (!operation || !operation.id || !operation.operation) {
            log.warn(LOG_CATEGORIES.VALIDATION, 'Некорректная операция', operation);
            return '';
        }
        
        const sourceClass = source === 'action' ? 'action-operation' : 'event-operation';
        const [type, name] = operation.id.split(':');
        
        let displayName = name;
        let icon = 'fa-question';
        let colorClass = 'operation-default';
        let valueDisplay = '';
        
        let displayValue = operation.value || '';
        
        let displayDuration = '';
        if (operation.duration !== undefined) {
            displayDuration = `[${operation.duration} ход.]`;
        }
        
        switch (type) {
            case 'stat':
                icon = 'fa-chart-line';
                colorClass = 'operation-stat';
                displayName = Utils.getRussianStatName(name);
                break;
            case 'skill':
                icon = 'fa-scroll';
                colorClass = 'operation-skill';
                displayName = displayValue || name;
                break;
            case 'inventory':
                icon = 'fa-box-open';
                colorClass = 'operation-inventory';
                displayName = displayValue || name;
                break;
            case 'relations':
                icon = 'fa-handshake';
                colorClass = 'operation-relations';
                displayName = name.replace(/_/g, ' ');
                break;
            case 'bless':
                icon = 'fa-star';
                colorClass = 'operation-bless';
                displayName = displayValue || name;
                break;
            case 'curse':
                icon = 'fa-skull-crossbones';
                colorClass = 'operation-curse';
                displayName = displayValue || name;
                break;
            case 'buff':
                icon = 'fa-arrow-up';
                colorClass = 'operation-buff';
                displayName = Utils.getRussianStatName(name);
                break;
            case 'debuff':
                icon = 'fa-arrow-down';
                colorClass = 'operation-debuff';
                displayName = Utils.getRussianStatName(name);
                break;
            case 'progress':
                icon = 'fa-chart-line';
                colorClass = 'operation-progress';
                displayName = displayValue || name;
                break;
            case 'personality':
                icon = 'fa-brain';
                colorClass = 'operation-personality';
                displayName = displayValue || name;
                break;
            case 'initiation_degree':
                icon = 'fa-graduation-cap';
                colorClass = 'operation-degree';
                displayName = displayValue || name;
                break;
            case 'organization_rank':
                icon = 'fa-users';
                colorClass = 'operation-organization';
                displayName = displayValue || name || 'Организация';
                break;
        }
        
        switch (operation.operation) {
            case OPERATIONS.ADD:
                if (type === 'buff' || type === 'debuff') {
                    const sign = operation.value > 0 ? '+' : '';
                    valueDisplay = `<span class="operation-value ${sign > 0 ? 'positive' : 'negative'}">
                        ${displayName} ${sign}${operation.value} ${displayDuration}
                    </span>`;
                } else {
                    const addedValue = displayValue ? `: "${displayValue}"` : '';
                    valueDisplay = `<span class="operation-add">
                        Добавить ${displayName}${addedValue}
                    </span>`;
                }
                break;
                
            case OPERATIONS.REMOVE:
                valueDisplay = `<span class="operation-remove">
                    Удалить: ${displayName}
                </span>`;
                break;
                
            case OPERATIONS.SET:
                valueDisplay = `<span class="operation-set">
                    Установить ${displayName}: "${String(displayValue).substring(0, 50)}"
                </span>`;
                break;
                
            case OPERATIONS.MODIFY:
                const sign = operation.delta > 0 ? '+' : '';
                const deltaClass = operation.delta > 0 ? 'positive' : 'negative';
                valueDisplay = `<span class="operation-modify ${deltaClass}">
                    ${displayName} ${sign}${operation.delta}
                </span>`;
                break;
        }
        
        let description = '';
        if (operation.description) {
            description = `<div class="operation-description">${operation.description}</div>`;
        }
        
        let extraFields = '';
        const ignoredKeys = ['id', 'value', 'operation', 'description', 'duration', 'delta'];
        
        Object.keys(operation).forEach(key => {
            if (!ignoredKeys.includes(key)) {
                const val = operation[key];
                if (val !== undefined && val !== null && val !== '') {
                    extraFields += `<div class="operation-extra">${key}: ${val}</div>`;
                }
            }
        });
        
        return `
            <div class="operation-item ${sourceClass} ${colorClass}">
                <div class="operation-icon"><i class="fas ${icon}"></i></div>
                <div class="operation-content">
                    <div class="operation-main">
                        ${valueDisplay}
                    </div>
                    ${description}
                    ${extraFields}
                </div>
            </div>
        `;
    }

    // ========== РЕНДЕРИНГ ИЗ СОСТОЯНИЯ ==========
    renderFromState() {
        try {
            const state = State.getState();
            if (!this.container) return;

            const content = state.lastTurnUpdates || '<div class="turn-update-empty">Ожидание хода...</div>';
            this.container.innerHTML = `
                <div class="turn-updates-header">
                    <i class="fas fa-exchange-alt"></i> ИЗМЕНЕНИЯ ЗА ПОСЛЕДНИЙ ХОД
                </div>
                ${content}
            `;
            this.scrollToUpdates();
            console.log('✅ TurnUpdatesUI: обновлён');
        } catch (e) {
            console.error('❌ Ошибка рендеринга TurnUpdatesUI:', e);
            if (this.container) {
                this.container.innerHTML = `
                    <div class="turn-updates-header">⚠️ Ошибка</div>
                    <div class="turn-update-event">Не удалось загрузить изменения</div>
                `;
            }
        }
    }

    scrollToUpdates() {
        if (!this.container) return;
        setTimeout(() => {
            if (this.container.offsetParent) {
                this.container.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        }, 300);
    }

    clear() {
        if (this.container) this.container.innerHTML = '';
    }

    forceUpdate() {
        this.renderFromState();
    }

    destroy() {
        this.clear();
        this.container = null;
        this.initialized = false;
    }
}

// Регистрируем глобальную функцию сразу
TurnUpdatesUI.registerGlobalTooltipFunction();

const turnUpdatesUI = new TurnUpdatesUI();
export { turnUpdatesUI as TurnUpdatesUI };