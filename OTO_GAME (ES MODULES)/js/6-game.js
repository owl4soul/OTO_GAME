// Модуль 6: GAME - Игровая логика (js/6-game.js)
'use strict';

import { CONFIG } from './1-config.js';
import { State } from './3-state.js';
import { DOM } from './4-dom.js';
import { Render } from './5-render.js';
import { Utils } from './2-utils.js';
import { API } from './7-api-facade.js';
import { Saveload } from './9-saveload.js';
import { UI } from './ui.js';
import { Calculations } from './12-calculations.js'; // ИМПОРТ НОВОГО МОДУЛЯ

const dom = DOM.getDOM();

// Переменные состояния
let matrixInterval = null;
let activeAbortController = null;
let thoughtsOfHeroInterval = null;

/**
 * Переключение выбора варианта
 * @param {number} idx - Индекс варианта
 */
function toggleChoice(idx) {
    const state = State.getState();
    const pos = state.selectedChoices.indexOf(idx);
    
    if (pos >= 0) {
        state.selectedChoices.splice(pos, 1);
    } else {
        if (state.selectedChoices.length < CONFIG.maxChoices) {
            state.selectedChoices.push(idx);
        }
    }
    
    State.setState({ selectedChoices: state.selectedChoices });
    Render.renderChoices();
    UI.updateActionButtons();
}

/**
 * Запуск показа фраз героя на подложке
 */
function startThoughtsOfHeroDisplay() {
    if (thoughtsOfHeroInterval) clearInterval(thoughtsOfHeroInterval);
    Render.showThoughtsOfHeroLayout();
    
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
            Render.updateThoughtsOfHeroText(phrase);
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
            Render.updateThoughtsOfHeroText(phrase);
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
    Render.hideThoughtsOfHeroLayout();
}

/**
 * Рассчитывает результаты выбранных действий
 * @param {Array} selectedChoices - Массив выбранных объектов действий
 * @param {Object} currentState - Текущее состояние игры
 * @returns {Array} Массив результатов действий
 */
function calculateActionResults(selectedChoices, currentState) {
    if (!selectedChoices || selectedChoices.length === 0) {
        return [];
    }
    
    const actionResults = [];
    
    // Для каждого выбранного действия рассчитываем результат
    selectedChoices.forEach(choice => {
        if (!choice || !choice.text) {
            console.warn('❌ Пустой выбор в calculateActionResults');
            return;
        }
        
        // Генерируем d10 для этого действия
        const d10 = Math.ceil(Math.random() * 10);
        
        // Рассчитываем результат
        const result = Calculations.calculateActionResult(choice, currentState, d10);
        
        actionResults.push({
            text: choice.text,
            result: result.result,
            delta: result.delta,
            d10: result.d10,
            appliedChanges: result.appliedChanges,
            requirementsMet: result.requirementsMet
        });
    });
    
    return actionResults;
}

/**
 * Применяет изменения от действий к состоянию
 * @param {Object} state - Текущее состояние
 * @param {Array} actionResults - Результаты действий
 * @returns {Object} Обновленное состояние
 */
function applyActionChangesToState(state, actionResults) {
    if (!actionResults || actionResults.length === 0) {
        return state;
    }
    
    const updatedState = { ...state };
    
    // Применяем изменения от каждого действия
    actionResults.forEach(action => {
        if (action.appliedChanges) {
            Calculations.applyActionChanges(updatedState, action.appliedChanges);
        }
    });
    
    return updatedState;
}

/**
 * Форматирует результаты действий для отправки ИИ
 * @param {Array} actionResults - Результаты действий
 * @returns {string} Форматированная строка
 */
function formatActionResultsForAI(actionResults) {
    if (!actionResults || actionResults.length === 0) {
        return "Действия не выбраны";
    }
    
    return actionResults.map(action => 
        `"${action.text}" → ${action.result.toUpperCase()} (d10=${action.d10}, изменения: ${action.delta})`
    ).join('\n');
}

/**
 * Отправка хода игры
 * @param {number} retries - Количество оставшихся попыток
 */
async function submitTurn(retries = CONFIG.maxRetries) {
    const state = State.getState();
    
    // Отменяем предыдущий запрос, если он существует
    if (activeAbortController) {
        activeAbortController.abort();
        activeAbortController = null;
    }
    
    let selectedChoicesData = [];
    
    // Собираем данные выбранных действий
    if (state.freeMode) {
        const requestText = state.freeModeText.trim();
        if (requestText.length === 0) return;
        
        selectedChoicesData = [{
            text: requestText,
            requirements: { stats: {}, inventory: null },
            success_changes: { stats: {}, inventory_add: [], inventory_remove: [] },
            failure_changes: { stats: {}, inventory_add: [], inventory_remove: [] }
        }];
        
        dom.freeInputText.disabled = true;
        dom.freeInputText.style.opacity = '0.7';
    } else {
        if (state.selectedChoices.length === 0) return;
        
        selectedChoicesData = state.selectedChoices.map(i => {
            const choice = state.currentScene.choices[i];
            return {
                text: choice.text || "Действие",
                requirements: choice.requirements || { stats: {}, inventory: null },
                success_changes: choice.success_changes || { stats: {}, inventory_add: [], inventory_remove: [] },
                failure_changes: choice.failure_changes || { stats: {}, inventory_add: [], inventory_remove: [] }
            };
        });
    }
    
    // Рассчитываем результаты действий
    const actionResults = calculateActionResults(selectedChoicesData, state);
    if (actionResults.length === 0) {
        Render.showErrorAlert("Ошибка расчета", "Не удалось рассчитать результаты действий");
        return;
    }
    
    // Применяем изменения от действий к временному состоянию
    const tempState = JSON.parse(JSON.stringify(state));
    const updatedTempState = applyActionChangesToState(tempState, actionResults);
    
    // Форматируем результаты для ИИ
    const actionResultsText = formatActionResultsForAI(actionResults);
    
    dom.btnSubmit.innerHTML = '<span class="spinner"></span>';
    dom.btnSubmit.disabled = true;
    dom.btnClear.disabled = true;
    
    // Запускаем показ фраз на подложке
    startThoughtsOfHeroDisplay();
    
    // Создаем AbortController для таймаута
    activeAbortController = new AbortController();
    const timeoutId = setTimeout(() => {
        if (activeAbortController) {
            activeAbortController.abort();
            Render.showErrorAlert(
                "Таймаут запроса",
                "Запрос превысил лимит времени (120 секунд). Попробуйте снова.",
                new Error("Request timeout after 120000ms")
            );
        }
    }, CONFIG.requestTimeout);
    
    try {
        // Передаем обновленное состояние и результаты действий
        const data = await API.sendAIRequest(updatedTempState, actionResultsText, activeAbortController);
        
        clearTimeout(timeoutId);
        activeAbortController = null;
        
        // Останавливаем показ фраз на подложке
        stopThoughtsOfHeroDisplay();
        
        if (!data.scene || data.scene.length === 0) {
            if (retries > 0) {
                console.warn(`Ответ ИИ не содержит сцены. Повторная попытка ${CONFIG.maxRetries - retries + 1}.`);
                await new Promise(r => setTimeout(r, CONFIG.retryDelayMs));
                return submitTurn(retries - 1);
            } else {
                throw new Error("ИИ не смог сгенерировать сцену после нескольких попыток.");
            }
        }
        
        // Проверяем, есть ли в ответе мысли героя
        if (data.thoughtsOfHero && Array.isArray(data.thoughtsOfHero)) {
            State.addHeroPhrases(data.thoughtsOfHero);
        }
        
        // Обрабатываем ход с результатами действий
        processTurn(data, actionResults, selectedChoicesData);
        
    } catch (e) {
        clearTimeout(timeoutId);
        activeAbortController = null;
        
        // Останавливаем показ фраз на подложке
        stopThoughtsOfHeroDisplay();
        
        // Игнорируем ошибки отмены запроса
        if (e.name === 'AbortError') {
            console.log('Запрос отменен');
            return;
        }
        
        if (e.message.includes("парсинга JSON") && retries > 0) {
            console.warn(`JSON повреждён. Повторяем запрос... (${retries} попыток осталось)`);
            await new Promise(r => setTimeout(r, 1500));
            return submitTurn(retries - 1);
        }
        
        console.error('💥 Ошибка в submitTurn:', e);
        
        if (state.freeMode) {
            dom.freeInputText.disabled = false;
            dom.freeInputText.style.opacity = '1';
        }
        
        let errorMsg = e.message;
        if (e.message === 'Failed to fetch') {
            errorMsg += '\n\n🔍 Проверьте:\n- Запущен ли локальный сервер? (не file://)\n- Интернет/VPN?\n- DevTools → Network (ищите красный запрос).';
        } else if (e.message.includes('Введите API ключ')) {
            errorMsg += '\n\n🔑 Введите валидный API-ключ в настройках.';
        }
        
        Render.showErrorAlert("Ошибка соединения", errorMsg, e);
        
        dom.btnSubmit.innerHTML = '<i class="fas fa-paper-plane"></i> ОТПРАВИТЬ';
        dom.btnSubmit.disabled = false;
        dom.btnClear.disabled = false;
    } finally {
        if (state.freeMode) {
            dom.freeInputText.disabled = false;
            dom.freeInputText.style.opacity = '1';
            dom.freeInputText.focus();
        }
        Saveload.saveState();
    }
}

/**
 * Обработка ответа ИИ и обновление игры
 * @param {Object} data - Данные от ИИ
 * @param {Array} actionResults - Результаты действий
 * @param {Array} selectedChoicesData - Исходные данные выбранных действий
 */
function processTurn(data, actionResults, selectedChoicesData) {
    const state = State.getState();
    let updatesHTML = [];
    
    // --- 1. ПРИМЕНЯЕМ ИЗМЕНЕНИЯ ОТ ДЕЙСТВИЙ К РЕАЛЬНОМУ СОСТОЯНИЮ ---
    actionResults.forEach(action => {
        Calculations.applyActionChanges(state, action.appliedChanges);
        
        // Записываем в историю изменений
        const actionDescription = `"${action.text}" → ${action.result.toUpperCase()} (d10=${action.d10})`;
        if (action.delta && action.delta !== 'нет изменений') {
            updatesHTML.push(`
                <div style="margin-bottom: 6px;">
                    <span style="color:${action.result === 'success' ? '#4cd137' : action.result === 'partial' ? '#fbc531' : '#e84118'}; font-weight:bold;">
                        ${actionDescription}
                    </span>
                    <span style="color:#ccc; font-size:0.8em; margin-left: 8px;">
                        ${action.delta}
                    </span>
                </div>
            `);
        }
    });
    
    // --- 2. ПРИМЕНЯЕМ ИЗМЕНЕНИЯ ОТ ИИ ---
    
    // Статы от ИИ
    if (data.stat_changes && typeof data.stat_changes === 'object') {
        console.log("📊 Статы от ИИ:", data.stat_changes);
        
        for (const [rawKey, changeValue] of Object.entries(data.stat_changes)) {
            const key = Utils.normalizeStatKey(rawKey) || rawKey.toLowerCase();
            const numValue = Number(changeValue) || 0;
            
            if (key && state.stats[key] !== undefined && numValue !== 0) {
                const oldVal = state.stats[key];
                state.stats[key] = Math.max(0, Math.min(100, oldVal + numValue));
                
                const russianName = Render.getRussianStatName(key);
                const color = numValue > 0 ? '#4cd137' : '#e84118';
                const sign = numValue > 0 ? '+' : '';
                
                updatesHTML.push(`
                    <div style="margin-bottom: 6px;">
                        <span style="color:${color}; font-weight:bold;">
                            ${russianName}: ${sign}${numValue}
                        </span>
                        <span style="color:#666; font-size:0.8em;">
                            (${oldVal}→${state.stats[key]})
                        </span>
                    </div>
                `);
            }
        }
    }
    
    // Прогресс от ИИ
    if (data.progress_change !== undefined && data.progress_change !== 0) {
        const oldProgress = state.progress;
        state.progress += data.progress_change;
        const pColor = data.progress_change > 0 ? '#fbc531' : '#e84118';
        updatesHTML.push(`
            <div style="margin-bottom: 6px;">
                <span style="color:${pColor}; font-weight:bold;">
                    ПРОГРЕСС ${data.progress_change > 0 ? '+' : ''}${data.progress_change}
                </span>
                <span style="color:#666; font-size:0.8em;">
                    (${oldProgress}→${state.progress})
                </span>
            </div>
        `);
    }
    
    // Личность от ИИ
    const newPersonality = data.personality || data.personality_change;
    if (newPersonality && newPersonality !== state.personality) {
        const newPersonalityStr = String(newPersonality);
        const oldPersonality = state.personality;
        state.personality = newPersonalityStr;
        
        updatesHTML.push(`
            <div style="margin-bottom: 10px;">
                <span style="color:#00a8ff; font-weight:bold;">
                    <i class="fas fa-brain"></i> Личность изменилась
                </span>
                <div style="color:#ccc; padding-left: 15px; font-size: 0.9em;">
                    <div><strong>Было:</strong> ${oldPersonality ? oldPersonality.substring(0, 80) : ''}...</div>
                    <div><strong>Стало:</strong> ${newPersonalityStr.substring(0, 80)}...</div>
                </div>
            </div>
        `);
    }
    
    // Инвентарь от ИИ (теперь только изменения)
    if (data.inventory_changes && typeof data.inventory_changes === 'object') {
        Calculations.processInventoryChanges(state, data.inventory_changes);
        
        const added = data.inventory_changes.add || [];
        const removed = data.inventory_changes.remove || [];
        
        if (added.length > 0) {
            updatesHTML.push(`
                <div style="margin-bottom: 8px;">
                    <span style="color:#9c88ff; font-weight:bold;">
                        <i class="fas fa-plus-circle"></i> Получено от ИИ:
                    </span>
            `);
            added.forEach(item => {
                updatesHTML.push(`
                    <div style="color:#ccc; padding-left: 25px;">• ${item}</div>
                `);
            });
            updatesHTML.push(`</div>`);
        }
        
        if (removed.length > 0) {
            updatesHTML.push(`
                <div style="margin-bottom: 8px;">
                    <span style="color:#7f8fa6; font-weight:bold;">
                        <i class="fas fa-minus-circle"></i> Утеряно по воле ИИ:
                    </span>
            `);
            removed.forEach(item => {
                updatesHTML.push(`
                    <div style="color:#ccc; padding-left: 25px; text-decoration: line-through;">• ${item}</div>
                `);
            });
            updatesHTML.push(`</div>`);
        }
    }
    
    // Отношения от ИИ (теперь только изменения)
    if (data.relations_changes && typeof data.relations_changes === 'object') {
        Calculations.processRelationsChanges(state, data.relations_changes);
        
        const relationChanges = [];
        Object.entries(data.relations_changes).forEach(([npc, change]) => {
            const numChange = Number(change) || 0;
            if (numChange !== 0) {
                const color = numChange > 0 ? '#4cd137' : '#e84118';
                const sign = numChange > 0 ? '+' : '';
                relationChanges.push(`<span style="color:${color}">${npc}: ${sign}${numChange}</span>`);
            }
        });
        
        if (relationChanges.length > 0) {
            updatesHTML.push(`
                <div style="margin-bottom: 8px;">
                    <span style="color:#fbc531; font-weight:bold;">
                        <i class="fas fa-handshake"></i> Изменения отношений:
                    </span>
                    <div style="color:#ccc; padding-left: 25px;">
                        ${relationChanges.map(r => `<div>• ${r}</div>`).join('')}
                    </div>
                </div>
            `);
        }
    }
    
    // Навык от ИИ
    if (data.skill_add && typeof data.skill_add === 'string') {
        if (Calculations.processSkillAdd(state, data.skill_add)) {
            updatesHTML.push(`
                <div style="margin-bottom: 8px;">
                    <span style="color:#9c88ff; font-weight:bold;">
                        <i class="fas fa-scroll"></i> Новый навык:
                    </span>
                    <div style="color:#ccc; padding-left: 25px;">
                        <div>• ${data.skill_add}</div>
                    </div>
                </div>
            `);
        }
    }
    
    // Проверяем достижение новой степени
    const degreeAdvancement = Calculations.checkAndApplyDegreeAdvancement(state);
    if (degreeAdvancement.advanced) {
        updatesHTML.push(`
            <div style="margin-bottom: 8px; padding: 8px; background: rgba(212, 175, 55, 0.1); border-radius: 6px; border: 1px solid #d4af37;">
                <span style="color:#d4af37; font-weight:bold;">
                    <i class="fas fa-crown"></i> ДОСТИГНУТА НОВАЯ СТЕПЕНЬ!
                </span>
                <div style="color:#ccc; padding-left: 20px;">
                    <div>${degreeAdvancement.from.name} → ${degreeAdvancement.to.name}</div>
                    <div style="color:#fbc531; font-size: 0.9em;">+1 ко всем характеристикам</div>
                    <div style="color:#c23616; font-size: 0.85em; margin-top: 5px;">
                        <i class="fas fa-fire"></i> Начинается ритуал посвящения...
                    </div>
                </div>
            </div>
        `);
    }
    
    // Ритуалы
    const nextDegree = CONFIG.degrees.find(d => d.threshold > state.progress);
    const thresholdReached = nextDegree && state.progress >= nextDegree.threshold;
    
    if ((data.start_ritual || thresholdReached) && !state.isRitualActive) {
        state.isRitualActive = true;
        updatesHTML.push(`<span style="color:#c23616; font-weight:bold; text-shadow: 0 0 5px #c23616;"><i class="fas fa-fire"></i> НАЧАЛО РИТУАЛА</span>`);
        Utils.vibrate(CONFIG.vibrationPatterns.long);
    }
    
    if (state.isRitualActive && (data.end_ritual || data.ritual_completed)) {
        state.isRitualActive = false;
        updatesHTML.push(`<span style="color:#fbc531; font-weight:bold; text-shadow: 0 0 5px #fbc531;"><i class="fas fa-star"></i> РИТУАЛ ЗАВЕРШЕН</span>`);
        Utils.vibrate(CONFIG.vibrationPatterns.success);
    }
    
    // --- 3. ОБНОВЛЯЕМ ИСТОРИЮ И СЦЕНУ ---
    
    // Сохраняем сводку изменений
    const plainUpdates = updatesHTML.map(u => u.replace(/<[^>]*>?/gm, '')).join(' | ');
    const playerChoiceText = state.freeMode ? 
        selectedChoicesData[0].text : 
        selectedChoicesData.map(c => c.text).join(' + ');
    
    // Добавляем в историю
    state.history.push({
        sceneSnippet: data.scene.substring(0, 60) + "...",
        fullText: data.scene,
        choice: playerChoiceText,
        changes: plainUpdates,
        d10: actionResults.map(a => a.d10).join(',')
    });
    
    // Обновляем сцену
    state.currentScene = {
        text: data.scene || "...",
        choices: data.choices || state.currentScene.choices,
        reflection: data.reflection || "",
        d10: actionResults.map(a => a.d10).join(',')
    };
    
    // Обновляем сводку
    if (data.short_summary) {
        state.summary = (state.summary + " " + data.short_summary).trim();
        if (state.summary.length > 5000) {
            state.summary = state.summary.substring(state.summary.length - 5000);
        }
    }
    
    // Сбрасываем UI состояние
    state.freeMode = false;
    state.freeModeText = '';
    state.selectedChoices = [];
    
    // Обновляем глобальное состояние
    State.setState({
        history: state.history,
        currentScene: state.currentScene,
        freeMode: state.freeMode,
        freeModeText: state.freeModeText,
        selectedChoices: state.selectedChoices,
        summary: state.summary,
        inventory: state.inventory,
        relations: state.relations,
        skills: state.skills,
        aiMemory: state.aiMemory,
        stats: state.stats,
        progress: state.progress,
        personality: state.personality,
        degreeIndex: state.degreeIndex,
        isRitualActive: state.isRitualActive,
        ritualProgress: state.ritualProgress,
        ritualTarget: state.ritualTarget
    });
    
    // Увеличиваем счетчик ходов
    State.incrementTurnCount();
    
    // --- 4. РЕНДЕРИМ ОБНОВЛЕННЫЙ ИНТЕРФЕЙС ---
    Render.renderAll();
    
    // --- 5. ОТОБРАЖАЕМ ИЗМЕНЕНИЯ ЗА ХОД ---
    if (updatesHTML.length > 0) {
        // Создаем HTML для результата бросков d10
        const d10Results = actionResults.map(a => a.d10).join(', ');
        let d10Block = '';
        if (d10Results) {
            d10Block = `
                <div style="margin-bottom: 8px; padding: 5px; background: rgba(255, 215, 0, 0.1); border-radius: 4px; border: 1px solid #d4af37; font-size: 0.85rem; display: flex; align-items: center; gap: 8px;">
                    <i class="fas fa-dice-d10" style="color: #d4af37;"></i>
                    <span style="color: #fff;">Результаты бросков d10: <b style="color: #fbc531;">${d10Results}</b></span>
                </div>
            `;
        }
        
        // Формируем полный HTML изменений
        const updatesContent = `
            <div style="color: #d4af37; font-family: 'Roboto Mono', monospace; font-size: 0.9rem; font-weight: bold; margin-bottom: 10px; letter-spacing: 1px;">
                <i class="fas fa-clipboard-list"></i> ИЗМЕНЕНИЯ ЗА ХОД:
            </div>
            ${d10Block}
            <div style="border-top: 1px solid #333; padding-top: 12px; font-size: 0.85rem; line-height: 1.5;">
                ${updatesHTML.join('')}
            </div>
        `;
        
        // Показываем блок изменений
        dom.updates.style.display = 'block';
        dom.updates.innerHTML = updatesContent;
        
        // Сохраняем для восстановления после перезагрузки
        state.lastTurnUpdates = updatesContent;
    } else {
        dom.updates.style.display = 'none';
        state.lastTurnUpdates = "";
    }
    
    // Восстанавливаем UI
    UI.setFreeModeUI(false);
    dom.freeInputText.disabled = false;
    dom.freeInputText.style.opacity = '1';
    dom.freeModeToggle.checked = false;
    dom.btnSubmit.innerHTML = '<i class="fas fa-paper-plane"></i> ОТПРАВИТЬ';
    UI.updateActionButtons();
    
    // Сохраняем и проверяем конец игры
    Saveload.saveState();
    checkEndGame();
}

/**
 * Проверка условий окончания игры
 */
function checkEndGame() {
    const state = State.getState();
    
    // Поражение: любая характеристика упала до 0
    if (Object.values(state.stats).some(v => v <= 0)) {
        showEndScreen("ПОРАЖЕНИЕ", "Любой выбор несёт в себе утрату.", "#800");
        return;
    }
    
    // Победа: достигнут максимальный прогресс
    if (state.progress >= 1200) { // Используем новый порог из конфига
        showEndScreen("ПОБЕДА", "Свобода — это отсутствие необходимости выбирать.", "#d4af37", true);
        return;
    }
}

/**
 * Показать экран окончания игры (МАТРИЦА)
 * @param {string} title - Заголовок
 * @param {string} msg - Сообщение
 * @param {string} color - Цвет
 * @param {boolean} isVictory - Флаг победы
 */
function showEndScreen(title, msg, color, isVictory = false) {
    console.log("showEndScreen called");
    
    const canvas = document.getElementById('matrixCanvas');
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    
    const letters = '93 ΘΈΛΗΜΑ 93 ἈΓΆΠΗ 93 THELEMA 93 AGAPE93';
    let letterIndex = 0;
    
    // Слои матричного эффекта
    const layers = [
    {
        fontSize: 18,
        speed: 1.8,
        alpha: 0.9,
        colorFactor: 1.0,
        density: 0.7,
        resetChance: 0.98
    },
    {
        fontSize: 14,
        speed: 1.0,
        alpha: 0.7,
        colorFactor: 0.7,
        density: 0.85,
        resetChance: 0.975
    },
    {
        fontSize: 10,
        speed: 0.6,
        alpha: 0.4,
        colorFactor: 0.4,
        density: 1.0,
        resetChance: 0.97
    }];
    
    // Инициализация данных для каждого слоя
    const layerData = [];
    for (let i = 0; i < layers.length; i++) {
        const layer = layers[i];
        const columns = Math.floor(canvas.width / layer.fontSize);
        
        layerData.push({
            fontSize: layer.fontSize,
            speed: layer.speed,
            alpha: layer.alpha,
            colorFactor: layer.colorFactor,
            density: layer.density,
            resetChance: layer.resetChance,
            columns: columns,
            drops: Array(columns).fill(0).map(() => Math.random() * -canvas.height / layer.fontSize),
            waves: Array(columns).fill(0).map(() => Math.random() * Math.PI * 2),
            waveSpeed: 0.05 + Math.random() * 0.05
        });
    }
    
    // Функция для корректировки цвета
    function adjustColor(factor) {
        var red = Math.floor(0x88 * factor);
        return 'rgb(' + red + ',0,0)';
    }
    
    // Очищаем предыдущий интервал
    if (matrixInterval) clearInterval(matrixInterval);
    
    matrixInterval = setInterval(function() {
        ctx.fillStyle = 'rgba(0,0,0,0.05)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        for (let layerIdx = 0; layerIdx < layerData.length; layerIdx++) {
            const layer = layerData[layerIdx];
            ctx.globalAlpha = layer.alpha;
            ctx.fillStyle = adjustColor(layer.colorFactor);
            ctx.font = 'bold ' + layer.fontSize + 'px monospace';
            
            for (let i = 0; i < layer.drops.length; i++) {
                if (Math.random() > layer.density) continue;
                
                const x = i * layer.fontSize + Math.sin(layer.waves[i]) * layer.fontSize * 0.3;
                layer.waves[i] += layer.waveSpeed;
                const text = letters.charAt(letterIndex % letters.length);
                letterIndex++;
                const y = layer.drops[i] * layer.fontSize;
                
                if (y > -layer.fontSize && y < canvas.height) {
                    if (layerIdx === 0) {
                        ctx.shadowColor = '#880000';
                        ctx.shadowBlur = 8;
                    }
                    ctx.fillText(text, x, y);
                    ctx.shadowColor = 'transparent';
                    ctx.shadowBlur = 0;
                }
                
                layer.drops[i] += layer.speed;
                
                if (layer.drops[i] * layer.fontSize > canvas.height && Math.random() > layer.resetChance) {
                    layer.drops[i] = 0;
                    layer.waves[i] = Math.random() * Math.PI * 2;
                }
            }
        }
        
        ctx.globalAlpha = 1.0;
    }, 33);
    
    // Устанавливаем текст и стили
    document.getElementById('endTitle').textContent = title;
    document.getElementById('endTitle').style.color = color;
    document.getElementById('endMsg').textContent = msg;
    document.getElementById('btnContinueGame').style.display = isVictory ? 'inline-block' : 'none';
    dom.overlay.style.display = 'block';
}

/**
 * Продолжение игры после победы
 */
function continueGame() {
    dom.overlay.style.display = 'none';
    if (matrixInterval) {
        clearInterval(matrixInterval);
        matrixInterval = null;
    }
}

/**
 * Начать заново игру после победы/поражения
 */
function restartGame() {
    if (confirm("Начать путь заново?")) {
        if (matrixInterval) {
            clearInterval(matrixInterval);
            matrixInterval = null;
        }
        dom.overlay.style.display = 'none';
        localStorage.removeItem('oto_v3_state');
        location.reload();
    }
}

/**
 * Очистка выбранных вариантов или свободного ввода
 */
function handleClear() {
    const state = State.getState();
    
    if (state.freeMode) {
        state.freeModeText = '';
        dom.freeInputText.value = '';
        dom.choicesCounter.textContent = '0/∞';
        State.setState({ freeModeText: '' });
    } else {
        state.selectedChoices = [];
        State.setState({ selectedChoices: [] });
        Render.renderChoices();
    }
    
    // Обновляем обе кнопки
    UI.updateActionButtons();
}

/**
 * Обработчик переключения режима ввода
 * @param {Event} e - Событие
 */
function handleFreeModeToggle(e) {
    const state = State.getState();
    const isFreeMode = e.target.checked;
    state.freeMode = isFreeMode;
    
    // Сначала обновляем состояние данных
    if (state.freeMode) {
        state.freeModeText = dom.freeInputText.value;
    }
    
    // Сохраняем стейт
    State.setState({
        freeMode: state.freeMode,
        freeModeText: state.freeModeText,
        selectedChoices: state.selectedChoices
    });
    
    // Обновляем UI
    UI.setFreeModeUI(isFreeMode);
    
    // Обновляем кнопки
    UI.updateActionButtons();
    
    // Сохраняем на диск
    Saveload.saveState();
}

// Публичный интерфейс модуля
export const Game = {
    toggleChoice,
    submitTurn,
    continueGame,
    restartGame,
    handleClear,
    handleFreeModeToggle
};