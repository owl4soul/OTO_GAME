// Модуль 3: STATE - Управление состоянием игры (js/3-state.js)
'use strict';

import { CONFIG, initialScene, aiModels } from './1-config.js';
import { Utils } from './2-utils.js';

// Начальное состояние игры
let state = {
    // Игровые характеристики
    stats: { ...CONFIG.startStats },
    progress: 0,
    degreeIndex: 0,
    personality: 'Молодой Минервал, ещё не присягнувший в верности Ордену, полный идеалов, но ещё не испытанный тьмой.',
    
    // Флаги состояний
    isRitualActive: false,
    
    // Текущая сцена
    currentScene: { ...initialScene },
    
    // История и выборы
    history: [],
    selectedChoices: [],
    // Краткая выжимка из последних сюжетгых ходов, обновляется каждый ход
    summary: "",
    
    // Динамическая память ИИ (Неструктурированные данные), также отправляется и сохраняется
    aiMemory: {},
    
    // Режимы ввода
    freeMode: false,
    freeModeText: '',
    
    // Счетчики
    turnCount: parseInt(localStorage.getItem('oto_turn_count') || '0'),
    
    // Фразы героя
    thoughtsOfHero: JSON.parse(localStorage.getItem('oto_thoughts_of_hero') || '[]'),
    
    // Настройки приложения
    settings: {
        apiProvider: localStorage.getItem('oto_provider') || 'openrouter',
        apiKeyOpenrouter: localStorage.getItem('oto_key_openrouter') || '',
        apiKeyVsegpt: localStorage.getItem('oto_key_vsegpt') || '',
        model: localStorage.getItem('oto_model') || 'openai/gpt-3.5-turbo-16k',
        scale: CONFIG.scaleSteps[CONFIG.defaultScaleIndex],
        scaleIndex: CONFIG.defaultScaleIndex
    },
    
    // === UI PREFERENCES: Настройки интерфейса ===
    // Хранит размеры секций и состояние свернутости для восстановления между сессиями
    ui: JSON.parse(localStorage.getItem('oto_ui_pref')) || {
        hTop: 50, // Высота верхней секции (%)
        hMid: 30, // Высота средней секции (%)
        hBot: 20, // Высота нижней секции (%)
        wBotLeft: 50, // Ширина левой колонки в нижней секции (%)
        isCollapsed: false, // Свернута ли нижняя секция
        hBotBeforeCollapse: 20, // Хранит высоту нижней секции перед сворачиванием (% или дефолтные 20)
        isAutoCollapsed: false // !ВАЖНО: Флаг для отслеживания клавиатуры
    },
    
    // Аудит-логи
    auditLog: JSON.parse(localStorage.getItem('oto_audit_log') || '[]'),
    
    // Статусы моделей
    models: JSON.parse(localStorage.getItem('oto_models_status') || JSON.stringify(aiModels)),
    
    // Метаданные
    gameId: localStorage.getItem('oto_game_id') || Utils.generateUniqueId(),
    lastSaveTime: localStorage.getItem('oto_last_save_time') || new Date().toISOString(),
    
    // Активный запрос (для отмены)
    pendingRequest: null
};

// Применяем масштаб при загрузке скрипта
document.documentElement.style.setProperty('--scale-factor', state.settings.scale);

/**
 * Синхронизация текущей степени с прогрессом
 */
function syncDegree() {
    let newIndex = 0;
    CONFIG.degrees.forEach((d, i) => {
        if (state.progress >= d.threshold) newIndex = i;
    });
    state.degreeIndex = newIndex;
}

/**
 * Сброс только игрового прогресса (без настроек)
 * @returns {Object} Новое состояние
 */
function resetGameProgress() {
    if (confirm("[SOFT RESET] Сбросить прогресс текущей игры? Игра начнётся заново.")) {
        state.stats = { ...CONFIG.startStats };
        state.progress = 0;
        state.degreeIndex = 0;
        state.personality = 'Молодой Минервал, ещё не присягнувший в верности Ордену, полный идеалов, но ещё не испытанный тьмой.';
        state.isRitualActive = false;
        state.currentScene = { ...initialScene };
        state.history = [];
        state.selectedChoices = [];
        state.freeMode = false;
        state.freeModeText = '';
        state.turnCount = 0; // Сброс счетчика ходов
        state.thoughtsOfHero = [];
        state.summary = ""; // Сброс сводки
        state.aiMemory = {}; // Сброс памяти ИИ
        state.gameId = Utils.generateUniqueId();
        state.lastSaveTime = new Date().toISOString();
        
        syncDegree();
        
        // Сохраняем в localStorage
        localStorage.setItem('oto_v3_state', JSON.stringify(state));
        localStorage.setItem('oto_game_id', state.gameId);
        localStorage.setItem('oto_last_save_time', state.lastSaveTime);
        localStorage.setItem('oto_turn_count', '0');
        localStorage.removeItem('oto_thoughts_of_hero');
        
        location.reload();
    }
}

/**
 * Полный сброс игры (включая настройки)
 */
function resetFullGame() {
    if (confirm("[HARD RESET] Сбросить ВСЮ игру, включая настройки? ВСЕ данные будут удалены.")) {
        localStorage.clear();
        location.reload();
    }
}



/**
 * Сохраняет настройки UI (вызывать при изменениях лейаута)
 */
function saveUiState() {
    localStorage.setItem('oto_ui_pref', JSON.stringify(state.ui));
}

/**
 * Экспорт полного состояния игры
 * @returns {Object} Данные для экспорта
 */
function exportFullState() {
    const exportData = {
        version: CONFIG.stateVersion,
        gameId: state.gameId,
        exportTime: new Date().toISOString(),
        gameState: {
            stats: { ...state.stats },
            progress: state.progress,
            degreeIndex: state.degreeIndex,
            personality: state.personality,
            isRitualActive: state.isRitualActive,
            currentScene: { ...state.currentScene },
            history: [...state.history],
            summary: state.summary, // Экспорт сводки
            aiMemory: { ...state.aiMemory }, // Экспорт динамической памяти
            selectedChoices: [...state.selectedChoices],
            freeMode: state.freeMode,
            freeModeText: state.freeModeText,
            turnCount: state.turnCount,
            thoughtsOfHero: [...state.thoughtsOfHero]
        },
        settings: { ...state.settings },
        auditLog: [...state.auditLog],
        models: [...state.models],
        metadata: {
            lastSaveTime: state.lastSaveTime,
            totalPlayTime: calculateTotalPlayTime(),
            totalChoices: state.history.length,
            highestDegree: CONFIG.degrees[state.degreeIndex].name
        }
    };
    
    return exportData;
}

/**
 * Импорт полного состояния игры
 * @param {Object} importData - Данные для импорта
 * @returns {boolean} Успех импорта
 */
function importFullState(importData) {
    if (!importData || typeof importData !== 'object') {
        throw new Error('Некорректные данные импорта');
    }
    
    // Поддержка версий (для плавного обновления сохранений)
    if (importData.version !== CONFIG.stateVersion && importData.version !== '1.1' && importData.version !== '1.2') {
        // Предупреждение, но пробуем загрузить, если версии близки. В идеале тут миграционная логика.
        console.warn(`Миграция версии состояния: Импорт ${importData.version} в Текущую ${CONFIG.stateVersion}`);
    }
    
    // Сохраняем оригинальный gameId или создаем новый
    state.gameId = importData.gameId || Utils.generateUniqueId();
    state.lastSaveTime = importData.exportTime || new Date().toISOString();
    
    // Импортируем состояние игры
    if (importData.gameState) {
        state.stats = importData.gameState.stats || state.stats;
        state.progress = importData.gameState.progress || state.progress;
        state.degreeIndex = importData.gameState.degreeIndex || state.degreeIndex;
        state.personality = importData.gameState.personality || state.personality;
        state.isRitualActive = importData.gameState.isRitualActive || false;
        state.currentScene = importData.gameState.currentScene || state.currentScene;
        state.history = importData.gameState.history || state.history;
        state.selectedChoices = importData.gameState.selectedChoices || state.selectedChoices;
        state.summary = importData.gameState.summary || ""; // Импорт сводки
        state.aiMemory = importData.gameState.aiMemory || {}; // Импорт динамической памяти
        state.freeMode = importData.gameState.freeMode || state.freeMode;
        state.freeModeText = importData.gameState.freeModeText || state.freeModeText;
        state.turnCount = importData.gameState.turnCount || state.turnCount;
        state.thoughtsOfHero = importData.gameState.thoughtsOfHero || state.thoughtsOfHero;
    }
    
    // Импортируем настройки
    if (importData.settings) {
        // Не импортируем API ключи из файла (они локальны)
        const currentApiKeyOpenrouter = state.settings.apiKeyOpenrouter;
        const currentApiKeyVsegpt = state.settings.apiKeyVsegpt;
        
        state.settings = importData.settings;
        state.settings.apiKeyOpenrouter = currentApiKeyOpenrouter;
        state.settings.apiKeyVsegpt = currentApiKeyVsegpt;
    }
    
    // Импортируем аудит-логи
    if (importData.auditLog) {
        state.auditLog = importData.auditLog;
    }
    
    // Импортируем модели
    if (importData.models) {
        state.models = importData.models;
    }
    
    // Синхронизируем степень
    syncDegree();
    
    return true;
}

/**
 * Расчет общего времени игры
 * @returns {number} Время в секундах
 */
function calculateTotalPlayTime() {
    const startTime = localStorage.getItem('oto_first_play_time');
    if (!startTime) return 0;
    
    const start = new Date(startTime);
    const now = new Date();
    const diffMs = now - start;
    
    return Math.floor(diffMs / 1000); // Возвращаем в секундах
}

// Сохранение времени первого запуска (если его еще нет)
if (!localStorage.getItem('oto_first_play_time')) {
    localStorage.setItem('oto_first_play_time', new Date().toISOString());
}

/**
 * Добавление записи в аудит-лог
 * @param {Object} entry - Запись аудита
 */
function addAuditLogEntry(entry) {
    // Добавляем московское время
    entry.timestamp = Utils.formatMoscowTime(new Date());
    state.auditLog.unshift(entry);
    // Сохраняем только последние 100 записей (ограничиваем объем лога)
    if (state.auditLog.length > 100) {
        state.auditLog = state.auditLog.slice(0, 100);
    }
}

/**
 * Обновление масштаба интерфейса
 * @param {number} newScaleIndex - Новый индекс масштаба
 * @returns {number} Новый масштаб
 */
function updateScale(newScaleIndex) {
    newScaleIndex = Math.max(0, Math.min(CONFIG.scaleSteps.length - 1, newScaleIndex));
    
    state.settings.scaleIndex = newScaleIndex;
    state.settings.scale = CONFIG.scaleSteps[newScaleIndex];
    
    // Применяем масштаб к корневому элементу HTML и базовому размеру шрифта
    document.documentElement.style.setProperty('--scale-factor', state.settings.scale);
    document.documentElement.style.fontSize = `${state.settings.scale * 16}px`; // Пересчет для базового 16px
    
    localStorage.setItem('oto_scale', state.settings.scale.toString());
    localStorage.setItem('oto_scale_index', newScaleIndex.toString());
    return state.settings.scale;
}

/**
 * Подсчет статистики моделей для заголовка (4 значка)
 */
function getModelStats() {
    // Если модели еще не загружены, берем дефолт
    const models = state.models || [];
    
    const total = models.length;
    const success = models.filter(m => m.status === 'success').length;
    const error = models.filter(m => m.status === 'error').length;
    // Все, что не успех и не ошибка — считается "не проверено" (untested/pending)
    const untested = total - success - error;

    return { total, success, error, untested };
}

/**
 * Экспорт всех данных приложения (настроек, логов, без API ключей)
 * @returns {Object} Данные для экспорта
 */
function exportAllAppData() {
    const exportData = {
        version: CONFIG.stateVersion,
        exportTime: new Date().toISOString(),
        appData: {
            settings: {
                apiProvider: state.settings.apiProvider,
                model: state.settings.model,
                scale: state.settings.scale,
                scaleIndex: state.settings.scaleIndex
            },
            models: [...state.models],
            auditLog: [...state.auditLog],
            metadata: {
                gameId: state.gameId,
                lastSaveTime: state.lastSaveTime,
                totalPlayTime: calculateTotalPlayTime()
            }
        }
    };
    
    return exportData;
}

/**
 * Импорт всех данных приложения
 * @param {Object} importData - Данные для импорта
 * @returns {boolean} Успех импорта
 */
function importAllAppData(importData) {
    if (!importData || typeof importData !== 'object') {
        throw new Error('Некорректные данные импорта');
    }
    
    if (importData.version !== CONFIG.stateVersion && importData.version !== '1.1' && importData.version !== '1.2') {
        console.warn(`Миграция версии данных: ${importData.version} в Текущую ${CONFIG.stateVersion}`);
    }
    
    if (!importData.appData) {
        throw new Error('Отсутствуют данные приложения');
    }
    
    // Импортируем настройки (кроме API ключей - они чувствительны и остаются локальными)
    if (importData.appData.settings) {
        const currentApiKeyOpenrouter = state.settings.apiKeyOpenrouter;
        const currentApiKeyVsegpt = state.settings.apiKeyVsegpt;
        
        state.settings.apiProvider = importData.appData.settings.apiProvider || state.settings.apiProvider;
        state.settings.model = importData.appData.settings.model || state.settings.model;
        state.settings.scale = importData.appData.settings.scale || state.settings.scale;
        state.settings.scaleIndex = importData.appData.settings.scaleIndex || state.settings.scaleIndex;
        
        state.settings.apiKeyOpenrouter = currentApiKeyOpenrouter;
        state.settings.apiKeyVsegpt = currentApiKeyVsegpt;
    }
    
    // Импортируем модели
    if (importData.appData.models) {
        state.models = importData.appData.models;
    }
    
    // Импортируем аудит-логи
    if (importData.appData.auditLog) {
        state.auditLog = importData.appData.auditLog;
    }
    
    // Импортируем метаданные
    if (importData.appData.metadata) {
        state.gameId = importData.appData.metadata.gameId || state.gameId;
        state.lastSaveTime = importData.appData.metadata.lastSaveTime || state.lastSaveTime;
    }
    
    return true;
}

/**
 * Увеличение счетчика ходов
 * @returns {number} Новое значение счетчика
 */
function incrementTurnCount() {
    state.turnCount++;
    localStorage.setItem('oto_turn_count', state.turnCount.toString());
    return state.turnCount;
}

/**
 * Получение текущего значения счетчика ходов
 * @returns {number} Значение счетчика
 */
function getTurnCount() {
    return state.turnCount;
}

/**
 * Получение фразы героя из списка
 * @returns {string|null} Фраза героя или null
 */
function getHeroPhrase() {
    if (state.thoughtsOfHero.length > 0) {
        return state.thoughtsOfHero.shift(); // Берем и удаляем первую фразу из начала массива
    }
    return null;
}

/**
 * Добавление фраз героя в список
 * @param {Array<string>} phrases - Массив фраз для добавления
 */
function addHeroPhrases(phrases) {
    if (Array.isArray(phrases)) {
        state.thoughtsOfHero = state.thoughtsOfHero.concat(phrases);
        // Сохраняем обновленный список фраз в localStorage
        localStorage.setItem('oto_thoughts_of_hero', JSON.stringify(state.thoughtsOfHero));
    }
}

/**
 * Получение количества доступных фраз героя
 * @returns {number} Количество фраз
 */
function getHeroPhrasesCount() {
    return state.thoughtsOfHero.length;
}

/**
 * Очистка списка фраз героя
 */
function clearHeroPhrases() {
    state.thoughtsOfHero = [];
    localStorage.removeItem('oto_thoughts_of_hero');
}

/**
 * Проверка необходимости запроса новых фраз героя (если список пуст)
 * @returns {boolean} true если список пуст
 */
function needsHeroPhrases() {
    return state.thoughtsOfHero.length === 0;
}

// Публичный интерфейс модуля
export const State = {
    // Получение и установка состояния
    getState: () => state,
    setState: (newState) => {
        state = { ...state, ...newState };
        // Если обновили UI, сохраняем настройки интерфейса отдельно
        if (newState.ui) saveUiState();
    },
    
    // === Управление UI (Getters/Setters для UI) ===
    getHBotBeforeCollapse: () => state.ui.hBotBeforeCollapse,
    
    setHBotBeforeCollapse: (value) => {
        state.ui.hBotBeforeCollapse = value;
        // Можно сразу сохранить, чтобы не потерять при перезагрузке
        saveUiState();
    },
    
    // Основные функции
    syncDegree,
    updateStat: (key, value) => {
        const normalizedKey = Utils.normalizeStatKey(key);
        if (normalizedKey && state.stats[normalizedKey] !== undefined) {
            state.stats[normalizedKey] = Math.max(0, Math.min(100, value));
        }
    },
    
    // Сброс и рестарт игры
    resetGameProgress,
    resetFullGame,
    saveUiState,
    
    // Функции экспорта/импорта состояния
    exportFullState,
    importFullState,
    exportAllAppData,
    importAllAppData,
    
    // Функции аудита и логирования
    addAuditLogEntry,
    getModelStats,
    
    // Управление активными запросами
    setPendingRequest: (controller) => { state.pendingRequest = controller; },
    clearPendingRequest: () => { state.pendingRequest = null; },
    getPendingRequest: () => state.pendingRequest,
    
    // Функции масштабирования UI
    updateScale,
    getScaleIndex: () => state.settings.scaleIndex,
    
    // Функции для счетчика ходов
    incrementTurnCount,
    getTurnCount,
    
    // Функции для управления фразами героя
    getHeroPhrase,
    addHeroPhrases,
    getHeroPhrasesCount,
    clearHeroPhrases,
    needsHeroPhrases
};