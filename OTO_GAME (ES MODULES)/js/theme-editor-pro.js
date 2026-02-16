// js/theme-editor-pro.js
'use strict';

import { themeManagerPro } from './theme-pro.js';
// Подключаем только градиент-пикер (он же умеет работать и со сплошными цветами)
import { GradientPickerPro } from './gradient-picker-pro.js';
import { FONT_LIBRARY } from './theme-config-pro.js';

export class ThemeEditorPro {
    constructor() {
        this.activeTab = 'global';
        this.gradientPicker = new GradientPickerPro();  // единый пикер для всего
        this.historyStack = [];
        this.historyIndex = -1;
        
        // Human readable labels
        this.labels = {
            background: "Background",
            color: "Text Color",
            border: "Border",
            borderLeft: "Border Left",
            borderBottom: "Border Bottom",
            borderRadius: "Radius",
            fontFamily: "Font",
            fontSize: "Size",
            fontWeight: "Weight",
            padding: "Padding",
            margin: "Margin",
            boxShadow: "Shadow",
            titleColor: "Title Color",
            contentColor: "Content Color",
            keyColor: "Key Color",
            valueColor: "Value Color"
        };
    }

    open() {
        if (document.getElementById('te-overlay')) return;
        themeManagerPro.startEditing();
        this._pushHistory();
        this._render();
    }

    close() {
        const el = document.getElementById('te-overlay');
        if (el) el.remove();
    }

    // --- History Logic ---
    _pushHistory() {
        const state = JSON.stringify(themeManagerPro.getCurrentTheme());
        this.historyStack = this.historyStack.slice(0, this.historyIndex + 1);
        this.historyStack.push(state);
        this.historyIndex = this.historyStack.length - 1;
        this._updateNav();
    }

    _undo() {
        if (this.historyIndex > 0) {
            this.historyIndex--;
            themeManagerPro.setEditingTheme(JSON.parse(this.historyStack[this.historyIndex])); // Internal method update
            this._renderContent();
            this._updateNav();
        }
    }

    _redo() {
        if (this.historyIndex < this.historyStack.length - 1) {
            this.historyIndex++;
            themeManagerPro.setEditingTheme(JSON.parse(this.historyStack[this.historyIndex]));
            this._renderContent();
            this._updateNav();
        }
    }

    // --- Rendering ---

    _render() {
        const overlay = document.createElement('div');
        overlay.id = 'te-overlay';
        overlay.style.cssText = `
            position:fixed; top:0; left:0; width:100%; height:100%;
            background:rgba(0,0,0,0.85); z-index:11000;
            display:flex; justify-content:center; align-items:center;
            backdrop-filter:blur(5px); font-family:'Segoe UI', sans-serif; font-size:14px;
        `;

        const win = document.createElement('div');
        win.style.cssText = `
            width:90%; height:95%; background:#1a1a1a;
            border:1px solid #d4af37; border-radius:8px;
            display:flex; flex-direction:column; box-shadow:0 0 50px rgba(0,0,0,0.5);
        `;

        win.appendChild(this._createHeader());
        win.appendChild(this._createBody());
        win.appendChild(this._createFooter());

        overlay.appendChild(win);
        document.body.appendChild(overlay);
        this._updateNav();
    }

    _createHeader() {
        const h = document.createElement('div');
        h.style.cssText = "padding:12px 20px; background:#111; border-bottom:1px solid #333; display:flex; justify-content:space-between; align-items:center;";
        
        // Left
        const left = document.createElement('div');
        left.style.display = 'flex'; left.style.gap = '15px'; left.style.alignItems = 'center';
        left.innerHTML = `<div style="color:#d4af37; font-weight:bold; font-size:1.1em;">THEME EDITOR PRO</div>`;
        
        const presetSel = document.createElement('select');
        presetSel.style.cssText = "background:#222; color:#eee; border:1px solid #555; padding:4px; border-radius:4px;";
        themeManagerPro.getPresets().forEach(p => {
            const opt = document.createElement('option');
            opt.value = p.key;
            opt.text = p.name;
            if (p.isCurrent) opt.selected = true;
            presetSel.appendChild(opt);
        });
        presetSel.onchange = (e) => {
            if (confirm("Load preset? Unsaved changes will be lost.")) {
                themeManagerPro.loadPreset(e.target.value);
                themeManagerPro.startEditing(); // Restart edit session
                this._pushHistory();
                this._renderContent();
            }
        };
        left.appendChild(presetSel);
        h.appendChild(left);

        // Right
        const right = document.createElement('div');
        right.style.display = 'flex'; right.style.gap = '8px';
        
        const btnCss = "background:#333; color:#fff; border:1px solid #555; padding:4px 10px; cursor:pointer; border-radius:3px;";
        
        const undo = document.createElement('button');
        undo.id = 'te-undo'; undo.innerHTML = '↶ Undo'; undo.style.cssText = btnCss;
        undo.onclick = () => this._undo();
        
        const redo = document.createElement('button');
        redo.id = 'te-redo'; redo.innerHTML = '↷ Redo'; redo.style.cssText = btnCss;
        redo.onclick = () => this._redo();
        
        const imp = document.createElement('button');
        imp.innerHTML = '📤 Import'; imp.style.cssText = btnCss;
        imp.onclick = () => this._import();

        const exp = document.createElement('button');
        exp.innerHTML = '📥 Export'; exp.style.cssText = btnCss;
        exp.onclick = () => this._export();

        right.append(undo, redo, imp, exp);
        h.appendChild(right);
        
        return h;
    }

    _createBody() {
        const body = document.createElement('div');
        body.style.cssText = "flex:1; display:flex; overflow:hidden;";

        // Sidebar
        const sidebar = document.createElement('div');
        sidebar.id = 'te-sidebar';
        sidebar.style.cssText = "width:220px; background:#151515; border-right:1px solid #333; overflow-y:auto; display:flex; flex-direction:column;";
        
        const tabs = [
            {id:'global', label:'🌐 Global & Icons'},
            {id:'typography', label:'🔤 Typography'},
            {id:'scene', label:'🎬 Scene'},
            {id:'gameItems', label:'🎮 Game Items'},
            {id:'turnUpdates', label:'🔄 Turn Updates'},
            {id:'history', label:'📜 History Panel'}
        ];

        tabs.forEach(t => {
            const b = document.createElement('div');
            b.textContent = t.label;
            b.dataset.tab = t.id;
            b.style.cssText = `
                padding:12px 15px; cursor:pointer; border-bottom:1px solid #222; font-weight:500;
                color:${this.activeTab === t.id ? '#d4af37' : '#888'};
                background:${this.activeTab === t.id ? 'rgba(212,175,55,0.1)' : 'transparent'};
                border-left:3px solid ${this.activeTab === t.id ? '#d4af37' : 'transparent'};
            `;
            b.onclick = () => {
                this.activeTab = t.id;
                this._updateSidebarUI();
                this._renderContent();
            };
            sidebar.appendChild(b);
        });

        // Content
        const content = document.createElement('div');
        content.id = 'te-content';
        content.style.cssText = "flex:1; padding:20px; overflow-y:auto; background:#1a1a1a;";

        body.append(sidebar, content);
        setTimeout(() => this._renderContent(), 0);
        return body;
    }

    _updateSidebarUI() {
        const sb = document.getElementById('te-sidebar');
        Array.from(sb.children).forEach(c => {
            const active = c.dataset.tab === this.activeTab;
            c.style.color = active ? '#d4af37' : '#888';
            c.style.background = active ? 'rgba(212,175,55,0.1)' : 'transparent';
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
            c.innerHTML = '<div style="color:#555; text-align:center; padding:50px;">No configuration for this section</div>';
            return;
        }

        // Recursive render
        this._renderObject(c, sectionData, [this.activeTab]);
    }

    _renderObject(container, obj, path) {
        Object.entries(obj).forEach(([key, val]) => {
            const curPath = [...path, key];

            // Special handling for Global Icons
            if (key === 'icons' && path[0] === 'global') {
                this._renderIconSettings(container, val, curPath);
                return;
            }

            if (typeof val === 'object' && val !== null && !Array.isArray(val)) {
                // Group Header
                const group = document.createElement('div');
                group.style.cssText = "margin-bottom:20px; border:1px solid #333; background:#202020; border-radius:6px; overflow:hidden;";
                
                const header = document.createElement('div');
                header.textContent = key.replace(/([A-Z])/g, ' $1').toUpperCase();
                header.style.cssText = "padding:8px 12px; background:#252525; border-bottom:1px solid #333; font-weight:bold; color:#aaa; font-size:0.85em; letter-spacing:1px;";
                group.appendChild(header);

                const inner = document.createElement('div');
                inner.style.padding = "10px";
                
                this._renderObject(inner, val, curPath);
                group.appendChild(inner);
                container.appendChild(group);
            } else {
                // Field
                this._renderField(container, key, val, curPath);
            }
        });
    }

    _renderField(container, key, val, path) {
        const row = document.createElement('div');
        row.style.cssText = "display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;";

        const label = document.createElement('label');
        label.textContent = this.labels[key] || key;
        label.style.cssText = "color:#ccc; font-size:0.9em; flex:1;";
        
        const wrapper = document.createElement('div');
        wrapper.style.cssText = "flex:2; display:flex; gap:5px;";

        // SMART INPUT DETECTION
        let input;
        
        if (key.includes('fontFamily')) {
            // Font Selector
            input = this._createFontSelector(val, path);
        } else if (key.toLowerCase().includes('color') || key.includes('background')) {
            // ВСЕГДА используем градиент-пикер (он поддерживает и сплошные цвета)
            input = this._createGradientInput(val, path);
        } else {
            // Text Input
            input = document.createElement('input');
            input.type = 'text';
            input.value = val;
            input.style.cssText = "width:100%; background:#111; border:1px solid #444; color:#fff; padding:5px; border-radius:3px;";
            input.onchange = (e) => {
                themeManagerPro.updateSetting(path, e.target.value);
                this._pushHistory();
            };
        }

        wrapper.appendChild(input);
        row.append(label, wrapper);
        container.appendChild(row);
    }

    // --- Specialized Inputs ---

    _createFontSelector(val, path) {
        const sel = document.createElement('select');
        sel.style.cssText = "width:100%; background:#111; border:1px solid #444; color:#fff; padding:5px; border-radius:3px;";
        
        // Clean up current value to match keys (remove ' and , sans-serif)
        const cleanVal = val.replace(/['"]/g, '').split(',')[0].trim();

        // Add Fonts from Library
        Object.keys(FONT_LIBRARY).forEach(font => {
            const opt = document.createElement('option');
            opt.value = `'${font}', sans-serif`; // Standard fallback
            if (font === 'Roboto Mono') opt.value = `'${font}', monospace`;
            if (font === 'Cinzel' || font === 'Lora' || font === 'Playfair Display') opt.value = `'${font}', serif`;
            
            opt.text = font;
            if (cleanVal === font) opt.selected = true;
            sel.appendChild(opt);
        });

        // Add standard safe fonts
        ['Arial', 'Verdana', 'Helvetica', 'Times New Roman', 'Courier New'].forEach(f => {
            const opt = document.createElement('option');
            opt.value = `'${f}', sans-serif`;
            opt.text = f;
            if (cleanVal === f) opt.selected = true;
            sel.appendChild(opt);
        });

        sel.onchange = (e) => {
            themeManagerPro.updateSetting(path, e.target.value);
            this._pushHistory();
        };
        return sel;
    }

    /**
     * Универсальный инпут для цвета/градиента.
     * Всегда открывает GradientPickerPro, который позволяет
     * редактировать как градиенты, так и сплошные цвета.
     */
    _createGradientInput(val, path) {
        const group = document.createElement('div');
        group.style.cssText = "display:flex; gap:5px; width:100%;";

        // Текстовое поле для прямого ввода
        const txt = document.createElement('input');
        txt.value = val;
        txt.style.cssText = "flex:1; background:#111; border:1px solid #444; color:#fff; padding:5px; border-radius:3px; font-size:0.85em;";
        
        // Превью-блок (кликабелен)
        const prev = document.createElement('div');
        prev.style.cssText = `width:30px; height:30px; border:1px solid #555; background:${val}; cursor:pointer; border-radius:3px;`;
        
        // Всегда открываем GradientPickerPro
        prev.onclick = () => {
            this.gradientPicker.open(
                (newValue) => {
                    txt.value = newValue;
                    prev.style.background = newValue;
                    themeManagerPro.updateSetting(path, newValue);
                    this._pushHistory();
                },
                val // текущее значение
            );
        };

        // Если текст изменён вручную
        txt.onchange = (e) => {
            prev.style.background = e.target.value;
            themeManagerPro.updateSetting(path, e.target.value);
            this._pushHistory();
        };

        // Индикатор типа (чисто визуальная подсказка)
        const typeInd = document.createElement('div');
        typeInd.innerHTML = val.includes('gradient') ? '🌈' : '🎨';
        typeInd.style.cssText = "padding:5px; cursor:default; opacity:0.7;";
        typeInd.title = val.includes('gradient') ? "Gradient detected" : "Solid color detected";

        group.append(prev, txt, typeInd);
        return group;
    }

    _renderIconSettings(container, val, path) {
        const box = document.createElement('div');
        box.style.cssText = "background:rgba(212,175,55,0.05); border:1px solid #d4af37; padding:10px; border-radius:6px; margin-bottom:15px;";
        
        const title = document.createElement('div');
        title.innerHTML = "<b>ICON SYSTEM CONFIG</b>";
        title.style.cssText = "color:#d4af37; margin-bottom:10px; border-bottom:1px solid #d4af37; padding-bottom:5px;";
        box.appendChild(title);

        // Set Switch
        const row1 = document.createElement('div');
        row1.style.marginBottom = "10px";
        row1.innerHTML = `<label style="color:#ddd; margin-right:10px;">Icon Set:</label>`;
        const sel = document.createElement('select');
        sel.style.cssText = "background:#222; color:#fff; padding:5px; border:1px solid #444;";
        
        const o1 = document.createElement('option'); o1.value='fa'; o1.text="FontAwesome (Default)";
        const o2 = document.createElement('option'); o2.value='emoji'; o2.text="Emoji (Override)";
        if(val.set === 'fa') o1.selected=true; else o2.selected=true;
        
        sel.add(o1); sel.add(o2);
        sel.onchange = (e) => {
            themeManagerPro.updateSetting([...path, 'set'], e.target.value);
            this._pushHistory();
        };
        row1.appendChild(sel);
        box.appendChild(row1);

        // Emoji Filter
        const row2 = document.createElement('div');
        row2.innerHTML = `<label style="color:#ddd; margin-right:10px;">Emoji CSS Filter:</label>`;
        const inp = document.createElement('input');
        inp.type="text";
        inp.value = val.emojiFilter;
        inp.style.cssText = "background:#222; color:#fff; padding:5px; border:1px solid #444; width:150px;";
        inp.onchange = (e) => {
            themeManagerPro.updateSetting([...path, 'emojiFilter'], e.target.value);
            this._pushHistory();
        };
        row2.appendChild(inp);
        box.appendChild(row2);

        container.appendChild(box);
    }

    _createFooter() {
        const f = document.createElement('div');
        f.style.cssText = "padding:15px; background:#111; border-top:1px solid #333; display:flex; justify-content:flex-end; gap:10px;";
        
        const cancel = document.createElement('button');
        cancel.textContent = "DISCARD CHANGES";
        cancel.style.cssText = "background:transparent; border:1px solid #666; color:#aaa; padding:8px 15px; cursor:pointer;";
        cancel.onclick = () => { themeManagerPro.cancelChanges(); this.close(); };

        const save = document.createElement('button');
        save.textContent = "SAVE THEME";
        save.style.cssText = "background:#d4af37; border:none; color:#000; padding:8px 20px; font-weight:bold; cursor:pointer;";
        save.onclick = () => { themeManagerPro.saveChanges(); this.close(); };

        f.append(cancel, save);
        return f;
    }

    _updateNav() {
        const u = document.getElementById('te-undo');
        const r = document.getElementById('te-redo');
        if(u) { u.disabled = this.historyIndex <= 0; u.style.opacity = u.disabled ? 0.5 : 1; }
        if(r) { r.disabled = this.historyIndex >= this.historyStack.length - 1; r.style.opacity = r.disabled ? 0.5 : 1; }
    }

    _export() {
        const json = themeManagerPro.exportTheme();
        const blob = new Blob([json], {type:'application/json'});
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href=url; a.download='theme-pro.json'; a.click();
    }

    _import() {
        const i = document.createElement('input'); i.type='file';
        i.onchange = (e) => {
            const r = new FileReader();
            r.onload = (evt) => {
                if(themeManagerPro.importTheme(evt.target.result)) {
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