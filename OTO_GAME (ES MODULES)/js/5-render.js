// Модуль 5: RENDER - Отрисовка сцены и мета-блоков
'use strict';

import { CONFIG } from './1-config.js';
import { State } from './3-state.js';
import { DOM } from './4-dom.js';
import { Utils } from './2-utils.js';
import { GameItemUI } from './gameitem-ui.js';
import { Game } from './6-game.js';

const dom = DOM.getDOM();
let thoughtsOfHeroInterval = null;

// ====================================================================
// ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ДЛЯ СЦЕНЫ
// ====================================================================

/**
 * Рекурсивно подсчитывает общее количество всех ключей в объекте (включая вложенные структуры)
 * @param {Object|Array} obj - Объект или массив для подсчета
 * @param {Set} visited - Множество уже посещенных объектов (для предотвращения циклов)
 * @returns {number} Общее количество ключей/элементов
 */
function countKeysRecursive(obj, visited = new Set()) {
    // Проверка на примитивные значения
    if (obj === null || obj === undefined || typeof obj !== 'object') {
        return 0;
    }
    
    // Защита от циклических ссылок
    if (visited.has(obj)) {
        return 0;
    }
    visited.add(obj);
    
    let totalCount = 0;
    
    if (Array.isArray(obj)) {
        // Для массивов: считаем элементы + рекурсивно обрабатываем каждый элемент
        totalCount = obj.length;
        for (let i = 0; i < obj.length; i++) {
            totalCount += countKeysRecursive(obj[i], visited);
        }
    } else {
        // Для объектов: считаем собственные ключи + рекурсивно обрабатываем значения
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
    // ====================================================================
    // ОБРАБОТКА СПЕЦИАЛЬНЫХ СЛУЧАЕВ: null, undefined
    // ====================================================================
    if (obj === null) {
        return `<div style="margin-left: ${depth * 20}px; color: #888; font-style: italic;">null</div>`;
    }
    
    if (obj === undefined) {
        return `<div style="margin-left: ${depth * 20}px; color: #888; font-style: italic;">undefined</div>`;
    }
    
    // ====================================================================
    // ОБРАБОТКА МАССИВОВ (ВАЖНО: ПОЛНОСТЬЮ РАСКРЫВАЕМ ВСЕ ЭЛЕМЕНТЫ!)
    // ====================================================================
    if (Array.isArray(obj)) {
        if (obj.length === 0) {
            // Пустой массив
            return `<div style="margin-left: ${depth * 20}px; color: #9c88ff; font-style: italic;">[] (пустой массив)</div>`;
        }
        
        // Начинаем блок массива
        let html = `<div style="margin-left: ${depth * 20}px; color: #9c88ff; font-weight: bold;">
            [ Массив: ${obj.length} элементов ]
        </div>`;
        
        // Рекурсивно отображаем КАЖДЫЙ элемент массива
        for (let i = 0; i < obj.length; i++) {
            const element = obj[i];
            
            // Заголовок элемента массива с индексом
            html += `<div style="margin-left: ${(depth + 1) * 20}px; color: #9c88ff;">
                <span style="color: #fbc531; font-weight: bold;">[${i}]:</span>
            </div>`;
            
            // Рекурсивный рендеринг элемента массива с увеличенной глубиной
            html += renderAiMemoryRecursive(element, depth + 2);
        }
        
        return html;
    }
    
    // ====================================================================
    // ОБРАБОТКА ПРИМИТИВНЫХ ТИПОВ (НЕ ОБЪЕКТОВ, НЕ МАССИВОВ)
    // ====================================================================
    if (typeof obj !== 'object') {
        let value = obj;
        let color = '#ccc'; // Цвет по умолчанию для строк
        let additionalStyle = '';
        let displayValue = '';
        
        // Определяем цвет и формат в зависимости от типа
        if (typeof obj === 'boolean') {
            color = obj ? '#4cd137' : '#e84118'; // Зеленый для true, красный для false
            value = obj ? 'true' : 'false';
            displayValue = `<span style="color: ${color}; font-weight: bold;">${value}</span>`;
        } 
        else if (typeof obj === 'number') {
            color = '#fbc531'; // Желтый для чисел
            displayValue = `<span style="color: ${color};">${value}</span>`;
        }
        else if (typeof obj === 'string') {
            // Для строк: проверяем длину, но ВСЕГДА показываем полное содержание!
            if (obj.length > 500) {
                // Для очень длинных строк показываем полное содержание с возможностью прокрутки
                additionalStyle = 'max-height: 200px; overflow-y: auto; background: rgba(0,0,0,0.1); padding: 5px; border-radius: 3px;';
                displayValue = `<div style="${additionalStyle}"><span style="color: ${color}; white-space: pre-wrap; word-break: break-all;">${(obj)}</span></div>`;
            } else {
                // Для обычных строк
                displayValue = `<span style="color: ${color};">${(value)}</span>`;
            }
        }
        else {
            // Для других примитивов (symbol, bigint, function)
            color = '#ff9ff3'; // Розовый для редких типов
            displayValue = `<span style="color: ${color}; font-style: italic;">${String(value)}</span>`;
        }
        
        // Если не обработали специально как длинную строку
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
    
    // ====================================================================
    // ОБРАБОТКА ОБЪЕКТОВ (НЕ МАССИВОВ)
    // ====================================================================
    const entries = Object.entries(obj);
    
    // Пустой объект
    if (entries.length === 0) {
        return `<div style="margin-left: ${depth * 20}px; color: #888; font-style: italic;">{} (пустой объект)</div>`;
    }
    
    // Начинаем блок объекта
    let html = `<div style="margin-left: ${depth * 20}px; color: #aaa; font-weight: bold;">
        { Объект: ${entries.length} полей }
    </div>`;
    
    // Рекурсивно отображаем КАЖДОЕ поле объекта
    for (let i = 0; i < entries.length; i++) {
        const [key, value] = entries[i];
        
        // Отображаем ключ (всегда)
        const keyHtml = `<span style="color: #fbc531; font-weight: bold;">${(key)}:</span>`;
        
        // Проверяем тип значения
        const isValuePrimitive = (value === null || value === undefined || 
                                 typeof value !== 'object' || 
                                 (typeof value === 'object' && 
                                  !Array.isArray(value) && 
                                  Object.keys(value).length === 0));
        
        if (isValuePrimitive) {
            // Примитивное значение или пустой объект - отображаем в одной строке
            html += `<div style="margin-left: ${(depth + 1) * 20}px;">
                ${keyHtml} ${renderAiMemoryRecursive(value, 0)}
            </div>`;
        } else {
            // Сложное значение (объект или массив) - отображаем с новой строки
            html += `<div style="margin-left: ${(depth + 1) * 20}px;">
                ${keyHtml}
            </div>`;
            // Рекурсивный рендеринг значения с увеличенной глубиной
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
    // Проверка на отсутствие данных
    if (!aiMemory || typeof aiMemory !== 'object') {
        return '<div style="color: #888; font-style: italic; padding: 10px; text-align: center;">Нет данных в памяти ГМ</div>';
    }
    
    // Подсчет статистики
    const totalKeys = countKeysRecursive(aiMemory);
    const isComplex = totalKeys > 50;
    
    // Информационная панель
    const memoryInfo = `<div style="color: #aaa; font-size: 0.8em; margin-bottom: 10px; padding: 8px; background: rgba(251, 197, 49, 0.05); border-radius: 3px; border: 1px solid rgba(251, 197, 49, 0.1);">
        <i class="fas fa-info-circle"></i> Память ГМ содержит: <strong style="color: #fbc531;">${totalKeys}</strong> ключей/элементов
        ${isComplex ? '<span style="color: #ff9ff3; margin-left: 10px;"><i class="fas fa-exclamation-triangle"></i> Сложная структура</span>' : ''}
    </div>`;
    
    // Основное содержимое памяти
    const memoryContent = renderAiMemoryRecursive(aiMemory);
    
    return memoryInfo + memoryContent;
}

/**
 * Добавляет функциональность сворачивания/разворачивания для блока памяти ГМ
 */
function makeAiMemoryCollapsible() {
    // Выполняем после небольшой задержки, чтобы DOM успел отрендериться
    setTimeout(() => {
        const aiMemoryBlocks = document.querySelectorAll('.scene-meta-block');
        
        aiMemoryBlocks.forEach((block, index) => {
            // Ищем блок с памятью ГМ по содержимому
            const header = block.querySelector('div:first-child');
            if (!header || !header.innerHTML.includes('ПАМЯТЬ ГМ')) {
                return; // Пропускаем блоки, не связанные с памятью ГМ
            }
            
            // Проверяем, не добавляли ли мы уже кнопку
            if (header.querySelector('.memory-toggle-btn')) {
                return;
            }
            
            // Создаем кнопку переключения
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
            
            // Находим контент (второй div в блоке)
            const contentDiv = block.querySelector('div:nth-child(2)');
            if (!contentDiv) {
                return;
            }
            
            // Сохраняем оригинальную высоту контента
            const originalMaxHeight = contentDiv.style.maxHeight || '300px';
            let isExpanded = true;
            
            // Функция переключения состояния
            toggleBtn.onclick = (event) => {
                event.stopPropagation();
                isExpanded = !isExpanded;
                
                if (isExpanded) {
                    // Разворачиваем
                    contentDiv.style.maxHeight = originalMaxHeight;
                    contentDiv.style.overflowY = 'auto';
                    toggleBtn.innerHTML = '<i class="fas fa-chevron-down"></i>';
                    toggleBtn.style.transform = 'rotate(0deg)';
                } else {
                    // Сворачиваем
                    contentDiv.style.maxHeight = '0px';
                    contentDiv.style.overflowY = 'hidden';
                    toggleBtn.innerHTML = '<i class="fas fa-chevron-right"></i>';
                    toggleBtn.style.transform = 'rotate(0deg)';
                }
            };
            
            // Добавляем кнопку в начало заголовка
            header.insertBefore(toggleBtn, header.firstChild);
            
            // Добавляем подсказку при наведении
            toggleBtn.title = 'Свернуть/развернуть память ГМ';
            
            console.log(`✅ Добавлена кнопка сворачивания для блока памяти ГМ #${index + 1}`);
        });
    }, 150);
}

// ====================================================================
// РЕНДЕРИНГ СЦЕНЫ (ТОЛЬКО СЦЕНА И МЕТА-БЛОКИ)
// ====================================================================

/**
 * Основная функция рендеринга сцены и всех мета-блоков
 */
function renderScene() {
    const state = State.getState();
    
    // Проверка наличия текущей сцены
    if (!state.gameState.currentScene) {
        console.error('❌ renderScene: currentScene отсутствует в состоянии игры');
        dom.sceneArea.innerHTML = `
            <div style="color: #ff3838; padding: 20px; text-align: center;">
                <h3><i class="fas fa-exclamation-triangle"></i> Ошибка сцены</h3>
                <p>Текущая сцена не загружена или отсутствует в состоянии игры.</p>
                <p style="font-size: 0.8em; color: #888;">Попробуйте начать новую игру или перезагрузить страницу.</p>
            </div>
        `;
        return;
    }
    
    const currentScene = state.gameState.currentScene;
    
    // Создаем контейнер для всей верхней секции
    const sceneContainer = dom.sceneArea;
    
    // ====================================================================
    // КРИТИЧЕСКИ ВАЖНО: Сохраняем turnUpdatesContainer перед очисткой!
    // ====================================================================
    const existingTurnUpdates = document.getElementById('turnUpdatesContainer');
    let savedTurnUpdatesHTML = '';
    let savedTurnUpdatesDisplay = 'block';
    
    if (existingTurnUpdates) {
        savedTurnUpdatesHTML = existingTurnUpdates.innerHTML;
        savedTurnUpdatesDisplay = existingTurnUpdates.style.display || 'block';
        console.log('💾 renderScene: Сохранен turnUpdatesContainer перед очисткой sceneArea');
    }
    
    // Очищаем старый контент
    sceneContainer.innerHTML = '';
    
    // ====================================================================
    // 1. ЗАМЕТКИ ДИЗАЙНЕРА (design_notes)
    // ====================================================================
    if (currentScene.design_notes && currentScene.design_notes.trim() !== '') {
        const designNotesDiv = document.createElement('div');
        designNotesDiv.className = 'scene-meta-block design-notes-block';
        designNotesDiv.style.cssText = `
            margin-bottom: 15px;
            padding: 12px;
            background: rgba(102, 102, 102, 0.08);
            border-left: 4px solid #666;
            border-radius: 4px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        `;
        designNotesDiv.innerHTML = `
            <div style="color: #888; font-size: 0.85em; font-weight: bold; margin-bottom: 8px; display: flex; align-items: center; gap: 6px;">
                <i class="fas fa-pencil-alt" style="color: #666;"></i> 
                <span>Заметки дизайнера:</span>
            </div>
            <div style="color: #aaa; font-size: 0.9em; font-style: italic; line-height: 1.5; padding-left: 5px;">
                ${currentScene.design_notes}
            </div>
        `;
        sceneContainer.appendChild(designNotesDiv);
        console.log('✅ Отображены заметки дизайнера');
    }
    
    // ====================================================================
    // 2. ПАМЯТЬ ГМ (aiMemory) - ГЛАВНЫЙ БЛОК С ПОЛНЫМ РАСКРЫТИЕМ
    // ====================================================================
    if (currentScene.aiMemory && typeof currentScene.aiMemory === 'object' && Object.keys(currentScene.aiMemory).length > 0) {
        const aiMemoryDiv = document.createElement('div');
        aiMemoryDiv.className = 'scene-meta-block ai-memory-block';
        aiMemoryDiv.style.cssText = `
            margin-bottom: 15px;
            padding: 12px;
            background: rgba(251, 197, 49, 0.07);
            border-left: 4px solid #fbc531;
            border-radius: 4px;
            box-shadow: 0 2px 6px rgba(251, 197, 49, 0.05);
        `;
        
        // Получаем форматированное содержимое памяти
        const memoryContent = formatAiMemory(currentScene.aiMemory);
        
        aiMemoryDiv.innerHTML = `
            <div style="color: #fbc531; font-size: 0.9em; font-weight: bold; margin-bottom: 12px; display: flex; align-items: center; gap: 8px;">
                <i class="fas fa-brain" style="font-size: 1.1em;"></i> 
                <span>ПАМЯТЬ ГМ:</span>
                <span style="font-size: 0.8em; color: #aaa; font-weight: normal; margin-left: auto; background: rgba(0,0,0,0.2); padding: 2px 6px; border-radius: 10px;">
                    ${Object.keys(currentScene.aiMemory).length} полей
                </span>
            </div>
            <div style="color: #aaa; font-size: 0.85em; font-family: 'Courier New', 'Consolas', 'Monaco', monospace; 
                        line-height: 1.4; max-height: 400px; overflow-y: auto; padding: 5px; 
                        border-radius: 3px; background: rgba(0,0,0,0.1);">
                ${memoryContent}
            </div>
        `;
        sceneContainer.appendChild(aiMemoryDiv);
        console.log('✅ Отображена память ГМ с полным рекурсивным раскрытием');
        
        // Добавляем возможность сворачивания после рендеринга
        setTimeout(() => {
            makeAiMemoryCollapsible();
        }, 200);
    } else {
        // Если памяти нет, показываем информационный блок
        const noMemoryDiv = document.createElement('div');
        noMemoryDiv.className = 'scene-meta-block no-memory-block';
        noMemoryDiv.style.cssText = `
            margin-bottom: 15px;
            padding: 10px;
            background: rgba(102, 102, 102, 0.05);
            border-left: 3px solid #666;
            border-radius: 3px;
            text-align: center;
        `;
        noMemoryDiv.innerHTML = `
            <div style="color: #888; font-size: 0.85em; font-style: italic;">
                <i class="fas fa-brain"></i> Память ГМ пуста или отсутствует
            </div>
        `;
        sceneContainer.appendChild(noMemoryDiv);
        console.log('ℹ️ Память ГМ отсутствует или пуста');
    }
    
    // ====================================================================
    // 3. СВОДКА (summary)
    // ====================================================================
    if (currentScene.summary && currentScene.summary.trim() !== '') {
        const summaryDiv = document.createElement('div');
        summaryDiv.className = 'scene-meta-block summary-block';
        summaryDiv.style.cssText = `
            margin-bottom: 15px;
            padding: 12px;
            background: rgba(72, 219, 251, 0.07);
            border-left: 4px solid #48dbfb;
            border-radius: 4px;
            box-shadow: 0 2px 4px rgba(72, 219, 251, 0.05);
        `;
        summaryDiv.innerHTML = `
            <div style="color: #48dbfb; font-size: 0.9em; font-weight: bold; margin-bottom: 8px; display: flex; align-items: center; gap: 6px;">
                <i class="fas fa-file-alt"></i> 
                <span>Сводка сцены:</span>
            </div>
            <div style="color: #ccc; font-size: 0.9em; line-height: 1.5;">
                ${currentScene.summary}
            </div>
        `;
        sceneContainer.appendChild(summaryDiv);
        console.log('✅ Отображена сводка сцены');
    }
    
    // ====================================================================
    // 4. КОНТЕЙНЕР ДЛЯ ИЗМЕНЕНИЙ ЗА ХОД (turnUpdatesContainer)
    // ====================================================================
    // ВАЖНО: Восстанавливаем сохраненный контейнер ПЕРЕД основным текстом сцены
    if (savedTurnUpdatesHTML) {
        const restoredTurnUpdates = document.createElement('div');
        restoredTurnUpdates.id = 'turnUpdatesContainer';
        restoredTurnUpdates.style.cssText = `
            margin-bottom: 15px;
            display: ${savedTurnUpdatesDisplay};
            transition: all 0.3s ease;
        `;
        restoredTurnUpdates.innerHTML = savedTurnUpdatesHTML;
        sceneContainer.appendChild(restoredTurnUpdates);
        console.log('✅ Восстановлен turnUpdatesContainer с сохраненным содержимым');
    } else {
        // Если контейнер не существовал - создаем пустой
        const newTurnUpdates = document.createElement('div');
        newTurnUpdates.id = 'turnUpdatesContainer';
        newTurnUpdates.style.cssText = `
            margin-bottom: 15px;
            min-height: 20px;
        `;
        sceneContainer.appendChild(newTurnUpdates);
        console.log('📝 Создан новый пустой turnUpdatesContainer');
    }
    
    // ====================================================================
    // 5. ОСНОВНОЙ ТЕКСТ СЦЕНЫ (scene)
    // ====================================================================
    const sceneDiv = document.createElement('div');
    sceneDiv.className = 'scene-text-block';
    sceneDiv.id = 'sceneText';
    sceneDiv.style.cssText = `
        margin-bottom: 20px;
        padding: 15px;
        background: rgba(30, 30, 30, 0.3);
        border-radius: 6px;
        border: 1px solid rgba(255, 255, 255, 0.05);
        box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
    `;
    
    if (currentScene.scene && currentScene.scene.trim() !== '') {
        sceneDiv.innerHTML = `
            <div style="color: #ddd; line-height: 1.6; font-size: 1.05em; text-align: justify;">
                ${currentScene.scene.replace(/\n/g, '<br>')}
            </div>
        `;
    } else {
        sceneDiv.innerHTML = `
            <div style="color: #888; font-style: italic; text-align: center; padding: 20px;">
                <i class="fas fa-book" style="font-size: 2em; margin-bottom: 10px; display: block;"></i>
                Текст сцены отсутствует или пуст
            </div>
        `;
    }
    
    sceneContainer.appendChild(sceneDiv);
    
    // Обновляем ссылку в DOM объекте
    dom.sceneText = sceneDiv;
    console.log('✅ Отображен основной текст сцены');
    
    // ====================================================================
    // 6. РЕФЛЕКСИЯ (reflection)
    // ====================================================================
    if (currentScene.reflection && currentScene.reflection.trim() !== '') {
        const reflectionDiv = document.createElement('div');
        reflectionDiv.className = 'scene-meta-block reflection-block';
        reflectionDiv.id = 'sceneReflection';
        reflectionDiv.style.cssText = `
            margin-top: 15px;
            margin-bottom: 15px;
            padding: 14px;
            background: rgba(72, 219, 251, 0.08);
            border-left: 4px solid #48dbfb;
            border-radius: 4px;
            box-shadow: 0 2px 6px rgba(72, 219, 251, 0.05);
        `;
        reflectionDiv.innerHTML = `
            <div style="color: #48dbfb; font-size: 0.95em; font-weight: bold; margin-bottom: 10px; display: flex; align-items: center; gap: 8px;">
                <i class="fas fa-eye" style="font-size: 1.1em;"></i> 
                <span>Рефлексия ГМ:</span>
            </div>
            <div style="color: #ccc; font-size: 0.9em; font-style: italic; line-height: 1.5; padding-left: 5px;">
                ${(currentScene.reflection).replace(/\n/g, '<br>')}
            </div>
        `;
        sceneContainer.appendChild(reflectionDiv);
        dom.reflection = reflectionDiv;
        console.log('✅ Отображена рефлексия');
    } else if (dom.reflection) {
        dom.reflection.style.display = 'none';
    }
    
    // ====================================================================
    // 7. ЛИЧНОСТЬ (personality)
    // ====================================================================
    if (currentScene.personality && currentScene.personality.trim() !== '') {
        const personalityDiv = document.createElement('div');
        personalityDiv.className = 'scene-meta-block personality-block';
        personalityDiv.style.cssText = `
            margin-top: 10px;
            margin-bottom: 15px;
            padding: 14px;
            background: rgba(76, 209, 55, 0.08);
            border-left: 4px solid #4cd137;
            border-radius: 4px;
            box-shadow: 0 2px 6px rgba(76, 209, 55, 0.05);
        `;
        personalityDiv.innerHTML = `
            <div style="color: #4cd137; font-size: 0.95em; font-weight: bold; margin-bottom: 10px; display: flex; align-items: center; gap: 8px;">
                <i class="fas fa-user-circle" style="font-size: 1.1em;"></i> 
                <span>Изменение личности персонажа:</span>
            </div>
            <div style="color: #ccc; font-size: 0.9em; font-style: italic; line-height: 1.5;">
                ${(currentScene.personality).replace(/\n/g, '<br>')}
            </div>
        `;
        sceneContainer.appendChild(personalityDiv);
        console.log('✅ Отображено изменение личности');
    }
    
    // ====================================================================
    // 8. ТИПОЛОГИЯ (typology)
    // ====================================================================
    if (currentScene.typology && currentScene.typology.trim() !== '') {
        const typologyDiv = document.createElement('div');
        typologyDiv.className = 'scene-meta-block typology-block';
        typologyDiv.style.cssText = `
            margin-top: 10px;
            margin-bottom: 15px;
            padding: 14px;
            background: rgba(156, 136, 255, 0.08);
            border-left: 4px solid #9c88ff;
            border-radius: 4px;
            box-shadow: 0 2px 6px rgba(156, 136, 255, 0.05);
        `;
        typologyDiv.innerHTML = `
            <div style="color: #9c88ff; font-size: 0.95em; font-weight: bold; margin-bottom: 10px; display: flex; align-items: center; gap: 8px;">
                <i class="fas fa-fingerprint" style="font-size: 1.1em;"></i> 
                <span>Типология персонажа:</span>
            </div>
            <div style="color: #ccc; font-size: 0.9em; font-style: italic; line-height: 1.5;">
                ${(currentScene.typology).replace(/\n/g, '<br>')}
            </div>
        `;
        sceneContainer.appendChild(typologyDiv);
        console.log('✅ Отображена типология');
    }
    
    // ====================================================================
    // 9. ДОПОЛНИТЕЛЬНЫЕ МЕТА-БЛОКИ (если есть)
    // ====================================================================
    // Проверяем наличие других полей, которые могут быть в сцене
    const knownFields = ['design_notes', 'aiMemory', 'summary', 'scene', 'reflection', 'personality', 'typology', 'choices'];
    const additionalFields = Object.keys(currentScene).filter(key => 
        !knownFields.includes(key) && 
        currentScene[key] !== null && 
        currentScene[key] !== undefined && 
        currentScene[key] !== ''
    );
    
    if (additionalFields.length > 0) {
        console.log(`ℹ️ Найдены дополнительные поля в сцене: ${additionalFields.join(', ')}`);
        
        additionalFields.forEach(field => {
            const value = currentScene[field];
            
            // Пропускаем массивы и сложные объекты (они уже обработаны в aiMemory)
            if (Array.isArray(value) || (typeof value === 'object' && value !== null)) {
                return;
            }
            
            // Отображаем простые значения
            const additionalDiv = document.createElement('div');
            additionalDiv.className = 'scene-meta-block additional-field-block';
            additionalDiv.style.cssText = `
                margin-top: 8px;
                margin-bottom: 8px;
                padding: 10px;
                background: rgba(255, 255, 255, 0.03);
                border-left: 3px solid #777;
                border-radius: 3px;
                font-size: 0.85em;
            `;
            additionalDiv.innerHTML = `
                <div style="color: #aaa; font-weight: bold; margin-bottom: 4px;">
                    <i class="fas fa-info-circle"></i> ${field}:
                </div>
                <div style="color: #ccc;">
                    ${(String(value))}
                </div>
            `;
            sceneContainer.appendChild(additionalDiv);
        });
    }
    
    console.log('✅ renderScene: Сцена полностью отрендерена со всеми мета-блоками');
}

// ====================================================================
// РЕНДЕРИНГ ВЫБОРОВ
// ====================================================================

/**
 * Форматирует требования в компактном виде для отображения в кнопках выбора
 * @param {Array} requirements - Массив требований
 * @returns {string} HTML-строка с отформатированными требованиями
 */
function formatCompactRequirements(requirements) {
    if (!Array.isArray(requirements) || requirements.length === 0) {
        return '';
    }
    
    const items = requirements.map(reqId => {
        if (!reqId || typeof reqId !== 'string') return '';
        
        const [type, name] = reqId.split(':');
        let color = '#888';
        let icon = '📌';
        let displayName = name || reqId;
        
        switch (type) {
            case 'stat':
                color = '#fbc531';
                displayName = getRussianStatName(name);
                icon = '📊';
                break;
            case 'skill':
                color = '#6c5ce7';
                icon = '📜';
                break;
            case 'inventory':
                color = '#8b4513';
                icon = '🎒';
                break;
            case 'relations':
                color = '#ff9ff3';
                icon = '👤';
                displayName = name.replace(/_/g, ' ');
                break;
            case 'bless':
                color = '#bdc3c7';
                icon = '✨';
                break;
            case 'curse':
                color = '#ff3838';
                icon = '💀';
                break;
            case 'initiation_degree':
                color = '#ff9ff3';
                icon = '🎓';
                break;
            default:
                color = '#aaa';
                icon = '🔘';
        }
        
        return `<span style="color:${color};" title="${reqId}">${icon} ${displayName}</span>`;
    }).filter(item => item !== '');
    
    if (items.length === 0) return '';
    
    return `<div style="font-size:0.75rem; margin-top:3px; color:#888; opacity: 0.3">🔒 Треб: ${items.join(', ')}</div>`;
}

/**
 * Форматирует операции (награды/штрафы) в компактном виде
 * @param {Array} operations - Массив операций
 * @param {string} type - Тип операций ('success' или 'fail')
 * @returns {string} HTML-строка с отформатированными операциями
 */
function formatCompactOperations(operations, type) {
    if (!Array.isArray(operations) || operations.length === 0) {
        return '';
    }
    
    const isSuccess = type === 'success';
    const items = [];
    
    operations.forEach(op => {
        if (!op || !op.id) return;
        
        const [itemType, name] = op.id.split(':');
        let display = '';
        
        if (op.operation === 'MODIFY') {
            const delta = op.delta || 0;
            const sign = delta > 0 ? '+' : '';
            const color = delta > 0 ? '#4cd137' : '#e84118';
            
            if (itemType === 'stat') {
                display = `<span style="color:${color}; font-weight:bold;">${getRussianStatName(name)} ${sign}${delta}</span>`;
            } else {
                display = `<span style="color:${color}; font-weight:bold;">${name} ${sign}${delta}</span>`;
            }
        } else if (op.operation === 'ADD') {
            const icon = getGameItemIcon(op.id);
            display = `<span style="color:#4cd137; font-weight:bold;">+${icon} ${name}</span>`;
        } else if (op.operation === 'REMOVE') {
            const icon = getGameItemIcon(op.id);
            display = `<span style="color:#e84118; font-weight:bold;">-${icon} ${name}</span>`;
        } else if (op.operation === 'SET') {
            display = `<span style="color:#48dbfb; font-weight:bold;">${name} → ${op.value}</span>`;
        }
        
        if (display) {
            items.push(display);
        }
    });
    
    if (items.length === 0) return '';
    
    const bgColor = isSuccess ? 'rgba(76, 209, 55, 0.1)' : 'rgba(232, 65, 24, 0.1)';
    const borderColor = isSuccess ? '#4cd137' : '#e84118';
    const label = isSuccess ? '✅ При успехе' : '❌ При провале';
    
    return `<div style="font-size:0.7rem; margin-top:3px; padding:4px 6px; background:${bgColor}; border-left:2px solid ${borderColor}; border-radius:3px; opacity: 0.3">
        <div style="font-style:italic; margin-bottom:2px;">${label}:</div>
        ${items.join(', ')}
    </div>`;
}

/**
 * Получает русское название характеристики по ключу
 * @param {string} key - Ключ характеристики (например, 'will')
 * @returns {string} Русское название
 */
function getRussianStatName(key) {
    const map = {
        'will': 'Воля',
        'stealth': 'Скрытность',
        'influence': 'Влияние',
        'sanity': 'Разум',
        'health': 'Здоровье',
        'mana': 'Мана',
        'stamina': 'Выносливость',
        'strength': 'Сила',
        'agility': 'Ловкость',
        'intelligence': 'Интеллект',
        'charisma': 'Харизма'
    };
    return map[key] || key;
}

/**
 * Получает иконку для типа игрового предмета
 * @param {string} itemId - Идентификатор предмета (например, 'stat:will')
 * @returns {string} Emoji-иконка
 */
function getGameItemIcon(itemId) {
    if (!itemId) return '📌';
    
    const type = itemId.split(':')[0];
    const icons = {
        'stat': '📊',
        'skill': '📜',
        'inventory': '🎒',
        'relations': '👤',
        'bless': '✨',
        'curse': '💀',
        'buff': '⬆️',
        'debuff': '⬇️',
        'initiation_degree': '🎓',
        'progress': '📈',
        'personality': '🧠',
        'effect': '⚡',
        'status': '🔘',
        'ability': '💫',
        'trait': '🎭',
        'item': '🎁',
        'ritual': '🕯️',
        'knowledge': '📚',
        'secret': '🔐',
        'location': '📍',
        'event': '📅',
        'quest': '🎯',
        'achievement': '🏆',
        'reputation': '⭐',
        'currency': '💰',
        'resource': '⛏️',
        'weapon': '⚔️',
        'armor': '🛡️',
        'potion': '🧪',
        'scroll': '📜',
        'key': '🔑',
        'map': '🗺️',
        'tool': '🔧'
    };
    
    return icons[type] || '📌';
}

/**
 * Основная функция рендеринга вариантов выбора
 */
function renderChoices() {
    const state = State.getState();
    
    if (!dom.choicesList) {
        console.error('❌ renderChoices: choicesList не найден в DOM');
        return;
    }
    
    // Очищаем список
    dom.choicesList.innerHTML = '';
    
    if (!state.gameState || !state.gameState.currentScene) {
        console.error('❌ renderChoices: currentScene отсутствует в состоянии игры');
        dom.choicesList.innerHTML = `
            <div style="color: #888; text-align: center; padding: 20px; font-style: italic;">
                <i class="fas fa-exclamation-circle"></i> Сцена не загружена
            </div>
        `;
        return;
    }
    
    const currentScene = state.gameState.currentScene;
    const choices = currentScene.choices;
    
    if (!choices || !Array.isArray(choices)) {
        console.error('❌ renderChoices: choices отсутствует или не является массивом');
        dom.choicesList.innerHTML = `
            <div style="color: #888; text-align: center; padding: 20px; font-style: italic;">
                <i class="fas fa-ban"></i> Варианты выбора отсутствуют
            </div>
        `;
        return;
    }
    
    console.log(`📋 renderChoices: Отображаем ${choices.length} вариантов выбора`);
    
    // Рендерим каждый вариант выбора
    choices.forEach((choice, idx) => {
        if (!choice || typeof choice !== 'object') {
            console.warn(`⚠️ renderChoices: Пропущен выбор с индексом ${idx}: объект не существует`);
            return;
        }
        
        const btn = document.createElement('button');
        const isSelected = state.gameState.selectedActions &&
            Array.isArray(state.gameState.selectedActions) ?
            state.gameState.selectedActions.includes(idx) : false;
        
        // Базовые классы и стили
        btn.className = `choice-btn ${isSelected ? 'selected' : ''}`;
        btn.style.cssText = `
            text-align: left;
            padding: 12px 15px;
            margin-bottom: 10px;
            border: 2px solid ${isSelected ? '#fbc531' : '#444'};
            background: ${isSelected ? 'rgba(251, 197, 49, 0.1)' : 'rgba(60, 60, 60, 0.3)'};
            color: ${isSelected ? '#fbc531' : '#ddd'};
            border-radius: 6px;
            cursor: pointer;
            transition: all 0.2s ease;
            width: 100%;
            position: relative;
            overflow: hidden;
        `;
        
        // Добавляем эффект при наведении
        btn.onmouseenter = function() {
            if (!isSelected) {
                this.style.borderColor = '#666';
                this.style.background = 'rgba(80, 80, 80, 0.4)';
            }
        };
        
        btn.onmouseleave = function() {
            if (!isSelected) {
                this.style.borderColor = '#444';
                this.style.background = 'rgba(60, 60, 60, 0.3)';
            }
        };
        
        // Основной текст выбора
        const choiceText = choice.text || "Действие без названия";
        let content = `<div style="font-size: 1em; font-weight: bold; margin-bottom: 5px;">${(choiceText)}</div>`;
        
        // Сложность
        const difficulty = choice.difficulty_level || 5;
        let difficultyColor = '#4cd137'; // Зеленый по умолчанию
        
        if (difficulty >= 8) difficultyColor = '#e84118'; // Красный для высокой сложности
        else if (difficulty >= 5) difficultyColor = '#fbc531'; // Желтый для средней сложности
        
        content += `<div style="font-size:0.8rem; color:${difficultyColor}; margin-top:3px; opacity: 0.7">
            🎯 Сложность: <strong>${difficulty}/10</strong>
        </div>`;
        
        // Требования (если есть)
        if (Array.isArray(choice.requirements) && choice.requirements.length > 0) {
            content += formatCompactRequirements(choice.requirements);
        } else {
            content += `<div style="font-size:0.75rem; color:#888; margin-top:3px; opacity: 0.3">🔓 Нет требований</div>`;
        }
        
        // Награды за успех (если есть)
        if (Array.isArray(choice.success_rewards) && choice.success_rewards.length > 0) {
            content += formatCompactOperations(choice.success_rewards, 'success');
        }
        
        // Штрафы за провал (если есть)
        if (Array.isArray(choice.fail_penalties) && choice.fail_penalties.length > 0) {
            content += formatCompactOperations(choice.fail_penalties, 'fail');
        }
        
        // Добавляем описание (если есть)
        if (choice.description && choice.description.trim() !== '') {
            content += `<div style="font-size:0.8rem; color:#aaa; margin-top:8px; padding-top:8px; border-top: 1px dashed #444; font-style: italic;">
                ${(choice.description)}
            </div>`;
        }
        
        btn.innerHTML = content;
        
        // Обработчик клика
        btn.onclick = () => {
            console.log(`🎯 Выбор ${idx} кликнут: "${choiceText}"`);
            Game.toggleChoice(idx);
        };
        
        dom.choicesList.appendChild(btn);
    });
    
    // Обновляем счетчик выбранных вариантов
    const count = state.gameState.selectedActions ? state.gameState.selectedActions.length : 0;
    if (dom.choicesCounter) {
        dom.choicesCounter.textContent = `${count}/${CONFIG.maxChoices}`;
        dom.choicesCounter.style.color = count >= CONFIG.maxChoices ? '#4cd137' : '#fbc531';
    }
    
    console.log('✅ renderChoices: Все варианты выбора отрендерены');
}

// ====================================================================
// КООРДИНАЦИЯ РЕНДЕРИНГА
// ====================================================================

/**
 * Координирует полный рендеринг интерфейса (только сцена и выборы)
 */
function renderAll() {
    console.info('🎨 RENDER ALL: Запуск основного рендеринга сцены и выборов...');
    
    try {
        // 1. Рендерим сцену (включая все мета-блоки и память ГМ)
        renderScene();
        
        // 2. Рендерим варианты выбора
        renderChoices();
        
        // 3. GameItemUI, StatsUI и другие UI компоненты рендерят себя САМИ через свои подписки
        // Не дублируем вызовы здесь, чтобы избежать двойного рендеринга
        
        console.info('✅ RENDER ALL: Сцена и выборы полностью отрендерены');
        
    } catch (error) {
        console.error('❌ Критическая ошибка при основном рендеринге:', error);
        
        // Показываем пользователю понятную ошибку
        if (dom.sceneArea) {
            dom.sceneArea.innerHTML = `
                <div style="color: #ff3838; padding: 30px; text-align: center; background: rgba(232, 65, 24, 0.1); border-radius: 8px; border: 2px solid #e84118;">
                    <h3 style="margin-bottom: 15px;"><i class="fas fa-exclamation-triangle"></i> Ошибка отображения сцены</h3>
                    <p style="margin-bottom: 15px;">Произошла критическая ошибка при загрузке сцены.</p>
                    <p style="font-size: 0.9em; color: #aaa; margin-bottom: 20px;">Попробуйте перезагрузить страницу или начать новую игру.</p>
                    <div style="background: rgba(0,0,0,0.3); padding: 10px; border-radius: 4px; font-family: monospace; font-size: 0.8em; text-align: left;">
                        ${(error.message)}
                    </div>
                </div>
            `;
        }
        
        // Показываем ошибку в консоли для разработчика
        console.error('Полная информация об ошибке:', {
            message: error.message,
            stack: error.stack,
            name: error.name
        });
    }
}

// ====================================================================
// ПОДПИСКА НА СОБЫТИЯ ДЛЯ СЦЕНЫ
// ====================================================================

/**
 * Настраивает подписки на события состояния для автоматического обновления сцены
 */
function setupStateObservers() {
    console.log('🔍 Настройка подписок на события для сцены...');
    
    // Подписка на изменение сцены (самое важное событие)
    State.on(State.EVENTS.SCENE_CHANGED, (data) => {
        console.log('🎯 RENDER: SCENE_CHANGED событие получено', {
            hasScene: !!data?.currentScene,
            timestamp: new Date().toISOString()
        });
        try {
            renderScene();
            renderChoices();
            console.log('✅ RENDER: Сцена и выборы обновлены после SCENE_CHANGED');
        } catch (error) {
            console.error('❌ RENDER: Ошибка при обработке SCENE_CHANGED:', error);
        }
    });
    
    // Подписка на изменение выбора
    State.on(State.EVENTS.CHOICES_CHANGED, (data) => {
        console.log('🎯 RENDER: CHOICES_CHANGED событие получено', {
            selectedCount: data?.selectedActions?.length || 0
        });
        try {
            renderChoices();
            console.log('✅ RENDER: Выборы обновлены после CHOICES_CHANGED');
        } catch (error) {
            console.error('❌ RENDER: Ошибка при обработке CHOICES_CHANGED:', error);
        }
    });
    
    // Подписка на изменение режима игры
    State.on(State.EVENTS.GAME_MODE_CHANGED, (data) => {
        console.log('🎯 RENDER: GAME_MODE_CHANGED событие получено', {
            freeMode: data?.freeMode,
            timestamp: new Date().toISOString()
        });
        try {
            updateUIMode();
            console.log('✅ RENDER: Режим UI обновлен после GAME_MODE_CHANGED');
        } catch (error) {
            console.error('❌ RENDER: Ошибка при обработке GAME_MODE_CHANGED:', error);
        }
    });
    
    // Подписка на изменение настроек
    State.on(State.EVENTS.SETTINGS_CHANGED, (data) => {
        console.log('🎯 RENDER: SETTINGS_CHANGED событие получено');
        try {
            updateApiKeyFields();
            renderModelSelectorByProvider();
            updateModelDetails();
            console.log('✅ RENDER: Настройки обновлены после SETTINGS_CHANGED');
        } catch (error) {
            console.error('❌ RENDER: Ошибка при обработке SETTINGS_CHANGED:', error);
        }
    });
    
    // Подписка на изменение моделей
    State.on(State.EVENTS.MODELS_CHANGED, (data) => {
        console.log('🎯 RENDER: MODELS_CHANGED событие получено', {
            modelsCount: data?.models?.length || 0
        });
        try {
            renderModelSelectorByProvider();
            updateModelDetails();
            updateModelStats();
            console.log('✅ RENDER: Модели обновлены после MODELS_CHANGED');
        } catch (error) {
            console.error('❌ RENDER: Ошибка при обработке MODELS_CHANGED:', error);
        }
    });
    
    // Подписка на обновление аудита
    State.on(State.EVENTS.AUDIT_LOG_UPDATED, (data) => {
        console.log('🎯 RENDER: AUDIT_LOG_UPDATED событие получено', {
            logEntries: data?.auditLog?.length || 0
        });
        try {
            renderAuditList();
            console.log('✅ RENDER: Аудит обновлен после AUDIT_LOG_UPDATED');
        } catch (error) {
            console.error('❌ RENDER: Ошибка при обработке AUDIT_LOG_UPDATED:', error);
        }
    });
    
    console.log('✅ RENDER: Все подписки для сцены успешно настроены');
}

// ====================================================================
// ОБНОВЛЕНИЕ РЕЖИМОВ ИНТЕРФЕЙСА
// ====================================================================

/**
 * Обновляет интерфейс в зависимости от режима игры (обычный/свободный ввод)
 */
function updateUIMode() {
    const state = State.getState();
    
    // Устанавливаем состояние переключателя
    dom.freeModeToggle.checked = state.freeMode;
    
    if (state.freeMode) {
        // РЕЖИМ СВОБОДНОГО ВВОДА
        dom.choicesList.style.display = 'none';
        dom.freeInputWrapper.style.display = 'block';
        dom.modeIcon.innerHTML = '<i class="fas fa-keyboard"></i>';
        dom.modeText.textContent = 'Режим: Свободный ввод';
        dom.modeText.classList.add('free-mode');
        
        // Обновляем счетчик
        const hasText = state.freeModeText && state.freeModeText.trim().length > 0;
        dom.choicesCounter.textContent = hasText ? '✓ Готово' : 'Введите текст...';
        
        // Устанавливаем текст в поле ввода
        dom.freeInputText.value = state.freeModeText || '';
        dom.freeInputText.disabled = false;
        
        // Настраиваем размер поля ввода в зависимости от масштаба
        const scale = state.settings.scale || 1;
        const baseHeight = 140;
        const adjustedHeight = baseHeight * scale;
        dom.freeInputText.style.height = `${adjustedHeight}px`;
        dom.freeInputText.style.minHeight = `${adjustedHeight}px`;
        
        // Автофокус и скроллинг
        setTimeout(() => {
            dom.freeInputText.focus();
            dom.freeInputText.scrollTop = dom.freeInputText.scrollHeight;
        }, 100);
        
        // Активируем/деактивируем кнопку отправки
        dom.btnSubmit.disabled = !hasText;
        
        console.log('🔄 UI переключен в режим свободного ввода');
    } else {
        // ОБЫЧНЫЙ РЕЖИМ (ВАРИАНТЫ ВЫБОРА)
        dom.choicesList.style.display = 'block';
        dom.freeInputWrapper.style.display = 'none';
        dom.modeIcon.innerHTML = '<i class="fas fa-list-ul"></i>';
        dom.modeText.textContent = 'Режим: Варианты выбора';
        dom.modeText.classList.remove('free-mode');
        
        // Обновляем счетчик выбранных вариантов
        const count = state.gameState.selectedActions ? state.gameState.selectedActions.length : 0;
        dom.choicesCounter.textContent = `${count}/${CONFIG.maxChoices}`;
        
        console.log('🔄 UI переключен в обычный режим (варианты выбора)');
    }
}

// ====================================================================
// УПРАВЛЕНИЕ API КЛЮЧАМИ И МОДЕЛЯМИ
// ====================================================================

/**
 * Обновляет отображение полей для API ключей в зависимости от выбранного провайдера
 */
function updateApiKeyFields() {
    const state = State.getState();
    
    // Сначала скрываем все поля
    Object.values(dom.keyFields).forEach(field => {
        if (field) {
            field.classList.remove('active');
            field.style.display = 'none';
        }
    });
    
    // Показываем только поле для активного провайдера
    if (state.settings.apiProvider === 'openrouter' && dom.keyFields.openrouter) {
        dom.keyFields.openrouter.classList.add('active');
        dom.keyFields.openrouter.style.display = 'block';
        console.log('🔑 Показано поле для OpenRouter API ключа');
    } else if (state.settings.apiProvider === 'vsegpt' && dom.keyFields.vsegpt) {
        dom.keyFields.vsegpt.classList.add('active');
        dom.keyFields.vsegpt.style.display = 'block';
        console.log('🔑 Показано поле для VseGPT API ключа');
    }
}

/**
 * Рендерит список моделей для текущего провайдера
 */
function renderModelSelectorByProvider() {
    const state = State.getState();
    const select = dom.inputs.model;
    
    if (!select) {
        console.error('❌ renderModelSelectorByProvider: select элемент не найден');
        return;
    }
    
    // Очищаем текущие опции
    select.innerHTML = '';
    
    const currentProvider = state.settings.apiProvider;
    const filteredModels = state.models.filter(m => m.provider === currentProvider);
    
    if (filteredModels.length === 0) {
        // Нет моделей для текущего провайдера
        const opt = document.createElement('option');
        opt.value = '';
        opt.text = '❌ Нет доступных моделей для этого провайдера';
        select.appendChild(opt);
        select.disabled = true;
        console.warn(`⚠️ Нет моделей для провайдера: ${currentProvider}`);
        return;
    }
    
    select.disabled = false;
    
    // Создаем опции для каждой модели
    filteredModels.forEach(model => {
        const opt = document.createElement('option');
        opt.value = model.id;
        
        // Форматируем текст опции
        let statusEmoji = Utils.getStatusEmoji(model.status);
        let providerEmoji = model.provider === 'openrouter' ? '🌐' : '🤖';
        let name = model.name || model.id;
        
        opt.text = `${statusEmoji} ${providerEmoji} ${name}`;
        
        // Добавляем описание в title
        if (model.description) {
            opt.title = model.description;
        }
        
        select.appendChild(opt);
    });
    
    // Устанавливаем выбранную модель, если она существует
    const modelExists = filteredModels.some(m => m.id === state.settings.model);
    if (modelExists) {
        select.value = state.settings.model;
        console.log(`✅ Модель "${state.settings.model}" выбрана для провайдера ${currentProvider}`);
    } else if (filteredModels.length > 0) {
        // Выбираем первую модель по умолчанию
        state.settings.model = filteredModels[0].id;
        select.value = state.settings.model;
        console.log(`✅ Установлена модель по умолчанию: ${state.settings.model}`);
    }
    
    // Обновляем детали модели
    updateModelDetails();
}

/**
 * Обновляет детали выбранной модели
 */
function updateModelDetails() {
    const state = State.getState();
    const modelId = dom.inputs.model ? dom.inputs.model.value : null;
    const details = document.getElementById('modelDetails');
    
    if (!details) return;
    
    if (!modelId) {
        details.innerHTML = '<span style="color: #888; font-style: italic;">Модель не выбрана</span>';
        return;
    }
    
    const model = state.models.find(m => m.id === modelId);
    
    if (!model) {
        details.innerHTML = '<span style="color: #e84118; font-style: italic;">Выбранная модель не найдена</span>';
        return;
    }
    
    let detailsHTML = `<div style="font-size: 0.85em; line-height: 1.4;">`;
    
    // Статус
    detailsHTML += `<div style="margin-bottom: 5px;">
        <strong>Статус:</strong> ${Utils.getStatusEmoji(model.status)} <span style="color: ${model.status === 'available' ? '#4cd137' : model.status === 'testing' ? '#fbc531' : '#e84118'}">${model.status}</span>
    </div>`;
    
    // Провайдер
    detailsHTML += `<div style="margin-bottom: 5px;">
        <strong>Провайдер:</strong> ${model.provider === 'openrouter' ? '🌐 OpenRouter' : '🤖 VseGPT'}
    </div>`;
    
    // Последняя проверка
    if (model.lastTested) {
        const lastTestedDate = new Date(model.lastTested);
        detailsHTML += `<div style="margin-bottom: 5px;">
            <strong>Последняя проверка:</strong> ${lastTestedDate.toLocaleString('ru-RU')}
        </div>`;
    }
    
    // Время отклика
    if (model.responseTime) {
        const timeColor = model.responseTime < 1000 ? '#4cd137' : model.responseTime < 3000 ? '#fbc531' : '#e84118';
        detailsHTML += `<div style="margin-bottom: 5px;">
            <strong>Время отклика:</strong> <span style="color: ${timeColor}">${model.responseTime} мс</span>
        </div>`;
    }
    
    // Описание
    if (model.description) {
        detailsHTML += `<div style="margin-top: 8px; padding-top: 8px; border-top: 1px dashed #444;">
            <strong>Описание:</strong> ${model.description}
        </div>`;
    }
    
    detailsHTML += `</div>`;
    
    details.innerHTML = detailsHTML;
}

/**
 * Обновляет статистику моделей
 */
function updateModelStats() {
    const stats = State.getModelStats();
    const statsContainer = document.getElementById('modelStats');
    
    if (!statsContainer) return;
    
    statsContainer.innerHTML = `
        <div style="display: flex; flex-wrap: wrap; gap: 10px; font-size: 0.8em;">
            <div style="flex: 1; min-width: 100px; padding: 8px; background: rgba(0,0,0,0.2); border-radius: 4px; text-align: center;">
                <div style="font-size: 1.5em; font-weight: bold; color: #fbc531;">${stats.total}</div>
                <div style="color: #aaa;">Всего</div>
            </div>
            <div style="flex: 1; min-width: 100px; padding: 8px; background: rgba(76, 209, 55, 0.1); border-radius: 4px; text-align: center;">
                <div style="font-size: 1.5em; font-weight: bold; color: #4cd137;">${stats.success}</div>
                <div style="color: #aaa;">Рабочие</div>
            </div>
            <div style="flex: 1; min-width: 100px; padding: 8px; background: rgba(232, 65, 24, 0.1); border-radius: 4px; text-align: center;">
                <div style="font-size: 1.5em; font-weight: bold; color: #e84118;">${stats.error}</div>
                <div style="color: #aaa;">Ошибки</div>
            </div>
            <div style="flex: 1; min-width: 100px; padding: 8px; background: rgba(251, 197, 49, 0.1); border-radius: 4px; text-align: center;">
                <div style="font-size: 1.5em; font-weight: bold; color: #fbc531;">${stats.untested}</div>
                <div style="color: #aaa;">Не тест.</div>
            </div>
        </div>
    `;
}

// ====================================================================
// УПРАВЛЕНИЕ АУДИТ-ЛОГОМ
// ====================================================================

/**
 * Обновляет счетчик записей в аудит-логе
 */
function updateLogCount() {
    const state = State.getState();
    const logCountElem = document.getElementById('logCount');
    if (logCountElem) {
        const count = state.auditLog.length;
        logCountElem.textContent = `${count} записей`;
        logCountElem.style.color = count > 50 ? '#fbc531' : count > 100 ? '#e84118' : '#4cd137';
    }
}

/**
 * Рендерит список записей аудит-лога
 */
function renderAuditList() {
    const state = State.getState();
    const list = document.getElementById('auditList');
    
    if (!list) {
        console.error('❌ renderAuditList: Элемент списка аудита не найден');
        return;
    }
    
    // Берем последние 20 записей (самые свежие)
    const displayLog = state.auditLog.slice(-50);
    
    if (displayLog.length === 0) {
        list.innerHTML = `
            <div style="color: #888; text-align: center; padding: 30px; font-style: italic;">
                <i class="fas fa-clipboard-list" style="font-size: 2em; margin-bottom: 10px; display: block;"></i>
                Аудит-лог пуст
            </div>
        `;
        updateLogCount();
        return;
    }
    
    let listHTML = '';
    
    displayLog.forEach(entry => {
        if (!entry) return;
        
        // Определяем цвета в зависимости от статуса
        let statusColor = '#888';
        let borderColor = '#444';
        let bgColor = 'rgba(0,0,0,0.1)';
        
        if (entry.status === 'success') {
            statusColor = '#4cd137';
            borderColor = '#2d8b57';
            bgColor = 'rgba(76, 209, 55, 0.05)';
        } else if (entry.status === 'error') {
            statusColor = '#e84118';
            borderColor = '#c23616';
            bgColor = 'rgba(232, 65, 24, 0.05)';
        } else if (entry.status === 'pending') {
            statusColor = '#fbc531';
            borderColor = '#e1b12c';
            bgColor = 'rgba(251, 197, 49, 0.05)';
        }
        
        // Заголовок записи
        let headerText = `
            <span style="color:${statusColor}; font-weight:bold;">${entry.timestamp || 'Нет времени'}</span>: 
            [${entry.status ? entry.status.toUpperCase() : 'UNKNOWN'}] - 
            ${entry.request || 'Нет запроса'}
        `;
        
        if (entry.d10 !== undefined && entry.d10 !== null) {
            headerText += ` <span style="color:#9c88ff;">(d10=${entry.d10})</span>`;
        }
        
        // Детали запроса (если есть)
        let requestHtml = '';
        if (entry.requestDebug && entry.requestDebug.body) {
            const formattedRequest = Utils.formatJsonWithUnicode(entry.requestDebug.body);
            requestHtml = `
            <details style="margin-top: 8px;">
                <summary style="cursor:pointer; color:#aaa; font-size:0.85em; padding: 5px; background: rgba(0,0,0,0.1); border-radius: 3px;">
                    <i class="fas fa-code"></i> Request Payload
                </summary>
                <pre style="font-size:0.7rem; color:#ccc; background:#111; padding:10px; overflow-x:auto; white-space: pre-wrap; border: 1px solid #333; border-radius: 4px; margin-top: 5px;">
${(formattedRequest)}
                </pre>
            </details>`;
        }
        
        // Полный ответ (если есть)
        let responseHtml = '';
        if (entry.fullResponse) {
            const formattedResponse = Utils.formatJsonWithUnicode(entry.fullResponse);
            responseHtml = `
            <details style="margin-top: 8px;">
                <summary style="cursor:pointer; color:${statusColor}; font-size:0.85em; padding: 5px; background: rgba(0,0,0,0.2); border-radius: 3px;">
                    <i class="fas fa-reply"></i> Full Response
                </summary>
                <pre style="font-size:0.7rem; color:${statusColor}; background:#1a1a1a; padding:10px; overflow-x:auto; white-space: pre-wrap; border: 1px solid ${borderColor}; border-radius: 4px; margin-top: 5px;">
${(formattedResponse)}
                </pre>
            </details>`;
        }
        
        // Детали ошибки (если есть)
        let errorHtml = '';
        if (entry.rawError) {
            const formattedError = Utils.formatJsonWithUnicode(entry.rawError);
            errorHtml = `
            <details open style="margin-top: 8px;">
                <summary style="cursor:pointer; color:#e84118; font-size:0.85em; padding: 5px; background: rgba(232, 65, 24, 0.1); border-radius: 3px;">
                    <i class="fas fa-exclamation-triangle"></i> ERROR DETAILS
                </summary>
                <pre style="font-size:0.7rem; color:#e84118; background:#2d0000; padding:10px; overflow-x:auto; white-space: pre-wrap; border: 1px solid #c23616; border-radius: 4px; margin-top: 5px;">
${(formattedError)}
                </pre>
            </details>`;
        }
        
        // Кнопки действий
        const actionButtons = `
        <div style="margin-top:12px; display:flex; gap:8px; justify-content:flex-end;">
            <button onclick="window.Audit && window.Audit.exportSingleAuditEntry(${entry.id})" 
                    style="padding:5px 10px; font-size:0.75rem; background:#333; color:#ccc; border:1px solid #555; border-radius:4px; cursor:pointer; transition: all 0.2s;">
                <i class="fas fa-download"></i> Скачать
            </button>
            <button onclick="copyAuditEntry(${entry.id})" 
                    style="padding:5px 10px; font-size:0.75rem; background:#333; color:#ccc; border:1px solid #555; border-radius:4px; cursor:pointer; transition: all 0.2s;">
                <i class="fas fa-copy"></i> Копировать
            </button>
        </div>`;
        
        // Собираем всю запись
        listHTML += `
        <div style="padding:12px; border-bottom:1px solid #333; border-left: 4px solid ${borderColor}; margin-bottom: 10px; background: ${bgColor}; border-radius: 4px;">
            <div style="font-size: 0.85rem; margin-bottom: 10px; line-height: 1.4;">${headerText}</div>
            ${requestHtml}
            ${responseHtml}
            ${errorHtml}
            ${actionButtons}
        </div>`;
    });
    
    list.innerHTML = listHTML;
    updateLogCount();
    
    // Добавляем глобальную функцию копирования, если еще не добавлена
    if (!window.copyAuditEntry) {
        window.copyAuditEntry = function(entryId) {
            const state = State.getState();
            const entry = state.auditLog.find(e => e.id === entryId);
            
            if (!entry) {
                console.error('Запись аудита не найдена:', entryId);
                return;
            }
            
            let textToCopy = `=== АУДИТ ЗАПИСЬ ===\n\n`;
            textToCopy += `ID: ${entry.id}\n`;
            textToCopy += `Запрос: ${entry.request || 'Нет'}\n`;
            textToCopy += `Время: ${entry.timestamp || 'Нет'}\n`;
            textToCopy += `Статус: ${entry.status || 'Нет'}\n`;
            textToCopy += `Модель: ${entry.model || 'Нет'}\n`;
            textToCopy += `Провайдер: ${entry.provider || 'Нет'}\n`;
            if (entry.d10 !== undefined && entry.d10 !== null) {
                textToCopy += `d10: ${entry.d10}\n`;
            }
            textToCopy += `Токены: ${entry.tokens || 'Нет'}\n`;
            
            textToCopy += `\n=== REQUEST PAYLOAD ===\n`;
            if (entry.requestDebug?.body) {
                textToCopy += Utils.formatJsonWithUnicode(entry.requestDebug.body) + '\n';
            } else {
                textToCopy += 'Нет данных\n';
            }
            
            textToCopy += `\n=== RESPONSE ===\n`;
            if (entry.fullResponse) {
                textToCopy += Utils.formatJsonWithUnicode(entry.fullResponse) + '\n';
            } else if (entry.rawResponse){
                textToCopy += Utils.formatJsonWithUnicode(entry.rawResponse) + '\n';
            } else {
                textToCopy += 'Нет данных\n';
            }
            
            
            if (entry.rawError) {
                textToCopy += `\n=== ERROR ===\n${Utils.formatJsonWithUnicode(entry.rawError)}\n`;
            }
            
            textToCopy += `\n=== КОНЕЦ ЗАПИСИ ===`;
            
            // Копируем в буфер обмена
            navigator.clipboard.writeText(textToCopy).then(() => {
                // Показываем уведомление
                const notification = document.createElement('div');
                notification.style.cssText = `
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    background: #4cd137;
                    color: white;
                    padding: 12px 16px;
                    border-radius: 6px;
                    z-index: 10000;
                    font-size: 0.85rem;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
                    display: flex;
                    align-items: center;
                    gap: 8px;
                `;
                notification.innerHTML = `
                    <i class="fas fa-check-circle"></i>
                    <span>Запись скопирована в буфер обмена</span>
                `;
                document.body.appendChild(notification);
                
                // Автоматически скрываем через 2 секунды
                setTimeout(() => {
                    if (notification.parentNode) {
                        document.body.removeChild(notification);
                    }
                }, 2000);
            }).catch(err => {
                console.error('Ошибка копирования в буфер обмена:', err);
                
                // Альтернативный метод для старых браузеров
                const textArea = document.createElement('textarea');
                textArea.value = textToCopy;
                document.body.appendChild(textArea);
                textArea.select();
                try {
                    document.execCommand('copy');
                    console.log('Скопировано через execCommand');
                } catch (e) {
                    console.error('Не удалось скопировать:', e);
                }
                document.body.removeChild(textArea);
            });
        };
    }
}

// ====================================================================
// ПРИМЕНЕНИЕ ЭФФЕКТОВ СОСТОЯНИЯ
// ====================================================================

/**
 * Применяет визуальные эффекты, связанные с состоянием игры
 */
function applyStateEffects() {
    const state = State.getState();
    const body = document.body;
    
    // Режим ритуала
    if (state.isRitualActive) {
        body.classList.add('ritual-mode');
        console.log('🔮 Активирован режим ритуала');
    } else {
        body.classList.remove('ritual-mode');
    }
    
    // Эффекты безумия (если разум ниже 20)
    const sanityValue = State.getGameItemValue('stat:sanity') || 50;
    if (sanityValue < 20) {
        body.classList.add('glitch-active');
        console.log('🌀 Активированы эффекты безумия (разум < 20)');
    } else {
        body.classList.remove('glitch-active');
    }
    
    // Другие эффекты состояния могут быть добавлены здесь
}

// ====================================================================
// СИСТЕМА АЛЕРТОВ И УВЕДОМЛЕНИЙ
// ====================================================================

/**
 * Показывает алерт с заданными параметрами
 * @param {string} title - Заголовок алерта
 * @param {string} message - Основное сообщение
 * @param {any} details - Детали ошибки (объект или строка)
 * @param {string} type - Тип алерта ('error', 'success', 'warning')
 */
function showAlert(title, message, details = null, type = 'error') {
    const alertModal = document.getElementById('alertModal');
    const alertModalContent = document.getElementById('alertModalContent');
    const alertModalHeader = document.getElementById('alertModalHeader');
    const alertModalTitle = document.getElementById('alertModalTitle');
    const alertMessage = document.getElementById('alertMessage');
    const alertDetails = document.getElementById('alertDetails');
    const alertStack = document.getElementById('alertStack');
    const alertTimestamp = document.getElementById('alertTimestamp');
    const copyErrorBtn = document.getElementById('copyErrorBtn');
    
    if (!alertModal) {
        console.error('❌ showAlert: Модальное окно алерта не найдено');
        // Создаем временный алерт
        const tempAlert = document.createElement('div');
        tempAlert.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px;
            background: ${type === 'error' ? '#e84118' : type === 'success' ? '#4cd137' : '#fbc531'};
            color: white;
            border-radius: 6px;
            z-index: 10000;
            max-width: 400px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        `;
        tempAlert.innerHTML = `
            <strong>${title}</strong><br>
            ${message}
        `;
        document.body.appendChild(tempAlert);
        setTimeout(() => document.body.removeChild(tempAlert), 5000);
        return;
    }
    
    // Настраиваем стили в зависимости от типа
    let headerColor, bgColor, icon;
    
    switch (type) {
        case 'error':
            headerColor = '#e84118';
            bgColor = 'rgba(232, 65, 24, 0.1)';
            icon = '<i class="fas fa-exclamation-triangle"></i>';
            break;
        case 'success':
            headerColor = '#4cd137';
            bgColor = 'rgba(76, 209, 55, 0.1)';
            icon = '<i class="fas fa-check-circle"></i>';
            break;
        case 'warning':
            headerColor = '#fbc531';
            bgColor = 'rgba(251, 197, 49, 0.1)';
            icon = '<i class="fas fa-exclamation-circle"></i>';
            break;
        default:
            headerColor = '#48dbfb';
            bgColor = 'rgba(72, 219, 251, 0.1)';
            icon = '<i class="fas fa-info-circle"></i>';
    }
    
    alertModalContent.style.backgroundColor = bgColor;
    alertModalContent.style.border = `2px solid ${headerColor}`;
    alertModalHeader.style.backgroundColor = headerColor;
    alertModalTitle.innerHTML = `${icon} ${title}`;
    
    alertMessage.innerHTML = `
        <h3 style="margin-bottom: 0.8rem; color: ${headerColor};">${title}</h3>
        <div style="font-size: 0.95em; line-height: 1.5; color: #ddd;">${message}</div>
    `;
    
    // Обработка деталей
    if (details) {
        const formattedDetails = Utils.formatErrorDetails(details);
        alertDetails.value = formattedDetails;
        alertDetails.style.display = 'block';
        copyErrorBtn.style.display = 'block';
        
        // Настраиваем кнопку копирования
        copyErrorBtn.onclick = () => {
            if (!navigator.clipboard) {
                console.error('Буфер обмена не поддерживается');
                return;
            }
            
            navigator.clipboard.writeText(formattedDetails).then(() => {
                copyErrorBtn.innerHTML = '<i class="fas fa-check"></i> Скопировано!';
                copyErrorBtn.style.backgroundColor = '#4cd137';
                setTimeout(() => {
                    copyErrorBtn.innerHTML = '<i class="fas fa-copy"></i> Скопировать данные';
                    copyErrorBtn.style.backgroundColor = '';
                }, 2000);
            }).catch(err => {
                console.error('Ошибка копирования:', err);
                copyErrorBtn.innerHTML = '<i class="fas fa-times"></i> Ошибка';
                copyErrorBtn.style.backgroundColor = '#e84118';
                setTimeout(() => {
                    copyErrorBtn.innerHTML = '<i class="fas fa-copy"></i> Скопировать данные';
                    copyErrorBtn.style.backgroundColor = '';
                }, 2000);
            });
        };
        
        // Stack trace (если есть)
        if (details instanceof Error && details.stack) {
            alertStack.textContent = details.stack;
            alertStack.style.display = 'block';
        } else {
            alertStack.style.display = 'none';
        }
    } else {
        alertDetails.style.display = 'none';
        alertStack.style.display = 'none';
        copyErrorBtn.style.display = 'none';
    }
    
    // Время события
    alertTimestamp.textContent = `Время: ${Utils.formatMoscowTime(new Date())}`;
    alertTimestamp.style.color = headerColor;
    
    // Показываем модальное окно
    alertModal.classList.add('active');
    
    // Настраиваем закрытие
    const closeModal = () => {
        alertModal.classList.remove('active');
        // Сбрасываем состояние кнопки копирования
        copyErrorBtn.innerHTML = '<i class="fas fa-copy"></i> Скопировать данные';
        copyErrorBtn.style.backgroundColor = '';
    };
    
    const closeBtn = document.getElementById('closeAlertModalBtn');
    const okBtn = document.getElementById('alertModalOkBtn');
    if (closeBtn) closeBtn.onclick = closeModal;
    if (okBtn) okBtn.onclick = closeModal;
    
    // Закрытие по клику на оверлей
    alertModal.querySelector('.modal-overlay').onclick = (e) => {
        if (e.target === alertModal.querySelector('.modal-overlay')) {
            closeModal();
        }
    };
    
    // Закрытие по Escape
    const escapeHandler = (e) => {
        if (e.key === 'Escape') {
            closeModal();
            document.removeEventListener('keydown', escapeHandler);
        }
    };
    document.addEventListener('keydown', escapeHandler);
    
    console.log(`🔔 Показан алерт типа "${type}": ${title}`);
}

/**
 * Показывает алерт об ошибке
 */
function showErrorAlert(title, message, details = null) {
    showAlert(title, message, details, 'error');
}

/**
 * Показывает алерт об успехе
 */
function showSuccessAlert(title, message, details = null) {
    showAlert(title, message, details, 'success');
}

/**
 * Показывает предупреждение
 */
function showWarningAlert(title, message, details = null) {
    showAlert(title, message, details, 'warning');
}

// ====================================================================
// МЫСЛИ ГЕРОЯ (THOUGHTS OF HERO)
// ====================================================================

/**
 * Запускает отображение мыслей героя
 */
function startThoughtsOfHeroDisplay() {
    if (thoughtsOfHeroInterval) {
        clearInterval(thoughtsOfHeroInterval);
    }
    
    // Показываем контейнер
    showThoughtsOfHeroLayout();
    
    // Устанавливаем интервал для смены фраз
    thoughtsOfHeroInterval = setInterval(() => {
        let phrase = null;
        
        // Сначала пытаемся взять фразу из состояния
        if (State.getHeroPhrasesCount() > 0) {
            phrase = State.getHeroPhrase();
        } 
        // Если нет фраз в состоянии, берем случайную из запасных
        else if (CONFIG.thoughtsOfHeroFakes && CONFIG.thoughtsOfHeroFakes.length > 0) {
            const fakePhrases = CONFIG.thoughtsOfHeroFakes;
            phrase = fakePhrases[Math.floor(Math.random() * fakePhrases.length)];
        }
        
        // Если нашли фразу - обновляем текст
        if (phrase) {
            updateThoughtsOfHeroText(phrase);
        }
    }, 5000); // Меняем фразу каждые 5 секунд
    
    // Показываем первую фразу сразу
    setTimeout(() => {
        let phrase = null;
        
        if (State.getHeroPhrasesCount() > 0) {
            phrase = State.getHeroPhrase();
        } else if (CONFIG.thoughtsOfHeroFakes && CONFIG.thoughtsOfHeroFakes.length > 0) {
            const fakePhrases = CONFIG.thoughtsOfHeroFakes;
            phrase = fakePhrases[Math.floor(Math.random() * fakePhrases.length)];
        }
        
        if (phrase) {
            updateThoughtsOfHeroText(phrase);
        }
    }, 100);
    
    console.log('💭 Запущено отображение мыслей героя');
}

/**
 * Останавливает отображение мыслей героя
 */
function stopThoughtsOfHeroDisplay() {
    if (thoughtsOfHeroInterval) {
        clearInterval(thoughtsOfHeroInterval);
        thoughtsOfHeroInterval = null;
        console.log('💭 Остановлено отображение мыслей героя');
    }
    
    hideThoughtsOfHeroLayout();
}

/**
 * Показывает контейнер мыслей героя
 */
function showThoughtsOfHeroLayout() {
    if (dom.thoughtsOfHeroLayout) {
        dom.thoughtsOfHeroLayout.style.display = 'flex';
        dom.thoughtsOfHeroLayout.style.opacity = '1';
        console.log('💭 Контейнер мыслей героя показан');
    }
}

/**
 * Скрывает контейнер мыслей героя
 */
function hideThoughtsOfHeroLayout() {
    if (dom.thoughtsOfHeroLayout) {
        dom.thoughtsOfHeroLayout.style.display = 'none';
        console.log('💭 Контейнер мыслей героя скрыт');
    }
}

/**
 * Обновляет текст мыслей героя
 */
function updateThoughtsOfHeroText(text) {
    if (dom.thoughtsOfHeroText && text) {
        dom.thoughtsOfHeroText.textContent = text;
        
        // Добавляем анимацию появления
        dom.thoughtsOfHeroText.style.opacity = '0';
        setTimeout(() => {
            dom.thoughtsOfHeroText.style.opacity = '1';
        }, 50);
        
        console.log('💭 Обновлен текст мыслей героя:', text.substring(0, 50) + '...');
    }
}

// ====================================================================
// ЭКСПОРТ ВСЕХ ПУБЛИЧНЫХ ФУНКЦИЙ
// ====================================================================

export const Render = {
    // Основные функции рендеринга
    renderScene,
    renderChoices,
    renderAll,
    
    // UI режимы
    updateUIMode,
    
    // API Keys и модели
    updateApiKeyFields,
    renderModelSelectorByProvider,
    updateModelDetails,
    updateModelStats,
    updateLogCount,
    renderAuditList,
    
    // Модалы и алерты
    showAlert,
    showErrorAlert,
    showSuccessAlert,
    showWarningAlert,
    
    // Форматирование
    formatCompactRequirements,
    formatCompactOperations,
    getGameItemIcon,
    getRussianStatName,
    
    // Thoughts of Hero
    startThoughtsOfHeroDisplay,
    stopThoughtsOfHeroDisplay,
    showThoughtsOfHeroLayout,
    hideThoughtsOfHeroLayout,
    updateThoughtsOfHeroText,
    
    // Инициализация
    setupStateObservers
};

console.log('✅ Модуль 5-render.js загружен успешно');
console.log('📋 Функциональность: рендеринг сцены, выборов, памяти ГМ с полным рекурсивным раскрытием');