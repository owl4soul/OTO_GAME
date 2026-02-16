// js/theme-pro.js
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
        const g = theme.global;
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

        // 4. Сцена - ПОЛНОСТЬЮ
        const s = theme.scene;
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

        // 5. Game Items - ПОЛНОСТЬЮ ДЛЯ КАЖДОГО ТИПА
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

        Object.entries(theme.gameItems).forEach(([type, config]) => {
            const id = containerMap[type];
            if (id) {
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

        // 6. Turn Updates - ПОЛНОСТЬЮ
        const tu = theme.turnUpdates;
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

        // 7. History - ПОЛНОСТЬЮ
        const h = theme.history;
        css += `/* === HISTORY === */\n`;
        css += `
#history {
    background: ${h.container.background} !important;
    padding: ${h.container.padding} !important;
}

#history > div:first-child {
    background: ${h.header.background} !important;
    border-bottom: ${h.header.borderBottom} !important;
    color: ${h.header.color} !important;
    font-family: ${h.header.fontFamily} !important;
    font-size: ${h.header.fontSize} !important;
}

.history-turn {
    background: ${h.turn.background} !important;
    border: ${h.turn.border} !important;
    border-left: ${h.turn.borderLeft} !important;
    border-radius: ${h.turn.borderRadius} !important;
    margin-bottom: ${h.turn.marginBottom} !important;
}

.history-turn summary {
    background: ${h.turnSummary.background} !important;
    color: ${h.turnSummary.color} !important;
    font-family: ${h.turnSummary.fontFamily} !important;
    font-size: ${h.turnSummary.fontSize} !important;
}

.history-turn > div {
    background: ${h.turnContent.background} !important;
    color: ${h.turnContent.color} !important;
    font-size: ${h.turnContent.fontSize} !important;
    font-family: ${h.turnContent.fontFamily} !important;
}
\n`;

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