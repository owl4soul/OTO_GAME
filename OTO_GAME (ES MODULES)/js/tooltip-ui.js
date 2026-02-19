// Файл: tooltip-ui.js
// Универсальный менеджер тултипов, использующий стили, идентичные старым тултипам из gameitem-ui.
// Обеспечивает единообразное отображение во всех частях приложения.
'use strict';

import { log, LOG_CATEGORIES } from './logger.js';

// Стили тултипа, скопированные из конфигурации GAME_ITEM_UI_CONFIG.TOOLTIPS
const TOOLTIP_STYLES = {
    background: 'linear-gradient(135deg, #1a0a0a 0%, #0d0505 100%)',
    border: '1px solid #fbc53160',
    borderRadius: '6px',
    padding: '4px',
    maxWidth: '300px',
    boxShadow: '0 0 25px #fbc53130, 0 6px 12px rgba(0,0,0,0.8)',
    color: '#e0e0e0',
    fontSize: '0.8em',
    lineHeight: '1.05',
    fontFamily: "'Unbounded', 'Nunito Sans', 'Exo 2', 'Aldrich', 'Courier New', monospace",
    letterSpacing: '0.3px'
};

class TooltipUIManager {
    constructor() {
        this.tooltip = null;
        this.hideTimeout = null;
        this.fadeOutDuration = 200; // мс, соответствует CSS-анимации
        this.isVisible = false;
        this.currentElement = null;
    }
    
    /**
     * Создаёт элемент тултипа, если его ещё нет.
     */
    _ensureTooltipElement() {
        if (this.tooltip) return;
        this.tooltip = document.createElement('div');
        this.tooltip.className = 'game-item-tooltip'; // класс для совместимости с темой
        // применяем стили из конфига
        Object.assign(this.tooltip.style, {
            position: 'fixed',
            zIndex: '10000',
            pointerEvents: 'none',
            display: 'none',
            animation: 'tooltipFadeIn 0.2s ease-out',
            background: TOOLTIP_STYLES.background,
            border: TOOLTIP_STYLES.border,
            borderRadius: TOOLTIP_STYLES.borderRadius,
            padding: TOOLTIP_STYLES.padding,
            maxWidth: TOOLTIP_STYLES.maxWidth,
            boxShadow: TOOLTIP_STYLES.boxShadow,
            color: TOOLTIP_STYLES.color,
            fontSize: TOOLTIP_STYLES.fontSize,
            lineHeight: TOOLTIP_STYLES.lineHeight,
            fontFamily: TOOLTIP_STYLES.fontFamily,
            letterSpacing: TOOLTIP_STYLES.letterSpacing
        });
        document.body.appendChild(this.tooltip);
        
        // Глобальный обработчик для скрытия при тапе вне тултипа
        document.addEventListener('click', this._handleDocumentClick.bind(this));
        document.addEventListener('touchstart', this._handleDocumentClick.bind(this));
    }
    
    /**
     * Обработчик глобальных кликов/тапов – скрывает тултип, если клик был не по элементу-источнику.
     */
    _handleDocumentClick(e) {
        if (!this.isVisible) return;
        if (this.currentElement && (this.currentElement === e.target || this.currentElement.contains(e.target))) {
            return;
        }
        if (this.tooltip && this.tooltip.contains(e.target)) return;
        this.hide();
    }
    
    /**
     * Показывает тултип с заданным HTML-содержимым, привязанный к элементу element.
     * @param {HTMLElement} element - элемент, относительно которого позиционируется тултип.
     * @param {string} htmlContent - HTML-код содержимого.
     * @param {Object} options - дополнительные опции (autoHide, autoHideDelay, offsetX, offsetY).
     */
    show(element, htmlContent, options = {}) {
        if (!element || !htmlContent) {
            log.warn(LOG_CATEGORIES.UI_EVENTS, 'TooltipUI.show: не переданы element или htmlContent');
            return;
        }
        
        // Если уже показываем тултип для того же элемента, обновляем содержимое
        if (this.isVisible && this.currentElement === element) {
            this.tooltip.innerHTML = htmlContent;
            this._positionTooltip(element, options);
            return;
        }
        
        // Если висит другой тултип, скрываем его без анимации
        if (this.isVisible) {
            this._hideImmediately();
        }
        
        this._ensureTooltipElement();
        this.currentElement = element;
        
        this.tooltip.innerHTML = htmlContent;
        this.tooltip.style.display = 'block';
        this.tooltip.classList.remove('fade-out');
        
        this._positionTooltip(element, options);
        
        this.isVisible = true;
        
        if (options.autoHide !== false) {
            this._startAutoHide(options.autoHideDelay || 7000);
        }
    }
    
    /**
     * Позиционирует тултип относительно элемента.
     */
    _positionTooltip(element, options) {
        if (!this.tooltip || !element) return;
        
        const rect = element.getBoundingClientRect();
        const tooltipRect = this.tooltip.getBoundingClientRect();
        
        let left = rect.left + window.scrollX + (options.offsetX || 0);
        let top = rect.bottom + window.scrollY + (options.offsetY || 8);
        
        // Не выходим за правый край
        if (left + tooltipRect.width > window.innerWidth) {
            left = window.innerWidth - tooltipRect.width - 10;
        }
        if (left < 10) left = 10;
        
        // Если не помещается снизу, показываем сверху
        if (top + tooltipRect.height > window.innerHeight + window.scrollY) {
            top = rect.top + window.scrollY - tooltipRect.height - (options.offsetY || 8);
        }
        if (top < window.scrollY) top = window.scrollY + 10;
        
        this.tooltip.style.left = left + 'px';
        this.tooltip.style.top = top + 'px';
    }
    
    /**
     * Скрывает тултип с анимацией fade-out.
     */
    hide() {
        if (!this.isVisible || !this.tooltip) return;
        this._clearAutoHide();
        
        this.tooltip.classList.add('fade-out');
        setTimeout(() => {
            if (this.tooltip && this.tooltip.classList.contains('fade-out')) {
                this._hideImmediately();
            }
        }, this.fadeOutDuration);
    }
    
    /**
     * Мгновенно скрывает тултип без анимации.
     */
    _hideImmediately() {
        if (this.tooltip) {
            this.tooltip.style.display = 'none';
            this.tooltip.classList.remove('fade-out');
        }
        this.isVisible = false;
        this.currentElement = null;
        this._clearAutoHide();
    }
    
    _startAutoHide(delay) {
        this._clearAutoHide();
        this.hideTimeout = setTimeout(() => {
            this.hide();
        }, delay);
    }
    
    _clearAutoHide() {
        if (this.hideTimeout) {
            clearTimeout(this.hideTimeout);
            this.hideTimeout = null;
        }
    }
    
    destroy() {
        this._hideImmediately();
        if (this.tooltip) {
            this.tooltip.remove();
            this.tooltip = null;
        }
        document.removeEventListener('click', this._handleDocumentClick);
        document.removeEventListener('touchstart', this._handleDocumentClick);
    }
}

export const TooltipUI = new TooltipUIManager();