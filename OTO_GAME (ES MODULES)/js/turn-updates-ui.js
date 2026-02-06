// Модуль: TURN UPDATES UI - Рендеринг блока "ИЗМЕНЕНИЯ ЗА ХОД"
'use strict';

import { State } from './3-state.js';
import { DOM } from './4-dom.js';

const dom = DOM.getDOM();

class TurnUpdatesUI {
    constructor() {
        this.container = null;
        this.initialized = false;
        this.lastTurnData = null;
    }
    
    initialize() {
        if (this.initialized) return;
        
        console.log('🎮 Инициализация TurnUpdatesUI...');
        
        // Находим или создаем контейнер
        const existingContainer = document.getElementById('turnUpdatesContainer');
        if (existingContainer) {
            this.container = existingContainer;
        } else {
            // Если контейнер не найден, создаем его в sceneArea
            const sceneArea = dom.sceneArea;
            if (sceneArea) {
                this.container = document.createElement('div');
                this.container.id = 'turnUpdatesContainer';
                this.container.style.cssText = 'margin-bottom: 10px;';
                // Вставляем после summary, но перед текстом сцены
                sceneArea.appendChild(this.container);
            }
        }
        
        // Подписываемся на события
        this.setupEventListeners();
        
        this.initialized = true;
        console.log('✅ TurnUpdatesUI инициализирован');
    }
    
    setupEventListeners() {
        State.on(State.EVENTS.TURN_COMPLETED, (data) => {
            console.log('🔄 TurnUpdatesUI: TURN_COMPLETED событие', data);
            this.renderFromState();
        });
        
        State.on(State.EVENTS.SCENE_CHANGED, (data) => {
            // При смене сцены очищаем старые изменения
            this.clear();
        });
        
        console.log('🔗 TurnUpdatesUI: подписки установлены');
    }
    
    renderFromState() {
        const state = State.getState();
        
        // Проверяем, есть ли данные для отображения
        if (!state.lastTurnUpdates || state.lastTurnUpdates.trim() === '') {
            this.clear();
            return;
        }
        
        // Проверяем, не отображали ли мы уже эти изменения
        if (this.lastTurnData === state.lastTurnUpdates) {
            console.log('⏭️ TurnUpdatesUI: изменения уже отображены, пропускаем');
            return;
        }
        
        this.container.innerHTML = state.lastTurnUpdates;
        this.container.style.display = 'block';
        this.lastTurnData = state.lastTurnUpdates;
        
        console.log('✅ TurnUpdatesUI: блок изменений отрендерен');
    }
    
    clear() {
        if (this.container) {
            this.container.innerHTML = '';
            this.container.style.display = 'none';
            this.lastTurnData = null;
        }
    }
    
    forceUpdate() {
        console.log('🔄 TurnUpdatesUI: принудительное обновление');
        this.renderFromState();
    }
}

// Создаем и экспортируем синглтон
const turnUpdatesUI = new TurnUpdatesUI();
export { turnUpdatesUI as TurnUpdatesUI };