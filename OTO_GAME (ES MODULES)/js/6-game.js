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

    let requestText = '';

    if (state.freeMode) {
        requestText = state.freeModeText.trim();
        if (requestText.length === 0) return;

        dom.freeInputText.disabled = true;
        dom.freeInputText.style.opacity = '0.7';
    } else {
        if (state.selectedChoices.length === 0) return;
        requestText = state.selectedChoices.map(i => state.currentScene.choices[i]).join(' + ');
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
                "Запрос превысил лимит времени (60 секунд). Попробуйте снова.",
                new Error("Request timeout after 60000ms")
            );
        }
    }, CONFIG.requestTimeout);

    try {
        // === ВЫЗОВ API (ИЗМЕНЕНО) ===
        // Мы больше не передаем auditEntry. Facade создаст его сам внутри.
        // Мы передаем только данные для запроса и контроллер отмены.
        const data = await API.sendAIRequest(requestText, d10, activeAbortController);

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

        // Проверяем, есть ли в ответе фразы героя
        if (data.thoughtsOfHeroResponse && Array.isArray(data.thoughtsOfHeroResponse)) {
            State.addHeroPhrases(data.thoughtsOfHeroResponse);
        }

        processTurn(data, requestText, d10);
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
        
        // Логирование уже произошло внутри API Facade -> Audit.
        // Здесь мы только восстанавливаем UI и показываем алерт.

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

        // Используем улучшенное отображение ошибок
        Render.showErrorAlert(
            "Ошибка соединения",
            errorMsg,
            e
        );

        dom.btnSubmit.innerHTML = '<i class="fas fa-paper-plane"></i> ОТПРАВИТЬ';
        dom.btnSubmit.disabled = false;
        dom.btnClear.disabled = false;
    } finally {
        if(state.freeMode) {
            dom.freeInputText.disabled = false;
            dom.freeInputText.style.opacity = '1';
            // Возвращаем фокус, чтобы можно было сразу править
            dom.freeInputText.focus();
        }
        // ВАЖНО: Render.renderAuditList() здесь не нужен, так как Facade/Audit уже обновили UI.
        Saveload.saveState();
    }
}

/**
 * Обработка ответа ИИ и обновление игры
 * @param {Object} data - Данные от ИИ
 * @param {string} playerChoice - Выбор игрока
 * @param {number} d10 - Результат броска d10
 */
function processTurn(data, playerChoice, d10) {
    const state = State.getState();
    let updates = [];

    // Нормализуем и применяем изменения характеристик
    if (data.stat_changes) {
        for (const [rawKey, v] of Object.entries(data.stat_changes)) {
            const normalizedKey = Utils.normalizeStatKey(rawKey);
            if (normalizedKey && v !== 0 && state.stats[normalizedKey] !== undefined) {
                const oldVal = state.stats[normalizedKey];
                state.stats[normalizedKey] = Math.max(0, Math.min(100, state.stats[normalizedKey] + v));
                updates.push(`${rawKey.toUpperCase()} ${v > 0 ? '+' : ''}${v} (${oldVal}→${state.stats[normalizedKey]})`);
            }
        }
        State.setState({ stats: state.stats });
    }

    if (data.progress_change !== undefined && data.progress_change !== 0) {
        const oldProgress = state.progress;
        state.progress += data.progress_change;
        updates.push(`ПРОГРЕСС ${data.progress_change > 0 ? '+' : ''}${data.progress_change} (${oldProgress}→${state.progress})`);
        State.syncDegree();
        State.setState({ progress: state.progress });
    }

    if (data.personality_change) {
        state.personality = data.personality_change;
        updates.push(`ЛИЧНОСТЬ обновлена`);
        State.setState({ personality: state.personality });
    }

    // --- ЛОГИКА РИТУАЛА ---
    
    // 1. Проверка на начало ритуала от ИИ
    const nextDegree = CONFIG.degrees.find(d => d.threshold > state.progress);
    const thresholdReached = nextDegree && state.progress >= nextDegree.threshold;
    
    if ((data.start_ritual || thresholdReached) && !state.isRitualActive) {
        state.isRitualActive = true;
        updates.push("⚠️ НАЧАЛО РИТУАЛА ПОСВЯЩЕНИЯ");
        // Вибрация для эффекта
        Utils.vibrate(CONFIG.vibrationPatterns.long);
    }
    
    // 2. Проверка на окончание ритуала
    if (state.isRitualActive) {
        if (data.end_ritual || data.ritual_completed) {
            state.isRitualActive = false;
            updates.push("✨ РИТУАЛ ЗАВЕРШЕН");
            Utils.vibrate(CONFIG.vibrationPatterns.success);
        }
    }

    State.setState({ 
        isRitualActive: state.isRitualActive 
    });

    // ============================================
    // ЛОГИКА СОЗДАНИЯ КОРОТКОЙ СВОДКИ
    // ============================================
    if (data.short_summary && typeof data.short_summary === 'string') {
        // Если есть новая сводка от ИИ, добавляем её к истории
        state.summary = (state.summary + " " + data.short_summary).trim();
        // Предохранитель от переполнения
        if (state.summary.length > 5000) {
            state.summary = state.summary.substring(state.summary.length - 5000);
        }
        State.setState({ summary: state.summary });
    }

    // Добавляем запись в историю
    state.history.push({
        sceneSnippet: state.currentScene.text.substring(0, 60) + "...",
        fullText: state.currentScene.text,
        choice: playerChoice,
        changes: updates.join(' | '),
        d10: d10
    });

    // Обновляем текущую сцену
    state.currentScene = {
        text: data.scene || "Ошибка генерации текста сцены.",
        choices: data.choices,
        reflection: data.reflection || ""
    };

    // Сбрасываем режим свободного ввода после обработки хода
    state.freeMode = false;
    state.freeModeText = '';
    state.selectedChoices = [];

    State.setState({
        history: state.history,
        currentScene: state.currentScene,
        freeMode: state.freeMode,
        freeModeText: state.freeModeText,
        selectedChoices: state.selectedChoices
    });
    
    // Обновляем UI элементы через рендер
    Render.renderAll();
    
    // ВАЖНО: Синхронизируем состояние UI (выход из режима ввода)
    UI.setFreeModeUI(false);
    dom.freeModeToggle.checked = false;

    dom.btnSubmit.innerHTML = '<i class="fas fa-paper-plane"></i> ОТПРАВИТЬ';
    dom.btnSubmit.disabled = false;
    dom.btnClear.disabled = false;

    if (updates.length > 0) {
        dom.updates.style.display = 'block';
        dom.updates.innerHTML = `<strong>Изменения за ход (d10=${d10}):</strong><br>${updates.join('<br>')}`;
    }
    
    // Увеличиваем счетчик ходов
    State.incrementTurnCount();
    
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
        }
    ];

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
        dom.btnSubmit.disabled = true;
        dom.choicesCounter.textContent = '0/∞';
        State.setState({ freeModeText: '' });
    } else {
        state.selectedChoices = [];
        State.setState({ selectedChoices: [] });
        Render.renderChoices();
    }
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

    // === ЛОГИКА ДИСЕЙБЛИНГА КНОПКИ ===
    if (state.freeMode) {
        // Правила Свободного режима: активно, если есть текст
        const hasText = state.freeModeText && state.freeModeText.trim().length > 0;
        dom.btnSubmit.disabled = !hasText;
    } else {
        // Правила Режима Вариантов: активно, если выбран хотя бы 1 вариант
        const hasChoices = (state.selectedChoices || []).length > 0;
        dom.btnSubmit.disabled = !hasChoices;
    }

    // Сохраняем стейт
    State.setState({
        freeMode: state.freeMode,
        freeModeText: state.freeModeText,
        selectedChoices: state.selectedChoices
    });

    // Обновляем UI (показываем/скрываем нужные блоки)
    UI.setFreeModeUI(isFreeMode);
    
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