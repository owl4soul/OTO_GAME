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
 * Отрисовка вариантов выбора
 */
function renderChoices() {
    const state = State.getState();
    
    dom.choicesList.innerHTML = '';
    
    // Создаем кнопки для каждого варианта
    state.currentScene.choices.forEach((txt, idx) => {
        const btn = document.createElement('button');
        btn.className = `choice-btn ${state.selectedChoices.includes(idx) ? 'selected' : ''}`;
        btn.textContent = txt;
        btn.onclick = () => Game.toggleChoice(idx);
        dom.choicesList.appendChild(btn);
    });
    
    // Обновляем счетчик выбранных вариантов
    dom.choicesCounter.textContent = `${state.selectedChoices.length}/${CONFIG.maxChoices}`;
    dom.btnSubmit.disabled = state.selectedChoices.length === 0;
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
 * Отрисовка инвентаря
 */
function renderInventory() {
    const state = State.getState();
    
    // Ищем или создаем контейнер инвентаря
    let invContainer = document.getElementById('inventoryContainer');
    if (!invContainer) {
        invContainer = document.createElement('div');
        invContainer.id = 'inventoryContainer';
        invContainer.className = 'inventory-section';
        // Вставляем после списка степеней
        const degreeList = document.getElementById('degreeListUI');
        if (degreeList && degreeList.parentNode) {
            degreeList.parentNode.appendChild(invContainer);
        }
    }
    
    // Получаем предметы из aiMemory
    // ИИ может хранить их как массив строк или строку через запятую
    let items = [];
    if (state.aiMemory && state.aiMemory.inventory) {
        if (Array.isArray(state.aiMemory.inventory)) {
            items = state.aiMemory.inventory;
        } else if (typeof state.aiMemory.inventory === 'string') {
            items = state.aiMemory.inventory.split(',').map(s => s.trim());
        }
    }
    
    // Отрисовка
    let html = `<div class="inventory-title"><i class="fas fa-box-open"></i> АРТЕФАКТЫ</div>`;
    
    if (items.length === 0) {
        html += `<div class="inventory-empty">Пусто...</div>`;
    } else {
        html += `<div class="inventory-grid">`;
        items.forEach(item => {
            // Очищаем от лишних кавычек если есть
            const cleanItem = item.replace(/['"]/g, '');
            html += `<div class="inventory-item" title="${cleanItem}">${cleanItem}</div>`;
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