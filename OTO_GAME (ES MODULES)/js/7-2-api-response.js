// Модуль 7.2: API RESPONSE - Парсинг и Обработка ответов (ФОРМАТ 4.1)
'use strict';

import { CONFIG } from './1-config.js';
import { Utils } from './2-utils.js';
import { PROMPTS } from './prompts.js';

/**
 * Валидация и нормализация нового формата ответа (ФОРМАТ 4.1)
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
        summary: ""
    };
    
    // 1. Опциональные мета-поля
    if (parsedData.design_notes && typeof parsedData.design_notes === 'string') {
        result.design_notes = parsedData.design_notes;
    }
    
    // 2. Обязательные поля
    if (!parsedData.scene || typeof parsedData.scene !== 'string') {
        throw new Error('Отсутствует или неверное поле "scene"');
    }
    result.scene = parsedData.scene;
    
    // 3. Отражение и типология
    if (parsedData.reflection && typeof parsedData.reflection === 'string') {
        result.reflection = parsedData.reflection;
    }
    
    if (parsedData.typology && typeof parsedData.typology === 'string') {
        result.typology = parsedData.typology;
    }
    
    // 4. ВАЖНО: Проверяем choices - должно быть 5-10 элементов
    if (!parsedData.choices || !Array.isArray(parsedData.choices)) {
        throw new Error('Отсутствует или неверное поле "choices"');
    }
    
    // Нормализация choices (ФОРМАТ 4.1)
    result.choices = parsedData.choices.map(choice => {
        if (typeof choice !== 'object' || choice === null) {
            console.warn('⚠️ Некорректный choice, заменяем дефолтным');
            return {
                text: "Действие",
                difficulty_level: 5,
                requirements: [],
                success_rewards: [],
                fail_penalties: []
            };
        }
        
        return {
            text: choice.text || "Действие",
            difficulty_level: typeof choice.difficulty_level === 'number' 
                ? Math.max(1, Math.min(10, choice.difficulty_level)) 
                : 5,
            requirements: Array.isArray(choice.requirements) 
                ? choice.requirements.map(req => {
                    if (typeof req === 'string' && req.includes(':')) {
                        return req.trim();
                    }
                    return null;
                }).filter(Boolean)
                : [],
            success_rewards: Array.isArray(choice.success_rewards) 
                ? choice.success_rewards.filter(op => op && op.operation && op.id)
                : [],
            fail_penalties: Array.isArray(choice.fail_penalties) 
                ? choice.fail_penalties.filter(op => op && op.operation && op.id)
                : []
        };
    });
    
    // Проверяем количество choices
    if (result.choices.length < 5 || result.choices.length > 10) {
        console.warn(`⚠️ Неправильное количество choices: ${result.choices.length} (должно быть 5-10)`);
    }
    
    // 5. События (0-3 элемента)
    if (parsedData.events && Array.isArray(parsedData.events)) {
        result.events = parsedData.events.map(event => ({
            type: event.type || "world_event",
            description: event.description || "",
            effects: Array.isArray(event.effects) 
                ? event.effects.filter(op => op && op.operation && op.id)
                : [],
            reason: event.reason || ""
        })).slice(0, 3); // Ограничиваем 3 событиями
    }
    
    // 6. Память ИИ
    if (parsedData.aiMemory && typeof parsedData.aiMemory === 'object') {
        result.aiMemory = parsedData.aiMemory;
    }
    
    // 7. Мысли героя (минимум 10)
    if (parsedData.thoughts && Array.isArray(parsedData.thoughts)) {
        result.thoughts = parsedData.thoughts
            .filter(thought => typeof thought === 'string' && thought.length > 0)
            .slice(0, 20); // Ограничиваем 20 мыслями
    }
    
    // 8. Сводка
    if (parsedData.summary && typeof parsedData.summary === 'string') {
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
 * Основная функция обработки текстового ответа от ИИ (ФОРМАТ 4.1)
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
        console.warn("JSON.parse() failed. Attempting robust parsing.", standardParseError);
        try {
            parsedData = Utils.robustJsonParse(cleanText);
        } catch (robustError) {
            console.error("❌ Оба метода парсинга JSON провалились:", robustError);
            return createFallbackResponse("ИИ вернул некорректный JSON. Сцена не сгенерирована.");
        }
    }
    
    // 3. Валидация и нормализация (ФОРМАТ 4.1)
    try {
        return validateAndNormalizeResponse(parsedData);
        
    } catch (validationError) {
        console.error('❌ Ошибка валидации ответа ИИ:', validationError);
        return createFallbackResponse(`Ошибка валидации данных от ИИ: ${validationError.message}`);
    }
}

/**
 * Создание fallback-ответа (ФОРМАТ 4.1)
 */
function createFallbackResponse(errorMessage) {
    return {
        design_notes: "Ошибка парсинга ответа ИИ",
        scene: errorMessage,
        reflection: "Что-то пошло не так...",
        typology: "Ошибка системы",
        choices: [
            {
                text: "Попробовать снова",
                difficulty_level: 5,
                requirements: [],
                success_rewards: [],
                fail_penalties: []
            },
            {
                text: "Вернуться к предыдущей сцене",
                difficulty_level: 3,
                requirements: [],
                success_rewards: [],
                fail_penalties: []
            }
        ],
        events: [],
        aiMemory: {},
        thoughts: [
            "Что-то пошло не так...",
            "Система дала сбой",
            "Нужно попробовать ещё раз",
            "Возможно, это временная ошибка",
            "Лучше перезагрузить страницу"
        ],
        summary: "Ошибка парсинга ответа ИИ"
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
        
        // Шаг 4: Обрабатываем контент (ФОРМАТ 4.1)
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
            // Попытки исчерпаны
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
    validateAndNormalizeResponse
};