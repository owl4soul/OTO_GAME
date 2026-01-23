// Модуль 7.2: API RESPONSE - Парсинг и Обработка ответов (ПОЛНОСТЬЮ ПЕРЕПИСАН)
'use strict';

import { CONFIG } from './1-config.js';
import { Utils } from './2-utils.js';

// Импортируем промпты
import { PROMPTS } from './prompts.js';

/**
 * Валидация и нормализация нового формата ответа
 */
function validateAndNormalizeResponse(parsedData) {
    if (!parsedData || typeof parsedData !== 'object') {
        throw new Error('Ответ ИИ пуст или не является объектом');
    }
    
    const result = {
        scene: "",
        choices: [],
        short_summary: "",
        personality_change: null,
        thoughtsOfHero: [],
        inventory_changes: { add: [], remove: [] },
        relations_changes: {},
        skill_add: null,
        start_ritual: false,
        end_ritual: false,
        ritual_completed: false,
        // Динамические поля для aiMemory
        _dynamic: {}
    };
    
    // 1. Обязательные поля
    if (!parsedData.scene || typeof parsedData.scene !== 'string') {
        throw new Error('Отсутствует или неверное поле "scene"');
    }
    result.scene = parsedData.scene;
    
    if (!parsedData.choices || !Array.isArray(parsedData.choices)) {
        throw new Error('Отсутствует или неверное поле "choices"');
    }
    
    // 2. Нормализация choices
    result.choices = parsedData.choices.map(choice => {
        if (typeof choice === 'string') {
            return {
                text: choice,
                requirements: { stats: {}, inventory: null },
                success_changes: { stats: {}, inventory_add: [], inventory_remove: [] },
                failure_changes: { stats: {}, inventory_add: [], inventory_remove: [] }
            };
        }
        
        return {
            text: choice.text || "Действие",
            requirements: choice.requirements || { stats: {}, inventory: null },
            success_changes: choice.success_changes || { stats: {}, inventory_add: [], inventory_remove: [] },
            failure_changes: choice.failure_changes || { stats: {}, inventory_add: [], inventory_remove: [] }
        };
    });
    
    // 3. Опциональные поля
    if (parsedData.short_summary && typeof parsedData.short_summary === 'string') {
        result.short_summary = parsedData.short_summary;
    }
    
    // 4. Изменение личности с последствиями
    if (parsedData.personality_change && typeof parsedData.personality_change === 'object') {
        result.personality_change = {
            description: parsedData.personality_change.description || "",
            consequences: Array.isArray(parsedData.personality_change.consequences) ?
                parsedData.personality_change.consequences : []
        };
    }
    
    if (parsedData.thoughtsOfHero && Array.isArray(parsedData.thoughtsOfHero)) {
        result.thoughtsOfHero = parsedData.thoughtsOfHero.filter(thought =>
            typeof thought === 'string' && thought.length > 0
        );
    }
    
    // 5. НОВЫЕ ПОЛЯ: inventory_changes
    if (parsedData.inventory_changes && typeof parsedData.inventory_changes === 'object') {
        if (parsedData.inventory_changes.add && Array.isArray(parsedData.inventory_changes.add)) {
            result.inventory_changes.add = parsedData.inventory_changes.add.filter(item =>
                typeof item === 'string' && item.length > 0
            );
        }
        if (parsedData.inventory_changes.remove && Array.isArray(parsedData.inventory_changes.remove)) {
            result.inventory_changes.remove = parsedData.inventory_changes.remove.filter(item =>
                typeof item === 'string' && item.length > 0
            );
        }
    }
    
    // 6. НОВЫЕ ПОЛЯ: relations_changes
    if (parsedData.relations_changes && typeof parsedData.relations_changes === 'object') {
        for (const [npc, change] of Object.entries(parsedData.relations_changes)) {
            if (typeof npc === 'string' && npc.length > 0) {
                const numChange = Number(change);
                if (!isNaN(numChange)) {
                    result.relations_changes[npc] = numChange;
                }
            }
        }
    }
    
    // 7. НОВЫЕ ПОЛЯ: skill_add
    if (parsedData.skill_add && typeof parsedData.skill_add === 'string') {
        result.skill_add = parsedData.skill_add.trim();
    }
    
    // 8. Флаги ритуалов
    if (typeof parsedData.start_ritual === 'boolean') {
        result.start_ritual = parsedData.start_ritual;
    }
    if (typeof parsedData.end_ritual === 'boolean') {
        result.end_ritual = parsedData.end_ritual;
    }
    if (typeof parsedData.ritual_completed === 'boolean') {
        result.ritual_completed = parsedData.ritual_completed;
    }
    
    // 9. Динамические поля для aiMemory (все остальные поля кроме ожидаемых)
    const expectedFields = [
        "scene", "choices", "short_summary", "personality_change", "thoughtsOfHero",
        "inventory_changes", "relations_changes", "skill_add", "start_ritual",
        "end_ritual", "ritual_completed"
    ];
    
    for (const [key, value] of Object.entries(parsedData)) {
        if (!expectedFields.includes(key)) {
            result._dynamic[key] = value;
        }
    }
    
    return result;
}

/**
 * Основная функция обработки текстового ответа от ИИ
 */
function processAIResponse(rawText) {
    if (!rawText || typeof rawText !== 'string') {
        console.error('❌ Пустой или неверный rawText в processAIResponse');
        return {
            scene: "Ошибка: ИИ не вернул текст сцены.",
            choices: [{
                text: "Продолжить...",
                requirements: { stats: {}, inventory: null },
                success_changes: { stats: {}, inventory_add: [], inventory_remove: [] },
                failure_changes: { stats: {}, inventory_add: [], inventory_remove: [] }
            }],
            short_summary: "Ошибка парсинга",
            inventory_changes: { add: [], remove: [] },
            relations_changes: {},
            _dynamic: {},
            rawText: rawText || ''
        };
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
        console.warn("JSON.parse() failed. Attempting robust parsing.", standardParseError);
        try {
            parsedData = Utils.robustJsonParse(cleanText);
        } catch (robustError) {
            console.error("❌ Оба метода парсинга JSON провалились:", robustError);
            
            // Создаем минимальный валидный объект
            parsedData = {
                scene: "ИИ вернул некорректный JSON. Сцена не сгенерирована.",
                choices: ["Продолжить..."],
                short_summary: "Ошибка формата"
            };
        }
    }
    
    // 3. Валидация и нормализация
    try {
        return validateAndNormalizeResponse(parsedData);
        
    } catch (validationError) {
        console.error('❌ Ошибка валидации ответа ИИ:', validationError);
        
        // Возвращаем безопасный объект
        return {
            scene: "Ошибка валидации данных от ИИ. " + validationError.message,
            choices: [{
                text: "Продолжить...",
                requirements: { stats: {}, inventory: null },
                success_changes: { stats: {}, inventory_add: [], inventory_remove: [] },
                failure_changes: { stats: {}, inventory_add: [], inventory_remove: [] }
            }],
            short_summary: "Ошибка валидации",
            inventory_changes: { add: [], remove: [] },
            relations_changes: {},
            _dynamic: {},
            rawText: rawText
        };
    }
}

/**
 * Устойчивый запрос к API LLM с механизмом "Авто-Ремонта" JSON
 */
async function robustFetchWithRepair(url, headers, payload, attemptsLeft, apiRequestModule, abortCtrl) {
    try {
        // Шаг 1: Выполняем базовый сетевой запрос
        const rawApiResponse = await apiRequestModule.executeFetch(url, headers, payload, abortCtrl);
        
        // Шаг 2: Извлекаем основной контент
        const contentFromAI = rawApiResponse.choices?.[0]?.message?.content;
        if (!contentFromAI) {
            throw new Error("Received empty content string from AI provider");
        }
        
        // Шаг 3: Пытаемся обработать полученный контент как JSON
        const processedData = processAIResponse(contentFromAI);
        
        // Проверяем, что у нас есть хотя бы сцена
        if (!processedData.scene || processedData.scene.length === 0) {
            throw new Error("AI returned empty scene");
        }
        
        return processedData;
        
    } catch (error) {
        // Если есть попытки ремонта
        if (attemptsLeft > 0 && error.message !== "AI returned empty scene") {
            console.warn(`⚠️ [AI Repair] Инициируем авто-ремонт... Осталось попыток: ${attemptsLeft}`);
            
            // Создаем новый payload с инструкцией по ремонту
            const newPayloadForRepair = JSON.parse(JSON.stringify(payload));
            newPayloadForRepair.messages.push({
                role: "user",
                content: PROMPTS.technical.jsonRepair
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
            // Попытки исчерпаны
            const finalError = new Error(`CRITICAL: AI failed to produce valid JSON after ${CONFIG.autoRepairAttempts} repair attempts.`);
            finalError.rawResponse = contentFromAI?.substring(0, 500) + '...' || 'No response';
            throw finalError;
        }
    }
}

// Экспортируем публичные методы модуля
export const API_Response = {
    processAIResponse,
    robustFetchWithRepair,
    validateAndNormalizeResponse
};