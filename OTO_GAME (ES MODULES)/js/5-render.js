// Модуль 5: RENDER - Отрисовка сцены и мета-блоков
'use strict';

import { CONFIG } from './1-config.js';
import { State } from './3-state.js';
import { DOM } from './4-dom.js';
import { Utils } from './2-utils.js';
import { GameItemUI } from './gameitem-ui.js';
import { Game } from './6-game.js';
import { Audit } from './8-audit.js';
import { showEye, hideEye } from './eye.js';

// Импортируем функции рендеринга секций сцены
import {
    renderDesignNotes,
    renderAiMemory,
    renderSummary,
    renderSceneText,
    renderReflection,
    renderPersonality,
    renderTypology,
    renderAdditionalFields
} from './scene-ui.js';

const dom = DOM.getDOM();
let thoughtsOfHeroInterval = null;

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
// РЕНДЕРИНГ СЦЕНЫ (ТОЛЬКО СЦЕНА И МЕТА-БЛОКИ)
// ====================================================================

/**
 * Основная функция рендеринга сцены и всех мета-блоков
 */
function renderScene() {
    const state = State.getState();
    
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
    const sceneContainer = dom.sceneArea;
    
    // Сохраняем turnUpdatesContainer перед очисткой
    const existingTurnUpdates = document.getElementById('turnUpdatesContainer');
    let savedTurnUpdatesHTML = '';
    let savedTurnUpdatesDisplay = 'block';
    
    if (existingTurnUpdates) {
        savedTurnUpdatesHTML = existingTurnUpdates.innerHTML;
        savedTurnUpdatesDisplay = existingTurnUpdates.style.display || 'block';
        console.log('💾 renderScene: Сохранен turnUpdatesContainer перед очисткой sceneArea');
    }
    
    sceneContainer.innerHTML = '';
    
    // --- Рендеринг мета-блоков (порядок важен) ---
    renderDesignNotes(sceneContainer, currentScene.design_notes);
    renderAiMemory(sceneContainer, currentScene.aiMemory);
    renderSummary(sceneContainer, currentScene.summary);
    
    // Восстанавливаем/создаём контейнер для изменений за ход (он будет заполняться отдельно)
    if (savedTurnUpdatesHTML) {
        const restoredTurnUpdates = document.createElement('div');
        restoredTurnUpdates.id = 'turnUpdatesContainer';
        // Убираем margin-bottom, так как отступы теперь управляются глобально
        restoredTurnUpdates.style.cssText = `
            display: ${savedTurnUpdatesDisplay};
            transition: all 0.3s ease;
        `;
        restoredTurnUpdates.innerHTML = savedTurnUpdatesHTML;
        sceneContainer.appendChild(restoredTurnUpdates);
        console.log('✅ Восстановлен turnUpdatesContainer с сохранённым содержимым');
    } else {
        const newTurnUpdates = document.createElement('div');
        newTurnUpdates.id = 'turnUpdatesContainer';
        newTurnUpdates.style.cssText = 'min-height: 20px;'; // margin-bottom убран
        sceneContainer.appendChild(newTurnUpdates);
        console.log('📝 Создан новый пустой turnUpdatesContainer');
    }
    
    renderSceneText(sceneContainer, currentScene.scene);
    renderReflection(sceneContainer, currentScene.reflection);
    renderPersonality(sceneContainer, currentScene.personality);
    renderTypology(sceneContainer, currentScene.typology);
    
    // Дополнительные поля (исключая известные)
    const knownFields = ['design_notes', 'aiMemory', 'summary', 'scene', 'reflection', 'personality', 'typology', 'choices'];
    renderAdditionalFields(sceneContainer, currentScene, knownFields);
    
    // Обновляем ссылку на sceneText в DOM объекте
    dom.sceneText = document.getElementById('sceneText');
    
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
                displayName = Utils.getRussianStatName(name);
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
                display = `<span style="color:${color}; font-weight:bold;">${Utils.getRussianStatName(name)} ${sign}${delta}</span>`;
            } else {
                display = `<span style="color:${color}; font-weight:bold;">${name} ${sign}${delta}</span>`;
            }
        } else if (op.operation === 'ADD') {
            const icon = Utils.getGameItemIcon(op.id);
            display = `<span style="color:#4cd137; font-weight:bold;">+${icon} ${name}</span>`;
        } else if (op.operation === 'REMOVE') {
            const icon = Utils.getGameItemIcon(op.id);
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
 * Основная функция рендеринга вариантов выбора
 */
function renderChoices() {
    const state = State.getState();
    
    if (!dom.choicesList) {
        console.error('❌ renderChoices: choicesList не найден в DOM');
        return;
    }
    
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
    
    choices.forEach((choice, idx) => {
        if (!choice || typeof choice !== 'object') {
            console.warn(`⚠️ renderChoices: Пропущен выбор с индексом ${idx}: объект не существует`);
            return;
        }
        
        const btn = document.createElement('button');
        const isSelected = state.gameState.selectedActions &&
            Array.isArray(state.gameState.selectedActions) ?
            state.gameState.selectedActions.includes(idx) : false;
        
        btn.className = `choice-btn ${isSelected ? 'selected' : ''}`;
        // Убираем инлайн margin-bottom, он будет задан через тему
        btn.style.cssText = `
            text-align: left;
            padding: 12px 15px;
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
        
        const choiceText = choice.text || "Действие без названия";
        let content = `<div style="font-size: 1em; font-weight: bold; margin-bottom: 5px;">${Utils.escapeHtml(choiceText)}</div>`;
        
        const difficulty = choice.difficulty_level || 5;
        let difficultyColor = '#4cd137';
        if (difficulty >= 8) difficultyColor = '#e84118';
        else if (difficulty >= 5) difficultyColor = '#fbc531';
        
        content += `<div style="font-size:0.8rem; color:${difficultyColor}; margin-top:3px; opacity: 0.7">
            🎯 Сложность: <strong>${difficulty}/10</strong>
        </div>`;
        
        if (Array.isArray(choice.requirements) && choice.requirements.length > 0) {
            content += formatCompactRequirements(choice.requirements);
        } else {
            content += `<div style="font-size:0.75rem; color:#888; margin-top:3px; opacity: 0.3">🔓 Нет требований</div>`;
        }
        
        if (Array.isArray(choice.success_rewards) && choice.success_rewards.length > 0) {
            content += formatCompactOperations(choice.success_rewards, 'success');
        }
        
        if (Array.isArray(choice.fail_penalties) && choice.fail_penalties.length > 0) {
            content += formatCompactOperations(choice.fail_penalties, 'fail');
        }
        
        if (choice.description && choice.description.trim() !== '') {
            content += `<div style="font-size:0.8rem; color:#aaa; margin-top:8px; padding-top:8px; border-top: 1px dashed #444; font-style: italic;">
                ${Utils.escapeHtml(choice.description)}
            </div>`;
        }
        
        btn.innerHTML = content;
        
        btn.onclick = () => {
            console.log(`🎯 Выбор ${idx} кликнут: "${choiceText}"`);
            Game.toggleChoice(idx);
        };
        
        dom.choicesList.appendChild(btn);
    });
    
    const count = state.gameState.selectedActions ? state.gameState.selectedActions.length : 0;
    if (dom.choicesCounter) {
        dom.choicesCounter.textContent = `${count}/${CONFIG.maxChoices}`;
        dom.choicesCounter.style.color = count >= CONFIG.maxChoices ? '#4cd137' : '#fbc531';
    }
    
    console.log('✅ renderChoices: Все варианты выбора отрендерены');
}

// ====================================================================
// ОБНОВЛЕНИЕ РЕЖИМОВ ИНТЕРФЕЙСА
// ====================================================================

/**
 * Обновляет интерфейс в зависимости от режима игры (обычный/свободный ввод)
 */
function updateUIMode() {
    const state = State.getState();
    
    dom.freeModeToggle.checked = state.freeMode;
    
    if (state.freeMode) {
        dom.choicesList.style.display = 'none';
        dom.freeInputWrapper.style.display = 'block';
        dom.modeIcon.innerHTML = '<i class="fas fa-keyboard"></i>';
        dom.modeText.textContent = 'Режим: Свободный ввод';
        dom.modeText.classList.add('free-mode');
        
        const hasText = state.freeModeText && state.freeModeText.trim().length > 0;
        dom.choicesCounter.textContent = hasText ? '✓ Готово' : 'Введите текст...';
        
        dom.freeInputText.value = state.freeModeText || '';
        dom.freeInputText.disabled = false;
        
        const scale = state.settings.scale || 1;
        const baseHeight = 140;
        const adjustedHeight = baseHeight * scale;
        dom.freeInputText.style.height = `${adjustedHeight}px`;
        dom.freeInputText.style.minHeight = `${adjustedHeight}px`;
        
        setTimeout(() => {
            dom.freeInputText.focus();
            dom.freeInputText.scrollTop = dom.freeInputText.scrollHeight;
        }, 100);
        
        dom.btnSubmit.disabled = !hasText;
        
        console.log('🔄 UI переключен в режим свободного ввода');
    } else {
        dom.choicesList.style.display = 'block';
        dom.freeInputWrapper.style.display = 'none';
        dom.modeIcon.innerHTML = '<i class="fas fa-list-ul"></i>';
        dom.modeText.textContent = 'Режим: Варианты выбора';
        dom.modeText.classList.remove('free-mode');
        
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
    
    Object.values(dom.keyFields).forEach(field => {
        if (field) {
            field.classList.remove('active');
            field.style.display = 'none';
        }
    });
    
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
    
    select.innerHTML = '';
    
    const currentProvider = state.settings.apiProvider;
    const filteredModels = state.models.filter(m => m.provider === currentProvider);
    
    if (filteredModels.length === 0) {
        const opt = document.createElement('option');
        opt.value = '';
        opt.text = '❌ Нет доступных моделей для этого провайдера';
        select.appendChild(opt);
        select.disabled = true;
        console.warn(`⚠️ Нет моделей для провайдера: ${currentProvider}`);
        return;
    }
    
    select.disabled = false;
    
    filteredModels.forEach(model => {
        const opt = document.createElement('option');
        opt.value = model.id;
        
        let statusEmoji = Utils.getStatusEmoji(model.status);
        let providerEmoji = model.provider === 'openrouter' ? '🌐' : '🤖';
        let name = model.name || model.id;
        
        opt.text = `${statusEmoji} ${providerEmoji} ${name}`;
        
        if (model.description) {
            opt.title = model.description;
        }
        
        select.appendChild(opt);
    });
    
    const modelExists = filteredModels.some(m => m.id === state.settings.model);
    if (modelExists) {
        select.value = state.settings.model;
        console.log(`✅ Модель "${state.settings.model}" выбрана для провайдера ${currentProvider}`);
    } else if (filteredModels.length > 0) {
        state.settings.model = filteredModels[0].id;
        select.value = state.settings.model;
        console.log(`✅ Установлена модель по умолчанию: ${state.settings.model}`);
    }
    
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
    
    detailsHTML += `<div style="margin-bottom: 5px;">
        <strong>Статус:</strong> ${Utils.getStatusEmoji(model.status)} <span style="color: ${model.status === 'available' ? '#4cd137' : model.status === 'testing' ? '#fbc531' : '#e84118'}">${model.status}</span>
    </div>`;
    
    detailsHTML += `<div style="margin-bottom: 5px;">
        <strong>Провайдер:</strong> ${model.provider === 'openrouter' ? '🌐 OpenRouter' : '🤖 VseGPT'}
    </div>`;
    
    if (model.lastTested) {
        const lastTestedDate = new Date(model.lastTested);
        detailsHTML += `<div style="margin-bottom: 5px;">
            <strong>Последняя проверка:</strong> ${lastTestedDate.toLocaleString('ru-RU')}
        </div>`;
    }
    
    if (model.responseTime) {
        const timeColor = model.responseTime < 1000 ? '#4cd137' : model.responseTime < 3000 ? '#fbc531' : '#e84118';
        detailsHTML += `<div style="margin-bottom: 5px;">
            <strong>Время отклика:</strong> <span style="color: ${timeColor}">${model.responseTime} мс</span>
        </div>`;
    }
    
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
    const totalEl = document.getElementById('modelTotal');
    const successEl = document.getElementById('modelSuccess');
    const errorEl = document.getElementById('modelError');
    const untestedEl = document.getElementById('modelUntested');
    
    if (totalEl) totalEl.textContent = stats.total;
    if (successEl) successEl.textContent = stats.success;
    if (errorEl) errorEl.textContent = stats.error;
    if (untestedEl) untestedEl.textContent = stats.untested;
}

// ====================================================================
// ПРИМЕНЕНИЕ ЭФФЕКТОВ СОСТОЯНИЯ
// ====================================================================

function applyStateEffects() {
    const state = State.getState();
    const body = document.body;
    
    if (state.isRitualActive) {
        body.classList.add('ritual-mode');
        console.log('🔮 Активирован режим ритуала');
    } else {
        body.classList.remove('ritual-mode');
    }
    
    const sanityValue = State.getGameItemValue('stat:sanity') || 50;
    if (sanityValue < 20) {
        body.classList.add('glitch-active');
        console.log('🌀 Активированы эффекты безумия (разум < 20)');
    } else {
        body.classList.remove('glitch-active');
    }
}

// ====================================================================
// СИСТЕМА АЛЕРТОВ И УВЕДОМЛЕНИЙ
// ====================================================================

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
    
    if (details) {
        const formattedDetails = Utils.formatErrorDetails(details);
        alertDetails.value = formattedDetails;
        alertDetails.style.display = 'block';
        copyErrorBtn.style.display = 'block';
        
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
    
    alertTimestamp.textContent = `Время: ${Utils.formatMoscowTime(new Date())}`;
    alertTimestamp.style.color = headerColor;
    
    alertModal.classList.add('active');
    
    const closeModal = () => {
        alertModal.classList.remove('active');
        copyErrorBtn.innerHTML = '<i class="fas fa-copy"></i> Скопировать данные';
        copyErrorBtn.style.backgroundColor = '';
    };
    
    const closeBtn = document.getElementById('closeAlertModalBtn');
    const okBtn = document.getElementById('alertModalOkBtn');
    if (closeBtn) closeBtn.onclick = closeModal;
    if (okBtn) okBtn.onclick = closeModal;
    
    alertModal.querySelector('.modal-overlay').onclick = (e) => {
        if (e.target === alertModal.querySelector('.modal-overlay')) {
            closeModal();
        }
    };
    
    const escapeHandler = (e) => {
        if (e.key === 'Escape') {
            closeModal();
            document.removeEventListener('keydown', escapeHandler);
        }
    };
    document.addEventListener('keydown', escapeHandler);
    
    console.log(`🔔 Показан алерт типа "${type}": ${title}`);
}

function showErrorAlert(title, message, details = null) {
    showAlert(title, message, details, 'error');
}

function showSuccessAlert(title, message, details = null) {
    showAlert(title, message, details, 'success');
}

function showWarningAlert(title, message, details = null) {
    showAlert(title, message, details, 'warning');
}

// ====================================================================
// МЫСЛИ ГЕРОЯ (THOUGHTS OF HERO)
// ====================================================================

function startThoughtsOfHeroDisplay() {
    if (thoughtsOfHeroInterval) {
        clearInterval(thoughtsOfHeroInterval);
    }
    
    showThoughtsOfHeroLayout();
    showEye();
    
    thoughtsOfHeroInterval = setInterval(() => {
        let phrase = null;
        
        if (State.getHeroPhrasesCount() > 0) {
            phrase = State.getHeroPhrase();
        } 
        else if (CONFIG.thoughtsOfHeroFakes && CONFIG.thoughtsOfHeroFakes.length > 0) {
            const fakePhrases = CONFIG.thoughtsOfHeroFakes;
            phrase = fakePhrases[Math.floor(Math.random() * fakePhrases.length)];
        }
        
        if (phrase) {
            updateThoughtsOfHeroText(phrase);
        }
    }, 5000);
    
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

function stopThoughtsOfHeroDisplay() {
    if (thoughtsOfHeroInterval) {
        clearInterval(thoughtsOfHeroInterval);
        thoughtsOfHeroInterval = null;
        console.log('💭 Остановлено отображение мыслей героя');
    }
    
    hideThoughtsOfHeroLayout();
    hideEye();
}

function showThoughtsOfHeroLayout() {
    if (dom.thoughtsOfHeroLayout) {
        dom.thoughtsOfHeroLayout.style.display = 'flex';
        dom.thoughtsOfHeroLayout.style.opacity = '1';
        console.log('💭 Контейнер мыслей героя показан');
    }
}

function hideThoughtsOfHeroLayout() {
    if (dom.thoughtsOfHeroLayout) {
        dom.thoughtsOfHeroLayout.style.display = 'none';
        console.log('💭 Контейнер мыслей героя скрыт');
    }
}

function updateThoughtsOfHeroText(text) {
    if (dom.thoughtsOfHeroText && text) {
        dom.thoughtsOfHeroText.textContent = text;
        
        dom.thoughtsOfHeroText.style.opacity = '0';
        setTimeout(() => {
            dom.thoughtsOfHeroText.style.opacity = '1';
        }, 50);
        
        console.log('💭 Обновлен текст мыслей героя:', text.substring(0, 50) + '...');
    }
}

// ====================================================================
// КООРДИНАЦИЯ РЕНДЕРИНГА
// ====================================================================

function renderAll() {
    console.info('🎨 RENDER ALL: Запуск основного рендеринга сцены и выборов...');
    
    try {
        renderScene();
        renderChoices();
        console.info('✅ RENDER ALL: Сцена и выборы полностью отрендерены');
    } catch (error) {
        console.error('❌ Критическая ошибка при основном рендеринге:', error);
        if (dom.sceneArea) {
            dom.sceneArea.innerHTML = `
                <div style="color: #ff3838; padding: 30px; text-align: center; background: rgba(232, 65, 24, 0.1); border-radius: 8px; border: 2px solid #e84118;">
                    <h3 style="margin-bottom: 15px;"><i class="fas fa-exclamation-triangle"></i> Ошибка отображения сцены</h3>
                    <p style="margin-bottom: 15px;">Произошла критическая ошибка при загрузке сцены.</p>
                    <p style="font-size: 0.9em; color: #aaa; margin-bottom: 20px;">Попробуйте перезагрузить страницу или начать новую игру.</p>
                    <div style="background: rgba(0,0,0,0.3); padding: 10px; border-radius: 4px; font-family: monospace; font-size: 0.8em; text-align: left;">
                        ${Utils.escapeHtml(error.message)}
                    </div>
                </div>
            `;
        }
        console.error('Полная информация об ошибке:', error);
    }
}

// ====================================================================
// ПОДПИСКА НА СОБЫТИЯ ДЛЯ СЦЕНЫ
// ====================================================================

function setupStateObservers() {
    console.log('🔍 Настройка подписок на события для сцены...');
    
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
    
    State.on(State.EVENTS.AUDIT_LOG_UPDATED, (data) => {
        const modal = document.getElementById('settingsModal');
        const list = document.getElementById('auditList');
        if (modal && modal.classList.contains('active') && list) {
            if (data.newEntry) {
                Audit.appendAuditEntry(data.newEntry);
            } else {
                Audit.renderAuditList();
            }
        }
    });
    
    console.log('✅ RENDER: Все подписки для сцены успешно настроены');
}

// ====================================================================
// ЭКСПОРТ ВСЕХ ПУБЛИЧНЫХ ФУНКЦИЙ
// ====================================================================

export const Render = {
    renderScene,
    renderChoices,
    renderAll,
    updateUIMode,
    updateApiKeyFields,
    renderModelSelectorByProvider,
    updateModelDetails,
    updateModelStats,
    showAlert,
    showErrorAlert,
    showSuccessAlert,
    showWarningAlert,
    startThoughtsOfHeroDisplay,
    stopThoughtsOfHeroDisplay,
    showThoughtsOfHeroLayout,
    hideThoughtsOfHeroLayout,
    updateThoughtsOfHeroText,
    applyStateEffects,
    setupStateObservers,
    formatCompactRequirements,
    formatCompactOperations
};

// Глобальные ссылки для алертов и мыслей героя (оставлены, если нужны)
window.showNotification = Utils.showToast; // для совместимости

console.log('✅ Модуль 5-render.js загружен успешно');