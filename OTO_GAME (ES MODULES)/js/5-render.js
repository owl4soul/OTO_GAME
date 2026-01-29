// Модуль 5: RENDER - Отрисовка интерфейса (ФОРМАТ 4.1)
'use strict';

import { CONFIG } from './1-config.js';
import { State } from './3-state.js';
import { DOM } from './4-dom.js';
import { Utils } from './2-utils.js';
import { Game } from './6-game.js';
import { Audit } from './8-audit.js';

const dom = DOM.getDOM();

// Вспомогательные функции для работы с game_item
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

/**
 * Обновление полей API ключей в зависимости от выбранного провайдера
 */
function updateApiKeyFields() {
    const state = State.getState();
    
    // Скрываем все поля
    Object.values(dom.keyFields).forEach(field => {
        field.classList.remove('active');
    });
    
    // Показываем нужное поле
    if (state.settings.apiProvider === 'openrouter') {
        dom.keyFields.openrouter.classList.add('active');
    } else if (state.settings.apiProvider === 'vsegpt') {
        dom.keyFields.vsegpt.classList.add('active');
    }
}

/**
 * Обновление списка моделей в зависимости от провайдера
 */
function renderModelSelectorByProvider() {
    const state = State.getState();
    const select = dom.inputs.model;
    const currentProvider = state.settings.apiProvider;
    
    select.innerHTML = '';
    
    // Фильтруем модели по провайдеру
    const filteredModels = state.models.filter(m => m.provider === currentProvider);
    
    if (filteredModels.length === 0) {
        select.innerHTML = '<option value="">Нет доступных моделей для этого провайдера</option>';
        return;
    }
    
    // Добавляем опции для каждой модели
    filteredModels.forEach(model => {
        const opt = document.createElement('option');
        opt.value = model.id;
        opt.text = `${Utils.getStatusEmoji(model.status)} ${model.name}`;
        select.appendChild(opt);
    });
    
    // Устанавливаем выбранную модель
    const modelExists = filteredModels.some(m => m.id === state.settings.model);
    if (modelExists) {
        select.value = state.settings.model;
    } else if (filteredModels.length > 0) {
        state.settings.model = filteredModels[0].id;
        select.value = state.settings.model;
    }
}

/**
 * Обновление деталей выбранной модели
 */
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

/**
 * Обновление статистики моделей
 */
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

/**
 * Обновление счетчика записей в логе
 */
function updateLogCount() {
    const state = State.getState();
    const logCountElem = document.getElementById('logCount');
    if (logCountElem) {
        logCountElem.textContent = `${state.auditLog.length} записей`;
    }
}

/**
 * Отрисовка списка аудита
 */
function renderAuditList() {
    const state = State.getState();
    const list = document.getElementById('auditList');
    
    if (!list) return;
    
    // Показываем последние 20 записей
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

/**
 * Отрисовка текущей сцены
 */
function renderScene() {
    const state = State.getState();
    
    if (!state.gameState.currentScene) {
        console.error('❌ renderScene: currentScene отсутствует, использую начальную сцену');
        state.gameState.currentScene = { ...PROMPTS.initialGameState };
        State.setState({ gameState: state.gameState });
    }
    
    const currentScene = state.gameState.currentScene;
    
    if (currentScene.scene) {
        dom.sceneText.innerHTML = `<p>${currentScene.scene.replace(/\n/g, '</p><p>')}</p>`;
    } else {
        console.warn('⚠️ Текст сцены пуст, использую дефолтный');
        dom.sceneText.innerHTML = PROMPTS.initialGameState.scene;
    }
    
    if (currentScene.reflection) {
        dom.reflection.style.display = 'block';
        dom.reflection.textContent = currentScene.reflection;
    } else {
        dom.reflection.style.display = 'none';
    }
    
    if (state.lastTurnUpdates && state.lastTurnUpdates.length > 0) {
        dom.updates.style.display = 'block';
        dom.updates.innerHTML = state.lastTurnUpdates;
    } else {
        dom.updates.style.display = 'none';
        dom.updates.innerHTML = '';
    }
}

/**
 * Отрисовка характеристик героя, прогресса и степеней (ФОРМАТ 4.1)
 */
function renderStats() {
    const state = State.getState();
    
    // 1. Получаем значения статов из game_items
    const willValue = State.getGameItemValue('stat:will') || 50;
    const stealthValue = State.getGameItemValue('stat:stealth') || 50;
    const influenceValue = State.getGameItemValue('stat:influence') || 50;
    const sanityValue = State.getGameItemValue('stat:sanity') || 50;
    
    // Обновляем значения характеристик
    dom.vals.will.textContent = willValue;
    dom.vals.stealth.textContent = stealthValue;
    dom.vals.inf.textContent = influenceValue;
    dom.vals.sanity.textContent = sanityValue;
    
    // 2. Обновляем описание личности
    const personality = State.getGameItemValue('personality:hero') || "Описание отсутствует";
    dom.pers.textContent = personality;
    
    // 3. Обновляем прогресс-бар
    const progressValue = State.getGameItemValue('progress:oto') || 0;
    const maxScore = 110;
    const pct = Math.min(100, Math.max(0, (progressValue / maxScore) * 100));
    dom.tube.style.height = `${pct}%`;
    
    // 4. Отрисовываем список степеней
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
    
    // 5. Отображаем баффы/дебаффы рядом со статами
    renderBuffsAndDebuffsStats();
}

/**
 * Отображение баффов/дебаффов рядом со статами
 */
function renderBuffsAndDebuffsStats() {
    const buffs = State.getGameItemsByType('buff:');
    const debuffs = State.getGameItemsByType('debuff:');
    const allEffects = [...buffs, ...debuffs];
    
    const statModifiers = {
        'will': [],
        'stealth': [],
        'influence': [],
        'sanity': []
    };
    
    allEffects.forEach(effect => {
        const [type, statName] = effect.id.split(':');
        if (statModifiers[statName] && effect.value && effect.duration) {
            statModifiers[statName].push({
                value: effect.value,
                duration: effect.duration
            });
        }
    });
    
    Object.entries(statModifiers).forEach(([statName, modifiers]) => {
        if (modifiers.length > 0) {
            const total = modifiers.reduce((sum, mod) => sum + mod.value, 0);
            const durationText = modifiers.map(m => `(${m.duration})`).join(' ');
            const sign = total > 0 ? '+' : '';
            const color = total > 0 ? '#4cd137' : '#e84118';
            
            const valElement = document.getElementById(`val${statName.charAt(0).toUpperCase() + statName.slice(1)}`);
            if (valElement) {
                const baseValue = parseInt(valElement.textContent) || 50;
                valElement.innerHTML = `
                    ${baseValue} 
                    <span style="color: ${color}; font-size: 0.9em; margin-left: 4px;">
                        (${sign}${total} ${durationText})
                    </span>
                `;
            }
        }
    });
}

/**
 * Отображение всех game_items в нижней секции
 */
function renderAllGameItems() {
    console.log('🔍 renderAllGameItems called');
    
    // 1. Отображаем Личность (уже в renderStats)
    // 2. Отображаем Отношения
    renderRelations();
    
    // 3. Отображаем Навыки
    renderSkills();
    
    // 4. Отображаем Благословения/Проклятия
    renderBlessingsAndCurses();
    
    // 5. Отображаем Инвентарь
    renderInventory();
    
    // 6. Отображаем Баффы/Дебаффы отдельным блоком
    renderBuffsAndDebuffsList();
}

/**
 * Отображение списка баффов и дебаффов
 */
function renderBuffsAndDebuffsList() {
    let buffsContainer = document.getElementById('buffsContainer');
    if (!buffsContainer) {
        buffsContainer = document.createElement('div');
        buffsContainer.id = 'buffsContainer';
        buffsContainer.className = 'buffs-section';
        
        const blessingsContainer = document.getElementById('blessingsContainer');
        const targetContainer = blessingsContainer || 
                               document.getElementById('skillsContainer') ||
                               document.getElementById('inventoryContainer');
        
        if (targetContainer && targetContainer.parentNode) {
            targetContainer.parentNode.insertBefore(buffsContainer, targetContainer.nextSibling);
        }
    }
    
    const buffItems = State.getGameItemsByType('buff:');
    const debuffItems = State.getGameItemsByType('debuff:');
    const allBuffs = [...buffItems, ...debuffItems];
    
    let html = `<div style="margin-top: 10px; font-weight: bold; color: #00a8ff; border-bottom: 1px solid #333; padding-bottom: 4px; margin-bottom: 5px; font-size: 0.85rem;">
        <i class="fas fa-sparkles"></i> ЭФФЕКТЫ (${allBuffs.length})
    </div>`;

    if (allBuffs.length === 0) {
        html += `<div style="font-size: 0.8rem; color: #666; font-style: italic;">Нет активных эффектов</div>`;
    } else {
        html += `<div style="display: flex; flex-direction: column; gap: 4px;">`;
        allBuffs.forEach(buff => {
            const isBuff = buff.id.startsWith('buff:');
            const buffName = buff.id.split(':')[1];
            const buffValue = buff.value || 0;
            const duration = buff.duration || 0;
            const description = buff.description || '';
            
            const color = isBuff ? '#4cd137' : '#e84118';
            const icon = isBuff ? '📈' : '📉';
            const sign = buffValue > 0 ? '+' : '';
            
            html += `
                <div style="background: rgba(${isBuff ? '76, 175, 80' : '244, 67, 54'}, 0.1); padding: 6px 8px; border-radius: 4px; border-left: 3px solid ${color};">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2px;">
                        <div style="color: ${color}; font-size: 0.8rem;">
                            ${icon} ${buffName}: ${sign}${buffValue}
                        </div>
                        <div style="color: #888; font-size: 0.7rem;">
                            ${duration} ход${duration === 1 ? '' : duration > 1 && duration < 5 ? 'а' : 'ов'}
                        </div>
                    </div>
                    ${description ? `<div style="font-size: 0.7rem; color: #aaa;">${description}</div>` : ''}
                </div>
            `;
        });
        html += `</div>`;
    }
    
    buffsContainer.innerHTML = html;
}

/**
 * Отображение благословений и проклятий
 */
function renderBlessingsAndCurses() {
    const blessItems = State.getGameItemsByType('bless:');
    const curseItems = State.getGameItemsByType('curse:');
    const allItems = [...blessItems, ...curseItems];
    
    let container = document.getElementById('blessingsContainer');
    if (!container) {
        container = document.createElement('div');
        container.id = 'blessingsContainer';
        container.className = 'blessings-section';
        
        const skillsContainer = document.getElementById('skillsContainer');
        const relationsContainer = document.getElementById('relationsDisplay');
        const targetContainer = relationsContainer || skillsContainer || 
                               document.getElementById('inventoryContainer');
        
        if (targetContainer && targetContainer.parentNode) {
            targetContainer.parentNode.insertBefore(container, targetContainer.nextSibling);
        }
    }
    
    let html = `<div style="margin-top: 15px; font-weight: bold; color: #ff9ff3; border-bottom: 1px solid #333; padding-bottom: 4px; margin-bottom: 5px; font-size: 0.85rem;">
        <i class="fas fa-star"></i> СИЛЫ (${allItems.length})
    </div>`;

    if (allItems.length === 0) {
        html += `<div style="font-size: 0.8rem; color: #666; font-style: italic;">Нет благословений или проклятий</div>`;
    } else {
        html += `<div style="display: flex; flex-wrap: wrap; gap: 6px;">`;
        allItems.forEach(item => {
            const isBlessing = item.id.startsWith('bless:');
            const itemName = item.value || item.id.split(':')[1];
            const description = item.description || '';
            
            const color = isBlessing ? '#fbc531' : '#c23616';
            const bgColor = isBlessing ? 'rgba(251, 197, 49, 0.1)' : 'rgba(194, 54, 22, 0.1)';
            const icon = isBlessing ? '✨' : '💀';
            
            html += `
                <div style="background: ${bgColor}; padding: 4px 8px; border-radius: 4px; border: 1px solid ${color};" 
                     title="${description}">
                    <span style="color: ${color}; font-size: 0.75rem;">
                        ${icon} ${itemName}
                    </span>
                </div>
            `;
        });
        html += `</div>`;
    }
    
    container.innerHTML = html;
}

/**
 * Полная перерисовка интерфейса
 */
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

/**
 * Обновление режима ввода
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

/**
 * Нормализует название характеристики к стандартному ключу
 */
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

/**
 * Получает иконку для стандартного ключа характеристики
 */
function getStatIcon(statKey) {
    const icons = {
        'will': '<i class="fas fa-brain" style="color: #ffcc00;"></i>',
        'stealth': '<i class="fas fa-user-secret" style="color: #00ccff;"></i>',
        'influence': '<i class="fas fa-crown" style="color: #ff66cc;"></i>',
        'sanity': '<i class="fas fa-lightbulb" style="color: #66ff66;"></i>'
    };
    return icons[statKey] || '<i class="fas fa-question" style="color: #888;"></i>';
}

/**
 * Получение русского названия стата
 */
function getRussianStatName(key) {
    const map = { 
        'will': 'Воля', 
        'stealth': 'Скрыт.', 
        'influence': 'Влияние', 
        'sanity': 'Разум' 
    };
    return map[key] || key;
}

/**
 * Компактный формат требований (ФОРМАТ 4.1)
 */
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

/**
 * Компактный формат операций (ФОРМАТ 4.1)
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

/**
 * Отрисовка вариантов выбора (ФОРМАТ 4.1)
 */
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

/**
 * Отрисовка инвентаря (ФОРМАТ 4.1 - game_items)
 */
function renderInventory() {
    let invContainer = document.getElementById('inventoryContainer');
    
    if (!invContainer) {
        invContainer = document.createElement('div');
        invContainer.id = 'inventoryContainer';
        invContainer.className = 'inventory-section';
        if (dom.pers && dom.pers.parentNode) {
            dom.pers.parentNode.insertBefore(invContainer, dom.pers.nextSibling);
        }
    }
    
    const inventoryItems = State.getGameItemsByType('inventory:');
    
    let html = `<div style="margin-top:15px; font-weight:bold; color:#d4af37; border-bottom:1px solid #333; padding-bottom:4px; margin-bottom:5px; font-size:0.85rem;">
        <i class="fas fa-box-open"></i> ИНВЕНТАРЬ (${inventoryItems.length})
    </div>`;
    
    if (inventoryItems.length === 0) {
        html += `<div style="font-size:0.8rem; color:#666; font-style:italic;">Пусто...</div>`;
    } else {
        html += `<div style="display:flex; flex-direction:column; gap:4px;">`;
        inventoryItems.forEach(item => {
            const cleanItem = item.value || item.id.split(':')[1];
            const description = item.description ? 
                `<div style="font-size:0.7rem; color:#888; margin-top:2px;">${item.description}</div>` : '';
            
            html += `
                <div style="background:rgba(255,255,255,0.08); padding:6px 8px; border-radius:4px; border:1px solid #444;">
                    <div style="color:#ccc; font-size:0.8rem;">${cleanItem}</div>
                    ${description}
                </div>
            `;
        });
        html += `</div>`;
    }
    
    invContainer.innerHTML = html;
}

/**
 * Отрисовка навыков (ФОРМАТ 4.1 - game_items)
 */
function renderSkills() {
    let skillsContainer = document.getElementById('skillsContainer');
    if (!skillsContainer) {
        skillsContainer = document.createElement('div');
        skillsContainer.id = 'skillsContainer';
        skillsContainer.className = 'skills-section';
        
        const pers = document.getElementById('personalityDisplay');
        if (pers && pers.parentNode) {
            pers.parentNode.insertBefore(skillsContainer, pers.nextSibling);
        }
    }
    
    const skillItems = State.getGameItemsByType('skill:');
    
    let html = `<div style="margin-top:15px; font-weight:bold; color:#9c88ff; border-bottom:1px solid #333; padding-bottom:4px; margin-bottom:5px; font-size:0.85rem;">
        <i class="fas fa-scroll"></i> НАВЫКИ (${skillItems.length})
    </div>`;
    
    if (skillItems.length === 0) {
        html += `<div style="font-size:0.8rem; color:#666; font-style:italic;">Еще не изучены...</div>`;
    } else {
        html += `<div style="display:flex; flex-wrap:wrap; gap:6px;">`;
        skillItems.forEach(skill => {
            const cleanSkill = skill.value || skill.id.split(':')[1];
            const description = skill.description ? 
                ` title="${skill.description}"` : '';
            
            html += `<span style="background:rgba(156, 136, 255, 0.15); padding:3px 8px; border-radius:4px; font-size:0.75rem; border:1px solid rgba(156, 136, 255, 0.3); color:#ccc;"${description}>${cleanSkill}</span>`;
        });
        html += `</div>`;
    }
    
    skillsContainer.innerHTML = html;
}

/**
 * Отрисовка отношений (ФОРМАТ 4.1 - game_items)
 */
function renderRelations() {
    let relContainer = document.getElementById('relationsDisplay');
    if (!relContainer) {
        relContainer = document.createElement('div');
        relContainer.id = 'relationsDisplay';
        relContainer.className = 'relations-section';
        
        const invContainer = document.getElementById('inventoryContainer');
        if (invContainer && invContainer.parentNode) {
            invContainer.parentNode.insertBefore(relContainer, invContainer.nextSibling);
        } else if (dom.pers && dom.pers.parentNode) {
            dom.pers.parentNode.insertBefore(relContainer, dom.pers.nextSibling);
        }
    }

    const relationItems = State.getGameItemsByType('relations:');
    
    let html = `<div style="margin-top:10px; font-weight:bold; color:#fbc531; border-bottom:1px solid #333; padding-bottom:4px; margin-bottom:5px; font-size:0.85rem;">
        <i class="fas fa-handshake"></i> ОТНОШЕНИЯ (${relationItems.length})
    </div>`;

    if (relationItems.length === 0) {
        html += `<div style="font-size:0.8rem; color:#666; font-style:italic;">Пока нет заметных связей...</div>`;
    } else {
        relationItems.sort((a, b) => b.value - a.value);
        
        html += `<div style="display:flex; flex-direction:column; gap:4px; font-size:0.75rem;">`;
        relationItems.forEach(relation => {
            const npcName = relation.id.split(':')[1].replace(/_/g, ' ');
            const npcValue = relation.value || 0;
            
            let color = '#ccc';
            if (npcValue >= 60) color = '#4cd137';
            else if (npcValue >= 20) color = '#9c88ff';
            else if (npcValue > -20) color = '#fbc531';
            else if (npcValue > -60) color = '#e84118';
            else color = '#c23616';

            html += `
                <div style="display:flex; justify-content:space-between; align-items:center; gap:6px; padding:4px 0; border-bottom:1px solid #222;">
                    <span style="color:#ccc; max-width:60%; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
                        ${npcName}
                    </span>
                    <span style="color:${color}; font-family:monospace; font-weight:bold; font-size:0.8rem;">
                        ${npcValue > 0 ? '+' : ''}${npcValue}
                    </span>
                </div>
            `;
        });
        html += `</div>`;
    }

    relContainer.innerHTML = html;
}

/**
 * Применение визуальных эффектов состояния
 */
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

/**
 * Отрисовка истории ходов
 */
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

/**
 * Показать уведомление
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

/**
 * Показать уведомление о предупреждении
 */
function showWarningAlert(title, message, details = null) {
    showAlert(title, message, details, 'warning');
}

/**
 * Показать уведомление об ошибке
 */
function showErrorAlert(title, message, details = null) {
    showAlert(title, message, details, 'error');
}

/**
 * Показать уведомление об успехе
 */
function showSuccessAlert(title, message, details = null) {
    showAlert(title, message, details, 'success');
}

// Публичный интерфейс модуля
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
    renderInventory,
    renderHistory,
    renderSkills,
    renderRelations,
    renderAll,
    showAlert,
    showErrorAlert,
    showSuccessAlert,
    showWarningAlert
};