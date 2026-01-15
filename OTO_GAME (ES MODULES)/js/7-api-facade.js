// Модуль 7: API FACADE - Единый интерфейс взаимодействия с ИИ (7-api-facade.js)
'use strict';

import { CONFIG } from './1-config.js';
import { State } from './3-state.js';
import { API_Request } from './7-1-api-request.js';
import { API_Response } from './7-2-api-response.js';
import { Render } from './5-render.js';
import { DOM } from './4-dom.js';

const Prompts = CONFIG.prompts;

/**
 * Вспомогательная функция для получения специфической информации о текущем API-провайдере.
 * Используется для определения URL конечной точки и API-ключа.
 * 
 * @param {Object} state - Текущее состояние игры.
 * @returns {Object} Объект с URL, API-ключом и флагом, указывающим на VseGpt.
 */
function getProviderInfo(state) {
    const isVsegpt = state.settings.apiProvider === 'vsegpt';
    const apiKey = isVsegpt ? state.settings.apiKeyVsegpt : state.settings.apiKeyOpenrouter;
    const apiUrl = isVsegpt 
        ? 'https://api.vsegpt.ru/v1/chat/completions' 
        : 'https://openrouter.ai/api/v1/chat/completions';
    
    return { url: apiUrl, apiKey: apiKey, isVsegpt: isVsegpt };
}

/**
 * ОСНОВНАЯ ФУНКЦИЯ: Отправляет запрос игрового хода к LLM и обрабатывает его ответ.
 * Это центральный метод, через который игровая логика (`Game.js`) взаимодействует с AI.
 * Включает в себя полную цепочку: подготовка запроса, выполнение запроса, автоматический ремонт JSON,
 * парсинг ответа, обновление динамической памяти и запись в аудит.
 * 
 * @param {string} choiceText - Текстовое описание действия, которое выбрал или ввел игрок.
 * @param {number} d10 - Результат броска виртуального кубика d10.
 * @param {Object|null} auditEntry - Объект для записи данных запроса/ответа в аудит-лог.
 * @param {AbortController|null} abortController - Контроллер для возможности отмены запроса.
 * @returns {Promise<Object>} Промис, разрешающийся в очищенный и валидированный JSON-объект, представляющий новую сцену и изменения.
 * @throws {Error} Пробрасывает ошибку в случае критических сбоев в API или парсинге.
 */
async function sendAIRequest(choiceText, d10, auditEntry = null, abortController = null) {
    const state = State.getState(); // Получаем актуальное состояние игры
    const { url, apiKey, isVsegpt } = getProviderInfo(state); // Определяем провайдера и ключ

    // Валидация наличия API-ключа
    if (!apiKey) {
        throw new Error("API Key missing. Please go to Settings and enter your API key.");
    }

    // Подготовка заголовков HTTP-запроса
    const headers = {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
    };
    // Для OpenRouter требуются специальные заголовки Referer для правильной работы биллинга
    if (!isVsegpt) {
        headers['HTTP-Referer'] = 'https://oto-quest.app';
        headers['X-Title'] = 'OTO Quest';
    }

    // --- ЭТАП 1: ПОДГОТОВКА PAYLOAD (через API_Request) ---
    // Модуль API_Request собирает все части промпта и данные игрока в готовый JSON-объект.
    const requestPayload = API_Request.prepareRequestPayload(state, choiceText, d10);

    // Специфические настройки для определенных моделей/провайдеров
    // Для vsegpt/gpt-3.5-turbo-16k, ограничиваем max_tokens (чтобы не переплачивать)
    if (isVsegpt && state.settings.model.includes('gpt-3.5-turbo-16k')) {
        requestPayload.max_tokens = 1000;
    }
    // Включаем "JSON mode" для OpenRouter (OpenAI-подобные API), если LLM-модель его поддерживает.
    // Это повышает вероятность получения валидного JSON.
    if (!isVsegpt) { // Assuming OpenRouter supports this best
        requestPayload.response_format = { type: "json_object" };
    }

    // Логирование запроса в Audit Log для отладки.
    if (auditEntry) {
        auditEntry.requestDebug = { 
            url: url, 
            headers: headers, 
            body: JSON.stringify(requestPayload, null, 2) 
        };
    }

    // --- ЭТАП 2: ВЫПОЛНЕНИЕ ЗАПРОСА И ОБРАБОТКА ОТВЕТА (через API_Response) ---
    try {
        const startTime = Date.now(); // Фиксируем время начала запроса

        // Вызов `API_Response.robustFetchWithRepair` - это сердце обработки LLM.
        // Он выполняет fetch-запрос, затем многократно пытается его отремонтировать,
        // если полученный JSON невалиден, и, наконец, парсит его.
        const processingResult = await API_Response.robustFetchWithRepair(
            url, 
            headers, 
            requestPayload, 
            CONFIG.autoRepairAttempts, // Количество попыток авто-ремонта
            API_Request,                      // Ссылка на модуль API_Request для выполнения fetch
            abortController                   // Контроллер отмены
        );
        
        // `processingResult` будет содержать: 
        // `processingResult.cleanData` (распарсенный и валидный JSON сцены)
        // `processingResult.memoryUpdate` (объект с новыми полями для aiMemory)

        const responseTime = Date.now() - startTime; // Время ответа LLM

        // --- ЭТАП 3: ОБНОВЛЕНИЕ СОСТОЯНИЯ ИГРЫ И МЕТАДАННЫХ ---
        
        // Обновление Динамической Памяти ИИ (`aiMemory`)
        if (processingResult.memoryUpdate && Object.keys(processingResult.memoryUpdate).length > 0) {
            const currentState = State.getState();
            // Объединяем старую память с новыми полями.
            // Новые поля из `memoryUpdate` перезаписывают старые, если ключи совпадают.
            currentState.aiMemory = { ...currentState.aiMemory, ...processingResult.memoryUpdate };
            State.setState({ aiMemory: currentState.aiMemory });
            console.log("STATE UPDATED: AI Memory expanded with new dynamic fields.");
        }

        // Запись полного (отремонтированного) ответа LLM в Audit Log.
        if (auditEntry) {
            auditEntry.fullResponse = JSON.stringify(processingResult.cleanData, null, 2); 
        }
        
        // Обновление статистики для выбранной LLM-модели (время ответа, статус, дата теста).
        const modelInState = state.models.find(model => model.id === state.settings.model);
        if (modelInState) {
            modelInState.status = 'success';
            modelInState.responseTime = responseTime;
            modelInState.lastTested = new Date().toISOString();
        }

        // Возвращаем очищенные игровые данные.
        // Этот объект будет использоваться в `Game.js` для обновления UI, статов и т.д.
        return processingResult.cleanData;

    } catch (error) {
            // Если произошла какая-либо ошибка (сеть, лимит попыток ремонта JSON),
            // помечаем используемую модель как проблемную.
            const modelInState = state.models.find(model => model.id === state.settings.model);
            if (modelInState) modelInState.status = 'error';
            
            // Пробрасываем ошибку дальше по цепочке, чтобы `Game.js` мог отобразить её пользователю.
            throw error;
    }
}

/**
 * Генерирует начальную сцену или кастомный сюжет по запросу из UI Настроек.
 * Использует упрощенную логику запроса без сложной игровой динамики.
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
    
    // Используем специальный системный промпт для генератора сценариев (из Config)
    const requestBody = {
        model: state.settings.model,
        messages: [
            { role: "system", content: Prompts.system.scenarioWriter },
            { role: "user", content: promptText }
        ],
        max_tokens: 3000, // Разрешаем больше токенов для сценариев
        temperature: 0.85 // Немного более творческий
    };

    const rawApiResponse = await API_Request.executeFetch(url, headers, requestBody);
    
    // Возвращаем прямо контент, UI настроек сам его обработает.
    return rawApiResponse.choices[0].message.content; 
}

/**
 * Выполняет быстрый тест подключения к API-провайдеру (кнопка "Тест текущего провайдера").
 * Проверяет, валиден ли API-ключ и доступна ли конечная точка API.
 * 
 * @returns {Promise<void>}
 */
async function testCurrentProvider() {
    const currentState = State.getState();
    const domElements = DOM.getDOM(); // Получаем ссылки на DOM-элементы ввода.
    
    // Ключи берутся из UI-полей (DOM), а не из `state`, чтобы протестировать даже несохраненные изменения ключа.
    const selectedProvider = domElements.inputs.provider.value;
    let apiKeyForTest;

    if (selectedProvider === 'vsegpt') {
        apiKeyForTest = domElements.inputs.keyVsegpt.value;
    } else {
        apiKeyForTest = domElements.inputs.keyOpenrouter.value;
    }

    if (!apiKeyForTest) {
        if(Render) Render.showErrorAlert("Testing Error", `Please enter the API Key for ${selectedProvider} provider first.`);
        return;
    }
    
    // Управление состоянием кнопки UI во время теста
    const testButton = document.getElementById('testCurrentProviderBtn');
    const originalButtonHtml = testButton ? testButton.innerHTML : "Test Provider";
    if(testButton) { 
        testButton.innerHTML = '<span class="spinner"></span> Checking connection...'; 
        testButton.disabled = true; 
    }

    try {
        const isSelectedVsegpt = selectedProvider === 'vsegpt';
        const apiTestUrl = isSelectedVsegpt ? 'https://api.vsegpt.ru/v1/chat/completions' : 'https://openrouter.ai/api/v1/chat/completions';
        const testHeaders = { 
            'Authorization': `Bearer ${apiKeyForTest}`, 
            'Content-Type': 'application/json' 
        };
        // Специальный заголовок для OpenRouter
        if(!isSelectedVsegpt) testHeaders['HTTP-Referer'] = 'https://oto-quest.app';

        // Минимальный запрос для проверки доступности
        await API_Request.executeFetch(apiTestUrl, testHeaders, {
            model: isSelectedVsegpt ? 'openai/gpt-3.5-turbo-16k' : 'gpt-3.5-turbo', // Используем дефолтную/бесплатную модель для пинга
            messages: [{role: "user", content: Prompts.technical.testMessage}], // Текст из конфига
            max_tokens: 10 // Ограничиваем токены
        });

        if(Render) Render.showSuccessAlert("Connection Successful", `API Key for ${selectedProvider} is valid and connection works!`);

    } catch(error) {
        // Отображаем ошибку подключения
        if(Render) Render.showErrorAlert("Connection Error", `Failed to connect to ${selectedProvider}. \nDetails: ${error.message}`, error);
    } finally {
        // Восстанавливаем состояние кнопки UI
        if(testButton) { testButton.innerHTML = originalButtonHtml; testButton.disabled = false; }
    }
}

/**
 * Выполняет тест выбранной LLM-модели (кнопка "Тест выбранной модели").
 * Отправляет небольшой запрос, чтобы убедиться, что конкретная модель отвечает.
 * 
 * @returns {Promise<void>}
 */
async function testSelectedModel() {
    const currentState = State.getState();
    const domElements = DOM.getDOM();
    const modelToTestId = domElements.inputs.model.value; // ID модели из UI
    
    if (!modelToTestId) {
        if(Render) Render.showErrorAlert("Testing Error", "Please select a model from the list first!");
        return;
    }

    // Получаем ключ из UI, т.к. пользователь мог его изменить, но еще не сохранить в state
    const selectedProvider = domElements.inputs.provider.value; 
    const apiKeyForModel = selectedProvider === 'vsegpt' ? domElements.inputs.keyVsegpt.value : domElements.inputs.keyOpenrouter.value;

    if (!apiKeyForModel) {
        if(Render) Render.showErrorAlert("Testing Error", `Please enter the API Key for ${selectedProvider} provider first.`);
        return;
    }

    // Управление кнопкой UI
    const testButton = document.getElementById('testSelectedModelBtn');
    const originalButtonHtml = testButton ? testButton.innerHTML : "Test Model";
    if(testButton) { 
        testButton.innerHTML = '<span class="spinner"></span> Testing Model...'; 
        testButton.disabled = true; 
    }

    try {
            // Определяем URL API для теста
            const isSelectedVsegpt = selectedProvider === 'vsegpt';
            const apiTestUrl = isSelectedVsegpt ? 'https://api.vsegpt.ru/v1/chat/completions' : 'https://openrouter.ai/api/v1/chat/completions';

            // Заголовки для запроса
            const testHeaders = { 
                'Authorization': `Bearer ${apiKeyForModel}`, 
                'Content-Type': 'application/json' 
            };
            if(!isSelectedVsegpt) testHeaders['HTTP-Referer'] = 'https://oto-quest.app';

            // Базовый запрос "Introduce yourself" для получения описания модели
            const testRequestBody = {
                model: modelToTestId,
                messages: [{role: "user", content: Prompts.technical.testSelf}], // Текст из конфига
                max_tokens: 60 // Краткий ответ
            };

            const requestStartTime = Date.now();
            const testApiResponse = await API_Request.executeFetch(apiTestUrl, testHeaders, testRequestBody);
            const requestDuration = Date.now() - requestStartTime;
            
            const modelResponseText = testApiResponse.choices?.[0]?.message?.content || "No text output received from model.";
            
            // Обновление статуса модели в State
            const modelDetailsInState = currentState.models.find(model => model.id === modelToTestId);
            if(modelDetailsInState) { 
                modelDetailsInState.status = 'success'; 
                modelDetailsInState.lastTested = new Date().toISOString(); 
                modelDetailsInState.responseTime = requestDuration;
                modelDetailsInState.description = modelResponseText.substring(0, 150).trim(); // Сохраняем краткое описание от самой модели
            }
            
            // Обновляем UI
            if(Render) {
                Render.showSuccessAlert(
                    "Model Responded Successfully!", 
                    `Model '${modelToTestId}' replied in ${requestDuration}ms.\n\nResponse:\n"${modelResponseText}"`
                );
                Render.updateModelStats(); // Обновить счетчики в UI
            }

    } catch(error) {
            // Помечаем модель как проблемную в State
            const modelDetailsInState = currentState.models.find(model => model.id === modelToTestId);
            if(modelDetailsInState) modelDetailsInState.status = 'error';
            
            // Отображаем ошибку в UI
            if(Render) Render.showErrorAlert(
                "Model Testing Failed", 
                `Model '${modelToTestId}' did not respond or returned an error. \nDetails: ${error.message}`, 
                error
            );
    } finally {
            // Восстанавливаем состояние кнопки и обновляем UI деталей модели.
            if(testButton) { testButton.innerHTML = originalButtonHtml; testButton.disabled = false; }
            if(Render) {
                Render.updateModelDetails();
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