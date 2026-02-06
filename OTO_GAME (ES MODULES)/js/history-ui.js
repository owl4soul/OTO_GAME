// Модуль: HISTORY UI - Рендеринг истории ходов
'use strict';

import { State } from './3-state.js';
import { DOM } from './4-dom.js';
import { Utils } from './2-utils.js';

const dom = DOM.getDOM();

class HistoryUI {
    constructor() {
        this.initialized = false;
        this.lastRenderedTurn = 0;
    }
    
    initialize() {
        if (this.initialized) return;
        
        console.log('🎮 Инициализация HistoryUI...');
        
        // Подписываемся на события
        this.setupEventListeners();
        
        // Первоначальный рендер
        this.render();
        
        this.initialized = true;
        console.log('✅ HistoryUI инициализирован');
    }
    
    setupEventListeners() {
        State.on(State.EVENTS.TURN_COMPLETED, (data) => {
            console.log(`🔄 HistoryUI: TURN_COMPLETED, ход ${data?.turnCount || State.getState().turnCount}`);
            setTimeout(() => this.render(), 100);
        });
        
        State.on(State.EVENTS.SCENE_CHANGED, (data) => {
            console.log('🎯 HistoryUI: SCENE_CHANGED событие');
            setTimeout(() => this.render(), 50);
        });
        
        console.log('🔗 HistoryUI: подписки установлены');
    }
    
    formatAiMemory(aiMemory) {
        // Используем функцию из render.js (если нужно, можно перенести сюда)
        // Пока используем простую версию
        if (!aiMemory || typeof aiMemory !== 'object') {
            return '<div style="color: #888; font-style: italic;">Нет данных в памяти</div>';
        }
        
        const formatValue = (val, depth = 0) => {
            if (val === null || val === undefined) {
                return `<span style="color: #888; font-style: italic;">${val === null ? 'null' : 'undefined'}</span>`;
            }
            
            if (typeof val === 'boolean') {
                const color = val ? '#4cd137' : '#e84118';
                return `<span style="color: ${color};">${val}</span>`;
            }
            
            if (typeof val === 'number') {
                return `<span style="color: #fbc531;">${val}</span>`;
            }
            
            if (Array.isArray(val)) {
                return `<span style="color: #9c88ff; font-style: italic;">[${val.length} элементов]</span>`;
            }
            
            if (typeof val === 'string') {
                if (val.length > 100) {
                    return `<span style="color: #aaa;">"${val.substring(0, 100)}..."</span>`;
                }
                return `<span style="color: #ccc;">"${val}"</span>`;
            }
            
            if (typeof val === 'object') {
                return `<span style="color: #888; font-style: italic;">{объект}</span>`;
            }
            
            return JSON.stringify(val);
        };
        
        let html = '';
        Object.entries(aiMemory).forEach(([key, value]) => {
            html += `
                <div style="margin-left: 0; margin-bottom: 2px;">
                    <span style="color: #fbc531; font-weight: bold;">${key}:</span>
                    <span style="margin-left: 5px;">${formatValue(value)}</span>
                </div>
            `;
        });
        
        return html;
    }
    
    truncateToLines(text, maxLines) {
        if (!text) return '';
        
        const charsPerLine = 60;
        const maxChars = charsPerLine * maxLines;
        
        if (text.length <= maxChars) {
            return text;
        }
        
        return text.substring(0, maxChars) + '...';
    }
    
    render() {
        const state = State.getState();
        
        if (!dom.hist) {
            console.error('❌ HistoryUI: контейнер истории не найден');
            return;
        }
        
        dom.hist.innerHTML = '';
        
        // Если истории нет - показываем заглушку
        if (!state.gameState.history || state.gameState.history.length === 0) {
            dom.hist.innerHTML = `
                <div style="padding: 10px; text-align: center; color: #555; font-style: italic; font-size: 0.8em;">
                    История пуста. Сделайте первый ход.
                </div>
            `;
            return;
        }
        
        // Создаем контейнер для аккордеона истории
        const historyAccordion = document.createElement('div');
        historyAccordion.className = 'history-accordion';
        historyAccordion.style.cssText = `
            display: flex;
            flex-direction: column;
            gap: 3px;
        `;
        
        // Проходим по всей истории в обратном порядке
        const reversedHistory = [...state.gameState.history].reverse();
        
        reversedHistory.forEach((entry, reverseIndex) => {
            const originalIndex = state.gameState.history.length - 1 - reverseIndex;
            const turnNumber = originalIndex + 1;
            
            // Извлекаем summary
            let summary = '';
            if (reverseIndex === 0 && state.gameState.currentScene?.summary) {
                summary = state.gameState.currentScene.summary;
            } else if (entry.summary) {
                summary = entry.summary;
            } else if (entry.fullText) {
                summary = entry.fullText.replace(/<[^>]*>/g, ' ');
            } else {
                summary = 'Нет сводки';
            }
            
            // Обрезаем summary
            const truncatedSummary = this.truncateToLines(summary, 2);
            
            // Создаем элемент аккордеона
            const accordionItem = document.createElement('details');
            accordionItem.className = 'history-accordion-item';
            accordionItem.style.cssText = `
                background: linear-gradient(135deg, #0d0000 0%, #000000 100%);
                border: 1px solid #4a0a0a;
                border-radius: 3px;
                margin-bottom: 2px;
                font-size: 0.8em;
            `;
            
            // Открываем первый элемент (последний ход) по умолчанию
            if (reverseIndex === 0) {
                accordionItem.setAttribute('open', '');
            }
            
            // Заголовок
            const summary_html = document.createElement('summary');
            summary_html.style.cssText = `
                padding: 4px 6px;
                cursor: pointer;
                font-size: 0.8em;
                font-weight: bold;
                color: #e84118;
                user-select: none;
                list-style: none;
                display: flex;
                align-items: center;
                gap: 6px;
            `;
            summary_html.innerHTML = `
                <i class="fas fa-chevron-right" style="transition: transform 0.2s; font-size: 0.6em;"></i>
                <span style="flex: 1;">Ход ${turnNumber}: ${truncatedSummary}</span>
            `;
            
            // Анимация иконки
            accordionItem.addEventListener('toggle', () => {
                const icon = summary_html.querySelector('i');
                if (accordionItem.open) {
                    icon.style.transform = 'rotate(90deg)';
                } else {
                    icon.style.transform = 'rotate(0deg)';
                }
            });
            
            if (reverseIndex === 0) {
                summary_html.querySelector('i').style.transform = 'rotate(90deg)';
            }
            
            accordionItem.appendChild(summary_html);
            
            // Содержимое аккордеона
            const content = document.createElement('div');
            content.style.cssText = `
                padding: 4px 6px;
                border-top: 1px solid #4a0a0a;
                font-size: 0.75em;
            `;
            
            let contentHTML = '';
            
            // DESIGN_NOTES
            const design_notes = reverseIndex === 0 ? state.gameState.currentScene?.design_notes : entry.design_notes;
            if (design_notes && design_notes.trim() !== '') {
                contentHTML += `
                    <div style="margin-bottom: 4px; padding: 3px; background: #0a0000; border-left: 2px solid #666; border-radius: 2px;">
                        <div style="color: #888; font-size: 0.8em; font-style: italic; margin-bottom: 1px;">
                            <i class="fas fa-pencil-alt"></i> Заметки дизайнера:
                        </div>
                        <div style="color: #aaa; font-size: 0.85em; line-height: 1.2;">
                            ${design_notes}
                        </div>
                    </div>
                `;
            }
            
            // AI_MEMORY
            const aiMemory = reverseIndex === 0 ? state.gameState.currentScene?.aiMemory : entry.aiMemory;
            if (aiMemory && Object.keys(aiMemory).length > 0) {
                const memoryEntries = this.formatAiMemory(aiMemory);
                
                contentHTML += `
                    <div style="margin-bottom: 4px; padding: 3px; background: #0a0a00; border-left: 2px solid #fbc531; border-radius: 2px; max-height: 200px; overflow-y: auto;">
                        <div style="color: #fbc531; font-size: 0.8em; font-style: italic; margin-bottom: 1px;">
                            <i class="fas fa-brain"></i> Память ГМ:
                        </div>
                        <div style="color: #aaa; font-size: 0.85em; line-height: 1.2; font-family: 'Courier New', monospace;">
                            ${memoryEntries}
                        </div>
                    </div>
                `;
            }
            
            // SUMMARY
            if (summary && summary.trim() !== '') {
                contentHTML += `
                    <div style="margin-bottom: 4px; padding: 3px; background: #00000a; border-left: 2px solid #48dbfb; border-radius: 2px;">
                        <div style="color: #48dbfb; font-size: 0.8em; font-style: italic; margin-bottom: 1px;">
                            <i class="fas fa-file-alt"></i> Сводка:
                        </div>
                        <div style="color: #aaa; font-size: 0.85em; line-height: 1.2;">
                            ${summary}
                        </div>
                    </div>
                `;
            }
            
            // ОСНОВНОЙ ТЕКСТ СЦЕНЫ
            const sceneText = entry.fullText || entry.scene;
            if (sceneText && sceneText.trim() !== '') {
                contentHTML += `
                    <div style="margin-bottom: 4px; padding: 3px; background: #000; border-left: 2px solid #e84118; border-radius: 2px; max-height: 200px; overflow-y: auto;">
                        <div style="color: #e84118; font-size: 0.8em; font-style: italic; margin-bottom: 1px;">
                            <i class="fas fa-scroll"></i> Текст сцены:
                        </div>
                        <div style="color: #aaa; font-size: 0.85em; line-height: 1.3; white-space: pre-wrap;">
                            ${sceneText}
                        </div>
                    </div>
                `;
            }
            
            // REFLECTION
            const reflection = reverseIndex === 0 ? state.gameState.currentScene?.reflection : entry.reflection;
            if (reflection && reflection.trim() !== '') {
                contentHTML += `
                    <div style="margin-bottom: 4px; padding: 3px; background: #00000a; border-left: 2px solid #48dbfb; border-radius: 2px;">
                        <div style="color: #48dbfb; font-size: 0.8em; font-style: italic; margin-bottom: 1px;">
                            <i class="fas fa-eye"></i> Рефлексия:
                        </div>
                        <div style="color: #aaa; font-size: 0.85em; line-height: 1.2;">
                            ${reflection}
                        </div>
                    </div>
                `;
            }
            
            // PERSONALITY
            const personality = reverseIndex === 0 ?
                (state.gameState.currentScene?.personality || State.getGameItemValue('personality:hero')) :
                entry.personality;
            if (personality && personality.trim() !== '') {
                contentHTML += `
                    <div style="margin-bottom: 4px; padding: 3px; background: #000a00; border-left: 2px solid #4cd137; border-radius: 2px;">
                        <div style="color: #4cd137; font-size: 0.8em; font-style: italic; margin-bottom: 1px;">
                            <i class="fas fa-user-circle"></i> Личность:
                        </div>
                        <div style="color: #aaa; font-size: 0.85em; line-height: 1.2;">
                            ${personality}
                        </div>
                    </div>
                `;
            }
            
            // Typology
            const typology = reverseIndex === 0 ? state.gameState.currentScene?.typology : entry.typology;
            if (typology && typology.trim() !== '') {
                contentHTML += `
                    <div style="margin-bottom: 4px; padding: 3px; background: #000a00; border-left: 2px solid #9c88ff; border-radius: 2px;">
                        <div style="color: #9c88ff; font-size: 0.8em; font-style: italic; margin-bottom: 1px;">
                            <i class="fas fa-fingerprint"></i> Типология:
                        </div>
                        <div style="color: #aaa; font-size: 0.85em; line-height: 1.2;">
                            ${typology}
                        </div>
                    </div>
                `;
            }
            
            // Действия
            const actions = entry.actionResults || [];
            if (actions && actions.length > 0) {
                contentHTML += `
                    <div style="margin-bottom: 4px;">
                        <div style="color: #9c88ff; font-size: 0.8em; font-weight: bold; margin-bottom: 2px; padding-bottom: 2px; border-bottom: 1px solid #9c88ff40;">
                            <i class="fas fa-hand-point-right"></i> Действия:
                        </div>
                `;
                
                actions.forEach(action => {
                    const isSuccess = action.success;
                    const isPartial = action.partial_success;
                    
                    let statusColor, statusBg, statusIcon, statusText;
                    
                    if (isSuccess && !isPartial) {
                        statusColor = '#4cd137';
                        statusBg = 'rgba(76, 209, 55, 0.1)';
                        statusIcon = '<i class="fas fa-check"></i>';
                        statusText = 'УСПЕХ';
                    } else if (isPartial) {
                        statusColor = '#fbc531';
                        statusBg = 'rgba(251, 197, 49, 0.1)';
                        statusIcon = '<i class="fas fa-exclamation-triangle"></i>';
                        statusText = 'ЧАСТИЧНЫЙ УСПЕХ';
                    } else {
                        statusColor = '#e84118';
                        statusBg = 'rgba(232, 65, 24, 0.1)';
                        statusIcon = '<i class="fas fa-times"></i>';
                        statusText = 'ПРОВАЛ';
                    }
                    
                    contentHTML += `
                        <div class="simplified-action" style="padding: 2px 4px; margin: 1px 0; background: ${statusBg}; border-left: 3px solid ${statusColor}; border-radius: 2px; font-size: 0.75em;">
                            <span style="color: ${statusColor}; font-weight: bold;">${statusIcon} ${statusText}:</span>
                            <span style="color: #ddd; margin-left: 4px;">${action.text}</span>
                        </div>
                    `;
                });
                
                contentHTML += `</div>`;
            } else if (entry.choice) {
                contentHTML += `
                    <div class="simplified-action" style="padding: 2px 4px; margin: 1px 0; background: rgba(156, 136, 255, 0.1); border-left: 3px solid #9c88ff; border-radius: 2px; font-size: 0.75em;">
                        <span style="color: #9c88ff; font-weight: bold;"><i class="fas fa-hand-point-right"></i> ВЫБОР:</span>
                        <span style="color: #ddd; margin-left: 4px;">${entry.choice}</span>
                    </div>
                `;
            }
            
            // Изменения характеристик
            const changesText = entry.changes || '';
            if (changesText && changesText !== 'Нет явных изменений') {
                contentHTML += `
                    <div style="margin-top: 4px;">
                        <div style="color: #4cd137; font-size: 0.8em; font-weight: bold; margin-bottom: 2px; padding-bottom: 2px; border-bottom: 1px solid #4cd13740;">
                            <i class="fas fa-exchange-alt"></i> Изменения:
                        </div>
                        <div style="font-size: 0.75em; color: #ccc; line-height: 1.2; padding: 2px 0;">
                            ${changesText}
                        </div>
                    </div>
                `;
            }
            
            content.innerHTML = contentHTML;
            accordionItem.appendChild(content);
            historyAccordion.appendChild(accordionItem);
        });
        
        dom.hist.appendChild(historyAccordion);
        console.log('✅ HistoryUI: история отрендерена');
    }
    
    forceUpdate() {
        console.log('🔄 HistoryUI: принудительное обновление');
        this.render();
    }
}

// Создаем и экспортируем синглтон
const historyUI = new HistoryUI();
export { historyUI as HistoryUI };