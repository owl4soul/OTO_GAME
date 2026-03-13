// Модуль 3: STATE - Управление состоянием игры (v5.1.1 — ПОЛНОСТЬЮ СОГЛАСОВАН С PARSER v6.1)

'use strict';

import { CONFIG, aiModels } from './1-config.js';
import { Utils } from './2-utils.js';
import { PROMPTS } from './prompts.js';
import { GameItemUI } from './gameitem-ui.js';
import { OperationsServiceInstance, GAME_ITEM_TYPES, OPERATIONS } from './operations-service.js';
import { Logger, log, LOG_CATEGORIES, LOG_LEVELS } from './logger.js';
import { Parser } from './parsing.js';

// ========================
// ПАТТЕРН OBSERVER (НАБЛЮДАТЕЛЬ)
// ========================

/**
 * Класс-наблюдатель для управления подписками на события состояния.
 * @class StateObserver
 */
class StateObserver {
  constructor() {
    /** @type {Map<string, Set<Function>>} */
    this.observers = new Map();
  }

  /**
   * Подписаться на событие.
   * @param {string} event - название события
   * @param {Function} callback - функция-обработчик
   * @returns {Function} функция для отписки
   */
  subscribe(event, callback) {
    if (!this.observers.has(event)) {
      this.observers.set(event, new Set());
    }
    this.observers.get(event).add(callback);
    return () => this.unsubscribe(event, callback);
  }

  /**
   * Отписаться от события.
   * @param {string} event
   * @param {Function} callback
   */
  unsubscribe(event, callback) {
    if (this.observers.has(event)) {
      this.observers.get(event).delete(callback);
    }
  }

  /**
   * Уведомить всех подписчиков события.
   * @param {string} event
   * @param {*} [data] - данные, передаваемые обработчикам
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
   * Очистить подписки (для всех событий или для конкретного).
   * @param {string|null} [event] - если не указан, очищаются все подписки
   */
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
const AUDIT_LOG_KEY = 'oto_audit_log_v5';

// ========================
// СОБЫТИЯ СОСТОЯНИЯ
// ========================

/**
 * Перечень всех событий, на которые можно подписаться через State.on().
 * @readonly
 * @enum {string}
 */
const STATE_EVENTS = {
  INITIALIZED: 'state:initialized',
  LOADED: 'state:loaded',
  SAVED: 'state:saved',

  GAME_CHANGED: 'game:changed',
  SCENE_CHANGED: 'scene:changed',
  HISTORY_UPDATED: 'history:updated',
  ORGANIZATION_HIERARCHY_UPDATED: 'organization:hierarchy:updated',

  HERO_CHANGED: 'hero:changed',
  HERO_ITEM_ADDED: 'hero:item:added',
  HERO_ITEM_REMOVED: 'hero:item:removed',
  HERO_ITEM_MODIFIED: 'hero:item:modified',
  THOUGHTS_UPDATED: 'thoughts:updated',
  RITUAL_STARTED: 'ritual:started',
  RITUAL_PROGRESS: 'ritual:progress',
  DEGREE_UPGRADED: 'degree:upgraded',
  HERO_DEATH: 'hero:death',
  VICTORY: 'victory',

  UI_CHANGED: 'ui:changed',
  CHOICES_CHANGED: 'choices:changed',
  MODE_CHANGED: 'mode:changed',
  LAYOUT_CHANGED: 'layout:changed',

  SETTINGS_CHANGED: 'settings:changed',
  MODEL_CHANGED: 'model:changed',
  SCALE_CHANGED: 'scale:changed',

  STATE_EXPORTED: 'state:exported',
  STATE_IMPORTED: 'state:imported',

  AUDIT_LOG_UPDATED: 'audit:log:updated',

  // ✨ НОВОЕ СОБЫТИЕ: полная замена состояния
  STATE_REPLACED: 'state:replaced',
  TURN_COMPLETED: 'turn:completed'
};

// ========================
// ДЕФОЛТНЫЕ ЗНАЧЕНИЯ ДЛЯ КАЖДОЙ СЕКЦИИ
// ========================

/** @constant {Array<Object>} */
const DEFAULT_HERO_ITEMS = [
  { id: 'stat:will', value: 50 },
  { id: 'stat:sanity', value: 50 },
  { id: 'stat:stealth', value: 50 },
  { id: 'stat:influence', value: 50 },
  { id: 'progress:level', value: 0 }
];

/** @constant {Object} */
const DEFAULT_GAME = {
  id: Utils.generateUniqueId(),
  type: 'standard',
  turnCount: 1,
  summary: '',
  history: [],
  currentScene: { 
    ...PROMPTS.standardGameOTO.initialGameState
  },
  organizationsHierarchy: {},
  meta: {
    metaContext: null,               // null = не задан (никогда не затираем)
    extraRootData: {},               // все неизвестные корневые поля
    initialGameItemsApplied: false,   // флаг для game_items[]
    unknownFields: [],
    unknownArrays: [],
    unknownObjects: []
  }
};

/** @constant {Object} */
const DEFAULT_HERO = {
  items: [...DEFAULT_HERO_ITEMS],
  thoughts: [],
  ritual: {
    active: false,
    progress: 0,
    target: null
  },
  immortal: false
};

/** @constant {Object} */
const DEFAULT_UI = {
  layout: {
    hTop: 50,
    hMid: 30,
    hBot: 20,
    wBotLeft: 50,
    isCollapsed: false,
    isAutoCollapsed: false,
    hBotBeforeCollapse: 20
  },
  freeMode: {
    enabled: false,
    text: ''
  },
  selectedActions: [],
  pendingRequest: null,
  turnDisplay: {
    statChanges: null,
    updates: ''
  }
};

/** @constant {Object} */
const DEFAULT_SETTINGS = {
  apiProvider: 'vsegpt',
  apiKeyOpenrouter: '',
  apiKeyVsegpt: '',
  model: 'openai/gpt-3.5-turbo-16k',
  scale: CONFIG.scaleSteps[CONFIG.defaultScaleIndex],
  scaleIndex: CONFIG.defaultScaleIndex,
  models: [...aiModels]
};

/** @constant {Object} */
const DEFAULT_STATE = {
  version: '5.1.1',
  lastSaveTime: new Date().toISOString(),
  game: { ...DEFAULT_GAME },
  hero: { ...DEFAULT_HERO },
  ui: { ...DEFAULT_UI },
  settings: { ...DEFAULT_SETTINGS }
};

/** @type {Object} текущее состояние игры */
let state = null;

/** @type {Array} аудит-лог (хранится отдельно) */
let auditLog = [];

// ========================
// ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
// ========================

/**
 * Проверяет, является ли значение простым объектом (не массивом, не null).
 * @param {*} value
 * @returns {boolean}
 */
function isPlainObject(value) {
  return Object.prototype.toString.call(value) === '[object Object]';
}

/**
 * Глубокое слияние объектов с заменой массивов (массивы из source полностью заменяют массивы в target).
 * @param {Object} target - исходный объект (не мутируется)
 * @param {...Object} sources - объекты-источники
 * @returns {Object} новый объект, результат слияния
 */
function deepMerge(target, ...sources) {
  if (!isPlainObject(target) && !Array.isArray(target)) {
    return target;
  }

  const result = Array.isArray(target) ? [...target] : { ...target };

  for (const source of sources) {
    if (!source || (typeof source !== 'object' && !Array.isArray(source))) continue;

    for (const key in source) {
      if (Object.prototype.hasOwnProperty.call(source, key)) {
        const sourceValue = source[key];
        const targetValue = result[key];

        if (Array.isArray(sourceValue)) {
          result[key] = sourceValue;
        } else if (isPlainObject(sourceValue) && isPlainObject(targetValue)) {
          result[key] = deepMerge(targetValue, sourceValue);
        } else {
          result[key] = sourceValue;
        }
      }
    }
  }

  return result;
}

/**
 * Сохраняет аудит-лог в localStorage.
 * @returns {boolean} успешность сохранения
 */
function saveAuditLogToLocalStorage() {
  try {
    localStorage.setItem(AUDIT_LOG_KEY, JSON.stringify(auditLog));
    return true;
  } catch (error) {
    console.error('❌ Ошибка сохранения аудит-лога:', error);
    return false;
  }
}

/**
 * Загружает аудит-лог из localStorage.
 */
function loadAuditLog() {
  const saved = localStorage.getItem(AUDIT_LOG_KEY);
  if (saved) {
    try {
      auditLog = JSON.parse(saved);
      log.info(LOG_CATEGORIES.AUDIT, `✅ Аудит-лог загружен (${auditLog.length} записей)`);
    } catch (e) {
      log.warn(LOG_CATEGORIES.AUDIT, '⚠️ Ошибка парсинга аудит-лога, создаём новый');
      auditLog = [];
    }
  } else {
    auditLog = [];
  }
}

    /**
     * Нормализует массив game_item: удаляет дубликаты по id, оставляя последнее вхождение.
     * 
     * ДОРАБОТКА ПО ЗАПОМИНАНИЮ ОПЕРАЦИЙ:
     * После нормализации мы гарантированно добавляем поле operation (дефолт 'SET')
     * для всех статичных типов (personality, relations, inventory и т.д.).
     * Это обеспечивает консистентность с OperationsService.
     * 
     * @param {Array<Object>} items - исходный массив
     * @returns {Array<Object>} массив с уникальными id + operation
     */
    function normalizeHeroItems(items) {
        const map = new Map();
        items.forEach(item => {
            if (item && item.id) {
                // Сохраняем последний встреченный item
                map.set(item.id, item);
            }
        });

        let normalized = Array.from(map.values());

        // === ДОРАБОТКА: гарантируем наличие operation для ВСЕХ типов ===
        normalized = normalized.map(item => {
            if (!item.operation) {
                const prefix = item.id.split(':')[0];
                // Для статичных типов ставим логический тип операции
                if (['personality', 'typology'].includes(prefix)) item.operation = 'SET';
                else if (['relations', 'skill', 'inventory'].includes(prefix)) item.operation = 'ADD';
                else if (['buff', 'bless'].includes(prefix)) item.operation = 'ADD';
                else if (['debuff', 'curse'].includes(prefix)) item.operation = 'REMOVE';
                else item.operation = 'MODIFY'; // дефолт для статов и progress
            }
            return item;
        });
        // =================================================================

        return normalized;
    }

// ========================
// ФУНКЦИИ ДЛЯ РАБОТЫ С ОРГАНИЗАЦИЯМИ
// ========================

/**
 * Инициализирует иерархии организаций, загружая их из начальной сцены и текущей сцены.
 * Вызывается при инициализации состояния и при смене типа игры.
 */
function initializeOrganizationHierarchies() {
  try {
    log.info(LOG_CATEGORIES.ORGANIZATIONS, '🏛️ Инициализация иерархий организаций...');
    if (!state.game.organizationsHierarchy) {
      state.game.organizationsHierarchy = {};
    }
    const initialScene = PROMPTS.standardGameOTO.initialGameState;
    if (initialScene && initialScene['organization_rank_hierarchy:oto']) {
      state.game.organizationsHierarchy['oto'] = initialScene['organization_rank_hierarchy:oto'];
    }
    const currentScene = state.game.currentScene;
    if (currentScene) {
      Object.keys(currentScene).forEach(key => {
        if (key.startsWith('organization_rank_hierarchy:')) {
          const orgId = key.split(':')[1];
          if (orgId) {
            state.game.organizationsHierarchy[orgId] = currentScene[key];
          }
        }
      });
    }
  } catch (error) {
    log.error(LOG_CATEGORIES.ERROR_TRACKING, '❌ Ошибка инициализации иерархий:', error);
    if (!state.game.organizationsHierarchy) state.game.organizationsHierarchy = {};
  }
}

/**
 * Возвращает иерархию организации по её идентификатору.
 * @param {string} orgId - идентификатор организации (например, 'oto')
 * @returns {Object|null} объект иерархии или null, если не найдена
 */
function getOrganizationHierarchy(orgId) {
  if (!state?.game?.organizationsHierarchy) return null;
  const hierarchy = state.game.organizationsHierarchy[orgId];
  if (!hierarchy?.description || !Array.isArray(hierarchy.description)) return null;
  return hierarchy;
}

/**
 * Сохраняет иерархию организации в состояние.
 * @param {string} orgId
 * @param {Object} hierarchy - объект с полем description (массив уровней)
 * @returns {boolean} успешность операции
 */
function setOrganizationHierarchy(orgId, hierarchy) {
  try {
    if (!hierarchy?.description || !Array.isArray(hierarchy.description)) return false;
    if (!state.game.organizationsHierarchy) state.game.organizationsHierarchy = {};
    state.game.organizationsHierarchy[orgId] = hierarchy;
    const rankItem = state.hero.items.find(item => item.id === `organization_rank:${orgId}`);
    if (rankItem && hierarchy.description) {
      const rankInfo = hierarchy.description.find(r => r.lvl === rankItem.value);
      if (rankInfo) rankItem.description = rankInfo.rank;
    }
    stateObserver.notify(STATE_EVENTS.ORGANIZATION_HIERARCHY_UPDATED, { organization: orgId, hierarchy });
    saveStateToLocalStorage();
    return true;
  } catch (error) {
    log.error(LOG_CATEGORIES.ERROR_TRACKING, `❌ Ошибка сохранения иерархии ${orgId}:`, error);
    return false;
  }
}

/**
 * Возвращает название ранга в организации.
 * @param {string} orgId
 * @param {number} rankValue - числовое значение ранга
 * @returns {string} название ранга (например, "Минервал")
 */
function getOrganizationRankName(orgId, rankValue) {
  const hierarchy = getOrganizationHierarchy(orgId);
  if (hierarchy?.description) {
    const rankInfo = hierarchy.description.find(r => r.lvl === rankValue);
    if (rankInfo) return rankInfo.rank;
  }
  const rankItem = state.hero.items.find(item => item.id === `organization_rank:${orgId}`);
  return rankItem?.description || `${rankValue}°`;
}

/**
 * Возвращает список организаций, в которых состоит герой, с подробной информацией.
 * @returns {Array<Object>} массив объектов с полями id, rank, rankName, description, hierarchy
 */
function getHeroOrganizations() {
  return state.hero.items
    .filter(item => item.id.startsWith('organization_rank:'))
    .map(rankItem => {
      const orgId = rankItem.id.split(':')[1];
      if (!orgId) return null;
      const hierarchy = getOrganizationHierarchy(orgId);
      const rankName = getOrganizationRankName(orgId, rankItem.value);
      return {
        id: orgId,
        rank: rankItem.value,
        rankName,
        description: rankItem.description || rankName,
        hierarchy
      };
    })
    .filter(Boolean);
}

/**
 * Возвращает объект, где ключи — идентификаторы организаций,
 * в которых состоит герой, а значения — их иерархии.
 * @returns {Object} словарь { orgId: hierarchy }
 */
function getHeroOrganizationHierarchies() {
  const orgs = getHeroOrganizations();
  const hierarchies = {};
  orgs.forEach(org => {
    if (org.hierarchy) {
      hierarchies[org.id] = org.hierarchy;
    }
  });
  return hierarchies;
}

/**
 * Синхронизирует ранг в организации О.Т.О. с прогрессом героя (для стандартной игры).
 * При повышении ранга применяет бонусы и запускает ритуал.
 */
function syncOrganizationRank() {
  if (state.game.type !== 'standard') return;
  const progressItem = state.hero.items.find(item => item.id === 'progress:level');
  const progress = progressItem ? progressItem.value : 0;
  const orgRankItem = state.hero.items.find(item => item.id === 'organization_rank:oto');
  if (!orgRankItem) return;
  const hierarchy = getOrganizationHierarchy('oto');
  if (!hierarchy?.description) return;

  let newRank = 0;
  for (const rankInfo of hierarchy.description) {
    const threshold = rankInfo.threshold || (rankInfo.lvl * 10);
    if (progress >= threshold) newRank = rankInfo.lvl;
  }

  if (newRank > orgRankItem.value) {
    const oldRankName = orgRankItem.description;
    const newRankName = getOrganizationRankName('oto', newRank);
    OperationsServiceInstance.applyOperation(
      { operation: OPERATIONS.SET, id: 'organization_rank:oto', value: newRank, description: newRankName },
      state.hero.items
    );
    state.hero.items = state.hero.items.map(item => {
      if (item.id.startsWith('stat:')) {
        return { ...item, value: Math.min(100, item.value + 5) };
      }
      return item;
    });
    state.hero.ritual.active = true;
    state.hero.ritual.progress = 0;
    state.hero.ritual.target = newRank;
    log.info(LOG_CATEGORIES.ORGANIZATIONS, `🎓 Повышение ранга: ${oldRankName} → ${newRankName}`);
    stateObserver.notify(STATE_EVENTS.DEGREE_UPGRADED, { organization: 'oto', oldRank: orgRankItem.value, newRank, oldRankName, newRankName });
    stateObserver.notify(STATE_EVENTS.ORGANIZATION_RANK_CHANGED, { organization: 'oto', oldRank: orgRankItem.value, newRank, rankName: newRankName });
    saveStateToLocalStorage();
  }
}

// ========================
// ФУНКЦИИ ДЛЯ РАБОТЫ С GAME_ITEM
// ========================

/**
 * Возвращает game_item по его идентификатору.
 * @param {string} id
 * @returns {Object|undefined}
 */
function getGameItem(id) {
  return state.hero.items.find(item => item.id === id);
}

/**
 * Возвращает все game_item, id которых начинается с указанного префикса.
 * @param {string} typePrefix - например, 'stat:', 'skill:'
 * @returns {Array<Object>}
 */
function getGameItemsByType(typePrefix) {
  return state.hero.items.filter(item => item.id.startsWith(typePrefix));
}

/**
 * Проверяет наличие game_item с заданным id.
 * @param {string} id
 * @returns {boolean}
 */
function hasGameItem(id) {
  return state.hero.items.some(item => item.id === id);
}

/**
 * Возвращает значение game_item (поле value) или null, если элемент не найден.
 * @param {string} id
 * @returns {*}
 */
function getGameItemValue(id) {
  const item = getGameItem(id);
  return item ? item.value : null;
}

// ========================
// ПРОВЕРКА СМЕРТИ ГЕРОЯ И ДОСТИЖЕНИЯ БЕССМЕРТИЯ
// ========================

/**
 * Проверяет состояние героя:
 * - Если любой стат достиг 100 и герой ещё не бессмертен, устанавливает бессмертие и генерирует VICTORY.
 * - Если хотя бы один стат ≤ 0 и герой не бессмертен, генерирует HERO_DEATH.
 */
function checkGameFinal() {
  const stats = state.hero.items.filter(item => item.id.startsWith('stat:'));

  const maxStat = stats.find(stat => stat.value >= 100);
  if (maxStat && !state.hero.immortal) {
    log.info(LOG_CATEGORIES.GAME_STATE, `🏆 Герой достиг бессмертия! Стат ${maxStat.id} = ${maxStat.value}`);
    state.hero.immortal = true;
    saveStateToLocalStorage();
    stateObserver.notify(STATE_EVENTS.VICTORY, { stat: maxStat.id, value: maxStat.value });
    return;
  }

  if (!state.hero.immortal) {
    const deadStats = stats.filter(stat => stat.value <= 0);
    if (deadStats.length > 0) {
      log.warn(LOG_CATEGORIES.GAME_STATE, '☠️ Герой мёртв!', deadStats.map(s => s.id));
      stateObserver.notify(STATE_EVENTS.HERO_DEATH, { deadStats: deadStats.map(s => s.id), heroState: state.hero.items });
    }
  }
}

// ========================
// СОХРАНЕНИЕ СОСТОЯНИЯ В LOCALSTORAGE
// ========================

/**
 * Сохраняет текущее состояние игры в localStorage (ключ 'oto_v5_state').
 * @returns {boolean} успешность сохранения
 */
function saveStateToLocalStorage() {
  log.debug(LOG_CATEGORIES.GAME_STATE, '💾 Сохранение состояния игры...');
  try {
    const saveData = {
      version: state.version,
      lastSaveTime: new Date().toISOString(),
      game: state.game,
      hero: state.hero,
      ui: state.ui,
      settings: state.settings
    };
    localStorage.setItem('oto_v5_state', JSON.stringify(saveData));
    stateObserver.notify(STATE_EVENTS.SAVED, { gameId: state.game.id, turnCount: state.game.turnCount, timestamp: saveData.lastSaveTime });
    return true;
  } catch (error) {
    log.error(LOG_CATEGORIES.ERROR_TRACKING, '❌ Ошибка сохранения состояния:', error);
    return false;
  }
}

// ========================
// ИНИЦИАЛИЗАЦИЯ СОСТОЯНИЯ
// ========================

/**
 * Инициализирует состояние игры: загружает из localStorage или создаёт новое.
 * Вызывается один раз при загрузке модуля.
 * 
 * ВАЖНЫЕ ИЗМЕНЕНИЯ:
 * - Убраны все проверки версий и миграции (обратная совместимость не требуется).
 * - Загруженное состояние используется как есть, без глубокого слияния с DEFAULT_STATE.
 * - Гарантируется наличие обязательных корневых секций.
 */
function initializeState() {
  try {
    log.info(LOG_CATEGORIES.GAME_STATE, '🔍 Инициализация состояния...');
    
    const savedState = localStorage.getItem('oto_v5_state');
    if (savedState) {
      try {
        const parsed = JSON.parse(savedState);
        state = parsed;
        
        if (!state.game) state.game = DEFAULT_STATE.game;
        if (!state.hero) state.hero = DEFAULT_STATE.hero;
        if (!state.ui) state.ui = DEFAULT_STATE.ui;
        if (!state.settings) state.settings = DEFAULT_STATE.settings;
        if (!state.version) state.version = DEFAULT_STATE.version;
        if (!state.lastSaveTime) state.lastSaveTime = new Date().toISOString();
        
        state.hero.items = normalizeHeroItems(state.hero.items);
        
        log.info(LOG_CATEGORIES.GAME_STATE, '✅ Состояние загружено из localStorage');
      } catch (parseError) {
        log.error(LOG_CATEGORIES.ERROR_TRACKING, '❌ Ошибка парсинга сохранённого состояния:', parseError);
        state = deepMerge({}, DEFAULT_STATE);
      }
    } else {
      log.info(LOG_CATEGORIES.GAME_STATE, '🆕 Первый запуск, дефолтное состояние');
      state = deepMerge({}, DEFAULT_STATE);
    }
    
    initializeOrganizationHierarchies();
    
    if (state.game.history.length === 0 && state.game.currentScene) {
      state.game.history.push({
        fullText: state.game.currentScene.text || state.game.currentScene.scene,
        choice: 'Начало игры',
        changes: 'Новая игра',
        turn: 1
      });
      state.game.turnCount = 1;
    }
    
    loadAuditLog();
    checkGameFinal();
    
    document.documentElement.style.setProperty('--scale-factor', state.settings.scale);
    document.documentElement.style.fontSize = `${state.settings.scale * 16}px`;
    
    log.info(LOG_CATEGORIES.GAME_STATE, '✅ Состояние полностью инициализировано', {
      gameId: state.game.id,
      turnCount: state.game.turnCount,
      heroItems: state.hero.items.length,
      gameType: state.game.type,
      immortal: state.hero.immortal
    });
    
    stateObserver.notify(STATE_EVENTS.INITIALIZED, {
      gameId: state.game.id,
      turnCount: state.game.turnCount,
      gameType: state.game.type
    });
    
  } catch (error) {
    log.error(LOG_CATEGORIES.ERROR_TRACKING, '❌ Критическая ошибка инициализации:', error);
    state = deepMerge({}, DEFAULT_STATE);
    try {
      localStorage.setItem('oto_v5_state', JSON.stringify(state));
    } catch (saveError) {
      log.error(LOG_CATEGORIES.ERROR_TRACKING, '❌ Не удалось сохранить аварийное состояние:', saveError);
    }
  }
  
  stateObserver.subscribe(STATE_EVENTS.TURN_COMPLETED, () => {
    if (GameItemUI?.handleTurnCompleted) {
      GameItemUI.handleTurnCompleted(state.game.turnCount);
    }
  });
}

// ========================
// ФУНКЦИИ ДЛЯ УПРАВЛЕНИЯ МЫСЛЯМИ ГЕРОЯ
// ========================

/**
 * Извлекает первую мысль из очереди (и удаляет её).
 * @returns {string|null} текст мысли или null, если очередь пуста
 */
function getHeroPhrase() {
  if (state.hero.thoughts.length > 0) {
    return state.hero.thoughts.shift();
  }
  return null;
}

/**
 * Добавляет новые мысли в конец очереди.
 * @param {Array<string>} phrases - массив строк (мысли)
 */
function addHeroPhrases(phrases) {
  if (Array.isArray(phrases)) {
    state.hero.thoughts = state.hero.thoughts.concat(phrases);
    localStorage.setItem('oto_thoughts_of_hero', JSON.stringify(state.hero.thoughts));
    stateObserver.notify(STATE_EVENTS.THOUGHTS_UPDATED, { thoughts: phrases });
  }
}

/**
 * Возвращает текущее количество мыслей в очереди.
 * @returns {number}
 */
function getHeroPhrasesCount() {
  return state.hero.thoughts.length;
}

/**
 * Очищает очередь мыслей.
 */
function clearHeroPhrases() {
  state.hero.thoughts = [];
  localStorage.removeItem('oto_thoughts_of_hero');
}

/**
 * Проверяет, нужны ли новые мысли (очередь пуста).
 * @returns {boolean}
 */
function needsHeroPhrases() {
  return state.hero.thoughts.length === 0;
}

// ========================
// УПРАВЛЕНИЕ ТИПОМ ИГРЫ
// ========================

/**
 * Устанавливает тип игры (standard / custom) и при необходимости инициализирует начальную сцену.
 * @param {string} gameType
 * @param {Object|null} [initialScene] - начальная сцена для кастомной игры
 */
function setGameType(gameType, initialScene = null) {
  const oldType = state.game.type;
  state.game.type = gameType;
  if (gameType === 'custom' && initialScene) {
    state.game.currentScene = { ...initialScene, gameType: 'custom' };
  }
  if (gameType === 'standard' && oldType !== 'standard') {
    state.game.currentScene = { ...PROMPTS.standardGameOTO.initialGameState, gameType: 'standard' };
    state.hero.ritual.active = false;
    state.hero.ritual.progress = 0;
    state.hero.ritual.target = null;
    initializeOrganizationHierarchies();
  }
  log.info(LOG_CATEGORIES.GAME_STATE, `🎮 Тип игры изменён: ${oldType} → ${gameType}`);
  stateObserver.notify(STATE_EVENTS.GAME_TYPE_CHANGED, { oldGameType: oldType, newGameType: gameType });
  stateObserver.notify(STATE_EVENTS.SCENE_CHANGED, { scene: state.game.currentScene, gameType });
  saveStateToLocalStorage();
}

// ========================
// ЭКСПОРТ/ИМПОРТ ПОЛНОГО СОСТОЯНИЯ (очищено от legacy)
// ========================

/**
 * Экспортирует полное состояние игры (включая аудит-лог) в формате, совместимом со старыми версиями.
 * @returns {Object} данные для экспорта
 */
function exportFullState() {
  return {
    version: state.version,
    gameId: state.game.id,
    gameType: state.game.type,
    exportTime: new Date().toISOString(),
    heroState: [...state.hero.items],
    gameState: {
      summary: state.game.summary,
      history: state.game.history,
      currentScene: state.game.currentScene,
      organizationsHierarchy: state.game.organizationsHierarchy
    },
    settings: { ...state.settings },
    auditLog: [...auditLog],
    models: [...state.settings.models],
    metaGameState: { ...state.game.meta },
    metadata: {
      turnCount: state.game.turnCount,
      lastSaveTime: state.lastSaveTime,
      totalPlayTime: calculateTotalPlayTime(),
      totalChoices: state.game.history.length,
      organizations: getHeroOrganizations().length,
      immortal: state.hero.immortal
    },
    lastTurnUpdates: state.ui.turnDisplay.updates,
    lastTurnStatChanges: state.ui.turnDisplay.statChanges
  };
}

/**
 * Импортирует полное состояние игры из данных.
 * Валидация схемы отключена.
 * @param {Object} importData - данные, полученные от exportFullState
 */
function importFullState(importData) {
  const data = importData;

  state.game.id = data.gameId || state.game.id;
  state.game.type = data.gameType || state.game.type;
  if (data.heroState) {
    state.hero.items = normalizeHeroItems(data.heroState);
  }
  if (data.gameState) {
    state.game = deepMerge({}, state.game, {
      summary: data.gameState.summary || '',
      history: data.gameState.history || [],
      currentScene: data.gameState.currentScene || { ...PROMPTS.standardGameOTO.initialGameState },
      organizationsHierarchy: data.gameState.organizationsHierarchy || {}
    });
  }
  if (data.settings) {
    const currentApiKeys = { openrouter: state.settings.apiKeyOpenrouter, vsegpt: state.settings.apiKeyVsegpt };
    state.settings = deepMerge({}, state.settings, data.settings);
    state.settings.apiKeyOpenrouter = currentApiKeys.openrouter;
    state.settings.apiKeyVsegpt = currentApiKeys.vsegpt;
  }
  if (data.models) state.settings.models = [...data.models];
  if (data.auditLog) {
    auditLog = [...data.auditLog];
    saveAuditLogToLocalStorage();
  }
  if (data.metaGameState) state.game.meta = { ...DEFAULT_GAME.meta, ...data.metaGameState };
  if (data.lastTurnUpdates !== undefined) state.ui.turnDisplay.updates = data.lastTurnUpdates;
  if (data.lastTurnStatChanges !== undefined) state.ui.turnDisplay.statChanges = data.lastTurnStatChanges;

  if (state.game.type === 'standard') syncOrganizationRank();

  log.info(LOG_CATEGORIES.GAME_STATE, '📥 Импорт состояния выполнен', { gameId: state.game.id, turnCount: state.game.turnCount, immortal: state.hero.immortal });
  stateObserver.notify(STATE_EVENTS.GAME_TYPE_CHANGED, { gameType: state.game.type });
  stateObserver.notify(STATE_EVENTS.STATE_IMPORTED, { data });
  stateObserver.notify(STATE_EVENTS.HERO_CHANGED, { type: 'import', heroState: state.hero.items });
  stateObserver.notify(STATE_EVENTS.SCENE_CHANGED, { scene: state.game.currentScene });
  saveStateToLocalStorage();
}

// ========================
// ЭКСПОРТ/ИМПОРТ ДАННЫХ ПРИЛОЖЕНИЯ (БЕЗ ПРОГРЕССА ИГРЫ)
// ========================

/**
 * Экспортирует только настройки приложения, модели и аудит-лог (без игрового прогресса).
 * @returns {Object}
 */
function exportAllAppData() {
  return {
    version: state.version,
    exportTime: new Date().toISOString(),
    appData: {
      settings: {
        apiProvider: state.settings.apiProvider,
        model: state.settings.model,
        scale: state.settings.scale,
        scaleIndex: state.settings.scaleIndex
      },
      models: [...state.settings.models],
      auditLog: [...auditLog],
      metadata: {
        gameId: state.game.id,
        gameType: state.game.type,
        lastSaveTime: state.lastSaveTime,
        totalPlayTime: calculateTotalPlayTime(),
        organizations: getHeroOrganizations().length,
        immortal: state.hero.immortal
      }
    }
  };
}

/**
 * Импортирует данные приложения (настройки, модели, аудит-лог).
 * @param {Object} importData
 * @throws {Error}
 */
function importAllAppData(importData) {
  if (!importData?.appData) throw new Error('Отсутствуют данные приложения');
  const { appData } = importData;

  if (appData.settings) {
    const currentApiKeys = { openrouter: state.settings.apiKeyOpenrouter, vsegpt: state.settings.apiKeyVsegpt };
    state.settings = deepMerge({}, state.settings, {
      apiProvider: appData.settings.apiProvider,
      model: appData.settings.model,
      scale: appData.settings.scale,
      scaleIndex: appData.settings.scaleIndex
    });
    state.settings.apiKeyOpenrouter = currentApiKeys.openrouter;
    state.settings.apiKeyVsegpt = currentApiKeys.vsegpt;
  }
  if (appData.models) state.settings.models = [...appData.models];
  if (appData.auditLog) {
    auditLog = [...appData.auditLog];
    saveAuditLogToLocalStorage();
  }
  if (appData.metadata) {
    state.game.id = appData.metadata.gameId || state.game.id;
    state.game.type = appData.metadata.gameType || state.game.type;
    state.lastSaveTime = appData.metadata.lastSaveTime || state.lastSaveTime;
    if (typeof appData.metadata.immortal === 'boolean') {
      state.hero.immortal = appData.metadata.immortal;
    }
  }
  log.info(LOG_CATEGORIES.GAME_STATE, '📥 Импорт данных приложения');
  stateObserver.notify(STATE_EVENTS.SETTINGS_CHANGED);
  stateObserver.notify(STATE_EVENTS.MODEL_CHANGED);
  saveStateToLocalStorage();
}

/**
 * Вычисляет общее время игры в секундах с момента первого запуска.
 * @returns {number}
 */
function calculateTotalPlayTime() {
  const startTime = localStorage.getItem('oto_first_play_time');
  if (!startTime) return 0;
  return Math.floor((Date.now() - new Date(startTime)) / 1000);
}

// Устанавливаем время первого запуска, если его нет
if (!localStorage.getItem('oto_first_play_time')) {
  localStorage.setItem('oto_first_play_time', new Date().toISOString());
}

// ========================
// СБРОС И ПЕРЕЗАПУСК
// ========================

/**
 * Полный сброс игры (hard reset): очищает localStorage и перезагружает страницу.
 */
function resetFullGame() {
  if (confirm('[HARD RESET] Сбросить ВСЮ игру, включая настройки?')) {
    log.info(LOG_CATEGORIES.GAME_STATE, '🔄 Полный сброс игры');
    localStorage.clear();
    state = null;
    setTimeout(() => location.reload(), 100);
  }
}

/**
 * Мягкий сброс прогресса (soft reset): сбрасывает игровые данные, но сохраняет настройки, UI и аудит-лог.
 * @param {boolean} [silent=false] - если true, не запрашивать подтверждение
 */
function resetGameProgress(silent = false) {
  if (!silent && !confirm('[SOFT RESET] Сбросить прогресс текущей игры?')) return;
  log.info(LOG_CATEGORIES.GAME_STATE, silent ? '🔄 Тихий рестарт' : '🔄 Сброс прогресса');
  const currentSettings = { ...state.settings };
  const currentUI = { ...state.ui };
  const currentAuditLog = [...auditLog];

  state.game = { ...DEFAULT_GAME, id: Utils.generateUniqueId() };
  state.hero = { ...DEFAULT_HERO };
  state.ui = { ...currentUI };
  state.settings = { ...currentSettings };
  auditLog = [...currentAuditLog];

  if (state.game.type === 'standard') {
    initializeOrganizationHierarchies();
    syncOrganizationRank();
  }

  saveAuditLogToLocalStorage();
  stateObserver.notify(STATE_EVENTS.HERO_CHANGED, { type: 'reset', heroState: state.hero.items });
  stateObserver.notify(STATE_EVENTS.SCENE_CHANGED, { scene: state.game.currentScene });
  saveStateToLocalStorage();
  if (!silent) setTimeout(() => location.reload(), 100);
}

// ========================
// ПУБЛИЧНЫЙ ИНТЕРФЕЙС
// ========================

// Инициализация состояния при загрузке модуля
initializeState();

/**
 * Глобальный объект для доступа к состоянию игры и управления им.
 * @namespace State
 */
export const State = {
  // ========== ГЕТТЕРЫ ==========

  /** @returns {Object} полное состояние */
  getState: () => state,
  /** @returns {Object} секция game */
  getGame: () => state.game,
  /** @returns {Object} секция hero */
  getHero: () => state.hero,
  /** @returns {Object} секция ui */
  getUI: () => state.ui,
  /** @returns {Object} секция settings */
  getSettings: () => state.settings,

  // ========== ОБНОВЛЕНИЕ ==========

  /**
   * Частичное обновление состояния (глубокое слияние с заменой массивов).
   * @param {Object} newPartial - объект с изменяемыми полями (может содержать вложенные структуры)
   */
  setState: (newPartial) => {
    if (!state) initializeState();
    state = deepMerge({}, state, newPartial);
    saveStateToLocalStorage();
  },

  /**
   * ✨ НОВЫЙ МЕТОД: Полная замена состояния (без слияния). Используется при старте кастомной игры.
   * @param {Object} fullNewState - новое полное состояние (должно содержать все секции)
   */
  replaceState: (fullNewState) => {
    if (!state) initializeState();
    const newState = JSON.parse(JSON.stringify(fullNewState));
    
    if (!newState.game) newState.game = DEFAULT_STATE.game;
    if (!newState.hero) newState.hero = DEFAULT_STATE.hero;
    if (!newState.ui) newState.ui = DEFAULT_STATE.ui;
    if (!newState.settings) newState.settings = DEFAULT_STATE.settings;
    if (!newState.version) newState.version = DEFAULT_STATE.version;
    if (!newState.lastSaveTime) newState.lastSaveTime = new Date().toISOString();
    
    state = newState;
    saveStateToLocalStorage();
    stateObserver.notify(STATE_EVENTS.STATE_REPLACED, { newState: fullNewState });
  },

  /**
   * Обновляет только секцию game (с заменой массивов).
   * @param {Object} updater - частичные данные для game
   */
  updateGame: (updater) => {
    // Защита от прямой записи aiMemory и meta_context (обновляются только через специальные методы)
    if (updater.aiMemory !== undefined) {
        log.warn(LOG_CATEGORIES.GAME_STATE, '🚫 aiMemory обновляется ТОЛЬКО через State.updateAiMemory()');
        delete updater.aiMemory;
    }
    if (updater.meta_context !== undefined) {
        log.warn(LOG_CATEGORIES.GAME_STATE, '🚫 meta_context обновляется ТОЛЬКО через State.updateMetaContext()');
        delete updater.meta_context;
    }
    state.game = deepMerge({}, state.game, updater);
    saveStateToLocalStorage();
    stateObserver.notify(STATE_EVENTS.GAME_CHANGED, updater);
  },

  /**
   * Обновляет только секцию hero (с заменой массивов).
   * Если передано поле items, автоматически нормализует его.
   * @param {Object} updater
   */
  updateHero: (updater) => {
    state.hero = deepMerge({}, state.hero, updater);
    if (updater.items) {
      state.hero.items = normalizeHeroItems(state.hero.items);
    }
    saveStateToLocalStorage();
    stateObserver.notify(STATE_EVENTS.HERO_CHANGED, updater);
  },

  /**
   * Обновляет только секцию ui (с заменой массивов).
   * @param {Object} updater
   */
  updateUI: (updater) => {
    state.ui = deepMerge({}, state.ui, updater);
    saveStateToLocalStorage();
    stateObserver.notify(STATE_EVENTS.UI_CHANGED, updater);
  },

  /**
   * Обновляет только секцию settings (с заменой массивов).
   * @param {Object} updater
   */
  updateSettings: (updater) => {
    state.settings = deepMerge({}, state.settings, updater);
    saveStateToLocalStorage();
    stateObserver.notify(STATE_EVENTS.SETTINGS_CHANGED, updater);
  },

  // ========== GAME_ITEM ==========
  getGameItem,
  getGameItemsByType,
  hasGameItem,
  getGameItemValue,

  // ========== ОРГАНИЗАЦИИ ==========
  getOrganizationHierarchy,
  setOrganizationHierarchy,
  getOrganizationRankName,
  getHeroOrganizations,
  getHeroOrganizationHierarchies,
  syncOrganizationRank,

  // ========== МЫСЛИ ГЕРОЯ ==========
  getHeroPhrase,
  addHeroPhrases,
  getHeroPhrasesCount,
  clearHeroPhrases,
  needsHeroPhrases,

  // ========== АУДИТ-ЛОГ ==========
  clearAuditLog: () => {
    auditLog = [];
    saveAuditLogToLocalStorage();
    stateObserver.notify(STATE_EVENTS.AUDIT_LOG_UPDATED, { auditLog });
    log.info(LOG_CATEGORIES.AUDIT, '🧹 Аудит-лог очищен');
  },
  getAuditLog: () => auditLog,
  addAuditLogEntry: (entry) => {
    entry.id = entry.id || Date.now();
    entry.timestamp = Utils.formatMoscowTime(new Date());
    auditLog.unshift(entry);
    if (auditLog.length > 50) auditLog = auditLog.slice(0, 50);
    saveAuditLogToLocalStorage();
    stateObserver.notify(STATE_EVENTS.AUDIT_LOG_UPDATED, { auditLog, newEntry: entry });
  },
  saveAuditLogToLocalStorage,
  saveStateToLocalStorage,

  // ========== УПРАВЛЕНИЕ ТИПОМ ИГРЫ ==========
  setGameType,

  // ========== СБРОС ==========
  resetFullGame,
  resetGameProgress,
  checkGameFinal,

  // ========== ЭКСПОРТ/ИМПОРТ ==========
  exportFullState,
  importFullState,
  exportAllAppData,
  importAllAppData,

  // ========== МАСШТАБ ==========
  updateScale: (newScaleIndex) => {
    newScaleIndex = Math.max(0, Math.min(CONFIG.scaleSteps.length - 1, newScaleIndex));
    state.settings.scaleIndex = newScaleIndex;
    state.settings.scale = CONFIG.scaleSteps[newScaleIndex];
    document.documentElement.style.setProperty('--scale-factor', state.settings.scale);
    document.documentElement.style.fontSize = `${state.settings.scale * 16}px`;
    localStorage.setItem('oto_scale', state.settings.scale.toString());
    localStorage.setItem('oto_scale_index', newScaleIndex.toString());
    stateObserver.notify(STATE_EVENTS.SCALE_CHANGED, { scaleIndex: newScaleIndex, scale: state.settings.scale });
    saveStateToLocalStorage();
    return state.settings.scale;
  },
  getScaleIndex: () => state.settings.scaleIndex,

  // ========== МЕТОДЫ ДЛЯ UI ==========
  saveUiState: () => {
    saveStateToLocalStorage();
  },
  getHBotBeforeCollapse: () => state.ui.layout.hBotBeforeCollapse,
  setHBotBeforeCollapse: (value) => {
    state.ui.layout.hBotBeforeCollapse = value;
    saveStateToLocalStorage();
  },

  // ========== МОДЕЛИ ==========
  getModelStats: () => {
    const models = state.settings.models || [];
    const total = models.length;
    const success = models.filter(m => m.status === 'success').length;
    const error = models.filter(m => m.status === 'error').length;
    const untested = total - success - error;
    return { total, success, error, untested };
  },

  // ========== СЧЁТЧИК ХОДОВ ==========
  incrementTurnCount: () => {
    state.game.turnCount++;
    localStorage.setItem('oto_turn_count', state.game.turnCount.toString());
    return state.game.turnCount;
  },
  getTurnCount: () => state.game.turnCount,

  // ========== OBSERVER API ==========
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

  /** @enum {string} */
  EVENTS: STATE_EVENTS,
  
  // ========== МЕТА-КОНТЕКСТ ОТ ГЕЙМ-МАСТЕРА ==========
  setMetaContext: (metaContext) => {
    // Игнорируем null/undefined
    if (metaContext === null || metaContext === undefined) return;
    
    let strContext;
    if (typeof metaContext === 'object') {
        // Объект или массив преобразуем в строку JSON
        strContext = JSON.stringify(metaContext);
    } else {
        // Примитив – приводим к строке и обрезаем пробелы
        strContext = String(metaContext).trim();
    }
    
    // Не записываем пустую строку (защита от затирания)
    if (strContext === '') return;
    
    state.game.meta.metaContext = strContext;
    saveStateToLocalStorage();
  },

  /**
   * Обновляет aiMemory ТОЛЬКО если значение НЕ пустое (защита от затирания).
   */
  updateAiMemory: (newValue) => {
    const normalized = Parser.normalizeComplexField(newValue, 'aiMemory');
    if (normalized !== null) {
        state.game.currentScene.aiMemory = JSON.parse(JSON.stringify(normalized));
        saveStateToLocalStorage();
        stateObserver.notify(STATE_EVENTS.GAME_CHANGED, { aiMemoryUpdated: true });
    }
  },

  /**
   * Обновляет meta_context ТОЛЬКО если значение НЕ пустое (защита от затирания).
   */
  updateMetaContext: (newValue) => {
    const normalized = Parser.normalizeComplexField(newValue, 'meta_context');
    if (normalized !== null) {
        state.game.meta.metaContext = JSON.parse(JSON.stringify(normalized));
        saveStateToLocalStorage();
        stateObserver.notify(STATE_EVENTS.GAME_CHANGED, { metaContextUpdated: true });
    }
  },

  /**
   * Сохраняет неизвестные корневые поля (возвращаются обратно в промпт).
   */
  mergeExtraRootData: (extraObj) => {
    if (extraObj && typeof extraObj === 'object' && Object.keys(extraObj).length > 0) {
        state.game.meta.extraRootData = {
            ...state.game.meta.extraRootData,
            ...JSON.parse(JSON.stringify(extraObj))
        };
        saveStateToLocalStorage();
    }
  },

  /**
   * Помечает, что начальные game_items[] уже применены (однократно).
   */
  markInitialGameItemsApplied: () => {
    state.game.meta.initialGameItemsApplied = true;
    saveStateToLocalStorage();
  },

  getMetaContext: () => state.game.meta.metaContext ? JSON.parse(JSON.stringify(state.game.meta.metaContext)) : null,
  getExtraRootData: () => JSON.parse(JSON.stringify(state.game.meta.extraRootData || {})),

  // ========== ДАННЫЕ НЕИЗВЕСТНЫХ ПОЛЕЙ ==========
  addUnknownField: (field) => {
    state.game.meta.unknownFields.push(field);
    saveStateToLocalStorage();
  },
  addUnknownArray: (arr) => {
    state.game.meta.unknownArrays.push(arr);
    saveStateToLocalStorage();
  },
  addUnknownObject: (obj) => {
    state.game.meta.unknownObjects.push(obj);
    saveStateToLocalStorage();
  },

  // ========== ДЕФОЛТНЫЕ ЗНАЧЕНИЯ ==========
  getDefaultHeroState: () => JSON.parse(JSON.stringify(DEFAULT_HERO_ITEMS)),

  isImmortal: () => state.hero.immortal
};