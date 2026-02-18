// Модуль: Глаз ожидания (появляется вместе с мыслями героя)
'use strict';

import { DOM } from './4-dom.js';

const dom = DOM.getDOM();

let isDragging = false;
let startX, startY, startLeft, startTop;
let moved = false;
let holdTimer; // таймер для включения holding
let tapTimer; // таймер для определения тапа (если нужно)
const DRAG_THRESHOLD = 5; // порог движения для перетаскивания
const HOLD_DELAY = 200; // мс, через которое включается holding
const TAP_TIMEOUT = 200; // окно для определения тапа

/**
 * Показать глаз над контейнером мыслей
 */
export function showEye() {
    const eye = dom.waitingEye;
    if (!eye) return;
    
    eye.style.display = 'block';
    eye.classList.remove('visible');
    
    requestAnimationFrame(() => {
        const textElement = dom.thoughtsOfHeroText;
        if (!textElement) {
            console.warn('Текст мыслей не найден');
            return;
        }
        
        const rect = textElement.getBoundingClientRect();
        const eyeWidth = eye.offsetWidth;
        const left = rect.left + rect.width / 2 - eyeWidth / 2;
        const top = rect.top - 100;
        
        eye.style.left = left + 'px';
        eye.style.top = top + 'px';
        eye.style.right = 'auto';
        eye.style.bottom = 'auto';
        
        eye.classList.add('visible');
    });
}

/**
 * Скрыть глаз с затуханием
 */
export function hideEye() {
    const eye = dom.waitingEye;
    if (!eye) return;
    
    eye.classList.remove('visible');
    setTimeout(() => {
        if (!eye.classList.contains('visible')) {
            eye.style.display = 'none';
            // Сбрасываем все временные классы
            eye.classList.remove('dragging', 'holding', 'tapped');
        }
    }, 500);
}

/**
 * Инициализация обработчиков перетаскивания
 */
export function initEyeDrag() {
    const eye = dom.waitingEye;
    if (!eye) return;
    
    eye.addEventListener('touchstart', onTouchStart, { passive: false });
    eye.addEventListener('touchmove', onTouchMove, { passive: false });
    eye.addEventListener('touchend', onTouchEnd);
    eye.addEventListener('touchcancel', onTouchCancel);
    
    // Для десктопа (мышь) — минимальная поддержка (можно добавить позже)
    eye.addEventListener('mousedown', onMouseDown);
}

// ===== Обработчики касаний =====

function onTouchStart(e) {
    e.preventDefault();
    const touch = e.touches[0];
    startX = touch.clientX;
    startY = touch.clientY;
    
    const rect = dom.waitingEye.getBoundingClientRect();
    startLeft = rect.left;
    startTop = rect.top;
    
    moved = false;
    isDragging = false;
    
    // Визуальный отклик: плавное увеличение (transition сработает)
    dom.waitingEye.classList.add('dragging');
    
    // Таймер для включения режима удержания (holding)
    clearTimeout(holdTimer);
    holdTimer = setTimeout(() => {
        // Если ещё не началось перетаскивание, включаем бесконечное свечение
        if (!isDragging) {
            dom.waitingEye.classList.add('holding');
        }
    }, HOLD_DELAY);
    
    // Таймер для определения тапа (если отпустят раньше)
    clearTimeout(tapTimer);
    tapTimer = setTimeout(() => {
        // Если не было движения и не удерживали, то это тап
        if (!moved && !isDragging) {
            dom.waitingEye.classList.add('tapped');
            setTimeout(() => dom.waitingEye.classList.remove('tapped'), 300);
        }
    }, TAP_TIMEOUT);
}

function onTouchMove(e) {
    e.preventDefault();
    const touch = e.touches[0];
    const deltaX = touch.clientX - startX;
    const deltaY = touch.clientY - startY;
    
    if (!isDragging && (Math.abs(deltaX) > DRAG_THRESHOLD || Math.abs(deltaY) > DRAG_THRESHOLD)) {
        // Началось перетаскивание
        isDragging = true;
        moved = true;
        clearTimeout(holdTimer);
        clearTimeout(tapTimer);
        // При перетаскивании сразу включаем свечение (если ещё не включено)
        dom.waitingEye.classList.add('holding');
    }
    
    if (isDragging) {
        const newLeft = startLeft + deltaX;
        const newTop = startTop + deltaY;
        
        const maxLeft = window.innerWidth - dom.waitingEye.offsetWidth;
        const maxTop = window.innerHeight - dom.waitingEye.offsetHeight;
        const clampedLeft = Math.max(0, Math.min(newLeft, maxLeft));
        const clampedTop = Math.max(0, Math.min(newTop, maxTop));
        
        dom.waitingEye.style.left = clampedLeft + 'px';
        dom.waitingEye.style.top = clampedTop + 'px';
        dom.waitingEye.style.right = 'auto';
        dom.waitingEye.style.bottom = 'auto';
    }
}

function onTouchEnd(e) {
    e.preventDefault();
    dom.waitingEye.classList.remove('dragging');
    clearTimeout(holdTimer);
    clearTimeout(tapTimer);
    
    if (isDragging) {
        // Было перетаскивание — убираем свечение
        dom.waitingEye.classList.remove('holding');
        if (navigator.vibrate) navigator.vibrate(20);
    } else {
        // Не было перетаскивания — проверяем, был ли тап (уже мог сработать по таймеру)
        // Если таймер не сработал (отпустили очень быстро), то тапа не будет
        // Можно добавить мгновенную вспышку при очень коротком касании
        if (!moved) {
            // Если таймер ещё не успел добавить tapped, добавим сейчас
            if (!dom.waitingEye.classList.contains('tapped')) {
                dom.waitingEye.classList.add('tapped');
                setTimeout(() => dom.waitingEye.classList.remove('tapped'), 300);
            }
            // Убираем holding, если вдруг был (не должен быть)
            dom.waitingEye.classList.remove('holding');
        }
    }
    
    isDragging = false;
    moved = false;
}

function onTouchCancel(e) {
    dom.waitingEye.classList.remove('dragging', 'holding');
    clearTimeout(holdTimer);
    clearTimeout(tapTimer);
    isDragging = false;
    moved = false;
}

// ===== Мышиные события для десктопа (упрощённо) =====
function onMouseDown(e) {
    e.preventDefault();
    // При желании можно реализовать аналогично touch-событиям
}

// Инициализация
initEyeDrag();