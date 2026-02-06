// Модуль 8: AUDIT - Управление логами аудита (8-audit.js)
'use strict';

import { State } from './3-state.js';
import { Render } from './5-render.js';
import { Utils } from './2-utils.js';
import { Saveload } from './9-saveload.js';

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
        fullResponse: null,
        rawError: null,
        requestDebug: {
            body: JSON.stringify(requestPayload, null, 2)
        }
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
 */
function updateEntrySuccess(entry, rawResponseText) {
    if (!entry) return;
    
    // 1. Дублируем в консоль для отладки
    console.log(`✅ [API RESPONSE] ${entry.request}:`, rawResponseText);
    
    // 2. Обновляем объект (он уже находится в State по ссылке)
    entry.status = 'success';
    entry.fullResponse = rawResponseText; // Сохраняем сырой текст
    entry.rawResponse = rawResponseText; // Дублируем в отдельное поле для ясности
    
    // 3. Обновляем UI (показываем галочку и ответ)
    Render.renderAuditList();
}

/**
 * Обновляет запись при ошибке запроса.
 * @param {Object} entry - Объект записи
 * @param {Error|string} error - Ошибка
 */
function updateEntryError(entry, error) {
    if (!entry) return;
    
    const errorDetails = Utils.formatErrorDetails(error);
    
    // 1. Дублируем в консоль
    console.error(`🔥 [API ERROR] ${entry.request}:`, error);
    
    // 2. Обновляем объект
    entry.status = 'error';
    entry.rawError = errorDetails;
    
    // 3. Обновляем UI (показываем красный крестик и детали)
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
        if (entry.fullResponse) {
            txtLog += `Ответ (RAW):\n${entry.fullResponse}\n`;
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
    if (entry.fullResponse) {
        txtLog += `Ответ (RAW):\n${entry.fullResponse}\n`;
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
    exportSingleAuditEntry // Новая функция
};