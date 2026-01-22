// Модуль 1: CONFIG - Конфигурация и константы (1-config.js)
'use strict';

// Импортируем библиотеку текстов из соседнего файла
import { PROMPTS } from './prompts.js';

// Основные конфигурационные константы
export const CONFIG = {
    // Игровые настройки
    maxChoices: 3, // Максимальное количество выбираемых вариантов
    historyContext: 5, // Количество последних ходов для контекста (общее количество)
    activeContextTurns: 3, // ОПТИМИЗАЦИЯ: Сколько ПОЛНЫХ ходов слать в промпт (остальное в сводке)
    
    maxRetries: 3, // Максимальное количество сетевых повторов (Failed to fetch)
    autoRepairAttempts: 2, // AUTO-REPAIR: Сколько раз просить ИИ исправить битый JSON
    
    retryDelayMs: 1000, // Задержка между повторными попытками (мс)
    requestTimeout: 90000, // Таймаут запроса к API (90 секунд)
    stateVersion: '2.2', // Версия 2.2
    
    // Шаги масштабирования
    scaleSteps: [0.70, 0.75, 0.80, 0.85, 0.90, 0.95, 1.00, 1.05, 1.10, 1.15, 1.20, 1.25, 1.30],
    defaultScaleIndex: 6, // Индекс шага по умолчанию (100%)
    
    // Степени посвящения
    degrees: [
        { lvl: 0, name: "0° — Минерваль", threshold: 0 },
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
        will: 50, // Воля
        stealth: 50, // Скрытность
        influence: 50, // Влияние
        sanity: 50 // Разум
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
    
    actionResultTiers: {
    success: 6, // d10 ≥ 6 = успех
    partial: 3, // d10 ≥ 3 = частичный успех
    failure: 0 // d10 < 3 = провал
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
    // === ПОДКЛЮЧЕНИЕ ПРОМПТОВ ===
    // Мы берем их из PROMPTS, чтобы не загромождать этот файл.
    // СТРУКТУРА ОСТАЕТСЯ ПРЕЖНЕЙ, чтобы код APP.js не сломался.
    // =========================================================================
    
    // 1. Основной промт с системными инструкциями
    prompts: PROMPTS.prompts,
    
    
// Добавьте после строки: prompts: PROMPTS.prompts,


prompts: {
    ...PROMPTS.prompts,
    userHeaders: {
        ...PROMPTS.prompts.userHeaders,
        inventory_all: "[ИНВЕНТАРЬ]:",
        relations_all: "[ОТНОШЕНИЯ]:",
        action_results: "[РЕЗУЛЬТАТЫ ДЕЙСТВИЙ]:",
        skills: "[НАВЫКИ]:"
    }
},
    
    // 2. Промт для запроса сюжета
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
    { id: "openai/gpt-5-nano", name: "OPENAI/GPT-5-NANO", provider: "vsegpt", status: "untested", lastTested: null, responseTime: null, description: "" },
    { id: "openai/gpt-5-codex", name: "OPENAI/GPT-5-CODEX", provider: "vsegpt", status: "untested", lastTested: null, responseTime: null, description: "" },
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

// Начальная сцена игры
export const initialScene = {
    text: `Холодный дождь безжалостно хлещет по стёклам конспиративной квартиры на окраине Москвы, с недавних пор так иронично воплотившей имя своих обитателей — Московской Ложи Ордена О.Т.О «Убежище Пана», — став укрытием для проведения тайных орденских встреч и сокровенным Храмом для Ритуалов и Посвящений.
    Крупные капли собираются где-то сверху, по очереди наливаясь кровью тонущего в них закатного неба, чтоб наконец сорваться вслед друг за другом и вдребезги разбиться о подоконник, отдаваясь гулким эхом, создающим впечатление метронома, безапелляционно отсчитывающего время, оставшееся этому месту и его обитателям.
    Теперь война — не только на фронте, она уже в каждом: в потаённых мыслях перед сном, в отведённом взгляде, в несказанном вслух слове. Воздух удушливо пропитан паранойей, издали будто доносится уже запах гари будущих костров, разжигаемых новыми законами против "инакомыслящих". Оккультные группы вроде нашей по принятому недавно закону "О запрете сатанизма" теперь официально являются «экстремистскими организациями», чья деятельность незаконна и уголовно наказуема. Один неверный шаг теперь отделяет не только организации от прекращения их существования, но и их членов от лишения свободы, а то и жизни.
    В полумраке, пропитаном запахом свеч, благовоний и чего-то ещё — едва уловимого, металлического, — начинается Собрание Ложи Московского отделения Ордена, главного в стране представительства Ordo Templi Orientis (О.Т.О.) и едва ли не последнего бастиона Телемы в этой стране, оставшегося стоять после стихийной волны самороспуска большинства региональных отделений, прокатившейся после принятия российским правительством беспрецедентного закона, невозможного де-юре, но де-факто объявляющего любые оккультные объединения, их организаторов и членов вне закона.
    Около года назад, когда воздух ещё не был таким густым от концентрации страха, вы прошли своё первое Посвящение — в Минервала, Нулевую подстепень — признающую в вас пока не брата, но желанного гостя Ордена, с сохранением за вами права безнаказанно передумать, не связав ещё себя с Братством нерушимыми клятвами Посвящением в Первую Степень. В памяти ярко запечатлелось то утро — когда молодое солнце уже начинало нежно пригревать, лаская своими теплыми лучами, будто шепча: «Я с тобой. Всё будет хорошо», — непритворно веря в свою искреннюю ложь. По сей день живо то пронзительное предвкушение чего-то грандиозного, судьбоносного, поворотного — способного кардинально изменить всё непредсказуемым образом, столкнув лицом к лицу с неизвестным прежде истинным собой, — и чем более бесповоротным казался этот шаг, тем истовее становилась жажда его свершения.
    Орденом, с момента его основания по официальной Хартии ещё на рассвете 00-х, когда понятие «свобода» было не пустым звуком, формально руководит харизматичный лидер с мудрым, проницательным взглядом — Frater Marsyas (Брат Марсий) — официальный Глава Ложи. Но не все знают: настоящая власть и «центр принятия решений» находятся за пределами зримого — в тени его ближайшего круга, чьи хитросплетённые узы связывают их крепче любых клятв, делая семьёй вне кровного родства. Но эти же узы могут стать цепями и петлёй для них самих. Слухи об ФСБ не стихают: мол, дескать, кто-то уже сотрудничает. Может быть, даже здесь, в этом Храме? Блефуют ли, стремясь разобщить, или действительно подобрались так близко?
    Вас, по сути даже не полноценного члена Ордена, лишь желанного гостя, не принесшего клятв пред Братством, допустили до Собраний Ложи вопреки стандартному требованию наличия хотя бы Первой Степени, — «Исключительные обстоятельства требуют исключительных решений», — сказал тогда Марсий с привычной мягкой иронией, отдавая в голосовании решающий голос в Вашу пользу.
    Сегодня ваше первое Собрание. Но вы уже чувствуете это внутри — надрыв. «Твори свою волю, таков да будет весь Закон. Любовь есть закон, любовь в согласии с волей» — слова, которые когда-то звучали истиной хартией всеобщей свобода, теперь отдаются эхом горечи разочарования на фоне доходящих слухов о закрытиях одного за другим почти всех региональных отделений и настроениях немногих оставшихся. Остаться верным Себе, своей Великой Работе, и погибнуть? Или выжить, "переосмыслив" всё, во что верил? Осознанно развеять прежние идеалы и дать прорасти в себе новым идеям и смыслам? Или предпочесть разрушить последний бастион до основания, во имя самой же Телемы? Теперь каждому из нас неизбежно и скоро предстоит ответить себе на главный вопрос и сделать свой выбор: кто он на самом деле и чем готов поступится перед лицом смерти, заглядывающей в глаза тяжелым взглядом "представителя власти", — мысли об этом вызывает тошноту, но мысль о том, что могут сделать с теми, кто дорог — ещё невыносимее. Вы ловите себя на том, что уже прикидываете: кто внутри Братства на что пойдёт, чтобы спасти себя. И ненавидите себя за это. Ещё сильнее, чем боитесь грядущего.
    Когда все Братья и Сёстры собрались, дождь уже стих. Тишина такая плотная, что кажется, будто все слышат биение каждого сердца. Брат Марсий, как всегда избегая прямых столкновений, медленно обводит взглядом круг и спрашивает тихо, почти небрежно: какая тема волнует Братство больше всего сегодня? Его ближайший соратник сидит неподвижно в углу, скрестив руки на груди, опустив голову и углубившись в свои мысли. Лицо сокрыто в тени капюшона, не видно даже женщина там или мужчина, из мрака выделяются только глаза — в них отблеск загнанного зверя, который уже знает, что выхода нет.`,
    
    choices: [{
        "text": "Молча наблюдать за реакциями старших братьев и сестёр, пытаясь понять, кто из них уже сломлен страхом, а кто всё ещё горит внутренним огнём.",
        "requirements": {
            "stats": { "Will": "5" },
            "inventory": ""
        },
        "success_changes": {
            "stats": { "Will": 1 },
            "inventory_add": [],
            "inventory_remove": []
        },
        "failure_changes": {
            "stats": { "Will": -1 },
            "inventory_add": [],
            "inventory_remove": []
        }
    }],
    
    reflection: "Когда повсюду воцаряется сумрак, стирается грань между светом и тьмой."
};