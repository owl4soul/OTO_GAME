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
        FAMILY: "'Nunito Sans', 'Unbounded', 'Exo 2', 'Aldrich', 'Courier New', monospace",
        
        // URL для импорта веб-шрифтов
        IMPORT_URLS: [
            "https://fonts.googleapis.com/css2?family=Orbitron:wght@400;500;600;700;800;900&display=swap",
            "https://fonts.googleapis.com/css2?family=Rajdhani:wght@400;500;600;700&display=swap",
            "https://fonts.googleapis.com/css2?family=Exo+2:wght@400;500;600;700&display=swap",
            "https://fonts.googleapis.com/css2?family=Aldrich&display=swap",
            "https://fonts.googleapis.com/css2?family=Nunito+Sans:wght@200..1000&display=swap",
            "https://fonts.googleapis.com/css2?family=Unbounded:wght@200..900&display=swap"
        ],
        
        // Настройки общих размеров (используются по умолчанию)
        TITLE_SIZE: "1em", // Размер заголовков блоков
        TEXT_SIZE: "0.85em", // Размер основного текста
        LINE_HEIGHT: "0.9", // Межстрочный интервал
        LETTER_SPACING: "0.5px" // Межбуквенный интервал
    },
    
    // НАСТРОЙКИ АНИМАЦИЙ И ЭФФЕКТОВ
    ANIMATIONS: {
        TOOLTIP_FADE_IN: "0.2s ease-out",
        TOOLTIP_FADE_OUT: "0.2s ease-out",
        STAT_PULSE: "0.5s ease-in-out",
        FLY_UP: "1s ease-out",
        HOVER_TRANSITION: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)"
    },
    
    // НАСТРОЙКИ ЦВЕТОВ
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
    
    // НАСТРОЙКИ РЕНДЕРА ОТДЕЛЬНЫХ БЛОКОВ GAME_ITEM
    TYPES: {
        // ЛИЧНОСТЬ - ЖЁЛТЫЙ (ВСЕГДА ОТОБРАЖАЕТСЯ)
        PERSONALITY: {
            TITLE: "ЛИЧНОСТЬ",
            ICON: "fas fa-user-circle",
            PRIORITY: 100,
            ALWAYS_VISIBLE: true,
            
            // ЦВЕТА (разные оттенки для заголовка и контента)
            COLORS: {
                TITLE: "#fbc531", // Яркий золотой для заголовка
                CONTENT: "#ffd166", // Светло-золотой для контента
                BORDER: "#4a3a0a", // Тёмно-коричневый для границ
                BACKGROUND: "linear-gradient(135deg, #2a220a 0%, #1a1805 100%)"
            },
            
            // ШРИФТЫ
            FONTS: {
                TITLE_SIZE: "0.95em",
                TEXT_SIZE: "0.95em",
                LINE_HEIGHT: "1.5",
                FONT_STYLE: "italic",
                WEIGHT: "500"
            },
            
            // РАЗМЕРЫ И ОТСТУПЫ
            PADDING: "6px 0",
            MARGIN: "0 0 10px 0"
        },
        
        // ТИПОЛОГИЯ - ЗЕЛЁНЫЙ (ВСЕГДА ОТОБРАЖАЕТСЯ)
        TYPOLOGY: {
            TITLE: "ТИПОЛОГИЯ",
            ICON: "fas fa-fingerprint",
            PRIORITY: 95,
            ALWAYS_VISIBLE: true,
            
            // ЦВЕТА (разные оттенки)
            COLORS: {
                TITLE: "#4cd137", // Яркий зеленый для заголовка
                CONTENT: "#7bed9f", // Светло-зеленый для контента
                BORDER: "#2d8b57", // Темно-зеленый для границ
                BACKGROUND: "linear-gradient(135deg, #0a2a0a 0%, #051a05 100%)"
            },
            
            // ШРИФТЫ
            FONTS: {
                TITLE_SIZE: "0.95em",
                TEXT_SIZE: "0.95em",
                LINE_HEIGHT: "1.5",
                FONT_STYLE: "italic",
                WEIGHT: "500"
            }
        },
        
        // ОРГАНИЗАЦИИ - ЗОЛОТОЙ (ВСЕГДА ОТОБРАЖАЕТСЯ)
        ORGANIZATION: {
            TITLE: "ОРГАНИЗАЦИИ",
            ICON: "fas fa-users",
            PRIORITY: 85,
            ALWAYS_VISIBLE: true,
            
            // ЦВЕТА (разные оттенки золотого)
            COLORS: {
                TITLE: "#d4af37", // Яркий золотой для заголовка
                CONTENT: "#fbc531", // Светло-золотой для контента
                BORDER: "#8b4513", // Коричневый для границ
                ACCENT: "#ffd700", // Жёлтый для акцентов
                BACKGROUND: "linear-gradient(135deg, #2a1a05 0%, #1a0d02 100%)",
                BADGE_BG: "linear-gradient(135deg, #3a2a05 0%, #2a1a02 100%)"
            },
            
            // ШРИФТЫ
            FONTS: {
                TITLE_SIZE: "0.95em",
                TEXT_SIZE: "0.95em",
                BADGE_TEXT_SIZE: "0.85em",
                HINT_TEXT_SIZE: "0.7em",
                WEIGHT: "600"
            }
        },
        
        // ОТНОШЕНИЯ - РОЗОВЫЙ/ФИОЛЕТОВЫЙ
        RELATIONS: {
            TITLE: "ОТНОШЕНИЯ",
            ICON: "fas fa-users",
            PRIORITY: 90,
            ALWAYS_VISIBLE: false,
            
            // ЦВЕТА (разные оттенки розового/фиолетового)
            COLORS: {
                TITLE: "#ff9ff3", // Яркий розовый для заголовка
                CONTENT: "#ffccf2", // Светло-розовый для контента
                BORDER: "#6a2a5a", // Темно-фиолетовый для границ
                BADGE: "#ff6bc9", // Розовый для бейджей
                BACKGROUND: "linear-gradient(135deg, #2a0a2a 0%, #1a051a 100%)",
                BADGE_BG: "linear-gradient(135deg, #3a0a3a 0%, #2a052a 100%)"
            },
            
            // ШРИФТЫ
            FONTS: {
                TITLE_SIZE: "0.95em",
                TEXT_SIZE: "0.95em",
                BADGE_TEXT_SIZE: "0.85em",
                VALUE_SIZE: "0.9em",
                WEIGHT: "500"
            }
        },
        
        // НАВЫКИ - ТЁМНО-ФИОЛЕТОВЫЙ
        SKILLS: {
            TITLE: "НАВЫКИ",
            ICON: "fas fa-scroll",
            PRIORITY: 85,
            ALWAYS_VISIBLE: false,
            
            // ЦВЕТА (разные оттенки фиолетового)
            COLORS: {
                TITLE: "#6c5ce7", // Яркий фиолетовый для заголовка
                CONTENT: "#a29bfe", // Светло-фиолетовый для контента
                BORDER: "#3a2a6a", // Темно-фиолетовый для границ
                BADGE: "#8c7ae6", // Фиолетовый для бейджей
                BACKGROUND: "linear-gradient(135deg, #0a0a2a 0%, #05051a 100%)",
                BADGE_BG: "linear-gradient(135deg, #1a0a3a 0%, #0a052a 100%)"
            },
            
            // ШРИФТЫ
            FONTS: {
                TITLE_SIZE: "0.95em",
                TEXT_SIZE: "0.95em",
                BADGE_TEXT_SIZE: "0.9em",
                WEIGHT: "500"
            }
        },
        
        // +/- К СТАТАМ - СИНИЙ
        STAT_BUFFS: {
            TITLE: "+/- К СТАТАМ",
            ICON: "fas fa-tachometer-alt",
            PRIORITY: 80,
            ALWAYS_VISIBLE: false,
            
            // ЦВЕТА (разные оттенки синего)
            COLORS: {
                TITLE: "#3498db", // Яркий синий для заголовка
                CONTENT: "#74b9ff", // Светло-синий для контента
                BORDER: "#1a4a7a", // Темно-синий для границ
                BUFF: "#4cd137", // Зеленый для баффов
                DEBUFF: "#e84118", // Красный для дебаффов
                BACKGROUND: "linear-gradient(135deg, #0a1a2a 0%, #051025 100%)",
                BADGE_BG_BUFF: "linear-gradient(135deg, #0a2a1a 0%, #051a10 100%)",
                BADGE_BG_DEBUFF: "linear-gradient(135deg, #2a0a1a 0%, #1a050d 100%)"
            },
            
            // ШРИФТЫ
            FONTS: {
                TITLE_SIZE: "0.95em",
                TEXT_SIZE: "0.95em",
                BADGE_TEXT_SIZE: "0.85em",
                DURATION_SIZE: "0.75em",
                WEIGHT: "600"
            }
        },
        
        // БЛАГОСЛОВЕНИЯ - СЕРЕБРЯНЫЙ
        BLESSINGS: {
            TITLE: "БЛАГОСЛОВЕНИЯ",
            ICON: "fas fa-star",
            PRIORITY: 75,
            ALWAYS_VISIBLE: false,
            
            // ЦВЕТА (разные оттенки серебряного/белого)
            COLORS: {
                TITLE: "#bdc3c7", // Серебряный для заголовка
                CONTENT: "#dfe6e9", // Светло-серебряный для контента
                BORDER: "#6a6a6a", // Серый для границ
                BADGE: "#f5f6fa", // Белый для бейджей
                BACKGROUND: "linear-gradient(135deg, #2a2a2a 0%, #1a1a1a 100%)",
                BADGE_BG: "linear-gradient(135deg, #3a3a3a 0%, #2a2a2a 100%)"
            },
            
            // ШРИФТЫ
            FONTS: {
                TITLE_SIZE: "0.95em",
                TEXT_SIZE: "0.95em",
                BADGE_TEXT_SIZE: "0.9em",
                DURATION_SIZE: "0.75em",
                WEIGHT: "500"
            }
        },
        
        // ПРОКЛЯТИЯ - КРАСНЫЙ
        CURSES: {
            TITLE: "ПРОКЛЯТИЯ",
            ICON: "fas fa-skull-crossbones",
            PRIORITY: 70,
            ALWAYS_VISIBLE: false,
            
            // ЦВЕТА (разные оттенки красного)
            COLORS: {
                TITLE: "#ff3838", // Яркий красный для заголовка
                CONTENT: "#ff7675", // Светло-красный для контента
                BORDER: "#8a0a0a", // Темно-красный для границ
                BADGE: "#ff6b6b", // Красный для бейджей
                BACKGROUND: "linear-gradient(135deg, #2a0000 0%, #1a0000 100%)",
                BADGE_BG: "linear-gradient(135deg, #3a0a0a 0%, #2a0505 100%)"
            },
            
            // ШРИФТЫ
            FONTS: {
                TITLE_SIZE: "0.95em",
                TEXT_SIZE: "0.95em",
                BADGE_TEXT_SIZE: "0.9em",
                DURATION_SIZE: "0.75em",
                WEIGHT: "600"
            }
        },
        
        // БАФФЫ/ДЕБАФФЫ - ГОЛУБОЙ
        BUFFS_DEBUFFS: {
            TITLE: "БАФФЫ/ДЕБАФФЫ",
            ICON: "fas fa-chart-line",
            PRIORITY: 65,
            ALWAYS_VISIBLE: true,
            
            // ЦВЕТА (разные оттенки голубого)
            COLORS: {
                TITLE: "#00cec9", // Яркий голубой для заголовка
                CONTENT: "#81ecec", // Светло-голубой для контента
                BORDER: "#0a4a4a", // Темно-голубой для границ
                BUFF: "#4cd137", // Зеленый для баффов
                DEBUFF: "#e84118", // Красный для дебаффов
                BACKGROUND: "linear-gradient(135deg, #0a2a2a 0%, #051a1a 100%)",
                BADGE_BG_BUFF: "linear-gradient(135deg, #0a2a1a 0%, #051a10 100%)",
                BADGE_BG_DEBUFF: "linear-gradient(135deg, #2a0a1a 0%, #1a050d 100%)"
            },
            
            // ШРИФТЫ
            FONTS: {
                TITLE_SIZE: "0.95em",
                TEXT_SIZE: "0.95em",
                BADGE_TEXT_SIZE: "0.85em",
                DURATION_SIZE: "0.75em",
                WEIGHT: "500"
            }
        },
        
        // ДЕТАЛИ - ГОЛУБОЙ
        DETAILS: {
            TITLE: "ДЕТАЛИ",
            ICON: "fas fa-info-circle",
            PRIORITY: 60,
            ALWAYS_VISIBLE: false,
            
            // ЦВЕТА (разные оттенки бирюзового)
            COLORS: {
                TITLE: "#00cec9", // Бирюзовый для заголовка
                CONTENT: "#55efc4", // Светло-бирюзовый для контента
                BORDER: "#0a4a4a", // Темно-бирюзовый для границ
                BADGE: "#00b894", // Зелено-бирюзовый для бейджей
                BACKGROUND: "linear-gradient(135deg, #0a2a2a 0%, #051a1a 100%)",
                BADGE_BG: "linear-gradient(135deg, #0a3a2a 0%, #052a1a 100%)"
            },
            
            // ШРИФТЫ
            FONTS: {
                TITLE_SIZE: "0.95em",
                TEXT_SIZE: "0.95em",
                BADGE_TEXT_SIZE: "0.85em",
                WEIGHT: "400"
            }
        },
        
        // ИНВЕНТАРЬ - КОРИЧНЕВЫЙ
        INVENTORY: {
            TITLE: "ИНВЕНТАРЬ",
            ICON: "fas fa-box",
            PRIORITY: 55,
            ALWAYS_VISIBLE: false,
            
            // ЦВЕТА (разные оттенки коричневого)
            COLORS: {
                TITLE: "#8b4513", // Коричневый для заголовка
                CONTENT: "#d2691e", // Светло-коричневый для контента
                BORDER: "#4a2a0a", // Темно-коричневый для границ
                BADGE: "#cd853f", // Светло-коричневый для бейджей
                BACKGROUND: "linear-gradient(135deg, #2a1a0a 0%, #1a0d05 100%)",
                BADGE_BG: "linear-gradient(135deg, #3a2a0a 0%, #2a1a05 100%)"
            },
            
            // ШРИФТЫ
            FONTS: {
                TITLE_SIZE: "0.95em",
                TEXT_SIZE: "0.95em",
                BADGE_TEXT_SIZE: "0.95em",
                WEIGHT: "600"
            }
        }
    },
    
    // НАСТРОЙКИ ТУЛТИПОВ
    TOOLTIPS: {
        BACKGROUND: "linear-gradient(135deg, #1a0a0a 0%, #0d0505 100%)",
        BORDER: "1px solid #fbc53160",
        MAX_WIDTH: "300px",
        PADDING: "12px 14px",
        BORDER_RADIUS: "6px",
        BOX_SHADOW: "0 0 25px #fbc53130, 0 6px 12px rgba(0,0,0,0.8)",
        FONT_SIZE: "0.85em",
        LINE_HEIGHT: "1.5"
    },
    
    // НАСТРОЙКИ МОДАЛЬНЫХ ОКОН
    MODALS: {
        BACKGROUND: "rgba(0,0,0,0.97)",
        CONTENT_BG: "#111111",
        BORDER: "1px solid #d4af37",
        BORDER_RADIUS: "10px",
        BOX_SHADOW: "0 0 30px rgba(212, 175, 55, 0.4)",
        HEADER_BG: "#1a1a1a",
        TITLE_SIZE: "0.95em",
        CLOSE_COLOR: "#d4af37"
    },
    
    // НАСТРОЙКИ БЕЙДЖЕЙ
    BADGES: {
        PADDING: "2px 4px",
        MARGIN: "3px",
        BORDER_RADIUS: "5px",
        BORDER_WIDTH: "1px",
        FONT_SIZE: "0.9em",
        TRANSITION: "all 0.3s ease",
        HOVER_TRANSFORM: "translateY(-2px)",
        HOVER_SHADOW: "0 3px 3px rgba(0,0,0,0.4)"
    }
};

// ============================================================================
// КЛАСС GAMEITEM UI MANAGER
// ============================================================================

class GameItemUIManager {
    constructor() {
        console.log('🔧 GameItemUIManager: конструктор вызван');
        
        // Конфигурация
        this.config = GAME_ITEM_UI_CONFIG;
        
        // DOM элементы для каждого типа game item
        this.containers = {};
        // Конфигурация отображения для каждого типа
        this.typeConfigs = {};
        // Кэш для оптимизации рендеринга
        this.renderCache = new Map();
        // Последний отрендеренный ход
        this.lastRenderedTurn = 0;
        // Инициализируем
        this.initialized = false;
        // Ссылка на текущую модалку иерархии (для предотвращения дублирования)
        this.currentHierarchyModal = null;
        
        // ПЕРВОЕ: инициализируем typeConfigs ПЕРЕД использованием
        this.initializeTypeConfigs();
    }
    
    /**
     * Инициализация конфигурации типов
     */
    initializeTypeConfigs() {
        console.log('🔧 GameItemUIManager: инициализация конфигурации типов');
        
        const config = this.config;
        const fontConfig = config.FONTS;
        
        this.typeConfigs = {
            // ЛИЧНОСТЬ
            'personality': {
                containerId: 'personalityBlockContainer',
                title: config.TYPES.PERSONALITY.TITLE,
                icon: config.TYPES.PERSONALITY.ICON,
                colors: config.TYPES.PERSONALITY.COLORS,
                fonts: config.TYPES.PERSONALITY.FONTS,
                renderFunction: () => this.renderPersonality(),
                priority: config.TYPES.PERSONALITY.PRIORITY,
                alwaysVisible: config.TYPES.PERSONALITY.ALWAYS_VISIBLE,
                fontFamily: fontConfig.FAMILY,
                padding: config.TYPES.PERSONALITY.PADDING || '4px 0',
                margin: config.TYPES.PERSONALITY.MARGIN || '0 0 8px 0'
            },
            
            // ТИПОЛОГИЯ
            'typology': {
                containerId: 'typologyContainer',
                title: config.TYPES.TYPOLOGY.TITLE,
                icon: config.TYPES.TYPOLOGY.ICON,
                colors: config.TYPES.TYPOLOGY.COLORS,
                fonts: config.TYPES.TYPOLOGY.FONTS,
                renderFunction: () => this.renderTypology(),
                priority: config.TYPES.TYPOLOGY.PRIORITY,
                alwaysVisible: config.TYPES.TYPOLOGY.ALWAYS_VISIBLE,
                fontFamily: fontConfig.FAMILY
            },
            
            // ОРГАНИЗАЦИИ
            'organization': {
                containerId: 'organizationsContainer',
                title: config.TYPES.ORGANIZATION.TITLE,
                icon: config.TYPES.ORGANIZATION.ICON,
                colors: config.TYPES.ORGANIZATION.COLORS,
                fonts: config.TYPES.ORGANIZATION.FONTS,
                renderFunction: () => this.renderOrganizations(),
                priority: config.TYPES.ORGANIZATION.PRIORITY,
                alwaysVisible: config.TYPES.ORGANIZATION.ALWAYS_VISIBLE,
                fontFamily: fontConfig.FAMILY
            },
            
            // ОТНОШЕНИЯ
            'relations': {
                containerId: 'relationsContainer',
                title: config.TYPES.RELATIONS.TITLE,
                icon: config.TYPES.RELATIONS.ICON,
                colors: config.TYPES.RELATIONS.COLORS,
                fonts: config.TYPES.RELATIONS.FONTS,
                renderFunction: () => this.renderRelations(),
                priority: config.TYPES.RELATIONS.PRIORITY,
                alwaysVisible: config.TYPES.RELATIONS.ALWAYS_VISIBLE,
                fontFamily: fontConfig.FAMILY
            },
            
            // НАВЫКИ
            'skill': {
                containerId: 'skillsContainer',
                title: config.TYPES.SKILLS.TITLE,
                icon: config.TYPES.SKILLS.ICON,
                colors: config.TYPES.SKILLS.COLORS,
                fonts: config.TYPES.SKILLS.FONTS,
                renderFunction: () => this.renderSkills(),
                priority: config.TYPES.SKILLS.PRIORITY,
                alwaysVisible: config.TYPES.SKILLS.ALWAYS_VISIBLE,
                fontFamily: fontConfig.FAMILY
            },
            
            // +/- К СТАТАМ
            'stat_buffs': {
                containerId: 'statBuffsContainer',
                title: config.TYPES.STAT_BUFFS.TITLE,
                icon: config.TYPES.STAT_BUFFS.ICON,
                colors: config.TYPES.STAT_BUFFS.COLORS,
                fonts: config.TYPES.STAT_BUFFS.FONTS,
                renderFunction: () => this.renderStatBuffs(),
                priority: config.TYPES.STAT_BUFFS.PRIORITY,
                alwaysVisible: config.TYPES.STAT_BUFFS.ALWAYS_VISIBLE,
                fontFamily: fontConfig.FAMILY
            },
            
            // БЛАГОСЛОВЕНИЯ
            'bless': {
                containerId: 'blessingsContainer',
                title: config.TYPES.BLESSINGS.TITLE,
                icon: config.TYPES.BLESSINGS.ICON,
                colors: config.TYPES.BLESSINGS.COLORS,
                fonts: config.TYPES.BLESSINGS.FONTS,
                renderFunction: () => this.renderBlessings(),
                priority: config.TYPES.BLESSINGS.PRIORITY,
                alwaysVisible: config.TYPES.BLESSINGS.ALWAYS_VISIBLE,
                fontFamily: fontConfig.FAMILY
            },
            
            // ПРОКЛЯТИЯ
            'curse': {
                containerId: 'cursesContainer',
                title: config.TYPES.CURSES.TITLE,
                icon: config.TYPES.CURSES.ICON,
                colors: config.TYPES.CURSES.COLORS,
                fonts: config.TYPES.CURSES.FONTS,
                renderFunction: () => this.renderCurses(),
                priority: config.TYPES.CURSES.PRIORITY,
                alwaysVisible: config.TYPES.CURSES.ALWAYS_VISIBLE,
                fontFamily: fontConfig.FAMILY
            },
            
            // БАФФЫ/ДЕБАФФЫ
            'buff_debuff': {
                containerId: 'buffsDebuffsContainer',
                title: config.TYPES.BUFFS_DEBUFFS.TITLE,
                icon: config.TYPES.BUFFS_DEBUFFS.ICON,
                colors: config.TYPES.BUFFS_DEBUFFS.COLORS,
                fonts: config.TYPES.BUFFS_DEBUFFS.FONTS,
                renderFunction: () => this.renderBuffsDebuffs(),
                priority: config.TYPES.BUFFS_DEBUFFS.PRIORITY,
                alwaysVisible: config.TYPES.BUFFS_DEBUFFS.ALWAYS_VISIBLE,
                fontFamily: fontConfig.FAMILY
            },
            
            // ДЕТАЛИ
            'details': {
                containerId: 'detailsContainer',
                title: config.TYPES.DETAILS.TITLE,
                icon: config.TYPES.DETAILS.ICON,
                colors: config.TYPES.DETAILS.COLORS,
                fonts: config.TYPES.DETAILS.FONTS,
                renderFunction: () => this.renderDetails(),
                priority: config.TYPES.DETAILS.PRIORITY,
                alwaysVisible: config.TYPES.DETAILS.ALWAYS_VISIBLE,
                fontFamily: fontConfig.FAMILY
            },
            
            // ИНВЕНТАРЬ
            'inventory': {
                containerId: 'inventoryContainer',
                title: config.TYPES.INVENTORY.TITLE,
                icon: config.TYPES.INVENTORY.ICON,
                colors: config.TYPES.INVENTORY.COLORS,
                fonts: config.TYPES.INVENTORY.FONTS,
                renderFunction: () => this.renderInventory(),
                priority: config.TYPES.INVENTORY.PRIORITY,
                alwaysVisible: config.TYPES.INVENTORY.ALWAYS_VISIBLE,
                fontFamily: fontConfig.FAMILY
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
        
        // Импортируем шрифты из конфига
        this.importFonts();
        
        // Находим и кэшируем DOM контейнеры
        this.cacheContainers();
        
        // Добавляем стили для анимаций тултипов
        this.addTooltipStyles();
        
        // Регистрируем глобальные функции ТОЛЬКО если они еще не существуют
        if (!window.showOrganizationHierarchy) {
            window.showOrganizationHierarchy = (orgId) => this.showOrganizationHierarchy(orgId);
            console.log('🌐 Глобальная функция showOrganizationHierarchy зарегистрирована');
        }
        
        if (!window.showGameItemTooltip) {
            window.showGameItemTooltip = (element, gameItem) => this.showGameItemTooltip(element, gameItem);
            console.log('🌐 Глобальная функция showGameItemTooltip зарегистрирована');
        }
        
        // Подписываемся на события изменений героя
        this.setupEventListeners();
        
        // Первоначальный рендеринг ВСЕХ контейнеров (даже пустых)
        this.renderAll();
        
        this.initialized = true;
        console.log('✅ GameItemUIManager инициализирован');
    }
    
    /**
     * Импортирует шрифты из конфига
     */
    importFonts() {
        const fontConfig = this.config.FONTS;
        if (!fontConfig?.IMPORT_URLS || !Array.isArray(fontConfig.IMPORT_URLS)) {
            console.log('📝 Шрифты из конфига не требуют импорта или не настроены');
            return;
        }
        
        // Проверяем, не добавлены ли уже эти шрифты
        const existingLinks = document.querySelectorAll('link[rel="stylesheet"][href*="fonts.googleapis.com"]');
        const existingUrls = Array.from(existingLinks).map(link => link.href);
        
        fontConfig.IMPORT_URLS.forEach(url => {
            if (existingUrls.some(existingUrl => existingUrl.includes(url))) {
                console.log(`📝 Шрифт уже импортирован: ${url}`);
                return;
            }
            
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = url;
            document.head.appendChild(link);
            console.log(`📝 Импортирован шрифт: ${url}`);
        });
    }
    
    /**
     * Добавляет CSS стили для анимаций тултипов
     */
    addTooltipStyles() {
        // Проверяем, не добавлены ли стили уже
        if (document.getElementById('gameitem-ui-styles')) return;
        
        const config = this.config;
        const animConfig = config.ANIMATIONS;
        const badgeConfig = config.BADGES;
        
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
                0% { 
                    opacity: 1;
                    transform: translateY(0) translateX(0);
                }
                100% { 
                    opacity: 0;
                    transform: translateY(-40px) translateX(15px);
                }
            }
            
            @keyframes badgeGlow {
                0% { box-shadow: 0 0 5px currentColor; }
                50% { box-shadow: 0 0 15px currentColor; }
                100% { box-shadow: 0 0 5px currentColor; }
            }
            
            /* Общие стили для всех game-item блоков */
            .game-item-section {
                font-family: ${config.FONTS.FAMILY};
                margin-bottom: 10px;
                display: block;
                background: ${config.COLORS.BACKGROUNDS.SECTION};
                border-radius: 8px;
                padding: 8px;
                border: 1px solid rgba(255,255,255,0.05);
                letter-spacing: ${config.FONTS.LETTER_SPACING};
            }
            
            .game-item-badge {
                cursor: help;
                transition: ${badgeConfig.TRANSITION};
                padding: ${badgeConfig.PADDING};
                margin: ${badgeConfig.MARGIN};
                border-radius: ${badgeConfig.BORDER_RADIUS};
                font-size: ${badgeConfig.FONT_SIZE};
                display: inline-block;
                border-width: ${badgeConfig.BORDER_WIDTH};
                border-style: solid;
                position: relative;
                overflow: hidden;
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
                transform: ${badgeConfig.HOVER_TRANSFORM};
                box-shadow: ${badgeConfig.HOVER_SHADOW};
                z-index: 10;
            }
            
            .game-item-badge:hover::before {
                left: 100%;
            }
            
            .organization-badge {
                cursor: pointer;
                transition: ${badgeConfig.TRANSITION};
                padding: ${badgeConfig.PADDING};
                margin: ${badgeConfig.MARGIN};
                border-radius: ${badgeConfig.BORDER_RADIUS};
                display: inline-block;
                border-width: ${badgeConfig.BORDER_WIDTH};
                border-style: solid;
                position: relative;
                overflow: hidden;
            }
            
            .organization-badge:hover {
                transform: ${badgeConfig.HOVER_TRANSFORM};
                box-shadow: ${badgeConfig.HOVER_SHADOW};
                animation: badgeGlow 2s infinite;
            }
            
            .game-item-tooltip {
                animation: tooltipFadeIn ${animConfig.TOOLTIP_FADE_IN};
                pointer-events: none;
                z-index: 10000;
                position: fixed;
            }
            
            .game-item-tooltip.fade-out {
                animation: tooltipFadeOut ${animConfig.TOOLTIP_FADE_OUT};
            }
            
            /* Стили для промышленного готического вида */
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
        console.log('🎨 Стили для GameItemUI добавлены');
    }
    
    /**
     * Кэширует DOM контейнеры для каждого типа
     */
    cacheContainers() {
        // Основной контейнер для всех game items
        this.mainContainer = document.getElementById('personalityDisplay')?.parentNode;
        if (!this.mainContainer) {
            console.error('❌ GameItemUIManager: Не найден основной контейнер для game items');
            // Создаем резервный контейнер если основной не найден
            this.createFallbackContainer();
            return;
        }
        
        console.log('📦 GameItemUIManager: Найден основной контейнер:', this.mainContainer.id);
        
        // Применяем основной шрифт к контейнеру
        this.mainContainer.style.fontFamily = this.config.FONTS.FAMILY;
        this.mainContainer.style.letterSpacing = this.config.FONTS.LETTER_SPACING;
        
        // Создаем DOM элементы для каждого типа, если их нет
        Object.values(this.typeConfigs).forEach(config => {
            // Удаляем существующий контейнер (очищаем старый)
            const existing = document.getElementById(config.containerId);
            if (existing) {
                existing.remove();
                console.log(`🗑️ Удален старый контейнер: ${config.containerId}`);
            }
            
            // Создаем новый контейнер с применением шрифта
            const container = document.createElement('div');
            container.id = config.containerId;
            container.className = 'game-item-section';
            container.style.cssText = `
                margin: ${config.margin || '0 0 8px 0'};
                display: block; 
                font-family: ${config.fontFamily};
                letter-spacing: ${this.config.FONTS.LETTER_SPACING};
            `;
            
            this.containers[config.containerId] = container;
            console.log(`📦 Создан контейнер: ${config.containerId}`);
        });
    }
    
    /**
     * Создает резервный контейнер если основной не найден
     */
    createFallbackContainer() {
        console.warn('⚠️ Создаем резервный контейнер для game items');
        this.mainContainer = document.createElement('div');
        this.mainContainer.id = 'gameItemsFallbackContainer';
        this.mainContainer.style.cssText = `
            position: relative; 
            width: 100%; 
            height: 100%; 
            overflow-y: auto;
            font-family: ${this.config.FONTS.FAMILY};
            letter-spacing: ${this.config.FONTS.LETTER_SPACING};
            padding: 10px;
            background: ${this.config.COLORS.BACKGROUNDS.DARK};
        `;
        document.body.appendChild(this.mainContainer);
    }
    
    /**
     * Создает базовый HTML для секции
     * @param {Object} config Конфигурация типа
     * @param {String} content HTML содержимое
     * @param {Number} count Количество элементов
     * @returns {String} HTML
     */
    createSectionHTML(config, content, count = 0) {
        const colors = config.colors;
        const fonts = config.fonts;
        
        return `
            <div class="section-header" style="
                color: ${colors.TITLE}; 
                border-bottom: 2px solid ${colors.BORDER}; 
                padding: 4px 0 6px 0; 
                margin-bottom: 6px; 
                font-size: ${fonts.TITLE_SIZE || this.config.FONTS.TITLE_SIZE}; 
                font-weight: ${fonts.WEIGHT || 'bold'};
                font-family: ${config.fontFamily};
                letter-spacing: ${this.config.FONTS.LETTER_SPACING};
                text-transform: uppercase;
                display: flex;
                align-items: center;
                gap: 8px;
                text-shadow: 0 1px 2px rgba(0,0,0,0.5);
            ">
                <i class="${config.icon}" style="font-size: 1.1em;"></i> 
                <span>${config.title}${count > 0 ? ` (${count})` : ''}</span>
            </div>
            <div class="section-content" style="
                padding: ${config.padding || '5px 0'}; 
                font-size: ${fonts.TEXT_SIZE || this.config.FONTS.TEXT_SIZE};
                font-family: ${config.fontFamily};
                letter-spacing: ${this.config.FONTS.LETTER_SPACING};
                line-height: ${fonts.LINE_HEIGHT || this.config.FONTS.LINE_HEIGHT};
                color: ${colors.CONTENT || colors.TITLE};
            ">
                ${content}
            </div>
        `;
    }
    
    /**
     * Настраивает подписки на события
     */
    setupEventListeners() {
        // Подписываемся на изменения героя (для немедленных обновлений)
        State.on(State.EVENTS.HERO_CHANGED, (data) => {
            console.log('🎯 GameItemUI: HERO_CHANGED событие', data);
            this.handleHeroChanged(data);
        });
        
        // Подписываемся на завершение хода (для гарантированного одного рендера за ход)
        State.on(State.EVENTS.TURN_COMPLETED, (data) => {
            this.handleTurnCompleted(data?.turnCount || State.getState().turnCount);
        });
        
        // Подписываемся на изменения сцены (для типологии)
        State.on(State.EVENTS.SCENE_CHANGED, (data) => {
            this.handleSceneChanged(data);
        });
        
        // Подписываемся на изменения организаций
        State.on(State.EVENTS.ORGANIZATION_JOINED, (data) => {
            console.log('🎯 GameItemUI: ORGANIZATION_JOINED событие', data);
            this.renderType(this.typeConfigs.organization);
        });
        
        State.on(State.EVENTS.ORGANIZATION_RANK_CHANGED, (data) => {
            console.log('🎯 GameItemUI: ORGANIZATION_RANK_CHANGED событие', data);
            this.renderType(this.typeConfigs.organization);
        });
        
        State.on(State.EVENTS.ORGANIZATION_HIERARCHY_UPDATED, (data) => {
            console.log('🎯 GameItemUI: ORGANIZATION_HIERARCHY_UPDATED событие', data);
            this.renderType(this.typeConfigs.organization);
        });
        
        console.log('🔗 GameItemUIManager: все подписки установлены');
    }
    
    /**
     * Обработчик изменения героя
     */
    handleHeroChanged(data) {
        const changedTypes = this.getChangedItemTypes(data.operations || []);
        
        if (changedTypes.length === 0 && !data.categories?.includes('typology')) {
            console.log('🔍 Нет изменений в game items, пропускаем рендеринг');
            return;
        }
        
        console.log('🔄 GameItemUI: обновление для типов:', changedTypes);
        
        changedTypes.forEach(type => {
            const config = Object.values(this.typeConfigs).find(c =>
                this.getTypeFromConfig(c) === type
            );
            if (config) {
                this.renderType(config);
            }
        });
        
        this.renderType(this.typeConfigs.organization);
    }
    
    /**
     * Обработчик изменения сцены
     */
    handleSceneChanged(data) {
        this.renderType(this.typeConfigs.typology);
        this.renderType(this.typeConfigs.personality);
    }
    
    /**
     * Обработчик завершения ходa
     */
    handleTurnCompleted(turnCount) {
        console.log(`🔄 GameItemUI: получен TURN_COMPLETED, ход ${turnCount}`);
        this.renderAll();
        this.lastRenderedTurn = turnCount;
        console.log('✅ GameItemUI: полный рендер выполнен после завершения хода');
    }
    
    /**
     * Определяет типы game items, которые изменились
     */
    getChangedItemTypes(operations) {
        const types = new Set();
        
        operations.forEach(op => {
            if (!op.id) return;
            
            const [prefix] = op.id.split(':');
            
            switch (prefix) {
                case 'personality':
                    types.add('personality');
                    break;
                case 'relations':
                    types.add('relations');
                    break;
                case 'skill':
                    types.add('skill');
                    break;
                case 'bless':
                    types.add('bless');
                    break;
                case 'curse':
                    types.add('curse');
                    break;
                case 'buff':
                case 'debuff':
                    const statName = op.id.split(':')[1];
                    if (['will', 'stealth', 'influence', 'sanity'].includes(statName)) {
                        types.add('stat_buffs');
                    } else {
                        types.add('buff_debuff');
                    }
                    break;
                case 'inventory':
                    types.add('inventory');
                    break;
                case 'organization_rank':
                    types.add('organization');
                    break;
                default:
                    const knownPrefixes = ['stat', 'skill', 'inventory', 'relations',
                        'bless', 'curse', 'buff', 'debuff',
                        'personality', 'initiation_degree', 'progress',
                        'organization_rank'
                    ];
                    if (!knownPrefixes.includes(prefix)) {
                        types.add('details');
                    }
                    break;
            }
        });
        
        return Array.from(types);
    }
    
    /**
     * Получает тип из конфигурации
     */
    getTypeFromConfig(config) {
        return Object.keys(this.typeConfigs).find(key => this.typeConfigs[key] === config);
    }
    
    /**
     * Рендерит все типы game items
     */
    renderAll() {
        console.log('🎨 GameItemUI: ПОЛНЫЙ рендеринг ВСЕХ game items...');
        
        const sortedTypes = Object.values(this.typeConfigs)
            .sort((a, b) => b.priority - a.priority);
        
        if (this.mainContainer) {
            this.mainContainer.innerHTML = '';
        } else {
            console.error('❌ Основной контейнер не найден при renderAll');
            return;
        }
        
        sortedTypes.forEach(config => {
            this.renderType(config);
        });
        
        console.log('✅ GameItemUI: ВСЕ game items отрендерены');
    }
    
    /**
     * Рендерит конкретный тип game items
     */
    renderType(config) {
        try {
            if (!this.containers[config.containerId]) {
                console.warn(`⚠️ Контейнер ${config.containerId} не найден в кэше`);
                return;
            }
            
            const html = config.renderFunction();
            this.containers[config.containerId].innerHTML = html || '';
            
            if (!this.containers[config.containerId].parentNode) {
                this.mainContainer.appendChild(this.containers[config.containerId]);
            }
            
            const shouldShow = config.alwaysVisible || html.trim() !== '';
            this.containers[config.containerId].style.display = shouldShow ? 'block' : 'none';
            
            if (shouldShow) {
                console.log(`👁️ Контейнер ${config.containerId} отображен`);
            }
            
        } catch (error) {
            console.error(`❌ Ошибка при рендеринге типа ${config.containerId}:`, error);
            this.containers[config.containerId].innerHTML = `
                <div style="color: #ff3838; font-size: 0.9em; padding: 4px;">
                    <i class="fas fa-exclamation-triangle"></i> Ошибка отображения
                </div>
            `;
            this.containers[config.containerId].style.display = 'block';
        }
    }
    
    /**
     * Рендерит личность
     */
    renderPersonality() {
        try {
            const personalityVal = State.getGameItemValue('personality:hero');
            const config = this.typeConfigs.personality;
            const colors = config.colors;
            const fonts = config.fonts;
            
            if (personalityVal && personalityVal.trim() !== '' && personalityVal !== 'true') {
                return this.createSectionHTML(
                    config,
                    `<div style="
                        padding: 8px 4px; 
                        color: ${colors.CONTENT}; 
                        font-style: ${fonts.FONT_STYLE || 'italic'}; 
                        line-height: ${fonts.LINE_HEIGHT || '1.5'}; 
                        font-size: ${fonts.TEXT_SIZE || '1em'};
                        background: ${colors.BACKGROUND || 'transparent'};
                        border-radius: 4px;
                        border-left: 3px solid ${colors.TITLE};
                        padding-left: 10px;
                    ">
                        ${personalityVal}
                    </div>`
                );
            } else {
                return this.createSectionHTML(
                    config,
                    `<div style="
                        padding: 8px 4px; 
                        color: ${colors.CONTENT}88; 
                        font-style: ${fonts.FONT_STYLE || 'italic'};
                        font-size: ${fonts.TEXT_SIZE || '1em'};
                        background: ${colors.BACKGROUND || 'transparent'};
                        border-radius: 4px;
                        border-left: 3px solid ${colors.TITLE}88;
                        padding-left: 10px;
                    ">
                        <i class="fas fa-user-clock"></i> Личность ещё не определена...
                    </div>`
                );
            }
        } catch (error) {
            console.error('❌ Ошибка рендеринга личности:', error);
            return this.createSectionHTML(
                this.typeConfigs.personality,
                `<div style="padding: 8px 4px; color: #ff3838; font-style: italic;">
                    <i class="fas fa-exclamation-triangle"></i> Ошибка загрузки личности
                </div>`
            );
        }
    }
    
    /**
     * Рендерит типологию
     */
    renderTypology() {
        try {
            const state = State.getState();
            const currentScene = state.gameState.currentScene || {};
            const typologyText = currentScene.typology || '';
            const config = this.typeConfigs.typology;
            const colors = config.colors;
            const fonts = config.fonts;
            
            if (typologyText && typologyText.trim() !== '') {
                return this.createSectionHTML(
                    config,
                    `<div style="
                        padding: 8px 4px; 
                        color: ${colors.CONTENT}; 
                        font-style: ${fonts.FONT_STYLE || 'italic'}; 
                        line-height: ${fonts.LINE_HEIGHT || '1.5'}; 
                        font-size: ${fonts.TEXT_SIZE || '1em'};
                        background: ${colors.BACKGROUND || 'transparent'};
                        border-radius: 4px;
                        border-left: 3px solid ${colors.TITLE};
                        padding-left: 10px;
                    ">
                        ${typologyText}
                    </div>`
                );
            } else {
                return this.createSectionHTML(
                    config,
                    `<div style="
                        padding: 8px 4px; 
                        color: ${colors.CONTENT}88; 
                        font-style: ${fonts.FONT_STYLE || 'italic'};
                        font-size: ${fonts.TEXT_SIZE || '1em'};
                        background: ${colors.BACKGROUND || 'transparent'};
                        border-radius: 4px;
                        border-left: 3px solid ${colors.TITLE}88;
                        padding-left: 10px;
                    ">
                        <i class="fas fa-fingerprint"></i> Типология не определена...
                    </div>`
                );
            }
        } catch (error) {
            console.error('❌ Ошибка рендеринга типологии:', error);
            return this.createSectionHTML(
                this.typeConfigs.typology,
                `<div style="padding: 8px 4px; color: #ff3838; font-style: italic;">
                    <i class="fas fa-exclamation-triangle"></i> Ошибка загрузки типологии
                </div>`
            );
        }
    }
    
    /**
     * Рендерит организации
     */
    renderOrganizations() {
        try {
            const organizations = State.getHeroOrganizations();
            const config = this.typeConfigs.organization;
            const colors = config.colors;
            const fonts = config.fonts;
            let content = '';
            
            if (organizations.length > 0) {
                let orgsHTML = '';
                organizations.forEach(org => {
                    const orgId = org.id.toUpperCase();
                    
                    orgsHTML += `
                        <div class="organization-badge" 
                             onclick="showOrganizationHierarchy('${org.id}')"
                             style="
                                background: ${colors.BADGE_BG}; 
                                border: 2px solid ${colors.BORDER}40; 
                                border-left: 3px solid ${colors.TITLE};
                                color: ${colors.CONTENT};
                                font-family: ${config.fontFamily};
                                font-size: ${fonts.BADGE_TEXT_SIZE};
                                font-weight: ${fonts.WEIGHT};
                            ">
                            <span style="color: ${colors.TITLE}; font-size: 1.1em;">👥</span>
                            <span style="color: ${colors.CONTENT}; margin-left: 5px;">${orgId}</span>
                            <span style="color: ${colors.ACCENT || colors.TITLE}; margin-left: 8px; font-weight: bold;">${org.rankName}</span>
                            <span style="color: #888; font-size: ${fonts.HINT_TEXT_SIZE}; margin-left: 5px;">(клик)</span>
                        </div>
                    `;
                });
                
                content = `<div style="display: flex; flex-wrap: wrap; gap: 4px;">${orgsHTML}</div>`;
                
                content += `
                    <div style="
                        margin-top: 8px; 
                        padding: 6px; 
                        background: ${colors.BACKGROUND}80; 
                        border-radius: 4px;
                        border: 1px solid ${colors.BORDER}40;
                        font-family: ${config.fontFamily};
                    ">
                        <span style="color: ${colors.CONTENT}cc; font-size: ${fonts.HINT_TEXT_SIZE}; font-style: italic;">
                            <i class="fas fa-info-circle"></i> Кликните на организацию для просмотра полной иерархии
                        </span>
                    </div>
                `;
            } else {
                content = `
                    <div style="
                        padding: 10px; 
                        color: ${colors.CONTENT}88; 
                        font-style: italic;
                        font-family: ${config.fontFamily};
                        text-align: center;
                        background: ${colors.BACKGROUND};
                        border-radius: 4px;
                        border: 1px dashed ${colors.BORDER}40;
                    ">
                        <i class="fas fa-users-slash" style="font-size: 1.2em; color: ${colors.TITLE}88; margin-bottom: 5px; display: block;"></i>
                        <div>Герой не состоит в организациях...</div>
                    </div>
                    <div style="
                        margin-top: 8px; 
                        padding: 6px; 
                        background: ${colors.BACKGROUND}40; 
                        border-radius: 4px;
                        border: 1px dashed ${colors.BORDER}20;
                        font-family: ${config.fontFamily};
                    ">
                        <span style="color: ${colors.CONTENT}aa; font-size: ${fonts.HINT_TEXT_SIZE}; font-style: italic;">
                            <i class="fas fa-info-circle"></i> Организации будут появляться по мере развития сюжета
                        </span>
                    </div>
                `;
            }
            
            return this.createSectionHTML(
                config,
                content,
                organizations.length
            );
        } catch (error) {
            console.error('❌ Ошибка рендеринга организаций:', error);
            return this.createSectionHTML(
                this.typeConfigs.organization,
                `<div style="padding: 10px; color: #ff3838; font-style: italic; text-align: center;">
                    <i class="fas fa-exclamation-triangle"></i> Ошибка загрузки организаций
                </div>`
            );
        }
    }
    
    /**
     * Рендерит отношения
     */
    renderRelations() {
        try {
            const relationsItems = State.getGameItemsByType('relations:');
            const config = this.typeConfigs.relations;
            const colors = config.colors;
            const fonts = config.fonts;
            
            if (relationsItems.length > 0) {
                const getRelationColor = (value) => {
                    const normalized = Math.max(0, Math.min(100, (value + 100) / 2));
                    return this.getStatColor(normalized);
                };
                
                const getRelationEmoji = (value) => {
                    if (value >= 75) return '😍';
                    if (value >= 50) return '😊';
                    if (value >= 25) return '🙂';
                    if (value >= -25) return '😐';
                    if (value >= -50) return '😠';
                    if (value >= -75) return '😡';
                    return '💀';
                };
                
                let relationsHTML = '';
                
                relationsItems.forEach(rel => {
                    const name = rel.id.split(':')[1] || 'Unknown';
                    const value = rel.value !== undefined ? rel.value : 0;
                    const color = getRelationColor(value);
                    const emoji = getRelationEmoji(value);
                    const relData = JSON.stringify(rel).replace(/"/g, '&quot;');
                    
                    relationsHTML += `
                        <div class="game-item-badge" 
                             data-game-item='${relData}'
                             onclick="window.showGameItemTooltip(this, ${relData.replace(/'/g, "\\'")})"
                             style="
                                background: ${colors.BADGE_BG}; 
                                border: 2px solid ${colors.BADGE}40;
                                border-left: 3px solid ${colors.BADGE};
                                color: ${colors.CONTENT};
                                font-family: ${config.fontFamily};
                                font-size: ${fonts.BADGE_TEXT_SIZE};
                                font-weight: ${fonts.WEIGHT};
                            ">
                            <span style="font-size: 1.1em; filter: drop-shadow(0 1px 1px rgba(0,0,0,0.5));">${emoji}</span>
                            <span style="color: ${colors.BADGE}; margin: 0 6px; font-weight: bold;">${name}</span>
                            <span style="color: ${color}; font-size: ${fonts.VALUE_SIZE}; font-weight: bold; 
                                  background: rgba(0,0,0,0.3); padding: 1px 6px; border-radius: 3px; min-width: 30px; display: inline-block; text-align: center;">
                                ${value > 0 ? '+' : ''}${value}
                            </span>
                        </div>
                    `;
                });
                
                return this.createSectionHTML(
                    config,
                    `<div style="display: flex; flex-wrap: wrap; gap: 4px;">${relationsHTML}</div>`,
                    relationsItems.length
                );
            } else {
                return this.createSectionHTML(
                    config,
                    `<div style="
                        padding: 10px; 
                        color: ${colors.CONTENT}88; 
                        font-style: italic;
                        font-family: ${config.fontFamily};
                        text-align: center;
                        background: ${colors.BACKGROUND};
                        border-radius: 4px;
                        border: 1px dashed ${colors.BORDER}40;
                    ">
                        <i class="fas fa-user-friends" style="font-size: 1.2em; color: ${colors.TITLE}88; margin-bottom: 5px; display: block;"></i>
                        <div>Отношения ещё не установлены...</div>
                    </div>`,
                    0
                );
            }
        } catch (error) {
            console.error('❌ Ошибка рендеринга отношений:', error);
            return this.createSectionHTML(
                this.typeConfigs.relations,
                `<div style="padding: 10px; color: #ff3838; font-style: italic; text-align: center;">
                    <i class="fas fa-exclamation-triangle"></i> Ошибка загрузки отношений
                </div>`
            );
        }
    }
    
    /**
     * Рендерит навыки
     */
    renderSkills() {
        try {
            const skillsItems = State.getGameItemsByType('skill:');
            const config = this.typeConfigs.skill;
            const colors = config.colors;
            const fonts = config.fonts;
            
            if (skillsItems.length > 0) {
                let skillsHTML = '';
                
                skillsItems.forEach(skill => {
                    const name = skill.value || skill.id.split(':')[1];
                    const skillData = JSON.stringify(skill).replace(/"/g, '&quot;');
                    
                    skillsHTML += `
                        <div class="game-item-badge" 
                             data-game-item='${skillData}'
                             onclick="window.showGameItemTooltip(this, ${skillData.replace(/'/g, "\\'")})"
                             style="
                                background: ${colors.BADGE_BG}; 
                                border: 2px solid ${colors.BADGE}40;
                                border-left: 3px solid ${colors.BADGE};
                                color: ${colors.CONTENT};
                                font-family: ${config.fontFamily};
                                font-size: ${fonts.BADGE_TEXT_SIZE};
                                font-weight: ${fonts.WEIGHT};
                            ">
                            <span style="color: ${colors.BADGE}; font-size: 1.1em; margin-right: 5px;">📜</span>
                            <span style="color: ${colors.CONTENT};">${name}</span>
                        </div>
                    `;
                });
                
                return this.createSectionHTML(
                    config,
                    `<div style="display: flex; flex-wrap: wrap; gap: 4px;">${skillsHTML}</div>`,
                    skillsItems.length
                );
            } else {
                return this.createSectionHTML(
                    config,
                    `<div style="
                        padding: 10px; 
                        color: ${colors.CONTENT}88; 
                        font-style: italic;
                        font-family: ${config.fontFamily};
                        text-align: center;
                        background: ${colors.BACKGROUND};
                        border-radius: 4px;
                        border: 1px dashed ${colors.BORDER}40;
                    ">
                        <i class="fas fa-scroll" style="font-size: 1.2em; color: ${colors.TITLE}88; margin-bottom: 5px; display: block;"></i>
                        <div>Навыки ещё не получены...</div>
                    </div>`,
                    0
                );
            }
        } catch (error) {
            console.error('❌ Ошибка рендеринга навыков:', error);
            return this.createSectionHTML(
                this.typeConfigs.skill,
                `<div style="padding: 10px; color: #ff3838; font-style: italic; text-align: center;">
                    <i class="fas fa-exclamation-triangle"></i> Ошибка загрузки навыков
                </div>`
            );
        }
    }
    
    /**
     * Рендерит баффы/дебаффы к основным статам
     */
    renderStatBuffs() {
        try {
            const statBuffsItems = State.getGameItemsByType('buff:').filter(item => {
                const statName = item.id.split(':')[1];
                return ['will', 'stealth', 'influence', 'sanity'].includes(statName);
            });
            
            const statDebuffsItems = State.getGameItemsByType('debuff:').filter(item => {
                const statName = item.id.split(':')[1];
                return ['will', 'stealth', 'influence', 'sanity'].includes(statName);
            });
            
            const statBuffsDebuffs = [...statBuffsItems, ...statDebuffsItems];
            const config = this.typeConfigs.stat_buffs;
            const colors = config.colors;
            const fonts = config.fonts;
            
            if (statBuffsDebuffs.length > 0) {
                const getRussianStatName = (key) => {
                    const map = {
                        'will': 'Воля',
                        'stealth': 'Скрытность',
                        'influence': 'Влияние',
                        'sanity': 'Разум'
                    };
                    return map[key] || key;
                };
                
                let itemsHTML = '';
                
                statBuffsDebuffs.forEach(item => {
                    const isBuff = item.id.startsWith('buff:');
                    const statName = item.id.split(':')[1];
                    const russianName = getRussianStatName(statName);
                    const value = item.value || 0;
                    const sign = value > 0 ? '+' : '';
                    const duration = item.duration !== undefined ? `[${item.duration}]` : '';
                    const color = isBuff ? colors.BUFF : colors.DEBUFF;
                    const icon = isBuff ? '⬆️' : '⬇️';
                    const itemData = JSON.stringify(item).replace(/"/g, '&quot;');
                    const badgeBg = isBuff ? colors.BADGE_BG_BUFF : colors.BADGE_BG_DEBUFF;
                    
                    itemsHTML += `
                        <div class="game-item-badge" 
                             data-game-item='${itemData}'
                             onclick="window.showGameItemTooltip(this, ${itemData.replace(/'/g, "\\'")})"
                             style="
                                background: ${badgeBg}; 
                                border: 2px solid ${color}40;
                                border-left: 3px solid ${color};
                                color: ${colors.CONTENT};
                                font-family: ${config.fontFamily};
                                font-size: ${fonts.BADGE_TEXT_SIZE};
                                font-weight: ${fonts.WEIGHT};
                            ">
                            <span style="color: ${color}; font-size: 1.1em; margin-right: 5px;">${icon}</span>
                            <span style="color: ${colors.CONTENT};">${russianName}</span>
                            <span style="color: ${color}; margin: 0 5px; font-weight: bold;">${sign}${value}</span>
                            ${duration ? `<span style="color: #888; font-size: ${fonts.DURATION_SIZE}; margin-left: 4px; background: rgba(0,0,0,0.3); padding: 1px 4px; border-radius: 2px;">${duration}</span>` : ''}
                        </div>
                    `;
                });
                
                return this.createSectionHTML(
                    config,
                    `<div style="display: flex; flex-wrap: wrap; gap: 4px;">${itemsHTML}</div>`,
                    statBuffsDebuffs.length
                );
            } else {
                return this.createSectionHTML(
                    config,
                    `<div style="
                        padding: 10px; 
                        color: ${colors.CONTENT}88; 
                        font-style: italic;
                        font-family: ${config.fontFamily};
                        text-align: center;
                        background: ${colors.BACKGROUND};
                        border-radius: 4px;
                        border: 1px dashed ${colors.BORDER}40;
                    ">
                        <i class="fas fa-tachometer-alt" style="font-size: 1.2em; color: ${colors.TITLE}88; margin-bottom: 5px; display: block;"></i>
                        <div>Нет баффов/дебаффов к статам...</div>
                    </div>`,
                    0
                );
            }
        } catch (error) {
            console.error('❌ Ошибка рендеринга баффов к статам:', error);
            return this.createSectionHTML(
                this.typeConfigs.stat_buffs,
                `<div style="padding: 10px; color: #ff3838; font-style: italic; text-align: center;">
                    <i class="fas fa-exclamation-triangle"></i> Ошибка загрузки баффов к статам
                </div>`
            );
        }
    }
    
    /**
     * Рендерит благословения
     */
    renderBlessings() {
        try {
            const blessItems = State.getGameItemsByType('bless:');
            const config = this.typeConfigs.bless;
            const colors = config.colors;
            const fonts = config.fonts;
            
            if (blessItems.length > 0) {
                let blessHTML = '';
                
                blessItems.forEach(bless => {
                    const name = bless.value || bless.id.split(':')[1];
                    const duration = bless.duration !== undefined ? `[${bless.duration}]` : '';
                    const blessData = JSON.stringify(bless).replace(/"/g, '&quot;');
                    
                    blessHTML += `
                        <div class="game-item-badge" 
                             data-game-item='${blessData}'
                             onclick="window.showGameItemTooltip(this, ${blessData.replace(/'/g, "\\'")})"
                             style="
                                background: ${colors.BADGE_BG}; 
                                border: 2px solid ${colors.BADGE}40;
                                border-left: 3px solid ${colors.BADGE};
                                color: ${colors.CONTENT};
                                font-family: ${config.fontFamily};
                                font-size: ${fonts.BADGE_TEXT_SIZE};
                                font-weight: ${fonts.WEIGHT};
                            ">
                            <span style="color: ${colors.BADGE}; font-size: 1.1em; margin-right: 5px;">✨</span>
                            <span style="color: ${colors.CONTENT};">${name}</span>
                            ${duration ? `<span style="color: #888; font-size: ${fonts.DURATION_SIZE}; margin-left: 6px; background: rgba(0,0,0,0.3); padding: 1px 4px; border-radius: 2px;">${duration}</span>` : ''}
                        </div>
                    `;
                });
                
                return this.createSectionHTML(
                    config,
                    `<div style="display: flex; flex-wrap: wrap; gap: 4px;">${blessHTML}</div>`,
                    blessItems.length
                );
            } else {
                return this.createSectionHTML(
                    config,
                    `<div style="
                        padding: 10px; 
                        color: ${colors.CONTENT}88; 
                        font-style: italic;
                        font-family: ${config.fontFamily};
                        text-align: center;
                        background: ${colors.BACKGROUND};
                        border-radius: 4px;
                        border: 1px dashed ${colors.BORDER}40;
                    ">
                        <i class="fas fa-star" style="font-size: 1.2em; color: ${colors.TITLE}88; margin-bottom: 5px; display: block;"></i>
                        <div>Нет благословений...</div>
                    </div>`,
                    0
                );
            }
        } catch (error) {
            console.error('❌ Ошибка рендеринга благословений:', error);
            return this.createSectionHTML(
                this.typeConfigs.bless,
                `<div style="padding: 10px; color: #ff3838; font-style: italic; text-align: center;">
                    <i class="fas fa-exclamation-triangle"></i> Ошибка загрузки благословений
                </div>`
            );
        }
    }
    
    /**
     * Рендерит проклятия
     */
    renderCurses() {
        try {
            const curseItems = State.getGameItemsByType('curse:');
            const config = this.typeConfigs.curse;
            const colors = config.colors;
            const fonts = config.fonts;
            
            if (curseItems.length > 0) {
                let curseHTML = '';
                
                curseItems.forEach(curse => {
                    const name = curse.value || curse.id.split(':')[1];
                    const duration = curse.duration !== undefined ? `[${curse.duration}]` : '';
                    const curseData = JSON.stringify(curse).replace(/"/g, '&quot;');
                    
                    curseHTML += `
                        <div class="game-item-badge" 
                             data-game-item='${curseData}'
                             onclick="window.showGameItemTooltip(this, ${curseData.replace(/'/g, "\\'")})"
                             style="
                                background: ${colors.BADGE_BG}; 
                                border: 2px solid ${colors.BADGE}40;
                                border-left: 3px solid ${colors.BADGE};
                                color: ${colors.CONTENT};
                                font-family: ${config.fontFamily};
                                font-size: ${fonts.BADGE_TEXT_SIZE};
                                font-weight: ${fonts.WEIGHT};
                            ">
                            <span style="color: ${colors.BADGE}; font-size: 1.1em; margin-right: 5px; filter: drop-shadow(0 1px 1px rgba(255,0,0,0.5));">💀</span>
                            <span style="color: ${colors.CONTENT};">${name}</span>
                            ${duration ? `<span style="color: #888; font-size: ${fonts.DURATION_SIZE}; margin-left: 6px; background: rgba(0,0,0,0.3); padding: 1px 4px; border-radius: 2px;">${duration}</span>` : ''}
                        </div>
                    `;
                });
                
                return this.createSectionHTML(
                    config,
                    `<div style="display: flex; flex-wrap: wrap; gap: 4px;">${curseHTML}</div>`,
                    curseItems.length
                );
            } else {
                return this.createSectionHTML(
                    config,
                    `<div style="
                        padding: 10px; 
                        color: ${colors.CONTENT}88; 
                        font-style: italic;
                        font-family: ${config.fontFamily};
                        text-align: center;
                        background: ${colors.BACKGROUND};
                        border-radius: 4px;
                        border: 1px dashed ${colors.BORDER}40;
                    ">
                        <i class="fas fa-skull-crossbones" style="font-size: 1.2em; color: ${colors.TITLE}88; margin-bottom: 5px; display: block;"></i>
                        <div>Нет проклятий...</div>
                    </div>`,
                    0
                );
            }
        } catch (error) {
            console.error('❌ Ошибка рендеринга проклятий:', error);
            return this.createSectionHTML(
                this.typeConfigs.curse,
                `<div style="padding: 10px; color: #ff3838; font-style: italic; text-align: center;">
                    <i class="fas fa-exclamation-triangle"></i> Ошибка загрузки проклятий
                </div>`
            );
        }
    }
    
    /**
     * Рендерит остальные баффы/дебаффы
     */
    renderBuffsDebuffs() {
        try {
            const allBuffs = State.getGameItemsByType('buff:');
            const allDebuffs = State.getGameItemsByType('debuff:');
            
            const otherBuffs = allBuffs.filter(item => {
                const statName = item.id.split(':')[1];
                return !['will', 'stealth', 'influence', 'sanity'].includes(statName);
            });
            
            const otherDebuffs = allDebuffs.filter(item => {
                const statName = item.id.split(':')[1];
                return !['will', 'stealth', 'influence', 'sanity'].includes(statName);
            });
            
            const otherBuffsDebuffs = [...otherBuffs, ...otherDebuffs];
            const config = this.typeConfigs.buff_debuff;
            const colors = config.colors;
            const fonts = config.fonts;
            
            if (otherBuffsDebuffs.length > 0) {
                let itemsHTML = '';
                
                otherBuffsDebuffs.forEach(item => {
                    const isBuff = item.id.startsWith('buff:');
                    const statName = item.id.split(':')[1];
                    const value = item.value || 0;
                    const sign = value > 0 ? '+' : '';
                    const duration = item.duration !== undefined ? `[${item.duration}]` : '';
                    const color = isBuff ? colors.BUFF : colors.DEBUFF;
                    const icon = isBuff ? '⬆️' : '⬇️';
                    const itemData = JSON.stringify(item).replace(/"/g, '&quot;');
                    const badgeBg = isBuff ? colors.BADGE_BG_BUFF : colors.BADGE_BG_DEBUFF;
                    
                    itemsHTML += `
                        <div class="game-item-badge" 
                             data-game-item='${itemData}'
                             onclick="window.showGameItemTooltip(this, ${itemData.replace(/'/g, "\\'")})"
                             style="
                                background: ${badgeBg}; 
                                border: 2px solid ${color}40;
                                border-left: 3px solid ${color};
                                color: ${colors.CONTENT};
                                font-family: ${config.fontFamily};
                                font-size: ${fonts.BADGE_TEXT_SIZE};
                                font-weight: ${fonts.WEIGHT};
                            ">
                            <span style="color: ${color}; font-size: 1.1em; margin-right: 5px;">${icon}</span>
                            <span style="color: ${colors.CONTENT};">${statName}</span>
                            <span style="color: ${color}; margin: 0 5px; font-weight: bold;">${sign}${value}</span>
                            ${duration ? `<span style="color: #888; font-size: ${fonts.DURATION_SIZE}; background: rgba(0,0,0,0.3); padding: 1px 4px; border-radius: 2px;">${duration}</span>` : ''}
                        </div>
                    `;
                });
                
                return this.createSectionHTML(
                    config,
                    `<div style="display: flex; flex-wrap: wrap; gap: 4px;">${itemsHTML}</div>`,
                    otherBuffsDebuffs.length
                );
            } else {
                return this.createSectionHTML(
                    config,
                    `<div style="
                        padding: 10px; 
                        color: ${colors.CONTENT}88; 
                        font-style: italic;
                        font-family: ${config.fontFamily};
                        text-align: center;
                        background: ${colors.BACKGROUND};
                        border-radius: 4px;
                        border: 1px dashed ${colors.BORDER}40;
                    ">
                        <i class="fas fa-chart-line" style="font-size: 1.2em; color: ${colors.TITLE}88; margin-bottom: 5px; display: block;"></i>
                        <div>Нет других баффов/дебаффов...</div>
                    </div>`,
                    0
                );
            }
        } catch (error) {
            console.error('❌ Ошибка рендеринга других баффов/дебаффов:', error);
            return this.createSectionHTML(
                this.typeConfigs.buff_debuff,
                `<div style="padding: 10px; color: #ff3838; font-style: italic; text-align: center;">
                    <i class="fas fa-exclamation-triangle"></i> Ошибка загрузки баффов/дебаффов
                </div>`
            );
        }
    }
    
    /**
     * Рендерит детали (неизвестные game items)
     */
    renderDetails() {
        try {
            const knownPrefixes = [
                'stat:', 'skill:', 'inventory:', 'relations:', 'bless:', 'curse:',
                'buff:', 'debuff:', 'personality:', 'initiation_degree:', 'progress:',
                'organization_rank:'
            ];
            
            const state = State.getState();
            const allItems = state.heroState || [];
            
            const unknownItems = allItems.filter(item => {
                return !knownPrefixes.some(prefix => item.id.startsWith(prefix));
            });
            
            const config = this.typeConfigs.details;
            const colors = config.colors;
            const fonts = config.fonts;
            
            if (unknownItems.length > 0) {
                let detailsHTML = '';
                
                unknownItems.forEach(item => {
                    const [type, name] = item.id.split(':');
                    const displayName = item.value || name || item.id;
                    const duration = item.duration !== undefined ? `[${item.duration}]` : '';
                    const icon = Render.getGameItemIcon(item.id);
                    const itemData = JSON.stringify(item).replace(/"/g, '&quot;');
                    
                    detailsHTML += `
                        <div class="game-item-badge" 
                             data-game-item='${itemData}'
                             onclick="window.showGameItemTooltip(this, ${itemData.replace(/'/g, "\\'")})"
                             style="
                                background: ${colors.BADGE_BG}; 
                                border: 2px solid ${colors.BADGE}40;
                                border-left: 3px solid ${colors.BADGE};
                                color: ${colors.CONTENT};
                                font-family: ${config.fontFamily};
                                font-size: ${fonts.BADGE_TEXT_SIZE};
                                font-weight: ${fonts.WEIGHT};
                            ">
                            <span style="color: ${colors.BADGE}; font-size: 1.1em; margin-right: 5px;">${icon}</span>
                            <span style="color: ${colors.CONTENT};">${displayName}</span>
                            ${duration ? `<span style="color: #888; font-size: ${fonts.DURATION_SIZE}; margin-left: 6px; background: rgba(0,0,0,0.3); padding: 1px 4px; border-radius: 2px;">${duration}</span>` : ''}
                        </div>
                    `;
                });
                
                return this.createSectionHTML(
                    config,
                    `<div style="display: flex; flex-wrap: wrap; gap: 4px;">${detailsHTML}</div>`,
                    unknownItems.length
                );
            } else {
                return this.createSectionHTML(
                    config,
                    `<div style="
                        padding: 10px; 
                        color: ${colors.CONTENT}88; 
                        font-style: italic;
                        font-family: ${config.fontFamily};
                        text-align: center;
                        background: ${colors.BACKGROUND};
                        border-radius: 4px;
                        border: 1px dashed ${colors.BORDER}40;
                    ">
                        <i class="fas fa-info-circle" style="font-size: 1.2em; color: ${colors.TITLE}88; margin-bottom: 5px; display: block;"></i>
                        <div>Нет дополнительных деталей...</div>
                    </div>`,
                    0
                );
            }
        } catch (error) {
            console.error('❌ Ошибка рендеринга деталей:', error);
            return this.createSectionHTML(
                this.typeConfigs.details,
                `<div style="padding: 10px; color: #ff3838; font-style: italic; text-align: center;">
                    <i class="fas fa-exclamation-triangle"></i> Ошибка загрузки деталей
                </div>`
            );
        }
    }
    
    /**
     * Рендерит инвентарь
     */
    renderInventory() {
        try {
            const inventoryItems = State.getGameItemsByType('inventory:');
            const config = this.typeConfigs.inventory;
            const colors = config.colors;
            const fonts = config.fonts;
            
            if (inventoryItems.length > 0) {
                let inventoryHTML = '';
                
                inventoryItems.forEach(item => {
                    const name = item.value || item.id.split(':')[1];
                    const itemData = JSON.stringify(item).replace(/"/g, '&quot;');
                    
                    inventoryHTML += `
                        <div class="game-item-badge" 
                             data-game-item='${itemData}'
                             onclick="window.showGameItemTooltip(this, ${itemData.replace(/'/g, "\\'")})"
                             style="
                                background: ${colors.BADGE_BG}; 
                                border: 2px solid ${colors.BADGE}40;
                                border-left: 3px solid ${colors.BADGE};
                                color: ${colors.CONTENT};
                                font-family: ${config.fontFamily};
                                font-size: ${fonts.BADGE_TEXT_SIZE};
                                font-weight: ${fonts.WEIGHT};
                            ">
                            <span style="color: ${colors.BADGE}; font-size: 1.1em; margin-right: 5px;">🎒</span>
                            <span style="color: ${colors.CONTENT}; font-size: ${fonts.BADGE_TEXT_SIZE};">${name}</span>
                        </div>
                    `;
                });
                
                return this.createSectionHTML(
                    config,
                    `<div style="display: flex; flex-wrap: wrap; gap: 4px;">${inventoryHTML}</div>`,
                    inventoryItems.length
                );
            } else {
                return this.createSectionHTML(
                    config,
                    `<div style="
                        padding: 10px; 
                        color: ${colors.CONTENT}88; 
                        font-style: italic;
                        font-family: ${config.fontFamily};
                        text-align: center;
                        background: ${colors.BACKGROUND};
                        border-radius: 4px;
                        border: 1px dashed ${colors.BORDER}40;
                    ">
                        <i class="fas fa-box" style="font-size: 1.2em; color: ${colors.TITLE}88; margin-bottom: 5px; display: block;"></i>
                        <div>Инвентарь пуст...</div>
                    </div>`,
                    0
                );
            }
        } catch (error) {
            console.error('❌ Ошибка рендеринга инвентаря:', error);
            return this.createSectionHTML(
                this.typeConfigs.inventory,
                `<div style="padding: 10px; color: #ff3838; font-style: italic; text-align: center;">
                    <i class="fas fa-exclamation-triangle"></i> Ошибка загрузки инвентаря
                </div>`
            );
        }
    }
    
    /**
     * Показывает компактное модальное окно с иерархией организации
     */
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
                max-width: 450px;
                max-height: 90vh;
                overflow-y: auto;
                color: ${this.config.COLORS.TEXT.SECONDARY};
                box-shadow: ${this.config.MODALS.BOX_SHADOW};
                font-size: 0.9em;
            `;
            
            const header = document.createElement('div');
            header.style.cssText = `
                background: ${this.config.MODALS.HEADER_BG};
                padding: 12px 16px;
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
                <div style="color: #888; font-size: 0.9em; margin-top: 2px; letter-spacing: 1px;">ИЕРАРХИЯ</div>
            `;
            
            const closeBtn = document.createElement('button');
            closeBtn.innerHTML = '✕';
            closeBtn.style.cssText = `
                background: transparent;
                border: none;
                color: ${this.config.MODALS.CLOSE_COLOR};
                font-size: 1.3em;
                cursor: pointer;
                padding: 4px 10px;
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
                padding: 12px 16px;
                background: linear-gradient(135deg, rgba(255,0,0,0.15) 0%, rgba(139,0,0,0.1) 100%);
                border-bottom: 1px solid #333;
                margin: 0;
            `;
            
            currentPos.innerHTML = `
                <div style="color: #ff5555; font-size: 1em; font-weight: bold; margin-bottom: 6px; display: flex; align-items: center;">
                    <span style="background: #ff5555; color: #000; padding: 3px 8px; border-radius: 3px; margin-right: 8px; font-size: 0.9em;">●</span>
                    ТЕКУЩАЯ ПОЗИЦИЯ
                </div>
                <div style="display: flex; align-items: center; justify-content: space-between;">
                    <div>
                        <div style="color: #fff; font-size: 1em; font-weight: bold; margin-bottom: 2px;">${org.rankName}</div>
                        <div style="color: #aaa; font-size: 0.9em;">Уровень ${org.rank}/${totalRanks}</div>
                    </div>
                    <div style="color: #d4af37; font-size: 1.1em; font-weight: bold; background: rgba(212, 175, 55, 0.1); padding: 6px 10px; border-radius: 4px;">
                        ${org.rank}°
                    </div>
                </div>
            `;
            content.appendChild(currentPos);
            
            const hierarchyContainer = document.createElement('div');
            hierarchyContainer.style.cssText = `
                padding: 8px 0;
                max-height: 400px;
                overflow-y: auto;
            `;
            
            sortedRanks.forEach(rankInfo => {
                const isCurrentRank = rankInfo.lvl === org.rank;
                const rankItem = document.createElement('div');
                rankItem.style.cssText = `
                    padding: 10px 16px;
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
                        <div style="display: flex; align-items: center; gap: 10px; flex: 1;">
                            <span style="color: #d4af37; font-weight: bold; min-width: 24px; font-size: 1.1em;">${rankInfo.lvl}°</span>
                            <span style="color: ${isCurrentRank ? '#fff' : '#ccc'}; font-weight: ${isCurrentRank ? 'bold' : 'normal'};">
                                ${rankInfo.rank}
                            </span>
                            ${isCurrentRank ? '<span style="color: #ff5555; font-size: 0.9em; background: rgba(255,0,0,0.3); padding: 2px 6px; border-radius: 3px; margin-left: 8px; font-weight: bold;">ВЫ</span>' : ''}
                        </div>
                        ${rankInfo.threshold !== undefined ? 
                            `<span style="color: #fbc531; font-size: 0.9em; background: rgba(251,197,49,0.15); padding: 4px 8px; border-radius: 4px; white-space: nowrap; border: 1px solid #fbc53140;">
                                ${rankInfo.threshold}
                            </span>` : 
                            '<span style="color: #666; font-size: 0.9em; padding: 4px 8px; background: rgba(255,255,255,0.05); border-radius: 4px;">—</span>'
                        }
                    </div>
                    ${rankInfo.description ? 
                        `<div style="color: #888; font-size: 0.85em; margin-top: 6px; padding-left: 34px; line-height: 1.4;">
                            ${rankInfo.description}
                        </div>` : ''
                    }
                `;
                
                hierarchyContainer.appendChild(rankItem);
            });
            
            content.appendChild(hierarchyContainer);
            
            const legend = document.createElement('div');
            legend.style.cssText = `
                padding: 10px 16px;
                background: #1a1a1a;
                border-top: 1px solid #333;
                display: flex;
                flex-wrap: wrap;
                gap: 12px;
                font-size: 0.85em;
            `;
            
            legend.innerHTML = `
                <div style="display: flex; align-items: center; gap: 6px;">
                    <div style="width: 10px; height: 10px; background: #ff5555; border-radius: 2px;"></div>
                    <span style="color: #aaa;">Ваша позиция</span>
                </div>
                <div style="display: flex; align-items: center; gap: 6px;">
                    <div style="width: 10px; height: 10px; background: #d4af37; border-radius: 2px;"></div>
                    <span style="color: #aaa;">Уровень</span>
                </div>
                <div style="display: flex; align-items: center; gap: 6px;">
                    <div style="width: 10px; height: 10px; background: #fbc531; border-radius: 2px;"></div>
                    <span style="color: #aaa;">Требование</span>
                </div>
            `;
            
            content.appendChild(legend);
            
            const info = document.createElement('div');
            info.style.cssText = `
                padding: 8px 16px;
                background: #0a0a0a;
                border-top: 1px solid #222;
                font-size: 0.8em;
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
    
    /**
     * Получает цвет для стата
     */
    getStatColor(value) {
        const val = Math.max(0, Math.min(100, value));
        
        if (val <= 10) return '#800000';
        if (val <= 20) return '#FF0000';
        if (val <= 30) return '#FF5500';
        if (val <= 40) return '#FFAA00';
        if (val <= 50) return '#FFD700';
        if (val <= 60) return '#ADFF2F';
        if (val <= 70) return '#00FF00';
        if (val <= 80) return '#20B2AA';
        if (val <= 90) return '#87CEEB';
        return '#FFFFFF';
    }
    
    /**
     * Показ тултипа для game_item
     */
    showGameItemTooltip(element, gameItem) {
        const existingTooltip = document.querySelector('.game-item-tooltip');
        if (existingTooltip) {
            existingTooltip.remove();
        }
        
        if (!gameItem || !gameItem.id) {
            console.warn('showGameItemTooltip: Нет данных об объекте');
            return;
        }
        
        const config = this.config.TOOLTIPS;
        const fontConfig = this.config.FONTS;
        const tooltip = document.createElement('div');
        tooltip.className = 'game-item-tooltip';
        
        let content = '';
        
        const icon = Render.getGameItemIcon(gameItem.id);
        const [type, name] = gameItem.id.split(':');
        
        content += `
            <div style="
                font-weight: bold; 
                color: #fbc531; 
                margin-bottom: 8px; 
                font-size: 1em; 
                border-bottom: 1px solid #fbc53160; 
                padding-bottom: 6px;
                font-family: ${fontConfig.FAMILY};
                letter-spacing: ${fontConfig.LETTER_SPACING};
                display: flex;
                align-items: center;
                gap: 8px;
            ">
                <span style="font-size: 1.2em;">${icon}</span>
                <span>${name || type}</span>
            </div>
        `;
        
        if (gameItem.value !== undefined && gameItem.value !== name) {
            content += `
                <div style="
                    margin-bottom: 6px; 
                    color: ${this.config.COLORS.TEXT.SECONDARY}; 
                    font-size: 0.9em;
                    font-family: ${fontConfig.FAMILY};
                    letter-spacing: ${fontConfig.LETTER_SPACING};
                ">
                    <span style="color: ${this.config.COLORS.TEXT.TERTIARY};">Значение:</span> ${gameItem.value}
                </div>
            `;
        }
        
        if (gameItem.description) {
            content += `
                <div style="
                    margin-bottom: 6px; 
                    color: ${this.config.COLORS.TEXT.SECONDARY}; 
                    font-size: 0.85em; 
                    font-style: italic; 
                    line-height: ${config.LINE_HEIGHT};
                    font-family: ${fontConfig.FAMILY};
                    letter-spacing: ${fontConfig.LETTER_SPACING};
                    padding: 6px;
                    background: rgba(0,0,0,0.3);
                    border-radius: 3px;
                    border-left: 2px solid #fbc531;
                ">
                    ${gameItem.description}
                </div>
            `;
        }
        
        if (gameItem.duration !== undefined) {
            content += `
                <div style="
                    margin-bottom: 4px; 
                    color: #fbc531; 
                    font-size: 0.9em;
                    font-family: ${fontConfig.FAMILY};
                    letter-spacing: ${fontConfig.LETTER_SPACING};
                    display: flex;
                    align-items: center;
                    gap: 6px;
                ">
                    <i class="fas fa-clock"></i> 
                    <span>Длительность: <strong>${gameItem.duration}</strong> ход.</span>
                </div>
            `;
        }
        
        const extraFields = Object.keys(gameItem).filter(k => !['id', 'value', 'description', 'duration'].includes(k));
        if (extraFields.length > 0) {
            content += '<div style="margin-top: 8px; padding-top: 6px; border-top: 1px solid #333;">';
            extraFields.forEach(field => {
                const val = gameItem[field];
                if (val !== null && val !== undefined) {
                    content += `
                        <div style="
                            font-size: 0.85em; 
                            color: #999; 
                            margin-bottom: 3px;
                            font-family: ${fontConfig.FAMILY};
                            letter-spacing: ${fontConfig.LETTER_SPACING};
                        ">
                            <span style="color: #666;">${field}:</span> ${JSON.stringify(val)}
                        </div>
                    `;
                }
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
        let top = rect.bottom + window.scrollY + 10;
        
        if (left + tooltipRect.width > window.innerWidth) {
            left = window.innerWidth - tooltipRect.width - 15;
        }
        
        if (left < 15) {
            left = 15;
        }
        
        if (top + tooltipRect.height > window.innerHeight + window.scrollY) {
            top = rect.top + window.scrollY - tooltipRect.height - 10;
        }
        
        if (top < window.scrollY) {
            top = window.scrollY + 15;
        }
        
        tooltip.style.left = `${left}px`;
        tooltip.style.top = `${top}px`;
        
        const removeTooltip = () => {
            if (tooltip && tooltip.parentNode) {
                tooltip.classList.add('fade-out');
                setTimeout(() => {
                    if (tooltip && tooltip.parentNode) {
                        tooltip.parentNode.removeChild(tooltip);
                    }
                }, 200);
            }
            document.removeEventListener('click', removeTooltip);
        };
        
        setTimeout(() => {
            document.addEventListener('click', removeTooltip);
        }, 100);
        
        setTimeout(removeTooltip, 8000);
    }
    
    /**
     * Принудительно обновляет все game items
     */
    forceUpdate() {
        console.log('🔄 GameItemUI: ПРИНУДИТЕЛЬНОЕ обновление ВСЕХ game items');
        this.renderAll();
    }
    
    /**
     * Уничтожает менеджер, очищает ресурсы
     */
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

// Создаем и экспортируем синглтон
const gameItemUI = new GameItemUIManager();
export { gameItemUI as GameItemUI };