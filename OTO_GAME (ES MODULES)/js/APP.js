// Модуль 00: APP - Главная точка входа приложения (APP.js)
'use strict';

import { Intro } from './10-intro.js';
import { Init } from './11-init.js';
import { Render } from './5-render.js';
import { Saveload } from './9-saveload.js';
import { Game } from './6-game.js';
import { UI } from './ui.js';

console.log('🚀 O.T.O. QUEST загружается (ESM)...');

/**
 * Основная функция инициализации игры
 */
function initGame() {
    console.log("📦 Инициализация игры...");
    
    // Всегда запускаем интро
    console.log("🎬 Запускаем интро...");
    
    // Показываем интро экран, скрываем игру
    const introScreen = document.getElementById('intro-screen');
    const mainContainer = document.querySelector('.main-container');
    
    if (introScreen && mainContainer) {
        introScreen.style.display = 'flex';
        mainContainer.style.display = 'none';
        
        // Запускаем интро-анимацию
        Intro.initIntro();
    } else {
        console.error("Элементы интро или главного контейнера не найдены");
        // Если что-то пошло не так, показываем основную игру
        if (mainContainer) {
            mainContainer.style.display = 'flex';
            Init.init();
        }
    }
}

/**
 * Глобальная функция для перехода от интро к игре
 */
window.transitionToGame = function() {
    console.log("🎮 Переход от интро к игре...");
    
    // Скрываем интро
    const introScreen = document.getElementById('intro-screen');
    if (introScreen) {
        introScreen.style.opacity = '0';
        introScreen.style.transition = 'opacity 0.5s ease';
        
        setTimeout(() => {
            introScreen.style.display = 'none';
            
            // Показываем основной интерфейс
            const mainContainer = document.querySelector('.main-container');
            if (mainContainer) {
                mainContainer.style.display = 'flex';
                
                // Инициализируем игру
                Init.init();
                
                // Сохраняем, что интро было просмотрено
                localStorage.setItem('oto_intro_seen', 'true');
            }
        }, 500);
    }
};

/**
 * Обработка глобальных ошибок
 */
function setupErrorHandling() {
    window.addEventListener('error', (e) => {
        console.error('🔥 Глобальная ошибка:', e.error);
        
        const errorMsg = e.error ? e.error.message : 'Неизвестная ошибка';
        
        // Используем Render если он доступен
        if (Render && Render.showErrorAlert) {
            Render.showErrorAlert(
                "Критическая ошибка",
                `Произошла ошибка в приложении:\n\n${errorMsg}`,
                e.error
            );
        } else {
            // Fallback: просто показываем alert
            alert(`⚠️ Ошибка: ${errorMsg}\n\nПожалуйста, перезагрузите страницу.`);
        }
    });
    
    // Обработка promise rejections
    window.addEventListener('unhandledrejection', (e) => {
        console.error('🔥 Необработанный Promise rejection:', e.reason);
        
        if (Render && Render.showErrorAlert) {
            Render.showErrorAlert(
                "Ошибка Promise",
                `Необработанная ошибка Promise:\n\n${e.reason}`,
                e.reason
            );
        }
    });
}

/**
 * Настройка сохранения при закрытии вкладки
 */
function setupBeforeUnload() {
    window.addEventListener('beforeunload', () => {
        if (Saveload && Saveload.saveState) {
            Saveload.saveState();
        }
    });
}

/**
 * Регистрация Service Worker для PWA
 */
function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('/sw.js').catch(err => {
                console.log('ServiceWorker registration failed:', err);
            });
        });
    }
}

/**
 * Экспорт глобальных функций для доступа из HTML
 */
window.resetGame = function() {
    if (Game && Game.resetFullGame) {
        Game.resetFullGame();
    }
};

window.continueGame = function() {
    // В текущей версии continueFromEnd не реализован в Game, но заглушка есть
    if (Game && Game.continueFromEnd) {
        Game.continueFromEnd();
    } else {
        // Fallback
        const overlay = document.getElementById('endGameOverlay');
        if (overlay) overlay.style.display = 'none';
    }
};

// Инициализация при загрузке DOM
document.addEventListener('DOMContentLoaded', () => {
    console.log('📄 DOM загружен');
    
    // Настраиваем обработку ошибок
    setupErrorHandling();
    
    // Настраиваем сохранение при закрытии
    setupBeforeUnload();
    
    // Регистрируем Service Worker
    registerServiceWorker();
    
    // Запускаем игру
    initGame();
    
    window.onerror = (msg, url, line, col, err) => {
        UI.Logger.error('Global', { msg, url, line, col, stack: err?.stack });
    };
});

/**
// Если DOM уже загружен (например, при повторном вызове)
if (document.readyState === 'interactive' || document.readyState === 'complete') {
    setTimeout(initGame, 100);
}
*/
console.log('✅ Главный скрипт APP.js загружен');