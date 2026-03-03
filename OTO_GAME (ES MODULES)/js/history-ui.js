/**
 * Модуль: HISTORY UI - Рендеринг истории ходов
 * Полностью переведён на классы. Все стили берутся из темы через CSS.
 * Динамический акцентный цвет левой границы и номера хода задаётся через CSS-переменную.
 * Адаптирован под State 5.1.
 */

'use strict';

import { State } from './3-state.js';
import { DOM } from './4-dom.js';
import { Utils } from '././2-utils.js';

const dom = DOM.getDOM();

class HistoryUI {
    constructor() {
        this.initialized = false;
        this.MAX_VISIBLE_TURNS = 100;
        this.COLLAPSED_CHAR_LIMIT = 80;
        this.container = null;
        this.allExpanded = false;
    }

    // =========== КОМПОНЕНТЫ ДЛЯ ОТОБРАЖЕНИЯ ===========

    /**
     * Форматирование текста с сохранением структуры абзацев
     */
    formatTextWithParagraphs(text) {
        if (!text) return '';
        const escaped = Utils.escapeHtml(text);

        const paragraphs = escaped.split(/(?:\r?\n){2,}/);
        const nonEmptyParagraphs = paragraphs.filter(p => p.trim().length > 0);

        if (nonEmptyParagraphs.length === 0) return '';
        if (nonEmptyParagraphs.length === 1) {
            return `<div class="text-paragraph">${nonEmptyParagraphs[0].replace(/\r?\n/g, '<br>')}</div>`;
        }

        let result = '';
        nonEmptyParagraphs.forEach(para => {
            const trimmed = para.trim();
            if (trimmed.length > 0) {
                result += `<div class="text-paragraph">${trimmed.replace(/\r?\n/g, '<br>')}</div>`;
            }
        });

        return result;
    }

    initialize() {
        if (this.initialized) return;

        console.log('📜 Инициализация HistoryUI...');

        this.setupContainer();
        this.setupEventListeners();
        this.render();

        this.initialized = true;
    }

    setupContainer() {
        if (!dom.hist) return;

        dom.hist.innerHTML = '';
        dom.hist.classList.add('history-container'); // добавим класс для общих стилей, если потребуется

        this.container = dom.hist;

        // Шапка с классом history-header
        const header = document.createElement('div');
        header.className = 'history-header';

        header.innerHTML = `
            <div class="history-header-left">
                <i class="fas fa-history"></i>
                <span>ИСТОРИЯ</span>
            </div>
            <div class="history-header-right">
                <button class="history-header-btn expand-all" title="Развернуть все">
                    <i class="fas fa-expand-alt"></i>
                </button>
                <button class="history-header-btn collapse-all" title="Свернуть все">
                    <i class="fas fa-compress-alt"></i>
                </button>
            </div>
        `;

        this.container.appendChild(header);

        // Контейнер для ходов
        const turnsContainer = document.createElement('div');
        turnsContainer.id = 'historyTurnsContainer';
        this.container.appendChild(turnsContainer);

        // Вешаем обработчики после добавления в DOM
        setTimeout(() => {
            const expandBtn = header.querySelector('.expand-all');
            const collapseBtn = header.querySelector('.collapse-all');
            if (expandBtn) expandBtn.onclick = () => this.expandAllTurns();
            if (collapseBtn) collapseBtn.onclick = () => this.collapseAllTurns();
        }, 0);
    }

    setupEventListeners() {
        State.on(State.EVENTS.TURN_COMPLETED, () => {
            setTimeout(() => this.render(), 100);
        });

        State.on(State.EVENTS.SCENE_CHANGED, () => {
            setTimeout(() => this.render(), 50);
        });

        // При импорте/сбросе также происходит SCENE_CHANGED или HERO_CHANGED, поэтому дополнительных подписок не требуется.
    }

    /**
     * Определяет акцентный цвет для хода на основе результатов действий
     */
    getAccentColor(entry) {
        if (!entry.actionResults || !Array.isArray(entry.actionResults)) {
            return 'var(--history-accent-neutral, #555)';
        }
        const hasSuccess = entry.actionResults.some(a => a.success && !a.partial_success);
        const hasFailure = entry.actionResults.some(a => !a.success);
        if (hasSuccess && !hasFailure) return 'var(--history-accent-success, #4cd137)';
        if (hasFailure && !hasSuccess) return 'var(--history-accent-failure, #e84118)';
        if (hasSuccess && hasFailure) return 'var(--history-accent-mixed, #fbc531)';
        return 'var(--history-accent-neutral, #555)';
    }

    /**
     * Создает элемент хода со ВСЕМИ секциями
     */
    createTurnElement(entry, index, isCurrent) {
        const turnNumber = index + 1;
        const summary = entry.summary || entry.fullText || entry.scene || 'Без сводки';
        const collapsedSummary = this.truncateForCollapsed(summary, this.COLLAPSED_CHAR_LIMIT);

        const accentColor = this.getAccentColor(entry);

        // Основной элемент
        const details = document.createElement('details');
        details.className = 'history-turn';
        // Устанавливаем CSS-переменную для акцентного цвета (будет использоваться в CSS)
        details.style.setProperty('--turn-accent-color', accentColor);

        if (isCurrent) details.setAttribute('open', '');

        // ЗАГОЛОВОК
        const summaryElem = document.createElement('summary');

        const timestamp = entry.timestamp || '';
        const timeOnly = timestamp.split(' ')[1] || '';
        const actionCount = entry.actionResults?.length || 0;

        summaryElem.innerHTML = `
            <div class="turn-summary-row">
                <i class="fas fa-chevron-right turn-chevron"></i>
                <span class="turn-summary-number">Ход ${turnNumber}</span>
            </div>
            <div class="turn-summary-details">
                <span class="turn-summary-text" title="${Utils.escapeHtml(collapsedSummary)}">
                    ${Utils.escapeHtml(collapsedSummary)}
                </span>
                <span class="turn-summary-count">
                    ${actionCount} ${this.getActionWord(actionCount)}
                </span>
            </div>
            ${timeOnly ? `<div class="turn-summary-time">${timeOnly}</div>` : ''}
        `;

        details.addEventListener('toggle', () => {
            const icon = summaryElem.querySelector('.turn-chevron');
            icon.style.transform = details.open ? 'rotate(90deg)' : 'rotate(0deg)';
        });

        if (isCurrent) {
            summaryElem.querySelector('.turn-chevron').style.transform = 'rotate(90deg)';
        }

        details.appendChild(summaryElem);

        // === ВСЕ СЕКЦИИ СОДЕРЖИМОГО ===
        const content = document.createElement('div');
        content.className = 'history-turn-content';

        let contentHTML = '<div class="history-blocks">';

        // 1. ЗАМЕТКИ ДИЗАЙНЕРА
        if (entry.design_notes && entry.design_notes.trim() !== '') {
            contentHTML += this.createBlock(
                'design-notes',
                'Заметки дизайнера',
                entry.design_notes,
                'fa-pencil-alt'
            );
        }

        // 2. ПАМЯТЬ ГМ
        if (entry.aiMemory && typeof entry.aiMemory === 'object' && Object.keys(entry.aiMemory).length > 0) {
            contentHTML += this.createMemoryBlock(entry.aiMemory);
        }

        // 3. СВОДКА
        if (summary && summary.trim() !== '' && summary !== 'Без сводки') {
            contentHTML += this.createBlock(
                'summary',
                'Сводка',
                summary,
                'fa-file-alt'
            );
        }

        // 4. ТЕКСТ СЦЕНЫ
        const sceneText = entry.fullText || entry.scene;
        if (sceneText && sceneText.trim() !== '') {
            contentHTML += this.createBlock(
                'scene',
                'Текст сцены',
                sceneText,
                'fa-scroll'
            );
        }

        // 5. РЕФЛЕКСИЯ
        if (entry.reflection && entry.reflection.trim() !== '') {
            contentHTML += this.createBlock(
                'reflection',
                'Рефлексия',
                entry.reflection,
                'fa-eye',
                true
            );
        }

        // 6. ЛИЧНОСТЬ
        if (entry.personality && entry.personality.trim() !== '') {
            contentHTML += this.createBlock(
                'personality',
                'Личность',
                entry.personality,
                'fa-user-circle'
            );
        }

        // 7. ТИПОЛОГИЯ
        if (entry.typology && entry.typology.trim() !== '') {
            contentHTML += this.createBlock(
                'typology',
                'Типология',
                entry.typology,
                'fa-fingerprint'
            );
        }

        // 8. ДЕЙСТВИЯ
        if (entry.actionResults && Array.isArray(entry.actionResults) && entry.actionResults.length > 0) {
            contentHTML += this.createActionsBlock(entry.actionResults);
        } else if (entry.choice) {
            contentHTML += this.createChoiceBlock(entry.choice);
        }

        // 9. ИЗМЕНЕНИЯ
        if (entry.changes && entry.changes !== 'Нет явных изменений') {
            contentHTML += this.createBlock(
                'changes',
                'Изменения',
                entry.changes,
                'fa-exchange-alt'
            );
        }

        contentHTML += '</div>';
        content.innerHTML = contentHTML;

        details.appendChild(content);
        return details;
    }

    /**
     * Создает блок памяти ГМ
     */
    createMemoryBlock(aiMemory) {
        const entries = Object.entries(aiMemory);
        if (entries.length === 0) return '';

        let html = '<div class="memory-items">';

        entries.slice(0, 4).forEach(([key, value]) => {
            let displayValue = '';
            let valueClass = 'memory-value';

            if (value === null || value === undefined) {
                displayValue = 'null';
                valueClass += ' null';
            } else if (typeof value === 'boolean') {
                displayValue = value ? '✓' : '✗';
                valueClass += value ? ' boolean-true' : ' boolean-false';
            } else if (typeof value === 'number') {
                displayValue = value;
                valueClass += ' number';
            } else if (Array.isArray(value)) {
                displayValue = `[${value.length}]`;
                valueClass += ' array';
            } else if (typeof value === 'string') {
                const safeValue = Utils.escapeHtml(value);
                displayValue = `"${safeValue}"`;
                valueClass += ' string';
            } else if (typeof value === 'object') {
                displayValue = `{${Object.keys(value).length}}`;
                valueClass += ' object';
            }

            const safeKey = Utils.escapeHtml(key);

            html += `<span class="memory-item">
                <span class="memory-key">${safeKey}</span>
                <span class="${valueClass}">${displayValue}</span>
            </span>`;
        });

        if (entries.length > 4) {
            html += `<span class="memory-more">+${entries.length - 4}</span>`;
        }

        html += '</div>';

        return `
            <div class="history-block history-block-ai-memory">
                <div class="history-block-title">
                    <i class="fas fa-brain"></i> Память ГМ (${entries.length})
                </div>
                ${html}
            </div>
        `;
    }

    /**
     * Создает блок действий
     */
    createActionsBlock(actions) {
        let html = '<div class="actions-list">';

        actions.forEach(action => {
            const isSuccess = action.success;
            const isPartial = action.partial_success;

            let statusClass;
            let icon;

            if (isSuccess && !isPartial) {
                statusClass = 'action-success';
                icon = '✓';
            } else if (isPartial) {
                statusClass = 'action-partial';
                icon = '⚠';
            } else {
                statusClass = 'action-failure';
                icon = '✗';
            }

            const actionText = action.text || 'Действие';
            const shortText = actionText.length > 60 ? actionText.substring(0, 60) + '...' : actionText;

            html += `
                <div class="action-item ${statusClass}">
                    <span class="action-icon">${icon}</span>
                    <span class="action-text">${Utils.escapeHtml(shortText)}</span>
                </div>
            `;
        });

        html += '</div>';

        return `
            <div class="history-block history-block-actions">
                <div class="history-block-title">
                    <i class="fas fa-hand-point-right"></i> Действия (${actions.length})
                </div>
                ${html}
            </div>
        `;
    }

    /**
     * Создает блок выбора (если нет действий)
     */
    createChoiceBlock(choice) {
        return `
            <div class="history-block history-block-actions"> <!-- используем тот же класс для единообразия -->
                <div class="history-block-title">
                    <i class="fas fa-hand-point-right"></i> Выбор
                </div>
                <div class="history-block-content">
                    ${Utils.escapeHtml(choice)}
                </div>
            </div>
        `;
    }

    /**
     * Создает стандартный текстовый блок
     */
    createBlock(type, title, content, icon, italic = false) {
        const formattedContent = this.formatTextWithParagraphs(content);
        if (!formattedContent) return '';

        return `
            <div class="history-block history-block-${type}">
                <div class="history-block-title">
                    <i class="fas ${icon}"></i> ${title}
                </div>
                <div class="history-block-content${italic ? ' italic' : ''}">
                    ${formattedContent}
                </div>
            </div>
        `;
    }

    /**
     * Вспомогательные методы
     */
    truncateForCollapsed(text, charLimit) {
        if (!text || typeof text !== 'string') return '';
        const withoutTags = text.replace(/<[^>]*>/g, ' ');
        const cleanText = withoutTags.replace(/\s+/g, ' ').trim();
        if (cleanText.length <= charLimit) return cleanText;
        const truncated = cleanText.substring(0, charLimit);
        const lastSpace = truncated.lastIndexOf(' ');
        if (lastSpace > charLimit * 0.7 && lastSpace > 0) {
            return truncated.substring(0, lastSpace) + '...';
        }
        return truncated + '...';
    }

    getActionWord(count) {
        if (count % 10 === 1 && count % 100 !== 11) return 'действие';
        if (count % 10 >= 2 && count % 10 <= 4 && (count % 100 < 10 || count % 100 >= 20)) return 'действия';
        return 'действий';
    }

    expandAllTurns() {
        const turns = this.container.querySelectorAll('details.history-turn');
        turns.forEach(turn => turn.open = true);
        this.allExpanded = true;
    }

    collapseAllTurns() {
        const turns = this.container.querySelectorAll('details.history-turn');
        turns.forEach(turn => turn.open = false);
        this.allExpanded = false;
    }

    render() {
        const game = State.getGame();
        const turnsContainer = document.getElementById('historyTurnsContainer');
        if (!turnsContainer) return;

        if (!game.history || game.history.length === 0) {
            turnsContainer.innerHTML = `
                <div class="history-empty">
                    <i class="fas fa-history"></i>
                    История пуста
                </div>
            `;
            return;
        }

        turnsContainer.innerHTML = '';

        const recentHistory = game.history.slice(-this.MAX_VISIBLE_TURNS);
        const reversedHistory = [...recentHistory].reverse();

        reversedHistory.forEach((entry, reverseIndex) => {
            const originalIndex = recentHistory.length - 1 - reverseIndex;
            const isCurrent = (originalIndex === recentHistory.length - 1);

            const turnElement = this.createTurnElement(entry, originalIndex, isCurrent);
            turnsContainer.appendChild(turnElement);
        });

        const totalTurns = game.history.length;
        if (totalTurns > this.MAX_VISIBLE_TURNS) {
            const indicator = document.createElement('div');
            indicator.className = 'history-footer-indicator';
            indicator.textContent = `Последние ${this.MAX_VISIBLE_TURNS} из ${totalTurns} ходов`;
            turnsContainer.appendChild(indicator);
        }

        if (this.allExpanded) {
            setTimeout(() => this.expandAllTurns(), 10);
        }

        setTimeout(() => {
            const currentTurn = turnsContainer.querySelector('details.history-turn[open]');
            if (currentTurn) {
                currentTurn.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }
        }, 100);
    }

    forceUpdate() {
        this.render();
    }
}

const historyUI = new HistoryUI();
export { historyUI as HistoryUI };