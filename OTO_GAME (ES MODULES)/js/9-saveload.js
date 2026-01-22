// Модуль 9: SAVELOAD - Сохранение/загрузка данных (9-saveload.js)
'use strict';

import { CONFIG, aiModels } from './1-config.js';
import { State } from './3-state.js';
import { Utils } from './2-utils.js';

/**
 * Сохранение состояния игры в localStorage
 */
function saveState() {
    const state = State.getState();
    state.lastSaveTime = new Date().toISOString();
    
    // Собираем данные для сохранения
    const saveData = {
        stats: state.stats,
        progress: state.progress,
        degreeIndex: state.degreeIndex,
        personality: state.personality,
        isRitualActive: state.isRitualActive,
    skills: state.skills,
    ritualProgress: state.ritualProgress || 0,
    ritualTarget: state.ritualTarget || null,
        currentScene: state.currentScene,
        history: state.history,
        summary: state.summary,
        selectedChoices: state.selectedChoices,
        freeMode: state.freeMode,
        freeModeText: state.freeModeText,
        turnCount: state.turnCount,
        thoughtsOfHero: state.thoughtsOfHero,
        settings: state.settings,
        gameId: state.gameId,
        lastSaveTime: state.lastSaveTime,
        // Сохранение памяти (инвентарь) и изменений за ход
        aiMemory: state.aiMemory,
        inventory: state.inventory,
        relations: state.relations,
        lastTurnUpdates: state.lastTurnUpdates
    };
    
    // Сохраняем все в localStorage
localStorage.setItem('oto_skills', JSON.stringify(state.skills));
    localStorage.setItem('oto_v3_state', JSON.stringify(saveData));
    localStorage.setItem('oto_audit_log', JSON.stringify(state.auditLog));
    localStorage.setItem('oto_models_status', JSON.stringify(state.models));
    localStorage.setItem('oto_game_id', state.gameId);
    localStorage.setItem('oto_last_save_time', state.lastSaveTime);
    localStorage.setItem('oto_scale', state.settings.scale.toString());
    localStorage.setItem('oto_scale_index', state.settings.scaleIndex.toString());
    localStorage.setItem('oto_turn_count', state.turnCount.toString());
    localStorage.setItem('oto_thoughts_of_hero', JSON.stringify(state.thoughtsOfHero));
    
    console.log('Игра сохранена в localStorage');
}

/**
 * Загрузка состояния игры из localStorage
 */
function loadState() {
    const saved = localStorage.getItem('oto_v3_state');
    if (saved) {
        try {
            const p = JSON.parse(saved);
            const state = State.getState();
            
            // Восстанавливаем состояние игры
            state.stats = p.stats || state.stats;
            state.progress = p.progress || state.progress;
            state.degreeIndex = p.degreeIndex || state.degreeIndex;
            state.personality = p.personality || state.personality;
            state.isRitualActive = p.isRitualActive || false;
            state.currentScene = p.currentScene || state.currentScene;
            state.history = p.history || state.history;
            state.inventory = p.inventory || state.inventory;
            state.relations = p.relations || state.relations;
            state.skills = p.skills || state.relations || [],
state.ritualProgress = p.ritualProgress || state.ritualProgress || 0;
state.ritualTarget = p.ritualTarget || state.ritualTarget || null;

            state.selectedChoices = p.selectedChoices || state.selectedChoices;
            state.freeMode = p.freeMode || state.freeMode;
            state.freeModeText = p.freeModeText || state.freeModeText;
            state.turnCount = p.turnCount || state.turnCount;
            state.thoughtsOfHero = p.thoughtsOfHero || state.thoughtsOfHero;
            state.settings = p.settings || state.settings;
            state.gameId = p.gameId || state.gameId;
            state.lastSaveTime = p.lastSaveTime || state.lastSaveTime;
            
            // Восстановление памяти (Инвентарь) и Лога изменений
            // Если в сохранении нет aiMemory, инициализируем пустым объектом
            state.aiMemory = p.aiMemory || state.aiMemory;
            
            // Восстанавливаем строку изменений за ход
            state.lastTurnUpdates = p.lastTurnUpdates || state.lastTurnUpdates;
            
            // Загружаем аудит-логи
            const savedAudit = localStorage.getItem('oto_audit_log');
            if (savedAudit) {
                try {
                    state.auditLog = JSON.parse(savedAudit);
                } catch (e) {
                    console.error('Ошибка загрузки аудит-лога:', e);
                    state.auditLog = [];
                }
            }
            
            // Загружаем статусы моделей
            const savedModels = localStorage.getItem('oto_models_status');
            if (savedModels) {
                try {
                    state.models = JSON.parse(savedModels);
                    console.log('Модели загружены из localStorage');
                } catch (e) {
                    console.error('Ошибка загрузки моделей из localStorage:', e);
                    state.models = aiModels;
                    console.log('Модели загружены из кода');
                }
                if (savedModels.ength !== aiModels.length) {
                    console.log('Модели загружены из кода');
                    state.models = aiModels;
                }
            } else {
                state.models = aiModels;
                console.log('Модели загружены из кода');
            }
            
            // Загружаем масштаб
            const savedScale = localStorage.getItem('oto_scale');
            if (savedScale) {
                state.settings.scale = parseFloat(savedScale) || CONFIG.scaleSteps[CONFIG.defaultScaleIndex];
            } else {
                state.settings.scale = CONFIG.scaleSteps[CONFIG.defaultScaleIndex];
            }
            
            const savedScaleIndex = localStorage.getItem('oto_scale_index');
            if (savedScaleIndex) {
                state.settings.scaleIndex = parseInt(savedScaleIndex) || CONFIG.defaultScaleIndex;
            } else {
                state.settings.scaleIndex = CONFIG.defaultScaleIndex;
            }
            
            // Загружаем счетчик ходов
            const savedTurnCount = localStorage.getItem('oto_turn_count');
            if (savedTurnCount) {
                state.turnCount = parseInt(savedTurnCount) || 0;
            }
            
            // Загружаем фразы героя
            const savedThoughtsOfHero = localStorage.getItem('oto_thoughts_of_hero');
            if (savedThoughtsOfHero) {
                try {
                    state.thoughtsOfHero = JSON.parse(savedThoughtsOfHero);
                } catch (e) {
                    console.error('Ошибка загрузки списка фраз героя:', e);
                    state.thoughtsOfHero = [];
                }
            }
            
            State.setState(state);
            console.log('Игра загружена из localStorage');
        } catch (e) {
            console.error('Ошибка загрузки состояния:', e);
            localStorage.removeItem('oto_v3_state');
        }
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
    downloadAuditLogToFile
};