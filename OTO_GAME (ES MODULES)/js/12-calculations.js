// Модуль 12: CALCULATIONS - Расчеты результатов (НОВАЯ ВЕРСИЯ)
'use strict';

import { CONFIG } from './1-config.js';
import { Utils } from './2-utils.js';

/**
 * Модуль для всех игровых расчетов (полностью переписан под новую формулу)
 */
export const Calculations = {
    
    /**
     * РАСЧЕТ БАЗОВОГО ЗНАЧЕНИЯ СТАТА
     * База = Math.ceil(stat_value / 10)
     * @param {number} statValue - Значение стата (0-100)
     * @returns {number} База стата (1-10)
     */
    calculateStatBase(statValue) {
        return Math.ceil(Math.max(0, Math.min(100, statValue)) / 10);
    },
    
    /**
     * ПРОВЕРКА ТРЕБОВАНИЙ С НОВОЙ ФОРМУЛОЙ
     * @param {Object} requirements - Требования действия
     * @param {Object} state - Текущее состояние
     * @param {number} d10 - Результат броска d10 (1-10)
     * @returns {Object} Результат проверки
     */
    checkRequirementsWithFormula(requirements, state, d10) {
        if (!requirements) {
            return {
                passed: true,
                totalRequired: 0,
                totalActual: 0,
                individualResults: {},
                failedStats: []
            };
        }
        
        const results = {
            passed: true,
            totalRequired: 0,
            totalActual: 0,
            individualResults: {},
            failedStats: []
        };
        
        // Проверка статов
        if (requirements.stats && typeof requirements.stats === 'object') {
            for (const [rawStat, requiredThreshold] of Object.entries(requirements.stats)) {
                const statKey = Utils.normalizeStatKey(rawStat);
                if (!statKey) {
                    console.warn(`Неизвестная характеристика: ${rawStat}`);
                    results.passed = false;
                    continue;
                }
                
                const currentValue = state.stats[statKey];
                if (currentValue === undefined) {
                    console.warn(`Характеристика ${statKey} не найдена`);
                    results.passed = false;
                    continue;
                }
                
                // Рассчитываем по новой формуле
                const statBase = this.calculateStatBase(currentValue);
                const actualValue = statBase + d10;
                const threshold = Number(requiredThreshold);
                
                results.individualResults[statKey] = {
                    base: statBase,
                    d10: d10,
                    actual: actualValue,
                    required: threshold,
                    passed: actualValue >= threshold
                };
                
                results.totalRequired += threshold;
                results.totalActual += actualValue;
                
                if (actualValue < threshold) {
                    results.failedStats.push(statKey);
                    results.passed = false;
                }
            }
        }
        
        // Проверка инвентаря (остается без изменений)
        if (requirements.inventory && requirements.inventory !== null && requirements.inventory !== '') {
            const requiredItem = String(requirements.inventory).trim();
            if (requiredItem && !state.inventory.includes(requiredItem)) {
                results.passed = false;
                results.missingItem = requiredItem;
            }
        }
        
        return results;
    },
    
    /**
     * ОПРЕДЕЛЕНИЕ ТИПА РЕЗУЛЬТАТА
     * @param {Object} checkResult - Результат проверки требований
     * @returns {string} Тип результата: 'full_success'|'partial_success'|'partial_failure'|'full_failure'
     */
    determineResultType(checkResult) {
        if (!checkResult || checkResult.totalRequired === 0) {
            return 'full_success'; // Нет требований = автоматический успех
        }
        
        const allIndividualPassed = checkResult.failedStats.length === 0;
        const totalPassed = checkResult.totalActual >= checkResult.totalRequired;
        
        if (allIndividualPassed && totalPassed) {
            return 'full_success';
        } else if (!allIndividualPassed && totalPassed) {
            return 'partial_success';
        } else if (allIndividualPassed && !totalPassed) {
            return 'partial_failure';
        } else {
            return 'full_failure';
        }
    },
    
    /**
     * РАСЧЕТ ИЗМЕНЕНИЙ ПО ТИПУ РЕЗУЛЬТАТА
     * @param {Object} choice - Объект выбора с success_rewards/fail_penalties
     * @param {string} resultType - Тип результата
     * @returns {Object} Изменения для применения
     */
    calculateChangesByResultType(choice, resultType) {
        const baseChanges = {
            stats: {},
            inventory_add: [],
            inventory_remove: []
        };
        
        let sourceChanges;
        
        switch (resultType) {
            case 'full_success':
                sourceChanges = choice.success_rewards;
                break;
            case 'partial_success':
                // Для частичного успеха - 50% от успешных изменений
                sourceChanges = this.scaleChanges(choice.success_rewards, 0.5);
                break;
            case 'partial_failure':
                // Для частичной неудачи - 50% от неудачных изменений
                sourceChanges = this.scaleChanges(choice.fail_penalties, 0.5);
                break;
            case 'full_failure':
                sourceChanges = choice.fail_penalties;
                break;
            default:
                sourceChanges = choice.fail_penalties;
        }
        
        // Копируем изменения
        if (sourceChanges) {
            if (sourceChanges.stats) {
                baseChanges.stats = { ...sourceChanges.stats };
            }
            if (sourceChanges.inventory_add) {
                baseChanges.inventory_add = [...sourceChanges.inventory_add];
            }
            if (sourceChanges.inventory_remove) {
                baseChanges.inventory_remove = [...sourceChanges.inventory_remove];
            }
        }
        
        return baseChanges;
    },
    
    /**
     * МАСШТАБИРОВАНИЕ ИЗМЕНЕНИЙ (для частичных результатов)
     */
    scaleChanges(changes, factor) {
        if (!changes) return { stats: {}, inventory_add: [], inventory_remove: [] };
        
        const scaled = {
            stats: {},
            inventory_add: [],
            inventory_remove: []
        };
        
        // Масштабируем статы
        if (changes.stats) {
            for (const [stat, value] of Object.entries(changes.stats)) {
                const numValue = Number(value) || 0;
                scaled.stats[stat] = Math.round(numValue * factor);
                // Минимум ±1 для частичного результата
                if (scaled.stats[stat] === 0 && numValue !== 0) {
                    scaled.stats[stat] = numValue > 0 ? 1 : -1;
                }
            }
        }
        
        // Инвентарь: шанс добавления/удаления по фактору
        if (changes.inventory_add && Math.random() < factor) {
            scaled.inventory_add = [...changes.inventory_add];
        }
        
        if (changes.inventory_remove && Math.random() < factor) {
            scaled.inventory_remove = [...changes.inventory_remove];
        }
        
        return scaled;
    },
    
    /**
     * ОСНОВНАЯ ФУНКЦИЯ: РАСЧЕТ РЕЗУЛЬТАТА ДЕЙСТВИЯ (НОВЫЙ ФОРМАТ)
     * @param {Object} choice - Объект выбора
     * @param {Object} state - Текущее состояние игры
     * @param {number} d10 - Результат броска d10 (1-10)
     * @returns {Object} Результат в новом формате для selectedActions
     */
    calculateActionResult(choice, state, d10) {
        if (!choice || !state) {
            console.error('❌ Неверные параметры для calculateActionResult');
            return {
                text: "Ошибка расчета",
                result: "failure",
                delta: "ошибка",
                d10: 0,
                appliedChanges: { stats: {}, inventory_add: [], inventory_remove: [] }
            };
        }
        
        // 1. Проверка требований по новой формуле
        const checkResult = this.checkRequirementsWithFormula(choice.requirements, state, d10);
        
        // 2. Определение типа результата
        const resultType = this.determineResultType(checkResult);
        
        // 3. Получение изменений
        const appliedChanges = this.calculateChangesByResultType(choice, resultType);
        
        // 4. Форматирование дельты для отображения
        const delta = this.formatDelta(appliedChanges);
        
        // 5. Форматирование результата для ИИ
        const resultTextMap = {
            'full_success': 'полный успех',
            'partial_success': 'частичный успех',
            'partial_failure': 'частичная неудача',
            'full_failure': 'полная неудача'
        };
        
        return {
            text: choice.text,
            result: resultTextMap[resultType] || 'неизвестно',
            delta: delta,
            d10: d10,
            appliedChanges: appliedChanges,
            requirementsCheck: checkResult
        };
    },
    
    /**
     * ФОРМАТИРОВАНИЕ ДЕЛЬТЫ (для отображения)
     */
    formatDelta(changes) {
        if (!changes) return '';
        
        const parts = [];
        
        // Статы
        if (changes.stats && typeof changes.stats === 'object') {
            for (const [rawStat, value] of Object.entries(changes.stats)) {
                const statKey = Utils.normalizeStatKey(rawStat);
                if (statKey && value !== 0) {
                    const sign = value > 0 ? '+' : '';
                    parts.push(`${statKey}${sign}${value}`);
                }
            }
        }
        
        // Инвентарь
        if (changes.inventory_add && changes.inventory_add.length > 0) {
            changes.inventory_add.forEach(item => {
                parts.push(`+📦${item}`);
            });
        }
        
        if (changes.inventory_remove && changes.inventory_remove.length > 0) {
            changes.inventory_remove.forEach(item => {
                parts.push(`-📦${item}`);
            });
        }
        
        return parts.length > 0 ? parts.join(', ') : 'нет изменений';
    },
    
    /**
     * ПРИМЕНЕНИЕ ИЗМЕНЕНИЙ К СОСТОЯНИЮ
     */
    applyActionChangesToState(state, changes) {
        if (!state || !changes) return state;
        
        // Применяем изменения статов
        if (changes.stats && typeof changes.stats === 'object') {
            for (const [rawStat, value] of Object.entries(changes.stats)) {
                const statKey = Utils.normalizeStatKey(rawStat);
                if (statKey && state.stats[statKey] !== undefined) {
                    const numValue = Number(value) || 0;
                    state.stats[statKey] = Math.max(0, Math.min(100, state.stats[statKey] + numValue));
                    console.log(`📊 ${statKey}: ${state.stats[statKey] - numValue} → ${state.stats[statKey]} (${numValue > 0 ? '+' : ''}${numValue})`);
                }
            }
        }
        
        // Применяем изменения инвентаря
        if (changes.inventory_add && Array.isArray(changes.inventory_add)) {
            changes.inventory_add.forEach(item => {
                const cleanItem = String(item).trim();
                if (cleanItem && !state.inventory.includes(cleanItem)) {
                    state.inventory.push(cleanItem);
                    console.log(`📦 Добавлен предмет: ${cleanItem}`);
                }
            });
        }
        
        if (changes.inventory_remove && Array.isArray(changes.inventory_remove)) {
            state.inventory = state.inventory.filter(item =>
                !changes.inventory_remove.includes(String(item).trim())
            );
            changes.inventory_remove.forEach(item => {
                console.log(`📦 Удален предмет: ${item}`);
            });
        }
        
        return state;
    },
    
    /**
     * ФОРМИРОВАНИЕ SELECTEDACTIONS ДЛЯ ИИ (НОВЫЙ ФОРМАТ)
     * @param {Array} actionResults - Результаты расчетов
     * @returns {Array} Массив объектов для selectedActions
     */
    formatSelectedActionsForAI(actionResults) {
        return actionResults.map(action => ({
            text: action.text,
            result: action.result,
            delta: action.delta
        }));
    },
    
    /**
     * ПРОВЕРКА ДОСТИЖЕНИЯ НОВОЙ СТЕПЕНИ
     */
    checkAndApplyDegreeAdvancement(state) {
        const currentDegreeIndex = state.degreeIndex || 0;
        let newDegreeIndex = currentDegreeIndex;
        
        // Находим максимальную достигнутую степень
        CONFIG.degrees.forEach((degree, index) => {
            if (state.progress >= degree.threshold) {
                newDegreeIndex = index;
            }
        });
        
        // Если степень увеличилась
        if (newDegreeIndex > currentDegreeIndex) {
            console.log(`🎓 Повышение степени: ${CONFIG.degrees[currentDegreeIndex].name} → ${CONFIG.degrees[newDegreeIndex].name}`);
            
            // +1 ко всем статам за новую степень
            Object.keys(state.stats).forEach(stat => {
                state.stats[stat] = Math.min(100, state.stats[stat] + 1);
            });
            
            // Обновляем индекс степени
            state.degreeIndex = newDegreeIndex;
            
            // Активируем ритуал
            state.isRitualActive = true;
            state.ritualProgress = 0;
            state.ritualTarget = CONFIG.degrees[newDegreeIndex].lvl;
            
            console.log(`✨ Бонус степени: +1 ко всем характеристикам`);
            console.log(`🕯️ Начинается ритуал посвящения в ${CONFIG.degrees[newDegreeIndex].name}`);
            
            return {
                advanced: true,
                from: CONFIG.degrees[currentDegreeIndex],
                to: CONFIG.degrees[newDegreeIndex],
                statBonus: 1
            };
        }
        
        return { advanced: false };
    },
    
    /**
     * ОБРАБОТКА ИНВЕНТАРНЫХ ИЗМЕНЕНИЙ ОТ ИИ (НОВОЕ ПОЛЕ)
     */
    processInventoryChanges(state, inventoryChanges) {
        if (!inventoryChanges || typeof inventoryChanges !== 'object') {
            return;
        }
        
        // Добавление предметов
        if (inventoryChanges.add && Array.isArray(inventoryChanges.add)) {
            inventoryChanges.add.forEach(item => {
                const cleanItem = String(item).trim();
                if (cleanItem && !state.inventory.includes(cleanItem)) {
                    state.inventory.push(cleanItem);
                    console.log(`📦 ИИ добавил предмет: ${cleanItem}`);
                }
            });
        }
        
        // Удаление предметов
        if (inventoryChanges.remove && Array.isArray(inventoryChanges.remove)) {
            state.inventory = state.inventory.filter(item =>
                !inventoryChanges.remove.includes(String(item).trim())
            );
            inventoryChanges.remove.forEach(item => {
                console.log(`📦 ИИ удалил предмет: ${item}`);
            });
        }
    },
    
    /**
     * ОБРАБОТКА ИЗМЕНЕНИЙ ОТНОШЕНИЙ ОТ ИИ (НОВОЕ ПОЛЕ)
     */
    processRelationsChanges(state, relationsChanges) {
        if (!relationsChanges || typeof relationsChanges !== 'object') {
            return;
        }
        
        for (const [npc, change] of Object.entries(relationsChanges)) {
            const cleanNpc = String(npc).trim();
            const numChange = Number(change) || 0;
            
            if (!cleanNpc) continue;
            
            if (!state.relations[cleanNpc]) {
                state.relations[cleanNpc] = 0;
            }
            
            state.relations[cleanNpc] += numChange;
            // Ограничиваем диапазон -100..100
            state.relations[cleanNpc] = Math.max(-100, Math.min(100, state.relations[cleanNpc]));
            
            console.log(`🤝 ${cleanNpc}: ${state.relations[cleanNpc] - numChange} → ${state.relations[cleanNpc]} (${numChange > 0 ? '+' : ''}${numChange})`);
        }
    },
    
    /**
     * ОБРАБОТКА ДОБАВЛЕНИЯ НАВЫКА ОТ ИИ
     */
    processSkillAdd(state, skill) {
        if (!skill || typeof skill !== 'string') {
            return false;
        }
        
        const cleanSkill = skill.trim();
        if (!cleanSkill) return false;
        
        if (!state.skills) {
            state.skills = [];
        }
        
        // Проверяем, нет ли уже такого навыка
        if (!state.skills.includes(cleanSkill)) {
            state.skills.push(cleanSkill);
            console.log(`✨ Добавлен новый навык: ${cleanSkill}`);
            return true;
        }
        
        return false;
    },
    
    /**
     * ГЕНЕРАЦИЯ D10 ДЛЯ ХОДА
     * @returns {number} Случайное число от 1 до 10
     */
    generateD10() {
        return Math.ceil(Math.random() * 10);
    },
    
    /**
     * ТЕСТОВАЯ ФУНКЦИЯ ДЛЯ ОТЛАДКИ ФОРМУЛЫ
     */
    testFormula() {
        const testState = {
            stats: {
                will: 74,
                stealth: 56,
                influence: 29,
                sanity: 100
            }
        };
        
        console.log('🧪 Тестирование новой формулы:');
        console.log('Will 74 → база:', this.calculateStatBase(74), 'ожидается: 8');
        console.log('Stealth 56 → база:', this.calculateStatBase(56), 'ожидается: 6');
        console.log('Influence 29 → база:', this.calculateStatBase(29), 'ожидается: 3');
        console.log('Sanity 100 → база:', this.calculateStatBase(100), 'ожидается: 10');
        
        const testRequirements = {
            stats: { sanity: 12, stealth: 8 }
        };
        
        const d10 = 5;
        const check = this.checkRequirementsWithFormula(testRequirements, testState, d10);
        console.log('Проверка требований (sanity≥12, stealth≥8, d10=5):', check);
        console.log('Тип результата:', this.determineResultType(check));
    }
};