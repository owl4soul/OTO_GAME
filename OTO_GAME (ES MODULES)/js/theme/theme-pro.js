'use strict';

import { DEFAULT_THEME_CONFIG, PRESET_THEMES, FONT_LIBRARY, ICON_MAPPINGS } from './theme-config-pro.js';

class ThemeManagerPro {
    constructor() {
        this.currentTheme = null;
        this.editingTheme = null;
        this.isEditing = false;
        this.styleElement = null;
        this.STORAGE_KEY = 'rpg_theme_pro_v3_final';
        
        this.initialize();
    }

    initialize() {
        console.log('🎨 Инициализация Theme Manager Pro...');
        
        // 1. Создаем стиль для темы
        this.styleElement = document.createElement('style');
        this.styleElement.id = 'theme-pro-dynamic-styles';
        document.head.appendChild(this.styleElement);
        
        // 2. Загружаем тему или берем дефолтную
        const savedTheme = this._loadTheme();
        this.currentTheme = savedTheme || this._deepClone(DEFAULT_THEME_CONFIG);
        
        // 3. Гарантируем целостность структуры
        if (!this.currentTheme.icons) this.currentTheme.icons = ICON_MAPPINGS;
        // Если в загруженной теме нет раздела history, добавляем из DEFAULT
        if (!this.currentTheme.history) {
            this.currentTheme.history = this._deepClone(DEFAULT_THEME_CONFIG.history);
        }
        
        // 4. Применяем тему
        this.applyTheme(this.currentTheme);
        console.log('✅ Theme Manager Pro готов');
    }

    // --- УПРАВЛЕНИЕ СОСТОЯНИЕМ ---

    startEditing() {
        this.isEditing = true;
        this.editingTheme = this._deepClone(this.currentTheme);
        console.log('✏️ Режим редактирования');
    }

    endEditing() {
        this.isEditing = false;
        this.editingTheme = null;
        console.log('💾 Редактирование завершено');
    }

    updateSetting(path, value) {
        if (!this.isEditing) return;
        
        let current = this.editingTheme;
        for (let i = 0; i < path.length - 1; i++) {
            if (!current[path[i]]) current[path[i]] = {};
            current = current[path[i]];
        }
        current[path[path.length - 1]] = value;
        
        // Перерисовываем CSS на лету
        this._generateAndApplyCSS(this.editingTheme);
    }

    setEditingTheme(theme) {
        if (!this.isEditing) return;
        this.editingTheme = this._deepClone(theme);
        this._generateAndApplyCSS(this.editingTheme);
    }

    saveChanges() {
        if (!this.isEditing) return;
        this.currentTheme = this._deepClone(this.editingTheme);
        this._saveTheme(this.currentTheme);
        this.endEditing();
    }

    cancelChanges() {
        if (!this.isEditing) return;
        this.editingTheme = null;
        this._generateAndApplyCSS(this.currentTheme);
        this.endEditing();
    }

    reset() {
        this.currentTheme = this._deepClone(DEFAULT_THEME_CONFIG);
        this.applyTheme(this.currentTheme);
        console.log('🔄 Сброс к Default Pro');
    }

    // --- ИМПОРТ / ЭКСПОРТ / ПРЕСЕТЫ ---

    loadPreset(key) {
        if (PRESET_THEMES[key]) {
            this.currentTheme = this._deepClone(PRESET_THEMES[key].config);
            if (!this.currentTheme.icons) this.currentTheme.icons = ICON_MAPPINGS;
            if (!this.currentTheme.history) {
                this.currentTheme.history = this._deepClone(DEFAULT_THEME_CONFIG.history);
            }
            this.applyTheme(this.currentTheme);
            console.log(`📦 Загружен пресет: ${key}`);
        }
    }

    getPresets() {
        return Object.entries(PRESET_THEMES).map(([key, val]) => ({
            key,
            name: val.name,
            description: val.description,
            isCurrent: this.currentTheme.name === val.config.name
        }));
    }

    exportTheme() {
        return JSON.stringify(this.currentTheme, null, 2);
    }

    importTheme(json) {
        try {
            const theme = JSON.parse(json);
            if (!theme.global || !theme.scene) throw new Error("Invalid theme format");
            
            this.currentTheme = theme;
            if (!this.currentTheme.history) {
                this.currentTheme.history = this._deepClone(DEFAULT_THEME_CONFIG.history);
            }
            this.applyTheme(theme);
            return true;
        } catch (e) {
            console.error('Import failed:', e);
            return false;
        }
    }

    getCurrentTheme() {
        return this.isEditing ? this.editingTheme : this.currentTheme;
    }

    applyTheme(theme) {
        this._generateAndApplyCSS(theme);
        this._saveTheme(theme);
    }

    // --- ГЕНЕРАТОР CSS (ПОЛНАЯ ВЕРСИЯ) ---

    _generateAndApplyCSS(theme) {
        const css = this._generateCSS(theme);
        this.styleElement.textContent = css;
    }

    _generateCSS(theme) {
        let css = '/* === THEME PRO GENERATED CSS === */\n\n';
        
        // 1. Импорт шрифтов
        const usedFonts = new Set();
        const traverseForFonts = (obj) => {
            for (const key in obj) {
                if (key === 'fontFamily' && typeof obj[key] === 'string') {
                    const match = obj[key].match(/['"]([^'"]+)['"]/);
                    if (match) usedFonts.add(match[1]);
                } else if (typeof obj[key] === 'object' && obj[key] !== null) {
                    traverseForFonts(obj[key]);
                }
            }
        };
        traverseForFonts(theme);
        
        usedFonts.forEach(fontName => {
            if (FONT_LIBRARY[fontName]) {
                css += `@import url('${FONT_LIBRARY[fontName]}');\n`;
            }
        });
        css += '\n';

        // 2. Глобальные настройки
        const g = theme.global || {
            icons: { set: 'fa', emojiFilter: 'none' },
            layout: {
                scrollbarColor: "#d4af37",
                scrollbarBg: "#1a1a1a",
                selectionColor: "#d4af37",
                selectionBg: "rgba(212, 175, 55, 0.2)"
            }
        };
        css += `/* === GLOBAL === */\n`;
        css += `
::selection {
    background: ${g.layout.selectionBg} !important;
    color: ${g.layout.selectionColor} !important;
}

::-webkit-scrollbar {
    width: 8px !important;
    height: 8px !important;
}

::-webkit-scrollbar-track {
    background: ${g.layout.scrollbarBg} !important;
}

::-webkit-scrollbar-thumb {
    background: ${g.layout.scrollbarColor} !important;
    border-radius: 4px !important;
}

body {
    scrollbar-color: ${g.layout.scrollbarColor} ${g.layout.scrollbarBg} !important;
}
\n`;

        // 3. Иконки
        css += `/* === ICONS === */\n`;
        if (g.icons.set === 'emoji') {
            const filter = g.icons.emojiFilter || 'none';
            css += `
.fas::before, .fa::before, .far::before {
    font-family: "Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif !important;
    font-weight: normal !important;
    font-style: normal !important;
    filter: ${filter} !important;
    display: inline-block !important;
    width: auto !important;
}
`;
            const mappings = theme.icons || ICON_MAPPINGS;
            Object.entries(mappings).forEach(([cls, emoji]) => {
                css += `.${cls}::before { content: "${emoji}" !important; }\n`;
            });
        }
        css += '\n';

        // 4. Сцена
        const s = theme.scene || DEFAULT_THEME_CONFIG.scene;
        css += `/* === SCENE === */\n`;
        css += `
#sceneArea {
    padding: ${s.container.padding} !important;
    background: ${s.container.background} !important;
}

#sceneText,
.scene-text-block {
    background: ${s.textBlock.background} !important;
    border: ${s.textBlock.border} !important;
    border-radius: ${s.textBlock.borderRadius} !important;
    padding: ${s.textBlock.padding} !important;
    color: ${s.textBlock.color} !important;
    font-family: ${s.textBlock.fontFamily} !important;
    font-size: ${s.textBlock.fontSize} !important;
    box-shadow: ${s.textBlock.boxShadow} !important;
}

.ai-memory-block {
    background: ${s.aiMemory.background} !important;
    border-left: ${s.aiMemory.borderLeft} !important;
    border-radius: ${s.aiMemory.borderRadius} !important;
    padding: ${s.aiMemory.padding} !important;
}

.ai-memory-block div:first-child {
    color: ${s.aiMemory.titleColor} !important;
}

.ai-memory-block .memory-item {
    color: ${s.aiMemory.contentColor} !important;
}

.ai-memory-block .memory-key {
    color: ${s.aiMemory.keyColor} !important;
}

.ai-memory-block .memory-value {
    color: ${s.aiMemory.valueColor} !important;
}

.choice-btn {
    background: ${s.choices.btn.background} !important;
    border: ${s.choices.btn.border} !important;
    border-radius: ${s.choices.btn.borderRadius} !important;
    color: ${s.choices.btn.color} !important;
    padding: ${s.choices.btn.padding} !important;
    font-family: ${s.choices.btn.fontFamily} !important;
    font-size: ${s.choices.btn.fontSize} !important;
}

.choice-btn:hover {
    background: ${s.choices.btn.hoverBg} !important;
    border-color: ${s.choices.btn.hoverBorder} !important;
}

.choice-btn.selected {
    background: ${s.choices.btn.selectedBg} !important;
    border-color: ${s.choices.btn.selectedBorder} !important;
    color: ${s.choices.btn.selectedColor} !important;
}
\n`;

        // 5. Game Items
        css += `/* === GAME ITEMS === */\n`;
        const containerMap = {
            personality: 'personalityBlockContainer',
            typology: 'typologyContainer',
            organization: 'organizationsContainer',
            relations: 'relationsContainer',
            skill: 'skillsContainer',
            stat_buffs: 'statBuffsContainer',
            bless: 'blessingsContainer',
            curse: 'cursesContainer',
            buff_debuff: 'buffsDebuffsContainer',
            inventory: 'inventoryContainer',
            details: 'detailsContainer'
        };

        const gameItems = theme.gameItems || DEFAULT_THEME_CONFIG.gameItems;
        Object.entries(gameItems).forEach(([type, config]) => {
            const id = containerMap[type];
            if (id && config) {
                css += `
/* ${type.toUpperCase()} */
#${id} {
    background: ${config.container.background} !important;
    border: ${config.container.border} !important;
    border-radius: ${config.container.borderRadius} !important;
    padding: ${config.container.padding} !important;
    margin-bottom: ${config.container.marginBottom} !important;
}

#${id} .section-header {
    color: ${config.header.color} !important;
    border-bottom: ${config.header.borderBottom} !important;
    font-family: ${config.header.fontFamily} !important;
    font-size: ${config.header.fontSize} !important;
    padding: ${config.header.padding} !important;
}

#${id} .game-item-badge {
    background: ${config.badge.background} !important;
    border: ${config.badge.border} !important;
    border-left: ${config.badge.borderLeft} !important;
    border-radius: ${config.badge.borderRadius} !important;
    color: ${config.badge.color} !important;
    padding: ${config.badge.padding} !important;
    font-family: ${config.badge.fontFamily} !important;
    font-size: ${config.badge.fontSize} !important;
}

#${id} .game-item-badge:hover {
    transform: ${config.badge.hoverTransform} !important;
    box-shadow: ${config.badge.hoverShadow} !important;
}
`;
            }
        });

        // 6. Turn Updates
        const tu = theme.turnUpdates || DEFAULT_THEME_CONFIG.turnUpdates;
        css += `\n/* === TURN UPDATES === */\n`;
        css += `
#turnUpdatesContainer > div,
.turn-updates-container {
    background: ${tu.container.background} !important;
    border: ${tu.container.border} !important;
    border-radius: ${tu.container.borderRadius} !important;
    padding: ${tu.container.padding} !important;
    margin-bottom: ${tu.container.marginBottom} !important;
}

#turnUpdatesContainer > div > div:first-child {
    color: ${tu.header.color} !important;
    border-bottom: ${tu.header.borderBottom} !important;
    font-family: ${tu.header.fontFamily} !important;
    font-size: ${tu.header.fontSize} !important;
    text-transform: ${tu.header.textTransform} !important;
}

#turnUpdatesContainer > div > div:last-child {
    color: ${tu.content.color} !important;
    font-size: ${tu.content.fontSize} !important;
    font-family: ${tu.content.fontFamily} !important;
}
\n`;

        // 7. ИСТОРИЯ - с защитой от undefined
        css += this._generateHistoryCSS(theme.history);

        return css;
    }

    _generateHistoryCSS(h) {
        // Если истории нет, используем конфиг по умолчанию
        const historyConfig = h || DEFAULT_THEME_CONFIG.history;
        if (!historyConfig) return ''; // на всякий случай

        let css = '\n/* === HISTORY (CLASS-BASED) === */\n';

        // Контейнер истории
        css += `
#history {
    background: ${historyConfig.container?.background || '#050505'} !important;
    padding: ${historyConfig.container?.padding || '0'} !important;
    height: ${historyConfig.container?.height || '100%'} !important;
    overflow-y: ${historyConfig.container?.overflowY || 'auto'} !important;
    overflow-x: ${historyConfig.container?.overflowX || 'hidden'} !important;
}
`;

        // Шапка
        const header = historyConfig.header || {};
        css += `
.history-header {
    position: ${header.position || 'sticky'} !important;
    top: ${header.top || '0'} !important;
    z-index: ${header.zIndex || '10'} !important;
    background: ${header.background || '#111111'} !important;
    padding: ${header.padding || '3px 6px'} !important;
    border-bottom: ${header.borderBottom || '1px solid #e84118'} !important;
    margin-bottom: ${header.marginBottom || '2px'} !important;
    display: ${header.display || 'flex'} !important;
    justify-content: ${header.justifyContent || 'space-between'} !important;
    align-items: ${header.alignItems || 'center'} !important;
    font-family: ${header.fontFamily || "'Exo 2', sans-serif"} !important;
    font-size: ${header.fontSize || '0.75em'} !important;
    color: ${header.color || '#dddddd'} !important;
}
`;

        // Кнопки шапки
        const headerButtons = historyConfig.headerButtons || {
            background: "rgba(76,209,55,0.1)",
            border: "1px solid #4cd137",
            color: "#4cd137",
            padding: "1px 3px",
            borderRadius: "2px",
            cursor: "pointer",
            fontSize: "0.6em",
            minWidth: "20px",
            transition: "all 0.2s ease",
            hover: {
                background: "rgba(76,209,55,0.2)",
                borderColor: "#4cd137",
                color: "#4cd137"
            }
        };
        css += `
.history-header-btn {
    background: ${headerButtons.background} !important;
    border: ${headerButtons.border} !important;
    color: ${headerButtons.color} !important;
    padding: ${headerButtons.padding} !important;
    border-radius: ${headerButtons.borderRadius} !important;
    cursor: ${headerButtons.cursor} !important;
    font-size: ${headerButtons.fontSize} !important;
    min-width: ${headerButtons.minWidth} !important;
    transition: ${headerButtons.transition} !important;
}

.history-header-btn:hover {
    background: ${headerButtons.hover?.background || 'rgba(76,209,55,0.2)'} !important;
    border-color: ${headerButtons.hover?.borderColor || '#4cd137'} !important;
    color: ${headerButtons.hover?.color || '#4cd137'} !important;
}
`;

        // Контейнер ходов
        const turnsContainer = historyConfig.turnsContainer || {
            padding: "2px 0",
            display: "flex",
            flexDirection: "column",
            gap: "1px"
        };
        css += `
#historyTurnsContainer {
    padding: ${turnsContainer.padding} !important;
    display: ${turnsContainer.display} !important;
    flex-direction: ${turnsContainer.flexDirection} !important;
    gap: ${turnsContainer.gap} !important;
}
`;

        // Элемент хода (details)
        const turn = historyConfig.turn || {
            background: "#0a0a0a",
            border: "0.5px solid rgba(255,255,255,0.05)",
            borderLeftWidth: "2px",
            margin: "0 2px 1px 2px",
            fontSize: "0.7em",
            overflow: "hidden",
            borderRadius: "2px"
        };
        const accentColors = historyConfig.accentColors || {
            success: "#4cd137",
            failure: "#e84118",
            mixed: "#fbc531",
            neutral: "#555"
        };
        css += `
.history-turn {
    background: ${turn.background} !important;
    border: ${turn.border} !important;
    border-left-width: ${turn.borderLeftWidth} !important;
    margin: ${turn.margin} !important;
    font-size: ${turn.fontSize} !important;
    overflow: ${turn.overflow} !important;
    border-radius: ${turn.borderRadius} !important;
    border-left-color: var(--turn-accent-color, ${accentColors.neutral}) !important;
}
`;

        // Заголовок хода (summary)
        const turnSummary = historyConfig.turnSummary || {
            padding: "2px 4px",
            cursor: "pointer",
            userSelect: "none",
            listStyle: "none",
            background: "rgba(0,0,0,0.3)",
            lineHeight: "1.2",
            fontFamily: "'Nunito Sans', sans-serif",
            fontSize: "0.8em",
            numberColor: "#e84118",
            summaryColor: "#aaa",
            actionCountColor: "#666",
            timestampColor: "#555",
            chevronColor: "#e84118"
        };
        css += `
.history-turn summary {
    padding: ${turnSummary.padding} !important;
    cursor: ${turnSummary.cursor} !important;
    user-select: ${turnSummary.userSelect} !important;
    list-style: ${turnSummary.listStyle} !important;
    background: ${turnSummary.background} !important;
    line-height: ${turnSummary.lineHeight} !important;
    font-family: ${turnSummary.fontFamily} !important;
    font-size: ${turnSummary.fontSize} !important;
}

.turn-summary-number {
    color: var(--turn-accent-color, ${turnSummary.numberColor}) !important;
    font-weight: bold;
    font-size: 0.8em;
}

.turn-summary-text {
    color: ${turnSummary.summaryColor} !important;
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.turn-summary-count {
    color: ${turnSummary.actionCountColor} !important;
    margin-left: 4px;
    white-space: nowrap;
}

.turn-summary-time {
    color: ${turnSummary.timestampColor} !important;
    text-align: right;
    font-size: 0.6em;
    margin-top: 1px;
}

.turn-chevron {
    color: var(--turn-accent-color, ${turnSummary.chevronColor}) !important;
    transition: transform 0.2s;
    font-size: 0.5em;
    width: 6px;
}
`;

        // Содержимое хода
        const turnContent = historyConfig.turnContent || {
            padding: "3px",
            borderTop: "0.5px solid rgba(255,255,255,0.05)",
            background: "rgba(0,0,0,0.2)",
            fontSize: "0.75em",
            whiteSpace: "normal",
            wordWrap: "break-word",
            overflowWrap: "break-word",
            fontFamily: "'Nunito Sans', sans-serif",
            color: "#cccccc"
        };
        css += `
.history-turn-content {
    padding: ${turnContent.padding} !important;
    border-top: ${turnContent.borderTop} !important;
    background: ${turnContent.background} !important;
    font-size: ${turnContent.fontSize} !important;
    white-space: ${turnContent.whiteSpace} !important;
    word-wrap: ${turnContent.wordWrap} !important;
    overflow-wrap: ${turnContent.overflowWrap} !important;
    font-family: ${turnContent.fontFamily} !important;
    color: ${turnContent.color} !important;
}
`;

        // Общий блок содержимого
        const contentBlock = historyConfig.contentBlock || {
            padding: "2px",
            marginBottom: "2px",
            borderLeftWidth: "1px",
            borderLeftStyle: "solid",
            borderRadius: "0",
            titleFontSize: "0.7em",
            titleFontFamily: "'Exo 2', sans-serif",
            titleMarginBottom: "1px",
            contentFontSize: "0.75em",
            contentFontFamily: "'Nunito Sans', sans-serif",
            contentLineHeight: "1.2"
        };
        css += `
.history-block {
    padding: ${contentBlock.padding} !important;
    margin-bottom: ${contentBlock.marginBottom} !important;
    border-left-width: ${contentBlock.borderLeftWidth} !important;
    border-left-style: ${contentBlock.borderLeftStyle} !important;
    border-radius: ${contentBlock.borderRadius} !important;
}

.history-block-title {
    font-size: ${contentBlock.titleFontSize} !important;
    font-family: ${contentBlock.titleFontFamily} !important;
    margin-bottom: ${contentBlock.titleMarginBottom} !important;
    display: flex;
    align-items: center;
    gap: 4px;
}

.history-block-content {
    font-size: ${contentBlock.contentFontSize} !important;
    font-family: ${contentBlock.contentFontFamily} !important;
    line-height: ${contentBlock.contentLineHeight} !important;
}
.history-block-content.italic {
    font-style: italic;
}
`;

        // Специфические блоки
        const blocks = historyConfig.contentBlocks || DEFAULT_THEME_CONFIG.history.contentBlocks;
        css += `
/* Заметки дизайнера */
.history-block-design-notes {
    background: ${blocks.designNotes?.background || 'rgba(102,102,102,0.03)'} !important;
    border-left-color: ${blocks.designNotes?.borderLeftColor || '#666'} !important;
}
.history-block-design-notes .history-block-title {
    color: ${blocks.designNotes?.titleColor || '#666'} !important;
}
.history-block-design-notes .history-block-content {
    color: ${blocks.designNotes?.contentColor || '#ccc'} !important;
}
${blocks.designNotes?.italic ? '.history-block-design-notes .history-block-content { font-style: italic; }' : ''}

/* Память ГМ */
.history-block-ai-memory {
    background: ${blocks.aiMemory?.background || 'rgba(251,197,49,0.03)'} !important;
    border-left-color: ${blocks.aiMemory?.borderLeftColor || '#fbc531'} !important;
}
.history-block-ai-memory .history-block-title {
    color: ${blocks.aiMemory?.titleColor || '#fbc531'} !important;
}
.memory-key {
    color: ${blocks.aiMemory?.keyColor || '#fbc531'} !important;
}
.memory-value {
    color: ${blocks.aiMemory?.valueColor || '#ccc'} !important;
}
.memory-value.boolean-true {
    color: ${blocks.aiMemory?.booleanTrueColor || '#4cd137'} !important;
}
.memory-value.boolean-false {
    color: ${blocks.aiMemory?.booleanFalseColor || '#e84118'} !important;
}
.memory-value.number {
    color: ${blocks.aiMemory?.numberColor || '#fbc531'} !important;
}
.memory-value.array {
    color: ${blocks.aiMemory?.arrayColor || '#9c88ff'} !important;
}
.memory-value.string {
    color: ${blocks.aiMemory?.stringColor || '#ccc'} !important;
}
.memory-value.object {
    color: ${blocks.aiMemory?.objectColor || '#48dbfb'} !important;
}

/* Сводка */
.history-block-summary {
    background: ${blocks.summary?.background || 'rgba(72,219,251,0.03)'} !important;
    border-left-color: ${blocks.summary?.borderLeftColor || '#48dbfb'} !important;
}
.history-block-summary .history-block-title {
    color: ${blocks.summary?.titleColor || '#48dbfb'} !important;
}
.history-block-summary .history-block-content {
    color: ${blocks.summary?.contentColor || '#ccc'} !important;
}

/* Текст сцены */
.history-block-scene {
    background: ${blocks.sceneText?.background || 'rgba(232,65,24,0.03)'} !important;
    border-left-color: ${blocks.sceneText?.borderLeftColor || '#e84118'} !important;
}
.history-block-scene .history-block-title {
    color: ${blocks.sceneText?.titleColor || '#e84118'} !important;
}
.history-block-scene .history-block-content {
    color: ${blocks.sceneText?.contentColor || '#ccc'} !important;
}

/* Рефлексия */
.history-block-reflection {
    background: ${blocks.reflection?.background || 'rgba(72,219,251,0.03)'} !important;
    border-left-color: ${blocks.reflection?.borderLeftColor || '#48dbfb'} !important;
}
.history-block-reflection .history-block-title {
    color: ${blocks.reflection?.titleColor || '#48dbfb'} !important;
}
.history-block-reflection .history-block-content {
    color: ${blocks.reflection?.contentColor || '#ccc'} !important;
}
${blocks.reflection?.italic ? '.history-block-reflection .history-block-content { font-style: italic; }' : ''}

/* Личность */
.history-block-personality {
    background: ${blocks.personality?.background || 'rgba(76,209,55,0.03)'} !important;
    border-left-color: ${blocks.personality?.borderLeftColor || '#4cd137'} !important;
}
.history-block-personality .history-block-title {
    color: ${blocks.personality?.titleColor || '#4cd137'} !important;
}
.history-block-personality .history-block-content {
    color: ${blocks.personality?.contentColor || '#ccc'} !important;
}

/* Типология */
.history-block-typology {
    background: ${blocks.typology?.background || 'rgba(156,136,255,0.03)'} !important;
    border-left-color: ${blocks.typology?.borderLeftColor || '#9c88ff'} !important;
}
.history-block-typology .history-block-title {
    color: ${blocks.typology?.titleColor || '#9c88ff'} !important;
}
.history-block-typology .history-block-content {
    color: ${blocks.typology?.contentColor || '#ccc'} !important;
}

/* Действия */
.history-block-actions {
    background: ${blocks.actions?.background || 'rgba(156,136,255,0.03)'} !important;
    border-left-color: ${blocks.actions?.borderLeftColor || '#9c88ff'} !important;
}
.history-block-actions .history-block-title {
    color: ${blocks.actions?.titleColor || '#9c88ff'} !important;
}
.action-item {
    padding: 1px 2px;
    border-radius: 1px;
    font-size: ${blocks.actions?.fontSize || '0.75em'} !important;
}
.action-success {
    background: ${blocks.actions?.successBg || 'rgba(76,209,55,0.1)'} !important;
    border-left: 2px solid ${blocks.actions?.successColor || '#4cd137'} !important;
    color: ${blocks.actions?.successColor || '#4cd137'} !important;
}
.action-partial {
    background: ${blocks.actions?.partialBg || 'rgba(251,197,49,0.1)'} !important;
    border-left: 2px solid ${blocks.actions?.partialColor || '#fbc531'} !important;
    color: ${blocks.actions?.partialColor || '#fbc531'} !important;
}
.action-failure {
    background: ${blocks.actions?.failureBg || 'rgba(232,65,24,0.1)'} !important;
    border-left: 2px solid ${blocks.actions?.failureColor || '#e84118'} !important;
    color: ${blocks.actions?.failureColor || '#e84118'} !important;
}

/* Изменения */
.history-block-changes {
    background: ${blocks.changes?.background || 'rgba(76,209,55,0.03)'} !important;
    border-left-color: ${blocks.changes?.borderLeftColor || '#4cd137'} !important;
}
.history-block-changes .history-block-title {
    color: ${blocks.changes?.titleColor || '#4cd137'} !important;
}
.history-block-changes .history-block-content {
    color: ${blocks.changes?.contentColor || '#ccc'} !important;
}
`;

        // Акцентные цвета (CSS-переменные)
        css += `
:root {
    --history-accent-success: ${accentColors.success};
    --history-accent-failure: ${accentColors.failure};
    --history-accent-mixed: ${accentColors.mixed};
    --history-accent-neutral: ${accentColors.neutral};
}
`;

        // Индикатор футера
        const footerIndicator = historyConfig.footerIndicator || {
            background: "rgba(232,65,24,0.05)",
            borderLeft: "1px solid #e84118",
            borderRadius: "1px",
            fontSize: "0.65em",
            color: "#888",
            textAlign: "center",
            padding: "2px 4px",
            margin: "1px 2px"
        };
        css += `
.history-footer-indicator {
    background: ${footerIndicator.background} !important;
    border-left: ${footerIndicator.borderLeft} !important;
    border-radius: ${footerIndicator.borderRadius} !important;
    font-size: ${footerIndicator.fontSize} !important;
    color: ${footerIndicator.color} !important;
    text-align: ${footerIndicator.textAlign} !important;
    padding: ${footerIndicator.padding} !important;
    margin: ${footerIndicator.margin} !important;
}
`;

        // Пустое состояние
        const emptyState = historyConfig.emptyState || {
            padding: "10px",
            textAlign: "center",
            color: "#555",
            fontSize: "0.75em",
            fontStyle: "italic",
            iconSize: "1.5em",
            iconOpacity: "0.3"
        };
        css += `
.history-empty {
    padding: ${emptyState.padding} !important;
    text-align: ${emptyState.textAlign} !important;
    color: ${emptyState.color} !important;
    font-size: ${emptyState.fontSize} !important;
    font-style: ${emptyState.fontStyle} !important;
}
.history-empty i {
    font-size: ${emptyState.iconSize} !important;
    opacity: ${emptyState.iconOpacity} !important;
    display: block;
    margin-bottom: 5px;
}
`;

        // Стиль для параграфов
        css += `
.text-paragraph {
    margin: 0;
    padding: 0;
    white-space: pre-wrap;
    word-wrap: break-word;
    overflow-wrap: break-word;
}
.text-paragraph + .text-paragraph {
    margin-top: 2px;
}
`;

        return css;
    }

    _saveTheme(theme) {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(theme));
    }

    _loadTheme() {
        try {
            return JSON.parse(localStorage.getItem(this.STORAGE_KEY));
        } catch(e) { return null; }
    }

    _deepClone(obj) {
        return JSON.parse(JSON.stringify(obj));
    }
}

export const themeManagerPro = new ThemeManagerPro();