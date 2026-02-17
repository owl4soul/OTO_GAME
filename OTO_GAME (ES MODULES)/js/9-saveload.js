// Модуль 9: SAVELOAD - Сохранение/загрузка данных (ФОРМАТ 4.1)
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
        // Полностью очищаем localStorage
        localStorage.clear();
        
        // Перезагружаем страницу
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
        // Получаем полное состояние игры
        const fullState = State.exportFullState();
        const fileName = `oto-save-${fullState.gameId}-${Date.now()}.json`;
        const dataStr = JSON.stringify(fullState, null, 2);
        
        // Используем функцию с выбором папки
        const result = await Utils.saveFileWithFolderPicker(dataStr, fileName);
        
        if (result.success) {
            // Добавляем запись в аудит-лог
            const auditEntry = {
                id: Date.now(),
                request: 'Сохранение игры в файл',
                timestamp: Utils.formatMoscowTime(new Date()),
                status: 'success',
                fullResponse: `Игра сохранена в файл: ${result.fileName}`
            };
            
            State.addAuditLogEntry(auditEntry);
            
            // Эмитим событие экспорта
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
        // Выбираем файл
        const file = await Utils.selectFile('.json');
        if (!file) {
            console.log('📂 Файл не выбран');
            return {
                success: false,
                error: 'Файл не выбран'
            };
        }
        
        console.log(`📂 Выбран файл: ${file.name} (${(file.size / 1024).toFixed(2)} KB)`);
        
        // Читаем файл
        const reader = new FileReader();
        
        return new Promise((resolve) => {
            reader.onload = async (e) => {
                try {
                    const content = e.target.result;
                    const importData = JSON.parse(content);
                    
                    // Проверяем версию
                    if (importData.version !== '4.1.0') {
                        const errorMsg = `Неподдерживаемая версия файла: ${importData.version}. Требуется версия 4.1.0`;
                        console.error('❌', errorMsg);
                        resolve({
                            success: false,
                            error: errorMsg
                        });
                        return;
                    }
                    
                    console.log(`📂 Импорт игры ${importData.gameId}, ход ${importData.turnCount}`);
                    
                    // Импортируем состояние
                    State.importFullState(importData);
                    
                    // Сохраняем в localStorage
                    State.saveStateToLocalStorage();
                    
                    // Добавляем запись в аудит-лог
                    const auditEntry = {
                        id: Date.now(),
                        request: 'Загрузка игры из файла',
                        timestamp: Utils.formatMoscowTime(new Date()),
                        status: 'success',
                        fullResponse: `Игра загружена из файла: ${file.name}\nID: ${importData.gameId}\nХод: ${importData.turnCount}`
                    };
                    
                    State.addAuditLogEntry(auditEntry);
                    
                    // Эмитим событие импорта
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
        // Получаем все данные приложения
        const allData = State.exportAllAppData();
        const fileName = `oto-export-all-${Date.now()}.json`;
        const dataStr = JSON.stringify(allData, null, 2);
        
        // Используем функцию с выбором папки
        const result = await Utils.saveFileWithFolderPicker(dataStr, fileName);
        
        if (result.success) {
            // Добавляем запись в аудит-лог
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
        // Выбираем файл
        const file = await Utils.selectFile('.json');
        if (!file) {
            console.log('📂 Файл не выбран');
            return {
                success: false,
                error: 'Файл не выбран'
            };
        }
        
        console.log(`📂 Выбран файл: ${file.name} (${(file.size / 1024).toFixed(2)} KB)`);
        
        // Читаем файл
        const reader = new FileReader();
        
        return new Promise((resolve) => {
            reader.onload = async (e) => {
                try {
                    const content = e.target.result;
                    const importData = JSON.parse(content);
                    
                    // Проверяем версию
                    if (importData.version !== '4.1.0') {
                        const errorMsg = `Неподдерживаемая версия файла: ${importData.version}. Требуется версия 4.1.0`;
                        console.error('❌', errorMsg);
                        resolve({
                            success: false,
                            error: errorMsg
                        });
                        return;
                    }
                    
                    console.log(`📥 Импорт данных из файла: ${file.name}`);
                    
                    // Импортируем все данные
                    State.importAllAppData(importData);
                    
                    // Сохраняем в localStorage
                    State.saveStateToLocalStorage();
                    
                    // Добавляем запись в аудит-лог
                    const auditEntry = {
                        id: Date.now(),
                        request: 'Импорт всех данных',
                        timestamp: Utils.formatMoscowTime(new Date()),
                        status: 'success',
                        fullResponse: `Все данные импортированы из файла: ${file.name}`
                    };
                    
                    State.addAuditLogEntry(auditEntry);
                    
                    // Эмитим события
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
        const state = State.getState();
        if (state.auditLog.length === 0) {
            Utils.showToast('Аудит-лог пуст', 'warning', 3000);
            return {
                success: false,
                error: 'Аудит-лог пуст'
            };
        }
        
        console.log(`📊 Записей в аудит-логе: ${state.auditLog.length}`);
        
        const auditData = {
            version: '4.1.0',
            gameId: state.gameId,
            exportTime: new Date().toISOString(),
            auditLog: state.auditLog,
            totalEntries: state.auditLog.length,
            metadata: {
                gameType: state.gameType,
                lastSaveTime: state.lastSaveTime,
                totalPlayTime: calculateTotalPlayTime()
            }
        };
        
        const fileName = `oto-audit-log-${state.gameId}-${Date.now()}.json`;
        const dataStr = JSON.stringify(auditData, null, 2);
        
        const result = await Utils.saveFileWithFolderPicker(dataStr, fileName);
        
        if (result.success) {
            const auditEntry = {
                id: Date.now(),
                request: 'Скачивание аудит-лога',
                timestamp: Utils.formatMoscowTime(new Date()),
                status: 'success',
                fullResponse: `Аудит-лог скачан в файл: ${result.fileName}\nЗаписей: ${state.auditLog.length}`
            };
            State.addAuditLogEntry(auditEntry);
            
            Utils.showToast(`Аудит-лог сохранён в файл: ${result.fileName}`, 'success', 3000);
            console.log(`✅ Аудит-лог скачан в файл: ${result.fileName}`);
            return {
                success: true,
                fileName: result.fileName,
                entries: state.auditLog.length
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
 * Вспомогательная функция для расчета общего времени игры
 */
function calculateTotalPlayTime() {
    const startTime = localStorage.getItem('oto_first_play_time');
    if (!startTime) return 0;
    
    try {
        const start = new Date(startTime);
        const now = new Date();
        const diffMs = now - start;
        return Math.floor(diffMs / 1000); // В секундах
    } catch (error) {
        console.error('❌ Ошибка расчета времени игры:', error);
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
        const state = State.getState();
        
        if (!state.gameState.history || state.gameState.history.length === 0) {
            return {
                success: false,
                error: 'История пуста'
            };
        }
        
        const exportData = {
            gameId: state.gameId,
            exportTime: new Date().toISOString(),
            history: state.gameState.history,
            totalTurns: state.turnCount,
            currentScene: state.gameState.currentScene?.scene || "Нет текущей сцены"
        };
        
        const fileName = `oto-history-${state.gameId}.json`;
        Utils.exportToFile(JSON.stringify(exportData, null, 2), fileName);
        
        console.log(`✅ История экспортирована в файл: ${fileName}`);
        return {
            success: true,
            fileName: fileName,
            entries: state.gameState.history.length
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