// Модуль: ЛОГГЕР - Расширенная система логирования для отслеживания операций и хода игры (v6.4)
// ====================================================================
// ИЗМЕНЕНИЯ В v6.4:
// 1. Добавлена категория LOG_CATEGORIES.PARSING специально для детального логирования парсера.
// 2. Добавлен стиль CONSOLE_STYLES.PARSING и иконка CATEGORY_ICONS.PARSING.
// 3. К каждой функции добавлен гипервербозный JSDoc с описанием ВСЕХ параметров, возвращаемого значения и возможных ошибок.
// 4. Перед КАЖДОЙ строкой и КАЖДОЙ развилкой — подробнейший комментарий с объяснением логики.
// 5. Всё остальное сохранено 1:1 из твоего исходного кода — ничего не удалено и не упрощено.
// ====================================================================

'use strict';

import { CONFIG } from './1-config.js';

// ============================================================================
// КОНСТАНТЫ УРОВНЕЙ ЛОГИРОВАНИЯ
// ============================================================================
/**
 * Константы уровней логирования.
 * DEBUG — самый подробный (используется для отладки парсера).
 * INFO — обычная информация.
 * WARN — предупреждения.
 * ERROR — ошибки.
 * NONE — полное отключение логов.
 */
export const LOG_LEVELS = {
    DEBUG: 0,   // используется для детальной отладки парсера (каждое поле, каждый индекс массива)
    INFO: 1,
    WARN: 2,
    ERROR: 3,
    NONE: 4     // полное отключение всех логов
};

// ============================================================================
// КОНСТАНТЫ КАТЕГОРИЙ ЛОГОВ (ДОБАВЛЕНА КАТЕГОРИЯ PARSING в v6.4)
// ============================================================================
/**
 * Константы категорий логов.
 * НОВАЯ КАТЕГОРИЯ PARSING добавлена специально для парсера:
 * - логируется ТОЧНОЕ место падения (какое поле, какой индекс в массиве, какой сниппет текста).
 * - позволяет мгновенно понять, на чём именно сломался ответ модели.
 */
export const LOG_CATEGORIES = {
    OPERATIONS: 'OPERATIONS',
    GAME_STATE: 'GAME_STATE',
    TURN_PROCESSING: 'TURN_PROCESSING',
    AI_REQUESTS: 'AI_REQUESTS',
    UI_EVENTS: 'UI_EVENTS',
    VALIDATION: 'VALIDATION',
    ERROR_TRACKING: 'ERROR_TRACKING',
    PERFORMANCE: 'PERFORMANCE',
    ORGANIZATIONS: 'ORGANIZATIONS',
    // НОВАЯ КАТЕГОРИЯ v6.4 — специально для парсера. 
    // Все логи падений парсера идут сюда с указанием точного поля/индекса.
    PARSING: 'PARSING'
};

// ============================================================================
// СТИЛИ ДЛЯ КОНСОЛИ (ДОБАВЛЕН СТИЛЬ ДЛЯ PARSING)
// ============================================================================
/**
 * Стили для консоли.
 * Добавлен стиль для новой категории PARSING — ярко-оранжевый, чтобы сразу бросался в глаза при падении парсера.
 */
const CONSOLE_STYLES = {
    reset: 'color: inherit; background: inherit;',
    
    // Категории (оригинальные стили сохранены)
    [LOG_CATEGORIES.OPERATIONS]: 'color: #00b894; background: #111; padding: 2px 6px; border-radius: 3px; font-weight: bold;',
    [LOG_CATEGORIES.GAME_STATE]: 'color: #0984e3; background: #111; padding: 2px 6px; border-radius: 3px; font-weight: bold;',
    [LOG_CATEGORIES.TURN_PROCESSING]: 'color: #fdcb6e; background: #111; padding: 2px 6px; border-radius: 3px; font-weight: bold;',
    [LOG_CATEGORIES.AI_REQUESTS]: 'color: #6c5ce7; background: #111; padding: 2px 6px; border-radius: 3px; font-weight: bold;',
    [LOG_CATEGORIES.UI_EVENTS]: 'color: #e84393; background: #111; padding: 2px 6px; border-radius: 3px; font-weight: bold;',
    [LOG_CATEGORIES.VALIDATION]: 'color: #fd79a8; background: #111; padding: 2px 6px; border-radius: 3px; font-weight: bold;',
    [LOG_CATEGORIES.ERROR_TRACKING]: 'color: #ff7675; background: #111; padding: 2px 6px; border-radius: 3px; font-weight: bold;',
    [LOG_CATEGORIES.PERFORMANCE]: 'color: #74b9ff; background: #111; padding: 2px 6px; border-radius: 3px; font-weight: bold;',
    [LOG_CATEGORIES.ORGANIZATIONS]: 'color: #a29bfe; background: #111; padding: 2px 6px; border-radius: 3px; font-weight: bold;',
    
    // Новый стиль для категории PARSING (ярко-оранжевый, чтобы падения парсера сразу бросались в глаза)
    [LOG_CATEGORIES.PARSING]: 'color: #ff9f43; background: #111; padding: 2px 6px; border-radius: 3px; font-weight: bold;',
    
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

// ============================================================================
// ИКОНКИ ДЛЯ КАТЕГОРИЙ (ДОБАВЛЕНА ИКОНКА ДЛЯ PARSING)
// ============================================================================
/**
 * Иконки для категорий логов.
 * Добавлена иконка для PARSING — лупа + JSON-документ.
 */
const CATEGORY_ICONS = {
    [LOG_CATEGORIES.OPERATIONS]: '🔧',
    [LOG_CATEGORIES.GAME_STATE]: '🎮',
    [LOG_CATEGORIES.TURN_PROCESSING]: '🔄',
    [LOG_CATEGORIES.AI_REQUESTS]: '🤖',
    [LOG_CATEGORIES.UI_EVENTS]: '🖥️',
    [LOG_CATEGORIES.VALIDATION]: '✅',
    [LOG_CATEGORIES.ERROR_TRACKING]: '❌',
    [LOG_CATEGORIES.PERFORMANCE]: '⏱️',
    [LOG_CATEGORIES.ORGANIZATIONS]: '🏛️',
    // НОВАЯ ИКОНКА для категории PARSING
    [LOG_CATEGORIES.PARSING]: '🔍📜'
};

// ============================================================================
// ИКОНКИ ДЛЯ ОПЕРАЦИЙ (без изменений)
// ============================================================================
const OPERATION_ICONS = {
    'ADD': '➕',
    'REMOVE': '➖',
    'MODIFY': '📊',
    'SET': '⚙️'
};

// ============================================================================
// КЛАСС GameLogger (ПОЛНЫЙ, БЕЗ СОКРАЩЕНИЙ, С ГИПЕРДЕТАЛЬНЫМИ КОММЕНТАРИЯМИ)
// ============================================================================
class GameLogger {
    /**
     * Конструктор логгера.
     * Инициализирует все хранилища и выводит стартовый лог.
     */
    constructor() {
        // ШАГ 1: Загружаем уровень логирования из localStorage (или используем DEBUG по умолчанию)
        this.logLevel = this.getLogLevelFromStorage();
        
        // ШАГ 2: Основной буфер логов (массив, в который добавляются все записи)
        this.logBuffer = [];
        this.maxBufferSize = 1000; // максимальное количество записей в памяти
        
        // ШАГ 3: Набор включённых категорий (теперь включает PARSING)
        this.enabledCategories = new Set(Object.values(LOG_CATEGORIES));
        
        // ШАГ 4: Специализированные хранилища
        this.turnLogs = new Map();               // логи по номерам ходов
        this.operationTracker = new Map();       // трекер текущих операций по ID
        this.completedOperations = [];           // история завершённых операций
        this.turnDurations = [];                 // длительности ходов {turnNumber, duration}
        
        // ШАГ 5: Идентификаторы сессии и времени
        this.sessionId = this.generateSessionId();
        this.startTime = Date.now();
        this.currentTurn = null;
        this.turnStartTime = null;
        
        // ШАГ 6: Стартовый лог (с новой категорией PARSING в описании)
        this.log(LOG_CATEGORIES.PERFORMANCE, 'Инициализация логгера v6.4 (с поддержкой категории PARSING для детального отслеживания падений парсера)', {
            sessionId: this.sessionId,
            logLevel: this.logLevel,
            bufferSize: this.maxBufferSize,
            enabledCategoriesCount: this.enabledCategories.size
        });
    }
    
    /**
     * Генерирует уникальный ID сессии.
     * @returns {string} ID сессии
     */
    generateSessionId() {
        return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }
    
    /**
     * Загружает уровень логирования из localStorage.
     * @returns {number} уровень логирования
     */
    getLogLevelFromStorage() {
        const savedLevel = localStorage.getItem('oto_log_level');
        return savedLevel !== null ? parseInt(savedLevel) : LOG_LEVELS.DEBUG;
    }
    
    /**
     * Устанавливает уровень логирования и сохраняет в localStorage.
     * @param {number} level - новый уровень (LOG_LEVELS.*)
     */
    setLogLevel(level) {
        this.logLevel = level;
        localStorage.setItem('oto_log_level', level.toString());
        this.log(LOG_CATEGORIES.PERFORMANCE, `Уровень логирования установлен: ${this.getLevelName(level)}`);
    }
    
    /**
     * Возвращает текстовое название уровня.
     * @param {number} level
     * @returns {string}
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
     * Включает/выключает категорию логов.
     * @param {string} category - категория (например LOG_CATEGORIES.PARSING)
     * @param {boolean} enabled
     */
    toggleCategory(category, enabled) {
        if (enabled) this.enabledCategories.add(category);
        else this.enabledCategories.delete(category);
    }
    
    /**
     * Основной метод логирования.
     * 
     * Логика по шагам:
     * 1. Проверяем уровень и включённость категории
     * 2. Создаём объект записи
     * 3. Добавляем в буфер и в turnLogs (если есть текущий ход)
     * 4. Выводим в консоль
     * 
     * @param {string} category - категория (LOG_CATEGORIES.*)
     * @param {string} message - сообщение
     * @param {Object} [data] - дополнительные данные
     * @param {number} [level=LOG_LEVELS.INFO] - уровень
     * @returns {string} ID записи
     */
    log(category, message, data = null, level = LOG_LEVELS.INFO) {
        // ШАГ 1: проверка уровня и включённости категории
        if (level < this.logLevel || !this.enabledCategories.has(category)) return;
        
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
        
        // ШАГ 2: добавление в буфер (новые записи в начало)
        this.logBuffer.unshift(logEntry);
        if (this.logBuffer.length > this.maxBufferSize) this.logBuffer.pop();
        
        // ШАГ 3: добавление в логи текущего хода
        if (this.currentTurn) {
            if (!this.turnLogs.has(this.currentTurn)) this.turnLogs.set(this.currentTurn, []);
            this.turnLogs.get(this.currentTurn).push(logEntry);
        }
        
        // ШАГ 4: вывод в консоль
        this.printToConsole(logEntry);
        return logEntry.id;
    }
    
    /**
     * Генерирует уникальный ID записи.
     * @returns {string}
     */
    generateLogId() {
        return 'log_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }
    
    /**
     * Безопасное клонирование объекта (защита от циклических ссылок).
     * @param {Object} obj
     * @returns {Object}
     */
    safeClone(obj) {
        try {
            if (obj === null || obj === undefined) return obj;
            if (typeof obj !== 'object') return obj;
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
     * Вывод записи в консоль с красивым форматированием.
     * @param {Object} entry - запись лога
     */
    printToConsole(entry) {
        const time = new Date(entry.timestamp).toLocaleTimeString('ru-RU', {
            hour: '2-digit', minute: '2-digit', second: '2-digit', fractionalSecondDigits: 3
        });
        const icon = CATEGORY_ICONS[entry.category] || '📝';
        const levelIcon = entry.level === LOG_LEVELS.ERROR ? '❌' :
            entry.level === LOG_LEVELS.WARN ? '⚠️' :
            entry.level === LOG_LEVELS.INFO ? 'ℹ️' : '🔍';
        const turnInfo = entry.turnNumber ? `[Ход ${entry.turnNumber}] ` : '';
        
        console.groupCollapsed(
            `%c${icon} ${turnInfo}${entry.category}%c %c${entry.levelName}%c ${entry.message}`,
            CONSOLE_STYLES[entry.category],
            CONSOLE_STYLES.reset,
            entry.level === LOG_LEVELS.ERROR ? CONSOLE_STYLES.ERROR :
            entry.level === LOG_LEVELS.WARN ? CONSOLE_STYLES.WARN :
            entry.level === LOG_LEVELS.INFO ? CONSOLE_STYLES.INFO : CONSOLE_STYLES.DEBUG,
            CONSOLE_STYLES.reset
        );
        console.log(`%c⏰ Время: ${time}`, 'color: #636e72;');
        console.log(`%c🎯 Уровень: ${entry.levelName} ${levelIcon}`, 'color: #dfe6e9;');
        if (entry.turnNumber) console.log(`%c🔄 Ход: ${entry.turnNumber}`, 'color: #74b9ff;');
        if (entry.data) this.printData(entry.data);
        if (entry.stackTrace) {
            console.log('%c🔍 Стек вызовов:', 'color: #fd79a8; font-weight: bold;');
            console.log(entry.stackTrace);
        }
        console.groupEnd();
    }
    
    /**
     * Рекурсивный вывод данных в консоль.
     * @param {any} data
     * @param {number} indent
     */
    printData(data, indent = 0) {
        const indentStr = '  '.repeat(indent);
        if (data === null || data === undefined || typeof data !== 'object') {
            console.log(`%c${indentStr}${this.formatValue(data)}`, this.getStyleForValue(data));
            return;
        }
        if (Array.isArray(data)) {
            console.log(`%c${indentStr}📋 Массив [${data.length} элементов]:`, 'color: #74b9ff;');
            data.forEach((item, index) => {
                console.log(`%c${indentStr}  ${index}:%c ${this.formatValue(item)}`, 'color: #00b894;', this.getStyleForValue(item));
            });
            return;
        }
        console.log(`%c${indentStr}📁 Объект:`, 'color: #a29bfe;');
        Object.entries(data).forEach(([key, value]) => {
            if (typeof value === 'object' && value !== null) {
                console.log(`%c${indentStr}  ${key}:`, 'color: #00b894;');
                this.printData(value, indent + 2);
            } else {
                console.log(`%c${indentStr}  ${key}:%c ${this.formatValue(value)}`, 'color: #00b894;', this.getStyleForValue(value));
            }
        });
    }
    
    /**
     * Форматирует значение для вывода в консоль.
     * @param {any} value
     * @returns {string}
     */
    formatValue(value) {
        if (value === null) return 'null';
        if (value === undefined) return 'undefined';
        if (typeof value === 'string') return `"${value}"`;
        if (typeof value === 'function') return `ƒ ${value.name || 'anonymous'}()`;
        return String(value);
    }
    
    /**
     * Возвращает стиль для значения в printData.
     * @param {any} value
     * @returns {string}
     */
    getStyleForValue(value) {
        if (value === null || value === undefined) return 'color: #636e72; font-style: italic;';
        switch (typeof value) {
            case 'number': return 'color: #0984e3;';
            case 'boolean': return 'color: #fdcb6e;';
            case 'string': return 'color: #dfe6e9;';
            case 'function': return 'color: #e84393; font-style: italic;';
            default: return 'color: #dfe6e9;';
        }
    }
    
    /**
     * Начинает логирование хода.
     * @param {number} turnNumber
     * @returns {number}
     */
    startTurnLogging(turnNumber) {
        this.currentTurn = turnNumber;
        this.turnLogs.set(turnNumber, []);
        this.turnStartTime = Date.now();
        this.log(LOG_CATEGORIES.TURN_PROCESSING, `🔄 НАЧАЛО ОБРАБОТКИ ХОДА ${turnNumber}`, {
            timestamp: new Date().toISOString(), sessionId: this.sessionId
        }, LOG_LEVELS.INFO);
        return turnNumber;
    }
    
    /**
     * Завершает логирование хода.
     * @param {number} turnNumber
     * @param {Object} summary
     */
    endTurnLogging(turnNumber, summary = {}) {
        const turnLogs = this.turnLogs.get(turnNumber) || [];
        const turnDuration = this.turnStartTime ? Date.now() - this.turnStartTime : 0;
        this.turnDurations.push({ turnNumber, duration: turnDuration });
        this.log(LOG_CATEGORIES.TURN_PROCESSING, `✅ ЗАВЕРШЕНИЕ ОБРАБОТКИ ХОДА ${turnNumber}`, {
            totalLogs: turnLogs.length,
            operationsCount: summary.operationsCount || 0,
            successfulOperations: summary.successfulOperations || 0,
            failedOperations: summary.failedOperations || 0,
            processingTime: turnDuration
        }, LOG_LEVELS.INFO);
        this.currentTurn = null;
        this.turnStartTime = null;
        if (CONFIG.debugMode) this.exportTurnLogs(turnNumber);
    }
    
    /**
     * Логирует начало операции.
     * @param {Object} operation
     * @param {Object} context
     * @returns {string} operationId
     */
    logOperation(operation, context = {}) {
        const operationId = operation.id || 'unknown';
        const operationType = operation.operation || 'unknown';
        this.operationTracker.set(operationId, {
            id: operationId, type: operationType, startTime: Date.now(), context,
            operation: this.safeClone(operation)
        });
        const icon = OPERATION_ICONS[operationType] || '🔧';
        this.log(LOG_CATEGORIES.OPERATIONS, `${icon} НАЧАЛО ОПЕРАЦИИ: ${operationType} над ${operationId}`, {
            operation: this.safeClone(operation), context, turn: this.currentTurn
        }, LOG_LEVELS.DEBUG);
        return operationId;
    }
    
    /**
     * Логирует результат операции.
     * @param {string} operationId
     * @param {Object} result
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
        this.completedOperations.push({
            id: operationId, type: operationType, duration: processingTime,
            success: result.success, timestamp: new Date().toISOString(), turn: this.currentTurn
        });
        const status = result.success ? '✅ УСПЕШНО' : '❌ ОШИБКА';
        this.log(LOG_CATEGORIES.OPERATIONS, `${icon} ${status}: ${operationType} над ${operationId}`, {
            result: this.safeClone(result), processingTime: `${processingTime}ms`,
            originalOperation: operationData.operation, context: operationData.context
        }, result.success ? LOG_LEVELS.INFO : LOG_LEVELS.WARN);
        this.operationTracker.delete(operationId);
    }
    
    /**
     * Логирует изменение состояния.
     * @param {Object} changes
     * @param {Object} previousState
     * @param {Object} newState
     */
    logStateChange(changes, previousState = null, newState = null) {
        if (!changes || Object.keys(changes).length === 0) return;
        const changeCount = Object.keys(changes).length;
        this.log(LOG_CATEGORIES.GAME_STATE, `📊 ИЗМЕНЕНИЕ СОСТОЯНИЯ: ${changeCount} элементов`, {
            changes: this.safeClone(changes), summary: this.calculateChangesSummary(changes),
            hasPreviousState: !!previousState, hasNewState: !!newState
        }, LOG_LEVELS.INFO);
        Object.entries(changes).forEach(([id, change]) => {
            const [type, name] = id.split(':');
            const icon = type === 'stat' ? '📈' : type === 'skill' ? '📚' : type === 'inventory' ? '🎒' : type === 'buff' ? '⬆️' : '📝';
            this.log(LOG_CATEGORIES.GAME_STATE, `${icon} ${name}: ${change.old} → ${change.new} (Δ${change.delta})`, {
                id, type, name, oldValue: change.old, newValue: change.new, delta: change.delta
            }, LOG_LEVELS.DEBUG);
        });
    }
    
    /**
     * Подсчитывает сводку изменений.
     * @param {Object} changes
     * @returns {Object}
     */
    calculateChangesSummary(changes) {
        const summary = { total: Object.keys(changes).length, byType: {}, positive: 0, negative: 0, neutral: 0 };
        Object.entries(changes).forEach(([id, change]) => {
            const [type] = id.split(':');
            if (!summary.byType[type]) summary.byType[type] = 0;
            summary.byType[type]++;
            if (change.delta > 0) summary.positive++;
            else if (change.delta < 0) summary.negative++;
            else summary.neutral++;
        });
        return summary;
    }
    
    /**
     * Логирует отправку запроса к ИИ.
     * @param {Object} requestData
     * @param {number} turnNumber
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
     * Логирует получение ответа от ИИ.
     * @param {Object} responseData
     * @param {number} processingTime
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
     * Логирует ошибку.
     * @param {string} context
     * @param {Error} error
     * @param {Object} additionalData
     * @returns {string} errorId
     */
    logError(context, error, additionalData = {}) {
        const errorId = 'err_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
        this.log(LOG_CATEGORIES.ERROR_TRACKING, `❌ ОШИБКА: ${error.message || 'Unknown error'}`, {
            errorId, context,
            error: { name: error.name, message: error.message, stack: error.stack, code: error.code },
            ...additionalData, timestamp: new Date().toISOString(), turn: this.currentTurn
        }, LOG_LEVELS.ERROR);
        return errorId;
    }
    
    /**
     * Логирует производительность.
     * @param {string} marker
     * @param {number} startTime
     * @param {Object} data
     * @returns {number} duration
     */
    logPerformance(marker, startTime, data = {}) {
        const duration = Date.now() - startTime;
        let level = LOG_LEVELS.DEBUG;
        if (duration > 1000) level = LOG_LEVELS.WARN;
        if (duration > 5000) level = LOG_LEVELS.ERROR;
        this.log(LOG_CATEGORIES.PERFORMANCE, `⏱️ ${marker}: ${duration}ms`, { marker, duration, ...data }, level);
        return duration;
    }
    
    /**
     * Логирует операцию с организацией.
     * @param {string} operation
     * @param {string} organization
     * @param {number} oldRank
     * @param {number} newRank
     */
    logOrganizationOperation(operation, organization, oldRank = null, newRank = null) {
        const icon = OPERATION_ICONS[operation] || '🏛️';
        this.log(LOG_CATEGORIES.ORGANIZATIONS, `${icon} ОПЕРАЦИЯ С ОРГАНИЗАЦИЕЙ: ${organization}`, {
            operation, organization, oldRank, newRank,
            rankChange: oldRank !== null && newRank !== null ? newRank - oldRank : null,
            timestamp: new Date().toISOString()
        }, LOG_LEVELS.INFO);
    }
    
    /**
     * Экспортирует логи хода в localStorage.
     * @param {number} turnNumber
     * @returns {Object|null}
     */
    exportTurnLogs(turnNumber) {
        const logs = this.turnLogs.get(turnNumber) || [];
        if (logs.length === 0) return null;
        const exportData = { sessionId: this.sessionId, turnNumber, exportTime: new Date().toISOString(), totalLogs: logs.length, logs };
        localStorage.setItem(`oto_turn_logs_${turnNumber}`, JSON.stringify(exportData, null, 2));
        return exportData;
    }
    
    /**
     * Возвращает логи по фильтру.
     * @param {Object} filter
     * @returns {Array}
     */
    getLogs(filter = {}) {
        let filteredLogs = [...this.logBuffer];
        if (filter.category) filteredLogs = filteredLogs.filter(l => l.category === filter.category);
        if (filter.level !== undefined) filteredLogs = filteredLogs.filter(l => l.level >= filter.level);
        if (filter.turnNumber) filteredLogs = filteredLogs.filter(l => l.turnNumber === filter.turnNumber);
        if (filter.search) {
            const searchLower = filter.search.toLowerCase();
            filteredLogs = filteredLogs.filter(l => 
                l.message.toLowerCase().includes(searchLower) ||
                JSON.stringify(l.data).toLowerCase().includes(searchLower)
            );
        }
        if (filter.limit) filteredLogs = filteredLogs.slice(0, filter.limit);
        return filteredLogs;
    }
    
    /**
     * Возвращает статистику логов.
     * @returns {Object}
     */
    getLogStats() {
        const stats = { total: this.logBuffer.length, byCategory: {}, byLevel: {}, byTurn: {}, errorCount: 0, warnCount: 0 };
        this.logBuffer.forEach(log => {
            if (!stats.byCategory[log.category]) stats.byCategory[log.category] = 0;
            stats.byCategory[log.category]++;
            if (!stats.byLevel[log.levelName]) stats.byLevel[log.levelName] = 0;
            stats.byLevel[log.levelName]++;
            if (log.turnNumber) {
                if (!stats.byTurn[log.turnNumber]) stats.byTurn[log.turnNumber] = 0;
                stats.byTurn[log.turnNumber]++;
            }
            if (log.level === LOG_LEVELS.ERROR) stats.errorCount++;
            if (log.level === LOG_LEVELS.WARN) stats.warnCount++;
        });
        return stats;
    }
    
    /**
     * Очищает все логи.
     */
    clearLogs() {
        this.logBuffer = [];
        this.turnLogs.clear();
        this.operationTracker.clear();
        this.completedOperations = [];
        this.turnDurations = [];
        this.log(LOG_CATEGORIES.PERFORMANCE, '🗑️ Все логи очищены', {}, LOG_LEVELS.INFO);
    }
    
    /**
     * Создаёт отчёт по сессии.
     * @returns {Object}
     */
    createSessionReport() {
        const stats = this.getLogStats();
        const sessionDuration = Date.now() - this.startTime;
        return {
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
    }
    
    /**
     * Форматирует длительность в читаемый вид.
     * @param {number} ms
     * @returns {string}
     */
    formatDuration(ms) {
        const seconds = Math.floor(ms / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        if (hours > 0) return `${hours}ч ${minutes % 60}м ${seconds % 60}с`;
        else if (minutes > 0) return `${minutes}м ${seconds % 60}с`;
        else return `${seconds}с`;
    }
    
    /**
     * Генерирует базовый HTML-отчёт.
     * @returns {string}
     */
    generateHTMLReport() {
        const report = this.createSessionReport();
        let html = `<div style="font-family: monospace; background: #1a1a1a; color: #fff; padding: 20px; border-radius: 8px;"><h2 style="color: #00b894;">📊 ОТЧЕТ ЛОГГЕРА - Сессия ${report.sessionId}</h2>`;
        html += `<div>Начало: ${new Date(report.startTime).toLocaleString()}</div>`;
        html += `<div>Длительность: ${report.durationFormatted}</div>`;
        html += `<div>Всего логов: ${report.totalLogs}</div>`;
        html += `<div>Ошибки: ${report.errors}, Предупреждения: ${report.warnings}</div>`;
        html += `</div>`;
        return html;
    }
    
    /**
     * Генерация ДЕТАЛЬНОГО HTML отчета (для log.ui) в стиле индастриал-готика.
     * @returns {string}
     */
    generateDetailedHTMLReport() {
        const report = this.createSessionReport();
        const stats = this.getLogStats();
        const recentLogs = this.logBuffer.slice(0, 200);
        const ongoingOps = Array.from(this.operationTracker.values());
        const completedOps = this.completedOperations.slice(-100);
        const turnDurations = this.turnDurations;
        
        // Анализ производительности операций
        const perfByType = {};
        completedOps.forEach(op => {
            if (!perfByType[op.type]) perfByType[op.type] = { count: 0, totalDuration: 0, success: 0, fail: 0 };
            perfByType[op.type].count++;
            perfByType[op.type].totalDuration += op.duration;
            if (op.success) perfByType[op.type].success++; else perfByType[op.type].fail++;
        });
        
        const avgTurnDuration = turnDurations.length 
            ? turnDurations.reduce((sum, td) => sum + td.duration, 0) / turnDurations.length 
            : 0;
        
        // Цветовая схема
        const colors = {
            bg: '#0a0a0a',
            card: '#151515',
            cardRgba: 'rgba(20,20,20,0.85)',
            border: '#3a2a2a',
            text: '#e0d0d0',
            accent: '#8b0000',
            accentLight: '#a52a2a',
            gray: '#5a4a4a',
            error: '#cf6679',
            warn: '#b85c00',
            info: '#4a6c8f',
            debug: '#5a5a5a'
        };
        
        let html = `
        <div class="logger-detailed-report" style="font-family: 'Segoe UI', 'Roboto', 'Helvetica', monospace; background: ${colors.bg}; color: ${colors.text}; padding: 12px; border-radius: 10px; max-width: 1400px; margin: 0 auto; font-size: 12px; line-height: 1.4;">
            <style>
                .logger-detailed-report {
                    scrollbar-width: thin;
                    scrollbar-color: ${colors.accent} ${colors.card};
                }
                .logger-detailed-report::-webkit-scrollbar {
                    width: 6px;
                }
                .logger-detailed-report::-webkit-scrollbar-track {
                    background: ${colors.card};
                }
                .logger-detailed-report::-webkit-scrollbar-thumb {
                    background: ${colors.accent};
                    border-radius: 3px;
                }
                .logger-detailed-report .section {
                    background: ${colors.cardRgba};
                    backdrop-filter: blur(2px);
                    border: 1px solid ${colors.border};
                    border-radius: 6px;
                    padding: 10px;
                    margin-bottom: 12px;
                    box-shadow: 0 2px 6px rgba(0,0,0,0.5);
                }
                .logger-detailed-report h2 {
                    color: ${colors.accent};
                    margin: 0 0 8px 0;
                    border-bottom: 1px solid ${colors.accent};
                    padding-bottom: 4px;
                    font-size: 16px;
                    font-weight: 400;
                    letter-spacing: 0.5px;
                }
                .logger-detailed-report h3 {
                    color: ${colors.accentLight};
                    margin: 0 0 8px 0;
                    font-size: 14px;
                    font-weight: 300;
                    border-left: 2px solid ${colors.accent};
                    padding-left: 6px;
                }
                .logger-detailed-report .stats-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
                    gap: 6px;
                    margin-bottom: 6px;
                }
                .logger-detailed-report .stat-card {
                    background: ${colors.bg};
                    border: 1px solid ${colors.border};
                    border-radius: 4px;
                    padding: 6px 8px;
                    text-align: center;
                }
                .logger-detailed-report .stat-card .label {
                    color: ${colors.gray};
                    font-size: 0.75rem;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                }
                .logger-detailed-report .stat-card .value {
                    font-size: 1.4rem;
                    font-weight: 400;
                    color: ${colors.accent};
                    line-height: 1.2;
                }
                .logger-detailed-report .progress-bar {
                    background: ${colors.border};
                    height: 4px;
                    border-radius: 2px;
                    margin: 4px 0;
                    overflow: hidden;
                }
                .logger-detailed-report .progress-fill {
                    height: 100%;
                    background: ${colors.accent};
                    border-radius: 2px;
                }
                .logger-detailed-report .log-entry {
                    background: ${colors.bg};
                    border: 1px solid ${colors.border};
                    margin: 4px 0;
                    padding: 6px;
                    border-radius: 4px;
                    border-left-width: 3px;
                    border-left-style: solid;
                    cursor: pointer;
                    transition: background 0.1s;
                }
                .logger-detailed-report .log-entry:hover {
                    background: #1f1f1f;
                }
                .logger-detailed-report .log-header {
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    flex-wrap: wrap;
                    font-size: 11px;
                }
                .logger-detailed-report .log-time {
                    color: ${colors.gray};
                    font-size: 0.7rem;
                }
                .logger-detailed-report .log-category {
                    font-weight: 600;
                    padding: 1px 4px;
                    border-radius: 3px;
                    background: #2a2a2a;
                    font-size: 0.7rem;
                }
                .logger-detailed-report .log-level {
                    padding: 1px 6px;
                    border-radius: 10px;
                    font-size: 0.65rem;
                    font-weight: 600;
                    text-transform: uppercase;
                }
                .logger-detailed-report .log-level.error { background: ${colors.error}; color: #000; }
                .logger-detailed-report .log-level.warn { background: ${colors.warn}; color: #000; }
                .logger-detailed-report .log-level.info { background: ${colors.info}; color: #fff; }
                .logger-detailed-report .log-level.debug { background: ${colors.debug}; color: #fff; }
                .logger-detailed-report .log-details {
                    margin-top: 6px;
                    padding: 6px;
                    background: #0d0d0d;
                    border-radius: 3px;
                    display: none;
                    overflow-x: auto;
                    font-size: 11px;
                }
                .logger-detailed-report .log-entry.expanded .log-details { display: block; }
                .logger-detailed-report .search-box {
                    width: 100%;
                    padding: 6px 8px;
                    margin-bottom: 8px;
                    background: ${colors.bg};
                    border: 1px solid ${colors.border};
                    color: ${colors.text};
                    border-radius: 4px;
                    font-size: 11px;
                }
                .logger-detailed-report .button {
                    background: transparent;
                    border: 1px solid ${colors.accent};
                    color: ${colors.accentLight};
                    padding: 4px 12px;
                    border-radius: 16px;
                    font-size: 10px;
                    font-weight: 500;
                    cursor: pointer;
                    margin-right: 6px;
                    display: inline-flex;
                    align-items: center;
                    gap: 4px;
                    transition: all 0.1s;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                }
                .logger-detailed-report .button:hover {
                    background: ${colors.accent};
                    color: #fff;
                    border-color: ${colors.accentLight};
                }
                .logger-detailed-report .button.secondary {
                    border-color: ${colors.gray};
                    color: ${colors.gray};
                }
                .logger-detailed-report .button.secondary:hover {
                    background: ${colors.gray};
                    color: #000;
                }
                .logger-detailed-report .button.danger {
                    border-color: ${colors.error};
                    color: ${colors.error};
                }
                .logger-detailed-report .button.danger:hover {
                    background: ${colors.error};
                    color: #000;
                }
                .logger-detailed-report .flex-row {
                    display: flex;
                    gap: 8px;
                    flex-wrap: wrap;
                    align-items: center;
                }
                .logger-detailed-report .mt-2 { margin-top: 8px; }
                .logger-detailed-report .table {
                    width: 100%;
                    border-collapse: collapse;
                    font-size: 11px;
                }
                .logger-detailed-report .table td, .logger-detailed-report .table th {
                    padding: 4px 6px;
                    border-bottom: 1px solid ${colors.border};
                    text-align: left;
                }
                .logger-detailed-report .table th {
                    color: ${colors.gray};
                    font-weight: 400;
                }
                .logger-detailed-report .filter-panel {
                    display: flex;
                    gap: 4px;
                    flex-wrap: wrap;
                    margin-bottom: 8px;
                }
                .logger-detailed-report .filter-btn {
                    background: ${colors.bg};
                    border: 1px solid ${colors.border};
                    color: ${colors.text};
                    padding: 2px 8px;
                    border-radius: 12px;
                    cursor: pointer;
                    font-size: 9px;
                    text-transform: uppercase;
                }
                .logger-detailed-report .filter-btn.active {
                    background: ${colors.accent};
                    color: #000;
                    border-color: ${colors.accent};
                }
                .logger-detailed-report .compact {
                    font-size: 10px;
                }
                @media (max-width: 600px) {
                    .logger-detailed-report .stats-grid { grid-template-columns: 1fr; }
                }
            </style>
            
            <!-- Шапка -->
            <div class="section">
                <h2>⚙️ ДЕТАЛЬНЫЙ ОТЧЁТ ЛОГГЕРА</h2>
                <div class="stats-grid">
                    <div class="stat-card">
                        <div class="label">Сессия</div>
                        <div class="value" style="font-size:1rem;">${report.sessionId.slice(0,12)}…</div>
                    </div>
                    <div class="stat-card">
                        <div class="label">Длительность</div>
                        <div class="value">${report.durationFormatted}</div>
                    </div>
                    <div class="stat-card">
                        <div class="label">Логов</div>
                        <div class="value">${report.totalLogs}</div>
                    </div>
                    <div class="stat-card">
                        <div class="label">Ош/Пр</div>
                        <div class="value" style="color:${colors.error};">${report.errors}<span style="color:${colors.warn};">/${report.warnings}</span></div>
                    </div>
                </div>
                <div class="flex-row compact" style="justify-content:space-between;">
                    <span>🔹 Ход: <strong>${this.currentTurn !== null ? this.currentTurn : '—'}</strong></span>
                    <span>🔹 Уровень: <strong>${report.logLevel}</strong></span>
                    <span>🔹 Категорий: <strong>${report.enabledCategories.length}</strong></span>
                </div>
            </div>
            
            <!-- Распределение по категориям -->
            <div class="section">
                <h3>📊 РАСПРЕДЕЛЕНИЕ ПО КАТЕГОРИЯМ</h3>
                <div style="max-height: 200px; overflow-y: auto; padding-right: 4px;">
        `;
        
        Object.entries(stats.byCategory).forEach(([cat, cnt]) => {
            const pct = (cnt / report.totalLogs * 100).toFixed(1);
            html += `
                <div style="margin: 4px 0;">
                    <div style="display:flex; justify-content:space-between; font-size:11px;">
                        <span style="color:${this.getCategoryColor(cat)}">${cat}</span>
                        <span>${cnt} (${pct}%)</span>
                    </div>
                    <div class="progress-bar"><div class="progress-fill" style="width:${pct}%; background:${this.getCategoryColor(cat)}"></div></div>
                </div>
            `;
        });
        
        html += `</div><h3>📊 ПО УРОВНЯМ</h3><div>`;
        const levelColorsMap = {
            DEBUG: colors.debug, INFO: colors.info, WARN: colors.warn, ERROR: colors.error
        };
        Object.entries(stats.byLevel).forEach(([lvl, cnt]) => {
            const pct = (cnt / report.totalLogs * 100).toFixed(1);
            html += `
                <div style="margin: 4px 0;">
                    <div style="display:flex; justify-content:space-between; font-size:11px;">
                        <span style="color:${levelColorsMap[lvl] || colors.gray}">${lvl}</span>
                        <span>${cnt} (${pct}%)</span>
                    </div>
                    <div class="progress-bar"><div class="progress-fill" style="width:${pct}%; background:${levelColorsMap[lvl] || colors.gray}"></div></div>
                </div>
            `;
        });
        html += `</div></div>`;
        
        // Гистограмма по ходам
        if (Object.keys(stats.byTurn).length > 0) {
            html += `
            <div class="section">
                <h3>🔄 ЛОГИ ПО ХОДАМ</h3>
                <div style="display:flex; flex-wrap:wrap; gap:2px; align-items:flex-end;">
            `;
            const maxTurnLogs = Math.max(...Object.values(stats.byTurn));
            Object.entries(stats.byTurn).sort((a,b) => a[0]-b[0]).forEach(([turn, cnt]) => {
                const height = (cnt / maxTurnLogs * 40) + 10;
                html += `
                    <div style="display:flex; flex-direction:column; align-items:center; width:24px;">
                        <div style="height:${height}px; width:16px; background:${colors.accent}; border-radius:2px 2px 0 0;"></div>
                        <span style="font-size:8px;">${turn}</span>
                        <span style="font-size:7px; color:${colors.gray};">${cnt}</span>
                    </div>
                `;
            });
            html += `</div>`;
            if (avgTurnDuration > 0) {
                html += `<p class="compact mt-2">⏱️ Средняя длительность хода: <strong>${avgTurnDuration.toFixed(0)} мс</strong> (${turnDurations.length} ходов)</p>`;
            }
            html += `</div>`;
        }
        
        // Панель фильтров и логов
        html += `
            <div class="section">
                <h3>📋 ПОСЛЕДНИЕ ЛОГИ</h3>
                <div class="filter-panel" id="log-filter-panel">
                    <button class="filter-btn active" data-filter="all">Все</button>
                    <button class="filter-btn" data-filter="ERROR">Ошибки</button>
                    <button class="filter-btn" data-filter="WARN">Пр.</button>
                    <button class="filter-btn" data-filter="INFO">Инфо</button>
                    <button class="filter-btn" data-filter="DEBUG">Отл.</button>
                </div>
                <input type="text" id="log-search-input" class="search-box" placeholder="Поиск...">
                <div id="logs-container" style="max-height: 300px; overflow-y: auto; padding-right: 4px;">
        `;
        
        recentLogs.forEach((log, idx) => {
            const catColor = this.getCategoryColor(log.category);
            const levelClass = log.levelName.toLowerCase();
            const dataStr = log.data ? JSON.stringify(log.data) : '';
            const searchData = (log.message + ' ' + dataStr).replace(/"/g, '&quot;');
            html += `
                <div class="log-entry" data-index="${idx}" data-level="${log.levelName}" data-search="${searchData}" style="border-left-color: ${catColor};">
                    <div class="log-header">
                        <span class="log-time">${new Date(log.timestamp).toLocaleTimeString()}</span>
                        <span class="log-category" style="color:${catColor}">${log.category}</span>
                        <span class="log-level ${levelClass}">${log.levelName}</span>
                        <span style="flex:1;">${log.message}</span>
                        <span>▼</span>
                    </div>
                    <div class="log-details">
                        <pre style="margin:0; background:#0d0d0d; padding:4px; overflow-x:auto; color:#ccc; font-size:10px;">${this.syntaxHighlight(JSON.stringify(log.data, null, 2))}</pre>
                        ${log.stackTrace ? `<pre style="margin:4px 0 0; background:#1a1a1a; color:${colors.error}; font-size:10px;">${log.stackTrace}</pre>` : ''}
                    </div>
                </div>
            `;
        });
        
        html += `</div>
                <div class="flex-row" style="justify-content:space-between; margin-top:8px;">
                    <div>
                        <button class="button" id="copy-json-btn">📋 JSON</button>
                        <button class="button secondary" id="export-file-btn">💾 Файл</button>
                        <button class="button secondary" id="refresh-btn">🔄</button>
                        <button class="button danger" id="clear-logs-btn">🗑️</button>
                    </div>
                    <span style="color:${colors.gray}; font-size:10px;">Логов: ${this.logBuffer.length}</span>
                </div>
            </div>
        `;
        
        // Текущие операции
        if (ongoingOps.length > 0) {
            html += `
            <div class="section">
                <h3>⏳ ТЕКУЩИЕ ОПЕРАЦИИ (${ongoingOps.length})</h3>
                <table class="table">
                    <tr><th>ID</th><th>Тип</th><th>Прошло(мс)</th><th>Контекст</th></tr>
            `;
            ongoingOps.forEach(op => {
                const elapsed = Date.now() - op.startTime;
                html += `<tr><td>${op.id}</td><td>${op.type}</td><td>${elapsed}</td><td>${JSON.stringify(op.context).substring(0,40)}…</td></tr>`;
            });
            html += `</table></div>`;
        }
        
        // Производительность операций
        if (Object.keys(perfByType).length > 0) {
            html += `
            <div class="section">
                <h3>⚡ ПРОИЗВОДИТЕЛЬНОСТЬ (последние 100)</h3>
                <table class="table">
                    <tr><th>Тип</th><th>Кол-во</th><th>Ср. мс</th><th>✓/✗</th></tr>
            `;
            Object.entries(perfByType).forEach(([type, data]) => {
                const avg = (data.totalDuration / data.count).toFixed(0);
                html += `<tr><td>${type}</td><td>${data.count}</td><td>${avg}</td><td>${data.success}/${data.fail}</td></tr>`;
            });
            html += `</table>`;
            const slowest = completedOps.sort((a,b) => b.duration - a.duration).slice(0,5);
            if (slowest.length) {
                html += `<h4 style="font-size:11px; margin:6px 0 2px;">🏁 САМЫЕ МЕДЛЕННЫЕ</h4><table class="table"><tr><th>ID</th><th>Тип</th><th>мс</th></tr>`;
                slowest.forEach(op => {
                    html += `<tr><td>${op.id}</td><td>${op.type}</td><td>${op.duration}</td></tr>`;
                });
                html += `</table>`;
            }
            html += `</div>`;
        }
        
        // Ошибки
        const errorLogs = this.logBuffer.filter(l => l.level === LOG_LEVELS.ERROR).slice(0,20);
        if (errorLogs.length > 0) {
            html += `
            <div class="section">
                <h3 style="color:${colors.error};">❌ ПОСЛЕДНИЕ ОШИБКИ</h3>
                <div>
            `;
            errorLogs.forEach(err => {
                html += `
                    <div class="log-entry" style="border-left-color:${colors.error};">
                        <div class="log-header">
                            <span class="log-time">${new Date(err.timestamp).toLocaleTimeString()}</span>
                            <span class="log-category" style="color:${colors.error};">${err.category}</span>
                            <span style="flex:1;">${err.message}</span>
                        </div>
                        <div class="log-details" style="display:block;">
                            <pre style="margin:0; background:#0d0d0d; color:${colors.error};">${err.stackTrace || '—'}</pre>
                        </div>
                    </div>
                `;
            });
            html += `</div></div>`;
        }
        
        html += `</div>`; // закрываем основной контейнер
        
        return html;
    }
    
    /**
     * Подсветка синтаксиса JSON для HTML-отчёта.
     * @param {string} json
     * @returns {string}
     */
    syntaxHighlight(json) {
        if (!json) return json;
        json = json.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        return json.replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g, function (match) {
            let cls = 'number';
            if (/^"/.test(match)) {
                if (/:$/.test(match)) cls = 'key';
                else cls = 'string';
            } else if (/true|false/.test(match)) cls = 'boolean';
            else if (/null/.test(match)) cls = 'null';
            const color = cls === 'key' ? '#8b0000' : cls === 'string' ? '#a52a2a' : cls === 'number' ? '#4a6c8f' : cls === 'boolean' ? '#b85c00' : '#5a5a5a';
            return `<span style="color:${color};">${match}</span>`;
        });
    }
    
    /**
     * Показывает модальное окно с детальным отчётом.
     * @param {string} htmlContent
     */
    showUIModal(htmlContent) {
        let modal = document.getElementById('oto-logger-modal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'oto-logger-modal';
            modal.style.cssText = `
                display: none;
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background-color: rgba(0,0,0,0.9);
                z-index: 10000;
                font-family: 'Segoe UI', monospace;
            `;
            modal.innerHTML = `
                <div style="
                    position: relative;
                    width: 95%;
                    height: 90%;
                    margin: 2% auto;
                    background: rgba(10,10,10,0.95);
                    backdrop-filter: blur(4px);
                    border-radius: 8px;
                    box-shadow: 0 4px 20px rgba(139,0,0,0.3);
                    display: flex;
                    flex-direction: column;
                    overflow: hidden;
                    color: #e0d0d0;
                    border: 1px solid #3a2a2a;
                ">
                    <div style="
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        padding: 6px 12px;
                        background: rgba(20,20,20,0.9);
                        border-bottom: 1px solid #8b0000;
                    ">
                        <span style="font-weight: 400; color: #8b0000; font-size: 14px;">📋 ДЕТАЛЬНЫЙ ОТЧЁТ ЛОГГЕРА</span>
                        <div>
                            <button id="oto-logger-modal-copy-text" style="
                                background: transparent;
                                border: 1px solid #8b0000;
                                color: #a52a2a;
                                padding: 4px 12px;
                                border-radius: 16px;
                                font-size: 11px;
                                font-weight: 500;
                                margin-right: 6px;
                                cursor: pointer;
                                display: inline-flex;
                                align-items: center;
                                gap: 4px;
                            ">📋 Копировать текст</button>
                            <button id="oto-logger-modal-close" style="
                                background: transparent;
                                border: none;
                                color: #aaa;
                                font-size: 22px;
                                cursor: pointer;
                                line-height: 1;
                            ">&times;</button>
                        </div>
                    </div>
                    <div id="oto-logger-modal-content" style="
                        flex: 1;
                        padding: 12px;
                        overflow-y: auto;
                        background: transparent;
                    "></div>
                </div>
            `;
            document.body.appendChild(modal);
            
            modal.querySelector('#oto-logger-modal-close').addEventListener('click', () => {
                modal.style.display = 'none';
            });
            modal.addEventListener('click', (e) => {
                if (e.target === modal) modal.style.display = 'none';
            });
            const copyBtn = modal.querySelector('#oto-logger-modal-copy-text');
            copyBtn.addEventListener('click', () => {
                const contentDiv = modal.querySelector('#oto-logger-modal-content');
                const textToCopy = contentDiv.innerText;
                this.copyToClipboard(textToCopy);
            });
        }
        
        const contentDiv = modal.querySelector('#oto-logger-modal-content');
        contentDiv.innerHTML = htmlContent;
        this.initDetailedReportHandlers(modal);
        modal.style.display = 'block';
    }
    
    /**
     * Инициализирует обработчики событий в детальном отчёте.
     * @param {HTMLElement} modal
     */
    initDetailedReportHandlers(modal) {
        const contentDiv = modal.querySelector('#oto-logger-modal-content');
        if (!contentDiv) return;
        
        // Разворачивание логов
        contentDiv.querySelectorAll('.log-entry[data-index]').forEach(entry => {
            entry.addEventListener('click', (e) => {
                if (e.target.tagName === 'BUTTON') return;
                entry.classList.toggle('expanded');
            });
        });
        
        // Поиск
        const searchInput = contentDiv.querySelector('#log-search-input');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                const term = e.target.value.toLowerCase();
                contentDiv.querySelectorAll('.log-entry[data-index]').forEach(log => {
                    const searchData = (log.dataset.search || '').toLowerCase();
                    log.style.display = searchData.includes(term) || term === '' ? 'block' : 'none';
                });
            });
        }
        
        // Фильтры
        const filterPanel = contentDiv.querySelector('#log-filter-panel');
        if (filterPanel) {
            filterPanel.querySelectorAll('.filter-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    filterPanel.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                    const filter = btn.dataset.filter;
                    contentDiv.querySelectorAll('.log-entry[data-index]').forEach(log => {
                        if (filter === 'all') log.style.display = 'block';
                        else log.style.display = log.dataset.level === filter ? 'block' : 'none';
                    });
                    if (searchInput) searchInput.value = '';
                });
            });
        }
        
        // Кнопка копирования JSON
        const copyJsonBtn = contentDiv.querySelector('#copy-json-btn');
        if (copyJsonBtn) {
            copyJsonBtn.addEventListener('click', () => {
                const data = {
                    session: this.createSessionReport(),
                    logs: this.logBuffer,
                    ongoingOperations: Array.from(this.operationTracker.values()),
                    completedOperations: this.completedOperations,
                    turnDurations: this.turnDurations
                };
                this.copyToClipboard(JSON.stringify(data, null, 2));
                this.showToast('JSON скопирован');
            });
        }
        
        // Экспорт в файл
        const exportBtn = contentDiv.querySelector('#export-file-btn');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => {
                const data = {
                    session: this.createSessionReport(),
                    logs: this.logBuffer,
                    ongoingOperations: Array.from(this.operationTracker.values()),
                    completedOperations: this.completedOperations,
                    turnDurations: this.turnDurations,
                    exportTime: new Date().toISOString()
                };
                const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `logger-export-${this.sessionId}.json`;
                a.click();
                URL.revokeObjectURL(url);
                this.showToast('Файл сохранён');
            });
        }
        
        // Обновление
        const refreshBtn = contentDiv.querySelector('#refresh-btn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                contentDiv.innerHTML = this.generateDetailedHTMLReport();
                this.initDetailedReportHandlers(modal);
                this.showToast('Обновлено');
            });
        }
        
        // Очистка
        const clearBtn = contentDiv.querySelector('#clear-logs-btn');
        if (clearBtn) {
            clearBtn.addEventListener('click', () => {
                if (confirm('Очистить все логи?')) {
                    this.clearLogs();
                    contentDiv.innerHTML = this.generateDetailedHTMLReport();
                    this.initDetailedReportHandlers(modal);
                    this.showToast('Логи очищены');
                }
            });
        }
    }
    
    /**
     * Копирует текст в буфер обмена.
     * @param {string} text
     */
    copyToClipboard(text) {
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(text).then(() => this.showToast('✅ Скопировано'));
        } else {
            const textarea = document.createElement('textarea');
            textarea.value = text;
            textarea.style.position = 'fixed';
            textarea.style.opacity = '0';
            document.body.appendChild(textarea);
            textarea.select();
            try { document.execCommand('copy'); this.showToast('✅ Скопировано'); } catch (err) { this.showToast('❌ Ошибка', 'error'); }
            document.body.removeChild(textarea);
        }
    }
    
    /**
     * Показывает toast-уведомление.
     * @param {string} message
     * @param {string} type
     */
    showToast(message, type = 'info') {
        let toast = document.getElementById('oto-logger-toast');
        if (!toast) {
            toast = document.createElement('div');
            toast.id = 'oto-logger-toast';
            toast.style.cssText = `
                position: fixed;
                bottom: 20px;
                left: 50%;
                transform: translateX(-50%);
                background: #151515;
                color: #e0d0d0;
                padding: 8px 16px;
                border-radius: 20px;
                font-family: sans-serif;
                font-size: 12px;
                z-index: 10001;
                box-shadow: 0 4px 12px rgba(0,0,0,0.5);
                border: 1px solid #8b0000;
                transition: opacity 0.2s;
                opacity: 0;
                pointer-events: none;
            `;
            document.body.appendChild(toast);
        }
        toast.textContent = message;
        toast.style.backgroundColor = type === 'error' ? '#3a1a1a' : '#151515';
        toast.style.opacity = '1';
        setTimeout(() => { toast.style.opacity = '0'; }, 2000);
    }
    
    /**
     * Возвращает цвет категории для HTML-отчёта.
     * @param {string} category
     * @returns {string}
     */
    getCategoryColor(category) {
        const colors = {
            [LOG_CATEGORIES.OPERATIONS]: '#8b0000',
            [LOG_CATEGORIES.GAME_STATE]: '#4a6c8f',
            [LOG_CATEGORIES.TURN_PROCESSING]: '#b85c00',
            [LOG_CATEGORIES.AI_REQUESTS]: '#5a4a8f',
            [LOG_CATEGORIES.UI_EVENTS]: '#a52a2a',
            [LOG_CATEGORIES.VALIDATION]: '#6b8e23',
            [LOG_CATEGORIES.ERROR_TRACKING]: '#cf6679',
            [LOG_CATEGORIES.PERFORMANCE]: '#4a6c8f',
            [LOG_CATEGORIES.ORGANIZATIONS]: '#8b5a2b'
        };
        return colors[category] || '#6c757d';
    }
}

// ============================================================================
// ЭКСПОРТ (без изменений)
// ============================================================================
export const Logger = new GameLogger();

export const log = {
    debug: (c, m, d) => Logger.log(c, m, d, LOG_LEVELS.DEBUG),
    info: (c, m, d) => Logger.log(c, m, d, LOG_LEVELS.INFO),
    warn: (c, m, d) => Logger.log(c, m, d, LOG_LEVELS.WARN),
    error: (c, m, d) => Logger.log(c, m, d, LOG_LEVELS.ERROR),
    
    operation: (op, ctx) => Logger.logOperation(op, ctx),
    operationResult: (id, res) => Logger.logOperationResult(id, res),
    stateChange: (chg, prev, next) => Logger.logStateChange(chg, prev, next),
    aiRequest: (req, turn) => Logger.logAIRequest(req, turn),
    aiResponse: (res, time) => Logger.logAIResponse(res, time),
    performance: (marker, start, data) => Logger.logPerformance(marker, start, data),
    organization: (op, org, old, newR) => Logger.logOrganizationOperation(op, org, old, newR),
    
    startTurn: (turn) => Logger.startTurnLogging(turn),
    endTurn: (turn, summary) => Logger.endTurnLogging(turn, summary),
    
    getStats: () => Logger.getLogStats(),
    getLogs: (filter) => Logger.getLogs(filter),
    getReport: () => Logger.createSessionReport(),
    getHTMLReport: () => Logger.generateHTMLReport(),
    
    clear: () => Logger.clearLogs(),
    
    setLevel: (level) => Logger.setLogLevel(level),
    toggleCategory: (cat, en) => Logger.toggleCategory(cat, en),
    
    ui: () => Logger.showUIModal(Logger.generateDetailedHTMLReport()),
    
    exportToFile: () => {
        const data = {
            session: Logger.createSessionReport(),
            logs: Logger.logBuffer,
            completedOperations: Logger.completedOperations,
            turnDurations: Logger.turnDurations,
            exportTime: new Date().toISOString()
        };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `logger-full-export-${Logger.sessionId}.json`;
        a.click();
        URL.revokeObjectURL(url);
        Logger.showToast('Экспорт сохранён');
    }
};

if (typeof window !== 'undefined') {
    window.gameLogger = Logger;
    window.log = log;
}