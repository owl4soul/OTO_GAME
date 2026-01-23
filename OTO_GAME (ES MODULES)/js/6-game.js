// Модуль 6: GAME - Игровая логика (ОБНОВЛЕННАЯ ВЕРСИЯ)
'use strict';

import { CONFIG } from './1-config.js';
import { State } from './3-state.js';
import { DOM } from './4-dom.js';
import { Render } from './5-render.js';
import { Utils } from './2-utils.js';
import { API } from './7-api-facade.js';
import { Saveload } from './9-saveload.js';
import { UI } from './ui.js';
import { Calculations } from './12-calculations.js';

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
 * РАСЧЕТ РЕЗУЛЬТАТОВ ВЫБРАННЫХ ДЕЙСТВИЙ (НОВАЯ ВЕРСИЯ)
 * Использует обновленную формулу из Calculations
 * @param {Array} selectedChoices - Массив выбранных объектов действий
 * @param {Object} currentState - Текущее состояние игры
 * @param {number} d10 - Общий бросок удачи на ход (1-10)
 * @returns {Object} {actionResults, selectedActions}
 */
function calculateActionResults(selectedChoices, currentState, d10) {
    if (!selectedChoices || selectedChoices.length === 0) {
        return { actionResults: [], selectedActions: [] };
    }
    
    const actionResults = [];
    
    // Для каждого выбранного действия рассчитываем результат по НОВОЙ ФОРМУЛЕ
    selectedChoices.forEach(choice => {
        if (!choice || !choice.text) {
            console.warn('❌ Пустой выбор в calculateActionResults');
            return;
        }
        
        // Рассчитываем результат с использованием обновленного Calculations
        const result = Calculations.calculateActionResult(choice, currentState, d10);
        
        actionResults.push({
            text: result.text,
            result: result.result, // "полный успех", "частичный успех" и т.д.
            delta: result.delta,
            d10: result.d10,
            appliedChanges: result.appliedChanges,
            requirementsCheck: result.requirementsCheck
        });
    });
    
    // Формируем selectedActions для отправки ИИ (НОВЫЙ ФОРМАТ)
    const selectedActions = Calculations.formatSelectedActionsForAI(actionResults);
    
    return { actionResults, selectedActions };
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
            Calculations.applyActionChangesToState(updatedState, action.appliedChanges);
        }
    });
    
    return updatedState;
}

/**
 * Отправка хода игры (ОБНОВЛЕННАЯ ВЕРСИЯ)
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
    
    // ГЕНЕРИРУЕМ ОБЩИЙ D10 НА ХОД (НОВОЕ!)
    const d10 = Calculations.generateD10();
    console.log(`🎲 Общий бросок удачи на ход: d10 = ${d10}`);
    
    // Рассчитываем результаты действий по НОВОЙ ФОРМУЛЕ
    const { actionResults, selectedActions } = calculateActionResults(selectedChoicesData, state, d10);
    
    if (!actionResults || actionResults.length === 0) {
        Render.showErrorAlert("Ошибка расчета", "Не удалось рассчитать результаты действий");
        return;
    }
    
    // Применяем изменения от действий к временному состоянию
    const tempState = JSON.parse(JSON.stringify(state));
    const updatedTempState = applyActionChangesToState(tempState, actionResults);
    
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
        // Передаем обновленное состояние и selectedActions в НОВОМ ФОРМАТЕ
        const data = await API.sendAIRequest(updatedTempState, selectedActions, activeAbortController, d10);
        
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
        processTurn(data, actionResults, selectedChoicesData, d10);
        
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
 * Обработка ответа ИИ и обновление игры (ОБНОВЛЕННАЯ ВЕРСИЯ)
 * @param {Object} data - Данные от ИИ
 * @param {Array} actionResults - Результаты действий (рассчитанные нами)
 * @param {Array} selectedChoicesData - Исходные данные выбранных действий
 * @param {number} d10 - Общий бросок удачи на ход
 */
function processTurn(data, actionResults, selectedChoicesData, d10) {
    // Безопасная проверка actionResults
    if (!Array.isArray(actionResults)) {
        console.error('actionResults is not an array', actionResults);
        Render.showErrorAlert('Ошибка обработки', 'Некорректные результаты действий');
        return;
    }
    
    const state = State.getState();
    let updatesHTML = [];
    
    // --- 1. ВЫВОД ИНФОРМАЦИИ О БРОСКЕ D10 ---
    updatesHTML.push(`
        <div style="margin-bottom: 8px; padding: 5px; background: rgba(212, 175, 55, 0.1); border-radius: 4px; border: 1px solid #d4af37; font-size: 0.85rem;">
            <i class="fas fa-dice-d10" style="color: #d4af37;"></i>
            <span style="color: #fff; margin-left: 8px;">Общий бросок удачи на ход: <b style="color: #fbc531;">d10 = ${d10}</b></span>
        </div>
    `);
    
    // --- 2. ПРИМЕНЯЕМ ИЗМЕНЕНИЯ ОТ ДЕЙСТВИЙ К РЕАЛЬНОМУ СОСТОЯНИЮ ---
    actionResults.forEach(action => {
        if (action.appliedChanges) {
            Calculations.applyActionChangesToState(state, action.appliedChanges);
        }
        
        // Записываем в историю изменений
        const actionDescription = `"${action.text}" → ${action.result.toUpperCase()}`;
        if (action.delta && action.delta !== 'нет изменений') {
            updatesHTML.push(`
                <div style="margin-bottom: 6px;">
                    <span style="color:${action.result.includes('успех') ? '#4cd137' : '#e84118'}; font-weight:bold;">
                        ${actionDescription}
                    </span>
                    <span style="color:#ccc; font-size:0.8em; margin-left: 8px;">
                        ${action.delta}
                    </span>
                </div>
            `);
        }
    });
    
    // --- 3. ПРИМЕНЯЕМ ИЗМЕНЕНИЯ ОТ ИИ (НОВЫЕ ПОЛЯ) ---
    
    // Личность от ИИ и последствия изменения личности
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
        
        // Обрабатываем последствия изменения личности
        if (data.personality_consequences && Array.isArray(data.personality_consequences)) {
            data.personality_consequences.forEach(consequence => {
                if (consequence.category === 'stat' && consequence.name) {
                    const statKey = Utils.normalizeStatKey(consequence.name);
                    const change = parseInt(consequence.description) || 0;
                    if (statKey && state.stats.hasOwnProperty(statKey)) {
                        const oldValue = state.stats[statKey];
                        state.stats[statKey] = Math.max(0, Math.min(100, oldValue + change));
                        updatesHTML.push(`
                            <div style="margin-left: 20px; font-size: 0.8rem; color: ${change > 0 ? '#4cd137' : '#e84118'};">
                                <i class="fas ${change > 0 ? 'fa-arrow-up' : 'fa-arrow-down'}"></i>
                                ${Render.getRussianStatName(statKey)}: ${change > 0 ? '+' : ''}${change}
                            </div>
                        `);
                    }
                } else if (consequence.category === 'skill' && !consequence.isRemoving) {
                    if (Calculations.processSkillAdd(state, consequence.name)) {
                        updatesHTML.push(`
                            <div style="margin-left: 20px; font-size: 0.8rem; color: #9c88ff;">
                                <i class="fas fa-scroll"></i> Новый навык: ${consequence.name}
                            </div>
                        `);
                    }
                }
            });
        }
    }
    
    // ИНВЕНТАРЬ ОТ ИИ - ТЕПЕРЬ ТОЛЬКО ИЗМЕНЕНИЯ (НОВОЕ ПОЛЕ)
    if (data.inventory_changes && typeof data.inventory_changes === 'object' && 
        data.inventory_changes !== null && !Array.isArray(data.inventory_changes)) {
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
    
    // ОТНОШЕНИЯ ОТ ИИ - ТЕПЕРЬ ТОЛЬКО ИЗМЕНЕНИЯ (НОВОЕ ПОЛЕ)
    if (data.relations_changes && typeof data.relations_changes === 'object' && 
        data.relations_changes !== null && !Array.isArray(data.relations_changes)) {
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
    
    // НАВЫК ОТ ИИ (НОВОЕ ПОЛЕ)
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
    
    // Баффы/дебаффы от ИИ
    if (data.buffs_debuffs && Array.isArray(data.buffs_debuffs)) {
        data.buffs_debuffs.forEach(buff => {
            if (buff.stat && typeof buff.stat === 'string' && typeof buff.value === 'number') {
                const statKey = Utils.normalizeStatKey(buff.stat);
                if (statKey && state.stats.hasOwnProperty(statKey)) {
                    const isPermanent = buff.isPermanent === true;
                    const duration = isPermanent ? null : (parseInt(buff.duration) || 1);
                    
                    // Сохраняем бафф в состояние
                    if (!state.buffs) state.buffs = [];
                    state.buffs.push({
                        stat: statKey,
                        value: buff.value,
                        isPermanent: isPermanent,
                        duration: duration,
                        description: buff.description || '',
                        source: buff.source || 'ИИ'
                    });
                    
                    // Применяем немедленно
                    state.stats[statKey] = Math.max(0, Math.min(100, state.stats[statKey] + buff.value));
                    
                    updatesHTML.push(`
                        <div style="margin-bottom: 8px;">
                            <span style="color:${buff.value > 0 ? '#4cd137' : '#e84118'}; font-weight:bold;">
                                <i class="fas ${buff.value > 0 ? 'fa-arrow-up' : 'fa-arrow-down'}"></i>
                                ${buff.value > 0 ? 'Бафф' : 'Дебафф'}: ${Render.getRussianStatName(statKey)}
                            </span>
                            <div style="color:#ccc; padding-left: 25px; font-size: 0.85rem;">
                                <div>${buff.description || ''}</div>
                                <div style="color:#888; font-size: 0.75rem;">
                                    ${isPermanent ? 'Постоянный' : `Длительность: ${duration} ходов`}
                                </div>
                            </div>
                        </div>
                    `);
                }
            }
        });
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
    
    // Обновляем баффы/дебаффы (уменьшаем длительность)
    if (state.buffs && state.buffs.length > 0) {
        const expiredBuffs = [];
        state.buffs.forEach((buff, index) => {
            if (!buff.isPermanent && buff.duration > 0) {
                buff.duration--;
                if (buff.duration <= 0) {
                    // Истекает - удаляем эффект
                    state.stats[buff.stat] = Math.max(0, Math.min(100, state.stats[buff.stat] - buff.value));
                    expiredBuffs.push(index);
                    
                    updatesHTML.push(`
                        <div style="margin-bottom: 8px; color: #888; font-size: 0.8rem;">
                            <i class="fas fa-clock"></i> Истёк ${buff.value > 0 ? 'бафф' : 'дебафф'}: ${Render.getRussianStatName(buff.stat)}
                        </div>
                    `);
                }
            }
        });
        
        // Удаляем истекшие баффы
        if (expiredBuffs.length > 0) {
            state.buffs = state.buffs.filter((_, index) => !expiredBuffs.includes(index));
        }
    }
    
    // --- 4. ОБНОВЛЯЕМ ИСТОРИЮ И СЦЕНУ ---
    
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
        d10: d10 // Сохраняем общий d10
    });
    
    // Обновляем сцену
    state.currentScene = {
        text: data.scene || "...",
        choices: data.choices || state.currentScene.choices,
        reflection: data.reflection || ""
    };
    
    // Обновляем сводку
    if (data.short_summary) {
        state.summary = (state.summary + " " + data.short_summary).trim();
        if (state.summary.length > 5000) {
            state.summary = state.summary.substring(state.summary.length - 5000);
        }
    }
    
    // Обновляем динамическую память ИИ (кроме инвентаря и отношений)
    if (data.aiMemory && typeof data.aiMemory === 'object') {
        state.aiMemory = { ...state.aiMemory, ...data.aiMemory };
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
        ritualTarget: state.ritualTarget,
        buffs: state.buffs || []
    });
    
    // Увеличиваем счетчик ходов
    State.incrementTurnCount();
    
    // --- 5. РЕНДЕРИМ ОБНОВЛЕННЫЙ ИНТЕРФЕЙС ---
    Render.renderAll();
    
    // --- 6. ОТОБРАЖАЕМ ИЗМЕНЕНИЯ ЗА ХОД ---
    if (updatesHTML.length > 0) {
        // Формируем полный HTML изменений
        const updatesContent = `
            <div style="color: #d4af37; font-family: 'Roboto Mono', monospace; font-size: 0.9rem; font-weight: bold; margin-bottom: 10px; letter-spacing: 1px;">
                <i class="fas fa-clipboard-list"></i> ИЗМЕНЕНИЯ ЗА ХОД:
            </div>
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

/**
 * ТЕСТОВАЯ ФУНКЦИЯ: Проверка новой формулы расчета
 */
function testNewFormula() {
    console.log("🧪 Запуск теста новой формулы расчета...");
    
    const testState = {
        stats: {
            will: 74,      // база = 8
            stealth: 56,   // база = 6  
            influence: 29, // база = 3
            sanity: 100    // база = 10
        },
        inventory: ["Книга Закона", "Ритуальный кинжал"]
    };
    
    const testChoice = {
        text: "Тестовое действие",
        requirements: {
            stats: { sanity: 12, stealth: 8 },
            inventory: "Книга Закона"
        },
        success_changes: {
            stats: { sanity: 3, stealth: 2 },
            inventory_add: ["Документы"],
            inventory_remove: []
        },
        failure_changes: {
            stats: { sanity: -2, stealth: -1 },
            inventory_add: [],
            inventory_remove: ["Книга Закона"]
        }
    };
    
    // Тестируем с разными d10
    for (let d10 = 1; d10 <= 10; d10++) {
        console.log(`\n--- Тест с d10 = ${d10} ---`);
        const result = Calculations.calculateActionResult(testChoice, testState, d10);
        console.log(`Результат: ${result.result}`);
        console.log(`Дельта: ${result.delta}`);
        console.log(`Проверка требований:`, result.requirementsCheck);
    }
    
    // Запускаем встроенный тест Calculations
    Calculations.testFormula();
}

// Добавляем тестовую функцию в глобальную область видимости для отладки
window.testNewFormula = testNewFormula;

// Публичный интерфейс модуля
export const Game = {
    toggleChoice,
    submitTurn,
    continueGame,
    restartGame,
    handleClear,
    handleFreeModeToggle,
    testNewFormula
};