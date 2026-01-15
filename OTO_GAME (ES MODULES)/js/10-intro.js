// Модуль 10: INTRO - Интро-экраны и анимации (10-intro.js)
'use strict';

import { CONFIG } from './1-config.js';
import { Utils } from './2-utils.js';
import { State } from './3-state.js';
import { Init } from './11-init.js';

// Приватные переменные модуля
let animationFrameId = null;
let particles = [];
let introActive = true;
let introCanvas;
let introCtx;

/**
 * Создание частиц для интро-анимации
 */
function createParticles(count) {
    particles = [];
    for (let i = 0; i < count; i++) {
        particles.push({
            x: Math.random() * window.innerWidth,
            y: Math.random() * window.innerHeight,
            size: Math.random() * 3 + 1,
            speedX: (Math.random() - 0.5) * 2,
            speedY: (Math.random() - 0.5) * 2,
            opacity: Math.random() * 0.5 + 0.1,
            color: Math.random() > 0.5 ? '#8b0000' : '#400'
        });
    }
}

/**
 * Обновление и отрисовка частиц
 */
function updateParticles() {
    if (!introCtx || !introActive) return;
    
    // Очищаем с прозрачностью для эффекта шлейфа
    introCtx.fillStyle = 'rgba(0, 0, 0, 0.05)';
    introCtx.fillRect(0, 0, introCanvas.width, introCanvas.height);
    
    // Обновляем и рисуем каждую частицу
    particles.forEach(p => {
        // Движение
        p.x += p.speedX;
        p.y += p.speedY;
        
        // Отскок от границ
        if (p.x < 0 || p.x > introCanvas.width) p.speedX *= -1;
        if (p.y < 0 || p.y > introCanvas.height) p.speedY *= -1;
        
        // Мерцание
        p.opacity += (Math.random() - 0.5) * 0.02;
        p.opacity = Math.max(0.1, Math.min(0.6, p.opacity));
        
        // Рисование
        introCtx.beginPath();
        introCtx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        introCtx.fillStyle = p.color;
        introCtx.globalAlpha = p.opacity;
        introCtx.fill();
    });
    
    // Сброс прозрачности
    introCtx.globalAlpha = 1;
    
    // Сброс тени
    introCtx.shadowColor = 'transparent';
    introCtx.shadowBlur = 0;
    
    // Запуск следующего кадра
    animationFrameId = requestAnimationFrame(updateParticles);
}

/**
 * Запуск интро-анимации
 */
function startIntro() {
    introCanvas = document.getElementById('intro-canvas');
    if (!introCanvas) return;
    
    // Настройка canvas
    introCanvas.width = window.innerWidth;
    introCanvas.height = window.innerHeight;
    introCtx = introCanvas.getContext('2d');
    
    // Создание частиц
    createParticles(150);
    
    // Запуск анимации
    updateParticles();
    
    // Обработчик ресайза окна
    window.addEventListener('resize', handleIntroResize);
}

/**
 * Обработчик ресайза окна для интро
 */
function handleIntroResize() {
    if (!introCanvas || !introActive) return;
    
    introCanvas.width = window.innerWidth;
    introCanvas.height = window.innerHeight;
    createParticles(150); // Пересоздаем частицы для нового размера
}

/**
 * Инициализация интро-экрана
 */
function initIntro() {
    console.log("🎬 Инициализация интро...");
    startIntro();
    
    // Настройка кнопки "ОТКРЫТЬ"
    const openBtn = document.getElementById('intro-open-btn');
    if (openBtn) {
        openBtn.addEventListener('click', handleIntroOpen);
        
        // Также активируем по клавише Enter
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && introActive) {
                handleIntroOpen();
            }
        });
    }
}

/**
 * Обработчик нажатия кнопки "ОТКРЫТЬ"
 */
function handleIntroOpen() {
    if (!introActive) return;
    
    // Вибрация
    Utils.vibrate(CONFIG.vibrationPatterns.success);
    
    // Останавливаем анимацию
    stopIntro();
    
    // Вызываем глобальную функцию перехода к игре
    if (window.transitionToGame) {
        window.transitionToGame();
    } else {
        console.error("Функция transitionToGame не найдена!");
        // Fallback
        const introScreen = document.getElementById('intro-screen');
        const mainContainer = document.querySelector('.main-container');
        if (introScreen && mainContainer) {
            introScreen.style.display = 'none';
            mainContainer.style.display = 'flex';
            Init.init();
        }
    }
    
    // Добавляем запись в аудит-лог
    const auditEntry = {
        id: Date.now(),
        request: 'Запуск игры с интро-экрана',
        timestamp: Utils.formatMoscowTime(new Date()),
        status: 'success',
        fullResponse: 'Игра запущена'
    };
    
    State.addAuditLogEntry(auditEntry);
}

/**
 * Остановка интро-анимации
 */
function stopIntro() {
    introActive = false;
    
    // Останавливаем анимацию
    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
    }
    
    // Удаляем обработчики
    window.removeEventListener('resize', handleIntroResize);
    
    // Очищаем canvas
    if (introCtx) {
        introCtx.clearRect(0, 0, introCanvas.width, introCanvas.height);
    }
}

// Публичный интерфейс модуля
export const Intro = {
    initIntro: initIntro,
    startIntro: startIntro,
    stopIntro: stopIntro
};
