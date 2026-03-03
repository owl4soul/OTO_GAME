// Модуль 9: SAVELOAD - Сохранение/загрузка данных
'use strict';

import { State } from './3-state.js';
import { Utils } from './2-utils.js';

/**
 * Принудительный сброс к начальному состоянию
 */
function forceResetToInitial() {
    console.warn('⚠️ Принудительный сброс к начальному состоянию');

    if (!confirm("Вы уверены, что хотите полностью сбросить игру? Все данные будут потеряны.")) {
        return { success: false, error: 'Отменено пользователем' };
    }

    try {
        localStorage.clear();
        setTimeout(() => {
            location.reload();
        }, 500);

        return {
            success: true,
            message: 'Игра сброшена к начальному состоянию. Страница перезагружается...'
        };
    } catch (error) {
        console.error('❌ Ошибка при принудительном сбросе:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Сохранение игры в файл с выбором папки
 */
async function saveGameToFile() {
    console.log('💾 Сохранение игры в файл...');

    try {
        const fullState = State.exportFullState();
        const fileName = `oto-save-${fullState.gameId}-${Date.now()}.json`;
        const dataStr = JSON.stringify(fullState, null, 2);

        const result = await Utils.saveFileWithFolderPicker(dataStr, fileName);

        if (result.success) {
            const auditEntry = {
                id: Date.now(),
                request: 'Сохранение игры в файл',
                timestamp: Utils.formatMoscowTime(new Date()),
                status: 'success',
                fullResponse: `Игра сохранена в файл: ${result.fileName}`
            };

            State.addAuditLogEntry(auditEntry);
            State.emit(State.EVENTS.STATE_EXPORTED, {
                fileName: result.fileName,
                gameId: fullState.gameId,
                turnCount: fullState.turnCount
            });

            console.log(`✅ Игра сохранена в файл: ${result.fileName}`);
            return {
                success: true,
                fileName: result.fileName,
                gameId: fullState.gameId
            };
        }

        console.error('❌ Не удалось сохранить файл');
        return {
            success: false,
            error: 'Не удалось сохранить файл'
        };
    } catch (error) {
        console.error('❌ Ошибка при сохранении игры:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Загрузка игры из файла с выбором файла
 */
async function loadGameFromFile() {
    console.log('📂 Загрузка игры из файла...');

    try {
        const file = await Utils.selectFile('.json');
        if (!file) {
            console.log('📂 Файл не выбран');
            return {
                success: false,
                error: 'Файл не выбран'
            };
        }

        console.log(`📂 Выбран файл: ${file.name} (${(file.size / 1024).toFixed(2)} KB)`);

        const reader = new FileReader();

        return new Promise((resolve) => {
            reader.onload = async (e) => {
                try {
                    const content = e.target.result;
                    const importData = JSON.parse(content);

                    if (importData.version !== '5.1.0') {
                        const errorMsg = `Неподдерживаемая версия файла: ${importData.version}. Требуется версия 5.1.0`;
                        console.error('❌', errorMsg);
                        resolve({
                            success: false,
                            error: errorMsg
                        });
                        return;
                    }

                    console.log(`📂 Импорт игры ${importData.gameId}, ход ${importData.turnCount}`);

                    State.importFullState(importData);
                    State.saveStateToLocalStorage();

                    const auditEntry = {
                        id: Date.now(),
                        request: 'Загрузка игры из файла',
                        timestamp: Utils.formatMoscowTime(new Date()),
                        status: 'success',
                        fullResponse: `Игра загружена из файла: ${file.name}\nID: ${importData.gameId}\nХод: ${importData.turnCount}`
                    };

                    State.addAuditLogEntry(auditEntry);
                    State.emit(State.EVENTS.STATE_IMPORTED, {
                        fileName: file.name,
                        gameId: importData.gameId,
                        turnCount: importData.turnCount
                    });

                    console.log(`✅ Игра загружена из файла: ${file.name}`);
                    resolve({
                        success: true,
                        fileName: file.name,
                        gameId: importData.gameId
                    });
                } catch (error) {
                    console.error('❌ Ошибка при загрузке игры:', error);
                    resolve({
                        success: false,
                        error: 'Ошибка чтения файла: ' + error.message
                    });
                }
            };

            reader.onerror = () => {
                console.error('❌ Ошибка чтения файла');
                resolve({
                    success: false,
                    error: 'Ошибка чтения файла'
                });
            };

            reader.readAsText(file);
        });
    } catch (error) {
        console.error('❌ Ошибка при выборе файла:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Экспорт всех данных приложения с выбором папки
 */
async function exportAllDataToFile() {
    console.log('📤 Экспорт всех данных приложения...');

    try {
        const allData = State.exportAllAppData();
        const fileName = `oto-export-all-${Date.now()}.json`;
        const dataStr = JSON.stringify(allData, null, 2);

        const result = await Utils.saveFileWithFolderPicker(dataStr, fileName);

        if (result.success) {
            const auditEntry = {
                id: Date.now(),
                request: 'Экспорт всех данных',
                timestamp: Utils.formatMoscowTime(new Date()),
                status: 'success',
                fullResponse: `Все данные экспортированы в файл: ${result.fileName}`
            };

            State.addAuditLogEntry(auditEntry);

            console.log(`✅ Все данные экспортированы в файл: ${result.fileName}`);
            return {
                success: true,
                fileName: result.fileName,
                exportTime: new Date().toISOString()
            };
        }

        console.error('❌ Не удалось экспортировать данные');
        return {
            success: false,
            error: 'Не удалось экспортировать данные'
        };
    } catch (error) {
        console.error('❌ Ошибка при экспорте данных:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Импорт всех данных приложения с выбором файла
 */
async function importAllDataFromFile() {
    console.log('📥 Импорт всех данных приложения...');

    try {
        const file = await Utils.selectFile('.json');
        if (!file) {
            console.log('📂 Файл не выбран');
            return {
                success: false,
                error: 'Файл не выбран'
            };
        }

        console.log(`📂 Выбран файл: ${file.name} (${(file.size / 1024).toFixed(2)} KB)`);

        const reader = new FileReader();

        return new Promise((resolve) => {
            reader.onload = async (e) => {
                try {
                    const content = e.target.result;
                    const importData = JSON.parse(content);

                    if (importData.version !== '5.1.0') {
                        const errorMsg = `Неподдерживаемая версия файла: ${importData.version}. Требуется версия 5.1.0`;
                        console.error('❌', errorMsg);
                        resolve({
                            success: false,
                            error: errorMsg
                        });
                        return;
                    }

                    console.log(`📥 Импорт данных из файла: ${file.name}`);

                    State.importAllAppData(importData);
                    State.saveStateToLocalStorage();

                    const auditEntry = {
                        id: Date.now(),
                        request: 'Импорт всех данных',
                        timestamp: Utils.formatMoscowTime(new Date()),
                        status: 'success',
                        fullResponse: `Все данные импортированы из файла: ${file.name}`
                    };

                    State.addAuditLogEntry(auditEntry);
                    State.emit(State.EVENTS.SETTINGS_CHANGED);
                    State.emit(State.EVENTS.MODEL_CHANGED);

                    console.log(`✅ Все данные импортированы из файла: ${file.name}`);
                    resolve({
                        success: true,
                        fileName: file.name,
                        importTime: new Date().toISOString()
                    });
                } catch (error) {
                    console.error('❌ Ошибка при импорте данных:', error);
                    resolve({
                        success: false,
                        error: 'Ошибка чтения файла: ' + error.message
                    });
                }
            };

            reader.onerror = () => {
                console.error('❌ Ошибка чтения файла');
                resolve({
                    success: false,
                    error: 'Ошибка чтения файла'
                });
            };

            reader.readAsText(file);
        });
    } catch (error) {
        console.error('❌ Ошибка при выборе файла:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Скачивание аудит-лога с выбором папки
 */
async function downloadAuditLogToFile() {
    console.log('📊 Скачивание аудит-лога...');

    try {
        const game = State.getGame();
        const auditLog = State.getAuditLog();
        if (auditLog.length === 0) {
            Utils.showToast('Аудит-лог пуст', 'warning', 3000);
            return {
                success: false,
                error: 'Аудит-лог пуст'
            };
        }

        console.log(`📊 Записей в аудит-логе: ${auditLog.length}`);

        const auditData = {
            version: '5.1.0',
            gameId: game.id,
            exportTime: new Date().toISOString(),
            auditLog: auditLog,
            totalEntries: auditLog.length,
            metadata: {
                gameType: game.type,
                lastSaveTime: State.getState().lastSaveTime,
                totalPlayTime: calculateTotalPlayTime()
            }
        };

        const fileName = `oto-audit-log-${game.id}-${Date.now()}.json`;
        const dataStr = JSON.stringify(auditData, null, 2);

        const result = await Utils.saveFileWithFolderPicker(dataStr, fileName);

        if (result.success) {
            const auditEntry = {
                id: Date.now(),
                request: 'Скачивание аудит-лога',
                timestamp: Utils.formatMoscowTime(new Date()),
                status: 'success',
                fullResponse: `Аудит-лог скачан в файл: ${result.fileName}\nЗаписей: ${auditLog.length}`
            };
            State.addAuditLogEntry(auditEntry);

            Utils.showToast(`Аудит-лог сохранён в файл: ${result.fileName}`, 'success', 3000);
            console.log(`✅ Аудит-лог скачан в файл: ${result.fileName}`);
            return {
                success: true,
                fileName: result.fileName,
                entries: auditLog.length
            };
        }

        Utils.showToast('Не удалось сохранить файл', 'error', 3000);
        return {
            success: false,
            error: 'Не удалось скачать аудит-лог'
        };
    } catch (error) {
        console.error('❌ Ошибка при скачивании аудит-лога:', error);
        Utils.showToast('Ошибка при сохранении файла', 'error', 3000);
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Вспомогательная функция для расчёта общего времени игры
 */
function calculateTotalPlayTime() {
    const startTime = localStorage.getItem('oto_first_play_time');
    if (!startTime) return 0;

    try {
        const start = new Date(startTime);
        const now = new Date();
        const diffMs = now - start;
        return Math.floor(diffMs / 1000);
    } catch (error) {
        console.error('❌ Ошибка расчёта времени игры:', error);
        return 0;
    }
}

/**
 * Быстрое сохранение (для кнопки Quick Save)
 */
function quickSave() {
    console.log('⚡ Быстрое сохранение...');

    const success = State.saveStateToLocalStorage();

    if (success) {
        console.log('✅ Быстрое сохранение выполнено');
        return {
            success: true,
            message: 'Игра сохранена',
            timestamp: new Date().toISOString()
        };
    } else {
        console.error('❌ Ошибка быстрого сохранения');
        return {
            success: false,
            error: 'Не удалось сохранить игру'
        };
    }
}

/**
 * Экспорт истории игры
 */
function exportHistory() {
    console.log('📜 Экспорт истории...');

    try {
        const game = State.getGame();

        if (!game.history || game.history.length === 0) {
            return {
                success: false,
                error: 'История пуста'
            };
        }

        const exportData = {
            gameId: game.id,
            exportTime: new Date().toISOString(),
            history: game.history,
            totalTurns: game.turnCount,
            currentScene: game.currentScene?.scene || "Нет текущей сцены"
        };

        const fileName = `oto-history-${game.id}.json`;
        Utils.exportToFile(JSON.stringify(exportData, null, 2), fileName);

        console.log(`✅ История экспортирована в файл: ${fileName}`);
        return {
            success: true,
            fileName: fileName,
            entries: game.history.length
        };
    } catch (error) {
        console.error('❌ Ошибка экспорта истории:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

// Публичный интерфейс модуля
export const Saveload = {
    quickSave,
    saveGameToFile,
    loadGameFromFile,
    exportAllDataToFile,
    importAllDataFromFile,
    downloadAuditLogToFile,
    exportHistory,
    forceResetToInitial
};