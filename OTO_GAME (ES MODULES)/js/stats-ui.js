// Модуль: STATS UI - Рендеринг строки статов и связанных анимаций (v6.1 — полностью согласован с Parser v6.1 + State 5.1)

'use strict';

import { State } from './3-state.js';
import { DOM } from './4-dom.js';
import { Utils } from './2-utils.js';
import { CONFIG } from './1-config.js';

const dom = DOM.getDOM();

/**
 * Менеджер отображения строки статов (will, stealth, influence, sanity) + прогресс-бар + степени посвящения.
 * 
 * Основная ответственность:
 * - Отображение текущих значений статов с учётом баффов/дебаффов
 * - Анимация изменений (летающие числа + пульсация)
 * - Тултипы с описаниями при клике
 * - Обновление прогресс-бара уровня и визуализации степеней
 * - Подписка на события State.HERO_CHANGED и State.TURN_COMPLETED
 * 
 * @class StatsUIManager
 */
class StatsUIManager {
    constructor() {
        /** @type {boolean} Флаг, что менеджер уже инициализирован */
        this.initialized = false;
        
        /** @type {Object} Предыдущие базовые значения статов (для расчёта дельты и анимации) */
        this.previousBaseStats = {};
        
        /** @type {number} Номер последнего отрендеренного хода (для оптимизации) */
        this.lastRenderedTurn = 0;
    }

    /**
     * Инициализация StatsUI (вызывается один раз из Init).
     * 
     * Логика по шагам:
     * 1. Проверка флага initialized (защита от повторной инициализации)
     * 2. Сохранение начальных базовых значений статов
     * 3. Регистрация глобальной функции window.showStatTooltip
     * 4. Подписка на события State
     * 5. Первый полный рендер
     * 6. Установка флага initialized = true
     */
    initialize() {
        if (this.initialized) return;

        console.log('🎮 Инициализация StatsUI...');

        // ШАГ 2: сохраняем начальные базовые значения
        const baseStats = this.getBaseStats();
        this.previousBaseStats = { ...baseStats };

        // ШАГ 3: регистрация глобальной функции для onclick в HTML
        if (!window.showStatTooltip) {
            window.showStatTooltip = (element, statName, value) => this.showStatTooltip(element, statName, value);
            console.log('🌐 Глобальная функция showStatTooltip зарегистрирована');
        }

        // ШАГ 4: подписки
        this.setupEventListeners();

        // ШАГ 5: первый рендер
        this.render();

        this.initialized = true;
        console.log('✅ StatsUI инициализирован');
    }

    /**
     * Настройка подписок на события State.
     * 
     * Подписываемся на:
     * - HERO_CHANGED (изменение статов, баффы, дебаффы)
     * - TURN_COMPLETED (обновление после каждого хода)
     */
    setupEventListeners() {
        State.on(State.EVENTS.HERO_CHANGED, (data) => {
            console.log('🎯 StatsUI: HERO_CHANGED событие получено');
            this.render();
        });

        State.on(State.EVENTS.TURN_COMPLETED, (data) => {
            const turn = data?.turnCount || State.getGame().turnCount;
            console.log(`🔄 StatsUI: TURN_COMPLETED, ход ${turn}`);
            this.render();
        });

        console.log('🔗 StatsUI: подписки на события успешно установлены');
    }

    /**
     * Получает текущие базовые значения четырёх основных статов.
     * 
     * @returns {Object} { will: number, stealth: number, influence: number, sanity: number }
     */
    getBaseStats() {
        return {
            will: State.getGameItemValue('stat:will') || 50,
            stealth: State.getGameItemValue('stat:stealth') || 50,
            influence: State.getGameItemValue('stat:influence') || 50,
            sanity: State.getGameItemValue('stat:sanity') || 50
        };
    }

    /**
     * Возвращает цвет для значения стата (градиент от красного к белому).
     * 
     * @param {number} value - текущее значение стата (0-100)
     * @returns {string} hex-цвет
     */
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

    /**
     * Возвращает подробное описание стата для тултипа.
     * 
     * @param {string} statName - имя стата ('will', 'stealth', 'influence', 'sanity')
     * @param {number} value - текущее значение
     * @returns {string} описание
     */
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

        const statDescriptions = descriptions[statName] || {};
        const val = Math.max(0, Math.min(100, value));
        const bracket = Math.floor(val / 10) * 10;
        return statDescriptions[bracket] || "Характеристика неизвестна";
    }

    /**
     * Показывает анимацию изменения значения стата (летающее число + пульсация).
     * 
     * @param {HTMLElement} element - элемент стата
     * @param {number} delta - изменение (+ или -)
     * @param {string} color - цвет анимации
     */
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

    /**
     * Показывает тултип с описанием стата.
     * 
     * @param {HTMLElement} element - элемент, по которому кликнули
     * @param {string} statName - имя стата
     * @param {number} value - текущее значение
     */
    showStatTooltip(element, statName, value) {
        const existingTooltip = document.querySelector('.stat-tooltip');
        if (existingTooltip) existingTooltip.remove();

        const description = this.getStatDescription(statName, value);
        const color = this.getStatColor(value);

        const tooltip = document.createElement('div');
        tooltip.className = 'stat-tooltip';
        tooltip.innerHTML = `
            <div style="font-weight: bold; color: ${color}; margin-bottom: 5px; font-size: 1em; text-shadow: 0 0 5px ${color}40;">
                ${Utils.getRussianStatName(statName)}: ${value}/100
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
        let left = rect.left + window.scrollX;
        let top = rect.bottom + window.scrollY + 5;

        if (left + tooltip.offsetWidth > window.innerWidth) left = window.innerWidth - tooltip.offsetWidth - 10;
        if (left < 10) left = 10;
        if (top + tooltip.offsetHeight > window.innerHeight + window.scrollY) top = rect.top + window.scrollY - tooltip.offsetHeight - 5;

        tooltip.style.left = `${left}px`;
        tooltip.style.top = `${top}px`;

        const removeTooltip = () => {
            if (tooltip && tooltip.parentNode) {
                tooltip.style.animation = 'tooltipFadeOut 0.2s ease-out';
                setTimeout(() => {
                    if (tooltip && tooltip.parentNode) tooltip.parentNode.removeChild(tooltip);
                }, 200);
            }
            document.removeEventListener('click', removeTooltip);
        };

        setTimeout(() => document.addEventListener('click', removeTooltip), 100);
        setTimeout(removeTooltip, 5000);
    }

    /**
     * Основной метод рендеринга всей строки статов.
     * 
     * Логика по шагам:
     * 1. Получаем текущие базовые значения статов
     * 2. Собираем все баффы и дебаффы
     * 3. Для каждого стата (will, stealth, influence, sanity):
     *    - рассчитываем итоговое значение
     *    - показываем анимацию изменения
     *    - формируем детальный HTML с модификаторами
     * 4. Обновляем прогресс-бар уровня
     * 5. Обновляем визуализацию степеней посвящения
     */
    render() {
        console.log('🔍 StatsUI.render called');

        const game = State.getGame();
        const baseStats = this.getBaseStats();

        // ШАГ 1: обновление счётчика ходов
        const turnCounter = dom.turnCounter;
        if (turnCounter) {
            turnCounter.textContent = `Ход: ${game.turnCount}`;
            console.log(`📊 Счётчик ходов обновлён: ${game.turnCount}`);
        }

        // ШАГ 2: сбор баффов и дебаффов
        const buffs = State.getGameItemsByType('buff:');
        const debuffs = State.getGameItemsByType('debuff:');

        const statEffects = {
            will: { buffs: [], debuffs: [] },
            stealth: { buffs: [], debuffs: [] },
            influence: { buffs: [], debuffs: [] },
            sanity: { buffs: [], debuffs: [] }
        };

        buffs.forEach(buff => {
            const statName = buff.id.split(':')[1];
            if (statEffects[statName]) statEffects[statName].buffs.push(buff);
        });

        debuffs.forEach(debuff => {
            const statName = debuff.id.split(':')[1];
            if (statEffects[statName]) statEffects[statName].debuffs.push(debuff);
        });

        // ШАГ 3: рендер каждого стата
        ['will', 'stealth', 'influence', 'sanity'].forEach(statName => {
            const valElement = dom.vals[statName];
            if (!valElement) return;

            const baseValue = baseStats[statName];
            const previousBase = this.previousBaseStats[statName] || baseValue;
            const { buffs: buffList, debuffs: debuffList } = statEffects[statName];

            const totalBuff = buffList.reduce((sum, b) => sum + (b.value || 0), 0);
            const totalDebuff = debuffList.reduce((sum, d) => sum + (d.value || 0), 0);
            const currentValue = baseValue + totalBuff + totalDebuff;

            const currentColor = this.getStatColor(currentValue);
            const delta = baseValue - previousBase;

            if (delta !== 0) {
                this.showStatChangeAnimation(valElement, delta, currentColor);
            }

            this.previousBaseStats[statName] = baseValue;

            let detailHtml = '';
            if (buffList.length || debuffList.length) {
                detailHtml = `<span style="color: #888; font-size: 0.8em;">${baseValue}</span>`;
                buffList.forEach(b => detailHtml += ` <span style="color: #4cd137; font-size: 0.8em;">+${b.value}</span>`);
                debuffList.forEach(d => detailHtml += ` <span style="color: #e84118; font-size: 0.8em;">${d.value}</span>`);
            }

            valElement.innerHTML = `
                <div class="stat-container" style="display: flex; justify-content: space-between; align-items: center; position: relative;">
                    <span style="color: #999; font-size: 0.85em;">${Utils.getRussianStatName(statName)}:</span>
                    <span class="stat-value-clickable" 
                          data-stat="${statName}" 
                          data-value="${currentValue}"
                          onclick="window.showStatTooltip(this, '${statName}', ${currentValue})"
                          style="color: ${currentColor}; font-weight: bold; font-size: 1.1em; text-shadow: 0 0 3px ${currentColor}40; cursor: help; user-select: none;">
                        ${currentValue}
                    </span>
                </div>
                ${detailHtml ? `<div style="font-size: 0.7em; color: #666; text-align: right;">${detailHtml}</div>` : ''}
            `;
        });

        // ШАГ 4: прогресс-бар уровня
        const progressValue = State.getGameItemValue('progress:level') || 0;
        const maxScore = 110;
        const pct = Math.min(100, Math.max(0, (progressValue / maxScore) * 100));
        if (dom.tube) {
            dom.tube.style.height = `${pct}%`;
        }

        // ШАГ 5: визуализация степеней посвящения
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

    /**
     * Принудительное обновление всей строки статов.
     */
    forceUpdate() {
        console.log('🔄 StatsUI: принудительное обновление');
        this.render();
    }
}

// Создаём и экспортируем синглтон
const statsUI = new StatsUIManager();
export const StatsUI = statsUI;