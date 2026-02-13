// Модуль 3: STATE - Управление состоянием игры (ФОРМАТ 4.1 - УНИФИЦИРОВАННАЯ СИСТЕМА GAME_ITEM)
'use strict';

import { CONFIG, aiModels } from './1-config.js';
import { Utils } from './2-utils.js';
import { PROMPTS } from './prompts.js';
import { GameItemUI } from './gameitem-ui.js';
import { OperationsServiceInstance, GAME_ITEM_TYPES, OPERATIONS } from './operations-service.js';
import { Logger, log, LOG_CATEGORIES, LOG_LEVELS } from './logger.js';

// ========================
// ПАТТЕРН OBSERVER (НАБЛЮДАТЕЛЬ)
// ========================

class StateObserver {
  constructor() {
    this.observers = new Map();
  }
  
  subscribe(event, callback) {
    if (!this.observers.has(event)) {
      this.observers.set(event, new Set());
    }
    this.observers.get(event).add(callback);
    return () => this.unsubscribe(event, callback);
  }
  
  unsubscribe(event, callback) {
    if (this.observers.has(event)) {
      this.observers.get(event).delete(callback);
    }
  }
  
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
  
  clear(event = null) {
    if (event) {
      this.observers.delete(event);
    } else {
      this.observers.clear();
    }
  }
}

const stateObserver = new StateObserver();

// ========================
// КЛЮЧ ДЛЯ АУДИТ-ЛОГА (ОТДЕЛЬНОЕ ХРАНИЛИЩЕ)
// ========================
const AUDIT_LOG_KEY = 'oto_audit_log_v4';

// ========================
// СОБЫТИЯ СОСТОЯНИЯ
// ========================
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
  ORGANIZATION_HIERARCHY_UPDATED: 'organization:hierarchy:updated',
  // ✅ НОВОЕ СОБЫТИЕ ДЛЯ АУДИТ-ЛОГА
  AUDIT_LOG_UPDATED: 'audit:log:updated'
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
 /* {
    "id": "organization_rank:oto",
    "value": 0,
    "description": "0° — Минервал (кандидат)"
  },*/
  {
    "id": "personality:hero",
    "value": "Молодой искатель приключений, полный энтузиазма."
  }
];

export const DEFAULT_STATE = {
  version: '4.1.0',
  gameId: Utils.generateUniqueId(),
  lastSaveTime: new Date().toISOString(),
  turnCount: 1,
  gameType: 'standard',
  heroState: [...DEFAULT_HERO_STATE],
  gameState: {
    summary: "",
    history: [],
    aiMemory: {},
    currentScene: { ...PROMPTS.standardGameOTO.initialGameState },
    selectedActions: [],
    organizationsHierarchy: {}
  },
  ui: {
    hTop: 50,
    hMid: 30,
    hBot: 20,
    wBotLeft: 50,
    isCollapsed: false,
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
  // auditLog: [], // ❌ УДАЛЕНО ИЗ ОСНОВНОГО СОСТОЯНИЯ
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
// ВСПОМОГАТЕЛЬНАЯ ФУНКЦИЯ СОХРАНЕНИЯ АУДИТ-ЛОГА (ОТДЕЛЬНО)
// ========================
function saveAuditLogToLocalStorage() {
  try {
    localStorage.setItem(AUDIT_LOG_KEY, JSON.stringify(state.auditLog));
    return true;
  } catch (error) {
    console.error('❌ Ошибка сохранения аудит-лога:', error);
    return false;
  }
}

// ========================
// ИНИЦИАЛИЗАЦИЯ СОСТОЯНИЯ
// ========================

function initializeState() {
  try {
    log.info(LOG_CATEGORIES.GAME_STATE, '🔍 Инициализация состояния (формат 4.1)...');
    
    state = { ...DEFAULT_STATE };
    
    const savedState = localStorage.getItem('oto_v4_state');
    
    if (savedState) {
      try {
        const parsed = JSON.parse(savedState);
        
        if (parsed.version !== '4.1.0') {
          log.warn(LOG_CATEGORIES.GAME_STATE, 'Версия состояния памяти не совпадает с версией приложения (4.1.0):', parsed.version);
        }
        
        for (const [key, defaultValue] of Object.entries(DEFAULT_STATE)) {
          if (parsed[key] !== undefined) {
            if (key === 'heroState' && Array.isArray(parsed[key])) {
              state.heroState = parsed[key];
            } else if (key === 'gameState' && typeof parsed[key] === 'object') {
              state.gameState = { ...defaultValue.gameState, ...parsed[key] };
              
              if (!state.gameState.organizationsHierarchy) {
                state.gameState.organizationsHierarchy = {};
                log.info(LOG_CATEGORIES.GAME_STATE, '✅ Инициализирован пустой объект organizationsHierarchy');
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
        
        if (parsed.gameType) {
          state.gameType = parsed.gameType;
        }
        
        if (!state.gameState.currentScene || !state.gameState.currentScene.scene) {
          log.warn(LOG_CATEGORIES.GAME_STATE, '⚠️ Восстановление: отсутствует currentScene, использую начальную сцену');
          state.gameState.currentScene = state.gameType === 'standard' ? { ...PROMPTS.standardGameOTO.initialGameState } : { scene: "Сцена не загружена", choices: [], aiMemory: {}, gameType: 'custom' };
        }
        
        log.info(LOG_CATEGORIES.GAME_STATE, '✅ Состояние загружено из localStorage (формат 4.1)', {
          gameId: state.gameId,
          gameType: state.gameType,
          turnCount: state.turnCount,
          heroItems: state.heroState.length
        });
        
        if (state.gameState.history.length === 0 && state.gameState.currentScene) {
          state.gameState.aiMemory = {};
          state.gameState.history.push({
            fullText: state.gameState.currentScene.text || state.gameState.currentScene.scene,
            choice: "Начало игры",
            changes: "Новая игра",
            turn: 1
          });
          state.turnCount = 1;
          log.info(LOG_CATEGORIES.GAME_STATE, '✅ Начальная сцена добавлена в историю как ход #1');
        }
        
        initializeOrganizationHierarchies();
        
      } catch (parseError) {
        log.error(LOG_CATEGORIES.ERROR_TRACKING, '❌ Ошибка парсинга сохраненного состояния:', parseError);
        state = { ...DEFAULT_STATE };
        state.gameId = Utils.generateUniqueId();
        initializeOrganizationHierarchies();
      }
    } else {
      log.info(LOG_CATEGORIES.GAME_STATE, '🆕 Первый запуск, используем дефолтное состояние');
      state = { ...DEFAULT_STATE };
      state.gameId = Utils.generateUniqueId();
      initializeOrganizationHierarchies();
    }

    // ✅ ЗАГРУЖАЕМ АУДИТ-ЛОГ ИЗ ОТДЕЛЬНОГО ХРАНИЛИЩА
    const savedAuditLog = localStorage.getItem(AUDIT_LOG_KEY);
    if (savedAuditLog) {
      try {
        state.auditLog = JSON.parse(savedAuditLog);
        log.info(LOG_CATEGORIES.AUDIT, `✅ Аудит-лог загружен из отдельного хранилища (${state.auditLog.length} записей)`);
      } catch (e) {
        log.warn(LOG_CATEGORIES.AUDIT, '⚠️ Ошибка парсинга аудит-лога, создаём новый');
        state.auditLog = [];
      }
    } else {
      state.auditLog = [];
      log.info(LOG_CATEGORIES.AUDIT, '🆕 Аудит-лог пуст, создан новый');
    }
    
    checkHeroDeath();
    
    document.documentElement.style.setProperty('--scale-factor', state.settings.scale);
    document.documentElement.style.fontSize = `${state.settings.scale * 16}px`;
    
    log.info(LOG_CATEGORIES.GAME_STATE, '✅ Состояние полностью инициализировано (формат 4.1)', {
      gameId: state.gameId,
      turnCount: state.turnCount,
      heroItems: state.heroState.length,
      gameType: state.gameType,
      organizations: Object.keys(state.gameState.organizationsHierarchy).length,
      auditLogEntries: state.auditLog.length
    });
    
    stateObserver.notify(STATE_EVENTS.INITIALIZED, {
      gameId: state.gameId,
      turnCount: state.turnCount,
      heroItems: state.heroState.length,
      gameType: state.gameType,
      organizations: Object.keys(state.gameState.organizationsHierarchy).length
    });
    
  } catch (error) {
    log.error(LOG_CATEGORIES.ERROR_TRACKING, '❌ Критическая ошибка инициализации состояния:', error);
    state = { ...DEFAULT_STATE };
    state.gameId = Utils.generateUniqueId();
    state.models = [...aiModels];
    state.auditLog = [];
    
    try {
      localStorage.setItem('oto_v4_state', JSON.stringify(state));
    } catch (saveError) {
      log.error(LOG_CATEGORIES.ERROR_TRACKING, '❌ Не удалось сохранить аварийное состояние:', saveError);
    }
  }
  
  stateObserver.subscribe(STATE_EVENTS.TURN_COMPLETED, (data) => {
    if (GameItemUI && typeof GameItemUI.handleTurnCompleted === 'function') {
      GameItemUI.handleTurnCompleted(state.turnCount);
    }
  });
}

/**
 * ИНИЦИАЛИЗАЦИЯ ИЕРАРХИЙ ОРГАНИЗАЦИЙ (ДИНАМИЧЕСКАЯ, БЕЗ ХАРДКОДА)
 * Загружает иерархии из начальной сцены и текущего состояния
 */
function initializeOrganizationHierarchies() {
  try {
    log.info(LOG_CATEGORIES.ORGANIZATIONS, '🏛️ Инициализация иерархий организаций...');
    
    // ГАРАНТИРУЕМ, что объект иерархий существует
    if (!state.gameState.organizationsHierarchy) {
      state.gameState.organizationsHierarchy = {};
      log.info(LOG_CATEGORIES.ORGANIZATIONS, '✅ Создан новый объект organizationsHierarchy');
    }
    
    // ЗАГРУЖАЕМ ИЕРАРХИЮ О.Т.О. ИЗ НАЧАЛЬНОЙ СЦЕНЫ СТАНДАРТНОЙ ИГРЫ (ДИНАМИЧЕСКИ)
    const initialScene = PROMPTS.standardGameOTO.initialGameState;
    
    // Ищем organization_rank_hierarchy в начальной сцене
    if (initialScene && initialScene['organization_rank_hierarchy:oto']) {
      state.gameState.organizationsHierarchy['oto'] = initialScene['organization_rank_hierarchy:oto'];
      log.info(LOG_CATEGORIES.ORGANIZATIONS, '✅ Иерархия О.Т.О. загружена из начальной сцены стандартной игры');
    }
    
    // ДОПОЛНИТЕЛЬНО: Проверяем текущую сцену на наличие иерархий (для кастомных игр)
    const currentScene = state.gameState.currentScene;
    if (currentScene) {
      // Ищем ВСЕ ключи с префиксом organization_rank_hierarchy: в текущей сцене
      Object.keys(currentScene).forEach(key => {
        if (key.startsWith('organization_rank_hierarchy:')) {
          const orgId = key.split(':')[1];
          if (orgId) {
            state.gameState.organizationsHierarchy[orgId] = currentScene[key];
            log.info(LOG_CATEGORIES.ORGANIZATIONS, `✅ Иерархия организации ${orgId} загружена из текущей сцены`);
          }
        }
      });
    }
    
    // ВОССТАНАВЛИВАЕМ сохраненные иерархии из состояния (если они уже были сохранены ранее)
    const savedHierarchies = state.gameState.organizationsHierarchy;
    const orgIds = Object.keys(savedHierarchies);
    
    if (orgIds.length > 0) {
      log.info(LOG_CATEGORIES.ORGANIZATIONS, `✅ Загружено иерархий организаций: ${orgIds.join(', ')}`);
      orgIds.forEach(orgId => {
        log.debug(LOG_CATEGORIES.ORGANIZATIONS, `   ${orgId}: ${savedHierarchies[orgId].description?.length || 0} уровней`);
      });
    } else {
      log.info(LOG_CATEGORIES.ORGANIZATIONS, 'ℹ️ Нет сохраненных иерархий организаций');
    }
    
  } catch (error) {
    log.error(LOG_CATEGORIES.ERROR_TRACKING, '❌ Ошибка инициализации иерархий организаций:', error);
    // Гарантируем хотя бы пустой объект
    if (!state.gameState.organizationsHierarchy) {
      state.gameState.organizationsHierarchy = {};
    }
  }
}

/**
 * Получает иерархию организации по ID (ДИНАМИЧЕСКИ ИЗ СОСТОЯНИЯ)
 */
function getOrganizationHierarchy(orgId) {
  if (!state || !state.gameState || !state.gameState.organizationsHierarchy) {
    log.warn(LOG_CATEGORIES.ORGANIZATIONS, '❌ State не инициализирован или organizationsHierarchy отсутствует');
    return null;
  }
  
  const hierarchy = state.gameState.organizationsHierarchy[orgId];
  
  if (!hierarchy) {
    log.warn(LOG_CATEGORIES.ORGANIZATIONS, `⚠️ Иерархия для организации ${orgId} не найдена`);
    return null;
  }
  
  // ВАЛИДАЦИЯ: проверяем структуру иерархии
  if (!hierarchy.description || !Array.isArray(hierarchy.description)) {
    log.error(LOG_CATEGORIES.ORGANIZATIONS, `❌ Некорректная структура иерархии для организации ${orgId}`);
    return null;
  }
  
  return hierarchy;
}

/**
 * Получает ВСЕ иерархии организаций, в которых состоит игрок
 */
function getHeroOrganizationHierarchies() {
  const hierarchies = {};
  
  // Получаем все organization_rank у героя
  const orgRanks = state.heroState.filter(item => item.id.startsWith('organization_rank:'));
  
  log.debug(LOG_CATEGORIES.ORGANIZATIONS, `🔍 Поиск иерархий для ${orgRanks.length} организаций героя`);
  
  orgRanks.forEach(rankItem => {
    try {
      const orgId = rankItem.id.split(':')[1];
      if (!orgId) {
        log.warn(LOG_CATEGORIES.ORGANIZATIONS, `⚠️ Некорректный ID organization_rank: ${rankItem.id}`);
        return;
      }
      
      const hierarchy = getOrganizationHierarchy(orgId);
      if (hierarchy) {
        hierarchies[orgId] = hierarchy;
        log.debug(LOG_CATEGORIES.ORGANIZATIONS, `✅ Иерархия организации ${orgId} найдена`);
      } else {
        log.warn(LOG_CATEGORIES.ORGANIZATIONS, `⚠️ Иерархия для организации ${orgId} не найдена в состоянии`);
      }
    } catch (error) {
      log.error(LOG_CATEGORIES.ERROR_TRACKING, `❌ Ошибка при обработке organization_rank:`, rankItem, error);
    }
  });
  
  return hierarchies;
}

/**
 * Сохраняет иерархию организации в состояние (ДИНАМИЧЕСКОЕ СОХРАНЕНИЕ)
 */
function setOrganizationHierarchy(orgId, hierarchy) {
  try {
    if (!hierarchy || typeof hierarchy !== 'object') {
      log.error(LOG_CATEGORIES.ORGANIZATIONS, `❌ Некорректная иерархия для организации ${orgId}`);
      return false;
    }
    
    // ВАЛИДАЦИЯ: проверяем обязательные поля
    if (!hierarchy.description || !Array.isArray(hierarchy.description)) {
      log.error(LOG_CATEGORIES.ORGANIZATIONS, `❌ Иерархия организации ${orgId} должна содержать массив description`);
      return false;
    }
    
    // Гарантируем наличие объекта иерархий
    if (!state.gameState.organizationsHierarchy) {
      state.gameState.organizationsHierarchy = {};
    }
    
    // Сохраняем иерархию
    state.gameState.organizationsHierarchy[orgId] = hierarchy;
    log.info(LOG_CATEGORIES.ORGANIZATIONS, `✅ Иерархия организации ${orgId} сохранена (${hierarchy.description.length} уровней)`);
    
    // Обновляем описание ранга, если игрок состоит в этой организации
    const rankItem = state.heroState.find(item => item.id === `organization_rank:${orgId}`);
    if (rankItem && hierarchy.description) {
      const rankInfo = hierarchy.description.find(item => item.lvl === rankItem.value);
      if (rankInfo) {
        rankItem.description = rankInfo.rank;
        log.info(LOG_CATEGORIES.ORGANIZATIONS, `✅ Описание ранга обновлено: ${orgId} ${rankItem.value}° = ${rankInfo.rank}`);
      }
    }
    
    // Уведомляем об обновлении иерархии
    stateObserver.notify(STATE_EVENTS.ORGANIZATION_HIERARCHY_UPDATED, {
      organization: orgId,
      hierarchy: hierarchy,
      timestamp: new Date().toISOString()
    });
    
    return true;
  } catch (error) {
    log.error(LOG_CATEGORIES.ERROR_TRACKING, `❌ Ошибка сохранения иерархии для организации ${orgId}:`, error);
    return false;
  }
}

/**
 * Получает название ранга организации (ДИНАМИЧЕСКОЕ ПОЛУЧЕНИЕ)
 */
function getOrganizationRankName(orgId, rankValue) {
  try {
    const hierarchy = getOrganizationHierarchy(orgId);
    if (hierarchy && hierarchy.description && Array.isArray(hierarchy.description)) {
      const rankInfo = hierarchy.description.find(item => item.lvl === rankValue);
      if (rankInfo) {
        return rankInfo.rank;
      }
    }
    
    // Резервный вариант: ищем в heroState
    const rankItem = state.heroState.find(item => item.id === `organization_rank:${orgId}`);
    if (rankItem && rankItem.description) {
      return rankItem.description;
    }
    
    return `${rankValue}°`;
  } catch (error) {
    log.error(LOG_CATEGORIES.ERROR_TRACKING, `❌ Ошибка получения названия ранга для ${orgId}:${rankValue}`, error);
    return `${rankValue}°`;
  }
}

/**
 * Получает список ВСЕХ организаций, в которых состоит герой (КОНСИСТЕНТНОЕ ИСПОЛЬЗОВАНИЕ)
 */
function getHeroOrganizations() {
  try {
    const orgRanks = state.heroState.filter(item => item.id.startsWith('organization_rank:'));
    const organizations = [];
    
    log.debug(LOG_CATEGORIES.ORGANIZATIONS, `🔍 Формирование списка организаций героя (найдено рангов: ${orgRanks.length})`);
    
    orgRanks.forEach(rankItem => {
      try {
        const orgId = rankItem.id.split(':')[1];
        if (!orgId) {
          log.warn(LOG_CATEGORIES.ORGANIZATIONS, `⚠️ Пропущен некорректный organization_rank: ${rankItem.id}`);
          return;
        }
        
        const hierarchy = getOrganizationHierarchy(orgId);
        const rankName = getOrganizationRankName(orgId, rankItem.value);
        
        organizations.push({
          id: orgId,
          rank: rankItem.value,
          rankName: rankName,
          description: rankItem.description || rankName,
          hierarchy: hierarchy
        });
        
        log.debug(LOG_CATEGORIES.ORGANIZATIONS, `✅ Организация добавлена: ${orgId} (ранг ${rankItem.value}: ${rankName})`);
      } catch (error) {
        log.error(LOG_CATEGORIES.ERROR_TRACKING, `❌ Ошибка обработки organization_rank:`, rankItem, error);
      }
    });
    
    log.debug(LOG_CATEGORIES.ORGANIZATIONS, `✅ Сформирован список из ${organizations.length} организаций героя`);
    return organizations;
  } catch (error) {
    log.error(LOG_CATEGORIES.ERROR_TRACKING, '❌ Критическая ошибка при получении организаций героя:', error);
    return [];
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
    log.warn(LOG_CATEGORIES.ORGANIZATIONS, '⚠️ Нет organization_rank:oto для синхронизации');
    return;
  }
  
  const currentRank = orgRankItem.value;
  const hierarchy = getOrganizationHierarchy('oto');
  
  if (!hierarchy || !hierarchy.description) {
    log.warn(LOG_CATEGORIES.ORGANIZATIONS, '⚠️ Нет иерархии О.Т.О. для синхронизации');
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
    
    // Используем OperationsService для обновления ранга
    OperationsServiceInstance.applyOperation(
      {
        operation: OPERATIONS.SET,
        id: 'organization_rank:oto',
        value: newRank,
        description: newRankName
      },
      state.heroState
    );
    
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
    
    log.info(LOG_CATEGORIES.ORGANIZATIONS, `🎓 Повышение ранга в О.Т.О.: ${oldRankName} (${currentRank}) → ${newRankName} (${newRank})`);
    
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

function checkHeroDeath() {
  const stats = state.heroState.filter(item => item.id.startsWith('stat:'));
  const deadStats = stats.filter(stat => stat.value <= 0);
  
  if (deadStats.length > 0) {
    log.warn(LOG_CATEGORIES.GAME_STATE, '☠️ Герой мертв! Статы достигли 0:', deadStats.map(s => s.id));
    stateObserver.notify(STATE_EVENTS.HERO_DEATH, {
      deadStats: deadStats.map(s => s.id),
      heroState: state.heroState
    });
  }
}

// ========================
// НОВЫЕ ФУНКЦИИ ДЛЯ РАБОТЫ С КОПИЯМИ СОСТОЯНИЯ (ОБНОВЛЕННЫЕ)
// ========================

/**
 * Применяет операцию к произвольному состоянию (без эмита событий)
 * @param {Object} operation - Операция
 * @param {Array} targetState - Целевое состояние (массив game items)
 * @returns {Object} Результат операции
 */
function applyOperationToState(operation, targetState) {
  return OperationsServiceInstance.applyOperation(operation, targetState);
}

/**
 * Применяет массив операций к произвольному состоянию
 * @param {Array} operations - Массив операций
 * @param {Array} targetState - Целевое состояние
 * @returns {Object} Сводный результат
 */
function applyOperationsToState(operations, targetState) {
  return OperationsServiceInstance.applyOperations(operations, targetState);
}

/**
 * Уменьшает длительность эффектов в произвольном состоянии
 * @param {Array} targetState - Целевое состояние
 * @returns {Object} Результат обработки
 */
function decreaseBuffDurationsInState(targetState) {
  return OperationsServiceInstance.decreaseBuffDurations(targetState);
}

/**
 * Получает значение стата из произвольного состояния
 * @param {Array} targetState - Целевое состояние
 * @param {string} statId - ID стата (например, 'stat:will')
 * @returns {number} Значение стата
 */
function getGameItemValueFromState(targetState, statId) {
  const item = targetState.find(item => item.id === statId);
  return item ? item.value : 50; // 50 по умолчанию
}

/**
 * Рассчитывает изменения статов между двумя состояниями
 * @param {Array} oldState - Старое состояние
 * @param {Array} newState - Новое состояние
 * @returns {Object} Изменения статов
 */
function calculateStatChanges(oldState, newState) {
  return OperationsServiceInstance.calculateChanges(oldState, newState);
}

/**
 * Создает расчетное состояние с уже примененными изменениями от действий
 * @param {Array} originalState - Исходное состояние
 * @param {Array} actionResults - Результаты действий
 * @returns {Array} Расчетное состояние для ИИ
 */
function calculateStateForAI(originalState, actionResults) {
  // Глубокая копия исходного состояния
  const calculatedState = JSON.parse(JSON.stringify(originalState));
  
  // Уменьшаем длительность эффектов
  OperationsServiceInstance.decreaseBuffDurations(calculatedState);
  
  // Применяем операции от действий
  actionResults.forEach(result => {
    if (result.operations && Array.isArray(result.operations)) {
      OperationsServiceInstance.applyOperations(result.operations, calculatedState);
    }
  });
  
  return calculatedState;
}

// ========================
// ОПЕРАЦИИ НАД GAME_ITEM (обновленные для работы с OperationsService)
// ========================

/**
 * УЛУЧШЕННАЯ ФУНКЦИЯ: Применение операций к heroState
 * Использует OperationsService для обработки операций
 */
function applyOperations(operations) {
  log.debug(LOG_CATEGORIES.OPERATIONS, 'applyOperations called', { operationsCount: operations?.length });
  
  if (!Array.isArray(operations) || operations.length === 0) {
    log.warn(LOG_CATEGORIES.OPERATIONS, '⚠️ Пустой массив операций');
    return false;
  }
  
  const stateSnapshot = State.getState();
  const newHeroState = [...stateSnapshot.heroState];
  
  // Применяем все операции через OperationsService
  const result = OperationsServiceInstance.applyOperations(operations, newHeroState);
  
  if (!result.success) {
    log.error(LOG_CATEGORIES.OPERATIONS, '❌ Ошибка применения операций:', result);
    return false;
  }
  
  // Обновляем состояние с новым heroState
  State.setState({ heroState: newHeroState });
  
  // Эмитим общее событие о изменении героя
  stateObserver.notify(STATE_EVENTS.HERO_CHANGED, {
    timestamp: new Date().toISOString(),
    operations: operations,
    results: result.results
  });
  
  // Проверяем смерть героя после изменений
  checkHeroDeath();
  
  log.info(LOG_CATEGORIES.OPERATIONS, '✅ applyOperations завершен', {
    applied: result.applied,
    failed: result.failed,
    total: operations.length
  });
  
  return true;
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
    log.info(LOG_CATEGORIES.GAME_STATE, '🔄 Полный сброс игры');
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
  
  log.info(LOG_CATEGORIES.GAME_STATE, '📤 Экспорт состояния игры', {
    gameId: state.gameId,
    turnCount: state.turnCount,
    exportTime: exportData.exportTime
  });
  
  stateObserver.notify(STATE_EVENTS.STATE_EXPORTED, { data: exportData });
  return exportData;
}

// ✅ ИСПРАВЛЕННАЯ ФУНКЦИЯ: importFullState – теперь восстанавливает все поля состояния
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
  
  // ✅ ВОССТАНАВЛИВАЕМ ПОЛЯ, КОТОРЫЕ НЕ БЫЛИ ВОССТАНОВЛЕНЫ РАНЕЕ
  if (importData.freeMode !== undefined) state.freeMode = importData.freeMode;
  if (importData.freeModeText !== undefined) state.freeModeText = importData.freeModeText;
  if (importData.isRitualActive !== undefined) state.isRitualActive = importData.isRitualActive;
  if (importData.ritualProgress !== undefined) state.ritualProgress = importData.ritualProgress;
  if (importData.ritualTarget !== undefined) state.ritualTarget = importData.ritualTarget;
  if (importData.thoughtsOfHero) state.thoughtsOfHero = [...importData.thoughtsOfHero];
  
  // ✅ ВОССТАНАВЛИВАЕМ АУДИТ-ЛОГ, ЕСЛИ ОН ЕСТЬ В ИМПОРТЕ
  if (importData.auditLog) {
    state.auditLog = importData.auditLog;
    saveAuditLogToLocalStorage();
  }
  
  if (state.gameType === 'standard') {
    syncOrganizationRank();
  }
  
  log.info(LOG_CATEGORIES.GAME_STATE, '📥 Импорт состояния игры', {
    gameId: state.gameId,
    gameType: state.gameType,
    turnCount: state.turnCount,
    importTime: new Date().toISOString()
  });
  
  stateObserver.notify(STATE_EVENTS.GAME_TYPE_CHANGED, { gameType: state.gameType });
  stateObserver.notify(STATE_EVENTS.STATE_IMPORTED, { data: importData });
  stateObserver.notify(STATE_EVENTS.HERO_CHANGED, { type: 'import', heroState: state.heroState });
  stateObserver.notify(STATE_EVENTS.SCENE_CHANGED, { scene: state.gameState.currentScene });
  
  saveStateToLocalStorage();
  
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
  
  log.info(LOG_CATEGORIES.GAME_STATE, '📤 Экспорт данных приложения', {
    exportTime: exportData.exportTime
  });
  
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
    saveAuditLogToLocalStorage(); // ✅ сохраняем отдельно
  }
  
  if (importData.appData.metadata) {
    state.gameId = importData.appData.metadata.gameId || state.gameId;
    state.gameType = importData.appData.metadata.gameType || state.gameType;
    state.lastSaveTime = importData.appData.metadata.lastSaveTime || state.lastSaveTime;
  }
  
  log.info(LOG_CATEGORIES.GAME_STATE, '📥 Импорт данных приложения', {
    gameId: state.gameId,
    gameType: state.gameType,
    importTime: new Date().toISOString()
  });
  
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
    
    log.debug(LOG_CATEGORIES.GAME_STATE, '💭 Добавлены мысли героя', {
      count: phrases.length,
      total: state.thoughtsOfHero.length
    });
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
  
  const oldGameType = state.gameType;
  state.gameType = gameType;
  
  // Если переключаемся на кастомную игру и есть начальная сцена
  if (gameType === 'custom' && initialScene) {
    state.gameState.currentScene = {
      ...initialScene,
      gameType: 'custom'
    };
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
  
  log.info(LOG_CATEGORIES.GAME_STATE, `🎮 Тип игры изменен: ${oldGameType} → ${gameType}`);
  
  stateObserver.notify(STATE_EVENTS.GAME_TYPE_CHANGED, {
    oldGameType,
    newGameType: gameType
  });
  
  stateObserver.notify(STATE_EVENTS.SCENE_CHANGED, {
    scene: state.gameState.currentScene,
    gameType: state.gameType
  });
  
  saveStateToLocalStorage();
}

// ========================
// ПУБЛИЧНЫЙ ИНТЕРФЕЙС
// ========================

// Сохранения текущего состояния state
function saveStateToLocalStorage() {
  log.debug(LOG_CATEGORIES.GAME_STATE, '💾 Сохранение состояния игры...');
  
  try {
    // Используем текущее состояние
    const currentState = State.getState();
    
    // Обновляем время сохранения
    currentState.lastSaveTime = new Date().toISOString();
    
    // Подготавливаем данные для сохранения
    const saveData = {
      version: '4.1.0',
      gameId: currentState.gameId,
      lastSaveTime: currentState.lastSaveTime,
      turnCount: currentState.turnCount,
      gameType: currentState.gameType,
      heroState: [...currentState.heroState],
      gameState: {
        ...currentState.gameState,
        organizationsHierarchy: currentState.gameState.organizationsHierarchy || {}
      },
      ui: { ...currentState.ui },
      settings: { ...currentState.settings },
      // auditLog: [...] // ❌ УДАЛЕНО – аудит хранится отдельно
      models: [...currentState.models],
      isRitualActive: currentState.isRitualActive,
      ritualProgress: currentState.ritualProgress,
      ritualTarget: currentState.ritualTarget,
      freeMode: currentState.freeMode,
      freeModeText: currentState.freeModeText,
      lastTurnUpdates: currentState.lastTurnUpdates || "",
      lastTurnStatChanges: currentState.lastTurnStatChanges || null,
      thoughtsOfHero: [...currentState.thoughtsOfHero]
    };
    
    // Основное сохранение в формате 4.1
    localStorage.setItem('oto_v4_state', JSON.stringify(saveData));
    
    // Эмитим событие сохранения
    stateObserver.notify(STATE_EVENTS.SAVED, {
      gameId: currentState.gameId,
      turnCount: currentState.turnCount,
      timestamp: currentState.lastSaveTime
    });
    
    log.debug(LOG_CATEGORIES.GAME_STATE, '✅ Игра сохранена в localStorage (формат 4.1)', {
      gameId: currentState.gameId,
      turnCount: currentState.turnCount
    });
    
    return true;
  } catch (error) {
    log.error(LOG_CATEGORIES.ERROR_TRACKING, '❌ Ошибка сохранения состояния:', error);
    return false;
  }
}

/**
 * Загрузка состояния игры из localStorage (ФОРМАТ 4.1)
 */
function loadStateFromLocalStorage() {
  log.debug(LOG_CATEGORIES.GAME_STATE, '📥 Загрузка состояния...');
  const savedState = localStorage.getItem('oto_v4_state');
  return savedState;
}

// ========================
// ПУБЛИЧНЫЙ ИНТЕРФЕЙС
// ========================

initializeState();

export const State = {
  getState: () => {
    if (!state || typeof state !== 'object') {
      log.error(LOG_CATEGORIES.ERROR_TRACKING, '❌ State is corrupted! Reinitializing...');
      initializeState();
    }
    return state;
  },
  
  setState: (newState) => {
    if (!state) {
      log.error(LOG_CATEGORIES.ERROR_TRACKING, '⚠️ Cannot setState on undefined state');
      initializeState();
    }
    
    // ❌ Полностью убираем блок с JSON.stringify – он был нужен только для отладки
    state = { ...state, ...newState };
    
    // Сохраняем основное состояние (аудит уже не входит)
    saveStateToLocalStorage();
  },
  
  resetGameProgress: (silent = false) => {
    if (!silent) {
      if (confirm("[SOFT RESET] Сбросить прогресс текущей игры?")) {
        log.info(LOG_CATEGORIES.GAME_STATE, '🔄 Сброс прогресса игры');
        const currentSettings = state.settings;
        const currentUI = state.ui;
        const currentModels = state.models;
        const currentAuditLog = [...state.auditLog]; // ✅ сохраняем
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
        state.auditLog = currentAuditLog; // ✅ восстанавливаем
        state.gameType = currentGameType;
        state.turnCount = 1;
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
        
        // ✅ Сохраняем аудит-лог отдельно
        saveAuditLogToLocalStorage();
        
        stateObserver.notify(STATE_EVENTS.HERO_CHANGED, { type: 'reset', heroState: state.heroState });
        stateObserver.notify(STATE_EVENTS.SCENE_CHANGED, { scene: state.gameState.currentScene });
        
        saveStateToLocalStorage();
        
        setTimeout(() => {
          location.reload();
        }, 100);
      } else {
        return;
      }
    } else {
      // SILENT режим - без подтверждения и перезагрузки
      log.info(LOG_CATEGORIES.GAME_STATE, '🔄 Тихий сброс прогресса игры');
      const currentSettings = state.settings;
      const currentUI = state.ui;
      const currentModels = state.models;
      const currentAuditLog = [...state.auditLog];
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
      state.turnCount = 1;
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
      
      saveAuditLogToLocalStorage(); // ✅ сохраняем отдельно
      
      stateObserver.notify(STATE_EVENTS.HERO_CHANGED, { type: 'reset', heroState: state.heroState });
      stateObserver.notify(STATE_EVENTS.SCENE_CHANGED, { scene: state.gameState.currentScene });
      
      saveStateToLocalStorage();
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
      log.info(LOG_CATEGORIES.GAME_STATE, 'Начальная сцена добавлена в историю как ход #1');
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
  
  saveStateToLocalStorage,
  loadStateFromLocalStorage,
  
  // ✅ Внутренняя функция сохранения аудит-лога (публичный доступ для отладки)
  saveAuditLogToLocalStorage,
  
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
  getHeroOrganizations, // гарантированно возвращает массив (даже пустой)
  
  syncOrganizationRank,
  setGameType,
  
  // Новые функции для работы с копиями состояния (используют OperationsService)
  applyOperationToState,
  applyOperationsToState,
  decreaseBuffDurationsInState,
  getGameItemValueFromState,
  calculateStatChanges,
  calculateStateForAI,
  
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
    log.debug(LOG_CATEGORIES.GAME_STATE, `➡️ Увеличение счетчика ходов: ${state.turnCount}`);
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
    
    log.info(LOG_CATEGORIES.UI_EVENTS, '🔍 Изменение масштаба', {
      scaleIndex: newScaleIndex,
      scale: state.settings.scale
    });
    
    stateObserver.notify(STATE_EVENTS.SCALE_CHANGED, {
      scaleIndex: newScaleIndex,
      scale: state.settings.scale
    });
    
    return state.settings.scale;
  },
  getScaleIndex: () => state.settings.scaleIndex,
  
  // Добавляет запись аудита
  addAuditLogEntry: (entry) => {
    entry.id = entry.id || Date.now();
    entry.timestamp = Utils.formatMoscowTime(new Date());
    
    state.auditLog.unshift(entry);
    
    if (state.auditLog.length > 50) {
      state.auditLog = state.auditLog.slice(0, 50);
    }
    
    saveAuditLogToLocalStorage(); // ✅ сохраняем отдельно
    
    stateObserver.notify(STATE_EVENTS.AUDIT_LOG_UPDATED, {
      auditLog: state.auditLog,
      newEntry: entry
    });
    
    log.debug(LOG_CATEGORIES.AUDIT, '📝 Добавлена запись в аудит-лог', entry);
  },
  
  getModelStats: () => {
    const models = state.models || [];
    const total = models.length;
    const success = models.filter(m => m.status === 'success').length;
    const error = models.filter(m => m.status === 'error').length;
    const untested = total - success - error;
    
    return { total, success, error, untested };
  },
  
    getDefaultHeroState: () => JSON.parse(JSON.stringify(DEFAULT_HERO_STATE)),
  
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
  
  // Устаревшие методы для обратной совместимости (будут удалены)
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