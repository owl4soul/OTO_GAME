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

        // ── Вкладки ──────────────────────────────────────────────────────────
        this.tabs = [
            { id: 'global',      icon: '🌐', label: 'Глобальные' },
            { id: 'typography',  icon: '🔤', label: 'Типографика' },
            { id: 'scene',       icon: '🎬', label: 'Сцена' },
            { id: 'gameItems',   icon: '🎮', label: 'Игровые блоки' },
            { id: 'turnUpdates', icon: '🔄', label: 'Ход' },
            { id: 'history',     icon: '📜', label: 'История' },
        ];

        // ── Метки полей ───────────────────────────────────────────────────────
        this.labels = {
            // Global
            icons: '🎨 Система иконок', set: 'Набор иконок', emojiFilter: 'CSS-фильтр для emoji',
            layout: '📐 Разметка',
            scrollbarColor: 'Цвет ползунка', scrollbarBg: 'Фон дорожки',
            selectionColor: 'Цвет выделения', selectionBg: 'Фон выделения',
            blockMargin: 'Отступ между блоками',
            // ДОБАВЛЕНО: поля для скроллбара
            width: 'Толщина',
            height: 'Высота (гориз.)',
            trackBg: 'Фон дорожки',
            trackBorderRadius: 'Скругление дорожки',
            thumbBg: 'Фон ползунка',
            thumbBorder: 'Граница ползунка',
            thumbBorderRadius: 'Скругление ползунка',
            thumbHoverBg: 'Фон (наведение)',
            thumbHoverBorder: 'Граница (наведение)',
            // Typography
            headers: '📰 Заголовки', body: '📝 Основной текст',
            ui: '🎛️ UI-элементы', monospace: '⌨️ Моноширинный',
            fontFamily: 'Шрифт', fontWeight: 'Насыщенность',
            fontSize: 'Размер', lineHeight: 'Высота строки',
            letterSpacing: 'Межбуквенный', textTransform: 'Регистр', color: 'Цвет текста',
            // Scene
            container: '📦 Контейнер', textBlock: '📄 Блок текста',
            aiMemory: '🧠 Память ИИ', choices: '🎯 Варианты выбора',
            designNotes: '📝 Заметки дизайнера', summary: '📋 Сводка',
            reflection: '💭 Внутренний голос', personality: '👤 Личность (мета)',
            typology: '🔖 Типология (мета)', additionalField: '➕ Доп. поля',
            btn: 'Кнопка выбора',
            // CSS-свойства
            background: 'Фон', border: 'Граница', borderLeft: 'Граница слева',
            borderRight: 'Граница справа', borderTop: 'Граница сверху',
            borderBottom: 'Граница снизу', borderColor: 'Цвет границы',
            borderRadius: 'Скругление', padding: 'Внутр. отступы',
            margin: 'Внешн. отступы', marginBottom: 'Отступ снизу',
            boxShadow: 'Тень', containerMargin: 'Отступы контейнера',
            // Цвета компонентов
            titleColor: 'Цвет заголовка', contentColor: 'Цвет содержимого',
            keyColor: 'Цвет ключей JSON', valueColor: 'Цвет значений JSON',
            hoverBg: 'Фон (наведение)', hoverBorder: 'Граница (наведение)',
            selectedBg: 'Фон (выбрана)', selectedBorder: 'Граница (выбрана)',
            selectedColor: 'Текст (выбрана)',
            titleFontFamily: 'Шрифт заголовка', contentFontFamily: 'Шрифт содержимого',
            titleFontSize: 'Размер заголовка', italic: 'Курсив',
            // Game Items
            header: '📌 Заголовок секции', badge: '🏷️ Бейдж',
            hoverTransform: 'Transform (наведение)', hoverShadow: 'Тень (наведение)',
            personality_gi: '👤 Личность', typology_gi: '🔖 Типология',
            organization: '🏛️ Организации', relations: '💑 Отношения',
            skill: '📜 Навыки', stat_buffs: '📊 Моды статов',
            bless: '✨ Благословения', curse: '☠️ Проклятия',
            buff_debuff: '📈 Баффы/Дебаффы', inventory: '🎒 Инвентарь', details: 'ℹ️ Детали',
            // Turn updates
            content: '📄 Содержимое',
            // History
            header_history: '🎯 Заголовок журнала', headerButtons: '🔘 Кнопки заголовка',
            hover: 'Стиль (наведение)', turn: '📝 Блок хода',
            turnSummary: '📋 Сводка хода', turnContent: '📄 Содержимое хода',
            accentColors: '🎨 Акцентные цвета',
            summaryColor: 'Цвет сводки', actionCountColor: 'Цвет счётчика',
            timestampColor: 'Цвет времени',
            success: 'Успех', failure: 'Провал', mixed: 'Смешанный', neutral: 'Нейтральный',
        };
    }

    // ═══════════════════════════════════════════════════════════════════════
    // КЛАССИФИКАЦИЯ ПОЛЕЙ (без изменений)
    // ═══════════════════════════════════════════════════════════════════════

    _isCompoundCssWithColor(key, value) {
        if (typeof value !== 'string') return false;
        const k = key.toLowerCase();
        const isCompound = ['border','borderleft','borderright','bordertop','borderbottom',
            'hoverborder','selectedborder','boxshadow','hovershadow',
            'thumbborder','thumbhoverborder'].includes(k);   // <-- ИЗМЕНЕНО: добавлены новые составные поля
        if (!isCompound) return false;
        return /#[0-9a-fA-F]{3,8}/.test(value) || /rgba?\(/.test(value) || /hsla?\(/.test(value);
    }

    _isPureColorField(key, value) {
        if (typeof value !== 'string') return false;
        if (this._isCompoundCssWithColor(key, value)) return false;
        const k = key.toLowerCase();
        const colorKw = ['color','background','bg'];
        const explicit = ['success','failure','mixed','neutral'];
        const hasKw = colorKw.some(kw => k.includes(kw));
        const isExpl = explicit.includes(key);
        if (!hasKw && !isExpl) return false;
        const v = value.trim();
        return v.startsWith('#') || v.startsWith('rgb') || v.startsWith('hsl') ||
            v.toLowerCase().includes('gradient') || v === 'transparent' ||
            v === 'inherit' || v === 'currentColor' ||
            (/^[a-zA-Z]+$/.test(v) && v.length < 20 && !v.includes(' '));
    }

    _isFontField(key) { return key.toLowerCase().includes('fontfamily'); }
    _isTextTransformField(key) { return key === 'textTransform'; }
    _isBooleanField(key, value) { return key === 'italic' || value === true || value === false; }

    // ═══════════════════════════════════════════════════════════════════════
    // LIFECYCLE (без изменений)
    // ═══════════════════════════════════════════════════════════════════════

    open() {
        if (document.getElementById('te-overlay')) return;
        themeManagerPro.startEditing();
        this._pushHistory();
        this._render();
        setTimeout(() => this._updatePreview(), 50);
    }

    close() {
        const el = document.getElementById('te-overlay');
        if (el) el.remove();
        themeManagerPro.endEditing();
    }

    // ═══════════════════════════════════════════════════════════════════════
    // ИСТОРИЯ (без изменений)
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
            this._renderPanelContent();
            this._updateNav();
            this._updatePreview();
        }
    }

    _redo() {
        if (this.historyIndex < this.historyStack.length - 1) {
            this.historyIndex++;
            themeManagerPro.setEditingTheme(JSON.parse(this.historyStack[this.historyIndex]));
            this._renderPanelContent();
            this._updateNav();
            this._updatePreview();
        }
    }

    // ═══════════════════════════════════════════════════════════════════════
    // РЕНДЕР ОБОЛОЧКИ (ИЗМЕНЕНО: вертикальная компоновка + разделитель)
    // ═══════════════════════════════════════════════════════════════════════

    _render() {
        const overlay = document.createElement('div');
        overlay.id = 'te-overlay';
        overlay.className = 'te-overlay'; // вместо инлайн-стилей

        const win = document.createElement('div');
        win.className = 'te-window'; // вместо инлайн-стилей

        win.appendChild(this._createTopBar());
        win.appendChild(this._createTabBar());

        // Вертикальный контейнер
        const mainArea = document.createElement('div');
        mainArea.className = 'te-main-area';

        // Панель настроек
        const settingsPanel = this._createSettingsPanel();
        settingsPanel.classList.add('te-settings-panel');

        // Разделитель
        const splitter = document.createElement('div');
        splitter.className = 'te-splitter';

        // Панель предпросмотра
        const previewPanel = this._createPreviewPanel();
        previewPanel.classList.add('te-preview-panel');

        mainArea.appendChild(settingsPanel);
        mainArea.appendChild(splitter);
        mainArea.appendChild(previewPanel);

        win.appendChild(mainArea);
        win.appendChild(this._createFooter());
        overlay.appendChild(win);
        document.body.appendChild(overlay);

        this._initSplitter(settingsPanel, previewPanel, splitter);

        this._updateNav();
        setTimeout(() => { this._renderPanelContent(); this._updatePreview(); }, 0);
    }

    // Новый метод: инициализация перетаскивания разделителя (с поддержкой touch)
    _initSplitter(topPanel, bottomPanel, splitter) {
        let startY, startTopHeight;

        const onMove = (clientY) => {
            const deltaY = clientY - startY;
            const newTopHeight = startTopHeight + deltaY;
            const containerHeight = splitter.parentElement.clientHeight;
            if (newTopHeight < 100 || newTopHeight > containerHeight - 50) return;
            topPanel.style.flex = `0 0 ${newTopHeight}px`;
        };

        const onMouseMove = (e) => {
            e.preventDefault();
            onMove(e.clientY);
        };

        const onTouchMove = (e) => {
            e.preventDefault();
            if (e.touches.length) onMove(e.touches[0].clientY);
        };

        const onUp = () => {
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onUp);
            document.removeEventListener('touchmove', onTouchMove);
            document.removeEventListener('touchend', onUp);
            document.body.style.cursor = '';
        };

        splitter.addEventListener('mousedown', (e) => {
            e.preventDefault();
            startY = e.clientY;
            startTopHeight = topPanel.offsetHeight;
            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onUp);
            document.body.style.cursor = 'ns-resize';
        });

        splitter.addEventListener('touchstart', (e) => {
            e.preventDefault();
            startY = e.touches[0].clientY;
            startTopHeight = topPanel.offsetHeight;
            document.addEventListener('touchmove', onTouchMove, { passive: false });
            document.addEventListener('touchend', onUp);
        });
    }

    // ── Верхняя панель: заголовок + пресет + undo/redo/export/import ─────────
    // (изменено: инлайн-стили заменены на классы)
_createTopBar() {
    const bar = document.createElement('div');
    bar.className = 'te-topbar';

    const left = document.createElement('div');
    left.className = 'te-topbar-left';
    left.innerHTML = `<span class="te-logo">THEME EDITOR PRO</span>`;

    const presetSel = document.createElement('select');
    presetSel.className = 'te-preset-select';
    themeManagerPro.getPresets().forEach(p => {
        const o = document.createElement('option');
        o.value = p.key; o.text = p.name;
        if (p.isCurrent) o.selected = true;
        presetSel.appendChild(o);
    });
    presetSel.onchange = e => {
        if (confirm('Загрузить пресет? Несохранённые изменения будут потеряны.')) {
            themeManagerPro.loadPreset(e.target.value);
            themeManagerPro.startEditing();
            this._pushHistory();
            this._renderPanelContent();
        }
    };
    left.appendChild(presetSel);
    bar.appendChild(left);

    const right = document.createElement('div');
    right.className = 'te-topbar-right';

    // ИЗМЕНЕНО: теперь только иконки и title
    const undo = document.createElement('button');
    undo.id = 'te-undo';
    undo.innerHTML = '↩';                // иконка
    undo.className = 'te-btn-icon';
    undo.title = 'Отменить (Ctrl+Z)';    // подсказка
    undo.onclick = () => this._undo();

    const redo = document.createElement('button');
    redo.id = 'te-redo';
    redo.innerHTML = '↪';                // иконка
    redo.className = 'te-btn-icon';
    redo.title = 'Повторить (Ctrl+Y)';
    redo.onclick = () => this._redo();

    const sep = document.createElement('span');
    sep.className = 'te-separator';

    const imp = document.createElement('button');
    imp.innerHTML = '📥';                // можно оставить текст или тоже иконку
    imp.className = 'te-btn-icon';
    imp.title = 'Импорт';
    imp.onclick = () => this._import();

    const exp = document.createElement('button');
    exp.innerHTML = '📤';
    exp.className = 'te-btn-icon';
    exp.title = 'Экспорт';
    exp.onclick = () => this._export();

    right.append(undo, redo, sep, imp, exp);
    bar.appendChild(right);
    return bar;
}

    // ── Строка вкладок ───────────────────────────────────────────────────────
    // (изменено: инлайн-стили заменены на классы)
    _createTabBar() {
        const bar = document.createElement('div');
        bar.id = 'te-tabbar';
        bar.className = 'te-tabbar';

        this.tabs.forEach(t => {
            const tab = document.createElement('div');
            tab.className = 'te-tab' + (t.id === this.activeTab ? ' active' : '');
            tab.dataset.tabId = t.id;
            tab.innerHTML = `<div class="te-tab-icon">${t.icon}</div><div class="te-tab-label">${t.label.toUpperCase()}</div>`;
            tab.onclick = () => {
                this.activeTab = t.id;
                this._updateTabBar();
                this._renderPanelContent();
            };
            bar.appendChild(tab);
        });

        return bar;
    }

    _tabStyle(active) {
        // больше не используется, оставлен для совместимости, если вызывается из других мест
        return '';
    }

    _updateTabBar() {
        const bar = document.getElementById('te-tabbar');
        if (!bar) return;
        Array.from(bar.children).forEach(tab => {
            const active = tab.dataset.tabId === this.activeTab;
            tab.className = 'te-tab' + (active ? ' active' : '');
            // обновляем содержимое (иконка и текст не меняются, но если нужно - можно обновить)
        });
    }

    // ── Панель настроек ──────────────────────────────────────────────────────
    // (изменено: убран инлайн-стиль ширины, добавлены классы)
    _createSettingsPanel() {
        const panel = document.createElement('div');
        panel.id = 'te-settings-panel'; // для возможного использования

        const titleBar = document.createElement('div');
        titleBar.id = 'te-section-title';
        titleBar.className = 'te-section-title';
        panel.appendChild(titleBar);

        const scrollArea = document.createElement('div');
        scrollArea.id = 'te-content';
        scrollArea.className = 'te-content';
        panel.appendChild(scrollArea);

        return panel;
    }

    // ── Панель превью ────────────────────────────────────────────────────────
    // (изменено: инлайн-стили заменены на классы)
    _createPreviewPanel() {
        const wrap = document.createElement('div');
        wrap.id = 'te-preview-panel';

        const hdr = document.createElement('div');
        hdr.className = 'te-preview-header';
        hdr.innerHTML = `<span>👁 ЖИВОЙ ПРЕДПРОСМОТР</span><span>RENDER: PRO V4</span>`;

        const body = document.createElement('div');
        body.id = 'te-preview-container';
        body.className = 'te-preview-container';

        wrap.append(hdr, body);
        return wrap;
    }

    // ── Футер ────────────────────────────────────────────────────────────────
    // (изменено: инлайн-стили заменены на классы)
    _createFooter() {
        const f = document.createElement('div');
        f.className = 'te-footer';

        const cancel = document.createElement('button');
        cancel.textContent = 'Отменить изменения';
        cancel.className = 'te-footer-btn';
        cancel.onclick = () => { themeManagerPro.cancelChanges(); this.close(); };

        const save = document.createElement('button');
        save.textContent = '✓ Сохранить тему';
        save.className = 'te-footer-btn primary';
        save.onclick = () => { themeManagerPro.saveChanges(); this.close(); };

        f.append(cancel, save);
        return f;
    }

    // ═══════════════════════════════════════════════════════════════════════
    // РЕНДЕР СОДЕРЖИМОГО ПАНЕЛИ (БЕЗ ИЗМЕНЕНИЙ)
    // Все методы ниже остаются точно такими же, как в вашем исходном коде.
    // ═══════════════════════════════════════════════════════════════════════

    _renderPanelContent() {
        const content = document.getElementById('te-content');
        const titleBar = document.getElementById('te-section-title');
        if (!content) return;

        content.innerHTML = '';

        const t = this.tabs.find(t => t.id === this.activeTab);
        if (titleBar && t) {
            titleBar.innerHTML = `<span style="color:#d4af37;font-weight:700;font-size:0.85em;">${t.icon} ${t.label.toUpperCase()}</span>`;
        }

        const theme = themeManagerPro.getCurrentTheme();
        const sectionData = theme[this.activeTab];

        if (!sectionData) {
            content.innerHTML = '<div style="color:#444;text-align:center;padding:40px;">Секция пуста</div>';
            return;
        }

        this._renderObject(content, sectionData, [this.activeTab]);
    }

    _renderObject(container, obj, path) {
        Object.entries(obj).forEach(([key, val]) => {
            const curPath = [...path, key];

            if (key === 'icons' && path[0] === 'global') {
                this._renderIconBlock(container, val, curPath);
                return;
            }

            if (typeof val === 'object' && val !== null && !Array.isArray(val)) {
                this._renderSectionBlock(container, key, val, curPath, path);
            } else {
                // Одиночное поле на верхнем уровне (не обёрнуто в секцию)
                this._renderRow(container, key, val, curPath);
            }
        });
    }

    _renderSectionBlock(container, key, obj, path, parentPath) {
        const block = document.createElement('div');
        block.style.cssText = "border-bottom:1px solid #1a1a1a;";

        const hdr = document.createElement('div');
        hdr.style.cssText = "padding:5px 14px;background:#161616;cursor:pointer;display:flex;justify-content:space-between;align-items:center;user-select:none;border-top:1px solid #1e1e1e;";
        const label = this._getLabel(key, parentPath);
        hdr.innerHTML = `
            <span style="color:#d4af37;font-size:0.78em;font-weight:700;letter-spacing:0.8px;">${label.toUpperCase()}</span>
            <span class="te-toggle" style="color:#555;font-size:0.65em;">▾</span>`;
        block.appendChild(hdr);

        const body = document.createElement('div');
        body.style.cssText = "background:#111;";
        this._renderObjectRows(body, obj, path);
        block.appendChild(body);

        let collapsed = false;
        hdr.onclick = () => {
            collapsed = !collapsed;
            body.style.display = collapsed ? 'none' : '';
            hdr.querySelector('.te-toggle').textContent = collapsed ? '▸' : '▾';
        };

        container.appendChild(block);
    }

    _renderObjectRows(container, obj, path) {
        Object.entries(obj).forEach(([key, val], idx) => {
            const curPath = [...path, key];

            if (typeof val === 'object' && val !== null && !Array.isArray(val)) {
                const subHdr = document.createElement('div');
                subHdr.style.cssText = "padding:3px 14px 3px 20px;background:#141414;border-top:1px solid #1e1e1e;";
                subHdr.innerHTML = `<span style="color:#888;font-size:0.72em;font-weight:700;letter-spacing:0.5px;">${this._getLabel(key, path).toUpperCase()}</span>`;
                container.appendChild(subHdr);

                this._renderObjectRows(container, val, curPath);
            } else {
                this._renderRow(container, key, val, curPath, idx);
            }
        });
    }

    _renderRow(container, key, val, path, idx = 0) {
        if (typeof val === 'object' && val !== null) return;

        const row = document.createElement('div');
        row.style.cssText = `display:flex;align-items:center;min-height:28px;
            padding:3px 10px 3px 14px;gap:8px;
            border-top:1px solid ${idx === 0 ? 'transparent' : '#1a1a1a'};
            background:${idx % 2 === 0 ? '#111' : '#121212'};`;

        const lbl = document.createElement('div');
        lbl.textContent = this._getLabel(key, path.slice(0, -1));
        lbl.title = key;
        lbl.style.cssText = "color:#777;font-size:0.72em;font-weight:600;min-width:130px;max-width:130px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;flex-shrink:0;";

        const inputWrap = document.createElement('div');
        inputWrap.style.cssText = "flex:1;display:flex;align-items:center;min-width:0;";

        let widget;
        if (this._isFontField(key)) {
            this._renderFontRow(container, key, val, path, idx);
            return;
        } else if (this._isTextTransformField(key)) {
            widget = this._makeSelect(val, path, [
                ['none','Без изм.'],['uppercase','ЗАГЛАВНЫЕ'],
                ['lowercase','строчные'],['capitalize','Каждое Слово'],
            ]);
        } else if (this._isBooleanField(key, val)) {
            widget = this._makeCheckbox(val, path);
        } else if (this._isCompoundCssWithColor(key, val)) {
            widget = this._makeCompoundColorInput(val, path);
        } else if (this._isPureColorField(key, val)) {
            widget = this._makeColorInput(val, path);
        } else {
            widget = this._makeTextInput(val, path);
        }

        inputWrap.appendChild(widget);
        row.append(lbl, inputWrap);
        container.appendChild(row);
    }

    _renderFontRow(container, key, val, path, rowIdx = 0) {
        const theme = themeManagerPro.getCurrentTheme();
        const parentObj = this._getAtPath(theme, path.slice(0, -1)) || {};

        const fontFamily = val || "'Nunito Sans', sans-serif";
        const fontSize   = parentObj.fontSize   || '14px';
        const fontWeight = parentObj.fontWeight  || '400';
        const lineHeight = parentObj.lineHeight  || '1.5';
        const letterSpacing = parentObj.letterSpacing || '0px';
        const textTransform = parentObj.textTransform || 'none';
        const isItalic   = parentObj.italic === true;
        const textColor  = parentObj.color || '#cccccc';

        const testRow = document.createElement('div');
        testRow.style.cssText = `padding:4px 14px 4px 14px;background:#0d0d0d;border-top:1px solid #1e1e1e;`;

        const testEl = document.createElement('div');
        testEl.textContent = 'Тест кириллицы: 1, 2, 3';
        testEl.style.cssText = `
            font-family:${fontFamily};
            font-size:${fontSize};
            font-weight:${fontWeight};
            line-height:${lineHeight};
            letter-spacing:${letterSpacing};
            text-transform:${textTransform};
            font-style:${isItalic ? 'italic' : 'normal'};
            color:${textColor};
            padding:3px 0;
            overflow:hidden;white-space:nowrap;text-overflow:ellipsis;`;
        testEl.id = `te-font-test-${path.join('-')}`;
        testRow.appendChild(testEl);
        container.appendChild(testRow);

        const row = document.createElement('div');
        row.style.cssText = `display:flex;align-items:center;min-height:28px;
            padding:3px 10px 3px 14px;gap:8px;
            border-top:1px solid #1a1a1a;
            background:${rowIdx % 2 === 0 ? '#111' : '#121212'};`;

        const lbl = document.createElement('div');
        lbl.textContent = this._getLabel(key, path.slice(0, -1));
        lbl.title = key;
        lbl.style.cssText = "color:#777;font-size:0.72em;font-weight:600;min-width:130px;max-width:130px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;flex-shrink:0;";

        const sel = document.createElement('select');
        sel.style.cssText = "flex:1;background:#0a0a0a;border:1px solid #2a2a2a;color:#d4af37;padding:3px 6px;border-radius:4px;font-size:0.8em;outline:none;min-width:0;";

        const cleanVal = (val || '').replace(/['"]/g, '').split(',')[0].trim();
        const monoFonts = ['Roboto Mono','Fira Code','Source Code Pro','JetBrains Mono','VT323','Press Start 2P'];
        const serifFonts = ['Cinzel','Lora','Playfair Display','Merriweather','Cormorant'];

        Object.keys(FONT_LIBRARY).forEach(font => {
            const opt = document.createElement('option');
            const suffix = monoFonts.includes(font) ? ', monospace' : serifFonts.includes(font) ? ', serif' : ', sans-serif';
            opt.value = `'${font}'${suffix}`;
            opt.text = font;
            if (cleanVal === font) opt.selected = true;
            sel.appendChild(opt);
        });

        sel.onchange = e => {
            themeManagerPro.updateSetting(path, e.target.value);
            this._pushHistory();
            const testDiv = document.getElementById(`te-font-test-${path.join('-')}`);
            if (testDiv) testDiv.style.fontFamily = e.target.value;
        };

        row.append(lbl, sel);
        container.appendChild(row);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // ВИДЖЕТЫ ВВОДА — КОМПАКТНЫЕ (без изменений)
    // ═══════════════════════════════════════════════════════════════════════

    _makeColorInput(val, path) {
        const wrap = document.createElement('div');
        wrap.style.cssText = "display:flex;gap:5px;width:100%;align-items:center;";

        const preview = document.createElement('div');
        preview.style.cssText = `width:22px;height:22px;flex-shrink:0;border:1px solid #333;
            background:${val || 'transparent'};cursor:pointer;border-radius:4px;`;

        const input = document.createElement('input');
        input.type = 'text';
        input.value = val || '';
        input.style.cssText = "flex:1;background:#0a0a0a;border:1px solid #222;color:#ddd;padding:2px 6px;border-radius:4px;font-size:0.78em;outline:none;font-family:monospace;min-width:0;";

        const apply = (newVal) => {
            input.value = newVal;
            preview.style.background = newVal;
            themeManagerPro.updateSetting(path, newVal);
            this._pushHistory();
        };

        preview.onclick = () => {
            this.gradientPicker.open(apply, input.value || '#000000');
        };

        input.oninput = e => {
            preview.style.background = e.target.value;
            themeManagerPro.updateSetting(path, e.target.value, false);
            this._updatePreview();
        };
        input.onchange = () => this._pushHistory();

        wrap.append(preview, input);
        return wrap;
    }

    _makeCompoundColorInput(val, path) {
        const wrap = document.createElement('div');
        wrap.style.cssText = "display:flex;gap:5px;width:100%;align-items:center;";

        const color = this._extractColorFromCss(val);
        const preview = document.createElement('div');
        preview.style.cssText = `width:22px;height:22px;flex-shrink:0;border:1px solid #333;
            background:${color || '#333'};cursor:pointer;border-radius:4px;position:relative;`;
        preview.title = 'Изменить цвет (размер/стиль сохранятся)';
        preview.innerHTML = `<span style="position:absolute;bottom:-1px;right:-1px;font-size:8px;line-height:1;">✏</span>`;

        const input = document.createElement('input');
        input.type = 'text';
        input.value = val || '';
        input.style.cssText = "flex:1;background:#0a0a0a;border:1px solid #222;color:#ddd;padding:2px 6px;border-radius:4px;font-size:0.78em;outline:none;font-family:monospace;min-width:0;";
        input.placeholder = 'напр. 4px solid #d4af37';

        const refreshPreview = v => {
            const c = this._extractColorFromCss(v);
            preview.style.background = c || '#333';
        };

        preview.onclick = () => {
            const cur = this._extractColorFromCss(input.value) || '#ffffff';
            this.gradientPicker.open(newColor => {
                const newVal = this._replaceColorInCss(input.value, newColor);
                input.value = newVal;
                refreshPreview(newVal);
                themeManagerPro.updateSetting(path, newVal);
                this._pushHistory();
            }, cur);
        };

        input.oninput = e => {
            refreshPreview(e.target.value);
            themeManagerPro.updateSetting(path, e.target.value, false);
            this._updatePreview();
        };
        input.onchange = () => this._pushHistory();

        wrap.append(preview, input);
        return wrap;
    }

    _makeTextInput(val, path) {
        const input = document.createElement('input');
        input.type = 'text';
        input.value = val != null ? String(val) : '';
        input.style.cssText = "flex:1;width:100%;background:#0a0a0a;border:1px solid #222;color:#ddd;padding:2px 6px;border-radius:4px;font-size:0.78em;outline:none;";
        input.onfocus = () => input.style.borderColor = '#d4af3766';
        input.onblur = () => input.style.borderColor = '#222';
        input.oninput = e => { themeManagerPro.updateSetting(path, e.target.value, false); this._updatePreview(); };
        input.onchange = e => { themeManagerPro.updateSetting(path, e.target.value); this._pushHistory(); };
        return input;
    }

    _makeSelect(val, path, options) {
        const sel = document.createElement('select');
        sel.style.cssText = "flex:1;width:100%;background:#0a0a0a;border:1px solid #222;color:#d4af37;padding:2px 4px;border-radius:4px;font-size:0.78em;outline:none;";
        options.forEach(([v, l]) => {
            const o = document.createElement('option');
            o.value = v; o.text = l;
            if (val === v) o.selected = true;
            sel.appendChild(o);
        });
        sel.onchange = e => { themeManagerPro.updateSetting(path, e.target.value); this._pushHistory(); };
        return sel;
    }

    _makeCheckbox(val, path) {
        const wrap = document.createElement('div');
        wrap.style.cssText = "display:flex;align-items:center;gap:6px;";
        const cb = document.createElement('input');
        cb.type = 'checkbox';
        cb.checked = val === true || val === 'true';
        cb.style.cssText = "width:14px;height:14px;cursor:pointer;accent-color:#d4af37;";
        const lbl = document.createElement('span');
        lbl.textContent = cb.checked ? '✓ Вкл' : '✗ Выкл';
        lbl.style.cssText = "color:#666;font-size:0.75em;";
        cb.onchange = e => {
            lbl.textContent = e.target.checked ? '✓ Вкл' : '✗ Выкл';
            themeManagerPro.updateSetting(path, e.target.checked);
            this._pushHistory();
        };
        wrap.append(cb, lbl);
        return wrap;
    }

    // ═══════════════════════════════════════════════════════════════════════
    // СПЕЦИАЛЬНЫЙ БЛОК ИКОНОК (без изменений)
    // ═══════════════════════════════════════════════════════════════════════

    _renderIconBlock(container, val, path) {
        const block = document.createElement('div');
        block.style.cssText = "border-bottom:1px solid #1a1a1a;";

        const hdr = document.createElement('div');
        hdr.style.cssText = "padding:5px 14px;background:#161616;border-top:1px solid #1e1e1e;";
        hdr.innerHTML = `<span style="color:#d4af37;font-size:0.78em;font-weight:700;letter-spacing:0.8px;">🎨 СИСТЕМА ИКОНОК</span>`;
        block.appendChild(hdr);

        const r1 = document.createElement('div');
        r1.style.cssText = "display:flex;align-items:center;padding:4px 10px 4px 14px;gap:8px;background:#111;border-top:1px solid #1a1a1a;";
        const l1 = document.createElement('div');
        l1.textContent = 'Набор иконок';
        l1.style.cssText = "color:#777;font-size:0.72em;font-weight:600;min-width:130px;flex-shrink:0;";
        const sel = document.createElement('select');
        sel.style.cssText = "flex:1;background:#0a0a0a;border:1px solid #222;color:#d4af37;padding:2px 4px;border-radius:4px;font-size:0.78em;outline:none;";
        [['fa','FontAwesome'],['emoji','Emoji']].forEach(([v,l]) => {
            const o = document.createElement('option'); o.value = v; o.text = l;
            if (val.set === v) o.selected = true;
            sel.appendChild(o);
        });
        sel.onchange = e => { themeManagerPro.updateSetting([...path, 'set'], e.target.value); this._pushHistory(); };
        r1.append(l1, sel);
        block.appendChild(r1);

        const r2 = document.createElement('div');
        r2.style.cssText = "display:flex;align-items:center;padding:4px 10px 4px 14px;gap:8px;background:#121212;border-top:1px solid #1a1a1a;";
        const l2 = document.createElement('div');
        l2.textContent = 'CSS-фильтр emoji';
        l2.style.cssText = "color:#777;font-size:0.72em;font-weight:600;min-width:130px;flex-shrink:0;";
        const inp = document.createElement('input');
        inp.type = 'text'; inp.value = val.emojiFilter || 'none';
        inp.style.cssText = "flex:1;background:#0a0a0a;border:1px solid #222;color:#ddd;padding:2px 6px;border-radius:4px;font-size:0.78em;outline:none;font-family:monospace;";
        inp.onchange = e => { themeManagerPro.updateSetting([...path, 'emojiFilter'], e.target.value); this._pushHistory(); };
        r2.append(l2, inp);
        block.appendChild(r2);

        container.appendChild(block);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // УТИЛИТЫ (без изменений)
    // ═══════════════════════════════════════════════════════════════════════

    _getLabel(key, path = []) {
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

    _getAtPath(obj, pathArr) {
        let cur = obj;
        for (const key of pathArr) {
            if (cur == null || typeof cur !== 'object') return undefined;
            cur = cur[key];
        }
        return cur;
    }

    _extractColorFromCss(cssValue) {
        if (!cssValue) return null;
        const rgbaM = cssValue.match(/rgba?\([^)]+\)/);
        if (rgbaM) return rgbaM[0];
        const hslaM = cssValue.match(/hsla?\([^)]+\)/);
        if (hslaM) return hslaM[0];
        const hexM = cssValue.match(/#[0-9a-fA-F]{3,8}\b/);
        if (hexM) return hexM[0];
        return null;
    }

    _replaceColorInCss(cssValue, newColor) {
        if (!cssValue) return newColor;
        if (/rgba?\([^)]+\)/.test(cssValue)) return cssValue.replace(/rgba?\([^)]+\)/, newColor);
        if (/hsla?\([^)]+\)/.test(cssValue)) return cssValue.replace(/hsla?\([^)]+\)/, newColor);
        if (/#[0-9a-fA-F]{3,8}\b/.test(cssValue)) return cssValue.replace(/#[0-9a-fA-F]{3,8}\b/, newColor);
        const parts = cssValue.trim().split(/\s+/);
        parts[parts.length - 1] = newColor;
        return parts.join(' ');
    }

    _updateNav() {
        const u = document.getElementById('te-undo');
        const r = document.getElementById('te-redo');
        if (u) { u.disabled = this.historyIndex <= 0; u.style.opacity = u.disabled ? 0.35 : 1; }
        if (r) { r.disabled = this.historyIndex >= this.historyStack.length - 1; r.style.opacity = r.disabled ? 0.35 : 1; }
    }

    // ═══════════════════════════════════════════════════════════════════════
    // ЖИВОЙ ПРЕДПРОСМОТР (без изменений)
    // ═══════════════════════════════════════════════════════════════════════

    _updatePreview() {
        const container = document.getElementById('te-preview-container');
        if (!container) return;
        container.innerHTML = '';
        const sandbox = document.createElement('div');
        sandbox.id = 'sceneArea';
        sandbox.style.cssText = "width:100%;";
        container.appendChild(sandbox);
        this._renderMockScene(sandbox);
    }

    _renderMockScene(target) {
        target.insertAdjacentHTML('beforeend', `
            <div class="design-notes-block" style="margin-bottom:8px;">
                <div class="design-notes-title">✏️ ЗАМЕТКИ ДИЗАЙНЕРА</div>
                <div class="design-notes-content">Системные уведомления и подсказки для игрока.</div>
            </div>
            <div class="ai-memory-block" style="margin-bottom:8px;">
                <div class="ai-memory-header">🧠 ПАМЯТЬ ИИ <span class="ai-memory-stats">ACTIVE</span></div>
                <div class="ai-memory-content">
                    <div class="memory-item"><span class="memory-key">archetype:</span> <span class="memory-value">"Magus"</span></div>
                    <div class="memory-item"><span class="memory-key">willpower:</span> <span class="memory-value">85</span></div>
                </div>
            </div>
            <div class="scene-text-block" style="margin-bottom:8px;">
                Вы стоите перед алтарём. Воздух пропитан ароматом ладана. Стены украшены живыми символами.
            </div>
            <div class="reflection-block" style="margin-bottom:8px;">
                <div class="reflection-title">💭 ВНУТРЕННИЙ ГОЛОС</div>
                <div class="reflection-content">"Это место узнаёт меня..."</div>
            </div>
            <div class="summary-block" style="margin-bottom:8px;">
                <div class="summary-title">📋 СВОДКА</div>
                <div class="summary-content">Ключевые события хода: обнаружен артефакт.</div>
            </div>`);

        const tu = document.createElement('div');
        tu.id = 'turnUpdatesContainer';
        tu.style.marginBottom = '8px';
        tu.innerHTML = `<div style="padding:10px;"><b>РЕЗОНАНС ХОДА:</b><br><span style="font-size:0.9em;opacity:0.8;">Прилив сил. <span style="color:#d4af37">+5 Воля</span></span></div>`;
        target.appendChild(tu);

        target.insertAdjacentHTML('beforeend', `
            <div class="choices-container" style="margin-bottom:8px;">
                <button class="choice-btn" style="display:block;width:100%;margin-bottom:4px;">Прикоснуться к фолианту</button>
                <button class="choice-btn selected" style="display:block;width:100%;">Начать ритуал воззвания ★</button>
            </div>`);

        const gi = document.createElement('div');
        gi.style.cssText = "display:grid;grid-template-columns:1fr 1fr;gap:8px;";
        const p = document.createElement('div'); p.id = 'personalityBlockContainer';
        p.innerHTML = `<div class="section-header">ЛИЧНОСТЬ</div><div class="game-item-badge">Мудрец</div><div class="game-item-badge">Стоик</div>`;
        const inv = document.createElement('div'); inv.id = 'inventoryContainer';
        inv.innerHTML = `<div class="section-header">ИНВЕНТАРЬ</div><div class="game-item-badge">🗝️ Ключ</div><div class="game-item-badge">📜 Пергамент</div>`;
        gi.append(p, inv);
        target.appendChild(gi);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // ИМПОРТ / ЭКСПОРТ (без изменений)
    // ═══════════════════════════════════════════════════════════════════════

    _export() {
        const json = themeManagerPro.exportTheme();
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = 'theme-pro.json'; a.click();
        URL.revokeObjectURL(url);
    }

    _import() {
        const i = document.createElement('input');
        i.type = 'file'; i.accept = '.json';
        i.onchange = e => {
            const r = new FileReader();
            r.onload = evt => {
                if (themeManagerPro.importTheme(evt.target.result)) {
                    themeManagerPro.startEditing();
                    this._pushHistory();
                    this._renderPanelContent();
                }
            };
            r.readAsText(e.target.files[0]);
        };
        i.click();
    }
}

export const themeEditorPro = new ThemeEditorPro();