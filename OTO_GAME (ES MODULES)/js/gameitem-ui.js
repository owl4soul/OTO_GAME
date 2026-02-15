// Модуль: GAMEITEM UI MANAGER - Универсальный менеджер отображения различных game_item
'use strict';

import { State } from './3-state.js';
import { Utils } from './2-utils.js';
import { Render } from './5-render.js';

// ============================================================================
// КОНФИГУРАЦИЯ UI GAME_ITEM
// ============================================================================

const GAME_ITEM_UI_CONFIG = {
    // ОБЩИЕ НАСТРОЙКИ ШРИФТОВ
    FONTS: {
        // Основной шрифт в стиле Industrial Gothic
        FAMILY: "'Unbounded', 'Nunito Sans', 'Exo 2', 'Aldrich', 'Courier New', monospace",
        
        // URL для импорта веб-шрифтов
        IMPORT_URLS: [
            "https://fonts.googleapis.com/css2?family=Orbitron:wght@400;500;600;700;800;900&display=swap",
            "https://fonts.googleapis.com/css2?family=Rajdhani:wght@400;500;600;700&display=swap",
            "https://fonts.googleapis.com/css2?family=Exo+2:wght@400;500;600;700&display=swap",
            "https://fonts.googleapis.com/css2?family=Aldrich&display=swap",
            "https://fonts.googleapis.com/css2?family=Nunito+Sans:wght@200..1000&display=swap",
            "https://fonts.googleapis.com/css2?family=Unbounded:wght@200..900&display=swap"
        ],
        TITLE_SIZE: "0.9em",
        TEXT_SIZE: "0.8em",
        BADGE_TEXT_SIZE: "0.8em",
        LINE_HEIGHT: "1.3",
        LETTER_SPACING: "0.3px"
    },

    // НАСТРОЙКИ АНИМАЦИЙ
    ANIMATIONS: {
        TOOLTIP_FADE_IN: "0.2s ease-out",
        TOOLTIP_FADE_OUT: "0.2s ease-out",
        STAT_PULSE: "0.5s ease-in-out",
        FLY_UP: "1s ease-out",
        HOVER_TRANSITION: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)"
    },

    // ОБЩИЕ ЦВЕТА
    COLORS: {
        BACKGROUNDS: {
            DARK: "linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 100%)",
            DARKER: "linear-gradient(135deg, #050505 0%, #0a0a0a 100%)",
            SECTION: "linear-gradient(135deg, rgba(20,20,20,0.7) 0%, rgba(10,10,10,0.9) 100%)"
        },
        TEXT: {
            PRIMARY: "#ffffff",
            SECONDARY: "#cccccc",
            TERTIARY: "#888888",
            WARNING: "#ffaa00",
            ERROR: "#ff3838",
            SUCCESS: "#4cd137"
        }
    },

    // ОБЩИЕ ОТСТУПЫ ДЛЯ СЕКЦИЙ
    LAYOUT: {
        SECTION_MARGIN: "0 0 2px 0",
        SECTION_PADDING: "4px",
        HEADER_PADDING: "2px 0 2px 0",
        HEADER_MARGIN: "0 0 2px 0",
        CONTENT_PADDING: "2px 0",
        BADGE_MARGIN: "0 0 2px 0", // только нижний отступ, чтобы не создавать горизонтальных смещений
        BADGE_PADDING: "2px 2px"
    },

    // ОФОРМЛЕНИЕ ТЕКСТОВЫХ БЛОКОВ (ЛИЧНОСТЬ, ТИПОЛОГИЯ)
    CONTENT: {
        PADDING: "2px",
        PADDING_LEFT: "2px",
        BORDER_LEFT_WIDTH: "2px",
        BORDER_RADIUS: "3px",
        FONT_STYLE: "italic",
        LINE_HEIGHT: "1.05"
    },

    // ОФОРМЛЕНИЕ ЗАГЛУШЕК (EMPTY STATES)
    EMPTY: {
        PADDING: "2px",
        BORDER_STYLE: "1px dashed",
        BORDER_RADIUS: "3px",
        ICON_SIZE: "1.1em",
        ICON_MARGIN_BOTTOM: "3px"
    },

    // НАСТРОЙКИ БЕЙДЖЕЙ
    BADGES: {
        BORDER_RADIUS: "4px",
        BORDER_WIDTH: "1px",
        TRANSITION: "all 0.2s ease",
        HOVER_TRANSFORM: "translateY(-1px)",
        HOVER_SHADOW: "0 2px 2px rgba(0,0,0,0.4)",
        // Внутренние отступы уже в LAYOUT.BADGE_PADDING
    },

    // НАСТРОЙКИ ТУЛТИПОВ
    TOOLTIPS: {
        BACKGROUND: "linear-gradient(135deg, #1a0a0a 0%, #0d0505 100%)",
        BORDER: "1px solid #fbc53160",
        MAX_WIDTH: "300px",
        PADDING: "4px",
        BORDER_RADIUS: "6px",
        BOX_SHADOW: "0 0 25px #fbc53130, 0 6px 12px rgba(0,0,0,0.8)",
        FONT_SIZE: "0.8em",
        LINE_HEIGHT: "1.05"
    },

    // НАСТРОЙКИ МОДАЛЬНЫХ ОКОН
    MODALS: {
        BACKGROUND: "rgba(0,0,0,0.97)",
        CONTENT_BG: "#111111",
        BORDER: "1px solid #d4af37",
        BORDER_RADIUS: "8px",
        BOX_SHADOW: "0 0 30px rgba(212, 175, 55, 0.4)",
        HEADER_BG: "#1a1a1a",
        TITLE_SIZE: "0.9em",
        CLOSE_COLOR: "#d4af37"
    },

    // ИНДИВИДУАЛЬНЫЕ НАСТРОЙКИ ТИПОВ (только уникальные данные)
    TYPES: {
        PERSONALITY: {
            TITLE: "ЛИЧНОСТЬ",
            ICON: "fas fa-user-circle",
            PRIORITY: 100,
            COLORS: {
                TITLE: "#fbc531",
                CONTENT: "#ffd166",
                BORDER: "#4a3a0a",
                BACKGROUND: "linear-gradient(135deg, #2a220a 0%, #1a1805 100%)"
            }
        },
        TYPOLOGY: {
            TITLE: "ТИПОЛОГИЯ",
            ICON: "fas fa-fingerprint",
            PRIORITY: 95,
            COLORS: {
                TITLE: "#4cd137",
                CONTENT: "#7bed9f",
                BORDER: "#2d8b57",
                BACKGROUND: "linear-gradient(135deg, #0a2a0a 0%, #051a05 100%)"
            }
        },
        ORGANIZATION: {
            TITLE: "ОРГАНИЗАЦИИ",
            ICON: "fas fa-users",
            PRIORITY: 85,
            COLORS: {
                TITLE: "#d4af37",
                CONTENT: "#fbc531",
                BORDER: "#8b4513",
                ACCENT: "#ffd700",
                BACKGROUND: "linear-gradient(135deg, #2a1a05 0%, #1a0d02 100%)",
                BADGE_BG: "linear-gradient(135deg, #3a2a05 0%, #2a1a02 100%)"
            }
        },
        RELATIONS: {
            TITLE: "ОТНОШЕНИЯ",
            ICON: "fas fa-users",
            PRIORITY: 90,
            COLORS: {
                TITLE: "#ff9ff3",
                CONTENT: "#ffccf2",
                BORDER: "#6a2a5a",
                BADGE: "#ff6bc9",
                BACKGROUND: "linear-gradient(135deg, #2a0a2a 0%, #1a051a 100%)",
                BADGE_BG: "linear-gradient(135deg, #3a0a3a 0%, #2a052a 100%)"
            }
        },
        SKILLS: {
            TITLE: "НАВЫКИ",
            ICON: "fas fa-scroll",
            PRIORITY: 85,
            COLORS: {
                TITLE: "#6c5ce7",
                CONTENT: "#a29bfe",
                BORDER: "#3a2a6a",
                BADGE: "#8c7ae6",
                BACKGROUND: "linear-gradient(135deg, #0a0a2a 0%, #05051a 100%)",
                BADGE_BG: "linear-gradient(135deg, #1a0a3a 0%, #0a052a 100%)"
            }
        },
        STAT_BUFFS: {
            TITLE: "+/- К СТАТАМ",
            ICON: "fas fa-tachometer-alt",
            PRIORITY: 80,
            COLORS: {
                TITLE: "#3498db",
                CONTENT: "#74b9ff",
                BORDER: "#1a4a7a",
                BUFF: "#4cd137",
                DEBUFF: "#e84118",
                BACKGROUND: "linear-gradient(135deg, #0a1a2a 0%, #051025 100%)",
                BADGE_BG_BUFF: "linear-gradient(135deg, #0a2a1a 0%, #051a10 100%)",
                BADGE_BG_DEBUFF: "linear-gradient(135deg, #2a0a1a 0%, #1a050d 100%)"
            }
        },
        BLESSINGS: {
            TITLE: "БЛАГОСЛОВЕНИЯ",
            ICON: "fas fa-star",
            PRIORITY: 75,
            COLORS: {
                TITLE: "#bdc3c7",
                CONTENT: "#dfe6e9",
                BORDER: "#6a6a6a",
                BADGE: "#f5f6fa",
                BACKGROUND: "linear-gradient(135deg, #2a2a2a 0%, #1a1a1a 100%)",
                BADGE_BG: "linear-gradient(135deg, #3a3a3a 0%, #2a2a2a 100%)"
            }
        },
        CURSES: {
            TITLE: "ПРОКЛЯТИЯ",
            ICON: "fas fa-skull-crossbones",
            PRIORITY: 70,
            COLORS: {
                TITLE: "#ff3838",
                CONTENT: "#ff7675",
                BORDER: "#8a0a0a",
                BADGE: "#ff6b6b",
                BACKGROUND: "linear-gradient(135deg, #2a0000 0%, #1a0000 100%)",
                BADGE_BG: "linear-gradient(135deg, #3a0a0a 0%, #2a0505 100%)"
            }
        },
        BUFFS_DEBUFFS: {
            TITLE: "БАФФЫ/ДЕБАФФЫ",
            ICON: "fas fa-chart-line",
            PRIORITY: 65,
            COLORS: {
                TITLE: "#00cec9",
                CONTENT: "#81ecec",
                BORDER: "#0a4a4a",
                BUFF: "#4cd137",
                DEBUFF: "#e84118",
                BACKGROUND: "linear-gradient(135deg, #0a2a2a 0%, #051a1a 100%)",
                BADGE_BG_BUFF: "linear-gradient(135deg, #0a2a1a 0%, #051a10 100%)",
                BADGE_BG_DEBUFF: "linear-gradient(135deg, #2a0a1a 0%, #1a050d 100%)"
            }
        },
        DETAILS: {
            TITLE: "ДЕТАЛИ",
            ICON: "fas fa-info-circle",
            PRIORITY: 60,
            COLORS: {
                TITLE: "#00cec9",
                CONTENT: "#55efc4",
                BORDER: "#0a4a4a",
                BADGE: "#00b894",
                BACKGROUND: "linear-gradient(135deg, #0a2a2a 0%, #051a1a 100%)",
                BADGE_BG: "linear-gradient(135deg, #0a3a2a 0%, #052a1a 100%)"
            }
        },
        INVENTORY: {
            TITLE: "ИНВЕНТАРЬ",
            ICON: "fas fa-box",
            PRIORITY: 55,
            COLORS: {
                TITLE: "#8b4513",
                CONTENT: "#d2691e",
                BORDER: "#4a2a0a",
                BADGE: "#cd853f",
                BACKGROUND: "linear-gradient(135deg, #2a1a0a 0%, #1a0d05 100%)",
                BADGE_BG: "linear-gradient(135deg, #3a2a0a 0%, #2a1a05 100%)"
            }
        }
    }
};

// ============================================================================
// КЛАСС GAMEITEM UI MANAGER
// ============================================================================

class GameItemUIManager {
    constructor() {
        console.log('🔧 GameItemUIManager: конструктор вызван');
        this.config = GAME_ITEM_UI_CONFIG;
        this.containers = {};
        this.typeConfigs = {};
        this.renderCache = new Map();
        this.lastRenderedTurn = 0;
        this.initialized = false;
        this.currentHierarchyModal = null;
        this.initializeTypeConfigs();
    }

    /**
     * Инициализация конфигурации типов на основе общих настроек
     */
    initializeTypeConfigs() {
        console.log('🔧 GameItemUIManager: инициализация конфигурации типов');
        const config = this.config;
        const fontConfig = config.FONTS;

        this.typeConfigs = {
            personality: {
                containerId: 'personalityBlockContainer',
                title: config.TYPES.PERSONALITY.TITLE,
                icon: config.TYPES.PERSONALITY.ICON,
                colors: config.TYPES.PERSONALITY.COLORS,
                priority: config.TYPES.PERSONALITY.PRIORITY,
                fontFamily: fontConfig.FAMILY,
                renderFunction: () => this.renderPersonality()
            },
            typology: {
                containerId: 'typologyContainer',
                title: config.TYPES.TYPOLOGY.TITLE,
                icon: config.TYPES.TYPOLOGY.ICON,
                colors: config.TYPES.TYPOLOGY.COLORS,
                priority: config.TYPES.TYPOLOGY.PRIORITY,
                fontFamily: fontConfig.FAMILY,
                renderFunction: () => this.renderTypology()
            },
            organization: {
                containerId: 'organizationsContainer',
                title: config.TYPES.ORGANIZATION.TITLE,
                icon: config.TYPES.ORGANIZATION.ICON,
                colors: config.TYPES.ORGANIZATION.COLORS,
                priority: config.TYPES.ORGANIZATION.PRIORITY,
                fontFamily: fontConfig.FAMILY,
                renderFunction: () => this.renderOrganizations()
            },
            relations: {
                containerId: 'relationsContainer',
                title: config.TYPES.RELATIONS.TITLE,
                icon: config.TYPES.RELATIONS.ICON,
                colors: config.TYPES.RELATIONS.COLORS,
                priority: config.TYPES.RELATIONS.PRIORITY,
                fontFamily: fontConfig.FAMILY,
                renderFunction: () => this.renderRelations()
            },
            skill: {
                containerId: 'skillsContainer',
                title: config.TYPES.SKILLS.TITLE,
                icon: config.TYPES.SKILLS.ICON,
                colors: config.TYPES.SKILLS.COLORS,
                priority: config.TYPES.SKILLS.PRIORITY,
                fontFamily: fontConfig.FAMILY,
                renderFunction: () => this.renderSkills()
            },
            stat_buffs: {
                containerId: 'statBuffsContainer',
                title: config.TYPES.STAT_BUFFS.TITLE,
                icon: config.TYPES.STAT_BUFFS.ICON,
                colors: config.TYPES.STAT_BUFFS.COLORS,
                priority: config.TYPES.STAT_BUFFS.PRIORITY,
                fontFamily: fontConfig.FAMILY,
                renderFunction: () => this.renderStatBuffs()
            },
            bless: {
                containerId: 'blessingsContainer',
                title: config.TYPES.BLESSINGS.TITLE,
                icon: config.TYPES.BLESSINGS.ICON,
                colors: config.TYPES.BLESSINGS.COLORS,
                priority: config.TYPES.BLESSINGS.PRIORITY,
                fontFamily: fontConfig.FAMILY,
                renderFunction: () => this.renderBlessings()
            },
            curse: {
                containerId: 'cursesContainer',
                title: config.TYPES.CURSES.TITLE,
                icon: config.TYPES.CURSES.ICON,
                colors: config.TYPES.CURSES.COLORS,
                priority: config.TYPES.CURSES.PRIORITY,
                fontFamily: fontConfig.FAMILY,
                renderFunction: () => this.renderCurses()
            },
            buff_debuff: {
                containerId: 'buffsDebuffsContainer',
                title: config.TYPES.BUFFS_DEBUFFS.TITLE,
                icon: config.TYPES.BUFFS_DEBUFFS.ICON,
                colors: config.TYPES.BUFFS_DEBUFFS.COLORS,
                priority: config.TYPES.BUFFS_DEBUFFS.PRIORITY,
                fontFamily: fontConfig.FAMILY,
                renderFunction: () => this.renderBuffsDebuffs()
            },
            details: {
                containerId: 'detailsContainer',
                title: config.TYPES.DETAILS.TITLE,
                icon: config.TYPES.DETAILS.ICON,
                colors: config.TYPES.DETAILS.COLORS,
                priority: config.TYPES.DETAILS.PRIORITY,
                fontFamily: fontConfig.FAMILY,
                renderFunction: () => this.renderDetails()
            },
            inventory: {
                containerId: 'inventoryContainer',
                title: config.TYPES.INVENTORY.TITLE,
                icon: config.TYPES.INVENTORY.ICON,
                colors: config.TYPES.INVENTORY.COLORS,
                priority: config.TYPES.INVENTORY.PRIORITY,
                fontFamily: fontConfig.FAMILY,
                renderFunction: () => this.renderInventory()
            }
        };
        console.log('✅ Конфигурация типов инициализирована:', Object.keys(this.typeConfigs));
    }

    /**
     * Инициализация менеджера
     */
    initialize() {
        if (this.initialized) {
            console.log('⚠️ GameItemUI уже инициализирован');
            return;
        }
        console.log('🎮 Инициализация GameItemUIManager...');
        this.importFonts();
        this.cacheContainers();
        this.addTooltipStyles();
        if (!window.showOrganizationHierarchy) {
            window.showOrganizationHierarchy = (orgId) => this.showOrganizationHierarchy(orgId);
        }
        if (!window.showGameItemTooltip) {
            window.showGameItemTooltip = (element, gameItem) => this.showGameItemTooltip(element, gameItem);
        }
        this.setupEventListeners();
        this.renderAll();
        this.initialized = true;
        console.log('✅ GameItemUIManager инициализирован');
    }

    /**
     * Импорт шрифтов
     */
    importFonts() {
        const fontConfig = this.config.FONTS;
        if (!fontConfig?.IMPORT_URLS) return;
        const existingLinks = document.querySelectorAll('link[rel="stylesheet"][href*="fonts.googleapis.com"]');
        const existingUrls = Array.from(existingLinks).map(link => link.href);
        fontConfig.IMPORT_URLS.forEach(url => {
            if (!existingUrls.some(existingUrl => existingUrl.includes(url))) {
                const link = document.createElement('link');
                link.rel = 'stylesheet';
                link.href = url;
                document.head.appendChild(link);
            }
        });
    }

    /**
     * Добавление общих стилей
     */
    addTooltipStyles() {
        if (document.getElementById('gameitem-ui-styles')) return;
        const config = this.config;
        const style = document.createElement('style');
        style.id = 'gameitem-ui-styles';
        style.textContent = `
            @keyframes tooltipFadeIn {
                from { opacity: 0; transform: translateY(-8px) scale(0.95); }
                to { opacity: 1; transform: translateY(0) scale(1); }
            }
            @keyframes tooltipFadeOut {
                from { opacity: 1; transform: translateY(0) scale(1); }
                to { opacity: 0; transform: translateY(-8px) scale(0.95); }
            }
            @keyframes statPulse {
                0% { transform: scale(1); }
                50% { transform: scale(1.1); }
                100% { transform: scale(1); }
            }
            @keyframes flyUp {
                0% { opacity: 1; transform: translateY(0) translateX(0); }
                100% { opacity: 0; transform: translateY(-40px) translateX(15px); }
            }
            @keyframes badgeGlow {
                0% { box-shadow: 0 0 5px currentColor; }
                50% { box-shadow: 0 0 15px currentColor; }
                100% { box-shadow: 0 0 5px currentColor; }
            }

            .game-item-section {
                font-family: ${config.FONTS.FAMILY};
                margin: ${config.LAYOUT.SECTION_MARGIN} !important;
                display: block;
                background: ${config.COLORS.BACKGROUNDS.SECTION};
                border-radius: 6px;
                padding: ${config.LAYOUT.SECTION_PADDING};
                border: 1px solid rgba(255,255,255,0.05);
                letter-spacing: ${config.FONTS.LETTER_SPACING};
            }

            .game-item-badge {
                cursor: help;
                transition: ${config.BADGES.TRANSITION};
                padding: ${config.LAYOUT.BADGE_PADDING} !important;
                margin: ${config.LAYOUT.BADGE_MARGIN} !important;
                border-radius: ${config.BADGES.BORDER_RADIUS};
                font-size: ${config.FONTS.BADGE_TEXT_SIZE};
                display: block !important;
                width: 100%;
                box-sizing: border-box;
                border-width: ${config.BADGES.BORDER_WIDTH};
                border-style: solid;
                position: relative;
                overflow: hidden;
                line-height: 1.3;
                /* Принудительный перенос текста */
                overflow-wrap: break-word;
                word-wrap: break-word;
                word-break: break-word;
                white-space: normal;
                hyphens: auto;
            }
            .game-item-badge * {
                overflow-wrap: break-word;
                word-wrap: break-word;
                word-break: break-word;
                white-space: normal;
                max-width: 100%;
                box-sizing: border-box;
                min-width: 0; /* позволяет flex-элементам сжиматься */
                hyphens: auto;
            }

            .game-item-badge::before {
                content: '';
                position: absolute;
                top: 0;
                left: -100%;
                width: 100%;
                height: 100%;
                background: linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent);
                transition: left 0.6s ease;
            }

            .game-item-badge:hover {
                transform: ${config.BADGES.HOVER_TRANSFORM};
                box-shadow: ${config.BADGES.HOVER_SHADOW};
                z-index: 10;
            }

            .game-item-badge:hover::before {
                left: 100%;
            }

            .game-item-badge.org-badge:hover {
                animation: badgeGlow 2s infinite;
            }

            .game-item-tooltip {
                animation: tooltipFadeIn ${config.ANIMATIONS.TOOLTIP_FADE_IN};
                pointer-events: none;
                z-index: 10000;
                position: fixed;
            }

            .game-item-tooltip.fade-out {
                animation: tooltipFadeOut ${config.ANIMATIONS.TOOLTIP_FADE_OUT};
            }

            .industrial-border {
                border-image: linear-gradient(45deg, #8b4513, #d4af37, #8b4513) 1;
                border-width: 2px;
                border-style: solid;
            }
            .metal-text {
                background: linear-gradient(to bottom, #d4af37 0%, #fbc531 50%, #d4af37 100%);
                -webkit-background-clip: text;
                -webkit-text-fill-color: transparent;
                text-shadow: 0 1px 0 rgba(0,0,0,0.5);
            }
            .rust-text {
                color: #8b4513;
                text-shadow: 0 1px 1px rgba(139, 69, 19, 0.3);
            }
            .steel-text {
                color: #bdc3c7;
                text-shadow: 0 1px 2px rgba(0,0,0,0.5);
            }
        `;
        document.head.appendChild(style);
        console.log('🎨 Стили для GameItemUI добавлены (с усиленным переносом текста)');
    }

    /**
     * Кэширование контейнеров
     */
    cacheContainers() {
        this.mainContainer = document.getElementById('personalityDisplay')?.parentNode;
        if (!this.mainContainer) {
            console.error('❌ GameItemUIManager: Не найден основной контейнер');
            this.createFallbackContainer();
            return;
        }
        console.log('📦 Найден основной контейнер:', this.mainContainer.id);
        this.mainContainer.style.fontFamily = this.config.FONTS.FAMILY;
        this.mainContainer.style.letterSpacing = this.config.FONTS.LETTER_SPACING;

        Object.values(this.typeConfigs).forEach(config => {
            const existing = document.getElementById(config.containerId);
            if (existing) existing.remove();
            const container = document.createElement('div');
            container.id = config.containerId;
            container.className = 'game-item-section';
            this.containers[config.containerId] = container;
        });
    }

    createFallbackContainer() {
        console.warn('⚠️ Создаем резервный контейнер');
        this.mainContainer = document.createElement('div');
        this.mainContainer.id = 'gameItemsFallbackContainer';
        this.mainContainer.style.cssText = `
            position: relative; 
            width: 100%; 
            height: 100%; 
            overflow-y: auto;
            font-family: ${this.config.FONTS.FAMILY};
            letter-spacing: ${this.config.FONTS.LETTER_SPACING};
            padding: 8px;
            background: ${this.config.COLORS.BACKGROUNDS.DARK};
        `;
        document.body.appendChild(this.mainContainer);
    }

    /**
     * Создание HTML для секции с едиными стилями
     */
    createSectionHTML(config, content, count = 0) {
        const colors = config.colors;
        const fonts = this.config.FONTS;
        const layout = this.config.LAYOUT;
        return `
            <div class="section-header" style="
                color: ${colors.TITLE}; 
                border-bottom: 2px solid ${colors.BORDER}; 
                padding: ${layout.HEADER_PADDING};
                margin: ${layout.HEADER_MARGIN};
                font-size: ${fonts.TITLE_SIZE}; 
                font-weight: bold;
                font-family: ${config.fontFamily};
                letter-spacing: ${fonts.LETTER_SPACING};
                text-transform: uppercase;
                display: flex;
                align-items: center;
                gap: 2px;
                text-shadow: 0 1px 2px rgba(0,0,0,0.5);
            ">
                <i class="${config.icon}" style="font-size: 1em;"></i> 
                <span>${config.title}${count > 0 ? ` (${count})` : ''}</span>
            </div>
            <div class="section-content" style="
                padding: ${layout.CONTENT_PADDING};
                font-size: ${fonts.TEXT_SIZE};
                font-family: ${config.fontFamily};
                letter-spacing: ${fonts.LETTER_SPACING};
                line-height: ${fonts.LINE_HEIGHT};
                color: ${colors.CONTENT || colors.TITLE};
            ">
                ${content}
            </div>
        `;
    }

    setupEventListeners() {
        State.on(State.EVENTS.HERO_CHANGED, (data) => this.handleHeroChanged(data));
        State.on(State.EVENTS.TURN_COMPLETED, (data) => this.handleTurnCompleted(data?.turnCount || State.getState().turnCount));
        State.on(State.EVENTS.SCENE_CHANGED, (data) => this.handleSceneChanged(data));
        State.on(State.EVENTS.ORGANIZATION_JOINED, () => this.renderType(this.typeConfigs.organization));
        State.on(State.EVENTS.ORGANIZATION_RANK_CHANGED, () => this.renderType(this.typeConfigs.organization));
        State.on(State.EVENTS.ORGANIZATION_HIERARCHY_UPDATED, () => this.renderType(this.typeConfigs.organization));
        console.log('🔗 Подписки установлены');
    }

    handleHeroChanged(data) {
        const changedTypes = this.getChangedItemTypes(data.operations || []);
        if (changedTypes.length === 0 && !data.categories?.includes('typology')) return;
        changedTypes.forEach(type => {
            const config = Object.values(this.typeConfigs).find(c => this.getTypeFromConfig(c) === type);
            if (config) this.renderType(config);
        });
        this.renderType(this.typeConfigs.organization);
    }

    handleSceneChanged() {
        this.renderType(this.typeConfigs.typology);
        this.renderType(this.typeConfigs.personality);
    }

    handleTurnCompleted(turnCount) {
        console.log(`🔄 TURN_COMPLETED, ход ${turnCount}`);
        this.renderAll();
        this.lastRenderedTurn = turnCount;
    }

    getChangedItemTypes(operations) {
        const types = new Set();
        operations.forEach(op => {
            if (!op.id) return;
            const [prefix] = op.id.split(':');
            switch (prefix) {
                case 'personality': types.add('personality'); break;
                case 'relations': types.add('relations'); break;
                case 'skill': types.add('skill'); break;
                case 'bless': types.add('bless'); break;
                case 'curse': types.add('curse'); break;
                case 'buff': case 'debuff':
                    const statName = op.id.split(':')[1];
                    if (['will', 'stealth', 'influence', 'sanity'].includes(statName)) types.add('stat_buffs');
                    else types.add('buff_debuff');
                    break;
                case 'inventory': types.add('inventory'); break;
                case 'organization_rank': types.add('organization'); break;
                default:
                    const known = ['stat','skill','inventory','relations','bless','curse','buff','debuff','personality','initiation_degree','progress','organization_rank'];
                    if (!known.includes(prefix)) types.add('details');
            }
        });
        return Array.from(types);
    }

    getTypeFromConfig(config) {
        return Object.keys(this.typeConfigs).find(key => this.typeConfigs[key] === config);
    }

    renderAll() {
        console.log('🎨 ПОЛНЫЙ рендеринг...');
        const sortedTypes = Object.values(this.typeConfigs).sort((a, b) => b.priority - a.priority);
        if (!this.mainContainer) { console.error('❌ mainContainer отсутствует'); return; }
        this.mainContainer.innerHTML = '';
        sortedTypes.forEach(config => this.renderType(config));
    }

    renderType(config) {
        try {
            if (!this.containers[config.containerId]) return;
            const html = config.renderFunction();
            this.containers[config.containerId].innerHTML = html || '';
            if (!this.containers[config.containerId].parentNode) {
                this.mainContainer.appendChild(this.containers[config.containerId]);
            }
            // Все блоки всегда показываем, даже пустые
            this.containers[config.containerId].style.display = 'block';
        } catch (error) {
            console.error(`❌ Ошибка рендеринга ${config.containerId}:`, error);
            this.containers[config.containerId].innerHTML = `<div style="color:#ff3838;">Ошибка</div>`;
            this.containers[config.containerId].style.display = 'block';
        }
    }

    // ========== МЕТОДЫ РЕНДЕРА КОНКРЕТНЫХ ТИПОВ ==========

    renderPersonality() {
        try {
            const val = State.getGameItemValue('personality:hero');
            const config = this.typeConfigs.personality;
            const colors = config.colors;
            const content = this.config.CONTENT;
            const empty = this.config.EMPTY;
            const count = (val && val.trim() !== '' && val !== 'true') ? 1 : 0;

            let html;
            if (val && val.trim() !== '' && val !== 'true') {
                const item = { id: 'personality:hero', value: val, description: '' };
                const dataAttr = JSON.stringify(item).replace(/"/g, '&quot;');
                html = `
                    <div class="game-item-badge" data-game-item='${dataAttr}' onclick="window.showGameItemTooltip(this, JSON.parse(this.dataset.gameItem))"
                         style="
                            background: ${colors.BACKGROUND};
                            border: none;
                            border-left: ${content.BORDER_LEFT_WIDTH} solid ${colors.TITLE};
                            border-radius: ${content.BORDER_RADIUS};
                            margin: 0;
                            padding: ${content.PADDING} ${content.PADDING} ${content.PADDING} ${content.PADDING_LEFT};
                            cursor: help;
                         ">
                        <div style="
                            display: flex;
                            align-items: flex-start;
                            gap: 4px;
                            width: 100%;
                            box-sizing: border-box;
                            color: ${colors.CONTENT};
                            font-style: ${content.FONT_STYLE};
                            line-height: ${content.LINE_HEIGHT};
                            flex-wrap: wrap;
                        ">
                            <i class="${config.icon}" style="color: ${colors.TITLE}; font-size: 1em; flex-shrink: 0; margin-top: 1px;"></i>
                            <span style="flex: 1; min-width: 0; overflow-wrap: break-word;">${val}</span>
                        </div>
                    </div>
                `;
            } else {
                html = `
                    <div class="game-item-badge" style="
                        background: ${colors.BACKGROUND};
                        border: ${empty.BORDER_STYLE} ${colors.BORDER}40;
                        border-left: none;
                        border-radius: ${empty.BORDER_RADIUS};
                        margin: 0;
                        cursor: default;
                    ">
                        <div style="
                            padding: ${empty.PADDING};
                            color: ${colors.CONTENT}88;
                            font-style: ${content.FONT_STYLE};
                            text-align: center;
                        ">
                            <i class="fas fa-user-clock" style="font-size:${empty.ICON_SIZE}; margin-bottom:${empty.ICON_MARGIN_BOTTOM}; display:block;"></i> 
                            Личность ещё не определена...
                        </div>
                    </div>
                `;
            }
            return this.createSectionHTML(config, html, count);
        } catch (e) {
            return this.createSectionHTML(this.typeConfigs.personality, `<div style="color:#ff3838;">Ошибка</div>`);
        }
    }

    renderTypology() {
        try {
            const val = State.getState().gameState.currentScene?.typology || '';
            const config = this.typeConfigs.typology;
            const colors = config.colors;
            const content = this.config.CONTENT;
            const empty = this.config.EMPTY;
            const count = val.trim() ? 1 : 0;

            let html;
            if (val.trim()) {
                const item = { id: 'typology:currentScene', value: val, description: '' };
                const dataAttr = JSON.stringify(item).replace(/"/g, '&quot;');
                html = `
                    <div class="game-item-badge" data-game-item='${dataAttr}' onclick="window.showGameItemTooltip(this, JSON.parse(this.dataset.gameItem))"
                         style="
                            background: ${colors.BACKGROUND};
                            border: none;
                            border-left: ${content.BORDER_LEFT_WIDTH} solid ${colors.TITLE};
                            border-radius: ${content.BORDER_RADIUS};
                            margin: 0;
                            padding: ${content.PADDING} ${content.PADDING} ${content.PADDING} ${content.PADDING_LEFT};
                            cursor: help;
                         ">
                        <div style="
                            display: flex;
                            align-items: flex-start;
                            gap: 4px;
                            width: 100%;
                            box-sizing: border-box;
                            color: ${colors.CONTENT};
                            font-style: ${content.FONT_STYLE};
                            line-height: ${content.LINE_HEIGHT};
                            flex-wrap: wrap;
                        ">
                            <i class="${config.icon}" style="color: ${colors.TITLE}; font-size: 1em; flex-shrink: 0; margin-top: 1px;"></i>
                            <span style="flex: 1; min-width: 0; overflow-wrap: break-word;">${val}</span>
                        </div>
                    </div>
                `;
            } else {
                html = `
                    <div class="game-item-badge" style="
                        background: ${colors.BACKGROUND};
                        border: ${empty.BORDER_STYLE} ${colors.BORDER}40;
                        border-left: none;
                        border-radius: ${empty.BORDER_RADIUS};
                        margin: 0;
                        cursor: default;
                    ">
                        <div style="
                            padding: ${empty.PADDING};
                            color: ${colors.CONTENT}88;
                            font-style: ${content.FONT_STYLE};
                            text-align: center;
                        ">
                            <i class="fas fa-fingerprint" style="font-size:${empty.ICON_SIZE}; margin-bottom:${empty.ICON_MARGIN_BOTTOM}; display:block;"></i> 
                            Типология не определена...
                        </div>
                    </div>
                `;
            }
            return this.createSectionHTML(config, html, count);
        } catch (e) {
            return this.createSectionHTML(this.typeConfigs.typology, `<div style="color:#ff3838;">Ошибка</div>`);
        }
    }

    renderOrganizations() {
        try {
            const orgs = State.getHeroOrganizations();
            const config = this.typeConfigs.organization;
            const colors = config.colors;
            const fonts = this.config.FONTS;
            const empty = this.config.EMPTY;
            const layout = this.config.LAYOUT;

            if (orgs.length === 0) {
                const emptyHtml = `
                    <div class="game-item-badge" style="
                        background: ${colors.BACKGROUND};
                        border: ${empty.BORDER_STYLE} ${colors.BORDER}40;
                        border-radius: ${empty.BORDER_RADIUS};
                        margin: 0;
                        cursor: default;
                    ">
                        <div style="
                            padding: ${empty.PADDING};
                            color: ${colors.CONTENT}88;
                            text-align: center;
                        ">
                            <i class="fas fa-users-slash" style="font-size:${empty.ICON_SIZE}; margin-bottom:${empty.ICON_MARGIN_BOTTOM}; display:block;"></i> 
                            Герой не состоит в организациях...
                        </div>
                    </div>
                `;
                return this.createSectionHTML(config, emptyHtml, 0);
            }
            let html = '';
            orgs.forEach(org => {
                const desc = org.description ? `<div style="font-size:0.75em; color:#aaa; margin-top:2px;">${org.description}</div>` : '';
                html += `
                    <div class="game-item-badge org-badge" onclick="showOrganizationHierarchy('${org.id}')"
                         style="background:${colors.BADGE_BG}; border:2px solid ${colors.BORDER}40; border-left:3px solid ${colors.TITLE}; color:${colors.CONTENT}; cursor: pointer;">
                        <div style="display:flex; align-items:center; gap:4px; flex-wrap:wrap; width:100%; box-sizing:border-box;">
                            <span style="color:${colors.TITLE};">👥</span>
                            <span style="flex: 1; min-width: 0;">${org.id.toUpperCase()}</span>
                            <span style="color:${colors.ACCENT || colors.TITLE}; font-weight:bold;">${org.rankName}</span>
                        </div>
                        ${desc}
                    </div>
                `;
            });
            const hint = `<div style="margin-top:4px; padding:3px; background:${colors.BACKGROUND}80; border-radius:3px; font-size:${fonts.TEXT_SIZE};"><i class="fas fa-info-circle"></i> Кликните на организацию для иерархии</div>`;
            return this.createSectionHTML(config, `<div style="display:flex; flex-direction:column; gap:0;">${html}${hint}</div>`, orgs.length);
        } catch (e) {
            return this.createSectionHTML(this.typeConfigs.organization, `<div style="color:#ff3838;">Ошибка</div>`);
        }
    }

    renderRelations() {
        try {
            const items = State.getGameItemsByType('relations:');
            const config = this.typeConfigs.relations;
            const colors = config.colors;
            const fonts = this.config.FONTS;
            const empty = this.config.EMPTY;

            if (items.length === 0) {
                const emptyHtml = `
                    <div class="game-item-badge" style="
                        background: ${colors.BACKGROUND};
                        border: ${empty.BORDER_STYLE} ${colors.BORDER}40;
                        border-radius: ${empty.BORDER_RADIUS};
                        margin: 0;
                        cursor: default;
                    ">
                        <div style="
                            padding: ${empty.PADDING};
                            color: ${colors.CONTENT}88;
                            text-align: center;
                        ">
                            <i class="fas fa-user-friends" style="font-size:${empty.ICON_SIZE}; margin-bottom:${empty.ICON_MARGIN_BOTTOM}; display:block;"></i> 
                            Отношения не установлены...
                        </div>
                    </div>
                `;
                return this.createSectionHTML(config, emptyHtml, 0);
            }
            let html = '';
            items.forEach(rel => {
                const name = rel.id.split(':')[1] || 'Unknown';
                const value = rel.value || 0;
                const color = this.getStatColor((value + 100) / 2);
                const emoji = value >= 75 ? '😍' : value >= 50 ? '😊' : value >= 25 ? '🙂' : value >= -25 ? '😐' : value >= -50 ? '😠' : value >= -75 ? '😡' : '💀';
                const desc = rel.description ? `<div style="font-size:0.75em; color:#aaa; margin-top:2px;">${rel.description}</div>` : '';
                const dataAttr = JSON.stringify(rel).replace(/"/g, '&quot;');
                html += `
                    <div class="game-item-badge" data-game-item='${dataAttr}' onclick="window.showGameItemTooltip(this, JSON.parse(this.dataset.gameItem))"
                         style="background:${colors.BADGE_BG}; border:2px solid ${colors.BADGE}40; border-left:3px solid ${colors.BADGE};">
                        <div style="display:flex; align-items:center; gap:4px; flex-wrap:wrap; width:100%; box-sizing:border-box;">
                            <span style="font-size:1.1em;">${emoji}</span>
                            <span style="color:${colors.BADGE}; flex: 1; min-width: 0;">${name}</span>
                            <span style="color:${color}; background:rgba(0,0,0,0.3); padding:1px 4px; border-radius:3px;">${value > 0 ? '+' : ''}${value}</span>
                        </div>
                        ${desc}
                    </div>
                `;
            });
            return this.createSectionHTML(config, `<div style="display:flex; flex-direction:column; gap:0;">${html}</div>`, items.length);
        } catch (e) {
            return this.createSectionHTML(this.typeConfigs.relations, `<div style="color:#ff3838;">Ошибка</div>`);
        }
    }

    renderSkills() {
        try {
            const items = State.getGameItemsByType('skill:');
            const config = this.typeConfigs.skill;
            const colors = config.colors;
            const empty = this.config.EMPTY;

            if (items.length === 0) {
                const emptyHtml = `
                    <div class="game-item-badge" style="
                        background: ${colors.BACKGROUND};
                        border: ${empty.BORDER_STYLE} ${colors.BORDER}40;
                        border-radius: ${empty.BORDER_RADIUS};
                        margin: 0;
                        cursor: default;
                    ">
                        <div style="
                            padding: ${empty.PADDING};
                            color: ${colors.CONTENT}88;
                            text-align: center;
                        ">
                            <i class="fas fa-scroll" style="font-size:${empty.ICON_SIZE}; margin-bottom:${empty.ICON_MARGIN_BOTTOM}; display:block;"></i> 
                            Навыки ещё не получены...
                        </div>
                    </div>
                `;
                return this.createSectionHTML(config, emptyHtml, 0);
            }
            let html = '';
            items.forEach(skill => {
                const name = skill.value || skill.id.split(':')[1];
                const desc = skill.description ? `<div style="font-size:0.75em; color:#aaa; margin-top:2px;">${skill.description}</div>` : '';
                const dataAttr = JSON.stringify(skill).replace(/"/g, '&quot;');
                html += `
                    <div class="game-item-badge" data-game-item='${dataAttr}' onclick="window.showGameItemTooltip(this, JSON.parse(this.dataset.gameItem))"
                         style="background:${colors.BADGE_BG}; border:2px solid ${colors.BADGE}40; border-left:3px solid ${colors.BADGE};">
                        <div style="display:flex; align-items:center; gap:4px; width:100%; box-sizing:border-box;">
                            <span style="color:${colors.BADGE};">📜</span>
                            <span style="flex: 1; min-width: 0;">${name}</span>
                        </div>
                        ${desc}
                    </div>
                `;
            });
            return this.createSectionHTML(config, `<div style="display:flex; flex-direction:column; gap:0;">${html}</div>`, items.length);
        } catch (e) {
            return this.createSectionHTML(this.typeConfigs.skill, `<div style="color:#ff3838;">Ошибка</div>`);
        }
    }

    renderStatBuffs() {
        try {
            const buffs = State.getGameItemsByType('buff:').filter(item => {
                const stat = item.id.split(':')[1];
                return ['will', 'stealth', 'influence', 'sanity'].includes(stat);
            });
            const debuffs = State.getGameItemsByType('debuff:').filter(item => {
                const stat = item.id.split(':')[1];
                return ['will', 'stealth', 'influence', 'sanity'].includes(stat);
            });
            const items = [...buffs, ...debuffs];
            const config = this.typeConfigs.stat_buffs;
            const colors = config.colors;
            const empty = this.config.EMPTY;

            if (items.length === 0) {
                const emptyHtml = `
                    <div class="game-item-badge" style="
                        background: ${colors.BACKGROUND};
                        border: ${empty.BORDER_STYLE} ${colors.BORDER}40;
                        border-radius: ${empty.BORDER_RADIUS};
                        margin: 0;
                        cursor: default;
                    ">
                        <div style="
                            padding: ${empty.PADDING};
                            color: ${colors.CONTENT}88;
                            text-align: center;
                        ">
                            <i class="fas fa-tachometer-alt" style="font-size:${empty.ICON_SIZE}; margin-bottom:${empty.ICON_MARGIN_BOTTOM}; display:block;"></i> 
                            Нет баффов/дебаффов к статам...
                        </div>
                    </div>
                `;
                return this.createSectionHTML(config, emptyHtml, 0);
            }
            let html = '';
            items.forEach(item => {
                const isBuff = item.id.startsWith('buff:');
                const stat = item.id.split(':')[1];
                const russian = Utils.getRussianStatName(stat);
                const value = item.value || 0;
                const color = isBuff ? colors.BUFF : colors.DEBUFF;
                const icon = isBuff ? '⬆️' : '⬇️';
                const duration = item.duration !== undefined ? `[${item.duration}]` : '';
                const desc = item.description ? `<div style="font-size:0.75em; color:#aaa; margin-top:2px;">${item.description}</div>` : '';
                const dataAttr = JSON.stringify(item).replace(/"/g, '&quot;');
                const badgeBg = isBuff ? colors.BADGE_BG_BUFF : colors.BADGE_BG_DEBUFF;
                html += `
                    <div class="game-item-badge" data-game-item='${dataAttr}' onclick="window.showGameItemTooltip(this, JSON.parse(this.dataset.gameItem))"
                         style="background:${badgeBg}; border:2px solid ${color}40; border-left:3px solid ${color};">
                        <div style="display:flex; align-items:center; gap:4px; flex-wrap:wrap; width:100%; box-sizing:border-box;">
                            <span style="color:${color};">${icon}</span>
                            <span style="flex: 1; min-width: 0;">${russian}</span>
                            <span style="color:${color}; font-weight:bold;">${value > 0 ? '+' : ''}${value}</span>
                            ${duration ? `<span style="color:#888; font-size:0.7em;">${duration}</span>` : ''}
                        </div>
                        ${desc}
                    </div>
                `;
            });
            return this.createSectionHTML(config, `<div style="display:flex; flex-direction:column; gap:0;">${html}</div>`, items.length);
        } catch (e) {
            return this.createSectionHTML(this.typeConfigs.stat_buffs, `<div style="color:#ff3838;">Ошибка</div>`);
        }
    }

    renderBlessings() {
        try {
            const items = State.getGameItemsByType('bless:');
            const config = this.typeConfigs.bless;
            const colors = config.colors;
            const empty = this.config.EMPTY;

            if (items.length === 0) {
                const emptyHtml = `
                    <div class="game-item-badge" style="
                        background: ${colors.BACKGROUND};
                        border: ${empty.BORDER_STYLE} ${colors.BORDER}40;
                        border-radius: ${empty.BORDER_RADIUS};
                        margin: 0;
                        cursor: default;
                    ">
                        <div style="
                            padding: ${empty.PADDING};
                            color: ${colors.CONTENT}88;
                            text-align: center;
                        ">
                            <i class="fas fa-star" style="font-size:${empty.ICON_SIZE}; margin-bottom:${empty.ICON_MARGIN_BOTTOM}; display:block;"></i> 
                            Нет благословений...
                        </div>
                    </div>
                `;
                return this.createSectionHTML(config, emptyHtml, 0);
            }
            let html = '';
            items.forEach(bless => {
                const name = bless.value || bless.id.split(':')[1];
                const duration = bless.duration !== undefined ? `[${bless.duration}]` : '';
                const desc = bless.description ? `<div style="font-size:0.75em; color:#aaa; margin-top:2px;">${bless.description}</div>` : '';
                const dataAttr = JSON.stringify(bless).replace(/"/g, '&quot;');
                html += `
                    <div class="game-item-badge" data-game-item='${dataAttr}' onclick="window.showGameItemTooltip(this, JSON.parse(this.dataset.gameItem))"
                         style="background:${colors.BADGE_BG}; border:2px solid ${colors.BADGE}40; border-left:3px solid ${colors.BADGE};">
                        <div style="display:flex; align-items:center; gap:4px; width:100%; box-sizing:border-box;">
                            <span style="color:${colors.BADGE};">✨</span>
                            <span style="flex: 1; min-width: 0;">${name}</span>
                            ${duration ? `<span style="color:#888; font-size:0.7em;">${duration}</span>` : ''}
                        </div>
                        ${desc}
                    </div>
                `;
            });
            return this.createSectionHTML(config, `<div style="display:flex; flex-direction:column; gap:0;">${html}</div>`, items.length);
        } catch (e) {
            return this.createSectionHTML(this.typeConfigs.bless, `<div style="color:#ff3838;">Ошибка</div>`);
        }
    }

    renderCurses() {
        try {
            const items = State.getGameItemsByType('curse:');
            const config = this.typeConfigs.curse;
            const colors = config.colors;
            const empty = this.config.EMPTY;

            if (items.length === 0) {
                const emptyHtml = `
                    <div class="game-item-badge" style="
                        background: ${colors.BACKGROUND};
                        border: ${empty.BORDER_STYLE} ${colors.BORDER}40;
                        border-radius: ${empty.BORDER_RADIUS};
                        margin: 0;
                        cursor: default;
                    ">
                        <div style="
                            padding: ${empty.PADDING};
                            color: ${colors.CONTENT}88;
                            text-align: center;
                        ">
                            <i class="fas fa-skull-crossbones" style="font-size:${empty.ICON_SIZE}; margin-bottom:${empty.ICON_MARGIN_BOTTOM}; display:block;"></i> 
                            Нет проклятий...
                        </div>
                    </div>
                `;
                return this.createSectionHTML(config, emptyHtml, 0);
            }
            let html = '';
            items.forEach(curse => {
                const name = curse.value || curse.id.split(':')[1];
                const duration = curse.duration !== undefined ? `[${curse.duration}]` : '';
                const desc = curse.description ? `<div style="font-size:0.75em; color:#aaa; margin-top:2px;">${curse.description}</div>` : '';
                const dataAttr = JSON.stringify(curse).replace(/"/g, '&quot;');
                html += `
                    <div class="game-item-badge" data-game-item='${dataAttr}' onclick="window.showGameItemTooltip(this, JSON.parse(this.dataset.gameItem))"
                         style="background:${colors.BADGE_BG}; border:2px solid ${colors.BADGE}40; border-left:3px solid ${colors.BADGE};">
                        <div style="display:flex; align-items:center; gap:4px; width:100%; box-sizing:border-box;">
                            <span style="color:${colors.BADGE};">💀</span>
                            <span style="flex: 1; min-width: 0;">${name}</span>
                            ${duration ? `<span style="color:#888; font-size:0.7em;">${duration}</span>` : ''}
                        </div>
                        ${desc}
                    </div>
                `;
            });
            return this.createSectionHTML(config, `<div style="display:flex; flex-direction:column; gap:0;">${html}</div>`, items.length);
        } catch (e) {
            return this.createSectionHTML(this.typeConfigs.curse, `<div style="color:#ff3838;">Ошибка</div>`);
        }
    }

    renderBuffsDebuffs() {
        try {
            const allBuffs = State.getGameItemsByType('buff:');
            const allDebuffs = State.getGameItemsByType('debuff:');
            const buffs = allBuffs.filter(item => {
                const stat = item.id.split(':')[1];
                return !['will', 'stealth', 'influence', 'sanity'].includes(stat);
            });
            const debuffs = allDebuffs.filter(item => {
                const stat = item.id.split(':')[1];
                return !['will', 'stealth', 'influence', 'sanity'].includes(stat);
            });
            const items = [...buffs, ...debuffs];
            const config = this.typeConfigs.buff_debuff;
            const colors = config.colors;
            const empty = this.config.EMPTY;

            if (items.length === 0) {
                const emptyHtml = `
                    <div class="game-item-badge" style="
                        background: ${colors.BACKGROUND};
                        border: ${empty.BORDER_STYLE} ${colors.BORDER}40;
                        border-radius: ${empty.BORDER_RADIUS};
                        margin: 0;
                        cursor: default;
                    ">
                        <div style="
                            padding: ${empty.PADDING};
                            color: ${colors.CONTENT}88;
                            text-align: center;
                        ">
                            <i class="fas fa-chart-line" style="font-size:${empty.ICON_SIZE}; margin-bottom:${empty.ICON_MARGIN_BOTTOM}; display:block;"></i> 
                            Нет других баффов/дебаффов...
                        </div>
                    </div>
                `;
                return this.createSectionHTML(config, emptyHtml, 0);
            }
            let html = '';
            items.forEach(item => {
                const isBuff = item.id.startsWith('buff:');
                const stat = item.id.split(':')[1];
                const value = item.value || 0;
                const color = isBuff ? colors.BUFF : colors.DEBUFF;
                const icon = isBuff ? '⬆️' : '⬇️';
                const duration = item.duration !== undefined ? `[${item.duration}]` : '';
                const desc = item.description ? `<div style="font-size:0.75em; color:#aaa; margin-top:2px;">${item.description}</div>` : '';
                const dataAttr = JSON.stringify(item).replace(/"/g, '&quot;');
                const badgeBg = isBuff ? colors.BADGE_BG_BUFF : colors.BADGE_BG_DEBUFF;
                html += `
                    <div class="game-item-badge" data-game-item='${dataAttr}' onclick="window.showGameItemTooltip(this, JSON.parse(this.dataset.gameItem))"
                         style="background:${badgeBg}; border:2px solid ${color}40; border-left:3px solid ${color};">
                        <div style="display:flex; align-items:center; gap:4px; flex-wrap:wrap; width:100%; box-sizing:border-box;">
                            <span style="color:${color};">${icon}</span>
                            <span style="flex: 1; min-width: 0;">${stat}</span>
                            <span style="color:${color}; font-weight:bold;">${value > 0 ? '+' : ''}${value}</span>
                            ${duration ? `<span style="color:#888; font-size:0.7em;">${duration}</span>` : ''}
                        </div>
                        ${desc}
                    </div>
                `;
            });
            return this.createSectionHTML(config, `<div style="display:flex; flex-direction:column; gap:0;">${html}</div>`, items.length);
        } catch (e) {
            return this.createSectionHTML(this.typeConfigs.buff_debuff, `<div style="color:#ff3838;">Ошибка</div>`);
        }
    }

    renderDetails() {
        try {
            const knownPrefixes = [
                'stat:', 'skill:', 'inventory:', 'relations:', 'bless:', 'curse:',
                'buff:', 'debuff:', 'personality:', 'initiation_degree:', 'progress:',
                'organization_rank:'
            ];
            const state = State.getState();
            const allItems = state.heroState || [];
            const items = allItems.filter(item => !knownPrefixes.some(p => item.id.startsWith(p)));
            const config = this.typeConfigs.details;
            const colors = config.colors;
            const empty = this.config.EMPTY;

            if (items.length === 0) {
                const emptyHtml = `
                    <div class="game-item-badge" style="
                        background: ${colors.BACKGROUND};
                        border: ${empty.BORDER_STYLE} ${colors.BORDER}40;
                        border-radius: ${empty.BORDER_RADIUS};
                        margin: 0;
                        cursor: default;
                    ">
                        <div style="
                            padding: ${empty.PADDING};
                            color: ${colors.CONTENT}88;
                            text-align: center;
                        ">
                            <i class="fas fa-info-circle" style="font-size:${empty.ICON_SIZE}; margin-bottom:${empty.ICON_MARGIN_BOTTOM}; display:block;"></i> 
                            Нет дополнительных деталей...
                        </div>
                    </div>
                `;
                return this.createSectionHTML(config, emptyHtml, 0);
            }
            let html = '';
            items.forEach(item => {
                const display = item.value || item.id.split(':')[1] || item.id;
                const icon = Utils.getGameItemIcon(item.id);
                const duration = item.duration !== undefined ? `[${item.duration}]` : '';
                const desc = item.description ? `<div style="font-size:0.75em; color:#aaa; margin-top:2px;">${item.description}</div>` : '';
                const dataAttr = JSON.stringify(item).replace(/"/g, '&quot;');
                html += `
                    <div class="game-item-badge" data-game-item='${dataAttr}' onclick="window.showGameItemTooltip(this, JSON.parse(this.dataset.gameItem))"
                         style="background:${colors.BADGE_BG}; border:2px solid ${colors.BADGE}40; border-left:3px solid ${colors.BADGE};">
                        <div style="display:flex; align-items:center; gap:4px; width:100%; box-sizing:border-box;">
                            <span style="color:${colors.BADGE};">${icon}</span>
                            <span style="flex: 1; min-width: 0;">${display}</span>
                            ${duration ? `<span style="color:#888; font-size:0.7em;">${duration}</span>` : ''}
                        </div>
                        ${desc}
                    </div>
                `;
            });
            return this.createSectionHTML(config, `<div style="display:flex; flex-direction:column; gap:0;">${html}</div>`, items.length);
        } catch (e) {
            return this.createSectionHTML(this.typeConfigs.details, `<div style="color:#ff3838;">Ошибка</div>`);
        }
    }

    renderInventory() {
        try {
            const items = State.getGameItemsByType('inventory:');
            const config = this.typeConfigs.inventory;
            const colors = config.colors;
            const empty = this.config.EMPTY;

            if (items.length === 0) {
                const emptyHtml = `
                    <div class="game-item-badge" style="
                        background: ${colors.BACKGROUND};
                        border: ${empty.BORDER_STYLE} ${colors.BORDER}40;
                        border-radius: ${empty.BORDER_RADIUS};
                        margin: 0;
                        cursor: default;
                    ">
                        <div style="
                            padding: ${empty.PADDING};
                            color: ${colors.CONTENT}88;
                            text-align: center;
                        ">
                            <i class="fas fa-box" style="font-size:${empty.ICON_SIZE}; margin-bottom:${empty.ICON_MARGIN_BOTTOM}; display:block;"></i> 
                            Инвентарь пуст...
                        </div>
                    </div>
                `;
                return this.createSectionHTML(config, emptyHtml, 0);
            }
            let html = '';
            items.forEach(item => {
                const name = item.value || item.id.split(':')[1];
                const desc = item.description ? `<div style="font-size:0.75em; color:#aaa; margin-top:2px;">${item.description}</div>` : '';
                const dataAttr = JSON.stringify(item).replace(/"/g, '&quot;');
                html += `
                    <div class="game-item-badge" data-game-item='${dataAttr}' onclick="window.showGameItemTooltip(this, JSON.parse(this.dataset.gameItem))"
                         style="background:${colors.BADGE_BG}; border:2px solid ${colors.BADGE}40; border-left:3px solid ${colors.BADGE};">
                        <div style="display:flex; align-items:center; gap:4px; width:100%; box-sizing:border-box;">
                            <span style="color:${colors.BADGE};">🎒</span>
                            <span style="flex: 1; min-width: 0;">${name}</span>
                        </div>
                        ${desc}
                    </div>
                `;
            });
            return this.createSectionHTML(config, `<div style="display:flex; flex-direction:column; gap:0;">${html}</div>`, items.length);
        } catch (e) {
            return this.createSectionHTML(this.typeConfigs.inventory, `<div style="color:#ff3838;">Ошибка</div>`);
        }
    }

    // ========== ВСПОМОГАТЕЛЬНЫЕ МЕТОДЫ ==========

    getStatColor(value) {
        const v = Math.max(0, Math.min(100, value));
        if (v <= 10) return '#800000';
        if (v <= 20) return '#FF0000';
        if (v <= 30) return '#FF5500';
        if (v <= 40) return '#FFAA00';
        if (v <= 50) return '#FFD700';
        if (v <= 60) return '#ADFF2F';
        if (v <= 70) return '#00FF00';
        if (v <= 80) return '#20B2AA';
        if (v <= 90) return '#87CEEB';
        return '#FFFFFF';
    }

    showOrganizationHierarchy(orgId) {
        try {
            console.log(`🏛️ Компактная иерархия: ${orgId}`);
            if (this.currentHierarchyModal) {
                this.currentHierarchyModal.remove();
                this.currentHierarchyModal = null;
            }
            const organizations = State.getHeroOrganizations();
            const org = organizations.find(o => o.id === orgId);
            if (!org) {
                Utils.showToast(`Организация ${orgId.toUpperCase()} не найдена`, 'error');
                return;
            }
            const hierarchy = State.getOrganizationHierarchy(orgId);
            if (!hierarchy?.description || !Array.isArray(hierarchy.description)) {
                Utils.showToast(`Иерархия ${orgId.toUpperCase()} не найдена`, 'warning');
                return;
            }
            const sortedRanks = [...hierarchy.description].sort((a, b) => a.lvl - b.lvl);
            const totalRanks = sortedRanks.length;
            const modal = document.createElement('div');
            modal.id = `orgHierarchyCompact_${orgId}_${Date.now()}`;
            modal.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: ${this.config.MODALS.BACKGROUND};
                z-index: 10000;
                display: flex;
                justify-content: center;
                align-items: flex-start;
                padding-top: 20px;
                overflow-y: auto;
                -webkit-overflow-scrolling: touch;
                font-family: ${this.config.FONTS.FAMILY};
                letter-spacing: ${this.config.FONTS.LETTER_SPACING};
            `;
            const content = document.createElement('div');
            content.style.cssText = `
                background: ${this.config.MODALS.CONTENT_BG};
                border: ${this.config.MODALS.BORDER};
                border-radius: ${this.config.MODALS.BORDER_RADIUS};
                width: 95%;
                max-width: 400px;
                max-height: 90vh;
                overflow-y: auto;
                color: ${this.config.COLORS.TEXT.SECONDARY};
                box-shadow: ${this.config.MODALS.BOX_SHADOW};
                font-size: 0.85em;
            `;
            const header = document.createElement('div');
            header.style.cssText = `
                background: ${this.config.MODALS.HEADER_BG};
                padding: 8px 12px;
                border-bottom: 1px solid #d4af37;
                display: flex;
                justify-content: space-between;
                align-items: center;
            `;
            const title = document.createElement('div');
            title.innerHTML = `
                <div style="color: ${this.config.TYPES.ORGANIZATION.COLORS.TITLE}; font-weight: bold; font-size: ${this.config.MODALS.TITLE_SIZE};" class="metal-text">
                    ${orgId.toUpperCase()}
                </div>
                <div style="color: #888; font-size: 0.8em; margin-top: 2px; letter-spacing: 1px;">ИЕРАРХИЯ</div>
            `;
            const closeBtn = document.createElement('button');
            closeBtn.innerHTML = '✕';
            closeBtn.style.cssText = `
                background: transparent;
                border: none;
                color: ${this.config.MODALS.CLOSE_COLOR};
                font-size: 1.2em;
                cursor: pointer;
                padding: 2px 8px;
                line-height: 1;
                transition: all 0.2s ease;
                border-radius: 3px;
            `;
            closeBtn.onclick = () => {
                modal.remove();
                this.currentHierarchyModal = null;
            };
            closeBtn.onmouseover = () => closeBtn.style.color = '#ffd700';
            closeBtn.onmouseout = () => closeBtn.style.color = this.config.MODALS.CLOSE_COLOR;
            header.appendChild(title);
            header.appendChild(closeBtn);
            content.appendChild(header);
            const currentPos = document.createElement('div');
            currentPos.style.cssText = `
                padding: 8px 12px;
                background: linear-gradient(135deg, rgba(255,0,0,0.15) 0%, rgba(139,0,0,0.1) 100%);
                border-bottom: 1px solid #333;
                margin: 0;
            `;
            currentPos.innerHTML = `
                <div style="color: #ff5555; font-size: 0.9em; font-weight: bold; margin-bottom: 4px; display: flex; align-items: center;">
                    <span style="background: #ff5555; color: #000; padding: 2px 6px; border-radius: 3px; margin-right: 6px; font-size: 0.8em;">●</span>
                    ТЕКУЩАЯ ПОЗИЦИЯ
                </div>
                <div style="display: flex; align-items: center; justify-content: space-between;">
                    <div>
                        <div style="color: #fff; font-size: 0.9em; font-weight: bold; margin-bottom: 2px;">${org.rankName}</div>
                        <div style="color: #aaa; font-size: 0.8em;">Уровень ${org.rank}/${totalRanks}</div>
                    </div>
                    <div style="color: #d4af37; font-size: 1em; font-weight: bold; background: rgba(212, 175, 55, 0.1); padding: 4px 8px; border-radius: 4px;">
                        ${org.rank}°
                    </div>
                </div>
            `;
            content.appendChild(currentPos);
            const hierarchyContainer = document.createElement('div');
            hierarchyContainer.style.cssText = `
                padding: 4px 0;
                max-height: 350px;
                overflow-y: auto;
            `;
            sortedRanks.forEach(rankInfo => {
                const isCurrentRank = rankInfo.lvl === org.rank;
                const rankItem = document.createElement('div');
                rankItem.style.cssText = `
                    padding: 6px 12px;
                    border-bottom: 1px solid #222;
                    background: ${isCurrentRank ? 'linear-gradient(135deg, rgba(255,0,0,0.2) 0%, rgba(139,0,0,0.15) 100%)' : 'transparent'};
                    border-left: ${isCurrentRank ? '4px solid #ff5555' : '4px solid transparent'};
                    margin: 0;
                    transition: all 0.2s ease;
                `;
                rankItem.onmouseover = () => {
                    if (!isCurrentRank) rankItem.style.background = 'rgba(212, 175, 55, 0.05)';
                };
                rankItem.onmouseout = () => {
                    if (!isCurrentRank) rankItem.style.background = 'transparent';
                };
                rankItem.innerHTML = `
                    <div style="display: flex; align-items: center; justify-content: space-between;">
                        <div style="display: flex; align-items: center; gap: 8px; flex: 1;">
                            <span style="color: #d4af37; font-weight: bold; min-width: 20px; font-size: 1em;">${rankInfo.lvl}°</span>
                            <span style="color: ${isCurrentRank ? '#fff' : '#ccc'}; font-weight: ${isCurrentRank ? 'bold' : 'normal'}; font-size: 0.9em;">
                                ${rankInfo.rank}
                            </span>
                            ${isCurrentRank ? '<span style="color: #ff5555; font-size: 0.8em; background: rgba(255,0,0,0.3); padding: 1px 4px; border-radius: 3px; margin-left: 6px; font-weight: bold;">ВЫ</span>' : ''}
                        </div>
                        ${rankInfo.threshold !== undefined ? 
                            `<span style="color: #fbc531; font-size: 0.8em; background: rgba(251,197,49,0.15); padding: 2px 6px; border-radius: 4px; white-space: nowrap; border: 1px solid #fbc53140;">
                                ${rankInfo.threshold}
                            </span>` : 
                            '<span style="color: #666; font-size: 0.8em; padding: 2px 6px; background: rgba(255,255,255,0.05); border-radius: 4px;">—</span>'
                        }
                    </div>
                    ${rankInfo.description ? 
                        `<div style="color: #888; font-size: 0.75em; margin-top: 4px; padding-left: 28px; line-height: 1.3;">
                            ${rankInfo.description}
                        </div>` : ''
                    }
                `;
                hierarchyContainer.appendChild(rankItem);
            });
            content.appendChild(hierarchyContainer);
            const legend = document.createElement('div');
            legend.style.cssText = `
                padding: 6px 12px;
                background: #1a1a1a;
                border-top: 1px solid #333;
                display: flex;
                flex-wrap: wrap;
                gap: 8px;
                font-size: 0.75em;
            `;
            legend.innerHTML = `
                <div style="display: flex; align-items: center; gap: 4px;">
                    <div style="width: 8px; height: 8px; background: #ff5555; border-radius: 2px;"></div>
                    <span style="color: #aaa;">Ваша позиция</span>
                </div>
                <div style="display: flex; align-items: center; gap: 4px;">
                    <div style="width: 8px; height: 8px; background: #d4af37; border-radius: 2px;"></div>
                    <span style="color: #aaa;">Уровень</span>
                </div>
                <div style="display: flex; align-items: center; gap: 4px;">
                    <div style="width: 8px; height: 8px; background: #fbc531; border-radius: 2px;"></div>
                    <span style="color: #aaa;">Требование</span>
                </div>
            `;
            content.appendChild(legend);
            const info = document.createElement('div');
            info.style.cssText = `
                padding: 6px 12px;
                background: #0a0a0a;
                border-top: 1px solid #222;
                font-size: 0.7em;
                color: #666;
                text-align: center;
            `;
            info.textContent = `Всего уровней: ${totalRanks} • Закройте кликом вне окна или нажатием ESC`;
            content.appendChild(info);
            modal.appendChild(content);
            modal.onclick = (e) => {
                if (e.target === modal) {
                    modal.remove();
                    this.currentHierarchyModal = null;
                }
            };
            const handleEscape = (e) => {
                if (e.key === 'Escape') {
                    modal.remove();
                    this.currentHierarchyModal = null;
                    document.removeEventListener('keydown', handleEscape);
                }
            };
            document.addEventListener('keydown', handleEscape);
            this.currentHierarchyModal = modal;
            document.body.appendChild(modal);
            console.log(`✅ Компактная иерархия ${orgId} отображена`);
        } catch (error) {
            console.error('❌ Ошибка при отображении иерархии:', error);
            Utils.showToast('Ошибка при отображении иерархии', 'error');
        }
    }

    showGameItemTooltip(element, gameItem) {
        const existingTooltip = document.querySelector('.game-item-tooltip');
        if (existingTooltip) existingTooltip.remove();
        if (!gameItem || !gameItem.id) {
            console.warn('showGameItemTooltip: Нет данных об объекте');
            return;
        }
        const config = this.config.TOOLTIPS;
        const fontConfig = this.config.FONTS;
        const tooltip = document.createElement('div');
        tooltip.className = 'game-item-tooltip';
        const icon = Utils.getGameItemIcon(gameItem.id);
        const [type, name] = gameItem.id.split(':');
        let content = `
            <div style="
                font-weight: bold; 
                color: #fbc531; 
                margin-bottom: 6px; 
                font-size: 0.9em; 
                border-bottom: 1px solid #fbc53160; 
                padding-bottom: 4px;
                font-family: ${fontConfig.FAMILY};
                letter-spacing: ${fontConfig.LETTER_SPACING};
                display: flex;
                align-items: center;
                gap: 6px;
            ">
                <span style="font-size: 1.1em;">${icon}</span>
                <span>${name || type}</span>
            </div>
        `;
        if (gameItem.value !== undefined && gameItem.value !== name) {
            content += `
                <div style="margin-bottom:4px; color:#ccc; font-size:0.85em;">
                    <span style="color:#888;">Значение:</span> ${gameItem.value}
                </div>
            `;
        }
        if (gameItem.description) {
            content += `
                <div style="margin-bottom:4px; color:#ccc; font-size:0.8em; font-style:italic; padding:4px; background:rgba(0,0,0,0.3); border-left:2px solid #fbc531;">
                    ${gameItem.description}
                </div>
            `;
        }
        if (gameItem.duration !== undefined) {
            content += `
                <div style="margin-bottom:3px; color:#fbc531; font-size:0.85em; display:flex; align-items:center; gap:4px;">
                    <i class="fas fa-clock"></i> Длительность: <strong>${gameItem.duration}</strong> ход.
                </div>
            `;
        }
        const extra = Object.keys(gameItem).filter(k => !['id','value','description','duration'].includes(k));
        if (extra.length) {
            content += '<div style="margin-top:4px; padding-top:4px; border-top:1px solid #333;">';
            extra.forEach(f => {
                const v = gameItem[f];
                if (v != null) content += `<div style="font-size:0.8em; color:#999;"><span style="color:#666;">${f}:</span> ${JSON.stringify(v)}</div>`;
            });
            content += '</div>';
        }
        tooltip.innerHTML = content;
        tooltip.style.cssText = `
            position: fixed;
            background: ${config.BACKGROUND};
            border: ${config.BORDER};
            border-radius: ${config.BORDER_RADIUS};
            padding: ${config.PADDING};
            max-width: ${config.MAX_WIDTH};
            z-index: 10000;
            pointer-events: none;
            box-shadow: ${config.BOX_SHADOW};
            animation: tooltipFadeIn ${this.config.ANIMATIONS.TOOLTIP_FADE_IN};
            font-family: ${fontConfig.FAMILY};
            letter-spacing: ${fontConfig.LETTER_SPACING};
            font-size: ${config.FONT_SIZE};
            line-height: ${config.LINE_HEIGHT};
            backdrop-filter: blur(5px);
        `;
        document.body.appendChild(tooltip);
        const rect = element.getBoundingClientRect();
        const tooltipRect = tooltip.getBoundingClientRect();
        let left = rect.left + window.scrollX;
        let top = rect.bottom + window.scrollY + 8;
        if (left + tooltipRect.width > window.innerWidth) left = window.innerWidth - tooltipRect.width - 10;
        if (left < 10) left = 10;
        if (top + tooltipRect.height > window.innerHeight + window.scrollY) {
            top = rect.top + window.scrollY - tooltipRect.height - 8;
        }
        if (top < window.scrollY) top = window.scrollY + 10;
        tooltip.style.left = left + 'px';
        tooltip.style.top = top + 'px';
        const remove = () => {
            if (tooltip && tooltip.parentNode) {
                tooltip.classList.add('fade-out');
                setTimeout(() => tooltip.remove(), 200);
            }
            document.removeEventListener('click', remove);
        };
        setTimeout(() => document.addEventListener('click', remove), 100);
        setTimeout(remove, 7000);
    }

    forceUpdate() {
        console.log('🔄 Принудительное обновление');
        this.renderAll();
    }

    destroy() {
        State.off(State.EVENTS.HERO_CHANGED, this.handleHeroChanged);
        State.off(State.EVENTS.TURN_COMPLETED, this.handleTurnCompleted);
        State.off(State.EVENTS.SCENE_CHANGED, this.handleSceneChanged);
        delete window.showOrganizationHierarchy;
        delete window.showGameItemTooltip;
        this.containers = {};
        this.renderCache.clear();
        if (this.currentHierarchyModal) {
            this.currentHierarchyModal.remove();
            this.currentHierarchyModal = null;
        }
        console.log('🗑️ GameItemUIManager уничтожен');
    }
}

export const GameItemUI = new GameItemUIManager();
