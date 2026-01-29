// Модуль 1: CONFIG - Конфигурация и константы (1-config.js)
'use strict';

// Импортируем библиотеку текстов из соседнего файла
import { PROMPTS } from './prompts.js';

// Основные конфигурационные константы
export const CONFIG = {
    // Игровые настройки
    maxChoices: 3,
    historyContext: 5,
    activeContextTurns: 3,
    
    maxRetries: 3,
    autoRepairAttempts: 2,
    
    retryDelayMs: 1000,
    requestTimeout: 90000,
    stateVersion: '4.1.0', // Обновляем версию
    
    // Шаги масштабирования
    scaleSteps: [0.70, 0.75, 0.80, 0.85, 0.90, 0.95, 1.00, 1.05, 1.10, 1.15, 1.20, 1.25, 1.30],
    defaultScaleIndex: 6,
    
    // Степени посвящения
    degrees: [
        { lvl: 0, name: "0° — Минервал (кандидат)", threshold: 0 },
        { lvl: 1, name: "I° — Ученик", threshold: 10 },
        { lvl: 2, name: "II° — Подмастерье", threshold: 20 },
        { lvl: 3, name: "III° — Мастер", threshold: 30 },
        { lvl: 4, name: "IV° — Совершенный мастер", threshold: 40 },
        { lvl: 5, name: "V° — Рыцарь Злато-Розового Креста", threshold: 50 },
        { lvl: 6, name: "VI° — Возлюбленный Брат Рыцарь", threshold: 60 },
        { lvl: 7, name: "VII° — Весьма Знающий Брат", threshold: 70 },
        { lvl: 8, name: "VIII° — Совершенный брат", threshold: 80 },
        { lvl: 9, name: "IX° — Вдохновленный брат", threshold: 90 },
        { lvl: 10, name: "X° — Высочайший и Святейший Король", threshold: 100 },
        { lvl: 11, name: "XI° — Инициированный О.Т.О.", threshold: 110 }
    ],
    
    // Начальные характеристики
    startStats: {
        will: 50,
        stealth: 50,
        influence: 50,
        sanity: 50
    },
    
    // Алиасы для названий характеристик
    statAliases: {
        'will': 'will',
        'stealth': 'stealth',
        'influence': 'influence',
        'sanity': 'sanity',
        
        'reason': 'sanity',
        'разум': 'sanity',
        'рассудок': 'sanity',
        'ум': 'sanity',
        'интеллект': 'sanity',
        'ментальность': 'sanity',
        
        'воля': 'will',
        'сила воли': 'will',
        'решимость': 'will',
        
        'скрытность': 'stealth',
        'незаметность': 'stealth',
        'тайность': 'stealth',
        
        'влияние': 'influence',
        'авторитет': 'influence',
        'убеждение': 'influence',
        'харизма': 'influence'
    },
    
    // Заглушки фраз героя
    thoughtsOfHeroFakes: [
        "Холодный дождь стучит по стеклу, как метроном времени.",
        "Паранойя стала моей второй кожей.",
        "Кто здесь друг, а кто враг? Границы стерлись.",
        "Каждая ложь оставляет след в воздухе.",
        "Телема говорит о свободе, но мы в клетке.",
        "Брат Марсий знает больше, чем говорит.",
        "Тени на стенах шепчут о предательстве.",
        "Ритуалы стали нашим последним причастием.",
        "Страх - это вирус, который ест изнутри.",
        "Моя воля - последний бастион.",
        "За каждым взглядом - расчет.",
        "Истина где-то между клятвами и страхом.",
        "Храм стал ловушкой.",
        "Дождь смывает следы, но не грехи.",
        "Ночь в Москве никогда не бывает тихой.",
        "Воздух здесь густой от невысказанного.",
        "Каждый шаг отдается эхом в пустоте.",
        "Свечи горят, но не греют.",
        "Слова потеряли свой вес.",
        "Тишина кричит громче слов.",
        "Зеркала показывают только тени.",
        "Время замедлилось, ожидая развязки.",
        "Кровь на руках не отмывается.",
        "Ложь имеет сладкий привкус.",
        "Истина горька, как полынь.",
        "Сны смешались с реальностью.",
        "Голоса прошлого шепчут в темноте.",
        "Каждый выбор оставляет шрам.",
        "Свобода - это иллюзия, которую продают.",
        "Цепь клятв тянет на дно.",
        "Огонь в очаге угасает.",
        "Звезды не видны сквозь смог.",
        "Дорога назад заросла тернием.",
        "Отражение в вине показывает правду.",
        "Книги молчат о главном.",
        "Ключ поворачивается только один раз.",
        "Дверь в стену ведет в никуда.",
        "Эхо шагов преследует.",
        "Тень длиннее, чем само тело.",
        "Утро не принесет света."
    ],
    
    // Паттерны вибрации
    vibrationPatterns: {
        short: 50,
        medium: [100, 50, 100],
        long: [200, 100, 200, 100, 200],
        error: [300, 100, 300],
        success: [100, 30, 100]
    },
    
    // =========================================================================
    // === ПОДКЛЮЧЕНИЕ ПРОМПТОВ ИЗ ОТДЕЛЬНОГО ФАЙЛА ===
    // =========================================================================
    
    // Ссылки на промпты (теперь берутся из PROMPTS)
    prompts: PROMPTS.system.gameMaster,
    marsyasScenarioPrompt: PROMPTS.marsyasScenarioPrompt
};

// Список AI моделей
export const aiModels = [
    { id: "mistralai/mistral-7b-instruct:free", name: "1Mistral-7B", provider: "openrouter", status: "untested", lastTested: null, responseTime: null, description: "" },
    { id: "google/gemma-3-27b-it:free", name: "1Gemma-3-27B", provider: "openrouter", status: "untested", lastTested: null, responseTime: null, description: "" },
    { id: "amazon/nova-2-lite-v1:free", name: "1Nova-2 Lite", provider: "openrouter", status: "untested", lastTested: null, responseTime: null, description: "" },
    { id: "meta-llama/llama-3-8b-instruct", name: "1Llama 3 8B", provider: "openrouter", status: "untested", lastTested: null, responseTime: null, description: "" },
    { id: "openai/gpt-3.5-turbo-16k", name: "GPT-3.5-TURBO 16K", provider: "vsegpt", status: "untested", lastTested: null, responseTime: null, description: "" },
    { id: "perplexity/llama-3.1-sonar-large-128k-online", name: "Perplexity/Llama-3.1-Sonar-large-128k-online", provider: "vsegpt", status: "untested", lastTested: null, responseTime: null, description: "" },
    { id: "perplexity/latest-large-online", name: "Perplexity/Large-online", provider: "vsegpt", status: "untested", lastTested: null, responseTime: null, description: "" },
    { id: "openai/gpt-5-nano", name: "OPENAI/GPT-5-NANO", provider: "vsegpt", status: "untested", lastTested: null, responseTime: null, description: "" },
    { id: "amazon/nova-micro-v1", name: "AMAZON/NOVA-MICRO-V1", provider: "vsegpt", status: "untested", lastTested: null, responseTime: null, description: "" },
    { id: "openai/gpt-5.1-chat", name: "OPENAI/GPT-5.1-CHAT", provider: "vsegpt", status: "untested", lastTested: null, responseTime: null, description: "" },
    { id: "openai/gpt-4.1", name: "OPENAI/GPT-4.1", provider: "vsegpt", status: "untested", lastTested: null, responseTime: null, description: "" },
    { id: "openai/gpt-4.1-mini", name: "OPENAI/GPT-4.1-MINI", provider: "vsegpt", status: "untested", lastTested: null, responseTime: null, description: "" },
    { id: "openai/gpt-4o-mini", name: "OPENAI/GPT-4O-MINI", provider: "vsegpt", status: "untested", lastTested: null, responseTime: null, description: "" },
    { id: "openai/gpt-oss-20b", name: "OPENAI/GPT-OSS-20B", provider: "vsegpt", status: "untested", lastTested: null, responseTime: null, description: "" },
    { id: "google/gemini-2.5-flash-lite", name: "GOOGLE/GEMINI-2.5-FLASH-LITE", provider: "vsegpt", status: "untested", lastTested: null, responseTime: null, description: "" },
    { id: "anthropic/claude-opus-4.5-thinking", name: "ANTHROPIC/CLAUDE-OPUS-4.5-THINKING", provider: "vsegpt", status: "untested", lastTested: null, responseTime: null, description: "" },
    { id: "anthropic/claude-opus-4.5", name: "ANTHROPIC/CLAUDE-OPUS-4.5", provider: "vsegpt", status: "untested", lastTested: null, responseTime: null, description: "" },
    { id: "anthropic/claude-haiku-4.5-thinking", name: "ANTHROPIC/CLAUDE-HAIKU-4.5-THINKING", provider: "vsegpt", status: "untested", lastTested: null, responseTime: null, description: "" },
    { id: "anthropic/claude-haiku-4.5", name: "ANTHROPIC/CLAUDE-HAIKU-4.5", provider: "vsegpt", status: "untested", lastTested: null, responseTime: null, description: "" },
    { id: "anthropic/claude-sonnet-4.5-thinking-high", name: "ANTHROPIC/CLAUDE-SONNET-4.5-THINKING-HIGH", provider: "vsegpt", status: "untested", lastTested: null, responseTime: null, description: "" },
    { id: "anthropic/claude-sonnet-4.5-thinking", name: "ANTHROPIC/CLAUDE-SONNET-4.5-THINKING", provider: "vsegpt", status: "untested", lastTested: null, responseTime: null, description: "" },
    { id: "anthropic/claude-sonnet-4.5", name: "ANTHROPIC/CLAUDE-SONNET-4.5", provider: "vsegpt", status: "untested", lastTested: null, responseTime: null, description: "" },
    { id: "anthropic/claude-opus-4-thinking", name: "ANTHROPIC/CLAUDE-OPUS-4-THINKING", provider: "vsegpt", status: "untested", lastTested: null, responseTime: null, description: "" },
    { id: "anthropic/claude-3.7-sonnet-thinking-high", name: "ANTHROPIC/CLAUDE-3.7-SONNET-THINKING-HIGH", provider: "vsegpt", status: "untested", lastTested: null, responseTime: null, description: "" },
    { id: "anthropic/claude-3-5-haiku", name: "ANTHROPIC/CLAUDE-3-5-HAIKU", provider: "vsegpt", status: "untested", lastTested: null, responseTime: null, description: "" },
    { id: "deepseek/deepseek-chat-3.1-terminus-alt-thinking", name: "DEEPSEEK-CHAT-3.1-TERMINUS-ALT-THINKING", provider: "vsegpt", status: "untested", lastTested: null, responseTime: null, description: "" },
    { id: "deepseek/deepseek-chat-3.1-terminus-alt", name: "DEEPSEEK-CHAT-3.1-TERMINUS-ALT", provider: "vsegpt", status: "untested", lastTested: null, responseTime: null, description: "" },
    { id: "deepseek/deepseek-chat-0324-alt-fast", name: "DEEPSEEK-CHAT-0324-alt-fast", provider: "vsegpt", status: "untested", lastTested: null, responseTime: null, description: "" },
    { id: "deepseek/deepseek-chat-0324-alt-structured", name: "DEEPSEEK-R1-ALT-STRUCTURED", provider: "vsegpt", status: "untested", lastTested: null, responseTime: null, description: "" },
    { id: "deepseek/deepseek-chat-0324-alt", name: "DEEPSEEK/DEEPSEEK-CHAT-0324-ALT", provider: "vsegpt", status: "untested", lastTested: null, responseTime: null, description: "" },
    { id: "deepseek/deepseek-r1-alt-0528", name: "DEEPSEEK/DEEPSEEK-R1-ALT-0528", provider: "vsegpt", status: "untested", lastTested: null, responseTime: null, description: "" },
    { id: "deepseek/deepseek-r1-alt", name: "DEEPSEEK/DEEPSEEK-R1-ALT", provider: "vsegpt", status: "untested", lastTested: null, responseTime: null, description: "" },
    { id: "deepseek/deepseek-r1", name: "DEEPSEEK/DEEPSEEK-R1", provider: "vsegpt", status: "untested", lastTested: null, responseTime: null, description: "" },
    { id: "deepseek/deepseek-chat-3.1-alt", name: "DEEPSEEK/DEEPSEEK-CHAT-3.1-ALT", provider: "vsegpt", status: "untested", lastTested: null, responseTime: null, description: "" },
    { id: "minimax/minimax-01", name: "MINIMAX/MINIMAX-01", provider: "vsegpt", status: "untested", lastTested: null, responseTime: null, description: "" },
    { id: "thedrummer/rocinante-12b", name: "THEDRUMMER/ROCINANTE-12B", provider: "vsegpt", status: "untested", lastTested: null, responseTime: null, description: "" },
    { id: "OMF-R-IlyaGusev/saiga_gemma3_12b", name: "OMF-R-ILYAGUSEV/SAIGA_GEMMA3_12B", provider: "vsegpt", status: "untested", lastTested: null, responseTime: null, description: "" },
    { id: "inception/mercury", name: "INCEPTION/MERCURY", provider: "vsegpt", status: "untested", lastTested: null, responseTime: null, description: "" },
    { id: "x-ai/grok-4-fast-2m", name: "GROK-4 FAST 2M", provider: "vsegpt", status: "untested", lastTested: null, responseTime: null, description: "" }
];