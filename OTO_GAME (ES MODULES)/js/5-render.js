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
 * Рекурсивно отображает объект aiMemory на всю глубину
 */
function renderAiMemoryRecursive(obj, depth = 0) {
    if (obj === null || obj === undefined) {
        return `<div style="margin-left: ${depth * 20}px; color: #888; font-style: italic;">
            ${obj === null ? 'null' : 'undefined'}
        </div>`;
    }
    
    if (typeof obj !== 'object' || Array.isArray(obj)) {
        // Примитивные значения и массивы
        let value = obj;
        let color = '#ccc';
        let style = '';
        
        if (typeof obj === 'boolean') {
            color = obj ? '#4cd137' : '#e84118';
            value = obj ? 'true' : 'false';
        } else if (typeof obj === 'number') {
            color = '#fbc531';
        } else if (Array.isArray(obj)) {
            color = '#9c88ff';
            value = `[${obj.length} элементов]`;
            style = 'font-style: italic;';
        } else if (typeof obj === 'string') {
            // Проверяем, не слишком ли длинная строка
            if (obj.length > 150) {
                value = obj;
                style = 'color: #aaa;';
            }
        }
        
        return `<div style="margin-left: ${depth * 20}px; color: ${color}; ${style}">
            ${JSON.stringify(value)}
        </div>`;
    }
    
    // Объекты
    const entries = Object.entries(obj);
    if (entries.length === 0) {
        return `<div style="margin-left: ${depth * 20}px; color: #888; font-style: italic;">
            { } (пустой объект)
        </div>`;
    }
    
    let html = '';
    entries.forEach(([key, value]) => {
        const keyHtml = `<span style="color: #fbc531; font-weight: bold;">${key}:</span>`;
        
        if (typeof value === 'object' && value !== null) {
            // Вложенный объект - рекурсивно обрабатываем
            html += `<div style="margin-left: ${depth * 20}px;">
                ${keyHtml}
            </div>`;
            html += renderAiMemoryRecursive(value, depth + 1);
        } else {
            // Простое значение
            html += `<div style="margin-left: ${depth * 20}px;">
                ${keyHtml} ${renderAiMemoryRecursive(value, 0)}
            </div>`;
        }
    });
    
    return html;
}

/**
 * Форматирует aiMemory для отображения
 */
function formatAiMemory(aiMemory) {
    if (!aiMemory || typeof aiMemory !== 'object') {
        return '<div style="color: #888; font-style: italic;">Нет данных в памяти</div>';
    }
    
    return renderAiMemoryRecursive(aiMemory);
}

// ====================================================================
// РЕНДЕРИНГ СЦЕНЫ (ТОЛЬКО СЦЕНА И МЕТА-БЛОКИ)
// ====================================================================

function renderScene() {
    const state = State.getState();
    
    if (!state.gameState.currentScene) {
        console.error('❌ renderScene: currentScene отсутствует');
        return;
    }
    
    const currentScene = state.gameState.currentScene;
    
    // Создаем контейнер для всей верхней секции
    const sceneContainer = dom.sceneArea;
    
    // Очищаем старый контент
    sceneContainer.innerHTML = '';
    
    // 1. Заметки дизайнера (если передано в ответе)
    if (currentScene.design_notes && currentScene.design_notes.trim() !== '') {
        const designNotesDiv = document.createElement('div');
        designNotesDiv.className = 'scene-meta-block';
        designNotesDiv.style.cssText = `
            margin-bottom: 10px;
            padding: 8px;
            background: rgba(102, 102, 102, 0.1);
            border-left: 3px solid #666;
            border-radius: 3px;
        `;
        designNotesDiv.innerHTML = `
            <div style="color: #888; font-size: 0.9em; font-weight: bold; margin-bottom: 5px;">
                <i class="fas fa-pencil-alt"></i> Заметки дизайнера:
            </div>
            <div style="color: #aaa; font-size: 0.85em; font-style: italic;">
                ${currentScene.design_notes}
            </div>
        `;
        sceneContainer.appendChild(designNotesDiv);
    }
    
    // 2. Память ГМ
    if (currentScene.aiMemory && Object.keys(currentScene.aiMemory).length > 0) {
        const aiMemoryDiv = document.createElement('div');
        aiMemoryDiv.className = 'scene-meta-block';
        aiMemoryDiv.style.cssText = `
            margin-bottom: 10px;
            padding: 8px;
            background: rgba(251, 197, 49, 0.1);
            border-left: 3px solid #fbc531;
            border-radius: 3px;
            max-height: 300px;
            overflow-y: auto;
        `;
        aiMemoryDiv.innerHTML = `
            <div style="color: #fbc531; font-size: 0.9em; font-weight: bold; margin-bottom: 8px; display: flex; align-items: center; gap: 5px;">
                <i class="fas fa-brain"></i> ПАМЯТЬ ГМ:
                <span style="font-size: 0.8em; color: #aaa; font-weight: normal; margin-left: auto;">
                    ${Object.keys(currentScene.aiMemory).length} поле(й)
                </span>
            </div>
            <div style="color: #aaa; font-size: 0.85em; font-family: 'Courier New', monospace; line-height: 1.4;">
                ${formatAiMemory(currentScene.aiMemory)}
            </div>
        `;
        sceneContainer.appendChild(aiMemoryDiv);
    }
    
    // 3. Сводка
    if (currentScene.summary && currentScene.summary.trim() !== '') {
        const summaryDiv = document.createElement('div');
        summaryDiv.className = 'scene-meta-block';
        summaryDiv.style.cssText = `
            margin-bottom: 10px;
            padding: 8px;
            background: rgba(72, 219, 251, 0.1);
            border-left: 3px solid #48dbfb;
            border-radius: 3px;
        `;
        summaryDiv.innerHTML = `
            <div style="color: #48dbfb; font-size: 0.9em; font-weight: bold; margin-bottom: 5px;">
                <i class="fas fa-file-alt"></i> Сводка:
            </div>
            <div style="color: #aaa; font-size: 0.85em;">
                ${currentScene.summary}
            </div>
        `;
        sceneContainer.appendChild(summaryDiv);
    }
    
    // 4. Контейнер для изменений за ход (заполняется TurnUpdatesUI)
    const turnUpdatesContainer = document.createElement('div');
    turnUpdatesContainer.id = 'turnUpdatesContainer';
    turnUpdatesContainer.style.cssText = 'margin-bottom: 10px;';
    sceneContainer.appendChild(turnUpdatesContainer);
    
    // 5. Основной текст сцены
    const sceneDiv = document.createElement('div');
    sceneDiv.className = 'scene-text';
    sceneDiv.id = 'sceneText';
    
    if (currentScene.scene) {
        sceneDiv.innerHTML = `<div style="color: #ddd; line-height: 1.5;">${currentScene.scene}</div>`;
    } else {
        sceneDiv.innerHTML = '<p>Сцена отсутствует</p>';
    }
    
    sceneContainer.appendChild(sceneDiv);
    
    // Обновляем ссылку в DOM объекте
    dom.sceneText = sceneDiv;
    
    // 6. Reflection
    if (currentScene.reflection && currentScene.reflection.trim() !== '') {
        const reflectionDiv = document.createElement('div');
        reflectionDiv.className = 'scene-reflection';
        reflectionDiv.id = 'sceneReflection';
        reflectionDiv.style.cssText = `
            margin-top: 15px;
            padding: 10px;
            background: rgba(72, 219, 251, 0.1);
            border-left: 3px solid #48dbfb;
            border-radius: 3px;
        `;
        reflectionDiv.innerHTML = `
            <div style="color: #48dbfb; font-size: 0.95em; font-weight: bold; margin-bottom: 5px;">
                <i class="fas fa-eye"></i> Рефлексия:
            </div>
            <div style="color: #ccc; font-size: 0.9em; font-style: italic;">
                ${currentScene.reflection}
            </div>
        `;
        sceneContainer.appendChild(reflectionDiv);
        dom.reflection = reflectionDiv;
    } else if (dom.reflection) {
        dom.reflection.style.display = 'none';
    }
    
    // 7. Personality
    if (currentScene.personality && currentScene.personality.trim() !== '') {
        const personalityDiv = document.createElement('div');
        personalityDiv.className = 'scene-personality';
        personalityDiv.style.cssText = `
            margin-top: 10px;
            padding: 10px;
            background: rgba(76, 209, 55, 0.1);
            border-left: 3px solid #4cd137;
            border-radius: 3px;
        `;
        personalityDiv.innerHTML = `
            <div style="color: #4cd137; font-size: 0.95em; font-weight: bold; margin-bottom: 5px;">
                <i class="fas fa-user-circle"></i> Личность изменена:
            </div>
            <div style="color: #ccc; font-size: 0.9em; font-style: italic;">
                ${currentScene.personality}
            </div>
        `;
        sceneContainer.appendChild(personalityDiv);
    }
    
    // 8. Typology
    if (currentScene.typology && currentScene.typology.trim() !== '') {
        const typologyDiv = document.createElement('div');
        typologyDiv.className = 'scene-typology';
        typologyDiv.style.cssText = `
            margin-top: 10px;
            padding: 10px;
            background: rgba(156, 136, 255, 0.1);
            border-left: 3px solid #9c88ff;
            border-radius: 3px;
        `;
        typologyDiv.innerHTML = `
            <div style="color: #9c88ff; font-size: 0.95em; font-weight: bold; margin-bottom: 5px;">
                <i class="fas fa-fingerprint"></i> Типология:
            </div>
            <div style="color: #ccc; font-size: 0.9em; font-style: italic;">
                ${currentScene.typology}
            </div>
        `;
        sceneContainer.appendChild(typologyDiv);
    }
    
    console.log('✅ Сцена отрендерена');
}

// ====================================================================
// РЕНДЕРИНГ ВЫБОРОВ
// ====================================================================

function renderChoices() {
    const state = State.getState();
    
    if (!dom.choicesList) {
        console.error('❌ renderChoices: choicesList не найден');
        return;
    }
    
    dom.choicesList.innerHTML = '';
    
    if (!state.gameState || !state.gameState.currentScene) {
        console.error('❌ renderChoices: currentScene отсутствует');
        return;
    }
    
    const currentScene = state.gameState.currentScene;
    const choices = currentScene.choices;
    
    if (!choices || !Array.isArray(choices)) {
        console.error('❌ renderChoices: choices отсутствует или не массив');
        return;
    }
    
    console.log(`📋 Отображаем ${choices.length} вариантов выбора`);
    
    choices.forEach((choice, idx) => {
        if (!choice || typeof choice !== 'object') {
            console.warn(`⚠️ Пропущен choice с индексом ${idx}: объект не существует`);
            return;
        }
        
        const btn = document.createElement('button');
        const isSelected = state.gameState.selectedActions &&
            Array.isArray(state.gameState.selectedActions) ?
            state.gameState.selectedActions.includes(idx) : false;
        
        btn.className = `choice-btn ${isSelected ? 'selected' : ''}`;
        
        const choiceText = choice.text || "Действие без названия";
        let content = `${choiceText}`;
        
        const difficulty = choice.difficulty_level || 5;
        content += `<div style="font-size:0.75rem; color:#888; margin-top:3px; opacity: 0.3">🎯 Сложность: ${difficulty}/10</div>`;
        
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
        
        btn.innerHTML = content;
        btn.onclick = () => Game.toggleChoice(idx);
        dom.choicesList.appendChild(btn);
    });
    
    const count = state.gameState.selectedActions ? state.gameState.selectedActions.length : 0;
    if (dom.choicesCounter) {
        dom.choicesCounter.textContent = `${count}/${CONFIG.maxChoices}`;
    }
    
    console.log('✅ Choices rendered');
}

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
        }
        
        return `<span style="color:${color};" title="${reqId}">${icon} ${displayName}</span>`;
    }).filter(item => item !== '');
    
    if (items.length === 0) return '';
    
    return `<div style="font-size:0.75rem; margin-top:3px; color:#888; opacity: 0.3">🔒 Треб: ${items.join(', ')}</div>`;
}

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
                display = `<span style="color:${color};">${getRussianStatName(name)} ${sign}${delta}</span>`;
            } else {
                display = `<span style="color:${color};">${name} ${sign}${delta}</span>`;
            }
        } else if (op.operation === 'ADD') {
            const icon = getGameItemIcon(op.id);
            display = `<span style="color:#4cd137;">+${icon} ${name}</span>`;
        } else if (op.operation === 'REMOVE') {
            const icon = getGameItemIcon(op.id);
            display = `<span style="color:#e84118;">-${icon} ${name}</span>`;
        } else if (op.operation === 'SET') {
            display = `<span style="color:#48dbfb;">${name} → ${op.value}</span>`;
        }
        
        if (display) {
            items.push(display);
        }
    });
    
    if (items.length === 0) return '';
    
    const bgColor = isSuccess ? '#0a1a0a' : '#1a0a0a';
    const borderColor = isSuccess ? '#4cd137' : '#e84118';
    const label = isSuccess ? '✅ При успехе' : '❌ При провале';
    
    return `<div style="font-size:0.7rem; margin-top:3px; padding:2px 4px; background:${bgColor}; border-left:2px solid ${borderColor}; border-radius:2px; opacity: 0.3">
        <div style="font-style:italic; margin-bottom:1px;">${label}:</div>
        ${items.join(', ')}
    </div>`;
}

function getRussianStatName(key) {
    const map = {
        'will': 'Воля',
        'stealth': 'Скрытность',
        'influence': 'Влияние',
        'sanity': 'Разум'
    };
    return map[key] || key;
}

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
        'quest': '🎯'
    };
    
    return icons[type] || '📌';
}

// ====================================================================
// КООРДИНАЦИЯ РЕНДЕРИНГА
// ====================================================================

function renderAll() {
    console.info(`🎨 RENDER ALL: запуск основного рендеринга сцены и выборов...`);
    
    try {
        // 1. Рендерим только сцену и выборы (это основная ответственность этого модуля)
        renderScene();
        renderChoices();
        
        console.info(`✅ RENDER ALL: сцена и выборы отрендерены`);
        
        // 2. GameItemUI, StatsUI и другие UI компоненты рендерят себя САМИ через свои подписки
        // Не дублируем вызовы здесь, чтобы избежать двойного рендеринга
        
    } catch (error) {
        console.error('❌ Критическая ошибка при основном рендеринге:', error);
        // Показываем пользователю ошибку
        if (dom.sceneArea) {
            dom.sceneArea.innerHTML = `
                <div style="color: #ff3838; padding: 20px; text-align: center;">
                    <h3><i class="fas fa-exclamation-triangle"></i> Ошибка отображения</h3>
                    <p>Произошла ошибка при загрузке сцены. Попробуйте перезагрузить страницу.</p>
                    <p style="font-size: 0.8em; color: #888;">${error.message}</p>
                </div>
            `;
        }
    }
}

// ====================================================================
// ПОДПИСКА НА СОБЫТИЯ ДЛЯ СЦЕНЫ
// ====================================================================

function setupStateObservers() {
    console.log('🔍 Настройка подписок на события для сцены...');
    
    // Подписка на изменение сцены
    State.on(State.EVENTS.SCENE_CHANGED, (data) => {
        console.log('🎯 RENDER: SCENE_CHANGED событие получено', data);
        try {
            renderScene();
            renderChoices();
            console.log('✅ RENDER: сцена и выборы обновлены после SCENE_CHANGED');
        } catch (error) {
            console.error('❌ RENDER: Ошибка при обработке SCENE_CHANGED:', error);
        }
    });
    
    // Подписка на изменение выбора
    State.on(State.EVENTS.CHOICES_CHANGED, (data) => {
        console.log('🎯 RENDER: CHOICES_CHANGED событие получено');
        try {
            renderChoices();
            console.log('✅ RENDER: выборы обновлены после CHOICES_CHANGED');
        } catch (error) {
            console.error('❌ RENDER: Ошибка при обработке CHOICES_CHANGED:', error);
        }
    });
    
    console.log('✅ RENDER: подписки для сцены настроены');
}

setupStateObservers();

// ====================================================================
// ОСТАЛЬНЫЕ ФУНКЦИИ (без изменений, но упрощенные)
// ====================================================================


function updateApiKeyFields() {
    const state = State.getState();
    
    Object.values(dom.keyFields).forEach(field => {
        field.classList.remove('active');
    });
    
    if (state.settings.apiProvider === 'openrouter') {
        dom.keyFields.openrouter.classList.add('active');
    } else if (state.settings.apiProvider === 'vsegpt') {
        dom.keyFields.vsegpt.classList.add('active');
    }
}

function renderModelSelectorByProvider() {
    const state = State.getState();
    const select = dom.inputs.model;
    const currentProvider = state.settings.apiProvider;
    
    select.innerHTML = '';
    
    const filteredModels = state.models.filter(m => m.provider === currentProvider);
    
    if (filteredModels.length === 0) {
        select.innerHTML = '<option value="">Нет доступных моделей для этого провайдера</option>';
        return;
    }
    
    filteredModels.forEach(model => {
        const opt = document.createElement('option');
        opt.value = model.id;
        opt.text = `${Utils.getStatusEmoji(model.status)} ${model.name}`;
        select.appendChild(opt);
    });
    
    const modelExists = filteredModels.some(m => m.id === state.settings.model);
    if (modelExists) {
        select.value = state.settings.model;
    } else if (filteredModels.length > 0) {
        state.settings.model = filteredModels[0].id;
        select.value = state.settings.model;
    }
}

function updateModelDetails() {
    const state = State.getState();
    const modelId = dom.inputs.model.value;
    const model = state.models.find(m => m.id === modelId);
    const details = document.getElementById('modelDetails');
    
    if (!details) return;
    
    if (model) {
        let detailsText = `Статус: ${Utils.getStatusEmoji(model.status)} ${model.status}<br>`;
        
        if (model.lastTested) {
            detailsText += `Последняя проверка: ${new Date(model.lastTested).toLocaleString()}<br>`;
        }
        
        if (model.responseTime) {
            detailsText += `Время отклика: ${model.responseTime}мс<br>`;
        }
        
        if (model.description) {
            detailsText += `Описание: ${model.description}`;
        }
        
        details.innerHTML = detailsText;
    } else {
        details.innerHTML = 'Модель не выбрана';
    }
}

function updateModelStats() {
    const stats = State.getModelStats();
    
    const totalElem = document.getElementById('modelTotal');
    const successElem = document.getElementById('modelSuccess');
    const errorElem = document.getElementById('modelError');
    const untestedElem = document.getElementById('modelUntested');
    
    if (totalElem) totalElem.textContent = stats.total;
    if (successElem) successElem.textContent = stats.success;
    if (errorElem) errorElem.textContent = stats.error;
    if (untestedElem) untestedElem.textContent = stats.untested;
}

function updateLogCount() {
    const state = State.getState();
    const logCountElem = document.getElementById('logCount');
    if (logCountElem) {
        logCountElem.textContent = `${state.auditLog.length} записей`;
    }
}

function renderAuditList() {
    const state = State.getState();
    const list = document.getElementById('auditList');
    
    if (!list) return;
    
    const displayLog = state.auditLog.slice(-20);
    
    list.innerHTML = displayLog.map(entry => {
        let statusColor = '#888';
        let borderColor = '#444';
        
        if (entry.status === 'success') {
            statusColor = '#4cd137';
            borderColor = '#2d8b57';
        } else if (entry.status === 'error') {
            statusColor = '#e84118';
            borderColor = '#c23616';
        } else if (entry.status === 'pending') {
            statusColor = '#fbc531';
            borderColor = '#e1b12c';
        }
        
        let headerText = `<span style="color:${statusColor}; font-weight:bold;">${entry.timestamp}</span>: [${entry.status.toUpperCase()}] - ${entry.request}`;
        if (entry.d10) headerText += ` (d10=${entry.d10})`;
        
        let requestHtml = '';
        if (entry.requestDebug && entry.requestDebug.body) {
            const formattedRequest = Utils.formatJsonWithUnicode(entry.requestDebug.body);
            requestHtml = `
            <details>
                <summary style="cursor:pointer; color:#aaa;">Request Payload</summary>
                <pre style="font-size:0.65rem; color:#ccc; background:#111; padding:5px; overflow-x:auto; white-space: pre-wrap; border: 1px solid #333;">${formattedRequest}</pre>
            </details>`;
        }
        
        let responseHtml = '';
        if (entry.fullResponse) {
            const formattedResponse = Utils.formatJsonWithUnicode(entry.fullResponse);
            responseHtml = `
            <details>
                <summary style="cursor:pointer; color:${statusColor};">Full Response</summary>
                <pre style="font-size:0.65rem; color:${statusColor}; background:#1a1a1a; padding:5px; overflow-x:auto; white-space: pre-wrap; border: 1px solid ${borderColor};">${formattedResponse}</pre>
            </details>`;
        }
        
        let errorHtml = '';
        if (entry.rawError) {
            const formattedError = Utils.formatJsonWithUnicode(entry.rawError);
            errorHtml = `
            <details open>
                <summary style="cursor:pointer; color:#e84118;">▼ ERROR DETAILS</summary>
                <pre style="font-size:0.65rem; color:#e84118; background:#2d0000; padding:5px; overflow-x:auto; white-space: pre-wrap;">${formattedError}</pre>
            </details>`;
        }
        
        const actionButtons = `
        <div style="margin-top:10px; display:flex; gap:8px; justify-content:flex-end;">
            <button onclick="window.Audit.exportSingleAuditEntry(${entry.id})" 
                    style="padding:3px 8px; font-size:0.7rem; background:#333; color:#ccc; border:1px solid #555; border-radius:3px; cursor:pointer;">
                <i class="fas fa-download"></i> Скачать
            </button>
            <button onclick="copyAuditEntry(${entry.id})" 
                    style="padding:3px 8px; font-size:0.7rem; background:#333; color:#ccc; border:1px solid #555; border-radius:3px; cursor:pointer;">
                <i class="fas fa-copy"></i> Копировать
            </button>
        </div>`;
        
        return `
        <div style="padding:0.5rem; border-bottom:1px solid #333; border-left: 4px solid ${borderColor}; margin-bottom: 5px; background: rgba(0,0,0,0.2);">
            <div style="font-size: 0.8rem; margin-bottom: 5px;">${headerText}</div>
            ${requestHtml}
            ${responseHtml}
            ${errorHtml}
            ${actionButtons}
        </div>`;
    }).join('');
    
    updateLogCount();
    
    if (!window.copyAuditEntry) {
        window.copyAuditEntry = function(entryId) {
            const state = State.getState();
            const entry = state.auditLog.find(e => e.id === entryId);
            
            if (!entry) return;
            
            let textToCopy = `Запрос: ${entry.request}\n`;
            textToCopy += `Время: ${entry.timestamp}\n`;
            textToCopy += `Статус: ${entry.status}\n`;
            textToCopy += `Модель: ${entry.model}\n`;
            textToCopy += `Провайдер: ${entry.provider}\n`;
            if (entry.d10) textToCopy += `d10: ${entry.d10}\n`;
            
            textToCopy += `\n=== REQUEST ===\n`;
            if (entry.requestDebug?.body) {
                textToCopy += Utils.formatJsonWithUnicode(entry.requestDebug.body) + '\n';
            }
            
            textToCopy += `\n=== RESPONSE ===\n`;
            if (entry.fullResponse) {
                textToCopy += Utils.formatJsonWithUnicode(entry.fullResponse) + '\n';
            }
            
            if (entry.rawError) {
                textToCopy += `\n=== ERROR ===\n${Utils.formatJsonWithUnicode(entry.rawError)}\n`;
            }
            
            navigator.clipboard.writeText(textToCopy).then(() => {
                const notification = document.createElement('div');
                notification.style.cssText = `
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    background: #4cd137;
                    color: white;
                    padding: 10px 15px;
                    border-radius: 5px;
                    z-index: 10000;
                    font-size: 0.8rem;
                    box-shadow: 0 2px 10px rgba(0,0,0,0.3);
                `;
                notification.textContent = 'Запись скопирована в буфер обмена';
                document.body.appendChild(notification);
                
                setTimeout(() => {
                    document.body.removeChild(notification);
                }, 2000);
            }).catch(err => {
                console.error('Ошибка копирования:', err);
            });
        };
    }
}

function applyStateEffects() {
    const state = State.getState();
    const body = document.body;
    
    if (state.isRitualActive) {
        body.classList.add('ritual-mode');
    } else {
        body.classList.remove('ritual-mode');
    }
    
    const sanityValue = State.getGameItemValue('stat:sanity') || 50;
    if (sanityValue < 20) {
        body.classList.add('glitch-active');
    } else {
        body.classList.remove('glitch-active');
    }
}

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
    
    if (!alertModal) return;
    
    if (type === 'error') {
        alertModalContent.className = 'alert-modal-content error';
        alertModalHeader.className = 'modal-header alert-modal-header error';
        alertModalTitle.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Ошибка';
        copyErrorBtn.style.display = details ? 'block' : 'none';
    } else if (type === 'success') {
        alertModalContent.className = 'alert-modal-content success';
        alertModalHeader.className = 'modal-header alert-modal-header success';
        alertModalTitle.innerHTML = '<i class="fas fa-check-circle"></i> Успех';
        copyErrorBtn.style.display = 'none';
    } else if (type === 'warning') {
        alertModalContent.className = 'alert-modal-content warning';
        alertModalHeader.className = 'modal-header alert-modal-header warning';
        alertModalTitle.innerHTML = '<i class="fas fa-exclamation-circle"></i> Внимание';
        copyErrorBtn.style.display = details ? 'block' : 'none';
    }
    
    alertMessage.innerHTML = `<h3 style="margin-bottom: 0.5rem;">${title}</h3><p>${message}</p>`;
    
    if (details) {
        const formattedDetails = Utils.formatErrorDetails(details);
        alertDetails.value = formattedDetails;
        alertDetails.style.display = 'block';
        
        copyErrorBtn.onclick = () => {
            if (!navigator.clipboard) return;
            navigator.clipboard.writeText(formattedDetails).then(() => {
                copyErrorBtn.innerHTML = '<i class="fas fa-check"></i> Скопировано!';
                setTimeout(() => {
                    copyErrorBtn.innerHTML = '<i class="fas fa-copy"></i> Скопировать данные';
                }, 2000);
            }).catch(err => {
                console.error('Ошибка копирования:', err);
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
    }
    
    alertTimestamp.textContent = `Время: ${Utils.formatMoscowTime(new Date())}`;
    alertTimestamp.className = `alert-details ${type}`;
    
    alertModal.classList.add('active');
    
    const closeModal = () => alertModal.classList.remove('active');
    const closeBtn = document.getElementById('closeAlertModalBtn');
    const okBtn = document.getElementById('alertModalOkBtn');
    if (closeBtn) closeBtn.onclick = closeModal;
    if (okBtn) okBtn.onclick = closeModal;
    
    alertModal.querySelector('.modal-overlay').onclick = (e) => {
        if (e.target === alertModal.querySelector('.modal-overlay')) closeModal();
    };
}

function showWarningAlert(title, message, details = null) {
    showAlert(title, message, details, 'warning');
}

function showErrorAlert(title, message, details = null) {
    showAlert(title, message, details, 'error');
}

function showSuccessAlert(title, message, details = null) {
    showAlert(title, message, details, 'success');
}

// ====================================================================
// THOUGHTS OF HERO
// ====================================================================

function startThoughtsOfHeroDisplay() {
    if (thoughtsOfHeroInterval) clearInterval(thoughtsOfHeroInterval);
    showThoughtsOfHeroLayout();
    
    thoughtsOfHeroInterval = setInterval(() => {
        let phrase = null;
        
        if (State.getHeroPhrasesCount() > 0) {
            phrase = State.getHeroPhrase();
        } else if (CONFIG.thoughtsOfHeroFakes.length > 0) {
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
        } else if (CONFIG.thoughtsOfHeroFakes.length > 0) {
            const fakePhrases = CONFIG.thoughtsOfHeroFakes;
            phrase = fakePhrases[Math.floor(Math.random() * fakePhrases.length)];
        }
        
        if (phrase) {
            updateThoughtsOfHeroText(phrase);
        }
    }, 100);
}

function stopThoughtsOfHeroDisplay() {
    if (thoughtsOfHeroInterval) {
        clearInterval(thoughtsOfHeroInterval);
        thoughtsOfHeroInterval = null;
    }
    
    hideThoughtsOfHeroLayout();
}

function showThoughtsOfHeroLayout() {
    if (dom.thoughtsOfHeroLayout) {
        dom.thoughtsOfHeroLayout.style.display = 'flex';
    }
}

function hideThoughtsOfHeroLayout() {
    if (dom.thoughtsOfHeroLayout) {
        dom.thoughtsOfHeroLayout.style.display = 'none';
    }
}

function updateThoughtsOfHeroText(text) {
    if (dom.thoughtsOfHeroText) {
        dom.thoughtsOfHeroText.textContent = text;
    }
}


function updateUIMode() {
    const state = State.getState();
    
    dom.freeModeToggle.checked = state.freeMode;
    
    if (state.freeMode) {
        dom.choicesList.style.display = 'none';
        dom.freeInputWrapper.style.display = 'block';
        dom.modeIcon.innerHTML = '<i class="fas fa-keyboard"></i>';
        dom.modeText.textContent = 'Режим: Свободный ввод';
        dom.modeText.classList.add('free-mode');
        dom.choicesCounter.textContent = `${state.freeModeText.length > 0 ? '✓' : '0'}/∞'`;
        
        dom.freeInputText.value = state.freeModeText;
        dom.freeInputText.disabled = false;
        
        const scale = state.settings.scale;
        const baseHeight = 140;
        const adjustedHeight = baseHeight * scale;
        dom.freeInputText.style.height = `${adjustedHeight}px`;
        dom.freeInputText.style.minHeight = `${adjustedHeight}px`;
        
        setTimeout(() => {
            dom.freeInputText.focus();
            dom.freeInputText.scrollTop = dom.freeInputText.scrollHeight;
        }, 100);
        
        dom.btnSubmit.disabled = state.freeModeText.trim().length === 0;
    } else {
        dom.choicesList.style.display = 'block';
        dom.freeInputWrapper.style.display = 'none';
        dom.modeIcon.innerHTML = '<i class="fas fa-list-ul"></i>';
        dom.modeText.textContent = 'Режим: Варианты';
        dom.modeText.classList.remove('free-mode');
    }
}

// ====================================================================
// ЭКСПОРТ ВСЕХ ПУБЛИЧНЫХ ФУНКЦИЙ
// ====================================================================

export const Render = {
    // Основные функции рендеринга
    renderScene,
    renderChoices,
    renderAll, // ТОЛЬКО сцена и выборы
    
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
    updateThoughtsOfHeroText
};

console.log('✅ 5-render.js (координирующий слой) загружен успешно');
console.log('📋 Функциональность: рендеринг сцены и выборов, GameItemUI рендерит себя самостоятельно');