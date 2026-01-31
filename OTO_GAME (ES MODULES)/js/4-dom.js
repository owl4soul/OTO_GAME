// Модуль 4: DOM - Работа с DOM элементами (js/4-dom.js)
'use strict';

// Ссылки на все важные DOM элементы
const dom = {
    // Основной контейнер
    mainContainer: document.getElementById('mainContainer'),
    
    // Секции
    secTop: document.getElementById('secTop'),
    secMid: document.getElementById('secMid'),
    secBot: document.getElementById('secBot'),
    
    // Ресайзеры
    resizerTop: document.getElementById('resizerTop'),
    resizerBot: document.getElementById('resizerBot'),
    resizerBotVert: document.getElementById('resizerBotVert'),
    
    // Контентные области
    sceneArea: document.getElementById('sceneArea'),
    sceneText: document.getElementById('sceneText'),
    middleArea: document.getElementById('middleArea'),
    bottomArea: document.getElementById('bottomArea'),
    
    // Элементы управления низом
    botHeader: document.getElementById('botHeader'),
    collapseIcon: document.getElementById('collapseIcon'),
    
    // Ввод и выбор
    choicesList: document.getElementById('choicesList'),
    freeInputWrapper: document.getElementById('freeInputWrapper'),
    freeInputText: document.getElementById('freeInputText'),
    freeModeToggle: document.getElementById('freeModeToggle'),
    btnSubmit: document.getElementById('btnSubmit'),
    btnClear: document.getElementById('btnClear'),
    
    // HUD Кнопки (ДОБАВЛЕНО)
    btnScaleUp: document.getElementById('btnScaleUp'),
    btnScaleDown: document.getElementById('btnScaleDown'),
    btnFullscreen: document.getElementById('btnFullscreen'),
    btnSettings: document.getElementById('btnSettings'),
    
    // Счетчики
    choicesCounter: document.getElementById('choicesCounter'),
    turnCounter: document.getElementById('turnCounter'),
    modeText: document.getElementById('modeText'),
    modeIcon: document.getElementById('modeIcon'),

    // Статистика (Top Row)
    vals: {
        will: document.getElementById('valWill'),
        stealth: document.getElementById('valStealth'),
        influence: document.getElementById('valInfluence'),
        sanity: document.getElementById('valSanity')
    },
    
    // Внутренние элементы низа
    tube: document.getElementById('progressTube'),
    pers: document.getElementById('personalityDisplay'),
    degrees: document.getElementById('degreeListUI'),
    hist: document.getElementById('historyList'),
    
    // Внутренние элементы сцены
    reflection: document.getElementById('sceneReflection'),
    updates: document.getElementById('sceneUpdates'),

    // Модальные окна
    modal: document.getElementById('settingsModal'),
    alertModal: document.getElementById('alertModal'),
    overlay: document.getElementById('endGameOverlay'),
    
    // Inputs настроек
    inputs: {
        provider: document.getElementById('providerInput'),
        keyOpenrouter: document.getElementById('apiKeyOpenrouterInput'),
        keyVsegpt: document.getElementById('apiKeyVsegptInput'),
        model: document.getElementById('modelInput')
    },
    
    // Генератор сюжета
    plotGenerator: {
        input: document.getElementById('plotInput'),
        btnGen: document.getElementById('btnGenPlot'),
        btnClear: document.getElementById('btnClearPlot'),
        btnAccept: document.getElementById('btnAcceptPlot')
    },
    
    // Поля ключей
    keyFields: {
        openrouter: document.getElementById('openrouterKeyField'),
        vsegpt: document.getElementById('vsegptKeyField')
    },
    
    // Подложка мыслей героя
    thoughtsOfHeroLayout: document.getElementById('thoughtsOfHeroLayout'),
    thoughtsOfHeroText: document.getElementById('thoughtsOfHeroText')
};

// Валидация наличия всех необходимых элементов
const requiredElements = [
    'sceneText', 'choicesList', 'freeInputText', 'btnSubmit', 'btnClear', 'btnSettings',  'btnScaleUp', 'btnScaleDown', 'btnFullscreen',
    'modal', 'alertModal', 'overlay'
];

for (const key of requiredElements) {
    if (!dom[key]) {
        console.error(`Критическая ошибка: элемент ${key} не найден в DOM`);
    }
}

// Публичный интерфейс модуля
export const DOM = {
    // Получение всех DOM элементов
    getDOM: () => dom,
    
    // Получение конкретного элемента
    getElement: (key) => dom[key],
    
    // Работа с полями ввода
    getInput: (key) => dom.inputs[key],
    getValue: (key) => dom.inputs[key]?.value,
    setValue: (key, value) => {
        if (dom.inputs[key]) dom.inputs[key].value = value;
    },

    // Метод обновления кэша (для динамических элементов)
    refresh: () => {
        dom.plotGenerator.input = document.getElementById('plotInput');
        dom.plotGenerator.btnGen = document.getElementById('btnGenPlot');
        dom.plotGenerator.btnClear = document.getElementById('btnClearPlot');
        dom.plotGenerator.btnAccept = document.getElementById('btnAcceptPlot');
    }
};