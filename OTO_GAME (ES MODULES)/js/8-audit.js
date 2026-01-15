// Модуль 8: AUDIT - Управление логами аудита (8-audit.js)
'use strict';

import { State } from './3-state.js';
import { Render } from './5-render.js';
import { Utils } from './2-utils.js';
import { Saveload } from './9-saveload.js';

/**
 * Очистка лога аудита
 */
function clearAudit() {
    if (confirm('Очистить лог запросов?')) {
        const state = State.getState();
        state.auditLog = [];
        State.setState({ auditLog: state.auditLog });
        Render.renderAuditList();
        Saveload.saveState();

        // Логируем действие в аудит
        const auditEntry = {
            id: Date.now(),
            request: 'Очистка лога аудита',
            timestamp: Utils.formatMoscowTime(new Date()),
            status: 'success',
            fullResponse: 'Лог аудита очищен'
        };

        State.addAuditLogEntry(auditEntry);
        Render.renderAuditList();
    }
}

/**
 * Экспорт лога аудита в текстовом формате
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
        txtLog += `d10: ${entry.d10 || 'нет'}\n`;
        txtLog += `\nЗапрос:\n${entry.request || 'Нет запроса'}\n\n`;

        if (entry.rawError) {
            txtLog += `\n=== ОШИБКА ===\n`;
            txtLog += `${Utils.formatErrorDetails(entry.rawError)}\n\n`;
        }

        if (entry.fullResponse) {
            txtLog += `\n=== ОТВЕТ (${entry.fullResponse.length} символов) ===\n`;
            txtLog += `${entry.fullResponse}\n\n`;
        }

        if (entry.requestDebug) {
            txtLog += `\n=== ДЕБАГ ЗАПРОСА ===\n`;
            txtLog += `URL: ${entry.requestDebug.url || 'нет'}\n`;
            if (entry.requestDebug.body) {
                txtLog += `Тело запроса:\n${entry.requestDebug.body.substring(0, 2000)}...\n`;
            }
            txtLog += '\n';
        }

        txtLog += '='.repeat(50) + '\n\n';
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

    function fallbackDownload(txtLog) {
        const state = State.getState();
        const fileName = `oto-audit-log-${state.gameId}-${new Date().toISOString().split('T')[0]}.txt`;
        Utils.exportToFile(txtLog, fileName, 'text/plain;charset=utf-8');

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
export const Audit = {
    clearAudit,
    exportAuditLog
};