/**
 * ═══════════════════════════════════════════════════════════════════════════
 * CONFIG: SCENE VISUAL CONFIGURATION - FULL CONTROL VIA CLASSES
 * ═══════════════════════════════════════════════════════════════════════════
 * Все настройки оформления мета-блоков сцены вынесены в отдельный конфиг.
 * Каждый визуальный элемент сцены имеет свой набор CSS-свойств,
 * которые будут преобразованы в CSS-правила в теме.
 * 
 * ВНИМАНИЕ: Свойства marginBottom удалены из отдельных блоков,
 * так как отступы между блоками управляются глобально через #sceneArea > *.
 * Отступы внутри блоков (например, между заголовком и контентом) остаются.
 */

export const SCENE_VISUAL_CONFIG = {
    // Контейнер сцены
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
    
    // Память ГМ
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
    
    // Варианты выбора
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
            fontSize: "1em",
            marginBottom: "10px" // отступ между кнопками
        }
    },
    
    // Заметки дизайнера
    designNotes: {
        background: "rgba(102, 102, 102, 0.08)",
        borderLeft: "4px solid #666",
        borderRadius: "4px",
        padding: "12px",
        titleColor: "#888",
        contentColor: "#aaa",
        titleFontFamily: "'Exo 2', sans-serif",
        contentFontFamily: "'Nunito Sans', sans-serif",
        fontSize: "0.9em",
        titleFontSize: "0.85em"
    },
    
    // Сводка сцены
    summary: {
        background: "rgba(72, 219, 251, 0.07)",
        borderLeft: "4px solid #48dbfb",
        borderRadius: "4px",
        padding: "12px",
        titleColor: "#48dbfb",
        contentColor: "#ccc",
        titleFontFamily: "'Exo 2', sans-serif",
        contentFontFamily: "'Nunito Sans', sans-serif",
        fontSize: "0.9em",
        titleFontSize: "0.9em"
    },
    
    // Рефлексия героя
    reflection: {
        background: "rgba(72, 219, 251, 0.08)",
        borderLeft: "4px solid #48dbfb",
        borderRadius: "4px",
        padding: "14px",
        titleColor: "#48dbfb",
        contentColor: "#ccc",
        titleFontFamily: "'Exo 2', sans-serif",
        contentFontFamily: "'Nunito Sans', sans-serif",
        fontSize: "0.9em",
        titleFontSize: "0.95em",
        italic: true
    },
    
    // Изменение личности
    personality: {
        background: "rgba(76, 209, 55, 0.08)",
        borderLeft: "4px solid #4cd137",
        borderRadius: "4px",
        padding: "14px",
        titleColor: "#4cd137",
        contentColor: "#ccc",
        titleFontFamily: "'Exo 2', sans-serif",
        contentFontFamily: "'Nunito Sans', sans-serif",
        fontSize: "0.9em",
        titleFontSize: "0.95em"
    },
    
    // Типология
    typology: {
        background: "rgba(156, 136, 255, 0.08)",
        borderLeft: "4px solid #9c88ff",
        borderRadius: "4px",
        padding: "14px",
        titleColor: "#9c88ff",
        contentColor: "#ccc",
        titleFontFamily: "'Exo 2', sans-serif",
        contentFontFamily: "'Nunito Sans', sans-serif",
        fontSize: "0.9em",
        titleFontSize: "0.95em"
    },
    
    // Дополнительные поля
    additionalField: {
        background: "rgba(255, 255, 255, 0.03)",
        borderLeft: "3px solid #777",
        borderRadius: "3px",
        padding: "10px",
        titleColor: "#aaa",
        contentColor: "#ccc",
        titleFontFamily: "'Exo 2', sans-serif",
        contentFontFamily: "'Nunito Sans', sans-serif",
        fontSize: "0.85em",
        titleFontSize: "0.85em"
    }
};