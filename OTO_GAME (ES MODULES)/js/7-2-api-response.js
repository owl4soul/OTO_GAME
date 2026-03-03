// Модуль 7.2: API RESPONSE - Парсинг и Обработка ответов (ФОРМАТ 4.1)
// ИСПРАВЛЕННАЯ ВЕРСИЯ: регистр ключей сохраняется, сравнение без учёта регистра
// + аварийный парсинг теперь тоже регистронезависим
// ИЗМЕНЕНИЯ:
// - В validateAndNormalizeResponse добавлена нормализация aiMemory:
//   массивы → { items: [...] }, строки → { raw: "..." }, пустые значения → {}.

'use strict';

import { CONFIG } from './1-config.js';
import { Utils } from './2-utils.js';
import { PROMPTS } from './prompts.js';
import { log, LOG_CATEGORIES } from './logger.js';

// ============================================================================
// ОБРАБОТЧИКИ ОШИБОК И БЕЗОПАСНЫЙ ПАРСИНГ
// ============================================================================

// Белый список известных корневых полей (в оригинальном регистре, как ожидаем)
const KNOWN_ROOT_KEYS = new Set([
    'design_notes', 'scene', 'reflection', 'personality', 'typology', 'choices',
    'events', 'aiMemory', 'thoughts', 'summary', '_organizationsHierarchy',
    'gameType', 'meta_context'
]);

// Множество известных ключей в нижнем регистре для быстрого поиска без учёта регистра
const KNOWN_ROOT_KEYS_LOWER = new Set(
    Array.from(KNOWN_ROOT_KEYS).map(key => key.toLowerCase())
);

// Стандартные типы game_item (не используются напрямую в этом модуле, оставлено для справки)
const STANDARD_GAME_ITEM_TYPES = [
    'stat', 'skill', 'inventory', 'relations', 'bless', 'curse',
    'buff', 'debuff', 'personality', 'initiation_degree', 'progress',
    'organization_rank'
];

// ============================================================================
// ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ НОРМАЛИЗАЦИИ
// ============================================================================

/**
 * Нормализует одну операцию
 */
function normalizeOperation(op, context) {
    if (!op || typeof op !== 'object') return null;
    
    const operation = String(op.operation || '').toUpperCase().trim();
    if (!operation || !['ADD', 'REMOVE', 'MODIFY', 'SET'].includes(operation)) return null;
    
    const id = String(op.id || '').trim();
    if (!id.includes(':')) return null;
    
    const normalized = { operation, id };
    
    // value (оставляем как есть)
    if (op.value !== undefined) normalized.value = op.value;
    
    // delta -> число
    if (op.delta !== undefined) normalized.delta = Number(op.delta) || 0;
    
    // duration -> целое положительное
    if (op.duration !== undefined) {
        normalized.duration = Math.max(1, Math.min(999, Number(op.duration) || 1));
    }
    
    // description -> строка
    normalized.description = op.description ? String(op.description).trim() : '';
    
    // Для ADD и SET без value подставляем заглушку
    if ((operation === 'ADD' || operation === 'SET') && normalized.value === undefined) {
        normalized.value = '[значение не указано]';
    }
    
    // Для MODIFY без delta ставим 0 (ничего не меняет)
    if (operation === 'MODIFY' && normalized.delta === undefined) {
        normalized.delta = 0;
    }
    
    // Для buff/debuff без duration ставим 1
    const type = id.split(':')[0];
    if ((type === 'buff' || type === 'debuff') && normalized.duration === undefined) {
        log.warn(LOG_CATEGORIES.API, `У операции ${id} нет duration, устанавливаем 1 (${context})`);
        normalized.duration = 1;
    }
    
    return normalized;
}

/**
 * Нормализует массив операций
 */
export function normalizeOperations(operations, context) {
    if (!Array.isArray(operations)) return [];
    return operations.map((op, idx) => normalizeOperation(op, `${context}[${idx}]`)).filter(Boolean);
}

/**
 * Нормализует один choice
 */
function normalizeChoice(choice, index) {
    if (!choice || typeof choice !== 'object') {
        log.warn(LOG_CATEGORIES.API, `Choice ${index} не объект, создаём дефолтный`);
        return {
            text: "Действие",
            difficulty_level: 5,
            requirements: [],
            success_rewards: [],
            fail_penalties: []
        };
    }
    
    const normalized = {
        text: '',
        difficulty_level: 5,
        requirements: [],
        success_rewards: [],
        fail_penalties: []
    };
    
    // text
    if (typeof choice.text === 'string' && choice.text.trim()) {
        normalized.text = choice.text.trim();
    } else {
        normalized.text = `Действие ${index + 1}`;
    }
    
    // difficulty_level
    if (typeof choice.difficulty_level === 'number') {
        normalized.difficulty_level = Math.max(1, Math.min(10, Math.round(choice.difficulty_level)));
    } else if (typeof choice.difficulty_level === 'string') {
        const parsed = parseInt(choice.difficulty_level, 10);
        if (!isNaN(parsed)) normalized.difficulty_level = Math.max(1, Math.min(10, parsed));
    }
    
    // requirements (оставляем как массив строк, фильтруем только непустые)
    if (Array.isArray(choice.requirements)) {
        normalized.requirements = choice.requirements
            .filter(req => req && typeof req === 'string' && req.includes(':'))
            .map(req => req.trim());
    }
    
    // success_rewards
    if (Array.isArray(choice.success_rewards)) {
        normalized.success_rewards = normalizeOperations(choice.success_rewards, `choice ${index} rewards`);
    }
    
    // fail_penalties
    if (Array.isArray(choice.fail_penalties)) {
        normalized.fail_penalties = normalizeOperations(choice.fail_penalties, `choice ${index} penalties`);
    }
    
    return normalized;
}

/**
 * Нормализует одно событие
 */
function normalizeEvent(event, index) {
    if (!event || typeof event !== 'object') return null;
    
    const normalized = {
        type: 'world_event',
        description: '',
        effects: [],
        reason: ''
    };
    
    // type
    if (typeof event.type === 'string' && event.type.trim()) {
        normalized.type = event.type.trim();
    }
    
    // description (обязательное)
    if (typeof event.description === 'string' && event.description.trim()) {
        normalized.description = event.description.trim();
    } else {
        log.warn(LOG_CATEGORIES.API, `Event ${index} без description, пропускаем`);
        return null;
    }
    
    // effects
    if (Array.isArray(event.effects)) {
        normalized.effects = normalizeOperations(event.effects, `event ${index} effects`);
    }
    
    // reason
    if (typeof event.reason === 'string') {
        normalized.reason = event.reason.trim();
    }
    
    return normalized;
}

/**
 * Извлекает иерархии организаций из ответа (ключи с префиксом)
 */
function extractOrganizationHierarchies(parsed) {
    const hierarchies = {};
    for (const key in parsed) {
        if (key.startsWith('organization_rank_hierarchy:')) {
            try {
                const orgId = key.split(':')[1];
                const value = parsed[key];
                if (value && value.description && Array.isArray(value.description)) {
                    hierarchies[orgId] = {
                        id: key,
                        value: value.value || orgId,
                        description: value.description.map(r => ({
                            lvl: Number(r.lvl) || 0,
                            rank: String(r.rank || '')
                        })).filter(r => r.rank)
                    };
                }
            } catch (e) {
                log.warn(LOG_CATEGORIES.API, `Ошибка извлечения иерархии ${key}`, e);
            }
        }
    }
    return hierarchies;
}

// ===== ФУНКЦИЯ ИЗВЛЕЧЕНИЯ НЕИЗВЕСТНЫХ МЕТА-ПОЛЕЙ (регистронезависимая проверка) =====
/**
 * Извлекает неизвестные мета-поля с учётом регистра
 * @param {Object} parsedData - исходный объект (оригинальные ключи)
 * @returns {Object} мета-данные
 */
function extractUnknownMeta(parsedData) {
    const meta = {
        metaContext: '',
        unknownFields: [],
        unknownArrays: [],
        unknownObjects: []
    };
    
    for (const key in parsedData) {
        // Пропускаем поля, начинающиеся с префикса иерархий организаций
        if (key.startsWith('organization_rank_hierarchy:')) continue;
        
        // Проверяем принадлежность к известным полям без учёта регистра
        const lowerKey = key.toLowerCase();
        if (KNOWN_ROOT_KEYS_LOWER.has(lowerKey)) continue;
        
        const value = parsedData[key];
        if (value === null || value === undefined) continue;
        
        if (Array.isArray(value)) {
            meta.unknownArrays.push({ key, value });
        } else if (typeof value === 'object') {
            meta.unknownObjects.push({ key, value });
        } else {
            meta.unknownFields.push({ key, value });
        }
    }
    return meta;
}

/**
 * Безопасно извлекает контент из ответа API
 */
function safelyExtractContent(rawResponseText) {
    try {
        const parsed = JSON.parse(rawResponseText);
        if (!parsed.choices || !Array.isArray(parsed.choices) || parsed.choices.length === 0) {
            return { success: false, content: null, error: 'Ответ API не содержит choices', parsedResponse: null };
        }
        const content = parsed.choices[0]?.message?.content;
        if (!content || typeof content !== 'string') {
            return { success: false, content: null, error: 'Ответ API не содержит content', parsedResponse: null };
        }
        return { success: true, content, parsedResponse: parsed, error: null };
    } catch (error) {
        return { success: false, content: null, error: `Ошибка парсинга ответа API: ${error.message}`, parsedResponse: null };
    }
}

/**
 * Основной обработчик ответа API
 */
async function handleAPIResponse(url, headers, payload, apiRequestModule, abortCtrl) {
    let rawResponseText = '';
    try {
        rawResponseText = await apiRequestModule.executeFetchRaw(url, headers, payload, abortCtrl);
        const extractionResult = safelyExtractContent(rawResponseText);
        if (!extractionResult.success) throw new Error(extractionResult.error);
        const processedData = processAIResponse(extractionResult.content);
        if (!processedData.scene || processedData.scene.length === 0) {
            throw new Error("AI returned empty scene");
        }
        return { rawResponseText, processedData, extractionResult };
    } catch (error) {
        if (!error.rawResponse) error.rawResponse = rawResponseText;
        throw error;
    }
}

/**
 * Улучшенный robustFetchWithRepair с четким разделением ответственности
 */
async function robustFetchWithRepair(url, headers, payload, attemptsLeft, apiRequestModule, abortCtrl) {
    try {
        return await handleAPIResponse(url, headers, payload, apiRequestModule, abortCtrl);
    } catch (error) {
        if (attemptsLeft > 0 && error.message !== "AI returned empty scene") {
            console.warn(`⚠️ [AI Repair] Запуск ремонта... Осталось попыток: ${attemptsLeft}`);
            const repairPayload = JSON.parse(JSON.stringify(payload));
            repairPayload.messages.push({ role: "user", content: PROMPTS.injections.jsonRepair });
            return robustFetchWithRepair(url, headers, repairPayload, attemptsLeft - 1, apiRequestModule, abortCtrl);
        } else {
            console.error(`🔥 CRITICAL: AI failed after ${CONFIG.autoRepairAttempts} attempts`);
            if (error.rawResponse) {
                try {
                    const extractionResult = safelyExtractContent(error.rawResponse);
                    if (extractionResult.success) {
                        const emergencyData = extractDataFromBrokenJSON(extractionResult.content);
                        if (emergencyData && emergencyData.scene) {
                            console.warn('⚠️ Использован аварийный парсинг как последняя попытка');
                            return {
                                rawResponseText: error.rawResponse,
                                processedData: validateAndNormalizeResponse(emergencyData)
                            };
                        }
                    }
                } catch (e) {
                    console.error('❌ Даже аварийный парсинг не помог:', e);
                }
            }
            const finalError = new Error(
                `CRITICAL: AI failed to produce valid response after ${CONFIG.autoRepairAttempts} attempts. Last error: ${error.message}`
            );
            finalError.rawResponse = error.rawResponse || 'No response';
            throw finalError;
        }
    }
}

// ============================================================================
// ОСНОВНЫЕ ФУНКЦИИ ВАЛИДАЦИИ И НОРМАЛИЗАЦИИ (регистронезависимый поиск ключей)
// ============================================================================

/**
 * Валидация и нормализация нового формата ответа (ФОРМАТ 4.1)
 * Теперь не изменяет регистр ключей.
 */
function validateAndNormalizeResponse(parsedData) {
    if (!parsedData || typeof parsedData !== 'object') {
        throw new Error('Ответ ИИ пуст или не является объектом');
    }
    
    // НЕ вызываем normalizeKeys — оставляем оригинальные ключи.
    
    const result = {
        design_notes: '',
        scene: '',
        reflection: '',
        typology: '',
        personality: '',
        choices: [],
        events: [],
        aiMemory: {},
        thoughts: [],
        summary: '',
        _organizationsHierarchy: {}
    };
    
    // Создаём карту нижний регистр → оригинальный ключ для быстрого доступа
    const keyMap = new Map();
    for (const key in parsedData) {
        keyMap.set(key.toLowerCase(), key);
    }
    
    // 1. Извлекаем иерархии организаций
    result._organizationsHierarchy = extractOrganizationHierarchies(parsedData);
    
    // 2. DESIGN_NOTES
    const designNotesKey = keyMap.get('design_notes');
    if (designNotesKey && parsedData[designNotesKey] !== undefined) {
        const value = parsedData[designNotesKey];
        if (typeof value === 'string') {
            result.design_notes = value;
        } else if (Array.isArray(value)) {
            result.design_notes = value
                .filter(item => typeof item === 'string')
                .join('\n');
        } else {
            result.design_notes = String(value);
        }
    }
    
    // 3. SCENE (обязательное поле)
    const sceneKey = keyMap.get('scene');
    if (!sceneKey || typeof parsedData[sceneKey] !== 'string') {
        throw new Error('Отсутствует или неверное поле "scene"');
    }
    result.scene = parsedData[sceneKey];
    
    // 4. REFLECTION
    const reflectionKey = keyMap.get('reflection');
    if (reflectionKey && typeof parsedData[reflectionKey] === 'string') {
        result.reflection = parsedData[reflectionKey];
    }
    
    // 5. TYPOLOGY
    const typologyKey = keyMap.get('typology');
    if (typologyKey && typeof parsedData[typologyKey] === 'string') {
        result.typology = parsedData[typologyKey];
    }
    
    // 6. PERSONALITY
    const personalityKey = keyMap.get('personality');
    if (personalityKey && typeof parsedData[personalityKey] === 'string') {
        result.personality = parsedData[personalityKey];
    }
    
    // 7. CHOICES
    const choicesKey = keyMap.get('choices');
    if (choicesKey && Array.isArray(parsedData[choicesKey])) {
        parsedData[choicesKey].forEach((c, i) => {
            const norm = normalizeChoice(c, i);
            if (norm) result.choices.push(norm);
        });
    }
    if (result.choices.length === 0) {
        log.warn(LOG_CATEGORIES.API, 'Нет валидных choices, добавляем дефолтные');
        result.choices = createDefaultChoices();
    }
    
    // 8. EVENTS
    const eventsKey = keyMap.get('events');
    if (eventsKey && Array.isArray(parsedData[eventsKey])) {
        parsedData[eventsKey].forEach((e, i) => {
            const norm = normalizeEvent(e, i);
            if (norm) result.events.push(norm);
        });
    }
    result.events = result.events.slice(0, 3);
    
  // 9. AI_MEMORY — ищем ключи, похожие на aiMemory (без учёта регистра, несколько вариантов)
const possibleAiMemoryKeys = ['aimemory', 'ai_memory'];
let aiMemoryKey = null;
for (const variant of possibleAiMemoryKeys) {
    if (keyMap.has(variant)) {
        aiMemoryKey = keyMap.get(variant);
        break;
    }
}

if (aiMemoryKey && parsedData[aiMemoryKey] !== undefined && parsedData[aiMemoryKey] !== null) {
    let mem = parsedData[aiMemoryKey];
    // ✨ НОРМАЛИЗАЦИЯ: приводим к объекту
    if (Array.isArray(mem)) {
        mem = mem.length > 0 ? { items: mem } : {};
    } else if (typeof mem === 'string') {
        mem = mem.trim() !== '' ? { raw: mem } : {};
    } else if (typeof mem !== 'object' || mem === null) {
        mem = {};
    }
    result.aiMemory = mem;
} else {
    result.aiMemory = {};
}
    
    // 10. THOUGHTS
    const thoughtsKey = keyMap.get('thoughts');
    if (thoughtsKey && Array.isArray(parsedData[thoughtsKey])) {
        result.thoughts = parsedData[thoughtsKey]
            .filter(t => typeof t === 'string' && t.trim())
            .map(t => t.trim())
            .slice(0, 20);
    }
    if (result.thoughts.length < 5) {
        result.thoughts = result.thoughts.concat(createDefaultThoughts()).slice(0, 10);
    }
    
    // 11. SUMMARY
    const summaryKey = keyMap.get('summary');
    if (summaryKey && typeof parsedData[summaryKey] === 'string' && parsedData[summaryKey].trim()) {
        result.summary = parsedData[summaryKey];
    } else {
        result.summary = result.scene.replace(/<[^>]*>/g, ' ').substring(0, 200).trim() + '...';
    }
    
    // 12. Извлекаем неизвестные мета-поля
    result._metaParsed = extractUnknownMeta(parsedData);
    
    return result;
}

/**
 * Создание дефолтных choices в случае полного провала парсинга
 */
function createDefaultChoices() {
    return [
        { text: "[[парсинг не удался - попробуем снова]]", difficulty_level: 3, requirements: [], success_rewards: [], fail_penalties: [] },
        { text: "Подумать о ситуации", difficulty_level: 2, requirements: [], success_rewards: [], fail_penalties: [] },
        { text: "Действовать осторожно", difficulty_level: 5, requirements: [], success_rewards: [], fail_penalties: [] },
        { text: "Рискнуть и действовать смело", difficulty_level: 7, requirements: [], success_rewards: [], fail_penalties: [] },
        { text: "Попытаться вспомнить что-то важное", difficulty_level: 4, requirements: [], success_rewards: [], fail_penalties: [] }
    ];
}

/**
 * Создание дефолтных мыслей
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
 * Основная функция обработки текстового ответа от ИИ (ФОРМАТ 4.1)
 */
function processAIResponse(rawText) {
    if (!rawText || typeof rawText !== 'string') {
        console.error('❌ Пустой или неверный rawText в processAIResponse');
        return createFallbackResponse("Ошибка: ИИ не вернул текст сцены.");
    }
    
    let cleanText = rawText.trim()
        .replace(/^```json\s*/i, '')
        .replace(/\s*```$/i, '')
        .replace(/^```\s*/i, '')
        .replace(/^javascript\s*/i, '')
        .replace(/\s*$/, '');
    
    let parsedData;
    try {
        parsedData = JSON.parse(cleanText);
        console.log('✅ [processAIResponse] Стандартный JSON.parse успешен');
    } catch (standardParseError) {
        console.warn("⚠️ [processAIResponse] Стандартный JSON.parse() failed.", standardParseError.message);
        try {
            const repaired = Utils.safeJsonRepair(cleanText);
            if (repaired) {
                parsedData = JSON.parse(repaired);
                console.log('✅ [processAIResponse] jsonrepair + JSON.parse успешен');
            } else {
                throw new Error('jsonrepair вернул null');
            }
        } catch (repairError) {
            console.warn("⚠️ [processAIResponse] jsonrepair не помог.", repairError.message);
            try {
                parsedData = Utils.robustJsonParse(cleanText);
                console.log('✅ [processAIResponse] Utils.robustJsonParse успешен');
            } catch (robustError) {
                console.error("❌ [processAIResponse] Все методы парсинга провалились:", robustError.message);
                const emergencyParsed = extractDataFromBrokenJSON(cleanText);
                if (emergencyParsed && emergencyParsed.scene) {
                    console.warn("⚠️ [processAIResponse] Использован аварийный парсинг, данные частичны");
                    return validateAndNormalizeResponse(emergencyParsed);
                }
                return createFallbackResponse("ИИ вернул некорректный JSON. Сцена не сгенерирована.");
            }
        }
    }
    
    try {
        return validateAndNormalizeResponse(parsedData);
    } catch (validationError) {
        console.error('❌ [processAIResponse] Ошибка валидации ответа ИИ:', validationError.message);
        if (parsedData && typeof parsedData === 'object') {
            console.warn('⚠️ [processAIResponse] Пытаемся частично восстановить данные из битого JSON');
            const partial = createFallbackResponse(validationError.message);
            if (parsedData.scene) partial.scene = parsedData.scene;
            if (parsedData.reflection) partial.reflection = parsedData.reflection;
            if (parsedData.design_notes) partial.design_notes = parsedData.design_notes;
            if (parsedData.aiMemory) partial.aiMemory = parsedData.aiMemory;
            if (Array.isArray(parsedData.choices)) {
                partial.choices = parsedData.choices.map((c, i) => normalizeChoice(c, i)).filter(Boolean);
            }
            if (Array.isArray(parsedData.events)) {
                partial.events = parsedData.events.map((e, i) => normalizeEvent(e, i)).filter(Boolean);
            }
            partial._metaParsed = { metaContext: '', unknownFields: [], unknownArrays: [], unknownObjects: [] };
            return partial;
        }
        return createFallbackResponse(`Ошибка валидации данных от ИИ: ${validationError.message}`);
    }
}

// ============================================================================
// АВАРИЙНЫЙ ПАРСИНГ (теперь с регистронезависимыми регулярками)
// ============================================================================

/**
 * Аварийное извлечение данных из битого JSON с помощью регулярных выражений (регистронезависимо)
 */
function extractDataFromBrokenJSON(brokenText) {
    console.warn('🚨 [extractDataFromBrokenJSON] Запущен аварийный парсинг через регулярные выражения (регистронезависимый)');
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
    
    // Все regex теперь с флагом i для регистронезависимости
    const sceneMatch = brokenText.match(/"scene"\s*:\s*"((?:[^"\\]|\\.)*)"/is) || brokenText.match(/"scene"\s*:\s*"([^"]*)/i);
    if (sceneMatch && sceneMatch[1]) {
        result.scene = sceneMatch[1].replace(/\\"/g, '"').replace(/\\n/g, '\n').replace(/\\t/g, '\t').replace(/\\\\/g, '\\');
        console.log('✅ [extractDataFromBrokenJSON] Извлечена сцена через regex');
    }
    
    const reflectionMatch = brokenText.match(/"reflection"\s*:\s*"((?:[^"\\]|\\.)*)"/is);
    if (reflectionMatch && reflectionMatch[1]) result.reflection = reflectionMatch[1].replace(/\\"/g, '"').replace(/\\n/g, '\n');
    
    const typologyMatch = brokenText.match(/"typology"\s*:\s*"((?:[^"\\]|\\.)*)"/is);
    if (typologyMatch && typologyMatch[1]) result.typology = typologyMatch[1].replace(/\\"/g, '"').replace(/\\n/g, '\n');
    
    // Ищем массив choices (регистронезависимо)
    const choicesMatch = brokenText.match(/"choices"\s*:\s*\[(.*?)\]/is);
    if (choicesMatch) {
        // Ищем все объекты с полем "text" внутри этого массива (тоже регистронезависимо)
        const textMatches = choicesMatch[1].matchAll(/"text"\s*:\s*"((?:[^"\\]|\\.)*)"/gis);
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
        console.log(`✅ [extractDataFromBrokenJSON] Извлечено ${result.choices.length} choices через regex`);
    }
    if (result.choices.length === 0) result.choices = createDefaultChoices();
    
    // Ищем aiMemory по нескольким вариантам (регистронезависимо)
const memoryMatch = 
    text.match(/"aiMemory"\s*:\s*\{([^}]*)\}/is) ||
    text.match(/"ai_memory"\s*:\s*\{([^}]*)\}/is) ||
    text.match(/"aimemory"\s*:\s*\{([^}]*)\}/is);
if (memoryMatch) {
    try {
        result.aiMemory = JSON.parse(`{${memoryMatch[1]}}`);
        console.log('✅ [extractDataFromBrokenJSON] Извлечена aiMemory');
    } catch (e) {
        console.warn('⚠️ [extractDataFromBrokenJSON] Парсинг aiMemory не удался');
    }
}
    
    const thoughtsMatch = brokenText.match(/"thoughts"\s*:\s*\[(.*?)\]/is);
    if (thoughtsMatch) {
        const thoughtMatches = thoughtsMatch[1].match(/"((?:[^"\\]|\\.)*?)"/g);
        if (thoughtMatches) {
            result.thoughts = thoughtMatches.map(s => s.replace(/^"|"$/g, '').replace(/\\"/g, '"').replace(/\\n/g, '\n')).filter(t => t.trim());
        }
    }
    if (result.thoughts.length < 5) result.thoughts = result.thoughts.concat(createDefaultThoughts()).slice(0, 10);
    
    // Иерархии организаций (ключ может быть в любом регистре)
    const hierarchyMatches = brokenText.matchAll(/"organization_rank_hierarchy:([^"]+)"\s*:\s*(\{(?:[^{}]|{[^{}]*})*\})/gis);
    for (const match of hierarchyMatches) {
        try {
            const orgId = match[1];
            const hierarchyStr = match[2];
            let hierarchy = null;
            try {
                hierarchy = JSON.parse(hierarchyStr);
            } catch (e) {
                const repaired = Utils.safeJsonRepair(hierarchyStr);
                if (repaired) hierarchy = JSON.parse(repaired);
            }
            if (hierarchy && hierarchy.value && hierarchy.description) {
                result._organizationsHierarchy[orgId] = {
                    id: `organization_rank_hierarchy:${orgId}`,
                    value: hierarchy.value,
                    description: hierarchy.description
                };
            }
        } catch (e) {
            console.warn(`⚠️ [extractDataFromBrokenJSON] Не удалось распарсить иерархию организации: ${e.message}`);
        }
    }
    
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
        _organizationsHierarchy: {},
        _metaParsed: { metaContext: '', unknownFields: [], unknownArrays: [], unknownObjects: [] }
    };
}

// Экспортируем публичные методы модуля
export const API_Response = {
    // Основные обработчики
    handleAPIResponse,
    robustFetchWithRepair,
    safelyExtractContent,
    
    // Парсинг и нормализация
    processAIResponse,
    validateAndNormalizeResponse,
    normalizeChoice,
    normalizeEvent,
    normalizeOperations,
    
    // Аварийные функции
    extractDataFromBrokenJSON,
    extractOrganizationHierarchies,
    
    // Утилиты
    createDefaultChoices,
    createDefaultThoughts,
    createFallbackResponse
};