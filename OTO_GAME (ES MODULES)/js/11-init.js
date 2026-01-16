// Модуль 11: INIT - Инициализация приложения (js/11-init.js)
'use strict';

import { CONFIG } from './1-config.js';
import { State } from './3-state.js';
import { DOM } from './4-dom.js';
import { Render } from './5-render.js';
import { Game } from './6-game.js';
import { API } from './7-api-facade.js';
import { Audit } from './8-audit.js';
import { Saveload } from './9-saveload.js';
import { Utils } from './2-utils.js';
import { UI, Logger } from './ui.js';

const dom = DOM.getDOM();

/**
 * ОСНОВНАЯ ФУНКЦИЯ ИНИЦИАЛИЗАЦИИ ПРИЛОЖЕНИЯ
 */
function init() {
    try {
        Logger.info('BOOT', "🚀 Инициализация O.T.O. QUEST...");
        
        // 1. Загрузка сохраненного состояния
        Saveload.loadState();
        Logger.success('STATE', "Состояние загружено");
        
        // 2. Инициализация UI (Лейаут, Ресайзеры, Viewport)
        // ВАЖНО: Выполняем до рендера контента, чтобы размеры CSS переменных (--h-top и т.д.)
        // были установлены корректно ПЕРЕД тем, как браузер отрисует тяжелый DOM.
        UI.init();
        Logger.success('UI', "Интерфейс инициализирован");
        
        // 3. Инициализация интерфейса (Отрисовка HTML)
        Render.renderAll();
        Logger.success('RENDER', "DOM отрисован");
        
        // 4. Настройка событий для кнопок управления
        setupEventListeners();
        
        // 5. Настройка полноэкранного режима
        setupFullscreenListeners();
        
        // 6. Обновляем состояние кнопок игры Очистить, Отправить (вдруг есть сохраненный выбор/введённый текст)
        UI.updateActionButtons();
        
        Logger.success('SYSTEM', "✅ Система готова");
        
    } catch (e) {
        Logger.error('FATAL', "Критическая ошибка инициализации", e);
        // Используем alert, т.к. система рендера ошибок может быть не готова
        alert(`CRITICAL ERROR:\n${e.message}`);
    }
}

/**
 * Настройка всех обработчиков событий
 */
function setupEventListeners() {
    // ========== КНОПКИ УПРАВЛЕНИЯ ==========
    if (dom.btnSubmit) {
        dom.btnSubmit.onclick = () => Game.submitTurn();
    }
    
    if (dom.btnClear) {
        dom.btnClear.onclick = () => Game.handleClear();
    }
    
    // ========== ПЕРЕКЛЮЧАТЕЛЬ РЕЖИМА ==========
    if (dom.freeModeToggle) {
        // Используем обновленный обработчик из Game.js
        dom.freeModeToggle.onchange = (e) => Game.handleFreeModeToggle(e);
    }
    
    // ========== ПОЛЕ СВОБОДНОГО ВВОДА ==========
    if (dom.freeInputText) {
        // Обработка ввода текста для активации кнопки
        dom.freeInputText.oninput = (e) => {
            const state = State.getState();
            state.freeModeText = e.target.value;
            const hasText = state.freeModeText.trim().length > 0;
            dom.choicesCounter.textContent = hasText ? '✓/∞' : '0/∞';
            State.setState({ freeModeText: state.freeModeText });
            UI.updateActionButtons();
            Saveload.saveState();
        };
        
        // Отправка по Ctrl+Enter
        dom.freeInputText.onkeydown = (e) => {
            if (e.ctrlKey && e.key === 'Enter') {
                e.preventDefault();
                Game.submitTurn();
            }
        };
    }
    
    // ========== КНОПКА НАСТРОЕК ==========
    const btnSettings = document.getElementById('btnSettings');
    if (btnSettings) {
        // Вызываем UI метод
        btnSettings.onclick = () => UI.openSettingsModal();
    }
    
    // ========== КНОПКА ПОЛНОЭКРАННОГО РЕЖИМА ==========
    const btnFullscreen = document.getElementById('btnFullscreen');
    if (btnFullscreen) {
        // Вызываем UI метод
        btnFullscreen.onclick = () => UI.toggleFullscreen();
    }
    
    // ========== КНОПКИ МАСШТАБИРОВАНИЯ ==========
    const btnScaleUp = document.getElementById('btnScaleUp');
    if (btnScaleUp) {
        // Вызываем UI метод
        btnScaleUp.onclick = () => UI.scaleUp();
    }
    
    const btnScaleDown = document.getElementById('btnScaleDown');
    if (btnScaleDown) {
        // Вызываем UI метод
        btnScaleDown.onclick = () => UI.scaleDown();
    }
    
    // ========== НАСТРОЙКИ В МОДАЛЬНОМ ОКНЕ ==========
    setupSettingsModalEvents();
    
    // ========== СОХРАНЕНИЕ/ЗАГРУЗКА ==========
    setupSaveLoadEvents();
    
    // ========== АУДИТ-ЛОГ ==========
    setupAuditEvents();
}

/**
 * Настройка обработчиков для модального окна настроек
 */
function setupSettingsModalEvents() {
    const closeModalBtn = document.getElementById('closeModalBtn');
    if (closeModalBtn) {
        // Вызываем UI метод
        closeModalBtn.onclick = () => UI.closeSettingsModal();
    }
    
    // --- 1. Провайдер API ---
    const providerInput = document.getElementById('providerInput');
    if (providerInput) {
        providerInput.onchange = () => {
            const state = State.getState();
            state.settings.apiProvider = providerInput.value;
            State.setState({ settings: state.settings });
            localStorage.setItem('oto_provider', state.settings.apiProvider);
            Render.updateApiKeyFields();
            Render.renderModelSelectorByProvider();
            Render.updateModelDetails();
            Saveload.saveState();
        };
        // Устанавливаем текущее значение
        providerInput.value = State.getState().settings.apiProvider;
    }
    
    // --- 2. API ключи ---
    const apiKeyOpenrouterInput = document.getElementById('apiKeyOpenrouterInput');
    if (apiKeyOpenrouterInput) {
        apiKeyOpenrouterInput.oninput = () => {
            const state = State.getState();
            state.settings.apiKeyOpenrouter = apiKeyOpenrouterInput.value;
            State.setState({ settings: state.settings });
            localStorage.setItem('oto_key_openrouter', state.settings.apiKeyOpenrouter);
            Saveload.saveState();
        };
        apiKeyOpenrouterInput.value = State.getState().settings.apiKeyOpenrouter;
    }
    
    const apiKeyVsegptInput = document.getElementById('apiKeyVsegptInput');
    if (apiKeyVsegptInput) {
        apiKeyVsegptInput.oninput = () => {
            const state = State.getState();
            state.settings.apiKeyVsegpt = apiKeyVsegptInput.value;
            State.setState({ settings: state.settings });
            localStorage.setItem('oto_key_vsegpt', state.settings.apiKeyVsegpt);
            Saveload.saveState();
        };
        apiKeyVsegptInput.value = State.getState().settings.apiKeyVsegpt;
    }
    
    // --- 3. Модель ИИ ---
    const modelInput = document.getElementById('modelInput');
    if (modelInput) {
        modelInput.onchange = () => {
            const state = State.getState();
            state.settings.model = modelInput.value;
            State.setState({ settings: state.settings });
            localStorage.setItem('oto_model', state.settings.model);
            Render.updateModelDetails();
            Saveload.saveState();
        };
    }
    
    // --- 4. Кнопки тестирования ---
    const testCurrentProviderBtn = document.getElementById('testCurrentProviderBtn');
    if (testCurrentProviderBtn) {
        testCurrentProviderBtn.onclick = () => API.testCurrentProvider();
    }
    
    const testSelectedModelBtn = document.getElementById('testSelectedModelBtn');
    if (testSelectedModelBtn) {
        testSelectedModelBtn.onclick = () => API.testSelectedModel();
    }
    
    // --- 5. ГЕНЕРАТОР СЮЖЕТА ---
    const plotInput = document.getElementById('plotInput');
    const btnGen = document.getElementById('btnGenPlot');
    const btnClear = document.getElementById('btnClearPlot');
    const btnAccept = document.getElementById('btnAcceptPlot');
    
    if (plotInput) {
        plotInput.oninput = () => {
            const val = plotInput.value.trim();
            if (btnAccept) btnAccept.disabled = val.length === 0;
        };
    }
    
    if (btnClear && plotInput) {
        btnClear.onclick = () => {
            plotInput.value = '';
            if (btnAccept) btnAccept.disabled = true;
        };
    }
    
    if (btnGen && plotInput) {
        btnGen.onclick = async () => {
            const currentText = plotInput.value.trim();
            const promptToSend = currentText.length > 0 ? currentText + "</br>" + CONFIG.marsyasScenarioPrompt : CONFIG.marsyasScenarioPrompt;
            
            btnGen.disabled = true;
            const oldBtnText = btnGen.innerHTML;
            btnGen.innerHTML = '<span class="spinner"></span> ГЕНЕРАЦИЯ...';
            
            if (btnAccept) btnAccept.disabled = true;
            if (btnClear) btnClear.disabled = true;
            plotInput.disabled = true;
            
            try {
                const responseText = await API.generateCustomScene(promptToSend);
                plotInput.value = responseText;
                
                try {
                    const json = JSON.parse(responseText);
                    plotInput.value = JSON.stringify(json, null, 2);
                } catch (e) {}
                
                Render.showSuccessAlert("Сюжет сгенерирован", "Ответ от ИИ получен.");
            } catch (error) {
                console.error("Ошибка генерации сюжета:", error);
                Render.showErrorAlert("Ошибка генерации", "Не удалось получить сюжет от ИИ.", error);
            } finally {
                btnGen.disabled = false;
                btnGen.innerHTML = oldBtnText;
                plotInput.disabled = false;
                if (btnClear) btnClear.disabled = false;
                if (btnAccept) btnAccept.disabled = plotInput.value.trim().length === 0;
            }
        };
    }
    
    if (btnAccept && plotInput) {
        btnAccept.onclick = () => {
            const text = plotInput.value.trim();
            if (!text) return;
            
            try {
                const sceneData = Utils.safeParseAIResponse(text);
                if (!sceneData.scene || !sceneData.choices) throw new Error("JSON должен содержать 'scene' и 'choices'.");
                
                State.resetGameProgress();
                const state = State.getState();
                
                state.currentScene = {
                    text: sceneData.scene,
                    choices: sceneData.choices,
                    reflection: sceneData.reflection || ""
                };
                
                if (sceneData.stat_changes) {
                    for (const [key, val] of Object.entries(sceneData.stat_changes)) {
                        State.updateStat(key, state.stats[Utils.normalizeStatKey(key)] + val);
                    }
                }
                if (sceneData.progress_change) {
                    state.progress += sceneData.progress_change;
                    State.syncDegree();
                }
                if (sceneData.personality_change) {
                    state.personality = sceneData.personality_change;
                }
                
                state.history.push({
                    sceneSnippet: "--- НОВЫЙ СЮЖЕТ ---",
                    fullText: "Инициализация новой ветки сюжета.",
                    choice: "Сюжет принят",
                    changes: "Перезапуск сцены",
                    d10: 0
                });
                
                State.setState({
                    currentScene: state.currentScene,
                    stats: state.stats,
                    progress: state.progress,
                    personality: state.personality,
                    history: state.history
                });
                
                Saveload.saveState();
                Render.renderAll();
                UI.closeSettingsModal();
                Render.showSuccessAlert("Сюжет принят", "Новая сцена загружена.");
                
            } catch (error) {
                Render.showErrorAlert("Ошибка принятия", "Текст не является валидным JSON.", error);
            }
        };
    }
}

/**
 * Настройка обработчиков для сохранения/загрузки
 */
function setupSaveLoadEvents() {
    const loadGameBtn = document.getElementById('loadGameBtn');
    if (loadGameBtn) {
        loadGameBtn.onclick = async () => {
            const result = await Saveload.loadGameFromFile();
            if (result.success) {
                Render.showSuccessAlert("Игра загружена", `Файл: ${result.fileName}`);
                // После загрузки нужно переинициализировать UI (лейаут мог измениться)
                UI.init();
                Render.renderAll();
            } else {
                Render.showErrorAlert("Ошибка загрузки", result.error);
            }
        };
    }
    
    const saveGameBtn = document.getElementById('saveGameBtn');
    if (saveGameBtn) {
        saveGameBtn.onclick = async () => {
            const result = await Saveload.saveGameToFile();
            if (result.success) {
                Render.showSuccessAlert("Игра сохранена", `Файл: ${result.fileName}`);
            } else {
                Render.showErrorAlert("Ошибка сохранения", result.error);
            }
        };
    }
    
    const exportAllDataBtn = document.getElementById('exportAllDataBtn');
    if (exportAllDataBtn) {
        exportAllDataBtn.onclick = async () => {
            const result = await Saveload.exportAllDataToFile();
            if (result.success) Render.showSuccessAlert("Данные экспортированы", `Файл: ${result.fileName}`);
            else Render.showErrorAlert("Ошибка экспорта", result.error);
        };
    }
    
    const importAllDataBtn = document.getElementById('importAllDataBtn');
    if (importAllDataBtn) {
        importAllDataBtn.onclick = async () => {
            const result = await Saveload.importAllDataFromFile();
            if (result.success) {
                Render.showSuccessAlert("Данные импортированы", `Файл: ${result.fileName}`);
                Render.updateApiKeyFields();
                Render.renderModelSelectorByProvider();
                Render.updateModelDetails();
                Render.renderAuditList();
                UI.init();
            } else {
                Render.showErrorAlert("Ошибка импорта", result.error);
            }
        };
    }
    
    const exportHistoryBtn = document.getElementById('exportHistoryBtn');
    if (exportHistoryBtn) {
        exportHistoryBtn.onclick = () => {
            const state = State.getState();
            if (state.history.length === 0) {
                Render.showErrorAlert("Ошибка", "История пуста.");
                return;
            }
            const exportData = {
                gameId: state.gameId,
                exportTime: new Date().toISOString(),
                history: state.history,
                totalTurns: state.turnCount
            };
            const fileName = `oto-history-${state.gameId}.json`;
            Utils.exportToFile(JSON.stringify(exportData, null, 2), fileName);
            Render.showSuccessAlert("История экспортирована", fileName);
        };
    }
    
    const quickSaveBtn = document.getElementById('quickSaveBtn');
    if (quickSaveBtn) {
        quickSaveBtn.onclick = () => {
            Saveload.saveState();
            Render.showSuccessAlert("Быстрое сохранение", "Игра сохранена в браузере.");
        };
    }
    
    // В настройках: ПОЛНЫЙ СБРОС и СБРОС ИГРЫ
    const btnFullReset = document.getElementById('btnFullReset');
    if (btnFullReset) {
        btnFullReset.onclick = () => State.resetFullGame();
    }
    
    const btnResetGameProgress = document.getElementById('btnResetGameProgress');
    if (btnResetGameProgress) {
        btnResetGameProgress.onclick = () => State.resetGameProgress();
    }
    
    // На экране Победы/Поражения: ЗАНОВО и ПРОДОЛЖИТЬ
    const btnRestartGame = document.getElementById('btnRestartGame');
    if (btnRestartGame) {
        btnRestartGame.onclick = () => Game.restartGame();
    }
    
    const btnContinueGame = document.getElementById('btnContinueGame');
    if (btnContinueGame) {
        btnContinueGame.onclick = () => Game.continueGame();
    }
}

/**
 * Настройка обработчиков для аудит-лога
 */
function setupAuditEvents() {
    const clearAuditBtn = document.getElementById('clearAuditBtn');
    if (clearAuditBtn) {
        clearAuditBtn.onclick = () => Audit.clearAudit();
    }
    
    const exportAuditBtn = document.getElementById('exportAuditBtn');
    if (exportAuditBtn) {
        exportAuditBtn.onclick = () => Audit.exportAuditLog();
    }
    
    const downloadAuditBtn = document.getElementById('downloadAuditBtn');
    if (downloadAuditBtn) {
        downloadAuditBtn.onclick = async () => {
            const result = await Saveload.downloadAuditLogToFile();
            if (result.success) Render.showSuccessAlert("Лог скачан", result.fileName);
            else Render.showErrorAlert("Ошибка скачивания", result.error);
        };
    }
}

/**
 * Настройка обработчиков для полноэкранного режима
 */
function setupFullscreenListeners() {
    document.addEventListener('fullscreenchange', () => {
        const btn = document.getElementById('btnFullscreen');
        if (!btn) return;
        if (document.fullscreenElement) btn.innerHTML = '<i class="fas fa-compress"></i>';
        else btn.innerHTML = '<i class="fas fa-expand"></i>';
    });
}

/**
 * Открытие модального окна настроек
 */
function openSettingsModal() {
    const modal = document.getElementById('settingsModal');
    if (modal) {
        modal.classList.add('active');
        
        if (DOM.refresh) DOM.refresh();
        
        const state = State.getState();
        const providerInput = document.getElementById('providerInput');
        const apiKeyOpenrouterInput = document.getElementById('apiKeyOpenrouterInput');
        const apiKeyVsegptInput = document.getElementById('apiKeyVsegptInput');
        const modelInput = document.getElementById('modelInput');
        
        if (providerInput) providerInput.value = state.settings.apiProvider;
        if (apiKeyOpenrouterInput) apiKeyOpenrouterInput.value = state.settings.apiKeyOpenrouter;
        if (apiKeyVsegptInput) apiKeyVsegptInput.value = state.settings.apiKeyVsegpt;
        if (modelInput) modelInput.value = state.settings.model;
        
        Render.updateApiKeyFields();
        Render.renderModelSelectorByProvider();
        Render.updateModelDetails();
        Render.renderAuditList();
    }
}

/**
 * Закрытие модального окна настроек
 */
function closeSettingsModal() {
    const modal = document.getElementById('settingsModal');
    if (modal) {
        modal.classList.remove('active');
    }
}

/**
 * Показ основного интерфейса игры (используется Intro.js)
 */
function showMainInterface() {
    const mainContainer = document.getElementById('mainContainer');
    if (mainContainer) {
        mainContainer.style.display = 'flex';
        
        Render.renderAll();
        Saveload.saveState();
    }
}

// Публичный интерфейс модуля
export const Init = {
    init: init,
    showMainInterface: showMainInterface,
    openSettingsModal: openSettingsModal,
    closeSettingsModal: closeSettingsModal
};