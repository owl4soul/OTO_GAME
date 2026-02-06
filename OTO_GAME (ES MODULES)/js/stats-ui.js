// Модуль: STATS UI - Рендеринг строки статов и связанных анимаций
'use strict';

import { State } from './3-state.js';
import { DOM } from './4-dom.js';
import { Utils } from './2-utils.js';
import { CONFIG } from './1-config.js';

const dom = DOM.getDOM();

class StatsUIManager {
    constructor() {
        this.initialized = false;
        this.previousBaseStats = {};
        this.lastRenderedTurn = 0;
    }
    
    initialize() {
        if (this.initialized) return;
        
        console.log('🎮 Инициализация StatsUI...');
        
        // Сохраняем начальные значения статов
        const baseStats = this.getBaseStats();
        this.previousBaseStats = { ...baseStats };
        
        // Регистрируем глобальные функции для тултипов
        if (!window.showStatTooltip) {
            window.showStatTooltip = (element, statName, value) => this.showStatTooltip(element, statName, value);
            console.log('🌐 Глобальная функция showStatTooltip зарегистрирована');
        }
        
        // Подписываемся на события
        this.setupEventListeners();
        
        // Первоначальный рендер
        this.render();
        
        this.initialized = true;
        console.log('✅ StatsUI инициализирован');
    }
    
    setupEventListeners() {
        State.on(State.EVENTS.HERO_CHANGED, (data) => {
            console.log('🎯 StatsUI: HERO_CHANGED событие');
            this.render();
        });
        
        State.on(State.EVENTS.TURN_COMPLETED, (data) => {
            console.log(`🔄 StatsUI: TURN_COMPLETED, ход ${data?.turnCount || State.getState().turnCount}`);
            this.render();
        });
        
        console.log('🔗 StatsUI: подписки установлены');
    }
    
    getBaseStats() {
        return {
            will: State.getGameItemValue('stat:will') || 50,
            stealth: State.getGameItemValue('stat:stealth') || 50,
            influence: State.getGameItemValue('stat:influence') || 50,
            sanity: State.getGameItemValue('stat:sanity') || 50
        };
    }
    
    getStatColor(value) {
        const val = Math.max(0, Math.min(100, value));
        
        if (val <= 10) return '#800000';
        if (val <= 20) return '#FF0000';
        if (val <= 30) return '#FF5500';
        if (val <= 40) return '#FFAA00';
        if (val <= 50) return '#FFD700';
        if (val <= 60) return '#ADFF2F';
        if (val <= 70) return '#00FF00';
        if (val <= 80) return '#20B2AA';
        if (val <= 90) return '#87CEEB';
        return '#FFFFFF';
    }
    
    getRussianStatName(key) {
        const map = {
            'will': 'Воля',
            'stealth': 'Скрытность',
            'influence': 'Влияние',
            'sanity': 'Разум'
        };
        return map[key] || key;
    }
    
    getStatDescription(statName, value) {
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
        
        const val = Math.max(0, Math.min(100, value));
        const bracket = Math.floor(val / 10) * 10;
        
        return statDescriptions[bracket] || statDescriptions[50];
    }
    
    showStatChangeAnimation(element, delta, color) {
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
        
        const valueEl = container.querySelector('.stat-value-clickable');
        if (valueEl) {
            valueEl.style.animation = 'statPulse 0.5s ease-in-out';
            setTimeout(() => {
                if (valueEl) valueEl.style.animation = '';
            }, 500);
        }
        
        setTimeout(() => {
            if (flyingNumber && flyingNumber.parentNode) {
                flyingNumber.parentNode.removeChild(flyingNumber);
            }
        }, 1500);
    }
    
    showStatTooltip(element, statName, value) {
        const existingTooltip = document.querySelector('.stat-tooltip');
        if (existingTooltip) {
            existingTooltip.remove();
        }
        
        const description = this.getStatDescription(statName, value);
        const color = this.getStatColor(value);
        
        const tooltip = document.createElement('div');
        tooltip.className = 'stat-tooltip';
        tooltip.innerHTML = `
            <div style="font-weight: bold; color: ${color}; margin-bottom: 5px; font-size: 1em; text-shadow: 0 0 5px ${color}40;">
                ${this.getRussianStatName(statName)}: ${value}/100
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
        
        document.body.appendChild(tooltip);
        
        const rect = element.getBoundingClientRect();
        const tooltipRect = tooltip.getBoundingClientRect();
        
        let left = rect.left + window.scrollX;
        let top = rect.bottom + window.scrollY + 5;
        
        if (left + tooltipRect.width > window.innerWidth) {
            left = window.innerWidth - tooltipRect.width - 10;
        }
        
        if (left < 10) {
            left = 10;
        }
        
        if (top + tooltipRect.height > window.innerHeight + window.scrollY) {
            top = rect.top + window.scrollY - tooltipRect.height - 5;
        }
        
        if (top < window.scrollY) {
            top = window.scrollY + 10;
        }
        
        tooltip.style.left = `${left}px`;
        tooltip.style.top = `${top}px`;
        
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
    
    render() {
        console.log('🔍 StatsUI.render called');
        
        const state = State.getState();
        const baseStats = this.getBaseStats();
        
        // Обновляем счетчик ходов в интерфейсе
        const turnCounter = dom.turnCounter;
        if (turnCounter) {
            turnCounter.textContent = `Ход: ${state.turnCount}`;
            console.log(`📊 Счетчик ходов обновлен: ${state.turnCount}`);
        }
        
        const buffs = State.getGameItemsByType('buff:');
        const debuffs = State.getGameItemsByType('debuff:');
        
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
        
        ['will', 'stealth', 'influence', 'sanity'].forEach(statName => {
            const valElement = dom.vals[statName];
            if (!valElement) return;
            
            const baseValue = baseStats[statName];
            const previousBase = this.previousBaseStats[statName] || baseValue;
            const { buffs: buffList, debuffs: debuffList } = statEffects[statName];
            
            const totalBuff = buffList.reduce((sum, b) => sum + b.value, 0);
            const totalDebuff = debuffList.reduce((sum, d) => sum + d.value, 0);
            const totalModifier = totalBuff + totalDebuff;
            const currentValue = baseValue + totalModifier;
            
            const currentColor = this.getStatColor(currentValue);
            
            const delta = baseValue - previousBase;
            if (delta !== 0) {
                this.showStatChangeAnimation(valElement, delta, currentColor);
            }
            
            this.previousBaseStats[statName] = baseValue;
            
            let detailHtml = '';
            
            if (buffList.length > 0 || debuffList.length > 0) {
                detailHtml = `<span style="color: #888; font-size: 0.8em;">${baseValue}</span>`;
                
                buffList.forEach(buff => {
                    if (buff.value > 0) {
                        detailHtml += ` <span style="color: #4cd137; font-size: 0.8em;">+${buff.value}[${buff.duration}]</span>`;
                    }
                });
                
                debuffList.forEach(debuff => {
                    if (debuff.value < 0) {
                        const absValue = Math.abs(debuff.value);
                        detailHtml += ` <span style="color: #e84118; font-size: 0.8em;">-${absValue}[${debuff.duration}]</span>`;
                    }
                });
                
                valElement.innerHTML = `
                    <div class="stat-container" style="display: flex; flex-direction: column; align-items: center; line-height: 1.1; gap: 1px; position: relative;">
                        <div style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
                            <span style="color: #999; font-size: 0.85em; white-space: nowrap;">${this.getRussianStatName(statName)}:</span>
                            <span class="stat-value-clickable" 
                                  data-stat="${statName}" 
                                  data-value="${currentValue}"
                                  onclick="window.showStatTooltip(this, '${statName}', ${currentValue})"
                                  style="color: ${currentColor}; 
                                         font-weight: bold; 
                                         font-size: 1.1em; 
                                         text-shadow: 0 0 3px ${currentColor}40;
                                         cursor: help;
                                         user-select: none;">
                                ${currentValue}
                            </span>
                        </div>
                        <div style="font-size: 0.7em; color: #666; width: 100%; text-align: right; line-height: 1;">
                            ${detailHtml}
                        </div>
                    </div>
                `;
            } else {
                valElement.innerHTML = `
                    <div class="stat-container" style="display: flex; justify-content: space-between; align-items: center; position: relative;">
                        <span style="color: #999; font-size: 0.85em;">${this.getRussianStatName(statName)}:</span>
                        <span class="stat-value-clickable" 
                              data-stat="${statName}" 
                              data-value="${currentValue}"
                              onclick="window.showStatTooltip(this, '${statName}', ${currentValue})"
                              style="color: ${currentColor}; 
                                     font-weight: bold; 
                                     font-size: 1.1em; 
                                     text-shadow: 0 0 3px ${currentColor}40;
                                     cursor: help;
                                     user-select: none;">
                            ${currentValue}
                        </span>
                    </div>
                `;
            }
        });
        
        // Прогресс и степени
        const progressValue = State.getGameItemValue('progress:level') || 0;
        const maxScore = 110;
        const pct = Math.min(100, Math.max(0, (progressValue / maxScore) * 100));
        if (dom.tube) {
            dom.tube.style.height = `${pct}%`;
        }
        
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
        
        console.log('✅ StatsUI.render completed');
    }
    
    forceUpdate() {
        console.log('🔄 StatsUI: принудительное обновление');
        this.render();
    }
}

// Создаем и экспортируем синглтон
const statsUI = new StatsUIManager();
StatsUIManager.instance = statsUI;

// Экспортируем StatsUI
export const StatsUI = statsUI;