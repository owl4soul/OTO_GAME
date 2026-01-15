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
 * @param {Object|string} rawResponse - Ответ от ИИ (объект или строка)
 */
function updateEntrySuccess(entry, rawResponse) {
    if (!entry) return;
    
    const responseStr = typeof rawResponse === 'string' ? rawResponse : JSON.stringify(rawResponse, null, 2);
    
    // 1. Дублируем в консоль для отладки
    console.log(`✅ [API RESPONSE] ${entry.request}:`, responseStr);
    
    // 2. Обновляем объект (он уже находится в State по ссылке)
    entry.status = 'success';
    entry.fullResponse = responseStr;
    
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
        Saveload.saveState();
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
        txtLog += `Время: ${entry.timestamp}\n`;
        txtLog += `Статус: ${entry.status.toUpperCase()}\n`;
        txtLog += `Провайдер: ${entry.provider || 'не указан'}\n`;
        txtLog += `Модель: ${entry.model || 'не указана'}\n`;
        if (entry.d10) txtLog += `d10: ${entry.d10}\n`; // Если был бросок кубика
        
        txtLog += `\n[REQUEST HEADER]: ${entry.request}\n`;
        
        if (entry.requestDebug && entry.requestDebug.body) {
            txtLog += `\n[REQUEST BODY]:\n${entry.requestDebug.body}\n`;
        }
        
        if (entry.fullResponse) {
            txtLog += `\n[RESPONSE]:\n${entry.fullResponse}\n`;
        }
        
        if (entry.rawError) {
            txtLog += `\n[ERROR]:\n${entry.rawError}\n`;
        }
        
        txtLog += '\n' + '='.repeat(50) + '\n\n';
    });
    
    if (navigator.clipboard) {
        navigator.clipboard.writeText(txtLog).then(() => {
            Render.showSuccessAlert(
                "Экспорт успешен",
                "Полный лог аудита скопирован в буфер обмена!\n\nВы можете вставить его в текстовый редактор для сохранения.",
                null
            );
        }).catch(() => {
            fallbackDownload(txtLog);
        });
    } else {
        fallbackDownload(txtLog);
    }
    
    function fallbackDownload(data) {
        const fileName = `oto-audit-log-${state.gameId}-${new Date().toISOString().split('T')[0]}.txt`;
        Utils.exportToFile(data, fileName, 'text/plain;charset=utf-8');
        
        setTimeout(() => {
            Render.showSuccessAlert(
                "Экспорт успешен",
                `Лог аудита сохранен в файл: ${fileName}`,
                null
            );
        }, 500);
    }
}

// Публичный интерфейс модуля
// Экспортируем методы для создания логов (для Facade) и управления (для UI)
export const Audit = {
    createEntry,
    updateEntrySuccess,
    updateEntryError,
    clearAudit,
    exportAuditLog
};