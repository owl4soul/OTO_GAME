// Модуль: SCENE UI - Рендеринг мета-блоков сцены (v6.1 — полностью согласован с Parser v6.1 + State 5.1)
// ====================================================================================

'use strict';

import { State } from './3-state.js';
import { Utils } from './2-utils.js';
import { themeManagerPro } from './theme/theme-pro.js';

// Глобальная переменная DOMPurify (подключена через CDN)
const DOMPurify = window.DOMPurify || {
    sanitize: (html) => {
        console.warn('DOMPurify не загружен. HTML вставляется без санитизации!');
        return html;
    }
};

// ====================================================================
// ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ДЛЯ РЕНДЕРИНГА ПАМЯТИ ГМ
// ====================================================================

/**
 * Рекурсивно подсчитывает общее количество всех ключей/элементов в объекте или массиве.
 * 
 * @param {any} obj - Объект, массив или примитив
 * @param {Set} visited - Множество уже посещенных объектов (защита от циклических ссылок)
 * @returns {number} Общее количество ключей/элементов
 */
function countKeysRecursive(obj, visited = new Set()) {
    // ШАГ 1: базовые случаи
    if (obj === null || obj === undefined) return 0;
    if (visited.has(obj)) return 0;
    visited.add(obj);
    
    // ШАГ 2: примитивы — одно значение
    if (typeof obj !== 'object') return 1;
    
    // ШАГ 3: массивы
    if (Array.isArray(obj)) {
        let total = obj.length;
        for (let i = 0; i < obj.length; i++) {
            total += countKeysRecursive(obj[i], visited);
        }
        return total;
    }
    
    // ШАГ 4: объекты
    const keys = Object.keys(obj);
    let total = keys.length;
    for (let i = 0; i < keys.length; i++) {
        total += countKeysRecursive(obj[keys[i]], visited);
    }
    return total;
}

/**
 * Рекурсивно отображает aiMemory на всю глубину с отступами и форматированием.
 * 
 * @param {any} obj - Значение для отображения (любого типа)
 * @param {number} depth - Текущая глубина вложенности
 * @returns {string} HTML-строка
 */
function renderAiMemoryRecursive(obj, depth = 0) {
    // ШАГ 1: null / undefined
    if (obj === null) {
        return `<div style="margin-left: ${depth * 20}px; color: #888; font-style: italic;">null</div>`;
    }
    if (obj === undefined) {
        return `<div style="margin-left: ${depth * 20}px; color: #888; font-style: italic;">undefined</div>`;
    }
    
    // ШАГ 2: массивы
    if (Array.isArray(obj)) {
        if (obj.length === 0) {
            return `<div style="margin-left: ${depth * 20}px; color: #9c88ff; font-style: italic;">[] (пустой массив)</div>`;
        }
        
        let html = `<div style="margin-left: ${depth * 20}px; color: #9c88ff; font-weight: bold;">
            [ Массив: ${obj.length} элементов ]
        </div>`;
        
        for (let i = 0; i < obj.length; i++) {
            html += `<div style="margin-left: ${(depth + 1) * 20}px; color: #9c88ff;">
                <span style="color: #fbc531; font-weight: bold;">[${i}]:</span>
            </div>`;
            html += renderAiMemoryRecursive(obj[i], depth + 2);
        }
        return html;
    }
    
    // ШАГ 3: примитивы
    if (typeof obj !== 'object') {
        let value = obj;
        let color = '#ccc';
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
            displayValue = `<span style="color: ${color}; white-space: pre-wrap; word-break: break-all;">${Utils.escapeHtml(value)}</span>`;
        }
        else {
            color = '#ff9ff3';
            displayValue = `<span style="color: ${color}; font-style: italic;">${String(value)}</span>`;
        }
        
        return `<div style="margin-left: ${depth * 20}px;">${displayValue}</div>`;
    }
    
    // ШАГ 4: объекты
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
            (typeof value === 'object' && !Array.isArray(value) && Object.keys(value).length === 0));
        
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
 * Форматирует aiMemory для отображения с заголовком и статистикой.
 * 
 * @param {any} aiMemory - Объект памяти ГМ
 * @returns {string} HTML-строка
 */
function formatAiMemory(aiMemory) {
    const isEmpty = Utils.isEmpty(aiMemory);
    if (isEmpty) {
        return '<div style="color: #888; font-style: italic; padding: 10px; text-align: center;">Память ГМ пуста</div>';
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
 * Добавляет кнопку сворачивания/разворачивания для блока памяти ГМ.
 */
function makeAiMemoryCollapsible() {
    setTimeout(() => {
        const aiMemoryBlocks = document.querySelectorAll('.ai-memory-block');
        
        aiMemoryBlocks.forEach((block) => {
            const header = block.querySelector('.ai-memory-header');
            if (!header || header.querySelector('.memory-toggle-btn')) return;
            
            const toggleBtn = document.createElement('span');
            toggleBtn.className = 'memory-toggle-btn';
            toggleBtn.innerHTML = '<i class="fas fa-chevron-down"></i>';
            toggleBtn.style.cssText = `cursor: pointer; margin-right: 8px; color: #fbc531; transition: transform 0.3s ease;`;
            
            const contentDiv = block.querySelector('.ai-memory-content');
            if (!contentDiv) return;
            
            const originalMaxHeight = contentDiv.style.maxHeight || '400px';
            let isExpanded = true;
            
            toggleBtn.onclick = (event) => {
                event.stopPropagation();
                isExpanded = !isExpanded;
                
                if (isExpanded) {
                    contentDiv.style.maxHeight = originalMaxHeight;
                    contentDiv.style.overflowY = 'auto';
                    toggleBtn.innerHTML = '<i class="fas fa-chevron-down"></i>';
                } else {
                    contentDiv.style.maxHeight = '0px';
                    contentDiv.style.overflowY = 'hidden';
                    toggleBtn.innerHTML = '<i class="fas fa-chevron-right"></i>';
                }
            };
            
            header.insertBefore(toggleBtn, header.firstChild);
        });
    }, 150);
}

// ====================================================================
// ФУНКЦИИ РЕНДЕРИНГА ОТДЕЛЬНЫХ СЕКЦИЙ СЦЕНЫ
// ====================================================================

/**
 * Рендерит блок "Заметки дизайнера".
 * 
 * @param {HTMLElement} container - родительский контейнер
 * @param {string} designNotes - текст заметок
 */
function renderDesignNotes(container, designNotes) {
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
 * Рендерит блок "Память ГМ".
 * 
 * Логика по шагам:
 * 1. Проверка на пустоту через Utils.isEmpty
 * 2. Если пусто — показываем плейсхолдер
 * 3. Если есть данные — считаем ключи + рекурсивный рендер
 * 4. Добавляем возможность сворачивания
 */
function renderAiMemory(container, aiMemory) {
    const isEmpty = Utils.isEmpty(aiMemory);
    
    if (isEmpty) {
        const emptyBlock = document.createElement('div');
        emptyBlock.className = 'scene-meta-block no-memory-block';
        emptyBlock.innerHTML = `
            <div class="ai-memory-header">
                <i class="fas fa-brain"></i> ПАМЯТЬ ГМ:
            </div>
            <div class="ai-memory-content" style="color: #888; font-style: italic; padding: 10px;">
                <i class="fas fa-database"></i> Память пуста или отсутствует
            </div>
        `;
        container.appendChild(emptyBlock);
        return;
    }
    
    const memoryHtml = formatAiMemory(aiMemory);
    
    const block = document.createElement('div');
    block.className = 'scene-meta-block ai-memory-block';
    
    block.innerHTML = `
        <div class="ai-memory-header">
            <i class="fas fa-brain"></i> ПАМЯТЬ ГМ:
            <span class="ai-memory-stats">${typeof aiMemory === 'object' ? Object.keys(aiMemory).length : '—'}</span>
        </div>
        <div class="ai-memory-content">
            ${memoryHtml}
        </div>
    `;
    
    container.appendChild(block);
    
    // ШАГ: добавляем сворачивание
    setTimeout(() => makeAiMemoryCollapsible(), 200);
}

/**
 * Рендерит блок "Сводка сцены".
 */
function renderSummary(container, summary) {
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
 * Рендерит основной текст сцены.
 * 
 * @param {HTMLElement} container - родительский контейнер
 * @param {string} sceneText - текст сцены (может содержать HTML)
 */
 function renderSceneText(container, sceneText) {
    const block = document.createElement('div');
    block.className = 'scene-text-block';
    block.id = 'sceneText';
    
    if (sceneText && sceneText.trim() !== '') {
        let contentHtml;
        
        // ШАГ 1: санитизация через DOMPurify
        if (DOMPurify && typeof DOMPurify.sanitize === 'function') {
            contentHtml = DOMPurify.sanitize(sceneText, {
                ALLOWED_TAGS: ['p','br','b','i','em','strong','div','span','h1','h2','h3','ul','ol','li','a','blockquote','pre','code'],
                ALLOWED_ATTR: ['href','target','class','id']
            });
        } else {
            contentHtml = Utils.escapeHtml(sceneText).replace(/\n/g, '<br>');
        }
        
        block.innerHTML = `<div class="scene-text-content">${contentHtml}</div>`;
    } else {
        block.innerHTML = `
            <div class="scene-text-empty">
                <i class="fas fa-book"></i> Текст сцены отсутствует
            </div>
        `;
    }
    
    container.appendChild(block);
}

/**
 * Рендерит блок "Рефлексия героя".
 */
function renderReflection(container, reflection) {
    if (!reflection || reflection.trim() === '') return;
    
    const block = document.createElement('div');
    block.className = 'scene-meta-block reflection-block';
    block.id = 'sceneReflection';
    
    block.innerHTML = `
        <div class="reflection-title">
            <i class="fas fa-eye"></i> Рефлексия героя
        </div>
        <div class="reflection-content">
            ${Utils.escapeHtml(reflection).replace(/\n/g, '<br>')}
        </div>
    `;
    
    container.appendChild(block);
}

/**
 * Рендерит блок "Изменение личности".
 */
function renderPersonality(container, personality) {
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
 * Рендерит блок "Типология".
 */
function renderTypology(container, typology) {
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
 * Рендерит дополнительные поля сцены (не входящие в стандартный набор).
 */
function renderAdditionalFields(container, currentScene, knownFields) {
    const additionalFields = Object.keys(currentScene).filter(key =>
        !knownFields.includes(key) &&
        currentScene[key] !== null &&
        currentScene[key] !== undefined &&
        currentScene[key] !== ''
    );
    
    additionalFields.forEach(field => {
        const value = currentScene[field];
        if (Array.isArray(value) || (typeof value === 'object' && value !== null)) return;
        
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

export {
    renderDesignNotes,
    renderAiMemory,
    renderSummary,
    renderSceneText,
    renderReflection,
    renderPersonality,
    renderTypology,
    renderAdditionalFields
};