// Модуль 5: RENDER - Отрисовка интерфейса (ФОРМАТ 4.1)
'use strict';

import { CONFIG } from './1-config.js';
import { State } from './3-state.js';
import { DOM } from './4-dom.js';
import { Utils } from './2-utils.js';
import { Game } from './6-game.js';
import { Audit } from './8-audit.js';

const dom = DOM.getDOM();

// 🚫🚫🚫 ДОБАВЛЕНО: Функция для получения цвета по значению стата (0-100)
function getStatColor(value) {
    // Ограничиваем значение от 0 до 100 для градиента
    const val = Math.max(0, Math.min(100, value));
    
    // Градиент от тёмно-красного до белого через 10 промежуточных цветов
    if (val <= 10) return '#800000'; // тёмно-красный
    if (val <= 20) return '#FF0000'; // красный
    if (val <= 30) return '#FF5500'; // оранжевый
    if (val <= 40) return '#FFAA00'; // оранжево-желтый
    if (val <= 50) return '#FFD700'; // золотой (жёлтый)
    if (val <= 60) return '#ADFF2F'; // салатовый
    if (val <= 70) return '#00FF00'; // зелёный
    if (val <= 80) return '#20B2AA'; // цвет морской волны
    if (val <= 90) return '#87CEEB'; // цвет неба
    return '#FFFFFF'; // белый (100)
}

// Подписка на события состояния
function setupStateObservers() {
    console.log('🔍 Настройка подписок на события состояния...');
    
    State.onHeroChange((data) => {
        console.log('🎯 Событие: hero:changed', data);
        renderStats();
        renderAllGameItems();
    });
    
    State.onSceneChange((data) => {
        console.log('🎯 Событие: scene:changed', data);
        renderScene();
        renderChoices();
    });
    
    State.onTurnComplete((data) => {
        console.log('🎯 Событие: turn:completed', data);
        renderHistory();
        if (dom.turnCounter) {
            dom.turnCounter.innerHTML = `ХОДЫ: <span style="color: #888; font-family: monospace;">${State.getTurnCount()}</span>`;
        }
    });
    
    State.onSettingsChange(() => {
        updateApiKeyFields();
        renderModelSelectorByProvider();
        updateModelDetails();
    });
    
    State.on(State.EVENTS.UI_STATE_CHANGED, () => {
        updateUIMode();
    });
    
    State.on(State.EVENTS.SCALE_CHANGED, (data) => {
        console.log('🎯 Событие: scale:changed', data);
    });
    
    State.on(State.EVENTS.HERO_STATS_UPDATED, (data) => {
        if (data.id && data.id.startsWith('stat:')) {
            renderStats();
        }
    });
    
    State.on(State.EVENTS.HERO_ITEM_ADDED, (data) => {
        if (data.id.startsWith('inventory:')) {
            renderAllGameItems();
        }
    });
    
    State.on(State.EVENTS.HERO_ITEM_REMOVED, (data) => {
        if (data.id.startsWith('inventory:')) {
            renderAllGameItems();
        }
    });
    
    console.log('✅ Подписки на события настроены');
}

function getGameItemIcon(id) {
    if (!id) return '❓';
    const [type] = id.split(':');
    switch (type) {
        case 'stat': return '📊';
        case 'skill': return '📜';
        case 'inventory': return '📦';
        case 'relations': return '🤝';
        case 'bless': return '✨';
        case 'curse': return '💀';
        case 'buff': return '⬆️';
        case 'debuff': return '⬇️';
        case 'personality': return '🧠';
        case 'initiation_degree': return '🎓';
        case 'progress': return '📈';
        default: return '❓';
    }
}

function getGameItemName(id) {
    if (!id) return '';
    const [type, name] = id.split(':');
    if (type === 'stat') {
        return getRussianStatName(name);
    }
    if (type === 'relations') {
        return name.replace(/_/g, ' ');
    }
    return name;
}

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
    
    const displayLog = state.auditLog.slice(-20).reverse();
    
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
                showAlert('Ошибка', 'Не удалось скопировать в буфер обмена', err);
            });
        };
    }
}

function renderScene() {
    const state = State.getState();
    
    if (!state.gameState.currentScene) {
        console.error('❌ renderScene: currentScene отсутствует, использую начальную сцену');
        state.gameState.currentScene = { ...PROMPTS.initialGameState };
        State.setState({ gameState: state.gameState });
    }
    
    const currentScene = state.gameState.currentScene;
    
    if (dom.updates && dom.sceneText && dom.sceneText.parentNode) {
        dom.sceneText.parentNode.insertBefore(dom.updates, dom.sceneText);
    }
    
    if (state.lastTurnUpdates && state.lastTurnUpdates.length > 0) {
        dom.updates.style.display = 'block';
        dom.updates.innerHTML = state.lastTurnUpdates;
    } else {
        dom.updates.style.display = 'none';
        dom.updates.innerHTML = '';
    }
    
    if (currentScene.scene) {
        dom.sceneText.innerHTML = `<p>${currentScene.scene.replace(/\n/g, '</p><p>')}</p>`;
    } else {
        console.warn('⚠️ Текст сцены пуст, использую дефолтный');
        dom.sceneText.innerHTML = PROMPTS.initialGameState.scene;
    }
    
    let reflectionAndTypologyHtml = '';
    
    if (currentScene.reflection) {
        reflectionAndTypologyHtml += `<div class="reflection-content">${currentScene.reflection}</div>`;
    }
    
    if (currentScene.typology) {
        reflectionAndTypologyHtml += `<div class="typology-content" style="margin-top: 10px; font-style: italic; color: #1dd1a1; font-size: 0.9em;">
            <i class="fas fa-fingerprint"></i> ${currentScene.typology}
        </div>`;
    }
    
    if (reflectionAndTypologyHtml) {
        dom.reflection.style.display = 'block';
        dom.reflection.innerHTML = reflectionAndTypologyHtml;
    } else {
        dom.reflection.style.display = 'none';
    }
}

// 🚫🚫🚫 ИЗМЕНЕНО: Полностью переработан метод renderStats для нового формата отображения
function renderStats() {
    const state = State.getState();
    
    // Базовые значения (без временных модификаторов)
    const baseStats = {
        will: State.getGameItemValue('stat:will') || 50,
        stealth: State.getGameItemValue('stat:stealth') || 50,
        influence: State.getGameItemValue('stat:influence') || 50,
        sanity: State.getGameItemValue('stat:sanity') || 50
    };
    
    // Получаем активные баффы и дебаффы для каждого стата
    const buffs = State.getGameItemsByType('buff:');
    const debuffs = State.getGameItemsByType('debuff:');
    
    // Группируем баффы и дебаффы по статам
    const statBuffs = { will: [], stealth: [], influence: [], sanity: [] };
    const statDebuffs = { will: [], stealth: [], influence: [], sanity: [] };
    
    buffs.forEach(buff => {
        const [type, statName] = buff.id.split(':');
        if (statBuffs.hasOwnProperty(statName) && buff.value) {
            statBuffs[statName].push({
                value: buff.value,
                duration: buff.duration || 0
            });
        }
    });
    
    debuffs.forEach(debuff => {
        const [type, statName] = debuff.id.split(':');
        if (statDebuffs.hasOwnProperty(statName) && debuff.value) {
            statDebuffs[statName].push({
                value: debuff.value, // отрицательное значение
                duration: debuff.duration || 0
            });
        }
    });
    
    // Рассчитываем текущие значения и формируем строки для отображения
    ['will', 'stealth', 'influence', 'sanity'].forEach(stat => {
        const valElement = dom.vals[stat];
        if (!valElement) return;
        
        const base = baseStats[stat];
        const buffList = statBuffs[stat] || [];
        const debuffList = statDebuffs[stat] || [];
        
        // Суммируем все временные модификаторы
        const totalBuff = buffList.reduce((sum, b) => sum + b.value, 0);
        const totalDebuff = debuffList.reduce((sum, d) => sum + d.value, 0);
        const current = base + totalBuff + totalDebuff;
        
        // Получаем цвет для текущего значения
        const currentColor = getStatColor(current);
        
        // Формируем строку детализации
        let detailString = '';
        
        if (buffList.length > 0 || debuffList.length > 0) {
            // Начинаем с базового значения
            detailString = `<span style="color: #888; font-size: 0.8em;">${base}</span>`;
            
            // Добавляем баффы
            buffList.forEach(buff => {
                if (buff.value > 0) {
                    detailString += ` <span style="color: #4cd137; font-size: 0.8em;">+${buff.value}[${buff.duration}]</span>`;
                }
            });
            
            // Добавляем дебаффы
            debuffList.forEach(debuff => {
                if (debuff.value < 0) {
                    const absValue = Math.abs(debuff.value);
                    detailString += ` <span style="color: #e84118; font-size: 0.8em;">-${absValue}[${debuff.duration}]</span>`;
                }
            });
            
            // Полный HTML
            valElement.innerHTML = `
                <span style="color: ${currentColor}; font-weight: bold;">${current}</span>
                <span style="font-size: 0.8em;"> (${detailString})</span>
            `;
        } else {
            // Нет временных эффектов - просто показываем значение
            valElement.innerHTML = `<span style="color: ${currentColor}; font-weight: bold;">${current}</span>`;
        }
        
        // Добавляем вспышку при изменении
        const changes = state.lastTurnStatChanges || {};
        const change = changes[stat] || 0;
        
        if (change !== 0) {
            valElement.classList.add(change > 0 ? 'flash-green' : 'flash-red');
            setTimeout(() => {
                valElement.classList.remove('flash-green', 'flash-red');
            }, 1000);
        }
    });
    
    // Прогресс-бар и степени инициализации (остается без изменений)
    const progressValue = State.getGameItemValue('progress:oto') || 0;
    const maxScore = 110;
    const pct = Math.min(100, Math.max(0, (progressValue / maxScore) * 100));
    dom.tube.style.height = `${pct}%`;
    
    const degreeItems = State.getGameItemsByType('initiation_degree:');
    const currentDegreeItem = degreeItems.find(item => item.value && item.value.trim() !== '');
    let currentDegreeIndex = 0;
    
    if (currentDegreeItem) {
        const degreeMatch = currentDegreeItem.value.match(/(\d+)°/);
        if (degreeMatch) {
            currentDegreeIndex = parseInt(degreeMatch[1]) || 0;
        }
    }
    
    if (dom.degrees) {
        dom.degrees.innerHTML = CONFIG.degrees.slice().reverse().map(d => {
            let cls = 'degree-item';
            if (d.lvl < currentDegreeIndex) cls += ' passed';
            if (d.lvl === currentDegreeIndex) cls += ' active';
            return `<div class="${cls}">${d.name}</div>`;
        }).join('');
    }
}

function renderSectionHTML(title, icon, color, items, renderItemFn) {
    let html = `<div style="margin-top: 15px; font-weight: bold; color: ${color}; border-bottom: 1px solid #333; padding-bottom: 4px; margin-bottom: 5px; font-size: 0.85rem;">
        <i class="fas ${icon}"></i> ${title} ${items.length > 0 ? `(${items.length})` : ''}
    </div>`;

    if (!items || items.length === 0) {
        html += `<div style="font-size: 0.8rem; color: #444; font-style: italic;">Нет данных...</div>`;
    } else {
        html += `<div style="display: flex; flex-wrap: wrap; gap: 4px;">`;
        html += items.map(renderItemFn).join('');
        html += `</div>`;
    }
    return html;
}

function renderAllGameItems() {
    console.log('🔍 renderAllGameItems called (Unified Order)');
    
    const personalityEl = document.getElementById('personalityDisplay');
    if (!personalityEl || !personalityEl.parentNode) {
        console.error('❌ Cannot find personalityDisplay container');
        return;
    }
    
    const container = personalityEl.parentNode;
    
    const personalityVal = State.getGameItemValue('personality:hero') || "Описание отсутствует";
    personalityEl.textContent = personalityVal;
    
    const managedIds = [
        'typologyContainer', 
        'relationsDisplay', 
        'skillsContainer', 
        'blessingsContainer', 
        'buffsContainer',
        'inventoryContainer'
    ];
    
    managedIds.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.remove();
    });
    
    const fragment = document.createDocumentFragment();
    
    const state = State.getState();
    const typologyVal = state.gameState.currentScene ? state.gameState.currentScene.typology : null;
    
    const typologyDiv = document.createElement('div');
    typologyDiv.id = 'typologyContainer';
    typologyDiv.innerHTML = `<div style="margin-top: 10px; font-weight: bold; color: #1dd1a1; border-bottom: 1px solid #333; padding-bottom: 4px; margin-bottom: 5px; font-size: 0.85rem;">
        <i class="fas fa-fingerprint"></i> ТИПОЛОГИЯ
    </div>
    <div style="font-size: 0.8rem; color: ${typologyVal ? '#ccc' : '#444; font-style: italic'};">
        ${typologyVal || 'Не определена...'}
    </div>`;
    fragment.appendChild(typologyDiv);

    const relationsDiv = document.createElement('div');
    relationsDiv.id = 'relationsDisplay';
    relationsDiv.className = 'relations-section';
    const relationItems = State.getGameItemsByType('relations:');
    relationsDiv.innerHTML = renderSectionHTML('ОТНОШЕНИЯ', 'fa-handshake', '#fbc531', relationItems, (item) => {
        const npcName = item.id.split(':')[1].replace(/_/g, ' ');
        const val = item.value || 0;
        let color = val >= 60 ? '#4cd137' : val >= 20 ? '#9c88ff' : val > -20 ? '#fbc531' : '#e84118';
        return `
            <div style="width: 100%; display:flex; justify-content:space-between; align-items:center; gap:6px; padding:4px 0; border-bottom:1px solid #222;">
                <span style="color:#ccc; font-size:0.75rem;">${npcName}</span>
                <span style="color:${color}; font-family:monospace; font-weight:bold; font-size:0.8rem;">${val > 0 ? '+' : ''}${val}</span>
            </div>`;
    });
    fragment.appendChild(relationsDiv);

    const skillsDiv = document.createElement('div');
    skillsDiv.id = 'skillsContainer';
    skillsDiv.className = 'skills-section';
    const skillItems = State.getGameItemsByType('skill:');
    skillsDiv.innerHTML = renderSectionHTML('НАВЫКИ', 'fa-scroll', '#9c88ff', skillItems, (item) => {
        const name = item.value || item.id.split(':')[1];
        const desc = item.description ? ` title="${item.description}"` : '';
        return `<span style="background:rgba(156, 136, 255, 0.15); padding:3px 8px; border-radius:4px; font-size:0.75rem; border:1px solid rgba(156, 136, 255, 0.3); color:#ccc; margin-bottom: 4px;"${desc}>${name}</span>`;
    });
    fragment.appendChild(skillsDiv);

    const blessDiv = document.createElement('div');
    blessDiv.id = 'blessingsContainer';
    blessDiv.className = 'blessings-section';
    const blessItems = State.getGameItemsByType('bless:');
    const curseItems = State.getGameItemsByType('curse:');
    const allPowers = [...blessItems, ...curseItems];
    blessDiv.innerHTML = renderSectionHTML('СИЛЫ', 'fa-star', '#ff9ff3', allPowers, (item) => {
        const isBlessing = item.id.startsWith('bless:');
        const name = item.value || item.id.split(':')[1];
        const color = isBlessing ? '#fbc531' : '#c23616';
        const bgColor = isBlessing ? 'rgba(251, 197, 49, 0.1)' : 'rgba(194, 54, 22, 0.1)';
        const icon = isBlessing ? '✨' : '💀';
        return `
            <div style="background: ${bgColor}; padding: 4px 8px; border-radius: 4px; border: 1px solid ${color}; width: 100%; margin-bottom: 2px;" title="${item.description || ''}">
                <span style="color: ${color}; font-size: 0.75rem;">${icon} ${name}</span>
            </div>`;
    });
    fragment.appendChild(blessDiv);

    const buffsDiv = document.createElement('div');
    buffsDiv.id = 'buffsContainer';
    buffsDiv.className = 'buffs-section';
    const buffItems = State.getGameItemsByType('buff:');
    const debuffItems = State.getGameItemsByType('debuff:');
    const allBuffs = [...buffItems, ...debuffItems];
    buffsDiv.innerHTML = renderSectionHTML('ЭФФЕКТЫ', 'fa-sparkles', '#00a8ff', allBuffs, (item) => {
        const isBuff = item.id.startsWith('buff:');
        const name = item.id.split(':')[1];
        const val = item.value || 0;
        const dur = item.duration || 0;
        const color = isBuff ? '#4cd137' : '#e84118';
        const icon = isBuff ? '📈' : '📉';
        const sign = val > 0 ? '+' : '';
        return `
            <div style="background: rgba(${isBuff ? '76, 175, 80' : '244, 67, 54'}, 0.1); padding: 4px 8px; border-radius: 4px; border-left: 3px solid ${color}; width: 100%; margin-bottom: 2px;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div style="color: ${color}; font-size: 0.8rem;">${icon} ${name}: ${sign}${val}</div>
                    <div style="color: #888; font-size: 0.7rem;">(${dur} ход.)</div>
                </div>
            </div>`;
    });
    fragment.appendChild(buffsDiv);
    
    const invDiv = document.createElement('div');
    invDiv.id = 'inventoryContainer';
    invDiv.className = 'inventory-section';
    const invItems = State.getGameItemsByType('inventory:');
    invDiv.innerHTML = renderSectionHTML('ИНВЕНТАРЬ', 'fa-box-open', '#d4af37', invItems, (item) => {
        const name = item.value || item.id.split(':')[1];
        return `
            <div style="background:rgba(255,255,255,0.08); padding:6px 8px; border-radius:4px; border:1px solid #444; width: 100%; margin-bottom: 2px;">
                <div style="color:#ccc; font-size:0.8rem;">${name}</div>
            </div>`;
    });
    fragment.appendChild(invDiv);

    if (personalityEl.nextSibling) {
        container.insertBefore(fragment, personalityEl.nextSibling);
    } else {
        container.appendChild(fragment);
    }
}

function renderAll() {
    console.info(`⚠️   RENDER ALL (формат 4.1)   ⚠️`);
    
    try {
        renderScene();
        renderStats();
        renderChoices();
        renderAllGameItems();
        renderHistory();
        applyStateEffects();
        updateUIMode();
        
        if (dom.turnCounter) {
            dom.turnCounter.innerHTML = `ХОДЫ: <span style="color: #888; font-family: monospace;">${State.getTurnCount()}</span>`;
        }
        
        console.info(`✅ ALL RENDERED (формат 4.1)`);
    } catch (error) {
        console.error('❌ Ошибка при рендеринге:', error);
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
        dom.choicesCounter.textContent = `${state.freeModeText.length > 0 ? '✓' : '0'}/∞`;
        
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

function normalizeStatKey(statName) {
    if (!statName) return '';
    
    const lowerStat = statName.toString().toLowerCase().trim();
    
    for (const [alias, key] of Object.entries(CONFIG.statAliases)) {
        if (alias.toLowerCase() === lowerStat) {
            return key;
        }
    }
    
    const standardKeys = ['will', 'stealth', 'influence', 'sanity'];
    if (standardKeys.includes(lowerStat)) {
        return lowerStat;
    }
    
    return lowerStat;
}

function getStatIcon(statKey) {
    const icons = {
        'will': '<i class="fas fa-brain" style="color: #ffcc00;"></i>',
        'stealth': '<i class="fas fa-user-secret" style="color: #00ccff;"></i>',
        'influence': '<i class="fas fa-crown" style="color: #ff66cc;"></i>',
        'sanity': '<i class="fas fa-lightbulb" style="color: #66ff66;"></i>'
    };
    return icons[statKey] || '<i class="fas fa-question" style="color: #888;"></i>';
}

function getRussianStatName(key) {
    const map = { 
        'will': 'Воля', 
        'stealth': 'Скрыт.', 
        'influence': 'Влияние', 
        'sanity': 'Разум' 
    };
    return map[key] || key;
}

function formatCompactRequirements(requirements) {
    if (!Array.isArray(requirements) || requirements.length === 0) {
        return '';
    }
    
    const items = requirements.map(reqId => {
        if (!reqId || typeof reqId !== 'string') return '';
        
        const [type, name] = reqId.split(':');
        let color = '#888';
        let icon = getGameItemIcon(reqId);
        let displayName = name || reqId;
        
        switch (type) {
            case 'stat':
                color = '#fbc531';
                displayName = getRussianStatName(name);
                break;
            case 'skill':
                color = '#9c88ff';
                break;
            case 'inventory':
                color = '#00a8ff';
                break;
            case 'relations':
                color = '#ff9ff3';
                displayName = name.replace(/_/g, ' ');
                break;
            case 'bless':
                color = '#fbc531';
                break;
            case 'curse':
                color = '#c23616';
                break;
            case 'initiation_degree':
                color = '#ff9ff3';
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
        
        switch (op.operation) {
            case 'MODIFY':
                const sign = op.delta > 0 ? '+' : '';
                const statName = itemType === 'stat' ? getRussianStatName(name) : name;
                display = `${statName}${sign}${op.delta}`;
                break;
            case 'ADD':
                if (itemType === 'buff' || itemType === 'debuff') {
                    display = `${name}+${op.value}`;
                } else {
                    display = `+${name}`;
                }
                break;
            case 'REMOVE':
                display = `-${name}`;
                break;
            case 'SET':
                display = `${name}→"${String(op.value || '').substring(0, 10)}"`;
                break;
        }
        
        if (display) {
            items.push(display);
        }
    });
    
    if (items.length === 0) return '';
    
    const color = isSuccess ? '#4cd137' : '#e84118';
    const icon = isSuccess ? '✅' : '❌';
    
    return `<div style="font-size:0.75rem; margin-top:2px; opacity: 0.3">
        <span style="color:${color};">${icon} ${items.join(', ')}</span>
    </div>`;
}

function renderChoices() {
    console.log('🔍 renderChoices called');
    
    const state = State.getState();
    if (!dom.choicesList) {
        console.error('❌ DOM element choicesList not found');
        return;
    }
    
    dom.choicesList.innerHTML = '';
    
    if (!state.gameState.currentScene) {
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

function renderHistory() {
    const state = State.getState();
    
    dom.hist.innerHTML = '';
    
    [...state.gameState.history].reverse().forEach(entry => {
        const item = document.createElement('div');
        item.className = 'history-item';
        
        const head = document.createElement('div');
        head.className = 'history-header';
        head.innerHTML = `
            <span class="history-preview">${entry.summary || entry.fullText?.substring(0, 50)}...</span>
            <i class="fas fa-chevron-down" style="color:#444"></i>
        `;
        
        const body = document.createElement('div');
        body.className = 'history-content';
        body.innerHTML = `
            <p>${entry.fullText || entry}</p>
            <div style="font-size:0.7rem; color:#666; margin-top:5px; font-family:monospace;">
                ${entry.summary || ''}
            </div>
        `;
        
        head.onclick = () => {
            body.classList.toggle('open');
            const icon = head.querySelector('i');
            icon.style.transform = body.classList.contains('open') ? 'rotate(180deg)' : 'rotate(0deg)';
        };
        
        item.appendChild(head);
        item.appendChild(body);
        dom.hist.appendChild(item);
    });
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

setupStateObservers();

export const Render = {
    updateApiKeyFields,
    renderModelSelectorByProvider,
    updateModelDetails,
    updateModelStats,
    updateLogCount,
    renderAuditList,
    renderScene,
    getRussianStatName,
    updateUIMode,
    renderChoices,
    renderStats,
    renderAllGameItems,
    renderHistory,
    renderAll,
    showAlert,
    showErrorAlert,
    showSuccessAlert,
    showWarningAlert,
    getStatColor // 🚫🚫🚫 ДОБАВЛЕНО: экспортируем функцию для использования в других модулях
};