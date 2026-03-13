// Модуль 7.1: API REQUEST - Построение и отправка запросов (v5.1)
// АДАПТИРОВАН ПОД СТРУКТУРУ STATE 5.1
'use strict';

import { CONFIG } from './1-config.js';
import { State } from './3-state.js';
import { PROMPTS } from './prompts.js';

// ============================================================================
// КОНСТРУКТОР СИСТЕМНОГО ПРОМПТА
// ============================================================================

/**
 * Конструирует системный промпт в зависимости от типа игры:
 * - 'standard'  → универсальный + контекст мира ОТО
 * - другие      → универсальный (без дополнительного контекста)
 * + добавляет metaContext из состояния, если есть
 * + добавляет сохранённые неизвестные корневые поля
 */
function constructFullSystemPrompt(state) {
    let prompt;
    if (state.game.type === 'standard') {
        prompt = PROMPTS.standardGameOTO.system.gameMaster;
    } else {
        prompt = PROMPTS.system.gameMaster; // универсальный ГМ
    }
    
    // Мета-контекст от гейм-мастера (если предоставлялся)
    if (state.game.meta?.metaContext) {
        // Убеждаемся, что это строка (на случай, если что-то пошло не так)
        const metaContext = typeof state.game.meta.metaContext === 'string'
            ? state.game.meta.metaContext
            : JSON.stringify(state.game.meta.metaContext);
        prompt += `\n\n### МЕТА-КОНТЕКСТ\n${metaContext}`;
    }

    // Добавляем сохранённые неизвестные корневые поля
    const extraRoot = State.getExtraRootData();
    if (Object.keys(extraRoot).length > 0) {
        prompt += `\n\n=== СОХРАНЁННЫЕ НЕИЗВЕСТНЫЕ КОРНЕВЫЕ ПОЛЯ (ОБЯЗАТЕЛЬНО СОХРАНЯЙ И УЧИТЫВАЙ) ===\n${JSON.stringify(extraRoot, null, 2)}`;
    }
    
    return prompt;
}

// ============================================================================
// ДИНАМИЧЕСКИЕ ИНЪЕКЦИИ
// ============================================================================

function getDynamicSystemInjections(state) {
  const injections = [];
  const turn = state.game.turnCount; // было state.turnCount
  
  if (turn > 0 && turn % 15 === 0) {
    injections.push(`>>> [TURN ${turn}] ${PROMPTS.injections.twist}`);
  }
  
  const sanityItem = State.getGameItem('stat:sanity');
  if (sanityItem && sanityItem.value < 20) {
    injections.push(`>>> [LOW SANITY: ${sanityItem.value}] ${PROMPTS.injections.insanity}`);
  }
  
  // Ритуал теперь в state.hero.ritual.active
  if (state.game.type === 'standard' && state.hero.ritual.active) {
    injections.push(PROMPTS.injections.otoRitual);
  }
  
  const heroOrgs = State.getHeroOrganizations();
  if (heroOrgs.length >= 2) {
    injections.push(`>>> [${heroOrgs.length} ORGS] ${PROMPTS.injections.organizationConflict}`);
  }
  
  injections.push(PROMPTS.injections.coreMovement);
  
  return injections.join('\n');
}

// ============================================================================
// ПОСТРОЕНИЕ КОНТЕКСТА
// ============================================================================

/**
 * Обрезает HTML-текст сцены до краткого читаемого отрывка для использования в качестве замены summary.
 */
function truncateScene(text, maxChars = 400) {
  if (!text) return '(нет текста)';
  const stripped = text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  if (stripped.length <= maxChars) return stripped;
  return stripped.substring(0, maxChars) + '…';
}

/**
 * Собирает контекстный блок для user-промпта.
 *
 * ОПТИМИЗАЦИЯ ТОКЕНОВ:
 * - Старые ходы истории → только summary (или усечённый текст до 400 символов)
 * - Последний ход истории → полный текст (важно для непрерывности)
 * - Текущая сцена передаётся отдельно и всегда полностью
 */
function buildContextBlock(state) {
  const parts = [];
  
  // А. Глобальная летопись (теперь в state.game.summary)
  if (state.game.summary?.length > 0) {
    parts.push(`### ГЛОБАЛЬНАЯ ЛЕТОПИСЬ\n${state.game.summary}`);
  }
  
  // Б. Память гейм-мастера (state.game.currentScene.aiMemory)
  if (state.game.currentScene.aiMemory && Object.keys(state.game.currentScene.aiMemory).length > 0) {
    parts.push(`### ПАМЯТЬ ГЕЙМ-МАСТЕРА\n${JSON.stringify(state.game.currentScene.aiMemory, null, 2)}`);
  }
  
  // В. Иерархии организаций героя (через State API)
  const heroOrgHierarchies = State.getHeroOrganizationHierarchies();
  if (Object.keys(heroOrgHierarchies).length > 0) {
    const hierarchiesText = Object.entries(heroOrgHierarchies)
      .map(([orgId, hierarchy]) => `organization_rank_hierarchy:${orgId}: ${JSON.stringify(hierarchy)}`)
      .join('\n');
    parts.push(`### ИЕРАРХИИ ОРГАНИЗАЦИЙ ГЕРОЯ\n${hierarchiesText}`);
  }
  
  // Г. История (state.game.history)
  const turnsToTake = state.game.summary ?
    CONFIG.activeContextTurns :
    CONFIG.fullTurnsToSendInContext;
  const historySlice = state.game.history.slice(-turnsToTake);
  
  if (historySlice.length > 0) {
    const historyString = historySlice.map((entry, idx) => {
      const isLast = idx === historySlice.length - 1;
      const choiceText = entry.actionResults ?
        entry.actionResults.map(a => `${a.text}${a.success ? '' : ' ❌'}`).join(' | ') :
        (entry.choice || '—');
      
      // Старые ходы: только summary (или усечение)
      // Последний ход: полный текст для живого нарратива
      const sceneContent = isLast ?
        (entry.fullText || entry.summary || '(нет текста)') :
        (entry.summary || truncateScene(entry.fullText, 400));
      
      return `СЦЕНА: ${sceneContent}\nВЫБОР: ${choiceText}\n(Изменения: ${entry.changes || 'нет'})`;
    }).join('\n---\n');
    
    parts.push(`### ИСТОРИЯ (${historySlice.length} ходов)\n${historyString}`);
  }
  
  return parts.join('\n\n') || "История: Начало. Предыдущих событий нет.";
}

// ============================================================================
// ФОРМАТИРОВАНИЕ ДАННЫХ
// ============================================================================

function formatSelectedActionsForPrompt(selectedActions) {
  if (!selectedActions?.length) return "Действия не выбраны";
  return selectedActions.map(action => {
    if (action.difficulty_level === 0) {
      return `"${action.text}" → ❓ СВОБОДНЫЙ ВВОД (сложность не установлена): успех или провал - на усмотрение гейм-мастера, с учётом d10 и остальных характеристик состояния героя`;
    }
    const status = action.success ? '✅ УСПЕХ' :
      action.partial_success ? '⚠️ ЧАСТИЧНЫЙ УСПЕХ' :
      '❌ ПРОВАЛ';
    return `"${action.text}" → ${status} (Сложность: ${action.difficulty_level})`;
  }).join('\n');
}

function formatHeroStateForPrompt(heroItems) {
  if (!Array.isArray(heroItems) || heroItems.length === 0) {
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
  
  heroItems.forEach(item => {
    const [type] = item.id.split(':');
    let extra = '';
    if (item.description) extra += ` (${item.description})`;
    if (item.duration !== undefined) extra += ` [длит.: ${item.duration}]`;
    const line = `• ${item.id}: ${item.value}${extra}`;
    
    switch (type) {
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
  
  const labels = {
    stats: 'СТАТЫ',
    organizations: 'ОРГАНИЗАЦИИ',
    skills: 'НАВЫКИ',
    inventory: 'ИНВЕНТАРЬ',
    relations: 'ОТНОШЕНИЯ',
    buffs: 'БАФФЫ',
    debuffs: 'ДЕБАФФЫ',
    blessings: 'БЛАГОСЛОВЕНИЯ',
    curses: 'ПРОКЛЯТИЯ',
    other: 'ПРОЧЕЕ'
  };
  
  return Object.entries(sections)
    .filter(([, items]) => items.length > 0)
    .map(([key, items]) => `### ${labels[key]}:\n${items.join('\n')}`)
    .join('\n\n');
}

// ============================================================================
// СБОРКА PAYLOAD
// ============================================================================

function prepareRequestPayload(state, selectedActions, d10) {
  const systemPrompt = constructFullSystemPrompt(state);
  const contextBlock = buildContextBlock(state);
  const heroStateSummary = formatHeroStateForPrompt(state.hero.items); // было state.heroState
  const needsThoughts = State.needsHeroPhrases();
  const dynamicInjections = getDynamicSystemInjections(state);
  
  // Текущая сцена – в state.game.currentScene
  const sceneText = state.game.currentScene?.scene || 'Сцена отсутствует';
  
  const userPrompt = `${dynamicInjections}

### БРОСОК d10: ${d10}

### КОНТЕКСТ ИГРЫ:
${contextBlock}

### ТЕКУЩАЯ СЦЕНА:
${sceneText}

### СОСТОЯНИЕ ГЕРОЯ:
${heroStateSummary}

### ВЫБРАННЫЕ ДЕЙСТВИЯ:
${formatSelectedActionsForPrompt(selectedActions)}
${needsThoughts ? '\n### Сгенерируй 10+ мыслей героя (thoughts).' : ''}

### Продолжи игру — верни валидный JSON.`;
  
  return {
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt }
    ],
    model: state.settings.model,
    temperature: 0.9,
    max_tokens: 20000
  };
}

// ============================================================================
// HTTP ЗАПРОС (УЛУЧШЕННОЕ ЛОГГИРОВАНИЕ)
// ============================================================================

async function executeFetchRaw(url, headers, payload, abortController) {
  // Логируем детали запроса
  const logHeaders = { ...headers };
  if (logHeaders.Authorization) logHeaders.Authorization = 'Bearer [HIDDEN]';
  console.log(`🚀 [API] Запрос к ${url}`, {
    method: 'POST',
    headers: logHeaders,
    body: JSON.stringify(payload).substring(0, 200) + '...',
    model: payload.model
  });
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
      signal: abortController?.signal ?? null
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ HTTP ${response.status}:`, errorText);
      const error = new Error(`HTTP Error ${response.status}: ${errorText}`);
      error.rawResponse = errorText;
      error.status = response.status;
      error.requestDetails = { url, method: 'POST', headers: logHeaders, payload };
      throw error;
    }
    
    const rawText = await response.text();
    console.log(`✅ [API] Получено ${rawText.length} символов`);
    return rawText;
    
  } catch (error) {
    // Если ошибка сети (fetch не выполнился), добавляем информацию
    if (!error.rawResponse) {
      error.rawResponse = `Network error: ${error.message}`;
    }
    if (!error.requestDetails) {
      error.requestDetails = { url, method: 'POST', headers: logHeaders, payload };
    }
    console.error('🔥 Ошибка запроса:', error.message, error.requestDetails);
    throw error;
  }
}

// ============================================================================
// ЭКСПОРТ
// ============================================================================

export const API_Request = {
  constructFullSystemPrompt,
  getDynamicSystemInjections,
  buildContextBlock,
  formatSelectedActionsForPrompt,
  formatHeroStateForPrompt,
  prepareRequestPayload,
  executeFetchRaw
};