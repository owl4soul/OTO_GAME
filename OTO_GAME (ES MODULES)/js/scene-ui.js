/**
 * Модуль: SCENE UI - Рендеринг мета-блоков сцены (заметки, память ГМ, сводка, рефлексия, личность, типология)
 * Все стили берутся из темы через CSS-классы. Инлайн-стили не используются.
 */

'use strict';

import { State } from './3-state.js';
import { Utils } from './2-utils.js';
import { themeManagerPro } from './theme/theme-pro.js';

// ====================================================================
// ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ДЛЯ РЕНДЕРИНГА ПАМЯТИ ГМ
// ====================================================================

/**
 * Рекурсивно подсчитывает общее количество всех ключей в объекте (включая вложенные структуры)
 * @param {Object|Array} obj - Объект или массив для подсчета
 * @param {Set} visited - Множество уже посещенных объектов (для предотвращения циклов)
 * @returns {number} Общее количество ключей/элементов
 */
function countKeysRecursive(obj, visited = new Set()) {
    if (obj === null || obj === undefined || typeof obj !== 'object') {
        return 0;
    }
    
    if (visited.has(obj)) {
        return 0;
    }
    visited.add(obj);
    
    let totalCount = 0;
    
    if (Array.isArray(obj)) {
        totalCount = obj.length;
        for (let i = 0; i < obj.length; i++) {
            totalCount += countKeysRecursive(obj[i], visited);
        }
    } else {
        const keys = Object.keys(obj);
        totalCount = keys.length;
        for (let i = 0; i < keys.length; i++) {
            totalCount += countKeysRecursive(obj[keys[i]], visited);
        }
    }
    
    return totalCount;
}

/**
 * Рекурсивно отображает объект aiMemory на всю глубину
 * ВАЖНО: Полностью раскрывает массивы и вложенные объекты без сокращений
 * @param {any} obj - Значение для отображения (любого типа)
 * @param {number} depth - Текущая глубина вложенности (для отступов)
 * @returns {string} HTML-строка с отформатированным представлением объекта
 */
function renderAiMemoryRecursive(obj, depth = 0) {
    if (obj === null) {
        return `<div style="margin-left: ${depth * 20}px; color: #888; font-style: italic;">null</div>`;
    }
    
    if (obj === undefined) {
        return `<div style="margin-left: ${depth * 20}px; color: #888; font-style: italic;">undefined</div>`;
    }
    
    if (Array.isArray(obj)) {
        if (obj.length === 0) {
            return `<div style="margin-left: ${depth * 20}px; color: #9c88ff; font-style: italic;">[] (пустой массив)</div>`;
        }
        
        let html = `<div style="margin-left: ${depth * 20}px; color: #9c88ff; font-weight: bold;">
            [ Массив: ${obj.length} элементов ]
        </div>`;
        
        for (let i = 0; i < obj.length; i++) {
            const element = obj[i];
            
            html += `<div style="margin-left: ${(depth + 1) * 20}px; color: #9c88ff;">
                <span style="color: #fbc531; font-weight: bold;">[${i}]:</span>
            </div>`;
            
            html += renderAiMemoryRecursive(element, depth + 2);
        }
        
        return html;
    }
    
    if (typeof obj !== 'object') {
        let value = obj;
        let color = '#ccc';
        let additionalStyle = '';
        let displayValue = '';
        
        if (typeof obj === 'boolean') {
            color = obj ? '#4cd137' : '#e84118';
            value = obj ? 'true' : 'false';
            displayValue = `<span style="color: ${color}; font-weight: bold;">${value}</span>`;
        } 
        else if (typeof obj === 'number') {
            color = '#fbc531';
            displayValue = `<span style="color: ${color};">${value}</span>`;
        }
        else if (typeof obj === 'string') {
            if (obj.length > 500) {
                additionalStyle = 'max-height: 200px; overflow-y: auto; background: rgba(0,0,0,0.1); padding: 5px; border-radius: 3px;';
                displayValue = `<div style="${additionalStyle}"><span style="color: ${color}; white-space: pre-wrap; word-break: break-all;">${Utils.escapeHtml(obj)}</span></div>`;
            } else {
                displayValue = `<span style="color: ${color};">${Utils.escapeHtml(value)}</span>`;
            }
        }
        else {
            color = '#ff9ff3';
            displayValue = `<span style="color: ${color}; font-style: italic;">${String(value)}</span>`;
        }
        
        if (!additionalStyle) {
            return `<div style="margin-left: ${depth * 20}px;">
                ${displayValue}
            </div>`;
        } else {
            return `<div style="margin-left: ${depth * 20}px;">
                ${displayValue}
            </div>`;
        }
    }
    
    const entries = Object.entries(obj);
    
    if (entries.length === 0) {
        return `<div style="margin-left: ${depth * 20}px; color: #888; font-style: italic;">{} (пустой объект)</div>`;
    }
    
    let html = `<div style="margin-left: ${depth * 20}px; color: #aaa; font-weight: bold;">
        { Объект: ${entries.length} полей }
    </div>`;
    
    for (let i = 0; i < entries.length; i++) {
        const [key, value] = entries[i];
        
        const keyHtml = `<span style="color: #fbc531; font-weight: bold;">${Utils.escapeHtml(key)}:</span>`;
        
        const isValuePrimitive = (value === null || value === undefined || 
                                 typeof value !== 'object' || 
                                 (typeof value === 'object' && 
                                  !Array.isArray(value) && 
                                  Object.keys(value).length === 0));
        
        if (isValuePrimitive) {
            html += `<div style="margin-left: ${(depth + 1) * 20}px;">
                ${keyHtml} ${renderAiMemoryRecursive(value, 0)}
            </div>`;
        } else {
            html += `<div style="margin-left: ${(depth + 1) * 20}px;">
                ${keyHtml}
            </div>`;
            html += renderAiMemoryRecursive(value, depth + 2);
        }
    }
    
    return html;
}

/**
 * Форматирует aiMemory для отображения с заголовком и статистикой
 * @param {Object} aiMemory - Объект памяти ГМ
 * @returns {string} HTML-строка с отформатированной памятью
 */
function formatAiMemory(aiMemory) {
    if (!aiMemory || typeof aiMemory !== 'object') {
        return '<div style="color: #888; font-style: italic; padding: 10px; text-align: center;">Нет данных в памяти ГМ</div>';
    }
    
    const totalKeys = countKeysRecursive(aiMemory);
    const isComplex = totalKeys > 50;
    
    const memoryInfo = `<div style="color: #aaa; font-size: 0.8em; margin-bottom: 10px; padding: 8px; background: rgba(251, 197, 49, 0.05); border-radius: 3px; border: 1px solid rgba(251, 197, 49, 0.1);">
        <i class="fas fa-info-circle"></i> Память ГМ содержит: <strong style="color: #fbc531;">${totalKeys}</strong> ключей/элементов
        ${isComplex ? '<span style="color: #ff9ff3; margin-left: 10px;"><i class="fas fa-exclamation-triangle"></i> Сложная структура</span>' : ''}
    </div>`;
    
    const memoryContent = renderAiMemoryRecursive(aiMemory);
    
    return memoryInfo + memoryContent;
}

/**
 * Добавляет функциональность сворачивания/разворачивания для блока памяти ГМ
 */
function makeAiMemoryCollapsible() {
    setTimeout(() => {
        const aiMemoryBlocks = document.querySelectorAll('.ai-memory-block');
        
        aiMemoryBlocks.forEach((block, index) => {
            const header = block.querySelector('.ai-memory-header');
            if (!header) return;
            
            if (header.querySelector('.memory-toggle-btn')) {
                return;
            }
            
            const toggleBtn = document.createElement('span');
            toggleBtn.className = 'memory-toggle-btn';
            toggleBtn.innerHTML = '<i class="fas fa-chevron-down"></i>';
            toggleBtn.style.cssText = `
                cursor: pointer;
                margin-right: 8px;
                color: #fbc531;
                transition: transform 0.3s ease;
                display: inline-flex;
                align-items: center;
                justify-content: center;
                width: 16px;
                height: 16px;
            `;
            
            const contentDiv = block.querySelector('.ai-memory-content');
            if (!contentDiv) return;
            
            // Сохраняем оригинальную высоту (если была задана)
            const originalMaxHeight = contentDiv.style.maxHeight || '400px';
            let isExpanded = true;
            
            toggleBtn.onclick = (event) => {
                event.stopPropagation();
                isExpanded = !isExpanded;
                
                if (isExpanded) {
                    contentDiv.style.maxHeight = originalMaxHeight;
                    contentDiv.style.overflowY = 'auto';
                    toggleBtn.innerHTML = '<i class="fas fa-chevron-down"></i>';
                    toggleBtn.style.transform = 'rotate(0deg)';
                } else {
                    contentDiv.style.maxHeight = '0px';
                    contentDiv.style.overflowY = 'hidden';
                    toggleBtn.innerHTML = '<i class="fas fa-chevron-right"></i>';
                    toggleBtn.style.transform = 'rotate(0deg)';
                }
            };
            
            header.insertBefore(toggleBtn, header.firstChild);
            toggleBtn.title = 'Свернуть/развернуть память ГМ';
        });
    }, 150);
}

// ====================================================================
// ФУНКЦИИ РЕНДЕРИНГА ОТДЕЛЬНЫХ СЕКЦИЙ СЦЕНЫ (используют только классы)
// ====================================================================

/**
 * Рендерит блок "Заметки дизайнера"
 * @param {HTMLElement} container - родительский контейнер
 * @param {string} designNotes - текст заметок
 */
export function renderDesignNotes(container, designNotes) {
    if (!designNotes || designNotes.trim() === '') return;

    const block = document.createElement('div');
    block.className = 'scene-meta-block design-notes-block';

    block.innerHTML = `
        <div class="design-notes-title">
            <i class="fas fa-pencil-alt"></i> Заметки дизайнера
        </div>
        <div class="design-notes-content">
            ${Utils.escapeHtml(designNotes).replace(/\n/g, '<br>')}
        </div>
    `;

    container.appendChild(block);
}

/**
 * Рендерит блок "Память ГМ"
 * @param {HTMLElement} container - родительский контейнер
 * @param {Object} aiMemory - объект памяти
 */
export function renderAiMemory(container, aiMemory) {
    if (!aiMemory || typeof aiMemory !== 'object' || Object.keys(aiMemory).length === 0) {
        // Показываем заглушку, если нужно
        const emptyBlock = document.createElement('div');
        emptyBlock.className = 'scene-meta-block no-memory-block';
        emptyBlock.innerHTML = `
            <div style="color: #888; font-size: 0.85em; font-style: italic;">
                <i class="fas fa-brain"></i> Память ГМ пуста или отсутствует
            </div>
        `;
        container.appendChild(emptyBlock);
        return;
    }

    const memoryContent = formatAiMemory(aiMemory);

    const block = document.createElement('div');
    block.className = 'scene-meta-block ai-memory-block';

    block.innerHTML = `
        <div class="ai-memory-header">
            <i class="fas fa-brain"></i> ПАМЯТЬ ГМ:
            <span class="ai-memory-stats">${Object.keys(aiMemory).length} полей</span>
        </div>
        <div class="ai-memory-content">
            ${memoryContent}
        </div>
    `;

    container.appendChild(block);

    // Добавляем возможность сворачивания после рендеринга
    setTimeout(() => makeAiMemoryCollapsible(), 200);
}

/**
 * Рендерит блок "Сводка сцены"
 * @param {HTMLElement} container - родительский контейнер
 * @param {string} summary - текст сводки
 */
export function renderSummary(container, summary) {
    if (!summary || summary.trim() === '') return;

    const block = document.createElement('div');
    block.className = 'scene-meta-block summary-block';

    block.innerHTML = `
        <div class="summary-title">
            <i class="fas fa-file-alt"></i> Сводка сцены
        </div>
        <div class="summary-content">
            ${Utils.escapeHtml(summary).replace(/\n/g, '<br>')}
        </div>
    `;

    container.appendChild(block);
}

/**
 * Рендерит основной текст сцены
 * @param {HTMLElement} container - родительский контейнер
 * @param {string} sceneText - текст сцены
 */
export function renderSceneText(container, sceneText) {
    const block = document.createElement('div');
    block.className = 'scene-text-block';
    block.id = 'sceneText';

    if (sceneText && sceneText.trim() !== '') {
        // Получаем текущую тему (активную или редактируемую)
        const currentTheme = themeManagerPro.getCurrentTheme();
        const allowHtml = true;

        let contentHtml;
        if (allowHtml) {
            // Если разрешён HTML, не экранируем, но заменяем переносы строк на <br>
            // (предполагаем, что HTML уже корректный)
            contentHtml = sceneText.replace(/\n/g, '<br>');
        } else {
            // По умолчанию – экранируем и заменяем переносы
            contentHtml = Utils.escapeHtml(sceneText).replace(/\n/g, '<br>');
        }

        block.innerHTML = `
            <div class="scene-text-content">
                ${contentHtml}
            </div>
        `;
    } else {
        block.innerHTML = `
            <div class="scene-text-empty">
                <i class="fas fa-book"></i> Текст сцены отсутствует или пуст
            </div>
        `;
    }

    container.appendChild(block);
}

/**
 * Рендерит блок "Рефлексия"
 * @param {HTMLElement} container - родительский контейнер
 * @param {string} reflection - текст рефлексии
 */
export function renderReflection(container, reflection) {
    if (!reflection || reflection.trim() === '') return;

    const block = document.createElement('div');
    block.className = 'scene-meta-block reflection-block';
    block.id = 'sceneReflection';

    block.innerHTML = `
        <div class="reflection-title">
            <i class="fas fa-eye"></i> Рефлексия ГМ
        </div>
        <div class="reflection-content">
            ${Utils.escapeHtml(reflection).replace(/\n/g, '<br>')}
        </div>
    `;

    container.appendChild(block);
}

/**
 * Рендерит блок "Изменение личности"
 * @param {HTMLElement} container - родительский контейнер
 * @param {string} personality - текст личности
 */
export function renderPersonality(container, personality) {
    if (!personality || personality.trim() === '') return;

    const block = document.createElement('div');
    block.className = 'scene-meta-block personality-block';

    block.innerHTML = `
        <div class="personality-title">
            <i class="fas fa-user-circle"></i> Изменение личности персонажа
        </div>
        <div class="personality-content">
            ${Utils.escapeHtml(personality).replace(/\n/g, '<br>')}
        </div>
    `;

    container.appendChild(block);
}

/**
 * Рендерит блок "Типология"
 * @param {HTMLElement} container - родительский контейнер
 * @param {string} typology - текст типологии
 */
export function renderTypology(container, typology) {
    if (!typology || typology.trim() === '') return;

    const block = document.createElement('div');
    block.className = 'scene-meta-block typology-block';

    block.innerHTML = `
        <div class="typology-title">
            <i class="fas fa-fingerprint"></i> Типология персонажа
        </div>
        <div class="typology-content">
            ${Utils.escapeHtml(typology).replace(/\n/g, '<br>')}
        </div>
    `;

    container.appendChild(block);
}

/**
 * Рендерит дополнительные поля сцены (не входящие в стандартный набор)
 * @param {HTMLElement} container - родительский контейнер
 * @param {Object} currentScene - объект сцены
 * @param {Array<string>} knownFields - список известных полей (не рендерятся как дополнительные)
 */
export function renderAdditionalFields(container, currentScene, knownFields) {
    const additionalFields = Object.keys(currentScene).filter(key => 
        !knownFields.includes(key) && 
        currentScene[key] !== null && 
        currentScene[key] !== undefined && 
        currentScene[key] !== ''
    );

    additionalFields.forEach(field => {
        const value = currentScene[field];

        // Пропускаем массивы и сложные объекты (они уже обработаны в aiMemory)
        if (Array.isArray(value) || (typeof value === 'object' && value !== null)) {
            return;
        }

        const block = document.createElement('div');
        block.className = 'scene-meta-block additional-field-block';

        block.innerHTML = `
            <div class="additional-field-title">
                <i class="fas fa-info-circle"></i> ${Utils.escapeHtml(field)}
            </div>
            <div class="additional-field-content">
                ${Utils.escapeHtml(String(value)).replace(/\n/g, '<br>')}
            </div>
        `;

        container.appendChild(block);
    });
}