// Модуль 11: INIT - Инициализация приложения
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
import { GameItemUI } from './gameitem-ui.js';
import { StatsUI } from './stats-ui.js';
import { TurnUpdatesUI } from './turn-updates-ui.js';
import { HistoryUI } from './history-ui.js';

const dom = DOM.getDOM();

/**
 * ОСНОВНАЯ ФУНКЦИЯ ИНИЦИАЛИЗАЦИИ ПРИЛОЖЕНИЯ (ОБНОВЛЕННАЯ - ОПТИМИЗИРОВАН ПОРЯДОК)
 */
function init() {
    try {
        Logger.info('BOOT', "🚀 Инициализация O.T.O. QUEST...");
        
        // 1. Проверяем, что DOM полностью готов
        if (!document.body || document.readyState !== 'complete') {
            Logger.info('DOM', "DOM не готов, ожидаем...");
            setTimeout(init, 50);
            return;
        }
        
        Logger.success('DOM', "DOM полностью загружен");
        
        // 2. Проверяем, что состояние корректно инициализировано
        const state = State.getState();
        if (!state || !state.gameState || !state.gameState.currentScene) {
            Logger.error('STATE', "Состояние игры не инициализировано корректно");
            throw new Error('Состояние игры не инициализировано корректно');
        }
        
        Logger.success('STATE', `Состояние инициализировано (игра: ${state.gameId}, ход: ${state.turnCount})`);
        
        // 3. Загружаем настройки интерфейса
        Saveload.loadState();
        Logger.success('STATE', "Настройки загружены из localStorage");
        
        // 4. Инициализируем UI модули в ПРАВИЛЬНОМ ПОРЯДКЕ:
        
        // 4.1 Сначала рендерим сцену, чтобы создать все необходимые контейнеры
        Logger.info('RENDER', "Рендеринг сцены для создания контейнеров...");
        Render.renderScene();
        Render.renderChoices();
        
        // 4.2 Теперь инициализируем UI модули, которые зависят от контейнеров в DOM
        Logger.info('UI', "Инициализация UI модулей...");
        
        if (GameItemUI && typeof GameItemUI.initialize === 'function') {
            Logger.info('GAMEITEM', "Инициализация GameItemUI...");
            GameItemUI.initialize();
            Logger.success('GAMEITEM', "GameItemUI инициализирован");
        }
        
        if (TurnUpdatesUI && typeof TurnUpdatesUI.initialize === 'function') {
            TurnUpdatesUI.initialize();
            Logger.success('UI', "TurnUpdatesUI инициализирован");
            
            // КРИТИЧЕСКИ ВАЖНО: Убедимся что контейнер отображается
            setTimeout(() => {
                if (TurnUpdatesUI.forceUpdate) {
                    TurnUpdatesUI.forceUpdate();
                    Logger.info('UI', "TurnUpdatesUI: принудительное обновление выполнено");
                }
            }, 200);
        }
        
        if (StatsUI && typeof StatsUI.initialize === 'function') {
            StatsUI.initialize();
            Logger.success('UI', "StatsUI инициализирован");
        }
        
        if (HistoryUI && typeof HistoryUI.initialize === 'function') {
            HistoryUI.initialize();
            Logger.success('UI', "HistoryUI инициализирован");
        }
        
        // 4.3 Инициализируем основной UI
        UI.init();
        Logger.success('UI', "Основной UI инициализирован");
        
        // НЕ вызываем forceUpdate() здесь - GameItemUI уже отрендерился при инициализации
        // Избегаем двойного рендеринга
        
        // Настраиваем события
        Logger.info('EVENTS', "Настройка обработчиков событий...");
        setupEventListeners();
        setupFullscreenListeners();
        Logger.success('EVENTS', "Обработчики событий настроены");
        
        // Обновляем кнопки действий
        UI.updateActionButtons();
        
        // Финальная проверка: убеждаемся, что все контейнеры отображены
        setTimeout(() => {
            checkAllContainersVisible();
        }, 100);
        
        Logger.success('SYSTEM', "✅ Система полностью инициализирована и готова");
        Logger.success('SYSTEM', `📊 Статистика: Ход ${state.turnCount}, Организации: ${State.getHeroOrganizations().length}`);
        
    } catch (error) {
        Logger.error('FATAL', "Критическая ошибка инициализации", error);
        
        // Показываем подробную ошибку пользователю
        const errorDetails = `
🚨 КРИТИЧЕСКАЯ ОШИБКА ЗАПУСКА ИГРЫ:

${error.message}

Стек вызовов:
${error.stack || 'Нет информации о стеке'}

Рекомендуемые действия:
1. Нажмите "Сбросить всю игру" в настройках
2. Очистите localStorage в DevTools (Application → Storage → Local Storage)
3. Перезагрузите страницу (Ctrl+F5)
4. Если проблема persists, обратитесь к разработчику

Время ошибки: ${new Date().toLocaleString()}
        `;
        
        console.error(errorDetails);
        
        // Показываем ошибку в интерфейсе
        if (dom.sceneArea) {
            dom.sceneArea.innerHTML = `
                <div style="color: #ff3838; padding: 30px; text-align: center; background: rgba(255,0,0,0.1); border: 2px solid #ff3838; border-radius: 5px;">
                    <h2><i class="fas fa-skull-crossbones"></i> ОШИБКА ЗАПУСКА</h2>
                    <p style="margin: 15px 0;">Игра не может быть запущена из-за критической ошибки.</p>
                    <p style="color: #aaa; font-size: 0.9em;">${error.message}</p>
                    <button onclick="location.reload()" style="margin-top: 20px; padding: 10px 20px; background: #ff3838; color: white; border: none; border-radius: 3px; cursor: pointer;">
                        <i class="fas fa-redo"></i> Перезагрузить страницу
                    </button>
                </div>
            `;
        }
    }
}

/**
 * Проверяет, что все основные контейнеры отображены (ДЕБАГ ФУНКЦИЯ)
 */
function checkAllContainersVisible() {
    try {
        console.log('🔍 Проверка видимости всех контейнеров...');
        
        const requiredContainers = [
            'personalityBlockContainer',
            'typologyContainer',
            'organizationsContainer',
            'turnUpdatesContainer'
        ];
        
        let allVisible = true;
        
        requiredContainers.forEach(containerId => {
            const container = document.getElementById(containerId);
            if (container) {
                const isVisible = container.style.display !== 'none' && container.offsetParent !== null;
                console.log(`   ${containerId}: ${isVisible ? '✅ Виден' : '❌ Скрыт'}`);
                if (!isVisible) allVisible = false;
            } else {
                console.log(`   ${containerId}: ❌ Не найден в DOM`);
                allVisible = false;
            }
        });
        
        if (allVisible) {
            console.log('✅ ВСЕ обязательные контейнеры отображены');
        } else {
            console.warn('⚠️ Некоторые контейнеры не отображены!');
            // Попытка восстановить отображение
            /*
            if (GameItemUI && typeof GameItemUI.forceUpdate === 'function') {
                console.log('🔄 Попытка восстановить отображение через forceUpdate...');
                GameItemUI.forceUpdate();
            }*/
        }
    } catch (error) {
        console.error('❌ Ошибка при проверке видимости контейнеров:', error);
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
    // Принять сгенерированный сюжет (начало игры по сгенерированному сюжету):
    if (btnAccept && plotInput) {
        btnAccept.onclick = () => {
            const text = plotInput.value.trim();
            if (!text) return;
            
            try {
                const sceneData = Utils.safeParseAIResponse(text);
                
                // SILENT сброс - без подтверждения и перезагрузки
                State.resetGameProgress(true);
                const state = State.getState();
                
                // Устанавливаем новую сцену
                state.gameState.currentScene = {
                    scene: sceneData.scene || sceneData.text || "",
                    choices: sceneData.choices || [],
                    reflection: sceneData.reflection || "",
                    typology: sceneData.typology || "",
                    thoughts: sceneData.thoughts || [],
                    summary: sceneData.summary || "",
                    aiMemory: sceneData.aiMemory || {},
                    events: sceneData.events || [],
                    design_notes: sceneData.design_notes || ""
                };
                
                // Очищаем историю и добавляем новую начальную сцену
                state.gameState.history = [{
                    fullText: sceneData.scene || sceneData.text || "",
                    choice: "Начало игры (загруженный сюжет)",
                    changes: "Загружен новый сюжет",
                    turn: 1
                }];
                
                // Устанавливаем счетчик ходов
                state.turnCount = 1;
                
                // Явное сохранение ВСЕГО состояния:
                State.setState({
                    gameState: state.gameState,
                    thoughtsOfHero: state.thoughtsOfHero,
                    turnCount: state.turnCount,
                    heroState: state.heroState,
                    lastSaveTime: new Date().toISOString()
                });
                
                // Сохраняем
                Saveload.saveState();
                
                // Рендерим через специализированные модули
                Render.renderScene();
                Render.renderChoices();
                GameItemUI.forceUpdate();
                StatsUI.render();
                HistoryUI.render();
                
                UI.closeSettingsModal();
                Render.showSuccessAlert("Сюжет принят", "Сюжет загружен. Начало новой игры.");
                
            } catch (error) {
                Render.showErrorAlert("Ошибка загру", "Текст не является валидным JSON или отсутствует поле 'scene'.", error);
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
                // После загрузки переинициализируем UI модули
                UI.init();
                Render.renderScene();
                Render.renderChoices();
                GameItemUI.forceUpdate();
                StatsUI.render();
                HistoryUI.render();
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
                GameItemUI.forceUpdate();
                StatsUI.render();
                HistoryUI.render();
            } else {
                Render.showErrorAlert("Ошибка импорта", result.error);
            }
        };
    }
    
    const exportHistoryBtn = document.getElementById('exportHistoryBtn');
    if (exportHistoryBtn) {
        exportHistoryBtn.onclick = () => {
            const state = State.getState();
            if (state.gameState.history.length === 0) {
                Render.showErrorAlert("Ошибка", "История пуста.");
                return;
            }
            const exportData = {
                gameId: state.gameId,
                exportTime: new Date().toISOString(),
                history: state.gameState.history,
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
        
        // Рендерим через специализированные модули
        Render.renderScene();
        Render.renderChoices();
        GameItemUI.forceUpdate();
        StatsUI.render();
        HistoryUI.render();
        
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

// Автоматический запуск инициализации при загрузке
document.addEventListener('DOMContentLoaded', init);
window.addEventListener('load', () => {
    console.log('📄 Страница полностью загружена, запуск финальной инициализации...');
});