// Модуль 3: STATE - Управление состоянием игры (ФОРМАТ 4.1 - УНИФИЦИРОВАННАЯ СИСТЕМА GAME_ITEM)
'use strict';

import { CONFIG, aiModels } from './1-config.js';
import { Utils } from './2-utils.js';
import { Saveload } from './9-saveload.js';
import { PROMPTS } from './prompts.js';

// ========================
// КОНСТАНТЫ И ДЕФОЛТНЫЕ ЗНАЧЕНИЯ
// ========================

// Дефолтное состояние героя как массив GAME_ITEM
const DEFAULT_HERO_STATE = [
  // Обязательные статы (все 0-100)
  { "id": "stat:will", "value": 50 },
  { "id": "stat:sanity", "value": 50 },
  { "id": "stat:stealth", "value": 50 },
  { "id": "stat:influence", "value": 50 },
  
  // Прогресс и посвящение
  { "id": "progress:oto", "value": 0 },
  { "id": "initiation_degree:oto_0", "value": "0° — Минервал (кандидат)" },
  
  // Личность
  {
    "id": "personality:hero",
    "value": "Молодой Минервал, полный идеалов, но не испытанный тьмой. Ищет знание и силу в запрещённых учениях."
  }
];

// Дефолтное состояние игры (новая структура)
const DEFAULT_STATE = {
  version: '4.1.0',
  gameId: Utils.generateUniqueId(),
  lastSaveTime: new Date().toISOString(),
  turnCount: 0,
  
  // Состояние героя (УНИФИЦИРОВАННАЯ СИСТЕМА GAME_ITEM)
  heroState: [...DEFAULT_HERO_STATE],
  
  // Состояние игры
  gameState: {
    summary: "",
    history: [],
    aiMemory: {},
    currentScene: { ...PROMPTS.initialGameState },
    selectedActions: [],
  },
  
  // UI и настройки
  ui: {
    hTop: 50,
    hMid: 30,
    hBot: 20,
    wBotLeft: 50,
    isCollapsed: false,
    hBotBeforeCollapse: 20,
    isAutoCollapsed: false
  },
  
  // Настройки приложения
  settings: {
    apiProvider: 'openrouter',
    apiKeyOpenrouter: '',
    apiKeyVsegpt: '',
    model: 'openai/gpt-3.5-turbo-16k',
    scale: CONFIG.scaleSteps[CONFIG.defaultScaleIndex],
    scaleIndex: CONFIG.defaultScaleIndex
  },
  
  // Логи и аудит
  auditLog: [],
  
  // Статусы моделей
  models: [...aiModels],
  
  // Флаги состояния
  isRitualActive: false,
  ritualProgress: 0,
  ritualTarget: null,
  
  // Режимы ввода
  freeMode: false,
  freeModeText: '',
  
  // Хранение HTML-строки последних изменений за ход
  lastTurnUpdates: "",
  
  // Мысли героя
  thoughtsOfHero: [],
  
  // Активный запрос
  pendingRequest: null
};

// Глобальная переменная состояния
let state = null;

// ========================
// ИНИЦИАЛИЗАЦИЯ СОСТОЯНИЯ
// ========================

/**
 * Инициализация состояния игры
 */
function initializeState() {
  try {
    console.log('🔍 Инициализация состояния (формат 4.1)...');
    
    // 1. Начинаем с дефолтного состояния
    state = { ...DEFAULT_STATE };
    
    // 2. Пытаемся загрузить из localStorage
    const savedState = localStorage.getItem('oto_v4_state');
    
    if (savedState) {
      try {
        const parsed = JSON.parse(savedState);
        
        // Проверяем версию состояния
        if (parsed.version !== '4.1.0') {
          console.error('❌ Неподдерживаемая версия состояния:', parsed.version);
          throw new Error(`Неподдерживаемая версия состояния: ${parsed.version}. Требуется версия 4.1.0`);
        }
        
        // Безопасно мержим сохраненные данные с дефолтными
        for (const [key, defaultValue] of Object.entries(DEFAULT_STATE)) {
          if (parsed[key] !== undefined) {
            // Особые обработки для разных типов данных
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
        
        // Гарантируем наличие текущей сцены
        if (!state.gameState.currentScene || !state.gameState.currentScene.scene) {
          console.warn('⚠️ Восстановление: отсутствует currentScene, использую начальную сцену');
          
          state.gameState.currentScene = PROMPTS.initialGameState;
        }
        
        console.log('✅ Состояние загружено из localStorage (формат 4.1)');
        
      } catch (parseError) {
        console.error('❌ Ошибка парсинга сохраненного состояния:', parseError);
        // При ошибке парсинга используем дефолтное состояние
        state = { ...DEFAULT_STATE };
        state.gameId = Utils.generateUniqueId();
      }
    } else {
      console.log('🆕 Первый запуск, используем дефолтное состояние');
      state = { ...DEFAULT_STATE };
      state.gameId = Utils.generateUniqueId();
    }
    
    // 3. Проверяем смерть героя
    checkHeroDeath();
    
    // 4. Синхронизируем степень
    syncDegree();
    
    // 5. Применяем масштаб
    document.documentElement.style.setProperty('--scale-factor', state.settings.scale);
    document.documentElement.style.fontSize = `${state.settings.scale * 16}px`;
    
    console.log('✅ Состояние полностью инициализировано (формат 4.1)');
    console.log('   Game ID:', state.gameId);
    console.log('   Turn Count:', state.turnCount);
    console.log('   Hero Items:', state.heroState.length);
    console.log('   Current Scene:', state.gameState.currentScene ? 'Есть' : 'Нет');
    
  } catch (error) {
    console.error('❌ Критическая ошибка инициализации состояния:', error);
    // Аварийное восстановление: полный сброс к дефолту
    state = { ...DEFAULT_STATE };
    state.gameId = Utils.generateUniqueId();
    state.models = [...aiModels];
    
    // Пытаемся сохранить аварийное состояние
    try {
      localStorage.setItem('oto_v4_state', JSON.stringify(state));
    } catch (saveError) {
      console.error('❌ Не удалось сохранить аварийное состояние:', saveError);
    }
  }
}

/**
 * Проверка смерти героя (любой стат = 0)
 */
function checkHeroDeath() {
  const stats = state.heroState.filter(item => item.id.startsWith('stat:'));
  const deadStats = stats.filter(stat => stat.value <= 0);
  
  if (deadStats.length > 0) {
    console.warn('☠️ Герой мертв! Статы достигли 0:', deadStats.map(s => s.id));
  }
}

/**
 * Синхронизация степени посвящения с прогрессом
 */
function syncDegree() {
  const progressItem = state.heroState.find(item => item.id === 'progress:oto');
  const progress = progressItem ? progressItem.value : 0;
  
  let newDegreeIndex = 0;
  CONFIG.degrees.forEach((d, i) => {
    if (progress >= d.threshold) newDegreeIndex = i;
  });
  
  // Получаем текущую степень
  const currentDegreeItem = state.heroState.find(item => item.id.startsWith('initiation_degree:'));
  const currentDegreeIndex = currentDegreeItem ?
    parseInt(currentDegreeItem.id.split('_').pop()) || 0 : 0;
  
  // Если степень повысилась
  if (newDegreeIndex > currentDegreeIndex) {
    // Обновляем степень
    const newDegreeId = `initiation_degree:oto_${newDegreeIndex}`;
    const newDegreeValue = CONFIG.degrees[newDegreeIndex].name;
    
    // Удаляем старую степень и добавляем новую
    state.heroState = state.heroState.filter(item => !item.id.startsWith('initiation_degree:'));
    state.heroState.push({
      id: newDegreeId,
      value: newDegreeValue
    });
    
    // Бонус за новую степень (+1 ко всем статам)
    state.heroState = state.heroState.map(item => {
      if (item.id.startsWith('stat:')) {
        return { ...item, value: Math.min(100, item.value + 1) };
      }
      return item;
    });
    
    // Активируем ритуал
    state.isRitualActive = true;
    state.ritualProgress = 0;
    state.ritualTarget = newDegreeIndex;
    
    console.log(`🎓 Повышение степени: ${currentDegreeIndex} → ${newDegreeIndex}`);
  }
}

// ========================
// ОПЕРАЦИИ НАД GAME_ITEM
// ========================

/**
 * Применение операции ADD к состоянию героя
 */
function applyAddOperation(operation) {
  const { id, value, duration, description } = operation;
  
  // Проверяем, существует ли уже такой game_item
  const exists = state.heroState.some(item => item.id === id);
  if (exists) {
    console.warn(`⚠️ Game item ${id} уже существует, операция ADD пропущена`);
    return false;
  }
  
  // Создаем новый game_item
  const newItem = { id, value };
  
  // Добавляем дополнительные поля в зависимости от типа
  if (duration !== undefined) {
    newItem.duration = duration;
  }
  
  if (description !== undefined) {
    newItem.description = description;
  }
  
  state.heroState.push(newItem);
  return true;
}

/**
 * Применение операции REMOVE к состоянию героя
 */
function applyRemoveOperation(operation) {
  const { id } = operation;
  
  const initialLength = state.heroState.length;
  state.heroState = state.heroState.filter(item => item.id !== id);
  
  const removed = initialLength > state.heroState.length;
  if (removed) {
    console.log(`🗑️ Удален game_item: ${id}`);
  }
  
  return removed;
}

/**
 * Применение операции SET к состоянию героя
 */
function applySetOperation(operation) {
  const { id, value, description } = operation;
  
  const itemIndex = state.heroState.findIndex(item => item.id === id);
  if (itemIndex === -1) {
    console.warn(`⚠️ Game item ${id} не найден для операции SET`);
    return false;
  }
  
  // Обновляем значение
  state.heroState[itemIndex].value = value;
  
  // Обновляем описание, если предоставлено
  if (description !== undefined) {
    state.heroState[itemIndex].description = description;
  }
  
  return true;
}

/**
 * Применение операции MODIFY к состоянию героя
 */
function applyModifyOperation(operation) {
  const { id, delta } = operation;
  
  const itemIndex = state.heroState.findIndex(item => item.id === id);
  if (itemIndex === -1) {
    console.warn(`⚠️ Game item ${id} не найден для операции MODIFY`);
    return false;
  }
  
  const item = state.heroState[itemIndex];
  
  // Проверяем, что значение числовое
  if (typeof item.value !== 'number') {
    console.warn(`⚠️ Game item ${id} имеет нечисловое значение для операции MODIFY`);
    return false;
  }
  
  // Применяем дельту с ограничениями
  const newValue = item.value + delta;
  
  // Для статов ограничиваем 0-100
  if (item.id.startsWith('stat:')) {
    item.value = Math.max(0, Math.min(100, newValue));
  }
  // Для отношений ограничиваем -100 до 100
  else if (item.id.startsWith('relations:')) {
    item.value = Math.max(-100, Math.min(100, newValue));
  }
  // Для прогресса ограничиваем 0-100
  else if (item.id.startsWith('progress:')) {
    item.value = Math.max(0, Math.min(100, newValue));
  }
  // Для остальных просто применяем
  else {
    item.value = newValue;
  }
  
  return true;
}

/**
 * Применение массива операций к состоянию героя
 */
function applyOperations(operations) {
  if (!Array.isArray(operations)) return [];
  
  const results = [];
  
  operations.forEach(op => {
    try {
      let success = false;
      
      switch (op.operation) {
        case 'ADD':
          success = applyAddOperation(op);
          break;
        case 'REMOVE':
          success = applyRemoveOperation(op);
          break;
        case 'SET':
          success = applySetOperation(op);
          break;
        case 'MODIFY':
          success = applyModifyOperation(op);
          break;
        default:
          console.warn(`⚠️ Неизвестная операция: ${op.operation}`);
      }
      
      results.push({
        operation: op.operation,
        id: op.id,
        success,
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      console.error(`❌ Ошибка применения операции ${JSON.stringify(op)}:`, error);
      results.push({
        operation: op.operation,
        id: op.id,
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  });
  
  // Проверяем смерть героя после применения операций
  checkHeroDeath();
  
  // Сохраняем состояние
  Saveload.saveState();
  
  return results;
}

/**
 * Получение game_item по ID
 */
function getGameItem(id) {
  return state.heroState.find(item => item.id === id);
}

/**
 * Получение всех game_items определенного типа
 */
function getGameItemsByType(typePrefix) {
  return state.heroState.filter(item => item.id.startsWith(typePrefix));
}

/**
 * Проверка наличия game_item
 */
function hasGameItem(id) {
  return state.heroState.some(item => item.id === id);
}

/**
 * Получение значения game_item
 */
function getGameItemValue(id) {
  const item = getGameItem(id);
  return item ? item.value : null;
}

// ========================
// СБРОС И ПЕРЕЗАПУСК
// ========================

/**
 * Сброс только игрового прогресса (без настроек)
 */
function resetGameProgress() {
  if (confirm("[SOFT RESET] Сбросить прогресс текущей игры?")) {
    // Создаем новое состояние с сохранением настроек
    const currentSettings = state.settings;
    const currentUI = state.ui;
    const currentModels = state.models;
    const currentAuditLog = state.auditLog;
    
    // Сбрасываем heroState к дефолтному
    state.heroState = [...DEFAULT_HERO_STATE];
    
    // Сбрасываем gameState к начальной сцене
    state.gameState = {
      summary: "",
      history: [],
      aiMemory: {},
      currentScene: { ...PROMPTS.initialGameState.scene },
      selectedActions: [],
    };
    
    // Сохраняем настройки
    state.settings = currentSettings;
    state.ui = currentUI;
    state.models = currentModels;
    state.auditLog = currentAuditLog;
    
    // Сбрасываем счетчики и флаги
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
    
    // Синхронизируем степень
    syncDegree();
    
    // Сохраняем
    Saveload.saveState();
    
    // Перезагружаем страницу для полного обновления UI
    setTimeout(() => {
      location.reload();
    }, 100);
  }
}

/**
 * Полный сброс игры (включая настройки)
 */
function resetFullGame() {
  if (confirm("[HARD RESET] Сбросить ВСЮ игру, включая настройки?")) {
    // Полностью очищаем localStorage
    localStorage.clear();
    
    // Принудительно сбрасываем состояние в памяти
    state = null;
    
    // Перезагружаем страницу
    setTimeout(() => {
      location.reload();
    }, 100);
  }
}

// ========================
// ЭКСПОРТ/ИМПОРТ
// ========================

/**
 * Экспорт полного состояния игры
 */
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
  
  return exportData;
}

/**
 * Импорт полного состояния игры
 */
function importFullState(importData) {
  if (!importData || typeof importData !== 'object') {
    throw new Error('Некорректные данные импорта');
  }
  
  // Проверяем версию
  if (importData.version !== '4.1.0') {
    throw new Error(`Неподдерживаемая версия импорта: ${importData.version}. Требуется версия 4.1.0`);
  }
  
  // Импортируем heroState
  if (Array.isArray(importData.heroState)) {
    state.heroState = importData.heroState;
  }
  
  // Импортируем gameState
  if (importData.gameState && typeof importData.gameState === 'object') {
    state.gameState = { ...state.gameState, ...importData.gameState };
  }
  
  // Импортируем настройки (кроме API ключей)
  if (importData.settings && typeof importData.settings === 'object') {
    const currentApiKeys = {
      apiKeyOpenrouter: state.settings.apiKeyOpenrouter,
      apiKeyVsegpt: state.settings.apiKeyVsegpt
    };
    
    state.settings = { ...state.settings, ...importData.settings };
    state.settings.apiKeyOpenrouter = currentApiKeys.apiKeyOpenrouter;
    state.settings.apiKeyVsegpt = currentApiKeys.apiKeyVsegpt;
  }
  
  // Импортируем метаданные
  if (importData.gameId) state.gameId = importData.gameId;
  if (importData.exportTime) state.lastSaveTime = importData.exportTime;
  
  // Синхронизируем степень
  syncDegree();
  
  // Сохраняем
  Saveload.saveState();
  
  return true;
}

/**
 * Экспорт всех данных приложения (без API ключей)
 */
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

/**
 * Импорт всех данных приложения
 */
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
  
  // Импортируем настройки (кроме API ключей)
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
  
  // Импортируем модели
  if (importData.appData.models) {
    state.models = importData.appData.models;
  }
  
  // Импортируем аудит-логи
  if (importData.appData.auditLog) {
    state.auditLog = importData.appData.auditLog;
  }
  
  // Импортируем метаданные
  if (importData.appData.metadata) {
    state.gameId = importData.appData.metadata.gameId || state.gameId;
    state.lastSaveTime = importData.appData.metadata.lastSaveTime || state.lastSaveTime;
  }
  
  return true;
}

/**
 * Расчет общего времени игры
 */
function calculateTotalPlayTime() {
  const startTime = localStorage.getItem('oto_first_play_time');
  if (!startTime) return 0;
  
  const start = new Date(startTime);
  const now = new Date();
  return Math.floor((now - start) / 1000);
}

// Сохранение времени первого запуска
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

// Вызываем инициализацию при загрузке модуля
initializeState();

export const State = {
  // Получение и установка состояния
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
    
    // Сохраняем изменения в localStorage
    Saveload.saveState();
  },
  
  // UI функции
  getHBotBeforeCollapse: () => state.ui.hBotBeforeCollapse,
  setHBotBeforeCollapse: (value) => {
    state.ui.hBotBeforeCollapse = value;
    localStorage.setItem('oto_ui_pref', JSON.stringify(state.ui));
  },
  saveUiState: () => {
    localStorage.setItem('oto_ui_pref', JSON.stringify(state.ui));
  },
  
  // Операции с game_items
  applyOperations,
  getGameItem,
  getGameItemsByType,
  hasGameItem,
  getGameItemValue,
  
  // Синхронизация
  syncDegree,
  
  // Сброс и рестарт
  resetGameProgress,
  resetFullGame,
  
  // Экспорт/импорт
  exportFullState,
  importFullState,
  exportAllAppData,
  importAllAppData,
  
  // Мысли героя
  getHeroPhrase,
  addHeroPhrases,
  getHeroPhrasesCount,
  clearHeroPhrases,
  needsHeroPhrases,
  
  // Управление запросами
  setPendingRequest: (controller) => { state.pendingRequest = controller; },
  clearPendingRequest: () => { state.pendingRequest = null; },
  getPendingRequest: () => state.pendingRequest,
  
  // Счетчик ходов
  incrementTurnCount: () => {
    state.turnCount++;
    localStorage.setItem('oto_turn_count', state.turnCount.toString());
    return state.turnCount;
  },
  getTurnCount: () => state.turnCount,
  
  // Масштабирование UI
  updateScale: (newScaleIndex) => {
    newScaleIndex = Math.max(0, Math.min(CONFIG.scaleSteps.length - 1, newScaleIndex));
    
    state.settings.scaleIndex = newScaleIndex;
    state.settings.scale = CONFIG.scaleSteps[newScaleIndex];
    
    document.documentElement.style.setProperty('--scale-factor', state.settings.scale);
    document.documentElement.style.fontSize = `${state.settings.scale * 16}px`;
    
    localStorage.setItem('oto_scale', state.settings.scale.toString());
    localStorage.setItem('oto_scale_index', newScaleIndex.toString());
    return state.settings.scale;
  },
  getScaleIndex: () => state.settings.scaleIndex,
  
  // Аудит и логирование
  addAuditLogEntry: (entry) => {
    entry.timestamp = Utils.formatMoscowTime(new Date());
    state.auditLog.unshift(entry);
    
    if (state.auditLog.length > 100) {
      state.auditLog = state.auditLog.slice(0, 100);
    }
  },
  
  // Статистика моделей
  getModelStats: () => {
    const models = state.models || [];
    const total = models.length;
    const success = models.filter(m => m.status === 'success').length;
    const error = models.filter(m => m.status === 'error').length;
    const untested = total - success - error;
    
    return { total, success, error, untested };
  }
};