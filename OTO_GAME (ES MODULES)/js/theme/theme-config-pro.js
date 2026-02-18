// Файл: theme-config-pro.js (ПОЛНАЯ ИСПРАВЛЕННАЯ ВЕРСИЯ)
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

// 4. ГЛОБАЛЬНЫЕ НАСТРОЙКИ (ИЗМЕНЕНО: добавлен объект scrollbar)
export const GLOBAL_SETTINGS = {
    icons: {
        set: 'fa',
        emojiFilter: 'none'
    },
    layout: {
        scrollbar: {
            width: '4px',
            height: '4px',
            trackBg: '#0a0000',
            trackBorderRadius: '4px',
            thumbBg: 'linear-gradient(135deg, #4a0a0a 0%, #2a0000 100%)',
            thumbBorder: '1px solid #1a0000',
            thumbBorderRadius: '4px',
            thumbHoverBg: 'linear-gradient(135deg, #6a0a0a 0%, #3a0000 100%)',
            thumbHoverBorder: '1px solid #1a0000'
        },
        selectionColor: "#d4af37",
        selectionBg: "rgba(212, 175, 55, 0.2)",
        blockMargin: "5px"
    }
};

// 5. ТИПОГРАФИКА
export const TYPOGRAPHY_CONFIG = {
    headers: {
        fontFamily: "'Unbounded', sans-serif",
        fontWeight: "500",
        letterSpacing: "1px",
        textTransform: "uppercase"
    },
    body: {
        fontFamily: "'Nunito Sans', sans-serif",
        fontWeight: "300",
        fontSize: "14px",
        lineHeight: "1.6"
    },
    ui: {
        fontFamily: "'Exo 2', sans-serif",
        fontWeight: "400",
        fontSize: "14px",
        letterSpacing: "0.5px"
    },
    monospace: {
        fontFamily: "'Roboto Mono', monospace",
        fontSize: "14px"
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

// 8. ОБНОВЛЕНИЯ ЗА ХОД — РАСШИРЕННАЯ КОНФИГУРАЦИЯ
export const TURN_UPDATES_CONFIG = {
    container: {
        background: "rgba(10, 0, 0, 0.8)",
        border: "1px solid #4a0a0a",
        borderRadius: "4px",
        padding: "5px",
        marginBottom: "5px"
    },
    header: {
        color: "#d4af37",
        borderBottom: "1px solid #4a0a0a",
        fontSize: "0.9em",
        fontFamily: "'Unbounded', sans-serif",
        textTransform: "uppercase"
    },
    // НАСТРОЙКИ ДЛЯ СООБЩЕНИЙ ОТ ДЕЙСТВИЙ ИГРОКА
    action: {
        background: "rgba(76, 209, 55, 0.05)",
        border: "1px solid #4cd137",
        color: "#4cd137",
        fontFamily: "'Nunito Sans', sans-serif",
        fontSize: "0.9em",
        padding: "4px 8px",
        borderRadius: "4px",
        marginBottom: "4px",
        success: {
            background: "rgba(76, 209, 55, 0.15)",
            border: "1px solid #4cd137",
            color: "#4cd137"
        },
        failure: {
            background: "rgba(232, 65, 24, 0.15)",
            border: "1px solid #e84118",
            color: "#e84118"
        },
        partial: {
            background: "rgba(251, 197, 49, 0.15)",
            border: "1px solid #fbc531",
            color: "#fbc531"
        }
    },
    // НАСТРОЙКИ ДЛЯ СОБЫТИЙ (нейтральные, окружение)
    event: {
        background: "rgba(100, 100, 100, 0.1)",
        border: "1px solid #aaa",
        color: "#ccc",
        fontFamily: "'Nunito Sans', sans-serif",
        fontSize: "0.9em",
        padding: "4px 8px",
        borderRadius: "4px",
        marginBottom: "4px"
    }
};

// 9. ИСТОРИЯ
export const HISTORY_CONFIG = HISTORY_VISUAL_CONFIG;

// 10. БАЗОВАЯ ТЕМА (Industrial Gothic) — ОБНОВЛЕНА С НОВЫМИ ПОЛЯМИ
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

// 11. РАСШИРЕННЫЕ ПРЕСЕТЫ (ПОЛНОСТЬЮ ПЕРЕРАБОТАНЫ С УЧЁТОМ action/event)
export const PRESET_THEMES = {
    // ═══════════════════════════════════════════════════════════════════════════
    // 1. Industrial Gothic (дефолтная) – НЕ ТРОГАЕМ
    // ═══════════════════════════════════════════════════════════════════════════
    default: {
        name: "Industrial Gothic",
        description: "Оригинальная тёмная тема с золотыми акцентами (по умолчанию)",
        preview: "linear-gradient(135deg, #1a1a1a 0%, #2a2a2a 100%)",
        config: DEFAULT_THEME_CONFIG
    },

    // ═══════════════════════════════════════════════════════════════════════════
    // 2. OldPaper – состаренная бумага, рукописные шрифты
    // ═══════════════════════════════════════════════════════════════════════════
    oldPaper: {
        name: "Old Paper",
        description: "Тёмно-коричневая состаренная бумага, рукописные шрифты (Caveat, кириллица), идеальная контрастность и гармония",
        preview: "linear-gradient(135deg, #2b1e0f 0%, #3c2e1f 100%)",
        config: {
            ...DEFAULT_THEME_CONFIG,
            name: "Old Paper",
            global: {
                icons: { set: 'fa', emojiFilter: 'sepia(50%) brightness(1.2)' },
                layout: {
                    scrollbar: {
                        width: '6px',
                        height: '6px',
                        trackBg: '#2b1e0f',
                        trackBorderRadius: '4px',
                        thumbBg: '#b89b7b',
                        thumbBorder: '1px solid #5a4a3a',
                        thumbBorderRadius: '4px',
                        thumbHoverBg: '#d4af37',
                        thumbHoverBorder: '1px solid #b89b7b'
                    },
                    selectionColor: "#d4af37",
                    selectionBg: "rgba(180, 130, 80, 0.3)",
                    blockMargin: "15px"
                }
            },
            typography: {
                headers: { fontFamily: "'Caveat', cursive", fontWeight: "700", letterSpacing: "1px", textTransform: "uppercase" },
                body: { fontFamily: "'Caveat', cursive", fontWeight: "400", fontSize: "18px", lineHeight: "1.8", color: "#f0e6d2" },
                ui: { fontFamily: "'Caveat', cursive", fontWeight: "600", fontSize: "16px", letterSpacing: "0.5px" },
                monospace: { fontFamily: "'Roboto Mono', monospace", fontSize: "14px" }
            },
            scene: {
                container: { padding: "15px", background: "transparent" },
                textBlock: {
                    background: "linear-gradient(135deg, #2b1e0f 0%, #3c2e1f 100%)",
                    border: "2px solid #b89b7b",
                    borderRadius: "8px",
                    padding: "18px",
                    color: "#f0e6d2",
                    fontFamily: "'Caveat', cursive",
                    fontSize: "1.1em",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.5), inset 0 0 20px rgba(180,130,80,0.2)"
                },
                aiMemory: {
                    background: "rgba(180,130,80,0.15)",
                    borderLeft: "4px solid #b89b7b",
                    borderRadius: "6px",
                    padding: "12px",
                    titleColor: "#f0e6d2",
                    contentColor: "#f0e6d2",
                    keyColor: "#d4af37",
                    valueColor: "#f0e6d2"
                },
                choices: {
                    containerMargin: "20px 0 0 0",
                    btn: {
                        background: "linear-gradient(180deg, #3c2e1f 0%, #2b1e0f 100%)",
                        border: "2px solid #b89b7b",
                        color: "#f0e6d2",
                        borderRadius: "8px",
                        padding: "14px 18px",
                        fontFamily: "'Caveat', cursive",
                        fontSize: "1em",
                        marginBottom: "10px",
                        hoverBg: "linear-gradient(180deg, #4c3e2f 0%, #3c2e1f 100%)",
                        hoverBorder: "#d4af37",
                        selectedBg: "rgba(180,130,80,0.3)",
                        selectedBorder: "#d4af37",
                        selectedColor: "#ffffff"
                    }
                },
                designNotes: {
                    background: "rgba(180,130,80,0.1)",
                    borderLeft: "4px solid #b89b7b",
                    borderRadius: "6px",
                    padding: "12px",
                    titleColor: "#d4af37",
                    titleFontFamily: "'Caveat', cursive",
                    titleFontSize: "0.85em",
                    contentColor: "#f0e6d2",
                    contentFontFamily: "'Caveat', cursive",
                    fontSize: "0.9em"
                },
                summary: {
                    background: "rgba(180,130,80,0.1)",
                    borderLeft: "4px solid #b89b7b",
                    borderRadius: "6px",
                    padding: "12px",
                    titleColor: "#d4af37",
                    titleFontFamily: "'Caveat', cursive",
                    titleFontSize: "0.9em",
                    contentColor: "#f0e6d2",
                    contentFontFamily: "'Caveat', cursive",
                    fontSize: "0.9em"
                },
                reflection: {
                    background: "rgba(180,130,80,0.1)",
                    borderLeft: "4px solid #b89b7b",
                    borderRadius: "6px",
                    padding: "14px",
                    titleColor: "#d4af37",
                    titleFontFamily: "'Caveat', cursive",
                    titleFontSize: "0.95em",
                    contentColor: "#f0e6d2",
                    contentFontFamily: "'Caveat', cursive",
                    fontSize: "0.9em",
                    italic: true
                },
                personality: {
                    background: "rgba(180,130,80,0.1)",
                    borderLeft: "4px solid #b89b7b",
                    borderRadius: "6px",
                    padding: "14px",
                    titleColor: "#d4af37",
                    titleFontFamily: "'Caveat', cursive",
                    titleFontSize: "0.95em",
                    contentColor: "#f0e6d2",
                    contentFontFamily: "'Caveat', cursive",
                    fontSize: "0.9em"
                },
                typology: {
                    background: "rgba(180,130,80,0.1)",
                    borderLeft: "4px solid #b89b7b",
                    borderRadius: "6px",
                    padding: "14px",
                    titleColor: "#d4af37",
                    titleFontFamily: "'Caveat', cursive",
                    titleFontSize: "0.95em",
                    contentColor: "#f0e6d2",
                    contentFontFamily: "'Caveat', cursive",
                    fontSize: "0.9em"
                },
                additionalField: {
                    background: "rgba(180,130,80,0.05)",
                    borderLeft: "3px solid #b89b7b",
                    borderRadius: "4px",
                    padding: "10px",
                    titleColor: "#b89b7b",
                    titleFontFamily: "'Caveat', cursive",
                    titleFontSize: "0.85em",
                    contentColor: "#f0e6d2",
                    contentFontFamily: "'Caveat', cursive",
                    fontSize: "0.85em"
                }
            },
            gameItems: {
                personality: createGameItemConfig("#b89b7b", "#3c2e1f", "#2b1e0f"),
                typology: createGameItemConfig("#a67c52", "#3c2e1f", "#2b1e0f"),
                organization: createGameItemConfig("#8b6b4f", "#3c2e1f", "#2b1e0f"),
                relations: createGameItemConfig("#cd7f5c", "#3c2e1f", "#2b1e0f"),
                skill: createGameItemConfig("#d4af37", "#3c2e1f", "#2b1e0f"),
                stat_buffs: createGameItemConfig("#6b8e23", "#2b3c1e", "#1a2b0f"),
                bless: createGameItemConfig("#b0a090", "#3c3c2e", "#2b2b1e"),
                curse: createGameItemConfig("#8b4513", "#3c2e1f", "#2b1e0f"),
                buff_debuff: createGameItemConfig("#20b2aa", "#1e3c3c", "#0f2b2b"),
                inventory: createGameItemConfig("#a0522d", "#3c2e1f", "#2b1e0f"),
                details: createGameItemConfig("#b89b7b", "#3c2e1f", "#2b1e0f")
            },
            turnUpdates: {
                container: {
                    background: "rgba(43,30,15,0.9)",
                    border: "1px solid #b89b7b",
                    borderRadius: "4px",
                    padding: "10px",
                    marginBottom: "15px"
                },
                header: {
                    color: "#d4af37",
                    borderBottom: "1px solid #b89b7b",
                    fontSize: "0.9em",
                    fontFamily: "'Caveat', cursive",
                    textTransform: "uppercase"
                },
                action: {
                    background: "rgba(180,130,80,0.1)",
                    border: "1px solid #b89b7b",
                    color: "#d4af37",
                    fontFamily: "'Caveat', cursive",
                    fontSize: "0.9em",
                    padding: "4px 8px",
                    borderRadius: "4px",
                    marginBottom: "4px",
                    success: {
                        background: "rgba(107,142,35,0.15)",
                        border: "1px solid #6b8e23",
                        color: "#6b8e23"
                    },
                    failure: {
                        background: "rgba(178,34,34,0.15)",
                        border: "1px solid #b22222",
                        color: "#b22222"
                    },
                    partial: {
                        background: "rgba(212,175,55,0.15)",
                        border: "1px solid #d4af37",
                        color: "#d4af37"
                    }
                },
                event: {
                    background: "rgba(180,130,80,0.05)",
                    border: "1px solid #8b6b4f",
                    color: "#b89b7b",
                    fontFamily: "'Caveat', cursive",
                    fontSize: "0.9em",
                    padding: "4px 8px",
                    borderRadius: "4px",
                    marginBottom: "4px"
                }
            },
            history: {
                ...HISTORY_CONFIG,
                container: { background: "#1e150c", padding: "0" },
                header: { background: "#2b1e0f", borderBottom: "2px solid #b89b7b", color: "#f0e6d2" },
                headerButtons: {
                    background: "rgba(180,130,80,0.15)",
                    border: "1px solid #b89b7b",
                    color: "#b89b7b",
                    hover: { background: "rgba(180,130,80,0.3)", borderColor: "#d4af37", color: "#ffffff" }
                },
                turn: { background: "#2b1e0f", border: "0.5px solid rgba(180,130,80,0.3)" },
                turnSummary: {
                    background: "rgba(0,0,0,0.2)",
                    color: "#f0e6d2",
                    summaryColor: "#d0c0b0",
                    actionCountColor: "#b0a090",
                    timestampColor: "#908070"
                },
                turnContent: { background: "rgba(0,0,0,0.15)", color: "#e0d0c0" },
                accentColors: { success: "#6b8e23", failure: "#b22222", mixed: "#d4af37", neutral: "#b89b7b" },
                contentBlocks: {
                    designNotes: { background: "rgba(180,130,80,0.05)", borderLeftColor: "#b89b7b", titleColor: "#d4af37", contentColor: "#f0e6d2", italic: false },
                    aiMemory: { background: "rgba(180,130,80,0.05)", borderLeftColor: "#b89b7b", titleColor: "#d4af37", keyColor: "#d4af37", valueColor: "#f0e6d2", booleanTrueColor: "#6b8e23", booleanFalseColor: "#b22222", numberColor: "#d4af37", arrayColor: "#b89b7b", stringColor: "#f0e6d2", objectColor: "#a67c52" },
                    summary: { background: "rgba(180,130,80,0.05)", borderLeftColor: "#b89b7b", titleColor: "#d4af37", contentColor: "#f0e6d2" },
                    sceneText: { background: "rgba(180,130,80,0.05)", borderLeftColor: "#b89b7b", titleColor: "#d4af37", contentColor: "#f0e6d2" },
                    reflection: { background: "rgba(180,130,80,0.05)", borderLeftColor: "#b89b7b", titleColor: "#d4af37", contentColor: "#f0e6d2", italic: true },
                    personality: { background: "rgba(180,130,80,0.05)", borderLeftColor: "#b89b7b", titleColor: "#d4af37", contentColor: "#f0e6d2" },
                    typology: { background: "rgba(180,130,80,0.05)", borderLeftColor: "#b89b7b", titleColor: "#d4af37", contentColor: "#f0e6d2" },
                    actions: { background: "rgba(180,130,80,0.05)", borderLeftColor: "#b89b7b", titleColor: "#d4af37", fontSize: "0.75em", successBg: "rgba(107,142,35,0.1)", successColor: "#6b8e23", partialBg: "rgba(212,175,55,0.1)", partialColor: "#d4af37", failureBg: "rgba(178,34,34,0.1)", failureColor: "#b22222" },
                    changes: { background: "rgba(180,130,80,0.05)", borderLeftColor: "#b89b7b", titleColor: "#d4af37", contentColor: "#f0e6d2" }
                }
            }
        }
    },

    // ═══════════════════════════════════════════════════════════════════════════
    // 3. VampireGothic – кроваво-чёрная готика (ПОЛНОСТЬЮ ПРОРАБОТАНО)
    // ═══════════════════════════════════════════════════════════════════════════
    vampireGothic: {
        name: "Vampire Gothic",
        description: "Тёмно-кроваво-красные тона, готические шрифты (Cinzel, Cormorant), мрачная элегантность",
        preview: "linear-gradient(135deg, #1a0a0a 0%, #2a0f0f 100%)",
        config: {
            ...DEFAULT_THEME_CONFIG,
            name: "Vampire Gothic",
            global: {
                icons: { set: 'fa', emojiFilter: 'brightness(0.9) contrast(1.2)' },
                layout: {
                    scrollbar: {
                        width: '6px',
                        height: '6px',
                        trackBg: '#1a0a0a',
                        trackBorderRadius: '4px',
                        thumbBg: '#b22222',
                        thumbBorder: '1px solid #8b0000',
                        thumbBorderRadius: '4px',
                        thumbHoverBg: '#ff6b6b',
                        thumbHoverBorder: '1px solid #b22222'
                    },
                    selectionColor: "#ff6b6b",
                    selectionBg: "rgba(178, 34, 34, 0.3)",
                    blockMargin: "15px"
                }
            },
            typography: {
                headers: { fontFamily: "'Cinzel', serif", fontWeight: "900", letterSpacing: "2px", textTransform: "uppercase" },
                body: { fontFamily: "'Cormorant', serif", fontWeight: "400", fontSize: "18px", lineHeight: "1.7", color: "#e0d0d0" },
                ui: { fontFamily: "'Cinzel', serif", fontWeight: "600", fontSize: "15px", letterSpacing: "1px" },
                monospace: { fontFamily: "'Fira Code', monospace", fontSize: "14px" }
            },
            scene: {
                container: { padding: "15px", background: "transparent" },
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
                        marginBottom: "10px",
                        hoverBg: "linear-gradient(180deg, #3a1a1a 0%, #2a0f0f 100%)",
                        hoverBorder: "#ff6b6b",
                        selectedBg: "rgba(178,34,34,0.3)",
                        selectedBorder: "#ff6b6b",
                        selectedColor: "#ffffff"
                    }
                },
                designNotes: {
                    background: "rgba(178,34,34,0.1)",
                    borderLeft: "4px solid #b22222",
                    borderRadius: "6px",
                    padding: "12px",
                    titleColor: "#ff8a8a",
                    titleFontFamily: "'Cinzel', serif",
                    titleFontSize: "0.85em",
                    contentColor: "#d0b0b0",
                    contentFontFamily: "'Cormorant', serif",
                    fontSize: "0.9em"
                },
                summary: {
                    background: "rgba(178,34,34,0.1)",
                    borderLeft: "4px solid #b22222",
                    borderRadius: "6px",
                    padding: "12px",
                    titleColor: "#ff8a8a",
                    titleFontFamily: "'Cinzel', serif",
                    titleFontSize: "0.9em",
                    contentColor: "#d0b0b0",
                    contentFontFamily: "'Cormorant', serif",
                    fontSize: "0.9em"
                },
                reflection: {
                    background: "rgba(178,34,34,0.1)",
                    borderLeft: "4px solid #b22222",
                    borderRadius: "6px",
                    padding: "14px",
                    titleColor: "#ff8a8a",
                    titleFontFamily: "'Cinzel', serif",
                    titleFontSize: "0.95em",
                    contentColor: "#d0b0b0",
                    contentFontFamily: "'Cormorant', serif",
                    fontSize: "0.9em",
                    italic: true
                },
                personality: {
                    background: "rgba(178,34,34,0.1)",
                    borderLeft: "4px solid #b22222",
                    borderRadius: "6px",
                    padding: "14px",
                    titleColor: "#ff8a8a",
                    titleFontFamily: "'Cinzel', serif",
                    titleFontSize: "0.95em",
                    contentColor: "#d0b0b0",
                    contentFontFamily: "'Cormorant', serif",
                    fontSize: "0.9em"
                },
                typology: {
                    background: "rgba(178,34,34,0.1)",
                    borderLeft: "4px solid #b22222",
                    borderRadius: "6px",
                    padding: "14px",
                    titleColor: "#ff8a8a",
                    titleFontFamily: "'Cinzel', serif",
                    titleFontSize: "0.95em",
                    contentColor: "#d0b0b0",
                    contentFontFamily: "'Cormorant', serif",
                    fontSize: "0.9em"
                },
                additionalField: {
                    background: "rgba(178,34,34,0.05)",
                    borderLeft: "3px solid #b22222",
                    borderRadius: "4px",
                    padding: "10px",
                    titleColor: "#b22222",
                    titleFontFamily: "'Cinzel', serif",
                    titleFontSize: "0.85em",
                    contentColor: "#d0b0b0",
                    contentFontFamily: "'Cormorant', serif",
                    fontSize: "0.85em"
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
            turnUpdates: {
                container: {
                    background: "rgba(26,10,10,0.9)",
                    border: "1px solid #b22222",
                    borderRadius: "4px",
                    padding: "10px",
                    marginBottom: "15px"
                },
                header: {
                    color: "#ff8a8a",
                    borderBottom: "1px solid #b22222",
                    fontSize: "0.9em",
                    fontFamily: "'Cinzel', serif",
                    textTransform: "uppercase"
                },
                action: {
                    background: "rgba(178,34,34,0.1)",
                    border: "1px solid #b22222",
                    color: "#ff8a8a",
                    fontFamily: "'Cormorant', serif",
                    fontSize: "0.9em",
                    padding: "4px 8px",
                    borderRadius: "4px",
                    marginBottom: "4px",
                    success: {
                        background: "rgba(76,209,55,0.15)",
                        border: "1px solid #4cd137",
                        color: "#4cd137"
                    },
                    failure: {
                        background: "rgba(232,65,24,0.15)",
                        border: "1px solid #e84118",
                        color: "#e84118"
                    },
                    partial: {
                        background: "rgba(251,197,49,0.15)",
                        border: "1px solid #fbc531",
                        color: "#fbc531"
                    }
                },
                event: {
                    background: "rgba(178,34,34,0.05)",
                    border: "1px solid #8b0000",
                    color: "#b22222",
                    fontFamily: "'Cormorant', serif",
                    fontSize: "0.9em",
                    padding: "4px 8px",
                    borderRadius: "4px",
                    marginBottom: "4px"
                }
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
                accentColors: { success: "#4cd137", failure: "#e84118", mixed: "#fbc531", neutral: "#b22222" },
                contentBlocks: {
                    designNotes: { background: "rgba(178,34,34,0.05)", borderLeftColor: "#b22222", titleColor: "#ff8a8a", contentColor: "#d0b0b0", italic: false },
                    aiMemory: { background: "rgba(178,34,34,0.05)", borderLeftColor: "#b22222", titleColor: "#ff8a8a", keyColor: "#ff8a8a", valueColor: "#d0b0b0", booleanTrueColor: "#4cd137", booleanFalseColor: "#e84118", numberColor: "#ff8a8a", arrayColor: "#b22222", stringColor: "#d0b0b0", objectColor: "#cd5c5c" },
                    summary: { background: "rgba(178,34,34,0.05)", borderLeftColor: "#b22222", titleColor: "#ff8a8a", contentColor: "#d0b0b0" },
                    sceneText: { background: "rgba(178,34,34,0.05)", borderLeftColor: "#b22222", titleColor: "#ff8a8a", contentColor: "#d0b0b0" },
                    reflection: { background: "rgba(178,34,34,0.05)", borderLeftColor: "#b22222", titleColor: "#ff8a8a", contentColor: "#d0b0b0", italic: true },
                    personality: { background: "rgba(178,34,34,0.05)", borderLeftColor: "#b22222", titleColor: "#ff8a8a", contentColor: "#d0b0b0" },
                    typology: { background: "rgba(178,34,34,0.05)", borderLeftColor: "#b22222", titleColor: "#ff8a8a", contentColor: "#d0b0b0" },
                    actions: { background: "rgba(178,34,34,0.05)", borderLeftColor: "#b22222", titleColor: "#ff8a8a", fontSize: "0.75em", successBg: "rgba(76,209,55,0.1)", successColor: "#4cd137", partialBg: "rgba(251,197,49,0.1)", partialColor: "#fbc531", failureBg: "rgba(232,65,24,0.1)", failureColor: "#e84118" },
                    changes: { background: "rgba(178,34,34,0.05)", borderLeftColor: "#b22222", titleColor: "#ff8a8a", contentColor: "#d0b0b0" }
                }
            }
        }
    },

    // ═══════════════════════════════════════════════════════════════════════════
    // 4. OceanSun – сине-жёлтые оттенки (патриотические, но незаметно) – ПРОРАБОТАНО
    // ═══════════════════════════════════════════════════════════════════════════
    oceanSun: {
        name: "Ocean Sun",
        description: "Глубокий синий океан с золотыми лучами солнца – контрастно и гармонично",
        preview: "linear-gradient(135deg, #002b5c 0%, #0a3f6f 100%)",
        config: {
            ...DEFAULT_THEME_CONFIG,
            name: "Ocean Sun",
            global: {
                icons: { set: 'fa', emojiFilter: 'hue-rotate(180deg) brightness(1.1)' },
                layout: {
                    scrollbar: {
                        width: '6px',
                        height: '6px',
                        trackBg: '#002b5c',
                        trackBorderRadius: '4px',
                        thumbBg: '#fbc531',
                        thumbBorder: '1px solid #ffd966',
                        thumbBorderRadius: '4px',
                        thumbHoverBg: '#ffd966',
                        thumbHoverBorder: '1px solid #fbc531'
                    },
                    selectionColor: "#fbc531",
                    selectionBg: "rgba(251, 197, 49, 0.2)",
                    blockMargin: "15px"
                }
            },
            typography: {
                headers: { fontFamily: "'Montserrat', sans-serif", fontWeight: "800", letterSpacing: "1.5px", textTransform: "uppercase" },
                body: { fontFamily: "'Inter', sans-serif", fontWeight: "400", fontSize: "16px", lineHeight: "1.7", color: "#e0f0ff" },
                ui: { fontFamily: "'Montserrat', sans-serif", fontWeight: "600", fontSize: "14px", letterSpacing: "0.5px" },
                monospace: { fontFamily: "'JetBrains Mono', monospace", fontSize: "13px" }
            },
            scene: {
                container: { padding: "15px", background: "transparent" },
                textBlock: {
                    background: "linear-gradient(135deg, #002b5c 0%, #0a3f6f 100%)",
                    border: "2px solid #fbc531",
                    borderRadius: "12px",
                    padding: "18px",
                    color: "#e0f0ff",
                    fontFamily: "'Inter', sans-serif",
                    fontSize: "1.05em",
                    boxShadow: "0 4px 16px rgba(251,197,49,0.2), inset 0 0 20px rgba(251,197,49,0.05)"
                },
                aiMemory: {
                    background: "rgba(251,197,49,0.1)",
                    borderLeft: "4px solid #fbc531",
                    borderRadius: "8px",
                    padding: "12px",
                    titleColor: "#fbc531",
                    contentColor: "#b0e0ff",
                    keyColor: "#fbc531",
                    valueColor: "#d0f0ff"
                },
                choices: {
                    containerMargin: "20px 0 0 0",
                    btn: {
                        background: "linear-gradient(180deg, #0a3f6f 0%, #002b5c 100%)",
                        border: "2px solid #fbc531",
                        color: "#e0f0ff",
                        borderRadius: "10px",
                        padding: "14px 18px",
                        fontFamily: "'Montserrat', sans-serif",
                        fontSize: "1em",
                        marginBottom: "10px",
                        hoverBg: "linear-gradient(180deg, #1a4f7f 0%, #0a3f6f 100%)",
                        hoverBorder: "#ffd966",
                        selectedBg: "rgba(251,197,49,0.3)",
                        selectedBorder: "#ffd966",
                        selectedColor: "#ffffff"
                    }
                },
                designNotes: {
                    background: "rgba(251,197,49,0.1)",
                    borderLeft: "4px solid #fbc531",
                    borderRadius: "8px",
                    padding: "12px",
                    titleColor: "#fbc531",
                    titleFontFamily: "'Montserrat', sans-serif",
                    titleFontSize: "0.85em",
                    contentColor: "#b0e0ff",
                    contentFontFamily: "'Inter', sans-serif",
                    fontSize: "0.9em"
                },
                summary: {
                    background: "rgba(251,197,49,0.1)",
                    borderLeft: "4px solid #fbc531",
                    borderRadius: "8px",
                    padding: "12px",
                    titleColor: "#fbc531",
                    titleFontFamily: "'Montserrat', sans-serif",
                    titleFontSize: "0.9em",
                    contentColor: "#b0e0ff",
                    contentFontFamily: "'Inter', sans-serif",
                    fontSize: "0.9em"
                },
                reflection: {
                    background: "rgba(251,197,49,0.1)",
                    borderLeft: "4px solid #fbc531",
                    borderRadius: "8px",
                    padding: "14px",
                    titleColor: "#fbc531",
                    titleFontFamily: "'Montserrat', sans-serif",
                    titleFontSize: "0.95em",
                    contentColor: "#b0e0ff",
                    contentFontFamily: "'Inter', sans-serif",
                    fontSize: "0.9em",
                    italic: true
                },
                personality: {
                    background: "rgba(251,197,49,0.1)",
                    borderLeft: "4px solid #fbc531",
                    borderRadius: "8px",
                    padding: "14px",
                    titleColor: "#fbc531",
                    titleFontFamily: "'Montserrat', sans-serif",
                    titleFontSize: "0.95em",
                    contentColor: "#b0e0ff",
                    contentFontFamily: "'Inter', sans-serif",
                    fontSize: "0.9em"
                },
                typology: {
                    background: "rgba(251,197,49,0.1)",
                    borderLeft: "4px solid #fbc531",
                    borderRadius: "8px",
                    padding: "14px",
                    titleColor: "#fbc531",
                    titleFontFamily: "'Montserrat', sans-serif",
                    titleFontSize: "0.95em",
                    contentColor: "#b0e0ff",
                    contentFontFamily: "'Inter', sans-serif",
                    fontSize: "0.9em"
                },
                additionalField: {
                    background: "rgba(251,197,49,0.05)",
                    borderLeft: "3px solid #fbc531",
                    borderRadius: "4px",
                    padding: "10px",
                    titleColor: "#fbc531",
                    titleFontFamily: "'Montserrat', sans-serif",
                    titleFontSize: "0.85em",
                    contentColor: "#b0e0ff",
                    contentFontFamily: "'Inter', sans-serif",
                    fontSize: "0.85em"
                }
            },
            gameItems: {
                personality: createGameItemConfig("#fbc531", "#0a3f6f", "#002b5c"),
                typology: createGameItemConfig("#ffd966", "#0a3f6f", "#002b5c"),
                organization: createGameItemConfig("#1e90ff", "#0a3f6f", "#002b5c"),
                relations: createGameItemConfig("#ffaa33", "#0a3f6f", "#002b5c"),
                skill: createGameItemConfig("#fbc531", "#0a3f6f", "#002b5c"),
                stat_buffs: createGameItemConfig("#00bfff", "#0a3f6f", "#002b5c"),
                bless: createGameItemConfig("#f0e68c", "#2a4f7f", "#1a3f6f"),
                curse: createGameItemConfig("#ff6347", "#4f2a2a", "#3f1a1a"),
                buff_debuff: createGameItemConfig("#40e0d0", "#0a4f4f", "#003f3f"),
                inventory: createGameItemConfig("#f4a460", "#4f3f2a", "#3f2f1a"),
                details: createGameItemConfig("#fbc531", "#0a3f6f", "#002b5c")
            },
            turnUpdates: {
                container: {
                    background: "rgba(0,43,92,0.9)",
                    border: "1px solid #fbc531",
                    borderRadius: "4px",
                    padding: "10px",
                    marginBottom: "15px"
                },
                header: {
                    color: "#fbc531",
                    borderBottom: "1px solid #fbc531",
                    fontSize: "0.9em",
                    fontFamily: "'Montserrat', sans-serif",
                    textTransform: "uppercase"
                },
                action: {
                    background: "rgba(251,197,49,0.1)",
                    border: "1px solid #fbc531",
                    color: "#fbc531",
                    fontFamily: "'Inter', sans-serif",
                    fontSize: "0.9em",
                    padding: "4px 8px",
                    borderRadius: "4px",
                    marginBottom: "4px",
                    success: {
                        background: "rgba(46,204,113,0.15)",
                        border: "1px solid #2ecc71",
                        color: "#2ecc71"
                    },
                    failure: {
                        background: "rgba(231,76,60,0.15)",
                        border: "1px solid #e74c3c",
                        color: "#e74c3c"
                    },
                    partial: {
                        background: "rgba(241,196,15,0.15)",
                        border: "1px solid #f1c40f",
                        color: "#f1c40f"
                    }
                },
                event: {
                    background: "rgba(52,152,219,0.1)",
                    border: "1px solid #3498db",
                    color: "#3498db",
                    fontFamily: "'Inter', sans-serif",
                    fontSize: "0.9em",
                    padding: "4px 8px",
                    borderRadius: "4px",
                    marginBottom: "4px"
                }
            },
            history: {
                ...HISTORY_CONFIG,
                container: { background: "#001f3f", padding: "0" },
                header: { background: "#002b5c", borderBottom: "2px solid #fbc531", color: "#e0f0ff" },
                headerButtons: {
                    background: "rgba(251,197,49,0.15)",
                    border: "1px solid #fbc531",
                    color: "#fbc531",
                    hover: { background: "rgba(251,197,49,0.3)", borderColor: "#ffd966", color: "#ffffff" }
                },
                turn: { background: "#002b5c", border: "0.5px solid rgba(251,197,49,0.2)" },
                turnSummary: {
                    background: "rgba(0,0,0,0.2)",
                    color: "#e0f0ff",
                    summaryColor: "#b0e0ff",
                    actionCountColor: "#90c0ff",
                    timestampColor: "#70a0d0"
                },
                turnContent: { background: "rgba(0,0,0,0.15)", color: "#d0f0ff" },
                accentColors: { success: "#2ecc71", failure: "#e74c3c", mixed: "#fbc531", neutral: "#3498db" },
                contentBlocks: {
                    designNotes: { background: "rgba(251,197,49,0.05)", borderLeftColor: "#fbc531", titleColor: "#fbc531", contentColor: "#b0e0ff", italic: false },
                    aiMemory: { background: "rgba(251,197,49,0.05)", borderLeftColor: "#fbc531", titleColor: "#fbc531", keyColor: "#fbc531", valueColor: "#b0e0ff", booleanTrueColor: "#2ecc71", booleanFalseColor: "#e74c3c", numberColor: "#fbc531", arrayColor: "#1e90ff", stringColor: "#b0e0ff", objectColor: "#00bfff" },
                    summary: { background: "rgba(251,197,49,0.05)", borderLeftColor: "#fbc531", titleColor: "#fbc531", contentColor: "#b0e0ff" },
                    sceneText: { background: "rgba(251,197,49,0.05)", borderLeftColor: "#fbc531", titleColor: "#fbc531", contentColor: "#b0e0ff" },
                    reflection: { background: "rgba(251,197,49,0.05)", borderLeftColor: "#fbc531", titleColor: "#fbc531", contentColor: "#b0e0ff", italic: true },
                    personality: { background: "rgba(251,197,49,0.05)", borderLeftColor: "#fbc531", titleColor: "#fbc531", contentColor: "#b0e0ff" },
                    typology: { background: "rgba(251,197,49,0.05)", borderLeftColor: "#fbc531", titleColor: "#fbc531", contentColor: "#b0e0ff" },
                    actions: { background: "rgba(251,197,49,0.05)", borderLeftColor: "#fbc531", titleColor: "#fbc531", fontSize: "0.75em", successBg: "rgba(46,204,113,0.1)", successColor: "#2ecc71", partialBg: "rgba(251,197,49,0.1)", partialColor: "#fbc531", failureBg: "rgba(231,76,60,0.1)", failureColor: "#e74c3c" },
                    changes: { background: "rgba(251,197,49,0.05)", borderLeftColor: "#fbc531", titleColor: "#fbc531", contentColor: "#b0e0ff" }
                }
            }
        }
    },

    // ═══════════════════════════════════════════════════════════════════════════
    // 5. ConsoleMonochrome – монохромный терминал (ПОЛНОСТЬЮ ПРОРАБОТАНО, ВСЕ ИКОНКИ МОНОХРОМНЫ)
    // ═══════════════════════════════════════════════════════════════════════════
    consoleMonochrome: {
        name: "Console Monochrome",
        description: "Чёрно-белый терминал, строгие монохромные иконки (все иконки обесцвечены)",
        preview: "linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 100%)",
        config: {
            ...DEFAULT_THEME_CONFIG,
            name: "Console Monochrome",
            global: {
                icons: { set: 'emoji', emojiFilter: 'grayscale(100%) brightness(1.2)' },
                layout: {
                    scrollbar: {
                        width: '8px',
                        height: '8px',
                        trackBg: '#0a0a0a',
                        trackBorderRadius: '2px',
                        thumbBg: '#888888',
                        thumbBorder: '1px solid #444',
                        thumbBorderRadius: '2px',
                        thumbHoverBg: '#cccccc',
                        thumbHoverBorder: '1px solid #888'
                    },
                    selectionColor: "#ffffff",
                    selectionBg: "rgba(255, 255, 255, 0.1)",
                    blockMargin: "15px"
                }
            },
            typography: {
                headers: { fontFamily: "'VT323', monospace", fontWeight: "400", letterSpacing: "0px", textTransform: "uppercase" },
                body: { fontFamily: "'VT323', monospace", fontWeight: "400", fontSize: "20px", lineHeight: "1.4", color: "#f0f0f0" },
                ui: { fontFamily: "'Roboto Mono', monospace", fontWeight: "500", fontSize: "15px", letterSpacing: "0px" },
                monospace: { fontFamily: "'VT323', monospace", fontSize: "18px" }
            },
            scene: {
                container: { padding: "15px", background: "transparent" },
                textBlock: {
                    background: "#0a0a0a",
                    border: "2px solid #666",
                    borderRadius: "0px",
                    padding: "15px",
                    color: "#f0f0f0",
                    fontFamily: "'VT323', monospace",
                    fontSize: "1.2em",
                    boxShadow: "none"
                },
                aiMemory: {
                    background: "rgba(128,128,128,0.1)",
                    borderLeft: "4px solid #888",
                    borderRadius: "0px",
                    padding: "12px",
                    titleColor: "#cccccc",
                    contentColor: "#f0f0f0",
                    keyColor: "#cccccc",
                    valueColor: "#f0f0f0"
                },
                choices: {
                    containerMargin: "20px 0 0 0",
                    btn: {
                        background: "#0a0a0a",
                        border: "2px solid #888",
                        color: "#f0f0f0",
                        borderRadius: "0px",
                        padding: "12px 16px",
                        fontFamily: "'VT323', monospace",
                        fontSize: "1.1em",
                        marginBottom: "8px",
                        hoverBg: "#1a1a1a",
                        hoverBorder: "#aaa",
                        selectedBg: "#222",
                        selectedBorder: "#fff",
                        selectedColor: "#ffffff"
                    }
                },
                designNotes: {
                    background: "rgba(128,128,128,0.05)",
                    borderLeft: "4px solid #888",
                    borderRadius: "0px",
                    padding: "10px",
                    titleColor: "#aaa",
                    titleFontFamily: "'VT323', monospace",
                    titleFontSize: "0.9em",
                    contentColor: "#f0f0f0",
                    contentFontFamily: "'VT323', monospace",
                    fontSize: "1em"
                },
                summary: {
                    background: "rgba(128,128,128,0.05)",
                    borderLeft: "4px solid #888",
                    borderRadius: "0px",
                    padding: "10px",
                    titleColor: "#aaa",
                    titleFontFamily: "'VT323', monospace",
                    titleFontSize: "0.9em",
                    contentColor: "#f0f0f0",
                    contentFontFamily: "'VT323', monospace",
                    fontSize: "1em"
                },
                reflection: {
                    background: "rgba(128,128,128,0.05)",
                    borderLeft: "4px solid #888",
                    borderRadius: "0px",
                    padding: "12px",
                    titleColor: "#aaa",
                    titleFontFamily: "'VT323', monospace",
                    titleFontSize: "0.95em",
                    contentColor: "#f0f0f0",
                    contentFontFamily: "'VT323', monospace",
                    fontSize: "1em",
                    italic: false
                },
                personality: {
                    background: "rgba(128,128,128,0.05)",
                    borderLeft: "4px solid #888",
                    borderRadius: "0px",
                    padding: "12px",
                    titleColor: "#aaa",
                    titleFontFamily: "'VT323', monospace",
                    titleFontSize: "0.95em",
                    contentColor: "#f0f0f0",
                    contentFontFamily: "'VT323', monospace",
                    fontSize: "1em"
                },
                typology: {
                    background: "rgba(128,128,128,0.05)",
                    borderLeft: "4px solid #888",
                    borderRadius: "0px",
                    padding: "12px",
                    titleColor: "#aaa",
                    titleFontFamily: "'VT323', monospace",
                    titleFontSize: "0.95em",
                    contentColor: "#f0f0f0",
                    contentFontFamily: "'VT323', monospace",
                    fontSize: "1em"
                },
                additionalField: {
                    background: "rgba(128,128,128,0.03)",
                    borderLeft: "3px solid #888",
                    borderRadius: "0px",
                    padding: "8px",
                    titleColor: "#888",
                    titleFontFamily: "'VT323', monospace",
                    titleFontSize: "0.9em",
                    contentColor: "#f0f0f0",
                    contentFontFamily: "'VT323', monospace",
                    fontSize: "0.95em"
                }
            },
            gameItems: {
                personality: createGameItemConfig("#aaaaaa", "#1a1a1a", "#0a0a0a"),
                typology: createGameItemConfig("#999999", "#1a1a1a", "#0a0a0a"),
                organization: createGameItemConfig("#888888", "#1a1a1a", "#0a0a0a"),
                relations: createGameItemConfig("#777777", "#1a1a1a", "#0a0a0a"),
                skill: createGameItemConfig("#cccccc", "#1a1a1a", "#0a0a0a"),
                stat_buffs: createGameItemConfig("#bbbbbb", "#1a1a1a", "#0a0a0a"),
                bless: createGameItemConfig("#ffffff", "#2a2a2a", "#1a1a1a"),
                curse: createGameItemConfig("#555555", "#2a2a2a", "#1a1a1a"),
                buff_debuff: createGameItemConfig("#dddddd", "#1a1a1a", "#0a0a0a"),
                inventory: createGameItemConfig("#aaaaaa", "#1a1a1a", "#0a0a0a"),
                details: createGameItemConfig("#cccccc", "#1a1a1a", "#0a0a0a")
            },
            turnUpdates: {
                container: {
                    background: "#0a0a0a",
                    border: "1px solid #444",
                    borderRadius: "0px",
                    padding: "10px",
                    marginBottom: "15px"
                },
                header: {
                    color: "#cccccc",
                    borderBottom: "1px solid #444",
                    fontSize: "0.9em",
                    fontFamily: "'VT323', monospace",
                    textTransform: "uppercase"
                },
                action: {
                    background: "rgba(128,128,128,0.1)",
                    border: "1px solid #888",
                    color: "#cccccc",
                    fontFamily: "'VT323', monospace",
                    fontSize: "0.9em",
                    padding: "4px 8px",
                    borderRadius: "0px",
                    marginBottom: "4px",
                    success: {
                        background: "rgba(200,200,200,0.15)",
                        border: "1px solid #ccc",
                        color: "#ccc"
                    },
                    failure: {
                        background: "rgba(100,100,100,0.15)",
                        border: "1px solid #666",
                        color: "#888"
                    },
                    partial: {
                        background: "rgba(150,150,150,0.15)",
                        border: "1px solid #aaa",
                        color: "#aaa"
                    }
                },
                event: {
                    background: "rgba(80,80,80,0.1)",
                    border: "1px solid #555",
                    color: "#aaa",
                    fontFamily: "'VT323', monospace",
                    fontSize: "0.9em",
                    padding: "4px 8px",
                    borderRadius: "0px",
                    marginBottom: "4px"
                }
            },
            history: {
                ...HISTORY_CONFIG,
                container: { background: "#050505", padding: "0" },
                header: { background: "#0a0a0a", borderBottom: "2px solid #888", color: "#f0f0f0" },
                headerButtons: {
                    background: "rgba(128,128,128,0.15)",
                    border: "1px solid #888",
                    color: "#cccccc",
                    hover: { background: "rgba(128,128,128,0.3)", borderColor: "#aaa", color: "#ffffff" }
                },
                turn: { background: "#0a0a0a", border: "0.5px solid #333" },
                turnSummary: {
                    background: "rgba(0,0,0,0.3)",
                    color: "#f0f0f0",
                    summaryColor: "#cccccc",
                    actionCountColor: "#aaaaaa",
                    timestampColor: "#888888"
                },
                turnContent: { background: "rgba(0,0,0,0.2)", color: "#f0f0f0" },
                accentColors: { success: "#cccccc", failure: "#888888", mixed: "#aaaaaa", neutral: "#666666" },
                contentBlocks: {
                    designNotes: { background: "rgba(128,128,128,0.03)", borderLeftColor: "#888", titleColor: "#aaa", contentColor: "#f0f0f0", italic: false },
                    aiMemory: { background: "rgba(128,128,128,0.03)", borderLeftColor: "#888", titleColor: "#aaa", keyColor: "#aaa", valueColor: "#f0f0f0", booleanTrueColor: "#ccc", booleanFalseColor: "#888", numberColor: "#aaa", arrayColor: "#999", stringColor: "#f0f0f0", objectColor: "#bbb" },
                    summary: { background: "rgba(128,128,128,0.03)", borderLeftColor: "#888", titleColor: "#aaa", contentColor: "#f0f0f0" },
                    sceneText: { background: "rgba(128,128,128,0.03)", borderLeftColor: "#888", titleColor: "#aaa", contentColor: "#f0f0f0" },
                    reflection: { background: "rgba(128,128,128,0.03)", borderLeftColor: "#888", titleColor: "#aaa", contentColor: "#f0f0f0", italic: false },
                    personality: { background: "rgba(128,128,128,0.03)", borderLeftColor: "#888", titleColor: "#aaa", contentColor: "#f0f0f0" },
                    typology: { background: "rgba(128,128,128,0.03)", borderLeftColor: "#888", titleColor: "#aaa", contentColor: "#f0f0f0" },
                    actions: { background: "rgba(128,128,128,0.03)", borderLeftColor: "#888", titleColor: "#aaa", fontSize: "0.75em", successBg: "rgba(200,200,200,0.1)", successColor: "#ccc", partialBg: "rgba(170,170,170,0.1)", partialColor: "#aaa", failureBg: "rgba(136,136,136,0.1)", failureColor: "#888" },
                    changes: { background: "rgba(128,128,128,0.03)", borderLeftColor: "#888", titleColor: "#aaa", contentColor: "#f0f0f0" }
                }
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