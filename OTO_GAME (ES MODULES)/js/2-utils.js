// Модуль 2: UTILS - Вспомогательные функции (2-utils.js)
// ИСПРАВЛЕННАЯ ВЕРСИЯ: Усилена устойчивость к ошибкам в парсинге JSON.
// - В robustJsonParse каждый шаг агрессивного извлечения обёрнут в try...catch,
//   чтобы ошибка в одном поле не прерывала извлечение других.
// - В extractOperations добавлена обработка ошибок при парсинге отдельных операций.
// - В extractValueByKey добавлены проверки и защита от исключений.
// - Добавлены комментарии, поясняющие устойчивость.
// - Исправление: safeParseAIResponse больше не возвращает дефолтную сцену.

'use strict';

import { CONFIG } from './1-config.js';

// Категории обрабатываемых game_item:
const GAME_ITEM_CATEGORIES = {
  STAT: 'stat',
  SKILL: 'skill',
  INVENTORY: 'inventory',
  RELATIONS: 'relations',
  ORGANIZATION: 'organization',
  BLESSING: 'bless',
  CURSE: 'curse',
  BUFF: 'buff',
  DEBUFF: 'debuff',
  PERSONALITY: 'personality',
  PROGRESS: 'progress'
};

function getRussianStatName(key) {
  const map = {
    'will': 'Воля',
    'stealth': 'Скрытность',
    'influence': 'Влияние',
    'sanity': 'Разум'
  };
  return map[key] || key;
}

/**
 * Получает иконку для типа игрового предмета
 * @param {string} itemId - Идентификатор предмета (например, 'stat:will')
 * @returns {string} Emoji-иконка
 */
function getGameItemIcon(itemId) {
  if (!itemId) return '📌';
  
  const type = itemId.split(':')[0];
  const icons = {
    'stat': '📊',
    'skill': '📜',
    'inventory': '🎒',
    'relations': '👤',
    'bless': '✨',
    'curse': '💀',
    'buff': '⬆️',
    'debuff': '⬇️',
    'initiation_degree': '🎓',
    'progress': '📈',
    'personality': '🧠',
    'effect': '⚡',
    'status': '🔘',
    'ability': '💫',
    'trait': '🎭',
    'item': '🎁',
    'ritual': '🕯️',
    'knowledge': '📚',
    'secret': '🔐',
    'location': '📍',
    'event': '📅',
    'quest': '🎯',
    'achievement': '🏆',
    'reputation': '⭐',
    'currency': '💰',
    'resource': '⛏️',
    'weapon': '⚔️',
    'armor': '🛡️',
    'potion': '🧪',
    'scroll': '📜',
    'key': '🔑',
    'map': '🗺️',
    'tool': '🔧'
  };
  
  return icons[type] || '📌';
}

function categorizeGameItem(id) {
  if (!id || typeof id !== 'string') return null;
  
  const [category] = id.split(':');
  
  // Специальная обработка организаций
  if (category === 'organization_rank') return GAME_ITEM_CATEGORIES.ORGANIZATION;
  
  // Для остальных - первая часть
  const categoryMap = {
    'stat': GAME_ITEM_CATEGORIES.STAT,
    'skill': GAME_ITEM_CATEGORIES.SKILL,
    'inventory': GAME_ITEM_CATEGORIES.INVENTORY,
    'relations': GAME_ITEM_CATEGORIES.RELATIONS,
    'bless': GAME_ITEM_CATEGORIES.BLESSING,
    'curse': GAME_ITEM_CATEGORIES.CURSE,
    'buff': GAME_ITEM_CATEGORIES.BUFF,
    'debuff': GAME_ITEM_CATEGORIES.DEBUFF,
    'personality': GAME_ITEM_CATEGORIES.PERSONALITY,
    'progress': GAME_ITEM_CATEGORIES.PROGRESS
  };
  
  return categoryMap[category] || null;
}

function getOperationDetails(operation) {
  const category = categorizeGameItem(operation.id);
  const [type, name] = operation.id.split(':');
  
  return {
    category,
    type,
    name,
    operation: operation.operation,
    value: operation.value,
    delta: operation.delta
  };
}

// ============================================================================
// НОВЫЙ МЕТОД: Безопасный вызов jsonrepair (глобальная библиотека)
// ============================================================================

/**
 * Безопасно вызывает глобальную функцию jsonrepair для исправления битого JSON.
 * @param {string} text - Исходный текст JSON
 * @returns {string|null} Исправленный текст или null, если библиотека недоступна или ремонт не удался
 */
function safeJsonRepair(text) {
  if (typeof window !== 'undefined' && typeof window.jsonrepair === 'function') {
    try {
      const repaired = window.jsonrepair(text);
      console.log(`✅ [jsonrepair] Успешно восстановлен JSON (было ${text.length} символов, стало ${repaired.length})`);
      return repaired;
    } catch (e) {
      console.warn(`⚠️ [jsonrepair] Не удалось восстановить JSON: ${e.message}`);
      return null;
    }
  }
  console.warn('⚠️ [jsonrepair] Библиотека jsonrepair не доступна в глобальной области');
  return null;
}

/**
 * УЛУЧШЕННАЯ ВЕРСИЯ: Пытается починить обрезанный JSON (Auto-Heal)
 * Восстанавливает закрывающие кавычки и скобки, включая обрезанные строки в массивах.
 * @param {string} text - Битая JSON строка
 * @returns {string} - Потенциально валидная JSON строка
 */
function repairTruncatedJSON(text) {
  let repaired = text.trim();
  
  console.log(`🔧 [JSON Repair] Начинаем ремонт JSON (длина: ${repaired.length} символов)`);
  
  // 1. Убираем возможные markdown обертки
  repaired = repaired.replace(/^```json\s*/i, '').replace(/\s*```$/i, '');
  repaired = repaired.replace(/^```\s*/i, '').replace(/\s*```$/i, '');
  
  // 2. Проверяем, не обрывается ли JSON в середине строки
  let inString = false;
  let escapeNext = false;
  let lastQuoteIndex = -1;
  
  for (let i = 0; i < repaired.length; i++) {
    const char = repaired[i];
    
    if (escapeNext) {
      escapeNext = false;
      continue;
    }
    
    if (char === '\\') {
      escapeNext = true;
      continue;
    }
    
    if (char === '"') {
      inString = !inString;
      lastQuoteIndex = i;
    }
  }
  
  // Если мы закончили внутри строки, закрываем её
  if (inString) {
    console.log('⚠️ [JSON Repair] Обнаружена незакрытая строка, закрываем');
    repaired += '"';
  }
  
  // 3. Балансируем скобки
  let openCurly = 0,
    closeCurly = 0;
  let openSquare = 0,
    closeSquare = 0;
  inString = false;
  escapeNext = false;
  
  for (let i = 0; i < repaired.length; i++) {
    const char = repaired[i];
    
    if (escapeNext) {
      escapeNext = false;
      continue;
    }
    
    if (char === '\\') {
      escapeNext = true;
      continue;
    }
    
    if (char === '"') {
      inString = !inString;
      continue;
    }
    
    if (!inString) {
      if (char === '{') openCurly++;
      if (char === '}') closeCurly++;
      if (char === '[') openSquare++;
      if (char === ']') closeSquare++;
    }
  }
  
  console.log(`📊 [JSON Repair] Баланс скобок: { ${openCurly}/${closeCurly} } [ ${openSquare}/${closeSquare} ]`);
  
  // 4. Удаляем "висячие" запятые и незакрытые конструкции перед добавлением скобок
  // Ищем последнюю запятую вне строки
  let lastCommaIndex = -1;
  inString = false;
  escapeNext = false;
  
  for (let i = repaired.length - 1; i >= 0; i--) {
    const char = repaired[i];
    
    if (!inString && char === ',') {
      lastCommaIndex = i;
      break;
    }
    
    if (char === '"' && !escapeNext) {
      inString = !inString;
    }
    
    escapeNext = (char === '\\' && !escapeNext);
  }
  
  // Если последняя запятая находится близко к концу (в пределах 50 символов), удаляем её
  if (lastCommaIndex > 0 && (repaired.length - lastCommaIndex) < 50) {
    const afterComma = repaired.substring(lastCommaIndex + 1).trim();
    // Проверяем, что после запятой нет значимого контента
    if (!afterComma || afterComma.match(/^[\s\}\]]*$/)) {
      console.log('⚠️ [JSON Repair] Удаляем висячую запятую');
      repaired = repaired.substring(0, lastCommaIndex) + repaired.substring(lastCommaIndex + 1);
    }
  }
  
  // 5. Закрываем массивы (сначала массивы, потом объекты - важно!)
  if (openSquare > closeSquare) {
    const missing = openSquare - closeSquare;
    console.log(`🔧 [JSON Repair] Добавляем ${missing} закрывающих скобок для массивов`);
    repaired += ']'.repeat(missing);
    closeSquare = openSquare;
  }
  
  // 6. Закрываем объекты
  if (openCurly > closeCurly) {
    const missing = openCurly - closeCurly;
    console.log(`🔧 [JSON Repair] Добавляем ${missing} закрывающих скобок для объектов`);
    repaired += '}'.repeat(missing);
    closeCurly = openCurly;
  }
  
  // 7. Финальная очистка - удаляем дублирующиеся закрывающие скобки
  let cleaned = '';
  let prevChar = '';
  for (let i = 0; i < repaired.length; i++) {
    const char = repaired[i];
    // Не добавляем дублирующиеся } или ]
    if ((char === '}' && prevChar === '}') || (char === ']' && prevChar === ']')) {
      continue;
    }
    cleaned += char;
    prevChar = char;
  }
  
  console.log(`✅ [JSON Repair] Ремонт завершён (новая длина: ${cleaned.length} символов)`);
  return cleaned;
}

/**
 * МАКСИМАЛЬНО АГРЕССИВНЫЙ ПАРСИНГ: Извлекает любые данные из ответа ИИ,
 * даже если JSON полностью разрушен. Каждый шаг обёрнут в try...catch,
 * чтобы ошибка в одном поле не прерывала извлечение других.
 * @param {string} rawContent - Сырой текст ответа
 * @returns {Object} Объект с извлечёнными полями (scene, choices, events, ...)
 */
function robustJsonParse(rawContent) {
  if (!rawContent || typeof rawContent !== 'string') {
    throw new Error('Пустой ответ от ИИ');
  }
  
  let text = rawContent.trim();
  
  // Удаляем markdown-обёртки
  text = text.replace(/^```json\s*/i, '').replace(/\s*```$/i, '');
  text = text.replace(/^```\s*/i, '').replace(/\s*```$/i, '');
  
  console.log(`📝 [Robust Parse v2] Попытка парсинга JSON (длина: ${text.length} символов)`);
  
  // ---------- УРОВЕНЬ 1: Стандартный парсинг ----------
  try {
    const result = JSON.parse(text);
    console.log('✅ [Robust Parse v2] Стандартный JSON.parse успешен');
    return result; // Если повезло – сразу отдаём
  } catch (e) {
    console.warn(`⚠️ [Robust Parse v2] Стандартный парсинг не удался: ${e.message}`);
  }
  
  // ---------- УРОВЕНЬ 2: Парсинг с предварительным ремонтом ----------
  try {
    const repaired = repairTruncatedJSON(text);
    const result = JSON.parse(repaired);
    console.log('✅ [Robust Parse v2] Парсинг после ремонта успешен');
    return result;
  } catch (e) {
    console.warn(`⚠️ [Robust Parse v2] Парсинг после ремонта не удался: ${e.message}`);
  }
  
  // ---------- УРОВЕНЬ 3: Агрессивное извлечение через регулярные выражения ----------
  console.warn('🚨 [Robust Parse v2] Переход к агрессивному извлечению данных');
  
  const result = {
    design_notes: "",
    scene: "",
    reflection: "",
    typology: "",
    choices: [],
    events: [],
    aiMemory: {},
    thoughts: [],
    summary: "",
    _organizationsHierarchy: {} // Специальное поле для иерархий
  };
  
  // 3.1. Извлечение scene (самое важное)
  try {
    const sceneMatch = text.match(/"scene"\s*:\s*"((?:[^"\\]|\\.)*?)"/s) ||
      text.match(/"scene"\s*:\s*"([^"]*)/s);
    if (sceneMatch && sceneMatch[1]) {
      result.scene = sceneMatch[1]
        .replace(/\\"/g, '"')
        .replace(/\\n/g, '\n')
        .replace(/\\t/g, '\t')
        .replace(/\\r/g, '\r')
        .replace(/\\\\/g, '\\');
      console.log(`✅ [Robust Parse v2] Scene извлечена (длина: ${result.scene.length})`);
    }
  } catch (e) {
    console.warn('⚠️ [Robust Parse v2] Ошибка при извлечении scene:', e.message);
  }
  
  // 3.2. Извлечение текстовых полей (design_notes, reflection, typology, summary)
  const extractTextField = (fieldName) => {
    try {
      const pattern = new RegExp(`"${fieldName}"\\s*:\\s*"((?:[^"\\\\]|\\\\.)*?)"`, 's');
      const match = text.match(pattern);
      if (match && match[1]) {
        return match[1]
          .replace(/\\"/g, '"')
          .replace(/\\n/g, '\n')
          .replace(/\\t/g, '\t')
          .replace(/\\r/g, '\r')
          .replace(/\\\\/g, '\\');
      }
    } catch (e) {
      console.warn(`⚠️ [Robust Parse v2] Ошибка при извлечении поля ${fieldName}:`, e.message);
    }
    return "";
  };
  
  result.design_notes = extractTextField('design_notes');
  result.reflection = extractTextField('reflection');
  result.typology = extractTextField('typology');
  result.summary = extractTextField('summary');
  
  // 3.3. Извлечение choices (даже из разрушенного массива)
  console.log('🔍 [Robust Parse v2] Извлечение choices...');
  try {
    // Ищем все объекты, похожие на choice, содержащие "text"
    const choiceObjectPattern = /{(?:[^{}]|{(?:[^{}]|{[^{}]*})*})*?"text"\s*:\s*"[^"]*"[^}]*}/gs;
    let choiceMatch;
    while ((choiceMatch = choiceObjectPattern.exec(text)) !== null) {
      try {
        const choiceStr = choiceMatch[0];
        // Пытаемся распарсить как полноценный JSON
        let choiceObj;
        try {
          choiceObj = JSON.parse(choiceStr);
        } catch (e) {
          // Если не получается, вытягиваем поля по одному
          choiceObj = {};
          const textMatch = choiceStr.match(/"text"\s*:\s*"((?:[^"\\]|\\.)*?)"/);
          if (textMatch) choiceObj.text = textMatch[1].replace(/\\"/g, '"').replace(/\\n/g, '\n');
          
          const difficultyMatch = choiceStr.match(/"difficulty_level"\s*:\s*(\d+)/);
          if (difficultyMatch) choiceObj.difficulty_level = parseInt(difficultyMatch[1], 10);
          
          // requirements – может быть массивом строк
          const reqMatch = choiceStr.match(/"requirements"\s*:\s*\[(.*?)\]/s);
          if (reqMatch) {
            const items = reqMatch[1].match(/"([^"]+)"/g);
            if (items) choiceObj.requirements = items.map(s => s.replace(/"/g, ''));
          }
          
          // success_rewards – операции
          choiceObj.success_rewards = extractOperations(choiceStr, 'success_rewards');
          choiceObj.fail_penalties = extractOperations(choiceStr, 'fail_penalties');
        }
        if (choiceObj.text) {
          // Нормализуем
          result.choices.push({
            text: choiceObj.text,
            difficulty_level: typeof choiceObj.difficulty_level === 'number' ?
              Math.max(1, Math.min(10, choiceObj.difficulty_level)) : 5,
            requirements: Array.isArray(choiceObj.requirements) ?
              choiceObj.requirements.filter(r => typeof r === 'string' && r.includes(':')) : [],
            success_rewards: Array.isArray(choiceObj.success_rewards) ?
              choiceObj.success_rewards.filter(op => op && op.operation && op.id) : [],
            fail_penalties: Array.isArray(choiceObj.fail_penalties) ?
              choiceObj.fail_penalties.filter(op => op && op.operation && op.id) : []
          });
        }
      } catch (e) {
        console.warn('⚠️ [Robust Parse v2] Ошибка обработки choice:', e.message);
      }
    }
  } catch (e) {
    console.warn('⚠️ [Robust Parse v2] Ошибка при извлечении массива choices:', e.message);
  }
  console.log(`✅ [Robust Parse v2] Извлечено ${result.choices.length} choices`);
  
  // 3.4. Извлечение events
  console.log('🔍 [Robust Parse v2] Извлечение events...');
  try {
    const eventObjectPattern = /{(?:[^{}]|{(?:[^{}]|{[^{}]*})*})*?"type"\s*:\s*"[^"]*"[^}]*}/gs;
    let eventMatch;
    while ((eventMatch = eventObjectPattern.exec(text)) !== null) {
      try {
        const eventStr = eventMatch[0];
        let eventObj;
        try {
          eventObj = JSON.parse(eventStr);
        } catch (e) {
          eventObj = {};
          const typeMatch = eventStr.match(/"type"\s*:\s*"((?:[^"\\]|\\.)*?)"/);
          if (typeMatch) eventObj.type = typeMatch[1].replace(/\\"/g, '"');
          
          const descMatch = eventStr.match(/"description"\s*:\s*"((?:[^"\\]|\\.)*?)"/);
          if (descMatch) eventObj.description = descMatch[1].replace(/\\"/g, '"').replace(/\\n/g, '\n');
          
          const reasonMatch = eventStr.match(/"reason"\s*:\s*"((?:[^"\\]|\\.)*?)"/);
          if (reasonMatch) eventObj.reason = reasonMatch[1].replace(/\\"/g, '"');
          
          eventObj.effects = extractOperations(eventStr, 'effects');
        }
        if (eventObj.description) {
          result.events.push({
            type: eventObj.type || "world_event",
            description: eventObj.description,
            effects: Array.isArray(eventObj.effects) ?
              eventObj.effects.filter(op => op && op.operation && op.id) : [],
            reason: eventObj.reason || ""
          });
        }
      } catch (e) {
        console.warn('⚠️ [Robust Parse v2] Ошибка обработки event:', e.message);
      }
    }
  } catch (e) {
    console.warn('⚠️ [Robust Parse v2] Ошибка при извлечении массива events:', e.message);
  }
  console.log(`✅ [Robust Parse v2] Извлечено ${result.events.length} events`);
  
  // 3.5. Извлечение thoughts
  console.log('🔍 [Robust Parse v2] Извлечение thoughts...');
  try {
    const thoughtsMatch = text.match(/"thoughts"\s*:\s*\[(.*?)\]/s);
    if (thoughtsMatch) {
      const thoughtsStr = thoughtsMatch[1];
      const thoughtMatches = thoughtsStr.match(/"((?:[^"\\]|\\.)*?)"/g);
      if (thoughtMatches) {
        result.thoughts = thoughtMatches
          .map(s => s.replace(/^"|"$/g, '').replace(/\\"/g, '"').replace(/\\n/g, '\n'))
          .filter(t => t.trim().length > 0)
          .slice(0, 20);
      }
    }
    // Если не нашли через массив, ищем отдельные строки-кандидаты
    if (result.thoughts.length < 3) {
      const thoughtCandidates = text.match(/"((?:[^"\\]|\\.){20,}?)"/g);
      if (thoughtCandidates) {
        result.thoughts = thoughtCandidates
          .map(s => s.replace(/^"|"$/g, '').replace(/\\"/g, '"').replace(/\\n/g, '\n'))
          .filter(t => t.length > 20 && t.length < 300 && /[.!?;:]$/.test(t))
          .slice(0, 10);
      }
    }
  } catch (e) {
    console.warn('⚠️ [Robust Parse v2] Ошибка при извлечении thoughts:', e.message);
  }
  console.log(`✅ [Robust Parse v2] Извлечено ${result.thoughts.length} thoughts`);
  
  // 3.6. Извлечение aiMemory (объект, массив или строка)
  try {
    const possibleKeys = ['aiMemory', 'ai_memory', 'aimemory'];
    let memoryValue = null;
    for (const k of possibleKeys) {
      memoryValue = extractValueByKey(text, k);
      if (memoryValue !== null) break;
    }
    if (memoryValue !== null) {
      result.aiMemory = memoryValue;
      console.log('✅ [Robust Parse v2] Извлечена aiMemory');
    } else {
      console.warn('⚠️ [Robust Parse v2] Ключ aiMemory не найден');
    }
  } catch (e) {
    console.warn('⚠️ [Robust Parse v2] Ошибка при извлечении aiMemory:', e.message);
  }
  
  // 3.7. Извлечение иерархий организаций
  try {
    const orgHierarchyPattern = /"(organization_rank_hierarchy:[^"]+)"\s*:\s*(\{(?:[^{}]|{[^{}]*})*\})/gs;
    let orgMatch;
    while ((orgMatch = orgHierarchyPattern.exec(text)) !== null) {
      try {
        const key = orgMatch[1];
        const valueStr = orgMatch[2];
        const hierarchy = JSON.parse(valueStr);
        if (hierarchy && hierarchy.value && hierarchy.description) {
          result._organizationsHierarchy[key.split(':')[1]] = {
            id: key,
            value: hierarchy.value,
            description: hierarchy.description
          };
        }
      } catch (e) {
        console.warn(`⚠️ [Robust Parse v2] Ошибка извлечения иерархии: ${e.message}`);
      }
    }
  } catch (e) {
    console.warn('⚠️ [Robust Parse v2] Ошибка при извлечении иерархий организаций:', e.message);
  }
  
  // 3.8. Если сцена не найдена, но есть какой-то текст – используем его как сцену
  if (!result.scene && text.length > 100) {
    // Возможно, это просто текст сцены без JSON-обёртки
    result.scene = text.replace(/\\n/g, '\n').replace(/\\"/g, '"');
    console.log('⚠️ [Robust Parse v2] Использован весь текст как сцена');
  }
  
  // Добавляем дефолтные choices, если пусто
  if (result.choices.length === 0) {
    console.warn('⚠️ [Robust Parse v2] Choices пуст, добавляем дефолтные');
    result.choices = createDefaultChoices(); // функция из 7-2-api-response или своя
  }
  
  // Добавляем дефолтные thoughts, если мало
  if (result.thoughts.length < 5) {
    console.warn(`⚠️ [Robust Parse v2] Мало thoughts (${result.thoughts.length}), добавляем дефолтные`);
    const defaultThoughts = [
      "Что здесь происходит?",
      "Нужно разобраться в ситуации",
      "Каждое решение имеет последствия",
      "Я чувствую странное напряжение",
      "Что-то здесь не так"
    ];
    result.thoughts = result.thoughts.concat(defaultThoughts).slice(0, 10);
  }
  
  // Генерируем summary, если пустой
  if (!result.summary && result.scene) {
    result.summary = result.scene.replace(/<[^>]*>/g, ' ').substring(0, 200).trim() + '...';
  }
  
  console.log('✅ [Robust Parse v2] Агрессивное извлечение завершено');
  console.log(`📊 [Robust Parse v2] Результат: scene=${!!result.scene}, choices=${result.choices.length}, events=${result.events.length}, thoughts=${result.thoughts.length}`);
  
  return result;
}

/**
 * Извлекает значение (объект, массив или строку) по ключу из текста, содержащего JSON.
 * Учитывает вложенность и экранированные кавычки.
 * @param {string} text - весь текст (предположительно JSON)
 * @param {string} key - имя ключа (например "aiMemory")
 * @returns {any|null} распарсенное значение или null, если ключ не найден
 */
function extractValueByKey(text, key) {
  try {
    // Ищем ключ с двоеточием, пропуская пробелы
    const keyPattern = new RegExp(`"${key}"\\s*:`);
    const match = keyPattern.exec(text);
    if (!match) return null;
    
    const startIdx = match.index + match[0].length; // позиция после двоеточия
    let pos = startIdx;
    
    // Пропускаем пробельные символы
    while (pos < text.length && /\s/.test(text[pos])) pos++;
    
    if (pos >= text.length) return null;
    
    const firstChar = text[pos];
    
    // Обработка в зависимости от первого символа значения
    if (firstChar === '{') {
      // Извлекаем сбалансированный объект
      let braceCount = 1;
      let inString = false;
      let escape = false;
      let endPos = pos + 1;
      while (endPos < text.length) {
        const ch = text[endPos];
        if (escape) {
          escape = false;
        } else if (ch === '\\') {
          escape = true;
        } else if (ch === '"') {
          inString = !inString;
        } else if (!inString) {
          if (ch === '{') braceCount++;
          else if (ch === '}') {
            braceCount--;
            if (braceCount === 0) break;
          }
        }
        endPos++;
      }
      if (braceCount !== 0) return null; // не сбалансировано
      const valueStr = text.substring(pos, endPos + 1);
      try {
        return JSON.parse(valueStr);
      } catch {
        return valueStr; // возвращаем как строку, если не распарсилось
      }
    } else if (firstChar === '[') {
      // Извлекаем сбалансированный массив
      let bracketCount = 1;
      let inString = false;
      let escape = false;
      let endPos = pos + 1;
      while (endPos < text.length) {
        const ch = text[endPos];
        if (escape) {
          escape = false;
        } else if (ch === '\\') {
          escape = true;
        } else if (ch === '"') {
          inString = !inString;
        } else if (!inString) {
          if (ch === '[') bracketCount++;
          else if (ch === ']') {
            bracketCount--;
            if (bracketCount === 0) break;
          }
        }
        endPos++;
      }
      if (bracketCount !== 0) return null;
      const valueStr = text.substring(pos, endPos + 1);
      try {
        return JSON.parse(valueStr);
      } catch {
        return valueStr;
      }
    } else if (firstChar === '"') {
      // Извлекаем строку до следующей неэкранированной кавычки
      let inString = true;
      let escape = false;
      let endPos = pos + 1;
      while (endPos < text.length) {
        const ch = text[endPos];
        if (escape) {
          escape = false;
        } else if (ch === '\\') {
          escape = true;
        } else if (ch === '"') {
          break;
        }
        endPos++;
      }
      const valueStr = text.substring(pos, endPos + 1);
      try {
        return JSON.parse(valueStr);
      } catch {
        return valueStr.replace(/^"|"$/g, ''); // возвращаем строку без кавычек
      }
    } else {
      // Число, true, false, null – читаем до разделителя
      const valueMatch = text.slice(pos).match(/^(true|false|null|-?\d+(\.\d+)?([eE][+-]?\d+)?)/);
      if (valueMatch) {
        const val = valueMatch[0];
        try {
          return JSON.parse(val);
        } catch {
          return val;
        }
      }
    }
  } catch (e) {
    console.warn(`⚠️ [extractValueByKey] Ошибка при извлечении ключа ${key}:`, e.message);
  }
  return null;
}

/**
 * Вспомогательная функция для извлечения массива операций (effects, success_rewards, fail_penalties)
 * из строки, содержащей фрагмент JSON.
 */
function extractOperations(text, arrayName) {
  const result = [];
  try {
    const pattern = new RegExp(`"${arrayName}"\\s*:\\s*\\[(.*?)\\]`, 's');
    const match = text.match(pattern);
    if (!match) return [];
    
    const operationsStr = match[1];
    // Ищем объекты операций в этом массиве
    const opPattern = /{(?:[^{}]|{[^{}]*})*?}/g;
    let opMatch;
    while ((opMatch = opPattern.exec(operationsStr)) !== null) {
      try {
        const op = JSON.parse(opMatch[0]);
        if (op.operation && op.id) {
          result.push(op);
        }
      } catch (e) {
        // Если не удалось распарсить, пробуем вытянуть поля
        try {
          const opText = opMatch[0];
          const operationMatch = opText.match(/"operation"\s*:\s*"([^"]+)"/);
          const idMatch = opText.match(/"id"\s*:\s*"([^"]+)"/);
          const valueMatch = opText.match(/"value"\s*:\s*(\d+|"[^"]*")/);
          const deltaMatch = opText.match(/"delta"\s*:\s*(-?\d+)/);
          if (operationMatch && idMatch) {
            const opObj = {
              operation: operationMatch[1],
              id: idMatch[1]
            };
            if (valueMatch) {
              // Если значение в кавычках – строка, иначе число
              if (valueMatch[1].startsWith('"')) {
                opObj.value = valueMatch[1].replace(/^"|"$/g, '');
              } else {
                opObj.value = parseInt(valueMatch[1], 10);
              }
            }
            if (deltaMatch) opObj.delta = parseInt(deltaMatch[1], 10);
            result.push(opObj);
          }
        } catch (e2) {
          // Игнорируем окончательно
        }
      }
    }
  } catch (e) {
    console.warn(`⚠️ [extractOperations] Ошибка при извлечении массива ${arrayName}:`, e.message);
  }
  return result;
}

function createDefaultChoice() {
  return {
    text: "Продолжить...",
    difficulty_level: 5,
    requirements: [],
    success_rewards: [],
    fail_penalties: []
  };
}

/**
 * Безопасный парсинг ответа ИИ
 * Обертка над robustJsonParse с дополнительным извлечением фраз
 * @param {string} text - Текст ответа ИИ
 * @returns {Object} Распарсенные данные
 * @throws {Error} Если парсинг полностью провалился (нет сцены)
 */
function safeParseAIResponse(text) {
  try {
    const data = robustJsonParse(text);
    
    // Попытка извлечь фразы, если их нет в основном объекте
    if (!data.thoughtsOfHero || data.thoughtsOfHero.length === 0) {
      const extraPhrases = parseHeroPhrases(text);
      if (extraPhrases.length > 0) {
        data.thoughtsOfHero = extraPhrases;
      }
    }
    
    // Проверяем наличие сцены – если её нет, данные бесполезны
    if (!data.scene) {
      throw new Error('Отсутствует поле scene');
    }
    
    return data;
  } catch (mainError) {
    console.error('❌ Критическая ошибка парсинга ответа ИИ:', mainError);
    // ВАЖНО: больше не возвращаем дефолтную сцену, а пробрасываем исключение,
    // чтобы вышестоящий код мог показать модальное окно с ошибкой.
    throw new Error(`Не удалось распарсить ответ ИИ: ${mainError.message}`);
  }
}

/**
 * Получение иконки статуса
 * @param {string} status - Статус (success, error, pending)
 * @returns {string} Emoji иконка
 */
function getStatusEmoji(status) {
  return status === 'success' ? '✅' : status === 'error' ? '❌' : '⏳';
}

/**
 * Форматирование деталей ошибки
 * @param {Error|string|Object} error - Объект ошибки
 * @returns {string} Форматированное описание ошибки
 */
function formatErrorDetails(error) {
  if (!error) return "Нет информации об ошибке";
  
  let details = "";
  
  if (error instanceof Error) {
    details += `Сообщение: ${error.message}\n\n`;
    details += `Тип: ${error.name}\n\n`;
    
    if (error.stack) {
      details += `Стек вызовов:\n${error.stack}\n\n`;
    }
    
    if (error.code) {
      details += `Код ошибки: ${error.code}\n\n`;
    }
  } else if (typeof error === 'string') {
    details = error;
  } else if (typeof error === 'object') {
    try {
      details = JSON.stringify(error, null, 2);
    } catch (e) {
      details = String(error);
    }
  } else {
    details = String(error);
  }
  
  return details;
}

/**
 * Экспорт данных в файл (автоматическое скачивание)
 * @param {string} data - Данные для экспорта
 * @param {string} filename - Имя файла
 * @param {string} type - MIME тип файла
 */
function exportToFile(data, filename, type = 'application/json') {
  const blob = new Blob([data], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Генерация уникального ID
 * @returns {string} Уникальный идентификатор
 */
function generateUniqueId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

/**
 * Получение московского времени
 * @returns {Date} Дата в московском часовом поясе
 */
function getMoscowTime() {
  const now = new Date();
  try {
    return new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Moscow' }));
  } catch (e) {
    return now;
  }
}

/**
 * Форматирование московского времени
 * @param {Date} date - Дата для форматирования
 * @returns {string} Отформатированная строка времени
 */
function formatMoscowTime(date) {
  const moscowTime = getMoscowTime();
  return moscowTime.toLocaleString('ru-RU', {
    timeZone: 'Europe/Moscow',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
}

/**
 * Нормализация названий характеристик
 * @param {string} key - Ключ характеристики
 * @returns {string|null} Нормализованный ключ или null
 */
function normalizeStatKey(key) {
  if (!key) return null;
  const lowerKey = key.toLowerCase().trim();
  return CONFIG.statAliases[lowerKey] ||
    (CONFIG.startStats.hasOwnProperty(lowerKey) ? lowerKey : null);
}

/**
 * Выбор файла (работает на телефонах и ПК)
 * @param {string} accept - Тип принимаемых файлов
 * @returns {Promise<File|null>} Выбранный файл или null
 */
function selectFile(accept = '.json') {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = accept;
    input.style.display = 'none';
    
    input.onchange = function(e) {
      const file = e.target.files[0];
      resolve(file);
      document.body.removeChild(input);
    };
    
    input.oncancel = function() {
      resolve(null);
      document.body.removeChild(input);
    };
    
    document.body.appendChild(input);
    input.click();
  });
}

/**
 * Выбор папки (через input с атрибутом webkitdirectory)
 * @returns {Promise<Object|null>} Объект с файлами и путем к папке
 */
function selectFolder() {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.webkitdirectory = true;
    input.multiple = true;
    input.style.display = 'none';
    
    input.onchange = function(e) {
      const files = Array.from(e.target.files);
      const folderPath = files.length > 0 ?
        files[0].webkitRelativePath.split('/')[0] : null;
      
      resolve({
        files: files,
        folderPath: folderPath
      });
      document.body.removeChild(input);
    };
    
    input.oncancel = function() {
      resolve(null);
      document.body.removeChild(input);
    };
    
    document.body.appendChild(input);
    input.click();
  });
}

/**
 * Сохранение файла с выбором папки
 * @param {string} data - Данные для сохранения
 * @param {string} defaultFileName - Имя файла по умолчанию
 * @param {string} fileType - MIME тип файла
 * @returns {Promise<Object>} Результат сохранения
 */
async function saveFileWithFolderPicker(data, defaultFileName, fileType = 'application/json') {
  try {
    if ('showSaveFilePicker' in window) {
      const options = {
        suggestedName: defaultFileName,
        types: [{
          description: 'JSON файл',
          accept: { 'application/json': ['.json'] }
        }]
      };
      
      const fileHandle = await window.showSaveFilePicker(options);
      const writable = await fileHandle.createWritable();
      await writable.write(data);
      await writable.close();
      return { success: true, fileName: fileHandle.name };
    }
  } catch (error) {
    console.log('File System Access API не поддерживается или отменено:', error);
  }
  
  exportToFile(data, defaultFileName, fileType);
  return { success: true, fileName: defaultFileName };
}

/**
 * Вибрация (поддержка мобильных устройств)
 * @param {number|Array} pattern - Паттерн вибрации
 */
function vibrate(pattern) {
  if (navigator.vibrate && pattern) {
    try {
      navigator.vibrate(pattern);
    } catch (e) {
      console.log('Vibration not supported');
    }
  }
}

/**
 * Улучшенный парсинг фраз героя из ответа модели
 * @param {string} text - Текст ответа ИИ
 * @returns {Array<string>} Массив фраз героя
 */
function parseHeroPhrases(text) {
  if (!text || typeof text !== 'string') return [];
  
  try {
    const jsonMatch = text.match(/\{.*"thoughtsOfHero".*\}/s);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0]);
        if (parsed.thoughtsOfHero && Array.isArray(parsed.thoughtsOfHero)) {
          return parsed.thoughtsOfHero;
        }
      } catch (jsonError) {
        // Ignore
      }
    }
    
    const lines = text.split('\n');
    const phraseCandidates = lines
      .map(line => line.trim())
      .filter(line => {
        return line.length >= 20 &&
          line.length <= 300 &&
          !line.includes('{') &&
          !line.includes('}') &&
          !line.includes('"scene"') &&
          !line.includes('"choices"') &&
          !line.includes('json') &&
          /[.!?;:]$/.test(line);
      });
    
    if (phraseCandidates.length >= 3) {
      return phraseCandidates.slice(0, 10);
    }
    
    return [];
  } catch (e) {
    return [];
  }
}

/**
 * Декодирует Unicode escape-последовательности в читаемые символы
 * @param {string} text - Текст с escape-последовательностями
 * @returns {string} Декодированный текст
 */
function decodeUnicodeEscapes(text) {
  if (!text || typeof text !== 'string') return text;
  
  return text.replace(/\\u[\dA-F]{4}/gi, function(match) {
      try {
        return String.fromCharCode(parseInt(match.replace(/\\u/g, ''), 16));
      } catch (e) {
        return match;
      }
    }).replace(/\\n/g, '\n')
    .replace(/\\r/g, '\r')
    .replace(/\\t/g, '\t')
    .replace(/\\"/g, '"')
    .replace(/\\\\/g, '\\');
}

/**
 * Предварительная обработка JSON: экранирует неэкранированные символы внутри строк
 * @param {string} jsonText - JSON текст
 * @returns {string} Обработанный JSON текст
 */
function preprocessJson(jsonText) {
  let result = '';
  let inString = false;
  let escapeNext = false;
  
  for (let i = 0; i < jsonText.length; i++) {
    const char = jsonText[i];
    
    if (escapeNext) {
      result += char;
      escapeNext = false;
      continue;
    }
    
    if (char === '\\') {
      escapeNext = true;
      result += char;
      continue;
    }
    
    if (char === '"') {
      inString = !inString;
      result += char;
      continue;
    }
    
    if (inString) {
      // Экранируем проблемные символы
      if (char === '\n') {
        result += '\\n';
      } else if (char === '\r') {
        result += '\\r';
      } else if (char === '\t') {
        result += '\\t';
      } else if (char === '"') {
        result += '\\"';
      } else if (char === '\\') {
        result += '\\\\';
      } else {
        result += char;
      }
    } else {
      result += char;
    }
  }
  
  return result;
}

/**
 * Безопасное форматирование JSON с отказоустойчивостью
 * @param {string} jsonString - JSON строка
 * @returns {string} Безопасно отформатированная строка
 */
function safeFormatJsonWithUnicode(jsonString) {
  if (!jsonString) return '';
  
  try {
    // Сначала декодируем Unicode escapes
    const decoded = decodeUnicodeEscapes(jsonString);
    
    // Пытаемся распарсить JSON
    try {
      const obj = JSON.parse(decoded);
      return JSON.stringify(obj, null, 2);
    } catch (parseError) {
      // Если не JSON, возвращаем декодированный текст
      console.warn('⚠️ Не удалось распарсить JSON, возвращаем декодированный текст');
      return decoded;
    }
  } catch (e) {
    // В случае полного провала возвращаем исходную строку
    console.error('❌ Ошибка безопасного форматирования JSON:', e);
    return String(jsonString);
  }
}

/**
 * Красиво форматирует JSON с декодированием Unicode
 * @param {string} jsonString - JSON строка
 * @returns {string} Форматированная и декодированная строка
 */
function formatJsonWithUnicode(jsonString) {
  if (!jsonString) return '';
  
  try {
    // Сначала декодируем Unicode escapes
    const decoded = decodeUnicodeEscapes(jsonString);
    
    // Пытаемся распарсить JSON
    const obj = JSON.parse(decoded);
    
    // Форматируем с красивыми отступами
    return JSON.stringify(obj, null, 2);
  } catch (e) {
    // Если не JSON, возвращаем декодированный текст
    return decodeUnicodeEscapes(jsonString);
  }
}


/**
 * Экранирует HTML-спецсимволы для безопасной вставки в DOM.
 * @param {string} unsafe - Неэкранированная строка
 * @returns {string} Экранированная строка
 */
function escapeHtml(unsafe) {
  if (unsafe === null || unsafe === undefined) {
    return '';
  }
  return String(unsafe)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;'); // апостроф (важно для атрибутов)
}

/**
 * Показывает всплывающее уведомление (toast)
 * @param {string} message - Сообщение для показа
 * @param {string} type - Тип уведомления: 'success', 'error', 'warning', 'info'
 * @param {number} duration - Время показа в миллисекундах
 */
function showToast(message, type = 'info', duration = 3000) {
  try {
    // Удаляем существующие toast, чтобы не накапливались
    const existingToasts = document.querySelectorAll('.utils-toast');
    existingToasts.forEach(toast => {
      if (toast.parentNode) {
        document.body.removeChild(toast);
      }
    });
    
    // Создаем новый toast элемент
    const toast = document.createElement('div');
    toast.className = `utils-toast utils-toast-${type}`;
    toast.textContent = message;
    
    // Устанавливаем стили
    const toastStyles = `
            .utils-toast {
                position: fixed;
                top: 20px;
                right: 20px;
                padding: 12px 20px;
                border-radius: 5px;
                z-index: 999999;
                font-size: 0.9em;
                font-weight: 500;
                color: #fff;
                background: #333;
                box-shadow: 0 4px 12px rgba(0,0,0,0.3);
                max-width: 400px;
                word-wrap: break-word;
                opacity: 0;
                transform: translateY(-20px);
                transition: all 0.3s cubic-bezier(0.68, -0.55, 0.27, 1.55);
                backdrop-filter: blur(5px);
                border: 1px solid rgba(255,255,255,0.1);
            }
            
            .utils-toast-success {
                background: linear-gradient(135deg, #4cd137 0%, #2d8b57 100%);
                border-color: #4cd137;
            }
            
            .utils-toast-error {
                background: linear-gradient(135deg, #e84118 0%, #c23616 100%);
                border-color: #e84118;
            }
            
            .utils-toast-warning {
                background: linear-gradient(135deg, #fbc531 0%, #e1b12c 100%);
                border-color: #fbc531;
                color: #333;
            }
            
            .utils-toast-info {
                background: linear-gradient(135deg, #3498db 0%, #2980b9 100%);
                border-color: #3498db;
            }
            
            .utils-toast::before {
                content: '';
                position: absolute;
                top: 0;
                left: 0;
                width: 5px;
                height: 100%;
                border-radius: 5px 0 0 5px;
            }
            
            .utils-toast-success::before {
                background: #fff;
            }
            
            .utils-toast-error::before {
                background: #fff;
            }
            
            .utils-toast-warning::before {
                background: #333;
            }
            
            .utils-toast-info::before {
                background: #fff;
            }
            
            @keyframes utils-toast-show {
                0% {
                    opacity: 0;
                    transform: translateY(-20px);
                }
                100% {
                    opacity: 1;
                    transform: translateY(0);
                }
            }
            
            @keyframes utils-toast-hide {
                0% {
                    opacity: 1;
                    transform: translateY(0);
                }
                100% {
                    opacity: 0;
                    transform: translateY(-20px);
                }
            }
        `;
    
    // Добавляем стили, если их еще нет
    if (!document.getElementById('utils-toast-styles')) {
      const styleEl = document.createElement('style');
      styleEl.id = 'utils-toast-styles';
      styleEl.textContent = toastStyles;
      document.head.appendChild(styleEl);
    }
    
    // Добавляем иконку в зависимости от типа
    let icon = 'ℹ️';
    switch (type) {
      case 'success':
        icon = '✅';
        break;
      case 'error':
        icon = '❌';
        break;
      case 'warning':
        icon = '⚠️';
        break;
      case 'info':
        icon = 'ℹ️';
        break;
    }
    
    toast.innerHTML = `
            <div style="display: flex; align-items: center; gap: 8px;">
                <span style="font-size: 1.1em;">${icon}</span>
                <span>${message}</span>
            </div>
        `;
    
    // Добавляем в DOM
    document.body.appendChild(toast);
    
    // Анимация появления
    setTimeout(() => {
      toast.style.animation = 'utils-toast-show 0.3s forwards';
      toast.style.opacity = '1';
      toast.style.transform = 'translateY(0)';
    }, 10);
    
    // Автоматическое скрытие через указанное время
    const hideToast = () => {
      toast.style.animation = 'utils-toast-hide 0.3s forwards';
      setTimeout(() => {
        if (toast.parentNode) {
          document.body.removeChild(toast);
        }
      }, 300);
    };
    
    // Устанавливаем таймер скрытия
    const timer = setTimeout(hideToast, duration);
    
    // Закрытие по клику
    toast.onclick = () => {
      clearTimeout(timer);
      hideToast();
    };
    
    // Возвращаем объект для ручного управления
    return {
      element: toast,
      hide: hideToast,
      updateMessage: (newMessage) => {
        const textSpan = toast.querySelector('span:last-child');
        if (textSpan) {
          textSpan.textContent = newMessage;
        }
      },
      updateType: (newType) => {
        const classList = toast.classList;
        classList.remove('utils-toast-success', 'utils-toast-error', 'utils-toast-warning', 'utils-toast-info');
        classList.add(`utils-toast-${newType}`);
        
        // Обновляем иконку
        let newIcon = 'ℹ️';
        switch (newType) {
          case 'success':
            newIcon = '✅';
            break;
          case 'error':
            newIcon = '❌';
            break;
          case 'warning':
            newIcon = '⚠️';
            break;
          case 'info':
            newIcon = 'ℹ️';
            break;
        }
        
        const iconSpan = toast.querySelector('span:first-child');
        if (iconSpan) {
          iconSpan.textContent = newIcon;
        }
      }
    };
    
  } catch (error) {
    console.error('❌ Ошибка при показе toast-уведомления:', error);
    // Резервный вариант - простой alert
    alert(`${type.toUpperCase()}: ${message}`);
  }
}

/**
 * Проверяет, является ли переданное значение "пустым".
 * Для JSON это означает:
 * - null или undefined
 * - пустая строка (или строка из пробелов)
 * - пустой массив
 * - пустой объект (без собственных перечислимых свойств)
 * @param {*} value - Проверяемое значение
 * @returns {boolean} true, если значение пустое, иначе false
 */
function isEmpty(value) {
  // null и undefined считаются пустыми
  if (value === null || value === undefined) return true;
  
  // Строка: пустая или только пробелы
  if (typeof value === 'string') return value.trim() === '';
  
  // Массив: длина 0
  if (Array.isArray(value)) return value.length === 0;
  
  // Объект (в т.ч. экземпляры классов): нет собственных перечислимых свойств
  if (typeof value === 'object') {
    // Обратите внимание: для Date, RegExp и т.п. Object.keys() тоже вернёт пустой массив,
    // но такие объекты редко встречаются в JSON. Если нужно отличать их от простых объектов,
    // можно добавить проверку конструктора, но в рамках JSON это избыточно.
    return Object.keys(value).length === 0;
  }
  
  // Все остальные типы (number, boolean, function, symbol, bigint) считаются "не пустыми"
  return false;
}

// Публичный интерфейс модуля
export const Utils = {
  repairTruncatedJSON,
  robustJsonParse,
  safeJsonRepair,
  getStatusEmoji,
  getGameItemIcon,
  getRussianStatName,
  formatErrorDetails,
  exportToFile,
  generateUniqueId,
  getMoscowTime,
  formatMoscowTime,
  normalizeStatKey,
  selectFile,
  selectFolder,
  saveFileWithFolderPicker,
  vibrate,
  parseHeroPhrases,
  safeParseAIResponse,
  decodeUnicodeEscapes,
  safeFormatJsonWithUnicode,
  formatJsonWithUnicode,
  escapeHtml,
  getOperationDetails,
  showToast,
  isEmpty
};