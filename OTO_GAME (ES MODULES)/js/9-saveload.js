// Модуль 9: SAVELOAD - Сохранение/загрузка данных (ФОРМАТ 4.1)
'use strict';

import { State } from './3-state.js';
import { Utils } from './2-utils.js';

/**
 * Сохранение состояния игры в localStorage (ФОРМАТ 4.1)
 */
function saveState() {
    const state = State.getState();
    state.lastSaveTime = new Date().toISOString();
    
    // Сохраняем все состояние в формате 4.1
    const saveData = {
        version: '4.1.0',
        gameId: state.gameId,
        lastSaveTime: state.lastSaveTime,
        turnCount: state.turnCount,
        heroState: [...state.heroState],
        gameState: { ...state.gameState },
        ui: { ...state.ui },
        settings: { ...state.settings },
        auditLog: [...state.auditLog],
        models: [...state.models],
        isRitualActive: state.isRitualActive,
        ritualProgress: state.ritualProgress,
        ritualTarget: state.ritualTarget,
        freeMode: state.freeMode,
        freeModeText: state.freeModeText,
        lastTurnUpdates: state.lastTurnUpdates,
        thoughtsOfHero: [...state.thoughtsOfHero],
        pendingRequest: null // Не сохраняем активные запросы
    };
    
    // Основное сохранение в формате 4.1
    localStorage.setItem('oto_v4_state', JSON.stringify(saveData));
    
    console.log('✅ Игра сохранена в localStorage (формат 4.1)');
}

/**
 * Загрузка состояния игры из localStorage (ФОРМАТ 4.1)
 * Возвращает текущее состояние (уже загруженное в State)
 */
function loadState() {
    console.log('📥 Загрузка состояния...');
    return State.getState();
}

/**
 * Принудительный сброс к начальному состоянию
 */
function forceResetToInitial() {
    console.warn('⚠️ Принудительный сброс к начальному состоянию');
    
    try {
        // Полностью очищаем localStorage
        localStorage.clear();
        
        // Перезагружаем страницу
        setTimeout(() => {
            location.reload();
        }, 500);
        
        return { success: true, message: 'Игра сброшена к начальному состоянию' };
    } catch (error) {
        console.error('❌ Ошибка при принудительном сбросе:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Сохранение игры в файл с выбором папки
 */
async function saveGameToFile() {
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
            return { success: true, fileName: result.fileName };
        }
        
        return { success: false, error: 'Не удалось сохранить файл' };
    } catch (error) {
        console.error('Ошибка при сохранении игры:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Загрузка игры из файла с выбором файла
 */
async function loadGameFromFile() {
    try {
        // Выбираем файл
        const file = await Utils.selectFile('.json');
        if (!file) {
            return { success: false, error: 'Файл не выбран' };
        }
        
        // Читаем файл
        const reader = new FileReader();
        
        return new Promise((resolve) => {
            reader.onload = async (e) => {
                try {
                    const content = e.target.result;
                    const importData = JSON.parse(content);
                    
                    // Импортируем состояние
                    State.importFullState(importData);
                    
                    // Сохраняем в localStorage
                    saveState();
                    
                    // Добавляем запись в аудит-лог
                    const auditEntry = {
                        id: Date.now(),
                        request: 'Загрузка игры из файла',
                        timestamp: Utils.formatMoscowTime(new Date()),
                        status: 'success',
                        fullResponse: `Игра загружена из файла: ${file.name}`
                    };
                    
                    State.addAuditLogEntry(auditEntry);
                    resolve({ success: true, fileName: file.name });
                } catch (error) {
                    console.error('Ошибка при загрузке игры:', error);
                    resolve({ success: false, error: 'Ошибка чтения файла: ' + error.message });
                }
            };
            
            reader.onerror = () => {
                resolve({ success: false, error: 'Ошибка чтения файла' });
            };
            
            reader.readAsText(file);
        });
    } catch (error) {
        console.error('Ошибка при выборе файла:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Экспорт всех данных приложения с выбором папки
 */
async function exportAllDataToFile() {
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
            return { success: true, fileName: result.fileName };
        }
        
        return { success: false, error: 'Не удалось экспортировать данные' };
    } catch (error) {
        console.error('Ошибка при экспорте данных:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Импорт всех данных приложения с выбором файла
 */
async function importAllDataFromFile() {
    try {
        // Выбираем файл
        const file = await Utils.selectFile('.json');
        if (!file) {
            return { success: false, error: 'Файл не выбран' };
        }
        
        // Читаем файл
        const reader = new FileReader();
        
        return new Promise((resolve) => {
            reader.onload = async (e) => {
                try {
                    const content = e.target.result;
                    const importData = JSON.parse(content);
                    
                    // Импортируем все данные
                    State.importAllAppData(importData);
                    
                    // Сохраняем в localStorage
                    saveState();
                    
                    // Добавляем запись в аудит-лог
                    const auditEntry = {
                        id: Date.now(),
                        request: 'Импорт всех данных',
                        timestamp: Utils.formatMoscowTime(new Date()),
                        status: 'success',
                        fullResponse: `Все данные импортированы из файла: ${file.name}`
                    };
                    
                    State.addAuditLogEntry(auditEntry);
                    resolve({ success: true, fileName: file.name });
                } catch (error) {
                    console.error('Ошибка при импорте данных:', error);
                    resolve({ success: false, error: 'Ошибка чтения файла: ' + error.message });
                }
            };
            
            reader.onerror = () => {
                resolve({ success: false, error: 'Ошибка чтения файла' });
            };
            
            reader.readAsText(file);
        });
    } catch (error) {
        console.error('Ошибка при выборе файла:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Скачивание аудит-лога с выбором папки
 */
async function downloadAuditLogToFile() {
    try {
        const state = State.getState();
        if (state.auditLog.length === 0) {
            return { success: false, error: 'Аудит-лог пуст' };
        }
        
        // Формируем данные для экспорта
        const auditData = {
            gameId: state.gameId,
            exportTime: new Date().toISOString(),
            auditLog: state.auditLog,
            totalEntries: state.auditLog.length
        };
        
        const fileName = `oto-audit-log-${state.gameId}-${Date.now()}.json`;
        const dataStr = JSON.stringify(auditData, null, 2);
        
        // Используем функцию с выбором папки
        const result = await Utils.saveFileWithFolderPicker(dataStr, fileName);
        
        if (result.success) {
            // Добавляем запись в аудит-лог
            const auditEntry = {
                id: Date.now(),
                request: 'Скачивание аудит-лога',
                timestamp: Utils.formatMoscowTime(new Date()),
                status: 'success',
                fullResponse: `Аудит-лог скачан в файл: ${result.fileName}`
            };
            
            State.addAuditLogEntry(auditEntry);
            return { success: true, fileName: result.fileName };
        }
        
        return { success: false, error: 'Не удалось скачать аудит-лог' };
    } catch (error) {
        console.error('Ошибка при скачивании аудит-лога:', error);
        return { success: false, error: error.message };
    }
}

// Публичный интерфейс модуля
export const Saveload = {
    saveState,
    loadState,
    saveGameToFile,
    loadGameFromFile,
    exportAllDataToFile,
    importAllDataFromFile,
    downloadAuditLogToFile,
    forceResetToInitial
};