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
          console.error(`❌ Ошибка в обработчике события ${event}:`, error.message);
          console.error('Тип ошибки:', error.name);
          console.error('Данные события:', data);
          console.error('Стек ошибки:', error.stack);
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
  THOUGHTS_UPDATED: 'thoughts:updated',
  GAME_TYPE_CHANGED: 'game:type:changed',
  ORGANIZATION_JOINED: 'organization:joined',
  ORGANIZATION_RANK_CHANGED: 'organization:rank:changed',
  ORGANIZATION_LEFT: 'organization:left',
  ORGANIZATION_HIERARCHY_UPDATED: 'organization:hierarchy:updated'
};

// ========================
// КОНСТАНТЫ И ДЕФОЛТНЫЕ ЗНАЧЕНИЯ
// ========================

const DEFAULT_HERO_STATE = [
  { "id": "stat:will", "value": 50 },
  { "id": "stat:sanity", "value": 50 },
  { "id": "stat:stealth", "value": 50 },
  { "id": "stat:influence", "value": 50 },
  { "id": "progress:level", "value": 0 },
  {
    "id": "organization_rank:oto",
    "value": 0,
    "description": "0° — Минервал (кандидат)"
  },
  {
    "id": "personality:hero",
    "value": "Молодой искатель приключений, полный энтузиазма."
  }
];

const DEFAULT_STATE = {
  version: '4.1.0',
  gameId: Utils.generateUniqueId(),
  lastSaveTime: new Date().toISOString(),
  turnCount: 1,
  gameType: 'standard', // 'standard' или 'custom'
  heroState: [...DEFAULT_HERO_STATE],
  gameState: {
    summary: "",
    history: [],
    aiMemory: {},
    currentScene: { ...PROMPTS.standardGameOTO.initialGameState },
    selectedActions: [],
    organizationsHierarchy: {} // Хранит иерархии всех организаций
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
    apiProvider: 'vsegpt',
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
  lastTurnStatChanges: null,
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
          console.warn('Версия состояния памяти не совпадает с версией приложения (4.1.0):', parsed.version);
        }
        
        for (const [key, defaultValue] of Object.entries(DEFAULT_STATE)) {
          if (parsed[key] !== undefined) {
            if (key === 'heroState' && Array.isArray(parsed[key])) {
              state.heroState = parsed[key];
            } else if (key === 'gameState' && typeof parsed[key] === 'object') {
              state.gameState = { ...defaultValue.gameState, ...parsed[key] };
              
              // Проверяем наличие organizationsHierarchy
              if (!state.gameState.organizationsHierarchy) {
                state.gameState.organizationsHierarchy = {};
              }
            } else if (key === 'ui' && typeof parsed[key] === 'object') {
              state.ui = { ...defaultValue.ui, ...parsed[key] };
            } else if (key === 'settings' && typeof parsed[key] === 'object') {
              state.settings = { ...defaultValue.settings, ...parsed[key] };
            } else {
              state[key] = parsed[key];
            }
          }
        }
        
        // Восстанавливаем gameType, если есть
        if (parsed.gameType) {
          state.gameType = parsed.gameType;
        }
        
        // Проверяем currentScene
        if (!state.gameState.currentScene || !state.gameState.currentScene.scene) {
          console.warn('⚠️ Восстановление: отсутствует currentScene, использую начальную сцену');
          state.gameState.currentScene = state.gameType === 'standard' ?
            { ...PROMPTS.standardGameOTO.initialGameState } :
            { scene: "Сцена не загружена", choices: [], aiMemory: {}, gameType: 'custom' };
        }
        
        // После загрузки состояния
        console.log('✅ Состояние загружено из localStorage (формат 4.1)');
        stateObserver.notify(STATE_EVENTS.LOADED, {
          gameId: state.gameId,
          gameType: state.gameType
        });
        
        // Добавляем начальную сцену в историю, если история пуста
        if (state.gameState.history.length === 0 && state.gameState.currentScene) {
          state.gameState.history.push({
            fullText: state.gameState.currentScene.text || state.gameState.currentScene.scene,
            choice: "Начало игры",
            changes: "Новая игра",
            turn: 1
          });
          state.turnCount = 1;
          console.log('✅ Начальная сцена добавлена в историю как ход #1');
        }
        
        // Инициализируем иерархии организаций
        initializeOrganizationHierarchies();
        
      } catch (parseError) {
        console.error('❌ Ошибка парсинга сохраненного состояния:', parseError);
        state = { ...DEFAULT_STATE };
        state.gameId = Utils.generateUniqueId();
        initializeOrganizationHierarchies();
      }
    } else {
      console.log('🆕 Первый запуск, используем дефолтное состояние');
      state = { ...DEFAULT_STATE };
      state.gameId = Utils.generateUniqueId();
      initializeOrganizationHierarchies();
    }
    
    checkHeroDeath();
    if (state.gameType === 'standard') {
      syncOrganizationRank();
    }
    
    document.documentElement.style.setProperty('--scale-factor', state.settings.scale);
    document.documentElement.style.fontSize = `${state.settings.scale * 16}px`;
    
    console.log('✅ Состояние полностью инициализировано (формат 4.1)');
    stateObserver.notify(STATE_EVENTS.INITIALIZED, {
      gameId: state.gameId,
      turnCount: state.turnCount,
      heroItems: state.heroState.length,
      gameType: state.gameType,
      organizations: Object.keys(state.gameState.organizationsHierarchy).length
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

/**
 * Инициализирует иерархии организаций из начальной сцены
 */
function initializeOrganizationHierarchies() {
  try {
    console.log('🏛️ Инициализация иерархий организаций...');
    
    // Получаем иерархию О.Т.О. из начальной сцены стандартной игры
    const initialScene = PROMPTS.standardGameOTO.initialGameState;
    
    // Ищем organization_rank_hierarchy в начальной сцене
    if (initialScene['organization_rank_hierarchy:oto']) {
      state.gameState.organizationsHierarchy['oto'] = initialScene['organization_rank_hierarchy:oto'];
      console.log('✅ Иерархия О.Т.О. инициализирована');
    }
    
    // Проверяем текущие иерархии в состоянии (из сохраненной игры)
    const orgIds = Object.keys(state.gameState.organizationsHierarchy);
    if (orgIds.length > 0) {
      console.log(`✅ Загружено иерархий организаций: ${orgIds.join(', ')}`);
    } else {
      console.log('ℹ️ Нет сохраненных иерархий организаций');
    }
    
  } catch (error) {
    console.error('❌ Ошибка инициализации иерархий организаций:', error);
  }
}

/**
 * Получает иерархию организации по ID
 */
function getOrganizationHierarchy(orgId) {
  return state.gameState.organizationsHierarchy[orgId];
}

/**
 * Получает все иерархии организаций, в которых состоит игрок
 */
function getHeroOrganizationHierarchies() {
  const hierarchies = {};
  
  // Получаем все organization_rank у героя
  const orgRanks = state.heroState.filter(item => item.id.startsWith('organization_rank:'));
  
  orgRanks.forEach(rankItem => {
    const orgId = rankItem.id.split(':')[1];
    const hierarchy = state.gameState.organizationsHierarchy[orgId];
    if (hierarchy) {
      hierarchies[orgId] = hierarchy;
    }
  });
  
  return hierarchies;
}

/**
 * Сохраняет иерархию организации
 */
function setOrganizationHierarchy(orgId, hierarchy) {
  if (hierarchy && typeof hierarchy === 'object') {
    state.gameState.organizationsHierarchy[orgId] = hierarchy;
    console.log(`✅ Иерархия организации ${orgId} сохранена`);
    
    // Обновляем описание ранга, если игрок состоит в этой организации
    const rankItem = state.heroState.find(item => item.id === `organization_rank:${orgId}`);
    if (rankItem && hierarchy.description) {
      const rankInfo = hierarchy.description.find(item => item.lvl === rankItem.value);
      if (rankInfo) {
        rankItem.description = rankInfo.rank;
      }
    }
    
    stateObserver.notify(STATE_EVENTS.ORGANIZATION_HIERARCHY_UPDATED, {
      organization: orgId,
      hierarchy: hierarchy
    });
    
    return true;
  }
  return false;
}

/**
 * Получает название ранга организации
 */
function getOrganizationRankName(orgId, rankValue) {
  const hierarchy = getOrganizationHierarchy(orgId);
  if (hierarchy && hierarchy.description && Array.isArray(hierarchy.description)) {
    const rankInfo = hierarchy.description.find(item => item.lvl === rankValue);
    return rankInfo ? rankInfo.rank : `Ранг ${rankValue}`;
  }
  return `Ранг ${rankValue}`;
}

/**
 * Получает список организаций, в которых состоит герой
 */
function getHeroOrganizations() {
  const orgRanks = state.heroState.filter(item => item.id.startsWith('organization_rank:'));
  return orgRanks.map(rankItem => {
    const orgId = rankItem.id.split(':')[1];
    const hierarchy = getOrganizationHierarchy(orgId);
    const rankName = getOrganizationRankName(orgId, rankItem.value);
    
    return {
      id: orgId,
      rank: rankItem.value,
      rankName: rankName,
      description: rankItem.description || rankName,
      hierarchy: hierarchy
    };
  });
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

/**
 * Синхронизирует ранг в организации с прогрессом (только для стандартной игры О.Т.О.)
 */
function syncOrganizationRank() {
  // Только для стандартной игры О.Т.О.
  if (state.gameType !== 'standard') return;
  
  const progressItem = state.heroState.find(item => item.id === 'progress:level');
  const progress = progressItem ? progressItem.value : 0;
  
  const orgRankItem = state.heroState.find(item => item.id === 'organization_rank:oto');
  if (!orgRankItem) {
    console.warn('⚠️ Нет organization_rank:oto для синхронизации');
    return;
  }
  
  const currentRank = orgRankItem.value;
  const hierarchy = getOrganizationHierarchy('oto');
  
  if (!hierarchy || !hierarchy.description) {
    console.warn('⚠️ Нет иерархии О.Т.О. для синхронизации');
    return;
  }
  
  // Находим максимальный доступный ранг по прогрессу
  let newRank = 0;
  for (const rankInfo of hierarchy.description) {
    const threshold = rankInfo.threshold || (rankInfo.lvl * 10);
    if (progress >= threshold) {
      newRank = rankInfo.lvl;
    }
  }
  
  if (newRank > currentRank) {
    const oldRankName = orgRankItem.description;
    const newRankName = getOrganizationRankName('oto', newRank);
    
    // Обновляем ранг
    orgRankItem.value = newRank;
    orgRankItem.description = newRankName;
    
    // Добавляем временный бафф ко всем статам
    state.heroState = state.heroState.map(item => {
      if (item.id.startsWith('stat:')) {
        return {
          ...item,
          value: Math.min(100, item.value + 5) // Бонус при повышении
        };
      }
      return item;
    });
    
    state.isRitualActive = true;
    state.ritualProgress = 0;
    state.ritualTarget = newRank;
    
    console.log(`🎓 Повышение ранга в О.Т.О.: ${oldRankName} (${currentRank}) → ${newRankName} (${newRank})`);
    
    stateObserver.notify(STATE_EVENTS.DEGREE_UPGRADED, {
      organization: 'oto',
      oldRank: currentRank,
      newRank: newRank,
      oldRankName: oldRankName,
      newRankName: newRankName
    });
    
    stateObserver.notify(STATE_EVENTS.ORGANIZATION_RANK_CHANGED, {
      organization: 'oto',
      oldRank: currentRank,
      newRank: newRank,
      rankName: newRankName
    });
  }
}

// ========================
// ОПЕРАЦИИ НАД GAME_ITEM (обновленные для организаций)
// ========================

/**
 * УЛУЧШЕННАЯ ФУНКЦИЯ: Применение операций к heroState
 * СТРОГОЕ ПРАВИЛО: Пустые значения НИКОГДА не перезаписывают имеющиеся значения
 */
function applyOperations(operations) {
  if (!Array.isArray(operations) || operations.length === 0) {
    console.log('⚠️ Нет операций для применения');
    return {
      applied: [],
      failed: [],
      changes: 'Нет явных изменений'
    };
  }
  
  const appliedOps = [];
  const failedOps = [];
  const changeLog = [];
  
  operations.forEach((op, idx) => {
    try {
      if (!op || typeof op !== 'object') {
        console.warn(`⚠️ Операция ${idx}: Некорректный объект, пропускаем`);
        failedOps.push({ op, reason: 'Некорректный объект' });
        return;
      }
      
      const { operation, id } = op;
      
      if (!operation || !id) {
        console.warn(`⚠️ Операция ${idx}: Отсутствуют обязательные поля operation/id`);
        failedOps.push({ op, reason: 'Отсутствуют обязательные поля' });
        return;
      }
      
      // Специальная обработка для organization_rank
      if (id.startsWith('organization_rank:')) {
        handleOrganizationRankOperation(op, idx, appliedOps, failedOps, changeLog);
        return;
      }
      
      // Остальные типы game_items обрабатываем как обычно
      const findItem = (itemId) => state.heroState.find(item => item.id === itemId);
      const removeItem = (itemId) => {
        const index = state.heroState.findIndex(item => item.id === itemId);
        if (index !== -1) {
          state.heroState.splice(index, 1);
          return true;
        }
        return false;
      };
      
      // ==================================================================
      // ОПЕРАЦИЯ: ADD
      // ==================================================================
      if (operation === 'ADD') {
        if (op.value === undefined || op.value === null) {
          console.warn(`⚠️ ADD операция без значения value для ${id}`);
          failedOps.push({ op, reason: 'Отсутствует value' });
          return;
        }
        
        const existingItem = findItem(id);
        
        // КРИТИЧЕСКАЯ ПРОВЕРКА: если объект уже существует и не пустой - не перезаписываем
        if (existingItem) {
          if (existingItem.value && existingItem.value.toString().trim() !== '') {
            console.warn(`⚠️ Объект ${id} уже существует с непустым значением, пропускаем ADD`);
            failedOps.push({ op, reason: 'Объект уже существует с непустым значением' });
            return;
          }
        }
        
        const extraFields = {};
        if (op.description) extraFields.description = op.description;
        if (op.duration !== undefined) extraFields.duration = op.duration;
        if (op.max !== undefined) extraFields.max = op.max;
        if (op.min !== undefined) extraFields.min = op.min;
        
        if (existingItem) {
          // Обновляем существующий объект
          Object.assign(existingItem, { value: op.value, ...extraFields });
          console.log(`✅ Обновлен объект: ${id} = ${op.value}`);
          changeLog.push(`Обновлено: ${id} → ${op.value}`);
        } else {
          // Создаем новый объект
          state.heroState.push({ id, value: op.value, ...extraFields });
          console.log(`✅ Добавлен новый объект: ${id} = ${op.value}`);
          changeLog.push(`Добавлено: ${id} = ${op.value}`);
        }
        
        appliedOps.push(op);
        stateObserver.notify(STATE_EVENTS.HERO_ITEM_ADDED, { id, value: op.value });
        return;
      }
      
      // ==================================================================
      // ОПЕРАЦИЯ: MODIFY
      // ==================================================================
      if (operation === 'MODIFY') {
        const delta = op.delta !== undefined ? op.delta : 0;
        let item = findItem(id);
        
        if (!item) {
          // Если объект не существует - создаем его с начальным значением
          const initialValue = op.min !== undefined ? op.min : 0;
          item = { id, value: initialValue + delta };
          
          if (op.max !== undefined) item.max = op.max;
          if (op.min !== undefined) item.min = op.min;
          if (op.description) item.description = op.description;
          
          state.heroState.push(item);
          console.log(`✅ Создан новый объект при MODIFY: ${id} = ${item.value}`);
          changeLog.push(`Создано: ${id} = ${item.value}`);
        } else {
          // Модифицируем существующее значение
          const oldValue = item.value || 0;
          let newValue = (typeof oldValue === 'number' ? oldValue : 0) + delta;
          
          // Применяем ограничения
          if (op.max !== undefined && newValue > op.max) {
            newValue = op.max;
          }
          if (op.min !== undefined && newValue < op.min) {
            newValue = op.min;
          }
          
          item.value = newValue;
          
          if (op.max !== undefined) item.max = op.max;
          if (op.min !== undefined) item.min = op.min;
          
          console.log(`✅ Модифицирован объект: ${id} ${oldValue} ${delta > 0 ? '+' : ''}${delta} = ${newValue}`);
          changeLog.push(`${id}: ${oldValue} → ${newValue} (${delta > 0 ? '+' : ''}${delta})`);
        }
        
        appliedOps.push(op);
        stateObserver.notify(STATE_EVENTS.HERO_ITEM_MODIFIED, { id, value: item.value, delta });
        
        if (id.startsWith('stat:')) {
          stateObserver.notify(STATE_EVENTS.HERO_STATS_UPDATED, { id, value: item.value });
        }
        
        return;
      }
      
      // ==================================================================
      // ОПЕРАЦИЯ: SET
      // ==================================================================
      if (operation === 'SET') {
        const existingItem = findItem(id);
        
        // КРИТИЧЕСКАЯ ПРОВЕРКА: пустые значения не перезаписывают имеющиеся
        if (existingItem && existingItem.value) {
          const existingValueStr = existingItem.value.toString().trim();
          const newValueStr = (op.value !== undefined && op.value !== null) ?
            op.value.toString().trim() : '';
          
          if (existingValueStr !== '' && newValueStr === '') {
            console.warn(`⚠️ Попытка перезаписать непустое значение "${existingValueStr}" пустым для ${id}, пропускаем`);
            failedOps.push({ op, reason: 'Попытка перезаписать непустое значение пустым' });
            return;
          }
        }
        
        const extraFields = {};
        if (op.description) extraFields.description = op.description;
        if (op.duration !== undefined) extraFields.duration = op.duration;
        if (op.max !== undefined) extraFields.max = op.max;
        if (op.min !== undefined) extraFields.min = op.min;
        
        if (existingItem) {
          // Обновляем существующий объект
          const oldValue = existingItem.value;
          Object.assign(existingItem, { value: op.value, ...extraFields });
          console.log(`✅ SET для существующего объекта: ${id} = ${op.value}`);
          changeLog.push(`Установлено: ${id} → ${op.value} (было: ${oldValue})`);
        } else {
          // Создаем новый объект
          state.heroState.push({ id, value: op.value, ...extraFields });
          console.log(`✅ SET создал новый объект: ${id} = ${op.value}`);
          changeLog.push(`Создано: ${id} = ${op.value}`);
        }
        
        appliedOps.push(op);
        stateObserver.notify(STATE_EVENTS.HERO_ITEM_MODIFIED, { id, value: op.value });
        
        if (id.startsWith('stat:')) {
          stateObserver.notify(STATE_EVENTS.HERO_STATS_UPDATED, { id, value: op.value });
        }
        
        return;
      }
      
      // ==================================================================
      // ОПЕРАЦИЯ: REMOVE
      // ==================================================================
      if (operation === 'REMOVE') {
        const removed = removeItem(id);
        
        if (removed) {
          console.log(`✅ Удален объект: ${id}`);
          changeLog.push(`Удалено: ${id}`);
          appliedOps.push(op);
          stateObserver.notify(STATE_EVENTS.HERO_ITEM_REMOVED, { id });
          
          // Если удаляем organization_rank, отправляем событие
          if (id.startsWith('organization_rank:')) {
            const orgId = id.split(':')[1];
            stateObserver.notify(STATE_EVENTS.ORGANIZATION_LEFT, { organization: orgId });
          }
        } else {
          console.warn(`⚠️ Попытка удалить несуществующий объект: ${id}`);
          failedOps.push({ op, reason: 'Объект не найден' });
        }
        
        return;
      }
      
      // Неизвестная операция
      console.warn(`⚠️ Неизвестный тип операции: ${operation}`);
      failedOps.push({ op, reason: `Неизвестный тип операции: ${operation}` });
      
    } catch (error) {
      console.error(`❌ Ошибка при применении операции ${idx}:`, error, op);
      failedOps.push({ op, reason: error.message });
    }
  });
  
  // Формируем итоговый лог изменений
  const changesText = changeLog.length > 0 ? changeLog.join('; ') : 'Нет явных изменений';
  
  // Уведомляем о глобальных изменениях героя
  if (appliedOps.length > 0) {
    stateObserver.notify(STATE_EVENTS.HERO_CHANGED, {
      type: 'operations_applied',
      appliedCount: appliedOps.length,
      failedCount: failedOps.length
    });
  }
  
  // Проверяем на смерть героя
  checkHeroDeath();
  
  // Синхронизируем ранг в организации (только для стандартной игры)
  if (state.gameType === 'standard') {
    syncOrganizationRank();
  }
  
  console.log(`📊 Операций применено: ${appliedOps.length}, провалено: ${failedOps.length}`);
  
  return {
    applied: appliedOps,
    failed: failedOps,
    changes: changesText
  };
}

/**
 * Обрабатывает операции с organization_rank
 */
function handleOrganizationRankOperation(op, idx, appliedOps, failedOps, changeLog) {
  const { operation, id, value, delta, description } = op;
  const orgId = id.split(':')[1];
  
  const findItem = (itemId) => state.heroState.find(item => item.id === itemId);
  
  switch (operation) {
    case 'ADD':
      // Вступление в организацию
      if (value === undefined || value === null) {
        console.warn(`⚠️ ADD для organization_rank без значения: ${id}`);
        failedOps.push({ op, reason: 'Отсутствует value' });
        return;
      }
      
      const existingRank = findItem(id);
      if (existingRank) {
        console.warn(`⚠️ organization_rank ${id} уже существует`);
        failedOps.push({ op, reason: 'Уже состоит в организации' });
        return;
      }
      
      // Проверяем иерархию организации
      const hierarchy = getOrganizationHierarchy(orgId);
      let rankName = description || getOrganizationRankName(orgId, value);
      
      const newRankItem = {
        id,
        value: value,
        description: rankName
      };
      
      state.heroState.push(newRankItem);
      console.log(`✅ Вступление в организацию ${orgId}, ранг: ${rankName}`);
      changeLog.push(`Вступил в ${orgId}: ${rankName}`);
      
      appliedOps.push(op);
      stateObserver.notify(STATE_EVENTS.ORGANIZATION_JOINED, {
        organization: orgId,
        rank: value,
        rankName: rankName,
        hierarchy: hierarchy
      });
      break;
      
    case 'MODIFY':
      // Изменение ранга в организации
      const rankItem = findItem(id);
      if (!rankItem) {
        console.warn(`⚠️ MODIFY для несуществующего organization_rank: ${id}`);
        failedOps.push({ op, reason: 'Не состоит в организации' });
        return;
      }
      
      const oldRank = rankItem.value;
      const newRank = oldRank + (delta || 0);
      
      // Проверяем границы по иерархии
      const orgHierarchy = getOrganizationHierarchy(orgId);
      let finalRank = newRank;
      if (orgHierarchy && orgHierarchy.description) {
        const maxRank = Math.max(...orgHierarchy.description.map(r => r.lvl));
        const minRank = Math.min(...orgHierarchy.description.map(r => r.lvl));
        finalRank = Math.max(minRank, Math.min(maxRank, newRank));
      }
      
      const oldRankName = rankItem.description;
      const newRankName = getOrganizationRankName(orgId, finalRank);
      
      rankItem.value = finalRank;
      rankItem.description = newRankName;
      
      console.log(`✅ Изменение ранга в ${orgId}: ${oldRankName} (${oldRank}) → ${newRankName} (${finalRank})`);
      changeLog.push(`${orgId}: ${oldRank} → ${finalRank} (${delta > 0 ? '+' : ''}${delta})`);
      
      appliedOps.push(op);
      stateObserver.notify(STATE_EVENTS.ORGANIZATION_RANK_CHANGED, {
        organization: orgId,
        oldRank: oldRank,
        newRank: finalRank,
        oldRankName: oldRankName,
        newRankName: newRankName
      });
      break;
      
    case 'SET':
      // Установка конкретного ранга
      const setRankItem = findItem(id);
      if (!setRankItem) {
        console.warn(`⚠️ SET для несуществующего organization_rank: ${id}`);
        failedOps.push({ op, reason: 'Не состоит в организации' });
        return;
      }
      
      if (value === undefined || value === null) {
        console.warn(`⚠️ SET без значения для: ${id}`);
        failedOps.push({ op, reason: 'Отсутствует value' });
        return;
      }
      
      const oldSetRank = setRankItem.value;
      const oldSetRankName = setRankItem.description;
      const newSetRankName = description || getOrganizationRankName(orgId, value);
      
      setRankItem.value = value;
      setRankItem.description = newSetRankName;
      
      console.log(`✅ Установка ранга в ${orgId}: ${oldSetRankName} (${oldSetRank}) → ${newSetRankName} (${value})`);
      changeLog.push(`${orgId}: установлен ранг ${value}`);
      
      appliedOps.push(op);
      stateObserver.notify(STATE_EVENTS.ORGANIZATION_RANK_CHANGED, {
        organization: orgId,
        oldRank: oldSetRank,
        newRank: value,
        oldRankName: oldSetRankName,
        newRankName: newSetRankName
      });
      break;
      
    case 'REMOVE':
      // Выход из организации
      const removeSuccess = removeOrganizationRank(id);
      if (removeSuccess) {
        console.log(`✅ Выход из организации: ${orgId}`);
        changeLog.push(`Вышел из ${orgId}`);
        appliedOps.push(op);
        stateObserver.notify(STATE_EVENTS.ORGANIZATION_LEFT, { organization: orgId });
      } else {
        console.warn(`⚠️ Не удалось выйти из организации: ${orgId}`);
        failedOps.push({ op, reason: 'Не состоит в организации' });
      }
      break;
      
    default:
      console.warn(`⚠️ Неизвестная операция для organization_rank: ${operation}`);
      failedOps.push({ op, reason: `Неизвестная операция: ${operation}` });
  }
}

/**
 * Удаляет organization_rank
 */
function removeOrganizationRank(itemId) {
  const index = state.heroState.findIndex(item => item.id === itemId);
  if (index !== -1) {
    state.heroState.splice(index, 1);
    return true;
  }
  return false;
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
    gameType: state.gameType,
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
      totalChoices: state.gameState.history.length,
      organizations: getHeroOrganizations().length
    },
    lastTurnUpdates: state.lastTurnUpdates,
    lastTurnStatChanges: state.lastTurnStatChanges
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
  if (importData.gameType) state.gameType = importData.gameType;
  if (importData.exportTime) state.lastSaveTime = importData.exportTime;
  
  if (importData.lastTurnUpdates !== undefined) {
    state.lastTurnUpdates = importData.lastTurnUpdates;
  }
  
  if (importData.lastTurnStatChanges !== undefined) {
    state.lastTurnStatChanges = importData.lastTurnStatChanges;
  }
  
  if (state.gameType === 'standard') {
    syncOrganizationRank();
  }
  
  stateObserver.notify(STATE_EVENTS.GAME_TYPE_CHANGED, { gameType: state.gameType });
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
        gameType: state.gameType,
        lastSaveTime: state.lastSaveTime,
        totalPlayTime: calculateTotalPlayTime(),
        organizations: getHeroOrganizations().length
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
    state.gameType = importData.appData.metadata.gameType || state.gameType;
    state.lastSaveTime = importData.appData.metadata.lastSaveTime || state.lastSaveTime;
  }
  
  stateObserver.notify(STATE_EVENTS.GAME_TYPE_CHANGED, { gameType: state.gameType });
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
// УПРАВЛЕНИЕ ТИПОМ ИГРЫ
// ========================

function setGameType(gameType, initialScene = null) {
  if (!['standard', 'custom'].includes(gameType)) {
    throw new Error('Неподдерживаемый тип игры. Допустимые значения: standard, custom');
  }
  
  const oldGameType = state.gameType;
  state.gameType = gameType;
  
  // Если переключаемся на кастомную игру и есть начальная сцена
  if (gameType === 'custom' && initialScene) {
    state.gameState.currentScene = {
      ...initialScene,
      gameType: 'custom'
    };
    
    // Обновляем aiMemory, чтобы добавить gameType
    if (!state.gameState.currentScene.aiMemory) {
      state.gameState.currentScene.aiMemory = {};
    }
    state.gameState.currentScene.aiMemory.gameType = 'custom';
  }
  
  // Если переключаемся на стандартную игру
  if (gameType === 'standard' && oldGameType !== 'standard') {
    state.gameState.currentScene = {
      ...PROMPTS.standardGameOTO.initialGameState,
      gameType: 'standard'
    };
    
    // Сбрасываем ритуальные параметры
    state.isRitualActive = false;
    state.ritualProgress = 0;
    state.ritualTarget = null;
    
    // Инициализируем иерархию О.Т.О.
    initializeOrganizationHierarchies();
  }
  
  stateObserver.notify(STATE_EVENTS.GAME_TYPE_CHANGED, {
    oldGameType,
    newGameType: gameType
  });
  
  stateObserver.notify(STATE_EVENTS.SCENE_CHANGED, {
    scene: state.gameState.currentScene,
    gameType: state.gameType
  });
  
  console.log(`🎮 Тип игры изменен: ${oldGameType} → ${gameType}`);
  Saveload.saveState();
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
  
  resetGameProgress: (silent = false) => {
    if (!silent) {
      if (confirm("[SOFT RESET] Сбросить прогресс текущей игры?")) {
        const currentSettings = state.settings;
        const currentUI = state.ui;
        const currentModels = state.models;
        const currentAuditLog = state.auditLog;
        const currentGameType = state.gameType;
        
        state.heroState = [...DEFAULT_HERO_STATE];
        
        if (currentGameType === 'standard') {
          // Полный сброс для стандартной игры
          state.gameState = {
            summary: "",
            history: [],
            aiMemory: {},
            currentScene: { ...PROMPTS.standardGameOTO.initialGameState },
            selectedActions: [],
            organizationsHierarchy: {}
          };
          initializeOrganizationHierarchies();
        } else {
          // Для кастомной игры очищаем всё, кроме текущей сцены
          state.gameState.summary = "";
          state.gameState.history = [];
          state.gameState.aiMemory = {};
          state.gameState.selectedActions = [];
          state.gameState.organizationsHierarchy = {};
          // currentScene НЕ трогаем - он уже содержит кастомную сцену
        }
        
        state.settings = currentSettings;
        state.ui = currentUI;
        state.models = currentModels;
        state.auditLog = currentAuditLog;
        state.gameType = currentGameType;
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
        
        if (state.gameType === 'standard') {
          syncOrganizationRank();
        }
        
        stateObserver.notify(STATE_EVENTS.HERO_CHANGED, { type: 'reset', heroState: state.heroState });
        stateObserver.notify(STATE_EVENTS.SCENE_CHANGED, { scene: state.gameState.currentScene });
        
        Saveload.saveState();
        
        setTimeout(() => {
          location.reload();
        }, 100);
      } else {
        return;
      }
    } else {
      // SILENT режим - без подтверждения и перезагрузки
      const currentSettings = state.settings;
      const currentUI = state.ui;
      const currentModels = state.models;
      const currentAuditLog = state.auditLog;
      const currentGameType = state.gameType;
      
      state.heroState = [...DEFAULT_HERO_STATE];
      
      if (currentGameType === 'standard') {
        state.gameState = {
          summary: "",
          history: [],
          aiMemory: {},
          currentScene: { ...PROMPTS.standardGameOTO.initialGameState },
          selectedActions: [],
          organizationsHierarchy: {}
        };
        initializeOrganizationHierarchies();
      } else {
        state.gameState.summary = "";
        state.gameState.history = [];
        state.gameState.aiMemory = {};
        state.gameState.selectedActions = [];
        state.gameState.organizationsHierarchy = {};
      }
      
      state.settings = currentSettings;
      state.ui = currentUI;
      state.models = currentModels;
      state.auditLog = currentAuditLog;
      state.gameType = currentGameType;
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
      
      if (state.gameType === 'standard') {
        syncOrganizationRank();
      }
      
      stateObserver.notify(STATE_EVENTS.HERO_CHANGED, { type: 'reset', heroState: state.heroState });
      stateObserver.notify(STATE_EVENTS.SCENE_CHANGED, { scene: state.gameState.currentScene });
      
      Saveload.saveState();
    }
  },
  
  addInitialSceneToHistory: () => {
    if (state.gameState.history.length === 0 && state.gameState.currentScene) {
      state.gameState.history.push({
        fullText: state.gameState.currentScene.text || state.gameState.currentScene.scene,
        choice: "Начало игры",
        changes: "Новая игра",
        turn: 1
      });
      state.turnCount = 1; // Устанавливаем счетчик ходов в 1
      console.log('Начальная сцена добавлена в историю как ход #1');
    }
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
  
  // Функции для работы с организациями
  getOrganizationHierarchy,
  setOrganizationHierarchy,
  getOrganizationRankName,
  getHeroOrganizationHierarchies,
  getHeroOrganizations,
  
  syncOrganizationRank,
  setGameType,
  
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
  onGameTypeChange: (callback) => stateObserver.subscribe(STATE_EVENTS.GAME_TYPE_CHANGED, callback),
  onOrganizationJoined: (callback) => stateObserver.subscribe(STATE_EVENTS.ORGANIZATION_JOINED, callback),
  onOrganizationRankChanged: (callback) => stateObserver.subscribe(STATE_EVENTS.ORGANIZATION_RANK_CHANGED, callback),
  onOrganizationLeft: (callback) => stateObserver.subscribe(STATE_EVENTS.ORGANIZATION_LEFT, callback),
  onOrganizationHierarchyUpdated: (callback) => stateObserver.subscribe(STATE_EVENTS.ORGANIZATION_HIERARCHY_UPDATED, callback),
  
  EVENTS: STATE_EVENTS
};