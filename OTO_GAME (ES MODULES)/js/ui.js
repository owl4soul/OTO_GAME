// Модуль 12: UI - Контроллер интерфейса (js/ui.js)
'use strict';

import { State } from './3-state.js';
import { DOM } from './4-dom.js';
import { Render } from './5-render.js'; 
import { CONFIG } from './1-config.js';
import { Utils } from './2-utils.js';

// === КОНСТАНТЫ И НАСТРОЙКИ ===
const MIN_PCT = 10.0;     // Минимальная допустимая высота секции (%)
const HEADER_PX = 44;     // Высота заголовка Bot (px), должна совпадать с CSS --h-row
const PRECISION = 10000;  // Точность для округления float (4 знака)

// Флаг для троттлинга RAF (оптимизация ресайза)
let ticking = false;

// =============================================================================
// 1. LOGGER UTILITY (Утилита логирования)
// =============================================================================
export const Logger = {
    _s: {
        base: 'padding: 2px 5px; border-radius: 3px; font-weight: bold;',
        info: 'background: #333; color: #fff;',
        success: 'background: #2d8b57; color: #fff;',
        warn: 'background: #d4af37; color: #000;',
        error: 'background: #8b0000; color: #fff;'
    },
    info(module, msg) { console.log(`%c ${module} %c ${msg}`, this._s.base + this._s.info, 'color: #ccc;'); },
    success(module, msg) { console.log(`%c ${module} %c ${msg}`, this._s.base + this._s.success, 'color: #2d8b57;'); },
    warn(module, msg) { console.log(`%c ${module} %c ${msg}`, this._s.base + this._s.warn, 'color: #d4af37;'); },
    error(module, msg, err) { console.error(`%c ${module} %c ${msg}`, this._s.base + this._s.error, 'color: #ff6b6b;', err); }
};

// =============================================================================
// 2. MATH & LOGIC CORE (Ядро математических расчетов)
// =============================================================================

/**
 * Получение высоты вьюпорта с приоритетом VisualViewport
 * Критично для корректной работы с виртуальной клавиатурой на мобильных.
 */
function getViewportHeight() {
    // Проверка на валидность visualViewport (защита от багов старых браузеров)
    if (window.visualViewport && window.visualViewport.height > 10) {
        return window.visualViewport.height;
    }
    return window.innerHeight;
}

/**
 * Безопасное округление float до PRECISION
 */
function round(num) {
    return Math.round(num * PRECISION) / PRECISION;
}

/**
 * Алгоритм "Smart Debit" (Умное списание)
 * Распределяет "Дефицит" (amountNeeded) между двумя секциями (val1, val2).
 * 
 * Приоритеты:
 * 1. Сначала забираем "жирок" (излишки сверх MIN_PCT).
 * 2. Если жирка не хватает, добираем у "богатого".
 * 3. В случае Force Majeure (оба истощены) — режем "тело" секции, но не уводим в минус.
 */
function distributeDebit(amountNeeded, val1, val2) {
    // 1. Считаем излишки (Surplus) - то, что выше 10%
    const surplus1 = Math.max(0, val1 - MIN_PCT);
    const surplus2 = Math.max(0, val2 - MIN_PCT);
    
    let take1 = 0, take2 = 0;
    const halfNeed = amountNeeded / 2;
    
    // 2. Пытаемся покрыть долг за счет излишков (поровну)
    // Если у секции хватает излишка на половину долга — берем половину.
    // Если нет — забираем весь излишек.
    if (surplus1 >= halfNeed) take1 = halfNeed; else take1 = surplus1;
    if (surplus2 >= halfNeed) take2 = halfNeed; else take2 = surplus2;
    
    // 3. Если из-за нехватки у одной мы не добрали сумму, пытаемся добрать у "богатого" соседа
    const remainingNeed = amountNeeded - (take1 + take2);
    if (remainingNeed > 0.0001) {
        if (surplus1 > take1) {
            const canTake = surplus1 - take1;
            take1 += Math.min(canTake, remainingNeed);
        } else if (surplus2 > take2) {
            const canTake = surplus2 - take2;
            take2 += Math.min(canTake, remainingNeed);
        }
    }
    
    // 4. Force Majeure: Излишки кончились, но долг остался (экстремально маленький экран).
    // Приходится уменьшать секции ниже MIN_PCT, чтобы соблюсти 100% высоты экрана.
    let finalNeed = amountNeeded - (take1 + take2);
    if (finalNeed > 0.0001) {
        // Сколько физически осталось у секций ПОСЛЕ изъятия излишков
        let rem1 = val1 - take1;
        let rem2 = val2 - take2;

        // Сначала забираем у того, у кого больше абсолютного значения
        if (rem1 >= rem2) take1 += Math.min(rem1, finalNeed);
        else take2 += Math.min(rem2, finalNeed);
        
        // Если все еще должны (очень редкий случай), добираем у второго
        finalNeed = amountNeeded - (take1 + take2);
        if (finalNeed > 0.0001) {
             // Обновляем остатки
             rem1 = val1 - take1;
             rem2 = val2 - take2;
             if (rem1 > 0) take1 += Math.min(rem1, finalNeed);
             if (rem2 > 0) take2 += Math.min(rem2, finalNeed);
        }
    }

    return { take1, take2 };
}

/**
 * Нормализация суммы до 100%.
 * Устраняет дрейф плавающей запятой (напр. 99.9999% -> 100%) и гарантирует отсутствие пустых пикселей.
 * 
 * @param {boolean} isBotFixed - Если true, Bot не участвует в коррекции (он "священен").
 */
function normalizeHeights(top, mid, bot, isBotFixed) {
    const sum = top + mid + bot;
    const diff = 100.0 - sum;

    // Если погрешность ничтожна, не трогаем
    if (Math.abs(diff) < 0.001) return { top, mid, bot };

    if (isBotFixed) {
        // Bot фиксирован. Корректируем Top или Mid.
        // Добавляем/отнимаем у большего, чтобы минимизировать визуальный эффект скачка.
        if (top >= mid) top += diff; 
        else mid += diff;
    } else {
        // Иначе корректируем самый большой элемент из всех трех.
        const max = Math.max(top, mid, bot);
        if (max === top) top += diff;
        else if (max === mid) mid += diff;
        else bot += diff;
    }
    
    // Финальная защита от отрицательных значений и округление
    return { 
        top: Math.max(0, round(top)), 
        mid: Math.max(0, round(mid)), 
        bot: Math.max(0, round(bot)) 
    };
}

/**
 * Основная функция пересчета высот (Action Dispatcher).
 * Управляет логикой Collapse, Expand и Sync.
 */
function redistributeHeights(action) {
    const state = State.getState(); // Получаем объект данных
    const ui = state.ui;
    const vh = getViewportHeight();
    const currentHeaderPct = (HEADER_PX / vh) * 100;
    
    let top = ui.hTop;
    let mid = ui.hMid;
    let bot = ui.hBot;

    if (action === 'collapse') {
        // ИСПРАВЛЕНО: Используем State (модуль) вместо state (данные)
        if (bot > currentHeaderPct + 2) {
            State.setHBotBeforeCollapse(bot); 
        } else if (!State.getHBotBeforeCollapse()) {
            State.setHBotBeforeCollapse(20);
        }

        const targetBot = currentHeaderPct;
        const freedSpace = bot - targetBot;

        if (freedSpace > 0) {
            bot = targetBot;
            top += freedSpace / 2;
            mid += freedSpace / 2;
        }
    }
    else if (action === 'expand') {
        // ИСПРАВЛЕНО: Используем State (модуль)
        let targetBot = State.getHBotBeforeCollapse() || 20;
        
        if (targetBot < currentHeaderPct + 1) targetBot = 20;
        const needed = targetBot - bot;
        
        if (needed > 0) {
            const debit = distributeDebit(needed, top, mid);
            top -= debit.take1;
            mid -= debit.take2;
            bot += needed;
        }
    }
    else if (action === 'sync' && ui.isCollapsed) {
        const diff = currentHeaderPct - bot;
        if (Math.abs(diff) > 0.001) {
            if (diff > 0) {
                const debit = distributeDebit(diff, top, mid);
                top -= debit.take1;
                mid -= debit.take2;
                bot += diff;
            } else {
                const giveBack = Math.abs(diff);
                bot -= giveBack;
                top += giveBack / 2;
                mid += giveBack / 2;
            }
        }
    }

    const normalized = normalizeHeights(top, mid, bot, true);
    ui.hTop = normalized.top;
    ui.hMid = normalized.mid;
    ui.hBot = normalized.bot;

    applyCssVars(ui.hTop, ui.hMid, ui.hBot);
    State.saveUiState();
}

/**
 * Применение CSS переменных в DOM
 */
function applyCssVars(top, mid, bot) {
    const root = document.documentElement;
    root.style.setProperty('--h-top', top);
    root.style.setProperty('--h-mid', mid);
    root.style.setProperty('--h-bot', bot);
}


// =============================================================================
// 3. UI CONTROLLER (Контроллер и события)
// =============================================================================

function init() {
    Logger.info('UI', 'Инициализация подсистемы интерфейса...');
    const dom = DOM.getDOM();

    // 1. Восстановление лейаута при старте
    restoreLayout();

    // 2. Инициализация ресайзеров (Drag & Drop)
    initResizers();

    // 3. Слушатель клика по хедеру для сворачивания
    if (dom.botHeader) {
        dom.botHeader.addEventListener('click', () => toggleBottomCollapse(null, false));
    }
    
    // 4. Слушатель Viewport (Клавиатура / Поворот)
    // Используем visualViewport если доступен (современные браузеры)
    if (window.visualViewport) {
        window.visualViewport.addEventListener('resize', handleViewportResize);
    } else {
        window.addEventListener('resize', handleViewportResize);
    }

    // 5. Обработка фокуса поля ввода (превентивное сворачивание)
    if (dom.freeInputText) {
        dom.freeInputText.addEventListener('focus', () => {
             // Здесь можно добавить логику, но основную работу делает handleViewportResize
        });
    }
}

/**
 * Восстановление состояния при загрузке страницы
 */
function restoreLayout() {
    const ui = State.getState().ui;
    // Безопасная инициализация vh
    const vh = getViewportHeight();
    document.documentElement.style.setProperty('--vh', `${vh}px`);

    if (ui.isCollapsed) {
        DOM.getDOM().secBot.classList.add('collapsed');
        if(DOM.getDOM().collapseIcon) DOM.getDOM().collapseIcon.innerHTML = '<i class="fas fa-chevron-up"></i>';
        // Обязательно синхронизируем (SYNC), т.к. размер экрана мог измениться с прошлого раза
        redistributeHeights('sync');
    } else {
        DOM.getDOM().secBot.classList.remove('collapsed');
        if(DOM.getDOM().collapseIcon) DOM.getDOM().collapseIcon.innerHTML = '<i class="fas fa-chevron-down"></i>';
        applyCssVars(ui.hTop, ui.hMid, ui.hBot);
    }
}

/**
 * Переключатель состояния нижней панели (Свернуть/Развернуть)
 * @param {boolean|null} forceState - null (toggle) | true (collapse) | false (expand)
 * @param {boolean} isAuto - вызов системой (клавиатура) или пользователем
 */
function toggleBottomCollapse(forceState = null, isAuto = false) {
    const ui = State.getState().ui;
    const currentState = ui.isCollapsed;
    const newState = (forceState !== null) ? forceState : !currentState;

    if (isAuto) {
        // --- АВТОМАТИКА (КЛАВИАТУРА) ---
        if (newState === true) { 
            // КЛАВИАТУРА ОТКРЫЛАСЬ
            if (ui.isCollapsed) {
                // Уже свернуто пользователем. 
                // Не меняем логическое состояние, просто синхронизируем размер хедера.
                ui.isAutoCollapsed = false; 
                redistributeHeights('sync'); 
            } else {
                // Было развернуто -> Сворачиваем автоматически.
                ui.isAutoCollapsed = true;
                ui.isCollapsed = true;
                redistributeHeights('collapse'); 
            }
        } else { 
            // КЛАВИАТУРА ЗАКРЫЛАСЬ
            if (ui.isAutoCollapsed) {
                // Было свернуто системой -> Разворачиваем обратно.
                ui.isAutoCollapsed = false;
                ui.isCollapsed = false;
                redistributeHeights('expand');
            } else {
                // Было свернуто пользователем -> Оставляем свернутым.
                // Но синхронизируем размер (хедер в % стал меньше).
                redistributeHeights('sync');
            }
        }
    } else {
        // --- РУЧНОЕ УПРАВЛЕНИЕ ---
        // Любое ручное действие сбрасывает авто-флаг
        ui.isAutoCollapsed = false;
        ui.isCollapsed = newState;
        
        if (newState) redistributeHeights('collapse');
        else redistributeHeights('expand');
    }
    
    // Обновляем UI (классы и иконки)
    const dom = DOM.getDOM();
    if (ui.isCollapsed) {
        dom.secBot.classList.add('collapsed');
        if(dom.collapseIcon) dom.collapseIcon.innerHTML = '<i class="fas fa-chevron-up"></i>';
    } else {
        dom.secBot.classList.remove('collapsed');
        if(dom.collapseIcon) dom.collapseIcon.innerHTML = '<i class="fas fa-chevron-down"></i>';
    }
}

/**
 * Обработчик изменения размеров вьюпорта
 * Использует requestAnimationFrame для плавности при анимации клавиатуры
 */
function handleViewportResize() {
    if (!ticking) {
        window.requestAnimationFrame(() => {
            const vh = getViewportHeight();
            document.documentElement.style.setProperty('--vh', `${vh}px`);

            // Детекция клавиатуры: если высота < 75% от полного экрана
            const screenH = window.screen.height > 0 ? window.screen.height : window.innerHeight;
            const isKeyboardOpen = vh < (screenH * 0.75);

            if (isKeyboardOpen) toggleBottomCollapse(true, true);
            else toggleBottomCollapse(false, true);
            
            ticking = false;
        });
        ticking = true;
    }
}

// =============================================================================
// 4. RESIZERS (Логика перетаскивания границ)
// =============================================================================

function initResizers() {
    const dom = DOM.getDOM();
    // Настраиваем горизонтальные ресайзеры
    setupDrag(dom.resizerTop, 'top');
    setupDrag(dom.resizerBot, 'mid'); // mid - это граница между Mid и Bot
    // Настраиваем вертикальный ресайзер
    setupVerticalDrag(dom.resizerBotVert);
}

function setupDrag(el, mode) {
    if (!el) return;
    let startY, startH1, startH2, containerH;
    let isDragging = false;

    el.onpointerdown = (e) => {
        e.preventDefault();
        const ui = State.getState().ui;
        // Блокируем перетаскивание нижнего ресайзера, если низ свернут
        if (mode === 'mid' && ui.isCollapsed) return;

        el.setPointerCapture(e.pointerId);
        if (Utils.vibrate) Utils.vibrate(50);
        
        // Отключаем CSS анимацию для мгновенного отклика
        const dom = DOM.getDOM();
        dom.secTop.classList.add('no-anim');
        dom.secMid.classList.add('no-anim');
        dom.secBot.classList.add('no-anim');

        el.classList.add('active');
        isDragging = false;
        startY = e.clientY;
        containerH = dom.mainContainer ? dom.mainContainer.clientHeight : window.innerHeight;
        
        startH1 = (mode === 'top') ? ui.hTop : ui.hMid;
        startH2 = (mode === 'top') ? ui.hMid : ui.hBot;
    };

    el.onpointermove = (e) => {
        e.preventDefault();
        if (!el.classList.contains('active')) return;

        const deltaPx = e.clientY - startY;
        if (!isDragging && Math.abs(deltaPx) < 10) return; // Порог для отсеивания случайных тапов
        isDragging = true;

        const deltaPerc = (deltaPx / containerH) * 100;
        let newH1 = startH1 + deltaPerc;
        let newH2 = startH2 - deltaPerc;

        // Лимиты минимальной высоты
        if (newH1 < MIN_PCT || newH2 < MIN_PCT) return;

        const ui = State.getState().ui;
        // Обновляем State напрямую
        if (mode === 'top') { 
            ui.hTop = newH1; 
            ui.hMid = newH2; 
        } else { 
            ui.hMid = newH1; 
            ui.hBot = newH2; 
        }
        
        // Нормализуем и применяем (Bot не фиксирован при ручном драге)
        const norm = normalizeHeights(ui.hTop, ui.hMid, ui.hBot, false);
        applyCssVars(norm.top, norm.mid, norm.bot);
    };

    el.onpointerup = (e) => {
        e.preventDefault();
        el.releasePointerCapture(e.pointerId);
        el.classList.remove('active');
        if (Utils.vibrate) Utils.vibrate(30);

        const dom = DOM.getDOM();
        // Включаем анимацию обратно
        dom.secTop.classList.remove('no-anim');
        dom.secMid.classList.remove('no-anim');
        dom.secBot.classList.remove('no-anim');

        // Финальная нормализация и сохранение
        const ui = State.getState().ui;
        const norm = normalizeHeights(ui.hTop, ui.hMid, ui.hBot, false);
        ui.hTop = norm.top; 
        ui.hMid = norm.mid; 
        ui.hBot = norm.bot;
        State.saveUiState();
    };
}

function setupVerticalDrag(el) {
    if(!el) return;
    let startX, startW;
    let isDragging = false;
    const dom = DOM.getDOM();

    el.onpointerdown = (e) => {
        e.preventDefault();
        el.setPointerCapture(e.pointerId);
        if (Utils.vibrate) Utils.vibrate(50);
        
        const ui = State.getState().ui;
        startX = e.clientX;
        startW = ui.wBotLeft;
        el.classList.add('active');
        isDragging = false;
    };
    
    el.onpointermove = (e) => {
        e.preventDefault();
        if (!el.classList.contains('active')) return;
        
        const deltaPx = e.clientX - startX;
        if (!isDragging && Math.abs(deltaPx) < 10) return;
        isDragging = true;
        
        const containerW = dom.bottomArea ? dom.bottomArea.clientWidth : window.innerWidth;
        const deltaPerc = (deltaPx / containerW) * 100;
        let newW = startW + deltaPerc;
        
        if (newW < 20 || newW > 80) return; // Лимиты ширины
        
        const paneLeft = dom.bottomArea.querySelector('.pane-left');
        const paneRight = dom.bottomArea.querySelector('.pane-right');
        if (paneLeft) paneLeft.style.flex = `0 0 ${newW}%`;
        if (paneRight) paneRight.style.flex = `0 0 ${100 - newW}%`;
        
        State.getState().ui.wBotLeft = newW;
    };
    
    el.onpointerup = (e) => {
        e.preventDefault();
        el.releasePointerCapture(e.pointerId);
        if (Utils.vibrate) Utils.vibrate(30);
        el.classList.remove('active');
        State.saveUiState();
    };
}

// =============================================================================
// 5. SETTINGS & HELPERS (Вспомогательный функционал)
// =============================================================================

function setFreeModeUI(isFreeMode) {
    const ui = State.getState().ui;
    const dom = DOM.getDOM();
    State.setState({ freeMode: isFreeMode });
    
    if (isFreeMode) {
        ui._tempSavedState = ui.isCollapsed; 
        if (dom.choicesList) dom.choicesList.style.display = 'none';
        if (dom.freeInputWrapper) dom.freeInputWrapper.style.display = 'flex';
        if (dom.modeText) dom.modeText.textContent = "Свободный ввод";
        if (dom.modeIcon) dom.modeIcon.innerHTML = '<i class="fas fa-keyboard"></i>';
        setTimeout(() => dom.freeInputText && dom.freeInputText.focus(), 50);
    } else {
        if (dom.choicesList) dom.choicesList.style.display = 'block';
        if (dom.freeInputWrapper) dom.freeInputWrapper.style.display = 'none';
        if (dom.modeText) dom.modeText.textContent = "Варианты";
        if (dom.modeIcon) dom.modeIcon.innerHTML = '<i class="fas fa-list-ul"></i>';
        if (dom.freeInputText) dom.freeInputText.blur();
        
        if (typeof ui._tempSavedState !== 'undefined') {
            toggleBottomCollapse(ui._tempSavedState);
            delete ui._tempSavedState;
        }
    }
}

function scaleUp() {
    const idx = State.getScaleIndex();
    if (idx < CONFIG.scaleSteps.length - 1) {
        const newScale = State.updateScale(idx + 1);
        updateScaleDisplay(newScale);
        if(Utils.vibrate) Utils.vibrate(50);
    }
}

function scaleDown() {
    const idx = State.getScaleIndex();
    if (idx > 0) {
        const newScale = State.updateScale(idx - 1);
        updateScaleDisplay(newScale);
        if(Utils.vibrate) Utils.vibrate(50);
    }
}

function updateScaleDisplay(scale) {
    const scaleDisplay = document.getElementById('currentScale');
    if (scaleDisplay) {
        const s = scale || State.getState().settings.scale;
        scaleDisplay.textContent = `${Math.round(s * 100)}%`;
    }
}

function toggleFullscreen() {
    if (!document.fullscreenEnabled && !document.webkitFullscreenEnabled) return;
    const el = document.documentElement;
    if (document.fullscreenElement || document.webkitFullscreenElement) {
        if (document.exitFullscreen) document.exitFullscreen();
        else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
    } else {
        if (el.requestFullscreen) el.requestFullscreen();
        else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen(Element.ALLOW_KEYBOARD_INPUT);
    }
}

function openSettingsModal() {
    const modal = document.getElementById('settingsModal');
    if (modal) {
        modal.classList.add('active');
        if(DOM.refresh) DOM.refresh();
        const state = State.getState();
        const elProvider = document.getElementById('providerInput');
        const elKeyOr = document.getElementById('apiKeyOpenrouterInput');
        const elKeyVse = document.getElementById('apiKeyVsegptInput');
        const elModel = document.getElementById('modelInput');
        
        if (elProvider) elProvider.value = state.settings.apiProvider;
        if (elKeyOr) elKeyOr.value = state.settings.apiKeyOpenrouter;
        if (elKeyVse) elKeyVse.value = state.settings.apiKeyVsegpt;
        if (elModel) elModel.value = state.settings.model;
        
        if (Render.updateApiKeyFields) Render.updateApiKeyFields();
        if (Render.renderModelSelectorByProvider) Render.renderModelSelectorByProvider();
        if (Render.updateModelDetails) Render.updateModelDetails();
        if (Render.renderAuditList) Render.renderAuditList();
    }
}

function closeSettingsModal() {
    const modal = document.getElementById('settingsModal');
    if (modal) modal.classList.remove('active');
}

// Экспорт публичных методов
export const UI = {
    init,
    toggleBottomCollapse,
    setFreeModeUI,
    scaleUp,
    scaleDown,
    updateScaleDisplay,
    toggleFullscreen,
    openSettingsModal,
    closeSettingsModal,
    handleViewportResize,
    Logger
};