// Модуль 7.2: API RESPONSE - Парсинг и Обработка ответов (7-2-api-response.js)
'use strict';

import { CONFIG } from './1-config.js';
import { Utils } from './2-utils.js';

const Prompts = CONFIG.prompts;

// Список стандартных полей JSON
const KNOWN_FIELDS = [
    "scene",
    "choices",
    "reflection",
    "stat_changes",
    "progress_change",
    "personality_change",
    "start_ritual",
    "end_ritual",
    "ritual_completed",
    "inventory_changes", // ЗАМЕНА inventory_all
    "relations_changes", // ЗАМЕНА relations_all
    "skill_add", // Новое поле для навыков
    "thoughtsOfHero",
    "short_summary"
];

/**
 * Основная функция обработки и валидации текстового ответа от ИИ
 */
function processAIResponse(rawText) {
    if (!rawText || typeof rawText !== 'string') {
        console.error('❌ Пустой или неверный rawText в processAIResponse');
        return {
            cleanData: {
                scene: "Ошибка: ИИ не вернул текст сцены.",
                choices: ["Продолжить..."],
                short_summary: "Ошибка парсинга"
            },
            memoryUpdate: {},
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
        console.warn("JSON.parse() failed with standard parser. Attempting robust parsing.", standardParseError);
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
    
    // 3. Гарантия наличия обязательных полей
    if (!parsedData.scene) {
        parsedData.scene = "ИИ не смог сгенерировать текст сцены.";
    }
    
    if (!parsedData.choices || !Array.isArray(parsedData.choices) || parsedData.choices.length === 0) {
        parsedData.choices = ["Продолжить..."];
    } else {
        // Нормализация choices: строки -> объекты
        parsedData.choices = parsedData.choices.map(choice => {
            if (typeof choice === 'string') {
                return { 
                    text: choice,
                    requirements: { stats: {}, inventory: null },
                    success_changes: { stats: {}, inventory_add: [], inventory_remove: [] },
                    failure_changes: { stats: {}, inventory_add: [], inventory_remove: [] }
                };
            }
            
            // Гарантируем структуру объекта choice
            return {
                text: choice.text || "Действие",
                requirements: choice.requirements || { stats: {}, inventory: null },
                success_changes: choice.success_changes || { stats: {}, inventory_add: [], inventory_remove: [] },
                failure_changes: choice.failure_changes || { stats: {}, inventory_add: [], inventory_remove: [] }
            };
        });
    }
    
    // 4. Валидация новых полей формата
    if (parsedData.inventory_changes && typeof parsedData.inventory_changes !== 'object') {
        console.warn('⚠️ inventory_changes должен быть объектом, получен:', typeof parsedData.inventory_changes);
        parsedData.inventory_changes = { add: [], remove: [] };
    } else if (parsedData.inventory_changes) {
        if (!Array.isArray(parsedData.inventory_changes.add)) parsedData.inventory_changes.add = [];
        if (!Array.isArray(parsedData.inventory_changes.remove)) parsedData.inventory_changes.remove = [];
    }
    
    if (parsedData.relations_changes && typeof parsedData.relations_changes !== 'object') {
        console.warn('⚠️ relations_changes должен быть объектом, получен:', typeof parsedData.relations_changes);
        parsedData.relations_changes = {};
    }
    
    if (parsedData.skill_add && typeof parsedData.skill_add !== 'string') {
        console.warn('⚠️ skill_add должен быть строкой');
        delete parsedData.skill_add;
    }
    
    // 5. ДЕТЕКТОР ДИНАМИЧЕСКИХ ПОЛЕЙ (aiMemory)
    const dynamicMemoryUpdates = {};
    
    for (const [key, value] of Object.entries(parsedData)) {
        if (!KNOWN_FIELDS.includes(key)) {
            dynamicMemoryUpdates[key] = value;
            console.log(`🧠 [AI Memory] Сохранено динамическое поле: '${key}'`);
        }
    }
    
    // 6. Удаляем старые поля, если они случайно пришли
    if (parsedData.inventory_all) {
        console.warn('⚠️ ИИ вернул устаревшее поле inventory_all, игнорируем');
        delete parsedData.inventory_all;
    }
    
    if (parsedData.relations_all) {
        console.warn('⚠️ ИИ вернул устаревшее поле relations_all, игнорируем');
        delete parsedData.relations_all;
    }
    
    return {
        cleanData: parsedData,
        memoryUpdate: dynamicMemoryUpdates,
        rawText: rawText
    };
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
        try {
            const result = processAIResponse(contentFromAI);
            return result;
        } catch (jsonProcessingError) {
            console.warn(`❌ Ошибка парсинга JSON: ${jsonProcessingError.message}`);
            
            // Если есть попытки ремонта
            if (attemptsLeft > 0) {
                console.warn(`⚠️ [AI Repair] Инициируем авто-ремонт... Осталось попыток: ${attemptsLeft}`);
                
                // Создаем новый payload с инструкцией по ремонту
                const newPayloadForRepair = JSON.parse(JSON.stringify(payload));
                newPayloadForRepair.messages.push({
                    role: "user",
                    content: Prompts.technical.jsonRepair
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
                finalError.rawResponse = contentFromAI.substring(0, 500) + '...';
                throw finalError;
            }
        }
        
    } catch (primaryError) {
        // Обработка критических ошибок (сеть, HTTP ошибки)
        const isCriticalError = primaryError.message.startsWith('HTTP Error') ||
            primaryError.name === 'AbortError' ||
            primaryError.message.includes('fetch') ||
            primaryError.message.includes('network');
        
        if (isCriticalError) {
            throw primaryError;
        }
        
        // Если это ошибка парсинга и попытки есть
        if (attemptsLeft > 0) {
            console.warn(`⚠️ [AI Repair] Инициируем авто-ремонт из общего catch...`);
            
            const newPayloadForRepair = JSON.parse(JSON.stringify(payload));
            newPayloadForRepair.messages.push({
                role: "user",
                content: Prompts.technical.jsonRepair
            });
            
            return robustFetchWithRepair(
                url,
                headers,
                newPayloadForRepair,
                attemptsLeft - 1,
                apiRequestModule,
                abortCtrl
            );
        }
        
        // Все попытки исчерпаны
        throw primaryError;
    }
}

// Экспортируем публичные методы модуля
export const API_Response = {
    processAIResponse,
    robustFetchWithRepair
};