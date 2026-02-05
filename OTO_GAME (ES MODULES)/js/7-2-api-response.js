// Модуль 7.2: API RESPONSE - Парсинг и Обработка ответов (ФОРМАТ 4.1)
// УЛУЧШЕННАЯ ВЕРСИЯ с максимально устойчивым парсингом и поддержкой организаций
'use strict';

import { CONFIG } from './1-config.js';
import { Utils } from './2-utils.js';
import { PROMPTS } from './prompts.js';

/**
 * НОВАЯ ФУНКЦИЯ: Извлекает organization_rank_hierarchy из ответа ИИ
 */
function extractOrganizationHierarchies(parsedData) {
  const hierarchies = {};
  
  console.log('🔍 Поиск иерархий организаций в ответе ИИ...');
  
  // Ищем все ключи, начинающиеся с organization_rank_hierarchy:
  for (const key in parsedData) {
    if (key.startsWith('organization_rank_hierarchy:')) {
      try {
        const hierarchy = parsedData[key];
        if (hierarchy && typeof hierarchy === 'object') {
          const orgId = key.split(':')[1];
          
          // Проверяем обязательные поля
          if (hierarchy.value && Array.isArray(hierarchy.description)) {
            // Нормализуем описание иерархии
            const normalizedDescription = hierarchy.description.map(item => {
              // Проверяем, что есть lvl и rank
              if (item && typeof item === 'object') {
                return {
                  lvl: typeof item.lvl === 'number' ? item.lvl : parseInt(item.lvl) || 0,
                  rank: item.rank || `Ранг ${item.lvl}`,
                  threshold: typeof item.threshold === 'number' ? item.threshold : (typeof item.lvl === 'number' ? item.lvl * 10 : 0)
                };
              }
              return null;
            }).filter(Boolean); // Удаляем null элементы
            
            if (normalizedDescription.length > 0) {
              hierarchies[orgId] = {
                id: key,
                value: hierarchy.value,
                description: normalizedDescription
              };
              console.log(`✅ Извлечена иерархия организации: ${orgId} (${normalizedDescription.length} рангов)`);
            } else {
              console.warn(`⚠️ Пустое описание иерархии для организации: ${orgId}`);
            }
          } else {
            console.warn(`⚠️ Некорректная структура иерархии для организации: ${orgId}`);
          }
        }
      } catch (error) {
        console.error(`❌ Ошибка обработки иерархии ${key}:`, error);
      }
    }
  }
  
  console.log(`✅ Извлечено иерархий организаций: ${Object.keys(hierarchies).length}`);
  return hierarchies;
}

/**
 * УЛУЧШЕННАЯ ФУНКЦИЯ: Безопасная нормализация одного choice с детальным логированием
 */
function normalizeChoice(choice, index) {
  if (!choice || typeof choice !== 'object') {
    console.warn(`⚠️ Choice ${index}: Некорректный объект, используем дефолт`);
    return {
      text: "Действие без описания",
      difficulty_level: 5,
      requirements: [],
      success_rewards: [],
      fail_penalties: []
    };
  }
  
  const normalized = {
    text: "",
    difficulty_level: 5,
    requirements: [],
    success_rewards: [],
    fail_penalties: []
  };
  
  // 1. TEXT (обязательное поле)
  if (typeof choice.text === 'string' && choice.text.trim().length > 0) {
    normalized.text = choice.text.trim();
  } else {
    console.warn(`⚠️ Choice ${index}: Отсутствует text, используем fallback`);
    normalized.text = `Действие ${index + 1}`;
  }
  
  // 2. DIFFICULTY_LEVEL
  if (typeof choice.difficulty_level === 'number') {
    normalized.difficulty_level = Math.max(1, Math.min(10, Math.round(choice.difficulty_level)));
  } else if (typeof choice.difficulty_level === 'string') {
    const parsed = parseInt(choice.difficulty_level, 10);
    if (!isNaN(parsed)) {
      normalized.difficulty_level = Math.max(1, Math.min(10, parsed));
    }
  }
  
  // 3. REQUIREMENTS (массив строк вида "id:value" или "id:operator:value")
  if (Array.isArray(choice.requirements)) {
    normalized.requirements = choice.requirements
      .filter(req => {
        if (typeof req === 'string') {
          // Проверяем формат requirements для организаций
          if (req.includes('organization_rank:')) {
            // Может быть "organization_rank:oto" или "organization_rank:oto>=3"
            return true;
          }
          // Для других типов требуется двоеточие
          return req.includes(':');
        }
        console.warn(`⚠️ Choice ${index}: Некорректный requirement "${req}", пропускаем`);
        return false;
      })
      .map(req => req.trim());
  } else if (choice.requirements) {
    console.warn(`⚠️ Choice ${index}: requirements не является массивом (${typeof choice.requirements}), пропускаем`);
  }
  
  // 4. SUCCESS_REWARDS (массив операций)
  if (Array.isArray(choice.success_rewards)) {
    normalized.success_rewards = normalizeOperations(choice.success_rewards, `Choice ${index} success_rewards`);
  } else if (choice.success_rewards) {
    console.warn(`⚠️ Choice ${index}: success_rewards не является массивом, пропускаем`);
  }
  
  // 5. FAIL_PENALTIES (массив операций)
  if (Array.isArray(choice.fail_penalties)) {
    normalized.fail_penalties = normalizeOperations(choice.fail_penalties, `Choice ${index} fail_penalties`);
  } else if (choice.fail_penalties) {
    console.warn(`⚠️ Choice ${index}: fail_penalties не является массивом, пропускаем`);
  }
  
  return normalized;
}

/**
 * УЛУЧШЕННАЯ ФУНКЦИЯ: Безопасная нормализация одного event
 */
function normalizeEvent(event, index) {
  if (!event || typeof event !== 'object') {
    console.warn(`⚠️ Event ${index}: Некорректный объект, пропускаем`);
    return null;
  }
  
  const normalized = {
    type: "world_event",
    description: "",
    effects: [],
    reason: ""
  };
  
  // 1. TYPE
  if (typeof event.type === 'string' && event.type.trim().length > 0) {
    normalized.type = event.type.trim();
  }
  
  // 2. DESCRIPTION (обязательное поле)
  if (typeof event.description === 'string' && event.description.trim().length > 0) {
    normalized.description = event.description.trim();
  } else {
    console.warn(`⚠️ Event ${index}: Отсутствует description, пропускаем event`);
    return null; // События без описания пропускаем
  }
  
  // 3. EFFECTS (массив операций)
  if (Array.isArray(event.effects)) {
    normalized.effects = normalizeOperations(event.effects, `Event ${index} effects`);
  }
  
  // 4. REASON
  if (typeof event.reason === 'string') {
    normalized.reason = event.reason.trim();
  }
  
  return normalized;
}

/**
 * НОВАЯ ФУНКЦИЯ: Универсальная нормализация массива операций (для rewards, penalties, effects)
 */
function normalizeOperations(operations, contextName) {
  if (!Array.isArray(operations)) {
    console.warn(`⚠️ ${contextName}: Не является массивом, возвращаем []`);
    return [];
  }
  
  const validOps = [];
  
  operations.forEach((op, idx) => {
    // Проверяем, что операция - это объект
    if (!op || typeof op !== 'object') {
      console.warn(`⚠️ ${contextName}[${idx}]: Не является объектом, пропускаем`);
      return;
    }
    
    // Проверяем обязательные поля: operation и id
    if (!op.operation || typeof op.operation !== 'string') {
      console.warn(`⚠️ ${contextName}[${idx}]: Отсутствует или некорректное поле "operation", пропускаем`);
      return;
    }
    
    if (!op.id || typeof op.id !== 'string') {
      console.warn(`⚠️ ${contextName}[${idx}]: Отсутствует или некорректное поле "id", пропускаем`);
      return;
    }
    
    // Создаем нормализованную операцию
    const normalizedOp = {
      operation: op.operation.trim().toUpperCase(),
      id: op.id.trim()
    };
    
    // Добавляем опциональные поля в зависимости от типа операции
    const opType = normalizedOp.operation;
    
    // Специальная обработка для organization_rank
    if (normalizedOp.id.startsWith('organization_rank:')) {
      // Для organization_rank требуем value для ADD/SET
      if ((opType === 'ADD' || opType === 'SET') && op.value === undefined) {
        console.warn(`⚠️ ${contextName}[${idx}]: Операция ${opType} для organization_rank без значения, пропускаем`);
        return;
      }
      
      // Для MODIFY требуем delta
      if (opType === 'MODIFY' && op.delta === undefined) {
        console.warn(`⚠️ ${contextName}[${idx}]: MODIFY для organization_rank без delta, пропускаем`);
        return;
      }
    }
    
    if (opType === 'ADD' || opType === 'SET') {
      // Для ADD и SET требуется value
      if (op.value !== undefined && op.value !== null) {
        normalizedOp.value = op.value;
      } else {
        console.warn(`⚠️ ${contextName}[${idx}]: Операция ${opType} без значения value, используем 0`);
        normalizedOp.value = 0;
      }
      
      // Опциональные поля
      if (op.description) normalizedOp.description = String(op.description);
      if (op.duration !== undefined) normalizedOp.duration = parseInt(op.duration, 10) || 0;
      if (op.max !== undefined) normalizedOp.max = parseInt(op.max, 10);
      if (op.min !== undefined) normalizedOp.min = parseInt(op.min, 10);
    }
    else if (opType === 'MODIFY') {
      // Для MODIFY требуется delta
      if (typeof op.delta === 'number') {
        normalizedOp.delta = op.delta;
      } else if (typeof op.delta === 'string') {
        const parsed = parseInt(op.delta, 10);
        if (!isNaN(parsed)) {
          normalizedOp.delta = parsed;
        } else {
          console.warn(`⚠️ ${contextName}[${idx}]: MODIFY с некорректным delta "${op.delta}", используем 0`);
          normalizedOp.delta = 0;
        }
      } else {
        console.warn(`⚠️ ${contextName}[${idx}]: MODIFY без delta, используем 0`);
        normalizedOp.delta = 0;
      }
      
      if (op.max !== undefined) normalizedOp.max = parseInt(op.max, 10);
      if (op.min !== undefined) normalizedOp.min = parseInt(op.min, 10);
    }
    else if (opType === 'REMOVE') {
      // Для REMOVE достаточно только operation и id
      // Никаких дополнительных полей не требуется
    }
    else {
      console.warn(`⚠️ ${contextName}[${idx}]: Неизвестный тип операции "${opType}", пропускаем`);
      return;
    }
    
    validOps.push(normalizedOp);
  });
  
  return validOps;
}

/**
 * УЛУЧШЕННАЯ ФУНКЦИЯ: Валидация и нормализация нового формата ответа (ФОРМАТ 4.1)
 * Максимально устойчивая к ошибкам - пропускаем битые элементы, сохраняем остальное
 */
function validateAndNormalizeResponse(parsedData) {
  if (!parsedData || typeof parsedData !== 'object') {
    throw new Error('Ответ ИИ пуст или не является объектом');
  }
  
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
    // НОВОЕ: храним извлеченные иерархии
    _organizationsHierarchy: {}
  };
  
  // 1. Извлекаем иерархии организаций
  result._organizationsHierarchy = extractOrganizationHierarchies(parsedData);
  
  // 2. DESIGN_NOTES (опциональное)
  if (typeof parsedData.design_notes === 'string') {
    result.design_notes = parsedData.design_notes;
  }
  
  // 3. SCENE (обязательное поле)
  if (!parsedData.scene || typeof parsedData.scene !== 'string') {
    throw new Error('Отсутствует или неверное поле "scene"');
  }
  result.scene = parsedData.scene;
  
  // 4. REFLECTION (опциональное)
  if (typeof parsedData.reflection === 'string') {
    result.reflection = parsedData.reflection;
  }
  
  // 5. TYPOLOGY (опциональное)
  if (typeof parsedData.typology === 'string') {
    result.typology = parsedData.typology;
  }
  
  // 6. CHOICES - МАКСИМАЛЬНО УСТОЙЧИВЫЙ ПАРСИНГ
  if (Array.isArray(parsedData.choices)) {
    console.log(`📋 Обработка ${parsedData.choices.length} choices...`);
    
    parsedData.choices.forEach((choice, idx) => {
      const normalized = normalizeChoice(choice, idx);
      if (normalized) {
        result.choices.push(normalized);
      }
    });
    
    console.log(`✅ Успешно обработано ${result.choices.length} из ${parsedData.choices.length} choices`);
    
    // Если после парсинга не осталось ни одного choices, добавляем дефолтные
    if (result.choices.length === 0) {
      console.warn('⚠️ Не удалось извлечь ни одного choices, добавляем дефолтные');
      result.choices = createDefaultChoices();
    }
    
  } else if (parsedData.choices) {
    console.warn('⚠️ Поле choices не является массивом, добавляем дефолтные');
    result.choices = createDefaultChoices();
  } else {
    console.warn('⚠️ Отсутствует поле choices, добавляем дефолтные');
    result.choices = createDefaultChoices();
  }
  
  // 7. EVENTS - МАКСИМАЛЬНО УСТОЙЧИВЫЙ ПАРСИНГ
  if (Array.isArray(parsedData.events)) {
    console.log(`📋 Обработка ${parsedData.events.length} events...`);
    
    parsedData.events.forEach((event, idx) => {
      const normalized = normalizeEvent(event, idx);
      if (normalized) {
        result.events.push(normalized);
      }
    });
    
    console.log(`✅ Успешно обработано ${result.events.length} из ${parsedData.events.length} events`);
    
    // Ограничиваем максимум 3 событиями
    result.events = result.events.slice(0, 3);
    
  } else if (parsedData.events) {
    console.warn('⚠️ Поле events не является массивом, пропускаем');
  }
  
  // 8. AI_MEMORY (опциональное)
  if (parsedData.aiMemory && typeof parsedData.aiMemory === 'object' && !Array.isArray(parsedData.aiMemory)) {
    result.aiMemory = parsedData.aiMemory;
  }
  
  // 9. THOUGHTS - УСТОЙЧИВЫЙ ПАРСИНГ
  if (Array.isArray(parsedData.thoughts)) {
    result.thoughts = parsedData.thoughts
      .filter(thought => {
        if (typeof thought === 'string' && thought.trim().length > 0) {
          return true;
        }
        console.warn('⚠️ Некорректный thought, пропускаем');
        return false;
      })
      .map(thought => thought.trim())
      .slice(0, 20); // Ограничиваем 20 мыслями
    
    console.log(`✅ Обработано ${result.thoughts.length} thoughts`);
  }
  
  // Если мыслей меньше 5, добавляем дефолтные
  if (result.thoughts.length < 5) {
    console.warn(`⚠️ Мало thoughts (${result.thoughts.length}), добавляем дефолтные`);
    result.thoughts = result.thoughts.concat(createDefaultThoughts()).slice(0, 10);
  }
  
  // 10. SUMMARY (опциональное, генерируем из сцены если отсутствует)
  if (typeof parsedData.summary === 'string' && parsedData.summary.trim().length > 0) {
    result.summary = parsedData.summary;
  } else {
    // Генерируем краткую сводку из сцены
    result.summary = parsedData.scene
      .replace(/<[^>]*>/g, ' ') // Удаляем HTML теги
      .substring(0, 200)
      .trim() + '...';
  }
  
  return result;
}

/**
 * НОВАЯ ФУНКЦИЯ: Создание дефолтных choices в случае полного провала парсинга
 */
function createDefaultChoices() {
  return [
  {
    text: "[[парсинг не удался - попробуем снова]]",
    difficulty_level: 3,
    requirements: [],
    success_rewards: [],
    fail_penalties: []
  },
  {
    text: "Подумать о ситуации",
    difficulty_level: 2,
    requirements: [],
    success_rewards: [],
    fail_penalties: []
  },
  {
    text: "Действовать осторожно",
    difficulty_level: 5,
    requirements: [],
    success_rewards: [],
    fail_penalties: []
  },
  {
    text: "Рискнуть и действовать смело",
    difficulty_level: 7,
    requirements: [],
    success_rewards: [],
    fail_penalties: []
  },
  {
    text: "Попытаться вспомнить что-то важное",
    difficulty_level: 4,
    requirements: [],
    success_rewards: [],
    fail_penalties: []
  }];
}

/**
 * НОВАЯ ФУНКЦИЯ: Создание дефолтных мыслей
 */
function createDefaultThoughts() {
  return [
    "Что происходит?",
    "Нужно разобраться в ситуации",
    "Каждое решение имеет последствия",
    "Я чувствую странное напряжение",
    "Что-то здесь не так"
  ];
}

/**
 * УЛУЧШЕННАЯ ФУНКЦИЯ: Основная функция обработки текстового ответа от ИИ (ФОРМАТ 4.1)
 */
function processAIResponse(rawText) {
  if (!rawText || typeof rawText !== 'string') {
    console.error('❌ Пустой или неверный rawText в processAIResponse');
    return createFallbackResponse("Ошибка: ИИ не вернул текст сцены.");
  }
  
  // 1. Очистка Markdown и лишних символов
  let cleanText = rawText.trim()
    .replace(/^```json\s*/i, '')
    .replace(/\s*```$/i, '')
    .replace(/^```\s*/i, '')
    .replace(/^javascript\s*/i, '')
    .replace(/\s*$/, '');
  
  // 2. Попытка парсинга JSON
  let parsedData;
  try {
    parsedData = JSON.parse(cleanText);
  } catch (standardParseError) {
    console.warn("⚠️ JSON.parse() failed. Attempting robust parsing.", standardParseError.message);
    try {
      parsedData = Utils.robustJsonParse(cleanText);
    } catch (robustError) {
      console.error("❌ Оба метода парсинга JSON провалились:", robustError.message);
      
      // НОВАЯ ЛОГИКА: Пытаемся извлечь хотя бы сцену регулярным выражением
      const emergencyParsed = extractDataFromBrokenJSON(cleanText);
      if (emergencyParsed && emergencyParsed.scene) {
        console.warn("⚠️ Использован аварийный парсинг, данные частичны");
        return validateAndNormalizeResponse(emergencyParsed);
      }
      
      return createFallbackResponse("ИИ вернул некорректный JSON. Сцена не сгенерирована.");
    }
  }
  
  // 3. Валидация и нормализация (ФОРМАТ 4.1)
  try {
    return validateAndNormalizeResponse(parsedData);
    
  } catch (validationError) {
    console.error('❌ Ошибка валидации ответа ИИ:', validationError.message);
    
    // Попытка частичного восстановления
    if (parsedData && typeof parsedData === 'object') {
      console.warn('⚠️ Пытаемся частично восстановить данные из битого JSON');
      const partial = createFallbackResponse(validationError.message);
      
      // Пытаемся взять то, что есть
      if (parsedData.scene) partial.scene = parsedData.scene;
      if (parsedData.reflection) partial.reflection = parsedData.reflection;
      if (parsedData.design_notes) partial.design_notes = parsedData.design_notes;
      if (Array.isArray(parsedData.choices) && parsedData.choices.length > 0) {
        partial.choices = parsedData.choices.map((c, i) => normalizeChoice(c, i)).filter(Boolean);
      }
      if (Array.isArray(parsedData.events) && parsedData.events.length > 0) {
        partial.events = parsedData.events.map((e, i) => normalizeEvent(e, i)).filter(Boolean);
      }
      
      return partial;
    }
    
    return createFallbackResponse(`Ошибка валидации данных от ИИ: ${validationError.message}`);
  }
}

/**
 * НОВАЯ ФУНКЦИЯ: Аварийное извлечение данных из битого JSON с помощью регулярных выражений
 */
function extractDataFromBrokenJSON(brokenText) {
  console.warn('🚨 Запущен аварийный парсинг через регулярные выражения');
  
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
    _organizationsHierarchy: {}
  };
  
  // Извлекаем scene (самое важное)
  const sceneMatch = brokenText.match(/"scene"\s*:\s*"((?:[^"\\]|\\.)*)"/s);
  if (sceneMatch && sceneMatch[1]) {
    result.scene = sceneMatch[1]
      .replace(/\\"/g, '"')
      .replace(/\\n/g, '\n')
      .replace(/\\t/g, '\t')
      .replace(/\\\\/g, '\\');
    console.log('✅ Извлечена сцена через regex');
  }
  
  // Извлекаем reflection
  const reflectionMatch = brokenText.match(/"reflection"\s*:\s*"((?:[^"\\]|\\.)*)"/s);
  if (reflectionMatch && reflectionMatch[1]) {
    result.reflection = reflectionMatch[1].replace(/\\"/g, '"').replace(/\\n/g, '\n');
  }
  
  // Извлекаем typology
  const typologyMatch = brokenText.match(/"typology"\s*:\s*"((?:[^"\\]|\\.)*)"/s);
  if (typologyMatch && typologyMatch[1]) {
    result.typology = typologyMatch[1].replace(/\\"/g, '"').replace(/\\n/g, '\n');
  }
  
  // Пытаемся извлечь choices через поиск массива
  const choicesMatch = brokenText.match(/"choices"\s*:\s*\[(.*?)\]/s);
  if (choicesMatch) {
    console.log('⚠️ Найден массив choices, пытаемся распарсить отдельные элементы...');
    // Простейший парсинг - ищем объекты с text
    const textMatches = choicesMatch[1].matchAll(/"text"\s*:\s*"((?:[^"\\]|\\.)*)"/g);
    for (const match of textMatches) {
      if (match[1]) {
        result.choices.push({
          text: match[1].replace(/\\"/g, '"').replace(/\\n/g, '\n'),
          difficulty_level: 5,
          requirements: [],
          success_rewards: [],
          fail_penalties: []
        });
      }
    }
    console.log(`✅ Извлечено ${result.choices.length} choices через regex`);
  }
  
  // Добавляем дефолтные choices если ничего не нашли
  if (result.choices.length === 0) {
    result.choices = createDefaultChoices();
  }
  
  // Извлекаем thoughts
  const thoughtsMatch = brokenText.match(/"thoughts"\s*:\s*\[(.*?)\]/s);
  if (thoughtsMatch) {
    const thoughtMatches = thoughtsMatch[1].matchAll(/"((?:[^"\\]|\\.)*)"/g);
    for (const match of thoughtMatches) {
      if (match[1] && match[1].trim().length > 0) {
        result.thoughts.push(match[1].replace(/\\"/g, '"').replace(/\\n/g, '\n'));
      }
    }
    console.log(`✅ Извлечено ${result.thoughts.length} thoughts через regex`);
  }
  
  if (result.thoughts.length < 5) {
    result.thoughts = result.thoughts.concat(createDefaultThoughts()).slice(0, 10);
  }
  
  // Пытаемся извлечь иерархии организаций
  const hierarchyMatches = brokenText.matchAll(/"organization_rank_hierarchy:([^"]+)"\s*:\s*(\{[^}]+\})/g);
  for (const match of hierarchyMatches) {
    try {
      const orgId = match[1];
      const hierarchyStr = match[2];
      // Пытаемся парсить JSON
      const hierarchy = JSON.parse(hierarchyStr + "}"); // Добавляем закрывающую скобку
      if (hierarchy && hierarchy.value && hierarchy.description) {
        result._organizationsHierarchy[orgId] = {
          id: `organization_rank_hierarchy:${orgId}`,
          value: hierarchy.value,
          description: hierarchy.description
        };
        console.log(`✅ Извлечена иерархия организации ${orgId} через regex`);
      }
    } catch (e) {
      console.warn(`⚠️ Не удалось распарсить иерархию организации: ${e.message}`);
    }
  }
  
  // Генерируем summary из scene
  if (result.scene) {
    result.summary = result.scene.replace(/<[^>]*>/g, ' ').substring(0, 200).trim() + '...';
  }
  
  return result;
}

/**
 * Создание fallback-ответа (ФОРМАТ 4.1)
 */
function createFallbackResponse(errorMessage) {
  return {
    design_notes: "Ошибка парсинга ответа ИИ",
    scene: `<div style="padding: 20px; background: rgba(255,0,0,0.1); border-left: 4px solid red;">
      <h3>⚠️ Техническая Проблема</h3>
      <p>${errorMessage}</p>
      <p>Система пытается восстановить игру. Пожалуйста, выберите действие для продолжения.</p>
    </div>`,
    reflection: "Произошла техническая ошибка...",
    typology: "Системная ошибка",
    choices: createDefaultChoices(),
    events: [],
    aiMemory: {},
    thoughts: [
      "Что-то пошло не так...",
      "Система дала сбой",
      "Нужно попробовать ещё раз",
      "Возможно, это временная ошибка",
      "История продолжается, несмотря на технические проблемы"
    ],
    summary: "Техническая ошибка в системе",
    _organizationsHierarchy: {}
  };
}

/**
 * Устойчивый запрос к API LLM с механизмом "Авто-Ремонта" JSON (ФОРМАТ 4.1)
 */
async function robustFetchWithRepair(url, headers, payload, attemptsLeft, apiRequestModule, abortCtrl) {
  let rawResponseText = '';
  
  try {
    // Шаг 1: Выполняем базовый сетевой запрос
    rawResponseText = await apiRequestModule.executeFetchRaw(url, headers, payload, abortCtrl);
    
    // Шаг 2: Парсим ответ для извлечения контента
    let parsedResponse;
    try {
      parsedResponse = JSON.parse(rawResponseText);
    } catch (parseError) {
      console.error("❌ Не удалось распарсить ответ API:", parseError);
      throw new Error(`Невалидный JSON в ответе: ${parseError.message}`);
    }
    
    // Шаг 3: Извлекаем основной контент
    const contentFromAI = parsedResponse.choices?.[0]?.message?.content;
    if (!contentFromAI) {
      throw new Error("Received empty content string from AI provider");
    }
    
    // Шаг 4: Обрабатываем контент (ФОРМАТ 4.1) - УЛУЧШЕННЫЙ ПАРСИНГ
    const processedData = processAIResponse(contentFromAI);
    
    // Проверяем, что у нас есть хотя бы сцена
    if (!processedData.scene || processedData.scene.length === 0) {
      throw new Error("AI returned empty scene");
    }
    
    // Возвращаем и сырой текст, и обработанные данные
    return {
      rawResponseText,
      processedData
    };
    
  } catch (error) {
    // Если есть попытки ремонта
    if (attemptsLeft > 0 && error.message !== "AI returned empty scene") {
      console.warn(`⚠️ [AI Repair] Инициируем авто-ремонт... Осталось попыток: ${attemptsLeft}`);
      
      // Создаем новый payload с инструкцией по ремонту
      const newPayloadForRepair = JSON.parse(JSON.stringify(payload));
      newPayloadForRepair.messages.push({
        role: "user",
        content: PROMPTS.injections.jsonRepair
      });
      
      // Рекурсивный вызов
      return robustFetchWithRepair(
        url,
        headers,
        newPayloadForRepair,
        attemptsLeft - 1,
        apiRequestModule,
        abortCtrl
      );
    } else {
      // Попытки исчерпаны - но мы всё равно пытаемся вернуть хоть что-то
      console.error(`🔥 CRITICAL: AI failed after ${CONFIG.autoRepairAttempts} attempts`);
      
      // Последняя попытка - аварийный парсинг из сырого ответа
      if (rawResponseText) {
        try {
          const parsedResponse = JSON.parse(rawResponseText);
          const contentFromAI = parsedResponse.choices?.[0]?.message?.content;
          if (contentFromAI) {
            const emergencyData = extractDataFromBrokenJSON(contentFromAI);
            if (emergencyData && emergencyData.scene) {
              console.warn('⚠️ Использован аварийный парсинг как последняя попытка');
              return {
                rawResponseText,
                processedData: validateAndNormalizeResponse(emergencyData)
              };
            }
          }
        } catch (e) {
          console.error('❌ Даже аварийный парсинг не помог:', e);
        }
      }
      
      const finalError = new Error(`CRITICAL: AI failed to produce valid JSON after ${CONFIG.autoRepairAttempts} repair attempts.`);
      finalError.rawResponse = rawResponseText?.substring(0, 500) + '...' || 'No response';
      throw finalError;
    }
  }
}

// Экспортируем публичные методы модуля
export const API_Response = {
  processAIResponse,
  robustFetchWithRepair,
  validateAndNormalizeResponse,
  normalizeChoice,
  normalizeEvent,
  normalizeOperations,
  extractDataFromBrokenJSON,
  extractOrganizationHierarchies,
  createDefaultChoices,
  createDefaultThoughts,
  createFallbackResponse
};