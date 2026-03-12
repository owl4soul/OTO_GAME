// Модуль 11: INIT - Инициализация приложения (ИСПРАВЛЕНА ПОД PARSER v6.1 + STATE 5.1 + API FACADE v6.0)
// АДАПТИРОВАН: теперь использует ТОЛЬКО Parser.processAIResponse и Parser.normalizeOperation
// Удалён устаревший API_Response.normalizeOperations и Utils.robustJsonParse

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
import { UI } from './ui.js';
import { log } from './logger.js';
import { GameItemUI } from './gameitem-ui.js';
import { StatsUI } from './stats-ui.js';
import { TurnUpdatesUI } from './turn-updates-ui.js';
import { HistoryUI } from './history-ui.js';
import { themeEditorPro } from './theme/theme-editor-pro.js';
import { themeManagerPro } from './theme/theme-pro.js';
import { OperationsServiceInstance } from './operations-service.js';
import { Parser } from './parsing.js';

// Глобальная переменная для хранения последнего сгенерированного объекта
let lastGeneratedSceneData = null;
const dom = DOM.getDOM();

/**
 * ОСНОВНАЯ ФУНКЦИЯ ИНИЦИАЛИЗАЦИИ ПРИЛОЖЕНИЯ (АДАПТИРОВАНА ПОД STATE 5.1)
 */
function init() {
    try {
        log.info('BOOT', "🚀 Инициализация O.T.O. QUEST...");
        
        // 0. Инициализация темы (самым первым шагом)
        themeManagerPro.initialize();
        log.info('THEME', "Менеджер тем инициализирован");
        
        // 1. Проверяем, что DOM полностью готов
        if (!document.body || document.readyState !== 'complete') {
            log.info('DOM', "DOM не готов, ожидаем...");
            setTimeout(init, 50);
            return;
        }
        
        log.info('DOM', "DOM полностью загружен");
        
        // 2. Проверяем, что состояние корректно инициализировано (новая структура State 5.1)
        const state = State.getState();
        if (!state || !state.game || !state.game.currentScene) {
            log.error('STATE', "Состояние игры не инициализировано корректно");
            throw new Error('Состояние игры не инициализировано корректно');
        }
        
        log.info('STATE', `Состояние инициализировано (игра: ${state.game.id}, ход: ${state.game.turnCount})`);
        
        // 3. Инициализируем UI модули в правильном порядке:
        
        // 3.1 Сначала рендерим сцену, чтобы создать все необходимые контейнеры
        log.info('RENDER', "Рендеринг сцены для создания контейнеров...");
        Render.renderScene();
        Render.renderChoices();
        
        // 3.2 Теперь инициализируем UI модули, которые зависят от контейнеров в DOM
        log.info('UI', "Инициализация UI модулей...");
        
        if (GameItemUI && typeof GameItemUI.initialize === 'function') {
            log.info('GAMEITEM', "Инициализация GameItemUI...");
            GameItemUI.initialize();
            log.info('GAMEITEM', "GameItemUI инициализирован");
        }
        
        if (TurnUpdatesUI && typeof TurnUpdatesUI.initialize === 'function') {
            TurnUpdatesUI.initialize();
            log.info('UI', "TurnUpdatesUI инициализирован");
        }
        
        if (StatsUI && typeof StatsUI.initialize === 'function') {
            StatsUI.initialize();
            log.info('UI', "StatsUI инициализирован");
        }
        
        if (HistoryUI && typeof HistoryUI.initialize === 'function') {
            HistoryUI.initialize();
            log.info('UI', "HistoryUI инициализирован");
        }
        
        // 3.3 Инициализируем основной UI
        UI.init();
        log.info('UI', "Основной UI инициализирован");
        
        // Настраиваем события
        log.info('EVENTS', "Настройка обработчиков событий...");
        setupEventListeners();
        setupFullscreenListeners();
        log.info('EVENTS', "Обработчики событий настроены");
        
        // ✅ КРИТИЧЕСКИ ВАЖНО: принудительно устанавливаем сохранённый текст в поле свободного ввода
        if (dom.freeInputText) {
            dom.freeInputText.value = state.ui.freeMode.text || '';
        }
        
        // Обновляем кнопки действий
        UI.updateActionButtons();
        
        // ✅ Восстанавливаем состояние UI (режим, текст свободного ввода и т.д.)
        Render.updateUIMode();
        
        // Финальная проверка: убеждаемся, что все контейнеры отображены
        setTimeout(() => {
            checkAllContainersVisible();
        }, 100);
        
        log.info('SYSTEM', `📊 Статистика: Ход ${state.game.turnCount}, Организации: ${State.getHeroOrganizations().length}`);
        
        // 4. Настраиваем игровые подписки ПОСЛЕ инициализации всех модулей
        log.info('GAME', "Настройка игровых подписок...");
        if (Game.setupGameObservers) {
            Game.setupGameObservers();
        }
        if (Render.setupStateObservers) {
            Render.setupStateObservers();
        }
        
        // Обновляем состояние четырёх иконок проверки моделей в настройках
        Render.updateModelStats();
        
        log.info('SYSTEM', "✅ Система полностью инициализирована и готова");
    } catch (error) {
        log.error('FATAL', "Критическая ошибка инициализации", error);
        
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
        dom.freeModeToggle.onchange = (e) => Game.handleFreeModeToggle(e);
    }
    
    // ========== ПОЛЕ СВОБОДНОГО ВВОДА ==========
    if (dom.freeInputText) {
        let saveTimeout;
        dom.freeInputText.oninput = (e) => {
            const state = State.getState();
            state.ui.freeMode.text = e.target.value;
            const hasText = state.ui.freeMode.text.trim().length > 0;
            dom.choicesCounter.textContent = hasText ? '✓/∞' : '0/∞';
            UI.updateActionButtons();
            
            clearTimeout(saveTimeout);
            saveTimeout = setTimeout(() => {
                State.saveStateToLocalStorage();
            }, 500);
        };
        
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
        btnSettings.onclick = () => UI.openSettingsModal();
    }
    
    // ========== КНОПКА ПОЛНОЭКРАННОГО РЕЖИМА ==========
    const btnFullscreen = document.getElementById('btnFullscreen');
    if (btnFullscreen) {
        btnFullscreen.onclick = () => UI.toggleFullscreen();
    }
    
    // ========== КНОПКИ МАСШТАБИРОВАНИЯ ==========
    const btnScaleUp = document.getElementById('btnScaleUp');
    if (btnScaleUp) {
        btnScaleUp.onclick = () => UI.scaleUp();
    }
    
    const btnScaleDown = document.getElementById('btnScaleDown');
    if (btnScaleDown) {
        btnScaleDown.onclick = () => UI.scaleDown();
    }
    
    // ========== НАСТРОЙКИ В МОДАЛЬНОМ ОКНЕ ==========
    setupSettingsModalEvents();
    
    // ========== СОХРАНЕНИЕ/ЗАГРУЗКА ==========
    setupSaveLoadEvents();
    
    // ========== АУДИТ-ЛОГ ==========
    setupAuditEvents();
    
    // ========== ОБРАБОТЧИК ПРИНЯТИЯ СЮЖЕТА (переопределён) ==========
    setupAcceptPlotHandler();
}

/**
 * Настройка обработчиков для модального окна настроек
 */
function setupSettingsModalEvents() {
    const closeModalBtn = document.getElementById('closeModalBtn');
    if (closeModalBtn) {
        closeModalBtn.onclick = () => UI.closeSettingsModal();
    }
    
    const btnTheme = document.getElementById('btnOpenThemeEditor');
    if (btnTheme) {
        btnTheme.onclick = () => {
            UI.closeSettingsModal();
            themeEditorPro.open();
        };
    }
    
    // --- 1. Провайдер API ---
    const providerInput = document.getElementById('providerInput');
    if (providerInput) {
        providerInput.onchange = () => {
            const state = State.getState();
            state.settings.apiProvider = providerInput.value;
            State.updateSettings({ apiProvider: providerInput.value });
            localStorage.setItem('oto_provider', state.settings.apiProvider);
            Render.updateApiKeyFields();
            Render.renderModelSelectorByProvider();
            Render.updateModelDetails();
        };
        providerInput.value = State.getSettings().apiProvider;
    }
    
    // --- 2. API ключи ---
    const apiKeyOpenrouterInput = document.getElementById('apiKeyOpenrouterInput');
    if (apiKeyOpenrouterInput) {
        apiKeyOpenrouterInput.oninput = () => {
            const state = State.getState();
            state.settings.apiKeyOpenrouter = apiKeyOpenrouterInput.value;
            State.updateSettings({ apiKeyOpenrouter: apiKeyOpenrouterInput.value });
            localStorage.setItem('oto_key_openrouter', state.settings.apiKeyOpenrouter);
        };
        apiKeyOpenrouterInput.value = State.getSettings().apiKeyOpenrouter;
    }
    
    const apiKeyVsegptInput = document.getElementById('apiKeyVsegptInput');
    if (apiKeyVsegptInput) {
        apiKeyVsegptInput.oninput = () => {
            const state = State.getState();
            state.settings.apiKeyVsegpt = apiKeyVsegptInput.value;
            State.updateSettings({ apiKeyVsegpt: apiKeyVsegptInput.value });
            localStorage.setItem('oto_key_vsegpt', state.settings.apiKeyVsegpt);
        };
        apiKeyVsegptInput.value = State.getSettings().apiKeyVsegpt;
    }
    
    // --- 3. Модель ИИ ---
    const modelInput = document.getElementById('modelInput');
    if (modelInput) {
        modelInput.onchange = () => {
            const state = State.getState();
            state.settings.model = modelInput.value;
            State.updateSettings({ model: modelInput.value });
            localStorage.setItem('oto_model', state.settings.model);
            Render.updateModelDetails();
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
            const promptToSend = currentText.length > 0 
                ? currentText + "</br>" + CONFIG.marsyasScenarioPrompt 
                : CONFIG.marsyasScenarioPrompt;
            
            // Сохраняем оригинальный текст кнопки ДО изменения
            const oldBtnText = btnGen.innerHTML;
            btnGen.disabled = true;
            btnGen.innerHTML = '<span class="spinner"></span> ГЕНЕРАЦИЯ...';
            if (btnAccept) btnAccept.disabled = true;
            if (btnClear) btnClear.disabled = true;
            plotInput.disabled = true;
            
            try {
                // Вызываем API и получаем объект сцены
                const sceneData = await API.generateCustomScene(promptToSend);
                
                // Сохраняем объект для последующего использования
                lastGeneratedSceneData = sceneData;
                
                // Отображаем в поле для информации (JSON)
                plotInput.value = JSON.stringify(sceneData, null, 2);
                
                // Проверка: выведем в консоль первые choices для отладки
                if (sceneData.choices && sceneData.choices.length > 0) {
                    console.log('✅ Сгенерировано choices:', sceneData.choices.length);
                } else {
                    console.warn('⚠️ Сгенерировано 0 choices');
                }
                
                Render.showSuccessAlert("Сюжет сгенерирован", "Ответ от ИИ получен.");
            } catch (error) {
                console.error("Ошибка генерации сюжета:", error);
                Render.showErrorAlert("Ошибка генерации", "Не удалось получить сюжет от ИИ.", error);
                lastGeneratedSceneData = null;
            } finally {
                btnGen.disabled = false;
                btnGen.innerHTML = oldBtnText;
                plotInput.disabled = false;
                if (btnClear) btnClear.disabled = false;
                if (btnAccept) btnAccept.disabled = plotInput.value.trim().length === 0;
            }
        };
    }
}

/**
 * ОБРАБОТЧИК ДЛЯ КНОПКИ "ПРИНЯТЬ" (исправленный)
 */
/**
 * ОБРАБОТЧИК ДЛЯ КНОПКИ "ПРИНЯТЬ" (исправленный)
 */
function setupAcceptPlotHandler() {
    const btnAccept = document.getElementById('btnAcceptPlot');
    const plotInput = document.getElementById('plotInput');
    if (!btnAccept || !plotInput) return;
    
    btnAccept.onclick = () => {
        // Пытаемся получить объект из сохранённого
        let sceneData;
        
        if (lastGeneratedSceneData) {
            // Используем сохранённый объект напрямую (уже нормализован)
            sceneData = lastGeneratedSceneData;
            console.log('✅ Использую сохранённый объект от генерации');
        } else {
            // Иначе парсим то, что ввёл пользователь вручную
            const rawText = plotInput.value.trim();
            if (!rawText) return;
            
            State.setGameType('custom');
            console.log('📝 Парсинг введённого текста');
            
            // Пробуем распарсить как JSON и передать объект в Parser
            try {
                const parsed = JSON.parse(rawText);
                sceneData = Parser.processAIResponse(parsed);
            } catch (parseError) {
                // Если JSON невалиден, пробуем через строку (агрессивный режим)
                console.warn('Введённый текст не является валидным JSON, пробуем агрессивный парсинг');
                try {
                    sceneData = Parser.processAIResponse(rawText);
                } catch (e) {
                    console.error('❌ Parser.processAIResponse провалился', e);
                    Render.showErrorAlert("Ошибка парсинга JSON", "Не удалось обработать ответ через Parser", e);
                    return;
                }
            }
        }
        
        // Проверяем, что sceneData содержит choices
        if (!sceneData.choices || !Array.isArray(sceneData.choices) || sceneData.choices.length === 0) {
            console.warn('⚠️ sceneData.choices отсутствуют или пусты', sceneData);
            Render.showErrorAlert("Ошибка данных", "Сцена не содержит выборов. Проверьте JSON.");
            return;
        }
        
        // Сохраняем настройки и пр.
        const state = State.getState();
        const preserved = {
            settings: { ...state.settings },
            ui: { ...state.ui },
            models: [...state.settings.models],
            auditLog: [...State.getAuditLog()],
            gameId: Utils.generateUniqueId(),
            lastSaveTime: new Date().toISOString()
        };
        
        // 1. Начальное состояние героя (дефолтное)
        let heroState = State.getDefaultHeroState();
        
        // 2. Добавляем/обновляем все game_items из корня (если есть)
        if (sceneData.game_items && Array.isArray(sceneData.game_items)) {
            sceneData.game_items.forEach(newItem => {
                const existingIndex = heroState.findIndex(item => item.id === newItem.id);
                if (existingIndex >= 0) {
                    heroState[existingIndex] = { ...heroState[existingIndex], ...newItem };
                } else {
                    heroState.push({ ...newItem });
                }
            });
        }
        
        // 3. Применяем операции из корня (если есть) — через Parser.normalizeOperation
        if (sceneData.operations && Array.isArray(sceneData.operations)) {
            const normalizedOps = sceneData.operations
                .map(op => Parser.normalizeOperation(op))
                .filter(Boolean);
            OperationsServiceInstance.applyOperations(normalizedOps, heroState);
        }
        
        // 4. Применяем эффекты событий и сохраняем результаты
        const eventOperationResults = [];
        if (sceneData.events && Array.isArray(sceneData.events)) {
            const allEffects = sceneData.events.flatMap(event => event.effects || []);
            if (allEffects.length > 0) {
                const eventResult = OperationsServiceInstance.applyOperations(allEffects, heroState);
                let effectIndex = 0;
                sceneData.events.forEach((event, evIdx) => {
                    const count = event.effects?.length || 0;
                    eventOperationResults[evIdx] = eventResult.results?.slice(effectIndex, effectIndex + count) || [];
                    effectIndex += count;
                });
            } else {
                sceneData.events.forEach((_, i) => { eventOperationResults[i] = []; });
            }
        }
        
        // aiMemory уже нормализован Parser
        const aiMemoryCopy = JSON.parse(JSON.stringify(sceneData.aiMemory || {}));
        
        // Создаём новое gameState
        const newGameState = {
            summary: sceneData.summary || "",
            history: [],
            currentScene: {
                scene: sceneData.scene || sceneData.text || "",
                choices: sceneData.choices || [],
                reflection: sceneData.reflection || "",
                typology: sceneData.typology || "",
                thoughts: sceneData.thoughts || [],
                summary: sceneData.summary || "",
                aiMemory: aiMemoryCopy,
                events: sceneData.events || [],
                design_notes: sceneData.design_notes || "",
                gameType: 'custom'
            },
            organizationsHierarchy: {}
        };
        
        // Извлекаем иерархии организаций
        if (sceneData._organizationsHierarchy) {
            newGameState.organizationsHierarchy = { ...sceneData._organizationsHierarchy };
        } else {
            Object.keys(sceneData).forEach(key => {
                if (key.startsWith('organization_rank_hierarchy:')) {
                    const orgId = key.split(':')[1];
                    if (orgId) newGameState.organizationsHierarchy[orgId] = sceneData[key];
                }
            });
        }
        
        // Первая запись в истории
        newGameState.history.push({
            fullText: newGameState.currentScene.scene,
            choice: "Начало игры (загруженный сюжет)",
            changes: "Загружен новый сюжет",
            turn: 1
        });
        
        // Собираем новое состояние
        const newState = {
            version: '5.1.0',
            lastSaveTime: new Date().toISOString(),
            game: {
                id: preserved.gameId,
                type: 'custom',
                turnCount: 1,
                summary: newGameState.summary,
                history: newGameState.history,
                currentScene: newGameState.currentScene,
                organizationsHierarchy: newGameState.organizationsHierarchy,
                meta: {
                    metaContext: '',
                    unknownFields: [],
                    unknownArrays: [],
                    unknownObjects: []
                }
            },
            hero: {
                items: heroState,
                thoughts: [],
                ritual: {
                    active: false,
                    progress: 0,
                    target: null
                }
            },
            ui: {
                ...preserved.ui,
                freeMode: { enabled: false, text: '' },
                selectedActions: [],
                pendingRequest: null,
                turnDisplay: { statChanges: null, updates: '' }
            },
            settings: { ...preserved.settings },
        };
        
        // Обработка meta_context при старте кастомной игры
        if (sceneData.meta_context) {
            const metaContext = sceneData.meta_context;
            if (metaContext && typeof metaContext === 'object') {
                newState.game.meta.metaContext = JSON.stringify(metaContext);
            } else if (typeof metaContext === 'string' && metaContext.trim() !== '') {
                newState.game.meta.metaContext = metaContext.trim();
            } else {
                // Число, булево и т.п. – сохраняем как строку
                newState.game.meta.metaContext = String(metaContext);
            }
        }
        
        // Устанавливаем основное состояние
        State.replaceState(newState);
        console.log('🆕 После replaceState game.aiMemory:', State.getGame().aiMemory);
        console.log('🆕 currentScene.aiMemory:', State.getGame().currentScene.aiMemory);
        
        // Генерируем HTML для начальных событий
        if (TurnUpdatesUI && typeof TurnUpdatesUI.generateUpdatesHTML === 'function') {
            TurnUpdatesUI.generateUpdatesHTML(
                [],
                newGameState.currentScene.events || [],
                0,
                [],
                eventOperationResults
            );
        }
        
        if (TurnUpdatesUI && TurnUpdatesUI.initialized) {
            TurnUpdatesUI.renderFromState();
        }
        
        // Эмитим события
        State.emit(State.EVENTS.GAME_TYPE_CHANGED, { oldGameType: state.game.type, newGameType: 'custom' });
        State.emit(State.EVENTS.HERO_CHANGED, { type: 'reset', heroState });
        State.emit(State.EVENTS.SCENE_CHANGED, { scene: newGameState.currentScene });
        
        // Рендерим всё
        Render.renderScene();
        Render.renderChoices();
        GameItemUI?.forceUpdate?.();
        StatsUI?.render?.();
        HistoryUI?.render?.();
        
        UI.closeSettingsModal();
        Utils.showToast('Новая кастомная игра запущена', 'success');
        
        // Сбрасываем сохранённый объект
        lastGeneratedSceneData = null;
    };
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
                UI.init();
                Render.renderScene();
                Render.renderChoices();
                
                const state = State.getState();
                if (dom.freeInputText) {
                    dom.freeInputText.value = state.ui.freeMode.text || '';
                }
                Render.updateUIMode();
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
                Audit.renderAuditList();
                UI.init();
                
                const state = State.getState();
                if (dom.freeInputText) {
                    dom.freeInputText.value = state.ui.freeMode.text || '';
                }
                Render.updateUIMode();
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
            if (state.game.history.length === 0) {
                Render.showErrorAlert("Ошибка", "История пуста.");
                return;
            }
            const exportData = {
                gameId: state.game.id,
                exportTime: new Date().toISOString(),
                history: state.game.history,
                totalTurns: state.game.turnCount
            };
            const fileName = `oto-history-${state.game.id}.json`;
            Utils.exportToFile(JSON.stringify(exportData, null, 2), fileName);
            Render.showSuccessAlert("История экспортирована", fileName);
        };
    }
    
    const quickSaveBtn = document.getElementById('quickSaveBtn');
    if (quickSaveBtn) {
        quickSaveBtn.onclick = () => {
            State.saveStateToLocalStorage();
            Render.showSuccessAlert("Быстрое сохранение", "Игра сохранена в браузере.");
        };
    }
    
    const btnFullReset = document.getElementById('btnFullReset');
    if (btnFullReset) {
        btnFullReset.onclick = () => State.resetFullGame();
    }
    
    const btnResetGameProgress = document.getElementById('btnResetGameProgress');
    if (btnResetGameProgress) {
        btnResetGameProgress.onclick = () => State.resetGameProgress();
    }
    
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
 * Настройка обработчиков кнопок для аудит-лога
 */
function setupAuditEvents() {
    const clearAuditBtn = document.getElementById('clearAuditBtn');
    if (clearAuditBtn) {
        clearAuditBtn.onclick = () => Audit.clearAudit();
    }
    
    const exportAuditBtn = document.getElementById('exportAuditBtn');
    if (exportAuditBtn) {
        exportAuditBtn.onclick = () => Audit.copyFullAuditLog();
    }
    
    const downloadAuditBtn = document.getElementById('downloadAuditBtn');
    if (downloadAuditBtn) {
        downloadAuditBtn.onclick = () => Audit.exportFullAuditLog();
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
        Audit.renderAuditList();
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
        
        Render.renderScene();
        Render.renderChoices();
        
        const state = State.getState();
        if (dom.freeInputText) {
            dom.freeInputText.value = state.ui.freeMode.text || '';
        }
        Render.updateUIMode();
        GameItemUI.forceUpdate();
        StatsUI.render();
        HistoryUI.render();
        
        State.saveStateToLocalStorage();
    }
}

// КРИТИЧЕСКИ ВАЖНО: гарантированное сохранение состояния перед уходом со страницы
window.addEventListener('beforeunload', () => {
    State.saveStateToLocalStorage();
    if (typeof State.saveAuditLogToLocalStorage === 'function') {
        State.saveAuditLogToLocalStorage();
    }
});

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