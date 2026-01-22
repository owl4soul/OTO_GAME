// Модуль 12: CALCULATIONS - Расчеты результатов (12-calculations.js)
'use strict';

import { CONFIG } from './1-config.js';
import { Utils } from './2-utils.js';

/**
 * Модуль для всех игровых расчетов
 */
export const Calculations = {
    /**
     * Тир результата действия на основе d10
     */
    actionResultTiers: {
        success: 6,      // d10 ≥ 6 = успех
        partial: 3,      // d10 ≥ 3 = частичный успех
        failure: 0       // d10 < 3 = провал
    },
    
    /**
     * Рассчитывает результат действия на основе требований и броска d10
     * @param {Object} choice - Объект выбора
     * @param {Object} state - Текущее состояние
     * @param {number} d10 - Результат броска d10
     * @returns {Object} {result, delta, appliedChanges}
     */
    calculateActionResult(choice, state, d10) {
        if (!choice || !state) {
            console.error('❌ Неверные параметры для calculateActionResult:', { choice, state });
            return {
                result: 'failure',
                delta: 'ошибка расчета',
                appliedChanges: { stats: {}, inventory_add: [], inventory_remove: [] }
            };
        }
        
        // 1. Проверка требований
        const requirementsMet = this.checkRequirements(choice.requirements, state);
        
        // 2. Определение результата на основе d10
        let result = 'failure';
        let appliedChanges = choice.failure_changes || { stats: {}, inventory_add: [], inventory_remove: [] };
        
        if (requirementsMet) {
            if (d10 >= this.actionResultTiers.success) {
                result = 'success';
                appliedChanges = choice.success_changes || { stats: {}, inventory_add: [], inventory_remove: [] };
            } else if (d10 >= this.actionResultTiers.partial) {
                result = 'partial';
                // Для частичного успеха используем 50% от успешных изменений
                appliedChanges = this.scaleChanges(choice.success_changes, 0.5);
            }
        }
        
        // 3. Форматирование дельты для отображения
        const delta = this.formatDelta(appliedChanges);
        
        return {
            result: result,
            delta: delta,
            appliedChanges: appliedChanges,
            d10: d10,
            requirementsMet: requirementsMet
        };
    },
    
    /**
     * Масштабирование изменений для частичного успеха
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
                scaled.stats[stat] = Math.round(Number(value) * factor);
            }
        }
        
        // Инвентарь: для частичного успеха только 50% шанс на добавление/удаление
        if (changes.inventory_add && Math.random() < factor) {
            scaled.inventory_add = [...changes.inventory_add];
        }
        
        if (changes.inventory_remove && Math.random() < factor) {
            scaled.inventory_remove = [...changes.inventory_remove];
        }
        
        return scaled;
    },
    
    /**
     * Проверка требований к действию
     */
    checkRequirements(requirements, state) {
        if (!requirements) return true;
        
        // Проверка статов
        if (requirements.stats && typeof requirements.stats === 'object') {
            for (const [rawStat, requiredValue] of Object.entries(requirements.stats)) {
                const statKey = Utils.normalizeStatKey(rawStat);
                if (!statKey) {
                    console.warn(`Неизвестная характеристика в требованиях: ${rawStat}`);
                    return false;
                }
                
                const currentValue = state.stats[statKey];
                if (currentValue === undefined) {
                    console.warn(`Характеристика ${statKey} не найдена в состоянии`);
                    return false;
                }
                
                if (currentValue < requiredValue) {
                    return false;
                }
            }
        }
        
        // Проверка инвентаря
        if (requirements.inventory && requirements.inventory !== null && requirements.inventory !== '') {
            const requiredItem = String(requirements.inventory).trim();
            if (requiredItem && !state.inventory.includes(requiredItem)) {
                return false;
            }
        }
        
        return true;
    },
    
    /**
     * Форматирование изменений в читаемую строку
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
     * Применение изменений от действия к состоянию
     */
    applyActionChanges(state, changes) {
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
     * Проверка достижения новой степени и применение бонусов
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
     * Обработка изменений инвентаря от ИИ
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
     * Обработка изменений отношений от ИИ
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
     * Обработка добавления навыка от ИИ
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
    }
};