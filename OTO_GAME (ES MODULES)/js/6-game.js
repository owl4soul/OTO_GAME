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
    
    const d10 = Math.ceil(Math.random() * 10);
    
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
        // Передаем массив объектов выбранных choices
        const data = await API.sendAIRequest(selectedChoicesData, d10, activeAbortController);
        
        clearTimeout(timeoutId);
        activeAbortController = null;
        
        // Останавливаем показ фраз на подложке
        stopThoughtsOfHeroDisplay();
        
        if (!data.choices || data.choices.length === 0) {
            if (retries > 0) {
                console.warn(`Ответ ИИ не содержит действий. Повторная попытка ${CONFIG.maxRetries - retries + 1}.`);
                await new Promise(r => setTimeout(r, CONFIG.retryDelayMs));
                return submitTurn(retries - 1);
            } else {
                throw new Error("ИИ не смог сгенерировать варианты действий после нескольких попыток.");
            }
        }
        
        // Проверяем, есть ли в ответе мысли героя
        // ИСПРАВЛЕНО: используем thoughtsOfHeroResponse, а не thoughtsOfHero
        if (data.thoughtsOfHeroResponse && Array.isArray(data.thoughtsOfHeroResponse)) {
            State.addHeroPhrases(data.thoughtsOfHeroResponse);
        }
        
        // Передаем выбранные объекты choices
        processTurn(data, selectedChoicesData, d10);
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
 * Обработка ответа ИИ и обновление игры (ИСПРАВЛЕНО)
 * @param {Object} data - Данные от ИИ
 * @param {Array} selectedChoices - Массив выбранных объектов choices
 * @param {number} d10 - Результат броска d10
 */
function processTurn(data, selectedChoices, d10) {
    const state = State.getState();
    let updatesHTML = [];
    
    // --- 1. СТАТЫ ---
    const VALID_STATS = ['will', 'stealth', 'influence', 'sanity'];
    
    if (data.stat_changes && typeof data.stat_changes === 'object') {
        console.log("📊 Статы от ИИ:", data.stat_changes);
        
        for (const [rawKey, changeValue] of Object.entries(data.stat_changes)) {
            let key = Utils.normalizeStatKey(rawKey) || rawKey.toLowerCase();
            
            // Исправление common алиасов
            if (key === 'reason') key = 'sanity';
            if (key === 'volya' || key === 'воля') key = 'will';
            
            if (VALID_STATS.includes(key) && changeValue !== 0) {
                const oldVal = state.stats[key] || 50;
                const newVal = Math.max(0, Math.min(100, oldVal + Number(changeValue)));
                state.stats[key] = newVal;
                
                const russianName = Render.getRussianStatName(key);
                const color = changeValue > 0 ? '#4cd137' : '#e84118';
                const sign = changeValue > 0 ? '+' : '';
                
                updatesHTML.push(`
                    <div style="margin-bottom: 6px;">
                        <span style="color:${color}; font-weight:bold;">
                            ${russianName}: ${sign}${changeValue}
                        </span>
                        <span style="color:#666; font-size:0.8em;">
                            (${oldVal}→${newVal})
                        </span>
                    </div>
                `);
            }
        }
        State.setState({ stats: state.stats });
    }
    
    // --- 2. ПРОГРЕСС ---
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
        State.syncDegree();
        State.setState({ progress: state.progress });
    }
    
    // --- 3. ЛИЧНОСТЬ ---
    const newPersonality = data.personality || data.personality_change;
    if (newPersonality && newPersonality !== state.personality) {
        // Защитное преобразование в строку
        const newPersonalityStr = String(newPersonality);
        const oldPersonality = state.personality;
        state.personality = newPersonalityStr;
        
        updatesHTML.push(`
        <div style="margin-bottom: 10px;">
            <span style="color:#00a8ff; font-weight:bold;">
                <i class="fas fa-brain"></i> Личность изменилась
            </span>
            <div style="color:#ccc; padding-left: 15px; font-size: 0.9em;">
                <div><strong>Было:</strong> ${oldPersonality ? oldPersonality.substring(0, 100) : ''}...</div>
                <div><strong>Стало:</strong> ${newPersonalityStr.substring(0, 100)}...</div>
            </div>
        </div>
    `);
        State.setState({ personality: state.personality });
    }
    
    // --- 4. ИНВЕНТАРЬ (используем inventory_all) ---
    if (data.inventory_all && Array.isArray(data.inventory_all)) {
        const oldInv = [...state.inventory];
        const newInv = data.inventory_all;
        
        const added = newInv.filter(item => !oldInv.includes(item));
        const removed = oldInv.filter(item => !newInv.includes(item));
        
        if (added.length > 0) {
            updatesHTML.push(`
            <div style="margin-bottom: 8px;">
                <span style="color:#9c88ff; font-weight:bold;">
                    <i class="fas fa-plus-circle"></i> Получено:
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
                    <i class="fas fa-minus-circle"></i> Потеряно:
                </span>
        `);
            removed.forEach(item => {
                updatesHTML.push(`
                <div style="color:#ccc; padding-left: 25px; text-decoration: line-through;">• ${item}</div>
            `);
            });
            updatesHTML.push(`</div>`);
        }
        
        // Обновляем инвентарь в состоянии
        state.inventory = newInv;
    }
    
    // --- 5. ОТНОШЕНИЯ (используем relations_all) ---
    if (data.relations_all && typeof data.relations_all === 'object') {
        const oldRelations = { ...state.relations };
        const newRelations = data.relations_all;
        
        // Обновляем отношения
        state.relations = newRelations;
        
        // Логирование изменений отношений
        const relationChanges = [];
        Object.entries(newRelations).forEach(([npc, val]) => {
            const oldVal = oldRelations[npc] || 0;
            if (val !== oldVal) {
                relationChanges.push(`${npc}: ${oldVal} → ${val}`);
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
    
    // --- 6. РИТУАЛЫ ---
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
    State.setState({ isRitualActive: state.isRitualActive });
    
    // --- 7. ЗАПИСЬ В ИСТОРИЮ ---
    // Для истории очищаем HTML теги, чтобы текст был чистым
    let plainUpdates = updatesHTML.map(u => u.replace(/<[^>]*>?/gm, '')).join(' | ');
    let playerChoiceText = state.freeMode ? selectedChoices[0].text : selectedChoices.map(c => c.text).join(' + ');
    
    state.history.push({
        sceneSnippet: data.scene.substring(0, 60) + "...",
        fullText: data.scene,
        choice: playerChoiceText,
        changes: plainUpdates,
        d10: d10
    });
    
    // --- 8. ОБНОВЛЕНИЕ СЦЕНЫ ---
    state.currentScene = {
        text: data.scene || "...",
        choices: data.choices,
        reflection: data.reflection || "",
        d10: d10 // Сохраняем результат броска в сцене
    };
    if (data.short_summary) {
        state.summary = (state.summary + " " + data.short_summary).trim().substring(state.summary.length - 5000);
    }
    
    // Сброс UI
    state.freeMode = false;
    state.freeModeText = '';
    state.selectedChoices = [];
    
    // Обновляем состояние
    State.setState({
        history: state.history,
        currentScene: state.currentScene,
        freeMode: state.freeMode,
        freeModeText: state.freeModeText,
        selectedChoices: state.selectedChoices,
        summary: state.summary,
        inventory: state.inventory,
        relations: state.relations,
        aiMemory: state.aiMemory
    });
    State.incrementTurnCount();
    
    // --- 9. РЕНДЕР ---
    Render.renderAll();
    
    // --- 10. ВЫВОД ЛОГА ИЗМЕНЕНИЙ В DOM И СОХРАНЕНИЕ В STATE ---
    // Проверяем, есть ли изменения или результат броска
    const hasUpdates = updatesHTML.length > 0;
    const hasD10 = d10 !== undefined && d10 !== null;
    
    if (hasUpdates || hasD10) {
        // Создаем HTML для результата броска d10
        let d10Block = '';
        if (hasD10) {
            d10Block = `
                <div style="margin-bottom: 8px; padding: 5px; background: rgba(255, 215, 0, 0.1); border-radius: 4px; border: 1px solid #d4af37; font-size: 0.85rem; display: flex; align-items: center; gap: 8px;">
                    <i class="fas fa-dice-d10" style="color: #d4af37;"></i>
                    <span style="color: #fff;">Результат броска d10: <b style="color: #fbc531;">${d10}</b></span>
                </div>
            `;
        }
        
        // Создаем HTML для списка изменений
        let updatesList = '';
        if (hasUpdates) {
            // Группируем изменения для лучшего отображения
            const groupedUpdates = [];
            let currentGroup = [];
            
            for (const update of updatesHTML) {
                // Если обновление начинается с отступа (вложенный элемент), добавляем в текущую группу
                if (update.includes('padding-left: 15px;')) {
                    currentGroup.push(update);
                } else {
                    // Если есть текущая группа, сохраняем ее
                    if (currentGroup.length > 0) {
                        groupedUpdates.push(currentGroup);
                        currentGroup = [];
                    }
                    // Начинаем новую группу с основного элемента
                    currentGroup.push(update);
                }
            }
            
            // Добавляем последнюю группу
            if (currentGroup.length > 0) {
                groupedUpdates.push(currentGroup);
            }
            
            // Формируем HTML сгруппированных изменений
            const groupedHTML = groupedUpdates.map(group => {
                if (group.length === 1) {
                    return `<div style="margin-bottom: 8px; padding-left: 5px; border-left: 2px solid #333;">${group[0]}</div>`;
                } else {
                    const mainItem = group[0];
                    const subItems = group.slice(1).map(item =>
                        `<div style="margin-left: 15px; margin-bottom: 3px;">${item}</div>`
                    ).join('');
                    return `<div style="margin-bottom: 10px;">${mainItem}${subItems}</div>`;
                }
            }).join('');
            
            updatesList = `
                <div style="border-top: 1px solid #333; padding-top: 12px; font-size: 0.85rem; line-height: 1.5;">
                    ${groupedHTML}
                </div>
            `;
        }
        
        // Формируем полный HTML
        const updatesContent = `
            <div style="color: #d4af37; font-family: 'Roboto Mono', monospace; font-size: 0.9rem; font-weight: bold; margin-bottom: 10px; letter-spacing: 1px;">
                <i class="fas fa-clipboard-list"></i> ИЗМЕНЕНИЯ ЗА ХОД:
            </div>
            ${d10Block}
            ${updatesList}
        `;
        
        // Показываем блок изменений
        dom.updates.style.display = 'block';
        dom.updates.innerHTML = updatesContent;
        
        // Сохраняем в стейт (чтобы восстановить при F5)
        state.lastTurnUpdates = updatesContent;
    } else {
        dom.updates.style.display = 'none';
        state.lastTurnUpdates = ""; // Очищаем, если изменений нет
    }
    
    // Обновляем стейт перед сохранением
    State.setState({ lastTurnUpdates: state.lastTurnUpdates });
    
    // Восстановление UI кнопок
    UI.setFreeModeUI(false);
    dom.freeInputText.disabled = false;
    dom.freeInputText.style.opacity = '1';
    dom.freeModeToggle.checked = false;
    dom.btnSubmit.innerHTML = '<i class="fas fa-paper-plane"></i> ОТПРАВИТЬ';
    UI.updateActionButtons();
    
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
    
    // Проверка на достижение следующей степени
    const nextDegree = CONFIG.degrees.find(d => d.threshold > state.progress);
    if (nextDegree && state.progress >= nextDegree.threshold) {
        // Игрок достиг порога следующей степени
        State.syncDegree();
        Render.renderStats();
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
    
    // ОБНОВЛЯЕМ ОБЕ КНОПКИ (Они обе должны стать disabled, т.к. всё очищено)
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
        // Если перешли в Свободный режим — подтягиваем текст из поля (вдруг там что-то было)
        state.freeModeText = dom.freeInputText.value;
    }
    
    // Сохраняем стейт
    State.setState({
        freeMode: state.freeMode,
        freeModeText: state.freeModeText,
        selectedChoices: state.selectedChoices
    });
    
    // Обновляем UI (показываем/скрываем нужные блоки)
    UI.setFreeModeUI(isFreeMode);
    
    // Обновляем обе кнопки после смены режима
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