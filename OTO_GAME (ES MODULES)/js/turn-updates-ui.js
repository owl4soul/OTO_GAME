// Модуль: TURN UPDATES UI - Рендеринг блока "ИЗМЕНЕНИЯ ЗА ХОД" (исправленная версия)
'use strict';

import { State } from './3-state.js';
import { DOM } from './4-dom.js';

const dom = DOM.getDOM();

class TurnUpdatesUI {
    constructor() {
        console.log('🔧 TurnUpdatesUI: конструктор вызван');
        this.container = null;
        this.initialized = false;
    }
    
    /**
     * Инициализация компонента
     */
    initialize() {
        if (this.initialized) {
            console.log('⚠️ TurnUpdatesUI уже инициализирован');
            return;
        }
        
        console.log('🎮 Инициализация TurnUpdatesUI...');
        
        // 1. Находим или создаем контейнер
        this.ensureContainer();
        
        // 2. Подписываемся на события
        this.setupEventListeners();
        
        // 3. Первоначальный рендеринг из состояния
        this.renderFromState();
        
        this.initialized = true;
        console.log('✅ TurnUpdatesUI инициализирован');
    }
    
    /**
     * Гарантирует наличие контейнера в DOM
     */
    ensureContainer() {
        // Контейнер ВСЕГДА создается в renderScene(), просто находим его
        this.container = document.getElementById('turnUpdatesContainer');
        
        if (!this.container) {
            console.error('❌ КРИТИЧЕСКАЯ ОШИБКА: turnUpdatesContainer не найден! Должен был быть создан в renderScene()');
            
            // Аварийное восстановление - создаем контейнер
            this.container = document.createElement('div');
            this.container.id = 'turnUpdatesContainer';
            this.container.style.cssText = 'margin-bottom: 10px;';
            
            const sceneArea = dom.sceneArea;
            if (sceneArea) {
                const sceneText = sceneArea.querySelector('.scene-text');
                if (sceneText) {
                    sceneArea.insertBefore(this.container, sceneText);
                    console.log('⚠️ Контейнер восстановлен экстренно перед sceneText');
                } else {
                    sceneArea.appendChild(this.container);
                    console.log('⚠️ Контейнер восстановлен экстренно в конец sceneArea');
                }
            } else {
                console.error('❌ Не найден sceneArea - невозможно создать контейнер!');
            }
        } else {
            console.log('✅ Контейнер turnUpdatesContainer найден в DOM');
        }
    }
    
    /**
     * Настраивает подписки на события
     */
    setupEventListeners() {
        console.log('🔗 Настройка подписок TurnUpdatesUI...');
        
        // Подписка на завершение хода (ОСНОВНОЕ событие)
        State.on(State.EVENTS.TURN_COMPLETED, (data) => {
            console.log('🎯 TurnUpdatesUI: TURN_COMPLETED событие получено', data);
            // Переинициализируем контейнер на всякий случай
            this.ensureContainer();
            this.renderFromState();
        });
        
        // Подписка на изменение сцены (контейнер мог быть пересоздан)
        State.on(State.EVENTS.SCENE_CHANGED, (data) => {
            console.log('🎯 TurnUpdatesUI: SCENE_CHANGED событие получено');
            // КРИТИЧЕСКИ ВАЖНО: После рендера сцены контейнер пересоздается!
            // Нужно переподключиться к нему
            setTimeout(() => {
                this.ensureContainer();
                this.renderFromState();
            }, 100);
        });
        
        // Подписка на изменение героя (на всякий случай)
        State.on(State.EVENTS.HERO_CHANGED, (data) => {
            // Обновляем только если есть специфические изменения
            if (data.type === 'import' || data.type === 'reset') {
                setTimeout(() => {
                    this.ensureContainer();
                    this.renderFromState();
                }, 100);
            }
        });
        
        console.log('✅ Подписки TurnUpdatesUI настроены');
    }
    
    /**
     * Рендерит блок изменений из состояния
     */
    renderFromState() {
        try {
            const state = State.getState();
            
            // Проверяем, что контейнер существует
            if (!this.container) {
                console.warn('⚠️ Контейнер не найден при рендере, переинициализируем...');
                this.ensureContainer();
                if (!this.container) {
                    console.error('❌ Не удалось создать контейнер');
                    return;
                }
            }
            
            // ВСЕГДА отображаем блок изменений, даже если данных нет
            const turnCount = state.turnCount;
            
            console.log(`🔄 TurnUpdatesUI: рендерим изменения. Текущий ход ${turnCount}`);
            
            // Проверяем, есть ли данные для отображения
            if (!state.lastTurnUpdates || state.lastTurnUpdates.trim() === '') {
                console.log('🔍 TurnUpdatesUI: нет данных lastTurnUpdates, отображаем заглушку');
                this.container.innerHTML = `
                    <div class="turn-updates-container" style="margin: 8px 0; padding: 10px; background: rgba(10, 0, 0, 0.7); border: 1px solid #4a0a0a; border-radius: 4px; font-size: 0.85em;">
                        <div style="color: #d4af37; font-weight: bold; font-size: 0.9em; margin-bottom: 8px; padding-bottom: 4px; border-bottom: 1px solid #4a0a0a; letter-spacing: 0.5px;">
                            <i class="fas fa-exchange-alt"></i> ИЗМЕНЕНИЯ ЗА ПОСЛЕДНИЙ ХОД
                        </div>
                        <div style="color: #888; font-style: italic; font-size: 0.85em; text-align: center; padding: 12px;">
                            Ожидание хода...
                        </div>
                    </div>
                `;
                this.container.style.display = 'block';
                return;
            }
            
            // Отображаем изменения
            this.container.innerHTML = state.lastTurnUpdates;
            this.container.style.display = 'block';
            
            // Автопрокрутка к блоку изменений (как требовалось в задании)
            this.scrollToUpdates();
            
            console.log('✅ TurnUpdatesUI: блок изменений отрендерен');
            
        } catch (error) {
            console.error('❌ Ошибка при рендеринге TurnUpdatesUI:', error);
            if (this.container) {
                this.container.innerHTML = `
                    <div style="color: #ff3838; padding: 5px; font-size: 0.85em;">
                        <i class="fas fa-exclamation-triangle"></i> Ошибка отображения изменений
                    </div>
                `;
                this.container.style.display = 'block';
            }
        }
    }
    
    /**
     * Прокручивает экран к блоку изменений
     */
    scrollToUpdates() {
        if (!this.container) return;
        
        try {
            // Плавная прокрутка к блоку изменений
            setTimeout(() => {
                if (this.container && this.container.offsetParent) {
                    this.container.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start'
                    });
                    console.log('📜 Автопрокрутка к блоку изменений');
                }
            }, 300);
        } catch (error) {
            console.warn('⚠️ Ошибка при автопрокрутке:', error);
        }
    }
    
    /**
     * Очищает блок изменений
     */
    clear() {
        if (this.container) {
            this.container.innerHTML = '';
            this.container.style.display = 'none';
            console.log('🧹 TurnUpdatesUI: блок очищен');
        }
    }
    
    /**
     * Принудительное обновление (для вызова из других модулей)
     */
    forceUpdate() {
        console.log('🔄 TurnUpdatesUI: принудительное обновление');
        this.renderFromState();
    }
    
    /**
     * Уничтожает компонент, очищает ресурсы
     */
    destroy() {
        // Отписываемся от событий
        // (нужно сохранить ссылки на обработчики, но в данной реализации проще переписать)
        
        // Очищаем контейнер
        this.clear();
        
        // Сбрасываем состояние
        this.container = null;
        this.initialized = false;
        
        console.log('🗑️ TurnUpdatesUI уничтожен');
    }
}

// Создаем и экспортируем синглтон
const turnUpdatesUI = new TurnUpdatesUI();
export { turnUpdatesUI as TurnUpdatesUI };