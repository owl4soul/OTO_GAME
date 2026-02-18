// Файл: turn-updates-ui.js (ПОЛНАЯ ИСПРАВЛЕННАЯ ВЕРСИЯ)
// Модуль отображения блока "Изменения за ход". Теперь использует классы и не содержит инлайн-стилей.
// Вставляет готовый HTML из state.lastTurnUpdates, который генерируется в game.js с классами.
'use strict';

import { State } from './3-state.js';
import { DOM } from './4-dom.js';

const dom = DOM.getDOM();

class TurnUpdatesUI {
    constructor() {
        console.log('🔧 TurnUpdatesUI: конструктор');
        this.container = null;
        this.initialized = false;
    }
    
    initialize() {
        if (this.initialized) return;
        console.log('🎮 Инициализация TurnUpdatesUI...');
        this.ensureContainer();
        this.setupEventListeners();
        this.renderFromState();
        this.initialized = true;
        console.log('✅ TurnUpdatesUI готов');
    }
    
    ensureContainer() {
        this.container = document.getElementById('turnUpdatesContainer');
        if (!this.container) {
            console.error('❌ turnUpdatesContainer не найден, создаём аварийно');
            this.container = document.createElement('div');
            this.container.id = 'turnUpdatesContainer';
            this.container.className = 'turn-updates-container';
            const sceneArea = dom.sceneArea;
            if (sceneArea) {
                const sceneText = sceneArea.querySelector('.scene-text');
                if (sceneText) sceneArea.insertBefore(this.container, sceneText);
                else sceneArea.appendChild(this.container);
            }
        } else {
            this.container.classList.add('turn-updates-container');
        }
    }
    
    setupEventListeners() {
        State.on(State.EVENTS.TURN_COMPLETED, () => {
            this.ensureContainer();
            this.renderFromState();
        });
        State.on(State.EVENTS.SCENE_CHANGED, () => {
            setTimeout(() => {
                this.ensureContainer();
                this.renderFromState();
            }, 100);
        });
        State.on(State.EVENTS.HERO_CHANGED, (data) => {
            if (data.type === 'import' || data.type === 'reset') {
                setTimeout(() => {
                    this.ensureContainer();
                    this.renderFromState();
                }, 100);
            }
        });
    }
    
    /**
     * Рендерит блок изменений, используя lastTurnUpdates из состояния.
     * Ожидается, что lastTurnUpdates содержит готовый HTML с классами.
     */
    renderFromState() {
        try {
            const state = State.getState();
            if (!this.container) return;
            
            const content = state.lastTurnUpdates || '<div class="turn-update-empty">Ожидание хода...</div>';
            this.container.innerHTML = `
                <div class="turn-updates-header">
                    <i class="fas fa-exchange-alt"></i> ИЗМЕНЕНИЯ ЗА ПОСЛЕДНИЙ ХОД
                </div>
                ${content}
            `;
            this.scrollToUpdates();
            console.log('✅ TurnUpdatesUI: обновлён');
        } catch (e) {
            console.error('❌ Ошибка рендеринга TurnUpdatesUI:', e);
            if (this.container) {
                this.container.innerHTML = `
                    <div class="turn-updates-header">⚠️ Ошибка</div>
                    <div class="turn-update-event">Не удалось загрузить изменения</div>
                `;
            }
        }
    }
    
    scrollToUpdates() {
        if (!this.container) return;
        setTimeout(() => {
            if (this.container.offsetParent) {
                this.container.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        }, 300);
    }
    
    clear() {
        if (this.container) this.container.innerHTML = '';
    }
    
    forceUpdate() {
        this.renderFromState();
    }
    
    destroy() {
        this.clear();
        this.container = null;
        this.initialized = false;
    }
}

const turnUpdatesUI = new TurnUpdatesUI();
export { turnUpdatesUI as TurnUpdatesUI };