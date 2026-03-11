// Файл: turn-updates-ui.js 
// Модуль отображения блока "ИЗМЕНЕНИЯ ЗА ХОД" (v6.2 — адаптация для parsing.js)

'use strict';

import { State } from './3-state.js';
import { DOM } from './4-dom.js';
import { Utils } from './2-utils.js';
import { OPERATIONS } from './operations-service.js';
import { log, LOG_CATEGORIES } from './logger.js';
import { TooltipUI } from './tooltip-ui.js';
import { Parser } from './parsing.js';

const dom = DOM.getDOM();

/**
 * Менеджер блока "ИЗМЕНЕНИЯ ЗА ХОД" (v6.2).
 * 
 * Основная ответственность:
 * - Генерация HTML для действий и событий
 * - Сохранение HTML в State.ui.turnDisplay.updates
 * - Прикрепление тултипов через data-details + TooltipUI
 * - Гарантированный вызов 
 * - Нормализация операций через Parser перед тултипами
 * 
 * @class TurnUpdatesUI
 */
class TurnUpdatesUI {
    constructor() {
        console.log('🔧 TurnUpdatesUI v6.2: конструктор вызван');

        /** @type {HTMLElement|null} Контейнер для обновлений */
        this.container = null;
        
        /** @type {boolean} Флаг инициализации */
        this.initialized = false;

        // ШАГ 1: Создаём единый обработчик тултипов (привязан к контексту)
        // ШАГ 2: Используем currentTarget — гарантирует правильный элемент
        this.tooltipHandler = (e) => {
            const target = e.currentTarget;
            const encodedDetails = target.dataset.details;
            if (!encodedDetails) {
                console.warn('⚠️ data-details отсутствует');
                return;
            }

            try {
                const details = JSON.parse(decodeURIComponent(encodedDetails));
                const html = TurnUpdatesUI.buildTooltipHTML(details);

                if (TooltipUI && typeof TooltipUI.show === 'function') {
                    TooltipUI.show(target, html, {
                        autoHide: true,
                        duration: 45000,
                        offsetY: 8,
                        className: 'calculation-tooltip'
                    });
                } else {
                    console.error('TooltipUI не доступен');
                }
            } catch (err) {
                console.error('Ошибка при показе тултипа:', err);
            }
        };

        // Кэш нормализованных операций для тултипов (оптимизация v6.2)
        this.tooltipCache = new Map();
    }

    /**
     * Инициализация менеджера (вызывается из Init).
     * 
     * Логика по шагам:
     * 1. Проверка флага (защита от повторной инициализации)
     * 2. Создание/поиск контейнера
     * 3. Подписка на все необходимые события State
     * 4. Первый рендер из State
     * 5. Установка флага initialized
     */
    initialize() {
        if (this.initialized) return;
        console.log('🎮 Инициализация TurnUpdatesUI v6.2...');
        
        this.ensureContainer();
        this.setupEventListeners();
        this.renderFromState(); // внутри будет вызван attachTooltipHandlers
        
        this.initialized = true;
        console.log('✅ TurnUpdatesUI v6.2 готов');
    }

    /**
     * Гарантирует наличие контейнера #turnUpdatesContainer.
     * 
     * ШАГ 1: Поиск по id
     * ШАГ 2: Если не найден — создаём аварийный div
     * ШАГ 3: Добавляем CSS-класс
     * ШАГ 4: Вставляем в правильное место в DOM
     */
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

    /**
     * Настройка подписок на события State.
     * 
     * Подписываемся на:
     * - TURN_COMPLETED (основное обновление)
     * - SCENE_CHANGED (с задержкой)
     * - HERO_CHANGED (при импорте/ресете)
     * - STATE_REPLACED (новая подписка v6.2)
     */
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
        State.on(State.EVENTS.STATE_REPLACED, () => {
            this.ensureContainer();
            this.renderFromState();
        });
    }

    /**
     * Назначает обработчики тултипов напрямую каждому элементу с data-details.
     * 
     * ШАГ 1: Поиск всех элементов с data-details
     * ШАГ 2: Удаление старых обработчиков (защита от дублирования)
     * ШАГ 3: Добавление click и touchstart
     * ШАГ 4: Логирование количества обработчиков
     */
    attachTooltipHandlers() {
        if (!this.container) return;
        const elements = this.container.querySelectorAll('[data-details]');
        elements.forEach(el => {
            // Удаляем старые обработчики
            el.removeEventListener('click', this.tooltipHandler);
            el.removeEventListener('touchstart', this.tooltipHandler);
            // Добавляем новые
            el.addEventListener('click', this.tooltipHandler);
            el.addEventListener('touchstart', this.tooltipHandler, { passive: true });
        });
        console.log(`🔧 Назначены обработчики для ${elements.length} элементов`);
    }

    /**
     * Статический метод: строит HTML тултипа для расчёта/события.
     * 
     * @param {Object} details - данные из data-details
     * @returns {string} готовый HTML
     */
    static buildTooltipHTML(details) {
        let html = `<div class="tooltip-calculation">`;

        let title = '';
        if (details.type === 'event') {
            title = '🔍 СОБЫТИЕ';
        } else {
            const resultColor = details.success ? (details.partial ? '#ffaa00' : '#8f8') : '#f88';
            const resultText = details.success ?
                (details.partial ? 'ЧАСТИЧНЫЙ УСПЕХ' : 'ПОЛНЫЙ УСПЕХ') :
                'ПРОВАЛ';
            title = `<span style="color:${resultColor};">${resultText}</span>`;
        }
        html += `<div class="tooltip-header" style="font-weight:bold; margin-bottom:10px;">${title}</div>`;

        if (details.reason) {
            html += `<div class="tooltip-reason" style="margin-bottom:8px; font-size:0.9em;">${details.reason}</div>`;
        }

        if (details.requirementsList && details.requirementsList.length > 0) {
            html += `<div class="tooltip-section" style="margin-top:10px;"><span style="font-weight:bold;">📋 Требования:</span>`;
            details.requirementsList.forEach(req => {
                const icon = req.present ? '✅' : '❌';
                const reqName = req.id.replace('stat:', '').replace(/_/g, ' ');
                const valuePart = req.value !== null ? ` (${req.value})` : '';
                html += `<div style="margin-left:10px; font-size:0.9em;">${icon} ${reqName}${valuePart}</div>`;
            });
            html += `</div>`;
        }

        if (details.type !== 'event') {
            html += `<div class="tooltip-section" style="margin-top:10px;"><span style="font-weight:bold;">🎲 Расчёт:</span>`;
            html += `<div style="margin-left:10px; font-size:0.9em;">Бросок удачи d10: ${details.d10}</div>`;
            html += `<div style="margin-left:10px; font-size:0.9em;">Сложность действия: ${details.difficulty}</div>`;

            let algoDescription = '';
            if (details.d10 === 10) {
                algoDescription = '🎉 Критический успех: бросок 10 автоматически приносит успех независимо от сложности и требований.';
            } else if (details.d10 === 1) {
                algoDescription = '💥 Критический провал: бросок 1 автоматически приводит к провалу независимо от сложности и требований.';
            } else if (!details.statChecks || details.statChecks.length === 0) {
                algoDescription = details.success ?
                    `✅ Успех: бросок ${details.d10} ≥ сложность ${details.difficulty}.` :
                    `❌ Провал: бросок ${details.d10} < сложность ${details.difficulty}.`;
            } else {
                const target = details.threshold;
                algoDescription = `
                    <div style="margin-left:10px; margin-top:5px;">
                        🔢 Формула: для каждого требуемого стата считается (значение стата + d10). 
                        Если результат ≥ целевого порога (среднее арифметическое всех требуемых статов + сложность действия), стат считается успешным.
                    </div>
                    <div style="margin-left:10px;">
                        📈 Целевой порог = средний стат (${details.statChecks.map(s => s.base).join(' + ')} / ${details.statChecks.length}) + сложность ${details.difficulty} = ${details.threshold}
                    </div>
                    <div style="margin-left:10px; margin-top:5px;">
                        ✅ Полный успех – все статы прошли проверку.<br>
                        ⚖️ Частичный успех – хотя бы один стат прошёл проверку (но не все).<br>
                        ❌ Полный провал – ни один стат не прошёл проверку.
                    </div>
                `;
            }
            html += `<div style="margin-left:10px; font-size:0.95em; background:#222; padding:5px; border-radius:4px;">${algoDescription}</div>`;

            if (details.statChecks && details.statChecks.length > 0) {
                html += `<div style="margin-top:10px; font-weight:bold;">📊 Проверки статов:</div>`;
                details.statChecks.forEach(stat => {
                    const statName = stat.id.replace('stat:', '');
                    const passedIcon = stat.passed ? '✅' : '❌';
                    html += `<div style="margin-left:10px; font-size:0.9em;">${passedIcon} ${statName}: ${stat.base} + ${details.d10} = ${stat.withLuck} ${stat.passed ? '≥' : '<'} ${details.threshold}</div>`;
                });
            }
            html += `</div>`;
        }

        if (details.operations && details.operations.length > 0) {
            html += `<div class="tooltip-section" style="margin-top:15px;"><span style="font-weight:bold;">⚙️ Эффекты:</span>`;
            details.operations.forEach(op => {
                const opSuccess = op.success !== false;
                const opIcon = opSuccess ? '✅' : '❌';

                let opText = `${op.operation} ${op.id}`;
                if (op.delta !== undefined) {
                    const sign = op.delta > 0 ? '+' : '';
                    opText += ` ${sign}${op.delta}`;
                }
                if (op.value !== undefined) {
                    opText += ` = "${op.value}"`;
                }
                if (op.duration !== undefined) {
                    opText += ` [${op.duration} ход.]`;
                }
                if (op.description) {
                    opText += ` — ${op.description}`;
                }
                html += `<div style="margin-left:10px; font-size:0.9em;">${opIcon} ${opText}</div>`;
            });
            html += `</div>`;
        }

        html += `</div>`;
        return html;
    }

    /**
     * Генерирует HTML обновлений и сохраняет его в State.
     * 
     * @param {Array} actionResults - результаты действий
     * @param {Array} events - события
     * @param {number} turnNumber - номер хода
     * @param {Array} actionOperationResults - результаты операций действий
     * @param {Array} eventOperationResults - результаты операций событий
     * @returns {string} сгенерированный HTML
     */
    generateUpdatesHTML(actionResults, events, turnNumber, actionOperationResults = [], eventOperationResults = []) {
        log.debug(LOG_CATEGORIES.TURN_PROCESSING, `TurnUpdatesUI.generateUpdatesHTML for turn ${turnNumber}`, { actionResults, events });

        const innerHTML = this._createUpdatesInnerHTML(actionResults, events, turnNumber, actionOperationResults, eventOperationResults);
        
        // Сохраняем в State
        State.updateUI({ turnDisplay: { updates: innerHTML } });

        if (this.initialized && this.container) {
            this.renderFromState();
        }

        return innerHTML;
    }

    /**
     * Внутренний метод генерации HTML.
     * 
     * ШАГ 1: Проверка наличия действий и событий
     * ШАГ 2: Генерация секции действий
     * ШАГ 3: Генерация секции событий
     * ШАГ 4: Возврат готового HTML
     */
    _createUpdatesInnerHTML(actionResults, events, turnNumber, actionOperationResults = [], eventOperationResults = []) {
        let html = '';

        const hasActions = actionResults && actionResults.length > 0;
        const hasEvents = events && events.length > 0;

        if (!hasActions && !hasEvents) {
            html += `<div class="turn-updates-empty">Нет изменений за этот ход</div>`;
            return html;
        }

        if (hasActions) {
            html += `
                <div class="turn-updates-actions-section">
                    <div class="turn-updates-subheader actions-subheader">
                        <i class="fas fa-user-check"></i> По результатам действий
                    </div>
                    <div class="turn-updates-list actions-list">
            `;

            actionResults.forEach((result, actionIdx) => {
                const operations = result.operations || [];
                if (operations.length === 0 && !result.reason) return;

                const statusClass = result.success ?
                    (result.partial ? 'action-partial' : 'action-success') :
                    'action-failure';

                const opResults = actionOperationResults[actionIdx] || [];

                const details = {
                    success: result.success,
                    partial: result.partial,
                    reason: result.reason,
                    d10: result.d10,
                    difficulty: result.difficulty,
                    threshold: result.threshold,
                    statChecks: result.statChecks || [],
                    requirementsList: result.requirementsList || [],
                    operations: (result.operations || []).map((op, opIdx) => ({
                        ...op,
                        success: opResults[opIdx]?.success ?? true
                    }))
                };

                const encodedDetails = encodeURIComponent(JSON.stringify(details));

                html += `
                    <div class="turn-update-action ${statusClass}" data-details="${encodedDetails}" role="button" tabindex="0" style="cursor: pointer;">
                        <div class="action-header">
                            <i class="fas ${result.success ? 'fa-check-circle' : 'fa-times-circle'}"></i>
                            <span class="action-title">Действие ${actionIdx + 1}${result.partial ? ' (частично)' : ''}</span>
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

        if (hasEvents) {
            html += `
                <div class="turn-updates-events-section">
                    <div class="turn-updates-subheader events-subheader">
                        <i class="fas fa-bolt"></i> По результатам событий
                    </div>
                    <div class="turn-updates-list events-list">
            `;

            events.forEach((event, eventIdx) => {
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

                const effectResults = eventOperationResults[eventIdx] || [];

                const eventDetails = {
                    type: 'event',
                    description: eventDesc,
                    reason: event.reason,
                    operations: (effects || []).map((eff, effIdx) => ({
                        ...eff,
                        success: effectResults[effIdx]?.success ?? true
                    }))
                };
                const encodedEventDetails = encodeURIComponent(JSON.stringify(eventDetails));

                html += `
                    <div class="turn-update-event" data-details="${encodedEventDetails}" role="button" tabindex="0" style="cursor: pointer;">
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

        return html;
    }

    /**
     * Создаёт компактный HTML для одной операции с использованием Parser.
     * 
     * ШАГ 1: Валидация операции
     * ШАГ 2: Нормализация через Parser.normalizeOperation
     * ШАГ 3: Определение иконки и цвета по типу
     * ШАГ 4: Формирование valueDisplay в зависимости от операции
     * ШАГ 5: Добавление описания и доп. полей
     * ШАГ 6: Возврат готового HTML
     */
    _createCompactOperationHTML(operation, source) {
        if (!operation || !operation.id || !operation.operation) {
            log.warn(LOG_CATEGORIES.VALIDATION, 'Некорректная операция', operation);
            return '';
        }

        // ШАГ 2: Нормализация через Parser v6.1
        const normalized = Parser.normalizeOperation(operation) || operation;

        const sourceClass = source === 'action' ? 'action-operation' : 'event-operation';
        const [type, name] = normalized.id.split(':');

        let displayName = name;
        let icon = 'fa-question';
        let colorClass = 'operation-default';
        let valueDisplay = '';

        let displayValue = normalized.value || '';

        let displayDuration = '';
        if (normalized.duration !== undefined) {
            displayDuration = `[${normalized.duration} ход.]`;
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

        switch (normalized.operation) {
            case OPERATIONS.ADD:
                if (type === 'buff' || type === 'debuff') {
                    const sign = normalized.value > 0 ? '+' : '';
                    valueDisplay = `<span class="operation-value ${sign > 0 ? 'positive' : 'negative'}">
                        ${displayName} ${sign}${normalized.value} ${displayDuration}
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
                const sign = normalized.delta > 0 ? '+' : '';
                const deltaClass = normalized.delta > 0 ? 'positive' : 'negative';
                valueDisplay = `<span class="operation-modify ${deltaClass}">
                    ${displayName} ${sign}${normalized.delta}
                </span>`;
                break;
        }

        let description = '';
        if (normalized.description) {
            description = `<div class="operation-description">${normalized.description}</div>`;
        }

        let extraFields = '';
        const ignoredKeys = ['id', 'value', 'operation', 'description', 'duration', 'delta'];

        Object.keys(normalized).forEach(key => {
            if (!ignoredKeys.includes(key)) {
                const val = normalized[key];
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

    /**
     * Рендерит блок из сохранённого в State HTML
     * ШАГ 1: Получение HTML из State.ui.turnDisplay.updates
     * ШАГ 2: Вставка в контейнер
     * ШАГ 3: Назначение обработчиков тултипов
     * ШАГ 4: Прокрутка к блоку Изменения за ход
     */
    renderFromState() {
        try {
            const ui = State.getUI();
            if (!this.container) return;

            const innerContent = ui.turnDisplay?.updates || '<div class="turn-update-empty">Ожидание хода...</div>';
            this.container.innerHTML = `
                <div class="turn-updates-header">
                    <i class="fas fa-exchange-alt"></i> ИЗМЕНЕНИЯ ЗА ПОСЛЕДНИЙ ХОД
                </div>
                <div class="turn-updates-content">
                    ${innerContent}
                </div>
            `;

            this.attachTooltipHandlers();
            this.scrollToUpdates();
            console.log('✅ TurnUpdatesUI v6.2: обновлён');
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

    /**
     * Прокрутка к блоку обновлений.
     */
    scrollToUpdates() {
        if (!this.container) return;
        setTimeout(() => {
            if (this.container.offsetParent) {
                this.container.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        }, 300);
    }

    /**
     * Очистка текущего хода (новый метод v6.2).
     */
    clearCurrentTurnUpdates() {
        State.updateUI({ turnDisplay: { updates: '' } });
        if (this.container) this.container.innerHTML = '';
        console.log('🧹 TurnUpdatesUI: текущий ход очищен');
    }

    /**
     * Полная очистка контейнера.
     */
    clear() {
        if (this.container) this.container.innerHTML = '';
    }

    /**
     * Принудительное обновление из State.
     */
    forceUpdate() {
        this.renderFromState();
    }

    /**
     * Уничтожение менеджера.
     */
    destroy() {
        this.clear();
        this.container = null;
        this.initialized = false;
        this.tooltipCache.clear();
    }
}

const turnUpdatesUI = new TurnUpdatesUI();
export { turnUpdatesUI as TurnUpdatesUI };