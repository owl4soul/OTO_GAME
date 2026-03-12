// ====================================================================
// ФАЙЛ: 7-2-api-response.js (v2.6 — МАКСИМАЛЬНО ЗАЩИЩЁННЫЙ + УЛУЧШЕННОЕ ИЗВЛЕЧЕНИЕ)
// НАЗНАЧЕНИЕ: Только API-retry + repair + безопасное извлечение content.
// ИСПРАВЛЕНИЯ В v2.6:
// - Улучшен safelyExtractContent для работы с обрезанными строками content.
// - Небольшие оптимизации, полная совместимость с Parser v7.0.
// - Сохранена максимальная защита от прерываний.
// ====================================================================

'use strict';

import { CONFIG } from './1-config.js';
import { PROMPTS } from './prompts.js';
import { log, LOG_CATEGORIES } from './logger.js';
import { Parser } from './parsing.js';

// ============================================================================
// ВСПОМОГАТЕЛЬНЫЕ УТИЛИТЫ
// ============================================================================

/**
 * Проверка валидности обработанных данных.
 * Теперь с защитой от пустых массивов choices, но допускает сцену короче 30 символов,
 * если есть choices.
 */
function isValidResponse(processedData) {
    return typeof processedData.scene === 'string' &&
        processedData.scene.trim().length > 0 && // минимум не пустая строка
        Array.isArray(processedData.choices) &&
        processedData.choices.length > 0;
}

/**
 * УЛУЧШЕННЫЙ safelyExtractContent (v2.6)
 * Главное исправление: более надёжное извлечение content даже из обрезанных ответов.
 */
function safelyExtractContent(rawResponseText) {
    Parser.debugLog('🔧 safelyExtractContent v2.6: начало', { rawLength: rawResponseText?.length });
    
    const raw = (rawResponseText || '').trim();
    if (!raw) {
        Parser.debugLog('⚠️ Пустой rawResponseText');
        return { success: false, content: null, error: 'Пустой ответ от API', isObject: false };
    }
    
    // 1. Попытка №1: полный JSON-ответ API (стандартный формат)
    try {
        const parsed = JSON.parse(raw);
        let content = parsed.choices?.[0]?.message?.content;
        
        if (content && typeof content === 'string') {
            Parser.debugLog('✅ Извлечён content из choices[0].message.content');
            content = content.replace(/^```json\s*/i, '').replace(/\s*```$/i, '');
            const cleaned = Parser.preprocessJson(Parser.decodeUnicodeEscapes(content));
            
            try {
                const contentObject = JSON.parse(cleaned);
                Parser.debugLog('✅ Content успешно распарсен как объект');
                return { success: true, content: contentObject, isObject: true, error: null };
            } catch (parseErr) {
                Parser.debugLog('⚠️ Content не является JSON-объектом — возвращаем строку');
                return { success: true, content: cleaned, isObject: false, error: null };
            }
        }
    } catch (e) {
        Parser.debugLog('ℹ️ Не удалось распарсить весь raw как JSON — пробуем ручное извлечение');
    }
    
    // 2. Попытка №2: ручное извлечение content через regex (для обрезанных ответов)
    // Улучшенный regex, который ищет content до конца строки или до следующей кавычки с учётом escape
    const contentMatch = raw.match(/"content"\s*:\s*"((?:[^"\\]|\\.)*)/s);
    if (contentMatch) {
        Parser.debugLog('✅ Ручное извлечение content через regex');
        let content = contentMatch[1];
        // Если строка обрезана и не закрыта кавычкой, добавляем её мысленно
        // (при обработке Parser.preprocessJson это не обязательно)
        content = content.replace(/^```json\s*/i, '').replace(/\s*```$/i, '');
        const cleaned = Parser.preprocessJson(Parser.decodeUnicodeEscapes(content));
        
        try {
            const contentObject = JSON.parse(cleaned);
            Parser.debugLog('✅ Ручной content распарсен как объект');
            return { success: true, content: contentObject, isObject: true, error: null };
        } catch {
            Parser.debugLog('⚠️ Ручной content возвращаем как строку');
            return { success: true, content: cleaned, isObject: false, error: null };
        }
    }
    
    // 3. Попытка №3: поиск любого JSON-подобного блока в ответе
    const jsonBlockMatch = raw.match(/(\{[\s\S]*\})/);
    if (jsonBlockMatch) {
        Parser.debugLog('✅ Найден JSON-блок, пробуем распарсить');
        try {
            const parsed = JSON.parse(jsonBlockMatch[1]);
            // Проверяем, есть ли в нём поле content
            if (parsed.content) {
                let content = parsed.content;
                if (typeof content === 'string') {
                    content = content.replace(/^```json\s*/i, '').replace(/\s*```$/i, '');
                    const cleaned = Parser.preprocessJson(Parser.decodeUnicodeEscapes(content));
                    try {
                        const contentObject = JSON.parse(cleaned);
                        Parser.debugLog('✅ Content из JSON-блока распарсен как объект');
                        return { success: true, content: contentObject, isObject: true, error: null };
                    } catch {
                        Parser.debugLog('⚠️ Content из JSON-блока возвращаем как строку');
                        return { success: true, content: cleaned, isObject: false, error: null };
                    }
                } else {
                    return { success: true, content: parsed.content, isObject: true, error: null };
                }
            }
        } catch (e) {
            Parser.debugLog('⚠️ JSON-блок не удалось распарсить');
        }
    }
    
    // 4. Аварийный fallback: возвращаем весь raw как строку
    Parser.debugLog('⚠️ Не удалось извлечь content — возвращаем весь raw как строку');
    return { success: true, content: raw, isObject: false, error: 'Использован аварийный fallback' };
}

// ============================================================================
// ОСНОВНЫЕ ФУНКЦИИ
// ============================================================================

/**
 * Основной обработчик одного запроса к API.
 * Полностью защищён от ошибок.
 */
async function handleAPIResponse(url, headers, payload, apiRequestModule, abortCtrl) {
    let rawResponseText = '';
    try {
        Parser.debugLog('🚀 handleAPIResponse: выполняем запрос');
        rawResponseText = await apiRequestModule.executeFetchRaw(url, headers, payload, abortCtrl);
        
        const extractionResult = safelyExtractContent(rawResponseText);
        if (!extractionResult.success) {
            throw new Error(extractionResult.error || 'Не удалось извлечь content');
        }
        
        // Передаём в Parser v7.0
        const processedData = Parser.processAIResponse(extractionResult.content);
        
        if (!isValidResponse(processedData)) {
            throw new Error("AI returned empty or invalid scene/choices");
        }
        
        Parser.debugLog('✅ handleAPIResponse: успешно');
        return { rawResponseText, processedData, parsingInfo: processedData.parsing_info };
        
    } catch (error) {
        Parser.debugLog(`❌ handleAPIResponse: ошибка`, { message: error.message });
        error.rawResponse = rawResponseText || error.rawResponse;
        throw error;
    }
}

/**
 * УЛУЧШЕННЫЙ robustFetchWithRepair (v2.6)
 * Главное исправление: защита от race condition + продолжение при ошибках.
 */
async function robustFetchWithRepair(url, headers, payload, attemptsLeft, apiRequestModule, abortCtrl) {
    let lastError = null;
    let lastRawResponse = '';
    
    Parser.debugLog(`🔄 robustFetchWithRepair: начинаем ${CONFIG.autoRepairAttempts} попыток`);
    
    for (let attempt = 1; attempt <= CONFIG.autoRepairAttempts; attempt++) {
        try {
            Parser.debugLog(`📡 Попытка ${attempt}/${CONFIG.autoRepairAttempts}`);
            const result = await handleAPIResponse(url, headers, payload, apiRequestModule, abortCtrl);
            Parser.debugLog(`✅ Успех на попытке ${attempt}`);
            return result;
            
        } catch (error) {
            lastError = error;
            lastRawResponse = error.rawResponse || lastRawResponse;
            
            Parser.debugLog(`⚠️ Ошибка на попытке ${attempt}`, { message: error.message });
            
            if (attempt === CONFIG.autoRepairAttempts) {
                Parser.debugLog('❌ Все попытки исчерпаны');
                break;
            }
            
            // Добавляем repair-промпт
            const repairPayload = JSON.parse(JSON.stringify(payload));
            repairPayload.messages.push({ role: "user", content: PROMPTS.injections.jsonRepair });
            payload = repairPayload;
        }
    }
    
    // АВАРИЙНЫЙ ПАРСИНГ (последняя попытка спасти данные)
    Parser.debugLog('🔄 Запускаем аварийный парсинг последнего rawResponse');
    if (lastRawResponse) {
        try {
            const extractionResult = safelyExtractContent(lastRawResponse);
            if (extractionResult.success) {
                const emergencyData = Parser.processAIResponse(extractionResult.content);
                if (emergencyData.scene && emergencyData.scene.trim().length > 0) {
                    Parser.debugLog('✅ Аварийный парсинг вернул данные');
                    return {
                        rawResponseText: lastRawResponse,
                        processedData: emergencyData,
                        isEmergency: true,
                        parsingInfo: emergencyData.parsing_info
                    };
                }
            }
        } catch (emergencyError) {
            Parser.debugLog('⚠️ Аварийный парсинг тоже упал', { message: emergencyError.message });
        }
    }
    
    // Если ничего не спасли — бросаем финальную ошибку
    const finalError = new Error(`CRITICAL: AI failed after ${CONFIG.autoRepairAttempts} attempts`);
    finalError.rawResponse = lastRawResponse;
    throw finalError;
}

// ============================================================================
// ПУБЛИЧНЫЙ API
// ============================================================================
export const API_Response = {
    handleAPIResponse,
    robustFetchWithRepair
};

console.log('✅ API_Response v2.6 (полностью раскрытый) загружен');
