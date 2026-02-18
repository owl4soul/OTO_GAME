/**
 * ═══════════════════════════════════════════════════════════════════════════
 * CONFIG: HISTORY VISUAL CONFIGURATION - FULL CONTROL VIA CLASSES
 * ═══════════════════════════════════════════════════════════════════════════
 * Все настройки оформления истории вынесены в отдельный конфиг.
 * Каждый визуальный элемент истории имеет свой набор CSS-свойств,
 * которые будут преобразованы в CSS-правила в теме.
 */

export const HISTORY_VISUAL_CONFIG = {
  // Корневой контейнер истории
  container: {
    background: "#050505",
    padding: "0",
    height: "100%",
    overflowY: "auto",
    overflowX: "hidden"
  },
  
  // Шапка истории (заголовок + кнопки)
  header: {
    position: "sticky",
    top: "0",
    zIndex: "10",
    background: "#111111",
    padding: "3px 6px",
    borderBottom: "1px solid #e84118",
    marginBottom: "2px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    fontFamily: "'Exo 2', sans-serif",
    fontSize: "0.75em",
    color: "#dddddd" // цвет текста "ИСТОРИЯ"
  },
  
  // Кнопки в шапке (Expand All / Collapse All)
  headerButtons: {
    background: "rgba(76,209,55,0.1)",
    border: "1px solid #4cd137",
    color: "#4cd137",
    padding: "1px 3px",
    borderRadius: "2px",
    cursor: "pointer",
    fontSize: "0.6em",
    minWidth: "20px",
    transition: "all 0.2s ease",
    // Состояния
    hover: {
      background: "rgba(76,209,55,0.2)",
      borderColor: "#4cd137",
      color: "#4cd137"
    }
  },
  
  // Контейнер для списка ходов
  turnsContainer: {
    padding: "2px 0",
    display: "flex",
    flexDirection: "column",
    gap: "1px"
  },
  
  // Общие стили для элемента хода (details)
  turn: {
    background: "#0a0a0a",
    border: "0.5px solid rgba(255,255,255,0.05)",
    borderLeftWidth: "2px", // ширина левой границы (акцент)
    margin: "0 2px 1px 2px",
    fontSize: "0.7em",
    overflow: "hidden",
    borderRadius: "2px"
  },
  
  // Заголовок хода (summary)
  turnSummary: {
    padding: "2px 4px",
    cursor: "pointer",
    userSelect: "none",
    listStyle: "none",
    background: "rgba(0,0,0,0.3)",
    lineHeight: "1.2",
    fontFamily: "'Nunito Sans', sans-serif",
    fontSize: "0.8em",
    // Цвета отдельных частей
    numberColor: "#e84118", // цвет номера хода (акцент по умолчанию)
    summaryColor: "#aaa", // цвет текста сводки
    actionCountColor: "#666", // цвет счётчика действий
    timestampColor: "#555", // цвет времени
    chevronColor: "#e84118" // цвет шеврона (может переопределяться акцентом)
  },
  
  // Содержимое хода (развернутая часть)
  turnContent: {
    padding: "3px",
    borderTop: "0.5px solid rgba(255,255,255,0.05)",
    background: "rgba(0,0,0,0.2)",
    fontSize: "0.75em",
    whiteSpace: "normal",
    wordWrap: "break-word",
    overflowWrap: "break-word",
    fontFamily: "'Nunito Sans', sans-serif",
    color: "#cccccc"
  },
  
  // Блоки внутри содержимого (общие свойства для всех типов блоков)
  contentBlock: {
    padding: "2px",
    marginBottom: "2px",
    background: "rgba(255,255,255,0.02)",
    borderLeftWidth: "1px",
    borderLeftStyle: "solid",
    borderRadius: "0",
    titleFontSize: "0.7em",
    titleFontFamily: "'Exo 2', sans-serif",
    titleMarginBottom: "1px",
    contentFontSize: "0.75em",
    contentFontFamily: "'Nunito Sans', sans-serif",
    contentLineHeight: "1.2"
  },
  
  // Специфические настройки для каждого типа блока
  contentBlocks: {
    designNotes: {
      background: "rgba(102,102,102,0.03)",
      borderLeftColor: "#666",
      titleColor: "#666",
      contentColor: "#ccc",
      italic: false
    },
    aiMemory: {
      background: "rgba(251,197,49,0.03)",
      borderLeftColor: "#fbc531",
      titleColor: "#fbc531",
      // Цвета для ключей и значений
      keyColor: "#fbc531",
      valueColor: "#ccc",
      booleanTrueColor: "#4cd137",
      booleanFalseColor: "#e84118",
      numberColor: "#fbc531",
      arrayColor: "#9c88ff",
      stringColor: "#ccc",
      objectColor: "#48dbfb",
      fontSize: "0.7em"
    },
    summary: {
      background: "rgba(72,219,251,0.03)",
      borderLeftColor: "#48dbfb",
      titleColor: "#48dbfb",
      contentColor: "#ccc"
    },
    sceneText: {
      background: "rgba(232,65,24,0.03)",
      borderLeftColor: "#e84118",
      titleColor: "#e84118",
      contentColor: "#ccc"
    },
    reflection: {
      background: "rgba(72,219,251,0.03)",
      borderLeftColor: "#48dbfb",
      titleColor: "#48dbfb",
      contentColor: "#ccc",
      italic: true
    },
    personality: {
      background: "rgba(76,209,55,0.03)",
      borderLeftColor: "#4cd137",
      titleColor: "#4cd137",
      contentColor: "#ccc"
    },
    typology: {
      background: "rgba(156,136,255,0.03)",
      borderLeftColor: "#9c88ff",
      titleColor: "#9c88ff",
      contentColor: "#ccc"
    },
    actions: {
      background: "rgba(156,136,255,0.03)",
      borderLeftColor: "#9c88ff",
      titleColor: "#9c88ff",
      // Цвета для разных исходов
      successColor: "#4cd137",
      successBg: "rgba(76,209,55,0.1)",
      partialColor: "#fbc531",
      partialBg: "rgba(251,197,49,0.1)",
      failureColor: "#e84118",
      failureBg: "rgba(232,65,24,0.1)",
      fontSize: "0.75em"
    },
    changes: {
      background: "rgba(76,209,55,0.03)",
      borderLeftColor: "#4cd137",
      titleColor: "#4cd137",
      contentColor: "#ccc"
    }
  },
  
  // Акцентные цвета для статусов хода (левая граница и номер)
  accentColors: {
    success: "#4cd137",
    failure: "#e84118",
    mixed: "#fbc531",
    neutral: "#555"
  },
  
  // Индикатор "Последние X из Y ходов"
  footerIndicator: {
    background: "rgba(232,65,24,0.05)",
    borderLeft: "1px solid #e84118",
    borderRadius: "1px",
    fontSize: "0.65em",
    color: "#888",
    textAlign: "center",
    padding: "2px 4px",
    margin: "1px 2px"
  },
  
  // Пустое состояние (история пуста)
  emptyState: {
    padding: "10px",
    textAlign: "center",
    color: "#555",
    fontSize: "0.75em",
    fontStyle: "italic",
    iconSize: "1.5em",
    iconOpacity: "0.3"
  }
};