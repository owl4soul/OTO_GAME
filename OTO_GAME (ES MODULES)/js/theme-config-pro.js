// js/theme-config-pro.js
'use strict';

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * CONFIG: THEME CONFIGURATION PRO - PRODUCTION READY
 * ═══════════════════════════════════════════════════════════════════════════
 * Полная конфигурация с расширенным набором шрифтов, пресетов и настроек
 */

// 1. РАСШИРЕННАЯ БИБЛИОТЕКА ШРИФТОВ (Google Fonts)
export const FONT_LIBRARY = {
    // Sans-serif современные
    'Nunito Sans': 'https://fonts.googleapis.com/css2?family=Nunito+Sans:wght@300;400;600;700;900&display=swap',
    'Unbounded': 'https://fonts.googleapis.com/css2?family=Unbounded:wght@300;400;600;700;900&display=swap',
    'Exo 2': 'https://fonts.googleapis.com/css2?family=Exo+2:wght@300;400;600;700;900&display=swap',
    'Inter': 'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;700;900&display=swap',
    'Poppins': 'https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;600;700;900&display=swap',
    'Comfortaa': 'https://fonts.googleapis.com/css2?family=Comfortaa:wght@300;400;700&display=swap',
    'Montserrat': 'https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;600;700;900&display=swap',
    
    // Serif классические
    'Cinzel': 'https://fonts.googleapis.com/css2?family=Cinzel:wght@400;700;900&display=swap',
    'Playfair Display': 'https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700;900&display=swap',
    'Lora': 'https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,400;0,700;1,400&display=swap',
    'Merriweather': 'https://fonts.googleapis.com/css2?family=Merriweather:wght@300;400;700;900&display=swap',
    'Cormorant': 'https://fonts.googleapis.com/css2?family=Cormorant:wght@300;400;700&display=swap',
    
    // Monospace
    'Roboto Mono': 'https://fonts.googleapis.com/css2?family=Roboto+Mono:wght@400;500;700&display=swap',
    'Fira Code': 'https://fonts.googleapis.com/css2?family=Fira+Code:wght@400;500;700&display=swap',
    'Source Code Pro': 'https://fonts.googleapis.com/css2?family=Source+Code+Pro:wght@400;500;700&display=swap',
    'JetBrains Mono': 'https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;700&display=swap',
    
    // Display / специальные
    'Press Start 2P': 'https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap',
    'Orbitron': 'https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&display=swap',
    'Righteous': 'https://fonts.googleapis.com/css2?family=Righteous&display=swap',
    'Audiowide': 'https://fonts.googleapis.com/css2?family=Audiowide&display=swap',
    'VT323': 'https://fonts.googleapis.com/css2?family=VT323&display=swap',
    
    // Handwriting / декоративные
    'Caveat': 'https://fonts.googleapis.com/css2?family=Caveat:wght@400;700&display=swap',
    'Dancing Script': 'https://fonts.googleapis.com/css2?family=Dancing+Script:wght@400;700&display=swap'
};

// 2. РАСШИРЕННЫЙ ICON MAPPING (FontAwesome -> Emoji)
export const ICON_MAPPINGS = {
    // Персонаж и личность
    'fa-user-circle': '👤',
    'fa-fingerprint': '🆔',
    'fa-brain': '🧠',
    'fa-heart': '❤️',
    'fa-user-shield': '🛡️',
    
    // Группы и организации
    'fa-users': '👥',
    'fa-user-friends': '🤝',
    'fa-building': '🏛️',
    'fa-crown': '👑',
    'fa-handshake': '🤝',
    
    // Навыки и способности
    'fa-star': '✨',
    'fa-fire': '🔥',
    'fa-bolt': '⚡',
    'fa-magic': '✨',
    'fa-fist-raised': '✊',
    
    // Эффекты и статусы
    'fa-skull-crossbones': '☠️',
    'fa-shield-alt': '🛡️',
    'fa-medkit': '🏥',
    'fa-flask': '⚗️',
    'fa-pills': '💊',
    
    // Статистика и прогресс
    'fa-chart-line': '📈',
    'fa-chart-bar': '📊',
    'fa-tachometer-alt': '⏱️',
    'fa-percentage': '💯',
    'fa-signal': '📶',
    
    // Инвентарь и предметы
    'fa-box': '🎒',
    'fa-gem': '💎',
    'fa-coins': '💰',
    'fa-key': '🔑',
    'fa-trophy': '🏆',
    
    // Документы и информация
    'fa-scroll': '📜',
    'fa-book': '📖',
    'fa-file-alt': '📄',
    'fa-sticky-note': '📝',
    'fa-clipboard': '📋',
    
    // Интерфейс и управление
    'fa-pencil-alt': '✏️',
    'fa-eye': '👁️',
    'fa-eye-slash': '🙈',
    'fa-keyboard': '⌨️',
    'fa-mouse': '🖱️',
    
    // Навигация
    'fa-chevron-right': '▶',
    'fa-chevron-left': '◀',
    'fa-chevron-down': '▼',
    'fa-chevron-up': '▲',
    'fa-arrow-right': '→',
    'fa-arrow-left': '←',
    
    // Действия
    'fa-check-circle': '✅',
    'fa-times-circle': '❌',
    'fa-exclamation-triangle': '⚠️',
    'fa-info-circle': 'ℹ️',
    'fa-question-circle': '❓',
    
    // Редактор тем
    'fa-fill-drip': '🎨',
    'fa-palette': '🎨',
    'fa-swatchbook': '🎨',
    'fa-paint-brush': '🖌️',
    'fa-paint-roller': '🎨',
    
    // История и время
    'fa-history': '📜',
    'fa-clock': '🕐',
    'fa-hourglass': '⏳',
    'fa-calendar': '📅',
    
    // Система
    'fa-save': '💾',
    'fa-download': '📥',
    'fa-upload': '📤',
    'fa-undo': '↩️',
    'fa-redo': '↪️',
    'fa-trash': '🗑️',
    'fa-cog': '⚙️',
    'fa-sliders-h': '🎛️',
    
    // Разное
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
        set: 'fa', // 'fa' (FontAwesome) or 'emoji'
        emojiFilter: 'none'
    },
    layout: {
        scrollbarColor: "#d4af37",
        scrollbarBg: "#1a1a1a",
        selectionColor: "#d4af37",
        selectionBg: "rgba(212, 175, 55, 0.2)"
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

// 6. КОНФИГУРАЦИЯ СЦЕНЫ
export const SCENE_CONFIG = {
    container: {
        padding: "0px",
        background: "transparent"
    },
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
    choices: {
        containerMargin: "20px 0 0 0",
        btn: {
            background: "rgba(0, 0, 0, 0.4)",
            border: "1px solid rgba(255, 255, 255, 0.1)",
            color: "#cccccc",
            hoverBg: "rgba(50, 50, 50, 0.6)",
            hoverBorder: "rgba(255, 255, 255, 0.3)",
            selectedBg: "rgba(212, 175, 55, 0.15)",
            selectedBorder: "#d4af37",
            selectedColor: "#d4af37",
            borderRadius: "6px",
            padding: "12px 15px",
            fontFamily: "'Exo 2', sans-serif",
            fontSize: "1em"
        }
    }
};

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
        description: "Природные тона, эльфийская эстетика",
        preview: "linear-gradient(135deg, #1e3c23 0%, #0f1f10 100%)",
        config: {
            ...DEFAULT_THEME_CONFIG,
            name: "Elven Forest",
            global: {
                icons: { set: 'fa', emojiFilter: 'hue-rotate(90deg)' },
                layout: {
                    scrollbarColor: "#2ecc71",
                    scrollbarBg: "#0a1a0a",
                    selectionColor: "#2ecc71",
                    selectionBg: "rgba(46, 204, 113, 0.2)"
                }
            },
            typography: {
                headers: {
                    fontFamily: "'Cinzel', serif",
                    fontWeight: "700",
                    letterSpacing: "2px",
                    textTransform: "uppercase"
                },
                body: {
                    fontFamily: "'Lora', serif",
                    fontWeight: "400",
                    fontSize: "16px",
                    lineHeight: "1.7"
                },
                ui: {
                    fontFamily: "'Lora', serif",
                    fontWeight: "600",
                    fontSize: "14px",
                    letterSpacing: "0.5px"
                },
                monospace: {
                    fontFamily: "'Fira Code', monospace",
                    fontSize: "13px"
                }
            },
            scene: {
                container: { padding: "0px", background: "transparent" },
                textBlock: {
                    background: "rgba(10, 20, 10, 0.85)",
                    border: "2px solid #2ecc71",
                    borderRadius: "12px",
                    padding: "18px",
                    color: "#e0ffe0",
                    fontFamily: "'Lora', serif",
                    fontSize: "1.05em",
                    boxShadow: "0 4px 12px rgba(46, 204, 113, 0.2)"
                },
                aiMemory: {
                    background: "rgba(46, 204, 113, 0.08)",
                    borderLeft: "4px solid #2ecc71",
                    borderRadius: "8px",
                    padding: "12px",
                    titleColor: "#2ecc71",
                    contentColor: "#c0e0c0",
                    keyColor: "#2ecc71",
                    valueColor: "#d0f0d0"
                },
                choices: {
                    containerMargin: "20px 0 0 0",
                    btn: {
                        background: "linear-gradient(180deg, #1e3c23 0%, #0f1f10 100%)",
                        border: "2px solid #2ecc71",
                        color: "#d0f0d0",
                        borderRadius: "10px",
                        padding: "14px 18px",
                        fontFamily: "'Cinzel', serif",
                        fontSize: "1em",
                        hoverBg: "linear-gradient(180deg, #2a4d2f 0%, #15291a 100%)",
                        hoverBorder: "#3edd81",
                        selectedBg: "rgba(46, 204, 113, 0.3)",
                        selectedBorder: "#3edd81",
                        selectedColor: "#ffffff"
                    }
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
            }
        }
    },
    
    cyber: {
        name: "Cyberpunk Neon",
        description: "Высокий контраст, неоновые акценты, терминал",
        preview: "linear-gradient(135deg, #000000 0%, #1a001a 100%)",
        config: {
            ...DEFAULT_THEME_CONFIG,
            name: "Cyberpunk Neon",
            global: {
                icons: { set: 'emoji', emojiFilter: 'drop-shadow(0 0 3px rgba(0,255,255,0.8))' },
                layout: {
                    scrollbarColor: "#00ffff",
                    scrollbarBg: "#000000",
                    selectionColor: "#ff00ff",
                    selectionBg: "rgba(255, 0, 255, 0.2)"
                }
            },
            typography: {
                headers: {
                    fontFamily: "'Orbitron', sans-serif",
                    fontWeight: "900",
                    letterSpacing: "3px",
                    textTransform: "uppercase"
                },
                body: {
                    fontFamily: "'Roboto Mono', monospace",
                    fontWeight: "400",
                    fontSize: "15px",
                    lineHeight: "1.5"
                },
                ui: {
                    fontFamily: "'Orbitron', sans-serif",
                    fontWeight: "700",
                    fontSize: "13px",
                    letterSpacing: "1px"
                },
                monospace: {
                    fontFamily: "'Fira Code', monospace",
                    fontSize: "13px"
                }
            },
            scene: {
                container: { padding: "0px", background: "transparent" },
                textBlock: {
                    background: "#000000",
                    border: "2px solid #00ff00",
                    borderRadius: "0px",
                    padding: "15px",
                    color: "#00ff00",
                    fontFamily: "'Roboto Mono', monospace",
                    fontSize: "1em",
                    boxShadow: "0 0 20px rgba(0,255,0,0.3), inset 0 0 10px rgba(0,255,0,0.05)"
                },
                aiMemory: {
                    background: "rgba(255, 0, 255, 0.05)",
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
                        background: "#000000",
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
                        selectedColor: "#000000"
                    }
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
            }
        }
    },
    
    paper: {
        name: "Old Paper",
        description: "Светлая тема, имитация старой бумаги и пергамента",
        preview: "linear-gradient(135deg, #f4e4bc 0%, #e8dcc5 100%)",
        config: {
            ...DEFAULT_THEME_CONFIG,
            name: "Old Paper",
            global: {
                icons: { set: 'emoji', emojiFilter: 'sepia(100%)' },
                layout: {
                    scrollbarColor: "#8b4513",
                    scrollbarBg: "#f4e4bc",
                    selectionColor: "#3e2723",
                    selectionBg: "rgba(139, 69, 19, 0.2)"
                }
            },
            typography: {
                headers: {
                    fontFamily: "'Playfair Display', serif",
                    fontWeight: "900",
                    letterSpacing: "1px",
                    textTransform: "uppercase"
                },
                body: {
                    fontFamily: "'Lora', serif",
                    fontWeight: "400",
                    fontSize: "17px",
                    lineHeight: "1.8"
                },
                ui: {
                    fontFamily: "'Playfair Display', serif",
                    fontWeight: "600",
                    fontSize: "15px",
                    letterSpacing: "0.5px"
                },
                monospace: {
                    fontFamily: "'Source Code Pro', monospace",
                    fontSize: "13px"
                }
            },
            scene: {
                container: { padding: "10px", background: "#f4e4bc" },
                textBlock: {
                    background: "linear-gradient(to bottom, #fefaf0 0%, #f8f0e0 100%)",
                    border: "2px solid #d4c4a4",
                    borderRadius: "4px",
                    padding: "18px",
                    color: "#2c2416",
                    fontFamily: "'Lora', serif",
                    fontSize: "1.05em",
                    boxShadow: "0 2px 8px rgba(139, 69, 19, 0.15), inset 0 0 20px rgba(255, 243, 224, 0.5)"
                },
                aiMemory: {
                    background: "rgba(139, 69, 19, 0.08)",
                    borderLeft: "4px solid #8b4513",
                    borderRadius: "4px",
                    padding: "12px",
                    titleColor: "#8b4513",
                    contentColor: "#5a3a1a",
                    keyColor: "#8b4513",
                    valueColor: "#6a4a2a"
                },
                choices: {
                    containerMargin: "20px 0 0 0",
                    btn: {
                        background: "linear-gradient(180deg, #f0e0c8 0%, #e0d0b8 100%)",
                        border: "2px solid #8b4513",
                        color: "#3e2723",
                        borderRadius: "6px",
                        padding: "12px 18px",
                        fontFamily: "'Playfair Display', serif",
                        fontSize: "1em",
                        hoverBg: "linear-gradient(180deg, #e8d8c0 0%, #d8c8b0 100%)",
                        hoverBorder: "#6a3913",
                        selectedBg: "#3e2723",
                        selectedBorder: "#3e2723",
                        selectedColor: "#f4e4bc"
                    }
                }
            },
            gameItems: {
                personality: createGameItemConfig("#8b4513", "#f8f0e0", "#f0e8d8"),
                typology: createGameItemConfig("#556b2f", "#f4f8e8", "#ecf0e0"),
                organization: createGameItemConfig("#a0522d", "#faf0e8", "#f2e8e0"),
                relations: createGameItemConfig("#cd5c5c", "#faf0f0", "#f2e8e8"),
                skill: createGameItemConfig("#483d8b", "#f0f0fa", "#e8e8f2"),
                stat_buffs: createGameItemConfig("#4682b4", "#f0f4fa", "#e8ecf2"),
                bless: createGameItemConfig("#696969", "#f8f8f8", "#f0f0f0"),
                curse: createGameItemConfig("#8b0000", "#fae8e8", "#f2e0e0"),
                buff_debuff: createGameItemConfig("#20b2aa", "#e8faf8", "#e0f2f0"),
                inventory: createGameItemConfig("#a0522d", "#faf0e8", "#f2e8e0"),
                details: createGameItemConfig("#4682b4", "#f0f4fa", "#e8ecf2")
            },
            history: {
                container: { background: "#f4e4bc", padding: "0" },
                header: {
                    background: "#e8dcc5",
                    borderBottom: "2px solid #8b4513",
                    color: "#3e2723",
                    fontFamily: "'Playfair Display', serif",
                    fontSize: "0.8em"
                },
                turn: {
                    background: "rgba(255,255,255,0.5)",
                    border: "1px solid #d4c4a4",
                    borderLeft: "3px solid #8b4513",
                    borderRadius: "4px",
                    marginBottom: "4px"
                },
                turnSummary: {
                    background: "rgba(255,255,255,0.3)",
                    color: "#3e2723",
                    fontFamily: "'Playfair Display', serif",
                    fontSize: "0.85em"
                },
                turnContent: {
                    background: "transparent",
                    color: "#5a3a1a",
                    fontSize: "0.8em",
                    fontFamily: "'Lora', serif"
                }
            }
        }
    },
    
    vampire: {
        name: "Vampire Gothic",
        description: "Готическая темная тема с кровавыми акцентами",
        preview: "linear-gradient(135deg, #1a0000 0%, #2a0a0a 100%)",
        config: {
            ...DEFAULT_THEME_CONFIG,
            name: "Vampire Gothic",
            global: {
                icons: { set: 'fa', emojiFilter: 'hue-rotate(0deg) brightness(0.8)' },
                layout: {
                    scrollbarColor: "#8b0000",
                    scrollbarBg: "#1a0000",
                    selectionColor: "#ff6b6b",
                    selectionBg: "rgba(139, 0, 0, 0.3)"
                }
            },
            typography: {
                headers: {
                    fontFamily: "'Cinzel', serif",
                    fontWeight: "900",
                    letterSpacing: "2px",
                    textTransform: "uppercase"
                },
                body: {
                    fontFamily: "'Cormorant', serif",
                    fontWeight: "400",
                    fontSize: "17px",
                    lineHeight: "1.7"
                },
                ui: {
                    fontFamily: "'Cinzel', serif",
                    fontWeight: "600",
                    fontSize: "14px",
                    letterSpacing: "1px"
                },
                monospace: {
                    fontFamily: "'Fira Code', monospace",
                    fontSize: "13px"
                }
            },
            scene: {
                container: { padding: "0px", background: "transparent" },
                textBlock: {
                    background: "linear-gradient(135deg, rgba(26, 0, 0, 0.9) 0%, rgba(42, 10, 10, 0.9) 100%)",
                    border: "2px solid #8b0000",
                    borderRadius: "8px",
                    padding: "18px",
                    color: "#e8d5d5",
                    fontFamily: "'Cormorant', serif",
                    fontSize: "1.1em",
                    boxShadow: "0 4px 16px rgba(139, 0, 0, 0.4), inset 0 0 30px rgba(139, 0, 0, 0.1)"
                },
                aiMemory: {
                    background: "rgba(139, 0, 0, 0.1)",
                    borderLeft: "4px solid #8b0000",
                    borderRadius: "6px",
                    padding: "12px",
                    titleColor: "#ff6b6b",
                    contentColor: "#d8c5c5",
                    keyColor: "#ff6b6b",
                    valueColor: "#e8d5d5"
                },
                choices: {
                    containerMargin: "20px 0 0 0",
                    btn: {
                        background: "linear-gradient(180deg, rgba(26, 0, 0, 0.8) 0%, rgba(42, 10, 10, 0.8) 100%)",
                        border: "2px solid #8b0000",
                        color: "#e8d5d5",
                        borderRadius: "8px",
                        padding: "14px 20px",
                        fontFamily: "'Cinzel', serif",
                        fontSize: "1em",
                        hoverBg: "linear-gradient(180deg, rgba(42, 0, 0, 0.9) 0%, rgba(62, 15, 15, 0.9) 100%)",
                        hoverBorder: "#aa0000",
                        selectedBg: "rgba(139, 0, 0, 0.3)",
                        selectedBorder: "#ff6b6b",
                        selectedColor: "#ffffff"
                    }
                }
            },
            gameItems: {
                personality: createGameItemConfig("#8b0000", "#2a0000", "#1a0000"),
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
            }
        }
    },
    
    retro: {
        name: "Retro Console",
        description: "Ретро-стиль игровой консоли 8-бит",
        preview: "linear-gradient(135deg, #2a1a5a 0%, #1a0a3a 100%)",
        config: {
            ...DEFAULT_THEME_CONFIG,
            name: "Retro Console",
            global: {
                icons: { set: 'emoji', emojiFilter: 'none' },
                layout: {
                    scrollbarColor: "#ff6b9d",
                    scrollbarBg: "#1a0a3a",
                    selectionColor: "#ffeb3b",
                    selectionBg: "rgba(255, 107, 157, 0.3)"
                }
            },
            typography: {
                headers: {
                    fontFamily: "'Press Start 2P', cursive",
                    fontWeight: "400",
                    letterSpacing: "2px",
                    textTransform: "uppercase"
                },
                body: {
                    fontFamily: "'VT323', monospace",
                    fontWeight: "400",
                    fontSize: "19px",
                    lineHeight: "1.5"
                },
                ui: {
                    fontFamily: "'Press Start 2P', cursive",
                    fontWeight: "400",
                    fontSize: "11px",
                    letterSpacing: "1px"
                },
                monospace: {
                    fontFamily: "'VT323', monospace",
                    fontSize: "16px"
                }
            },
            scene: {
                container: { padding: "0px", background: "transparent" },
                textBlock: {
                    background: "#1a0a3a",
                    border: "4px solid #ff6b9d",
                    borderRadius: "0px",
                    padding: "16px",
                    color: "#ffeb3b",
                    fontFamily: "'VT323', monospace",
                    fontSize: "1.2em",
                    boxShadow: "0 0 20px rgba(255, 107, 157, 0.5), inset 0 0 40px rgba(255, 107, 157, 0.05)"
                },
                aiMemory: {
                    background: "rgba(255, 107, 157, 0.1)",
                    borderLeft: "6px solid #ff6b9d",
                    borderRadius: "0px",
                    padding: "12px",
                    titleColor: "#ff6b9d",
                    contentColor: "#b0ff57",
                    keyColor: "#ff6b9d",
                    valueColor: "#b0ff57"
                },
                choices: {
                    containerMargin: "20px 0 0 0",
                    btn: {
                        background: "#1a0a3a",
                        border: "3px solid #b0ff57",
                        color: "#b0ff57",
                        borderRadius: "0px",
                        padding: "12px 16px",
                        fontFamily: "'Press Start 2P', cursive",
                        fontSize: "0.8em",
                        hoverBg: "rgba(176, 255, 87, 0.2)",
                        hoverBorder: "#b0ff57",
                        selectedBg: "#b0ff57",
                        selectedBorder: "#b0ff57",
                        selectedColor: "#1a0a3a"
                    }
                }
            },
            gameItems: {
                personality: createGameItemConfig("#ff6b9d", "#2a0a1a", "#1a050d"),
                typology: createGameItemConfig("#b0ff57", "#1a2a0a", "#0d1505"),
                organization: createGameItemConfig("#00e5ff", "#0a1a2a", "#050d15"),
                relations: createGameItemConfig("#ff80ff", "#2a0a2a", "#150515"),
                skill: createGameItemConfig("#ffeb3b", "#2a2a0a", "#151505"),
                stat_buffs: createGameItemConfig("#00e5ff", "#0a1a2a", "#050d15"),
                bless: createGameItemConfig("#ffffff", "#2a2a2a", "#151515"),
                curse: createGameItemConfig("#ff1744", "#2a0005", "#150002"),
                buff_debuff: createGameItemConfig("#00e676", "#0a2a15", "#05150a"),
                inventory: createGameItemConfig("#ff9100", "#2a1a00", "#150d00"),
                details: createGameItemConfig("#00e5ff", "#0a1a2a", "#050d15")
            }
        }
    },
    
    ocean: {
        name: "Deep Ocean",
        description: "Морская тема с голубыми и бирюзовыми тонами",
        preview: "linear-gradient(135deg, #001f3f 0%, #003459 100%)",
        config: {
            ...DEFAULT_THEME_CONFIG,
            name: "Deep Ocean",
            global: {
                icons: { set: 'emoji', emojiFilter: 'hue-rotate(180deg) brightness(1.1)' },
                layout: {
                    scrollbarColor: "#00b8d4",
                    scrollbarBg: "#001f3f",
                    selectionColor: "#00e5ff",
                    selectionBg: "rgba(0, 229, 255, 0.2)"
                }
            },
            typography: {
                headers: {
                    fontFamily: "'Montserrat', sans-serif",
                    fontWeight: "700",
                    letterSpacing: "1.5px",
                    textTransform: "uppercase"
                },
                body: {
                    fontFamily: "'Inter', sans-serif",
                    fontWeight: "400",
                    fontSize: "16px",
                    lineHeight: "1.6"
                },
                ui: {
                    fontFamily: "'Montserrat', sans-serif",
                    fontWeight: "600",
                    fontSize: "14px",
                    letterSpacing: "0.5px"
                },
                monospace: {
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: "13px"
                }
            },
            scene: {
                container: { padding: "0px", background: "transparent" },
                textBlock: {
                    background: "linear-gradient(135deg, rgba(0, 31, 63, 0.9) 0%, rgba(0, 52, 89, 0.9) 100%)",
                    border: "2px solid #00b8d4",
                    borderRadius: "12px",
                    padding: "18px",
                    color: "#e0f7fa",
                    fontFamily: "'Inter', sans-serif",
                    fontSize: "1.05em",
                    boxShadow: "0 4px 16px rgba(0, 184, 212, 0.3), inset 0 0 30px rgba(0, 184, 212, 0.05)"
                },
                aiMemory: {
                    background: "rgba(0, 184, 212, 0.08)",
                    borderLeft: "4px solid #00b8d4",
                    borderRadius: "8px",
                    padding: "12px",
                    titleColor: "#00e5ff",
                    contentColor: "#b0d8e0",
                    keyColor: "#00e5ff",
                    valueColor: "#c0e8f0"
                },
                choices: {
                    containerMargin: "20px 0 0 0",
                    btn: {
                        background: "linear-gradient(180deg, rgba(0, 52, 89, 0.8) 0%, rgba(0, 31, 63, 0.8) 100%)",
                        border: "2px solid #00b8d4",
                        color: "#e0f7fa",
                        borderRadius: "10px",
                        padding: "14px 18px",
                        fontFamily: "'Montserrat', sans-serif",
                        fontSize: "1em",
                        hoverBg: "linear-gradient(180deg, rgba(0, 72, 119, 0.9) 0%, rgba(0, 51, 89, 0.9) 100%)",
                        hoverBorder: "#00d8ff",
                        selectedBg: "rgba(0, 184, 212, 0.3)",
                        selectedBorder: "#00e5ff",
                        selectedColor: "#ffffff"
                    }
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

// 13. ЭКСПОРТ УТИЛИТ
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