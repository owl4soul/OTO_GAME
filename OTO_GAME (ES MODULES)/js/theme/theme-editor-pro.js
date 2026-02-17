// js/theme/theme-editor-pro.js
'use strict';

import { themeManagerPro } from './theme-pro.js';
import { GradientPickerPro } from './gradient-picker-pro.js';
import { FONT_LIBRARY } from './theme-config-pro.js';

export class ThemeEditorPro {
    constructor() {
        this.activeTab = 'global';
        this.gradientPicker = new GradientPickerPro();
        this.historyStack = [];
        this.historyIndex = -1;

        this.labels = {
            // ── GLOBAL ──────────────────────────────────────────────
            icons: "🎨 Система иконок",
            set: "Набор иконок",
            emojiFilter: "CSS-фильтр для emoji",
            layout: "📐 Разметка",
            scrollbarColor: "Цвет полосы скролла",
            scrollbarBg: "Фон дорожки скролла",
            selectionColor: "Цвет выделенного текста",
            selectionBg: "Фон выделенного текста",
            blockMargin: "Отступ между блоками",

            // ── TYPOGRAPHY ──────────────────────────────────────────
            headers: "📰 Заголовки",
            body: "📝 Основной текст",
            ui: "🎛️ UI-элементы",
            monospace: "⌨️ Моноширинный",
            fontFamily: "Шрифт",
            fontWeight: "Насыщенность",
            fontSize: "Размер шрифта",
            lineHeight: "Высота строки",
            letterSpacing: "Межбуквенный интервал",
            textTransform: "Регистр",
            color: "Цвет текста",

            // ── SCENE ───────────────────────────────────────────────
            container: "📦 Контейнер сцены",
            textBlock: "📄 Блок текста сцены",
            aiMemory: "🧠 Память ИИ (ГМ)",
            choices: "🎯 Варианты выбора",
            designNotes: "📝 Заметки дизайнера",
            summary: "📋 Сводка",
            reflection: "💭 Внутренний голос",
            personality: "👤 Личность (мета)",
            typology: "🔖 Типология (мета)",
            additionalField: "➕ Доп. поля",
            btn: "⚙️ Кнопка выбора",

            // ── ОБЩИЕ CSS-СВОЙСТВА ──────────────────────────────────
            background: "Фон",
            border: "Граница (вся)",
            borderLeft: "Граница слева",
            borderRight: "Граница справа",
            borderTop: "Граница сверху",
            borderBottom: "Граница снизу",
            borderColor: "Цвет границы",
            borderRadius: "Скругление",
            padding: "Внутр. отступы",
            margin: "Внешн. отступы",
            marginBottom: "Отступ снизу",
            boxShadow: "Тень блока",
            containerMargin: "Отступы контейнера",

            // ── СПЕЦИАЛЬНЫЕ ЦВЕТА БЛОКОВ ────────────────────────────
            titleColor: "Цвет заголовка",
            contentColor: "Цвет содержимого",
            keyColor: "Цвет ключей JSON",
            valueColor: "Цвет значений JSON",
            hoverBg: "Фон при наведении",
            hoverBorder: "Граница при наведении",
            selectedBg: "Фон выбранной",
            selectedBorder: "Граница выбранной",
            selectedColor: "Цвет текста выбранной",
            titleFontFamily: "Шрифт заголовка",
            contentFontFamily: "Шрифт содержимого",
            titleFontSize: "Размер заголовка",
            italic: "Курсив",

            // ── GAME ITEMS ──────────────────────────────────────────
            header: "📌 Заголовок секции",
            badge: "🏷️ Бейдж",
            hoverTransform: "Трансформация при наведении",
            hoverShadow: "Тень при наведении",

            // Типы игровых элементов (суффикс _gi)
            personality_gi: "👤 Личность",
            typology_gi: "🔖 Типология",
            organization: "🏛️ Организации",
            relations: "💑 Отношения",
            skill: "📜 Навыки",
            stat_buffs: "📊 Модификаторы статов",
            bless: "✨ Благословения",
            curse: "☠️ Проклятия",
            buff_debuff: "📈 Баффы/Дебаффы",
            inventory: "🎒 Инвентарь",
            details: "ℹ️ Детали",

            // ── TURN UPDATES ─────────────────────────────────────────
            content: "📄 Содержимое",

            // ── HISTORY ─────────────────────────────────────────────
            header_history: "🎯 Заголовок журнала",
            headerButtons: "🔘 Кнопки заголовка",
            hover: "Стиль при наведении",
            turn: "📝 Блок хода",
            turnSummary: "📋 Сводка хода",
            turnContent: "📄 Содержимое хода",
            accentColors: "🎨 Акцентные цвета",
            summaryColor: "Цвет текста сводки",
            actionCountColor: "Цвет счётчика действий",
            timestampColor: "Цвет метки времени",
            success: "Цвет успеха",
            failure: "Цвет провала",
            mixed: "Цвет смешанного",
            neutral: "Цвет нейтрального",
        };
    }

    // ═══════════════════════════════════════════════════════════════════════
    // КЛАССИФИКАЦИЯ ТИПОВ ПОЛЕЙ
    // ═══════════════════════════════════════════════════════════════════════

    /**
     * Чистое цветовое значение: "#hex", "rgb()", "rgba()", "gradient", "transparent"
     */
    _isPureColorValue(value) {
        if (typeof value !== 'string') return false;
        const v = value.trim();
        return (
            v.startsWith('#') ||
            v.startsWith('rgb') ||
            v.startsWith('hsl') ||
            v.toLowerCase().includes('gradient') ||
            v === 'transparent' ||
            v === 'inherit' ||
            v === 'currentColor' ||
            /^[a-zA-Z]+$/.test(v) && v.length < 20 && !v.includes(' ')
        );
    }

    /**
     * Составное CSS-значение, содержащее цвет как часть.
     * "4px solid #fbc531", "0 4px 8px rgba(0,0,0,0.3)", "1px solid rgba(255,255,255,0.1)"
     */
    _isCompoundCssWithColor(key, value) {
        if (typeof value !== 'string') return false;
        const keyLower = key.toLowerCase();
        const isCompoundKey =
            keyLower === 'border' ||
            keyLower === 'borderleft' ||
            keyLower === 'borderright' ||
            keyLower === 'bordertop' ||
            keyLower === 'borderbottom' ||
            keyLower === 'hoverborder' ||
            keyLower === 'selectedborder' ||
            keyLower === 'boxshadow' ||
            keyLower === 'hovershadow';
        if (!isCompoundKey) return false;
        // Убеждаемся, что значение реально содержит цвет
        return /#[0-9a-fA-F]{3,8}/.test(value) || /rgba?\(/.test(value) || /hsla?\(/.test(value);
    }

    /**
     * Поле — шрифт
     */
    _isFontField(key) {
        const k = key.toLowerCase();
        return k.includes('fontfamily');
    }

    /**
     * Поле — textTransform
     */
    _isTextTransformField(key) {
        return key === 'textTransform';
    }

    /**
     * Поле — булево
     */
    _isBooleanField(key, value) {
        return key === 'italic' || value === true || value === false;
    }

    /**
     * Поле — чистый цвет (не составное)
     */
    _isPureColorField(key, value) {
        if (this._isCompoundCssWithColor(key, value)) return false;
        const keyLower = key.toLowerCase();
        const colorKeywords = ['color', 'background', 'bg'];
        // Перечисленные поля, которые ВСЕГДА цвет
        const explicitColorFields = ['success', 'failure', 'mixed', 'neutral'];
        const hasKeyword = colorKeywords.some(kw => keyLower.includes(kw));
        const isExplicit = explicitColorFields.includes(key);
        return (hasKeyword || isExplicit) && this._isPureColorValue(value);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // LIFECYCLE
    // ═══════════════════════════════════════════════════════════════════════

    open() {
        if (document.getElementById('te-overlay')) return;
        themeManagerPro.startEditing();
        this._pushHistory();
        this._render();
        setTimeout(() => this._updatePreview(), 100);
    }

    close() {
        const el = document.getElementById('te-overlay');
        if (el) el.remove();
        themeManagerPro.endEditing();
    }

    // ═══════════════════════════════════════════════════════════════════════
    // ИСТОРИЯ
    // ═══════════════════════════════════════════════════════════════════════

    _pushHistory() {
        const state = JSON.stringify(themeManagerPro.getCurrentTheme());
        this.historyStack = this.historyStack.slice(0, this.historyIndex + 1);
        this.historyStack.push(state);
        this.historyIndex = this.historyStack.length - 1;
        this._updateNav();
        this._updatePreview();
    }

    _undo() {
        if (this.historyIndex > 0) {
            this.historyIndex--;
            themeManagerPro.setEditingTheme(JSON.parse(this.historyStack[this.historyIndex]));
            this._renderContent();
            this._updateNav();
            this._updatePreview();
        }
    }

    _redo() {
        if (this.historyIndex < this.historyStack.length - 1) {
            this.historyIndex++;
            themeManagerPro.setEditingTheme(JSON.parse(this.historyStack[this.historyIndex]));
            this._renderContent();
            this._updateNav();
            this._updatePreview();
        }
    }

    // ═══════════════════════════════════════════════════════════════════════
    // РЕНДЕР ОБОЛОЧКИ
    // ═══════════════════════════════════════════════════════════════════════

    _render() {
        const overlay = document.createElement('div');
        overlay.id = 'te-overlay';
        overlay.style.cssText = `position:fixed;top:0;left:0;width:100%;height:100%;
            background:rgba(0,0,0,0.9);z-index:11000;display:flex;
            justify-content:center;align-items:center;
            backdrop-filter:blur(8px);font-family:'Segoe UI',sans-serif;font-size:14px;`;

        const win = document.createElement('div');
        win.style.cssText = `width:98%;height:96%;background:#111;
            border:1px solid #d4af37;border-radius:12px;
            display:flex;flex-direction:column;
            box-shadow:0 0 60px rgba(0,0,0,0.8);overflow:hidden;`;

        win.appendChild(this._createHeader());
        win.appendChild(this._createBody());
        win.appendChild(this._createFooter());

        overlay.appendChild(win);
        document.body.appendChild(overlay);
        this._updateNav();
    }

    _createHeader() {
        const h = document.createElement('div');
        h.style.cssText = "padding:12px 25px;background:#000;border-bottom:1px solid #333;display:flex;justify-content:space-between;align-items:center;";

        const left = document.createElement('div');
        left.style.cssText = "display:flex;gap:20px;align-items:center;";
        left.innerHTML = `<div style="color:#d4af37;font-weight:900;font-size:1.2em;letter-spacing:2px;">THEME EDITOR PRO</div>`;

        const presetLabel = document.createElement('span');
        presetLabel.textContent = "ПРЕСЕТ:";
        presetLabel.style.cssText = "color:#555;font-size:0.8em;font-weight:bold;";
        left.appendChild(presetLabel);

        const presetSel = document.createElement('select');
        presetSel.style.cssText = "background:#1a1a1a;color:#d4af37;border:1px solid #444;padding:6px 12px;border-radius:6px;font-weight:bold;outline:none;";
        themeManagerPro.getPresets().forEach(p => {
            const opt = document.createElement('option');
            opt.value = p.key; opt.text = p.name;
            if (p.isCurrent) opt.selected = true;
            presetSel.appendChild(opt);
        });
        presetSel.onchange = e => {
            if (confirm("Загрузить пресет? Несохранённые изменения будут потеряны.")) {
                themeManagerPro.loadPreset(e.target.value);
                themeManagerPro.startEditing();
                this._pushHistory();
                this._renderContent();
            }
        };
        left.appendChild(presetSel);
        h.appendChild(left);

        const right = document.createElement('div');
        right.style.cssText = "display:flex;gap:10px;";
        const btnCss = "background:#222;color:#fff;border:1px solid #444;padding:6px 15px;cursor:pointer;border-radius:6px;font-weight:600;transition:all 0.2s;";

        const undo = document.createElement('button');
        undo.id = 'te-undo'; undo.innerHTML = '↩ Назад'; undo.style.cssText = btnCss;
        undo.onclick = () => this._undo();

        const redo = document.createElement('button');
        redo.id = 'te-redo'; redo.innerHTML = '↪ Вперёд'; redo.style.cssText = btnCss;
        redo.onclick = () => this._redo();

        const imp = document.createElement('button');
        imp.innerHTML = '📥 Импорт'; imp.style.cssText = btnCss;
        imp.onclick = () => this._import();

        const exp = document.createElement('button');
        exp.innerHTML = '📤 Экспорт'; exp.style.cssText = btnCss;
        exp.onclick = () => this._export();

        right.append(undo, redo, imp, exp);
        h.appendChild(right);
        return h;
    }

    _createBody() {
        const body = document.createElement('div');
        body.style.cssText = "flex:1;display:flex;overflow:hidden;background:#000;";

        // Sidebar
        const sidebar = document.createElement('div');
        sidebar.id = 'te-sidebar';
        sidebar.style.cssText = "width:260px;background:#050505;border-right:1px solid #222;overflow-y:auto;display:flex;flex-direction:column;z-index:2;";

        const tabs = [
            { id: 'global',      label: '🌐 ГЛОБАЛЬНЫЕ',    desc: 'Фон, скроллбары, выделение' },
            { id: 'typography',  label: '🔤 ТИПОГРАФИКА',   desc: 'Шрифты, размеры, интервалы' },
            { id: 'scene',       label: '🎬 СЦЕНА',         desc: 'Блоки текста, память ИИ' },
            { id: 'gameItems',   label: '🎮 ИГРОВЫЕ БЛОКИ', desc: 'Характеристики, инвентарь' },
            { id: 'turnUpdates', label: '🔄 ХОД',           desc: 'Изменения за ход' },
            { id: 'history',     label: '📜 ИСТОРИЯ',       desc: 'Лог событий и архив' },
        ];

        tabs.forEach(t => {
            const b = document.createElement('div');
            b.innerHTML = `<div style="font-weight:900;font-size:1em;">${t.label}</div>
                <div style="font-size:0.75em;opacity:0.5;margin-top:2px;">${t.desc}</div>`;
            b.dataset.tab = t.id;
            b.style.cssText = `padding:18px 25px;cursor:pointer;border-bottom:1px solid #111;
                color:${this.activeTab === t.id ? '#d4af37' : '#555'};
                background:${this.activeTab === t.id ? 'linear-gradient(90deg,rgba(212,175,55,0.1) 0%,transparent 100%)' : 'transparent'};
                border-left:4px solid ${this.activeTab === t.id ? '#d4af37' : 'transparent'};
                transition:all 0.3s;`;
            b.onclick = () => { this.activeTab = t.id; this._updateSidebarUI(); this._renderContent(); };
            sidebar.appendChild(b);
        });

        // Content
        const content = document.createElement('div');
        content.id = 'te-content';
        content.style.cssText = "width:500px;padding:30px;overflow-y:auto;background:#111;border-right:1px solid #222;scrollbar-width:thin;z-index:1;";

        // Preview
        const previewWrap = document.createElement('div');
        previewWrap.style.cssText = "flex:1;display:flex;flex-direction:column;background:#000;position:relative;overflow:hidden;";

        const previewHeader = document.createElement('div');
        previewHeader.style.cssText = "padding:12px 25px;background:#050505;border-bottom:1px solid #222;color:#d4af37;font-weight:bold;font-size:0.8em;display:flex;justify-content:space-between;align-items:center;letter-spacing:1px;";
        previewHeader.innerHTML = `<span>👁 ЖИВОЙ ПРЕДПРОСМОТР</span><span style="font-size:0.8em;color:#444;">RENDER: PRO V4</span>`;

        const previewBody = document.createElement('div');
        previewBody.id = 'te-preview-container';
        previewBody.style.cssText = "flex:1;padding:40px;overflow-y:auto;position:relative;scrollbar-width:thin;background-image:radial-gradient(#1a1a1a 1px,transparent 1px);background-size:30px 30px;";

        previewWrap.append(previewHeader, previewBody);
        body.append(sidebar, content, previewWrap);
        setTimeout(() => { this._renderContent(); this._updatePreview(); }, 0);
        return body;
    }

    _updateSidebarUI() {
        const sb = document.getElementById('te-sidebar');
        if (!sb) return;
        Array.from(sb.children).forEach(c => {
            const active = c.dataset.tab === this.activeTab;
            c.style.color = active ? '#d4af37' : '#666';
            c.style.background = active ? 'rgba(212,175,55,0.08)' : 'transparent';
            c.style.borderLeftColor = active ? '#d4af37' : 'transparent';
        });
    }

    _renderContent() {
        const c = document.getElementById('te-content');
        if (!c) return;
        c.innerHTML = '';
        const theme = themeManagerPro.getCurrentTheme();
        const sectionData = theme[this.activeTab];

        if (!sectionData) {
            c.innerHTML = '<div style="color:#444;text-align:center;padding:50px;">Секция пуста</div>';
            return;
        }

        const tabTitle = document.createElement('h2');
        tabTitle.textContent = this.activeTab.toUpperCase();
        tabTitle.style.cssText = "color:#d4af37;font-size:1.2em;margin-bottom:20px;border-bottom:2px solid #d4af37;padding-bottom:10px;font-weight:900;";
        c.appendChild(tabTitle);

        this._renderObject(c, sectionData, [this.activeTab]);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // РЕКУРСИВНЫЙ РЕНДЕР ОБЪЕКТА
    // ═══════════════════════════════════════════════════════════════════════

    _renderObject(container, obj, path) {
        Object.entries(obj).forEach(([key, val]) => {
            const curPath = [...path, key];

            // Специальный виджет для иконок
            if (key === 'icons' && path[0] === 'global') {
                this._renderIconSettings(container, val, curPath);
                return;
            }

            if (typeof val === 'object' && val !== null && !Array.isArray(val)) {
                const group = document.createElement('div');
                group.style.cssText = "margin-bottom:20px;border:1px solid #222;background:#181818;border-radius:8px;overflow:hidden;";

                const header = document.createElement('div');
                header.textContent = this._getLabel(key, path).toUpperCase();
                header.style.cssText = "padding:10px 15px;background:#222;border-bottom:1px solid #333;font-weight:bold;color:#d4af37;font-size:0.85em;letter-spacing:1px;";
                group.appendChild(header);

                const inner = document.createElement('div');
                inner.style.padding = "15px";
                this._renderObject(inner, val, curPath);
                group.appendChild(inner);
                container.appendChild(group);
            } else {
                this._renderField(container, key, val, curPath);
            }
        });
    }

    _getLabel(key, path) {
        if (path[0] === 'gameItems' && path.length === 1) {
            const k = key + '_gi';
            if (this.labels[k]) return this.labels[k];
        }
        if (path[0] === 'history' && path.length === 1) {
            const k = key + '_history';
            if (this.labels[k]) return this.labels[k];
        }
        return this.labels[key] || key.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ').trim();
    }

    // ═══════════════════════════════════════════════════════════════════════
    // РЕНДЕР ОДНОГО ПОЛЯ
    // ═══════════════════════════════════════════════════════════════════════

    _renderField(container, key, val, path) {
        const row = document.createElement('div');
        row.style.cssText = "display:flex;flex-direction:column;gap:8px;margin-bottom:16px;padding:10px;background:rgba(255,255,255,0.02);border-radius:8px;border:1px solid rgba(255,255,255,0.03);";

        const labelRow = document.createElement('div');
        labelRow.style.cssText = "display:flex;justify-content:space-between;align-items:center;";

        const label = document.createElement('label');
        label.textContent = this._getLabel(key, path.slice(0, -1));
        label.style.cssText = "color:#aaa;font-size:0.75em;font-weight:900;text-transform:uppercase;letter-spacing:1px;";

        // Тип поля-подсказка
        const typeHint = document.createElement('span');
        typeHint.style.cssText = "color:#333;font-size:0.65em;font-family:monospace;padding:1px 5px;border-radius:3px;background:#1a1a1a;";

        const wrapper = document.createElement('div');
        wrapper.style.cssText = "display:flex;gap:10px;align-items:center;";

        let input;

        if (this._isFontField(key)) {
            typeHint.textContent = 'font';
            input = this._createFontSelector(val, path);
        } else if (this._isTextTransformField(key)) {
            typeHint.textContent = 'select';
            input = this._createTextTransformSelector(val, path);
        } else if (this._isBooleanField(key, val)) {
            typeHint.textContent = 'bool';
            input = this._createBooleanInput(val, path);
        } else if (this._isCompoundCssWithColor(key, val)) {
            // ★ СОСТАВНОЕ CSS-ЗНАЧЕНИЕ — специальный виджет
            typeHint.textContent = 'css+color';
            input = this._createCompoundCssInput(val, path);
        } else if (this._isPureColorField(key, val)) {
            // ★ ЧИСТЫЙ ЦВЕТ — прямой пикер
            typeHint.textContent = 'color';
            input = this._createPureColorInput(val, path);
        } else {
            typeHint.textContent = 'text';
            input = this._createTextInput(val, path);
        }

        labelRow.append(label, typeHint);
        wrapper.appendChild(input);
        row.append(labelRow, wrapper);
        container.appendChild(row);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // ВИДЖЕТЫ ВВОДА
    // ═══════════════════════════════════════════════════════════════════════

    /**
     * ЧИСТЫЙ ЦВЕТ/ГРАДИЕНТ — пикер заменяет значение целиком.
     * Используется для: color, background, titleColor, hoverBg, selectionBg и т.д.
     */
    _createPureColorInput(val, path) {
        const group = document.createElement('div');
        group.style.cssText = "display:flex;gap:8px;width:100%;align-items:center;";

        const preview = document.createElement('div');
        preview.style.cssText = `width:40px;height:38px;border:2px solid #333;background:${val || 'transparent'};cursor:pointer;border-radius:8px;box-shadow:0 2px 5px rgba(0,0,0,0.5);flex-shrink:0;`;

        const txt = document.createElement('input');
        txt.value = val || '';
        txt.style.cssText = "flex:1;background:#000;border:1px solid #333;color:#fff;padding:8px 12px;border-radius:6px;font-size:0.85em;outline:none;font-family:monospace;";

        const typeIcon = document.createElement('span');
        typeIcon.textContent = (val || '').includes('gradient') ? '🌈' : '🎨';
        typeIcon.style.cssText = "font-size:1.1em;flex-shrink:0;";
        typeIcon.title = 'Кликните превью для открытия пикера';

        const applyValue = (newVal) => {
            txt.value = newVal;
            preview.style.background = newVal;
            typeIcon.textContent = newVal.includes('gradient') ? '🌈' : '🎨';
            themeManagerPro.updateSetting(path, newVal);
            this._pushHistory();
        };

        preview.onclick = () => {
            this.gradientPicker.open(applyValue, txt.value || '#000000');
        };

        txt.oninput = e => {
            const v = e.target.value;
            preview.style.background = v;
            typeIcon.textContent = v.includes('gradient') ? '🌈' : '🎨';
            themeManagerPro.updateSetting(path, v, false);
            this._updatePreview();
        };

        txt.onchange = () => this._pushHistory();

        group.append(preview, txt, typeIcon);
        return group;
    }

    /**
     * СОСТАВНОЕ CSS-ЗНАЧЕНИЕ С ЦВЕТОМ.
     * Для border, borderLeft, boxShadow, hoverShadow и т.д.
     * Показывает:
     *   [превью цвета] [полное текстовое поле]
     * Клик на превью → пикер → заменяет ТОЛЬКО цвет внутри строки.
     */
    _createCompoundCssInput(val, path) {
        const group = document.createElement('div');
        group.style.cssText = "display:flex;gap:8px;width:100%;align-items:center;";

        // Извлекаем цвет из составного значения для превью
        const extractedColor = this._extractColorFromCss(val);

        const preview = document.createElement('div');
        preview.style.cssText = `width:40px;height:38px;border:2px solid #333;background:${extractedColor || '#333'};cursor:pointer;border-radius:8px;box-shadow:0 2px 5px rgba(0,0,0,0.5);flex-shrink:0;position:relative;`;
        preview.title = 'Кликните для изменения цвета (остальные параметры сохранятся)';

        // Иконка карандаша на превью
        preview.innerHTML = `<div style="position:absolute;bottom:1px;right:1px;font-size:0.6em;opacity:0.8;">✏️</div>`;

        const txt = document.createElement('input');
        txt.value = val || '';
        txt.style.cssText = "flex:1;background:#000;border:1px solid #333;color:#fff;padding:8px 12px;border-radius:6px;font-size:0.82em;outline:none;font-family:monospace;";
        txt.placeholder = 'напр. 4px solid #d4af37';

        // Обновление превью при ручном вводе
        const updatePreview = (cssVal) => {
            const c = this._extractColorFromCss(cssVal);
            preview.style.background = c || '#333';
        };

        preview.onclick = () => {
            const currentColor = this._extractColorFromCss(txt.value) || '#ffffff';
            this.gradientPicker.open(
                (newColor) => {
                    // Заменяем только цветовую часть, сохраняя остальное
                    const newCssValue = this._replaceColorInCss(txt.value, newColor);
                    txt.value = newCssValue;
                    updatePreview(newCssValue);
                    themeManagerPro.updateSetting(path, newCssValue);
                    this._pushHistory();
                },
                currentColor
            );
        };

        txt.oninput = e => {
            updatePreview(e.target.value);
            themeManagerPro.updateSetting(path, e.target.value, false);
            this._updatePreview();
        };

        txt.onchange = () => this._pushHistory();

        group.append(preview, txt);
        return group;
    }

    /**
     * Извлекает цветовую часть из составного CSS-значения.
     * "4px solid #fbc531" → "#fbc531"
     * "0 4px 8px rgba(0,0,0,0.3)" → "rgba(0,0,0,0.3)"
     * "1px solid rgba(255,255,255,0.1)" → "rgba(255,255,255,0.1)"
     */
    _extractColorFromCss(cssValue) {
        if (!cssValue) return null;
        // Сначала rgba/rgb/hsla/hsl (более специфичный паттерн — первый)
        const rgbaMatch = cssValue.match(/rgba?\([^)]+\)/);
        if (rgbaMatch) return rgbaMatch[0];
        const hslaMatch = cssValue.match(/hsla?\([^)]+\)/);
        if (hslaMatch) return hslaMatch[0];
        // Потом hex (в т.ч. 8-значный, напр. #d4af3720)
        const hexMatch = cssValue.match(/#[0-9a-fA-F]{3,8}\b/);
        if (hexMatch) return hexMatch[0];
        return null;
    }

    /**
     * Заменяет цветовую часть в составном CSS-значении новым цветом.
     * replaceColorInCss("4px solid #fbc531", "#ff0000") → "4px solid #ff0000"
     * replaceColorInCss("0 4px 8px rgba(0,0,0,0.3)", "#ff0000") → "0 4px 8px #ff0000"
     */
    _replaceColorInCss(cssValue, newColor) {
        if (!cssValue) return newColor;
        // Пробуем замену rgba/rgb
        if (/rgba?\([^)]+\)/.test(cssValue)) {
            return cssValue.replace(/rgba?\([^)]+\)/, newColor);
        }
        // Пробуем hsla/hsl
        if (/hsla?\([^)]+\)/.test(cssValue)) {
            return cssValue.replace(/hsla?\([^)]+\)/, newColor);
        }
        // Пробуем hex (8, 6, 4, 3 знака — от длинного к короткому)
        if (/#[0-9a-fA-F]{3,8}\b/.test(cssValue)) {
            return cssValue.replace(/#[0-9a-fA-F]{3,8}\b/, newColor);
        }
        // Если цвет не найден — заменяем последнее «слово»
        const parts = cssValue.trim().split(/\s+/);
        parts[parts.length - 1] = newColor;
        return parts.join(' ');
    }

    /**
     * Обычное текстовое поле.
     */
    _createTextInput(val, path) {
        const input = document.createElement('input');
        input.type = 'text';
        input.value = val != null ? val : '';
        input.style.cssText = "flex:1;background:#000;border:1px solid #333;color:#fff;padding:10px 15px;border-radius:8px;font-size:0.95em;outline:none;transition:border-color 0.2s;";
        input.onfocus = () => input.style.borderColor = '#d4af37';
        input.onblur = () => input.style.borderColor = '#333';
        input.oninput = e => {
            themeManagerPro.updateSetting(path, e.target.value, false);
            this._updatePreview();
        };
        input.onchange = e => {
            themeManagerPro.updateSetting(path, e.target.value);
            this._pushHistory();
        };
        // Обёртка, чтобы растягивалось
        const wrap = document.createElement('div');
        wrap.style.cssText = "display:flex;width:100%;";
        wrap.appendChild(input);
        return wrap;
    }

    /**
     * Селектор шрифта.
     */
    _createFontSelector(val, path) {
        const sel = document.createElement('select');
        sel.style.cssText = "flex:1;background:#000;border:1px solid #333;color:#d4af37;padding:8px 12px;border-radius:6px;font-weight:bold;outline:none;";
        const cleanVal = (val || '').replace(/['"]/g, '').split(',')[0].trim();
        Object.keys(FONT_LIBRARY).forEach(font => {
            const opt = document.createElement('option');
            let suffix = ', sans-serif';
            if (['Roboto Mono', 'Fira Code', 'Source Code Pro', 'JetBrains Mono', 'VT323', 'Press Start 2P'].includes(font)) suffix = ', monospace';
            else if (['Cinzel', 'Lora', 'Playfair Display', 'Merriweather', 'Cormorant'].includes(font)) suffix = ', serif';
            opt.value = `'${font}'${suffix}`;
            opt.text = font;
            if (cleanVal === font) opt.selected = true;
            sel.appendChild(opt);
        });
        sel.onchange = e => {
            themeManagerPro.updateSetting(path, e.target.value);
            this._pushHistory();
        };
        const wrap = document.createElement('div');
        wrap.style.cssText = "display:flex;width:100%;";
        wrap.appendChild(sel);
        return wrap;
    }

    /**
     * Селектор textTransform.
     */
    _createTextTransformSelector(val, path) {
        const sel = document.createElement('select');
        sel.style.cssText = "flex:1;background:#000;border:1px solid #333;color:#d4af37;padding:8px 12px;border-radius:6px;font-weight:bold;outline:none;";
        [
            ['none', 'Без изменений'],
            ['uppercase', 'ЗАГЛАВНЫЕ'],
            ['lowercase', 'строчные'],
            ['capitalize', 'Первая Заглавная'],
        ].forEach(([v, l]) => {
            const opt = document.createElement('option');
            opt.value = v; opt.text = l;
            if (val === v) opt.selected = true;
            sel.appendChild(opt);
        });
        sel.onchange = e => {
            themeManagerPro.updateSetting(path, e.target.value);
            this._pushHistory();
        };
        const wrap = document.createElement('div');
        wrap.style.cssText = "display:flex;width:100%;";
        wrap.appendChild(sel);
        return wrap;
    }

    /**
     * Чекбокс для булевых значений.
     */
    _createBooleanInput(val, path) {
        const wrap = document.createElement('div');
        wrap.style.cssText = "display:flex;align-items:center;gap:12px;";
        const cb = document.createElement('input');
        cb.type = 'checkbox';
        cb.checked = val === true || val === 'true';
        cb.style.cssText = "width:18px;height:18px;cursor:pointer;accent-color:#d4af37;";
        const lbl = document.createElement('span');
        lbl.textContent = cb.checked ? '✓ Включено' : '✗ Выключено';
        lbl.style.cssText = "color:#aaa;font-size:0.9em;";
        cb.onchange = e => {
            lbl.textContent = e.target.checked ? '✓ Включено' : '✗ Выключено';
            themeManagerPro.updateSetting(path, e.target.checked);
            this._pushHistory();
        };
        wrap.append(cb, lbl);
        return wrap;
    }

    // ═══════════════════════════════════════════════════════════════════════
    // ИКОНКИ
    // ═══════════════════════════════════════════════════════════════════════

    _renderIconSettings(container, val, path) {
        const box = document.createElement('div');
        box.style.cssText = "background:rgba(212,175,55,0.05);border:1px solid #d4af37;padding:12px;border-radius:6px;margin-bottom:15px;";

        const title = document.createElement('div');
        title.innerHTML = "<b>🎨 СИСТЕМА ИКОНОК</b>";
        title.style.cssText = "color:#d4af37;margin-bottom:12px;border-bottom:1px solid #333;padding-bottom:6px;";
        box.appendChild(title);

        // Набор
        const row1 = document.createElement('div');
        row1.style.cssText = "display:flex;align-items:center;gap:10px;margin-bottom:10px;";
        row1.innerHTML = `<label style="color:#aaa;font-size:0.8em;font-weight:bold;text-transform:uppercase;white-space:nowrap;">Набор иконок:</label>`;
        const sel = document.createElement('select');
        sel.style.cssText = "flex:1;background:#222;color:#fff;padding:6px;border:1px solid #444;border-radius:4px;";
        [['fa','FontAwesome (стандарт)'],['emoji','Emoji (переопределение)']].forEach(([v,l]) => {
            const o = document.createElement('option'); o.value = v; o.text = l;
            if (val.set === v) o.selected = true;
            sel.appendChild(o);
        });
        sel.onchange = e => { themeManagerPro.updateSetting([...path, 'set'], e.target.value); this._pushHistory(); };
        row1.appendChild(sel);
        box.appendChild(row1);

        // Фильтр
        const row2 = document.createElement('div');
        row2.style.cssText = "display:flex;align-items:center;gap:10px;";
        row2.innerHTML = `<label style="color:#aaa;font-size:0.8em;font-weight:bold;text-transform:uppercase;white-space:nowrap;">CSS-фильтр emoji:</label>`;
        const inp = document.createElement('input');
        inp.type = 'text'; inp.value = val.emojiFilter || 'none';
        inp.style.cssText = "flex:1;background:#222;color:#fff;padding:6px;border:1px solid #444;border-radius:4px;font-family:monospace;font-size:0.85em;";
        inp.onchange = e => { themeManagerPro.updateSetting([...path, 'emojiFilter'], e.target.value); this._pushHistory(); };
        row2.appendChild(inp);
        box.appendChild(row2);

        container.appendChild(box);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // ПРЕВЬЮ
    // ═══════════════════════════════════════════════════════════════════════

    _updatePreview() {
        const container = document.getElementById('te-preview-container');
        if (!container) return;
        container.innerHTML = '';
        const sandbox = document.createElement('div');
        sandbox.id = 'sceneArea';
        sandbox.style.cssText = "width:100%;min-height:100%;";
        container.appendChild(sandbox);
        this._renderMockScene(sandbox);
    }

    _renderMockScene(target) {
        // 1. Заметки дизайнера
        target.insertAdjacentHTML('beforeend', `
            <div class="design-notes-block">
                <div class="design-notes-title">✏️ ЗАМЕТКИ ДИЗАЙНЕРА</div>
                <div class="design-notes-content">Системные уведомления и подсказки для игрока.</div>
            </div>`);

        // 2. Память ИИ
        target.insertAdjacentHTML('beforeend', `
            <div class="ai-memory-block">
                <div class="ai-memory-header">🧠 ПАМЯТЬ ИИ <span class="ai-memory-stats">ACTIVE</span></div>
                <div class="ai-memory-content">
                    <div class="memory-item"><span class="memory-key">archetype:</span> <span class="memory-value">"Magus"</span></div>
                    <div class="memory-item"><span class="memory-key">willpower:</span> <span class="memory-value">85</span></div>
                </div>
            </div>`);

        // 3. Текст сцены
        target.insertAdjacentHTML('beforeend', `
            <div class="scene-text-block">
                Вы стоите перед алтарём в центре Храма. Воздух пропитан ароматом ладана. 
                Стены украшены символами, живыми в свете свечей.
            </div>`);

        // 4. Размышления
        target.insertAdjacentHTML('beforeend', `
            <div class="reflection-block">
                <div class="reflection-title">💭 ВНУТРЕННИЙ ГОЛОС</div>
                <div class="reflection-content">"Это место узнаёт меня. Границы истончаются..."</div>
            </div>`);

        // 5. Обновления за ход
        const tu = document.createElement('div');
        tu.id = 'turnUpdatesContainer';
        tu.innerHTML = `<div style="padding:12px;"><div style="font-weight:900;margin-bottom:6px;">РЕЗОНАНС ХОДА:</div><div style="font-size:0.9em;opacity:0.8;">Прилив сил. <span style="color:#d4af37">+5 Воля</span></div></div>`;
        target.appendChild(tu);

        // 6. Кнопки выбора
        target.insertAdjacentHTML('beforeend', `
            <div class="choices-container" style="margin-top:20px;">
                <button class="choice-btn">
                    <div style="font-weight:900;margin-bottom:4px;">Прикоснуться к фолианту</div>
                    <div style="font-size:0.75em;opacity:0.5;">СЛОЖНОСТЬ: 3/10 | ИНТЕЛЛЕКТ</div>
                </button>
                <button class="choice-btn selected">
                    <div style="font-weight:900;margin-bottom:4px;">Начать ритуал воззвания</div>
                    <div style="font-size:0.75em;">СЛОЖНОСТЬ: 8/10 | ВОЛЯ 70+</div>
                </button>
            </div>`);

        // 7. Игровые блоки
        const gi = document.createElement('div');
        gi.style.cssText = "display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:20px;";
        const p = document.createElement('div'); p.id = 'personalityBlockContainer';
        p.innerHTML = `<div class="section-header">ЛИЧНОСТЬ</div><div class="game-item-badge">Мудрец</div><div class="game-item-badge">Стоик</div>`;
        const inv = document.createElement('div'); inv.id = 'inventoryContainer';
        inv.innerHTML = `<div class="section-header">ИНВЕНТАРЬ</div><div class="game-item-badge">🗝️ Ключ</div><div class="game-item-badge">📜 Пергамент</div>`;
        gi.append(p, inv);
        target.appendChild(gi);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // FOOTER
    // ═══════════════════════════════════════════════════════════════════════

    _createFooter() {
        const f = document.createElement('div');
        f.style.cssText = "padding:15px;background:#111;border-top:1px solid #333;display:flex;justify-content:flex-end;gap:10px;";

        const cancel = document.createElement('button');
        cancel.textContent = "ОТМЕНИТЬ";
        cancel.style.cssText = "background:transparent;border:1px solid #666;color:#aaa;padding:8px 20px;cursor:pointer;border-radius:6px;font-size:0.9em;";
        cancel.onclick = () => { themeManagerPro.cancelChanges(); this.close(); };

        const save = document.createElement('button');
        save.textContent = "✓ СОХРАНИТЬ ТЕМУ";
        save.style.cssText = "background:#d4af37;border:none;color:#000;padding:8px 24px;font-weight:900;cursor:pointer;border-radius:6px;font-size:0.9em;letter-spacing:0.5px;";
        save.onclick = () => { themeManagerPro.saveChanges(); this.close(); };

        f.append(cancel, save);
        return f;
    }

    // ═══════════════════════════════════════════════════════════════════════
    // УТИЛИТЫ
    // ═══════════════════════════════════════════════════════════════════════

    _updateNav() {
        const u = document.getElementById('te-undo');
        const r = document.getElementById('te-redo');
        if (u) { u.disabled = this.historyIndex <= 0; u.style.opacity = u.disabled ? 0.4 : 1; }
        if (r) { r.disabled = this.historyIndex >= this.historyStack.length - 1; r.style.opacity = r.disabled ? 0.4 : 1; }
    }

    _export() {
        const json = themeManagerPro.exportTheme();
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = 'theme-pro.json'; a.click();
    }

    _import() {
        const i = document.createElement('input');
        i.type = 'file';
        i.onchange = e => {
            const r = new FileReader();
            r.onload = evt => {
                if (themeManagerPro.importTheme(evt.target.result)) {
                    themeManagerPro.startEditing();
                    this._pushHistory();
                    this._renderContent();
                }
            };
            r.readAsText(e.target.files[0]);
        };
        i.click();
    }
}

export const themeEditorPro = new ThemeEditorPro();