// ============================================================================
// КОНФИГУРАЦИЯ UI GAME_ITEM
// ============================================================================

export const GAME_ITEM_UI_CONFIG = {
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