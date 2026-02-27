/**
 * СЕРВИС ОПЕРАЦИЙ НАД GAME_ITEM
 * ===============================================================
 * 
 * УПРОЩЁННАЯ И НАДЁЖНАЯ ВЕРСИЯ
 * - Валидация не блокирует выполнение
 * - Автоматическое приведение типов
 * - Стекание для buff/debuff/bless/curse
 * - Ошибки логируются, но не прерывают цепочку
 * ===============================================================
 */

'use strict';

import { CONFIG } from './1-config.js';
import { Utils } from './2-utils.js';
import { Logger, log, LOG_CATEGORIES, LOG_LEVELS } from './logger.js';

// Константы для типов game_item
export const GAME_ITEM_TYPES = {
    STAT: 'stat',
    SKILL: 'skill',
    INVENTORY: 'inventory',
    RELATIONS: 'relations',
    BLESS: 'bless',
    CURSE: 'curse',
    BUFF: 'buff',
    DEBUFF: 'debuff',
    PROGRESS: 'progress',
    PERSONALITY: 'personality',
    ORGANIZATION_RANK: 'organization_rank',
    ORGANIZATION_HIERARCHY: 'organization_rank_hierarchy'
};

// Константы операций
export const OPERATIONS = {
    ADD: 'ADD',
    REMOVE: 'REMOVE',
    MODIFY: 'MODIFY',
    SET: 'SET'
};

// Типы, поддерживающие числовые значения и MODIFY
const NUMERIC_TYPES = ['stat', 'relations', 'progress', 'organization_rank', 'buff', 'debuff'];

// Типы, поддерживающие стекование
const STACKABLE_TYPES = ['buff', 'debuff', 'bless', 'curse'];

// Стандартные статы (нельзя создавать произвольные)
const VALID_STATS = ['will', 'sanity', 'stealth', 'influence'];

class OperationsService {
    constructor() {
        this.DEBUG_MODE = localStorage.getItem('oto_debug_operations') === 'true';
        this.operationLog = [];
        this.maxLogSize = 100;
        this.errorBuffer = []; // Буфер для накопления ошибок
    }
    
    /**
     * ОСНОВНОЙ МЕТОД: Применяет операцию к состоянию
     * @param {Object} op - Операция {operation, id, value?, delta?, duration?, description?}
     * @param {Array} targetState - Массив game_items (изменяется на месте)
     * @returns {Object} Результат {success, action, ...}
     */
    applyOperation(op, targetState) {
        const operationId = log.operation(op, {
            targetStateLength: targetState?.length,
            debug: this.DEBUG_MODE
        });
        
        if (this.DEBUG_MODE) {
            log.debug(LOG_CATEGORIES.OPERATIONS, `🔧 Операция ${op.operation} над ${op.id}`, {
                before: JSON.parse(JSON.stringify(targetState?.find(item => item.id === op.id))),
                operation: op
            });
        }
        
        // 1. Нормализация
        const normalized = this._normalize(op);
        if (!normalized) {
            const errorDetails = {
                operation: op,
                timestamp: new Date().toISOString()
            };
            this._logError('Операция не прошла нормализацию', errorDetails);
            const result = {
                success: false,
                action: 'invalid',
                error: 'Некорректная структура операции',
                details: errorDetails
            };
            log.operationResult(operationId, result);
            return result;
        }
        
        const { operation, id, value, delta, duration, description } = normalized;
        const [type, name] = id.split(':');
        const existingIndex = targetState.findIndex(item => item.id === id);
        const existing = existingIndex >= 0 ? targetState[existingIndex] : null;
        
        let result;
        try {
            switch (operation) {
                case OPERATIONS.ADD:
                    result = this._applyAdd(id, type, value, duration, description, existing, targetState, existingIndex);
                    break;
                case OPERATIONS.REMOVE:
                    result = this._applyRemove(id, type, existing, targetState, existingIndex);
                    break;
                case OPERATIONS.MODIFY:
                    result = this._applyModify(id, type, delta, description, existing, targetState, existingIndex);
                    break;
                case OPERATIONS.SET:
                    result = this._applySet(id, value, duration, description, existing, targetState, existingIndex);
                    break;
                default:
                    this._logError(`Неизвестная операция ${operation}`, { op });
                    result = { success: false, action: 'unknown', error: `Неизвестная операция: ${operation}` };
            }
        } catch (error) {
            this._logError(`Исключение при выполнении ${operation} для ${id}`, { op, error });
            result = { success: false, action: 'exception', error: error.message };
        }
        
        log.operationResult(operationId, result);
        if (this.DEBUG_MODE) {
            log.debug(LOG_CATEGORIES.OPERATIONS, 'Результат операции', {
                result,
                after: JSON.parse(JSON.stringify(targetState?.find(item => item.id === op.id)))
            });
        }
        this._logOperation(op, result);
        return result;
    }
    
    /**
     * Применяет массив операций к состоянию с обработкой ошибок
     * @param {Array} operations - Массив операций
     * @param {Array} targetState - Целевое состояние
     * @returns {Object} Сводный результат с ошибками
     */
    applyOperations(operations, targetState) {
        if (!Array.isArray(operations) || !targetState) {
            const error = 'Неверные параметры: operations должен быть массивом, targetState должен быть определен';
            this._logError(error, { operations, targetState });
            return {
                success: false,
                applied: 0,
                total: 0,
                results: [],
                errors: [error]
            };
        }
        
        log.info(LOG_CATEGORIES.OPERATIONS, '📦 Применение массива операций', {
            count: operations.length,
            targetStateLength: targetState.length
        });
        
        const results = [];
        const errors = [];
        let appliedCount = 0;
        
        // Очищаем буфер ошибок перед новой партией операций
        this.errorBuffer = [];
        
        operations.forEach((op, index) => {
            const result = this.applyOperation(op, targetState);
            results.push(result);
            if (result.success) {
                appliedCount++;
            } else {
                const errorMessage = `Операция ${index + 1}: ${result.error || 'Неизвестная ошибка'}`;
                errors.push({
                    index: index,
                    operation: op,
                    error: errorMessage,
                    details: result.details
                });
                this.errorBuffer.push({
                    operation: op,
                    error: result.error,
                    details: result.details,
                    position: `позиция ${index + 1} из ${operations.length}`
                });
            }
        });
        
        const summary = {
            success: appliedCount > 0,
            applied: appliedCount,
            total: operations.length,
            results,
            errors: errors.map(e => e.error)
        };
        
        if (errors.length > 0) {
            log.warn(LOG_CATEGORIES.OPERATIONS, `⚠️ Применение операций: ${appliedCount}/${operations.length} успешно, ${errors.length} с ошибками`, summary);
        } else {
            log.info(LOG_CATEGORIES.OPERATIONS, `✅ Применение операций: ${appliedCount}/${operations.length} успешно`, summary);
        }
        
        return summary;
    }
    
    /**
     * Возвращает накопленные ошибки и очищает буфер
     */
    getAndClearErrors() {
        const errors = [...this.errorBuffer];
        this.errorBuffer = [];
        if (errors.length > 0) {
            log.debug(LOG_CATEGORIES.ERROR_TRACKING, 'Очистка буфера ошибок операций', { errorsCount: errors.length });
        }
        return errors;
    }
    
    // ========== ВНУТРЕННИЕ МЕТОДЫ НОРМАЛИЗАЦИИ ==========
    
    _normalize(op) {
        if (!op || typeof op !== 'object') return null;
        if (!op.operation || !op.id) return null;
        
        const operation = String(op.operation).toUpperCase().trim();
        if (!Object.values(OPERATIONS).includes(operation)) return null;
        
        const id = String(op.id).trim();
        if (!id.includes(':')) return null;
        
        const normalized = { operation, id };
        
        // value (может быть любым)
        if (op.value !== undefined) normalized.value = op.value;
        
        // delta – приводим к числу
        if (op.delta !== undefined) {
            normalized.delta = Number(op.delta) || 0;
        }
        
        // duration – целое положительное
        if (op.duration !== undefined) {
            normalized.duration = Math.max(1, Math.min(999, Number(op.duration) || 1));
        }
        
        // description – строка
        normalized.description = op.description ? String(op.description).trim() : '';
        
        // Для ADD и SET без value подставляем дефолтное
        if ((operation === OPERATIONS.ADD || operation === OPERATIONS.SET) && normalized.value === undefined) {
            normalized.value = this._getDefaultValue(id.split(':')[0], id.split(':')[1]);
        }
        
        // Для MODIFY без delta ставим 0 (ничего не меняет)
        if (operation === OPERATIONS.MODIFY && normalized.delta === undefined) {
            normalized.delta = 0;
        }
        
        // Для buff/debuff без duration ставим 1
        const type = id.split(':')[0];
        if ((type === GAME_ITEM_TYPES.BUFF || type === GAME_ITEM_TYPES.DEBUFF) && normalized.duration === undefined) {
            log.warn(LOG_CATEGORIES.OPERATIONS, `У операции ${id} нет duration, устанавливаем 1`);
            normalized.duration = 1;
        }
        
        return normalized;
    }
    
    _getDefaultValue(type, name) {
        switch (type) {
            case GAME_ITEM_TYPES.STAT:
                return 50;
            case GAME_ITEM_TYPES.RELATIONS:
                return 0;
            case GAME_ITEM_TYPES.PROGRESS:
                return 0;
            case GAME_ITEM_TYPES.ORGANIZATION_RANK:
                return 0;
            case GAME_ITEM_TYPES.BUFF:
            case GAME_ITEM_TYPES.DEBUFF:
                return 0;
            case GAME_ITEM_TYPES.SKILL:
            case GAME_ITEM_TYPES.INVENTORY:
            case GAME_ITEM_TYPES.BLESS:
            case GAME_ITEM_TYPES.CURSE:
                return name || 'эффект';
            case GAME_ITEM_TYPES.PERSONALITY:
                return '';
            default:
                return null;
        }
    }
    
    // ========== РЕАЛИЗАЦИЯ ОПЕРАЦИЙ ==========
    
    _applyAdd(id, type, value, duration, description, existing, state, index) {
        if (existing) {
            // Для стековых типов увеличиваем счётчик
            if (STACKABLE_TYPES.includes(type)) {
                return this._stackItem(existing, state, index, value, duration, description);
            }
            // Для остальных игнорируем (не дублируем)
            return { success: true, action: 'ignored', message: 'уже существует' };
        }
        
        const newItem = { id, value, description };
        if (duration !== undefined && [GAME_ITEM_TYPES.BUFF, GAME_ITEM_TYPES.DEBUFF].includes(type)) {
            newItem.duration = duration;
            newItem.originalDuration = duration;
        }
        state.push(newItem);
        return { success: true, action: 'added', newValue: value };
    }
    
    _applyRemove(id, type, existing, state, index) {
        if (!existing) return { success: false, action: 'not_found', error: 'не найдено' };
        if (type === GAME_ITEM_TYPES.STAT || type === GAME_ITEM_TYPES.SKILL) {
            return { success: false, action: 'protected', error: `${type} нельзя удалить` };
        }
        
        // Для стековых уменьшаем счётчик
        if (STACKABLE_TYPES.includes(type) && existing.stack && existing.stack > 1) {
            existing.stack -= 1;
            if (existing.stack === 1) delete existing.stack;
            this._updateStackDescription(existing);
            return { success: true, action: 'destacked', stack: existing.stack };
        }
        
        state.splice(index, 1);
        return { success: true, action: 'removed' };
    }
    
    _applyModify(id, type, delta, description, existing, state, index) {
        if (!NUMERIC_TYPES.includes(type)) {
            return { success: false, action: 'invalid_type', error: `MODIFY не поддерживается для ${type}` };
        }
        
        let oldValue, newValue;
        if (!existing) {
            oldValue = this._getDefaultValue(type, id.split(':')[1]);
            newValue = (typeof oldValue === 'number' ? oldValue : 0) + delta;
        } else {
            oldValue = existing.value;
            newValue = (typeof oldValue === 'number' ? oldValue : 0) + delta;
        }
        
        // Клипинг
        if (type === GAME_ITEM_TYPES.STAT) newValue = Math.max(0, Math.min(100, newValue));
        else if (type === GAME_ITEM_TYPES.RELATIONS) newValue = Math.max(-100, Math.min(100, newValue));
        else if (type === GAME_ITEM_TYPES.PROGRESS) newValue = Math.max(0, Math.min(100, newValue));
        
        if (!existing) {
            state.push({ id, value: newValue, description: description || '' });
        } else {
            existing.value = newValue;
            if (description) existing.description = description;
        }
        
        return { success: true, action: 'modified', oldValue, newValue, delta };
    }
    
    _applySet(id, value, duration, description, existing, state, index) {
        if (!existing) {
            const newItem = { id, value, description };
            if (duration !== undefined) newItem.duration = duration;
            state.push(newItem);
            return { success: true, action: 'added' };
        }
        
        existing.value = value;
        if (description !== undefined) existing.description = description;
        if (duration !== undefined) existing.duration = duration;
        return { success: true, action: 'set' };
    }
    
    _stackItem(existing, state, index, value, duration, description) {
        // Для числовых значений суммируем
        if (typeof value === 'number' && typeof existing.value === 'number') {
            existing.value += value;
        } else {
            // Для нечисловых увеличиваем счётчик стеков
            existing.stack = (existing.stack || 1) + 1;
        }
        
        // Обновляем длительность (берём максимум)
        if (duration !== undefined) {
            existing.duration = Math.max(existing.duration || 0, duration);
        }
        
        this._updateStackDescription(existing);
        return { success: true, action: 'stacked', stack: existing.stack, value: existing.value };
    }
    
    _updateStackDescription(item) {
        if (item.stack && item.description) {
            // Убираем старый счётчик (xN) в конце
            item.description = item.description.replace(/\s*\(x\d+\)$/, '');
            item.description += ` (x${item.stack})`;
        }
    }
    
    // ========== ВСПОМОГАТЕЛЬНЫЕ МЕТОДЫ ДЛЯ ИГРОВОГО ЦИКЛА ==========
    
    /**
     * Уменьшает длительность временных эффектов и удаляет истекшие
     */
    decreaseBuffDurations(targetState) {
        if (!Array.isArray(targetState)) return { processed: 0, removed: 0 };
        let processed = 0,
            removed = 0;
        for (let i = targetState.length - 1; i >= 0; i--) {
            const item = targetState[i];
            const [type] = item.id.split(':');
            if ((type === GAME_ITEM_TYPES.BUFF || type === GAME_ITEM_TYPES.DEBUFF) && item.duration > 0) {
                processed++;
                item.duration--;
                if (item.duration <= 0) {
                    if (item.stack && item.stack > 1) {
                        item.stack--;
                        item.duration = item.originalDuration || 1;
                        this._updateStackDescription(item);
                    } else {
                        targetState.splice(i, 1);
                        removed++;
                    }
                }
            }
        }
        return { processed, removed };
    }
    
    /**
     * Вычисляет изменения между старым и новым состоянием (только для статов)
     */
    calculateChanges(oldState, newState) {
        const changes = { stats: {} };
        const oldMap = new Map(oldState.map(i => [i.id, i]));
        const newMap = new Map(newState.map(i => [i.id, i]));
        
        for (let [id, oldItem] of oldMap) {
            const newItem = newMap.get(id);
            if (newItem && oldItem.value !== newItem.value && id.startsWith('stat:')) {
                changes.stats[id] = {
                    old: oldItem.value,
                    new: newItem.value,
                    delta: newItem.value - oldItem.value
                };
            }
        }
        return changes;
    }
    
    /**
     * Создает расчетное состояние с уже примененными изменениями от действий
     */
    calculateStateForAI(originalState, actionResults) {
        const calculatedState = JSON.parse(JSON.stringify(originalState));
        this.decreaseBuffDurations(calculatedState);
        actionResults.forEach(result => {
            if (result.operations && Array.isArray(result.operations)) {
                this.applyOperations(result.operations, calculatedState);
            }
        });
        return calculatedState;
    }
    
    // ========== ЛОГИРОВАНИЕ ==========
    
    _logOperation(operation, result) {
        const logEntry = {
            timestamp: new Date().toISOString(),
            operation: operation.operation,
            id: operation.id,
            result: result.action,
            success: result.success,
            details: result.message,
            error: result.error
        };
        this.operationLog.unshift(logEntry);
        if (this.operationLog.length > this.maxLogSize) {
            this.operationLog = this.operationLog.slice(0, this.maxLogSize);
        }
        if (this.DEBUG_MODE) {
            localStorage.setItem('oto_operations_log', JSON.stringify(this.operationLog));
        }
    }
    
    _logError(msg, details) {
        log.error(LOG_CATEGORIES.OPERATIONS, msg, details);
        this.errorBuffer.push({ message: msg, details, timestamp: new Date().toISOString() });
    }
    
    // ========== ПУБЛИЧНЫЕ МЕТОДЫ ДЛЯ ОТЛАДКИ ==========
    
    setDebugMode(enabled) {
        this.DEBUG_MODE = enabled;
        localStorage.setItem('oto_debug_operations', enabled.toString());
        log.info(LOG_CATEGORIES.OPERATIONS, `🔧 Режим отладки операций: ${enabled ? 'ВКЛ' : 'ВЫКЛ'}`);
    }
    
    getOperationLog(limit = 20) {
        return this.operationLog.slice(0, limit);
    }
    
    getErrorLog(limit = 20) {
        const errorLog = JSON.parse(localStorage.getItem('oto_operations_errors') || '[]');
        return errorLog.slice(0, limit);
    }
    
    clearLogs() {
        this.operationLog = [];
        this.errorBuffer = [];
        localStorage.removeItem('oto_operations_log');
        localStorage.removeItem('oto_operations_errors');
        log.info(LOG_CATEGORIES.OPERATIONS, '🗑️ Журналы операций и ошибок очищены');
    }
    
    generateReport() {
        const report = {
            totalOperations: this.operationLog.length,
            byOperation: {},
            byType: {},
            successRate: 0,
            recentErrors: this.getErrorLog(10)
        };
        let successCount = 0;
        this.operationLog.forEach(entry => {
            if (!report.byOperation[entry.operation]) report.byOperation[entry.operation] = 0;
            report.byOperation[entry.operation]++;
            const [type] = entry.id.split(':');
            if (!report.byType[type]) report.byType[type] = 0;
            report.byType[type]++;
            if (entry.success) successCount++;
        });
        report.successRate = this.operationLog.length > 0 ? Math.round((successCount / this.operationLog.length) * 100) : 0;
        log.debug(LOG_CATEGORIES.PERFORMANCE, '📈 Отчет OperationsService', report);
        return report;
    }
}

// Создаем и экспортируем singleton
export const OperationsServiceInstance = new OperationsService();

// Экспорт констант для использования в других модулях
export { VALID_STATS, STACKABLE_TYPES };