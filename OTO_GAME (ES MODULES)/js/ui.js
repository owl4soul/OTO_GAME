// Модуль 12: UI - Контроллер интерфейса (ФОРМАТ 4.1)
'use strict';

import { State } from './3-state.js';
import { DOM } from './4-dom.js';
import { Render } from './5-render.js';
import { CONFIG } from './1-config.js';
import { Utils } from './2-utils.js';

// === КОНСТАНТЫ И НАСТРОЙКИ ===
const MIN_PCT = 10.0;
const HEADER_PX = 44;
const PRECISION = 10000;

// Флаг для троттлинга RAF
let ticking = false;

// =============================================================================
// 1. LOGGER UTILITY
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
// 2. MATH & LOGIC CORE
// =============================================================================

function getViewportHeight() {
    if (window.visualViewport && window.visualViewport.height > 10) {
        return window.visualViewport.height;
    }
    return window.innerHeight;
}

function round(num) {
    return Math.round(num * PRECISION) / PRECISION;
}

function distributeDebit(amountNeeded, val1, val2) {
    const surplus1 = Math.max(0, val1 - MIN_PCT);
    const surplus2 = Math.max(0, val2 - MIN_PCT);
    
    let take1 = 0,
        take2 = 0;
    const halfNeed = amountNeeded / 2;
    
    if (surplus1 >= halfNeed) take1 = halfNeed;
    else take1 = surplus1;
    if (surplus2 >= halfNeed) take2 = halfNeed;
    else take2 = surplus2;
    
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
    
    let finalNeed = amountNeeded - (take1 + take2);
    if (finalNeed > 0.0001) {
        let rem1 = val1 - take1;
        let rem2 = val2 - take2;
        
        if (rem1 >= rem2) take1 += Math.min(rem1, finalNeed);
        else take2 += Math.min(rem2, finalNeed);
        
        finalNeed = amountNeeded - (take1 + take2);
        if (finalNeed > 0.0001) {
            rem1 = val1 - take1;
            rem2 = val2 - take2;
            if (rem1 > 0) take1 += Math.min(rem1, finalNeed);
            if (rem2 > 0) take2 += Math.min(rem2, finalNeed);
        }
    }
    
    return { take1, take2 };
}

function normalizeHeights(top, mid, bot, isBotFixed) {
    const sum = top + mid + bot;
    const diff = 100.0 - sum;
    
    if (Math.abs(diff) < 0.001) return { top, mid, bot };
    
    if (isBotFixed) {
        if (top >= mid) top += diff;
        else mid += diff;
    } else {
        const max = Math.max(top, mid, bot);
        if (max === top) top += diff;
        else if (max === mid) mid += diff;
        else bot += diff;
    }
    
    return {
        top: Math.max(0, round(top)),
        mid: Math.max(0, round(mid)),
        bot: Math.max(0, round(bot))
    };
}

function redistributeHeights(action) {
    const state = State.getState();
    const ui = state.ui;
    const vh = getViewportHeight();
    const currentHeaderPct = (HEADER_PX / vh) * 100;
    
    let top = ui.hTop;
    let mid = ui.hMid;
    let bot = ui.hBot;
    
    if (action === 'collapse') {
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

function applyCssVars(top, mid, bot) {
    const root = document.documentElement;
    root.style.setProperty('--h-top', top);
    root.style.setProperty('--h-mid', mid);
    root.style.setProperty('--h-bot', bot);
}

// =============================================================================
// 3. UI CONTROLLER
// =============================================================================

function init() {
    Logger.info('UI', 'Инициализация подсистемы интерфейса...');
    const dom = DOM.getDOM();
    
    restoreLayout();
    initResizers();
    
    if (dom.botHeader) {
        dom.botHeader.addEventListener('click', () => toggleBottomCollapse(null, false));
    }
    
    if (window.visualViewport) {
        window.visualViewport.addEventListener('resize', handleViewportResize);
    } else {
        window.addEventListener('resize', handleViewportResize);
    }
}

function restoreLayout() {
    const ui = State.getState().ui;
    const vh = getViewportHeight();
    document.documentElement.style.setProperty('--vh', `${vh}px`);
    
    if (ui.isCollapsed) {
        DOM.getDOM().secBot.classList.add('collapsed');
        if (DOM.getDOM().collapseIcon) DOM.getDOM().collapseIcon.innerHTML = '<i class="fas fa-chevron-up"></i>';
        redistributeHeights('sync');
    } else {
        DOM.getDOM().secBot.classList.remove('collapsed');
        if (DOM.getDOM().collapseIcon) DOM.getDOM().collapseIcon.innerHTML = '<i class="fas fa-chevron-down"></i>';
        applyCssVars(ui.hTop, ui.hMid, ui.hBot);
    }
}

function toggleBottomCollapse(forceState = null, isAuto = false) {
    const state = State.getState();
    const currentState = state.ui.isCollapsed;
    const newState = (forceState !== null) ? forceState : !currentState;
    
    if (isAuto) {
        if (newState === true) {
            if (state.ui.isCollapsed) {
                state.ui.isAutoCollapsed = false;
                redistributeHeights('sync');
            } else {
                state.ui.isAutoCollapsed = true;
                state.ui.isCollapsed = true;
                redistributeHeights('collapse');
            }
        } else {
            if (state.ui.isAutoCollapsed) {
                state.ui.isAutoCollapsed = false;
                state.ui.isCollapsed = false;
                redistributeHeights('expand');
            } else {
                redistributeHeights('sync');
            }
        }
    } else {
        state.ui.isAutoCollapsed = false;
        state.ui.isCollapsed = newState;
        
        if (newState) redistributeHeights('collapse');
        else redistributeHeights('expand');
    }
    
    const dom = DOM.getDOM();
    if (state.ui.isCollapsed) {
        dom.secBot.classList.add('collapsed');
        if (dom.collapseIcon) dom.collapseIcon.innerHTML = '<i class="fas fa-chevron-up"></i>';
    } else {
        dom.secBot.classList.remove('collapsed');
        if (dom.collapseIcon) dom.collapseIcon.innerHTML = '<i class="fas fa-chevron-down"></i>';
    }
}

function handleViewportResize() {
    if (!ticking) {
        window.requestAnimationFrame(() => {
            const vh = getViewportHeight();
            document.documentElement.style.setProperty('--vh', `${vh}px`);
            
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
// 4. RESIZERS
// =============================================================================

function initResizers() {
    const dom = DOM.getDOM();
    setupDrag(dom.resizerTop, 'top');
    setupDrag(dom.resizerBot, 'mid');
    setupVerticalDrag(dom.resizerBotVert);
}

function setupDrag(el, mode) {
    if (!el) return;
    let startY, startH1, startH2, containerH;
    let isDragging = false;
    
    el.onpointerdown = (e) => {
        e.preventDefault();
        const state = State.getState();
        if (mode === 'mid' && state.ui.isCollapsed) return;
        
        el.setPointerCapture(e.pointerId);
        if (Utils.vibrate) Utils.vibrate(50);
        
        const dom = DOM.getDOM();
        dom.secTop.classList.add('no-anim');
        dom.secMid.classList.add('no-anim');
        dom.secBot.classList.add('no-anim');
        
        el.classList.add('active');
        isDragging = false;
        startY = e.clientY;
        containerH = dom.mainContainer ? dom.mainContainer.clientHeight : window.innerHeight;
        
        startH1 = (mode === 'top') ? state.ui.hTop : state.ui.hMid;
        startH2 = (mode === 'top') ? state.ui.hMid : state.ui.hBot;
    };
    
    el.onpointermove = (e) => {
        e.preventDefault();
        if (!el.classList.contains('active')) return;
        
        const deltaPx = e.clientY - startY;
        if (!isDragging && Math.abs(deltaPx) < 10) return;
        isDragging = true;
        
        const deltaPerc = (deltaPx / containerH) * 100;
        let newH1 = startH1 + deltaPerc;
        let newH2 = startH2 - deltaPerc;
        
        if (newH1 < MIN_PCT || newH2 < MIN_PCT) return;
        
        const state = State.getState();
        if (mode === 'top') {
            state.ui.hTop = newH1;
            state.ui.hMid = newH2;
        } else {
            state.ui.hMid = newH1;
            state.ui.hBot = newH2;
        }
        
        const norm = normalizeHeights(state.ui.hTop, state.ui.hMid, state.ui.hBot, false);
        applyCssVars(norm.top, norm.mid, norm.bot);
    };
    
    el.onpointerup = (e) => {
        e.preventDefault();
        el.releasePointerCapture(e.pointerId);
        el.classList.remove('active');
        if (Utils.vibrate) Utils.vibrate(30);
        
        const dom = DOM.getDOM();
        dom.secTop.classList.remove('no-anim');
        dom.secMid.classList.remove('no-anim');
        dom.secBot.classList.remove('no-anim');
        
        const state = State.getState();
        const norm = normalizeHeights(state.ui.hTop, state.ui.hMid, state.ui.hBot, false);
        state.ui.hTop = norm.top;
        state.ui.hMid = norm.mid;
        state.ui.hBot = norm.bot;
        State.saveUiState();
    };
}

function setupVerticalDrag(el) {
    if (!el) return;
    let startX, startW;
    let isDragging = false;
    const dom = DOM.getDOM();
    
    el.onpointerdown = (e) => {
        e.preventDefault();
        el.setPointerCapture(e.pointerId);
        if (Utils.vibrate) Utils.vibrate(50);
        
        const state = State.getState();
        startX = e.clientX;
        startW = state.ui.wBotLeft;
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
        
        if (newW < 20 || newW > 80) return;
        
        const paneLeft = dom.bottomArea.querySelector('.pane-left');
        const paneRight = dom.bottomArea.querySelector('.pane-right');
        if (paneLeft) paneLeft.style.flex = `0 0 ${newW}%`;
        if (paneRight) paneRight.style.flex = `0 0 ${100 - newW}%`;
        
        const state = State.getState();
        state.ui.wBotLeft = newW;
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
// 5. SETTINGS & HELPERS
// =============================================================================

function setFreeModeUI(isFreeMode) {
    const state = State.getState();
    const dom = DOM.getDOM();
    
    State.setState({ freeMode: isFreeMode });
    
    if (isFreeMode) {
        state.ui._tempSavedState = state.ui.isCollapsed;
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
        
        if (typeof state.ui._tempSavedState !== 'undefined') {
            toggleBottomCollapse(state.ui._tempSavedState);
            delete state.ui._tempSavedState;
        }
    }
}

function checkSubmitButtonState() {
    const state = State.getState();
    const dom = DOM.getDOM();
    
    if (!dom.btnSubmit) return;
    
    let shouldEnable = false;
    
    if (state.freeMode) {
        const text = dom.freeInputText ? dom.freeInputText.value.trim() : '';
        shouldEnable = text.length > 0;
        
        if (dom.choicesCounter) {
            dom.choicesCounter.textContent = shouldEnable ? '✓/∞' : '0/∞';
        }
    } else {
        // Используем gameState.selectedActions вместо старого selectedChoices
        const selectedActions = state.gameState.selectedActions || [];
        shouldEnable = selectedActions.length > 0;
        
        if (dom.choicesCounter) {
            const max = CONFIG.maxChoices || 3;
            const current = selectedActions.length;
            dom.choicesCounter.textContent = `${current}/${max}`;
        }
    }
    
    dom.btnSubmit.disabled = !shouldEnable;
    dom.btnSubmit.style.opacity = shouldEnable ? '1' : '0.5';
    dom.btnSubmit.style.cursor = shouldEnable ? 'pointer' : 'not-allowed';
}

function checkClearButtonState() {
    const state = State.getState();
    const dom = DOM.getDOM();
    if (!dom.btnClear) return;
    
    let shouldEnable = false;
    
    if (state.freeMode) {
        const text = dom.freeInputText ? dom.freeInputText.value : '';
        shouldEnable = text.length > 0;
    } else {
        const selectedActions = state.gameState.selectedActions || [];
        shouldEnable = selectedActions.length > 0;
    }
    
    dom.btnClear.disabled = !shouldEnable;
    dom.btnClear.style.opacity = shouldEnable ? '1' : '0.5';
    dom.btnClear.style.cursor = shouldEnable ? 'pointer' : 'not-allowed';
}

function updateActionButtons() {
    checkSubmitButtonState();
    checkClearButtonState();
}

function scaleUp() {
    const idx = State.getScaleIndex();
    if (idx < CONFIG.scaleSteps.length - 1) {
        const newScale = State.updateScale(idx + 1);
        updateScaleDisplay(newScale);
        if (Utils.vibrate) Utils.vibrate(50);
    }
}

function scaleDown() {
    const idx = State.getScaleIndex();
    if (idx > 0) {
        const newScale = State.updateScale(idx - 1);
        updateScaleDisplay(newScale);
        if (Utils.vibrate) Utils.vibrate(50);
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
        if (DOM.refresh) DOM.refresh();
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
    updateActionButtons,
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