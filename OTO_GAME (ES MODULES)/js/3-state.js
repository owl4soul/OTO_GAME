// Модуль 3: STATE - Управление состоянием игры (ФОРМАТ 4.1 - УНИФИЦИРОВАННАЯ СИСТЕМА GAME_ITEM)
'use strict';

import { CONFIG, aiModels } from './1-config.js';
import { Utils } from './2-utils.js';
import { Saveload } from './9-saveload.js';
import { PROMPTS } from './prompts.js';

// ========================
// ПАТТЕРН OBSERVER (НАБЛЮДАТЕЛЬ)
// ========================

class StateObserver {
    constructor() {
        this.observers = new Map(); // eventName -> Set<callback>
    }

    /**
     * Подписаться на событие
     */
    subscribe(event, callback) {
        if (!this.observers.has(event)) {
            this.observers.set(event, new Set());
        }
        this.observers.get(event).add(callback);
        
        return () => this.unsubscribe(event, callback);
    }

    /**
     * Отписаться от события
     */
    unsubscribe(event, callback) {
        if (this.observers.has(event)) {
            this.observers.get(event).delete(callback);
        }
    }

    /**
     * Уведомить всех подписчиков события
     */
    notify(event, data = null) {
        if (this.observers.has(event)) {
            this.observers.get(event).forEach(callback => {
                try {
                    callback(data, event);
                } catch (error) {
                    console.error(`❌ Ошибка в обработчике события ${event}:`, error);
                }
            });
        }
    }

    /**
     * Удалить все подписки события
     */
    clear(event = null) {
        if (event) {
            this.observers.delete(event);
        } else {
            this.observers.clear();
        }
    }
}

// Создаем глобальный экземпляр наблюдателя
const stateObserver = new StateObserver();

// События состояния
const STATE_EVENTS = {
    INITIALIZED: 'state:initialized',
    LOADED: 'state:loaded',
    SAVED: 'state:saved',
    HERO_CHANGED: 'hero:changed',
    HERO_STATS_UPDATED: 'hero:stats:updated',
    HERO_ITEM_ADDED: 'hero:item:added',
    HERO_ITEM_REMOVED: 'hero:item:removed',
    HERO_ITEM_MODIFIED: 'hero:item:modified',
    SCENE_CHANGED: 'scene:changed',
    TURN_COMPLETED: 'turn:completed',
    CHOICES_CHANGED: 'choices:changed',
    HISTORY_UPDATED: 'history:updated',
    UI_STATE_CHANGED: 'ui:changed',
    SCALE_CHANGED: 'scale:changed',
    MODE_CHANGED: 'mode:changed',
    SETTINGS_CHANGED: 'settings:changed',
    MODEL_CHANGED: 'model:changed',
    RITUAL_STARTED: 'ritual:started',
    RITUAL_PROGRESS: 'ritual:progress',
    DEGREE_UPGRADED: 'degree:upgraded',
    STATE_EXPORTED: 'state:exported',
    STATE_IMPORTED: 'state:imported',
    HERO_DEATH: 'hero:death',
    VICTORY: 'victory',
    THOUGHTS_UPDATED: 'thoughts:updated'
};

// ========================
// КОНСТАНТЫ И ДЕФОЛТНЫЕ ЗНАЧЕНИЯ
// ========================

const DEFAULT_HERO_STATE = [
  { "id": "stat:will", "value": 50 },
  { "id": "stat:sanity", "value": 50 },
  { "id": "stat:stealth", "value": 50 },
  { "id": "stat:influence", "value": 50 },
  { "id": "progress:oto", "value": 0 },
  { "id": "initiation_degree:oto_0", "value": "0° — Минервал (кандидат)" },
  {
    "id": "personality:hero",
    "value": "Молодой Минервал, полный идеалов, но не испытанный тьмой. Ищет знание и силу в запрещённых учениях."
  }
];

const DEFAULT_STATE = {
  version: '4.1.0',
  gameId: Utils.generateUniqueId(),
  lastSaveTime: new Date().toISOString(),
  turnCount: 0,
  heroState: [...DEFAULT_HERO_STATE],
  gameState: {
    summary: "",
    history: [],
    aiMemory: {},
    currentScene: { ...PROMPTS.initialGameState },
    selectedActions: [],
  },
  ui: {
    hTop: 50,
    hMid: 30,
    hBot: 20,
    wBotLeft: 50,
    isCollapsed: false,
    hBotBeforeCollapse: 20,
    isAutoCollapsed: false
  },
  settings: {
    apiProvider: 'openrouter',
    apiKeyOpenrouter: '',
    apiKeyVsegpt: '',
    model: 'openai/gpt-3.5-turbo-16k',
    scale: CONFIG.scaleSteps[CONFIG.defaultScaleIndex],
    scaleIndex: CONFIG.defaultScaleIndex
  },
  auditLog: [],
  models: [...aiModels],
  isRitualActive: false,
  ritualProgress: 0,
  ritualTarget: null,
  freeMode: false,
  freeModeText: '',
  lastTurnUpdates: "",
  thoughtsOfHero: [],
  pendingRequest: null
};

let state = null;

// ========================
// ИНИЦИАЛИЗАЦИЯ СОСТОЯНИЯ
// ========================

function initializeState() {
  try {
    console.log('🔍 Инициализация состояния (формат 4.1)...');
    
    state = { ...DEFAULT_STATE };
    
    const savedState = localStorage.getItem('oto_v4_state');
    
    if (savedState) {
      try {
        const parsed = JSON.parse(savedState);
        
        if (parsed.version !== '4.1.0') {
          console.error('❌ Неподдерживаемая версия состояния:', parsed.version);
          throw new Error(`Неподдерживаемая версия состояния: ${parsed.version}. Требуется версия 4.1.0`);
        }
        
        for (const [key, defaultValue] of Object.entries(DEFAULT_STATE)) {
          if (parsed[key] !== undefined) {
            if (key === 'heroState' && Array.isArray(parsed[key])) {
              state.heroState = parsed[key];
            } else if (key === 'gameState' && typeof parsed[key] === 'object') {
              state.gameState = { ...defaultValue.gameState, ...parsed[key] };
            } else if (key === 'ui' && typeof parsed[key] === 'object') {
              state.ui = { ...defaultValue.ui, ...parsed[key] };
            } else if (key === 'settings' && typeof parsed[key] === 'object') {
              state.settings = { ...defaultValue.settings, ...parsed[key] };
            } else {
              state[key] = parsed[key];
            }
          }
        }
        
        if (!state.gameState.currentScene || !state.gameState.currentScene.scene) {
          console.warn('⚠️ Восстановление: отсутствует currentScene, использую начальную сцену');
          state.gameState.currentScene = { ...PROMPTS.initialGameState };
        }
        
        console.log('✅ Состояние загружено из localStorage (формат 4.1)');
        stateObserver.notify(STATE_EVENTS.LOADED, { gameId: state.gameId });
        
      } catch (parseError) {
        console.error('❌ Ошибка парсинга сохраненного состояния:', parseError);
        state = { ...DEFAULT_STATE };
        state.gameId = Utils.generateUniqueId();
      }
    } else {
      console.log('🆕 Первый запуск, используем дефолтное состояние');
      state = { ...DEFAULT_STATE };
      state.gameId = Utils.generateUniqueId();
    }
    
    checkHeroDeath();
    syncDegree();
    
    document.documentElement.style.setProperty('--scale-factor', state.settings.scale);
    document.documentElement.style.fontSize = `${state.settings.scale * 16}px`;
    
    console.log('✅ Состояние полностью инициализировано (формат 4.1)');
    stateObserver.notify(STATE_EVENTS.INITIALIZED, {
      gameId: state.gameId,
      turnCount: state.turnCount,
      heroItems: state.heroState.length
    });
    
  } catch (error) {
    console.error('❌ Критическая ошибка инициализации состояния:', error);
    state = { ...DEFAULT_STATE };
    state.gameId = Utils.generateUniqueId();
    state.models = [...aiModels];
    
    try {
      localStorage.setItem('oto_v4_state', JSON.stringify(state));
    } catch (saveError) {
      console.error('❌ Не удалось сохранить аварийное состояние:', saveError);
    }
  }
}

function checkHeroDeath() {
  const stats = state.heroState.filter(item => item.id.startsWith('stat:'));
  const deadStats = stats.filter(stat => stat.value <= 0);
  
  if (deadStats.length > 0) {
    console.warn('☠️ Герой мертв! Статы достигли 0:', deadStats.map(s => s.id));
    stateObserver.notify(STATE_EVENTS.HERO_DEATH, {
      deadStats: deadStats.map(s => s.id),
      heroState: state.heroState
    });
  }
}

function syncDegree() {
  const progressItem = state.heroState.find(item => item.id === 'progress:oto');
  const progress = progressItem ? progressItem.value : 0;
  
  let newDegreeIndex = 0;
  CONFIG.degrees.forEach((d, i) => {
    if (progress >= d.threshold) newDegreeIndex = i;
  });
  
  const currentDegreeItem = state.heroState.find(item => item.id.startsWith('initiation_degree:'));
  const currentDegreeIndex = currentDegreeItem ?
    parseInt(currentDegreeItem.id.split('_').pop()) || 0 : 0;
  
  if (newDegreeIndex > currentDegreeIndex) {
    const newDegreeId = `initiation_degree:oto_${newDegreeIndex}`;
    const newDegreeValue = CONFIG.degrees[newDegreeIndex].name;
    
    state.heroState = state.heroState.filter(item => !item.id.startsWith('initiation_degree:'));
    state.heroState.push({
      id: newDegreeId,
      value: newDegreeValue
    });
    
    state.heroState = state.heroState.map(item => {
      if (item.id.startsWith('stat:')) {
        return { ...item, value: Math.min(100, item.value + 1) };
      }
      return item;
    });
    
    state.isRitualActive = true;
    state.ritualProgress = 0;
    state.ritualTarget = newDegreeIndex;
    
    console.log(`🎓 Повышение степени: ${currentDegreeIndex} → ${newDegreeIndex}`);
    stateObserver.notify(STATE_EVENTS.DEGREE_UPGRADED, {
      oldDegree: currentDegreeIndex,
      newDegree: newDegreeIndex,
      degreeName: newDegreeValue
    });
  }
}

// ========================
// ОПЕРАЦИИ НАД GAME_ITEM
// ========================

function applyOperations(operations) {
    console.log('🔧 applyOperations called with:', operations);
    
    if (!Array.isArray(operations) || operations.length === 0) {
        console.log('⚠️ Нет операций для применения');
        return;
    }
    
    if (!Array.isArray(state.heroState)) {
        console.error('❌ heroState не является массивом');
        return;
    }
    
    let hasChanges = false;
    const operationResults = [];
    
    operations.forEach(operation => {
        if (!operation || !operation.id || !operation.operation) {
            console.warn('⚠️ Пропускаем некорректную операцию:', operation);
            return;
        }
        
        const existingIndex = state.heroState.findIndex(item => item && item.id === operation.id);
        
        try {
            let eventData = null;
            
            switch (operation.operation) {
                case 'ADD':
                    if (existingIndex === -1) {
                        const newItem = {
                            id: operation.id,
                            value: operation.value,
                            ...(operation.duration !== undefined && { duration: operation.duration }),
                            ...(operation.description && { description: operation.description })
                        };
                        state.heroState.push(newItem);
                        eventData = { id: operation.id, value: operation.value, operation: operation };
                        stateObserver.notify(STATE_EVENTS.HERO_ITEM_ADDED, eventData);
                        console.log(`➕ Добавлен: ${operation.id} = ${operation.value}`);
                        hasChanges = true;
                    }
                    break;
                    
                case 'REMOVE':
                    if (existingIndex !== -1) {
                        const removedItem = state.heroState[existingIndex];
                        state.heroState.splice(existingIndex, 1);
                        eventData = { id: operation.id, operation: operation };
                        stateObserver.notify(STATE_EVENTS.HERO_ITEM_REMOVED, eventData);
                        console.log(`➖ Удален: ${operation.id}`);
                        hasChanges = true;
                    }
                    break;
                    
                case 'SET':
                    if (existingIndex !== -1) {
                        const oldValue = state.heroState[existingIndex].value;
                        state.heroState[existingIndex].value = operation.value;
                        if (operation.description) {
                            state.heroState[existingIndex].description = operation.description;
                        }
                        eventData = { 
                            id: operation.id, 
                            oldValue: oldValue, 
                            newValue: operation.value, 
                            operation: operation 
                        };
                        stateObserver.notify(STATE_EVENTS.HERO_ITEM_MODIFIED, eventData);
                        console.log(`✏️ Установлен: ${operation.id} = ${operation.value}`);
                        hasChanges = true;
                    }
                    break;
                    
                case 'MODIFY':
                    if (existingIndex !== -1) {
                        const currentItem = state.heroState[existingIndex];
                        if (typeof currentItem.value === 'number') {
                            const oldValue = currentItem.value;
                            const newValue = operation.id.startsWith('stat:') 
                                ? Math.max(0, Math.min(100, oldValue + (operation.delta || 0)))
                                : oldValue + (operation.delta || 0);
                            
                            state.heroState[existingIndex].value = newValue;
                            
                            eventData = { 
                                id: operation.id, 
                                delta: operation.delta || 0,
                                oldValue: oldValue,
                                newValue: newValue,
                                operation: operation 
                            };
                            
                            if (operation.id.startsWith('stat:')) {
                                stateObserver.notify(STATE_EVENTS.HERO_STATS_UPDATED, eventData);
                            } else {
                                stateObserver.notify(STATE_EVENTS.HERO_ITEM_MODIFIED, eventData);
                            }
                            
                            console.log(`📊 Модифицирован: ${operation.id} ${oldValue} → ${newValue}`);
                            hasChanges = true;
                        }
                    }
                    break;
            }
            
            if (eventData) {
                operationResults.push(eventData);
            }
            
        } catch (error) {
            console.error(`❌ Ошибка при обработке операции ${JSON.stringify(operation)}:`, error);
        }
    });
    
    if (hasChanges) {
        processDurations();
        
        stateObserver.notify(STATE_EVENTS.HERO_CHANGED, {
            operations: operationResults,
            heroState: state.heroState
        });
        
        Saveload.saveState();
        console.log('✅ Состояние обновлено');
    } else {
        console.log('⚠️ Не было изменений для применения');
    }
}

function processDurations() {
    const buffs = state.heroState.filter(item => item.id.startsWith('buff:') || item.id.startsWith('debuff:'));
    
    buffs.forEach(buff => {
        if (buff.duration !== undefined) {
            buff.duration--;
            if (buff.duration <= 0) {
                const index = state.heroState.findIndex(item => item.id === buff.id);
                if (index !== -1) {
                    state.heroState.splice(index, 1);
                    stateObserver.notify(STATE_EVENTS.HERO_ITEM_REMOVED, { id: buff.id });
                    console.log(`🕐 Удален истекший: ${buff.id}`);
                }
            }
        }
    });
}

function getGameItem(id) {
    return state.heroState.find(item => item.id === id);
}

function getGameItemsByType(typePrefix) {
    return state.heroState.filter(item => item.id.startsWith(typePrefix));
}

function hasGameItem(id) {
    return state.heroState.some(item => item.id === id);
}

function getGameItemValue(id) {
    const item = getGameItem(id);
    return item ? item.value : null;
}

// ========================
// СБРОС И ПЕРЕЗАПУСК
// ========================

function resetGameProgress() {
  if (confirm("[SOFT RESET] Сбросить прогресс текущей игры?")) {
    const currentSettings = state.settings;
    const currentUI = state.ui;
    const currentModels = state.models;
    const currentAuditLog = state.auditLog;
    
    state.heroState = [...DEFAULT_HERO_STATE];
    state.gameState = {
      summary: "",
      history: [],
      aiMemory: {},
      currentScene: { ...PROMPTS.initialGameState },
      selectedActions: [],
    };
    state.settings = currentSettings;
    state.ui = currentUI;
    state.models = currentModels;
    state.auditLog = currentAuditLog;
    state.turnCount = 0;
    state.isRitualActive = false;
    state.ritualProgress = 0;
    state.ritualTarget = null;
    state.freeMode = false;
    state.freeModeText = '';
    state.lastTurnUpdates = "";
    state.thoughtsOfHero = [];
    state.gameId = Utils.generateUniqueId();
    state.lastSaveTime = new Date().toISOString();
    
    syncDegree();
    
    stateObserver.notify(STATE_EVENTS.HERO_CHANGED, { type: 'reset', heroState: state.heroState });
    stateObserver.notify(STATE_EVENTS.SCENE_CHANGED, { scene: state.gameState.currentScene });
    
    Saveload.saveState();
    
    setTimeout(() => {
      location.reload();
    }, 100);
  }
}

function resetFullGame() {
  if (confirm("[HARD RESET] Сбросить ВСЮ игру, включая настройки?")) {
    localStorage.clear();
    state = null;
    setTimeout(() => {
      location.reload();
    }, 100);
  }
}

// ========================
// ЭКСПОРТ/ИМПОРТ
// ========================

function exportFullState() {
  const exportData = {
    version: '4.1.0',
    gameId: state.gameId,
    exportTime: new Date().toISOString(),
    heroState: [...state.heroState],
    gameState: { ...state.gameState },
    settings: { ...state.settings },
    auditLog: [...state.auditLog],
    models: [...state.models],
    metadata: {
      turnCount: state.turnCount,
      lastSaveTime: state.lastSaveTime,
      totalPlayTime: calculateTotalPlayTime(),
      totalChoices: state.gameState.history.length
    }
  };
  
  stateObserver.notify(STATE_EVENTS.STATE_EXPORTED, { data: exportData });
  return exportData;
}

function importFullState(importData) {
  if (!importData || typeof importData !== 'object') {
    throw new Error('Некорректные данные импорта');
  }
  
  if (importData.version !== '4.1.0') {
    throw new Error(`Неподдерживаемая версия импорта: ${importData.version}. Требуется версия 4.1.0`);
  }
  
  if (Array.isArray(importData.heroState)) {
    state.heroState = importData.heroState;
  }
  
  if (importData.gameState && typeof importData.gameState === 'object') {
    state.gameState = { ...state.gameState, ...importData.gameState };
  }
  
  if (importData.settings && typeof importData.settings === 'object') {
    const currentApiKeys = {
      apiKeyOpenrouter: state.settings.apiKeyOpenrouter,
      apiKeyVsegpt: state.settings.apiKeyVsegpt
    };
    
    state.settings = { ...state.settings, ...importData.settings };
    state.settings.apiKeyOpenrouter = currentApiKeys.apiKeyOpenrouter;
    state.settings.apiKeyVsegpt = currentApiKeys.apiKeyVsegpt;
  }
  
  if (importData.gameId) state.gameId = importData.gameId;
  if (importData.exportTime) state.lastSaveTime = importData.exportTime;
  
  syncDegree();
  
  stateObserver.notify(STATE_EVENTS.STATE_IMPORTED, { data: importData });
  stateObserver.notify(STATE_EVENTS.HERO_CHANGED, { type: 'import', heroState: state.heroState });
  stateObserver.notify(STATE_EVENTS.SCENE_CHANGED, { scene: state.gameState.currentScene });
  
  Saveload.saveState();
  
  return true;
}

function exportAllAppData() {
  const exportData = {
    version: '4.1.0',
    exportTime: new Date().toISOString(),
    appData: {
      settings: {
        apiProvider: state.settings.apiProvider,
        model: state.settings.model,
        scale: state.settings.scale,
        scaleIndex: state.settings.scaleIndex
      },
      models: [...state.models],
      auditLog: [...state.auditLog],
      metadata: {
        gameId: state.gameId,
        lastSaveTime: state.lastSaveTime,
        totalPlayTime: calculateTotalPlayTime()
      }
    }
  };
  
  return exportData;
}

function importAllAppData(importData) {
  if (!importData || typeof importData !== 'object') {
    throw new Error('Некорректные данные импорта');
  }
  
  if (importData.version !== '4.1.0') {
    throw new Error(`Неподдерживаемая версия импорта: ${importData.version}. Требуется версия 4.1.0`);
  }
  
  if (!importData.appData) {
    throw new Error('Отсутствуют данные приложения');
  }
  
  if (importData.appData.settings) {
    const currentApiKeys = {
      apiKeyOpenrouter: state.settings.apiKeyOpenrouter,
      apiKeyVsegpt: state.settings.apiKeyVsegpt
    };
    
    state.settings.apiProvider = importData.appData.settings.apiProvider || state.settings.apiProvider;
    state.settings.model = importData.appData.settings.model || state.settings.model;
    state.settings.scale = importData.appData.settings.scale || state.settings.scale;
    state.settings.scaleIndex = importData.appData.settings.scaleIndex || state.settings.scaleIndex;
    
    state.settings.apiKeyOpenrouter = currentApiKeys.apiKeyOpenrouter;
    state.settings.apiKeyVsegpt = currentApiKeys.apiKeyVsegpt;
  }
  
  if (importData.appData.models) {
    state.models = importData.appData.models;
  }
  
  if (importData.appData.auditLog) {
    state.auditLog = importData.appData.auditLog;
  }
  
  if (importData.appData.metadata) {
    state.gameId = importData.appData.metadata.gameId || state.gameId;
    state.lastSaveTime = importData.appData.metadata.lastSaveTime || state.lastSaveTime;
  }
  
  stateObserver.notify(STATE_EVENTS.SETTINGS_CHANGED);
  stateObserver.notify(STATE_EVENTS.MODEL_CHANGED);
  
  return true;
}

function calculateTotalPlayTime() {
  const startTime = localStorage.getItem('oto_first_play_time');
  if (!startTime) return 0;
  
  const start = new Date(startTime);
  const now = new Date();
  return Math.floor((now - start) / 1000);
}

if (!localStorage.getItem('oto_first_play_time')) {
  localStorage.setItem('oto_first_play_time', new Date().toISOString());
}

// ========================
// ФУНКЦИИ ДЛЯ УПРАВЛЕНИЯ МЫСЛЯМИ ГЕРОЯ
// ========================

function getHeroPhrase() {
  if (state.thoughtsOfHero.length > 0) {
    return state.thoughtsOfHero.shift();
  }
  return null;
}

function addHeroPhrases(phrases) {
  if (Array.isArray(phrases)) {
    state.thoughtsOfHero = state.thoughtsOfHero.concat(phrases);
    localStorage.setItem('oto_thoughts_of_hero', JSON.stringify(state.thoughtsOfHero));
    stateObserver.notify(STATE_EVENTS.THOUGHTS_UPDATED, { thoughts: phrases });
  }
}

function getHeroPhrasesCount() {
  return state.thoughtsOfHero.length;
}

function clearHeroPhrases() {
  state.thoughtsOfHero = [];
  localStorage.removeItem('oto_thoughts_of_hero');
}

function needsHeroPhrases() {
  return state.thoughtsOfHero.length === 0;
}

// ========================
// ПУБЛИЧНЫЙ ИНТЕРФЕЙС
// ========================

initializeState();

export const State = {
  getState: () => {
    if (!state || typeof state !== 'object') {
      console.error('❌ State is corrupted! Reinitializing...');
      initializeState();
    }
    return state;
  },
  
  setState: (newState) => {
    if (!state) {
      console.error('⚠️ Cannot setState on undefined state');
      initializeState();
    }
    state = { ...state, ...newState };
    Saveload.saveState();
  },
  
  getHBotBeforeCollapse: () => state.ui.hBotBeforeCollapse,
  setHBotBeforeCollapse: (value) => {
    state.ui.hBotBeforeCollapse = value;
    localStorage.setItem('oto_ui_pref', JSON.stringify(state.ui));
  },
  saveUiState: () => {
    localStorage.setItem('oto_ui_pref', JSON.stringify(state.ui));
  },
  
  applyOperations,
  getGameItem,
  getGameItemsByType,
  hasGameItem,
  getGameItemValue,
  
  syncDegree,
  
  resetGameProgress,
  resetFullGame,
  
  exportFullState,
  importFullState,
  exportAllAppData,
  importAllAppData,
  
  getHeroPhrase,
  addHeroPhrases,
  getHeroPhrasesCount,
  clearHeroPhrases,
  needsHeroPhrases,
  
  setPendingRequest: (controller) => { state.pendingRequest = controller; },
  clearPendingRequest: () => { state.pendingRequest = null; },
  getPendingRequest: () => state.pendingRequest,
  
  incrementTurnCount: () => {
    state.turnCount++;
    localStorage.setItem('oto_turn_count', state.turnCount.toString());
    return state.turnCount;
  },
  getTurnCount: () => state.turnCount,
  
  updateScale: (newScaleIndex) => {
    newScaleIndex = Math.max(0, Math.min(CONFIG.scaleSteps.length - 1, newScaleIndex));
    
    state.settings.scaleIndex = newScaleIndex;
    state.settings.scale = CONFIG.scaleSteps[newScaleIndex];
    
    document.documentElement.style.setProperty('--scale-factor', state.settings.scale);
    document.documentElement.style.fontSize = `${state.settings.scale * 16}px`;
    
    localStorage.setItem('oto_scale', state.settings.scale.toString());
    localStorage.setItem('oto_scale_index', newScaleIndex.toString());
    
    stateObserver.notify(STATE_EVENTS.SCALE_CHANGED, {
      scaleIndex: newScaleIndex,
      scale: state.settings.scale
    });
    
    return state.settings.scale;
  },
  getScaleIndex: () => state.settings.scaleIndex,
  
  addAuditLogEntry: (entry) => {
    entry.timestamp = Utils.formatMoscowTime(new Date());
    state.auditLog.unshift(entry);
    
    if (state.auditLog.length > 100) {
      state.auditLog = state.auditLog.slice(0, 100);
    }
  },
  
  getModelStats: () => {
    const models = state.models || [];
    const total = models.length;
    const success = models.filter(m => m.status === 'success').length;
    const error = models.filter(m => m.status === 'error').length;
    const untested = total - success - error;
    
    return { total, success, error, untested };
  },
  
  // Observer API
  on: (event, callback) => stateObserver.subscribe(event, callback),
  off: (event, callback) => stateObserver.unsubscribe(event, callback),
  once: (event, callback) => {
    const unsubscribe = stateObserver.subscribe(event, (...args) => {
      unsubscribe();
      callback(...args);
    });
    return unsubscribe;
  },
  emit: (event, data) => stateObserver.notify(event, data),
  
  onHeroChange: (callback) => stateObserver.subscribe(STATE_EVENTS.HERO_CHANGED, callback),
  onSceneChange: (callback) => stateObserver.subscribe(STATE_EVENTS.SCENE_CHANGED, callback),
  onTurnComplete: (callback) => stateObserver.subscribe(STATE_EVENTS.TURN_COMPLETED, callback),
  onSettingsChange: (callback) => stateObserver.subscribe(STATE_EVENTS.SETTINGS_CHANGED, callback),
  
  EVENTS: STATE_EVENTS
};