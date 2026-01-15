// Модуль 5: RENDER - Отрисовка интерфейса (5-render.js)
'use strict';

import { CONFIG } from './1-config.js';
import { State } from './3-state.js';
import { DOM } from './4-dom.js';
import { Utils } from './2-utils.js';
import { Game } from './6-game.js'; // Импорт Game для toggleChoice

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
 * Отрисовка списка аудита
 */
function renderAuditList() {
    const state = State.getState();
    const list = document.getElementById('auditList');
    
    if (!list) return;
    
    // Ограничиваем количество отображаемых записей
    const displayLog = state.auditLog.slice(0, 5);
    
    list.innerHTML = displayLog.map(entry => {
        let displayText = `${entry.timestamp || '--:--:--'}: ${(entry.status || 'unknown').toUpperCase()} - ${entry.request ? entry.request.substring(0, 30) : 'Тест'}...`;
        
        if (entry.d10) {
            displayText += ` (d10=${entry.d10})`;
        }
        
        // Детали запроса
        if (entry.requestDebug) {
            displayText += `<br><details><summary>Request</summary><pre style="font-size:0.6rem;">${entry.requestDebug.body ? entry.requestDebug.body.substring(0, 200) : 'Нет данных'}...</pre></details>`;
        }
        
        // Детали ответа
        if (entry.fullResponse) {
            const truncated = entry.fullResponse.length > 500 ? entry.fullResponse.substring(0, 500) + '...' : entry.fullResponse;
            displayText += `<br><details><summary>Response (${entry.fullResponse.length} chars)</summary><pre style="font-size:0.6rem;">${truncated}</pre></details>`;
        }
        
        // Ошибки
        if (entry.rawError) {
            displayText += `<br><details><summary>Error</summary><pre style="font-size:0.6rem; color: #ff6b6b;">${Utils.formatErrorDetails(entry.rawError).substring(0, 300)}...</pre></details>`;
        }
        
        return `<div style="padding:0.3rem; border-bottom:1px solid #333;">${displayText}</div>`;
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
 * Отрисовка инвентаря (НОВАЯ ФУНКЦИЯ)
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
 * Применение визуальных эффектов состояния (НОВАЯ ФУНКЦИЯ)
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
    renderInventory(); // <--- Добавлено
    renderHistory();
    applyStateEffects(); // <--- Добавлено
    
    // Обновляем счетчик ходов
    if (dom.turnCounter) {
        // Разделяем стили через HTML
        // Само слово наследует цвет родителя (Золотой из CSS #turnCounter)
        // А цифру оборачиваем в span с серым цветом (#888)
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
 * Показать уведомление (ошибка или успех)
 * @param {string} title - Заголовок уведомления
 * @param {string} message - Текст сообщения
 * @param {any} details - Детали ошибки
 * @param {boolean} isError - Флаг ошибки (true - ошибка, false - успех)
 */
/**
 * Показать уведомление (ошибка, успех или предупреждение)
 * @param {string} title - Заголовок уведомления
 * @param {string} message - Текст сообщения
 * @param {any} details - Детали ошибки
 * @param {string} type - Тип: 'error', 'success', 'warning'
 */
/**
 * Показать уведомление (ошибка, успех или предупреждение)
 * @param {string} title - Заголовок уведомления
 * @param {string} message - Текст сообщения
 * @param {any} details - Детали ошибки
 * @param {string} type - Тип: 'error', 'success', 'warning'
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
                console.log('Детали скопированы в буфер обмена'); // Для отладки
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
 * @param {string} title - Заголовок
 * @param {string} message - Сообщение
 * @param {any} details - Детали предупреждения
 */
function showWarningAlert(title, message, details = null) {
    showAlert(title, message, details, 'warning');
}

/**
 * Показать уведомление об ошибке
 * @param {string} title - Заголовок
 * @param {string} message - Сообщение
 * @param {any} details - Детали ошибки
 */
function showErrorAlert(title, message, details = null) {
    showAlert(title, message, details, 'error');
}

/**
 * Показать уведомление об успехе
 * @param {string} title - Заголовок
 * @param {string} message - Сообщение
 * @param {any} details - Детали
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
