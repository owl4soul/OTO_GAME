// Модуль 7: API FACADE - Единый интерфейс взаимодействия с ИИ (7-api-facade.js)
'use strict';

import { CONFIG } from './1-config.js';
import { State } from './3-state.js';
import { API_Request } from './7-1-api-request.js';
import { API_Response } from './7-2-api-response.js';
import { Render } from './5-render.js';
import { DOM } from './4-dom.js';
import { Audit } from './8-audit.js';

const Prompts = CONFIG.prompts;

/**
 * Вспомогательная функция для получения специфической информации о текущем API-провайдере
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
 * @param {string} actionResultsText - Форматированные результаты действий
 * @param {AbortController|null} abortController - Контроллер для возможности отмены запроса
 * @returns {Promise<Object>} Промис, разрешающийся в очищенный JSON-объект
 */
async function sendAIRequest(updatedState, actionResultsText, abortController = null) {
    const state = State.getState(); // Получаем оригинальное состояние для настроек
    const { url, apiKey, isVsegpt } = getProviderInfo(state);
    
    // Валидация наличия API-ключа
    if (!apiKey) {
        throw new Error("API Key missing. Please go to Settings and enter your API key.");
    }
    
    // Подготовка заголовков HTTP-запроса
    const headers = {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
    };
    
    // Для OpenRouter требуются специальные заголовки
    if (!isVsegpt) {
        headers['HTTP-Referer'] = 'https://oto-quest.app';
        headers['X-Title'] = 'OTO Quest';
    }
    
    // --- ЭТАП 1: ПОДГОТОВКА PAYLOAD ---
    const requestPayload = API_Request.prepareRequestPayload(updatedState, actionResultsText, null, null);
    
    // Специфические настройки для моделей/провайдеров
    if (isVsegpt && updatedState.settings.model.includes('gpt-3.5-turbo-16k')) {
        requestPayload.max_tokens = 1000;
    }
    
    // Включаем "JSON mode" для OpenRouter
    if (!isVsegpt) {
        requestPayload.response_format = { type: "json_object" };
    }
    
    // --- ЛОГИРОВАНИЕ: СОЗДАНИЕ ЗАПИСИ ---
    const auditEntry = Audit.createEntry(
        `Игровой ход: ${actionResultsText.substring(0, 50)}...`,
        requestPayload,
        updatedState.settings.model,
        updatedState.settings.apiProvider
    );
    
    // --- ЭТАП 2: ВЫПОЛНЕНИЕ ЗАПРОСА И ОБРАБОТКА ОТВЕТА ---
    try {
        const startTime = Date.now();
        
        // Вызов robustFetchWithRepair с правильными аргументами
        const processingResult = await API_Response.robustFetchWithRepair(
            url,
            headers,
            requestPayload,
            CONFIG.autoRepairAttempts,
            API_Request,
            abortController
        );
        
        const responseTime = Date.now() - startTime;
        
        // --- ЭТАП 3: ОБНОВЛЕНИЕ ДИНАМИЧЕСКОЙ ПАМЯТИ ---
        if (processingResult.memoryUpdate && Object.keys(processingResult.memoryUpdate).length > 0) {
            const currentState = State.getState();
            currentState.aiMemory = { ...currentState.aiMemory, ...processingResult.memoryUpdate };
            State.setState({ aiMemory: currentState.aiMemory });
            console.log("🧠 AI Memory updated:", Object.keys(processingResult.memoryUpdate));
        }
        
        // --- ЛОГИРОВАНИЕ: УСПЕХ ---
        Audit.updateEntrySuccess(auditEntry, processingResult.rawText);
        
        // Обновление статистики модели
        const modelInState = state.models.find(model => model.id === state.settings.model);
        if (modelInState) {
            modelInState.status = 'success';
            modelInState.responseTime = responseTime;
            modelInState.lastTested = new Date().toISOString();
        }
        
        // Возвращаем очищенные игровые данные
        return processingResult.cleanData;
        
    } catch (error) {
        // Если произошла ошибка, помечаем модель как проблемную
        const modelInState = state.models.find(model => model.id === state.settings.model);
        if (modelInState) modelInState.status = 'error';
        
        // --- ЛОГИРОВАНИЕ: ОШИБКА ---
        if (error.rawResponse) {
            auditEntry.fullResponse = error.rawResponse;
        }
        
        Audit.updateEntryError(auditEntry, error);
        
        // Пробрасываем ошибку дальше
        throw error;
    }
}

// Остальные функции (generateCustomScene, testCurrentProvider, testSelectedModel) остаются без изменений
// но должны использовать исправленный API_Request.executeFetch


/**
 * Генерирует начальную сцену или кастомный сюжет по запросу из UI Настроек.
 * Теперь тоже полностью логируется через Audit.
 * 
 * @param {string} promptText - Произвольный промпт для генерации сюжета.
 * @returns {Promise<string>} Сырой текстовый контент от LLM.
 */
async function generateCustomScene(promptText) {
    const state = State.getState();
    const { url, apiKey } = getProviderInfo(state);
    
    if (!apiKey) throw new Error("API Key needed to generate a custom scene. Please enter it in Settings.");
    
    const headers = {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
    };
    
    const requestBody = {
        model: state.settings.model,
        messages: [
            { role: "system", content: Prompts.system.scenarioWriter },
            { role: "user", content: promptText }
        ],
        max_tokens: 10000,
        temperature: 0.85
    };
    
    // Создаем лог
    const auditEntry = Audit.createEntry("Генерация Сюжета", requestBody, state.settings.model, state.settings.apiProvider);
    
    try {
        const rawApiResponse = await API_Request.executeFetch(url, headers, requestBody);
        const content = rawApiResponse.choices[0].message.content;
        
        // Логируем успех (Сырой текст)
        Audit.updateEntrySuccess(auditEntry, content);
        
        return content;
    } catch (error) {
        // Логируем ошибку
        // Здесь rawResponse может не быть, так как executeFetch кидает ошибку до чтения контента при сбоях сети
        // Но если мы бы обрабатывали ответ как в sendAIRequest, было бы так же.
        // Сейчас достаточно просто залогировать саму ошибку.
        Audit.updateEntryError(auditEntry, error);
        throw error;
    }
}

/**
 * Выполняет быстрый тест подключения к API-провайдеру.
 * Теперь тоже полностью логируется.
 * 
 * @returns {Promise<void>}
 */
async function testCurrentProvider() {
    const currentState = State.getState();
    const domElements = DOM.getDOM(); // Получаем ссылки на DOM-элементы ввода.
    
    const selectedProvider = domElements.inputs.provider.value;
    let apiKeyForTest;
    
    if (selectedProvider === 'vsegpt') {
        apiKeyForTest = domElements.inputs.keyVsegpt.value;
    } else {
        apiKeyForTest = domElements.inputs.keyOpenrouter.value;
    }
    
    if (!apiKeyForTest) {
        if (Render) Render.showErrorAlert("Testing Error", `Please enter the API Key for ${selectedProvider} provider first.`);
        return;
    }
    
    const testButton = document.getElementById('testCurrentProviderBtn');
    const originalButtonHtml = testButton ? testButton.innerHTML : "Test Provider";
    if (testButton) {
        testButton.innerHTML = '<span class="spinner"></span> Checking connection...';
        testButton.disabled = true;
    }
    
    const isSelectedVsegpt = selectedProvider === 'vsegpt';
    const apiTestUrl = isSelectedVsegpt ? 'https://api.vsegpt.ru/v1/chat/completions' : 'https://openrouter.ai/api/v1/chat/completions';
    const testHeaders = {
        'Authorization': `Bearer ${apiKeyForTest}`,
        'Content-Type': 'application/json'
    };
    if (!isSelectedVsegpt) testHeaders['HTTP-Referer'] = 'https://oto-quest.app';
    
    const testBody = {
        model: isSelectedVsegpt ? 'openai/gpt-3.5-turbo-16k' : 'gpt-3.5-turbo',
        messages: [{ role: "user", content: Prompts.technical.testMessage }],
        max_tokens: 10
    };
    
    // Создаем лог
    const auditEntry = Audit.createEntry("Тест Провайдера", testBody, testBody.model, selectedProvider);
    
    try {
        const result = await API_Request.executeFetch(apiTestUrl, testHeaders, testBody);
        
        // Лог успеха
        Audit.updateEntrySuccess(auditEntry, result);
        
        if (Render) Render.showSuccessAlert("Connection Successful", `API Key for ${selectedProvider} is valid and connection works!`);
        
    } catch (error) {
        // Лог ошибки
        Audit.updateEntryError(auditEntry, error);
        
        if (Render) Render.showErrorAlert("Connection Error", `Failed to connect to ${selectedProvider}. \nDetails: ${error.message}`, error);
    } finally {
        if (testButton) {
            testButton.innerHTML = originalButtonHtml;
            testButton.disabled = false;
        }
    }
}

/**
 * Выполняет тест выбранной LLM-модели.
 * Теперь тоже полностью логируется.
 * 
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
    const apiKeyForModel = selectedProvider === 'vsegpt' ? domElements.inputs.keyVsegpt.value : domElements.inputs.keyOpenrouter.value;
    
    if (!apiKeyForModel) {
        if (Render) Render.showErrorAlert("Testing Error", `Please enter the API Key for ${selectedProvider} provider first.`);
        return;
    }
    
    const testButton = document.getElementById('testSelectedModelBtn');
    const originalButtonHtml = testButton ? testButton.innerHTML : "Test Model";
    if (testButton) {
        testButton.innerHTML = '<span class="spinner"></span> Testing Model...';
        testButton.disabled = true;
    }
    
    const isSelectedVsegpt = selectedProvider === 'vsegpt';
    const apiTestUrl = isSelectedVsegpt ? 'https://api.vsegpt.ru/v1/chat/completions' : 'https://openrouter.ai/api/v1/chat/completions';
    const testHeaders = {
        'Authorization': `Bearer ${apiKeyForModel}`,
        'Content-Type': 'application/json'
    };
    if (!isSelectedVsegpt) testHeaders['HTTP-Referer'] = 'https://oto-quest.app';
    
    const testBody = {
        model: modelToTestId,
        messages: [{ role: "user", content: Prompts.technical.testSelf }],
        max_tokens: 100
    };
    
    // Создаем лог
    const auditEntry = Audit.createEntry(`Тест Модели: ${modelToTestId}`, testBody, modelToTestId, selectedProvider);
    
    try {
        const startTime = Date.now();
        const result = await API_Request.executeFetch(apiTestUrl, testHeaders, testBody);
        const duration = Date.now() - startTime;
        
        // Лог успеха
        Audit.updateEntrySuccess(auditEntry, result);
        
        const modelResponseText = result.choices?.[0]?.message?.content || "No text output received from model.";
        const modelInState = currentState.models.find(model => model.id === modelToTestId);
        if (modelInState) {
            modelInState.status = 'success';
            modelInState.lastTested = new Date().toISOString();
            modelInState.responseTime = duration;
            // Если модель вернула описание — сохраняем
            if (modelResponseText.length > 0) {
                modelInState.description = modelResponseText.trim();
            } else {
                if (result.choices?.[0]?.message?.content) {
                    modelInState.description = result.choices[0].message.content;
                }
            }
        }
        
        if (Render) {
            Render.showSuccessAlert("Модель успешно протестирована!", `Ответ получен за: ${duration}мс.\n\nСодержание: \n${modelResponseText}`);
        }
        
    } catch (error) {
        // Лог ошибки
        Audit.updateEntryError(auditEntry, error);
        
        const modelInState = currentState.models.find(model => model.id === modelToTestId);
        if (modelInState) modelInState.status = 'error';
        
        if (Render) {
            Render.showErrorAlert(
                "Модель провалила тест",
                `Модель '${modelToTestId}' не ответила или вернула ошибку. \nДетали: ${error.message}`,
                error
            );
        }
    } finally {
        if (testButton) {
            testButton.innerHTML = originalButtonHtml;
            testButton.disabled = false;
        }
        if (Render) {
            // Сохраняем в память браузера
            localStorage.setItem('oto_models_status', JSON.stringify(currentState.models));
            // ВАЖНО: Обновляем 4 значка статистики
            Render.updateModelStats();
            // Обновляем список (чтобы появилась галочка)
            Render.renderModelSelectorByProvider();
            // Обновляем текст деталей
            Render.updateModelDetails();
            // Обновляем аудит
            Render.renderAuditList();
        }
    }
}

// ЭКСПОРТ ЕДИНОГО ИНТЕРФЕЙСА API ДЛЯ ДРУГИХ МОДУЛЕЙ.
export const API = {
    sendAIRequest,
    generateCustomScene,
    testCurrentProvider,
    testSelectedModel
};