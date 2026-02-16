// js/color-picker-pro.js
'use strict';

/**
 * ПРОФЕССИОНАЛЬНЫЙ ПИКЕР ЦВЕТОВ С АЛЬФА-КАНАЛОМ
 * 
 * Возможности:
 * - Выбор цвета (H, S, L)
 * - Настройка прозрачности (Alpha)
 * - Предпросмотр в реальном времени
 * - Поддержка HEX, RGB, RGBA, HSL, HSLA
 * - История последних использованных цветов
 * - Предустановленные палитры
 * - Пипетка (eyedropper) если поддерживается браузером
 */

export class ColorPickerPro {
    constructor() {
        this.callback = null;
        this.modal = null;
        
        // Текущий цвет
        this.hue = 0;
        this.saturation = 100;
        this.lightness = 50;
        this.alpha = 1;
        
        // История цветов (последние 10)
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

    /**
     * Открывает пикер цветов
     */
    open(onSelect, initialValue = '#ffffff') {
        this.callback = onSelect;
        this._parseColor(initialValue);
        this._render();
    }

    /**
     * Парсит цвет из различных форматов
     */
    _parseColor(color) {
        try {
            // HEX
            if (color.startsWith('#')) {
                const hex = color.slice(1);
                if (hex.length === 6 || hex.length === 8) {
                    const r = parseInt(hex.slice(0, 2), 16);
                    const g = parseInt(hex.slice(2, 4), 16);
                    const b = parseInt(hex.slice(4, 6), 16);
                    this.alpha = hex.length === 8 ? parseInt(hex.slice(6, 8), 16) / 255 : 1;
                    
                    const hsl = this._rgbToHsl(r, g, b);
                    this.hue = hsl[0];
                    this.saturation = hsl[1];
                    this.lightness = hsl[2];
                }
            }
            // RGBA
            else if (color.startsWith('rgba')) {
                const match = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([0-9.]+))?\)/);
                if (match) {
                    const r = parseInt(match[1]);
                    const g = parseInt(match[2]);
                    const b = parseInt(match[3]);
                    this.alpha = match[4] ? parseFloat(match[4]) : 1;
                    
                    const hsl = this._rgbToHsl(r, g, b);
                    this.hue = hsl[0];
                    this.saturation = hsl[1];
                    this.lightness = hsl[2];
                }
            }
        } catch (error) {
            console.error('Ошибка парсинга цвета:', error);
        }
    }

    /**
     * Конвертирует RGB в HSL
     */
    _rgbToHsl(r, g, b) {
        r /= 255;
        g /= 255;
        b /= 255;

        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        let h, s, l = (max + min) / 2;

        if (max === min) {
            h = s = 0;
        } else {
            const d = max - min;
            s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
            
            switch (max) {
                case r: h = (( - b) / d + (g < b ? 6 : 0)) / 6; break;
                case g: h = ((b - r) / d + 2) / 6; break;
                case b: h = ((r - g) / d + 4) / 6; break;
            }
        }

        return [Math.round(h * 360), Math.round(s * 100), Math.round(l * 100)];
    }

    /**
     * Конвертирует HSL в RGB
     */
    _hslToRgb(h, s, l) {
        h /= 360;
        s /= 100;
        l /= 100;

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

    /**
     * Получает текущий цвет в формате RGBA
     */
    _getCurrentRGBA() {
        const [r, g, b] = this._hslToRgb(this.hue, this.saturation, this.lightness);
        return `rgba(${r}, ${g}, ${b}, ${this.alpha})`;
    }

    /**
     * Получает текущий цвет в формате HEX
     */
    _getCurrentHEX() {
        const [r, g, b] = this._hslToRgb(this.hue, this.saturation, this.lightness);
        const hex = '#' + [r, g, b].map(x => {
            const h = x.toString(16);
            return h.length === 1 ? '0' + h : h;
        }).join('');
        
        if (this.alpha < 1) {
            const a = Math.round(this.alpha * 255).toString(16).padStart(2, '0');
            return hex + a;
        }
        
        return hex;
    }

    /**
     * Рендерит интерфейс пикера
     */
    _render() {
        const overlay = document.createElement('div');
        overlay.style.cssText = `
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(0,0,0,0.85); z-index: 20001;
            display: flex; justify-content: center; align-items: center;
            backdrop-filter: blur(5px);
        `;

        const container = document.createElement('div');
        container.style.cssText = `
            background: #1a1a1a; border: 1px solid #d4af37; border-radius: 8px;
            width: 400px; max-width: 90%;
            box-shadow: 0 0 30px rgba(212,175,55,0.3);
            display: flex; flex-direction: column;
        `;

        // Заголовок
        const header = this._createHeader();
        container.appendChild(header);

        // Предпросмотр
        const preview = this._createPreview();
        container.appendChild(preview);

        // Область выбора цвета
        const colorArea = this._createColorArea();
        container.appendChild(colorArea);

        // Слайдеры
        const sliders = this._createSliders();
        container.appendChild(sliders);

        // Поля ввода
        const inputs = this._createInputs();
        container.appendChild(inputs);

        // Палитры
        const palettes = this._createPalettes();
        container.appendChild(palettes);

        // История
        if (this.history.length > 0) {
            const history = this._createHistory();
            container.appendChild(history);
        }

        // Кнопки действий
        const footer = this._createFooter();
        container.appendChild(footer);

        overlay.appendChild(container);
        document.body.appendChild(overlay);

        // Закрытие по клику на оверлей
        overlay.onclick = (e) => {
            if (e.target === overlay) overlay.remove();
        };

        this.modal = overlay;
        this._updateUI();
    }

    /**
     * Создает заголовок
     */
    _createHeader() {
        const header = document.createElement('div');
        header.style.cssText = `
            padding: 15px 20px; border-bottom: 1px solid #333;
            display: flex; justify-content: space-between; align-items: center;
        `;
        header.innerHTML = `
            <h3 style="color:#d4af37; margin:0; font-size:1.1rem;">
                <i class="fas fa-eye-dropper"></i> Выбор цвета
            </h3>
            <div style="display:flex; gap:10px; align-items:center;">
                ${this._supportsEyeDropper() ? `
                    <button id="eyedropper-btn" style="
                        background:#3498db; border:none; color:#fff; padding:6px 12px;
                        border-radius:4px; cursor:pointer; font-size:0.85rem;
                    " title="Пипетка">
                        <i class="fas fa-eye-dropper"></i>
                    </button>
                ` : ''}
                <button id="color-close" style="
                    background:transparent; border:none; color:#666; cursor:pointer; font-size:1.2rem;
                ">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;
        
        header.querySelector('#color-close').onclick = () => this.modal.remove();
        
        const eyedropperBtn = header.querySelector('#eyedropper-btn');
        if (eyedropperBtn) {
            eyedropperBtn.onclick = () => this._pickWithEyeDropper();
        }
        
        return header;
    }

    /**
     * Проверяет поддержку EyeDropper API
     */
    _supportsEyeDropper() {
        return 'EyeDropper' in window;
    }

    /**
     * Использует EyeDropper API для выбора цвета с экрана
     */
    async _pickWithEyeDropper() {
        try {
            const eyeDropper = new EyeDropper();
            const result = await eyeDropper.open();
            this._parseColor(result.sRGBHex);
            this._updateUI();
        } catch (error) {
            console.error('Ошибка EyeDropper:', error);
        }
    }

    /**
     * Создает предпросмотр цвета
     */
    _createPreview() {
        const preview = document.createElement('div');
        preview.style.cssText = `
            padding: 20px; border-bottom: 1px solid #333;
        `;
        preview.innerHTML = `
            <div style="display:flex; gap:15px; align-items:center;">
                <div id="color-preview" style="
                    width: 80px; height: 80px; border-radius: 8px;
                    border: 2px solid #444; position: relative;
                    box-shadow: 0 4px 8px rgba(0,0,0,0.3);
                ">
                    <div id="color-preview-solid" style="
                        position:absolute; top:0; left:0; width:100%; height:100%;
                        border-radius: 6px;
                    "></div>
                </div>
                <div style="flex:1;">
                    <div style="color:#aaa; font-size:0.85rem; margin-bottom:4px;">Текущий цвет:</div>
                    <div id="color-value-display" style="
                        color:#fff; font-family:monospace; font-size:0.9rem;
                        background:#2a2a2a; padding:6px 10px; border-radius:4px;
                        border:1px solid #444;
                    "></div>
                </div>
            </div>
        `;
        return preview;
    }

    /**
     * Создает область выбора цвета (Saturation/Lightness)
     */
    _createColorArea() {
        const area = document.createElement('div');
        area.style.cssText = `padding: 20px; border-bottom: 1px solid #333;`;
        area.innerHTML = `
            <div id="color-picker-area" style="
                width: 100%; height: 200px; border-radius: 8px;
                position: relative; cursor: crosshair; border: 2px solid #444;
                background: linear-gradient(to right, white, transparent),
                            linear-gradient(to top, black, transparent);
            ">
                <div id="color-picker-cursor" style="
                    position: absolute; width: 16px; height: 16px;
                    border: 2px solid white; border-radius: 50%;
                    box-shadow: 0 0 0 1px black, 0 2px 4px rgba(0,0,0,0.5);
                    pointer-events: none; transform: translate(-50%, -50%);
                "></div>
            </div>
        `;
        return area;
    }

    /**
     * Создает слайдеры
     */
    _createSliders() {
        const sliders = document.createElement('div');
        sliders.style.cssText = `
            padding: 20px; border-bottom: 1px solid #333;
        `;
        sliders.innerHTML = `
            <!-- Hue (Оттенок) -->
            <div style="margin-bottom:15px;">
                <label style="color:#aaa; display:block; margin-bottom:5px; font-size:0.85rem;">
                    Оттенок (Hue): <span id="hue-display">0</span>°
                </label>
                <div style="position:relative;">
                    <input type="range" id="hue-slider" min="0" max="360" value="0" style="
                        width:100%; accent-color:#d4af37;
                    ">
                    <div style="
                        height:8px; margin-top:-28px; border-radius:4px; pointer-events:none;
                        background: linear-gradient(to right, 
                            hsl(0, 100%, 50%), hsl(60, 100%, 50%), hsl(120, 100%, 50%), 
                            hsl(180, 100%, 50%), hsl(240, 100%, 50%), hsl(300, 100%, 50%), 
                            hsl(360, 100%, 50%));
                        opacity:0.3;
                    "></div>
                </div>
            </div>

            <!-- Alpha (Прозрачность) -->
            <div style="margin-bottom:0;">
                <label style="color:#aaa; display:block; margin-bottom:5px; font-size:0.85rem;">
                    Прозрачность (Alpha): <span id="alpha-display">100</span>%
                </label>
                <input type="range" id="alpha-slider" min="0" max="100" value="100" style="
                    width:100%; accent-color:#d4af37;
                ">
            </div>
        `;
        return sliders;
    }

    /**
     * Создает поля ввода
     */
    _createInputs() {
        const inputs = document.createElement('div');
        inputs.style.cssText = `
            padding: 20px; border-bottom: 1px solid #333;
        `;
        inputs.innerHTML = `
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
                <div>
                    <label style="color:#888; display:block; margin-bottom:5px; font-size:0.8rem;">
                        HEX
                    </label>
                    <input type="text" id="hex-input" placeholder="#ffffff" style="
                        width:100%; background:#2a2a2a; border:1px solid #444; color:#fff;
                        padding:6px 8px; border-radius:3px; font-family:monospace; font-size:0.85rem;
                    ">
                </div>
                <div>
                    <label style="color:#888; display:block; margin-bottom:5px; font-size:0.8rem;">
                        RGBA
                    </label>
                    <input type="text" id="rgba-input" placeholder="rgba(255,255,255,1)" style="
                        width:100%; background:#2a2a2a; border:1px solid #444; color:#fff;
                        padding:6px 8px; border-radius:3px; font-family:monospace; font-size:0.85rem;
                    ">
                </div>
            </div>
        `;
        return inputs;
    }

    /**
     * Создает палитры цветов
     */
    _createPalettes() {
        const palettes = document.createElement('div');
        palettes.style.cssText = `
            padding: 15px 20px; border-bottom: 1px solid #333;
            max-height: 200px; overflow-y: auto;
        `;

        let html = '<label style="color:#aaa; display:block; margin-bottom:10px; font-size:0.9rem; font-weight:600;">';
        html += '<i class="fas fa-swatchbook"></i> Палитры</label>';

        for (const [name, colors] of Object.entries(this.palettes)) {
            html += `<div style="margin-bottom:12px;">`;
            html += `<div style="color:#888; font-size:0.75rem; margin-bottom:5px;">${name}</div>`;
            html += `<div style="display:flex; flex-wrap:wrap; gap:4px;">`;
            
            for (const color of colors) {
                html += `<div class="palette-color" data-color="${color}" style="
                    width:26px; height:26px; border-radius:4px; cursor:pointer;
                    background:${color}; border:2px solid #333;
                    transition:all 0.2s;
                " title="${color}"></div>`;
            }
            
            html += `</div></div>`;
        }

        palettes.innerHTML = html;
        return palettes;
    }

    /**
     * Создает историю цветов
     */
    _createHistory() {
        const history = document.createElement('div');
        history.style.cssText = `padding: 15px 20px; border-bottom: 1px solid #333;`;
        
        let html = '<label style="color:#aaa; display:block; margin-bottom:8px; font-size:0.9rem; font-weight:600;">';
        html += '<i class="fas fa-history"></i> Недавние</label>';
        html += '<div style="display:flex; flex-wrap:wrap; gap:4px;">';
        
        for (const color of this.history) {
            html += `<div class="history-color" data-color="${color}" style="
                width:26px; height:26px; border-radius:4px; cursor:pointer;
                background:${color}; border:2px solid #333;
                transition:all 0.2s;
            " title="${color}"></div>`;
        }
        
        html += '</div>';
        history.innerHTML = html;
        return history;
    }

    /**
     * Создает футер с кнопками
     */
    _createFooter() {
        const footer = document.createElement('div');
        footer.style.cssText = `
            padding: 15px 20px; display: flex; gap: 10px; justify-content: flex-end;
        `;
        footer.innerHTML = `
            <button id="color-cancel" style="
                background:transparent; border:1px solid #666; color:#aaa;
                padding:8px 16px; border-radius:4px; cursor:pointer; font-weight:600;
            ">
                Отмена
            </button>
            <button id="color-apply" style="
                background:#d4af37; border:none; color:#000;
                padding:8px 16px; border-radius:4px; cursor:pointer; font-weight:600;
            ">
                <i class="fas fa-check"></i> Применить
            </button>
        `;

        footer.querySelector('#color-cancel').onclick = () => this.modal.remove();
        footer.querySelector('#color-apply').onclick = () => {
            const color = this._getCurrentRGBA();
            this._addToHistory(color);
            if (this.callback) {
                this.callback(color);
            }
            this.modal.remove();
        };

        return footer;
    }

    /**
     * Обновляет UI
     */
    _updateUI() {
        if (!this.modal) return;

        const rgba = this._getCurrentRGBA();
        const hex = this._getCurrentHEX();

        // Обновляем предпросмотр
        const previewSolid = this.modal.querySelector('#color-preview-solid');
        if (previewSolid) {
            previewSolid.style.background = rgba;
        }

        // Обновляем отображение значения
        const valueDisplay = this.modal.querySelector('#color-value-display');
        if (valueDisplay) {
            valueDisplay.textContent = rgba;
        }

        // Обновляем область выбора цвета
        const colorArea = this.modal.querySelector('#color-picker-area');
        if (colorArea) {
            colorArea.style.background = `
                linear-gradient(to right, white, hsl(${this.hue}, 100%, 50%)),
                linear-gradient(to top, black, transparent)
            `;
        }

        // Обновляем позицию курсора
        const cursor = this.modal.querySelector('#color-picker-cursor');
        if (cursor) {
            cursor.style.left = `${this.saturation}%`;
            cursor.style.top = `${100 - this.lightness}%`;
        }

        // Обновляем слайдеры
        const hueSlider = this.modal.querySelector('#hue-slider');
        const hueDisplay = this.modal.querySelector('#hue-display');
        if (hueSlider && hueDisplay) {
            hueSlider.value = this.hue;
            hueDisplay.textContent = this.hue;
        }

        const alphaSlider = this.modal.querySelector('#alpha-slider');
        const alphaDisplay = this.modal.querySelector('#alpha-display');
        if (alphaSlider && alphaDisplay) {
            alphaSlider.value = this.alpha * 100;
            alphaDisplay.textContent = Math.round(this.alpha * 100);
        }

        // Обновляем поля ввода
        const hexInput = this.modal.querySelector('#hex-input');
        if (hexInput) {
            hexInput.value = hex;
        }

        const rgbaInput = this.modal.querySelector('#rgba-input');
        if (rgbaInput) {
            rgbaInput.value = rgba;
        }

        // Прикрепляем обработчики
        this._attachEventHandlers();
    }

    /**
     * Прикрепляет обработчики событий
     */
    _attachEventHandlers() {
        if (!this.modal) return;

        // Область выбора цвета
        const colorArea = this.modal.querySelector('#color-picker-area');
        if (colorArea) {
            const updateColorFromArea = (e) => {
                const rect = colorArea.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;
                
                this.saturation = Math.max(0, Math.min(100, (x / rect.width) * 100));
                this.lightness = Math.max(0, Math.min(100, 100 - (y / rect.height) * 100));
                
                this._updateUI();
            };

            colorArea.onmousedown = (e) => {
                updateColorFromArea(e);
                
                const onMouseMove = (e) => updateColorFromArea(e);
                const onMouseUp = () => {
                    document.removeEventListener('mousemove', onMouseMove);
                    document.removeEventListener('mouseup', onMouseUp);
                };
                
                document.addEventListener('mousemove', onMouseMove);
                document.addEventListener('mouseup', onMouseUp);
            };
        }

        // Слайдер Hue
        const hueSlider = this.modal.querySelector('#hue-slider');
        if (hueSlider) {
            hueSlider.oninput = (e) => {
                this.hue = parseInt(e.target.value);
                this._updateUI();
            };
        }

        // Слайдер Alpha
        const alphaSlider = this.modal.querySelector('#alpha-slider');
        if (alphaSlider) {
            alphaSlider.oninput = (e) => {
                this.alpha = parseInt(e.target.value) / 100;
                this._updateUI();
            };
        }

        // Поле HEX
        const hexInput = this.modal.querySelector('#hex-input');
        if (hexInput) {
            hexInput.onchange = (e) => {
                this._parseColor(e.target.value);
                this._updateUI();
            };
        }

        // Поле RGBA
        const rgbaInput = this.modal.querySelector('#rgba-input');
        if (rgbaInput) {
            rgbaInput.onchange = (e) => {
                this._parseColor(e.target.value);
                this._updateUI();
            };
        }

        // Палитры
        this.modal.querySelectorAll('.palette-color').forEach(item => {
            item.onmouseover = () => {
                item.style.borderColor = '#d4af37';
                item.style.transform = 'scale(1.1)';
            };
            item.onmouseout = () => {
                item.style.borderColor = '#333';
                item.style.transform = 'scale(1)';
            };
            item.onclick = () => {
                this._parseColor(item.dataset.color);
                this._updateUI();
            };
        });

        // История
        this.modal.querySelectorAll('.history-color').forEach(item => {
            item.onmouseover = () => {
                item.style.borderColor = '#d4af37';
                item.style.transform = 'scale(1.1)';
            };
            item.onmouseout = () => {
                item.style.borderColor = '#333';
                item.style.transform = 'scale(1)';
            };
            item.onclick = () => {
                this._parseColor(item.dataset.color);
                this._updateUI();
            };
        });
    }

    /**
     * Добавляет цвет в историю
     */
    _addToHistory(color) {
        // Удаляем дубликаты
        this.history = this.history.filter(c => c !== color);
        
        // Добавляем в начало
        this.history.unshift(color);
        
        // Ограничиваем размер истории
        if (this.history.length > 10) {
            this.history = this.history.slice(0, 10);
        }
        
        // Сохраняем в localStorage
        this._saveHistory();
    }

    /**
     * Загружает историю из localStorage
     */
    _loadHistory() {
        try {
            const saved = localStorage.getItem('oto_color_history');
            return saved ? JSON.parse(saved) : [];
        } catch (error) {
            return [];
        }
    }

    /**
     * Сохраняет историю в localStorage
     */
    _saveHistory() {
        try {
            localStorage.setItem('oto_color_history', JSON.stringify(this.history));
        } catch (error) {
            console.error('Ошибка сохранения истории цветов:', error);
        }
    }
}

