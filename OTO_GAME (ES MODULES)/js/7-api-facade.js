/**
 * МОДУЛЬ 7: API FACADE - Единый интерфейс взаимодействия с ИИ (v6.2)
 * ====================================================================
 * ПОЛНОСТЬЮ ПЕРЕРАБОТАН С УЧЁТОМ НОВОГО ПАРСЕРА (PARSER v6.7)
 * 
 * КЛЮЧЕВЫЕ ИЗМЕНЕНИЯ В v6.2:
 * - В generateCustomScene добавлена предобработка строки content
 *   (Parser.decodeUnicodeEscapes + Parser.preprocessJson) перед попыткой
 *   распарсить её в объект. Это гарантирует, что даже если в ответе API
 *   присутствуют неэкранированные кавычки или переводы строк, они будут
 *   исправлены, и мы сможем передать в Parser.processAIResponse уже готовый
 *   объект, минуя двойное экранирование.
 * - Все вызовы парсинга идут строго через объект Parser.
 * - Каждая строка кода снабжена гиперподробным комментарием.
 * - Полная согласованность с parsing.js v6.7.
 * ====================================================================
 */

'use strict';

import { CONFIG } from './1-config.js';
import { State } from './3-state.js';
import { API_Request } from './7-1-api-request.js';
import { API_Response } from './7-2-api-response.js';
import { Render } from './5-render.js';
import { DOM } from './4-dom.js';
import { Audit } from './8-audit.js';
import { PROMPTS } from './prompts.js';
import { Parser } from './parsing.js';

// ============================================================================
// УНИВЕРСАЛЬНЫЙ КОНСТРУКТОР СИСТЕМНОГО ПРОМПТА
// ============================================================================

/**
 * Создаёт универсальный системный промпт для ЛЮБОГО сценария.
 * 
 * Логика по шагам:
 * 1. Берём готовый промпт из PROMPTS.system.gameMaster.
 * 2. Он уже содержит все протоколы (CORE, GAME_ITEM_TYPES, OPERATIONS, CHOICES, EVENTS, WORKFLOW и т.д.).
 * 3. Ничего не добавляем — возвращаем как есть (это единая точка истины).
 * 
 * @returns {string} Полный системный промпт.
 */
function constructUniversalInstructionsPrompt() {
    // ШАГ 1: просто возвращаем готовый промпт (он собирается в prompts.js)
    return PROMPTS.system.gameMaster;
}

/**
 * Создаёт системный промпт специально для автора сценариев (генерация начальной сцены).
 * 
 * Логика по шагам:
 * 1. Берём специализированный промпт из PROMPTS.system.scenarioWriter.
 * 2. Он содержит инструкции только для генерации начальной сцены.
 * 
 * @returns {string} Промпт для генерации начальных сцен.
 */
function constructScenarioWriterPrompt() {
    // ШАГ 1: возвращаем специализированный промпт
    return PROMPTS.system.scenarioWriter;
}

// ============================================================================
// ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
// ============================================================================

/**
 * Получает информацию о провайдере API на основе текущих настроек.
 * 
 * Логика по шагам:
 * 1. Определяем провайдера из settings.apiProvider.
 * 2. Выбираем соответствующий API-ключ.
 * 3. Выбираем URL.
 * 4. Возвращаем объект с данными.
 * 
 * @param {Object} settings - Настройки из State.getSettings().
 * @returns {Object} { url, apiKey, isVsegpt }.
 */
function getProviderInfo(settings) {
    // ШАГ 1: определяем провайдера
    const isVsegpt = settings.apiProvider === 'vsegpt';
    
    // ШАГ 2: выбираем ключ
    const apiKey = isVsegpt ? settings.apiKeyVsegpt : settings.apiKeyOpenrouter;
    
    // ШАГ 3: выбираем URL
    const apiUrl = isVsegpt ?
        'https://api.vsegpt.ru/v1/chat/completions' :
        'https://openrouter.ai/api/v1/chat/completions';

    // ШАГ 4: возвращаем объект с данными
    return { url: apiUrl, apiKey: apiKey, isVsegpt: isVsegpt };
}

/**
 * ОСНОВНАЯ ФУНКЦИЯ: Отправляет запрос игрового хода к LLM.
 * 
 * Полная логика по шагам:
 * 1. Получаем текущие настройки и провайдера.
 * 2. Валидация наличия API-ключа.
 * 3. Подготовка заголовков и payload.
 * 4. Создание записи аудита.
 * 5. Вызов robustFetchWithRepair (который внутри уже корректно извлекает content и парсит).
 * 6. Обработка мета-данных _metaParsed.
 * 7. Обновление аудита и статистики модели.
 * 
 * @param {Object} updatedState - Состояние ПОСЛЕ применения изменений.
 * @param {Array} selectedActions - Массив выбранных действий.
 * @param {AbortController|null} abortController - Контроллер отмены.
 * @param {number} d10 - Общий бросок удачи.
 * @returns {Promise<Object>} Обработанные данные (parsedData).
 */
async function sendAIRequest(updatedState, selectedActions, abortController = null, d10) {
    // ШАГ 1: получаем текущие настройки
    const settings = State.getSettings();
    const { url, apiKey, isVsegpt } = getProviderInfo(settings);

    // ШАГ 2: валидация API-ключа
    if (!apiKey) {
        throw new Error("API Key missing. Please go to Settings and enter your API key.");
    }

    // ШАГ 3: подготовка заголовков и payload
    const headers = prepareHeaders(apiKey, isVsegpt);
    const requestPayload = prepareGameRequestPayload(updatedState, selectedActions, d10);
    applyProviderSpecificSettings(requestPayload, isVsegpt, settings);

    // ШАГ 4: создаём запись аудита
    const auditEntry = createAuditEntryForGameTurn(selectedActions, requestPayload, settings, d10);

    try {
        const startTime = Date.now();

        // ШАГ 5: основной вызов через API_Response (он уже использует Parser внутри)
        const { rawResponseText, processedData } = await API_Response.robustFetchWithRepair(
            url,
            headers,
            requestPayload,
            CONFIG.autoRepairAttempts,
            API_Request,
            abortController
        );

        const responseTime = Date.now() - startTime;

        // ШАГ 6: обработка мета-данных (если есть)
        if (processedData._metaParsed) {
            const meta = processedData._metaParsed;
            if (meta.metaContext) State.setMetaContext(meta.metaContext);
            meta.unknownFields.forEach(f => State.addUnknownField(f));
            meta.unknownArrays.forEach(arr => State.addUnknownArray(arr));
            meta.unknownObjects.forEach(obj => State.addUnknownObject(obj));
        }

        // ШАГ 7: обновление аудита и статистики
        Audit.updateEntrySuccess(auditEntry, rawResponseText);
        updateModelStats(settings, responseTime);

        console.log(`💬 Ответ получен за ${responseTime}мс`);
        return processedData;

    } catch (error) {
        // ШАГ 8: обработка ошибки
        const modelInState = settings.models.find(model => model.id === settings.model);
        if (modelInState) modelInState.status = 'error';

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
 * Генерирует кастомную начальную сцену на основе пользовательского промпта.
 * 
 * Полная логика по шагам с подробными комментариями:
 * 1. Получаем настройки и провайдера.
 * 2. Валидация API-ключа.
 * 3. Подготовка заголовков.
 * 4. Формирование промпта (system + user).
 * 5. Создание записи аудита.
 * 6. Вызов executeFetchRaw (получаем сырой ответ).
 * 7. Извлечение content из ответа API (если ответ в стандартном формате).
 * 8. ПРЕДОБРАБОТКА content: декодируем Unicode-escapes и применяем preprocessJson,
 *    чтобы исправить неэкранированные кавычки, переводы строк и висячие запятые.
 * 9. Пробуем распарсить предобработанный content как JSON.
 * 10. Если успешно — передаём объект в Parser.processAIResponse, иначе передаём исходную строку.
 * 11. Обновление аудита.
 * 
 * @param {string} promptText - Пользовательский промпт.
 * @returns {Promise<Object>} Обработанные данные сцены.
 */
async function generateCustomScene(promptText) {
    // ШАГ 1: получаем настройки и провайдера
    const settings = State.getSettings();
    const { url, apiKey, isVsegpt } = getProviderInfo(settings);

    // ШАГ 2: валидация API-ключа
    if (!apiKey) {
        throw new Error("API Key needed to generate a custom scene. Please enter it in Settings.");
    }

    // ШАГ 3: подготовка заголовков
    const headers = prepareHeaders(apiKey, isVsegpt);

    // ШАГ 4: формирование промпта (system + user)
    const systemPrompt = constructScenarioWriterPrompt();
    const universalInstructions = constructUniversalInstructionsPrompt();
    const userPrompt = `${promptText}\n### ИНСТРУКЦИИ:\n${universalInstructions}`;

    // ШАГ 5: подготовка тела запроса
    const requestBody = {
        model: settings.model,
        messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt }
        ],
        max_tokens: 10000,
        temperature: 0.85
    };

    // ШАГ 6: для OpenRouter требуем JSON-формат ответа
    if (!isVsegpt) {
        requestBody.response_format = { type: "json_object" };
    }

    // ШАГ 7: создание записи аудита
    const auditEntry = Audit.createEntry(
        "Генерация Начальной Сцены",
        requestBody,
        settings.model,
        settings.apiProvider
    );

    try {
        // ШАГ 8: выполняем запрос и получаем сырой текст
        const rawResponseText = await API_Request.executeFetchRaw(url, headers, requestBody);
        
        // ШАГ 9: извлекаем content из ответа API
        // Переменная content будет хранить строку, которую нужно передать в парсер.
        // По умолчанию — весь rawResponseText (если ответ уже является чистым JSON).
        let content = rawResponseText;

        // Пытаемся распарсить весь ответ как JSON (стандартный формат API с обёрткой)
        try {
            const parsed = JSON.parse(rawResponseText);
            // Если есть choices и message.content — берём его
            if (parsed.choices && Array.isArray(parsed.choices) && parsed.choices[0]?.message?.content) {
                content = parsed.choices[0].message.content;
            }
        } catch (e) {
            // Если не удалось распарсить весь ответ, значит ответ уже является чистым JSON (не wrapped)
            // оставляем content = rawResponseText (ничего не делаем)
        }

        // ========== КЛЮЧЕВОЕ ИСПРАВЛЕНИЕ ==========
        // ШАГ 10: предобрабатываем content перед попыткой распарсить его как JSON.
        // Это необходимо, потому что внутри content могут быть неэкранированные кавычки,
        // реальные переводы строк и другие символы, ломающие JSON.parse.
        // Используем методы Parser, которые уже используются в основном парсере.
        const cleanedContent = Parser.preprocessJson(Parser.decodeUnicodeEscapes(content));

        // ШАГ 11: пробуем распарсить предобработанный content как JSON, чтобы получить готовый объект
        let contentObject = null;
        try {
            contentObject = JSON.parse(cleanedContent);
        } catch (e) {
            // Если не удалось — оставляем contentObject = null, будем передавать исходную строку
            // (не предобработанную, потому что предобработка могла изменить структуру,
            // но если парсинг не удался, значит это невалидный JSON, и мы всё равно пойдём
            // по пути агрессивного парсинга в Parser.processAIResponse).
        }

        // ШАГ 12: парсинг через Parser — передаём объект, если получилось, иначе исходную строку
        const processedData = contentObject
            ? Parser.processAIResponse(contentObject)   // передаём уже готовый объект
            : Parser.processAIResponse(content);        // передаём строку для обычного парсинга

        // ШАГ 13: обновление аудита об успехе
        Audit.updateEntrySuccess(auditEntry, rawResponseText);
        return processedData;

    } catch (error) {
        // ШАГ 14: обработка ошибки — обновляем аудит и пробрасываем исключение
        Audit.updateEntryError(auditEntry, error, error.rawResponse);
        throw error;
    }
}

/**
 * Выполняет быстрый тест подключения к API-провайдеру.
 * 
 * Полная логика по шагам:
 * 1. Получаем настройки и выбранный провайдер.
 * 2. Выбираем ключ.
 * 3. Подготовка заголовков и testBody.
 * 4. Создание записи аудита.
 * 5. Вызов executeFetchRaw.
 * 6. Обновление аудита.
 * 
 * @returns {Promise<void>}
 */
async function testCurrentProvider() {
    const settings = State.getSettings();
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
 * 
 * Полная логика по шагам:
 * 1. Получаем настройки и выбранную модель.
 * 2. Валидация ключа.
 * 3. Подготовка заголовков и testBody.
 * 4. Создание записи аудита.
 * 5. Вызов executeFetchRaw.
 * 6. Обработка ответа.
 * 7. Обновление статистики модели.
 * 
 * @returns {Promise<void>}
 */
async function testSelectedModel() {
    const settings = State.getSettings();
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

        Audit.updateEntrySuccess(auditEntry, rawResponseText);

        const modelResponseText = result.choices?.[0]?.message?.content ||
            "No text output received from model.";

        updateModelTestResult(settings, modelToTestId, duration, modelResponseText);

        if (Render) {
            Render.showSuccessAlert(
                "Модель успешно протестирована!",
                `Ответ получен за: ${duration}мс.\n\nСодержание: \n${modelResponseText}`
            );
        }

    } catch (error) {
        handleModelTestError(error, settings, modelToTestId, auditEntry);
    } finally {
        cleanupTestButton(testButton, originalButtonHtml);
        updateUIAfterTest(settings);
    }
}

// ============================================================================
// ВСПОМОГАТЕЛЬНЫЕ МЕТОДЫ (полные, без сокращений)
// ============================================================================

/**
 * Подготавливает заголовки HTTP-запроса.
 * 
 * @param {string} apiKey - API ключ.
 * @param {boolean} isVsegpt - Флаг провайдера VSEGPT.
 * @returns {Object} Заголовки HTTP-запроса.
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
 * Подготавливает payload для игрового запроса.
 * 
 * @param {Object} updatedState - Состояние игры.
 * @param {Array} selectedActions - Выбранные действия.
 * @param {number} d10 - Бросок удачи.
 * @returns {Object} Payload запроса.
 */
function prepareGameRequestPayload(updatedState, selectedActions, d10) {
    return API_Request.prepareRequestPayload(updatedState, selectedActions, d10);
}

/**
 * Применяет специфичные настройки для провайдера и модели.
 * 
 * @param {Object} payload - Payload запроса.
 * @param {boolean} isVsegpt - Флаг провайдера VSEGPT.
 * @param {Object} settings - Настройки (state.settings).
 */
function applyProviderSpecificSettings(payload, isVsegpt, settings) {
    if (isVsegpt && settings.model.includes('gpt-3.5-turbo-16k')) {
        payload.max_tokens = 1000;
    }

    if (!isVsegpt) {
        payload.response_format = { type: "json_object" };
    }
}

/**
 * Создаёт запись аудита для игрового хода.
 * 
 * @param {Array} selectedActions - Выбранные действия.
 * @param {Object} payload - Payload запроса.
 * @param {Object} settings - Настройки.
 * @param {number} d10 - Бросок удачи.
 * @returns {Object} Запись аудита.
 */
function createAuditEntryForGameTurn(selectedActions, payload, settings, d10) {
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
        settings.model,
        settings.apiProvider
    );

    auditEntry.d10 = d10;
    auditEntry.gameType = State.getGame().gameType;

    return auditEntry;
}

/**
 * Обновляет статистику модели после успешного запроса.
 * 
 * @param {Object} settings - Настройки.
 * @param {number} responseTime - Время ответа в миллисекундах.
 */
function updateModelStats(settings, responseTime) {
    const modelInState = settings.models.find(model => model.id === settings.model);
    if (modelInState) {
        modelInState.status = 'success';
        modelInState.responseTime = responseTime;
        modelInState.lastTested = new Date().toISOString();
    }
}

/**
 * Обновляет результат тестирования модели.
 * 
 * @param {Object} settings - Настройки.
 * @param {string} modelId - ID модели.
 * @param {number} duration - Время ответа.
 * @param {string} responseText - Текст ответа.
 */
function updateModelTestResult(settings, modelId, duration, responseText) {
    const modelInState = settings.models.find(model => model.id === modelId);
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
 * Обрабатывает ошибки тестирования модели.
 * 
 * @param {Error} error - Ошибка.
 * @param {Object} settings - Настройки.
 * @param {string} modelId - ID модели.
 * @param {Object} auditEntry - Запись аудита.
 */
function handleModelTestError(error, settings, modelId, auditEntry) {
    const modelInState = settings.models.find(model => model.id === modelId);
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
 * Очищает кнопку тестирования после завершения.
 * 
 * @param {HTMLElement} testButton - DOM элемент кнопки.
 * @param {string} originalHtml - Оригинальный HTML кнопки.
 */
function cleanupTestButton(testButton, originalHtml) {
    if (testButton) {
        testButton.innerHTML = originalHtml;
        testButton.disabled = false;
    }
}

/**
 * Обновляет UI после тестирования.
 * 
 * @param {Object} settings - Настройки.
 */
function updateUIAfterTest(settings) {
    if (Render) {
        localStorage.setItem('oto_models_status', JSON.stringify(settings.models));
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
    sendAIRequest,
    generateCustomScene,
    testCurrentProvider,
    testSelectedModel,
    constructUniversalInstructionsPrompt,
    constructScenarioWriterPrompt
};