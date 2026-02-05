// Модуль 5: RENDER - Отрисовка интерфейса (ФОРМАТ 4.1) - УЛУЧШЕННАЯ ВЕРСИЯ
// СТРУКТУРА ВЕРХНЕЙ СЕКЦИИ:
// (основной текст сцены выводится всегда, остальные блоки показываем только при наличии данных в ответе, а для изменений за ход - при наличии в state):
// design_notes → Заметки дизайнера
// aiMemory → Память ГМ
// summary → Сводка
// lastTurnUpdates → ИЗМЕНЕНИЯ ЗА ПОСЛЕДНИЙ ХОД
// scene → основной текст сцены
// reflection → Рефлексия
// personality → Изменения личности
// typology
// 2. Нижняя секция слева: Новый порядок блоков с измененными цветами
// 3. История: Улучшенный аккордеон с полной информацией
// 4. Блок изменений за ход: По образцу эталонного примера с добавлением итогов

'use strict';

import { CONFIG } from './1-config.js';
import { State } from './3-state.js';
import { DOM } from './4-dom.js';
import { Utils } from './2-utils.js';
import { Game } from './6-game.js';
import { Audit } from './8-audit.js';

const dom = DOM.getDOM();
let thoughtsOfHeroInterval = null;

// ====================================================================
// ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ДЛЯ ЦВЕТОВ И ОПИСАНИЙ
// ====================================================================

/**
 * Получение цвета для диапазона -100 до 100 (для отношений)
 */
function getRelationColor(value) {
    const normalized = Math.max(0, Math.min(100, (value + 100) / 2));
    return getStatColor(normalized);
}

/**
 * Получение цвета по значению стата (0-100)
 */
function getStatColor(value) {
    const val = Math.max(0, Math.min(100, value));
    
    if (val <= 10) return '#800000'; // тёмно-красный
    if (val <= 20) return '#FF0000'; // красный
    if (val <= 30) return '#FF5500'; // оранжевый
    if (val <= 40) return '#FFAA00'; // оранжево-желтый
    if (val <= 50) return '#FFD700'; // золотой
    if (val <= 60) return '#ADFF2F'; // салатовый
    if (val <= 70) return '#00FF00'; // зелёный
    if (val <= 80) return '#20B2AA'; // цвет морской волны
    if (val <= 90) return '#87CEEB'; // цвет неба
    return '#FFFFFF'; // белый
}

/**
 * Получение описания стата по значению
 */
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
    
    const val = Math.max(0, Math.min(100, value));
    const bracket = Math.floor(val / 10) * 10;
    
    return statDescriptions[bracket] || statDescriptions[50];
}

/**
 * Получение русского названия стата
 */
function getRussianStatName(key) {
    const map = {
        'will': 'Воля',
        'stealth': 'Скрытность',
        'influence': 'Влияние',
        'sanity': 'Разум'
    };
    return map[key] || key;
}

/**
 * Получение иконки для game_item
 */
function getGameItemIcon(itemId) {
    if (!itemId) return '📌';
    
    const type = itemId.split(':')[0];
    const icons = {
        'stat': '📊',
        'skill': '📜',
        'inventory': '🎒',
        'relations': '👤',
        'bless': '✨',
        'curse': '💀',
        'buff': '⬆️',
        'debuff': '⬇️',
        'initiation_degree': '🎓',
        'progress': '📈',
        'personality': '🧠',
        'effect': '⚡',
        'status': '🔘',
        'ability': '💫',
        'trait': '🎭',
        'item': '🎁',
        'ritual': '🕯️',
        'knowledge': '📚',
        'secret': '🔐',
        'location': '📍',
        'event': '📅',
        'quest': '🎯'
    };
    
    return icons[type] || '📌';
}

// ====================================================================
// АНИМАЦИЯ ИЗМЕНЕНИЯ СТАТОВ
// ====================================================================

/**
 * Анимация изменения стата (вылетающие цифры)
 */
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

// ====================================================================
// УЛУЧШЕННЫЕ ТУЛТИПЫ
// ====================================================================

/**
 * Показ тултипа для стата
 */
function showStatTooltip(element, statName, value) {
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

/**
 * Показ тултипа для game_item
 */
function showGameItemTooltip(element, gameItem) {
    const existingTooltip = document.querySelector('.game-item-tooltip');
    if (existingTooltip) {
        existingTooltip.remove();
    }
    
    if (!gameItem || !gameItem.id) {
        console.warn('showGameItemTooltip: Нет данных об объекте');
        return;
    }
    
    const tooltip = document.createElement('div');
    tooltip.className = 'game-item-tooltip';
    
    let content = '';
    
    const icon = getGameItemIcon(gameItem.id);
    const [type, name] = gameItem.id.split(':');
    
    content += `
        <div style="font-weight: bold; color: #fbc531; margin-bottom: 6px; font-size: 0.95em; border-bottom: 1px solid #fbc53140; padding-bottom: 4px;">
            ${icon} ${name || type}
        </div>
    `;
    
    if (gameItem.value !== undefined && gameItem.value !== name) {
        content += `
            <div style="margin-bottom: 4px; color: #ddd; font-size: 0.85em;">
                <span style="color: #888;">Значение:</span> ${gameItem.value}
            </div>
        `;
    }
    
    if (gameItem.description) {
        content += `
            <div style="margin-bottom: 4px; color: #ccc; font-size: 0.8em; font-style: italic; line-height: 1.3;">
                ${gameItem.description}
            </div>
        `;
    }
    
    if (gameItem.duration !== undefined) {
        content += `
            <div style="margin-bottom: 2px; color: #fbc531; font-size: 0.75em;">
                <i class="fas fa-clock"></i> Длительность: ${gameItem.duration} ход.
            </div>
        `;
    }
    
    const extraFields = Object.keys(gameItem).filter(k => !['id', 'value', 'description', 'duration'].includes(k));
    if (extraFields.length > 0) {
        content += '<div style="margin-top: 6px; padding-top: 4px; border-top: 1px solid #333;">';
        extraFields.forEach(field => {
            const val = gameItem[field];
            if (val !== null && val !== undefined) {
                content += `
                    <div style="font-size: 0.75em; color: #999; margin-bottom: 2px;">
                        <span style="color: #666;">${field}:</span> ${JSON.stringify(val)}
                    </div>
                `;
            }
        });
        content += '</div>';
    }
    
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
    
    setTimeout(removeTooltip, 7000);
}

/**
 * Рендерит информацию об организациях героя
 */
function renderOrganizations() {
    const orgContainer = document.getElementById('organizationsContainer');
    if (!orgContainer) return;
    
    const html = createOrganizationsHTML();
    orgContainer.innerHTML = html;
    
    if (html) {
        orgContainer.style.display = 'block';
    } else {
        orgContainer.style.display = 'none';
    };
}

// ====================================================================
// РЕНДЕРИНГ СТАТОВ С АНИМАЦИЕЙ
// ====================================================================

function renderStats() {
    console.log('🔍 renderStats called');
    
    const state = State.getState();
    
    if (!window.previousBaseStats) {
        window.previousBaseStats = {};
    }
    
    const baseStats = {
        will: State.getGameItemValue('stat:will') || 50,
        stealth: State.getGameItemValue('stat:stealth') || 50,
        influence: State.getGameItemValue('stat:influence') || 50,
        sanity: State.getGameItemValue('stat:sanity') || 50
    };
    
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
        const previousBase = window.previousBaseStats[statName] || baseValue;
        const { buffs: buffList, debuffs: debuffList } = statEffects[statName];
        
        const totalBuff = buffList.reduce((sum, b) => sum + b.value, 0);
        const totalDebuff = debuffList.reduce((sum, d) => sum + d.value, 0);
        const totalModifier = totalBuff + totalDebuff;
        const currentValue = baseValue + totalModifier;
        
        const currentColor = getStatColor(currentValue);
        
        const delta = baseValue - previousBase;
        if (delta !== 0) {
            showStatChangeAnimation(valElement, delta, currentColor);
        }
        
        window.previousBaseStats[statName] = baseValue;
        
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
                        <span style="color: #999; font-size: 0.85em; white-space: nowrap;">${getRussianStatName(statName)}:</span>
                        <span class="stat-value-clickable" 
                              data-stat="${statName}" 
                              data-value="${currentValue}"
                              onclick="showStatTooltip(this, '${statName}', ${currentValue})"
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
                    <span style="color: #999; font-size: 0.85em;">${getRussianStatName(statName)}:</span>
                    <span class="stat-value-clickable" 
                          data-stat="${statName}" 
                          data-value="${currentValue}"
                          onclick="showStatTooltip(this, '${statName}', ${currentValue})"
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
    
    console.log('✅ renderStats completed');
}

// ====================================================================
// ВСПОМОГАТЕЛЬНАЯ ФУНКЦИЯ: Рекурсивное отображение объектов aiMemory
// ====================================================================

/**
 * Рекурсивно отображает объект aiMemory на всю глубину
 */
function renderAiMemoryRecursive(obj, depth = 0) {
    if (obj === null || obj === undefined) {
        return `<div style="margin-left: ${depth * 20}px; color: #888; font-style: italic;">
            ${obj === null ? 'null' : 'undefined'}
        </div>`;
    }
    
    if (typeof obj !== 'object' || Array.isArray(obj)) {
        // Примитивные значения и массивы
        let value = obj;
        let color = '#ccc';
        let style = '';
        
        if (typeof obj === 'boolean') {
            color = obj ? '#4cd137' : '#e84118';
            value = obj ? 'true' : 'false';
        } else if (typeof obj === 'number') {
            color = '#fbc531';
        } else if (Array.isArray(obj)) {
            color = '#9c88ff';
            value = `[${obj.length} элементов]`;
            style = 'font-style: italic;';
        } else if (typeof obj === 'string') {
            // Проверяем, не слишком ли длинная строка
            if (obj.length > 150) {
                value = obj;
                style = 'color: #aaa;';
            }
        }
        
        return `<div style="margin-left: ${depth * 20}px; color: ${color}; ${style}">
            ${JSON.stringify(value)}
        </div>`;
    }
    
    // Объекты
    const entries = Object.entries(obj);
    if (entries.length === 0) {
        return `<div style="margin-left: ${depth * 20}px; color: #888; font-style: italic;">
            { } (пустой объект)
        </div>`;
    }
    
    let html = '';
    entries.forEach(([key, value]) => {
        const keyHtml = `<span style="color: #fbc531; font-weight: bold;">${key}:</span>`;
        
        if (typeof value === 'object' && value !== null) {
            // Вложенный объект - рекурсивно обрабатываем
            html += `<div style="margin-left: ${depth * 20}px;">
                ${keyHtml}
            </div>`;
            html += renderAiMemoryRecursive(value, depth + 1);
        } else {
            // Простое значение
            html += `<div style="margin-left: ${depth * 20}px;">
                ${keyHtml} ${renderAiMemoryRecursive(value, 0)}
            </div>`;
        }
    });
    
    return html;
}

/**
 * Форматирует aiMemory для отображения
 */
function formatAiMemory(aiMemory) {
    if (!aiMemory || typeof aiMemory !== 'object') {
        return '<div style="color: #888; font-style: italic;">Нет данных в памяти</div>';
    }
    
    return renderAiMemoryRecursive(aiMemory);
}

// ====================================================================
// РЕНДЕРИНГ СЦЕНЫ (ИСПРАВЛЕН, ВОССТАНОВЛЕН ФУНКЦИОНАЛ)
// ====================================================================

function renderScene() {
    const state = State.getState();
    
    if (!state.gameState.currentScene) {
        console.error('❌ renderScene: currentScene отсутствует');
        return;
    }
    
    const currentScene = state.gameState.currentScene;
    
    // Создаем контейнер для всей верхней секции
    const sceneContainer = dom.sceneArea; // Используем sceneArea вместо sceneText.parentNode
    
    // Очищаем старый контент
    sceneContainer.innerHTML = '';
    
    // 1. Заметки дизайнера (если передано в ответе)
    if (currentScene.design_notes && currentScene.design_notes.trim() !== '') {
        const designNotesDiv = document.createElement('div');
        designNotesDiv.className = 'scene-meta-block';
        designNotesDiv.style.cssText = `
            margin-bottom: 10px;
            padding: 8px;
            background: rgba(102, 102, 102, 0.1);
            border-left: 3px solid #666;
            border-radius: 3px;
        `;
        designNotesDiv.innerHTML = `
            <div style="color: #888; font-size: 0.9em; font-weight: bold; margin-bottom: 5px;">
                <i class="fas fa-pencil-alt"></i> Заметки дизайнера:
            </div>
            <div style="color: #aaa; font-size: 0.85em; font-style: italic;">
                ${currentScene.design_notes}
            </div>
        `;
        sceneContainer.appendChild(designNotesDiv);
    }
    
    // 2. Память ГМ (если передано в ответе) - ИСПРАВЛЕННАЯ ВЕРСИЯ
    if (currentScene.aiMemory && Object.keys(currentScene.aiMemory).length > 0) {
        const aiMemoryDiv = document.createElement('div');
        aiMemoryDiv.className = 'scene-meta-block';
        aiMemoryDiv.style.cssText = `
            margin-bottom: 10px;
            padding: 8px;
            background: rgba(251, 197, 49, 0.1);
            border-left: 3px solid #fbc531;
            border-radius: 3px;
            max-height: 300px;
            overflow-y: auto;
        `;
        aiMemoryDiv.innerHTML = `
            <div style="color: #fbc531; font-size: 0.9em; font-weight: bold; margin-bottom: 8px; display: flex; align-items: center; gap: 5px;">
                <i class="fas fa-brain"></i> ПАМЯТЬ ГМ:
                <span style="font-size: 0.8em; color: #aaa; font-weight: normal; margin-left: auto;">
                    ${Object.keys(currentScene.aiMemory).length} поле(й)
                </span>
            </div>
            <div style="color: #aaa; font-size: 0.85em; font-family: 'Courier New', monospace; line-height: 1.4;">
                ${formatAiMemory(currentScene.aiMemory)}
            </div>
        `;
        sceneContainer.appendChild(aiMemoryDiv);
    }
    
    // 3. Сводка (если передано в ответе)
    if (currentScene.summary && currentScene.summary.trim() !== '') {
        const summaryDiv = document.createElement('div');
        summaryDiv.className = 'scene-meta-block';
        summaryDiv.style.cssText = `
            margin-bottom: 10px;
            padding: 8px;
            background: rgba(72, 219, 251, 0.1);
            border-left: 3px solid #48dbfb;
            border-radius: 3px;
        `;
        summaryDiv.innerHTML = `
            <div style="color: #48dbfb; font-size: 0.9em; font-weight: bold; margin-bottom: 5px;">
                <i class="fas fa-file-alt"></i> Сводка:
            </div>
            <div style="color: #aaa; font-size: 0.85em;">
                ${currentScene.summary}
            </div>
        `;
        sceneContainer.appendChild(summaryDiv);
    }
    
    // 4. Блок изменений за последний ход
    const changesBlock = renderLastTurnChanges();
    if (changesBlock) {
        sceneContainer.appendChild(changesBlock);
    }
    
    // 5. Основной текст сцены
    const sceneDiv = document.createElement('div');
    sceneDiv.className = 'scene-text';
    sceneDiv.id = 'sceneText';
    
    if (currentScene.scene) {
        // ОСНОВНОЙ ТЕКСТ СЦЕНЫ
        sceneDiv.innerHTML = `<div style="color: #ddd; line-height: 1.5;">${currentScene.scene}</div>`;
    } else {
        sceneDiv.innerHTML = '<p>Сцена отсутствует</p>';
    }
    
    sceneContainer.appendChild(sceneDiv);
    
    // ОБНОВЛЯЕМ ССЫЛКУ В DOM ОБЪЕКТЕ
    dom.sceneText = sceneDiv;
    
    // 6. Reflection (если передано в ответе)
    if (currentScene.reflection && currentScene.reflection.trim() !== '') {
        const reflectionDiv = document.createElement('div');
        reflectionDiv.className = 'scene-reflection';
        reflectionDiv.id = 'sceneReflection';
        reflectionDiv.style.display = 'block';
        reflectionDiv.style.cssText = `
            margin-top: 15px;
            padding: 10px;
            background: rgba(72, 219, 251, 0.1);
            border-left: 3px solid #48dbfb;
            border-radius: 3px;
        `;
        reflectionDiv.innerHTML = `
            <div style="color: #48dbfb; font-size: 0.95em; font-weight: bold; margin-bottom: 5px;">
                <i class="fas fa-eye"></i> Рефлексия:
            </div>
            <div style="color: #ccc; font-size: 0.9em; font-style: italic;">
                ${currentScene.reflection}
            </div>
        `;
        sceneContainer.appendChild(reflectionDiv);
        
        // ОБНОВЛЯЕМ ССЫЛКУ
        dom.reflection = reflectionDiv;
    } else if (dom.reflection) {
        dom.reflection.style.display = 'none';
    }
    
    // 7. Personality (если передано в ответе)
    if (currentScene.personality && currentScene.personality.trim() !== '') {
        const personalityDiv = document.createElement('div');
        personalityDiv.className = 'scene-personality';
        personalityDiv.style.cssText = `
            margin-top: 10px;
            padding: 10px;
            background: rgba(76, 209, 55, 0.1);
            border-left: 3px solid #4cd137;
            border-radius: 3px;
        `;
        personalityDiv.innerHTML = `
            <div style="color: #4cd137; font-size: 0.95em; font-weight: bold; margin-bottom: 5px;">
                <i class="fas fa-user-circle"></i> Личность изменена:
            </div>
            <div style="color: #ccc; font-size: 0.9em; font-style: italic;">
                ${currentScene.personality}
            </div>
        `;
        sceneContainer.appendChild(personalityDiv);
    }
    
    // 8. Typology (если передано в ответе)
    if (currentScene.typology && currentScene.typology.trim() !== '') {
        const typologyDiv = document.createElement('div');
        typologyDiv.className = 'scene-typology';
        typologyDiv.style.cssText = `
            margin-top: 10px;
            padding: 10px;
            background: rgba(156, 136, 255, 0.1);
            border-left: 3px solid #9c88ff;
            border-radius: 3px;
        `;
        typologyDiv.innerHTML = `
            <div style="color: #9c88ff; font-size: 0.95em; font-weight: bold; margin-bottom: 5px;">
                <i class="fas fa-fingerprint"></i> Типология:
            </div>
            <div style="color: #ccc; font-size: 0.9em; font-style: italic;">
                ${currentScene.typology}
            </div>
        `;
        sceneContainer.appendChild(typologyDiv);
    }
}

// ====================================================================
// УЛУЧШЕННЫЙ РЕНДЕРИНГ ИСТОРИИ (ВОССТАНОВЛЕН ФУНКЦИОНАЛ)
// ====================================================================
function renderHistory() {
    const state = State.getState();
    
    dom.hist.innerHTML = '';
    
    // Если истории нет - показываем заглушку
    if (!state.gameState.history || state.gameState.history.length === 0) {
        dom.hist.innerHTML = `
            <div style="padding: 10px; text-align: center; color: #555; font-style: italic; font-size: 0.8em;">
                История пуста. Сделайте первый ход.
            </div>
        `;
        return;
    }
    
    // Создаем контейнер для аккордеона истории
    const historyAccordion = document.createElement('div');
    historyAccordion.className = 'history-accordion';
    historyAccordion.style.cssText = `
        display: flex;
        flex-direction: column;
        gap: 3px;
    `;
    
    // Проходим по всей истории в обратном порядке (от новых к старым)
    const reversedHistory = [...state.gameState.history].reverse();
    
    reversedHistory.forEach((entry, reverseIndex) => {
        const originalIndex = state.gameState.history.length - 1 - reverseIndex;
        const turnNumber = originalIndex + 1;
        
        // Извлекаем summary из entry (если есть в текущей сцене) или из currentScene для последнего хода
        let summary = '';
        if (reverseIndex === 0 && state.gameState.currentScene?.summary) {
            summary = state.gameState.currentScene.summary;
        } else if (entry.summary) {
            summary = entry.summary;
        } else if (entry.fullText) {
            // Если summary нет, создаем из fullText
            summary = entry.fullText.replace(/<[^>]*>/g, ' ');
        } else {
            summary = 'Нет сводки';
        }
        
        // Обрезаем summary до 2 строк для заголовка
        const truncatedSummary = truncateToLines(summary, 2);
        
        // Создаем элемент аккордеона
        const accordionItem = document.createElement('details');
        accordionItem.className = 'history-accordion-item';
        accordionItem.style.cssText = `
            background: linear-gradient(135deg, #0d0000 0%, #000000 100%);
            border: 1px solid #4a0a0a;
            border-radius: 3px;
            margin-bottom: 2px;
            font-size: 0.8em;
        `;
        
        // Открываем первый элемент (последний ход) по умолчанию
        if (reverseIndex === 0) {
            accordionItem.setAttribute('open', '');
        }
        
        // Заголовок (кликабельный) - УМЕНЬШЕНЫ ПАДДИНГИ
        const summary_html = document.createElement('summary');
        summary_html.style.cssText = `
            padding: 4px 6px;
            cursor: pointer;
            font-size: 0.8em;
            font-weight: bold;
            color: #e84118;
            user-select: none;
            list-style: none;
            display: flex;
            align-items: center;
            gap: 6px;
        `;
        summary_html.innerHTML = `
            <i class="fas fa-chevron-right" style="transition: transform 0.2s; font-size: 0.6em;"></i>
            <span style="flex: 1;">Ход ${turnNumber}: ${truncatedSummary}</span>
        `;
        
        // Анимация иконки при раскрытии
        accordionItem.addEventListener('toggle', () => {
            const icon = summary_html.querySelector('i');
            if (accordionItem.open) {
                icon.style.transform = 'rotate(90deg)';
            } else {
                icon.style.transform = 'rotate(0deg)';
            }
        });
        
        // Если открыто по умолчанию, поворачиваем иконку
        if (reverseIndex === 0) {
            summary_html.querySelector('i').style.transform = 'rotate(90deg)';
        }
        
        accordionItem.appendChild(summary_html);
        
        // Содержимое аккордеона - УМЕНЬШЕНЫ ПАДДИНГИ
        const content = document.createElement('div');
        content.style.cssText = `
            padding: 4px 6px;
            border-top: 1px solid #4a0a0a;
            font-size: 0.75em;
        `;
        
        let contentHTML = '';
        
        // DESIGN_NOTES 
        const design_notes = reverseIndex === 0 ? state.gameState.currentScene?.design_notes : entry.design_notes;
        if (design_notes && design_notes.trim() !== '') {
            contentHTML += `
                <div style="margin-bottom: 4px; padding: 3px; background: #0a0000; border-left: 2px solid #666; border-radius: 2px;">
                    <div style="color: #888; font-size: 0.8em; font-style: italic; margin-bottom: 1px;">
                        <i class="fas fa-pencil-alt"></i> Заметки дизайнера:
                    </div>
                    <div style="color: #aaa; font-size: 0.85em; line-height: 1.2;">
                        ${design_notes}
                    </div>
                </div>
            `;
        }
        
        // AI_MEMORY 
        const aiMemory = reverseIndex === 0 ? state.gameState.currentScene?.aiMemory : entry.aiMemory;
        if (aiMemory && Object.keys(aiMemory).length > 0) {
            // Используем ту же функцию форматирования, что и в renderScene
            const memoryEntries = formatAiMemory(aiMemory);
            
            contentHTML += `
                <div style="margin-bottom: 4px; padding: 3px; background: #0a0a00; border-left: 2px solid #fbc531; border-radius: 2px; max-height: 200px; overflow-y: auto;">
                    <div style="color: #fbc531; font-size: 0.8em; font-style: italic; margin-bottom: 1px;">
                        <i class="fas fa-brain"></i> Память ГМ:
                    </div>
                    <div style="color: #aaa; font-size: 0.85em; line-height: 1.2; font-family: 'Courier New', monospace;">
                        ${memoryEntries}
                    </div>
                </div>
            `;
        }
        
        // SUMMARY
        if (summary && summary.trim() !== '') {
            contentHTML += `
                <div style="margin-bottom: 4px; padding: 3px; background: #00000a; border-left: 2px solid #48dbfb; border-radius: 2px;">
                    <div style="color: #48dbfb; font-size: 0.8em; font-style: italic; margin-bottom: 1px;">
                        <i class="fas fa-file-alt"></i> Сводка:
                    </div>
                    <div style="color: #aaa; font-size: 0.85em; line-height: 1.2;">
                        ${summary}
                    </div>
                </div>
            `;
        }
        
        // ОСНОВНОЙ ТЕКСТ СЦЕНЫ
        const sceneText = entry.fullText || entry.scene;
        if (sceneText && sceneText.trim() !== '') {
            contentHTML += `
                <div style="margin-bottom: 4px; padding: 3px; background: #000; border-left: 2px solid #e84118; border-radius: 2px; max-height: 200px; overflow-y: auto;">
                    <div style="color: #e84118; font-size: 0.8em; font-style: italic; margin-bottom: 1px;">
                        <i class="fas fa-scroll"></i> Текст сцены:
                    </div>
                    <div style="color: #aaa; font-size: 0.85em; line-height: 1.3; white-space: pre-wrap;">
                        ${sceneText}
                    </div>
                </div>
            `;
        }
        
        // REFLECTION
        const reflection = reverseIndex === 0 ? state.gameState.currentScene?.reflection : entry.reflection;
        if (reflection && reflection.trim() !== '') {
            contentHTML += `
                <div style="margin-bottom: 4px; padding: 3px; background: #00000a; border-left: 2px solid #48dbfb; border-radius: 2px;">
                    <div style="color: #48dbfb; font-size: 0.8em; font-style: italic; margin-bottom: 1px;">
                        <i class="fas fa-eye"></i> Рефлексия:
                    </div>
                    <div style="color: #aaa; font-size: 0.85em; line-height: 1.2;">
                        ${reflection}
                    </div>
                </div>
            `;
        }
        
        // PERSONALITY
        const personality = reverseIndex === 0 ?
            (state.gameState.currentScene?.personality || State.getGameItemValue('personality:hero')) :
            entry.personality;
        if (personality && personality.trim() !== '') {
            contentHTML += `
                <div style="margin-bottom: 4px; padding: 3px; background: #000a00; border-left: 2px solid #4cd137; border-radius: 2px;">
                    <div style="color: #4cd137; font-size: 0.8em; font-style: italic; margin-bottom: 1px;">
                        <i class="fas fa-user-circle"></i> Личность:
                    </div>
                    <div style="color: #aaa; font-size: 0.85em; line-height: 1.2;">
                        ${personality}
                    </div>
                </div>
            `;
        }
        
        // Typology
        const typology = reverseIndex === 0 ? state.gameState.currentScene?.typology : entry.typology;
        if (typology && typology.trim() !== '') {
            contentHTML += `
                <div style="margin-bottom: 4px; padding: 3px; background: #000a00; border-left: 2px solid #9c88ff; border-radius: 2px;">
                    <div style="color: #9c88ff; font-size: 0.8em; font-style: italic; margin-bottom: 1px;">
                        <i class="fas fa-fingerprint"></i> Типология:
                    </div>
                    <div style="color: #aaa; font-size: 0.85em; line-height: 1.2;">
                        ${typology}
                    </div>
                </div>
            `;
        }
        
        // ДЛЯ СТАРЫХ ХОДОВ: УПРОЩЕННЫЙ ФОРМАТ
        // Действия в упрощенном формате
        const actions = entry.actionResults || [];
        if (actions && actions.length > 0) {
            contentHTML += `
                <div style="margin-bottom: 4px;">
                    <div style="color: #9c88ff; font-size: 0.8em; font-weight: bold; margin-bottom: 2px; padding-bottom: 2px; border-bottom: 1px solid #9c88ff40;">
                        <i class="fas fa-hand-point-right"></i> Действия:
                    </div>
            `;
            
            actions.forEach(action => {
                const isSuccess = action.success;
                const isPartial = action.partial_success;
                
                let statusColor, statusBg, statusIcon, statusText;
                
                if (isSuccess && !isPartial) {
                    statusColor = '#4cd137';
                    statusBg = 'rgba(76, 209, 55, 0.1)';
                    statusIcon = '<i class="fas fa-check"></i>';
                    statusText = 'УСПЕХ';
                } else if (isPartial) {
                    statusColor = '#fbc531';
                    statusBg = 'rgba(251, 197, 49, 0.1)';
                    statusIcon = '<i class="fas fa-exclamation-triangle"></i>';
                    statusText = 'ЧАСТИЧНЫЙ УСПЕХ';
                } else {
                    statusColor = '#e84118';
                    statusBg = 'rgba(232, 65, 24, 0.1)';
                    statusIcon = '<i class="fas fa-times"></i>';
                    statusText = 'ПРОВАЛ';
                }
                
                contentHTML += `
                    <div class="simplified-action" style="padding: 2px 4px; margin: 1px 0; background: ${statusBg}; border-left: 3px solid ${statusColor}; border-radius: 2px; font-size: 0.75em;">
                        <span style="color: ${statusColor}; font-weight: bold;">${statusIcon} ${statusText}:</span>
                        <span style="color: #ddd; margin-left: 4px;">${action.text}</span>
                    </div>
                `;
            });
            
            contentHTML += `</div>`;
        } else if (entry.choice) {
            // Fallback к старому формату
            contentHTML += `
                <div class="simplified-action" style="padding: 2px 4px; margin: 1px 0; background: rgba(156, 136, 255, 0.1); border-left: 3px solid #9c88ff; border-radius: 2px; font-size: 0.75em;">
                    <span style="color: #9c88ff; font-weight: bold;"><i class="fas fa-hand-point-right"></i> ВЫБОР:</span>
                    <span style="color: #ddd; margin-left: 4px;">${entry.choice}</span>
                </div>
            `;
        }
        
        // Изменения характеристик в упрощенном формате
        const changesText = entry.changes || '';
        if (changesText && changesText !== 'Нет явных изменений') {
            contentHTML += `
                <div style="margin-top: 4px;">
                    <div style="color: #4cd137; font-size: 0.8em; font-weight: bold; margin-bottom: 2px; padding-bottom: 2px; border-bottom: 1px solid #4cd13740;">
                        <i class="fas fa-exchange-alt"></i> Изменения:
                    </div>
                    <div style="font-size: 0.75em; color: #ccc; line-height: 1.2; padding: 2px 0;">
                        ${changesText}
                    </div>
                </div>
            `;
        }
        
        // ИТОГО хода
        const hasContent = (actions && actions.length > 0) || (entry.choice) || (changesText && changesText !== 'Нет явных изменений');
        if (hasContent) {
            contentHTML += `
                <div style="margin-top: 4px; padding-top: 4px; border-top: 1px dashed #333; font-size: 0.7em; color: #666;">
                    <div style="display: flex;">
                     
                    
                    </div>
                </div>
            `;
        }
        
        content.innerHTML = contentHTML;
        accordionItem.appendChild(content);
        
        historyAccordion.appendChild(accordionItem);
    });
    
    dom.hist.appendChild(historyAccordion);
}

function truncateToLines(text, maxLines) {
    if (!text) return '';
    
    // Приблизительно считаем, что строка помещается в 60 символов
    const charsPerLine = 60;
    const maxChars = charsPerLine * maxLines;
    
    if (text.length <= maxChars) {
        return text;
    }
    
    return text.substring(0, maxChars) + '...';
}

// ====================================================================
// ПЕРЕРАБОТАННЫЙ БЛОК ИЗМЕНЕНИЙ ЗА ПОСЛЕДНИЙ ХОД (по эталонному примеру)
// ====================================================================

function renderLastTurnChanges() {
    const state = State.getState();
    const currentScene = state.gameState.currentScene || {};
    
    // Если нет изменений за последний ход - не показываем блок
    if (!state.lastTurnUpdates || state.lastTurnUpdates.trim() === '') {
        return null;
    }
    
    const changesBlock = document.createElement('div');
    changesBlock.id = 'lastTurnChangesBlock';
    changesBlock.className = 'last-turn-changes blood-gothic-panel';
    changesBlock.style.cssText = `
        background: linear-gradient(135deg, #0a0a0a 0%, #050505 100%);
        border: 1px solid #333;
        border-radius: 4px;
        padding: 6px;
        margin-bottom: 10px;
        box-shadow: 0 0 10px #00000030;
    `;
    
    // Используем уже готовый HTML изменений из state.lastTurnUpdates
    // (он создается в Game.createTurnUpdatesHTML и сохраняется в State)
    changesBlock.innerHTML = state.lastTurnUpdates;
    
    return changesBlock;
}

// ====================================================================
// ПЕРЕРАБОТАННЫЙ РЕНДЕРИНГ ВСЕХ GAME ITEMS (с новыми цветами и порядком)
// ====================================================================

function renderAllGameItems() {
    console.log('🔍 renderAllGameItems called (NEW COLORS AND ORDER)');
    
    const personalityEl = document.getElementById('personalityDisplay');
    if (!personalityEl || !personalityEl.parentNode) {
        console.error('❌ Cannot find personalityDisplay container');
        return;
    }
    
    const container = personalityEl.parentNode;
    
    personalityEl.style.display = 'none';
    
    const managedIds = [
        'personalityBlockContainer',
        'typologyContainer',
        'relationsContainer',
        'skillsContainer',
        'statBuffsContainer', // НОВЫЙ БЛОК: +/- К СТАТАМ
        'blessingsContainer',
        'cursesContainer',
        'buffsDebuffsContainer',
        'detailsContainer', // ПЕРЕИМЕНОВАНО: ЭФФЕКТЫ → ДЕТАЛИ
        'inventoryContainer'
    ];
    
    managedIds.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.remove();
    });
    
    const fragment = document.createDocumentFragment();
    const state = State.getState();
    
    // =============================================
    // БЛОК 1: ЛИЧНОСТЬ - ЖЁЛТЫЙ (был зелёный)
    // =============================================
    const personalityVal = State.getGameItemValue('personality:hero');
    
    const personalityDiv = document.createElement('div');
    personalityDiv.id = 'personalityBlockContainer';
    personalityDiv.className = 'game-item-section';
    personalityDiv.style.cssText = 'margin-bottom: 8px;';
    
    if (personalityVal && personalityVal.trim() !== '') {
        personalityDiv.innerHTML = `
            <div class="section-header" style="color: #fbc531; border-bottom: 1px solid #4a3a0a;">
                <i class="fas fa-user-circle"></i> ЛИЧНОСТЬ
            </div>
            <div class="section-content" style="padding: 4px 0; font-size: 0.8em; color: #ccc; font-style: italic; line-height: 1.3;">
                ${personalityVal}
            </div>
        `;
    } else {
        personalityDiv.innerHTML = `
            <div class="section-header" style="color: #fbc531; border-bottom: 1px solid #4a3a0a;">
                <i class="fas fa-user-circle"></i> ЛИЧНОСТЬ
            </div>
            <div class="section-content" style="padding: 4px 0; font-size: 0.75em; color: #444; font-style: italic;">
                Нет данных о личности...
            </div>
        `;
    }
    
    fragment.appendChild(personalityDiv);
    
    // =============================================
    // БЛОК 2: ТИПОЛОГИЯ - ЗЕЛЁНЫЙ (был цвет морской волны)
    // =============================================
    const currentScene = state.gameState.currentScene || {};
    const typologyText = currentScene.typology || '';
    
    const typologyDiv = document.createElement('div');
    typologyDiv.id = 'typologyContainer';
    typologyDiv.className = 'game-item-section';
    typologyDiv.style.cssText = 'margin-bottom: 8px;';
    
    if (typologyText && typologyText.trim() !== '') {
        typologyDiv.innerHTML = `
            <div class="section-header" style="color: #4cd137; border-bottom: 1px solid #2d8b57;">
                <i class="fas fa-fingerprint"></i> ТИПОЛОГИЯ
            </div>
            <div class="section-content" style="padding: 4px 0; font-size: 0.8em; color: #4cd137; font-style: italic; line-height: 1.3;">
                ${typologyText}
            </div>
        `;
    } else {
        typologyDiv.innerHTML = `
            <div class="section-header" style="color: #4cd137; border-bottom: 1px solid #2d8b57;">
                <i class="fas fa-fingerprint"></i> ТИПОЛОГИЯ
            </div>
            <div class="section-content" style="padding: 4px 0; font-size: 0.75em; color: #444; font-style: italic;">
                Нет данных о типологии...
            </div>
        `;
    }
    
    fragment.appendChild(typologyDiv);
    
    // =============================================
    // БЛОК 3: ОТНОШЕНИЯ - НЕЖНО-РОЗОВЫЙ
    // =============================================
    const relationsItems = State.getGameItemsByType('relations:');
    
    const relationsDiv = document.createElement('div');
    relationsDiv.id = 'relationsContainer';
    relationsDiv.className = 'game-item-section';
    
    if (relationsItems && relationsItems.length > 0) {
        let relationsHTML = '';
        
        relationsItems.forEach(rel => {
            const name = rel.id.split(':')[1] || 'Unknown';
            const value = rel.value !== undefined ? rel.value : 0;
            const color = getRelationColor(value);
            const description = rel.description || '';
            
            let emoji = '😐';
            if (value >= 75) emoji = '😍';
            else if (value >= 50) emoji = '😊';
            else if (value >= 25) emoji = '🙂';
            else if (value >= -25) emoji = '😐';
            else if (value >= -50) emoji = '😠';
            else if (value >= -75) emoji = '😡';
            else emoji = '💀';
            
            relationsHTML += `
                <div class="game-item-badge" 
                     onclick="showGameItemTooltip(this, ${JSON.stringify(rel).replace(/"/g, '&quot;')})"
                     style="background: linear-gradient(135deg, #2a0a2a 0%, #1a051a 100%); 
                            border: 1px solid #ff9ff340; 
                            padding: 2px 6px; 
                            cursor: help;
                            display: flex;
                            align-items: center;
                            gap: 3px;">
                    <span style="font-size: 0.85em;">${emoji}</span>
                    <span style="color: #ff9ff3; font-size: 0.75em;">${name}</span>
                    <span style="color: ${color}; font-size: 0.75em; font-weight: bold;">${value}</span>
                </div>
            `;
        });
        
        relationsDiv.innerHTML = `
            <div class="section-header" style="color: #ff9ff3; border-bottom: 1px solid #6a2a5a;">
                <i class="fas fa-users"></i> ОТНОШЕНИЯ (${relationsItems.length})
            </div>
            <div class="section-content" style="display: flex; flex-wrap: wrap; gap: 3px; padding: 3px 0;">
                ${relationsHTML}
            </div>
        `;
    } else {
        relationsDiv.innerHTML = `
            <div class="section-header" style="color: #ff9ff3; border-bottom: 1px solid #6a2a5a;">
                <i class="fas fa-users"></i> ОТНОШЕНИЯ (0)
            </div>
            <div class="section-content" style="padding: 4px 0; font-size: 0.75em; color: #444; font-style: italic;">
                Нет данных об отношениях...
            </div>
        `;
    }
    
    fragment.appendChild(relationsDiv);
    
    // =============================================
    // БЛОК 4: НАВЫКИ - ТЁМНО-ФИОЛЕТОВЫЙ
    // =============================================
    const skillsItems = State.getGameItemsByType('skill:');
    
    const skillsDiv = document.createElement('div');
    skillsDiv.id = 'skillsContainer';
    skillsDiv.className = 'game-item-section';
    
    if (skillsItems && skillsItems.length > 0) {
        let skillsHTML = '';
        skillsItems.forEach(skill => {
            const name = skill.value || skill.id.split(':')[1];
            
            skillsHTML += `
                <div class="game-item-badge" 
                     onclick="showGameItemTooltip(this, ${JSON.stringify(skill).replace(/"/g, '&quot;')})"
                     style="background: linear-gradient(135deg, #0a0a2a 0%, #05051a 100%); 
                            border: 1px solid #6c5ce740; 
                            padding: 2px 6px; 
                            cursor: help;">
                    <span style="color: #6c5ce7; font-size: 0.75em;">📜</span>
                    <span style="color: #ddd; font-size: 0.75em; margin-left: 2px;">${name}</span>
                </div>
            `;
        });
        
        skillsDiv.innerHTML = `
            <div class="section-header" style="color: #6c5ce7; border-bottom: 1px solid #3a2a6a;">
                <i class="fas fa-scroll"></i> НАВЫКИ (${skillsItems.length})
            </div>
            <div class="section-content" style="display: flex; flex-wrap: wrap; gap: 3px; padding: 3px 0;">
                ${skillsHTML}
            </div>
        `;
    } else {
        skillsDiv.innerHTML = `
            <div class="section-header" style="color: #6c5ce7; border-bottom: 1px solid #3a2a6a;">
                <i class="fas fa-scroll"></i> НАВЫКИ (0)
            </div>
            <div class="section-content" style="padding: 4px 0; font-size: 0.75em; color: #444; font-style: italic;">
                Нет навыков...
            </div>
        `;
    }
    
    fragment.appendChild(skillsDiv);
    
    // =============================================
    // НОВЫЙ БЛОК 5: +/- К СТАТАМ - СИНИЙ
    // (баффы/дебаффы к 4-м основным статам)
    // =============================================
    const statBuffsItems = State.getGameItemsByType('buff:').filter(item => {
        const statName = item.id.split(':')[1];
        return ['will', 'stealth', 'influence', 'sanity'].includes(statName);
    });
    const statDebuffsItems = State.getGameItemsByType('debuff:').filter(item => {
        const statName = item.id.split(':')[1];
        return ['will', 'stealth', 'influence', 'sanity'].includes(statName);
    });
    const statBuffsDebuffs = [...statBuffsItems, ...statDebuffsItems];
    
    const statBuffsDiv = document.createElement('div');
    statBuffsDiv.id = 'statBuffsContainer';
    statBuffsDiv.className = 'game-item-section';
    
    if (statBuffsDebuffs && statBuffsDebuffs.length > 0) {
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
                     style="background: linear-gradient(135deg, ${isBuff ? '#0a1a2a' : '#2a0a1a'} 0%, ${isBuff ? '#051025' : '#1a050d'} 100%); 
                            border: 1px solid ${color}40; 
                            padding: 2px 6px; 
                            cursor: help;">
                    <span style="color: ${color}; font-size: 0.75em;">${icon}</span>
                    <span style="color: #ccc; font-size: 0.75em; margin: 0 2px;">${russianName}${sign}${value}</span>
                    ${duration ? `<span style="color: #888; font-size: 0.7em;">${duration}</span>` : ''}
                </div>
            `;
        });
        
        statBuffsDiv.innerHTML = `
            <div class="section-header" style="color: #3498db; border-bottom: 1px solid #1a4a7a;">
                <i class="fas fa-tachometer-alt"></i> +/- К СТАТАМ (${statBuffsDebuffs.length})
            </div>
            <div class="section-content" style="display: flex; flex-wrap: wrap; gap: 3px; padding: 3px 0;">
                ${itemsHTML}
            </div>
        `;
    } else {
        statBuffsDiv.innerHTML = `
            <div class="section-header" style="color: #3498db; border-bottom: 1px solid #1a4a7a;">
                <i class="fas fa-tachometer-alt"></i> +/- К СТАТАМ (0)
            </div>
            <div class="section-content" style="padding: 4px 0; font-size: 0.75em; color: #444; font-style: italic;">
                Нет активных баффов/дебаффов к статам...
            </div>
        `;
    }
    
    fragment.appendChild(statBuffsDiv);
    
    // =============================================
    // БЛОК 6: БЛАГОСЛОВЕНИЯ - СЕРЕБРЯНО-БЕЛЫЙ (был желтый)
    // =============================================
    const blessItems = State.getGameItemsByType('bless:');
    
    const blessDiv = document.createElement('div');
    blessDiv.id = 'blessingsContainer';
    blessDiv.className = 'game-item-section';
    
    if (blessItems && blessItems.length > 0) {
        let blessHTML = '';
        blessItems.forEach(bless => {
            const name = bless.value || bless.id.split(':')[1];
            const duration = bless.duration !== undefined ? `[${bless.duration}]` : '';
            
            blessHTML += `
                <div class="game-item-badge" 
                     onclick="showGameItemTooltip(this, ${JSON.stringify(bless).replace(/"/g, '&quot;')})"
                     style="background: linear-gradient(135deg, #2a2a2a 0%, #1a1a1a 100%); 
                            border: 1px solid #bdc3c740; 
                            padding: 2px 6px; 
                            cursor: help;">
                    <span style="color: #bdc3c7; font-size: 0.75em;">✨</span>
                    <span style="color: #ddd; font-size: 0.75em; margin-left: 2px;">${name}</span>
                    ${duration ? `<span style="color: #888; font-size: 0.7em; margin-left: 2px;">${duration}</span>` : ''}
                </div>
            `;
        });
        
        blessDiv.innerHTML = `
            <div class="section-header" style="color: #bdc3c7; border-bottom: 1px solid #6a6a6a;">
                <i class="fas fa-star"></i> БЛАГОСЛОВЕНИЯ (${blessItems.length})
            </div>
            <div class="section-content" style="display: flex; flex-wrap: wrap; gap: 3px; padding: 3px 0;">
                ${blessHTML}
            </div>
        `;
    } else {
        blessDiv.innerHTML = `
            <div class="section-header" style="color: #bdc3c7; border-bottom: 1px solid #6a6a6a;">
                <i class="fas fa-star"></i> БЛАГОСЛОВЕНИЯ (0)
            </div>
            <div class="section-content" style="padding: 4px 0; font-size: 0.75em; color: #444; font-style: italic;">
                Нет благословений...
            </div>
        `;
    }
    
    fragment.appendChild(blessDiv);
    
    // =============================================
    // БЛОК 7: ПРОКЛЯТИЯ - БОЛЕЕ КРАСНЫЙ
    // =============================================
    const curseItems = State.getGameItemsByType('curse:');
    
    const curseDiv = document.createElement('div');
    curseDiv.id = 'cursesContainer';
    curseDiv.className = 'game-item-section';
    
    if (curseItems && curseItems.length > 0) {
        let curseHTML = '';
        curseItems.forEach(curse => {
            const name = curse.value || curse.id.split(':')[1];
            const duration = curse.duration !== undefined ? `[${curse.duration}]` : '';
            
            curseHTML += `
                <div class="game-item-badge" 
                     onclick="showGameItemTooltip(this, ${JSON.stringify(curse).replace(/"/g, '&quot;')})"
                     style="background: linear-gradient(135deg, #2a0000 0%, #1a0000 100%); 
                            border: 1px solid #ff383840; 
                            padding: 2px 6px; 
                            cursor: help;">
                    <span style="color: #ff3838; font-size: 0.75em;">💀</span>
                    <span style="color: #ddd; font-size: 0.75em; margin-left: 2px;">${name}</span>
                    ${duration ? `<span style="color: #888; font-size: 0.7em; margin-left: 2px;">${duration}</span>` : ''}
                </div>
            `;
        });
        
        curseDiv.innerHTML = `
            <div class="section-header" style="color: #ff3838; border-bottom: 1px solid #8a0a0a;">
                <i class="fas fa-skull-crossbones"></i> ПРОКЛЯТИЯ (${curseItems.length})
            </div>
            <div class="section-content" style="display: flex; flex-wrap: wrap; gap: 3px; padding: 3px 0;">
                ${curseHTML}
            </div>
        `;
    } else {
        curseDiv.innerHTML = `
            <div class="section-header" style="color: #ff3838; border-bottom: 1px solid #8a0a0a;">
                <i class="fas fa-skull-crossbones"></i> ПРОКЛЯТИЯ (0)
            </div>
            <div class="section-content" style="padding: 4px 0; font-size: 0.75em; color: #444; font-style: italic;">
                Нет проклятий...
            </div>
        `;
    }
    
    fragment.appendChild(curseDiv);
    
    // =============================================
    // БЛОК 8: БАФФЫ/ДЕБАФФЫ (остальные) - ГОЛУБОЙ (был голубой)
    // =============================================
    const allBuffs = State.getGameItemsByType('buff:');
    const allDebuffs = State.getGameItemsByType('debuff:');
    
    // Исключаем те, что уже в блоке +/- К СТАТАМ
    const otherBuffs = allBuffs.filter(item => {
        const statName = item.id.split(':')[1];
        return !['will', 'stealth', 'influence', 'sanity'].includes(statName);
    });
    const otherDebuffs = allDebuffs.filter(item => {
        const statName = item.id.split(':')[1];
        return !['will', 'stealth', 'influence', 'sanity'].includes(statName);
    });
    const otherBuffsDebuffs = [...otherBuffs, ...otherDebuffs];
    
    const buffsDebuffsDiv = document.createElement('div');
    buffsDebuffsDiv.id = 'buffsDebuffsContainer';
    buffsDebuffsDiv.className = 'game-item-section';
    
    if (otherBuffsDebuffs && otherBuffsDebuffs.length > 0) {
        let itemsHTML = '';
        otherBuffsDebuffs.forEach(item => {
            const isBuff = item.id.startsWith('buff:');
            const statName = item.id.split(':')[1];
            const russianName = getRussianStatName(statName) || statName;
            const value = item.value || 0;
            const sign = value > 0 ? '+' : '';
            const duration = item.duration !== undefined ? `[${item.duration}]` : '';
            const color = isBuff ? '#4cd137' : '#e84118';
            const icon = isBuff ? '⬆️' : '⬇️';
            
            itemsHTML += `
                <div class="game-item-badge" 
                     onclick="showGameItemTooltip(this, ${JSON.stringify(item).replace(/"/g, '&quot;')})"
                     style="background: linear-gradient(135deg, ${isBuff ? '#0a1a2a' : '#2a0a1a'} 0%, ${isBuff ? '#051025' : '#1a050d'} 100%); 
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
            <div class="section-header" style="color: #00cec9; border-bottom: 1px solid #0a4a4a;">
                <i class="fas fa-chart-line"></i> БАФФЫ/ДЕБАФФЫ (${otherBuffsDebuffs.length})
            </div>
            <div class="section-content" style="display: flex; flex-wrap: wrap; gap: 3px; padding: 3px 0;">
                ${itemsHTML}
            </div>
        `;
    } else {
        buffsDebuffsDiv.innerHTML = `
            <div class="section-header" style="color: #00cec9; border-bottom: 1px solid #0a4a4a;">
                <i class="fas fa-chart-line"></i> БАФФЫ/ДЕБАФФЫ (0)
            </div>
            <div class="section-content" style="padding: 4px 0; font-size: 0.75em; color: #444; font-style: italic;">
                Нет других баффов/дебаффов...
            </div>
        `;
    }
    
    fragment.appendChild(buffsDebuffsDiv);
    
    // =============================================
    // БЛОК 9: ДЕТАЛИ (бывш. ЭФФЕКТЫ) - ГОЛУБОЙ (был серый)
    // =============================================
    const knownPrefixes = ['stat:', 'skill:', 'inventory:', 'relations:', 'bless:', 'curse:',
        'buff:', 'debuff:', 'personality:', 'initiation_degree:', 'progress:'
    ];
    
    const allItems = state.heroState || [];
    const unknownItems = allItems.filter(item => {
        return !knownPrefixes.some(prefix => item.id.startsWith(prefix));
    });
    
    const detailsDiv = document.createElement('div');
    detailsDiv.id = 'detailsContainer';
    detailsDiv.className = 'game-item-section';
    
    if (unknownItems && unknownItems.length > 0) {
        let detailsHTML = '';
        unknownItems.forEach(item => {
            const [type, name] = item.id.split(':');
            const displayName = item.value || name || item.id;
            const duration = item.duration !== undefined ? `[${item.duration}]` : '';
            
            detailsHTML += `
                <div class="game-item-badge" 
                     onclick="showGameItemTooltip(this, ${JSON.stringify(item).replace(/"/g, '&quot;')})"
                     style="background: linear-gradient(135deg, #1a2a2a 0%, #0d1a1a 100%); 
                            border: 1px solid #00cec940; 
                            padding: 2px 6px; 
                            cursor: help;">
                    <span style="color: #00cec9; font-size: 0.75em;">${getGameItemIcon(item.id)}</span>
                    <span style="color: #ddd; font-size: 0.75em; margin-left: 2px;">${displayName}</span>
                    ${duration ? `<span style="color: #888; font-size: 0.7em; margin-left: 2px;">${duration}</span>` : ''}
                </div>
            `;
        });
        
        detailsDiv.innerHTML = `
            <div class="section-header" style="color: #00cec9; border-bottom: 1px solid #0a4a4a;">
                <i class="fas fa-info-circle"></i> ДЕТАЛИ (${unknownItems.length})
            </div>
            <div class="section-content" style="display: flex; flex-wrap: wrap; gap: 3px; padding: 3px 0;">
                ${detailsHTML}
            </div>
        `;
    } else {
        detailsDiv.innerHTML = `
            <div class="section-header" style="color: #00cec9; border-bottom: 1px solid #0a4a4a;">
                <i class="fas fa-info-circle"></i> ДЕТАЛИ (0)
            </div>
            <div class="section-content" style="padding: 4px 0; font-size: 0.75em; color: #444; font-style: italic;">
                Нет дополнительных деталей...
            </div>
        `;
    }
    
    fragment.appendChild(detailsDiv);
    
    // =============================================
    // БЛОК 10: ИНВЕНТАРЬ - ДРЕВЕСНЫЙ (коричневый)
    // =============================================
    const inventoryItems = State.getGameItemsByType('inventory:');
    
    const inventoryDiv = document.createElement('div');
    inventoryDiv.id = 'inventoryContainer';
    inventoryDiv.className = 'game-item-section';
    
    if (inventoryItems && inventoryItems.length > 0) {
        let inventoryHTML = '';
        inventoryItems.forEach(item => {
            const name = item.value || item.id.split(':')[1];
            
            inventoryHTML += `
                <div class="game-item-badge" 
                     onclick="showGameItemTooltip(this, ${JSON.stringify(item).replace(/"/g, '&quot;')})"
                     style="background: linear-gradient(135deg, #2a1a0a 0%, #1a0d05 100%); 
                            border: 1px solid #8b451340; 
                            padding: 2px 6px; 
                            cursor: help;">
                    <span style="color: #8b4513; font-size: 0.75em;">🎒</span>
                    <span style="color: #ddd; font-size: 0.75em; margin-left: 2px;">${name}</span>
                </div>
            `;
        });
        
        inventoryDiv.innerHTML = `
            <div class="section-header" style="color: #8b4513; border-bottom: 1px solid #4a2a0a;">
                <i class="fas fa-box"></i> ИНВЕНТАРЬ (${inventoryItems.length})
            </div>
            <div class="section-content" style="display: flex; flex-wrap: wrap; gap: 3px; padding: 3px 0;">
                ${inventoryHTML}
            </div>
        `;
    } else {
        inventoryDiv.innerHTML = `
            <div class="section-header" style="color: #8b4513; border-bottom: 1px solid #4a2a0a;">
                <i class="fas fa-box"></i> ИНВЕНТАРЬ (0)
            </div>
            <div class="section-content" style="padding: 4px 0; font-size: 0.75em; color: #444; font-style: italic;">
                Инвентарь пуст...
            </div>
        `;
    }
    
    fragment.appendChild(inventoryDiv);
    
    
    container.appendChild(fragment);
    
    renderOrganizations();
    
    console.log('✅ renderAllGameItems completed with new colors and order');
}

// ====================================================================
// РЕНДЕРИНГ ВЫБОРОВ (без изменений)
// ====================================================================

function renderChoices() {
    const state = State.getState();
    
    if (!dom.choicesList) {
        console.error('❌ renderChoices: choicesList не найден');
        return;
    }
    
    dom.choicesList.innerHTML = '';
    
    if (!state.gameState || !state.gameState.currentScene) {
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

// ====================================================================
// ОСНОВНАЯ ФУНКЦИЯ РЕНДЕРА
// ====================================================================

function renderAll() {
    console.info(`⚠️   RENDER ALL (NEW STRUCTURE)   ⚠️`);
    
    try {
        renderScene();
        renderStats();
        renderChoices();
        renderAllGameItems();
        renderHistory();
        
        if (dom.turnCounter) {
            dom.turnCounter.innerHTML = `ХОДЫ: <span style="color: #888; font-family: monospace;">${State.getTurnCount()}</span>`;
        }
        
        console.info(`✅ ALL RENDERED (NEW STRUCTURE)`);
    } catch (error) {
        console.error('❌ Ошибка при рендеринге:', error.stack);
    }
}

// ====================================================================
// ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
// ====================================================================

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
                color = '#6c5ce7';
                break;
            case 'inventory':
                color = '#8b4513';
                break;
            case 'relations':
                color = '#ff9ff3';
                displayName = name.replace(/_/g, ' ');
                break;
            case 'bless':
                color = '#bdc3c7';
                break;
            case 'curse':
                color = '#ff3838';
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
        
        if (op.operation === 'MODIFY') {
            const delta = op.delta || 0;
            const sign = delta > 0 ? '+' : '';
            const color = delta > 0 ? '#4cd137' : '#e84118';
            
            if (itemType === 'stat') {
                display = `<span style="color:${color};">${getRussianStatName(name)} ${sign}${delta}</span>`;
            } else {
                display = `<span style="color:${color};">${name} ${sign}${delta}</span>`;
            }
        } else if (op.operation === 'ADD') {
            const icon = getGameItemIcon(op.id);
            display = `<span style="color:#4cd137;">+${icon} ${name}</span>`;
        } else if (op.operation === 'REMOVE') {
            const icon = getGameItemIcon(op.id);
            display = `<span style="color:#e84118;">-${icon} ${name}</span>`;
        } else if (op.operation === 'SET') {
            display = `<span style="color:#48dbfb;">${name} → ${op.value}</span>`;
        }
        
        if (display) {
            items.push(display);
        }
    });
    
    if (items.length === 0) return '';
    
    const bgColor = isSuccess ? '#0a1a0a' : '#1a0a0a';
    const borderColor = isSuccess ? '#4cd137' : '#e84118';
    const label = isSuccess ? '✅ При успехе' : '❌ При провале';
    
    return `<div style="font-size:0.7rem; margin-top:3px; padding:2px 4px; background:${bgColor}; border-left:2px solid ${borderColor}; border-radius:2px; opacity: 0.3">
        <div style="font-style:italic; margin-bottom:1px;">${label}:</div>
        ${items.join(', ')}
    </div>`;
}

// ====================================================================
// ПОДПИСКА НА СОБЫТИЯ
// ====================================================================

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
        renderAllGameItems();
    });
    
    State.onTurnComplete((data) => {
        console.log('🎯 Событие: turn:completed', data);
        renderHistory();
        renderAllGameItems();
        if (dom.turnCounter) {
            dom.turnCounter.innerHTML = `ХОДЫ: <span style="color: #888; font-family: monospace;">${State.getTurnCount()}</span>`;
        }
    });
}

setupStateObservers();

// Делаем функции доступными глобально
window.showGameItemTooltip = showGameItemTooltip;
window.showStatTooltip = showStatTooltip;

// ====================================================================
// ОСТАЛЬНЫЕ ФУНКЦИИ (без изменений)
// ====================================================================

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
            });
        };
    }
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

function formatDurationWithText(duration) {
    if (duration === undefined || duration === null) return '[?]';
    return `${duration} ход.`;
}

function startThoughtsOfHeroDisplay() {
    if (thoughtsOfHeroInterval) clearInterval(thoughtsOfHeroInterval);
    showThoughtsOfHeroLayout();
    
    thoughtsOfHeroInterval = setInterval(() => {
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
    }, 5000);
    
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

function stopThoughtsOfHeroDisplay() {
    if (thoughtsOfHeroInterval) {
        clearInterval(thoughtsOfHeroInterval);
        thoughtsOfHeroInterval = null;
    }
    
    hideThoughtsOfHeroLayout();
}

function showThoughtsOfHeroLayout() {
    if (dom.thoughtsOfHeroLayout) {
        dom.thoughtsOfHeroLayout.style.display = 'flex';
    }
}

function hideThoughtsOfHeroLayout() {
    if (dom.thoughtsOfHeroLayout) {
        dom.thoughtsOfHeroLayout.style.display = 'none';
    }
}

function updateThoughtsOfHeroText(text) {
    if (dom.thoughtsOfHeroText) {
        dom.thoughtsOfHeroText.textContent = text;
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
        dom.choicesCounter.textContent = `${state.freeModeText.length > 0 ? '✓' : '0'}/∞'`;
        
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

// ====================================================================
// ЭКСПОРТ ВСЕХ ПУБЛИЧНЫХ ФУНКЦИЙ
// ====================================================================

export const Render = {
    // Основные функции рендеринга
    renderStats,
    renderScene,
    renderChoices,
    renderAllGameItems,
    renderHistory,
    renderAll,
    
    renderOrganizations,
    
    // Тултипы и анимации
    showStatTooltip,
    showGameItemTooltip,
    showStatChangeAnimation,
    
    // Вспомогательные функции
    getStatDescription,
    getRelationColor,
    getRussianStatName,
    getStatColor,
    getGameItemIcon,
    
    // API Keys и модели
    updateApiKeyFields,
    renderModelSelectorByProvider,
    updateModelDetails,
    updateModelStats,
    updateLogCount,
    renderAuditList,
    
    // UI режимы
    updateUIMode,
    
    // Эффекты состояния
    applyStateEffects,
    
    // Модалы и алерты
    showAlert,
    showErrorAlert,
    showSuccessAlert,
    showWarningAlert,
    
    // Форматирование
    formatDuration,
    formatDurationWithText,
    formatCompactRequirements,
    formatCompactOperations,
    
    // Thoughts of Hero
    startThoughtsOfHeroDisplay,
    stopThoughtsOfHeroDisplay,
    showThoughtsOfHeroLayout,
    hideThoughtsOfHeroLayout,
    updateThoughtsOfHeroText
};

console.log('✅ 5-render.js (NEW STRUCTURE) загружен успешно');