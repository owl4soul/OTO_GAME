// js/gradient-picker.js
'use strict';

/**
 * ПРОФЕССИОНАЛЬНЫЙ КОМПОНЕНТ ВЫБОРА ЦВЕТА И ГРАДИЕНТА
 *
 * Режимы:
 * - solid  : полноценный ColorPicker (сплошной цвет)
 * - gradient: GradientPicker с произвольным числом остановок,
 *             каждая из которых редактируется через тот же мощный ColorPicker.
 *
 * Публичный API:
 *   open(callback, initialValue) – открывает модальное окно редактора.
 *     callback получает строку CSS (rgba() или gradient(...)).
 */

export class GradientPicker {
    constructor() {
        this.callback = null;
        this.modal = null;

        // Общие данные
        this.mode = 'solid';            // 'solid' | 'gradient'

        // Параметры градиента
        this.gradientType = 'linear';
        this.angle = 135;
        this.radialShape = 'circle';
        this.radialPosition = 'center';

        // Цветовые остановки
        this.colorStops = [
            { color: '#2a220a', alpha: 1, position: 0 },
            { color: '#1a1805', alpha: 1, position: 100 }
        ];
        this.selectedStopIndex = 0;
        this.isDragging = false;

        // История цветов (общая для всех режимов)
        this.history = this._loadHistory();

        // Предустановленные палитры
        this.palettes = {
            'Базовые': [
                '#000000', '#ffffff', '#ff0000', '#00ff00', '#0000ff',
                '#ffff00', '#ff00ff', '#00ffff', '#808080', '#c0c0c0'
            ],
            'Материал': [
                '#f44336', '#e91e63', '#9c27b0', '#673ab7', '#3f51b5',
                '#2196f3', '#03a9f4', '#00bcd4', '#009688', '#4caf50',
                '#8bc34a', '#cddc39', '#ffeb3b', '#ffc107', '#ff9800',
                '#ff5722', '#795548', '#9e9e9e', '#607d8b', '#000000'
            ],
            'Пастель': [
                '#ffb3ba', '#ffdfba', '#ffffba', '#baffc9', '#bae1ff',
                '#e8d5b7', '#ffd1dc', '#d4a5a5', '#ffabab', '#ffc3a0'
            ],
            'Темные': [
                '#0a0a0a', '#1a1a1a', '#2a2a2a', '#3a3a3a', '#4a4a4a',
                '#1a0a0a', '#0a1a0a', '#0a0a1a', '#1a1a0a', '#0a1a1a'
            ]
        };
    }

    // -------------------------------------------------------------------------
    // Публичный API
    // -------------------------------------------------------------------------
    open(onSelect, initialValue) {
        this.callback = onSelect;
        this._parseInitialValue(initialValue);
        this._renderMain();
    }

    // -------------------------------------------------------------------------
    // Парсинг входных данных (без изменений)
    // -------------------------------------------------------------------------
    _parseInitialValue(value) {
        if (!value) {
            this.mode = 'solid';
            this.colorStops = [{ color: '#ffffff', alpha: 1, position: 50 }];
            return;
        }

        if (value.includes('gradient')) {
            this.mode = 'gradient';
            this._parseGradient(value);
        } else {
            this.mode = 'solid';
            const parsed = this._parseColor(value);
            this.colorStops = [{
                color: parsed.hex,
                alpha: parsed.alpha,
                position: 50
            }];
        }
    }

    _parseGradient(gradient) {
        const linearMatch = gradient.match(/linear-gradient\((\d+)deg,\s*(.+)\)/);
        if (linearMatch) {
            this.gradientType = 'linear';
            this.angle = parseInt(linearMatch[1]);
            this._parseColorStops(linearMatch[2]);
            return;
        }

        const radialMatch = gradient.match(/radial-gradient\((.*),\s*(.+)\)/);
        if (radialMatch) {
            this.gradientType = 'radial';
            this._parseColorStops(radialMatch[2]);
            return;
        }

        this.mode = 'solid';
        const parsed = this._parseColor(gradient);
        this.colorStops = [{ color: parsed.hex, alpha: parsed.alpha, position: 50 }];
    }

    _parseColorStops(stopsString) {
        const stops = stopsString.split(',').map(s => s.trim());
        this.colorStops = [];

        stops.forEach(stop => {
            const parts = stop.match(/(.+?)\s+(\d+)%/);
            if (parts) {
                const colorStr = parts[1].trim();
                const position = parseInt(parts[2]);
                const color = this._parseColor(colorStr);
                this.colorStops.push({
                    color: color.hex,
                    alpha: color.alpha,
                    position: position
                });
            } else {
                const color = this._parseColor(stop);
                this.colorStops.push({
                    color: color.hex,
                    alpha: color.alpha,
                    position: 0
                });
            }
        });

        if (this.colorStops.length > 0 && this.colorStops[0].position === 0 &&
            this.colorStops[this.colorStops.length - 1].position === 0) {
            this.colorStops.forEach((stop, i) => {
                stop.position = Math.round((i / (this.colorStops.length - 1)) * 100);
            });
        }

        this.selectedStopIndex = 0;
    }

    _parseColor(colorStr) {
        colorStr = colorStr.trim();

        const rgbaMatch = colorStr.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
        if (rgbaMatch) {
            const r = parseInt(rgbaMatch[1]);
            const g = parseInt(rgbaMatch[2]);
            const b = parseInt(rgbaMatch[3]);
            const a = rgbaMatch[4] ? parseFloat(rgbaMatch[4]) : 1;
            const hex = `#${[r, g, b].map(x => x.toString(16).padStart(2, '0')).join('')}`;
            return { hex, alpha: a };
        }

        if (colorStr.startsWith('#')) {
            let hex = colorStr.slice(1);
            let alpha = 1;
            if (hex.length === 8) {
                alpha = parseInt(hex.slice(6, 8), 16) / 255;
                hex = hex.slice(0, 6);
            } else if (hex.length === 3) {
                hex = hex.split('').map(c => c + c).join('');
            }
            return { hex: '#' + hex, alpha };
        }

        return { hex: '#000000', alpha: 1 };
    }

    // -------------------------------------------------------------------------
    // Генерация результата (без изменений)
    // -------------------------------------------------------------------------
    generateCSS() {
        if (this.mode === 'solid' || this.colorStops.length === 1) {
            const stop = this.colorStops[0];
            return `rgba(${this._hexToRgb(stop.color).r}, ${this._hexToRgb(stop.color).g}, ${this._hexToRgb(stop.color).b}, ${stop.alpha})`;
        }

        const sortedStops = [...this.colorStops].sort((a, b) => a.position - b.position);
        const stopsStr = sortedStops.map(stop => {
            const rgb = this._hexToRgb(stop.color);
            return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${stop.alpha}) ${stop.position}%`;
        }).join(', ');

        if (this.gradientType === 'linear') {
            return `linear-gradient(${this.angle}deg, ${stopsStr})`;
        } else {
            return `radial-gradient(${this.radialShape} at ${this.radialPosition}, ${stopsStr})`;
        }
    }

    // -------------------------------------------------------------------------
    // Цветовые конверсии (без изменений)
    // -------------------------------------------------------------------------
    _hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : { r: 0, g: 0, b: 0 };
    }

    _rgbToHex(r, g, b) {
        return '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('');
    }

    _rgbToHsl(r, g, b) {
        r /= 255; g /= 255; b /= 255;
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        let h, s, l = (max + min) / 2;

        if (max === min) {
            h = s = 0;
        } else {
            const d = max - min;
            s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
            switch (max) {
                case r: h = (g - b) / d + (g < b ? 6 : 0); break;
                case g: h = (b - r) / d + 2; break;
                case b: h = (r - g) / d + 4; break;
            }
            h /= 6;
        }
        return [Math.round(h * 360), Math.round(s * 100), Math.round(l * 100)];
    }

    _hslToRgb(h, s, l) {
        h /= 360; s /= 100; l /= 100;
        let r, g, b;
        if (s === 0) {
            r = g = b = l;
        } else {
            const hue2rgb = (p, q, t) => {
                if (t < 0) t += 1;
                if (t > 1) t -= 1;
                if (t < 1/6) return p + (q - p) * 6 * t;
                if (t < 1/2) return q;
                if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
                return p;
            };
            const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
            const p = 2 * l - q;
            r = hue2rgb(p, q, h + 1/3);
            g = hue2rgb(p, q, h);
            b = hue2rgb(p, q, h - 1/3);
        }
        return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
    }

    // -------------------------------------------------------------------------
    // История (без изменений)
    // -------------------------------------------------------------------------
    _loadHistory() {
        try {
            const saved = localStorage.getItem('oto_color_history');
            return saved ? JSON.parse(saved) : [];
        } catch (e) {
            return [];
        }
    }

    _saveHistory() {
        try {
            localStorage.setItem('oto_color_history', JSON.stringify(this.history));
        } catch (e) {}
    }

    _addToHistory(color) {
        if (!color) return;
        this.history = this.history.filter(c => c !== color);
        this.history.unshift(color);
        if (this.history.length > 10) this.history = this.history.slice(0, 10);
        this._saveHistory();
    }

    // -------------------------------------------------------------------------
    // Главный рендер (верхняя оболочка)
    // -------------------------------------------------------------------------
    _renderMain() {
        const overlay = document.createElement('div');
        overlay.style.cssText = `
            position: fixed; top:0; left:0; width:100%; height:100%;
            background: rgba(0,0,0,0.9); z-index:20000;
            display:flex; justify-content:center; align-items:center;
            backdrop-filter:blur(5px);
        `;

        const container = document.createElement('div');
        container.style.cssText = `
            background:#1a1a1a; border:2px solid #d4af37; border-radius:12px;
            width:700px; max-width:95%; max-height:90vh; overflow-y:auto;
            box-shadow:0 0 40px rgba(212,175,55,0.4);
        `;

        container.innerHTML = `
            <div style="padding:20px; border-bottom:1px solid #333;">
                <h3 style="color:#d4af37; margin:0;">
                    <i class="fas fa-palette"></i> Редактор цвета и градиента
                </h3>
            </div>
            <!-- Переключатель режимов -->
            <div style="display:flex; gap:10px; padding:15px 20px 0 20px;">
                <button id="mode-solid" style="flex:1; padding:8px; border-radius:4px; cursor:pointer; font-weight:bold;">Сплошной</button>
                <button id="mode-gradient" style="flex:1; padding:8px; border-radius:4px; cursor:pointer; font-weight:bold;">Градиент</button>
            </div>
            <!-- Предпросмотр -->
            <div id="preview" style="height:100px; margin:20px; border-radius:8px; border:2px solid #333;"></div>
            <!-- Контент будет динамически заполняться -->
            <div id="content-area"></div>
            <!-- Кнопки -->
            <div style="display:flex; gap:10px; padding:20px; border-top:1px solid #333;">
                <button id="cancel-btn" style="flex:1; background:transparent; border:1px solid #666; color:#aaa; padding:10px; border-radius:4px; cursor:pointer;">Отмена</button>
                <button id="apply-btn" style="flex:1; background:#d4af37; border:none; color:#000; padding:10px; border-radius:4px; cursor:pointer; font-weight:bold;">Применить</button>
            </div>
        `;

        overlay.appendChild(container);
        document.body.appendChild(overlay);
        this.modal = overlay;

        document.getElementById('mode-solid').onclick = () => this._switchToSolid();
        document.getElementById('mode-gradient').onclick = () => this._switchToGradient();
        document.getElementById('cancel-btn').onclick = () => this.modal.remove();
        document.getElementById('apply-btn').onclick = () => {
            const result = this.generateCSS();
            this._addToHistory(result);
            if (this.callback) this.callback(result);
            this.modal.remove();
        };
        this.modal.onclick = (e) => { if (e.target === this.modal) this.modal.remove(); };

        this._updateModeUI();
        this._renderContent();
        this._updatePreview();
    }

    _renderContent() {
        const area = document.getElementById('content-area');
        if (!area) return;
        area.innerHTML = ''; // очищаем
        if (this.mode === 'solid') {
            this._renderSolidContent(area);
        } else {
            this._renderGradientContent(area);
        }
    }

    _updateModeUI() {
        const solidBtn = document.getElementById('mode-solid');
        const gradBtn = document.getElementById('mode-gradient');
        if (this.mode === 'solid') {
            solidBtn.style.cssText = 'flex:1; padding:8px; border-radius:4px; background:#d4af37; color:#000; border:none;';
            gradBtn.style.cssText = 'flex:1; padding:8px; border-radius:4px; background:#333; color:#aaa; border:1px solid #555;';
        } else {
            solidBtn.style.cssText = 'flex:1; padding:8px; border-radius:4px; background:#333; color:#aaa; border:1px solid #555;';
            gradBtn.style.cssText = 'flex:1; padding:8px; border-radius:4px; background:#d4af37; color:#000; border:none;';
        }
    }

    _updatePreview() {
        const preview = document.getElementById('preview');
        if (preview) preview.style.background = this.generateCSS();
    }

    // =========================================================================
    // УНИВЕРСАЛЬНЫЙ КОМПОНЕНТ ВЫБОРА ЦВЕТА
    // =========================================================================
    /**
     * Создаёт интерфейс выбора цвета (S/L‑область, ползунки, поля ввода,
     * палитры, историю) внутри указанного контейнера.
     * Все изменения применяются к объекту colorState (поля .hex, .alpha).
     * @param {HTMLElement} container - куда вставить интерфейс
     * @param {Object} colorState - объект вида { hex: '#rrggbb', alpha: 1 }
     * @param {Function} onChange - вызывается после каждого изменения (для обновления предпросмотра)
     */
    _createColorPickerUI(container, colorState, onChange) {
        container.innerHTML = ''; // очистка

        // ---- Построение HTML ----
        const html = `
            <div style="margin-bottom:20px;">
                <div id="picker-area" style="
                    width:100%; height:200px; border-radius:8px; position:relative;
                    cursor:crosshair; border:2px solid #444;
                    background: linear-gradient(to right, white, hsl(0,100%,50%)),
                                linear-gradient(to top, black, transparent);
                ">
                    <div id="picker-cursor" style="
                        position:absolute; width:16px; height:16px; border:2px solid white;
                        border-radius:50%; box-shadow:0 0 0 1px black;
                        transform:translate(-50%,-50%); pointer-events:none;
                    "></div>
                </div>
            </div>
            <div style="margin-bottom:15px;">
                <label style="color:#aaa;">Оттенок (Hue): <span id="picker-hue-display">0</span>°</label>
                <input type="range" id="picker-hue-slider" min="0" max="360" value="0" style="width:100%; accent-color:#d4af37;">
            </div>
            <div style="margin-bottom:15px;">
                <label style="color:#aaa;">Прозрачность: <span id="picker-alpha-display">100</span>%</label>
                <input type="range" id="picker-alpha-slider" min="0" max="100" value="100" style="width:100%; accent-color:#d4af37;">
            </div>
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:20px;">
                <div><label style="color:#888;">HEX</label><input type="text" id="picker-hex-input" style="width:100%; background:#2a2a2a; border:1px solid #444; color:#fff; padding:6px; border-radius:3px; font-family:monospace;"></div>
                <div><label style="color:#888;">RGBA</label><input type="text" id="picker-rgba-input" style="width:100%; background:#2a2a2a; border:1px solid #444; color:#fff; padding:6px; border-radius:3px; font-family:monospace;"></div>
            </div>
            <div id="picker-palettes"></div>
            <div id="picker-history"></div>
        `;

        const wrapper = document.createElement('div');
        wrapper.innerHTML = html;
        container.appendChild(wrapper);

        // ---- Ссылки на DOM - элементы ----
        const area = document.getElementById('picker-area');
        const cursor = document.getElementById('picker-cursor');
        const hueSlider = document.getElementById('picker-hue-slider');
        const alphaSlider = document.getElementById('picker-alpha-slider');
        const hueDisplay = document.getElementById('picker-hue-display');
        const alphaDisplay = document.getElementById('picker-alpha-display');
        const hexInput = document.getElementById('picker-hex-input');
        const rgbaInput = document.getElementById('picker-rgba-input');
        const palettesDiv = document.getElementById('picker-palettes');
        const historyDiv = document.getElementById('picker-history');

        // ---- Вспомогательная функция обновления UI по текущему colorState ----
        const updateUI = () => {
            const rgb = this._hexToRgb(colorState.hex);
            const [h, s, l] = this._rgbToHsl(rgb.r, rgb.g, rgb.b);

            // Курсор
            cursor.style.left = s + '%';
            cursor.style.top = (100 - l) + '%';

            // Фон области (оттенок)
            area.style.background = `linear-gradient(to right, white, hsl(${h},100%,50%)), linear-gradient(to top, black, transparent)`;

            // Слайдеры и дисплеи
            hueSlider.value = h;
            hueDisplay.textContent = h;
            alphaSlider.value = Math.round(colorState.alpha * 100);
            alphaDisplay.textContent = Math.round(colorState.alpha * 100);

            // Поля ввода
            const hexWithAlpha = colorState.hex + (colorState.alpha < 1 ? Math.round(colorState.alpha * 255).toString(16).padStart(2, '0') : '');
            hexInput.value = hexWithAlpha;
            rgbaInput.value = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${colorState.alpha})`;
        };

        // ---- Функция, вызываемая при любом изменении цвета ----
        const handleChange = () => {
            updateUI();
            if (onChange) onChange(colorState);
        };

        // ---- Обработчики ----
        // 1. Область S/L
        const onAreaMove = (clientX, clientY) => {
            const rect = area.getBoundingClientRect();
            let x = clientX - rect.left;
            let y = clientY - rect.top;
            x = Math.max(0, Math.min(rect.width, x));
            y = Math.max(0, Math.min(rect.height, y));
            const s = (x / rect.width) * 100;
            const l = 100 - (y / rect.height) * 100;

            const [h] = this._rgbToHsl(
                this._hexToRgb(colorState.hex).r,
                this._hexToRgb(colorState.hex).g,
                this._hexToRgb(colorState.hex).b
            );
            const rgb = this._hslToRgb(h, s, l);
            colorState.hex = this._rgbToHex(rgb[0], rgb[1], rgb[2]);
            // alpha не меняется
            handleChange();
        };

        area.addEventListener('mousedown', (e) => {
            onAreaMove(e.clientX, e.clientY);
            const onMouseMove = (e) => onAreaMove(e.clientX, e.clientY);
            const onMouseUp = () => {
                document.removeEventListener('mousemove', onMouseMove);
                document.removeEventListener('mouseup', onMouseUp);
            };
            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
        });

        // 2. Ползунок оттенка
        hueSlider.addEventListener('input', (e) => {
            const h = parseInt(e.target.value);
            const [ , s, l] = this._rgbToHsl(
                this._hexToRgb(colorState.hex).r,
                this._hexToRgb(colorState.hex).g,
                this._hexToRgb(colorState.hex).b
            );
            const rgb = this._hslToRgb(h, s, l);
            colorState.hex = this._rgbToHex(rgb[0], rgb[1], rgb[2]);
            handleChange();
        });

        // 3. Ползунок прозрачности
        alphaSlider.addEventListener('input', (e) => {
            colorState.alpha = parseInt(e.target.value) / 100;
            handleChange();
        });

        // 4. Поле HEX
        hexInput.addEventListener('change', (e) => {
            const parsed = this._parseColor(e.target.value);
            colorState.hex = parsed.hex;
            colorState.alpha = parsed.alpha;
            handleChange();
        });

        // 5. Поле RGBA
        rgbaInput.addEventListener('change', (e) => {
            const parsed = this._parseColor(e.target.value);
            colorState.hex = parsed.hex;
            colorState.alpha = parsed.alpha;
            handleChange();
        });

        // 6. Палитры
        this._renderPalettes(palettesDiv, (colorStr) => {
            const parsed = this._parseColor(colorStr);
            colorState.hex = parsed.hex;
            colorState.alpha = parsed.alpha;
            handleChange();
        });

        // 7. История
        this._renderHistory(historyDiv, (colorStr) => {
            const parsed = this._parseColor(colorStr);
            colorState.hex = parsed.hex;
            colorState.alpha = parsed.alpha;
            handleChange();
        });

        // Первоначальное обновление
        updateUI();
    }

    // -------------------------------------------------------------------------
    // РЕЖИМ SOLID (использует универсальный UI)
    // -------------------------------------------------------------------------
    _switchToSolid() {
        this.mode = 'solid';
        const stop = this.colorStops[this.selectedStopIndex] || this.colorStops[0];
        this.colorStops = [{ color: stop.color, alpha: stop.alpha, position: 50 }];
        this.selectedStopIndex = 0;
        this._updateModeUI();
        this._renderContent();
        this._updatePreview();
    }

    _renderSolidContent(container) {
        // Просто встраиваем универсальный пикер, привязанный к this.colorStops[0]
        this._createColorPickerUI(container, this.colorStops[0], () => {
            this._updatePreview();
        });
    }

    // -------------------------------------------------------------------------
    // РЕЖИМ GRADIENT
    // -------------------------------------------------------------------------
    _switchToGradient() {
        this.mode = 'gradient';
        if (this.colorStops.length === 1) {
            const stop = this.colorStops[0];
            this.colorStops = [
                { color: stop.color, alpha: stop.alpha, position: 0 },
                { color: stop.color, alpha: stop.alpha, position: 100 }
            ];
            this.selectedStopIndex = 0;
        }
        this._updateModeUI();
        this._renderContent();
        this._updatePreview();
    }

    _renderGradientContent(container) {
        const html = `
            <div style="padding:0 20px 20px 20px;">
                <!-- Тип -->
                <div style="margin-bottom:15px;">
                    <label style="color:#aaa;">Тип градиента</label>
                    <div style="display:flex; gap:10px;">
                        <button id="type-linear" style="flex:1; padding:8px; border-radius:4px; cursor:pointer;">Линейный</button>
                        <button id="type-radial" style="flex:1; padding:8px; border-radius:4px; cursor:pointer;">Радиальный</button>
                    </div>
                </div>
                <!-- Параметры линейного -->
                <div id="linear-params" style="display:none; margin-bottom:15px;">
                    <label style="color:#aaa;">Угол (градусы)</label>
                    <div style="display:flex; gap:10px; align-items:center;">
                        <input type="range" id="grad-angle" min="0" max="360" value="${this.angle}" style="flex:1;">
                        <input type="number" id="grad-angle-num" min="0" max="360" value="${this.angle}" style="width:70px; background:#222; border:1px solid #444; color:#fff; padding:6px; border-radius:4px;">
                        <span style="color:#888;">°</span>
                    </div>
                </div>
                <!-- Параметры радиального -->
                <div id="radial-params" style="display:none; margin-bottom:15px;">
                    <label style="color:#aaa;">Форма</label>
                    <div style="display:flex; gap:10px; margin-bottom:10px;">
                        <button id="shape-circle" style="flex:1; padding:8px; border-radius:4px;">Круг</button>
                        <button id="shape-ellipse" style="flex:1; padding:8px; border-radius:4px;">Эллипс</button>
                    </div>
                    <label style="color:#aaa;">Позиция</label>
                    <select id="radial-position" style="width:100%; background:#222; border:1px solid #444; color:#fff; padding:8px; border-radius:4px;">
                        <option value="center">Center</option><option value="top">Top</option><option value="bottom">Bottom</option>
                        <option value="left">Left</option><option value="right">Right</option>
                        <option value="top left">Top Left</option><option value="top right">Top Right</option>
                        <option value="bottom left">Bottom Left</option><option value="bottom right">Bottom Right</option>
                    </select>
                </div>
                <!-- Управление остановками -->
                <div>
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
                        <span style="color:#aaa;">Цветовые остановки</span>
                        <button id="add-stop-btn" style="background:#4cd137; border:none; color:#fff; padding:6px 12px; border-radius:4px; cursor:pointer;">
                            <i class="fas fa-plus"></i> Добавить
                        </button>
                    </div>
                    <div style="position:relative; height:40px; margin-bottom:15px;">
                        <div id="gradient-bar" style="height:100%; border-radius:4px; border:2px solid #333;"></div>
                        <div id="stops-container" style="position:absolute; top:0; left:0; right:0; height:100%;"></div>
                    </div>
                    <div id="stop-editor" style="background:#222; border:1px solid #444; border-radius:4px; padding:12px;"></div>
                </div>
            </div>
        `;
        container.innerHTML = html;

        this._initGradientEvents();
        this._updateGradientUI();
        this._renderStops();
        this._renderStopEditor();
    }

    _initGradientEvents() {
        document.getElementById('type-linear').onclick = () => {
            this.gradientType = 'linear';
            this._updateGradientUI();
            this._updatePreview();
        };
        document.getElementById('type-radial').onclick = () => {
            this.gradientType = 'radial';
            this._updateGradientUI();
            this._updatePreview();
        };

        const angleSlider = document.getElementById('grad-angle');
        const angleNum = document.getElementById('grad-angle-num');
        if (angleSlider) {
            angleSlider.oninput = () => {
                this.angle = parseInt(angleSlider.value);
                angleNum.value = this.angle;
                this._updatePreview();
            };
            angleNum.oninput = () => {
                this.angle = parseInt(angleNum.value);
                angleSlider.value = this.angle;
                this._updatePreview();
            };
        }

        document.getElementById('shape-circle').onclick = () => {
            this.radialShape = 'circle';
            this._updateRadialShapeUI();
            this._updatePreview();
        };
        document.getElementById('shape-ellipse').onclick = () => {
            this.radialShape = 'ellipse';
            this._updateRadialShapeUI();
            this._updatePreview();
        };
        const posSelect = document.getElementById('radial-position');
        if (posSelect) {
            posSelect.onchange = (e) => {
                this.radialPosition = e.target.value;
                this._updatePreview();
            };
        }

        document.getElementById('add-stop-btn').onclick = () => this._addColorStop();
    }

    _updateGradientUI() {
        const linearBtn = document.getElementById('type-linear');
        const radialBtn = document.getElementById('type-radial');
        const linearParams = document.getElementById('linear-params');
        const radialParams = document.getElementById('radial-params');

        if (this.gradientType === 'linear') {
            linearBtn.style.cssText = 'flex:1; padding:8px; border-radius:4px; background:#d4af37; color:#000; border:none;';
            radialBtn.style.cssText = 'flex:1; padding:8px; border-radius:4px; background:#333; color:#aaa; border:1px solid #555;';
            linearParams.style.display = 'block';
            radialParams.style.display = 'none';
        } else {
            linearBtn.style.cssText = 'flex:1; padding:8px; border-radius:4px; background:#333; color:#aaa; border:1px solid #555;';
            radialBtn.style.cssText = 'flex:1; padding:8px; border-radius:4px; background:#d4af37; color:#000; border:none;';
            linearParams.style.display = 'none';
            radialParams.style.display = 'block';
            this._updateRadialShapeUI();
        }
    }

    _updateRadialShapeUI() {
        const circleBtn = document.getElementById('shape-circle');
        const ellipseBtn = document.getElementById('shape-ellipse');
        if (this.radialShape === 'circle') {
            circleBtn.style.cssText = 'flex:1; padding:8px; border-radius:4px; background:#d4af37; color:#000; border:none;';
            ellipseBtn.style.cssText = 'flex:1; padding:8px; border-radius:4px; background:#333; color:#aaa; border:1px solid #555;';
        } else {
            circleBtn.style.cssText = 'flex:1; padding:8px; border-radius:4px; background:#333; color:#aaa; border:1px solid #555;';
            ellipseBtn.style.cssText = 'flex:1; padding:8px; border-radius:4px; background:#d4af37; color:#000; border:none;';
        }
    }

    // Рендер остановок (без изменений, кроме вызова _openColorPicker)
    _renderStops() {
        const container = document.getElementById('stops-container');
        if (!container || this.mode !== 'gradient') return;
        container.innerHTML = '';

        this.colorStops.forEach((stop, index) => {
            const el = document.createElement('div');
            el.style.cssText = `
                position:absolute; left:${stop.position}%; top:50%;
                transform:translate(-50%,-50%);
                width:16px; height:16px; border-radius:50%;
                background:${stop.color};
                border:2px solid ${index === this.selectedStopIndex ? '#d4af37' : '#fff'};
                cursor:pointer; box-shadow:0 2px 8px rgba(0,0,0,0.5);
            `;
            el.onclick = (e) => {
                e.stopPropagation();
                this.selectedStopIndex = index;
                this._renderStops();
                this._renderStopEditor();
            };
            el.onmousedown = (e) => this._startDragStop(e, index);
            container.appendChild(el);
        });

        // Обновляем фон полосы градиента
        const bar = document.getElementById('gradient-bar');
        if (bar) {
            const sorted = [...this.colorStops].sort((a,b) => a.position - b.position);
            const stopsStr = sorted.map(s => {
                const rgb = this._hexToRgb(s.color);
                return `rgba(${rgb.r},${rgb.g},${rgb.b},${s.alpha}) ${s.position}%`;
            }).join(', ');
            bar.style.background = `linear-gradient(to right, ${stopsStr})`;
        }
    }

    _startDragStop(e, index) {
        e.preventDefault();
        this.isDragging = true;
        const bar = document.getElementById('gradient-bar');
        const barRect = bar.getBoundingClientRect();

        const onMouseMove = (moveEvent) => {
            if (!this.isDragging) return;
            const x = moveEvent.clientX - barRect.left;
            const percent = Math.max(0, Math.min(100, (x / barRect.width) * 100));
            this.colorStops[index].position = Math.round(percent);
            this._renderStops();
            this._renderStopEditor();
            this._updatePreview();
        };
        const onMouseUp = () => {
            this.isDragging = false;
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
        };
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    }

    _renderStopEditor() {
        const editor = document.getElementById('stop-editor');
        if (!editor || this.mode !== 'gradient') return;
        const stop = this.colorStops[this.selectedStopIndex];
        if (!stop) return;

        editor.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
                <span style="color:#aaa;">Остановка ${this.selectedStopIndex+1}</span>
                ${this.colorStops.length > 2 ? '<button id="delete-stop-btn" style="background:#e84118; border:none; color:#fff; padding:4px 10px; border-radius:3px; cursor:pointer;">Удалить</button>' : ''}
            </div>
            <div style="margin-bottom:10px;">
                <button id="pick-stop-color" style="width:100%; background:#2a2a2a; border:1px solid #444; color:#fff; padding:8px; border-radius:4px; display:flex; align-items:center; gap:8px;">
                    <span style="display:inline-block; width:20px; height:20px; border-radius:3px; background:${this._getCurrentRGBA(stop)};"></span>
                    <span>Выбрать цвет</span>
                </button>
            </div>
            <div style="margin-bottom:10px;">
                <label style="color:#aaa;">Прозрачность</label>
                <div style="display:flex; gap:5px; align-items:center;">
                    <input type="range" id="stop-alpha" min="0" max="1" step="0.01" value="${stop.alpha}" style="flex:1;">
                    <span style="color:#fff; min-width:35px;">${Math.round(stop.alpha*100)}%</span>
                </div>
            </div>
            <div>
                <label style="color:#aaa;">Позиция</label>
                <div style="display:flex; gap:5px; align-items:center;">
                    <input type="range" id="stop-position" min="0" max="100" value="${stop.position}" style="flex:1;">
                    <input type="number" id="stop-position-num" min="0" max="100" value="${stop.position}" style="width:60px; background:#2a2a2a; border:1px solid #444; color:#fff; padding:6px; border-radius:3px;">
                    <span style="color:#888;">%</span>
                </div>
            </div>
        `;

        document.getElementById('pick-stop-color').onclick = () => {
            this._openColorPicker(stop); // ← теперь используем универсальный метод
        };

        const alphaSlider = document.getElementById('stop-alpha');
        alphaSlider.oninput = (e) => {
            stop.alpha = parseFloat(e.target.value);
            editor.querySelector('span[style*="min-width"]').textContent = Math.round(stop.alpha * 100) + '%';
            this._renderStops();
            this._updatePreview();
        };

        const posSlider = document.getElementById('stop-position');
        const posNum = document.getElementById('stop-position-num');
        posSlider.oninput = () => {
            stop.position = parseInt(posSlider.value);
            posNum.value = stop.position;
            this._renderStops();
            this._updatePreview();
        };
        posNum.oninput = () => {
            stop.position = parseInt(posNum.value);
            posSlider.value = stop.position;
            this._renderStops();
            this._updatePreview();
        };

        const delBtn = document.getElementById('delete-stop-btn');
        if (delBtn) {
            delBtn.onclick = () => {
                if (this.colorStops.length <= 2) return;
                this.colorStops.splice(this.selectedStopIndex, 1);
                this.selectedStopIndex = Math.min(this.selectedStopIndex, this.colorStops.length - 1);
                this._renderStops();
                this._renderStopEditor();
                this._updatePreview();
            };
        }
    }

    _getCurrentRGBA(stop) {
        const rgb = this._hexToRgb(stop.color);
        return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${stop.alpha})`;
    }

    _addColorStop() {
        const sorted = [...this.colorStops].sort((a,b) => a.position - b.position);
        let newPos = 50;
        if (sorted.length >= 2) {
            let maxGap = 0, maxIdx = 0;
            for (let i=0; i<sorted.length-1; i++) {
                const gap = sorted[i+1].position - sorted[i].position;
                if (gap > maxGap) { maxGap = gap; maxIdx = i; }
            }
            newPos = Math.round((sorted[maxIdx].position + sorted[maxIdx+1].position) / 2);
        }
        const before = sorted.find(s => s.position <= newPos) || sorted[0];
        const after = sorted.find(s => s.position >= newPos) || sorted[sorted.length-1];
        let newColor = '#888888', newAlpha = 1;
        if (before && after) {
            const rgb1 = this._hexToRgb(before.color);
            const rgb2 = this._hexToRgb(after.color);
            const factor = (newPos - before.position) / (after.position - before.position) || 0.5;
            const r = Math.round(rgb1.r + (rgb2.r - rgb1.r) * factor);
            const g = Math.round(rgb1.g + (rgb2.g - rgb1.g) * factor);
            const b = Math.round(rgb1.b + (rgb2.b - rgb1.b) * factor);
            newColor = this._rgbToHex(r, g, b);
            newAlpha = before.alpha + (after.alpha - before.alpha) * factor;
        }
        this.colorStops.push({ color: newColor, alpha: newAlpha, position: newPos });
        this.selectedStopIndex = this.colorStops.length - 1;
        this._renderStops();
        this._renderStopEditor();
        this._updatePreview();
    }

    // -------------------------------------------------------------------------
    // УНИВЕРСАЛЬНЫЙ МЕТОД ОТКРЫТИЯ МОДАЛЬНОГО ПИКЕРА ДЛЯ ТОЧКИ
    // -------------------------------------------------------------------------
    /**
     * Открывает полноценный модальный ColorPicker для редактирования остановки.
     * После выбора цвета обновляет остановку и добавляет цвет в историю.
     * @param {Object} stop - объект остановки { color, alpha }
     */
    _openColorPicker(stop) {
        const initialColor = this._getCurrentRGBA(stop);
        const parsed = this._parseColor(initialColor);
        const tempColor = { hex: parsed.hex, alpha: parsed.alpha };

        const overlay = document.createElement('div');
        overlay.style.cssText = `
            position: fixed; top:0; left:0; width:100%; height:100%;
            background: rgba(0,0,0,0.95); z-index:30000;
            display:flex; justify-content:center; align-items:center;
            backdrop-filter:blur(5px);
        `;
        const container = document.createElement('div');
        container.style.cssText = `
            background:#1a1a1a; border:2px solid #d4af37; border-radius:8px;
            width:450px; max-width:90%; padding:20px;
        `;
        container.innerHTML = `
            <h4 style="color:#d4af37; margin-top:0;">Выберите цвет</h4>
            <div id="color-picker-placeholder"></div>
            <div style="display:flex; gap:10px; justify-content:flex-end; margin-top:20px;">
                <button id="color-picker-cancel" style="background:transparent; border:1px solid #666; color:#aaa; padding:8px 16px; border-radius:4px; cursor:pointer;">Отмена</button>
                <button id="color-picker-ok" style="background:#d4af37; border:none; color:#000; padding:8px 16px; border-radius:4px; cursor:pointer;">OK</button>
            </div>
        `;
        overlay.appendChild(container);
        document.body.appendChild(overlay);

        const placeholder = document.getElementById('color-picker-placeholder');
        this._createColorPickerUI(placeholder, tempColor, () => {
            // live preview внутри модального окна (можно обновлять что-то, но не обязательно)
        });

        overlay.querySelector('#color-picker-cancel').onclick = () => overlay.remove();
        overlay.querySelector('#color-picker-ok').onclick = () => {
            stop.color = tempColor.hex;
            stop.alpha = tempColor.alpha;
            this._addToHistory(this._getCurrentRGBA(stop)); // добавляем выбранный цвет в историю
            this._renderStops();
            this._renderStopEditor();
            this._updatePreview();
            overlay.remove();
        };
        overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };
    }

    // -------------------------------------------------------------------------
    // Палитры и история (общие)
    // -------------------------------------------------------------------------
    _renderPalettes(container, onClick) {
        if (!container) return;
        let html = '<label style="color:#aaa; display:block; margin:15px 0 8px;"><i class="fas fa-swatchbook"></i> Палитры</label>';
        for (const [name, colors] of Object.entries(this.palettes)) {
            html += `<div style="margin-bottom:10px;"><div style="color:#888; font-size:0.75rem;">${name}</div><div style="display:flex; flex-wrap:wrap; gap:4px;">`;
            colors.forEach(c => {
                html += `<div class="palette-color" data-color="${c}" style="width:26px; height:26px; border-radius:4px; background:${c}; border:2px solid #333; cursor:pointer;" title="${c}"></div>`;
            });
            html += '</div></div>';
        }
        container.innerHTML = html;
        container.querySelectorAll('.palette-color').forEach(el => {
            el.onmouseover = () => { el.style.borderColor = '#d4af37'; };
            el.onmouseout = () => { el.style.borderColor = '#333'; };
            el.onclick = () => onClick(el.dataset.color);
        });
    }

    _renderHistory(container, onClick) {
        if (!container || this.history.length === 0) return;
        let html = '<label style="color:#aaa; display:block; margin:15px 0 8px;"><i class="fas fa-history"></i> Недавние</label>';
        html += '<div style="display:flex; flex-wrap:wrap; gap:4px;">';
        this.history.forEach(c => {
            html += `<div class="history-color" data-color="${c}" style="width:26px; height:26px; border-radius:4px; background:${c}; border:2px solid #333; cursor:pointer;" title="${c}"></div>`;
        });
        html += '</div>';
        container.innerHTML = html;
        container.querySelectorAll('.history-color').forEach(el => {
            el.onmouseover = () => { el.style.borderColor = '#d4af37'; };
            el.onmouseout = () => { el.style.borderColor = '#333'; };
            el.onclick = () => onClick(el.dataset.color);
        });
    }
}

// Для совместимости с существующим кодом, экспортируем под обоими именами
export { GradientPicker as GradientPickerPro };