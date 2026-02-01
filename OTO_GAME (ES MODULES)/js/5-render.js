// Модуль 5: RENDER - Отрисовка интерфейса (ФОРМАТ 4.1)
'use strict';

import { CONFIG } from './1-config.js';
import { State } from './3-state.js';
import { DOM } from './4-dom.js';
import { Utils } from './2-utils.js';
import { Game } from './6-game.js';
import { Audit } from './8-audit.js';

const dom = DOM.getDOM();
let thoughtsOfHeroInterval = null;

// ========== НОВЫЕ ФУНКЦИИ - НАЧАЛО ==========

// ====================================================================
// УЛУЧШЕННЫЕ ФУНКЦИИ ДЛЯ 5-render.js
// Версия: 2.0 - Blood Gothic + Industrial + Steampunk
// ====================================================================

// ====================================================================
// НОВАЯ ФУНКЦИЯ: Получение цвета для диапазона -100 до 100
// ====================================================================
function getRelationColor(value) {
    // Мапим -100...100 на 0...100 для использования существующей палитры
    const normalized = Math.max(0, Math.min(100, (value + 100) / 2));
    return getStatColor(normalized);
}

// ====================================================================
// НОВАЯ ФУНКЦИЯ: Получение описания стата по значению
// ====================================================================
function getStatDescription(statName, value) {
    const descriptions = {
        will: {
            0: "Полностью сломлен. Воля уничтожена.",
            10: "На грани капитуляции. Малейшее давление сломает.",
            20: "Глубокая деморализация. Самые простые решения даются с трудом.",
            30: "Слабая воля. Легко поддается манипуляциям.",
            40: "Неуверенность. Часто сомневается в своих решениях.",
            50: "Средняя воля. Обычный человек.",
            60: "Твердый характер. Не так-то просто сломить.",
            70: "Сильная воля. Упорство в достижении целей.",
            80: "Железная воля. Редко отступает от принципов.",
            90: "Несгибаемый. Почти невозможно подавить психологически.",
            100: "Титаническая воля. Абсолютная непоколебимость."
        },
        stealth: {
            0: "Абсолютно раскрыт. Все знают о вас всё.",
            10: "Крайне заметен. Ваши тайны - секрет полишинеля.",
            20: "Очевидная мишень. Следят все, кому не лень.",
            30: "Неумелый в сокрытии. Оставляете слишком много следов.",
            40: "Посредственная маскировка. Опытный взгляд вас вычислит.",
            50: "Обычная скрытность. Не выделяетесь в толпе.",
            60: "Хорошо умеете прятаться. Редко попадаетесь на глаза.",
            70: "Искусный в конспирации. Сложно отследить.",
            80: "Мастер теней. Почти невидимы для обывателей.",
            90: "Призрак. Даже профессионалы не всегда замечают.",
            100: "Абсолютная незримость. Вы - легенда, а не человек."
        },
        influence: {
            0: "Полный изгой. Слова не имеют веса.",
            10: "Презираемый. К вашему мнению не прислушиваются.",
            20: "Игнорируемый. Вас не воспринимают всерьез.",
            30: "Слабое влияние. Изредка вас слышат.",
            40: "Скромное положение. Мнение учитывается иногда.",
            50: "Средний авторитет. Равный среди равных.",
            60: "Уважаемый. Слова начинают что-то значить.",
            70: "Влиятельный. Многие прислушиваются к вам.",
            80: "Серьезная власть. Способны двигать людьми.",
            90: "Могущественный. Слова меняют судьбы.",
            100: "Абсолютная власть. Ваше слово - закон."
        },
        sanity: {
            0: "Безумие. Утрачена связь с реальностью.",
            10: "Психоз. Галлюцинации. Распад личности.",
            20: "На грани безумия. Реальность ускользает.",
            30: "Глубокое расстройство. Трудно отличить сон от яви.",
            40: "Нестабильная психика. Частые срывы.",
            50: "Нормальное психическое состояние.",
            60: "Ясный ум. Логическое мышление.",
            70: "Острый интеллект. Быстрая обработка информации.",
            80: "Выдающийся разум. Видите связи, скрытые от других.",
            90: "Гениальность. Почти сверхчеловеческая проницательность.",
            100: "Просветление. Абсолютная ясность сознания."
        }
    };
    
    const statDescriptions = descriptions[statName];
    if (!statDescriptions) return "Характеристика неизвестна";
    
    // Находим ближайший диапазон
    const val = Math.max(0, Math.min(100, value));
    const bracket = Math.floor(val / 10) * 10;
    
    return statDescriptions[bracket] || statDescriptions[50];
}

// ====================================================================
// УЛУЧШЕННАЯ ФУНКЦИЯ: renderStats с анимацией изменений
// ====================================================================
function renderStats() {
    console.log('🔍 renderStats called');
    
    const state = State.getState();
    
    // Сохраняем предыдущие значения для анимации изменений
    if (!window.previousBaseStats) {
        window.previousBaseStats = {};
    }
    
    // Базовые значения статов (без временных модификаторов)
    const baseStats = {
        will: State.getGameItemValue('stat:will') || 50,
        stealth: State.getGameItemValue('stat:stealth') || 50,
        influence: State.getGameItemValue('stat:influence') || 50,
        sanity: State.getGameItemValue('stat:sanity') || 50
    };
    
    // Получаем все активные временные эффекты
    const buffs = State.getGameItemsByType('buff:');
    const debuffs = State.getGameItemsByType('debuff:');
    
    // Группируем эффекты по статам
    const statEffects = {
        will: { buffs: [], debuffs: [] },
        stealth: { buffs: [], debuffs: [] },
        influence: { buffs: [], debuffs: [] },
        sanity: { buffs: [], debuffs: [] }
    };
    
    buffs.forEach(buff => {
        const [type, statName] = buff.id.split(':');
        if (statEffects[statName] && buff.value !== undefined) {
            statEffects[statName].buffs.push({
                value: buff.value,
                duration: buff.duration || 0,
                name: buff.description || 'Бафф'
            });
        }
    });
    
    debuffs.forEach(debuff => {
        const [type, statName] = debuff.id.split(':');
        if (statEffects[statName] && debuff.value !== undefined) {
            statEffects[statName].debuffs.push({
                value: debuff.value,
                duration: debuff.duration || 0,
                name: debuff.description || 'Дебафф'
            });
        }
    });
    
    // Обрабатываем каждый стат
    ['will', 'stealth', 'influence', 'sanity'].forEach(statName => {
        const valElement = dom.vals[statName];
        if (!valElement) return;
        
        const baseValue = baseStats[statName];
        const previousBase = window.previousBaseStats[statName] || baseValue;
        const { buffs: buffList, debuffs: debuffList } = statEffects[statName];
        
        // Суммируем все временные модификаторы
        const totalBuff = buffList.reduce((sum, b) => sum + b.value, 0);
        const totalDebuff = debuffList.reduce((sum, d) => sum + d.value, 0);
        const totalModifier = totalBuff + totalDebuff;
        const currentValue = baseValue + totalModifier;
        
        // Определяем цвет для текущего значения
        const currentColor = getStatColor(currentValue);
        
        // НОВАЯ ФИЧА: Анимация изменения (только для перманентных)
        const delta = baseValue - previousBase;
        if (delta !== 0) {
            showStatChangeAnimation(valElement, delta, currentColor);
        }
        
        // Сохраняем текущее значение для следующего раза
        window.previousBaseStats[statName] = baseValue;
        
        // Формируем строку с детализацией
        let detailHtml = '';
        
        if (buffList.length > 0 || debuffList.length > 0) {
            // Начинаем с базового значения
            detailHtml = `<span style="color: #888; font-size: 0.8em;">${baseValue}</span>`;
            
            // Добавляем баффы зеленым цветом
            buffList.forEach(buff => {
                if (buff.value > 0) {
                    detailHtml += ` <span style="color: #4cd137; font-size: 0.8em;">+${buff.value}[${buff.duration}]</span>`;
                }
            });
            
            // Добавляем дебаффы красным цветом
            debuffList.forEach(debuff => {
                if (debuff.value < 0) {
                    const absValue = Math.abs(debuff.value);
                    detailHtml += ` <span style="color: #e84118; font-size: 0.8em;">-${absValue}[${debuff.duration}]</span>`;
                }
            });
            
            // Формат для статов с временными модификаторами: две строки (компактно)
            valElement.innerHTML = `
                <div class="stat-container" style="display: flex; flex-direction: column; align-items: center; line-height: 1.1; gap: 1px; position: relative;">
                    <div style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
                        <span style="color: #999; font-size: 0.85em; white-space: nowrap;">${getRussianStatName(statName)}:</span>
                        <span class="stat-value-clickable" 
                              data-stat="${statName}" 
                              data-value="${currentValue}"
                              style="color: ${currentColor}; font-weight: bold; font-size: 1em; margin-left: 3px; cursor: help; text-shadow: 0 0 3px ${currentColor}40;">
                            ${currentValue}
                        </span>
                    </div>
                    <div style="font-size: 0.7em; color: #777; text-align: center; width: 100%; font-style: italic;">
                        ${detailHtml}
                    </div>
                </div>
            `;
        } else {
            // Формат для статов без временных модификаторов: одна строка (компактно)
            valElement.innerHTML = `
                <div class="stat-container" style="display: flex; justify-content: space-between; align-items: center; width: 100%; line-height: 1.1; min-height: 1.3em; position: relative;">
                    <span style="color: #999; font-size: 0.85em; white-space: nowrap;">${getRussianStatName(statName)}:</span>
                    <span class="stat-value-clickable" 
                          data-stat="${statName}" 
                          data-value="${currentValue}"
                          style="color: ${currentColor}; font-weight: bold; font-size: 1em; margin-left: 3px; cursor: help; text-shadow: 0 0 3px ${currentColor}40;">
                        ${currentValue}
                    </span>
                </div>
            `;
        }
        
        // Добавляем обработчики кликов для тултипов
        const clickableElements = valElement.querySelectorAll('.stat-value-clickable');
        clickableElements.forEach(el => {
            el.addEventListener('click', function() {
                const stat = this.dataset.stat;
                const value = parseInt(this.dataset.value);
                showStatTooltip(this, stat, value);
            });
        });
    });
    
    // Обновляем прогресс-бар (без изменений)
    const progressValue = State.getGameItemValue('progress:oto') || 0;
    const maxScore = 110;
    const pct = Math.min(100, Math.max(0, (progressValue / maxScore) * 100));
    if (dom.tube) {
        dom.tube.style.height = `${pct}%`;
    }
    
    // Обновляем степени инициализации (без изменений)
    const degreeItems = State.getGameItemsByType('initiation_degree:');
    const currentDegreeItem = degreeItems.find(item => item.value && item.value.trim() !== '');
    let currentDegreeIndex = 0;
    
    if (currentDegreeItem) {
        const degreeMatch = currentDegreeItem.value.match(/(\d+)°/);
        if (degreeMatch) {
            currentDegreeIndex = parseInt(degreeMatch[1]) || 0;
        }
    }
    
    if (dom.degrees) {
        dom.degrees.innerHTML = CONFIG.degrees.slice().reverse().map(d => {
            let cls = 'degree-item';
            if (d.lvl < currentDegreeIndex) cls += ' passed';
            if (d.lvl === currentDegreeIndex) cls += ' active';
            return `<div class="${cls}">${d.name}</div>`;
        }).join('');
    }
    
    console.log('✅ renderStats completed');
}

// ====================================================================
// НОВАЯ ФУНКЦИЯ: Анимация изменения стата (вылетающие цифры)
// ====================================================================
function showStatChangeAnimation(element, delta, color) {
    if (delta === 0) return;
    
    const container = element.querySelector('.stat-container');
    if (!container) return;
    
    const sign = delta > 0 ? '+' : '';
    const flyingNumber = document.createElement('div');
    flyingNumber.textContent = `${sign}${delta}`;
    flyingNumber.style.cssText = `
        position: absolute;
        top: 50%;
        right: -20px;
        font-size: 0.9em;
        font-weight: bold;
        color: ${delta > 0 ? '#4cd137' : '#e84118'};
        text-shadow: 0 0 5px ${delta > 0 ? '#4cd137' : '#e84118'};
        pointer-events: none;
        animation: flyUp 1.5s ease-out forwards;
        z-index: 1000;
    `;
    
    container.appendChild(flyingNumber);
    
    // Добавляем пульсацию к основному значению
    const valueEl = container.querySelector('.stat-value-clickable');
    if (valueEl) {
        valueEl.style.animation = 'statPulse 0.5s ease-in-out';
        setTimeout(() => {
            if (valueEl) valueEl.style.animation = '';
        }, 500);
    }
    
    // Удаляем элемент после анимации
    setTimeout(() => {
        if (flyingNumber && flyingNumber.parentNode) {
            flyingNumber.parentNode.removeChild(flyingNumber);
        }
    }, 1500);
}

// ====================================================================
// НОВАЯ ФУНКЦИЯ: Показ тултипа для стата
// ====================================================================
function showStatTooltip(element, statName, value) {
    // Удаляем предыдущий тултип если есть
    const existingTooltip = document.querySelector('.stat-tooltip');
    if (existingTooltip) {
        existingTooltip.remove();
    }
    
    const description = getStatDescription(statName, value);
    const color = getStatColor(value);
    
    const tooltip = document.createElement('div');
    tooltip.className = 'stat-tooltip';
    tooltip.innerHTML = `
        <div style="font-weight: bold; color: ${color}; margin-bottom: 5px; font-size: 1em; text-shadow: 0 0 5px ${color}40;">
            ${getRussianStatName(statName)}: ${value}/100
        </div>
        <div style="font-size: 0.85em; color: #ccc; line-height: 1.3; font-style: italic;">
            ${description}
        </div>
    `;
    
    tooltip.style.cssText = `
        position: fixed;
        background: linear-gradient(135deg, #1a0000 0%, #0d0d0d 100%);
        border: 1px solid ${color}60;
        border-radius: 4px;
        padding: 10px 12px;
        max-width: 250px;
        z-index: 10000;
        pointer-events: none;
        box-shadow: 0 0 20px ${color}20, 0 4px 8px rgba(0,0,0,0.7);
        animation: tooltipFadeIn 0.2s ease-out;
    `;
    
    // Позиционируем тултип
    const rect = element.getBoundingClientRect();
    tooltip.style.left = `${rect.left + window.scrollX}px`;
    tooltip.style.top = `${rect.bottom + window.scrollY + 5}px`;
    
    document.body.appendChild(tooltip);
    
    // Удаляем при клике вне или через 5 секунд
    const removeTooltip = () => {
        if (tooltip && tooltip.parentNode) {
            tooltip.style.animation = 'tooltipFadeOut 0.2s ease-out';
            setTimeout(() => {
                if (tooltip && tooltip.parentNode) {
                    tooltip.parentNode.removeChild(tooltip);
                }
            }, 200);
        }
        document.removeEventListener('click', removeTooltip);
    };
    
    setTimeout(() => {
        document.addEventListener('click', removeTooltip);
    }, 100);
    
    setTimeout(removeTooltip, 5000);
}

// ====================================================================
// ПОЛНОСТЬЮ ПЕРЕРАБОТАННАЯ ФУНКЦИЯ: renderAllGameItems
// С новой структурой и компактным дизайном
// ====================================================================
function renderAllGameItems() {
    console.log('🔍 renderAllGameItems called (Blood Gothic Industrial v2.0)');
    
    const personalityEl = document.getElementById('personalityDisplay');
    if (!personalityEl || !personalityEl.parentNode) {
        console.error('❌ Cannot find personalityDisplay container');
        return;
    }
    
    const container = personalityEl.parentNode;
    
    // Удаляем старое поле Личность из HTML (оно будет выведено в новом блоке)
    personalityEl.style.display = 'none';
    
    // Удаляем все управляемые контейнеры
    const managedIds = [
        'personalityBlockContainer', // НОВЫЙ БЛОК
        'typologyContainer',
        'relationsContainer',
        'skillsContainer',
        'blessingsContainer',
        'cursesContainer',
        'buffsDebuffsContainer', // ПЕРЕИМЕНОВАННЫЙ
        'effectsContainer', // НОВЫЙ
        'inventoryContainer'
    ];
    
    managedIds.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.remove();
    });
    
    const fragment = document.createDocumentFragment();
    
    const state = State.getState();
    
    // =============================================
    // БЛОК 1: ЛИЧНОСТЬ (НОВЫЙ!) - над Типологией
    // =============================================
    const personalityVal = State.getGameItemValue('personality:hero');
    
    if (personalityVal && personalityVal.trim() !== '') {
        const personalityBlock = document.createElement('div');
        personalityBlock.id = 'personalityBlockContainer';
        personalityBlock.className = 'game-item-section';
        personalityBlock.innerHTML = `
            <div class="section-header" style="color: #c084fc; border-bottom: 1px solid #4a044e;">
                <i class="fas fa-brain"></i> ЛИЧНОСТЬ
            </div>
            <div class="section-content" style="font-size: 0.75em; color: #ccc; line-height: 1.3; font-style: italic; padding: 3px 0;">
                ${personalityVal}
            </div>
        `;
        fragment.appendChild(personalityBlock);
    }
    
    // =============================================
    // БЛОК 2: ТИПОЛОГИЯ - без изменений по логике
    // =============================================
    const typologyVal = state.gameState.currentScene ? state.gameState.currentScene.typology : null;
    
    const typologyDiv = document.createElement('div');
    typologyDiv.id = 'typologyContainer';
    typologyDiv.className = 'game-item-section';
    typologyDiv.innerHTML = `
        <div class="section-header" style="color: #1dd1a1; border-bottom: 1px solid #0a3622;">
            <i class="fas fa-fingerprint"></i> ТИПОЛОГИЯ
        </div>
        <div class="section-content" style="font-size: 0.75em; color: ${typologyVal ? '#ccc' : '#555'}; line-height: 1.3; ${typologyVal ? 'font-style: italic;' : ''} padding: 3px 0;">
            ${typologyVal || 'Не определена...'}
        </div>
    `;
    fragment.appendChild(typologyDiv);
    
    // =============================================
    // БЛОК 3: ОТНОШЕНИЯ - С ЦВЕТОВОЙ ШКАЛОЙ -100 до 100
    // =============================================
    const relationsItems = State.getGameItemsByType('relations:');
    
    if (relationsItems && relationsItems.length > 0) {
        const relationsDiv = document.createElement('div');
        relationsDiv.id = 'relationsContainer';
        relationsDiv.className = 'game-item-section';
        
        let relationsHTML = '';
        relationsItems.forEach(rel => {
            const name = rel.id.split(':')[1].replace(/_/g, ' ');
            const value = parseInt(rel.value) || 0;
            const color = getRelationColor(value);
            const description = rel.description || '';
            
            relationsHTML += `
                <div class="game-item-badge relation-badge" 
                     onclick="showGameItemTooltip(this, ${JSON.stringify(rel).replace(/"/g, '&quot;')})"
                     style="background: linear-gradient(135deg, #1a0a0a 0%, #0d0505 100%); 
                            border: 1px solid ${color}40; 
                            padding: 2px 6px; 
                            cursor: help;
                            transition: all 0.2s;">
                    <span style="color: #ff9ff3; font-size: 0.75em;">🤝</span>
                    <span style="color: #ccc; font-size: 0.75em; margin: 0 3px;">${name}:</span>
                    <span style="color: ${color}; font-weight: bold; font-size: 0.8em; text-shadow: 0 0 3px ${color}40;">${value}</span>
                </div>
            `;
        });
        
        relationsDiv.innerHTML = `
            <div class="section-header" style="color: #ff9ff3; border-bottom: 1px solid #4a0438;">
                <i class="fas fa-people-arrows"></i> ОТНОШЕНИЯ (${relationsItems.length})
            </div>
            <div class="section-content" style="display: flex; flex-wrap: wrap; gap: 3px; padding: 3px 0;">
                ${relationsHTML}
            </div>
        `;
        fragment.appendChild(relationsDiv);
    }
    
    // =============================================
    // БЛОК 4: НАВЫКИ
    // =============================================
    const skillsItems = State.getGameItemsByType('skill:');
    
    if (skillsItems && skillsItems.length > 0) {
        const skillsDiv = document.createElement('div');
        skillsDiv.id = 'skillsContainer';
        skillsDiv.className = 'game-item-section';
        
        let skillsHTML = '';
        skillsItems.forEach(skill => {
            const name = skill.value || skill.id.split(':')[1];
            const description = skill.description || '';
            
            skillsHTML += `
                <div class="game-item-badge" 
                     onclick="showGameItemTooltip(this, ${JSON.stringify(skill).replace(/"/g, '&quot;')})"
                     style="background: linear-gradient(135deg, #0a0a1a 0%, #050510 100%); 
                            border: 1px solid #9c88ff40; 
                            padding: 2px 6px; 
                            cursor: help;">
                    <span style="color: #9c88ff; font-size: 0.75em;">📜</span>
                    <span style="color: #ddd; font-size: 0.75em; margin-left: 2px;">${name}</span>
                </div>
            `;
        });
        
        skillsDiv.innerHTML = `
            <div class="section-header" style="color: #9c88ff; border-bottom: 1px solid #2a1a4a;">
                <i class="fas fa-scroll"></i> НАВЫКИ (${skillsItems.length})
            </div>
            <div class="section-content" style="display: flex; flex-wrap: wrap; gap: 3px; padding: 3px 0;">
                ${skillsHTML}
            </div>
        `;
        fragment.appendChild(skillsDiv);
    }
    
    // =============================================
    // БЛОК 5: БЛАГОСЛОВЕНИЯ
    // =============================================
    const blessItems = State.getGameItemsByType('bless:');
    
    if (blessItems && blessItems.length > 0) {
        const blessDiv = document.createElement('div');
        blessDiv.id = 'blessingsContainer';
        blessDiv.className = 'game-item-section';
        
        let blessHTML = '';
        blessItems.forEach(bless => {
            const name = bless.value || bless.id.split(':')[1];
            const duration = bless.duration !== undefined ? `[${bless.duration}]` : '';
            
            blessHTML += `
                <div class="game-item-badge" 
                     onclick="showGameItemTooltip(this, ${JSON.stringify(bless).replace(/"/g, '&quot;')})"
                     style="background: linear-gradient(135deg, #1a1a0a 0%, #0d0d05 100%); 
                            border: 1px solid #fbc53140; 
                            padding: 2px 6px; 
                            cursor: help;">
                    <span style="color: #fbc531; font-size: 0.75em;">✨</span>
                    <span style="color: #ddd; font-size: 0.75em; margin-left: 2px;">${name}</span>
                    ${duration ? `<span style="color: #888; font-size: 0.7em; margin-left: 2px;">${duration}</span>` : ''}
                </div>
            `;
        });
        
        blessDiv.innerHTML = `
            <div class="section-header" style="color: #fbc531; border-bottom: 1px solid #4a3a0a;">
                <i class="fas fa-star"></i> БЛАГОСЛОВЕНИЯ (${blessItems.length})
            </div>
            <div class="section-content" style="display: flex; flex-wrap: wrap; gap: 3px; padding: 3px 0;">
                ${blessHTML}
            </div>
        `;
        fragment.appendChild(blessDiv);
    }
    
    // =============================================
    // БЛОК 6: ПРОКЛЯТИЯ
    // =============================================
    const curseItems = State.getGameItemsByType('curse:');
    
    if (curseItems && curseItems.length > 0) {
        const curseDiv = document.createElement('div');
        curseDiv.id = 'cursesContainer';
        curseDiv.className = 'game-item-section';
        
        let curseHTML = '';
        curseItems.forEach(curse => {
            const name = curse.value || curse.id.split(':')[1];
            const duration = curse.duration !== undefined ? `[${curse.duration}]` : '';
            
            curseHTML += `
                <div class="game-item-badge" 
                     onclick="showGameItemTooltip(this, ${JSON.stringify(curse).replace(/"/g, '&quot;')})"
                     style="background: linear-gradient(135deg, #1a0000 0%, #0d0000 100%); 
                            border: 1px solid #c2361640; 
                            padding: 2px 6px; 
                            cursor: help;">
                    <span style="color: #c23616; font-size: 0.75em;">💀</span>
                    <span style="color: #ddd; font-size: 0.75em; margin-left: 2px;">${name}</span>
                    ${duration ? `<span style="color: #888; font-size: 0.7em; margin-left: 2px;">${duration}</span>` : ''}
                </div>
            `;
        });
        
        curseDiv.innerHTML = `
            <div class="section-header" style="color: #c23616; border-bottom: 1px solid #4a0a0a;">
                <i class="fas fa-skull-crossbones"></i> ПРОКЛЯТИЯ (${curseItems.length})
            </div>
            <div class="section-content" style="display: flex; flex-wrap: wrap; gap: 3px; padding: 3px 0;">
                ${curseHTML}
            </div>
        `;
        fragment.appendChild(curseDiv);
    }
    
    // =============================================
    // БЛОК 7: БАФФЫ/ДЕБАФФЫ К СТАТАМ (ПЕРЕИМЕНОВАННЫЙ)
    // =============================================
    const buffsItems = State.getGameItemsByType('buff:');
    const debuffsItems = State.getGameItemsByType('debuff:');
    const statBuffsDebuffs = [...buffsItems, ...debuffsItems];
    
    if (statBuffsDebuffs && statBuffsDebuffs.length > 0) {
        const buffsDebuffsDiv = document.createElement('div');
        buffsDebuffsDiv.id = 'buffsDebuffsContainer';
        buffsDebuffsDiv.className = 'game-item-section';
        
        let itemsHTML = '';
        statBuffsDebuffs.forEach(item => {
            const isBuff = item.id.startsWith('buff:');
            const statName = item.id.split(':')[1];
            const russianName = getRussianStatName(statName);
            const value = item.value || 0;
            const sign = value > 0 ? '+' : '';
            const duration = item.duration !== undefined ? `[${item.duration}]` : '';
            const color = isBuff ? '#4cd137' : '#e84118';
            const icon = isBuff ? '⬆️' : '⬇️';
            
            itemsHTML += `
                <div class="game-item-badge" 
                     onclick="showGameItemTooltip(this, ${JSON.stringify(item).replace(/"/g, '&quot;')})"
                     style="background: linear-gradient(135deg, ${isBuff ? '#0a1a0a' : '#1a0a0a'} 0%, ${isBuff ? '#051005' : '#0d0505'} 100%); 
                            border: 1px solid ${color}40; 
                            padding: 2px 6px; 
                            cursor: help;">
                    <span style="color: ${color}; font-size: 0.75em;">${icon}</span>
                    <span style="color: #ccc; font-size: 0.75em; margin: 0 2px;">${russianName}${sign}${value}</span>
                    ${duration ? `<span style="color: #888; font-size: 0.7em;">${duration}</span>` : ''}
                </div>
            `;
        });
        
        buffsDebuffsDiv.innerHTML = `
            <div class="section-header" style="color: #48dbfb; border-bottom: 1px solid #0a3a4a;">
                <i class="fas fa-tachometer-alt"></i> БАФФЫ/ДЕБАФФЫ (${statBuffsDebuffs.length})
            </div>
            <div class="section-content" style="display: flex; flex-wrap: wrap; gap: 3px; padding: 3px 0;">
                ${itemsHTML}
            </div>
        `;
        fragment.appendChild(buffsDebuffsDiv);
    }
    
    // =============================================
    // БЛОК 8: ЭФФЕКТЫ/ВОЗДЕЙСТВИЯ (НОВЫЙ!) - Неизвестные типы
    // =============================================
    const knownPrefixes = ['stat:', 'skill:', 'inventory:', 'relations:', 'bless:', 'curse:', 
                           'buff:', 'debuff:', 'personality:', 'initiation_degree:', 'progress:'];
    
    const allItems = state.heroState || [];
    const unknownItems = allItems.filter(item => {
        return !knownPrefixes.some(prefix => item.id.startsWith(prefix));
    });
    
    if (unknownItems && unknownItems.length > 0) {
        const effectsDiv = document.createElement('div');
        effectsDiv.id = 'effectsContainer';
        effectsDiv.className = 'game-item-section';
        
        let effectsHTML = '';
        unknownItems.forEach(item => {
            const [type, name] = item.id.split(':');
            const displayName = item.value || name || item.id;
            const duration = item.duration !== undefined ? `[${item.duration}]` : '';
            
            effectsHTML += `
                <div class="game-item-badge" 
                     onclick="showGameItemTooltip(this, ${JSON.stringify(item).replace(/"/g, '&quot;')})"
                     style="background: linear-gradient(135deg, #1a1a1a 0%, #0d0d0d 100%); 
                            border: 1px solid #88888840; 
                            padding: 2px 6px; 
                            cursor: help;">
                    <span style="color: #888; font-size: 0.75em;">❓</span>
                    <span style="color: #aaa; font-size: 0.75em; margin-left: 2px;">${displayName}</span>
                    ${duration ? `<span style="color: #666; font-size: 0.7em; margin-left: 2px;">${duration}</span>` : ''}
                </div>
            `;
        });
        
        effectsDiv.innerHTML = `
            <div class="section-header" style="color: #888; border-bottom: 1px solid #333;">
                <i class="fas fa-question-circle"></i> ЭФФЕКТЫ/ВОЗДЕЙСТВИЯ (${unknownItems.length})
            </div>
            <div class="section-content" style="display: flex; flex-wrap: wrap; gap: 3px; padding: 3px 0;">
                ${effectsHTML}
            </div>
        `;
        fragment.appendChild(effectsDiv);
    }
    
    // =============================================
    // БЛОК 9: ИНВЕНТАРЬ
    // =============================================
    const inventoryItems = State.getGameItemsByType('inventory:');
    
    if (inventoryItems && inventoryItems.length > 0) {
        const invDiv = document.createElement('div');
        invDiv.id = 'inventoryContainer';
        invDiv.className = 'game-item-section';
        
        let invHTML = '';
        inventoryItems.forEach(item => {
            const name = item.value || item.id.split(':')[1];
            
            invHTML += `
                <div class="game-item-badge" 
                     onclick="showGameItemTooltip(this, ${JSON.stringify(item).replace(/"/g, '&quot;')})"
                     style="background: linear-gradient(135deg, #0a1a1a 0%, #051010 100%); 
                            border: 1px solid #00a8ff40; 
                            padding: 2px 6px; 
                            cursor: help;">
                    <span style="color: #00a8ff; font-size: 0.75em;">📦</span>
                    <span style="color: #ddd; font-size: 0.75em; margin-left: 2px;">${name}</span>
                </div>
            `;
        });
        
        invDiv.innerHTML = `
            <div class="section-header" style="color: #00a8ff; border-bottom: 1px solid #0a2a3a;">
                <i class="fas fa-box"></i> ИНВЕНТАРЬ (${inventoryItems.length})
            </div>
            <div class="section-content" style="display: flex; flex-wrap: wrap; gap: 3px; padding: 3px 0;">
                ${invHTML}
            </div>
        `;
        fragment.appendChild(invDiv);
    }
    
    // Добавляем все в DOM
    container.appendChild(fragment);
    
    console.log('✅ renderAllGameItems completed (Blood Gothic Industrial v2.0)');
}

// ====================================================================
// Показ тултипа для game_item со всеми полями
// ====================================================================
function showGameItemTooltip(element, itemData) {
    // Удаляем предыдущий тултип если есть
    const existingTooltip = document.querySelector('.gameitem-tooltip');
    if (existingTooltip) {
        existingTooltip.remove();
    }
    
    const item = typeof itemData === 'string' ? JSON.parse(itemData) : itemData;
    
    const tooltip = document.createElement('div');
    tooltip.className = 'gameitem-tooltip';
    
    // Формируем содержимое тултипа со ВСЕМИ непустыми полями
    let content = `<div style="font-weight: bold; color: #fbc531; margin-bottom: 8px; font-size: 0.95em; border-bottom: 1px solid #444; padding-bottom: 4px;">
        ${getGameItemIcon(item.id)} ${item.id}
    </div>`;
    
    // Список полей для отображения
    const fields = [
        { key: 'value', label: 'Значение', color: '#4cd137' },
        { key: 'description', label: 'Описание', color: '#ccc' },
        { key: 'duration', label: 'Длительность', color: '#48dbfb' },
        { key: 'max', label: 'Максимум', color: '#888' },
        { key: 'min', label: 'Минимум', color: '#888' }
    ];
    
    fields.forEach(field => {
        if (item[field.key] !== undefined && item[field.key] !== null && item[field.key] !== '') {
            content += `
                <div style="margin: 4px 0; font-size: 0.85em;">
                    <span style="color: ${field.color}; font-style: italic;">${field.label}:</span>
                    <span style="color: #ddd; margin-left: 4px;">${item[field.key]}</span>
                </div>
            `;
        }
    });
    
    tooltip.innerHTML = content;
    
    tooltip.style.cssText = `
        position: fixed;
        background: linear-gradient(135deg, #1a0a0a 0%, #0d0505 100%);
        border: 1px solid #fbc53160;
        border-radius: 4px;
        padding: 10px 12px;
        max-width: 300px;
        z-index: 10000;
        pointer-events: none;
        box-shadow: 0 0 20px #fbc53120, 0 4px 8px rgba(0,0,0,0.7);
        animation: tooltipFadeIn 0.2s ease-out;
        font-family: 'Courier New', monospace;
    `;
    
    // Позиционируем тултип
    const rect = element.getBoundingClientRect();
    tooltip.style.left = `${rect.left + window.scrollX}px`;
    tooltip.style.top = `${rect.bottom + window.scrollY + 5}px`;
    
    document.body.appendChild(tooltip);
    
    // Удаляем при клике вне или через 7 секунд
    const removeTooltip = () => {
        if (tooltip && tooltip.parentNode) {
            tooltip.style.animation = 'tooltipFadeOut 0.2s ease-out';
            setTimeout(() => {
                if (tooltip && tooltip.parentNode) {
                    tooltip.parentNode.removeChild(tooltip);
                }
            }, 200);
        }
        document.removeEventListener('click', removeTooltip);
    };
    
    setTimeout(() => {
        document.addEventListener('click', removeTooltip);
    }, 100);
    
    setTimeout(removeTooltip, 7000);
}



// ====================================================================
// "ИЗМЕНЕНИЯ ЗА ПОСЛЕДНИЙ ХОД" с полной детализацией
// ====================================================================
function renderHistory() {
    const state = State.getState();
    
    dom.hist.innerHTML = '';
    
    // Если истории нет - показываем заглушку
    if (!state.gameState.history || state.gameState.history.length === 0) {
        dom.hist.innerHTML = `
            <div style="padding: 15px; text-align: center; color: #555; font-style: italic; font-size: 0.85em;">
                История пуста. Сделайте первый ход.
            </div>
        `;
        return;
    }
    
    // Берем только последний элемент истории
    const lastEntry = state.gameState.history[state.gameState.history.length - 1];
    
    if (!lastEntry) return;
    
    // Получаем текущую сцену для извлечения дополнительных полей
    const currentScene = state.gameState.currentScene || {};
    
    // Формируем блок изменений за последний ход
    const changesBlock = document.createElement('div');
    changesBlock.className = 'last-turn-changes blood-gothic-panel';
    changesBlock.style.cssText = `
        background: linear-gradient(135deg, #0d0000 0%, #000000 100%);
        border: 1px solid #4a0a0a;
        border-radius: 4px;
        padding: 8px;
        margin-bottom: 10px;
        box-shadow: 0 0 15px #4a0a0a30;
    `;
    
    let content = '';
    
    // ============= ЗАГОЛОВОК =============
    content += `
        <div style="font-weight: bold; 
                    color: #e84118; 
                    font-size: 0.9em; 
                    margin-bottom: 8px; 
                    border-bottom: 1px solid #4a0a0a; 
                    padding-bottom: 4px;
                    text-shadow: 0 0 5px #e8411840;
                    display: flex;
                    align-items: center;
                    gap: 6px;">
            <i class="fas fa-history"></i>
            ИЗМЕНЕНИЯ ЗА ПОСЛЕДНИЙ ХОД
        </div>
    `;
    
    // ============= DESIGN_NOTES (если есть) =============
    if (currentScene.design_notes && currentScene.design_notes.trim() !== '') {
        content += `
            <div style="margin-bottom: 6px; padding: 4px; background: #0a0000; border-left: 2px solid #666; border-radius: 2px;">
                <div style="color: #888; font-size: 0.7em; font-style: italic; margin-bottom: 2px;">
                    <i class="fas fa-pencil-alt"></i> Заметки дизайнера:
                </div>
                <div style="color: #aaa; font-size: 0.75em; line-height: 1.3;">
                    ${currentScene.design_notes}
                </div>
            </div>
        `;
    }
    
    // ============= AI_MEMORY (если есть) =============
    if (currentScene.aiMemory && Object.keys(currentScene.aiMemory).length > 0) {
        const memoryEntries = Object.entries(currentScene.aiMemory)
            .map(([key, value]) => `<span style="color: #888;">${key}:</span> <span style="color: #ccc;">${value}</span>`)
            .join('<br>');
        
        content += `
            <div style="margin-bottom: 6px; padding: 4px; background: #0a0a00; border-left: 2px solid #fbc531; border-radius: 2px;">
                <div style="color: #fbc531; font-size: 0.7em; font-style: italic; margin-bottom: 2px;">
                    <i class="fas fa-brain"></i> Память ГМ:
                </div>
                <div style="color: #aaa; font-size: 0.75em; line-height: 1.3;">
                    ${memoryEntries}
                </div>
            </div>
        `;
    }
    
    // ============= SUMMARY (если есть) =============
    if (currentScene.summary && currentScene.summary.trim() !== '') {
        content += `
            <div style="margin-bottom: 6px; padding: 4px; background: #00000a; border-left: 2px solid #48dbfb; border-radius: 2px;">
                <div style="color: #48dbfb; font-size: 0.7em; font-style: italic; margin-bottom: 2px;">
                    <i class="fas fa-file-alt"></i> Сводка:
                </div>
                <div style="color: #aaa; font-size: 0.75em; line-height: 1.3;">
                    ${currentScene.summary}
                </div>
            </div>
        `;
    }
    
    // ============= ИЗМЕНЕНИЯ GAME_ITEMS =============
    // Парсим строку изменений из lastEntry.changes
    const changesText = lastEntry.changes || '';
    
    if (changesText && changesText !== 'Нет явных изменений') {
        // Разбираем изменения на отдельные операции
        // Формат может быть разным, поэтому делаем универсальный парсер
        
        const operations = parseChangesText(changesText);
        
        if (operations && operations.length > 0) {
            content += `
                <div style="margin-bottom: 6px; padding: 4px; background: #0a0a0a; border-left: 2px solid #4cd137; border-radius: 2px;">
                    <div style="color: #4cd137; font-size: 0.7em; font-style: italic; margin-bottom: 3px;">
                        <i class="fas fa-exchange-alt"></i> Изменения характеристик:
                    </div>
                    <div style="display: flex; flex-direction: column; gap: 2px;">
            `;
            
            operations.forEach(op => {
                content += renderOperationLine(op);
            });
            
            content += `
                    </div>
                </div>
            `;
        }
    }
    
    // ============= ДЕЙСТВИЯ ИГРОКА =============
    // Извлекаем действия из actionResults или fallback к старому полю choice
    const actions = lastEntry.actionResults || [];
    
    if (actions && actions.length > 0) {
        content += `
            <div style="margin-bottom: 6px; padding: 4px; background: #0a0000; border-left: 2px solid #9c88ff; border-radius: 2px;">
                <div style="color: #9c88ff; font-size: 0.7em; font-style: italic; margin-bottom: 3px;">
                    <i class="fas fa-hand-point-right"></i> Ваши действия:
                </div>
                <div style="display: flex; flex-direction: column; gap: 2px;">
        `;
        
        actions.forEach(action => {
            const statusIcon = action.success ? '✅' : action.partial_success ? '⚠️' : '❌';
            const statusColor = action.success ? '#4cd137' : action.partial_success ? '#fbc531' : '#e84118';
            const statusText = action.success ? 'УСПЕХ' : action.partial_success ? 'ЧАСТИЧНЫЙ' : 'ПРОВАЛ';
            
            content += `
                <div style="font-size: 0.75em; padding: 2px 0; color: #ddd;">
                    <span style="color: ${statusColor};">${statusIcon}</span>
                    <span style="color: #ccc;">"${action.text}"</span>
                    <span style="color: ${statusColor}; font-weight: bold; margin-left: 4px;">${statusText}</span>
                    <span style="color: #888; font-size: 0.9em; margin-left: 4px;">(сложность: ${action.difficulty_level})</span>
                </div>
            `;
        });
        
        content += `
                </div>
            </div>
        `;
    } else if (lastEntry.choice) {
        // Fallback к старому формату
        content += `
            <div style="margin-bottom: 6px; padding: 4px; background: #0a0000; border-left: 2px solid #9c88ff; border-radius: 2px;">
                <div style="color: #9c88ff; font-size: 0.7em; font-style: italic; margin-bottom: 2px;">
                    <i class="fas fa-hand-point-right"></i> Ваш выбор:
                </div>
                <div style="font-size: 0.75em; color: #ccc;">
                    ${lastEntry.choice}
                </div>
            </div>
        `;
    }
    
    // ============= ПОЛНЫЙ ТЕКСТ СЦЕНЫ (если есть) =============
    if (lastEntry.fullText && lastEntry.fullText.trim() !== '') {
        content += `
            <div style="margin-top: 8px; padding: 4px; background: #000005; border-left: 2px solid #555; border-radius: 2px;">
                <details style="cursor: pointer;">
                    <summary style="color: #888; font-size: 0.7em; font-style: italic; user-select: none;">
                        <i class="fas fa-book-open"></i> Показать полный текст сцены
                    </summary>
                    <div style="margin-top: 6px; font-size: 0.75em; color: #aaa; line-height: 1.4; max-height: 300px; overflow-y: auto;">
                        ${lastEntry.fullText}
                    </div>
                </details>
            </div>
        `;
    }
    
    changesBlock.innerHTML = content;
    dom.hist.appendChild(changesBlock);
    
    // ВАЖНО: Прокручиваем к началу блока изменений
    setTimeout(() => {
        if (changesBlock && changesBlock.scrollIntoView) {
            changesBlock.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }, 100);
}

// ====================================================================
// ВСПОМОГАТЕЛЬНАЯ ФУНКЦИЯ: Парсинг текста изменений
// ====================================================================
function parseChangesText(changesText) {
    const operations = [];
    
    // Пытаемся найти упоминания операций
    // Формат может быть: "Воля +2, Разум -1, добавлен Навык: Наблюдательность" и т.д.
    
    // Паттерны для разных типов операций
    const patterns = [
        // MODIFY: "Воля +2" или "will +2"
        /(\w+)\s*([\+\-])\s*(\d+)/g,
        // ADD/REMOVE: "добавлен X" или "удалён X"
        /(добавлен[а-я]*|удалён[а-я]*|получен[а-я]*)\s+([^,\.]+)/gi,
        // SET: "X установлено на Y"
        /([^,]+)\s+установлен[о|а|ы]\s+на\s+([^,\.]+)/gi
    ];
    
    // Для простоты, возвращаем пустой массив если текст сложный
    // В реальности, лучше парсить структурированные данные из API
    
    // Простой парсер для MODIFY операций
    let match;
    const modifyPattern = /(\w+)\s*([\+\-])\s*(\d+)/g;
    while ((match = modifyPattern.exec(changesText)) !== null) {
        operations.push({
            type: 'MODIFY',
            target: match[1],
            delta: parseInt(match[2] + match[3])
        });
    }
    
    return operations;
}

// ====================================================================
// ВСПОМОГАТЕЛЬНАЯ ФУНКЦИЯ: Рендеринг одной строки операции
// ====================================================================
function renderOperationLine(operation) {
    if (!operation) return '';
    
    let icon = '🔄';
    let color = '#ccc';
    let text = '';
    
    switch (operation.type) {
        case 'MODIFY':
            icon = operation.delta > 0 ? '⬆️' : '⬇️';
            color = operation.delta > 0 ? '#4cd137' : '#e84118';
            const sign = operation.delta > 0 ? '+' : '';
            text = `${operation.target} ${sign}${operation.delta}`;
            break;
        case 'ADD':
            icon = '➕';
            color = '#4cd137';
            text = `Добавлено: ${operation.target}`;
            break;
        case 'REMOVE':
            icon = '➖';
            color = '#e84118';
            text = `Удалено: ${operation.target}`;
            break;
        case 'SET':
            icon = '📝';
            color = '#48dbfb';
            text = `${operation.target} → ${operation.value}`;
            break;
        default:
            text = JSON.stringify(operation);
    }
    
    return `
        <div style="font-size: 0.75em; padding: 2px 0; color: #ddd;">
            <span style="font-size: 0.9em;">${icon}</span>
            <span style="color: ${color}; margin-left: 3px;">${text}</span>
        </div>
    `;
}

// ========== НОВЫЕ ФУНКЦИИ - КОНЕЦ ==========

// Получение цвета по значению стата (0-100)
function getStatColor(value) {
    // Значение от 0 до 100 для градиента
    const val = Math.max(0, Math.min(100, value));
    
    // Градиент от тёмно-красного до белого через 10 промежуточных цветов
    if (val <= 10) return '#800000'; // тёмно-красный
    if (val <= 20) return '#FF0000'; // красный
    if (val <= 30) return '#FF5500'; // оранжевый
    if (val <= 40) return '#FFAA00'; // оранжево-желтый
    if (val <= 50) return '#FFD700'; // золотой (жёлтый)
    if (val <= 60) return '#ADFF2F'; // салатовый
    if (val <= 70) return '#00FF00'; // зелёный
    if (val <= 80) return '#20B2AA'; // цвет морской волны
    if (val <= 90) return '#87CEEB'; // цвет неба
    return '#FFFFFF'; // белый (100)
}

// Подписка на события состояния
function setupStateObservers() {
    console.log('🔍 Настройка подписок на события состояния...');
    
    State.onHeroChange((data) => {
        console.log('🎯 Событие: hero:changed', data);
        renderStats();
        renderAllGameItems();
    });
    
    State.onSceneChange((data) => {
        console.log('🎯 Событие: scene:changed', data);
        renderScene();
        renderChoices();
    });
    
    State.onTurnComplete((data) => {
        console.log('🎯 Событие: turn:completed', data);
        renderHistory();
        if (dom.turnCounter) {
            dom.turnCounter.innerHTML = `ХОДЫ: <span style="color: #888; font-family: monospace;">${State.getTurnCount()}</span>`;
        }
    });
    
    State.onSettingsChange(() => {
        updateApiKeyFields();
        renderModelSelectorByProvider();
        updateModelDetails();
    });
    
    State.on(State.EVENTS.UI_STATE_CHANGED, () => {
        updateUIMode();
    });
    
    State.on(State.EVENTS.SCALE_CHANGED, (data) => {
        console.log('🎯 Событие: scale:changed', data);
    });
    
    State.on(State.EVENTS.HERO_STATS_UPDATED, (data) => {
        if (data.id && data.id.startsWith('stat:')) {
            renderStats();
        }
    });
    
    State.on(State.EVENTS.HERO_ITEM_ADDED, (data) => {
        if (data.id.startsWith('inventory:')) {
            renderAllGameItems();
        }
    });
    
    State.on(State.EVENTS.HERO_ITEM_REMOVED, (data) => {
        if (data.id.startsWith('inventory:')) {
            renderAllGameItems();
        }
    });
    
    console.log('✅ Подписки на события настроены');
}

function getGameItemIcon(id) {
    if (!id) return '❓';
    const [type] = id.split(':');
    switch (type) {
        case 'stat': return '📊';
        case 'skill': return '📜';
        case 'inventory': return '📦';
        case 'relations': return '🤝';
        case 'bless': return '✨';
        case 'curse': return '💀';
        case 'buff': return '⬆️';
        case 'debuff': return '⬇️';
        case 'personality': return '🧠';
        case 'initiation_degree': return '🎓';
        case 'progress': return '📈';
        default: return '❓';
    }
}

function getGameItemName(id) {
    if (!id) return '';
    const [type, name] = id.split(':');
    if (type === 'stat') {
        return getRussianStatName(name);
    }
    if (type === 'relations') {
        return name.replace(/_/g, ' ');
    }
    return name;
}

function updateApiKeyFields() {
    const state = State.getState();
    
    Object.values(dom.keyFields).forEach(field => {
        field.classList.remove('active');
    });
    
    if (state.settings.apiProvider === 'openrouter') {
        dom.keyFields.openrouter.classList.add('active');
    } else if (state.settings.apiProvider === 'vsegpt') {
        dom.keyFields.vsegpt.classList.add('active');
    }
}

function renderModelSelectorByProvider() {
    const state = State.getState();
    const select = dom.inputs.model;
    const currentProvider = state.settings.apiProvider;
    
    select.innerHTML = '';
    
    const filteredModels = state.models.filter(m => m.provider === currentProvider);
    
    if (filteredModels.length === 0) {
        select.innerHTML = '<option value="">Нет доступных моделей для этого провайдера</option>';
        return;
    }
    
    filteredModels.forEach(model => {
        const opt = document.createElement('option');
        opt.value = model.id;
        opt.text = `${Utils.getStatusEmoji(model.status)} ${model.name}`;
        select.appendChild(opt);
    });
    
    const modelExists = filteredModels.some(m => m.id === state.settings.model);
    if (modelExists) {
        select.value = state.settings.model;
    } else if (filteredModels.length > 0) {
        state.settings.model = filteredModels[0].id;
        select.value = state.settings.model;
    }
}

function updateModelDetails() {
    const state = State.getState();
    const modelId = dom.inputs.model.value;
    const model = state.models.find(m => m.id === modelId);
    const details = document.getElementById('modelDetails');
    
    if (!details) return;
    
    if (model) {
        let detailsText = `Статус: ${Utils.getStatusEmoji(model.status)} ${model.status}<br>`;
        
        if (model.lastTested) {
            detailsText += `Последняя проверка: ${new Date(model.lastTested).toLocaleString()}<br>`;
        }
        
        if (model.responseTime) {
            detailsText += `Время отклика: ${model.responseTime}мс<br>`;
        }
        
        if (model.description) {
            detailsText += `Описание: ${model.description}`;
        }
        
        details.innerHTML = detailsText;
    } else {
        details.innerHTML = 'Модель не выбрана';
    }
}

function updateModelStats() {
    const stats = State.getModelStats();
    
    const totalElem = document.getElementById('modelTotal');
    const successElem = document.getElementById('modelSuccess');
    const errorElem = document.getElementById('modelError');
    const untestedElem = document.getElementById('modelUntested');
    
    if (totalElem) totalElem.textContent = stats.total;
    if (successElem) successElem.textContent = stats.success;
    if (errorElem) errorElem.textContent = stats.error;
    if (untestedElem) untestedElem.textContent = stats.untested;
}

function updateLogCount() {
    const state = State.getState();
    const logCountElem = document.getElementById('logCount');
    if (logCountElem) {
        logCountElem.textContent = `${state.auditLog.length} записей`;
    }
}

function renderAuditList() {
    const state = State.getState();
    const list = document.getElementById('auditList');
    
    if (!list) return;
    
    const displayLog = state.auditLog.slice(-20);
    
    list.innerHTML = displayLog.map(entry => {
        let statusColor = '#888';
        let borderColor = '#444';
        
        if (entry.status === 'success') {
            statusColor = '#4cd137';
            borderColor = '#2d8b57';
        } else if (entry.status === 'error') {
            statusColor = '#e84118';
            borderColor = '#c23616';
        } else if (entry.status === 'pending') {
            statusColor = '#fbc531';
            borderColor = '#e1b12c';
        }

        let headerText = `<span style="color:${statusColor}; font-weight:bold;">${entry.timestamp}</span>: [${entry.status.toUpperCase()}] - ${entry.request}`;
        if (entry.d10) headerText += ` (d10=${entry.d10})`;

        let requestHtml = '';
        if (entry.requestDebug && entry.requestDebug.body) {
            const formattedRequest = Utils.formatJsonWithUnicode(entry.requestDebug.body);
            requestHtml = `
            <details>
                <summary style="cursor:pointer; color:#aaa;">Request Payload</summary>
                <pre style="font-size:0.65rem; color:#ccc; background:#111; padding:5px; overflow-x:auto; white-space: pre-wrap; border: 1px solid #333;">${formattedRequest}</pre>
            </details>`;
        }

        let responseHtml = '';
        if (entry.fullResponse) {
            const formattedResponse = Utils.formatJsonWithUnicode(entry.fullResponse);
            responseHtml = `
            <details>
                <summary style="cursor:pointer; color:${statusColor};">Full Response</summary>
                <pre style="font-size:0.65rem; color:${statusColor}; background:#1a1a1a; padding:5px; overflow-x:auto; white-space: pre-wrap; border: 1px solid ${borderColor};">${formattedResponse}</pre>
            </details>`;
        }

        let errorHtml = '';
        if (entry.rawError) {
            const formattedError = Utils.formatJsonWithUnicode(entry.rawError);
            errorHtml = `
            <details open>
                <summary style="cursor:pointer; color:#e84118;">▼ ERROR DETAILS</summary>
                <pre style="font-size:0.65rem; color:#e84118; background:#2d0000; padding:5px; overflow-x:auto; white-space: pre-wrap;">${formattedError}</pre>
            </details>`;
        }

        const actionButtons = `
        <div style="margin-top:10px; display:flex; gap:8px; justify-content:flex-end;">
            <button onclick="window.Audit.exportSingleAuditEntry(${entry.id})" 
                    style="padding:3px 8px; font-size:0.7rem; background:#333; color:#ccc; border:1px solid #555; border-radius:3px; cursor:pointer;">
                <i class="fas fa-download"></i> Скачать
            </button>
            <button onclick="copyAuditEntry(${entry.id})" 
                    style="padding:3px 8px; font-size:0.7rem; background:#333; color:#ccc; border:1px solid #555; border-radius:3px; cursor:pointer;">
                <i class="fas fa-copy"></i> Копировать
            </button>
        </div>`;

        return `
        <div style="padding:0.5rem; border-bottom:1px solid #333; border-left: 4px solid ${borderColor}; margin-bottom: 5px; background: rgba(0,0,0,0.2);">
            <div style="font-size: 0.8rem; margin-bottom: 5px;">${headerText}</div>
            ${requestHtml}
            ${responseHtml}
            ${errorHtml}
            ${actionButtons}
        </div>`;
    }).join('');
    
    updateLogCount();
    
    if (!window.copyAuditEntry) {
        window.copyAuditEntry = function(entryId) {
            const state = State.getState();
            const entry = state.auditLog.find(e => e.id === entryId);
            
            if (!entry) return;
            
            let textToCopy = `Запрос: ${entry.request}\n`;
            textToCopy += `Время: ${entry.timestamp}\n`;
            textToCopy += `Статус: ${entry.status}\n`;
            textToCopy += `Модель: ${entry.model}\n`;
            textToCopy += `Провайдер: ${entry.provider}\n`;
            if (entry.d10) textToCopy += `d10: ${entry.d10}\n`;
            
            textToCopy += `\n=== REQUEST ===\n`;
            if (entry.requestDebug?.body) {
                textToCopy += Utils.formatJsonWithUnicode(entry.requestDebug.body) + '\n';
            }
            
            textToCopy += `\n=== RESPONSE ===\n`;
            if (entry.fullResponse) {
                textToCopy += Utils.formatJsonWithUnicode(entry.fullResponse) + '\n';
            }
            
            if (entry.rawError) {
                textToCopy += `\n=== ERROR ===\n${Utils.formatJsonWithUnicode(entry.rawError)}\n`;
            }
            
            navigator.clipboard.writeText(textToCopy).then(() => {
                const notification = document.createElement('div');
                notification.style.cssText = `
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    background: #4cd137;
                    color: white;
                    padding: 10px 15px;
                    border-radius: 5px;
                    z-index: 10000;
                    font-size: 0.8rem;
                    box-shadow: 0 2px 10px rgba(0,0,0,0.3);
                `;
                notification.textContent = 'Запись скопирована в буфер обмена';
                document.body.appendChild(notification);
                
                setTimeout(() => {
                    document.body.removeChild(notification);
                }, 2000);
            }).catch(err => {
                console.error('Ошибка копирования:', err);
                showAlert('Ошибка', 'Не удалось скопировать в буфер обмена', err);
            });
        };
    }
}

function renderScene() {
    const state = State.getState();
    
    if (!state.gameState.currentScene) {
        console.error('❌ renderScene: currentScene отсутствует, использую начальную сцену');
        state.gameState.currentScene = { ...PROMPTS.initialGameState };
        State.setState({ gameState: state.gameState });
    }
    
    const currentScene = state.gameState.currentScene;
    
    if (dom.updates && dom.sceneText && dom.sceneText.parentNode) {
        dom.sceneText.parentNode.insertBefore(dom.updates, dom.sceneText);
    }
    
    if (state.lastTurnUpdates && state.lastTurnUpdates.length > 0) {
        dom.updates.style.display = 'block';
        dom.updates.innerHTML = state.lastTurnUpdates;
    } else {
        dom.updates.style.display = 'none';
        dom.updates.innerHTML = '';
    }
    
    if (currentScene.scene) {
        dom.sceneText.innerHTML = `<p>${currentScene.scene.replace(/\n/g, '</p><p>')}</p>`;
    } else {
        console.warn('⚠️ Текст сцены пуст, использую дефолтный');
        dom.sceneText.innerHTML = PROMPTS.initialGameState.scene;
    }
    
    let reflectionAndTypologyHtml = '';
    
    if (currentScene.reflection) {
        reflectionAndTypologyHtml += `<div class="reflection-content">${currentScene.reflection}</div>`;
    }
    
    if (currentScene.typology) {
        reflectionAndTypologyHtml += `<div class="typology-content" style="margin-top: 10px; font-style: italic; color: #1dd1a1; font-size: 0.9em;">
            <i class="fas fa-fingerprint"></i> ${currentScene.typology}
        </div>`;
    }
    
    if (reflectionAndTypologyHtml) {
        dom.reflection.style.display = 'block';
        dom.reflection.innerHTML = reflectionAndTypologyHtml;
    } else {
        dom.reflection.style.display = 'none';
    }
}

function renderSectionHTML(title, icon, color, items, renderItemFn) {
    let html = `<div style="margin-top: 15px; font-weight: bold; color: ${color}; border-bottom: 1px solid #333; padding-bottom: 4px; margin-bottom: 5px; font-size: 0.85rem;">
        <i class="fas ${icon}"></i> ${title} ${items.length > 0 ? `(${items.length})` : ''}
    </div>`;

    if (!items || items.length === 0) {
        html += `<div style="font-size: 0.8rem; color: #444; font-style: italic;">Нет данных...</div>`;
    } else {
        html += `<div style="display: flex; flex-wrap: wrap; gap: 4px;">`;
        html += items.map(renderItemFn).join('');
        html += `</div>`;
    }
    return html;
}

function renderAll() {
    console.info(`⚠️   RENDER ALL (формат 4.1)   ⚠️`);
    
    try {
        renderScene();
        renderStats();
        renderChoices();
        renderAllGameItems();
        renderHistory();
        applyStateEffects();
        updateUIMode();
        
        if (dom.turnCounter) {
            dom.turnCounter.innerHTML = `ХОДЫ: <span style="color: #888; font-family: monospace;">${State.getTurnCount()}</span>`;
        }
        
        console.info(`✅ ALL RENDERED (формат 4.1)`);
    } catch (error) {
        console.error('❌ Ошибка при рендеринге:', error);
    }
}

function updateUIMode() {
    const state = State.getState();
    
    dom.freeModeToggle.checked = state.freeMode;
    
    if (state.freeMode) {
        dom.choicesList.style.display = 'none';
        dom.freeInputWrapper.style.display = 'block';
        dom.modeIcon.innerHTML = '<i class="fas fa-keyboard"></i>';
        dom.modeText.textContent = 'Режим: Свободный ввод';
        dom.modeText.classList.add('free-mode');
        dom.choicesCounter.textContent = `${state.freeModeText.length > 0 ? '✓' : '0'}/∞`;
        
        dom.freeInputText.value = state.freeModeText;
        dom.freeInputText.disabled = false;
        
        const scale = state.settings.scale;
        const baseHeight = 140;
        const adjustedHeight = baseHeight * scale;
        dom.freeInputText.style.height = `${adjustedHeight}px`;
        dom.freeInputText.style.minHeight = `${adjustedHeight}px`;
        
        setTimeout(() => {
            dom.freeInputText.focus();
            dom.freeInputText.scrollTop = dom.freeInputText.scrollHeight;
        }, 100);
        
        dom.btnSubmit.disabled = state.freeModeText.trim().length === 0;
    } else {
        dom.choicesList.style.display = 'block';
        dom.freeInputWrapper.style.display = 'none';
        dom.modeIcon.innerHTML = '<i class="fas fa-list-ul"></i>';
        dom.modeText.textContent = 'Режим: Варианты';
        dom.modeText.classList.remove('free-mode');
    }
}

function normalizeStatKey(statName) {
    if (!statName) return '';
    
    const lowerStat = statName.toString().toLowerCase().trim();
    
    for (const [alias, key] of Object.entries(CONFIG.statAliases)) {
        if (alias.toLowerCase() === lowerStat) {
            return key;
        }
    }
    
    const standardKeys = ['will', 'stealth', 'influence', 'sanity'];
    if (standardKeys.includes(lowerStat)) {
        return lowerStat;
    }
    
    return lowerStat;
}

function getStatIcon(statKey) {
    const icons = {
        'will': '<i class="fas fa-brain" style="color: #ffcc00;"></i>',
        'stealth': '<i class="fas fa-user-secret" style="color: #00ccff;"></i>',
        'influence': '<i class="fas fa-crown" style="color: #ff66cc;"></i>',
        'sanity': '<i class="fas fa-lightbulb" style="color: #66ff66;"></i>'
    };
    return icons[statKey] || '<i class="fas fa-question" style="color: #888;"></i>';
}

function getRussianStatName(key) {
    const map = { 
        'will': 'Воля', 
        'stealth': 'Скрытность', 
        'influence': 'Влияние', 
        'sanity': 'Разум' 
    };
    return map[key] || key;
}

function formatCompactRequirements(requirements) {
    if (!Array.isArray(requirements) || requirements.length === 0) {
        return '';
    }
    
    const items = requirements.map(reqId => {
        if (!reqId || typeof reqId !== 'string') return '';
        
        const [type, name] = reqId.split(':');
        let color = '#888';
        let icon = getGameItemIcon(reqId);
        let displayName = name || reqId;
        
        switch (type) {
            case 'stat':
                color = '#fbc531';
                displayName = getRussianStatName(name);
                break;
            case 'skill':
                color = '#9c88ff';
                break;
            case 'inventory':
                color = '#00a8ff';
                break;
            case 'relations':
                color = '#ff9ff3';
                displayName = name.replace(/_/g, ' ');
                break;
            case 'bless':
                color = '#fbc531';
                break;
            case 'curse':
                color = '#c23616';
                break;
            case 'initiation_degree':
                color = '#ff9ff3';
                break;
        }
        
        return `<span style="color:${color};" title="${reqId}">${icon} ${displayName}</span>`;
    }).filter(item => item !== '');
    
    if (items.length === 0) return '';
    
    return `<div style="font-size:0.75rem; margin-top:3px; color:#888; opacity: 0.3">🔒 Треб: ${items.join(', ')}</div>`;
}

function formatCompactOperations(operations, type) {
    if (!Array.isArray(operations) || operations.length === 0) {
        return '';
    }
    
    const isSuccess = type === 'success';
    const items = [];
    
    operations.forEach(op => {
        if (!op || !op.id) return;
        
        const [itemType, name] = op.id.split(':');
        let display = '';
        
        switch (op.operation) {
            case 'MODIFY':
                const sign = op.delta > 0 ? '+' : '';
                const statName = itemType === 'stat' ? getRussianStatName(name) : name;
                display = `${statName}${sign}${op.delta}`;
                break;
            case 'ADD':
                if (itemType === 'buff' || itemType === 'debuff') {
                    display = `${name}+${op.value}`;
                } else {
                    display = `+${name}`;
                }
                break;
            case 'REMOVE':
                display = `-${name}`;
                break;
            case 'SET':
                display = `${name}→"${String(op.value || '').substring(0, 10)}"`;
                break;
        }
        
        if (display) {
            items.push(display);
        }
    });
    
    if (items.length === 0) return '';
    
    const color = isSuccess ? '#4cd137' : '#e84118';
    const icon = isSuccess ? '✅' : '❌';
    
    return `<div style="font-size:0.75rem; margin-top:2px; opacity: 0.3">
        <span style="color:${color};">${icon} ${items.join(', ')}</span>
    </div>`;
}

function renderChoices() {
    console.log('🔍 renderChoices called');
    
    const state = State.getState();
    if (!dom.choicesList) {
        console.error('❌ DOM element choicesList not found');
        return;
    }
    
    dom.choicesList.innerHTML = '';
    
    if (!state.gameState.currentScene) {
        console.error('❌ renderChoices: currentScene отсутствует');
        return;
    }
    
    const currentScene = state.gameState.currentScene;
    const choices = currentScene.choices;
    
    if (!choices || !Array.isArray(choices)) {
        console.error('❌ renderChoices: choices отсутствует или не массив');
        return;
    }
    
    console.log(`📋 Отображаем ${choices.length} вариантов выбора`);
    
    choices.forEach((choice, idx) => {
        if (!choice || typeof choice !== 'object') {
            console.warn(`⚠️ Пропущен choice с индексом ${idx}: объект не существует`);
            return;
        }
        
        const btn = document.createElement('button');
        const isSelected = state.gameState.selectedActions &&
            Array.isArray(state.gameState.selectedActions) ?
            state.gameState.selectedActions.includes(idx) : false;
        
        btn.className = `choice-btn ${isSelected ? 'selected' : ''}`;
        
        const choiceText = choice.text || "Действие без названия";
        let content = `${choiceText}`;
        
        const difficulty = choice.difficulty_level || 5;
        content += `<div style="font-size:0.75rem; color:#888; margin-top:3px; opacity: 0.3">🎯 Сложность: ${difficulty}/10</div>`;
        
        if (Array.isArray(choice.requirements) && choice.requirements.length > 0) {
            content += formatCompactRequirements(choice.requirements);
        } else {
            content += `<div style="font-size:0.75rem; color:#888; margin-top:3px; opacity: 0.3">🔓 Нет требований</div>`;
        }
        
        if (Array.isArray(choice.success_rewards) && choice.success_rewards.length > 0) {
            content += formatCompactOperations(choice.success_rewards, 'success');
        }
        
        if (Array.isArray(choice.fail_penalties) && choice.fail_penalties.length > 0) {
            content += formatCompactOperations(choice.fail_penalties, 'fail');
        }
        
        btn.innerHTML = content;
        btn.onclick = () => Game.toggleChoice(idx);
        dom.choicesList.appendChild(btn);
    });
    
    const count = state.gameState.selectedActions ? state.gameState.selectedActions.length : 0;
    if (dom.choicesCounter) {
        dom.choicesCounter.textContent = `${count}/${CONFIG.maxChoices}`;
    }
    
    console.log('✅ Choices rendered');
}

function applyStateEffects() {
    const state = State.getState();
    const body = document.body;
    
    if (state.isRitualActive) {
        body.classList.add('ritual-mode');
    } else {
        body.classList.remove('ritual-mode');
    }
    
    const sanityValue = State.getGameItemValue('stat:sanity') || 50;
    if (sanityValue < 20) {
        body.classList.add('glitch-active');
    } else {
        body.classList.remove('glitch-active');
    }
}

function showAlert(title, message, details = null, type = 'error') {
    const alertModal = document.getElementById('alertModal');
    const alertModalContent = document.getElementById('alertModalContent');
    const alertModalHeader = document.getElementById('alertModalHeader');
    const alertModalTitle = document.getElementById('alertModalTitle');
    const alertMessage = document.getElementById('alertMessage');
    const alertDetails = document.getElementById('alertDetails');
    const alertStack = document.getElementById('alertStack');
    const alertTimestamp = document.getElementById('alertTimestamp');
    const copyErrorBtn = document.getElementById('copyErrorBtn');

    if (!alertModal) return;

    if (type === 'error') {
        alertModalContent.className = 'alert-modal-content error';
        alertModalHeader.className = 'modal-header alert-modal-header error';
        alertModalTitle.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Ошибка';
        copyErrorBtn.style.display = details ? 'block' : 'none';
    } else if (type === 'success') {
        alertModalContent.className = 'alert-modal-content success';
        alertModalHeader.className = 'modal-header alert-modal-header success';
        alertModalTitle.innerHTML = '<i class="fas fa-check-circle"></i> Успех';
        copyErrorBtn.style.display = 'none';
    } else if (type === 'warning') {
        alertModalContent.className = 'alert-modal-content warning';
        alertModalHeader.className = 'modal-header alert-modal-header warning';
        alertModalTitle.innerHTML = '<i class="fas fa-exclamation-circle"></i> Внимание';
        copyErrorBtn.style.display = details ? 'block' : 'none';
    }

    alertMessage.innerHTML = `<h3 style="margin-bottom: 0.5rem;">${title}</h3><p>${message}</p>`;

    if (details) {
        const formattedDetails = Utils.formatErrorDetails(details);
        alertDetails.value = formattedDetails;
        alertDetails.style.display = 'block';

        copyErrorBtn.onclick = () => {
            if (!navigator.clipboard) return;
            navigator.clipboard.writeText(formattedDetails).then(() => {
                copyErrorBtn.innerHTML = '<i class="fas fa-check"></i> Скопировано!';
                setTimeout(() => {
                    copyErrorBtn.innerHTML = '<i class="fas fa-copy"></i> Скопировать данные';
                }, 2000);
            }).catch(err => {
                console.error('Ошибка копирования:', err);
            });
        };

        if (details instanceof Error && details.stack) {
            alertStack.textContent = details.stack;
            alertStack.style.display = 'block';
        } else {
            alertStack.style.display = 'none';
        }
    } else {
        alertDetails.style.display = 'none';
        alertStack.style.display = 'none';
    }

    alertTimestamp.textContent = `Время: ${Utils.formatMoscowTime(new Date())}`;
    alertTimestamp.className = `alert-details ${type}`;

    alertModal.classList.add('active');

    const closeModal = () => alertModal.classList.remove('active');
    const closeBtn = document.getElementById('closeAlertModalBtn');
    const okBtn = document.getElementById('alertModalOkBtn');
    if (closeBtn) closeBtn.onclick = closeModal;
    if (okBtn) okBtn.onclick = closeModal;

    alertModal.querySelector('.modal-overlay').onclick = (e) => {
        if (e.target === alertModal.querySelector('.modal-overlay')) closeModal();
    };
}

function showWarningAlert(title, message, details = null) {
    showAlert(title, message, details, 'warning');
}

function showErrorAlert(title, message, details = null) {
    showAlert(title, message, details, 'error');
}

function showSuccessAlert(title, message, details = null) {
    showAlert(title, message, details, 'success');
}

function formatDuration(duration) {
    if (duration === undefined || duration === null) return '[?]';
    return `[${duration}]`;
}

// Альтернативно, если хотим с текстом "ход.":
function formatDurationWithText(duration) {
    if (duration === undefined || duration === null) return '[?]';
    return `${duration} ход.`;
}


/**
 * Запуск показа фраз героя на подложке
 */
function startThoughtsOfHeroDisplay() {
    if (thoughtsOfHeroInterval) clearInterval(thoughtsOfHeroInterval);
    showThoughtsOfHeroLayout();
    
    thoughtsOfHeroInterval = setInterval(() => {
        let phrase = null;
        
        // Пробуем взять фразу из основного списка
        if (State.getHeroPhrasesCount() > 0) {
            phrase = State.getHeroPhrase();
        }
        // Если список пуст, берем фразу из заглушек
        else if (CONFIG.thoughtsOfHeroFakes.length > 0) {
            const fakePhrases = CONFIG.thoughtsOfHeroFakes;
            phrase = fakePhrases[Math.floor(Math.random() * fakePhrases.length)];
        }
        
        if (phrase) {
            updateThoughtsOfHeroText(phrase);
        }
    }, 5000);
    
    // Показываем первую фразу сразу
    setTimeout(() => {
        let phrase = null;
        
        if (State.getHeroPhrasesCount() > 0) {
            phrase = State.getHeroPhrase();
        } else if (CONFIG.thoughtsOfHeroFakes.length > 0) {
            const fakePhrases = CONFIG.thoughtsOfHeroFakes;
            phrase = fakePhrases[Math.floor(Math.random() * fakePhrases.length)];
        }
        
        if (phrase) {
            updateThoughtsOfHeroText(phrase);
        }
    }, 100);
}

/**
 * Остановка показа фраз героя
 */
function stopThoughtsOfHeroDisplay() {
    if (thoughtsOfHeroInterval) {
        clearInterval(thoughtsOfHeroInterval);
        thoughtsOfHeroInterval = null;
    }
    
    // Скрываем подложку
    hideThoughtsOfHeroLayout();
}

/**
 * Показ подложки для фраз героя
 */
function showThoughtsOfHeroLayout() {
    if (dom.thoughtsOfHeroLayout) {
        dom.thoughtsOfHeroLayout.style.display = 'flex';
    }
}

/**
 * Скрытие подложки для фраз героя
 */
function hideThoughtsOfHeroLayout() {
    if (dom.thoughtsOfHeroLayout) {
        dom.thoughtsOfHeroLayout.style.display = 'none';
    }
}

/**
 * Обновление текста на подложке фраз героя
 * @param {string} text - Текст для отображения
 */
function updateThoughtsOfHeroText(text) {
    if (dom.thoughtsOfHeroText) {
        dom.thoughtsOfHeroText.textContent = text;
    }
}

setupStateObservers();

// Делаем функции доступными глобально для onclick обработчиков
window.showGameItemTooltip = showGameItemTooltip;
window.showStatTooltip = showStatTooltip;


export const Render = {
    updateApiKeyFields,
    renderModelSelectorByProvider,
    updateModelDetails,
    updateModelStats,
    updateLogCount,
    renderAuditList,
    renderScene,
    startThoughtsOfHeroDisplay,
    stopThoughtsOfHeroDisplay,
    getRussianStatName,
    updateUIMode,
    renderChoices,
    renderStats,
    renderAllGameItems,
    renderHistory,
    renderAll,
    getStatDescription,
    getRelationColor,
    showGameItemTooltip,
    showStatTooltip,
    showStatChangeAnimation,
    showAlert,
    showErrorAlert,
    showSuccessAlert,
    showWarningAlert,
    formatDuration,
    formatDurationWithText,
    getStatColor
};