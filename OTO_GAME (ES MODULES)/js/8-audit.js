// Модуль 8: AUDIT - Управление логами аудита (8-audit.js)
'use strict';

import { State } from './3-state.js';
import { Render } from './5-render.js';
import { Utils } from './2-utils.js';
import { Saveload } from './9-saveload.js';

/**
 * Улучшенное безопасное форматирование ответа сервера
 */
function formatServerResponse(response) {
    if (!response) return '';
    
    try {
        // Если response уже строка
        if (typeof response === 'string') {
            // Сначала декодируем Unicode escapes
            let decoded = Utils.decodeUnicodeEscapes(response);
            
            // Пытаемся распарсить как JSON
            try {
                const parsed = JSON.parse(decoded);
                // Форматируем с красивыми отступами
                return JSON.stringify(parsed, null, 2);
            } catch (parseError) {
                // Если не JSON, возвращаем декодированную строку
                return decoded;
            }
        }
        // Если response объект
        return JSON.stringify(response, null, 2);
    } catch (error) {
        console.warn('⚠️ Ошибка при форматировании ответа:', error.message);
        return String(response);
    }
}

/**
 * Безопасное сохранение полного ответа сервера
 */
function saveFullServerResponse(entry, rawResponse) {
    if (!rawResponse || rawResponse === 'No response') return entry;
    
    try {
        // Сохраняем сырой ответ (оригинал)
        entry.rawResponse = typeof rawResponse === 'string' 
            ? rawResponse 
            : JSON.stringify(rawResponse);
        
        // Безопасно форматируем для отображения
        entry.fullResponse = formatServerResponse(rawResponse);
        
        // Дополнительно: сохраняем размер ответа
        entry.responseSize = entry.rawResponse.length;
        entry.responseSizeKB = (entry.rawResponse.length / 1024).toFixed(2) + ' KB';
        
        // Логируем для отладки
        console.log(`📥 Сохранен ответ сервера: ${entry.responseSize} символов, ${entry.responseSizeKB}`);
        
    } catch (error) {
        console.error('❌ Ошибка сохранения ответа сервера:', error);
        // Сохраняем хотя бы строковое представление
        entry.rawResponse = String(rawResponse);
        entry.fullResponse = String(rawResponse);
    }
    
    return entry;
}

/**
 * Выводит ответ в консоль с безопасным форматированием
 * @param {string} prefix - Префикс для лога
 * @param {string|Object} response - Ответ для вывода
 */
function logToConsole(prefix, response) {
    if (!response) {
        console.log(`${prefix}: (пустой ответ)`);
        return;
    }
    
    try {
        console.group(prefix);
        
        // Пытаемся красиво отформатировать
        let formatted;
        try {
            formatted = formatServerResponse(response);
            console.log(formatted);
        } catch (formatError) {
            console.warn('⚠️ Не удалось отформатировать ответ, вывод в сыром виде');
            console.log(typeof response === 'string' 
                ? Utils.decodeUnicodeEscapes(response) 
                : response);
        }
        
        // Дополнительная информация для отладки
        if (typeof response === 'string') {
            console.log(`📏 Длина ответа: ${response.length} символов`);
            console.log(`🔤 Тип ответа: строка`);
        } else {
            console.log(`📦 Тип ответа: ${typeof response}`);
        }
        
        console.groupEnd();
    } catch (error) {
        console.error(`${prefix}: Критическая ошибка при логировании:`, error);
        // Аварийный вывод
        console.log('🚨 АВАРИЙНЫЙ ВЫВОД ОТВЕТА:');
        console.log(response);
    }
}

/**
 * Создает новую запись лога, сохраняет в State и выводит в консоль.
 * @param {string} requestType - Заголовок (напр. "Игровой ход")
 * @param {Object} requestPayload - Тело запроса (JSON)
 * @param {string} model - Имя модели
 * @param {string} provider - Провайдер
 * @returns {Object} Созданный объект записи (ссылка)
 */
function createEntry(requestType, requestPayload, model, provider) {
    // 1. Дублируем в консоль (полностью) для отладки разработчиком
    console.log(`🚀 [API REQUEST] ${requestType}:`, JSON.stringify(requestPayload, null, 2));
    
    // 2. Создаем объект записи
    const entry = {
        id: Date.now(),
        request: requestType,
        timestamp: Utils.formatMoscowTime(new Date()),
        status: 'pending',
        model: model,
        provider: provider,
        d10: null, // Будет заполнено позже, если это игровой ход
        rawResponse: null,
        fullResponse: null,
        rawError: null,
        requestDebug: {
            body: JSON.stringify(requestPayload, null, 2)
        },
        responseSize: 0,
        responseSizeKB: '0 KB'
    };
    
    // 3. Сохраняем в глобальный State и обновляем UI списка
    State.addAuditLogEntry(entry);
    Render.renderAuditList();
    
    return entry;
}

/**
 * Обновляет запись при успешном ответе от сервера.
 * @param {Object} entry - Объект записи (возвращенный из createEntry)
 * @param {string} rawResponseText - Сырой текст ответа от сервера (до парсинга)
 * @param {Object|null} parsedResponse - Распаршенный ответ (опционально)
 */
function updateEntrySuccess(entry, rawResponseText, parsedResponse = null) {
    if (!entry) return;
    
    // Сохраняем полный ответ сервера
    saveFullServerResponse(entry, rawResponseText);
    
    // Логируем в консоль
    logToConsole(`✅ [API RESPONSE] ${entry.request}`, 
        parsedResponse || rawResponseText || 'Пустой ответ');
    
    // Обновляем статус
    entry.status = 'success';
    
    Render.renderAuditList();
}

/**
 * Обновляет запись при ошибке запроса.
 * @param {Object} entry - Объект записи
 * @param {Error|string} error - Ошибка
 * @param {string|null} rawResponse - Сырой ответ сервера (если есть)
 */
function updateEntryError(entry, error, rawResponse = null) {
    if (!entry) return;
    
    const errorDetails = Utils.formatErrorDetails(error);
    const hasServerResponse = rawResponse && rawResponse.trim();
    
    // Сохраняем ответ сервера (даже если он есть при ошибке)
    if (hasServerResponse) {
        saveFullServerResponse(entry, rawResponse);
    }
    
    // Формируем детали ошибки
    entry.rawError = errorDetails;
    
    // Логируем в консоль
    console.error(`🔥 [API ERROR] ${entry.request}:`, error);
    
    if (hasServerResponse) {
        console.error('📄 Полный ответ сервера при ошибке:');
        logToConsole(`🔥 [SERVER RESPONSE ON ERROR] ${entry.request}`, rawResponse);
    }
    
    // Обновляем статус
    entry.status = 'error';
    
    Render.renderAuditList();
}

/**
 * Очистка лога аудита (Вызывается из UI по кнопке)
 */
function clearAudit() {
    if (confirm('Очистить лог запросов?')) {
        const state = State.getState();
        state.auditLog = [];
        State.setState({ auditLog: state.auditLog });
        
        // Логируем сам факт очистки как системное событие
        // Используем нашу же функцию createEntry для единообразия
        const entry = createEntry('SYSTEM', { action: 'clear_logs' }, 'system', 'local');
        updateEntrySuccess(entry, 'Лог аудита был очищен пользователем');
        
        Render.renderAuditList();
        State.saveStateToLocalStorage();
    }
}

/**
 * Экспорт лога аудита в текстовый файл (Вызывается из UI)
 */
function exportAuditLog() {
    const state = State.getState();
    if (state.auditLog.length === 0) {
        Render.showErrorAlert(
            "Экспорт лога",
            "Лог пуст — нечего экспортировать.",
            null
        );
        return;
    }
    
    let txtLog = `=== OTO Audit Log ===\n`;
    txtLog += `Игра: ${state.gameId}\n`;
    txtLog += `Экспорт: ${Utils.formatMoscowTime(new Date())}\n`;
    txtLog += `Всего записей: ${state.auditLog.length}\n`;
    txtLog += '='.repeat(50) + '\n\n';
    
    state.auditLog.forEach((entry, idx) => {
        txtLog += `=== Запись ${idx + 1} ===\n`;
        txtLog += `ID: ${entry.id}\n`;
        txtLog += `Время: ${entry.timestamp}\n`;
        txtLog += `Статус: ${entry.status.toUpperCase()}\n`;
        txtLog += `Провайдер: ${entry.provider || 'не указан'}\n`;
        txtLog += `Модель: ${entry.model || 'не указана'}\n`;
        if (entry.d10) txtLog += `d10: ${entry.d10}\n`;
        
        txtLog += `\n=== REQUEST ===\n`;
        txtLog += `Заголовок: ${entry.request}\n`;
        
        if (entry.requestDebug && entry.requestDebug.body) {
            txtLog += `\nТело запроса (RAW):\n${entry.requestDebug.body}\n`;
        }
        
        txtLog += `\n=== RESPONSE ===\n`;
        if (entry.rawResponse) {
            txtLog += `Сырой ответ:\n${entry.rawResponse}\n\n`;
        }
        
        if (entry.fullResponse) {
            txtLog += `Форматированный ответ:\n${entry.fullResponse}\n`;
        }
        
        if (entry.rawError) {
            txtLog += `\n=== ERROR ===\n${entry.rawError}\n`;
        }
        
        txtLog += '\n' + '='.repeat(50) + '\n\n';
    });
    
    // Создаем имя файла
    const fileName = `oto-audit-full-${state.gameId}-${new Date().toISOString().split('T')[0]}.txt`;
    
    // Сначала пытаемся скопировать в буфер обмена
    if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(txtLog).then(() => {
            Render.showSuccessAlert(
                "Экспорт успешен",
                "Полный лог аудита скопирован в буфер обмена!\n\nХотите также скачать файл?",
                {
                    text: "Скачать файл",
                    callback: () => Utils.exportToFile(txtLog, fileName, 'text/plain;charset=utf-8')
                }
            );
        }).catch(() => {
            // Fallback: скачиваем файл
            Utils.exportToFile(txtLog, fileName, 'text/plain;charset=utf-8');
            Render.showSuccessAlert(
                "Экспорт успешен",
                `Лог аудита сохранен в файл: ${fileName}`,
                null
            );
        });
    } else {
        // Fallback для старых браузеров или небезопасного контекста
        Utils.exportToFile(txtLog, fileName, 'text/plain;charset=utf-8');
        Render.showSuccessAlert(
            "Экспорт успешен",
            `Лог аудита сохранен в файл: ${fileName}`,
            null
        );
    }
}

/**
 * Экспорт одной записи аудита (request-response) в виде файла
 * @param {number} entryId - ID записи для экспорта
 */
function exportSingleAuditEntry(entryId) {
    const state = State.getState();
    const entry = state.auditLog.find(e => e.id === entryId);
    
    if (!entry) {
        Render.showErrorAlert(
            "Экспорт записи",
            "Запись не найдена.",
            null
        );
        return;
    }
    
    // Формируем содержание для одной записи
    let txtLog = `=== OTO Audit Log Entry ===\n`;
    txtLog += `ID: ${entry.id}\n`;
    txtLog += `Время: ${entry.timestamp}\n`;
    txtLog += `Статус: ${entry.status.toUpperCase()}\n`;
    txtLog += `Запрос: ${entry.request}\n`;
    txtLog += `Провайдер: ${entry.provider || 'не указан'}\n`;
    txtLog += `Модель: ${entry.model || 'не указана'}\n`;
    if (entry.d10) txtLog += `d10: ${entry.d10}\n`;
    
    txtLog += `\n=== REQUEST ===\n`;
    txtLog += `Заголовок: ${entry.request}\n`;
    if (entry.requestDebug && entry.requestDebug.body) {
        txtLog += `\nТело запроса (RAW):\n${entry.requestDebug.body}\n`;
    }
    
    txtLog += `\n=== RESPONSE ===\n`;
    if (entry.rawResponse) {
        txtLog += `Сырой ответ:\n${entry.rawResponse}\n\n`;
    }
    
    if (entry.fullResponse) {
        txtLog += `Форматированный ответ:\n${entry.fullResponse}\n`;
    }
    
    if (entry.rawError) {
        txtLog += `\n=== ERROR ===\n${entry.rawError}\n`;
    }
    
    txtLog += '\n' + '='.repeat(50) + '\n';
    txtLog += `Экспортировано: ${Utils.formatMoscowTime(new Date())}\n`;
    
    // Создаем имя файла
    const fileName = `oto-audit-entry-${entry.id}-${entry.timestamp.replace(/[:.]/g, '-')}.txt`;
    
    // Сначала пытаемся скопировать в буфер обмена
    if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(txtLog).then(() => {
            Render.showSuccessAlert(
                "Скопировано!",
                "Запись аудита скопирована в буфер обмена.\n\nХотите также скачать файл?",
                {
                    text: "Скачать файл",
                    callback: () => Utils.exportToFile(txtLog, fileName, 'text/plain;charset=utf-8')
                }
            );
        }).catch(err => {
            console.warn("Не удалось скопировать в буфер обмена:", err);
            // Fallback: сразу скачиваем файл
            Utils.exportToFile(txtLog, fileName, 'text/plain;charset=utf-8');
            Render.showSuccessAlert(
                "Файл скачан",
                `Запись аудита сохранена в файл: ${fileName}`,
                null
            );
        });
    } else {
        // Fallback для старых браузеров или небезопасного контекста
        Utils.exportToFile(txtLog, fileName, 'text/plain;charset=utf-8');
        Render.showSuccessAlert(
            "Файл скачан",
            `Запись аудита сохранена в файл: ${fileName}`,
            null
        );
    }
}

// Публичный интерфейс модуля
// Экспортируем методы для создания логов (для Facade) и управления (для UI)
export const Audit = {
    createEntry,
    updateEntrySuccess,
    updateEntryError,
    clearAudit,
    exportAuditLog,
    exportSingleAuditEntry,
    formatServerResponse,
    saveFullServerResponse,
    logToConsole
};