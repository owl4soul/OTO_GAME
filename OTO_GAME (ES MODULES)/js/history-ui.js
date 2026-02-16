// Модуль: HISTORY UI - Рендеринг истории ходов (супер-компактный, плотный)
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
        dom.hist.style.cssText = `
            height:100%;
            overflow-y:auto;
            overflow-x:hidden;
            padding:0;
            margin:0;
        `;
        
        this.container = dom.hist;
        
        const header = document.createElement('div');
        header.style.cssText = `
            position:sticky;
            top:0;
            z-index:10;
            background:#111;
            padding:3px 6px;
            border-bottom:1px solid #e84118;
            margin-bottom:2px;
            display:flex;
            justify-content:space-between;
            align-items:center;
            font-size:0.75em;
        `;
        
        header.innerHTML = `
            <div style="display:flex;align-items:center;gap:4px;">
                <i class="fas fa-history" style="color:#e84118;font-size:0.8em;"></i>
                <span style="color:#ddd;font-weight:bold;">ИСТОРИЯ</span>
            </div>
            <div style="display:flex;gap:2px;">
                <button id="expandAllHistory" title="Развернуть все" style="background:rgba(76,209,55,0.1);border:1px solid #4cd137;color:#4cd137;padding:1px 3px;border-radius:2px;cursor:pointer;font-size:0.6em;min-width:20px;">
                    <i class="fas fa-expand-alt" style="font-size:0.7em;"></i>
                </button>
                <button id="collapseAllHistory" title="Свернуть все" style="background:rgba(232,65,24,0.1);border:1px solid #e84118;color:#e84118;padding:1px 3px;border-radius:2px;cursor:pointer;font-size:0.6em;min-width:20px;">
                    <i class="fas fa-compress-alt" style="font-size:0.7em;"></i>
                </button>
            </div>
        `;
        
        this.container.appendChild(header);
        
        const turnsContainer = document.createElement('div');
        turnsContainer.id = 'historyTurnsContainer';
        turnsContainer.style.cssText = `
            padding:2px 0;
            display:flex;
            flex-direction:column;
            gap:1px;
        `;
        this.container.appendChild(turnsContainer);
        
        setTimeout(() => {
            const expandBtn = document.getElementById('expandAllHistory');
            const collapseBtn = document.getElementById('collapseAllHistory');
            if (expandBtn) expandBtn.onclick = () => this.expandAllTurns();
            if (collapseBtn) collapseBtn.onclick = () => this.collapseAllTurns();
        }, 100);
    }
    
    setupEventListeners() {
        State.on(State.EVENTS.TURN_COMPLETED, () => {
            setTimeout(() => this.render(), 100);
        });
        
        State.on(State.EVENTS.SCENE_CHANGED, () => {
            setTimeout(() => this.render(), 50);
        });
        
        State.on(State.EVENTS.GAME_STATE_UPDATED, (data) => {
            if (data?.historyUpdated) {
                setTimeout(() => this.render(), 50);
            }
        });
    }
    
    /**
     * Создает элемент хода со ВСЕМИ секциями
     */
    createTurnElement(entry, index, isCurrent) {
        const turnNumber = index + 1;
        const summary = entry.summary || entry.fullText || entry.scene || 'Без сводки';
        const collapsedSummary = this.truncateForCollapsed(summary, this.COLLAPSED_CHAR_LIMIT);
        
        let accentColor = '#555';
        if (entry.actionResults && Array.isArray(entry.actionResults)) {
            const hasSuccess = entry.actionResults.some(a => a.success && !a.partial_success);
            const hasFailure = entry.actionResults.some(a => !a.success);
            if (hasSuccess && !hasFailure) accentColor = '#4cd137';
            else if (hasFailure && !hasSuccess) accentColor = '#e84118';
            else if (hasSuccess && hasFailure) accentColor = '#fbc531';
        }
        
        // Основной элемент
        const details = document.createElement('details');
        details.className = 'history-turn';
        details.style.cssText = `
            background:#0a0a0a;
            border:0.5px solid ${accentColor}30;
            border-left:2px solid ${accentColor};
            margin:0 2px 1px 2px;
            font-size:0.7em;
            overflow:hidden;
        `;
        
        if (isCurrent) details.setAttribute('open', '');
        
        // ЗАГОЛОВОК
        const summaryElem = document.createElement('summary');
        summaryElem.style.cssText = `
            padding:2px 4px;
            cursor:pointer;
            user-select:none;
            list-style:none;
            color:#ddd;
            background:rgba(0,0,0,0.3);
            line-height:1.2;
        `;
        
        const timestamp = entry.timestamp || '';
        const timeOnly = timestamp.split(' ')[1] || '';
        const actionCount = entry.actionResults?.length || 0;
        
        summaryElem.innerHTML = `
            <div style="display:flex;align-items:center;gap:3px;margin-bottom:1px;">
                <i class="fas fa-chevron-right" style="transition:transform 0.2s;font-size:0.5em;color:${accentColor};width:6px;"></i>
                <span style="color:${accentColor};font-weight:bold;font-size:0.8em;">Ход ${turnNumber}</span>
            </div>
            <div style="display:flex;justify-content:space-between;font-size:0.65em;">
                <span style="color:#aaa;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${Utils.escapeHtml(collapsedSummary)}">
                    ${Utils.escapeHtml(collapsedSummary)}
                </span>
                <span style="color:#666;margin-left:4px;white-space:nowrap;">
                    ${actionCount} ${this.getActionWord(actionCount)}
                </span>
            </div>
            ${timeOnly ? `<div style="text-align:right;font-size:0.6em;color:#555;margin-top:1px;">${timeOnly}</div>` : ''}
        `;
        
        details.addEventListener('toggle', () => {
            const icon = summaryElem.querySelector('i');
            icon.style.transform = details.open ? 'rotate(90deg)' : 'rotate(0deg)';
        });
        
        if (isCurrent) {
            summaryElem.querySelector('i').style.transform = 'rotate(90deg)';
        }
        
        details.appendChild(summaryElem);
        
        // === ВСЕ СЕКЦИИ СОДЕРЖИМОГО ===
        const content = document.createElement('div');
        content.style.cssText = `
            padding:3px;
            border-top:0.5px solid rgba(255,255,255,0.05);
            background:rgba(0,0,0,0.2);
            font-size:0.75em;
            white-space:normal;
            word-wrap:break-word;
            overflow-wrap:break-word;
        `;
        
        let contentHTML = '<div style="display:flex;flex-direction:column;gap:2px;">';
        
        // 1. ЗАМЕТКИ ДИЗАЙНЕРА
        if (entry.design_notes && entry.design_notes.trim() !== '') {
            contentHTML += this.createBlock(
                'Заметки дизайнера',
                entry.design_notes,
                '#666',
                'fa-pencil-alt'
            );
        }
        
        // 2. ПАМЯТЬ ГМ (компактно)
        if (entry.aiMemory && typeof entry.aiMemory === 'object' && Object.keys(entry.aiMemory).length > 0) {
            contentHTML += this.createMemoryBlock(entry.aiMemory);
        }
        
        // 3. СВОДКА
        if (summary && summary.trim() !== '' && summary !== 'Без сводки') {
            contentHTML += this.createBlock(
                'Сводка',
                summary,
                '#48dbfb',
                'fa-file-alt'
            );
        }
        
        // 4. ТЕКСТ СЦЕНЫ
        const sceneText = entry.fullText || entry.scene;
        if (sceneText && sceneText.trim() !== '') {
            contentHTML += this.createBlock(
                'Текст сцены',
                sceneText,
                '#e84118',
                'fa-scroll'
            );
        }
        
        // 5. РЕФЛЕКСИЯ
        if (entry.reflection && entry.reflection.trim() !== '') {
            contentHTML += this.createBlock(
                'Рефлексия',
                entry.reflection,
                '#48dbfb',
                'fa-eye',
                true
            );
        }
        
        // 6. ЛИЧНОСТЬ
        if (entry.personality && entry.personality.trim() !== '') {
            contentHTML += this.createBlock(
                'Личность',
                entry.personality,
                '#4cd137',
                'fa-user-circle'
            );
        }
        
        // 7. ТИПОЛОГИЯ
        if (entry.typology && entry.typology.trim() !== '') {
            contentHTML += this.createBlock(
                'Типология',
                entry.typology,
                '#9c88ff',
                'fa-fingerprint'
            );
        }
        
        // 8. ДЕЙСТВИЯ
        if (entry.actionResults && Array.isArray(entry.actionResults) && entry.actionResults.length > 0) {
            contentHTML += this.createActionsBlock(entry.actionResults);
        } else if (entry.choice) {
            contentHTML += `
                <div style="padding:2px;background:rgba(156,136,255,0.05);border-left:1px solid #9c88ff;">
                    <div style="color:#9c88ff;font-size:0.7em;margin-bottom:1px;display:flex;align-items:center;gap:4px;">
                        <i class="fas fa-hand-point-right" style="font-size:0.6em;"></i> Выбор
                    </div>
                    <div style="color:#ddd;font-size:0.75em;">
                        ${Utils.escapeHtml(entry.choice)}
                    </div>
                </div>
            `;
        }
        
        // 9. ИЗМЕНЕНИЯ ХАРАКТЕРИСТИК
        if (entry.changes && entry.changes !== 'Нет явных изменений') {
            contentHTML += this.createBlock(
                'Изменения',
                entry.changes,
                '#4cd137',
                'fa-exchange-alt'
            );
        }
        
        contentHTML += '</div>';
        content.innerHTML = contentHTML;
        
        // Стиль для параграфов
        const style = document.createElement('style');
        style.textContent = `
            .text-paragraph {
                margin:0;
                padding:0;
                white-space:pre-wrap;
                word-wrap:break-word;
                overflow-wrap:break-word;
            }
            .text-paragraph + .text-paragraph {
                margin-top:2px;
            }
        `;
        content.appendChild(style);
        
        details.appendChild(content);
        return details;
    }
    
    /**
     * Создает блок памяти ГМ
     */
    createMemoryBlock(aiMemory) {
        const entries = Object.entries(aiMemory);
        if (entries.length === 0) return '';
        
        let html = '<div style="display:flex;flex-wrap:wrap;gap:2px;font-size:0.7em;">';
        
        entries.slice(0, 4).forEach(([key, value]) => {
            let displayValue = '';
            let color = '#aaa';
            
            if (value === null || value === undefined) {
                displayValue = 'null';
                color = '#888';
            } else if (typeof value === 'boolean') {
                displayValue = value ? '✓' : '✗';
                color = value ? '#4cd137' : '#e84118';
            } else if (typeof value === 'number') {
                displayValue = value;
                color = '#fbc531';
            } else if (Array.isArray(value)) {
                displayValue = `[${value.length}]`;
                color = '#9c88ff';
            } else if (typeof value === 'string') {
                const safeValue = Utils.escapeHtml(value);
                displayValue = value.length > 15 ? `"${safeValue.substring(0,15)}..."` : `"${safeValue}"`;
                color = '#ccc';
            } else if (typeof value === 'object') {
                displayValue = `{${Object.keys(value).length}}`;
                color = '#48dbfb';
            }
            
            const safeKey = Utils.escapeHtml(key.length > 8 ? key.substring(0,8) + '...' : key);
            
            html += `<span style="background:rgba(0,0,0,0.2);padding:1px 2px;border-radius:1px;border-left:1px solid ${color};">
                <span style="color:#fbc531;">${safeKey}</span>
                <span style="color:${color};margin-left:1px;">${displayValue}</span>
            </span>`;
        });
        
        if (entries.length > 4) {
            html += `<span style="color:#666;font-size:0.65em;padding:1px 2px;">+${entries.length-4}</span>`;
        }
        
        html += '</div>';
        
        return `
            <div style="padding:2px;background:rgba(251,197,49,0.03);border-left:1px solid #fbc531;">
                <div style="color:#fbc531;font-size:0.7em;margin-bottom:1px;display:flex;align-items:center;gap:4px;">
                    <i class="fas fa-brain" style="font-size:0.6em;"></i> Память ГМ (${entries.length})
                </div>
                ${html}
            </div>
        `;
    }
    
    /**
     * Создает блок действий
     */
    createActionsBlock(actions) {
        let html = '<div style="display:flex;flex-direction:column;gap:1px;">';
        
        actions.forEach(action => {
            const isSuccess = action.success;
            const isPartial = action.partial_success;
            
            let color, bgColor, icon;
            
            if (isSuccess && !isPartial) {
                color = '#4cd137';
                bgColor = 'rgba(76,209,55,0.1)';
                icon = '✓';
            } else if (isPartial) {
                color = '#fbc531';
                bgColor = 'rgba(251,197,49,0.1)';
                icon = '⚠';
            } else {
                color = '#e84118';
                bgColor = 'rgba(232,65,24,0.1)';
                icon = '✗';
            }
            
            const actionText = action.text || 'Действие';
            const shortText = actionText.length > 60 ? actionText.substring(0,60) + '...' : actionText;
            
            html += `
                <div style="padding:1px 2px;background:${bgColor};border-left:2px solid ${color};border-radius:1px;font-size:0.75em;">
                    <span style="color:${color};font-weight:bold;">${icon}</span>
                    <span style="color:#ddd;margin-left:2px;">${Utils.escapeHtml(shortText)}</span>
                </div>
            `;
        });
        
        html += '</div>';
        
        return `
            <div style="padding:2px;background:rgba(156,136,255,0.03);border-left:1px solid #9c88ff;">
                <div style="color:#9c88ff;font-size:0.7em;margin-bottom:1px;display:flex;align-items:center;gap:4px;">
                    <i class="fas fa-hand-point-right" style="font-size:0.6em;"></i> Действия (${actions.length})
                </div>
                ${html}
            </div>
        `;
    }
    
    /**
     * Создает стандартный текстовый блок
     */
    createBlock(title, content, color, icon, italic = false) {
        const formattedContent = this.formatTextWithParagraphs(content);
        if (!formattedContent) return '';
        
        return `
            <div style="padding:2px;background:rgba(${this.hexToRgb(color)},0.03);border-left:1px solid ${color};">
                <div style="color:${color};font-size:0.7em;margin-bottom:1px;display:flex;align-items:center;gap:4px;">
                    <i class="fas ${icon}" style="font-size:0.6em;"></i> ${title}
                </div>
                <div style="color:#ccc;font-size:0.75em;line-height:1.2;${italic ? 'font-style:italic;' : ''}">
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
    
    hexToRgb(hex) {
        hex = hex.replace('#', '');
        const r = parseInt(hex.substring(0,2), 16);
        const g = parseInt(hex.substring(2,4), 16);
        const b = parseInt(hex.substring(4,6), 16);
        return `${r},${g},${b}`;
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
        const state = State.getState();
        const turnsContainer = document.getElementById('historyTurnsContainer');
        if (!turnsContainer) return;
        
        if (!state.gameState.history || state.gameState.history.length === 0) {
            turnsContainer.innerHTML = `
                <div style="padding:10px;text-align:center;color:#555;font-size:0.75em;font-style:italic;">
                    <i class="fas fa-history" style="font-size:1.5em;margin-bottom:5px;display:block;opacity:0.3;"></i>
                    История пуста
                </div>
            `;
            return;
        }
        
        turnsContainer.innerHTML = '';
        
        const recentHistory = state.gameState.history.slice(-this.MAX_VISIBLE_TURNS);
        const reversedHistory = [...recentHistory].reverse();
        
        reversedHistory.forEach((entry, reverseIndex) => {
            const originalIndex = recentHistory.length - 1 - reverseIndex;
            const isCurrent = (originalIndex === recentHistory.length - 1);
            
            const turnElement = this.createTurnElement(entry, originalIndex, isCurrent);
            turnsContainer.appendChild(turnElement);
        });
        
        const totalTurns = state.gameState.history.length;
        if (totalTurns > this.MAX_VISIBLE_TURNS) {
            const indicator = document.createElement('div');
            indicator.style.cssText = `
                padding:2px 4px;
                margin:1px 2px;
                background:rgba(232,65,24,0.05);
                border-left:1px solid #e84118;
                border-radius:1px;
                font-size:0.65em;
                color:#888;
                text-align:center;
            `;
            indicator.innerHTML = `Последние ${this.MAX_VISIBLE_TURNS} из ${totalTurns} ходов`;
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