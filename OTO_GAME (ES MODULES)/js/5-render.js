// Модуль 5: RENDER - Отрисовка интерфейса (5-render.js)
'use strict';

import { CONFIG } from './1-config.js';
import { State } from './3-state.js';
import { DOM } from './4-dom.js';
import { Utils } from './2-utils.js';
import { Game } from './6-game.js';

const dom = DOM.getDOM();

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
 * Отрисовка списка аудита (ИСПРАВЛЕНО: ПОЛНЫЙ ВЫВОД + ЦВЕТА)
 */
function renderAuditList() {
    const state = State.getState();
    const list = document.getElementById('auditList');
    
    if (!list) return;
    
    // Показываем последние 20 записей (чтобы не тормозил DOM, но было видно историю)
    const displayLog = state.auditLog.slice(0, 20);
    
    list.innerHTML = displayLog.map(entry => {
        // Определение цветов
        let statusColor = '#888'; // Default grey/yellow
        let borderColor = '#444';
        
        if (entry.status === 'success') {
            statusColor = '#4cd137'; // Зеленый
            borderColor = '#2d8b57';
        } else if (entry.status === 'error') {
            statusColor = '#e84118'; // Красный
            borderColor = '#c23616';
        } else if (entry.status === 'pending') {
            statusColor = '#fbc531'; // Желтый
            borderColor = '#e1b12c';
        }

        // Заголовок записи
        let headerText = `<span style="color:${statusColor}; font-weight:bold;">${entry.timestamp}</span>: [${entry.status.toUpperCase()}] - ${entry.request}`;
        if (entry.d10) headerText += ` (d10=${entry.d10})`;

        // Сборка тела (Request)
        let requestHtml = '';
        if (entry.requestDebug && entry.requestDebug.body) {
            // ВАЖНО: white-space: pre-wrap для переноса строк JSON на мобильном
            requestHtml = `
            <details>
                <summary style="cursor:pointer; color:#aaa;">Request Payload</summary>
                <pre style="font-size:0.65rem; color:#ccc; background:#111; padding:5px; overflow-x:auto; white-space: pre-wrap; border: 1px solid #333;">${entry.requestDebug.body}</pre>
            </details>`;
        }

        // Сборка тела (Response)
        let responseHtml = '';
        if (entry.fullResponse) {
            // ВАЖНО: Выводим ПОЛНЫЙ текст без substring
            responseHtml = `
            <details>
                <summary style="cursor:pointer; color:${statusColor};">Full Response</summary>
                <pre style="font-size:0.65rem; color:${statusColor}; background:#1a1a1a; padding:5px; overflow-x:auto; white-space: pre-wrap; border: 1px solid ${borderColor};">${entry.fullResponse}</pre>
            </details>`;
        }

        // Сборка ошибки
        let errorHtml = '';
        if (entry.rawError) {
            errorHtml = `
            <details open>
                <summary style="cursor:pointer; color:#e84118;">▼ ERROR DETAILS</summary>
                <pre style="font-size:0.65rem; color:#e84118; background:#2d0000; padding:5px; overflow-x:auto; white-space: pre-wrap;">${entry.rawError}</pre>
            </details>`;
        }

        // Обертка записи с цветной рамкой слева
        return `
        <div style="padding:0.5rem; border-bottom:1px solid #333; border-left: 4px solid ${borderColor}; margin-bottom: 5px; background: rgba(0,0,0,0.2);">
            <div style="font-size: 0.8rem; margin-bottom: 5px;">${headerText}</div>
            ${requestHtml}
            ${responseHtml}
            ${errorHtml}
        </div>`;
    }).join('');
    
    updateLogCount();
}

/**
 * Отрисовка текущей сцены
 */
function renderScene() {
    const state = State.getState();
    
    // Отрисовываем основной текст сцены
    dom.sceneText.innerHTML = `<p>${state.currentScene.text.replace(/\n/g, '</p><p>')}</p>`;
    
    // Отрисовываем рефлексию, если есть
    if (state.currentScene.reflection) {
        dom.reflection.style.display = 'block';
        dom.reflection.textContent = state.currentScene.reflection;
    } else {
        dom.reflection.style.display = 'none';
    }
    
    // Восстановление плашки изменений за ход после перезагрузки
    if (state.lastTurnUpdates && state.lastTurnUpdates.length > 0) {
        dom.updates.style.display = 'block';
        dom.updates.innerHTML = state.lastTurnUpdates;
    } else {
        dom.updates.style.display = 'none';
        dom.updates.innerHTML = '';
    }
    
    // Скрываем обновления (будут показаны после хода)
    dom.updates.style.display = 'none';
}

/**
 * Обновление режима ввода
 */
function updateUIMode() {
    const state = State.getState();
    
    // Синхронизируем тумблер с фактическим режимом
    dom.freeModeToggle.checked = state.freeMode;
    
    if (state.freeMode) {
        // Режим свободного ввода
        dom.choicesList.style.display = 'none';
        dom.freeInputWrapper.style.display = 'block';
        dom.modeIcon.innerHTML = '<i class="fas fa-keyboard"></i>';
        dom.modeText.textContent = 'Режим: Свободный ввод';
        dom.modeText.classList.add('free-mode');
        dom.choicesCounter.textContent = `${state.freeModeText.length > 0 ? '✓' : '0'}/∞`;
        
        // Устанавливаем текст и настраиваем поле ввода
        dom.freeInputText.value = state.freeModeText;
        dom.freeInputText.disabled = false;
        
        // Настраиваем высоту поля с учетом масштаба
        const scale = state.settings.scale;
        const baseHeight = 140;
        const adjustedHeight = baseHeight * scale;
        dom.freeInputText.style.height = `${adjustedHeight}px`;
        dom.freeInputText.style.minHeight = `${adjustedHeight}px`;
        
        // Фокусируемся на поле ввода
        setTimeout(() => {
            dom.freeInputText.focus();
            dom.freeInputText.scrollTop = dom.freeInputText.scrollHeight;
        }, 100);
        
        // Включаем/выключаем кнопку отправки
        dom.btnSubmit.disabled = state.freeModeText.trim().length === 0;
    } else {
        // Режим выбора вариантов
        dom.choicesList.style.display = 'block';
        dom.freeInputWrapper.style.display = 'none';
        dom.modeIcon.innerHTML = '<i class="fas fa-list-ul"></i>';
        dom.modeText.textContent = 'Режим: Варианты';
        dom.modeText.classList.remove('free-mode');
    }
}

/**
 * Нормализует название характеристики к стандартному ключу
 * @param {string} statName - Название характеристики
 * @returns {string} Нормализованный ключ (will, stealth, influence, sanity)
 */
function normalizeStatKey(statName) {
    if (!statName) return '';
    
    const lowerStat = statName.toString().toLowerCase().trim();
    
    // Ищем в алиасах конфига
    for (const [alias, key] of Object.entries(CONFIG.statAliases)) {
        if (alias.toLowerCase() === lowerStat) {
            return key; // Возвращаем стандартный ключ
        }
    }
    
    // Если не нашли в алиасах, проверяем стандартные ключи
    const standardKeys = ['will', 'stealth', 'influence', 'sanity'];
    if (standardKeys.includes(lowerStat)) {
        return lowerStat;
    }
    
    // Если ничего не подошло, возвращаем оригинал
    return lowerStat;
}

/**
 * Получает иконку для стандартного ключа характеристики
 * @param {string} statKey - Стандартный ключ
 * @returns {string} HTML иконки
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
 * Создает компактный HTML для отображения требований (ОБНОВЛЕНО)
 * @param {Object} requirements - Объект требований
 * @returns {string} HTML строка
 */
function createRequirementsHTML(requirements) {
    if (!requirements) return '';
    
    let html = '<div style="margin: 8px 0 12px 0; padding: 10px; background: rgba(30, 0, 0, 0.3); border-radius: 6px; border: 1px solid #222; font-size: 0.8rem;">';
    
    // Заголовок требований
    html += '<div style="color: #ffcc00; font-weight: 600; margin-bottom: 6px; display: flex; align-items: center; gap: 6px;">';
    html += '<i class="fas fa-list-check" style="font-size: 0.8rem;"></i>';
    html += '<span>Требования</span>';
    html += '</div>';
    
    // Статистические требования
    if (requirements.stats && Object.keys(requirements.stats).length > 0) {
        const statsList = [];
        
        for (const [stat, value] of Object.entries(requirements.stats)) {
            const normalizedKey = normalizeStatKey(stat);
            const russianName = getRussianStatName(normalizedKey);
            const icon = getStatIcon(normalizedKey);
            
            statsList.push(`
                <div style="display: flex; align-items: center; gap: 6px; padding: 3px 8px; background: rgba(0,0,0,0.2); border-radius: 4px; border: 1px solid #333;">
                    ${icon}
                    <span style="color: #ccc; min-width: 70px;">${russianName}:</span>
                    <span style="color: #fff; font-weight: bold; font-family: monospace;">≥ ${value}</span>
                </div>
            `);
        }
        
        if (statsList.length > 0) {
            html += '<div style="display: flex; flex-wrap: wrap; gap: 6px;">';
            html += statsList.join('');
            html += '</div>';
        }
    }
    
    // Требования инвентаря
    if (requirements.inventory) {
        html += '<div style="margin-top: 8px; padding-top: 8px; border-top: 1px dashed #333;">';
        html += '<div style="display: flex; align-items: center; gap: 6px; padding: 4px; background: rgba(0,0,0,0.2); border-radius: 4px;">';
        html += '<i class="fas fa-box-open" style="font-size: 0.75rem; color: #888;"></i>';
        html += '<span style="color: #ccc; min-width: 70px;">Предмет:</span>';
        html += `<span style="color: #fff;">${requirements.inventory}</span>`;
        html += '</div>';
        html += '</div>';
    }
    
    html += '</div>';
    return html;
}

/**
 * Создает компактный HTML для отображения изменений (ОБНОВЛЕНО)
 * @param {Object} changes - Объект изменений
 * @param {string} type - Тип изменений ('success' или 'failure')
 * @returns {string} HTML строка
 */
function createChangesHTML(changes, type) {
    if (!changes) return '';
    
    const isSuccess = type === 'success';
    const borderColor = isSuccess ? '#4CAF50' : '#f44336';
    const headerBg = isSuccess ? 'rgba(76, 175, 80, 0.1)' : 'rgba(244, 67, 54, 0.1)';
    const typeText = isSuccess ? 'При успехе' : 'При провале';
    const typeIcon = isSuccess ? 'fas fa-check-circle' : 'fas fa-times-circle';
    
    let html = `<div style="border: 1px solid ${borderColor}; border-radius: 6px; overflow: hidden;">`;
    html += `<div style="background: ${headerBg}; padding: 5px; border-bottom: 1px solid ${borderColor}; display: flex; align-items: center; gap: 5px;">`;
    html += `<i class="${typeIcon}" style="color: ${borderColor}; font-size: 0.85rem;"></i>`;
    html += `<span style="color: ${borderColor}; font-weight: 300; font-size: 0.85rem;">${typeText}</span>`;
    html += '</div>';
    html += '<div style="padding: 5px;">';
    
    // Изменения характеристик
    if (changes.stats && Object.keys(changes.stats).length > 0) {
        for (const [stat, value] of Object.entries(changes.stats)) {
            const normalizedKey = normalizeStatKey(stat);
            const russianName = getRussianStatName(normalizedKey);
            const icon = getStatIcon(normalizedKey);
            const sign = value > 0 ? '+' : '';
            const valueColor = value > 0 ? '#4CAF50' : '#f44336';
            
            html += `
                <div style="display: flex; align-items: center; justify-content: space-between; padding: 4px 0; border-bottom: 1px dotted #333;">
                    <div style="display: flex; align-items: center; gap: 5px;">
                        ${icon}
                        <span style="color: #ccc; font-size: 0.85rem;">${russianName}:</span>
                    </div>
                    <span style="color: ${valueColor}; font-weight: bold; font-family: monospace; font-size: 0.8rem;">${sign}${value}</span>
                </div>
            `;
        }
    }
    
    // Инвентарь (добавление)
    if (changes.inventory_add && changes.inventory_add.length > 0) {
        changes.inventory_add.forEach(item => {
            html += `
                <div style="display: flex; align-items: center; justify-content: space-between; padding: 4px 0; border-bottom: 1px dotted #333;">
                    <div style="display: flex; align-items: center; gap: 6px;">
                        <i class="fas fa-plus-circle" style="font-size: 0.75rem; color: #4CAF50;"></i>
                        <span style="color: #ccc; font-size: 0.85rem;">Предмет:</span>
                    </div>
                    <span style="color: #4CAF50; font-weight: bold;">${item}</span>
                </div>
            `;
        });
    }
    
    // Инвентарь (удаление)
    if (changes.inventory_remove && changes.inventory_remove.length > 0) {
        changes.inventory_remove.forEach(item => {
            html += `
                <div style="display: flex; align-items: center; justify-content: space-between; padding: 4px 0; border-bottom: 1px dotted #333;">
                    <div style="display: flex; align-items: center; gap: 6px;">
                        <i class="fas fa-minus-circle" style="font-size: 0.75rem; color: #f44336;"></i>
                        <span style="color: #ccc; font-size: 0.85rem;">Предмет:</span>
                    </div>
                    <span style="color: #f44336; font-weight: bold;">${item}</span>
                </div>
            `;
        });
    }
    
    html += '</div></div>';
    return html;
}

// =================================================
// УПРОЩЕННАЯ ФУНКЦИЯ renderChoices для отладки
// =================================================

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
 * Компактный формат требований (одной строкой)
 */
function formatCompactRequirements(req) {
    if (!req) return '';
    let items = [];
    
    // Статы
    if (req.stats) {
        for (const [key, val] of Object.entries(req.stats)) {
            const normKey = Utils.normalizeStatKey(key);
            const ruName = getRussianStatName(normKey);
            // Желтый цвет для требований
            items.push(`<span style="color:#fbc531;">${ruName}≥${val}</span>`);
        }
    }
    // Предмет
    if (req.inventory) {
        // Голубой цвет для предмета
        items.push(`<span style="color:#00a8ff;">📦${req.inventory}</span>`);
    }
    
    if (items.length === 0) return '';
    // Иконка замка
    return `<div style="font-size:0.75rem; margin-top:3px; color:#888; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; opacity: 0.3">🔒 Треб: ${items.join(', ')}</div>`;
}

/**
 * Компактный формат последствий (одной строкой)
 */
function formatCompactChanges(success, failure) {
    let html = '';
    
    // Хелпер для форматирования одного блока (Успех или Провал)
    const formatBlock = (changes, color, iconSymbol) => {
        let items = [];
        // Статы
        if (changes.stats) {
            for (const [key, val] of Object.entries(changes.stats)) {
                if (val === 0) continue;
                const normKey = Utils.normalizeStatKey(key);
                const ruName = getRussianStatName(normKey);
                const sign = val > 0 ? '+' : '';
                items.push(`${ruName}${sign}${val}`);
            }
        }
        // Инвентарь
        if (changes.inventory_add && changes.inventory_add.length) {
            changes.inventory_add.forEach(i => items.push(`+📦${i}`));
        }
        if (changes.inventory_remove && changes.inventory_remove.length) {
            changes.inventory_remove.forEach(i => items.push(`-📦${i}`));
        }
        
        if (items.length === 0) return '';
        return `<span style="color:${color}; margin-right:8px;">${iconSymbol} ${items.join(', ')}</span>`;
    };

    const sHtml = formatBlock(success, '#4cd137', '✅'); // Зеленый для успеха
    const fHtml = formatBlock(failure, '#e84118', '❌'); // Красный для провала
    
    if (sHtml) {
        html = `<div style="font-size:0.75rem; margin-top:2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; opacity: 0.3">${sHtml}</div>`;
    }
    
       if (fHtml) {
        html += `<div style="font-size:0.75rem; margin-top:2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; opacity: 0.3">${fHtml}</div>`;
    }
    
    return html;
}

/**
 * Отрисовка вариантов выбора (упрощенная версия для отладки)
 */
function renderChoices() {
    const state = State.getState();
    dom.choicesList.innerHTML = '';
    
    state.currentScene.choices.forEach((choice, idx) => {
        const btn = document.createElement('button');
        // Добавляем класс selected, если вариант выбран
        btn.className = `choice-btn ${state.selectedChoices.includes(idx) ? 'selected' : ''}`;
        
        // 1. Текст действия
        let content = `${choice.text}`;
        
        // 2. Компактные требования и последствия (под текстом)
        // Если это режим отладки или просто отображение - показываем всегда
        content += formatCompactRequirements(choice.requirements);
        content += formatCompactChanges(choice.success_changes, choice.failure_changes);
        
        btn.innerHTML = content;
        btn.onclick = () => Game.toggleChoice(idx);
        dom.choicesList.appendChild(btn);
    });
    
    // Обновляем счетчик
    const count = state.selectedChoices ? state.selectedChoices.length : 0;
    dom.choicesCounter.textContent = `${count}/${CONFIG.maxChoices}`;
}

/**
 * Отрисовка характеристик героя
 */
function renderStats() {
    const state = State.getState();
    
    // Обновляем значения характеристик
    dom.vals.will.textContent = state.stats.will;
    dom.vals.stealth.textContent = state.stats.stealth;
    dom.vals.inf.textContent = state.stats.influence;
    dom.vals.sanity.textContent = state.stats.sanity;
    
    // Обновляем описание личности
    dom.pers.textContent = state.personality;
    
    // Обновляем прогресс-бар
    const maxScore = 110;
    const pct = Math.min(100, Math.max(0, (state.progress / maxScore) * 100));
    dom.tube.style.height = `${pct}%`;
    
    // Отрисовываем список степеней
    dom.degrees.innerHTML = CONFIG.degrees.slice().reverse().map(d => {
        let cls = 'degree-item';
        if (d.lvl < state.degreeIndex) cls += ' passed';
        if (d.lvl === state.degreeIndex) cls += ' active';
        return `<div class="${cls}">${d.name}</div>`;
    }).join('');
}

/**
 * Отрисовка инвентаря (ПРОСТОЙ ИСПРАВЛЕННЫЙ ВАРИАНТ)
 */
function renderInventory() {
    const state = State.getState();
    let invContainer = document.getElementById('inventoryContainer');
    if (!invContainer) {
        invContainer = document.createElement('div');
        invContainer.id = 'inventoryContainer';
        invContainer.className = 'inventory-section';
        if (dom.pers && dom.pers.parentNode) {
            dom.pers.parentNode.insertBefore(invContainer, dom.pers.nextSibling);
        }
    }
    
    let items = [];
    const rawInv = state.aiMemory.inventory;
    if (rawInv) {
        if (Array.isArray(rawInv)) items = rawInv;
        else if (typeof rawInv === 'string') items = rawInv.split(',').map(s => s.trim()).filter(Boolean);
    }
    
    let html = `<div style="margin-top:15px; font-weight:bold; color:#d4af37; border-bottom:1px solid #333; padding-bottom:4px; margin-bottom:5px; font-size:0.85rem;">
        <i class="fas fa-box-open"></i> ИНВЕНТАРЬ
    </div>`;
    
    if (items.length === 0) {
        html += `<div style="font-size:0.8rem; color:#666; font-style:italic;">Пусто...</div>`;
    } else {
        html += `<div style="display:flex; flex-wrap:wrap; gap:6px;">`;
        items.forEach(item => {
            const cleanItem = item.replace(/['"]/g, '');
            html += `<span style="background:rgba(255,255,255,0.08); padding:3px 8px; border-radius:4px; font-size:0.75rem; border:1px solid #444; color:#ccc;">${cleanItem}</span>`;
        });
        html += `</div>`;
    }
    invContainer.innerHTML = html;
}

/**
 * Применение визуальных эффектов состояния
 */
function applyStateEffects() {
    const state = State.getState();
    const body = document.body;
    
    // 1. Эффект Ритуала
    if (state.isRitualActive) {
        body.classList.add('ritual-mode');
    } else {
        body.classList.remove('ritual-mode');
    }
    
    // 2. Эффект Безумия (Sanity < 20)
    if (state.stats.sanity < 20) {
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
    
    // Отрисовываем историю в обратном порядке (последние ходы сверху)
    [...state.history].reverse().forEach(entry => {
        const item = document.createElement('div');
        item.className = 'history-item';
        
        // Заголовок записи
        const head = document.createElement('div');
        head.className = 'history-header';
        head.innerHTML = `
            <span class="history-preview">${entry.sceneSnippet}...</span>
            <i class="fas fa-chevron-down" style="color:#444"></i>
        `;
        
        // Тело записи
        const body = document.createElement('div');
        body.className = 'history-content';
        body.innerHTML = `
            <p>${entry.fullText}</p>
            <div class="history-choice-label">ВЫБОР: ${entry.choice}</div>
            <div style="font-size:0.7rem; color:#666; margin-top:5px; font-family:monospace;">${entry.changes}</div>
        `;
        
        // Обработчик раскрытия/скрытия
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
 * Полная перерисовка интерфейса
 */
function renderAll() {
    renderScene();
    updateUIMode();
    renderStats();
    renderChoices();
    renderInventory(); 
    renderHistory();
    applyStateEffects(); 
    
    // Обновляем счетчик ходов
    if (dom.turnCounter) {
        // Разделяем стили через HTML
        dom.turnCounter.innerHTML = `ХОДЫ: <span style="color: #888; font-family: monospace;">${State.getTurnCount()}</span>`;
    }
}

/**
 * Показ подложки для фраз героя
 */
function showThoughtsOfHeroLayout() {
    if (dom.thoughtsOfHeroLayout) {
        dom.thoughtsOfHeroLayout.style.display = 'flex';
    }
}

/**
 * Скрытие подложки для фраз героя
 */
function hideThoughtsOfHeroLayout() {
    if (dom.thoughtsOfHeroLayout) {
        dom.thoughtsOfHeroLayout.style.display = 'none';
    }
}

/**
 * Обновление текста на подложке фраз героя
 * @param {string} text - Текст для отображения
 */
function updateThoughtsOfHeroText(text) {
    if (dom.thoughtsOfHeroText) {
        dom.thoughtsOfHeroText.textContent = text;
    }
}

/**
 * Показать уведомление (ошибка, успех или предупреждение)
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

    // УСТАНАВЛИВАЕМ СТИЛЬ В ЗАВИСИМОСТИ ОТ ТИПА
    if (type === 'error') {
    	// [ERROR] красный
        alertModalContent.className = 'alert-modal-content error';
        alertModalHeader.className = 'modal-header alert-modal-header error';
        alertModalTitle.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Ошибка';
        copyErrorBtn.style.display = details ? 'block' : 'none';
    } else if (type === 'success') {
    	// [SUCCESS] зелёный
        alertModalContent.className = 'alert-modal-content success';
        alertModalHeader.className = 'modal-header alert-modal-header success';
        alertModalTitle.innerHTML = '<i class="fas fa-check-circle"></i> Успех';
        copyErrorBtn.style.display = 'none';
    } else if (type === 'warning') {
    	// [WARN] жёлтый
        alertModalContent.className = 'alert-modal-content warning';
        alertModalHeader.className = 'modal-header alert-modal-header warning';
        alertModalTitle.innerHTML = '<i class="fas fa-exclamation-circle"></i> Внимание';
        copyErrorBtn.style.display = details ? 'block' : 'none';
    }

    // ЗАПОЛНЯЕМ УВЕДОМЛЕНИЕ ИНФОРМАЦИОННЫМИ ДЕТАЛЯМИ
    alertMessage.innerHTML = `<h3 style="margin-bottom: 0.5rem;">${title}</h3><p>${message}</p>`;

    if (details) {
        const formattedDetails = Utils.formatErrorDetails(details);
        alertDetails.value = formattedDetails;
        alertDetails.style.display = 'block';

        copyErrorBtn.onclick = () => {
            if (!navigator.clipboard) {
                console.error('Clipboard API недоступно. Возможно, требуется HTTPS или современный браузер.');
                return; // Fallback: не копируем, но не ломаем
            }
            navigator.clipboard.writeText(formattedDetails).then(() => {
                copyErrorBtn.innerHTML = '<i class="fas fa-check"></i> Скопировано!';
                setTimeout(() => {
                    copyErrorBtn.innerHTML = '<i class="fas fa-copy"></i> Скопировать данные';
                }, 2000);
            }).catch(err => {
                console.error('Ошибка копирования:', err);
            });
        };

        // Для ошибок: вывод стек-трейса
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
    renderAll,
    showAlert,
    showErrorAlert,
    showSuccessAlert,
    showWarningAlert,
    showThoughtsOfHeroLayout,
    hideThoughtsOfHeroLayout,
    updateThoughtsOfHeroText
};