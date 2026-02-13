/**
 * СЕРВИС ОПЕРАЦИЙ НАД GAME_ITEM
 * ===============================================================
 * 
 * КРИТИЧЕСКИЕ НЮАНСЫ ОБРАБОТКИ ОПЕРАЦИЙ:
 * 
 * 1. ТИПЫ GAME_ITEM И ИХ СПЕЦИФИКА:
 *    - stat:          Базовые характеристики (0-100), смерть при 0
 *    - skill:         Постоянные навыки, не удаляются
 *    - inventory:     Предметы, можно добавлять/удалять
 *    - relations:     Отношения с NPC (-100 до 100)
 *    - bless/curse:   Перманентные нарративные эффекты
 *    - buff/debuff:   Временные модификаторы с duration
 *    - progress:      Общий прогресс игры
 *    - personality:   Описание личности персонажа
 *    - organization_rank: Ранг в организации (требует иерархии)
 * 
 * 2. ОСОБЕННОСТИ ОПЕРАЦИЙ:
 * 
 *    ADD - ДОБАВЛЕНИЕ:
 *    - Для НЕСУЩЕСТВУЮЩЕГО game_item: создается новый
 *    - Для СУЩЕСТВУЮЩЕГО:
 *        * buff/debuff/bless/curse: СТЕКИРОВАНИЕ значений или счетчика
 *        * Остальные типы: ИГНОРИРУЕТСЯ (не создает дубликаты)
 *    - Если value не указан: используется дефолтное значение по типу
 *    - Для buff/debuff ОБЯЗАТЕЛЕН duration
 * 
 *    REMOVE - УДАЛЕНИЕ:
 *    - Для НЕСУЩЕСТВУЮЩЕГО: операция игнорируется
 *    - Для СУЩЕСТВУЮЩЕГО:
 *        * stackable типы: уменьшает счетчик стека
 *        * Остальные: полное удаление
 *    - Невозможно удалить: stat, skill (игнорируется), personality
 * 
 *    MODIFY - ИЗМЕНЕНИЕ (delta):
 *    - Для НЕСУЩЕСТВУЮЩЕГО: создает с value = дефолтное + delta
 *    - Для СУЩЕСТВУЮЩЕГО: прибавляет delta к текущему value
 *    - ТОЛЬКО для числовых типов: stat, relations, progress, organization_rank
 * 
 *    SET - УСТАНОВКА:
 *    - Для НЕСУЩЕСТВУЮЩЕГО: создает новый
 *    - Для СУЩЕСТВУЮЩЕГО: безопасное обновление (не теряет данные)
 * 
 * 3. ОБРАБОТКА ОШИБОК:
 *    - Некорректные операции логируются, но НЕ прерывают выполнение
 *    - Ошибки записываются в журнал и могут быть показаны пользователю
 *    - Последующие операции обрабатываются после ошибки
 *    - Возвращается детальная информация о всех ошибках
 * 
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
     * ОСНОВНОЙ МЕТОД: Применяет операцию к состоянию heroState
     * @param {Object} operation - Операция {id, operation, value?, delta?, duration?, description?}
     * @param {Array} targetState - Массив heroState (изменяется на месте)
     * @returns {Object} - Результат {success: boolean, action: string, warnings: Array, error?: string, details: Object}
     */
    applyOperation(operation, targetState) {
        const operationId = log.operation(operation, { 
            targetStateLength: targetState?.length,
            debug: this.DEBUG_MODE 
        });

        if (this.DEBUG_MODE) {
            log.debug(LOG_CATEGORIES.OPERATIONS, `🔧 Операция ${operation.operation} над ${operation.id}`, {
                before: JSON.parse(JSON.stringify(targetState?.find(item => item.id === operation.id))),
                operation
            });
        }
        
        // 1. Валидация базовой структуры операции
        const validation = this.validateOperation(operation);
        if (!validation.isValid) {
            const errorDetails = {
                operation: operation,
                validationErrors: validation.errors,
                timestamp: new Date().toISOString()
            };
            
            this.logError(`❌ Некорректная операция: ${validation.errors.join(', ')}`, errorDetails);
            
            const result = {
                success: false,
                action: 'validation_failed',
                error: `Некорректная операция: ${validation.errors.join(', ')}`,
                details: errorDetails
            };
            
            log.operationResult(operationId, result);
            return result;
        }
        
        const [type, name] = operation.id.split(':');
        const existingIndex = targetState.findIndex(item => item.id === operation.id);
        const existingItem = existingIndex !== -1 ? targetState[existingIndex] : null;
        
        let result;
        
        // 2. Применение операции в зависимости от типа
        try {
            switch (operation.operation) {
                case OPERATIONS.ADD:
                    result = this.applyAdd(operation, type, name, existingItem, targetState, existingIndex);
                    break;
                    
                case OPERATIONS.REMOVE:
                    result = this.applyRemove(operation, type, name, existingItem, targetState, existingIndex);
                    break;
                    
                case OPERATIONS.MODIFY:
                    result = this.applyModify(operation, type, name, existingItem, targetState, existingIndex);
                    break;
                    
                case OPERATIONS.SET:
                    result = this.applySet(operation, type, name, existingItem, targetState, existingIndex);
                    break;
                    
                default:
                    const errorDetails = {
                        operation: operation,
                        timestamp: new Date().toISOString()
                    };
                    
                    this.logError(`❌ Неизвестная операция: ${operation.operation}`, errorDetails);
                    
                    result = {
                        success: false,
                        action: 'unknown_operation',
                        error: `Неизвестная операция: ${operation.operation}`,
                        details: errorDetails
                    };
            }
        } catch (error) {
            // ЛОВИМ ЛЮБЫЕ ОШИБКИ В РЕАЛИЗАЦИИ ОПЕРАЦИЙ
            const errorDetails = {
                operation: operation,
                error: error,
                stack: error.stack,
                timestamp: new Date().toISOString()
            };
            
            this.logError(`💥 Критическая ошибка при выполнении операции ${operation.operation} над ${operation.id}: ${error.message}`, errorDetails);
            
            result = {
                success: false,
                action: 'execution_error',
                error: `Внутренняя ошибка: ${error.message}`,
                details: errorDetails
            };
        }
        
        // 3. Логирование результата
        log.operationResult(operationId, result);
        
        if (this.DEBUG_MODE) {
            log.debug(LOG_CATEGORIES.OPERATIONS, 'Результат операции', {
                result,
                after: JSON.parse(JSON.stringify(targetState?.find(item => item.id === operation.id)))
            });
        }
        
        this.logOperation(operation, result);
        
        return result;
    }
    
    /**
     * Применяет массив операций к состоянию с обработкой ошибок
     * @param {Array} operations - Массив операций
     * @param {Array} targetState - Целевое состояние
     * @returns {Object} - Сводный результат с ошибками
     */
    applyOperations(operations, targetState) {
        if (!Array.isArray(operations) || !targetState) {
            const error = 'Неверные параметры: operations должен быть массивом, targetState должен быть определен';
            this.logError(error, { operations, targetState });
            
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
                // Форматируем ошибку для пользователя
                const errorMessage = `Операция ${index + 1}: ${result.error || 'Неизвестная ошибка'}`;
                errors.push({
                    index: index,
                    operation: op,
                    error: errorMessage,
                    details: result.details
                });
                
                // Сохраняем в буфер для возможного алерта
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
        
        // Логируем сводку по операциям
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
    
    /**
     * ВАЛИДАЦИЯ: Проверяет корректность операции
     * @private
     */
    validateOperation(operation) {
        const errors = [];
        
        // 1. Обязательные поля
        if (!operation.id || typeof operation.id !== 'string') {
            errors.push('Отсутствует или некорректен id');
        }
        
        if (!operation.operation || !Object.values(OPERATIONS).includes(operation.operation)) {
            errors.push(`Некорректная операция. Допустимо: ${Object.values(OPERATIONS).join(', ')}`);
        }
        
        // 2. Проверка формата id (тип:имя)
        if (operation.id && typeof operation.id === 'string') {
            const parts = operation.id.split(':');
            if (parts.length !== 2) {
                errors.push(`Некорректный формат id: ${operation.id}. Ожидается: тип:имя`);
            } else {
                const [type, name] = parts;
                
                // Проверка валидности типов
                if (!Object.values(GAME_ITEM_TYPES).includes(type)) {
                    errors.push(`Неизвестный тип game_item: ${type}`);
                }
                
                // Специфичные проверки по типам
                switch (type) {
                    case GAME_ITEM_TYPES.STAT:
                        if (!VALID_STATS.includes(name)) {
                            errors.push(`Некорректный stat: ${name}. Допустимо: ${VALID_STATS.join(', ')}`);
                        }
                        break;
                        
                    case GAME_ITEM_TYPES.ORGANIZATION_RANK:
                        if (!name || name.trim() === '') {
                            errors.push('Для organization_rank требуется идентификатор организации');
                        }
                        break;
                }
            }
        }
        
        // 3. Проверка обязательных полей для операций
        switch (operation.operation) {
            case OPERATIONS.ADD:
                // Для buff/debuff обязателен duration
                if (operation.id && (operation.id.startsWith('buff:') || operation.id.startsWith('debuff:'))) {
                    if (operation.duration === undefined || typeof operation.duration !== 'number') {
                        errors.push(`Для ${operation.id.split(':')[0]} обязателен числовой duration`);
                    }
                    if (operation.duration !== undefined && (operation.duration < 1 || operation.duration > 999)) {
                        errors.push(`duration должен быть от 1 до 999, получено: ${operation.duration}`);
                    }
                }
                // Для buff/debuff value должно быть числом
                if ((operation.id.startsWith('buff:') || operation.id.startsWith('debuff:')) &&
                    operation.value !== undefined && typeof operation.value !== 'number') {
                    errors.push(`Для ${operation.id.split(':')[0]} value должно быть числом`);
                }
                break;
                
            case OPERATIONS.MODIFY:
                if (operation.delta === undefined) {
                    errors.push('Для MODIFY обязателен delta');
                } else if (typeof operation.delta !== 'number') {
                    errors.push('delta должен быть числом');
                }
                break;
                
            case OPERATIONS.SET:
                if (operation.value === undefined) {
                    errors.push('Для SET обязателен value');
                }
                break;
                
            case OPERATIONS.REMOVE:
                // Нет обязательных полей кроме id
                break;
        }
        
        // 4. Проверка диапазонов значений
        if (operation.value !== undefined) {
            const [type] = operation.id.split(':');
            
            switch (type) {
                case GAME_ITEM_TYPES.STAT:
                    if (typeof operation.value === 'number' && (operation.value < 0 || operation.value > 100)) {
                        errors.push(`stat value должен быть от 0 до 100, получено: ${operation.value}`);
                    }
                    break;
                    
                case GAME_ITEM_TYPES.RELATIONS:
                    if (typeof operation.value === 'number' && (operation.value < -100 || operation.value > 100)) {
                        errors.push(`relations value должен быть от -100 до 100, получено: ${operation.value}`);
                    }
                    break;
                    
                case GAME_ITEM_TYPES.PROGRESS:
                    if (typeof operation.value === 'number' && (operation.value < 0 || operation.value > 100)) {
                        errors.push(`progress value должен быть от 0 до 100, получено: ${operation.value}`);
                    }
                    break;
            }
        }
        
        // Логируем ошибки валидации, если они есть
        if (errors.length > 0) {
            log.debug(LOG_CATEGORIES.VALIDATION, 'Ошибки валидации операции', {
                operation,
                errors
            });
        }
        
        return {
            isValid: errors.length === 0,
            errors: errors.length > 0 ? errors : null
        };
    }
    
    /**
     * Применяет операцию ADD
     * @private
     */
    applyAdd(operation, type, name, existingItem, targetState, existingIndex) {
        // Если item не существует - создаем новый
        if (!existingItem) {
            const newItem = this.createNewGameItem(operation, type, name);
            targetState.push(newItem);
            
            log.debug(LOG_CATEGORIES.OPERATIONS, `➕ ADD: создан ${operation.id}`, { value: newItem.value });
            
            return {
                success: true,
                action: 'created',
                newValue: newItem.value,
                message: `Создан ${operation.id} = ${newItem.value}`
            };
        }
        
        // Если существует - обработка стекования
        if (STACKABLE_TYPES.includes(type)) {
            return this.handleStacking(operation, existingItem, targetState, existingIndex);
        }
        
        // Для нестекуемых типов - игнорируем (не создаем дубликаты)
        log.debug(LOG_CATEGORIES.OPERATIONS, `⚠️ ADD: ${operation.id} уже существует, дубликат не создан`);
        
        return {
            success: false,
            action: 'ignored',
            reason: 'already_exists',
            message: `${operation.id} уже существует, дубликат не создан`
        };
    }
    
    /**
     * Применяет операцию REMOVE
     * @private
     */
    applyRemove(operation, type, name, existingItem, targetState, existingIndex) {
        // Если item не существует - ничего не делаем
        if (!existingItem) {
            log.debug(LOG_CATEGORIES.OPERATIONS, `❌ REMOVE: ${operation.id} не найден`);
            return {
                success: false,
                action: 'ignored',
                reason: 'not_found',
                message: `${operation.id} не найден для удаления`
            };
        }
        
        // Запрет на удаление определенных типов
        if (type === GAME_ITEM_TYPES.STAT) {
            log.warn(LOG_CATEGORIES.OPERATIONS, `⛔ REMOVE: попытка удалить stat ${operation.id}`);
            return {
                success: false,
                action: 'rejected',
                reason: 'protected_type',
                message: 'stat не может быть удален'
            };
        }
        
        if (type === GAME_ITEM_TYPES.SKILL) {
            log.warn(LOG_CATEGORIES.OPERATIONS, `⛔ REMOVE: попытка удалить skill ${operation.id}`);
            return {
                success: false,
                action: 'rejected',
                reason: 'protected_type',
                message: 'skill не может быть удален (правила системы)'
            };
        }
        
        // Обработка стекования для stackable типов
        if (STACKABLE_TYPES.includes(type) && existingItem.stack && existingItem.stack > 1) {
            return this.handleDestacking(operation, existingItem, targetState, existingIndex);
        }
        
        // Полное удаление
        targetState.splice(existingIndex, 1);
        log.debug(LOG_CATEGORIES.OPERATIONS, `🗑️ REMOVE: удален ${operation.id}`);
        
        return {
            success: true,
            action: 'removed',
            message: `${operation.id} удален`
        };
    }
    
    /**
     * Применяет операцию MODIFY
     * @private
     */
    applyModify(operation, type, name, existingItem, targetState, existingIndex) {
        // Проверка, что тип поддерживает MODIFY (числовые значения)
        if (!this.supportsModify(type)) {
            log.debug(LOG_CATEGORIES.OPERATIONS, `⛔ MODIFY: ${type} не поддерживает MODIFY`);
            return {
                success: false,
                action: 'rejected',
                reason: 'unsupported_type',
                message: `${type} не поддерживает MODIFY (требуется числовое значение)`
            };
        }
        
        // Если item не существует - создаем с дефолтным значением + delta
        if (!existingItem) {
            const defaultValue = this.getDefaultValue(type, name);
            const baseValue = typeof defaultValue === 'number' ? defaultValue : 0;
            const newValue = baseValue + operation.delta;
            
            // Проверка диапазона для статов
            if (type === GAME_ITEM_TYPES.STAT) {
                const clampedValue = Math.max(0, Math.min(100, newValue));
                if (clampedValue !== newValue) {
                    log.warn(LOG_CATEGORIES.OPERATIONS, `⚠️ ${operation.id} ограничен от ${newValue} до ${clampedValue}`);
                }
            }
            
            const newItem = {
                id: operation.id,
                value: newValue,
                description: operation.description || '',
                duration: operation.duration
            };
            
            targetState.push(newItem);
            
            log.debug(LOG_CATEGORIES.OPERATIONS, `➕ MODIFY: создан ${operation.id} = ${newValue} (дефолт ${baseValue} + ${operation.delta})`);
            
            return {
                success: true,
                action: 'created_with_modify',
                oldValue: baseValue,
                newValue: newValue,
                message: `Создан ${operation.id} = ${newValue} (дефолт ${baseValue} + ${operation.delta})`
            };
        }
        
        // Если существует - изменяем значение
        const oldValue = existingItem.value;
        let newValue;
        
        if (typeof oldValue === 'number') {
            newValue = oldValue + operation.delta;
            
            // Применение ограничений по типу
            switch (type) {
                case GAME_ITEM_TYPES.STAT:
                    newValue = Math.max(0, Math.min(100, newValue));
                    break;
                    
                case GAME_ITEM_TYPES.RELATIONS:
                    newValue = Math.max(-100, Math.min(100, newValue));
                    break;
                    
                case GAME_ITEM_TYPES.PROGRESS:
                    newValue = Math.max(0, Math.min(100, newValue));
                    break;
                    
                case GAME_ITEM_TYPES.ORGANIZATION_RANK:
                    // Нет ограничений, но логируем
                    break;
            }
        } else {
            // Если значение не числовое, пытаемся преобразовать
            const numericValue = parseFloat(oldValue);
            if (!isNaN(numericValue)) {
                newValue = numericValue + operation.delta;
            } else {
                log.warn(LOG_CATEGORIES.OPERATIONS, `⚠️ MODIFY: ${operation.id} имеет нечисловое значение: ${oldValue}`);
                return {
                    success: false,
                    action: 'failed',
                    reason: 'non_numeric_value',
                    message: `${operation.id} имеет нечисловое значение: ${oldValue}`
                };
            }
        }
        
        // Обновляем значение
        targetState[existingIndex] = {
            ...existingItem,
            value: newValue
        };
        
        log.debug(LOG_CATEGORIES.OPERATIONS, `📊 MODIFY: ${operation.id}: ${oldValue} → ${newValue} (Δ${operation.delta})`);
        
        return {
            success: true,
            action: 'modified',
            oldValue: oldValue,
            newValue: newValue,
            delta: operation.delta,
            message: `${operation.id}: ${oldValue} → ${newValue} (Δ${operation.delta})`
        };
    }
    
    /**
     * Применяет операцию SET (безопасное обновление)
     * @private
     */
    applySet(operation, type, name, existingItem, targetState, existingIndex) {
        // Если item не существует - создаем
        if (!existingItem) {
            const newItem = {
                id: operation.id,
                value: operation.value,
                description: operation.description || '',
                duration: operation.duration,
                ...this.extractAdditionalFields(operation)
            };
            
            targetState.push(newItem);
            
            log.debug(LOG_CATEGORIES.OPERATIONS, `➕ SET: создан ${operation.id} = ${operation.value}`);
            
            return {
                success: true,
                action: 'created',
                newValue: operation.value,
                message: `Создан ${operation.id} = ${operation.value}`
            };
        }
        
        // Если существует - БЕЗОПАСНОЕ обновление (не теряем данные)
        const oldValue = existingItem.value;
        const updatedItem = {
            ...existingItem,
            // Обновляем только если явно передано значение
            ...(operation.value !== undefined && { value: operation.value }),
            ...(operation.description !== undefined && { description: operation.description }),
            ...(operation.duration !== undefined && { duration: operation.duration }),
            // Дополнительные поля из операции (кроме стандартных)
            ...this.extractAdditionalFields(operation)
        };
        
        targetState[existingIndex] = updatedItem;
        
        log.debug(LOG_CATEGORIES.OPERATIONS, `🔄 SET: обновлен ${operation.id}`, {
            old: oldValue,
            new: operation.value
        });
        
        return {
            success: true,
            action: 'updated',
            oldValue: oldValue,
            newValue: operation.value,
            message: `${operation.id} обновлен`
        };
    }
    
    /**
     * Обработка стекования для stackable типов
     * @private
     */
    handleStacking(operation, existingItem, targetState, index) {
        const [type] = operation.id.split(':');
        
        try {
            switch (type) {
                case GAME_ITEM_TYPES.BUFF:
                case GAME_ITEM_TYPES.DEBUFF:
                    return this.stackBuffDebuff(operation, existingItem, targetState, index);
                    
                case GAME_ITEM_TYPES.BLESS:
                case GAME_ITEM_TYPES.CURSE:
                    return this.stackBlessCurse(operation, existingItem, targetState, index);
                    
                default:
                    return {
                        success: false,
                        action: 'stacking_failed',
                        reason: 'unknown_stackable_type',
                        message: `Неизвестный stackable тип: ${type}`
                    };
            }
        } catch (error) {
            this.logError(`Ошибка при стековании ${type}`, { operation, existingItem, error });
            
            return {
                success: false,
                action: 'stacking_error',
                error: `Ошибка стекования: ${error.message}`,
                message: `Не удалось выполнить стекование для ${operation.id}`
            };
        }
    }
    
    /**
     * Стекание buff/debuff
     * @private
     */
    stackBuffDebuff(operation, existingItem, targetState, index) {
        const updatedItem = { ...existingItem };
        const changes = {};
        
        // 1. Суммирование значений (если числовые)
        if (typeof operation.value === 'number' && typeof updatedItem.value === 'number') {
            const oldVal = updatedItem.value;
            updatedItem.value += operation.value;
            changes.value = { old: oldVal, new: updatedItem.value, delta: operation.value };
        }
        
        // 2. Максимальная длительность
        if (operation.duration !== undefined) {
            const oldDur = updatedItem.duration;
            if (updatedItem.duration !== undefined) {
                updatedItem.duration = Math.max(updatedItem.duration, operation.duration);
            } else {
                updatedItem.duration = operation.duration;
            }
            changes.duration = { old: oldDur, new: updatedItem.duration };
        }
        
        // 3. Учет оригинальной длительности для стеков
        if (operation.duration && !updatedItem.originalDuration) {
            updatedItem.originalDuration = operation.duration;
            changes.originalDuration = { new: operation.duration };
        }
        
        // 4. Увеличение счетчика стеков для нечисловых значений
        if (operation.value !== undefined && updatedItem.value !== undefined &&
            typeof operation.value !== 'number') {
            const oldStack = updatedItem.stack || 1;
            updatedItem.stack = (updatedItem.stack || 1) + 1;
            changes.stack = { old: oldStack, new: updatedItem.stack };
            
            updatedItem.description = updatedItem.description ?
                `${updatedItem.description} (x${updatedItem.stack})` : `(x${updatedItem.stack})`;
        }
        
        targetState[index] = updatedItem;
        
        log.debug(LOG_CATEGORIES.OPERATIONS, `📚 Стекинг ${operation.id}`, changes);
        
        return {
            success: true,
            action: 'stacked',
            newValue: updatedItem.value,
            duration: updatedItem.duration,
            stack: updatedItem.stack,
            changes,
            message: `${operation.id} стекован: значение ${updatedItem.value}, длительность ${updatedItem.duration}`
        };
    }
    
    /**
     * Стекание bless/curse
     * @private
     */
    stackBlessCurse(operation, existingItem, targetState, index) {
        const updatedItem = { ...existingItem };
        const changes = {};
        
        // Если оба значения числовые - суммируем
        if (typeof operation.value === 'number' && typeof updatedItem.value === 'number') {
            const oldVal = updatedItem.value;
            updatedItem.value += operation.value;
            changes.value = { old: oldVal, new: updatedItem.value, delta: operation.value };
        } else {
            // Иначе увеличиваем счетчик стеков
            const oldStack = updatedItem.stack || 1;
            updatedItem.stack = (updatedItem.stack || 1) + 1;
            changes.stack = { old: oldStack, new: updatedItem.stack };
            
            updatedItem.description = updatedItem.description ?
                `${updatedItem.description} (x${updatedItem.stack})` : `(x${updatedItem.stack})`;
        }
        
        targetState[index] = updatedItem;
        
        log.debug(LOG_CATEGORIES.OPERATIONS, `📚 Стекинг ${operation.id}`, changes);
        
        return {
            success: true,
            action: 'stacked',
            newValue: updatedItem.value,
            stack: updatedItem.stack,
            changes,
            message: `${operation.id} стекован: значение ${updatedItem.value}, стеки ${updatedItem.stack}`
        };
    }
    
    /**
     * Уменьшение стека для stackable типов (при REMOVE)
     * @private
     */
    handleDestacking(operation, existingItem, targetState, index) {
        const updatedItem = { ...existingItem };
        updatedItem.stack -= 1;
        
        if (updatedItem.stack === 1) {
            delete updatedItem.stack;
            
            // Убираем "(xN)" из description
            if (updatedItem.description && updatedItem.description.includes('(x')) {
                updatedItem.description = updatedItem.description.replace(/ \(x\d+\)$/, '');
            }
        } else {
            // Обновляем счетчик в description
            if (updatedItem.description && updatedItem.description.includes('(x')) {
                updatedItem.description = updatedItem.description.replace(/\(x\d+\)$/, `(x${updatedItem.stack})`);
            } else {
                updatedItem.description = updatedItem.description ?
                    `${updatedItem.description} (x${updatedItem.stack})` : `(x${updatedItem.stack})`;
            }
        }
        
        targetState[index] = updatedItem;
        
        if (updatedItem.stack <= 0) {
            targetState[index] = null;
            log.debug(LOG_CATEGORIES.OPERATIONS, `🧹 Дестекинг ${operation.id}: удалён стек по достижении 0`);
            return {
                success: true,
                action: 'destacked',
                stack: null,
                message: `${operation.id} удалён стек по достижении 0`
            };
        } else {
            log.debug(LOG_CATEGORIES.OPERATIONS, `📉 Дестекинг ${operation.id}: стек уменьшен до ${updatedItem.stack}`);
            return {
                success: true,
                action: 'destacked',
                stack: updatedItem.stack,
                message: `${operation.id} уменьшен стек до ${updatedItem.stack || 1}`
            };
        }
    }
    
    /**
     * Создает новый game_item с дефолтными значениями
     * @private
     */
    createNewGameItem(operation, type, name) {
        const defaultValue = this.getDefaultValue(type, name);
        
        return {
            id: operation.id,
            value: operation.value !== undefined ? operation.value : defaultValue,
            description: operation.description || '',
            duration: operation.duration,
            ...this.extractAdditionalFields(operation)
        };
    }
    
    /**
     * Возвращает дефолтное значение для типа
     * @private
     */
    getDefaultValue(type, name) {
        switch (type) {
            case GAME_ITEM_TYPES.STAT:
                return 50; // Стандартное начальное значение
                
            case GAME_ITEM_TYPES.SKILL:
                return name || 'Навык'; // Используем имя как название
                
            case GAME_ITEM_TYPES.INVENTORY:
                return name || 'Предмет';
                
            case GAME_ITEM_TYPES.RELATIONS:
                return 0; // Нейтральные отношения
                
            case GAME_ITEM_TYPES.BLESS:
            case GAME_ITEM_TYPES.CURSE:
                return name || 'Эффект';
                
            case GAME_ITEM_TYPES.BUFF:
            case GAME_ITEM_TYPES.DEBUFF:
                return 0; // Нулевое влияние по умолчанию
                
            case GAME_ITEM_TYPES.PROGRESS:
                return 0;
                
            case GAME_ITEM_TYPES.PERSONALITY:
                return '';
                
            case GAME_ITEM_TYPES.ORGANIZATION_RANK:
                return 0; // Начальный ранг
                
            default:
                return null;
        }
    }
    
    /**
     * Проверяет, поддерживает ли тип операцию MODIFY
     * @private
     */
    supportsModify(type) {
        const numericTypes = [
            GAME_ITEM_TYPES.STAT,
            GAME_ITEM_TYPES.RELATIONS,
            GAME_ITEM_TYPES.PROGRESS,
            GAME_ITEM_TYPES.ORGANIZATION_RANK
        ];
        
        return numericTypes.includes(type);
    }
    
    /**
     * Извлекает дополнительные поля из операции (кроме стандартных)
     * @private
     */
    extractAdditionalFields(operation) {
        const { id, operation: op, value, description, duration, delta, ...additional } = operation;
        return additional;
    }
    
    /**
     * Логирует операцию для отладки
     * @private
     */
    logOperation(operation, result) {
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
        
        // Ограничиваем размер лога
        if (this.operationLog.length > this.maxLogSize) {
            this.operationLog = this.operationLog.slice(0, this.maxLogSize);
        }
        
        // Сохраняем в localStorage для отладки
        if (this.DEBUG_MODE) {
            localStorage.setItem('oto_operations_log', JSON.stringify(this.operationLog));
        }
    }
    
    /**
     * Логирует ошибку с деталями через логгер
     * @private
     */
    logError(message, details = {}) {
        const errorEntry = {
            timestamp: new Date().toISOString(),
            message: message,
            details: details,
            stack: new Error().stack
        };
        
        log.error(LOG_CATEGORIES.ERROR_TRACKING, message, { ...details, errorEntry });
        
        // Также сохраняем в специальный лог ошибок
        const errorLog = JSON.parse(localStorage.getItem('oto_operations_errors') || '[]');
        errorLog.unshift(errorEntry);
        
        if (errorLog.length > 50) {
            errorLog.length = 50;
        }
        
        localStorage.setItem('oto_operations_errors', JSON.stringify(errorLog));
    }
    
    /**
     * Уменьшает длительность временных эффектов
     * @param {Array} targetState - Состояние для обработки
     * @returns {Object} - Результат обработки
     */
    decreaseBuffDurations(targetState) {
        if (!Array.isArray(targetState)) {
            const error = 'Некорректный targetState для decreaseBuffDurations';
            this.logError(error, { targetState });
            return { processed: 0, removed: 0, updated: 0, errors: [error] };
        }
        
        log.info(LOG_CATEGORIES.OPERATIONS, '⏳ Уменьшение длительности эффектов', {
            targetStateLength: targetState.length
        });
        
        let processed = 0;
        let removed = 0;
        let updated = 0;
        const details = [];
        
        // Обрабатываем в обратном порядке для безопасного удаления
        for (let i = targetState.length - 1; i >= 0; i--) {
            try {
                const item = targetState[i];
                const [type] = item.id.split(':');
                
                // Только buff/debuff с длительностью
                if ((type === GAME_ITEM_TYPES.BUFF || type === GAME_ITEM_TYPES.DEBUFF) &&
                    item.duration !== undefined && item.duration > 0) {
                    
                    processed++;
                    const oldDuration = item.duration;
                    item.duration -= 1;
                    
                    if (item.duration <= 0) {
                        // Для стеков уменьшаем стек вместо удаления
                        if (item.stack && item.stack > 1) {
                            const oldStack = item.stack;
                            item.stack -= 1;
                            item.duration = item.originalDuration || 1; // Восстанавливаем длительность
                            updated++;
                            
                            details.push({
                                id: item.id,
                                action: 'stack_decreased',
                                stack: { old: oldStack, new: item.stack },
                                duration: { old: oldDuration, new: item.duration }
                            });
                            
                            if (item.stack === 1) {
                                delete item.stack;
                                delete item.originalDuration;
                            }
                        } else {
                            // Полное удаление
                            details.push({
                                id: item.id,
                                action: 'removed',
                                duration: oldDuration
                            });
                            targetState.splice(i, 1);
                            removed++;
                        }
                    } else {
                        updated++;
                        details.push({
                            id: item.id,
                            action: 'duration_decreased',
                            duration: { old: oldDuration, new: item.duration }
                        });
                    }
                }
            } catch (error) {
                this.logError(`Ошибка при уменьшении длительности эффекта ${targetState[i]?.id}`, { error, index: i });
                // Продолжаем обработку остальных эффектов
            }
        }
        
        log.info(LOG_CATEGORIES.OPERATIONS, '✅ Уменьшение длительности завершено', {
            processed,
            updated,
            removed,
            details: details.slice(0, 5) // логируем первые 5 для компактности
        });
        
        return { processed, removed, updated, details };
    }
    
    /**
 * Создает расчетное состояние с уже примененными изменениями от действий
 * @param {Array} originalState - Исходное состояние
 * @param {Array} actionResults - Результаты действий
 * @returns {Array} Расчетное состояние для ИИ
 */
 calculateStateForAI(originalState, actionResults) {
  // Глубокая копия исходного состояния
  const calculatedState = JSON.parse(JSON.stringify(originalState));
  
  // Уменьшаем длительность эффектов
  OperationsServiceInstance.decreaseBuffDurations(calculatedState);
  
  // Применяем операции от действий
  actionResults.forEach(result => {
    if (result.operations && Array.isArray(result.operations)) {
      OperationsServiceInstance.applyOperations(result.operations, calculatedState);
    }
  });
  
  return calculatedState;
}
    
    /**
     * Рассчитывает изменения между двумя состояниями
     * @param {Array} oldState - Исходное состояние
     * @param {Array} newState - Новое состояние
     * @returns {Object} - Изменения по типам
     */
    calculateChanges(oldState, newState) {
        const changes = {
            stats: {},
            relations: {},
            skills: { added: [], removed: [] },
            inventory: { added: [], removed: [] },
            buffs: { added: [], removed: [], updated: [] },
            totalChanges: 0
        };
        
        try {
            // Создаем Map для быстрого поиска
            const oldMap = new Map(oldState.map(item => [item.id, item]));
            const newMap = new Map(newState.map(item => [item.id, item]));
            
            // Проверяем изменения существующих items
            for (const [id, oldItem] of oldMap) {
                const newItem = newMap.get(id);
                
                if (!newItem) {
                    // Item удален
                    this.trackRemoval(id, oldItem, changes);
                } else if (oldItem.value !== newItem.value) {
                    // Значение изменилось
                    this.trackValueChange(id, oldItem, newItem, changes);
                }
            }
            
            // Проверяем новые items
            for (const [id, newItem] of newMap) {
                if (!oldMap.has(id)) {
                    // Item добавлен
                    this.trackAddition(id, newItem, changes);
                }
            }
            
            changes.totalChanges = Object.values(changes).reduce((total, category) => {
                if (Array.isArray(category)) return total + category.length;
                if (typeof category === 'object') {
                    return total + Object.keys(category).length;
                }
                return total;
            }, 0);
            
            log.debug(LOG_CATEGORIES.GAME_STATE, '📊 Расчет изменений состояний', {
                totalChanges: changes.totalChanges,
                stats: Object.keys(changes.stats).length,
                buffs: changes.buffs.added.length + changes.buffs.removed.length + changes.buffs.updated.length,
                inventory: changes.inventory.added.length + changes.inventory.removed.length
            });
            
        } catch (error) {
            this.logError('Ошибка при расчете изменений состояний', { error, oldState, newState });
            changes.error = `Ошибка расчета: ${error.message}`;
        }
        
        return changes;
    }
    
    /**
     * Отслеживает удаление item
     * @private
     */
    trackRemoval(id, item, changes) {
        const [type] = id.split(':');
        
        switch (type) {
            case GAME_ITEM_TYPES.SKILL:
                changes.skills.removed.push({ id, name: item.value });
                break;
            case GAME_ITEM_TYPES.INVENTORY:
                changes.inventory.removed.push({ id, name: item.value });
                break;
            case GAME_ITEM_TYPES.BUFF:
            case GAME_ITEM_TYPES.DEBUFF:
                changes.buffs.removed.push({ id, name: item.value, duration: item.duration });
                break;
        }
    }
    
    /**
     * Отслеживает добавление item
     * @private
     */
    trackAddition(id, item, changes) {
        const [type] = id.split(':');
        
        switch (type) {
            case GAME_ITEM_TYPES.SKILL:
                changes.skills.added.push({ id, name: item.value });
                break;
            case GAME_ITEM_TYPES.INVENTORY:
                changes.inventory.added.push({ id, name: item.value });
                break;
            case GAME_ITEM_TYPES.BUFF:
            case GAME_ITEM_TYPES.DEBUFF:
                changes.buffs.added.push({ id, name: item.value, duration: item.duration });
                break;
        }
    }
    
    /**
     * Отслеживает изменение значения
     * @private
     */
    trackValueChange(id, oldItem, newItem, changes) {
        const [type] = id.split(':');
        
        switch (type) {
            case GAME_ITEM_TYPES.STAT:
                changes.stats[id] = {
                    old: oldItem.value,
                    new: newItem.value,
                    delta: newItem.value - oldItem.value
                };
                break;
            case GAME_ITEM_TYPES.RELATIONS:
                changes.relations[id] = {
                    old: oldItem.value,
                    new: newItem.value,
                    delta: newItem.value - oldItem.value
                };
                break;
            case GAME_ITEM_TYPES.BUFF:
            case GAME_ITEM_TYPES.DEBUFF:
                changes.buffs.updated.push({
                    id,
                    oldValue: oldItem.value,
                    newValue: newItem.value,
                    oldDuration: oldItem.duration,
                    newDuration: newItem.duration
                });
                break;
        }
    }
    
    /**
     * Включает/выключает режим отладки
     */
    setDebugMode(enabled) {
        this.DEBUG_MODE = enabled;
        localStorage.setItem('oto_debug_operations', enabled.toString());
        log.info(LOG_CATEGORIES.OPERATIONS, `🔧 Режим отладки операций: ${enabled ? 'ВКЛ' : 'ВЫКЛ'}`);
    }
    
    /**
     * Возвращает журнал операций
     */
    getOperationLog(limit = 20) {
        return this.operationLog.slice(0, limit);
    }
    
    /**
     * Возвращает журнал ошибок
     */
    getErrorLog(limit = 20) {
        const errorLog = JSON.parse(localStorage.getItem('oto_operations_errors') || '[]');
        return errorLog.slice(0, limit);
    }
    
    /**
     * Очищает журнал операций и ошибок
     */
    clearLogs() {
        this.operationLog = [];
        this.errorBuffer = [];
        localStorage.removeItem('oto_operations_log');
        localStorage.removeItem('oto_operations_errors');
        log.info(LOG_CATEGORIES.OPERATIONS, '🗑️ Журналы операций и ошибок очищены');
    }
    
    /**
     * Генерирует отчет о типах операций
     */
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
            // По операции
            if (!report.byOperation[entry.operation]) {
                report.byOperation[entry.operation] = 0;
            }
            report.byOperation[entry.operation]++;
            
            // По типу
            const [type] = entry.id.split(':');
            if (!report.byType[type]) {
                report.byType[type] = 0;
            }
            report.byType[type]++;
            
            // Успешность
            if (entry.success) successCount++;
        });
        
        report.successRate = this.operationLog.length > 0 ?
            Math.round((successCount / this.operationLog.length) * 100) : 0;
        
        log.debug(LOG_CATEGORIES.PERFORMANCE, '📈 Отчет OperationsService', report);
        
        return report;
    }
}

// Создаем и экспортируем singleton
export const OperationsServiceInstance = new OperationsService();

// Экспорт констант для использования в других модулях
export { VALID_STATS, STACKABLE_TYPES };