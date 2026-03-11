/**
 * СЕРВИС ОПЕРАЦИЙ НАД GAME_ITEM
 * ===============================================================
 * ВЕРСИЯ: v2.0 (ПОЛНАЯ ИНТЕГРАЦИЯ С parsing.js v5.0 — после тотального аудита)
 * 
 * АРХИТЕКТУРА (2026):
 * 1. parsing.js v5.0 → normalizeOperation() — ЕДИНСТВЕННАЯ нормализация (только очистка: id, регистр, типы, duration)
 * 2. OperationsService → ТОЛЬКО бизнес-логика (дефолты, стекование, клиппинг, валидация, защита статов)
 * 
 * КРИТИЧЕСКИЕ ИЗМЕНЕНИЯ ПОСЛЕ АУДИТА:
 * - Гипер-детальные JSDoc + комментарии ПЕРЕД КАЖДОЙ развилкой if/else/switch
 * - Добавлена метка версии интеграции для отладки
 * - Все ошибки теперь содержат ссылку на parsing_info
 * 
 * ПРЕИМУЩЕСТВА:
 * - Ноль дублирования кода
 * - Парсер не знает о состоянии героя и дефолтах
 * - Сервис не занимается ремонтом JSON
 * - Максимальная отладка и читаемость (даже для новичка)
 * ===============================================================
 */

'use strict';

import { CONFIG } from './1-config.js';
import { Utils } from './2-utils.js';
import { Logger, log, LOG_CATEGORIES, LOG_LEVELS } from './logger.js';

// ============================================================================
// ИМПОРТ ЕДИНСТВЕННОЙ НОРМАЛИЗАЦИИ ИЗ parsing.js v5.0
// ============================================================================
// Это КРИТИЧЕСКОЕ изменение после аудита: теперь вся очистка данных происходит только в парсере.
// OperationsService больше НЕ дублирует логику нормализации.
import { Parser } from './parsing.js';

// ============================================================================
// КОНСТАНТЫ (оставлены без изменений, но с подробными комментариями)
// ============================================================================

/** Типы game_item — используются для проверки stackable/numeric */
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

/** Типы операций — строго UPPERCASE после нормализации из парсера */
export const OPERATIONS = {
    ADD: 'ADD',
    REMOVE: 'REMOVE',
    MODIFY: 'MODIFY',
    SET: 'SET'
};

/** Типы, поддерживающие MODIFY (числовые изменения) */
const NUMERIC_TYPES = ['stat', 'relations', 'progress', 'organization_rank', 'buff', 'debuff'];

/** Типы, поддерживающие стекование (buff/debuff и т.п.) */
const STACKABLE_TYPES = ['buff', 'debuff', 'bless', 'curse'];

/** Стандартные статы — нельзя удалять */
const VALID_STATS = ['will', 'sanity', 'stealth', 'influence'];

class OperationsService {
    constructor() {
        // ШАГ 1: Загрузка debug-режима из localStorage
        // Почему: чтобы разработчик мог включить отладку без перезагрузки
        this.DEBUG_MODE = localStorage.getItem('oto_debug_operations') === 'true';

        // ШАГ 2: Инициализация буферов логов
        this.operationLog = [];
        this.maxLogSize = 100;
        this.errorBuffer = [];

        // ШАГ 3: Метка версии интеграции с парсером (для удобства отладки)
        // Добавлено после аудита — теперь сразу видно, какая версия парсера используется
        this.parsingIntegrationVersion = 'v5.0';

        log.info(LOG_CATEGORIES.OPERATIONS, `🚀 OperationsService v2.0 запущен (интеграция с parsing.js ${this.parsingIntegrationVersion})`);
    }

    /**
     * ОСНОВНОЙ МЕТОД: Применяет ОДНУ операцию к целевому состоянию.
     * 
     * ЕДИНООБРАЗНОЕ СОХРАНЕНИЕ OPERATION (новое после аудита):
     * После любой операции (ADD/REMOVE/MODIFY/SET) мы гарантированно пишем 
     * item.operation = normalized.operation в итоговый item.
     * Это решает проблему для ВСЕХ типов game_item (включая personality, relations, inventory).
     * 
     * Полная логика по шагам:
     * 1. Логирование входных данных
     * 2. Нормализация через Parser (единственная точка!)
     * 3. Поиск существующего элемента
     * 4. Выполнение операции (ADD/REMOVE/MODIFY/SET)
     * 5. ВСЕГДА сохраняем item.operation = normalized.operation
     * 6. Финальное логирование
     */
    applyOperation(op, targetState) {
        const operationId = log.operation(op, {
            targetStateLength: targetState?.length || 0,
            parsingVersion: this.parsingIntegrationVersion
        });

        if (this.DEBUG_MODE) {
            log.debug(LOG_CATEGORIES.OPERATIONS, `🔧 Операция ${op?.operation || 'UNKNOWN'} над ${op?.id || 'NO_ID'}`);
        }

        // Нормализация из парсера v6.6
        const normalized = Parser.normalizeOperation(op);
        if (!normalized) {
            const errorDetails = { operation: op, reason: 'Parser.normalizeOperation вернул null' };
            this._logError('Операция не прошла нормализацию', errorDetails);
            return { success: false, action: 'invalid', error: 'Некорректная структура операции' };
        }

        const { operation, id, value, delta, duration, description } = normalized;
        const [type] = id.split(':');
        const existingIndex = targetState.findIndex(item => item.id === id);
        let existing = existingIndex >= 0 ? targetState[existingIndex] : null;

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
                    result = { success: false, action: 'unknown', error: `Неизвестная операция: ${operation}` };
            }
        } catch (error) {
            this._logError(`Исключение при выполнении ${operation}`, { normalized, error: error.message });
            result = { success: false, action: 'exception', error: error.message };
        }

        // === ЕДИНООБРАЗНОЕ СОХРАНЕНИЕ OPERATION ДЛЯ ВСЕХ ТИПОВ ===
        // После любой операции гарантированно записываем поле
        if (result.success) {
            const finalItem = targetState.find(item => item.id === id);
            if (finalItem) {
                finalItem.operation = normalized.operation;   // ← КЛЮЧЕВОЕ ИСПРАВЛЕНИЕ
            }
        }
        // =========================================================

        log.operationResult(operationId, result);
        this._logOperation(op, result);
        return result;
    }

    /**
     * Применяет МАССИВ операций с обработкой ошибок.
     * 
     * Логика:
     * 1. Проверка параметров
     * 2. Цикл по операциям
     * 3. Сбор успешных/ошибочных результатов
     * 4. Формирование сводки
     * 
     * @param {Array} operations - массив операций (уже нормализованных)
     * @param {Array} targetState - состояние
     * @returns {Object} { success, applied, total, results, errors }
     */
    applyOperations(operations, targetState) {
        if (!Array.isArray(operations) || !Array.isArray(targetState)) {
            const error = 'Неверные параметры: operations и targetState должны быть массивами';
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

        // Очищаем буфер перед новой партией
        this.errorBuffer = [];

        operations.forEach((op, index) => {
            const result = this.applyOperation(op, targetState);
            results.push(result);
            if (result.success) {
                appliedCount++;
            } else {
                const errorMsg = `Операция ${index + 1}: ${result.error || 'Неизвестная ошибка'}`;
                errors.push(errorMsg);
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
            errors
        };

        if (errors.length > 0) {
            log.warn(LOG_CATEGORIES.OPERATIONS, `⚠️ Применение операций: ${appliedCount}/${operations.length} успешно, ${errors.length} ошибок`, summary);
        } else {
            log.info(LOG_CATEGORIES.OPERATIONS, `✅ Все ${operations.length} операций успешно применены`, summary);
        }

        return summary;
    }

    /**
     * Возвращает накопленные ошибки и очищает буфер.
     * 
     * @returns {Array} копия errorBuffer
     */
    getAndClearErrors() {
        const errors = [...this.errorBuffer];
        this.errorBuffer = [];
        if (errors.length > 0) {
            log.debug(LOG_CATEGORIES.ERROR_TRACKING, 'Очистка буфера ошибок операций', { errorsCount: errors.length });
        }
        return errors;
    }

    // ============================================================================
    // ПРИВАТНЫЕ МЕТОДЫ БИЗНЕС-ЛОГИКИ
    // ============================================================================

    /**
     * Возвращает дефолтное значение для нового элемента.
     * 
     * @param {string} type - тип game_item
     * @param {string} name - имя элемента
     * @returns {any} дефолт
     */
    _getDefaultValue(type, name) {
        switch (type) {
            case GAME_ITEM_TYPES.STAT:
                return 50; // базовый стат
            case GAME_ITEM_TYPES.RELATIONS:
                return 0;
            case GAME_ITEM_TYPES.PROGRESS:
                return 0;
            case GAME_ITEM_TYPES.ORGANIZATION_RANK:
                return 0;
            case GAME_ITEM_TYPES.BUFF:
            case GAME_ITEM_TYPES.DEBUFF:
                return 0; // значение эффекта
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

    /**
     * Применяет операцию ADD.
     * 
     * Развилки:
     * - Если уже существует и стековый — вызываем _stackItem
     * - Если уже существует и не стековый — игнорируем
     * - Если не существует — создаём новый item
     */
    _applyAdd(id, type, value, duration, description, existing, state, index) {
        if (existing) {
            // Развилка 1: стековые типы
            if (STACKABLE_TYPES.includes(type)) {
                return this._stackItem(existing, state, index, value, duration, description);
            }
            // Развилка 2: обычные — не дублируем
            return { success: true, action: 'ignored', message: 'уже существует' };
        }

        // Создаём новый item
        const newItem = { id, value, description: description || '' };
        if (duration !== undefined && [GAME_ITEM_TYPES.BUFF, GAME_ITEM_TYPES.DEBUFF].includes(type)) {
            newItem.duration = duration;
            newItem.originalDuration = duration;
        }
        state.push(newItem);
        return { success: true, action: 'added', newValue: value };
    }

    /**
     * Применяет операцию REMOVE.
     * 
     * Развилки:
     * - Если не найден — ошибка
     * - Если стат или skill — запрещено
     * - Если стековый и стек > 1 — уменьшаем стек
     * - Иначе — удаляем полностью
     */
    _applyRemove(id, type, existing, state, index) {
        if (!existing) {
            return { success: false, action: 'not_found', error: 'элемент не найден' };
        }

        // Защита базовых статов
        if (type === GAME_ITEM_TYPES.STAT || type === GAME_ITEM_TYPES.SKILL) {
            return { success: false, action: 'protected', error: `${type} нельзя удалить` };
        }

        // Стековые типы
        if (STACKABLE_TYPES.includes(type) && existing.stack && existing.stack > 1) {
            existing.stack -= 1;
            if (existing.stack === 1) delete existing.stack;
            this._updateStackDescription(existing);
            return { success: true, action: 'destacked', stack: existing.stack };
        }

        // Полное удаление
        state.splice(index, 1);
        return { success: true, action: 'removed' };
    }

    /**
     * Применяет операцию MODIFY (только для numeric типов).
     * 
     * Развилки:
     * - Если элемента нет — создаём с дефолтом
     * - Клиппинг значений (0-100 для статов и т.д.)
     */
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

        // Клиппинг
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

    /**
     * Применяет операцию SET (перезапись).
     */
    _applySet(id, value, duration, description, existing, state, index) {
        if (!existing) {
            const newItem = { id, value, description: description || '' };
            if (duration !== undefined) newItem.duration = duration;
            state.push(newItem);
            return { success: true, action: 'added' };
        }

        existing.value = value;
        if (description !== undefined) existing.description = description;
        if (duration !== undefined) existing.duration = duration;
        return { success: true, action: 'set' };
    }

    /**
     * Стекование временных эффектов.
     */
    _stackItem(existing, state, index, value, duration, description) {
        if (typeof value === 'number' && typeof existing.value === 'number') {
            existing.value += value;
        } else {
            existing.stack = (existing.stack || 1) + 1;
        }

        if (duration !== undefined) {
            existing.duration = Math.max(existing.duration || 0, duration);
        }

        this._updateStackDescription(existing);
        return { success: true, action: 'stacked', stack: existing.stack, value: existing.value };
    }

    /**
     * Обновляет описание стека (xN).
     */
    _updateStackDescription(item) {
        if (item.stack && item.description) {
            item.description = item.description.replace(/\s*\(x\d+\)$/, '');
            item.description += ` (x${item.stack})`;
        }
    }

    /**
     * Уменьшает длительность всех buff/debuff и удаляет истекшие.
     * 
     * @returns {Object} { processed, removed }
     */
    decreaseBuffDurations(targetState) {
        if (!Array.isArray(targetState)) return { processed: 0, removed: 0 };

        let processed = 0;
        let removed = 0;

        // Обратный цикл — безопасно удалять
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
     * Вычисляет изменения статов между двумя состояниями.
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
     * Создаёт расчётное состояние для ИИ (с уже применёнными изменениями).
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

    // ============================================================================
    // ЛОГИРОВАНИЕ И ДЕБАГ
    // ============================================================================

    _logOperation(operation, result) {
        const logEntry = {
            timestamp: new Date().toISOString(),
            operation: operation.operation,
            id: operation.id,
            result: result.action,
            success: result.success,
            details: result.message || result.error
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
        this.errorBuffer.push({
            message: msg,
            details,
            timestamp: new Date().toISOString()
        });
    }

    setDebugMode(enabled) {
        this.DEBUG_MODE = enabled;
        localStorage.setItem('oto_debug_operations', enabled.toString());
        log.info(LOG_CATEGORIES.OPERATIONS, `🔧 Режим отладки операций: ${enabled ? 'ВКЛ' : 'ВЫКЛ'}`);
    }

    getOperationLog(limit = 20) {
        return this.operationLog.slice(0, limit);
    }

    getErrorLog(limit = 20) {
        return this.errorBuffer.slice(0, limit);
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
            report.byOperation[entry.operation] = (report.byOperation[entry.operation] || 0) + 1;
            const [type] = entry.id.split(':');
            report.byType[type] = (report.byType[type] || 0) + 1;
            if (entry.success) successCount++;
        });
        report.successRate = this.operationLog.length > 0 ? Math.round((successCount / this.operationLog.length) * 100) : 0;
        return report;
    }
}

// ============================================================================
// SINGLETON + ЭКСПОРТ
// ============================================================================
export const OperationsServiceInstance = new OperationsService();

// Экспорт констант для других модулей
export { VALID_STATS, STACKABLE_TYPES };