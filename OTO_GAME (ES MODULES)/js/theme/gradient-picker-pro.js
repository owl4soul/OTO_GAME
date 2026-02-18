// gradient-picker-pro.js — Полностью переработанный пикер цвета и градиента
// Изменения от оригинала:
//   • Уникальные ID на экземпляр (статический счётчик) — устранён конфликт ID при вложенных пикерах
//   • Все запросы к DOM через container.querySelector(), а не document.getElementById()
//   • Правильная HSV-модель (Hue+Saturation+Value) вместо HSL: корректное поле SV и позиция курсора
//   • Фон поля SV: два слоя background-image — нижний «белый→цвет», верхний «прозрачный→чёрный»
//   • Дополнительный цветовой круг (HSV Wheel, Canvas) — переключается запоминающейся парой флажков
//   • Touch-поддержка поля SV
//   • Стилизованные радужные треки для слайдеров оттенка и прозрачности
//   • Исправлен рендер секции «Сплошной цвет» — больше не конфликтует с вложенным пикером для стопов градиента
//   • Добавлена обработка ключевого слова 'transparent' в _parseColor
//   • Исправлено переключение между квадратом SV и цветовым кругом с сохранением позиции курсора
//   • Во всех виджетах теперь корректно вызывается обновление предпросмотра темы
//   • Убраны переключатели режимов «СПЛОШНОЙ/ГРАДИЕНТ» — теперь всегда режим градиента.
//     Сплошной цвет — частный случай градиента с одной точкой.
//   • Кнопка удаления стопа активна только когда точек больше одной (исправлено условие >1, а не >2).

'use strict';

// Статический счётчик для уникальных ID
let _gpInstanceCounter = 0;

export class GradientPicker {
    constructor() {
        this.callback   = null;
        this.modal      = null;
        this._root      = null;   // корневой элемент модального окна пикера (заполняется в _renderMain)
        this._uid       = 'gp' + (++_gpInstanceCounter); // уникальный префикс ID (с буквенным началом для валидности CSS-селекторов)

        // Параметры градиента (всегда градиент, даже с одной точкой)
        this.gradientType    = 'linear';
        this.angle           = 135;
        this.radialShape     = 'circle';
        this.radialPosition  = 'center';

        // Цветовые стопы
        this.colorStops         = [
            { color: '#2a220a', alpha: 1, position: 0 },
            { color: '#1a1805', alpha: 1, position: 100 }
        ];
        this.selectedStopIndex = 0;
        this.isDragging        = false;

        // История цветов
        this.history = this._loadHistory();

        // Предустановленные палитры
        this.palettes = {
            'Базовые':    ['#000000','#ffffff','#ff0000','#00ff00','#0000ff','#ffff00','#ff00ff','#00ffff','#808080','#c0c0c0'],
            'Материал':   ['#f44336','#e91e63','#9c27b0','#673ab7','#3f51b5','#2196f3','#03a9f4','#00bcd4','#009688','#4caf50','#8bc34a','#cddc39','#ffeb3b','#ffc107','#ff9800','#ff5722','#795548','#9e9e9e','#607d8b','#000000'],
            'Пастель':    ['#ffb3ba','#ffdfba','#ffffba','#baffc9','#bae1ff','#e8d5b7','#ffd1dc','#d4a5a5','#ffabab','#ffc3a0'],
            'Тёмные':     ['#0a0a0a','#1a1a1a','#2a2a2a','#3a3a3a','#4a4a4a','#1a0a0a','#0a1a0a','#0a0a1a','#1a1a0a','#0a1a1a'],
            'Золото/Огонь':['#d4af37','#fbc531','#e84118','#ff9f43','#ee5a24','#c23616','#b33939','#cd6133','#f9ca24','#f0932b'],
            'Холодные':   ['#0652dd','#1289a7','#006266','#12cbc4','#1e3799','#0a3d62','#40739e','#2c3e50','#48dbfb','#55efc4'],
        };
    }

    // =========================================================================
    // Публичный API
    // =========================================================================

    /** Открывает редактор. callback получает CSS-строку. */
    open(onSelect, initialValue) {
        this.callback = onSelect;
        this._parseInitialValue(initialValue);
        this._renderMain();
    }

    // =========================================================================
    // Парсинг входного значения
    // =========================================================================

    _parseInitialValue(value) {
        if (!value) {
            // По умолчанию белый цвет (одна точка)
            this.colorStops = [{ color: '#ffffff', alpha: 1, position: 50 }];
            return;
        }
        if (value.includes('gradient')) {
            this._parseGradient(value);
        } else {
            // Сплошной цвет – одна точка
            const p = this._parseColor(value);
            this.colorStops = [{ color: p.hex, alpha: p.alpha, position: 50 }];
        }
    }

    _parseGradient(gradient) {
        const lm = gradient.match(/linear-gradient\((\d+)deg,\s*(.+)\)/);
        if (lm) { this.gradientType = 'linear'; this.angle = parseInt(lm[1]); this._parseColorStops(lm[2]); return; }
        const rm = gradient.match(/radial-gradient\((.*),\s*(.+)\)/);
        if (rm)  { this.gradientType = 'radial'; this._parseColorStops(rm[2]); return; }
        // Если не удалось распарсить градиент – считаем сплошным цветом
        const p = this._parseColor(gradient);
        this.colorStops = [{ color: p.hex, alpha: p.alpha, position: 50 }];
    }

    _parseColorStops(str) {
        this.colorStops = [];
        str.split(',').map(s => s.trim()).forEach(stop => {
            const m = stop.match(/(.+?)\s+(\d+)%/);
            if (m) {
                const c = this._parseColor(m[1].trim());
                this.colorStops.push({ color: c.hex, alpha: c.alpha, position: parseInt(m[2]) });
            } else {
                const c = this._parseColor(stop);
                this.colorStops.push({ color: c.hex, alpha: c.alpha, position: 0 });
            }
        });
        if (this.colorStops.length > 0 &&
            this.colorStops[0].position === 0 &&
            this.colorStops[this.colorStops.length - 1].position === 0) {
            this.colorStops.forEach((s, i) => {
                s.position = Math.round((i / (this.colorStops.length - 1)) * 100);
            });
        }
        this.selectedStopIndex = 0;
    }

    _parseColor(str) {
        if (!str) return { hex: '#000000', alpha: 1 };
        str = str.trim().toLowerCase();

        // --- ИСПРАВЛЕНИЕ: обработка ключевого слова 'transparent' ---
        if (str === 'transparent') {
            return { hex: '#000000', alpha: 0 };
        }

        const rm = str.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+))?\s*\)/);
        if (rm) {
            const hex = `#${[rm[1],rm[2],rm[3]].map(x => parseInt(x).toString(16).padStart(2,'0')).join('')}`;
            return { hex, alpha: rm[4] != null ? parseFloat(rm[4]) : 1 };
        }
        if (str.startsWith('#')) {
            let h = str.slice(1), alpha = 1;
            if (h.length === 8) { alpha = parseInt(h.slice(6,8),16)/255; h = h.slice(0,6); }
            else if (h.length === 3) { h = h.split('').map(c=>c+c).join(''); }
            else if (h.length === 4) { alpha = parseInt(h[3]+h[3],16)/255; h = h.slice(0,3).split('').map(c=>c+c).join(''); }
            return { hex: '#'+h.slice(0,6), alpha };
        }
        return { hex: '#000000', alpha: 1 };
    }

    // =========================================================================
    // Генерация CSS-результата
    // =========================================================================

    generateCSS() {
        // Если всего одна точка – возвращаем сплошной цвет
        if (this.colorStops.length === 1) {
            const s = this.colorStops[0];
            const rgb = this._hexToRgb(s.color);
            return `rgba(${rgb.r},${rgb.g},${rgb.b},${s.alpha})`;
        }
        const sorted = [...this.colorStops].sort((a,b) => a.position - b.position);
        const stopsStr = sorted.map(s => {
            const rgb = this._hexToRgb(s.color);
            return `rgba(${rgb.r},${rgb.g},${rgb.b},${s.alpha}) ${s.position}%`;
        }).join(', ');
        if (this.gradientType === 'linear') return `linear-gradient(${this.angle}deg, ${stopsStr})`;
        return `radial-gradient(${this.radialShape} at ${this.radialPosition}, ${stopsStr})`;
    }

    // =========================================================================
    // Цветовые конверсии
    // =========================================================================

    _hexToRgb(hex) {
        const r = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex || '#000');
        return r ? { r:parseInt(r[1],16), g:parseInt(r[2],16), b:parseInt(r[3],16) } : {r:0,g:0,b:0};
    }

    _rgbToHex(r,g,b) {
        return '#' + [r,g,b].map(x => Math.max(0,Math.min(255,Math.round(x))).toString(16).padStart(2,'0')).join('');
    }

    /** RGB (0-255) → HSV (H:0-360, S:0-100, V:0-100) */
    _rgbToHsv(r,g,b) {
        r/=255; g/=255; b/=255;
        const max=Math.max(r,g,b), min=Math.min(r,g,b), d=max-min;
        let h=0, s=max===0?0:d/max, v=max;
        if (d !== 0) {
            switch(max) {
                case r: h=((g-b)/d + (g<b?6:0))/6; break;
                case g: h=((b-r)/d + 2)/6; break;
                case b: h=((r-g)/d + 4)/6; break;
            }
        }
        return [Math.round(h*360), Math.round(s*100), Math.round(v*100)];
    }

    /** HSV (H:0-360, S:0-100, V:0-100) → RGB (0-255) */
    _hsvToRgb(h,s,v) {
        h/=360; s/=100; v/=100;
        let r,g,b;
        const i=Math.floor(h*6), f=h*6-i, p=v*(1-s), q=v*(1-f*s), t=v*(1-(1-f)*s);
        switch(i%6){
            case 0: r=v;g=t;b=p; break; case 1: r=q;g=v;b=p; break;
            case 2: r=p;g=v;b=t; break; case 3: r=p;g=q;b=v; break;
            case 4: r=t;g=p;b=v; break; case 5: r=v;g=p;b=q; break;
            default: r=g=b=0;
        }
        return [Math.round(r*255), Math.round(g*255), Math.round(b*255)];
    }

    // =========================================================================
    // История
    // =========================================================================

    _loadHistory() {
        try { return JSON.parse(localStorage.getItem('oto_color_history') || '[]'); } catch { return []; }
    }
    _saveHistory() {
        try { localStorage.setItem('oto_color_history', JSON.stringify(this.history)); } catch {}
    }
    _addToHistory(color) {
        if (!color) return;
        this.history = this.history.filter(c => c !== color);
        this.history.unshift(color);
        if (this.history.length > 12) this.history = this.history.slice(0, 12);
        this._saveHistory();
    }

    // =========================================================================
    // Вспомогательная: scoped querySelector
    // =========================================================================

    /** Безопасный поиск по ID внутри корневого элемента */
    _q(id, root) {
        const el = (root || this._root);
        return el ? el.querySelector('#' + this._uid + '-' + id) : null;
    }

    /** Создание элемента с уникальным id */
    _uid_id(id) { return `${this._uid}-${id}`; }

    // =========================================================================
    // Главный рендер — оболочка модального окна
    // =========================================================================

    _renderMain() {
        const overlay = document.createElement('div');
        overlay.style.cssText = `
            position:fixed;top:0;left:0;width:100%;height:100%;
            background:rgba(0,0,0,0.88);z-index:20000;
            display:flex;justify-content:center;align-items:center;
            backdrop-filter:blur(6px);
        `;

        const win = document.createElement('div');
        win.style.cssText = `
            background:#141414;border:1.5px solid #d4af37;border-radius:14px;
            width:680px;max-width:96vw;max-height:92vh;overflow-y:auto;
            box-shadow:0 0 50px rgba(212,175,55,0.35),0 20px 60px rgba(0,0,0,0.8);
            display:flex;flex-direction:column;
        `;
        this._root = win;

        // ── Шапка (без переключателей режимов) ──
        win.innerHTML = `
            <div style="padding:12px 18px;border-bottom:1px solid #2a2a2a;display:flex;align-items:center;gap:12px;flex-shrink:0;">
                <span style="color:#d4af37;font-size:1.05em;font-weight:700;font-family:'Exo 2',sans-serif;letter-spacing:1px;">
                    🎨 РЕДАКТОР ЦВЕТА И ГРАДИЕНТА
                </span>
                <span style="flex:1"></span>
                <div id="${this._uid_id('preview-swatch')}" style="width:32px;height:32px;border-radius:6px;border:2px solid #333;flex-shrink:0;transition:background 0.2s;"></div>
            </div>

            <!-- Полоса предпросмотра -->
            <div id="${this._uid_id('preview-bar')}" style="height:48px;margin:10px 18px;border-radius:8px;border:1.5px solid #333;transition:background 0.2s;flex-shrink:0;"></div>

            <!-- Контент (dynamic) -->
            <div id="${this._uid_id('content-area')}" style="flex:1;overflow-y:auto;"></div>

            <!-- Футер -->
            <div style="display:flex;gap:10px;padding:14px 18px;border-top:1px solid #1e1e1e;flex-shrink:0;">
                <button id="${this._uid_id('cancel-btn')}" style="flex:1;background:transparent;border:1px solid #444;color:#999;padding:9px;border-radius:6px;cursor:pointer;font-size:0.85em;font-family:'Exo 2',sans-serif;">Отмена</button>
                <button id="${this._uid_id('apply-btn')}" style="flex:2;background:linear-gradient(135deg,#d4af37,#b8962e);border:none;color:#000;padding:9px;border-radius:6px;cursor:pointer;font-weight:700;font-size:0.88em;font-family:'Exo 2',sans-serif;letter-spacing:.5px;">✓ ПРИМЕНИТЬ</button>
            </div>
        `;

        overlay.appendChild(win);
        document.body.appendChild(overlay);
        this.modal = overlay;

        // Обработчики (только отмена и применение)
        this._q('cancel-btn').onclick   = () => overlay.remove();
        this._q('apply-btn').onclick    = () => {
            const result = this.generateCSS();
            this._addToHistory(result);
            if (this.callback) this.callback(result);
            overlay.remove();
        };
        overlay.addEventListener('mousedown', e => { if (e.target === overlay) overlay.remove(); });

        this._renderContent();
        this._updateGlobalPreview();
    }

    _updateGlobalPreview() {
        const css = this.generateCSS();
        const bar   = this._q('preview-bar');
        const swatch = this._q('preview-swatch');
        if (bar)   bar.style.background   = css;
        if (swatch) swatch.style.background = css;
    }

    _renderContent() {
        const area = this._q('content-area');
        if (!area) return;
        area.innerHTML = '';
        // Всегда рендерим градиентный интерфейс (даже с одной точкой)
        this._renderGradientContent(area);
    }

    // =========================================================================
    // РЕЖИМ GRADIENT (всегда)
    // =========================================================================

    _renderGradientContent(container) {
        const uid = this._uid;
        container.innerHTML = `
            <div style="padding:4px 18px 16px;">
                <!-- Тип градиента -->
                <div style="margin-bottom:12px;">
                    <div style="color:#888;font-size:0.72em;font-weight:700;letter-spacing:.7px;font-family:'Exo 2',sans-serif;margin-bottom:5px;">ТИП ГРАДИЕНТА</div>
                    <div style="display:flex;gap:8px;">
                        <button id="${uid}-type-linear" style="flex:1;padding:6px;border-radius:5px;cursor:pointer;font-size:0.8em;font-family:'Exo 2',sans-serif;">Линейный</button>
                        <button id="${uid}-type-radial" style="flex:1;padding:6px;border-radius:5px;cursor:pointer;font-size:0.8em;font-family:'Exo 2',sans-serif;">Радиальный</button>
                    </div>
                </div>

                <!-- Параметры линейного -->
                <div id="${uid}-linear-params" style="display:none;margin-bottom:12px;">
                    <div style="color:#888;font-size:0.72em;font-weight:700;letter-spacing:.7px;font-family:'Exo 2',sans-serif;margin-bottom:5px;">УГОЛ ГРАДИЕНТА</div>
                    <div style="display:flex;gap:10px;align-items:center;">
                        <input type="range" id="${uid}-grad-angle" min="0" max="360" value="${this.angle}" style="flex:1;accent-color:#d4af37;background:transparent;">
                        <input type="number" id="${uid}-grad-angle-num" min="0" max="360" value="${this.angle}" style="width:58px;background:#0a0a0a;border:1px solid #333;color:#ddd;padding:4px 6px;border-radius:4px;font-size:0.8em;text-align:center;">
                        <span style="color:#666;font-size:0.8em;">°</span>
                    </div>
                </div>

                <!-- Параметры радиального -->
                <div id="${uid}-radial-params" style="display:none;margin-bottom:12px;">
                    <div style="display:flex;gap:8px;margin-bottom:8px;">
                        <button id="${uid}-shape-circle" style="flex:1;padding:6px;border-radius:5px;cursor:pointer;font-size:0.8em;">Круг</button>
                        <button id="${uid}-shape-ellipse" style="flex:1;padding:6px;border-radius:5px;cursor:pointer;font-size:0.8em;">Эллипс</button>
                    </div>
                    <select id="${uid}-radial-position" style="width:100%;background:#111;border:1px solid #333;color:#ddd;padding:6px;border-radius:5px;font-size:0.8em;">
                        ${['center','top','bottom','left','right','top left','top right','bottom left','bottom right'].map(v=>`<option value="${v}"${v===this.radialPosition?' selected':''}>${v}</option>`).join('')}
                    </select>
                </div>

                <!-- Полоса стопов -->
                <div style="margin-bottom:12px;">
                    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
                        <span style="color:#888;font-size:0.72em;font-weight:700;letter-spacing:.7px;font-family:'Exo 2',sans-serif;">ЦВЕТОВЫЕ СТОПЫ</span>
                        <button id="${uid}-add-stop" style="background:rgba(76,209,55,0.15);border:1px solid #4cd137;color:#4cd137;padding:3px 10px;border-radius:4px;cursor:pointer;font-size:0.75em;">+ Добавить</button>
                    </div>
                    <div style="position:relative;height:36px;margin-bottom:6px;">
                        <div id="${uid}-gradient-bar" style="height:100%;border-radius:5px;border:1.5px solid #333;"></div>
                        <div id="${uid}-stops-container" style="position:absolute;top:0;left:0;right:0;height:100%;pointer-events:none;"></div>
                    </div>
                </div>

                <!-- Редактор выбранного стопа -->
                <div id="${uid}-stop-editor" style="background:#0d0d0d;border:1px solid #2a2a2a;border-radius:6px;padding:12px;"></div>
            </div>
        `;

        this._initGradientEvents();
        this._updateGradientUI();
        this._renderStops();
        this._renderStopEditor();
    }

    _initGradientEvents() {
        const u = this._uid;

        const typeLin = this._root.querySelector(`#${u}-type-linear`);
        const typeRad = this._root.querySelector(`#${u}-type-radial`);
        if (typeLin) typeLin.onclick = () => { this.gradientType = 'linear'; this._updateGradientUI(); this._updateGlobalPreview(); };
        if (typeRad) typeRad.onclick = () => { this.gradientType = 'radial'; this._updateGradientUI(); this._updateGlobalPreview(); };

        const angSlider = this._root.querySelector(`#${u}-grad-angle`);
        const angNum    = this._root.querySelector(`#${u}-grad-angle-num`);
        if (angSlider) angSlider.oninput = () => { this.angle = parseInt(angSlider.value); if(angNum) angNum.value = this.angle; this._updateGlobalPreview(); };
        if (angNum)    angNum.oninput    = () => { this.angle = parseInt(angNum.value)||0; if(angSlider) angSlider.value = this.angle; this._updateGlobalPreview(); };

        const shpCirc = this._root.querySelector(`#${u}-shape-circle`);
        const shpElli = this._root.querySelector(`#${u}-shape-ellipse`);
        if (shpCirc) shpCirc.onclick = () => { this.radialShape = 'circle'; this._updateRadialShapeUI(); this._updateGlobalPreview(); };
        if (shpElli) shpElli.onclick = () => { this.radialShape = 'ellipse'; this._updateRadialShapeUI(); this._updateGlobalPreview(); };

        const radPos = this._root.querySelector(`#${u}-radial-position`);
        if (radPos) radPos.onchange = e => { this.radialPosition = e.target.value; this._updateGlobalPreview(); };

        const addStop = this._root.querySelector(`#${u}-add-stop`);
        if (addStop) addStop.onclick = () => this._addColorStop();
    }

    _updateGradientUI() {
        const u = this._uid;
        const isLin = this.gradientType === 'linear';
        const on  = 'background:#d4af37;color:#000;border:none;';
        const off = 'background:#1a1a1a;color:#666;border:1px solid #2a2a2a;';

        const typeLin = this._root.querySelector(`#${u}-type-linear`);
        const typeRad = this._root.querySelector(`#${u}-type-radial`);
        if (typeLin) typeLin.style.cssText += (isLin ? on : off);
        if (typeRad) typeRad.style.cssText += (isLin ? off : on);

        const linP = this._root.querySelector(`#${u}-linear-params`);
        const radP = this._root.querySelector(`#${u}-radial-params`);
        if (linP) linP.style.display = isLin ? 'block' : 'none';
        if (radP) radP.style.display = isLin ? 'none' : 'block';

        if (!isLin) this._updateRadialShapeUI();
    }

    _updateRadialShapeUI() {
        const u = this._uid;
        const isCirc = this.radialShape === 'circle';
        const on  = 'background:#d4af37;color:#000;border:none;padding:6px;border-radius:5px;cursor:pointer;font-size:0.8em;flex:1;';
        const off = 'background:#1a1a1a;color:#666;border:1px solid #2a2a2a;padding:6px;border-radius:5px;cursor:pointer;font-size:0.8em;flex:1;';
        const shpCirc = this._root.querySelector(`#${u}-shape-circle`);
        const shpElli = this._root.querySelector(`#${u}-shape-ellipse`);
        if (shpCirc) shpCirc.style.cssText = isCirc ? on : off;
        if (shpElli) shpElli.style.cssText = isCirc ? off : on;
    }

    _renderStops() {
        const u = this._uid;
        const cont = this._root.querySelector(`#${u}-stops-container`);
        const bar  = this._root.querySelector(`#${u}-gradient-bar`);
        if (!cont) return;

        cont.innerHTML = '';
        cont.style.pointerEvents = 'auto';
        this.colorStops.forEach((stop, index) => {
            const el = document.createElement('div');
            el.style.cssText = `
                position:absolute;left:${stop.position}%;top:50%;
                transform:translate(-50%,-50%);
                width:18px;height:18px;border-radius:50%;
                background:${stop.color};
                border:2.5px solid ${index === this.selectedStopIndex ? '#d4af37' : '#fff'};
                cursor:pointer;box-shadow:0 2px 8px rgba(0,0,0,0.6);
                transition:border-color 0.15s;z-index:${index === this.selectedStopIndex ? 2 : 1};
            `;
            el.title = stop.color;
            el.onclick = e => { e.stopPropagation(); this.selectedStopIndex = index; this._renderStops(); this._renderStopEditor(); };
            el.onmousedown = e => { e.stopPropagation(); this._startDragStop(e, index); };
            cont.appendChild(el);
        });

        if (bar) {
            const sorted = [...this.colorStops].sort((a,b)=>a.position-b.position);
            bar.style.background = `linear-gradient(to right, ${sorted.map(s=>{
                const rgb = this._hexToRgb(s.color);
                return `rgba(${rgb.r},${rgb.g},${rgb.b},${s.alpha}) ${s.position}%`;
            }).join(', ')})`;
        }
    }

    _startDragStop(e, index) {
        e.preventDefault();
        const u = this._uid;
        const bar = this._root.querySelector(`#${u}-gradient-bar`);
        if (!bar) return;
        const barRect = bar.getBoundingClientRect();
        this.isDragging = true;

        const onMove = mv => {
            if (!this.isDragging) return;
            const x = mv.clientX - barRect.left;
            this.colorStops[index].position = Math.max(0, Math.min(100, Math.round((x / barRect.width) * 100)));
            this._renderStops();
            this._renderStopEditor();
            this._updateGlobalPreview();
        };
        const onUp = () => {
            this.isDragging = false;
            document.removeEventListener('mousemove', onMove);
            document.removeEventListener('mouseup', onUp);
        };
        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onUp);
    }

    _renderStopEditor() {
        const u = this._uid;
        const editor = this._root.querySelector(`#${u}-stop-editor`);
        if (!editor) return;
        const stop = this.colorStops[this.selectedStopIndex];
        if (!stop) return;

        const rgb = this._hexToRgb(stop.color);

        editor.innerHTML = `
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
                <span style="color:#888;font-size:0.75em;font-family:'Exo 2',sans-serif;">
                    СТОП ${this.selectedStopIndex+1} / ${this.colorStops.length}
                </span>
                ${this.colorStops.length > 1 ? `<button id="${u}-del-stop" style="background:rgba(232,65,24,0.15);border:1px solid #e84118;color:#e84118;padding:3px 10px;border-radius:4px;cursor:pointer;font-size:0.75em;">✕ Удалить</button>` : ''}
            </div>
            <!-- Кнопка выбора цвета -->
            <button id="${u}-pick-stop-color" style="width:100%;background:#1a1a1a;border:1px solid #333;color:#ddd;padding:8px;border-radius:6px;display:flex;align-items:center;gap:10px;cursor:pointer;margin-bottom:10px;transition:border-color 0.2s;">
                <span style="display:inline-block;width:22px;height:22px;border-radius:4px;border:1px solid #555;background:rgba(${rgb.r},${rgb.g},${rgb.b},${stop.alpha});flex-shrink:0;"></span>
                <span style="font-size:0.82em;font-family:'Exo 2',sans-serif;">Выбрать цвет…</span>
                <span style="margin-left:auto;font-family:monospace;font-size:0.78em;color:#666;">${stop.color} / α${Math.round(stop.alpha*100)}%</span>
            </button>
            <!-- Прозрачность -->
            <div style="margin-bottom:8px;">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:3px;">
                    <span style="color:#888;font-size:0.72em;font-family:'Exo 2',sans-serif;">ПРОЗРАЧНОСТЬ</span>
                    <span id="${u}-stop-alpha-disp" style="color:#d4af37;font-size:0.75em;font-family:monospace;">${Math.round(stop.alpha*100)}%</span>
                </div>
                <div style="position:relative;height:14px;">
                    <div style="position:absolute;inset:0;border-radius:7px;background:linear-gradient(to right, transparent, ${stop.color});pointer-events:none;"></div>
                    <input type="range" id="${u}-stop-alpha" min="0" max="1" step="0.01" value="${stop.alpha}"
                        style="position:absolute;inset:0;width:100%;opacity:0;cursor:pointer;height:14px;z-index:2;">
                    <div style="position:absolute;inset:0;border-radius:7px;border:1px solid #2a2a2a;pointer-events:none;"></div>
                </div>
            </div>
            <!-- Позиция -->
            <div>
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:3px;">
                    <span style="color:#888;font-size:0.72em;font-family:'Exo 2',sans-serif;">ПОЗИЦИЯ</span>
                    <input type="number" id="${u}-stop-pos-num" min="0" max="100" value="${stop.position}"
                        style="width:52px;background:#0a0a0a;border:1px solid #333;color:#d4af37;padding:2px 5px;border-radius:4px;font-size:0.8em;text-align:center;">
                </div>
                <input type="range" id="${u}-stop-pos" min="0" max="100" value="${stop.position}" style="width:100%;accent-color:#d4af37;">
            </div>
        `;

        const delBtn = this._root.querySelector(`#${u}-del-stop`);
        if (delBtn) delBtn.onclick = () => {
            // Можно удалить только если останется хотя бы одна точка
            if (this.colorStops.length <= 1) return;
            this.colorStops.splice(this.selectedStopIndex, 1);
            this.selectedStopIndex = Math.min(this.selectedStopIndex, this.colorStops.length - 1);
            this._renderStops(); this._renderStopEditor(); this._updateGlobalPreview();
        };

        const pickBtn = this._root.querySelector(`#${u}-pick-stop-color`);
        if (pickBtn) pickBtn.onclick = () => this._openNestedColorPicker(stop);

        const alphaSlider = this._root.querySelector(`#${u}-stop-alpha`);
        const alphaDisp   = this._root.querySelector(`#${u}-stop-alpha-disp`);
        if (alphaSlider) alphaSlider.oninput = () => {
            stop.alpha = parseFloat(alphaSlider.value);
            if (alphaDisp) alphaDisp.textContent = Math.round(stop.alpha*100)+'%';
            this._renderStops(); this._updateGlobalPreview();
        };

        const posSlider = this._root.querySelector(`#${u}-stop-pos`);
        const posNum    = this._root.querySelector(`#${u}-stop-pos-num`);
        if (posSlider) posSlider.oninput = () => {
            stop.position = parseInt(posSlider.value);
            if (posNum) posNum.value = stop.position;
            this._renderStops(); this._updateGlobalPreview();
        };
        if (posNum) posNum.oninput = () => {
            stop.position = Math.max(0, Math.min(100, parseInt(posNum.value)||0));
            if (posSlider) posSlider.value = stop.position;
            this._renderStops(); this._updateGlobalPreview();
        };
    }

    _addColorStop() {
        const sorted = [...this.colorStops].sort((a,b)=>a.position-b.position);
        let newPos = 50, newColor = '#888888', newAlpha = 1;
        if (sorted.length >= 2) {
            let maxGap = 0, maxIdx = 0;
            for (let i = 0; i < sorted.length-1; i++) {
                const g = sorted[i+1].position - sorted[i].position;
                if (g > maxGap) { maxGap = g; maxIdx = i; }
            }
            newPos = Math.round((sorted[maxIdx].position + sorted[maxIdx+1].position) / 2);
            const factor = maxGap === 0 ? 0.5 : (newPos - sorted[maxIdx].position) / (sorted[maxIdx+1].position - sorted[maxIdx].position);
            const rgb1 = this._hexToRgb(sorted[maxIdx].color);
            const rgb2 = this._hexToRgb(sorted[maxIdx+1].color);
            newColor  = this._rgbToHex(rgb1.r+(rgb2.r-rgb1.r)*factor, rgb1.g+(rgb2.g-rgb1.g)*factor, rgb1.b+(rgb2.b-rgb1.b)*factor);
            newAlpha  = sorted[maxIdx].alpha + (sorted[maxIdx+1].alpha - sorted[maxIdx].alpha) * factor;
        }
        this.colorStops.push({ color: newColor, alpha: newAlpha, position: newPos });
        this.selectedStopIndex = this.colorStops.length - 1;
        this._renderStops(); this._renderStopEditor(); this._updateGlobalPreview();
    }

    // =========================================================================
    // ВЛОЖЕННЫЙ ПИКЕР для редактирования стопа градиента
    // =========================================================================

    _openNestedColorPicker(stop) {
        const parsed = this._parseColor(`rgba(${this._hexToRgb(stop.color).r},${this._hexToRgb(stop.color).g},${this._hexToRgb(stop.color).b},${stop.alpha})`);
        const tempColor = { hex: parsed.hex, alpha: parsed.alpha };

        const overlay = document.createElement('div');
        overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.92);z-index:30000;display:flex;justify-content:center;align-items:center;backdrop-filter:blur(4px);';
        const win = document.createElement('div');
        win.style.cssText = 'background:#141414;border:1.5px solid #d4af37;border-radius:12px;width:520px;max-width:94vw;padding:18px;box-shadow:0 0 40px rgba(212,175,55,0.3);';

        const title = document.createElement('div');
        title.style.cssText = 'color:#d4af37;font-weight:700;font-size:0.9em;font-family:"Exo 2",sans-serif;letter-spacing:1px;margin-bottom:14px;';
        title.textContent = '🎨 ВЫБОР ЦВЕТА ДЛЯ СТОПА';

        const pickerHost = document.createElement('div');

        const btns = document.createElement('div');
        btns.style.cssText = 'display:flex;gap:10px;margin-top:16px;';
        const cancelBtn = document.createElement('button');
        cancelBtn.textContent = 'Отмена';
        cancelBtn.style.cssText = 'flex:1;background:transparent;border:1px solid #444;color:#999;padding:8px;border-radius:6px;cursor:pointer;font-size:0.85em;';
        const okBtn = document.createElement('button');
        okBtn.textContent = '✓ OK';
        okBtn.style.cssText = 'flex:2;background:linear-gradient(135deg,#d4af37,#b8962e);border:none;color:#000;padding:8px;border-radius:6px;cursor:pointer;font-weight:700;font-size:0.85em;';

        btns.append(cancelBtn, okBtn);
        win.append(title, pickerHost, btns);
        overlay.appendChild(win);
        document.body.appendChild(overlay);

        // Создаём пикер — здесь используем новый экземпляр с собственным _uid-пространством
        const nestedUid = 'gp' + (++_gpInstanceCounter);
        this._createColorPickerUI(pickerHost, tempColor, () => {}, nestedUid);

        cancelBtn.onclick = () => overlay.remove();
        okBtn.onclick = () => {
            stop.color = tempColor.hex;
            stop.alpha = tempColor.alpha;
            this._addToHistory(`rgba(${this._hexToRgb(stop.color).r},${this._hexToRgb(stop.color).g},${this._hexToRgb(stop.color).b},${stop.alpha})`);
            this._renderStops();
            this._renderStopEditor();
            this._updateGlobalPreview();
            overlay.remove();
        };
        overlay.addEventListener('mousedown', e => { if (e.target === overlay) overlay.remove(); });
    }

    // =========================================================================
    // УНИВЕРСАЛЬНЫЙ UI ПИКЕРА ЦВЕТА (HSV)
    // =========================================================================

    /**
     * Встраивает полный пикер цвета в контейнер.
     * @param {HTMLElement} container  — куда вставить
     * @param {Object} colorState      — { hex: '#rrggbb', alpha: 0-1 }
     * @param {Function} onChange      — вызывается при каждом изменении
     * @param {number} [overrideUid]   — опциональный уникальный ID (для вложенного использования)
     */
    _createColorPickerUI(container, colorState, onChange, overrideUid) {
        const uid = overrideUid != null ? overrideUid : this._uid;
        container.innerHTML = '';

        // Флаг: показывать колесо вместо/рядом с полем SV
        let showWheel = false;

        // Переменные для хранения ссылок на текущие элементы управления
        let svControls = null;          // для квадрата
        let svWheelControls = null;     // для колеса

        // ── Флажок переключения вида ──────────────────────────────────────────
        const modeSwitchRow = document.createElement('div');
        modeSwitchRow.style.cssText = 'display:flex;gap:14px;margin:8px 0 6px;align-items:center;';
        modeSwitchRow.innerHTML = `
            <label id="${uid}-lbl-sq" style="display:flex;align-items:center;gap:5px;cursor:pointer;user-select:none;font-size:0.78em;color:#888;">
                <input type="checkbox" id="${uid}-mode-sq" checked style="cursor:pointer;accent-color:#d4af37;width:13px;height:13px;">
                📐 Квадрат SV
            </label>
            <label id="${uid}-lbl-wh" style="display:flex;align-items:center;gap:5px;cursor:pointer;user-select:none;font-size:0.78em;color:#888;">
                <input type="checkbox" id="${uid}-mode-wh" style="cursor:pointer;accent-color:#d4af37;width:13px;height:13px;">
                🎡 Цветовой круг
            </label>
        `;
        container.appendChild(modeSwitchRow);

        // ── Хост для квадрата или колеса ────────────────────────────────────
        const pickerHost = document.createElement('div');
        pickerHost.id = `${uid}-picker-host`;
        pickerHost.style.cssText = 'position:relative;margin-bottom:12px;';
        container.appendChild(pickerHost);

        // ── Ползунок оттенка (Hue) ────────────────────────────────────────────
        const hueWrap = document.createElement('div');
        hueWrap.style.cssText = 'margin-bottom:10px;';
        hueWrap.innerHTML = `
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:3px;">
                <span style="color:#888;font-size:0.7em;font-family:'Exo 2',sans-serif;">ОТТЕНОК</span>
                <span id="${uid}-hue-disp" style="color:#ddd;font-size:0.75em;font-family:monospace;">0°</span>
            </div>
            <div style="position:relative;height:14px;">
                <div style="position:absolute;inset:0;border-radius:7px;background:linear-gradient(to right,#f00,#ff0,#0f0,#0ff,#00f,#f0f,#f00);pointer-events:none;"></div>
                <input type="range" id="${uid}-hue-slider" min="0" max="360" value="0"
                    style="position:absolute;inset:0;width:100%;opacity:0;cursor:pointer;height:14px;z-index:2;">
                <div id="${uid}-hue-thumb" style="position:absolute;top:50%;width:14px;height:14px;border-radius:50%;border:2px solid #fff;transform:translate(-50%,-50%);pointer-events:none;box-shadow:0 1px 4px rgba(0,0,0,0.5);background:#f00;"></div>
                <div style="position:absolute;inset:0;border-radius:7px;border:1px solid #2a2a2a;pointer-events:none;"></div>
            </div>
        `;
        container.appendChild(hueWrap);

        // ── Ползунок прозрачности (Alpha) ─────────────────────────────────────
        const alphaWrap = document.createElement('div');
        alphaWrap.style.cssText = 'margin-bottom:12px;';
        alphaWrap.innerHTML = `
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:3px;">
                <span style="color:#888;font-size:0.7em;font-family:'Exo 2',sans-serif;">ПРОЗРАЧНОСТЬ</span>
                <span id="${uid}-alpha-disp" style="color:#ddd;font-size:0.75em;font-family:monospace;">100%</span>
            </div>
            <div style="position:relative;height:14px;">
                <!-- шахматка под трек -->
                <div style="position:absolute;inset:0;border-radius:7px;background-image:linear-gradient(45deg,#555 25%,transparent 25%),linear-gradient(-45deg,#555 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#555 75%),linear-gradient(-45deg,transparent 75%,#555 75%);background-size:8px 8px;background-position:0 0,0 4px,4px -4px,-4px 0;pointer-events:none;"></div>
                <div id="${uid}-alpha-track" style="position:absolute;inset:0;border-radius:7px;pointer-events:none;"></div>
                <input type="range" id="${uid}-alpha-slider" min="0" max="100" value="100"
                    style="position:absolute;inset:0;width:100%;opacity:0;cursor:pointer;height:14px;z-index:2;">
                <div id="${uid}-alpha-thumb" style="position:absolute;top:50%;width:14px;height:14px;border-radius:50%;border:2px solid #fff;transform:translate(-50%,-50%);pointer-events:none;box-shadow:0 1px 4px rgba(0,0,0,0.5);"></div>
                <div style="position:absolute;inset:0;border-radius:7px;border:1px solid #2a2a2a;pointer-events:none;"></div>
            </div>
        `;
        container.appendChild(alphaWrap);

        // ── Поля ввода ─────────────────────────────────────────────────────────
        const inputsRow = document.createElement('div');
        inputsRow.style.cssText = 'display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px;margin-bottom:14px;';
        inputsRow.innerHTML = `
            <div>
                <div style="color:#666;font-size:0.65em;font-family:'Exo 2',sans-serif;margin-bottom:3px;">HEX</div>
                <input type="text" id="${uid}-hex-input" style="width:100%;background:#0a0a0a;border:1px solid #2a2a2a;color:#d4af37;padding:5px 6px;border-radius:4px;font-family:monospace;font-size:0.78em;outline:none;" maxlength="9">
            </div>
            <div>
                <div style="color:#666;font-size:0.65em;font-family:'Exo 2',sans-serif;margin-bottom:3px;">RGB</div>
                <input type="text" id="${uid}-rgb-input" style="width:100%;background:#0a0a0a;border:1px solid #2a2a2a;color:#ddd;padding:5px 6px;border-radius:4px;font-family:monospace;font-size:0.78em;outline:none;">
            </div>
            <div>
                <div style="color:#666;font-size:0.65em;font-family:'Exo 2',sans-serif;margin-bottom:3px;">RGBA</div>
                <input type="text" id="${uid}-rgba-input" style="width:100%;background:#0a0a0a;border:1px solid #2a2a2a;color:#ddd;padding:5px 6px;border-radius:4px;font-family:monospace;font-size:0.78em;outline:none;">
            </div>
        `;
        container.appendChild(inputsRow);

        // ── Цветовой образец ───────────────────────────────────────────────────
        const swatchRow = document.createElement('div');
        swatchRow.style.cssText = 'display:flex;align-items:center;gap:8px;margin-bottom:14px;';
        swatchRow.innerHTML = `
            <div id="${uid}-cur-swatch" style="width:36px;height:36px;border-radius:6px;border:2px solid #333;flex-shrink:0;"></div>
            <div style="flex:1;font-size:0.75em;color:#555;font-family:'Nunito Sans',sans-serif;">Текущий цвет</div>
        `;
        container.appendChild(swatchRow);

        // ── Палитры и история ──────────────────────────────────────────────────
        const palettesHost = document.createElement('div');
        palettesHost.id = `${uid}-palettes`;
        container.appendChild(palettesHost);

        const historyHost = document.createElement('div');
        historyHost.id = `${uid}-history`;
        container.appendChild(historyHost);

        // ── Получение DOM ──────────────────────────────────────────────────────
        const $ = id => container.querySelector('#' + uid + '-' + id);

        const hueSlider   = $('hue-slider');
        const hueThumb    = $('hue-thumb');
        const hueDisp     = $('hue-disp');
        const alphaSlider = $('alpha-slider');
        const alphaThumb  = $('alpha-thumb');
        const alphaDisp   = $('alpha-disp');
        const alphaTrack  = $('alpha-track');
        const hexInput    = $('hex-input');
        const rgbInput    = $('rgb-input');
        const rgbaInput   = $('rgba-input');
        const curSwatch   = $('cur-swatch');
        const sqCheck     = $('mode-sq');
        const whCheck     = $('mode-wh');

        const self = this;

        // Вычислить HSV из colorState
        const getHSV = () => {
            const { r, g, b } = self._hexToRgb(colorState.hex);
            const [h, s, v] = self._rgbToHsv(r, g, b);
            return { h, s, v };
        };

        // ── Рендер поля SV (квадрат) ──────────────────────────────────────────
        let svCanvas = null;

        const buildSvSquare = () => {
            pickerHost.innerHTML = '';
            const wrap = document.createElement('div');
            wrap.style.cssText = 'position:relative;width:100%;padding-top:55%;';

            const sv = document.createElement('div');
            sv.id = `${uid}-sv-area`;
            sv.style.cssText = `
                position:absolute;inset:0;
                border-radius:6px;cursor:crosshair;border:1.5px solid #333;
                background-image: linear-gradient(to bottom, transparent, #000),
                                  linear-gradient(to right, #fff, hsl(0,100%,50%));
            `;

            const cursor = document.createElement('div');
            cursor.id = `${uid}-sv-cursor`;
            cursor.style.cssText = 'position:absolute;width:14px;height:14px;border-radius:50%;border:2px solid #fff;box-shadow:0 0 0 1px rgba(0,0,0,0.5),0 2px 5px rgba(0,0,0,0.4);transform:translate(-50%,-50%);pointer-events:none;';

            sv.appendChild(cursor);
            wrap.appendChild(sv);
            pickerHost.appendChild(wrap);
            svCanvas = null;

            // Обновить фон по оттенку
            const updateSvBg = (h) => {
                sv.style.backgroundImage = `
                    linear-gradient(to bottom, transparent, #000),
                    linear-gradient(to right, #fff, hsl(${h},100%,50%))
                `;
            };

            // Установить курсор по текущему colorState
            const setSvCursor = () => {
                const { h, s, v } = getHSV();
                updateSvBg(h);
                cursor.style.left  = s + '%';
                cursor.style.top   = (100 - v) + '%';
            };

            // Mouse/touch обработка
            const onSvMove = (clientX, clientY) => {
                const rect = sv.getBoundingClientRect();
                const x = Math.max(0, Math.min(rect.width, clientX - rect.left));
                const y = Math.max(0, Math.min(rect.height, clientY - rect.top));
                const s = Math.round((x / rect.width) * 100);
                const v = Math.round((1 - y / rect.height) * 100);
                const { h } = getHSV();
                const rgb = self._hsvToRgb(h, s, v);
                colorState.hex = self._rgbToHex(rgb[0], rgb[1], rgb[2]);
                cursor.style.left = s + '%';
                cursor.style.top  = (100 - v) + '%';
                updateInputs();
                updateSliderThumbs();
                updateSwatch();
                if (onChange) onChange(colorState);
                if (overrideUid == null) self._updateGlobalPreview();
            };

            sv.addEventListener('mousedown', e => {
                e.preventDefault();
                onSvMove(e.clientX, e.clientY);
                const mm = mv => onSvMove(mv.clientX, mv.clientY);
                const mu = () => { document.removeEventListener('mousemove', mm); document.removeEventListener('mouseup', mu); };
                document.addEventListener('mousemove', mm);
                document.addEventListener('mouseup', mu);
            });
            sv.addEventListener('touchstart', e => {
                e.preventDefault();
                const t = e.touches[0];
                onSvMove(t.clientX, t.clientY);
                const tm = tv => onSvMove(tv.touches[0].clientX, tv.touches[0].clientY);
                const tu = () => { sv.removeEventListener('touchmove', tm); sv.removeEventListener('touchend', tu); };
                sv.addEventListener('touchmove', tm, { passive: false });
                sv.addEventListener('touchend', tu);
            }, { passive: false });

            setSvCursor();
            return { setSvCursor, updateSvBg };
        };

        // ── Рендер цветового колеса (Canvas) ──────────────────────────────────
        const buildColorWheel = () => {
            pickerHost.innerHTML = '';
            const wrap = document.createElement('div');
            wrap.style.cssText = 'display:flex;gap:10px;align-items:center;justify-content:center;';

            // Canvas — колесо
            const canvas = document.createElement('canvas');
            const SIZE = 200;
            canvas.width = canvas.height = SIZE;
            canvas.style.cssText = `width:${SIZE}px;height:${SIZE}px;border-radius:50%;cursor:crosshair;flex-shrink:0;display:block;`;
            svCanvas = canvas;

            const ctx = canvas.getContext('2d');

            // Отрисовка колеса (H по углу, S по радиусу, V = 1)
            const drawWheel = (curV) => {
                const img = ctx.createImageData(SIZE, SIZE);
                const cx = SIZE/2, cy = SIZE/2, R = SIZE/2;
                for (let y = 0; y < SIZE; y++) {
                    for (let x = 0; x < SIZE; x++) {
                        const dx = x - cx, dy = y - cy;
                        const dist = Math.sqrt(dx*dx + dy*dy);
                        if (dist > R) continue;
                        const angle = (Math.atan2(dy, dx) + Math.PI * 2) % (Math.PI * 2);
                        const h = (angle / (Math.PI * 2)) * 360;
                        const s = (dist / R) * 100;
                        const [r, g, b] = self._hsvToRgb(h, s, curV);
                        const idx = (y * SIZE + x) * 4;
                        img.data[idx]   = r;
                        img.data[idx+1] = g;
                        img.data[idx+2] = b;
                        img.data[idx+3] = 255;
                    }
                }
                ctx.putImageData(img, 0, 0);
            };

            // Курсор на колесе
            const wheelCursor = document.createElement('div');
            wheelCursor.style.cssText = 'position:absolute;width:14px;height:14px;border-radius:50%;border:2px solid #fff;box-shadow:0 0 0 1.5px rgba(0,0,0,0.5);transform:translate(-50%,-50%);pointer-events:none;';

            const canvasWrap = document.createElement('div');
            canvasWrap.style.cssText = 'position:relative;flex-shrink:0;';
            canvasWrap.appendChild(canvas);
            canvasWrap.appendChild(wheelCursor);

            // Value-слайдер рядом с колесом
            const vWrap = document.createElement('div');
            vWrap.style.cssText = 'display:flex;flex-direction:column;align-items:center;gap:5px;height:'+SIZE+'px;';
            vWrap.innerHTML = `
                <span style="color:#888;font-size:0.65em;font-family:'Exo 2',sans-serif;">V</span>
                <div style="position:relative;flex:1;width:14px;border-radius:7px;overflow:hidden;border:1px solid #333;">
                    <div id="${uid}-wv-track" style="position:absolute;inset:0;border-radius:7px;"></div>
                    <input type="range" id="${uid}-wv-slider" min="0" max="100" orient="vertical"
                        style="writing-mode:vertical-lr;direction:rtl;width:100%;height:100%;opacity:0;cursor:pointer;position:absolute;inset:0;z-index:2;">
                </div>
                <span id="${uid}-wv-disp" style="color:#888;font-size:0.65em;font-family:monospace;"></span>
            `;

            wrap.append(canvasWrap, vWrap);
            pickerHost.appendChild(wrap);

            // Инициализация
            const { h: curH, s: curS, v: curV } = getHSV();
            const wvSlider = container.querySelector(`#${uid}-wv-slider`);
            const wvDisp   = container.querySelector(`#${uid}-wv-disp`);
            const wvTrack  = container.querySelector(`#${uid}-wv-track`);

            wvSlider.value = curV;
            if (wvDisp) wvDisp.textContent = curV;

            const updateWheelCursor = (h, s) => {
                const angle = (h / 360) * Math.PI * 2;
                const dist  = (s / 100) * SIZE / 2;
                const cx = SIZE/2, cy = SIZE/2;
                const x = cx + Math.cos(angle) * dist;
                const y = cy + Math.sin(angle) * dist;
                wheelCursor.style.left = x + 'px';
                wheelCursor.style.top  = y + 'px';
            };

            const refreshWheel = () => {
                const { h, s, v } = getHSV();
                drawWheel(v);
                updateWheelCursor(h, s);
                if (wvSlider) wvSlider.value = v;
                if (wvDisp) wvDisp.textContent = v;
                if (wvTrack) wvTrack.style.background = `linear-gradient(to bottom, hsl(${h},${s}%,50%), #000)`;
            };

            refreshWheel();

            const onWheelClick = (clientX, clientY) => {
                const rect = canvas.getBoundingClientRect();
                const dx = clientX - (rect.left + rect.width/2);
                const dy = clientY - (rect.top  + rect.height/2);
                const dist = Math.sqrt(dx*dx + dy*dy);
                const R = rect.width/2;
                if (dist > R) return;
                const angle = (Math.atan2(dy, dx) + Math.PI*2) % (Math.PI*2);
                const h = (angle / (Math.PI*2)) * 360;
                const s = (dist / R) * 100;
                const curV = getHSV().v;
                const rgb = self._hsvToRgb(h, s, curV);
                colorState.hex = self._rgbToHex(rgb[0], rgb[1], rgb[2]);
                updateWheelCursor(h, s);
                updateInputs();
                updateSliderThumbs();
                updateSwatch();
                if (onChange) onChange(colorState);
                if (overrideUid == null) self._updateGlobalPreview();
            };

            canvas.addEventListener('mousedown', e => {
                e.preventDefault();
                onWheelClick(e.clientX, e.clientY);
                const mm = mv => onWheelClick(mv.clientX, mv.clientY);
                const mu = () => { document.removeEventListener('mousemove', mm); document.removeEventListener('mouseup', mu); };
                document.addEventListener('mousemove', mm);
                document.addEventListener('mouseup', mu);
            });
            canvas.addEventListener('touchstart', e => {
                e.preventDefault();
                const t = e.touches[0];
                onWheelClick(t.clientX, t.clientY);
            }, { passive: false });

            if (wvSlider) {
                wvSlider.oninput = () => {
                    const { h, s } = getHSV();
                    const v = parseInt(wvSlider.value);
                    if (wvDisp) wvDisp.textContent = v;
                    const rgb = self._hsvToRgb(h, s, v);
                    colorState.hex = self._rgbToHex(rgb[0], rgb[1], rgb[2]);
                    drawWheel(v);
                    updateWheelCursor(h, s);
                    if (wvTrack) wvTrack.style.background = `linear-gradient(to bottom, hsl(${h},${s}%,50%), #000)`;
                    updateInputs();
                    updateSliderThumbs();
                    updateSwatch();
                    if (onChange) onChange(colorState);
                    if (overrideUid == null) self._updateGlobalPreview();
                };
            }

            svWheelControls = { refresh: refreshWheel };
        };

        // ── Обновление ползунков Hue и Alpha ──────────────────────────────────
        const updateSliderThumbs = () => {
            const { h } = getHSV();
            const rgb   = self._hexToRgb(colorState.hex);
            const alpha = colorState.alpha;

            // Hue thumb
            if (hueSlider && hueThumb) {
                hueSlider.value = h;
                if (hueDisp) hueDisp.textContent = h + '°';
                const pct = h / 360 * 100;
                hueThumb.style.left = pct + '%';
                hueThumb.style.background = `hsl(${h},100%,50%)`;
            }

            // Alpha thumb & track
            if (alphaSlider && alphaThumb) {
                alphaSlider.value = Math.round(alpha * 100);
                if (alphaDisp) alphaDisp.textContent = Math.round(alpha * 100) + '%';
                const aPct = alpha * 100;
                alphaThumb.style.left = aPct + '%';
                alphaThumb.style.background = `rgba(${rgb.r},${rgb.g},${rgb.b},${alpha})`;
                if (alphaTrack) alphaTrack.style.background = `linear-gradient(to right, transparent, rgb(${rgb.r},${rgb.g},${rgb.b}))`;
            }
        };

        // ── Обновление полей ввода ─────────────────────────────────────────────
        const updateInputs = () => {
            const rgb   = self._hexToRgb(colorState.hex);
            const alpha = colorState.alpha;
            if (hexInput) hexInput.value = colorState.hex + (alpha < 1 ? Math.round(alpha*255).toString(16).padStart(2,'0') : '');
            if (rgbInput)  rgbInput.value  = `${rgb.r},${rgb.g},${rgb.b}`;
            if (rgbaInput) rgbaInput.value = `rgba(${rgb.r},${rgb.g},${rgb.b},${alpha.toFixed(2)})`;
        };

        const updateSwatch = () => {
            const rgb = self._hexToRgb(colorState.hex);
            if (curSwatch) curSwatch.style.background = `rgba(${rgb.r},${rgb.g},${rgb.b},${colorState.alpha})`;
        };

        // Вызывается при любом изменении для синхронизации все элементов
        const syncAll = () => {
            updateSliderThumbs();
            updateInputs();
            updateSwatch();
            if (onChange) onChange(colorState);
            if (overrideUid == null) self._updateGlobalPreview();
        };

        // ── Построить начальный вид ────────────────────────────────────────────
        svControls = buildSvSquare();
        syncAll();

        // ── Переключение вида ──────────────────────────────────────────────────
        if (sqCheck) sqCheck.addEventListener('change', () => {
            if (sqCheck.checked && whCheck) whCheck.checked = false;
            if (!sqCheck.checked && whCheck && !whCheck.checked) { sqCheck.checked = true; return; }
            showWheel = !sqCheck.checked;
            if (showWheel) {
                buildColorWheel();
            } else {
                // --- ИСПРАВЛЕНИЕ: сохраняем ссылку на новый квадрат и восстанавливаем курсор ---
                svControls = buildSvSquare();
                syncAll();
                if (svControls && svControls.setSvCursor) svControls.setSvCursor();
            }
        });

        if (whCheck) whCheck.addEventListener('change', () => {
            if (whCheck.checked && sqCheck) sqCheck.checked = false;
            if (!whCheck.checked && sqCheck && !sqCheck.checked) { whCheck.checked = true; return; }
            showWheel = whCheck.checked;
            if (showWheel) {
                buildColorWheel();
            } else {
                svControls = buildSvSquare();
                syncAll();
                if (svControls && svControls.setSvCursor) svControls.setSvCursor();
            }
        });

        // ── Hue slider ────────────────────────────────────────────────────────
        if (hueSlider) hueSlider.addEventListener('input', () => {
            const newH = parseInt(hueSlider.value);
            const { s, v } = getHSV();
            const rgb = self._hsvToRgb(newH, s, v);
            colorState.hex = self._rgbToHex(rgb[0], rgb[1], rgb[2]);
            syncAll();
            // Обновить SV фон
            const svArea = container.querySelector(`#${uid}-sv-area`);
            if (svArea) {
                svArea.style.backgroundImage = `linear-gradient(to bottom, transparent, #000), linear-gradient(to right, #fff, hsl(${newH},100%,50%))`;
            }
            if (showWheel && svWheelControls) svWheelControls.refresh();
        });

        // ── Alpha slider ──────────────────────────────────────────────────────
        if (alphaSlider) alphaSlider.addEventListener('input', () => {
            colorState.alpha = parseInt(alphaSlider.value) / 100;
            syncAll();
        });

        // ── HEX input ─────────────────────────────────────────────────────────
        if (hexInput) hexInput.addEventListener('change', () => {
            const p = self._parseColor(hexInput.value);
            colorState.hex   = p.hex;
            colorState.alpha = p.alpha;
            syncAll();
            // обновить SV позицию и фон
            const { h } = getHSV();
            const svArea = container.querySelector(`#${uid}-sv-area`);
            if (svArea) svArea.style.backgroundImage = `linear-gradient(to bottom, transparent, #000), linear-gradient(to right, #fff, hsl(${h},100%,50%))`;
            const svCursor = container.querySelector(`#${uid}-sv-cursor`);
            if (svCursor) { const { s, v } = getHSV(); svCursor.style.left = s+'%'; svCursor.style.top = (100-v)+'%'; }
            if (showWheel && svWheelControls) svWheelControls.refresh();
        });

        // ── RGB input ─────────────────────────────────────────────────────────
        if (rgbInput) rgbInput.addEventListener('change', () => {
            const parts = rgbInput.value.split(',').map(s => parseInt(s.trim()));
            if (parts.length >= 3 && parts.every(n => !isNaN(n))) {
                colorState.hex = self._rgbToHex(parts[0], parts[1], parts[2]);
                syncAll();
                const { h } = getHSV();
                const svArea = container.querySelector(`#${uid}-sv-area`);
                if (svArea) svArea.style.backgroundImage = `linear-gradient(to bottom, transparent, #000), linear-gradient(to right, #fff, hsl(${h},100%,50%))`;
                const svCursor = container.querySelector(`#${uid}-sv-cursor`);
                if (svCursor) { const { s, v } = getHSV(); svCursor.style.left = s+'%'; svCursor.style.top = (100-v)+'%'; }
                if (showWheel && svWheelControls) svWheelControls.refresh();
            }
        });

        // ── RGBA input ────────────────────────────────────────────────────────
        if (rgbaInput) rgbaInput.addEventListener('change', () => {
            const p = self._parseColor(rgbaInput.value);
            colorState.hex   = p.hex;
            colorState.alpha = p.alpha;
            syncAll();
            const { h } = getHSV();
            const svArea = container.querySelector(`#${uid}-sv-area`);
            if (svArea) svArea.style.backgroundImage = `linear-gradient(to bottom, transparent, #000), linear-gradient(to right, #fff, hsl(${h},100%,50%))`;
            const svCursor = container.querySelector(`#${uid}-sv-cursor`);
            if (svCursor) { const { s, v } = getHSV(); svCursor.style.left = s+'%'; svCursor.style.top = (100-v)+'%'; }
            if (showWheel && svWheelControls) svWheelControls.refresh();
        });

        // ── Палитры ────────────────────────────────────────────────────────────
        this._renderPalettes(palettesHost, (colorStr) => {
            const p = self._parseColor(colorStr);
            colorState.hex   = p.hex;
            colorState.alpha = p.alpha;
            syncAll();
            const { h } = getHSV();
            const svArea = container.querySelector(`#${uid}-sv-area`);
            if (svArea) svArea.style.backgroundImage = `linear-gradient(to bottom, transparent, #000), linear-gradient(to right, #fff, hsl(${h},100%,50%))`;
            const svCursor = container.querySelector(`#${uid}-sv-cursor`);
            if (svCursor) { const { s, v } = getHSV(); svCursor.style.left = s+'%'; svCursor.style.top = (100-v)+'%'; }
            if (showWheel && svWheelControls) svWheelControls.refresh();
        }, uid);

        // ── История ────────────────────────────────────────────────────────────
        this._renderHistory(historyHost, (colorStr) => {
            const p = self._parseColor(colorStr);
            colorState.hex   = p.hex;
            colorState.alpha = p.alpha;
            syncAll();
            const { h } = getHSV();
            const svArea = container.querySelector(`#${uid}-sv-area`);
            if (svArea) svArea.style.backgroundImage = `linear-gradient(to bottom, transparent, #000), linear-gradient(to right, #fff, hsl(${h},100%,50%))`;
            const svCursor = container.querySelector(`#${uid}-sv-cursor`);
            if (svCursor) { const { s, v } = getHSV(); svCursor.style.left = s+'%'; svCursor.style.top = (100-v)+'%'; }
            if (showWheel && svWheelControls) svWheelControls.refresh();
        }, uid);
    }

    // =========================================================================
    // Палитры и История
    // =========================================================================

    _renderPalettes(container, onClick, uid) {
        if (!container) return;
        container.innerHTML = '';
        const title = document.createElement('div');
        title.style.cssText = 'color:#666;font-size:0.7em;font-family:"Exo 2",sans-serif;letter-spacing:.6px;margin:6px 0 5px;';
        title.textContent = '🎨 ПАЛИТРЫ';
        container.appendChild(title);

        for (const [name, colors] of Object.entries(this.palettes)) {
            const section = document.createElement('div');
            section.style.marginBottom = '6px';

            const label = document.createElement('div');
            label.style.cssText = 'color:#555;font-size:0.65em;margin-bottom:3px;font-family:"Exo 2",sans-serif;';
            label.textContent = name;

            const row = document.createElement('div');
            row.style.cssText = 'display:flex;flex-wrap:wrap;gap:3px;';
            colors.forEach(c => {
                const el = document.createElement('div');
                el.style.cssText = `width:22px;height:22px;border-radius:4px;background:${c};border:1.5px solid #2a2a2a;cursor:pointer;transition:all 0.15s;flex-shrink:0;`;
                el.title = c;
                el.onmouseenter = () => { el.style.transform='scale(1.2)'; el.style.borderColor='#d4af37'; el.style.zIndex='2'; };
                el.onmouseleave = () => { el.style.transform=''; el.style.borderColor='#2a2a2a'; el.style.zIndex=''; };
                el.onclick = () => onClick(c);
                row.appendChild(el);
            });

            section.append(label, row);
            container.appendChild(section);
        }
    }

    _renderHistory(container, onClick, uid) {
        if (!container || this.history.length === 0) return;
        container.innerHTML = '';
        const title = document.createElement('div');
        title.style.cssText = 'color:#666;font-size:0.7em;font-family:"Exo 2",sans-serif;letter-spacing:.6px;margin:8px 0 5px;';
        title.textContent = '🕐 НЕДАВНИЕ';
        container.appendChild(title);

        const row = document.createElement('div');
        row.style.cssText = 'display:flex;flex-wrap:wrap;gap:3px;';
        this.history.forEach(c => {
            const el = document.createElement('div');
            el.style.cssText = `width:22px;height:22px;border-radius:4px;background:${c};border:1.5px solid #2a2a2a;cursor:pointer;transition:all 0.15s;flex-shrink:0;`;
            el.title = c;
            el.onmouseenter = () => { el.style.transform='scale(1.2)'; el.style.borderColor='#d4af37'; el.style.zIndex='2'; };
            el.onmouseleave = () => { el.style.transform=''; el.style.borderColor='#2a2a2a'; el.style.zIndex=''; };
            el.onclick = () => onClick(c);
            row.appendChild(el);
        });
        container.appendChild(row);
    }
}

// Совместимость с импортом
export { GradientPicker as GradientPickerPro };