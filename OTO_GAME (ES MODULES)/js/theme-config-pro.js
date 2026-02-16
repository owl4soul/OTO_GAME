// js/theme-config-pro.js
'use strict';

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * CONFIG: THEME CONFIGURATION PRO (FINAL)
 * ═══════════════════════════════════════════════════════════════════════════
 * Полная конфигурация. Содержит реестры шрифтов, иконок и дефолтные значения.
 */

// 1. БИБЛИОТЕКА ШРИФТОВ (Google Fonts)
// Используется в редакторе для выпадающих списков и в движке для генерации @import
export const FONT_LIBRARY = {
    'Nunito Sans': 'https://fonts.googleapis.com/css2?family=Nunito+Sans:wght@300;400;600;700&display=swap',
    'Unbounded': 'https://fonts.googleapis.com/css2?family=Unbounded:wght@300;400;600;700&display=swap',
    'Exo 2': 'https://fonts.googleapis.com/css2?family=Exo+2:wght@300;400;600;700&display=swap',
    'Roboto Mono': 'https://fonts.googleapis.com/css2?family=Roboto+Mono:wght@400;500;700&display=swap',
    'Cinzel': 'https://fonts.googleapis.com/css2?family=Cinzel:wght@400;700&display=swap',
    'Playfair Display': 'https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700&display=swap',
    'Press Start 2P': 'https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap',
    'Orbitron': 'https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700&display=swap',
    'Comfortaa': 'https://fonts.googleapis.com/css2?family=Comfortaa:wght@300;400;700&display=swap',
    'Lora': 'https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,400;0,700;1,400&display=swap'
};

// 2. ICON MAPPING (FontAwesome -> Emoji)
export const ICON_MAPPINGS = {
    'fa-user-circle': '👤',
    'fa-fingerprint': '🆔',
    'fa-users': '👥',
    'fa-scroll': '📜',
    'fa-tachometer-alt': '⏱️',
    'fa-star': '✨',
    'fa-skull-crossbones': '☠️',
    'fa-chart-line': '📈',
    'fa-info-circle': 'ℹ️',
    'fa-box': '🎒',
    'fa-brain': '🧠',
    'fa-file-alt': '📄',
    'fa-pencil-alt': '✏️',
    'fa-eye': '👁️',
    'fa-book': '📖',
    'fa-keyboard': '⌨️',
    'fa-list-ul': '📋',
    'fa-history': '📜',
    'fa-exchange-alt': '🔄',
    'fa-hand-point-right': '👉',
    'fa-check-circle': '✅',
    'fa-exclamation-triangle': '⚠️',
    'fa-users-slash': '🚫',
    'fa-user-friends': '🤝',
    'fa-user-clock': '⏳',
    'fa-chevron-right': '▶',
    'fa-chevron-down': '▼',
    'fa-expand-alt': '⤢',
    'fa-compress-alt': '⤡',
    'fa-fill-drip': '🎨',
    'fa-undo': '↩️',
    'fa-redo': '↪️',
    'fa-save': '💾',
    'fa-download': '📥',
    'fa-upload': '📤',
    'fa-times': '❌',
    'fa-search': '🔍',
    'fa-trash-restore': '🗑️',
    'fa-layer-group': '📚',
    'fa-boxes': '📦',
    'fa-palette': '🎨',
    'fa-globe': '🌐'
};

// 3. GLOBAL SETTINGS
export const GLOBAL_SETTINGS = {
    icons: {
        set: 'fa', // 'fa' (FontAwesome) or 'emoji'
        emojiFilter: 'none' // 'none', 'grayscale(100%)', 'sepia(100%)', 'hue-rotate(90deg)'
    },
    layout: {
        scrollbarColor: "#d4af37",
        scrollbarBg: "#1a1a1a",
        selectionColor: "#d4af37",
        selectionBg: "rgba(212, 175, 55, 0.2)"
    }
};

// 4. TYPOGRAPHY CONFIG
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

// 5. SCENE CONFIG
export const SCENE_CONFIG = {
    container: {
        padding: "0px",
        background: "transparent"
    },
    // Основной текст сцены
    textBlock: {
        background: "rgba(30, 30, 30, 0.6)",
        border: "1px solid rgba(255, 255, 255, 0.1)",
        borderRadius: "6px",
        padding: "15px",
        color: "#dddddd",
        fontFamily: "'Nunito Sans', sans-serif",
        fontSize: "1.05em",
        boxShadow: "0 4px 8px rgba(0,0,0,0.3)"
    },
    // Память ГМ внутри сцены
    aiMemory: {
        background: "rgba(251, 197, 49, 0.07)",
        borderLeft: "4px solid #fbc531",
        borderRadius: "4px",
        padding: "12px",
        titleColor: "#fbc531",
        contentColor: "#aaaaaa",
        keyColor: "#fbc531",
        valueColor: "#cccccc"
    },
    // Кнопки выбора
    choices: {
        containerMargin: "20px 0 0 0",
        btn: {
            // Внутри SCENE_CONFIG -> choices -> btn
background: "rgba(0, 0, 0, 0.4)",            // Полупрозрачный черный фон
border: "1px solid rgba(255, 255, 255, 0.1)", // Тонкая едва заметная рамка
color: "#cccccc",                            // Светло-серый текст
hoverBg: "rgba(50, 50, 50, 0.6)",             // Чуть светлее при наведении
hoverBorder: "rgba(255, 255, 255, 0.3)",      // Рамка становится ярче
selectedBg: "rgba(212, 175, 55, 0.15)",       // Золотистый отсвет для выбранной
selectedBorder: "#d4af37",                    // Золотая рамка для выбранной
selectedColor: "#d4af37",                     // Золотой текст для выбранной
            borderRadius: "6px",
            padding: "12px 15px",
            fontFamily: "'Exo 2', sans-serif",
            fontSize: "1em"
        }
    }
};

// 6. GAME ITEMS CONFIG (Генератор конфига для однотипных блоков)
const createGameItemConfig = (primaryColor, bgGradientStart, bgGradientEnd) => ({
    // Заголовок блока
    header: {
        color: primaryColor,
        borderBottom: `2px solid ${primaryColor}40`,
        fontFamily: "'Unbounded', sans-serif",
        fontSize: "0.9em",
        padding: "4px 0"
    },
    // Контейнер блока
    container: {
        background: `linear-gradient(135deg, ${bgGradientStart} 0%, ${bgGradientEnd} 100%)`,
        border: "1px solid rgba(255,255,255,0.05)",
        borderRadius: "6px",
        padding: "4px",
        marginBottom: "2px"
    },
    // Бейджи внутри блока
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

// 7. TURN UPDATES CONFIG
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

// 8. HISTORY CONFIG
export const HISTORY_CONFIG = {
    container: {
        background: "#050505",
        padding: "0"
    },
    header: {
        background: "#111111",
        borderBottom: "1px solid #e84118",
        color: "#dddddd",
        fontFamily: "'Exo 2', sans-serif",
        fontSize: "0.75em"
    },
    turn: {
        background: "#0a0a0a",
        border: "1px solid rgba(255,255,255,0.05)",
        borderLeft: "2px solid #555",
        borderRadius: "2px",
        marginBottom: "2px"
    },
    turnSummary: {
        background: "rgba(255,255,255,0.02)",
        color: "#dddddd",
        fontFamily: "'Nunito Sans', sans-serif",
        fontSize: "0.8em"
    },
    turnContent: {
        background: "rgba(0,0,0,0.2)",
        color: "#cccccc",
        fontSize: "0.75em",
        fontFamily: "'Nunito Sans', sans-serif"
    }
};

// 9. DEFAULT THEME STRUCTURE
export const DEFAULT_THEME_CONFIG = {
    name: "Default Pro",
    description: "Стандартная профессиональная темная тема",
    global: GLOBAL_SETTINGS,
    typography: TYPOGRAPHY_CONFIG,
    scene: SCENE_CONFIG,
    gameItems: GAME_ITEMS_CONFIG,
    turnUpdates: TURN_UPDATES_CONFIG,
    history: HISTORY_CONFIG,
    icons: ICON_MAPPINGS // Маппинг сохраняется в теме, чтобы можно было переопределять символы
};

// 10. PRESETS
export const PRESET_THEMES = {
    default: {
        name: "Dark Industrial",
        description: "Оригинальная темная тема",
        config: DEFAULT_THEME_CONFIG
    },
    forest: {
        name: "Elven Forest",
        description: "Природные тона, дерево и магия",
        config: {
            ...DEFAULT_THEME_CONFIG,
            name: "Elven Forest",
            global: {
                ...GLOBAL_SETTINGS,
                layout: { ...GLOBAL_SETTINGS.layout, borderRadius: "12px", scrollbarColor: "#2ecc71" }
            },
            typography: {
                ...TYPOGRAPHY_CONFIG,
                headers: { ...TYPOGRAPHY_CONFIG.headers, fontFamily: "'Cinzel', serif" },
                body: { ...TYPOGRAPHY_CONFIG.body, fontFamily: "'Lora', serif" }
            },
            scene: {
                ...SCENE_CONFIG,
                textBlock: {
                    ...SCENE_CONFIG.textBlock,
                    background: "rgba(10, 20, 10, 0.8)",
                    border: "1px solid #2ecc71",
                    fontFamily: "'Lora', serif"
                },
                choices: {
                    ...SCENE_CONFIG.choices,
                    btn: {
                        ...SCENE_CONFIG.choices.btn,
                        background: "linear-gradient(180deg, #1e3c23 0%, #0f1f10 100%)",
                        border: "1px solid #2ecc71",
                        fontFamily: "'Cinzel', serif",
                        selectedBorder: "#2ecc71",
                        selectedColor: "#2ecc71",
                        selectedBg: "rgba(46, 204, 113, 0.2)"
                    }
                }
            },
            gameItems: {
                ...GAME_ITEMS_CONFIG,
                personality: createGameItemConfig("#2ecc71", "#0a2a0a", "#051a05"),
                skill: createGameItemConfig("#f1c40f", "#2a220a", "#1a1100"),
                inventory: createGameItemConfig("#e67e22", "#2a1505", "#1a0a00")
            }
        }
    },
    cyber: {
        name: "Cyberpunk Neon",
        description: "Высокий контраст, неон, терминал",
        config: {
            ...DEFAULT_THEME_CONFIG,
            name: "Cyberpunk Neon",
            global: {
                ...GLOBAL_SETTINGS,
                layout: { ...GLOBAL_SETTINGS.layout, borderRadius: "0px", scrollbarColor: "#00ff00" }
            },
            typography: {
                ...TYPOGRAPHY_CONFIG,
                headers: { ...TYPOGRAPHY_CONFIG.headers, fontFamily: "'Orbitron', sans-serif" },
                body: { ...TYPOGRAPHY_CONFIG.body, fontFamily: "'Roboto Mono', monospace" }
            },
            scene: {
                ...SCENE_CONFIG,
                textBlock: {
                    ...SCENE_CONFIG.textBlock,
                    background: "#000000",
                    border: "1px solid #00ff00",
                    color: "#00ff00",
                    fontFamily: "'Roboto Mono', monospace",
                    boxShadow: "0 0 10px rgba(0,255,0,0.2)"
                },
                choices: {
                    ...SCENE_CONFIG.choices,
                    btn: {
                        ...SCENE_CONFIG.choices.btn,
                        background: "#000000",
                        border: "1px solid #ff00ff",
                        color: "#ff00ff",
                        fontFamily: "'Orbitron', sans-serif",
                        hoverBg: "rgba(255,0,255,0.2)",
                        selectedBg: "#ff00ff",
                        selectedColor: "#000000",
                        selectedBorder: "#ff00ff"
                    }
                }
            }
        }
    },
    paper: {
        name: "Old Paper",
        description: "Светлая тема, имитация бумаги",
        config: {
            ...DEFAULT_THEME_CONFIG,
            name: "Old Paper",
            global: {
                icons: { set: 'emoji', emojiFilter: 'sepia(100%)' },
                layout: { scrollbarColor: "#8b4513", scrollbarBg: "#f4e4bc", selectionBg: "rgba(139, 69, 19, 0.2)" }
            },
            typography: {
                headers: { fontFamily: "'Playfair Display', serif", fontWeight: "700", letterSpacing: "0" },
                body: { fontFamily: "'Lora', serif", fontWeight: "400", fontSize: "17px", lineHeight: "1.6" },
                ui: { fontFamily: "'Playfair Display', serif", fontWeight: "600", fontSize: "15px" }
            },
            scene: {
                ...SCENE_CONFIG,
                container: { padding: "10px", background: "#f4e4bc" },
                textBlock: {
                    background: "transparent",
                    border: "none",
                    color: "#2c2c2c",
                    fontFamily: "'Lora', serif",
                    boxShadow: "none"
                },
                choices: {
                    ...SCENE_CONFIG.choices,
                    btn: {
                        background: "#e8dcc5",
                        border: "1px solid #8b4513",
                        color: "#3e2723",
                        borderRadius: "2px",
                        fontFamily: "'Playfair Display', serif",
                        hoverBg: "#dccfb4",
                        selectedBg: "#3e2723",
                        selectedColor: "#f4e4bc",
                        selectedBorder: "#3e2723"
                    }
                }
            },
            gameItems: {
                personality: createGameItemConfig("#8b4513", "#f4e4bc", "#e8dcc5"),
                typology: createGameItemConfig("#556b2f", "#f4e4bc", "#e8dcc5"),
                inventory: createGameItemConfig("#a0522d", "#f4e4bc", "#e8dcc5"),
                skill: createGameItemConfig("#483d8b", "#f4e4bc", "#e8dcc5"),
                // Для светлой темы нужно инвертировать цвета текста в createGameItemConfig, но здесь оставим как пример
                // В реальной реализации можно пройтись циклом и поправить цвета
            },
            history: {
                ...HISTORY_CONFIG,
                container: { background: "#f4e4bc" },
                header: { background: "#e8dcc5", color: "#3e2723", borderBottom: "1px solid #8b4513" },
                turn: { background: "rgba(255,255,255,0.4)", border: "1px solid #8b4513", borderLeft: "3px solid #8b4513" },
                turnSummary: { background: "transparent", color: "#3e2723" },
                turnContent: { background: "transparent", color: "#2c2c2c" }
            }
        }
    }
};