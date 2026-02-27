// Модуль 7: API FACADE - Единый интерфейс взаимодействия с ИИ (7-api-facade.js) v5.2
'use strict';

import { CONFIG } from './1-config.js';
import { State } from './3-state.js';
import { API_Request } from './7-1-api-request.js';
import { API_Response } from './7-2-api-response.js';
import { Render } from './5-render.js';
import { DOM } from './4-dom.js';
import { Audit } from './8-audit.js';
import { PROMPTS } from './prompts.js';

// ============================================================================
// УНИВЕРСАЛЬНЫЙ КОНСТРУКТОР СИСТЕМНОГО ПРОМПТА (обновлён)
// ============================================================================

/**
 * Создает универсальный системный промпт для ЛЮБОГО сценария
 * @returns {string} Универсальный системный промпт
 */
function constructUniversalInstructionsPrompt() {
    return PROMPTS.system.gameMaster; // уже полный, собранный из всех протоколов
    //customGameOTO.system.gameMaster??
}

/**
 * Создает системный промпт для автора сценариев (генерации начальной сцены)
 * @returns {string} Промпт для генерации начальных сцен
 */
function constructScenarioWriterPrompt() {
    return PROMPTS.system.scenarioWriter;
}

// ============================================================================
// ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ (без изменений)
// ============================================================================

/**
 * Получает информацию о провайдере API на основе текущих настроек.
 * @param {Object} state - Состояние игры
 * @returns {Object} Объект с url, apiKey и флагом isVsegpt
 */
function getProviderInfo(state) {
    const isVsegpt = state.settings.apiProvider === 'vsegpt';
    const apiKey = isVsegpt ? state.settings.apiKeyVsegpt : state.settings.apiKeyOpenrouter;
    const apiUrl = isVsegpt ?
        'https://api.vsegpt.ru/v1/chat/completions' :
        'https://openrouter.ai/api/v1/chat/completions';
    
    return { url: apiUrl, apiKey: apiKey, isVsegpt: isVsegpt };
}

/**
 * ОСНОВНАЯ ФУНКЦИЯ: Отправляет запрос игрового хода к LLM
 * @param {Object} updatedState - Состояние ПОСЛЕ применения изменений от действий
 * @param {Array} selectedActions - Массив выбранных действий в формате [{text, result, delta}]
 * @param {AbortController|null} abortController - Контроллер для возможности отмены запроса
 * @param {number} d10 - Общий бросок удачи на ход (1-10)
 * @returns {Promise<Object>} Промис, разрешающийся в очищенный JSON-объект
 */
async function sendAIRequest(updatedState, selectedActions, abortController = null, d10) {
    const state = State.getState(); // Получаем оригинальное состояние для настроек
    const { url, apiKey, isVsegpt } = getProviderInfo(state);
    
    // Валидация наличия API-ключа
    if (!apiKey) {
        throw new Error("API Key missing. Please go to Settings and enter your API key.");
    }
    
    const headers = prepareHeaders(apiKey, isVsegpt);
    const requestPayload = prepareGameRequestPayload(updatedState, selectedActions, d10);
    applyProviderSpecificSettings(requestPayload, isVsegpt, updatedState);
    
    const auditEntry = createAuditEntryForGameTurn(selectedActions, requestPayload, updatedState, d10);
    
    try {
        const startTime = Date.now();
        
        // Вызов robustFetchWithRepair с правильными аргументами
        const { rawResponseText, processedData } = await API_Response.robustFetchWithRepair(
            url,
            headers,
            requestPayload,
            CONFIG.autoRepairAttempts,
            API_Request,
            abortController
        );
        
        const responseTime = Date.now() - startTime;
        
        updateAIMemory(processedData);
        
        // ===== НОВОЕ: Обработка _metaParsed =====
        if (processedData._metaParsed) {
            const meta = processedData._metaParsed;
            if (meta.metaContext) {
                State.setMetaContext(meta.metaContext);
            }
            // Сохраняем остальные неизвестные поля (опционально)
            meta.unknownFields.forEach(f => State.addUnknownField(f));
            meta.unknownArrays.forEach(arr => State.addUnknownArray(arr));
            meta.unknownObjects.forEach(obj => State.addUnknownObject(obj));
        }
        
        // Сохраняем успех с полным ответом
        Audit.updateEntrySuccess(auditEntry, rawResponseText);
        updateModelStats(state, responseTime);
        
        console.log(`💬 Ответ получен за ${responseTime}мс`);
        return processedData;
        
    } catch (error) {
        // Обновляем ошибку с полным ответом
        const modelInState = state.models.find(model => model.id === state.settings.model);
        if (modelInState) modelInState.status = 'error';
        
        // Сохраняем в аудит полный ответ (если есть)
        Audit.updateEntryError(auditEntry, error, error.rawResponse);
        
        console.error(`🔥 Ошибка запроса к ИИ:`, error.message);
        if (error.rawResponse) {
            console.log('📄 Полный ответ сервера при ошибке:');
            Audit.logToConsole(`🔥 [FULL ERROR RESPONSE]`, error.rawResponse);
        }
        
        throw error;
    }
}

/**
 * Генерирует кастомную начальную сцену на основе пользовательского промпта
 * @param {string} promptText - Пользовательский промпт для генерации сцены
 * @returns {Promise<Object>} Объект с распарсенными данными сцены
 */
async function generateCustomScene(promptText) {
    const state = State.getState();
    const { url, apiKey } = getProviderInfo(state);
    
    if (!apiKey) {
        throw new Error("API Key needed to generate a custom scene. Please enter it in Settings.");
    }
    
    const headers = prepareHeaders(apiKey, state.settings.apiProvider === 'vsegpt');
    
    const systemPrompt = constructScenarioWriterPrompt();
    const universalInstructions = constructUniversalInstructionsPrompt();
    
    const userPrompt = `${promptText}
  ### ИНСТРУКЦИИ:
  ${universalInstructions}`;
    
    const requestBody = {
        model: state.settings.model,
        messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt }
        ],
        max_tokens: 10000,
        temperature: 0.85
    };
    
    if (state.settings.apiProvider !== 'vsegpt') {
        requestBody.response_format = { type: "json_object" };
    }
    
    const auditEntry = Audit.createEntry(
        "Генерация Начальной Сцены",
        requestBody,
        state.settings.model,
        state.settings.apiProvider
    );
    
    try {
        // Получаем сырой ответ
        const rawResponseText = await API_Request.executeFetchRaw(url, headers, requestBody);
        let content;
        
        try {
            // Парсим для извлечения контента
            const parsed = JSON.parse(rawResponseText);
            content = parsed.choices?.[0]?.message?.content || "";
            
            if (content.startsWith('{') && content.endsWith('}')) {
                try {
                    const jsonContent = JSON.parse(content);
                    content = JSON.stringify(jsonContent, null, 2);
                } catch (e) {
                    // Оставляем как есть
                }
            }
        } catch (parseError) {
            console.warn("Не удалось распарсить ответ при генерации сцены:", parseError);
            content = rawResponseText;
        }
        
        // Обрабатываем ответ через processAIResponse, чтобы получить полную структуру с _metaParsed
        const processedData = API_Response.processAIResponse(content);
        
        // Логируем успех (Сырой текст)
        Audit.updateEntrySuccess(auditEntry, rawResponseText);
        
        return processedData; // теперь возвращаем объект, а не строку
    } catch (error) {
        // Логируем ошибку
        console.error('❌ Ошибка генерации кастомной сцены:', error);
        Audit.updateEntryError(auditEntry, error, error.rawResponse);
        throw error;
    }
}

/**
 * Выполняет быстрый тест подключения к API-провайдеру.
 * @returns {Promise<void>}
 */
async function testCurrentProvider() {
    const currentState = State.getState();
    const domElements = DOM.getDOM();
    
    const selectedProvider = domElements.inputs.provider.value;
    let apiKeyForTest;
    
    if (selectedProvider === 'vsegpt') {
        apiKeyForTest = domElements.inputs.keyVsegpt.value;
    } else {
        apiKeyForTest = domElements.inputs.keyOpenrouter.value;
    }
    
    if (!apiKeyForTest) {
        if (Render) Render.showErrorAlert(
            "Testing Error",
            `Please enter the API Key for ${selectedProvider} provider first.`
        );
        return;
    }
    
    const testButton = document.getElementById('testCurrentProviderBtn');
    const originalButtonHtml = testButton ? testButton.innerHTML : "Test Provider";
    
    if (testButton) {
        testButton.innerHTML = '<span class="spinner"></span> Checking connection...';
        testButton.disabled = true;
    }
    
    const isSelectedVsegpt = selectedProvider === 'vsegpt';
    const apiTestUrl = isSelectedVsegpt ?
        'https://api.vsegpt.ru/v1/chat/completions' :
        'https://openrouter.ai/api/v1/chat/completions';
    
    const headers = prepareHeaders(apiKeyForTest, isSelectedVsegpt);
    const testBody = {
        model: isSelectedVsegpt ? 'openai/gpt-3.5-turbo-16k' : 'gpt-3.5-turbo',
        messages: [{ role: "user", content: PROMPTS.testProvider }],
        max_tokens: 10
    };
    
    const auditEntry = Audit.createEntry(
        "Тест Провайдера",
        testBody,
        testBody.model,
        selectedProvider
    );
    
    try {
        const rawResponseText = await API_Request.executeFetchRaw(apiTestUrl, headers, testBody);
        Audit.updateEntrySuccess(auditEntry, rawResponseText);
        
        if (Render) Render.showSuccessAlert(
            "Connection Successful",
            `API Key for ${selectedProvider} is valid and connection works!`
        );
        
    } catch (error) {
        Audit.updateEntryError(auditEntry, error, error.rawResponse);
        
        if (Render) Render.showErrorAlert(
            "Connection Error",
            `Failed to connect to ${selectedProvider}. \nDetails: ${error.message}`,
            error
        );
    } finally {
        if (testButton) {
            testButton.innerHTML = originalButtonHtml;
            testButton.disabled = false;
        }
    }
}

/**
 * Выполняет тест выбранной LLM-модели.
 * @returns {Promise<void>}
 */
async function testSelectedModel() {
    const currentState = State.getState();
    const domElements = DOM.getDOM();
    const modelToTestId = domElements.inputs.model.value;
    
    if (!modelToTestId) {
        if (Render) Render.showErrorAlert("Testing Error", "Please select a model from the list first!");
        return;
    }
    
    const selectedProvider = domElements.inputs.provider.value;
    const apiKeyForModel = selectedProvider === 'vsegpt' ?
        domElements.inputs.keyVsegpt.value :
        domElements.inputs.keyOpenrouter.value;
    
    if (!apiKeyForModel) {
        if (Render) Render.showErrorAlert(
            "Testing Error",
            `Please enter the API Key for ${selectedProvider} provider first.`
        );
        return;
    }
    
    const testButton = document.getElementById('testSelectedModelBtn');
    const originalButtonHtml = testButton ? testButton.innerHTML : "Test Model";
    
    if (testButton) {
        testButton.innerHTML = '<span class="spinner"></span> Testing Model...';
        testButton.disabled = true;
    }
    
    const isSelectedVsegpt = selectedProvider === 'vsegpt';
    const apiTestUrl = isSelectedVsegpt ?
        'https://api.vsegpt.ru/v1/chat/completions' :
        'https://openrouter.ai/api/v1/chat/completions';
    
    const headers = prepareHeaders(apiKeyForModel, isSelectedVsegpt);
    const testBody = {
        model: modelToTestId,
        messages: [{ role: "user", content: PROMPTS.testModel }],
        max_tokens: 100
    };
    
    const auditEntry = Audit.createEntry(
        `Тест Модели: ${modelToTestId}`,
        testBody,
        modelToTestId,
        selectedProvider
    );
    
    try {
        const startTime = Date.now();
        const rawResponseText = await API_Request.executeFetchRaw(apiTestUrl, headers, testBody);
        const duration = Date.now() - startTime;
        
        let result;
        try {
            result = JSON.parse(rawResponseText);
        } catch (e) {
            throw new Error(`Невалидный JSON: ${e.message}`);
        }
        
        // Лог успеха
        Audit.updateEntrySuccess(auditEntry, rawResponseText);
        
        const modelResponseText = result.choices?.[0]?.message?.content ||
            "No text output received from model.";
        
        updateModelTestResult(currentState, modelToTestId, duration, modelResponseText);
        
        if (Render) {
            Render.showSuccessAlert(
                "Модель успешно протестирована!",
                `Ответ получен за: ${duration}мс.\n\nСодержание: \n${modelResponseText}`
            );
        }
        
    } catch (error) {
        handleModelTestError(error, currentState, modelToTestId, auditEntry);
    } finally {
        cleanupTestButton(testButton, originalButtonHtml);
        updateUIAfterTest(currentState);
    }
}

// ============================================================================
// ВСПОМОГАТЕЛЬНЫЕ МЕТОДЫ 
// ============================================================================

/**
 * Подготавливает заголовки HTTP-запроса
 * @param {string} apiKey - API ключ
 * @param {boolean} isVsegpt - Флаг провайдера VSEGPT
 * @returns {Object} Заголовки HTTP-запроса
 */
function prepareHeaders(apiKey, isVsegpt) {
    const headers = {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
    };
    
    if (!isVsegpt) {
        headers['HTTP-Referer'] = 'https://oto-quest.app';
        headers['X-Title'] = 'OTO Quest';
    }
    
    return headers;
}

/**
 * Подготавливает payload для игрового запроса с универсальным системным промптом
 * @param {Object} updatedState - Состояние игры
 * @param {Array} selectedActions - Выбранные действия
 * @param {number} d10 - Бросок удачи
 * @returns {Object} Payload запроса
 */
function prepareGameRequestPayload(updatedState, selectedActions, d10) {
    return API_Request.prepareRequestPayload(updatedState, selectedActions, d10);
}

/**
 * Применяет специфичные настройки для провайдера и модели
 * @param {Object} payload - Payload запроса
 * @param {boolean} isVsegpt - Флаг провайдера VSEGPT
 * @param {Object} state - Состояние игры
 */
function applyProviderSpecificSettings(payload, isVsegpt, state) {
    // Ограничение токенов для VSEGPT с определенной моделью
    if (isVsegpt && state.settings.model.includes('gpt-3.5-turbo-16k')) {
        payload.max_tokens = 1000;
    }
    
    // Включаем JSON mode для OpenRouter
    if (!isVsegpt) {
        payload.response_format = { type: "json_object" };
    }
}

/**
 * Создает запись аудита для игрового хода
 * @param {Array} selectedActions - Выбранные действия
 * @param {Object} payload - Payload запроса
 * @param {Object} state - Состояние игры
 * @param {number} d10 - Бросок удачи
 * @returns {Object} Запись аудита
 */
function createAuditEntryForGameTurn(selectedActions, payload, state, d10) {
    const actionsDescription = Array.isArray(selectedActions) ?
        selectedActions.map(action => action.text).join(', ') :
        String(selectedActions);
    
    const maxAuditTitleLength = 100;
    const shortDescription = actionsDescription.length > maxAuditTitleLength ?
        actionsDescription.substring(0, maxAuditTitleLength) + '...' :
        actionsDescription;
    
    const auditEntry = Audit.createEntry(
        `Игровой ход: ${shortDescription}`,
        payload,
        state.settings.model,
        state.settings.apiProvider
    );
    
    auditEntry.d10 = d10;
    auditEntry.gameType = state.gameType;
    
    return auditEntry;
}

/**
 * Обновляет память AI на основе ответа
 * @param {Object} processedData - Обработанные данные ответа
 */
function updateAIMemory(processedData) {
    if (processedData.aiMemory && Object.keys(processedData.aiMemory).length > 0) {
        const currentState = State.getState();
        const updatedMemory = {
            ...currentState.gameState.aiMemory,
            ...processedData.aiMemory
        };
        
        currentState.gameState.aiMemory = updatedMemory;
        State.setState({
            gameState: {
                ...currentState.gameState,
                aiMemory: updatedMemory
            }
        });
        
        console.log("🧠 AI Memory updated:", Object.keys(processedData.aiMemory));
    }
}

/**
 * Обновляет статистику модели после успешного запроса
 * @param {Object} state - Состояние игры
 * @param {number} responseTime - Время ответа в миллисекундах
 */
function updateModelStats(state, responseTime) {
    const modelInState = state.models.find(model => model.id === state.settings.model);
    if (modelInState) {
        modelInState.status = 'success';
        modelInState.responseTime = responseTime;
        modelInState.lastTested = new Date().toISOString();
    }
}

/**
 * Обновляет результат тестирования модели
 * @param {Object} state - Состояние игры
 * @param {string} modelId - ID модели
 * @param {number} duration - Время ответа
 * @param {string} responseText - Текст ответа
 */
function updateModelTestResult(state, modelId, duration, responseText) {
    const modelInState = state.models.find(model => model.id === modelId);
    if (modelInState) {
        modelInState.status = 'success';
        modelInState.lastTested = new Date().toISOString();
        modelInState.responseTime = duration;
        
        if (responseText.length > 0) {
            modelInState.description = responseText.trim();
        }
    }
}

/**
 * Обрабатывает ошибки тестирования модели
 * @param {Error} error - Ошибка
 * @param {Object} state - Состояние игры
 * @param {string} modelId - ID модели
 * @param {Object} auditEntry - Запись аудита
 */
function handleModelTestError(error, state, modelId, auditEntry) {
    const modelInState = state.models.find(model => model.id === modelId);
    if (modelInState) modelInState.status = 'error';
    
    Audit.updateEntryError(auditEntry, error, error.rawResponse);
    
    if (Render) {
        Render.showErrorAlert(
            "Модель провалила тест",
            `Модель '${modelId}' не ответила или вернула ошибку. \nДетали: ${error.message}`,
            error
        );
    }
}

/**
 * Очищает кнопку тестирования после завершения
 * @param {HTMLElement} testButton - DOM элемент кнопки
 * @param {string} originalHtml - Оригинальный HTML кнопки
 */
function cleanupTestButton(testButton, originalHtml) {
    if (testButton) {
        testButton.innerHTML = originalHtml;
        testButton.disabled = false;
    }
}

/**
 * Обновляет UI после тестирования
 * @param {Object} state - Состояние игры
 */
function updateUIAfterTest(state) {
    if (Render) {
        localStorage.setItem('oto_models_status', JSON.stringify(state.models));
        Render.updateModelStats();
        Render.renderModelSelectorByProvider();
        Render.updateModelDetails();
        Audit.renderAuditList();
    }
}

// ============================================================================
// ЭКСПОРТ ЕДИНОГО ИНТЕРФЕЙСА API
// ============================================================================

export const API = {
    // Основные функции
    sendAIRequest,
    generateCustomScene,
    testCurrentProvider,
    testSelectedModel,
    
    // Конструкторы промптов
    constructUniversalInstructionsPrompt,
    constructScenarioWriterPrompt,
    
    // Вспомогательные функции (для тестирования и отладки)
    getProviderInfo,
    prepareHeaders,
    prepareGameRequestPayload,
    applyProviderSpecificSettings,
    createAuditEntryForGameTurn,
    updateAIMemory,
    updateModelStats,
    updateModelTestResult,
    handleModelTestError,
    cleanupTestButton,
    updateUIAfterTest
};