// Модуль 3: STATE - Управление состоянием игры (js/3-state.js)
'use strict';

import { CONFIG, initialScene, aiModels } from './1-config.js';
import { Utils } from './2-utils.js';
import { Saveload } from './9-saveload.js';


// Определяем дефолтные значения
const DEFAULT_STATE = {
    // Игровые характеристики
    stats: { ...CONFIG.startStats },
    progress: 0,
    degreeIndex: 0,
    personality: 'Молодой Минервал, ещё не присягнувший в верности Ордену, полный идеалов, но ещё не испытанный тьмой.',
    
    // Текущая сцена
    currentScene: { ...initialScene },
    
    // История и выборы
    history: [],
    selectedChoices: [],
    summary: "",
    
    // Динамическая память ИИ
    aiMemory: {},
    
    // Хранение HTML-строки последних изменений за ход
    lastTurnUpdates: "",
    inventory: [],
    relations: {},
    skills: [],
    
    // Флаги состояния Ритуала
    isRitualActive: false,
    ritualProgress: 0,
    ritualTarget: null,
    
    // Режимы ввода
    freeMode: false,
    freeModeText: '',
    
    // Счетчики
    turnCount: 0,
    thoughtsOfHero: [],
    
    // Настройки приложения
    settings: {
        apiProvider: 'openrouter',
        apiKeyOpenrouter: '',
        apiKeyVsegpt: '',
        model: 'openai/gpt-3.5-turbo-16k',
        scale: CONFIG.scaleSteps[CONFIG.defaultScaleIndex],
        scaleIndex: CONFIG.defaultScaleIndex
    },
    
    // UI PREFERENCES
    ui: {
        hTop: 50,
        hMid: 30,
        hBot: 20,
        wBotLeft: 50,
        isCollapsed: false,
        hBotBeforeCollapse: 20,
        isAutoCollapsed: false
    },
    
    // Аудит-логи
    auditLog: [],
    
    // Статусы моделей
    models: [...aiModels],
    
    // Метаданные
    gameId: Utils.generateUniqueId(),
    lastSaveTime: new Date().toISOString(),
    
    // Активный запрос
    pendingRequest: null
};

// Начинаем с дефолтного состояния
let state = { ...DEFAULT_STATE };

// Применяем масштаб при загрузке скрипта
document.documentElement.style.setProperty('--scale-factor', state.settings.scale);

// Вызываем инициализацию при загрузке модуля
initializeState();

// Функция инициализации состояния (вызывается отдельно)
function initializeState() {
    try {
        console.log('🔍 Инициализация состояния...');
        
        // 1. Сначала сбрасываем к дефолту
        state = { ...DEFAULT_STATE };
        
        // 2. Пытаемся загрузить из localStorage
        const savedState = localStorage.getItem('oto_v3_state');
        
        if (savedState) {
            console.log('')
            try {
                const parsed = JSON.parse(savedState);
                
                // Безопасно мержим сохраненные данные с дефолтными
                if (parsed && typeof parsed === 'object') {
                    // Для каждого поля проверяем наличие в сохраненных данных
                    for (const [key, defaultValue] of Object.entries(DEFAULT_STATE)) {
                        if (parsed[key] !== undefined) {
                            // Особые обработки для разных типов данных
                            if (key === 'stats' && typeof parsed[key] === 'object') {
                                state.stats = { ...defaultValue, ...parsed[key] };
                            } else if (key === 'inventory' && Array.isArray(parsed[key])) {
                                state.inventory = [...parsed[key]];
                            } else if (key === 'relations' && typeof parsed[key] === 'object') {
                                state.relations = { ...parsed[key] };
                            } else if (key === 'skills' && Array.isArray(parsed[key])) {
                                state.skills = [...parsed[key]];
                            } else if (key === 'settings' && typeof parsed[key] === 'object') {
                                state.settings = { ...defaultValue, ...parsed[key] };
                            } else {
                                state[key] = parsed[key];
                            }
                        }
                    }
                    console.log('✅ Состояние загружено из localStorage');
                }
            } catch (parseError) {
                console.error('❌ Ошибка парсинга сохраненного состояния:', parseError);
                // Используем дефолтные значения
                state = { ...DEFAULT_STATE };
                state.gameId = Utils.generateUniqueId();
            }
        } else {
            console.log('🆕 Первый запуск, используем дефолтное состояние');
            state = { ...DEFAULT_STATE };
            state.gameId = Utils.generateUniqueId();
        }
        
        // 3. Загружаем UI настройки отдельно
        try {
            const savedUI = localStorage.getItem('oto_ui_pref');
            if (savedUI) {
                const parsedUI = JSON.parse(savedUI);
                if (parsedUI && typeof parsedUI === 'object') {
                    state.ui = { ...state.ui, ...parsedUI };
                }
            }
        } catch (uiError) {
            console.error('Ошибка загрузки UI настроек:', uiError);
        }
        
        // 4. Загружаем отдельные поля из localStorage
        try {
            const savedAudit = localStorage.getItem('oto_audit_log');
            if (savedAudit) {
                const parsedAudit = JSON.parse(savedAudit);
                if (Array.isArray(parsedAudit)) {
                    state.auditLog = parsedAudit;
                }
            }
        } catch (e) {
            console.error('Ошибка загрузки аудит-лога:', e);
            state.auditLog = [];
        }
        
        try {
            const savedModels = localStorage.getItem('oto_models_status');
            if (savedModels) {
                const parsedModels = JSON.parse(savedModels);
                if (Array.isArray(parsedModels)) {
                    state.models = parsedModels;
                }
            }
        } catch (e) {
            console.error('Ошибка загрузки моделей:', e);
            state.models = [...aiModels];
        }
        
        // 5. Загружаем масштаб
        try {
            const savedScale = localStorage.getItem('oto_scale');
            if (savedScale) {
                const scale = parseFloat(savedScale);
                if (!isNaN(scale)) {
                    state.settings.scale = scale;
                }
            }
        } catch (e) {
            console.error('Ошибка загрузки масштаба:', e);
        }
        
        try {
            const savedScaleIndex = localStorage.getItem('oto_scale_index');
            if (savedScaleIndex) {
                const scaleIndex = parseInt(savedScaleIndex);
                if (!isNaN(scaleIndex)) {
                    state.settings.scaleIndex = scaleIndex;
                }
            }
        } catch (e) {
            console.error('Ошибка загрузки индекса масштаба:', e);
        }
        
        // 6. Загружаем счетчик ходов
        try {
            const savedTurnCount = localStorage.getItem('oto_turn_count');
            if (savedTurnCount) {
                const turnCount = parseInt(savedTurnCount);
                if (!isNaN(turnCount)) {
                    state.turnCount = turnCount;
                }
            }
        } catch (e) {
            console.error('Ошибка загрузки счетчика ходов:', e);
        }
        
        // 7. Загружаем фразы героя
        try {
            const savedThoughts = localStorage.getItem('oto_thoughts_of_hero');
            if (savedThoughts) {
                const parsedThoughts = JSON.parse(savedThoughts);
                if (Array.isArray(parsedThoughts)) {
                    state.thoughtsOfHero = parsedThoughts;
                }
            }
        } catch (e) {
            state.thoughtsOfHero = [];
        }
        
        // 8. Синхронизируем степень
        syncDegree();
        
        console.log('✅ Состояние полностью инициализировано');
        console.log('   Game ID:', state.gameId);
        console.log('   Прогресс:', state.progress);
        console.log('   Степень:', CONFIG.degrees[state.degreeIndex]?.name);
        
    } catch (error) {
        console.error('❌ Критическая ошибка инициализации состояния:', error);
        // Восстанавливаемся к дефолтным значениям
        state = { ...DEFAULT_STATE };
        state.gameId = Utils.generateUniqueId();
        state.models = [...aiModels];
    }
}

/**
 * Защитная инициализация состояния (вызывается при первом getState)
 */
function safeInitialize() {
    if (typeof state === 'undefined' || state === null) {
        console.warn('⚠️ State is undefined, forcing reinitialization');
        initializeState();
    }
    
    // Дополнительная валидация критических полей
    if (!state.stats || typeof state.stats !== 'object') {
        console.warn('⚠️ stats is corrupted, resetting to defaults');
        state.stats = { ...CONFIG.startStats };
    }
    
    // Проверка остальных обязательных полей
    const requiredFields = ['progress', 'degreeIndex', 'personality', 'currentScene'];
    requiredFields.forEach(field => {
        if (state[field] === undefined) {
            console.warn(`⚠️ ${field} is undefined, resetting`);
            if (field === 'currentScene') {
                state[field] = { ...initialScene };
            } else if (field === 'progress' || field === 'degreeIndex') {
                state[field] = 0;
            } else if (field === 'personality') {
                state[field] = 'Молодой Минервал...';
            }
        }
    });
}

/**
 * Синхронизация текущей степени с прогрессом
 */
function syncDegree() {
    let newIndex = 0;
    CONFIG.degrees.forEach((d, i) => {
        if (state.progress >= d.threshold) newIndex = i;
    });
    
    // Добавляем проверку на повышение степени:
    // Если степень повысилась
    if (newIndex > state.degreeIndex) {
        state.degreeIndex = newIndex;
        // Бонус за новую степень (+1 ко всем статам)
        Object.keys(state.stats).forEach(stat => {
            state.stats[stat] = Math.min(100, state.stats[stat] + 1);
        });
        // Активируем ритуал
        state.isRitualActive = true;
        state.ritualProgress = 0;
        state.ritualTarget = CONFIG.degrees[newIndex].lvl;
    } else {
        state.degreeIndex = newIndex;
    }
    
    // Обновляем баффы при каждом обновлении состояния
    updateBuffs();
}

/**
 * Обновление баффов/дебаффов
 */
function updateBuffs() {
    if (!state.buffs || state.buffs.length === 0) return;
    
    const now = new Date();
    const activeBuffs = [];
    
    state.buffs.forEach(buff => {
        // Если бафф постоянный, оставляем
        if (buff.isPermanent) {
            activeBuffs.push(buff);
            return;
        }
        
        // Проверяем срок действия
        const createdAt = new Date(buff.createdAt);
        const diffHours = (now - createdAt) / (1000 * 60 * 60);
        
        if (diffHours < buff.duration) {
            activeBuffs.push(buff);
        } else {
            console.log(`⌛ Бафф "${buff.name}" истёк`);
        }
    });
    
    state.buffs = activeBuffs;
}

// Функция для добавления навыка:
function addSkill(skill) {
    if (skill && typeof skill === 'string' && !state.skills.includes(skill)) {
        state.skills.push(skill);
        localStorage.setItem('oto_skills', JSON.stringify(state.skills));
        return true;
    }
    return false;
}

function applyParsedChanges(parsedData) {
    if (parsedData.stat_changes && typeof parsedData.stat_changes === 'object') {
        Object.entries(parsedData.stat_changes).forEach(([key, value]) => {
            const normKey = Utils.normalizeStatKey(key);
            if (normKey && state.stats.hasOwnProperty(normKey)) {
                state.stats[normKey] += parseInt(value, 10) || 0;
                state.stats[normKey] = Math.max(0, Math.min(100, state.stats[normKey]));
            }
        });
    }
    
    if (typeof parsedData.progress_change === 'number') {
        state.progress += parsedData.progress_change;
        syncDegree();
    }
    
    if (parsedData.personality && typeof parsedData.personality === 'string') {
        state.personality = parsedData.personality;
    }
    
    if (parsedData.inventory_all && Array.isArray(parsedData.inventory_all)) {
        state.inventory = [...new Set(parsedData.inventory_all)];
        console.log("📦 Инвентарь обновлен:", state.inventory);
    }
    
    if (parsedData.relations_all && typeof parsedData.relations_all === 'object') {
        state.relations = { ...state.relations, ...parsedData.relations_all };
        console.log("🤝 Отношения обновлены:", state.relations);
    }
    
    if (parsedData.thoughtsOfHero && Array.isArray(parsedData.thoughtsOfHero)) {
        addHeroPhrases(parsedData.thoughtsOfHero);
    }
    
    if (parsedData.buffs && Array.isArray(parsedData.buffs)) {
        state.buffs = parsedData.buffs;
    }
    
    state.currentScene = {
        text: parsedData.scene,
        choices: parsedData.choices || state.currentScene.choices
    };
    state.summary = parsedData.short_summary || state.summary;
    state.history.push({
        fullText: parsedData.scene,
        summary: parsedData.short_summary
    });
    if (state.history.length > CONFIG.historyContext) {
        state.history = state.history.slice(-CONFIG.historyContext);
    }
    
    localStorage.setItem('oto_v3_state', JSON.stringify(state));
}

function applyChoiceChanges(changes) {
    if (changes.stats && typeof changes.stats === 'object') {
        Object.entries(changes.stats).forEach(([key, value]) => {
            const normKey = Utils.normalizeStatKey(key);
            if (normKey && state.stats.hasOwnProperty(normKey)) {
                state.stats[normKey] += parseInt(value, 10) || 0;
                state.stats[normKey] = Math.max(0, Math.min(100, state.stats[normKey]));
            }
        });
    }
    
    if (changes.inventory_add && Array.isArray(changes.inventory_add)) {
        state.inventory = [...new Set([...state.inventory, ...changes.inventory_add])];
    }
    if (changes.inventory_remove && Array.isArray(changes.inventory_remove)) {
        state.inventory = state.inventory.filter(item => !changes.inventory_remove.includes(item));
    }
    
    localStorage.setItem('oto_v3_state', JSON.stringify(state));
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
        state.lastTurnUpdates = "";
        state.inventory = [];
        state.relations = {};
        state.freeMode = false;
        state.freeModeText = '';
        state.turnCount = 0; // Сброс счетчика ходов
        state.thoughtsOfHero = [];
        state.summary = ""; // Сброс сводки
        state.aiMemory = {}; // Сброс памяти ИИ
        state.skills = []; // Сброс навыков
        state.buffs = []; // Сброс баффов
        state.gameId = Utils.generateUniqueId();
        state.lastSaveTime = new Date().toISOString();
        
        syncDegree();
        
        // Сохраняем в localStorage
        localStorage.setItem('oto_v3_state', JSON.stringify(state));
        localStorage.setItem('oto_game_id', state.gameId);
        localStorage.setItem('oto_last_save_time', state.lastSaveTime);
        localStorage.setItem('oto_turn_count', '0');
        localStorage.removeItem('oto_thoughts_of_hero');
        localStorage.removeItem('oto_skills');
        
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
            inventory: [...state.inventory],
            relations: { ...state.relations },
            skills: [...state.skills],
            buffs: [...state.buffs],
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
        state.inventory = importData.gameState.inventory || state.inventory;
        state.relations = importData.gameState.relations || {};
        state.summary = importData.gameState.summary || ""; // Импорт сводки
        state.aiMemory = importData.gameState.aiMemory || {}; // Импорт динамической памяти
        state.skills = importData.gameState.skills || state.skills;
        state.buffs = importData.gameState.buffs || state.buffs;
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
     // Получение и установка состояния
 getState: () => {
    // Защитная инициализация при каждом вызове
    if (!state || typeof state !== 'object') {
        console.error('❌ State is corrupted! Reinitializing...');
        initializeState();
    }
    
    // Дополнительная валидация
    safeInitialize();
    
    return state;
},
     
     setState: (newState) => {
         if (!state) {
             console.error('⚠️ Cannot setState on undefined state');
             initializeState();
         }
         state = { ...state, ...newState };
         // Если обновили UI, сохраняем настройки интерфейса отдельно
         if (newState.ui) saveUiState();
         
         // Сохраняем изменения в localStorage
         Saveload.saveState();
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
    updateBuffs,
    updateStat: (key, value) => {
        const normalizedKey = Utils.normalizeStatKey(key);
        if (normalizedKey && state.stats[normalizedKey] !== undefined) {
            state.stats[normalizedKey] = Math.max(0, Math.min(100, value));
        }
    },
    
    // Новые методы для навыков
    addSkill,
    getSkills: () => state.skills,
    clearSkills: () => {
        state.skills = [];
        localStorage.removeItem('oto_skills');
    },
    
    // Методы для баффов
    getBuffs: () => state.buffs || [],
    addBuff: (buff) => {
        if (!state.buffs) state.buffs = [];
        state.buffs.push(buff);
    },
    clearBuffs: () => {
        state.buffs = [];
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