// Модуль 7.1: API REQUEST - Построение и отправка запросов (ФОРМАТ 4.1)
'use strict';

import { CONFIG } from './1-config.js';
import { State } from './3-state.js';
import { PROMPTS } from './prompts.js';

// ============================================================================
// КОНСТРУКТОР ПОЛНОГО СИСТЕМНОГО ПРОМПТА
// ============================================================================

/**
 * Конструирует полный системный промт на основе типа игры
 * @param {Object} state - Текущее состояние игры
 * @returns {string} Полный системный промт для отправки в API
 */
function constructFullSystemPrompt(state) {
  // Определяем основной системный промпт в зависимости от типа игры
  const mainSystemPrompt = state.gameType === 'standard' 
    ? PROMPTS.standardGameOTO.system.gameMaster 
    : PROMPTS.system.gameMaster;

  // Собираем полный системный промт из модульных компонентов
  /*
  ### РАСЧЁТ УСПЕХА/ПРОВАЛА ДЕЙСТВИЯ:
${PROMPTS.calculationsExplanation}
  */
  const fullSystemPrompt = `
${mainSystemPrompt}

${PROMPTS.corePrinciples}

${PROMPTS.absoluteProhibitions}

${PROMPTS.fundamentalProtocols}

${PROMPTS.heroStateDescription}

### ПРОТОКОЛ РАБОТЫ С ОРГАНИЗАЦИЯМИ И РАНГАМИ:
${PROMPTS.organizationsProtocol}

### ТИПЫ GAME_ITEM И ИХ ФОРМАТЫ:
${PROMPTS.gameItemProtocol}

### ОПЕРАЦИИ НАД GAME_ITEM:
${PROMPTS.operationsProtocol}

### СТРУКТУРА CHOICE (ВАРИАНТА ВЫБОРА):
${PROMPTS.choicesProtocol}

### СТРУКТУРА EVENT (СОБЫТИЯ):
${PROMPTS.eventsProtocol}

### ПОШАГОВЫЙ АЛГОРИТМ ГЕНЕРАЦИИ ОТВЕТА:
${PROMPTS.workflowAlgorithm}

### ПРОВЕРОЧНЫЙ СПИСОК:
${PROMPTS.validationChecklist}

### ФОРМАТ ВХОДНЫХ ДАННЫХ:
${PROMPTS.inputFormat}

### ФОРМАТ ВЫХОДНЫХ ДАННЫХ:
${PROMPTS.outputFormat}

### СТРУКТУРА JSON ОТВЕТА:
${PROMPTS.jsonStructure}

### ПРИМЕР CHOICE СО ВСЕМИ ТИПАМИ ТРЕБОВАНИЙ:
${PROMPTS.exampleChoiceWithAllTypes}

### ЧАСТЫЕ ОШИБКИ:
${PROMPTS.commonErrors}`;

  return fullSystemPrompt;
}

// ============================================================================
// ДИНАМИЧЕСКИЕ ИНЪЕКЦИИ ДЛЯ ФОРМАТА 4.1
// ============================================================================

/**
 * Формирует динамические системные инъекции на основе текущего состояния игры
 * @param {Object} state - Текущее состояние игры
 * @returns {string} Динамические инъекции для промпта
 */
function getDynamicSystemInjections(state) {
  const injections = [];
  const turn = state.turnCount;
  
  // 1. ИНЪЕКЦИЯ СЮЖЕТНОГО ПОВОРОТА (каждые 10 ходов)
  if (turn > 0 && turn % 10 === 0) {
    console.log(`🌀 [Client Director] Turn ${turn}: Injecting Narrative Twist.`);
    injections.push(`>>> [TRIGGER: TURN ${turn}] ${PROMPTS.injections.twist}`);
  }
  
  // 2. ИНЪЕКЦИЯ БЕЗУМИЯ (при низком уровне рассудка)
  const sanityItem = State.getGameItem('stat:sanity');
  if (sanityItem && sanityItem.value < 20) {
    console.log(`🌀 [Client Director] Sanity Low (${sanityItem.value}): Injecting Insanity.`);
    injections.push(`>>> [TRIGGER: LOW SANITY] ${PROMPTS.injections.insanity}`);
  }
  
  // 3. ИНЪЕКЦИЯ ЗАЩИТЫ ОТ СЮЖЕТНЫХ ПЕТЕЛЬ
  if (state.gameState.history.length > 0) {
    const lastHistory = state.gameState.history[state.gameState.history.length - 1];
    const lastSceneText = lastHistory.fullText || '';
    const currentSceneText = state.gameState.currentScene.scene || '';
    const comparisonLength = 50;
    
    if (lastSceneText.length >= comparisonLength && currentSceneText.length >= comparisonLength) {
      const startOfLastScene = lastSceneText.substring(0, comparisonLength).trim();
      const startOfCurrentScene = currentSceneText.substring(0, comparisonLength).trim();
      
      if (startOfLastScene === startOfCurrentScene ||
          lastSceneText.includes(startOfCurrentScene) ||
          currentSceneText.includes(startOfLastScene))
      {
        console.log(`🌀 [Client Director] Loop/Repetition Detected: Injecting Anti-Loop.`);
        injections.push(`>>> [TRIGGER: LOOP DETECTED] ${PROMPTS.injections.antiLoop}`);
      }
    }
  }
  
  // 4. ИНЪЕКЦИЯ РИТУАЛА (только для стандартной игры О.Т.О.)
  if (state.gameType === 'standard' && state.isRitualActive) {
    console.log(`🕯️ [Client Director] RITUAL MODE ACTIVE (О.Т.О.).`);
    injections.push(PROMPTS.injections.otoRitual);
  }
  
  // 5. ИНЪЕКЦИЯ КОНФЛИКТА ОРГАНИЗАЦИЙ (если игрок состоит в конфликтующих организациях)
  const heroOrganizations = State.getHeroOrganizations();
  if (heroOrganizations.length >= 2) {
    console.log(`🏛️ [Client Director] Player in ${heroOrganizations.length} organizations.`);
    injections.push(`>>> [TRIGGER: MULTIPLE ORGANIZATIONS] ${PROMPTS.injections.organizationConflict}`);
  }
  
  // 6. БАЗОВЫЕ ИНСТРУКЦИИ (всегда добавляются)
  injections.push(PROMPTS.injections.coreMovement);
  
  // 7. УКАЗАНИЕ ТИПА ИГРЫ (для лучшего понимания контекста ИИ)
  if (state.gameType === 'standard') {
    injections.push(`>>> [КОНТЕКСТ ИГРЫ: Стандартная игра "Орден О.Т.О."]`);
  } else {
    injections.push(`>>> [КОНТЕКСТ ИГРЫ: Кастомный сценарий]`);
  }
  
  return injections.join('\n\n');
}

// ============================================================================
// КОНТЕКСТ И ПОДГОТОВКА ЗАПРОСА
// ============================================================================

/**
 * Собирает блок контекста для USER-промпта из истории и состояния игры
 * @param {Object} state - Текущее состояние игры
 * @returns {string} Отформатированный блок контекста
 */
function buildContextBlock(state) {
  let parts = [];
  
  // А. ГЛОБАЛЬНАЯ ЛЕТОПИСЬ (общая сводка сюжета)
  if (state.gameState.summary && state.gameState.summary.length > 0) {
    parts.push(`### ГЛОБАЛЬНАЯ ЛЕТОПИСЬ\n${state.gameState.summary}`);
  }
  
  // Б. ДИНАМИЧЕСКАЯ ПАМЯТЬ ИИ (aiMemory) - контекст для Гейм-мастера
  if (state.gameState.aiMemory && Object.keys(state.gameState.aiMemory).length > 0) {
    const memoryForPrompt = { ...state.gameState.aiMemory };
    // Убедимся, что gameType есть в памяти ИИ
    if (!memoryForPrompt.gameType) {
      memoryForPrompt.gameType = state.gameType;
    }
    parts.push(`### ТВОЯ ДИНАМИЧЕСКАЯ ПАМЯТЬ ГЕЙМ-МАСТЕРА\n${JSON.stringify(memoryForPrompt, null, 2)}`);
  }
  
  // В. ИЕРАРХИИ ОРГАНИЗАЦИЙ, В КОТОРЫХ СОСТОИТ ГЕРОЙ (НОВОЕ)
  const heroOrganizationHierarchies = State.getHeroOrganizationHierarchies();
  if (Object.keys(heroOrganizationHierarchies).length > 0) {
    const hierarchiesText = Object.entries(heroOrganizationHierarchies).map(([orgId, hierarchy]) => {
      return `organization_rank_hierarchy:${orgId}: ${JSON.stringify(hierarchy, null, 2)}`;
    }).join('\n\n');
    
    parts.push(`### ИЕРАРХИИ ОРГАНИЗАЦИЙ, В КОТОРЫХ СОСТОИТ ГЕРОЙ\n${hierarchiesText}`);
  }
  
  // Г. КРАТКОСРОЧНАЯ ИСТОРИЯ (последние ходы)
  const turnsToTake = state.gameState.summary ? CONFIG.activeContextTurns : CONFIG.historyContext;
  const historySlice = state.gameState.history.slice(-turnsToTake);
  
  if (historySlice.length > 0) {
    const historyString = historySlice.map(entry => {
      // Извлечение текста выбора из массива actionResults или fallback к старому полю choice
      const choiceText = entry.actionResults 
        ? entry.actionResults.map(a => `${a.text}${a.success ? '' : ' (Провал)'}`).join(', ') 
        : (entry.choice || 'Нет выбора');
        
      return `СЦЕНА: ${entry.fullText}\nВЫБОР: ${choiceText}\n(Изменения состояния: ${entry.changes || 'Нет явных изменений'})`;
    }).join('\n---\n');
    parts.push(`### КРАТКОСРОЧНАЯ ИСТОРИЯ (последние ${historySlice.length} ходов)\n${historyString}`);
  }
  
  return parts.length > 0 ? parts.join('\n\n') : "История: Это начало пути. Предыдущих событий нет.";
}

/**
 * Форматирует выбранные действия для отображения в промпте
 * @param {Array} selectedActions - Массив выбранных действий
 * @returns {string} Отформатированная строка с результатами действий
 */
function formatSelectedActionsForPrompt(selectedActions) {
  if (!selectedActions || selectedActions.length === 0) {
    return "Действия не выбраны";
  }
  
  return selectedActions.map(action => {
    const status = action.success ? '✅ УСПЕХ' :
      action.partial_success ? '⚠️ ЧАСТИЧНЫЙ УСПЕХ' : '❌ ПРОВАЛ';
    return `"${action.text}" → ${status} (Сложность: ${action.difficulty_level})`;
  }).join('\n');
}

/**
 * Форматирует состояние героя для промпта с учетом организаций
 * @param {Array} heroState - Массив game_items героя
 * @returns {string} Отформатированное состояние героя
 */
function formatHeroStateForPrompt(heroState) {
  if (!Array.isArray(heroState) || heroState.length === 0) {
    return "Состояние героя: Нет данных";
  }
  
  const sections = {
    stats: [],
    organizations: [],
    skills: [],
    inventory: [],
    relations: [],
    buffs: [],
    debuffs: [],
    blessings: [],
    curses: [],
    other: []
  };
  
  // Группируем game_items по типам
  heroState.forEach(item => {
    const [type] = item.id.split(':');
    
    let displayValue = item.value;
    let extraInfo = '';
    
    if (item.description) {
      extraInfo += ` (${item.description})`;
    }
    
    if (item.duration !== undefined) {
      extraInfo += ` [длительность: ${item.duration}]`;
    }
    
    const line = `• ${item.id}: ${displayValue}${extraInfo}`;
    
    switch(type) {
      case 'stat':
        sections.stats.push(line);
        break;
      case 'organization_rank':
        sections.organizations.push(line);
        break;
      case 'skill':
        sections.skills.push(line);
        break;
      case 'inventory':
        sections.inventory.push(line);
        break;
      case 'relations':
        sections.relations.push(line);
        break;
      case 'buff':
        sections.buffs.push(line);
        break;
      case 'debuff':
        sections.debuffs.push(line);
        break;
      case 'bless':
        sections.blessings.push(line);
        break;
      case 'curse':
        sections.curses.push(line);
        break;
      default:
        sections.other.push(line);
    }
  });
  
  // Собираем итоговый текст
  let result = '';
  
  if (sections.stats.length > 0) {
    result += `### ОСНОВНЫЕ ХАРАКТЕРИСТИКИ:\n${sections.stats.join('\n')}\n\n`;
  }
  
  if (sections.organizations.length > 0) {
    result += `### ОРГАНИЗАЦИИ И РАНГИ:\n${sections.organizations.join('\n')}\n\n`;
  }
  
  if (sections.skills.length > 0) {
    result += `### НАВЫКИ:\n${sections.skills.join('\n')}\n\n`;
  }
  
  if (sections.inventory.length > 0) {
    result += `### ИНВЕНТАРЬ:\n${sections.inventory.join('\n')}\n\n`;
  }
  
  if (sections.relations.length > 0) {
    result += `### ОТНОШЕНИЯ С ПЕРСОНАЖАМИ:\n${sections.relations.join('\n')}\n\n`;
  }
  
  if (sections.buffs.length > 0) {
    result += `### ВРЕМЕННЫЕ УСИЛЕНИЯ (БАФФЫ):\n${sections.buffs.join('\n')}\n\n`;
  }
  
  if (sections.debuffs.length > 0) {
    result += `### ВРЕМЕННЫЕ ОСЛАБЛЕНИЯ (ДЕБАФФЫ):\n${sections.debuffs.join('\n')}\n\n`;
  }
  
  if (sections.blessings.length > 0) {
    result += `### БЛАГОСЛОВЕНИЯ:\n${sections.blessings.join('\n')}\n\n`;
  }
  
  if (sections.curses.length > 0) {
    result += `### ПРОКЛЯТИЯ:\n${sections.curses.join('\n')}\n\n`;
  }
  
  if (sections.other.length > 0) {
    result += `### ДРУГОЕ:\n${sections.other.join('\n')}\n\n`;
  }
  
  return result.trim();
}

/**
 * Подготавливает полное тело запроса для формата 4.1
 * @param {Object} state - Текущее состояние игры
 * @param {Array} selectedActions - Выбранные игроком действия
 * @param {number} d10 - Результат броска d10 для хода
 * @returns {Object} Полный payload для отправки в API
 */
function prepareRequestPayload(state, selectedActions, d10) {
  // 1. Формируем ПОЛНЫЙ СИСТЕМНЫЙ ПРОМПТ
  const systemPromptFull = constructFullSystemPrompt(state);
  
  // 2. Формируем ПОЛЬЗОВАТЕЛЬСКИЙ ПРОМПТ
  const contextBlock = buildContextBlock(state);
  
  // Собираем геройское состояние в читаемом формате
  const heroStateSummary = formatHeroStateForPrompt(state.heroState);
  
  // Проверяем, нужно ли запросить новые "мысли героя"
  const needsHeroPhrases = State.needsHeroPhrases();
  
  // Получаем динамические инъекции на основе состояния игры
  const dynamicSystemPart = getDynamicSystemInjections(state);
  
  const userPrompt = `## ПРОМТ ПОЛЬЗОВАТЕЛЯ

${dynamicSystemPart}

### БРОСОК УДАЧИ НА ХОД:
d10 = ${d10}

### КОНТЕКСТ ИГРЫ:
${contextBlock}

### ТЕКУЩАЯ СЦЕНА:
${state.gameState.currentScene.scene}

### СОСТОЯНИЕ ГЕРОЯ (GAME_ITEMS):
${heroStateSummary}

### ВЫБРАННЫЕ ДЕЙСТВИЯ И ИХ РЕЗУЛЬТАТЫ:
${formatSelectedActionsForPrompt(selectedActions)}

${needsHeroPhrases ? '### ДОПОЛНИТЕЛЬНО: Пожалуйста, сгенерируй 10+ мыслей героя (thoughts).' : ''}


### ТРЕБОВАНИЯ К ОТВЕТУ:
Продолжи игру, сгенерировав валидный JSON, согласно инструкциям`;
  
  // 3. Формируем финальный payload
  return {
    messages: [
      { role: "system", content: systemPromptFull },
      { role: "user", content: userPrompt }
    ],
    model: state.settings.model,
    temperature: 0.9,
    max_tokens: 10000
  };
}

// ============================================================================
// HTTP-ЗАПРОСЫ И СЕТЕВЫЕ ОПЕРАЦИИ
// ============================================================================

/**
 * Выполняет сетевой запрос с повторными попытками при ошибках
 * @param {string} url - URL для запроса
 * @param {Object} headers - HTTP-заголовки
 * @param {Object} payload - Тело запроса
 * @param {AbortController} abortController - Контроллер для отмены запроса
 * @returns {Promise<Object>} Распарсенный JSON-ответ
 * @throws {Error} При превышении попыток или критической ошибке
 */
async function executeFetch(url, headers, payload, abortController) {
  const maxAttempts = CONFIG.maxRetries || 3;
  let lastError;
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const options = {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(payload)
      };
      
      if (abortController) {
        options.signal = abortController.signal;
      }
      
      const response = await fetch(url, options);
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP Error ${response.status}: ${errorText}`);
      }
      
      return await response.json();
    } catch (error) {
      lastError = error;
      
      if (error.name === 'AbortError') throw error;
      
      console.warn(`[API_Request] Попытка ${attempt}/${maxAttempts} не удалась: ${error.message}`);
      
      if (attempt < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, CONFIG.retryDelayMs));
      }
    }
  }
  
  throw lastError;
}

/**
 * Выполняет сетевой запрос и возвращает сырой текст ответа (без парсинга JSON)
 * @param {string} url - URL для запроса
 * @param {Object} headers - HTTP-заголовки
 * @param {Object} payload - Тело запроса
 * @param {AbortController} abortController - Контроллер для отмены запроса
 * @returns {Promise<string>} Сырой текст ответа (для аудита и отладки)
 * @throws {Error} При превышении попыток или критической ошибке
 */
async function executeFetchRaw(url, headers, payload, abortController) {
  const maxAttempts = CONFIG.maxRetries || 3;
  let lastError;
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const options = {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(payload)
      };
      
      if (abortController) {
        options.signal = abortController.signal;
      }
      
      const response = await fetch(url, options);
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP Error ${response.status}: ${errorText}`);
      }
      
      // Возвращаем сырой текст (важно для аудита)
      return await response.text();
      
    } catch (error) {
      lastError = error;
      
      if (error.name === 'AbortError') throw error;
      
      console.warn(`[API_Request] Попытка ${attempt}/${maxAttempts} не удалась: ${error.message}`);
      
      if (attempt < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, CONFIG.retryDelayMs));
      }
    }
  }
  
  throw lastError;
}

// ============================================================================
// ЭКСПОРТ ПУБЛИЧНОГО ИНТЕРФЕЙСА МОДУЛЯ
// ============================================================================

export const API_Request = {
  constructFullSystemPrompt,
  getDynamicSystemInjections,
  buildContextBlock,
  formatSelectedActionsForPrompt,
  formatHeroStateForPrompt,
  prepareRequestPayload,
  executeFetch,
  executeFetchRaw
};