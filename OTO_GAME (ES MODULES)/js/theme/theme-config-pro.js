'use strict';

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * CONFIG: THEME CONFIGURATION PRO - PRODUCTION READY
 * ═══════════════════════════════════════════════════════════════════════════
 * Полная конфигурация с расширенным набором шрифтов, пресетов и настроек
 */

import { HISTORY_VISUAL_CONFIG } from '../history-config.js';
import { SCENE_VISUAL_CONFIG } from '../scene-config.js';

// 1. РАСШИРЕННАЯ БИБЛИОТЕКА ШРИФТОВ (Google Fonts)
export const FONT_LIBRARY = {
    'Nunito Sans': 'https://fonts.googleapis.com/css2?family=Nunito+Sans:wght@300;400;600;700;900&display=swap',
    'Unbounded': 'https://fonts.googleapis.com/css2?family=Unbounded:wght@300;400;600;700;900&display=swap',
    'Exo 2': 'https://fonts.googleapis.com/css2?family=Exo+2:wght@300;400;600;700;900&display=swap',
    'Inter': 'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;700;900&display=swap',
    'Poppins': 'https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;600;700;900&display=swap',
    'Comfortaa': 'https://fonts.googleapis.com/css2?family=Comfortaa:wght@300;400;700&display=swap',
    'Montserrat': 'https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;600;700;900&display=swap',
    'Cinzel': 'https://fonts.googleapis.com/css2?family=Cinzel:wght@400;700;900&display=swap',
    'Playfair Display': 'https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700;900&display=swap',
    'Lora': 'https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,400;0,700;1,400&display=swap',
    'Merriweather': 'https://fonts.googleapis.com/css2?family=Merriweather:wght@300;400;700;900&display=swap',
    'Cormorant': 'https://fonts.googleapis.com/css2?family=Cormorant:wght@300;400;700&display=swap',
    'Roboto Mono': 'https://fonts.googleapis.com/css2?family=Roboto+Mono:wght@400;500;700&display=swap',
    'Fira Code': 'https://fonts.googleapis.com/css2?family=Fira+Code:wght@400;500;700&display=swap',
    'Source Code Pro': 'https://fonts.googleapis.com/css2?family=Source+Code+Pro:wght@400;500;700&display=swap',
    'JetBrains Mono': 'https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;700&display=swap',
    'Press Start 2P': 'https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap',
    'Orbitron': 'https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&display=swap',
    'Righteous': 'https://fonts.googleapis.com/css2?family=Righteous&display=swap',
    'Audiowide': 'https://fonts.googleapis.com/css2?family=Audiowide&display=swap',
    'VT323': 'https://fonts.googleapis.com/css2?family=VT323&display=swap',
    'Caveat': 'https://fonts.googleapis.com/css2?family=Caveat:wght@400;700&display=swap',
    'Dancing Script': 'https://fonts.googleapis.com/css2?family=Dancing+Script:wght@400;700&display=swap'
};

// 2. РАСШИРЕННЫЙ ICON MAPPING (FontAwesome -> Emoji)
export const ICON_MAPPINGS = {
    'fa-user-circle': '👤',
    'fa-fingerprint': '🆔',
    'fa-brain': '🧠',
    'fa-heart': '❤️',
    'fa-user-shield': '🛡️',
    'fa-users': '👥',
    'fa-user-friends': '🤝',
    'fa-building': '🏛️',
    'fa-crown': '👑',
    'fa-handshake': '🤝',
    'fa-star': '✨',
    'fa-fire': '🔥',
    'fa-bolt': '⚡',
    'fa-magic': '✨',
    'fa-fist-raised': '✊',
    'fa-skull-crossbones': '☠️',
    'fa-shield-alt': '🛡️',
    'fa-medkit': '🏥',
    'fa-flask': '⚗️',
    'fa-pills': '💊',
    'fa-chart-line': '📈',
    'fa-chart-bar': '📊',
    'fa-tachometer-alt': '⏱️',
    'fa-percentage': '💯',
    'fa-signal': '📶',
    'fa-box': '🎒',
    'fa-gem': '💎',
    'fa-coins': '💰',
    'fa-key': '🔑',
    'fa-trophy': '🏆',
    'fa-scroll': '📜',
    'fa-book': '📖',
    'fa-file-alt': '📄',
    'fa-sticky-note': '📝',
    'fa-clipboard': '📋',
    'fa-pencil-alt': '✏️',
    'fa-eye': '👁️',
    'fa-eye-slash': '🙈',
    'fa-keyboard': '⌨️',
    'fa-mouse': '🖱️',
    'fa-chevron-right': '▶',
    'fa-chevron-left': '◀',
    'fa-chevron-down': '▼',
    'fa-chevron-up': '▲',
    'fa-arrow-right': '→',
    'fa-arrow-left': '←',
    'fa-check-circle': '✅',
    'fa-times-circle': '❌',
    'fa-exclamation-triangle': '⚠️',
    'fa-info-circle': 'ℹ️',
    'fa-question-circle': '❓',
    'fa-fill-drip': '🎨',
    'fa-palette': '🎨',
    'fa-swatchbook': '🎨',
    'fa-paint-brush': '🖌️',
    'fa-paint-roller': '🎨',
    'fa-history': '📜',
    'fa-clock': '🕐',
    'fa-hourglass': '⏳',
    'fa-calendar': '📅',
    'fa-save': '💾',
    'fa-download': '📥',
    'fa-upload': '📤',
    'fa-undo': '↩️',
    'fa-redo': '↪️',
    'fa-trash': '🗑️',
    'fa-cog': '⚙️',
    'fa-sliders-h': '🎛️',
    'fa-exchange-alt': '🔄',
    'fa-search': '🔍',
    'fa-globe': '🌐',
    'fa-map': '🗺️',
    'fa-compass': '🧭'
};

// 3. РАСШИРЕННЫЕ EMOJI FILTERS
export const EMOJI_FILTERS = {
    'none': 'Стандартные',
    'grayscale(100%)': 'Чёрно-белые',
    'sepia(100%)': 'Сепия',
    'hue-rotate(45deg)': 'Золотистые',
    'hue-rotate(90deg)': 'Зелёные',
    'hue-rotate(180deg)': 'Синие',
    'hue-rotate(270deg)': 'Пурпурные',
    'brightness(0.7) contrast(1.2)': 'Тусклые контрастные',
    'brightness(1.3) saturate(1.5)': 'Яркие насыщенные',
    'drop-shadow(0 0 2px rgba(212,175,55,0.8))': 'Золотое свечение',
    'drop-shadow(0 0 3px rgba(255,0,0,0.8))': 'Красное свечение',
    'drop-shadow(0 0 3px rgba(0,255,255,0.8))': 'Голубое свечение'
};

// 4. ГЛОБАЛЬНЫЕ НАСТРОЙКИ
export const GLOBAL_SETTINGS = {
    icons: {
        set: 'fa',
        emojiFilter: 'none'
    },
    layout: {
        scrollbarColor: "#d4af37",
        scrollbarBg: "#1a1a1a",
        selectionColor: "#d4af37",
        selectionBg: "rgba(212, 175, 55, 0.2)",
        blockMargin: "15px"
    }
};

// 5. ТИПОГРАФИКА
export const TYPOGRAPHY_CONFIG = {
    headers: {
        fontFamily: "'Unbounded', sans-serif",
        fontWeight: "700",
        letterSpacing: "1px",
        textTransform: "uppercase"
    },
    body: {
        fontFamily: "'Nunito Sans', sans-serif",
        fontWeight: "400",
        fontSize: "16px",
        lineHeight: "1.6"
    },
    ui: {
        fontFamily: "'Exo 2', sans-serif",
        fontWeight: "600",
        fontSize: "14px",
        letterSpacing: "0.5px"
    },
    monospace: {
        fontFamily: "'Roboto Mono', monospace",
        fontSize: "13px"
    }
};

// 6. КОНФИГУРАЦИЯ СЦЕНЫ (импортирована из scene-config.js)
export const SCENE_CONFIG = SCENE_VISUAL_CONFIG;

// 7. ГЕНЕРАТОР КОНФИГА ДЛЯ ИГРОВЫХ ЭЛЕМЕНТОВ
const createGameItemConfig = (primaryColor, bgGradientStart, bgGradientEnd) => ({
    header: {
        color: primaryColor,
        borderBottom: `2px solid ${primaryColor}40`,
        fontFamily: "'Unbounded', sans-serif",
        fontSize: "0.9em",
        padding: "4px 0"
    },
    container: {
        background: `linear-gradient(135deg, ${bgGradientStart} 0%, ${bgGradientEnd} 100%)`,
        border: "1px solid rgba(255,255,255,0.05)",
        borderRadius: "6px",
        padding: "4px",
        marginBottom: "2px"
    },
    badge: {
        background: `rgba(${parseInt(primaryColor.slice(1,3),16)}, ${parseInt(primaryColor.slice(3,5),16)}, ${parseInt(primaryColor.slice(5,7),16)}, 0.1)`,
        border: `1px solid ${primaryColor}40`,
        borderLeft: `3px solid ${primaryColor}`,
        borderRadius: "4px",
        color: "#eeeeee",
        padding: "4px",
        fontFamily: "'Nunito Sans', sans-serif",
        fontSize: "0.8em",
        hoverTransform: "translateY(-1px)",
        hoverShadow: `0 2px 8px ${primaryColor}20`
    }
});

export const GAME_ITEMS_CONFIG = {
    personality: createGameItemConfig("#fbc531", "#2a220a", "#1a1805"),
    typology: createGameItemConfig("#4cd137", "#0a2a0a", "#051a05"),
    organization: createGameItemConfig("#d4af37", "#2a1a05", "#1a0d02"),
    relations: createGameItemConfig("#ff9ff3", "#2a0a2a", "#1a051a"),
    skill: createGameItemConfig("#6c5ce7", "#0a0a2a", "#05051a"),
    stat_buffs: createGameItemConfig("#3498db", "#0a1a2a", "#051025"),
    bless: createGameItemConfig("#bdc3c7", "#2a2a2a", "#1a1a1a"),
    curse: createGameItemConfig("#ff3838", "#2a0000", "#1a0000"),
    buff_debuff: createGameItemConfig("#00cec9", "#0a2a2a", "#051a1a"),
    inventory: createGameItemConfig("#8b4513", "#2a1a0a", "#1a0d05"),
    details: createGameItemConfig("#00cec9", "#0a2a2a", "#051a1a")
};

// 8. ОБНОВЛЕНИЯ ЗА ХОД
export const TURN_UPDATES_CONFIG = {
    container: {
        background: "rgba(10, 0, 0, 0.8)",
        border: "1px solid #4a0a0a",
        borderRadius: "4px",
        padding: "10px",
        marginBottom: "15px"
    },
    header: {
        color: "#d4af37",
        borderBottom: "1px solid #4a0a0a",
        fontSize: "0.9em",
        fontFamily: "'Unbounded', sans-serif",
        textTransform: "uppercase"
    },
    content: {
        color: "#cccccc",
        fontSize: "0.85em",
        fontFamily: "'Nunito Sans', sans-serif"
    }
};

// 9. ИСТОРИЯ
export const HISTORY_CONFIG = HISTORY_VISUAL_CONFIG;

// 10. БАЗОВАЯ ТЕМА
export const DEFAULT_THEME_CONFIG = {
    name: "Default Pro",
    description: "Стандартная профессиональная темная тема",
    global: GLOBAL_SETTINGS,
    typography: TYPOGRAPHY_CONFIG,
    scene: SCENE_CONFIG,
    gameItems: GAME_ITEMS_CONFIG,
    turnUpdates: TURN_UPDATES_CONFIG,
    history: HISTORY_CONFIG,
    icons: ICON_MAPPINGS
};

// 11. РАСШИРЕННЫЕ ПРЕСЕТЫ
export const PRESET_THEMES = {
    default: {
        name: "Dark Industrial",
        description: "Оригинальная темная тема с золотыми акцентами",
        preview: "linear-gradient(135deg, #1a1a1a 0%, #2a2a2a 100%)",
        config: DEFAULT_THEME_CONFIG
    },
    
    forest: {
        name: "Elven Forest",
        description: "Глубокий тёмный лес с изумрудными акцентами",
        preview: "linear-gradient(135deg, #0a1f0a 0%, #1a2a1a 100%)",
        config: {
            ...DEFAULT_THEME_CONFIG,
            name: "Elven Forest",
            global: {
                icons: { set: 'fa', emojiFilter: 'hue-rotate(90deg) brightness(1.2)' },
                layout: {
                    scrollbarColor: "#2ecc71",
                    scrollbarBg: "#0a1a0a",
                    selectionColor: "#2ecc71",
                    selectionBg: "rgba(46, 204, 113, 0.2)",
                    blockMargin: "15px"
                }
            },
            typography: {
                headers: { fontFamily: "'Cinzel', serif", fontWeight: "700", letterSpacing: "2px", textTransform: "uppercase" },
                body: { fontFamily: "'Lora', serif", fontWeight: "400", fontSize: "16px", lineHeight: "1.7", color: "#d0e0d0" },
                ui: { fontFamily: "'Lora', serif", fontWeight: "600", fontSize: "14px", letterSpacing: "0.5px" },
                monospace: { fontFamily: "'Fira Code', monospace", fontSize: "13px" }
            },
            scene: {
                ...DEFAULT_THEME_CONFIG.scene,
                textBlock: {
                    background: "rgba(10, 25, 10, 0.9)",
                    border: "2px solid #2ecc71",
                    borderRadius: "12px",
                    padding: "18px",
                    color: "#e0f0e0",
                    fontFamily: "'Lora', serif",
                    fontSize: "1.05em",
                    boxShadow: "0 4px 12px rgba(46, 204, 113, 0.3)"
                },
                aiMemory: {
                    background: "rgba(46, 204, 113, 0.1)",
                    borderLeft: "4px solid #2ecc71",
                    borderRadius: "8px",
                    padding: "12px",
                    titleColor: "#2ecc71",
                    contentColor: "#c0e0c0",
                    keyColor: "#2ecc71",
                    valueColor: "#e0f0e0"
                },
                choices: {
                    containerMargin: "20px 0 0 0",
                    btn: {
                        background: "linear-gradient(180deg, #1a2a1a 0%, #0a1a0a 100%)",
                        border: "2px solid #2ecc71",
                        color: "#e0f0e0",
                        borderRadius: "10px",
                        padding: "14px 18px",
                        fontFamily: "'Cinzel', serif",
                        fontSize: "1em",
                        hoverBg: "linear-gradient(180deg, #2a4d2f 0%, #1a2f1a 100%)",
                        hoverBorder: "#3edd81",
                        selectedBg: "rgba(46, 204, 113, 0.3)",
                        selectedBorder: "#3edd81",
                        selectedColor: "#ffffff",
                        marginBottom: "10px"
                    }
                },
                designNotes: {
                    ...DEFAULT_THEME_CONFIG.scene.designNotes,
                    background: "rgba(46,204,113,0.08)",
                    borderLeft: "4px solid #2ecc71",
                    titleColor: "#2ecc71",
                    contentColor: "#d0e0d0"
                },
                summary: {
                    ...DEFAULT_THEME_CONFIG.scene.summary,
                    background: "rgba(46,204,113,0.07)",
                    borderLeft: "4px solid #2ecc71",
                    titleColor: "#2ecc71",
                    contentColor: "#d0e0d0"
                },
                reflection: {
                    ...DEFAULT_THEME_CONFIG.scene.reflection,
                    background: "rgba(46,204,113,0.08)",
                    borderLeft: "4px solid #2ecc71",
                    titleColor: "#2ecc71",
                    contentColor: "#d0e0d0"
                },
                personality: {
                    ...DEFAULT_THEME_CONFIG.scene.personality,
                    background: "rgba(46,204,113,0.08)",
                    borderLeft: "4px solid #2ecc71",
                    titleColor: "#2ecc71",
                    contentColor: "#d0e0d0"
                },
                typology: {
                    ...DEFAULT_THEME_CONFIG.scene.typology,
                    background: "rgba(46,204,113,0.08)",
                    borderLeft: "4px solid #2ecc71",
                    titleColor: "#2ecc71",
                    contentColor: "#d0e0d0"
                },
                additionalField: {
                    ...DEFAULT_THEME_CONFIG.scene.additionalField,
                    borderLeft: "3px solid #2ecc71",
                    titleColor: "#2ecc71"
                }
            },
            gameItems: {
                personality: createGameItemConfig("#2ecc71", "#0a2a0a", "#051a05"),
                typology: createGameItemConfig("#4cd137", "#0f2a0f", "#071a07"),
                organization: createGameItemConfig("#27ae60", "#0a2515", "#051512"),
                relations: createGameItemConfig("#1abc9c", "#0a2a25", "#051a15"),
                skill: createGameItemConfig("#f1c40f", "#2a220a", "#1a1100"),
                stat_buffs: createGameItemConfig("#3498db", "#0a1a2a", "#051025"),
                bless: createGameItemConfig("#ecf0f1", "#2a2a2a", "#1a1a1a"),
                curse: createGameItemConfig("#e74c3c", "#2a0000", "#1a0000"),
                buff_debuff: createGameItemConfig("#16a085", "#0a2520", "#051512"),
                inventory: createGameItemConfig("#e67e22", "#2a1505", "#1a0a00"),
                details: createGameItemConfig("#2ecc71", "#0a2a0a", "#051a05")
            },
            history: {
                ...HISTORY_CONFIG,
                container: { background: "#0a1a0a", padding: "0" },
                header: { background: "#1a2a1a", borderBottom: "2px solid #2ecc71", color: "#e0f0e0" },
                headerButtons: {
                    background: "rgba(46,204,113,0.15)",
                    border: "1px solid #2ecc71",
                    color: "#2ecc71",
                    hover: { background: "rgba(46,204,113,0.3)", borderColor: "#2ecc71", color: "#ffffff" }
                },
                turn: { background: "#0f1f0f", border: "0.5px solid rgba(46,204,113,0.2)" },
                turnSummary: {
                    background: "rgba(0,0,0,0.2)",
                    color: "#e0f0e0",
                    summaryColor: "#c0e0c0",
                    actionCountColor: "#a0c0a0",
                    timestampColor: "#80a080"
                },
                turnContent: { background: "rgba(0,0,0,0.15)", color: "#d0e0d0" },
                accentColors: { success: "#2ecc71", failure: "#e74c3c", mixed: "#f1c40f", neutral: "#7f8c8d" }
            }
        }
    },
    
    cyber: {
        name: "Cyberpunk Neon",
        description: "Тёмный киберпанк с неоновыми акцентами",
        preview: "linear-gradient(135deg, #0a0a0a 0%, #1a0033 100%)",
        config: {
            ...DEFAULT_THEME_CONFIG,
            name: "Cyberpunk Neon",
            global: {
                icons: { set: 'emoji', emojiFilter: 'drop-shadow(0 0 2px rgba(0,255,255,0.8))' },
                layout: {
                    scrollbarColor: "#00ffff",
                    scrollbarBg: "#0a0a0a",
                    selectionColor: "#ff00ff",
                    selectionBg: "rgba(255, 0, 255, 0.2)",
                    blockMargin: "15px"
                }
            },
            typography: {
                headers: { fontFamily: "'Orbitron', sans-serif", fontWeight: "900", letterSpacing: "3px", textTransform: "uppercase" },
                body: { fontFamily: "'Roboto Mono', monospace", fontWeight: "400", fontSize: "15px", lineHeight: "1.5", color: "#e0e0e0" },
                ui: { fontFamily: "'Orbitron', sans-serif", fontWeight: "700", fontSize: "13px", letterSpacing: "1px" },
                monospace: { fontFamily: "'Fira Code', monospace", fontSize: "13px" }
            },
            scene: {
                ...DEFAULT_THEME_CONFIG.scene,
                textBlock: {
                    background: "#111111",
                    border: "2px solid #00ffff",
                    borderRadius: "0px",
                    padding: "15px",
                    color: "#e0e0e0",
                    fontFamily: "'Roboto Mono', monospace",
                    fontSize: "1em",
                    boxShadow: "0 0 20px rgba(0,255,255,0.3), inset 0 0 10px rgba(0,255,255,0.05)"
                },
                aiMemory: {
                    background: "rgba(255, 0, 255, 0.1)",
                    borderLeft: "4px solid #ff00ff",
                    borderRadius: "0px",
                    padding: "12px",
                    titleColor: "#ff00ff",
                    contentColor: "#00ffff",
                    keyColor: "#ff00ff",
                    valueColor: "#00ffff"
                },
                choices: {
                    containerMargin: "25px 0 0 0",
                    btn: {
                        background: "#111111",
                        border: "2px solid #ff00ff",
                        color: "#ff00ff",
                        borderRadius: "0px",
                        padding: "12px 20px",
                        fontFamily: "'Orbitron', sans-serif",
                        fontSize: "0.95em",
                        hoverBg: "rgba(255,0,255,0.2)",
                        hoverBorder: "#ff00ff",
                        selectedBg: "#ff00ff",
                        selectedBorder: "#ff00ff",
                        selectedColor: "#000000",
                        marginBottom: "10px"
                    }
                },
                designNotes: {
                    ...DEFAULT_THEME_CONFIG.scene.designNotes,
                    background: "rgba(255,0,255,0.05)",
                    borderLeft: "4px solid #ff00ff",
                    titleColor: "#ff00ff",
                    contentColor: "#00ffff"
                },
                summary: {
                    ...DEFAULT_THEME_CONFIG.scene.summary,
                    background: "rgba(0,255,255,0.05)",
                    borderLeft: "4px solid #00ffff",
                    titleColor: "#00ffff",
                    contentColor: "#ff00ff"
                },
                reflection: {
                    ...DEFAULT_THEME_CONFIG.scene.reflection,
                    background: "rgba(255,0,255,0.05)",
                    borderLeft: "4px solid #ff00ff",
                    titleColor: "#ff00ff",
                    contentColor: "#00ffff"
                },
                personality: {
                    ...DEFAULT_THEME_CONFIG.scene.personality,
                    background: "rgba(0,255,255,0.05)",
                    borderLeft: "4px solid #00ffff",
                    titleColor: "#00ffff",
                    contentColor: "#ff00ff"
                },
                typology: {
                    ...DEFAULT_THEME_CONFIG.scene.typology,
                    background: "rgba(255,0,255,0.05)",
                    borderLeft: "4px solid #ff00ff",
                    titleColor: "#ff00ff",
                    contentColor: "#00ffff"
                },
                additionalField: {
                    ...DEFAULT_THEME_CONFIG.scene.additionalField,
                    borderLeft: "3px solid #00ffff",
                    titleColor: "#00ffff"
                }
            },
            gameItems: {
                personality: createGameItemConfig("#ff00ff", "#2a002a", "#1a001a"),
                typology: createGameItemConfig("#00ffff", "#002a2a", "#001a1a"),
                organization: createGameItemConfig("#00ff00", "#002a00", "#001a00"),
                relations: createGameItemConfig("#ff0099", "#2a0022", "#1a0015"),
                skill: createGameItemConfig("#9900ff", "#22002a", "#15001a"),
                stat_buffs: createGameItemConfig("#00ccff", "#00222a", "#00151a"),
                bless: createGameItemConfig("#ffffff", "#2a2a2a", "#1a1a1a"),
                curse: createGameItemConfig("#ff0000", "#2a0000", "#1a0000"),
                buff_debuff: createGameItemConfig("#ffff00", "#2a2a00", "#1a1a00"),
                inventory: createGameItemConfig("#ff9900", "#2a1a00", "#1a1000"),
                details: createGameItemConfig("#00ffff", "#002a2a", "#001a1a")
            },
            history: {
                ...HISTORY_CONFIG,
                container: { background: "#0a0a0a", padding: "0" },
                header: { background: "#111111", borderBottom: "2px solid #ff00ff", color: "#00ffff" },
                headerButtons: {
                    background: "rgba(255,0,255,0.15)",
                    border: "1px solid #ff00ff",
                    color: "#ff00ff",
                    hover: { background: "rgba(255,0,255,0.3)", borderColor: "#ff00ff", color: "#ffffff" }
                },
                turn: { background: "#151515", border: "0.5px solid rgba(255,0,255,0.2)" },
                turnSummary: {
                    background: "rgba(0,0,0,0.4)",
                    color: "#e0e0e0",
                    summaryColor: "#cccccc",
                    actionCountColor: "#aaaaaa",
                    timestampColor: "#888888"
                },
                turnContent: { background: "rgba(0,0,0,0.3)", color: "#dddddd" },
                accentColors: { success: "#00ff00", failure: "#ff0000", mixed: "#ffff00", neutral: "#00ffff" }
            }
        }
    },
    
    paper: {
        name: "Old Paper (Dark)",
        description: "Тёмная тема с имитацией старого пергамента",
        preview: "linear-gradient(135deg, #2a241a 0%, #3a2e22 100%)",
        config: {
            ...DEFAULT_THEME_CONFIG,
            name: "Old Paper Dark",
            global: {
                icons: { set: 'emoji', emojiFilter: 'sepia(50%) brightness(1.2)' },
                layout: {
                    scrollbarColor: "#b89b7b",
                    scrollbarBg: "#2a241a",
                    selectionColor: "#d4af37",
                    selectionBg: "rgba(180, 130, 80, 0.2)",
                    blockMargin: "15px"
                }
            },
            typography: {
                headers: { fontFamily: "'Playfair Display', serif", fontWeight: "900", letterSpacing: "1px", textTransform: "uppercase" },
                body: { fontFamily: "'Lora', serif", fontWeight: "400", fontSize: "17px", lineHeight: "1.8", color: "#e8d8c0" },
                ui: { fontFamily: "'Playfair Display', serif", fontWeight: "600", fontSize: "15px", letterSpacing: "0.5px" },
                monospace: { fontFamily: "'Source Code Pro', monospace", fontSize: "13px" }
            },
            scene: {
                ...DEFAULT_THEME_CONFIG.scene,
                textBlock: {
                    background: "linear-gradient(135deg, #2a241a 0%, #3a2e22 100%)",
                    border: "2px solid #b89b7b",
                    borderRadius: "8px",
                    padding: "18px",
                    color: "#f0e0d0",
                    fontFamily: "'Lora', serif",
                    fontSize: "1.05em",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.5), inset 0 0 20px rgba(200,150,100,0.1)"
                },
                aiMemory: {
                    background: "rgba(180, 130, 80, 0.15)",
                    borderLeft: "4px solid #b89b7b",
                    borderRadius: "6px",
                    padding: "12px",
                    titleColor: "#e0c0a0",
                    contentColor: "#d0c0b0",
                    keyColor: "#e0c0a0",
                    valueColor: "#f0e0d0"
                },
                choices: {
                    containerMargin: "20px 0 0 0",
                    btn: {
                        background: "linear-gradient(180deg, #3a2e22 0%, #2a241a 100%)",
                        border: "2px solid #b89b7b",
                        color: "#f0e0d0",
                        borderRadius: "8px",
                        padding: "14px 18px",
                        fontFamily: "'Playfair Display', serif",
                        fontSize: "1em",
                        hoverBg: "linear-gradient(180deg, #4a3e32 0%, #3a2e22 100%)",
                        hoverBorder: "#d4af37",
                        selectedBg: "rgba(180, 130, 80, 0.3)",
                        selectedBorder: "#d4af37",
                        selectedColor: "#ffffff",
                        marginBottom: "10px"
                    }
                },
                designNotes: {
                    ...DEFAULT_THEME_CONFIG.scene.designNotes,
                    background: "rgba(180,130,80,0.1)",
                    borderLeft: "4px solid #b89b7b",
                    titleColor: "#e0c0a0",
                    contentColor: "#d0c0b0"
                },
                summary: {
                    ...DEFAULT_THEME_CONFIG.scene.summary,
                    background: "rgba(180,130,80,0.1)",
                    borderLeft: "4px solid #b89b7b",
                    titleColor: "#e0c0a0",
                    contentColor: "#d0c0b0"
                },
                reflection: {
                    ...DEFAULT_THEME_CONFIG.scene.reflection,
                    background: "rgba(180,130,80,0.1)",
                    borderLeft: "4px solid #b89b7b",
                    titleColor: "#e0c0a0",
                    contentColor: "#d0c0b0"
                },
                personality: {
                    ...DEFAULT_THEME_CONFIG.scene.personality,
                    background: "rgba(180,130,80,0.1)",
                    borderLeft: "4px solid #b89b7b",
                    titleColor: "#e0c0a0",
                    contentColor: "#d0c0b0"
                },
                typology: {
                    ...DEFAULT_THEME_CONFIG.scene.typology,
                    background: "rgba(180,130,80,0.1)",
                    borderLeft: "4px solid #b89b7b",
                    titleColor: "#e0c0a0",
                    contentColor: "#d0c0b0"
                },
                additionalField: {
                    ...DEFAULT_THEME_CONFIG.scene.additionalField,
                    borderLeft: "3px solid #b89b7b",
                    titleColor: "#e0c0a0"
                }
            },
            gameItems: {
                personality: createGameItemConfig("#b89b7b", "#3a2e22", "#2a241a"),
                typology: createGameItemConfig("#8b6b4f", "#3a2e22", "#2a241a"),
                organization: createGameItemConfig("#a0522d", "#3a2e22", "#2a241a"),
                relations: createGameItemConfig("#cd5c5c", "#3a2e22", "#2a241a"),
                skill: createGameItemConfig("#d4af37", "#3a2e22", "#2a241a"),
                stat_buffs: createGameItemConfig("#4682b4", "#2a3a4a", "#1a2a3a"),
                bless: createGameItemConfig("#b0a090", "#3a3a3a", "#2a2a2a"),
                curse: createGameItemConfig("#8b0000", "#3a1a1a", "#2a0f0f"),
                buff_debuff: createGameItemConfig("#20b2aa", "#1a3a3a", "#0f2a2a"),
                inventory: createGameItemConfig("#a0522d", "#3a2e22", "#2a241a"),
                details: createGameItemConfig("#b89b7b", "#3a2e22", "#2a241a")
            },
            history: {
                ...HISTORY_CONFIG,
                container: { background: "#1e1a14", padding: "0" },
                header: { background: "#2a241a", borderBottom: "2px solid #b89b7b", color: "#f0e0d0" },
                headerButtons: {
                    background: "rgba(180,130,80,0.15)",
                    border: "1px solid #b89b7b",
                    color: "#b89b7b",
                    hover: { background: "rgba(180,130,80,0.3)", borderColor: "#d4af37", color: "#f0e0d0" }
                },
                turn: { background: "#2a241a", border: "0.5px solid rgba(180,130,80,0.3)" },
                turnSummary: {
                    background: "rgba(0,0,0,0.2)",
                    color: "#f0e0d0",
                    summaryColor: "#d0c0b0",
                    actionCountColor: "#b0a090",
                    timestampColor: "#908070"
                },
                turnContent: { background: "rgba(0,0,0,0.15)", color: "#e0d0c0" },
                accentColors: { success: "#6b8e23", failure: "#b22222", mixed: "#daa520", neutral: "#b89b7b" }
            }
        }
    },
    
    vampire: {
        name: "Vampire Gothic",
        description: "Готическая тема с кровавыми акцентами",
        preview: "linear-gradient(135deg, #1a0a0a 0%, #2a0f0f 100%)",
        config: {
            ...DEFAULT_THEME_CONFIG,
            name: "Vampire Gothic",
            global: {
                icons: { set: 'fa', emojiFilter: 'brightness(0.9) contrast(1.2)' },
                layout: {
                    scrollbarColor: "#b22222",
                    scrollbarBg: "#1a0a0a",
                    selectionColor: "#ff6b6b",
                    selectionBg: "rgba(178, 34, 34, 0.3)",
                    blockMargin: "15px"
                }
            },
            typography: {
                headers: { fontFamily: "'Cinzel', serif", fontWeight: "900", letterSpacing: "2px", textTransform: "uppercase" },
                body: { fontFamily: "'Cormorant', serif", fontWeight: "400", fontSize: "17px", lineHeight: "1.7", color: "#e0d0d0" },
                ui: { fontFamily: "'Cinzel', serif", fontWeight: "600", fontSize: "14px", letterSpacing: "1px" },
                monospace: { fontFamily: "'Fira Code', monospace", fontSize: "13px" }
            },
            scene: {
                ...DEFAULT_THEME_CONFIG.scene,
                textBlock: {
                    background: "linear-gradient(135deg, #1a0a0a 0%, #2a0f0f 100%)",
                    border: "2px solid #b22222",
                    borderRadius: "8px",
                    padding: "18px",
                    color: "#f0e0e0",
                    fontFamily: "'Cormorant', serif",
                    fontSize: "1.1em",
                    boxShadow: "0 4px 16px rgba(178,34,34,0.4), inset 0 0 20px rgba(178,34,34,0.1)"
                },
                aiMemory: {
                    background: "rgba(178,34,34,0.15)",
                    borderLeft: "4px solid #b22222",
                    borderRadius: "6px",
                    padding: "12px",
                    titleColor: "#ff8a8a",
                    contentColor: "#d0b0b0",
                    keyColor: "#ff8a8a",
                    valueColor: "#f0d0d0"
                },
                choices: {
                    containerMargin: "20px 0 0 0",
                    btn: {
                        background: "linear-gradient(180deg, #2a0f0f 0%, #1a0a0a 100%)",
                        border: "2px solid #b22222",
                        color: "#f0e0e0",
                        borderRadius: "8px",
                        padding: "14px 20px",
                        fontFamily: "'Cinzel', serif",
                        fontSize: "1em",
                        hoverBg: "linear-gradient(180deg, #3a1a1a 0%, #2a0f0f 100%)",
                        hoverBorder: "#ff6b6b",
                        selectedBg: "rgba(178,34,34,0.3)",
                        selectedBorder: "#ff6b6b",
                        selectedColor: "#ffffff",
                        marginBottom: "10px"
                    }
                },
                designNotes: {
                    ...DEFAULT_THEME_CONFIG.scene.designNotes,
                    background: "rgba(178,34,34,0.1)",
                    borderLeft: "4px solid #b22222",
                    titleColor: "#ff8a8a",
                    contentColor: "#d0b0b0"
                },
                summary: {
                    ...DEFAULT_THEME_CONFIG.scene.summary,
                    background: "rgba(178,34,34,0.1)",
                    borderLeft: "4px solid #b22222",
                    titleColor: "#ff8a8a",
                    contentColor: "#d0b0b0"
                },
                reflection: {
                    ...DEFAULT_THEME_CONFIG.scene.reflection,
                    background: "rgba(178,34,34,0.1)",
                    borderLeft: "4px solid #b22222",
                    titleColor: "#ff8a8a",
                    contentColor: "#d0b0b0"
                },
                personality: {
                    ...DEFAULT_THEME_CONFIG.scene.personality,
                    background: "rgba(178,34,34,0.1)",
                    borderLeft: "4px solid #b22222",
                    titleColor: "#ff8a8a",
                    contentColor: "#d0b0b0"
                },
                typology: {
                    ...DEFAULT_THEME_CONFIG.scene.typology,
                    background: "rgba(178,34,34,0.1)",
                    borderLeft: "4px solid #b22222",
                    titleColor: "#ff8a8a",
                    contentColor: "#d0b0b0"
                },
                additionalField: {
                    ...DEFAULT_THEME_CONFIG.scene.additionalField,
                    borderLeft: "3px solid #b22222",
                    titleColor: "#ff8a8a"
                }
            },
            gameItems: {
                personality: createGameItemConfig("#b22222", "#2a0a0a", "#1a0505"),
                typology: createGameItemConfig("#cd5c5c", "#2a0a0a", "#1a0505"),
                organization: createGameItemConfig("#8b0000", "#2a0000", "#1a0000"),
                relations: createGameItemConfig("#dc143c", "#2a0510", "#1a0208"),
                skill: createGameItemConfig("#b22222", "#2a0000", "#1a0000"),
                stat_buffs: createGameItemConfig("#800020", "#200008", "#100004"),
                bless: createGameItemConfig("#696969", "#2a2a2a", "#1a1a1a"),
                curse: createGameItemConfig("#8b0000", "#2a0000", "#1a0000"),
                buff_debuff: createGameItemConfig("#a52a2a", "#2a0a05", "#1a0502"),
                inventory: createGameItemConfig("#8b4513", "#2a1a0a", "#1a0d05"),
                details: createGameItemConfig("#cd5c5c", "#2a0a0a", "#1a0505")
            },
            history: {
                ...HISTORY_CONFIG,
                container: { background: "#150808", padding: "0" },
                header: { background: "#1a0a0a", borderBottom: "2px solid #b22222", color: "#f0e0e0" },
                headerButtons: {
                    background: "rgba(178,34,34,0.15)",
                    border: "1px solid #b22222",
                    color: "#ff8a8a",
                    hover: { background: "rgba(178,34,34,0.3)", borderColor: "#ff6b6b", color: "#ffffff" }
                },
                turn: { background: "#1a0a0a", border: "0.5px solid rgba(178,34,34,0.3)" },
                turnSummary: {
                    background: "rgba(0,0,0,0.3)",
                    color: "#f0e0e0",
                    summaryColor: "#d0b0b0",
                    actionCountColor: "#b09090",
                    timestampColor: "#907070"
                },
                turnContent: { background: "rgba(0,0,0,0.2)", color: "#e0d0d0" },
                accentColors: { success: "#4cd137", failure: "#e84118", mixed: "#fbc531", neutral: "#b22222" }
            }
        }
    },
    
    retro: {
        name: "Retro Console",
        description: "Ретро-стиль игровой консоли 8-бит на тёмном фоне",
        preview: "linear-gradient(135deg, #1a103a 0%, #2a1a4a 100%)",
        config: {
            ...DEFAULT_THEME_CONFIG,
            name: "Retro Console",
            global: {
                icons: { set: 'emoji', emojiFilter: 'none' },
                layout: {
                    scrollbarColor: "#ff9f00",
                    scrollbarBg: "#1a103a",
                    selectionColor: "#ffeb3b",
                    selectionBg: "rgba(255, 159, 0, 0.3)",
                    blockMargin: "15px"
                }
            },
            typography: {
                headers: { fontFamily: "'Press Start 2P', cursive", fontWeight: "400", letterSpacing: "2px", textTransform: "uppercase" },
                body: { fontFamily: "'VT323', monospace", fontWeight: "400", fontSize: "20px", lineHeight: "1.4", color: "#e0e0a0" },
                ui: { fontFamily: "'Press Start 2P', cursive", fontWeight: "400", fontSize: "11px", letterSpacing: "1px" },
                monospace: { fontFamily: "'VT323', monospace", fontSize: "18px" }
            },
            scene: {
                ...DEFAULT_THEME_CONFIG.scene,
                textBlock: {
                    background: "#1a103a",
                    border: "4px solid #ff9f00",
                    borderRadius: "0px",
                    padding: "16px",
                    color: "#ffffb0",
                    fontFamily: "'VT323', monospace",
                    fontSize: "1.3em",
                    boxShadow: "0 0 20px rgba(255,159,0,0.5), inset 0 0 20px rgba(255,159,0,0.1)"
                },
                aiMemory: {
                    background: "rgba(255, 159, 0, 0.15)",
                    borderLeft: "6px solid #ff9f00",
                    borderRadius: "0px",
                    padding: "12px",
                    titleColor: "#ff9f00",
                    contentColor: "#c0ff80",
                    keyColor: "#ff9f00",
                    valueColor: "#c0ff80"
                },
                choices: {
                    containerMargin: "20px 0 0 0",
                    btn: {
                        background: "#1a103a",
                        border: "3px solid #c0ff80",
                        color: "#c0ff80",
                        borderRadius: "0px",
                        padding: "12px 16px",
                        fontFamily: "'Press Start 2P', cursive",
                        fontSize: "0.9em",
                        hoverBg: "rgba(192,255,128,0.2)",
                        hoverBorder: "#c0ff80",
                        selectedBg: "#c0ff80",
                        selectedBorder: "#c0ff80",
                        selectedColor: "#1a103a",
                        marginBottom: "10px"
                    }
                },
                designNotes: {
                    ...DEFAULT_THEME_CONFIG.scene.designNotes,
                    background: "rgba(255,159,0,0.1)",
                    borderLeft: "6px solid #ff9f00",
                    titleColor: "#ff9f00",
                    contentColor: "#c0ff80"
                },
                summary: {
                    ...DEFAULT_THEME_CONFIG.scene.summary,
                    background: "rgba(192,255,128,0.1)",
                    borderLeft: "6px solid #c0ff80",
                    titleColor: "#c0ff80",
                    contentColor: "#ff9f00"
                },
                reflection: {
                    ...DEFAULT_THEME_CONFIG.scene.reflection,
                    background: "rgba(255,159,0,0.1)",
                    borderLeft: "6px solid #ff9f00",
                    titleColor: "#ff9f00",
                    contentColor: "#c0ff80"
                },
                personality: {
                    ...DEFAULT_THEME_CONFIG.scene.personality,
                    background: "rgba(192,255,128,0.1)",
                    borderLeft: "6px solid #c0ff80",
                    titleColor: "#c0ff80",
                    contentColor: "#ff9f00"
                },
                typology: {
                    ...DEFAULT_THEME_CONFIG.scene.typology,
                    background: "rgba(255,159,0,0.1)",
                    borderLeft: "6px solid #ff9f00",
                    titleColor: "#ff9f00",
                    contentColor: "#c0ff80"
                },
                additionalField: {
                    ...DEFAULT_THEME_CONFIG.scene.additionalField,
                    borderLeft: "4px solid #ff9f00",
                    titleColor: "#ff9f00"
                }
            },
            gameItems: {
                personality: createGameItemConfig("#ff9f00", "#2a1a4a", "#1a103a"),
                typology: createGameItemConfig("#c0ff80", "#1a3a1a", "#0f2a0f"),
                organization: createGameItemConfig("#80ffff", "#103a3a", "#0a2a2a"),
                relations: createGameItemConfig("#ff80ff", "#3a103a", "#2a0a2a"),
                skill: createGameItemConfig("#ffff80", "#3a3a10", "#2a2a0a"),
                stat_buffs: createGameItemConfig("#80c0ff", "#102a3a", "#0a1a2a"),
                bless: createGameItemConfig("#ffffff", "#2a2a2a", "#1a1a1a"),
                curse: createGameItemConfig("#ff4040", "#3a1010", "#2a0a0a"),
                buff_debuff: createGameItemConfig("#80ffc0", "#103a2a", "#0a2a1a"),
                inventory: createGameItemConfig("#ffb080", "#3a2a10", "#2a1a0a"),
                details: createGameItemConfig("#80c0ff", "#102a3a", "#0a1a2a")
            },
            history: {
                ...HISTORY_CONFIG,
                container: { background: "#120a2a", padding: "0" },
                header: { background: "#1a103a", borderBottom: "4px solid #ff9f00", color: "#ffffb0" },
                headerButtons: {
                    background: "rgba(255,159,0,0.15)",
                    border: "2px solid #ff9f00",
                    color: "#ff9f00",
                    hover: { background: "rgba(255,159,0,0.3)", borderColor: "#ff9f00", color: "#ffffff" }
                },
                turn: { background: "#1a103a", border: "2px solid rgba(255,159,0,0.3)" },
                turnSummary: {
                    background: "rgba(0,0,0,0.3)",
                    color: "#ffffb0",
                    summaryColor: "#e0e0a0",
                    actionCountColor: "#c0c080",
                    timestampColor: "#a0a060"
                },
                turnContent: { background: "rgba(0,0,0,0.2)", color: "#f0f0c0" },
                accentColors: { success: "#c0ff80", failure: "#ff4040", mixed: "#ffff80", neutral: "#ff9f00" }
            }
        }
    },
    
    ocean: {
        name: "Deep Ocean",
        description: "Глубоководная тема с бирюзовыми акцентами",
        preview: "linear-gradient(135deg, #001a2a 0%, #002b3a 100%)",
        config: {
            ...DEFAULT_THEME_CONFIG,
            name: "Deep Ocean",
            global: {
                icons: { set: 'emoji', emojiFilter: 'hue-rotate(180deg) brightness(1.1)' },
                layout: {
                    scrollbarColor: "#00b8d4",
                    scrollbarBg: "#001a2a",
                    selectionColor: "#00e5ff",
                    selectionBg: "rgba(0, 184, 212, 0.2)",
                    blockMargin: "15px"
                }
            },
            typography: {
                headers: { fontFamily: "'Montserrat', sans-serif", fontWeight: "700", letterSpacing: "1.5px", textTransform: "uppercase" },
                body: { fontFamily: "'Inter', sans-serif", fontWeight: "400", fontSize: "16px", lineHeight: "1.6", color: "#d0eef0" },
                ui: { fontFamily: "'Montserrat', sans-serif", fontWeight: "600", fontSize: "14px", letterSpacing: "0.5px" },
                monospace: { fontFamily: "'JetBrains Mono', monospace", fontSize: "13px" }
            },
            scene: {
                ...DEFAULT_THEME_CONFIG.scene,
                textBlock: {
                    background: "linear-gradient(135deg, #001f2f 0%, #002b3f 100%)",
                    border: "2px solid #00b8d4",
                    borderRadius: "12px",
                    padding: "18px",
                    color: "#e0f7fa",
                    fontFamily: "'Inter', sans-serif",
                    fontSize: "1.05em",
                    boxShadow: "0 4px 16px rgba(0, 184, 212, 0.3), inset 0 0 20px rgba(0,184,212,0.05)"
                },
                aiMemory: {
                    background: "rgba(0, 184, 212, 0.1)",
                    borderLeft: "4px solid #00b8d4",
                    borderRadius: "8px",
                    padding: "12px",
                    titleColor: "#00e5ff",
                    contentColor: "#b0e0e0",
                    keyColor: "#00e5ff",
                    valueColor: "#d0f0f0"
                },
                choices: {
                    containerMargin: "20px 0 0 0",
                    btn: {
                        background: "linear-gradient(180deg, #002b3f 0%, #001f2f 100%)",
                        border: "2px solid #00b8d4",
                        color: "#e0f7fa",
                        borderRadius: "10px",
                        padding: "14px 18px",
                        fontFamily: "'Montserrat', sans-serif",
                        fontSize: "1em",
                        hoverBg: "linear-gradient(180deg, #003f5f 0%, #002b3f 100%)",
                        hoverBorder: "#00d8ff",
                        selectedBg: "rgba(0, 184, 212, 0.3)",
                        selectedBorder: "#00e5ff",
                        selectedColor: "#ffffff",
                        marginBottom: "10px"
                    }
                },
                designNotes: {
                    ...DEFAULT_THEME_CONFIG.scene.designNotes,
                    background: "rgba(0,184,212,0.1)",
                    borderLeft: "4px solid #00b8d4",
                    titleColor: "#00e5ff",
                    contentColor: "#b0e0e0"
                },
                summary: {
                    ...DEFAULT_THEME_CONFIG.scene.summary,
                    background: "rgba(0,184,212,0.1)",
                    borderLeft: "4px solid #00b8d4",
                    titleColor: "#00e5ff",
                    contentColor: "#b0e0e0"
                },
                reflection: {
                    ...DEFAULT_THEME_CONFIG.scene.reflection,
                    background: "rgba(0,184,212,0.1)",
                    borderLeft: "4px solid #00b8d4",
                    titleColor: "#00e5ff",
                    contentColor: "#b0e0e0"
                },
                personality: {
                    ...DEFAULT_THEME_CONFIG.scene.personality,
                    background: "rgba(0,184,212,0.1)",
                    borderLeft: "4px solid #00b8d4",
                    titleColor: "#00e5ff",
                    contentColor: "#b0e0e0"
                },
                typology: {
                    ...DEFAULT_THEME_CONFIG.scene.typology,
                    background: "rgba(0,184,212,0.1)",
                    borderLeft: "4px solid #00b8d4",
                    titleColor: "#00e5ff",
                    contentColor: "#b0e0e0"
                },
                additionalField: {
                    ...DEFAULT_THEME_CONFIG.scene.additionalField,
                    borderLeft: "3px solid #00b8d4",
                    titleColor: "#00e5ff"
                }
            },
            gameItems: {
                personality: createGameItemConfig("#00b8d4", "#001a2a", "#000d15"),
                typology: createGameItemConfig("#00e5ff", "#002a3a", "#00151d"),
                organization: createGameItemConfig("#0091ea", "#001a2a", "#000d15"),
                relations: createGameItemConfig("#18ffff", "#002a2a", "#001515"),
                skill: createGameItemConfig("#00acc1", "#001a25", "#000d12"),
                stat_buffs: createGameItemConfig("#0277bd", "#000d2a", "#000615"),
                bless: createGameItemConfig("#b0bec5", "#1a2a2a", "#0d1515"),
                curse: createGameItemConfig("#d32f2f", "#2a0000", "#150000"),
                buff_debuff: createGameItemConfig("#00bcd4", "#001a2a", "#000d15"),
                inventory: createGameItemConfig("#455a64", "#1a1a2a", "#0d0d15"),
                details: createGameItemConfig("#00b8d4", "#001a2a", "#000d15")
            },
            history: {
                ...HISTORY_CONFIG,
                container: { background: "#00121f", padding: "0" },
                header: { background: "#001f2f", borderBottom: "2px solid #00b8d4", color: "#e0f7fa" },
                headerButtons: {
                    background: "rgba(0,184,212,0.15)",
                    border: "1px solid #00b8d4",
                    color: "#00b8d4",
                    hover: { background: "rgba(0,184,212,0.3)", borderColor: "#00e5ff", color: "#ffffff" }
                },
                turn: { background: "#001a2a", border: "0.5px solid rgba(0,184,212,0.2)" },
                turnSummary: {
                    background: "rgba(0,0,0,0.2)",
                    color: "#e0f7fa",
                    summaryColor: "#b0e0e0",
                    actionCountColor: "#90c0c0",
                    timestampColor: "#70a0a0"
                },
                turnContent: { background: "rgba(0,0,0,0.15)", color: "#d0f0f0" },
                accentColors: { success: "#00e676", failure: "#ff1744", mixed: "#ffea00", neutral: "#00b8d4" }
            }
        }
    }
};

// 12. ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
export function deepMerge(target, source) {
    const output = Object.assign({}, target);
    if (isObject(target) && isObject(source)) {
        Object.keys(source).forEach(key => {
            if (isObject(source[key])) {
                if (!(key in target))
                    Object.assign(output, { [key]: source[key] });
                else
                    output[key] = deepMerge(target[key], source[key]);
            } else {
                Object.assign(output, { [key]: source[key] });
            }
        });
    }
    return output;
}

function isObject(item) {
    return (item && typeof item === 'object' && !Array.isArray(item));
}

export function getAllFonts() {
    return Object.keys(FONT_LIBRARY);
}

export function getAllIconFilters() {
    return EMOJI_FILTERS;
}

export function getPresetKeys() {
    return Object.keys(PRESET_THEMES);
}

export function getPresetByKey(key) {
    return PRESET_THEMES[key];
}