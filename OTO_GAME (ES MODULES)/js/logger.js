// Модуль: ЛОГГЕР - Расширенная система логирования для отслеживания операций и хода игры
'use strict';

import { CONFIG } from './1-config.js';

// Константы уровней логирования
export const LOG_LEVELS = {
    DEBUG: 0,
    INFO: 1,
    WARN: 2,
    ERROR: 3,
    NONE: 4
};

// Константы категорий логов
export const LOG_CATEGORIES = {
    OPERATIONS: 'OPERATIONS',
    GAME_STATE: 'GAME_STATE',
    TURN_PROCESSING: 'TURN_PROCESSING',
    AI_REQUESTS: 'AI_REQUESTS',
    UI_EVENTS: 'UI_EVENTS',
    VALIDATION: 'VALIDATION',
    ERROR_TRACKING: 'ERROR_TRACKING',
    PERFORMANCE: 'PERFORMANCE',
    ORGANIZATIONS: 'ORGANIZATIONS'
};

// Стили для консоли
const CONSOLE_STYLES = {
    reset: 'color: inherit; background: inherit;',
    
    // Категории
    [LOG_CATEGORIES.OPERATIONS]: 'color: #00b894; background: #111; padding: 2px 6px; border-radius: 3px; font-weight: bold;',
    [LOG_CATEGORIES.GAME_STATE]: 'color: #0984e3; background: #111; padding: 2px 6px; border-radius: 3px; font-weight: bold;',
    [LOG_CATEGORIES.TURN_PROCESSING]: 'color: #fdcb6e; background: #111; padding: 2px 6px; border-radius: 3px; font-weight: bold;',
    [LOG_CATEGORIES.AI_REQUESTS]: 'color: #6c5ce7; background: #111; padding: 2px 6px; border-radius: 3px; font-weight: bold;',
    [LOG_CATEGORIES.UI_EVENTS]: 'color: #e84393; background: #111; padding: 2px 6px; border-radius: 3px; font-weight: bold;',
    [LOG_CATEGORIES.VALIDATION]: 'color: #fd79a8; background: #111; padding: 2px 6px; border-radius: 3px; font-weight: bold;',
    [LOG_CATEGORIES.ERROR_TRACKING]: 'color: #ff7675; background: #111; padding: 2px 6px; border-radius: 3px; font-weight: bold;',
    [LOG_CATEGORIES.PERFORMANCE]: 'color: #74b9ff; background: #111; padding: 2px 6px; border-radius: 3px; font-weight: bold;',
    [LOG_CATEGORIES.ORGANIZATIONS]: 'color: #a29bfe; background: #111; padding: 2px 6px; border-radius: 3px; font-weight: bold;',
    
    // Уровни
    DEBUG: 'color: #636e72; font-style: italic;',
    INFO: 'color: #dfe6e9;',
    WARN: 'color: #fdcb6e; font-weight: bold;',
    ERROR: 'color: #ff7675; font-weight: bold;',
    SUCCESS: 'color: #00b894; font-weight: bold;',
    
    // Операции
    OPERATION_ADD: 'color: #00b894; background: rgba(0, 184, 148, 0.1); padding: 1px 4px; border-radius: 2px;',
    OPERATION_REMOVE: 'color: #ff7675; background: rgba(255, 118, 117, 0.1); padding: 1px 4px; border-radius: 2px;',
    OPERATION_MODIFY: 'color: #0984e3; background: rgba(9, 132, 227, 0.1); padding: 1px 4px; border-radius: 2px;',
    OPERATION_SET: 'color: #6c5ce7; background: rgba(108, 92, 231, 0.1); padding: 1px 4px; border-radius: 2px;',
    
    // Статусы
    STATUS_SUCCESS: 'color: #00b894; background: rgba(0, 184, 148, 0.2); padding: 2px 6px; border-radius: 12px; font-weight: bold;',
    STATUS_FAILED: 'color: #ff7675; background: rgba(255, 118, 117, 0.2); padding: 2px 6px; border-radius: 12px; font-weight: bold;',
    STATUS_PENDING: 'color: #fdcb6e; background: rgba(253, 203, 110, 0.2); padding: 2px 6px; border-radius: 12px; font-weight: bold;'
};

// Иконки для категорий
const CATEGORY_ICONS = {
    [LOG_CATEGORIES.OPERATIONS]: '🔧',
    [LOG_CATEGORIES.GAME_STATE]: '🎮',
    [LOG_CATEGORIES.TURN_PROCESSING]: '🔄',
    [LOG_CATEGORIES.AI_REQUESTS]: '🤖',
    [LOG_CATEGORIES.UI_EVENTS]: '🖥️',
    [LOG_CATEGORIES.VALIDATION]: '✅',
    [LOG_CATEGORIES.ERROR_TRACKING]: '❌',
    [LOG_CATEGORIES.PERFORMANCE]: '⏱️',
    [LOG_CATEGORIES.ORGANIZATIONS]: '🏛️'
};

// Иконки для операций
const OPERATION_ICONS = {
    'ADD': '➕',
    'REMOVE': '➖',
    'MODIFY': '📊',
    'SET': '⚙️'
};

class GameLogger {
    constructor() {
        this.logLevel = this.getLogLevelFromStorage();
        this.logBuffer = [];
        this.maxBufferSize = 500;
        this.enabledCategories = new Set(Object.values(LOG_CATEGORIES));
        this.turnLogs = new Map(); // Хранит логи по номерам ходов
        this.operationTracker = new Map(); // Трекер операций по ID
        this.sessionId = this.generateSessionId();
        this.startTime = Date.now();
        
        // Инициализация логирования
        this.log(LOG_CATEGORIES.PERFORMANCE, 'Инициализация логгера', {
            sessionId: this.sessionId,
            logLevel: this.logLevel,
            bufferSize: this.maxBufferSize
        });
    }
    
    /**
     * Генерация ID сессии
     */
    generateSessionId() {
        return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }
    
    /**
     * Получение уровня логирования из хранилища
     */
    getLogLevelFromStorage() {
        const savedLevel = localStorage.getItem('oto_log_level');
        return savedLevel !== null ? parseInt(savedLevel) : LOG_LEVELS.DEBUG;
    }
    
    /**
     * Установка уровня логирования
     */
    setLogLevel(level) {
        this.logLevel = level;
        localStorage.setItem('oto_log_level', level.toString());
        this.log(LOG_CATEGORIES.PERFORMANCE, `Уровень логирования установлен: ${this.getLevelName(level)}`);
    }
    
    /**
     * Получение имени уровня логирования
     */
    getLevelName(level) {
        const names = {
            [LOG_LEVELS.DEBUG]: 'DEBUG',
            [LOG_LEVELS.INFO]: 'INFO',
            [LOG_LEVELS.WARN]: 'WARN',
            [LOG_LEVELS.ERROR]: 'ERROR',
            [LOG_LEVELS.NONE]: 'NONE'
        };
        return names[level] || 'UNKNOWN';
    }
    
    /**
     * Включение/выключение категории логирования
     */
    toggleCategory(category, enabled) {
        if (enabled) {
            this.enabledCategories.add(category);
        } else {
            this.enabledCategories.delete(category);
        }
    }
    
    /**
     * ОСНОВНОЙ МЕТОД: Логирование сообщения
     */
    log(category, message, data = null, level = LOG_LEVELS.INFO) {
        // Проверка уровня и категории
        if (level < this.logLevel || !this.enabledCategories.has(category)) {
            return;
        }
        
        const timestamp = new Date().toISOString();
        const logEntry = {
            id: this.generateLogId(),
            sessionId: this.sessionId,
            timestamp,
            category,
            level,
            levelName: this.getLevelName(level),
            message,
            data: data ? this.safeClone(data) : null,
            stackTrace: level >= LOG_LEVELS.ERROR ? new Error().stack : null,
            turnNumber: this.currentTurn || null
        };
        
        // Добавление в буфер
        this.logBuffer.unshift(logEntry);
        if (this.logBuffer.length > this.maxBufferSize) {
            this.logBuffer.pop();
        }
        
        // Добавление в логи текущего хода
        if (this.currentTurn) {
            if (!this.turnLogs.has(this.currentTurn)) {
                this.turnLogs.set(this.currentTurn, []);
            }
            this.turnLogs.get(this.currentTurn).push(logEntry);
        }
        
        // Вывод в консоль
        this.printToConsole(logEntry);
        
        return logEntry.id;
    }
    
    /**
     * Генерация ID лога
     */
    generateLogId() {
        return 'log_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }
    
    /**
     * Безопасное клонирование данных
     */
    safeClone(obj) {
        try {
            if (obj === null || obj === undefined) return obj;
            if (typeof obj !== 'object') return obj;
            
            // Обработка циклических ссылок
            const seen = new WeakSet();
            return JSON.parse(JSON.stringify(obj, (key, value) => {
                if (typeof value === 'object' && value !== null) {
                    if (seen.has(value)) return '[Circular]';
                    seen.add(value);
                }
                return value;
            }));
        } catch (error) {
            return `[Serialization Error: ${error.message}]`;
        }
    }
    
    /**
 * Вывод в консоль с форматированием (исправлено)
 */
printToConsole(entry) {
    const time = new Date(entry.timestamp).toLocaleTimeString('ru-RU', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        fractionalSecondDigits: 3
    });
    
    const icon = CATEGORY_ICONS[entry.category] || '📝';
    const levelIcon = entry.level === LOG_LEVELS.ERROR ? '❌' :
        entry.level === LOG_LEVELS.WARN ? '⚠️' :
        entry.level === LOG_LEVELS.INFO ? 'ℹ️' : '🔍';
    
    const turnInfo = entry.turnNumber ? `[Ход ${entry.turnNumber}] ` : '';
    
    // Заголовок группы – всё корректно, оставляем как есть
    console.groupCollapsed(
        `%c${icon} ${turnInfo}${entry.category}%c %c${entry.levelName}%c ${entry.message}`,
        CONSOLE_STYLES[entry.category],
        CONSOLE_STYLES.reset,
        entry.level === LOG_LEVELS.ERROR ? CONSOLE_STYLES.ERROR :
        entry.level === LOG_LEVELS.WARN ? CONSOLE_STYLES.WARN :
        entry.level === LOG_LEVELS.INFO ? CONSOLE_STYLES.INFO : CONSOLE_STYLES.DEBUG,
        CONSOLE_STYLES.reset
    );
    
    // Детализация – стили уже правильно расставлены
    console.log(`%c⏰ Время: ${time}`, 'color: #636e72;');
    console.log(`%c🎯 Уровень: ${entry.levelName} ${levelIcon}`, 'color: #dfe6e9;');
    
    if (entry.turnNumber) {
        console.log(`%c🔄 Ход: ${entry.turnNumber}`, 'color: #74b9ff;');
    }
    
    // Вывод данных – убран лишний заголовок, сразу вызывается printData
    if (entry.data) {
        this.printData(entry.data);
    }
    
    if (entry.stackTrace) {
        console.log('%c🔍 Стек вызовов:', 'color: #fd79a8; font-weight: bold;');
        console.log(entry.stackTrace);
    }
    
    console.groupEnd();
}

/**
 * Форматированный вывод данных (полностью переработан)
 * Теперь все строки используют %c, нет сырой конкатенации, цвета применяются единообразно.
 */
printData(data, indent = 0) {
    const indentStr = '  '.repeat(indent); // два пробела на уровень
    
    // Примитивы
    if (data === null || data === undefined || typeof data !== 'object') {
        const style = this.getStyleForValue(data);
        console.log(`%c${indentStr}${this.formatValue(data)}`, style);
        return;
    }
    
    // Массив
    if (Array.isArray(data)) {
        console.log(`%c${indentStr}📋 Массив [${data.length} элементов]:`, 'color: #74b9ff;');
        data.forEach((item, index) => {
            const valueStr = this.formatValue(item);
            const style = this.getStyleForValue(item);
            // индекс — зелёный, значение — по типу
            console.log(`%c${indentStr}  ${index}:%c ${valueStr}`, 'color: #00b894;', style);
        });
        return;
    }
    
    // Объект
    console.log(`%c${indentStr}📁 Объект:`, 'color: #a29bfe;');
    Object.entries(data).forEach(([key, value]) => {
        if (typeof value === 'object' && value !== null) {
            // Вложенный объект/массив – сначала ключ, потом рекурсивно данные с увеличенным отступом
            console.log(`%c${indentStr}  ${key}:`, 'color: #00b894;');
            this.printData(value, indent + 2);
        } else {
            const valueStr = this.formatValue(value);
            const style = this.getStyleForValue(value);
            console.log(`%c${indentStr}  ${key}:%c ${valueStr}`, 'color: #00b894;', style);
        }
    });
}

/**
 * Возвращает строковое представление значения для вывода в консоль
 */
formatValue(value) {
    if (value === null) return 'null';
    if (value === undefined) return 'undefined';
    if (typeof value === 'string') return `"${value}"`;
    if (typeof value === 'function') return `ƒ ${value.name || 'anonymous'}()`;
    return String(value);
}

/**
 * Возвращает CSS-стиль для значения в зависимости от его типа
 */
getStyleForValue(value) {
    if (value === null || value === undefined) {
        return 'color: #636e72; font-style: italic;'; // серый
    }
    switch (typeof value) {
        case 'number':
            return 'color: #0984e3;'; // синий
        case 'boolean':
            return 'color: #fdcb6e;'; // жёлтый
        case 'string':
            return 'color: #dfe6e9;'; // светло-серый
        case 'function':
            return 'color: #e84393; font-style: italic;'; // розовый
        default:
            return 'color: #dfe6e9;';
    }
}
    
    /**
     * Начало логирования хода
     */
    startTurnLogging(turnNumber) {
        this.currentTurn = turnNumber;
        this.turnLogs.set(turnNumber, []);
        
        this.log(LOG_CATEGORIES.TURN_PROCESSING, `🔄 НАЧАЛО ОБРАБОТКИ ХОДА ${turnNumber}`, {
            timestamp: new Date().toISOString(),
            sessionId: this.sessionId
        }, LOG_LEVELS.INFO);
        
        return turnNumber;
    }
    
    /**
     * Завершение логирования хода
     */
    endTurnLogging(turnNumber, summary = {}) {
        const turnLogs = this.turnLogs.get(turnNumber) || [];
        
        this.log(LOG_CATEGORIES.TURN_PROCESSING, `✅ ЗАВЕРШЕНИЕ ОБРАБОТКИ ХОДА ${turnNumber}`, {
            totalLogs: turnLogs.length,
            operationsCount: summary.operationsCount || 0,
            successfulOperations: summary.successfulOperations || 0,
            failedOperations: summary.failedOperations || 0,
            processingTime: Date.now() - this.startTime
        }, LOG_LEVELS.INFO);
        
        this.currentTurn = null;
        
        // Экспорт логов хода при необходимости
        if (CONFIG.debugMode) {
            this.exportTurnLogs(turnNumber);
        }
    }
    
    /**
     * Логирование операции с детализацией
     */
    logOperation(operation, context = {}, result = null) {
        const operationId = operation.id || 'unknown';
        const operationType = operation.operation || 'unknown';
        
        // Начало трекинга операции
        this.operationTracker.set(operationId, {
            id: operationId,
            type: operationType,
            startTime: Date.now(),
            context,
            operation: this.safeClone(operation)
        });
        
        const icon = OPERATION_ICONS[operationType] || '🔧';
        
        this.log(LOG_CATEGORIES.OPERATIONS, `${icon} НАЧАЛО ОПЕРАЦИИ: ${operationType} над ${operationId}`, {
            operation: this.safeClone(operation),
            context,
            turn: this.currentTurn
        }, LOG_LEVELS.DEBUG);
        
        return operationId;
    }
    
    /**
     * Завершение логирования операции
     */
    logOperationResult(operationId, result) {
        const operationData = this.operationTracker.get(operationId);
        
        if (!operationData) {
            this.log(LOG_CATEGORIES.ERROR_TRACKING, `❌ ОПЕРАЦИЯ НЕ НАЙДЕНА: ${operationId}`, {}, LOG_LEVELS.ERROR);
            return;
        }
        
        const processingTime = Date.now() - operationData.startTime;
        const operationType = operationData.type;
        const icon = OPERATION_ICONS[operationType] || '🔧';
        
        const status = result.success ? '✅ УСПЕШНО' : '❌ ОШИБКА';
        const statusStyle = result.success ? CONSOLE_STYLES.STATUS_SUCCESS : CONSOLE_STYLES.STATUS_FAILED;
        
        this.log(LOG_CATEGORIES.OPERATIONS, `${icon} ${status}: ${operationType} над ${operationId}`, {
            result: this.safeClone(result),
            processingTime: `${processingTime}ms`,
            originalOperation: operationData.operation,
            context: operationData.context
        }, result.success ? LOG_LEVELS.INFO : LOG_LEVELS.WARN);
        
        // Удаление из трекера
        this.operationTracker.delete(operationId);
    }
    
    /**
     * Логирование изменения состояния игры
     */
    logStateChange(changes, previousState = null, newState = null) {
        if (!changes || Object.keys(changes).length === 0) {
            return;
        }
        
        const changeCount = Object.keys(changes).length;
        this.log(LOG_CATEGORIES.GAME_STATE, `📊 ИЗМЕНЕНИЕ СОСТОЯНИЯ: ${changeCount} элементов`, {
            changes: this.safeClone(changes),
            summary: this.calculateChangesSummary(changes),
            hasPreviousState: !!previousState,
            hasNewState: !!newState
        }, LOG_LEVELS.INFO);
        
        // Детализация по типам изменений
        Object.entries(changes).forEach(([id, change]) => {
            const [type, name] = id.split(':');
            const icon = type === 'stat' ? '📈' : 
                        type === 'skill' ? '📚' : 
                        type === 'inventory' ? '🎒' : 
                        type === 'buff' ? '⬆️' : '📝';
            
            this.log(LOG_CATEGORIES.GAME_STATE, `${icon} ${name}: ${change.old} → ${change.new} (Δ${change.delta})`, {
                id,
                type,
                name,
                oldValue: change.old,
                newValue: change.new,
                delta: change.delta
            }, LOG_LEVELS.DEBUG);
        });
    }
    
    /**
     * Расчет сводки изменений
     */
    calculateChangesSummary(changes) {
        const summary = {
            total: Object.keys(changes).length,
            byType: {},
            positive: 0,
            negative: 0,
            neutral: 0
        };
        
        Object.entries(changes).forEach(([id, change]) => {
            const [type] = id.split(':');
            
            // Подсчет по типам
            if (!summary.byType[type]) {
                summary.byType[type] = 0;
            }
            summary.byType[type]++;
            
            // Подсчет по направлению изменений
            if (change.delta > 0) summary.positive++;
            else if (change.delta < 0) summary.negative++;
            else summary.neutral++;
        });
        
        return summary;
    }
    
    /**
     * Логирование AI запроса
     */
    logAIRequest(requestData, turnNumber) {
        this.log(LOG_CATEGORIES.AI_REQUESTS, '🤖 ОТПРАВКА ЗАПРОСА К ИИ', {
            turn: turnNumber,
            selectedActions: requestData.selectedActions?.length || 0,
            stateSnapshot: {
                heroStateItems: requestData.state?.heroState?.length || 0,
                turnCount: requestData.state?.turnCount
            },
            d10: requestData.d10,
            timestamp: new Date().toISOString()
        }, LOG_LEVELS.INFO);
    }
    
    /**
     * Логирование AI ответа
     */
    logAIResponse(responseData, processingTime) {
        this.log(LOG_CATEGORIES.AI_REQUESTS, '🤖 ПОЛУЧЕН ОТВЕТ ОТ ИИ', {
            processingTime: `${processingTime}ms`,
            hasScene: !!responseData.scene,
            sceneLength: responseData.scene?.length || 0,
            choicesCount: responseData.choices?.length || 0,
            eventsCount: responseData.events?.length || 0,
            hasOrganizations: !!responseData._organizationsHierarchy,
            summary: responseData.summary?.substring(0, 1000) + '...' || 'Нет'
        }, LOG_LEVELS.INFO);
    }
    
    /**
     * Логирование ошибки с детализацией
     */
    logError(context, error, additionalData = {}) {
        const errorId = 'err_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
        
        this.log(LOG_CATEGORIES.ERROR_TRACKING, `❌ ОШИБКА: ${error.message || 'Unknown error'}`, {
            errorId,
            context,
            error: {
                name: error.name,
                message: error.message,
                stack: error.stack,
                code: error.code
            },
            ...additionalData,
            timestamp: new Date().toISOString(),
            turn: this.currentTurn
        }, LOG_LEVELS.ERROR);
        
        return errorId;
    }
    
    /**
     * Логирование производительности
     */
    logPerformance(marker, startTime, data = {}) {
        const duration = Date.now() - startTime;
        
        let level = LOG_LEVELS.DEBUG;
        if (duration > 1000) level = LOG_LEVELS.WARN;
        if (duration > 5000) level = LOG_LEVELS.ERROR;
        
        this.log(LOG_CATEGORIES.PERFORMANCE, `⏱️ ${marker}: ${duration}ms`, {
            marker,
            duration,
            ...data
        }, level);
        
        return duration;
    }
    
    /**
     * Логирование операций с организациями
     */
    logOrganizationOperation(operation, organization, oldRank = null, newRank = null) {
        const icon = OPERATION_ICONS[operation] || '🏛️';
        
        this.log(LOG_CATEGORIES.ORGANIZATIONS, `${icon} ОПЕРАЦИЯ С ОРГАНИЗАЦИЕЙ: ${organization}`, {
            operation,
            organization,
            oldRank,
            newRank,
            rankChange: oldRank !== null && newRank !== null ? newRank - oldRank : null,
            timestamp: new Date().toISOString()
        }, LOG_LEVELS.INFO);
    }
    
    /**
     * Экспорт логов хода
     */
    exportTurnLogs(turnNumber) {
        const logs = this.turnLogs.get(turnNumber) || [];
        
        if (logs.length === 0) {
            return null;
        }
        
        const exportData = {
            sessionId: this.sessionId,
            turnNumber,
            exportTime: new Date().toISOString(),
            totalLogs: logs.length,
            logs: logs
        };
        
        // Сохранение в localStorage для отладки
        const key = `oto_turn_logs_${turnNumber}`;
        localStorage.setItem(key, JSON.stringify(exportData, null, 2));
        
        return exportData;
    }
    
    /**
     * Получение логов по фильтру
     */
    getLogs(filter = {}) {
        let filteredLogs = [...this.logBuffer];
        
        if (filter.category) {
            filteredLogs = filteredLogs.filter(log => log.category === filter.category);
        }
        
        if (filter.level !== undefined) {
            filteredLogs = filteredLogs.filter(log => log.level >= filter.level);
        }
        
        if (filter.turnNumber) {
            filteredLogs = filteredLogs.filter(log => log.turnNumber === filter.turnNumber);
        }
        
        if (filter.search) {
            const searchLower = filter.search.toLowerCase();
            filteredLogs = filteredLogs.filter(log => 
                log.message.toLowerCase().includes(searchLower) ||
                JSON.stringify(log.data).toLowerCase().includes(searchLower)
            );
        }
        
        if (filter.limit) {
            filteredLogs = filteredLogs.slice(0, filter.limit);
        }
        
        return filteredLogs;
    }
    
    /**
     * Получение статистики логов
     */
    getLogStats() {
        const stats = {
            total: this.logBuffer.length,
            byCategory: {},
            byLevel: {},
            byTurn: {},
            errorCount: 0,
            warnCount: 0
        };
        
        this.logBuffer.forEach(log => {
            // По категориям
            if (!stats.byCategory[log.category]) {
                stats.byCategory[log.category] = 0;
            }
            stats.byCategory[log.category]++;
            
            // По уровням
            if (!stats.byLevel[log.levelName]) {
                stats.byLevel[log.levelName] = 0;
            }
            stats.byLevel[log.levelName]++;
            
            // По ходам
            if (log.turnNumber) {
                if (!stats.byTurn[log.turnNumber]) {
                    stats.byTurn[log.turnNumber] = 0;
                }
                stats.byTurn[log.turnNumber]++;
            }
            
            // Счетчики ошибок и предупреждений
            if (log.level === LOG_LEVELS.ERROR) stats.errorCount++;
            if (log.level === LOG_LEVELS.WARN) stats.warnCount++;
        });
        
        return stats;
    }
    
    /**
     * Очистка логов
     */
    clearLogs() {
        this.logBuffer = [];
        this.turnLogs.clear();
        this.operationTracker.clear();
        this.log(LOG_CATEGORIES.PERFORMANCE, '🗑️ Все логи очищены', {}, LOG_LEVELS.INFO);
    }
    
    /**
     * Создание отчета о сессии
     */
    createSessionReport() {
        const stats = this.getLogStats();
        const sessionDuration = Date.now() - this.startTime;
        
        const report = {
            sessionId: this.sessionId,
            startTime: new Date(this.startTime).toISOString(),
            duration: sessionDuration,
            durationFormatted: this.formatDuration(sessionDuration),
            totalLogs: stats.total,
            errors: stats.errorCount,
            warnings: stats.warnCount,
            categories: stats.byCategory,
            levels: stats.byLevel,
            turns: stats.byTurn,
            logLevel: this.getLevelName(this.logLevel),
            enabledCategories: Array.from(this.enabledCategories)
        };
        
        return report;
    }
    
    /**
     * Форматирование длительности
     */
    formatDuration(ms) {
        const seconds = Math.floor(ms / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        
        if (hours > 0) {
            return `${hours}ч ${minutes % 60}м ${seconds % 60}с`;
        } else if (minutes > 0) {
            return `${minutes}м ${seconds % 60}с`;
        } else {
            return `${seconds}с`;
        }
    }
    
    /**
     * Генерация HTML отчета
     */
    generateHTMLReport() {
        const report = this.createSessionReport();
        
        let html = `
        <div style="font-family: monospace; background: #1a1a1a; color: #fff; padding: 20px; border-radius: 8px;">
            <h2 style="color: #00b894; border-bottom: 2px solid #00b894; padding-bottom: 10px;">
                📊 ОТЧЕТ ЛОГГЕРА - Сессия ${report.sessionId}
            </h2>
            
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 15px; margin-top: 20px;">
        `;
        
        // Блок основной информации
        html += `
            <div style="background: #2d3436; padding: 15px; border-radius: 6px;">
                <h3 style="color: #74b9ff; margin-top: 0;">📈 ОБЩАЯ ИНФОРМАЦИЯ</h3>
                <div style="color: #dfe6e9;">
                    <div><strong>Начало:</strong> ${new Date(report.startTime).toLocaleString('ru-RU')}</div>
                    <div><strong>Длительность:</strong> ${report.durationFormatted}</div>
                    <div><strong>Всего логов:</strong> ${report.totalLogs}</div>
                    <div><strong>Уровень логирования:</strong> ${report.logLevel}</div>
                </div>
            </div>
        `;
        
        // Блок ошибок и предупреждений
        html += `
            <div style="background: #2d3436; padding: 15px; border-radius: 6px;">
                <h3 style="color: #ff7675; margin-top: 0;">⚠️ ОШИБКИ И ПРЕДУПРЕЖДЕНИЯ</h3>
                <div style="color: #dfe6e9;">
                    <div><strong>Ошибки:</strong> <span style="color: #ff7675;">${report.errors}</span></div>
                    <div><strong>Предупреждения:</strong> <span style="color: #fdcb6e;">${report.warnings}</span></div>
                    <div><strong>Уровень логирования:</strong> ${report.logLevel}</div>
                </div>
            </div>
        `;
        
        // Блок категорий
        html += `
            <div style="background: #2d3436; padding: 15px; border-radius: 6px;">
                <h3 style="color: #a29bfe; margin-top: 0;">📂 РАСПРЕДЕЛЕНИЕ ПО КАТЕГОРИЯМ</h3>
                <div style="color: #dfe6e9;">
        `;
        
        Object.entries(report.categories).forEach(([category, count]) => {
            const percentage = ((count / report.totalLogs) * 100).toFixed(1);
            html += `
                <div style="margin: 5px 0;">
                    <span style="color: ${this.getCategoryColor(category)}">${category}</span>: 
                    ${count} (${percentage}%)
                    <div style="background: #404040; height: 10px; border-radius: 5px; margin-top: 2px;">
                        <div style="background: ${this.getCategoryColor(category)}; width: ${percentage}%; height: 100%; border-radius: 5px;"></div>
                    </div>
                </div>
            `;
        });
        
        html += `</div></div>`;
        
        // Блок ходов
        html += `
            <div style="background: #2d3436; padding: 15px; border-radius: 6px;">
                <h3 style="color: #fdcb6e; margin-top: 0;">🔄 ЛОГИ ПО ХОДАМ</h3>
                <div style="color: #dfe6e9;">
        `;
        
        Object.entries(report.turns).sort((a, b) => b[0] - a[0]).slice(0, 10).forEach(([turn, count]) => {
            html += `<div><strong>Ход ${turn}:</strong> ${count} логов</div>`;
        });
        
        if (Object.keys(report.turns).length > 10) {
            html += `<div style="color: #636e72; font-style: italic;">... и еще ${Object.keys(report.turns).length - 10} ходов</div>`;
        }
        
        html += `</div></div></div></div>`;
        
        return html;
    }
    
    /**
     * Получение цвета категории
     */
    getCategoryColor(category) {
        const colors = {
            [LOG_CATEGORIES.OPERATIONS]: '#00b894',
            [LOG_CATEGORIES.GAME_STATE]: '#0984e3',
            [LOG_CATEGORIES.TURN_PROCESSING]: '#fdcb6e',
            [LOG_CATEGORIES.AI_REQUESTS]: '#6c5ce7',
            [LOG_CATEGORIES.UI_EVENTS]: '#e84393',
            [LOG_CATEGORIES.VALIDATION]: '#fd79a8',
            [LOG_CATEGORIES.ERROR_TRACKING]: '#ff7675',
            [LOG_CATEGORIES.PERFORMANCE]: '#74b9ff',
            [LOG_CATEGORIES.ORGANIZATIONS]: '#a29bfe'
        };
        
        return colors[category] || '#636e72';
    }
}

// Создание и экспорт синглтона
export const Logger = new GameLogger();

// Вспомогательные функции для быстрого доступа
export const log = {
    debug: (category, message, data) => Logger.log(category, message, data, LOG_LEVELS.DEBUG),
    info: (category, message, data) => Logger.log(category, message, data, LOG_LEVELS.INFO),
    warn: (category, message, data) => Logger.log(category, message, data, LOG_LEVELS.WARN),
    error: (category, message, data) => Logger.log(category, message, data, LOG_LEVELS.ERROR),
    
    // Специализированные методы
    operation: (operation, context) => Logger.logOperation(operation, context),
    operationResult: (operationId, result) => Logger.logOperationResult(operationId, result),
    stateChange: (changes, previousState, newState) => Logger.logStateChange(changes, previousState, newState),
    aiRequest: (requestData, turnNumber) => Logger.logAIRequest(requestData, turnNumber),
    aiResponse: (responseData, processingTime) => Logger.logAIResponse(responseData, processingTime),
    performance: (marker, startTime, data) => Logger.logPerformance(marker, startTime, data),
    organization: (operation, org, oldRank, newRank) => Logger.logOrganizationOperation(operation, org, oldRank, newRank),
    
    // Управление
    startTurn: (turnNumber) => Logger.startTurnLogging(turnNumber),
    endTurn: (turnNumber, summary) => Logger.endTurnLogging(turnNumber, summary),
    
    // Получение данных
    getStats: () => Logger.getLogStats(),
    getLogs: (filter) => Logger.getLogs(filter),
    getReport: () => Logger.createSessionReport(),
    getHTMLReport: () => Logger.generateHTMLReport(),
    
    // Очистка
    clear: () => Logger.clearLogs(),
    
    // Настройки
    setLevel: (level) => Logger.setLogLevel(level),
    toggleCategory: (category, enabled) => Logger.toggleCategory(category, enabled)
};

// Глобальная функция для быстрого доступа в консоли
if (typeof window !== 'undefined') {
    window.gameLogger = Logger;
    window.log = log;
}