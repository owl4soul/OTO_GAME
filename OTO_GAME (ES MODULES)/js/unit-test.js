// ===============================================================
// Модуль: debug-ui.js - Отладочный UI для просмотра и копирования состояния
// ===============================================================
// Адаптирован под State 5.1. Отображает все поля четырёх разделов:
// game, hero, ui, settings. Поддерживает сворачивание/разворачивание.
// Стиль: индастриал-готика, стеклянный, компактный, кроваво-чёрный.
// Добавлены кнопки копирования для каждого раздела.
// История закомментирована (не удалена).
// Глобальные команды: debugUI(), d().
// ===============================================================

'use strict';

import { State } from './3-state.js';
import { Utils } from './2-utils.js';

// ============================================================================
// ФУНКЦИИ ГЕНЕРАЦИИ ТЕКСТА (ПОЛНОЕ СОСТОЯНИЕ И РАЗДЕЛЫ)
// ============================================================================

/**
 * Генерирует текстовое представление всего состояния (для копирования)
 * @returns {string}
 */
function generateFullDebugText() {
    const state = State.getState();
    const lines = [];

    lines.push('='.repeat(60));
    lines.push('📱 ПОЛНОЕ СОСТОЯНИЕ ИГРЫ (State 5.1)');
    lines.push('='.repeat(60));

    // Общая информация (корневые поля)
    lines.push(`🆔 Game ID: ${state.game.id}`);
    lines.push(`🔄 Ход: ${state.game.turnCount}`);
    lines.push(`🎮 Тип игры: ${state.game.type}`);
    lines.push(`📦 Всего game_item в герое: ${state.hero.items.length}`);
    lines.push(`🧠 Мыслей в очереди: ${state.hero.thoughts.length}`);
    // lines.push(`📜 История: ${state.game.history.length} записей`); // история закомментирована
    lines.push(`✨ Бессмертие: ${state.hero.immortal ? 'ДА' : 'нет'}`);
    lines.push(`💾 Версия состояния: ${state.version}`);
    lines.push(`🕒 Последнее сохранение: ${state.lastSaveTime}`);
    lines.push('');

    // ---- РАЗДЕЛ GAME ----
    lines.push('📁 РАЗДЕЛ GAME:');
    lines.push(`  id: ${state.game.id}`);
    lines.push(`  type: ${state.game.type}`);
    lines.push(`  turnCount: ${state.game.turnCount}`);
    lines.push(`  summary: ${state.game.summary || '""'}`);
    // lines.push(`  history (${state.game.history.length} записей):`); // история закомментирована
    // state.game.history.forEach((entry, i) => {
    //     lines.push(`    [${i}] turn: ${entry.turn}, choice: ${entry.choice}, fullText: ${(entry.fullText || '').substring(0, 100)}…`);
    // });

    // Текущая сцена
    lines.push(`  currentScene:`);
    const scene = state.game.currentScene;
    if (scene) {
        lines.push(`    scene: ${(scene.scene || '').substring(0, 200)}…`);
        lines.push(`    reflection: ${scene.reflection || '""'}`);
        lines.push(`    typology: ${scene.typology || '""'}`);
        lines.push(`    personality: ${scene.personality || '""'}`);
        lines.push(`    design_notes: ${scene.design_notes || '""'}`);
        lines.push(`    choices (${scene.choices?.length || 0}):`);
        if (scene.choices) {
            scene.choices.forEach((c, i) => {
                lines.push(`      [${i}] text: ${c.text}, difficulty: ${c.difficulty_level}`);
                if (c.requirements?.length) lines.push(`        requirements: ${JSON.stringify(c.requirements)}`);
                if (c.success_rewards?.length) lines.push(`        success_rewards: ${JSON.stringify(c.success_rewards)}`);
                if (c.fail_penalties?.length) lines.push(`        fail_penalties: ${JSON.stringify(c.fail_penalties)}`);
            });
        }
        lines.push(`    events (${scene.events?.length || 0}):`);
        if (scene.events) {
            scene.events.forEach((e, i) => {
                lines.push(`      [${i}] type: ${e.type}, description: ${e.description}, reason: ${e.reason}, effects: ${JSON.stringify(e.effects)}`);
            });
        }
        lines.push(`    aiMemory: ${JSON.stringify(scene.aiMemory || {}, null, 2).replace(/\n/g, '\n    ')}`);
    } else {
        lines.push(`    null`);
    }

    // Иерархии организаций
    lines.push(`  organizationsHierarchy:`);
    const orgs = state.game.organizationsHierarchy || {};
    if (Object.keys(orgs).length === 0) {
        lines.push(`    {}`);
    } else {
        Object.entries(orgs).forEach(([orgId, hierarchy]) => {
            lines.push(`    ${orgId}: ${JSON.stringify(hierarchy, null, 2).replace(/\n/g, '\n      ')}`);
        });
    }

    // Мета-поля
    lines.push(`  meta:`);
    const meta = state.game.meta || {};
    lines.push(`    context: ${meta.context || '""'}`);
    lines.push(`    unknownFields (${meta.unknownFields?.length || 0}):`);
    if (meta.unknownFields) {
        meta.unknownFields.forEach((f, i) => lines.push(`      [${i}] key: ${f.key}, value: ${JSON.stringify(f.value)}`));
    }
    lines.push(`    unknownArrays (${meta.unknownArrays?.length || 0}):`);
    if (meta.unknownArrays) {
        meta.unknownArrays.forEach((a, i) => lines.push(`      [${i}] ${JSON.stringify(a)}`));
    }
    lines.push(`    unknownObjects (${meta.unknownObjects?.length || 0}):`);
    if (meta.unknownObjects) {
        meta.unknownObjects.forEach((o, i) => lines.push(`      [${i}] ${JSON.stringify(o)}`));
    }
    lines.push('');

    // ---- РАЗДЕЛ HERO ----
    lines.push('🦸 РАЗДЕЛ HERO:');
    lines.push(`  immortal: ${state.hero.immortal}`);
    lines.push(`  thoughts (${state.hero.thoughts.length}):`);
    state.hero.thoughts.forEach((t, i) => lines.push(`    [${i}] ${t}`));
    lines.push(`  ritual: active=${state.hero.ritual.active}, progress=${state.hero.ritual.progress}, target=${state.hero.ritual.target}`);
    lines.push(`  items (game_item) (${state.hero.items.length}):`);
    // Группировка по типам
    const groups = {};
    state.hero.items.forEach(item => {
        const type = item.id.split(':')[0];
        if (!groups[type]) groups[type] = [];
        groups[type].push(item);
    });
    Object.keys(groups).sort().forEach(type => {
        lines.push(`    📁 ${type} (${groups[type].length}):`);
        groups[type].forEach(item => {
            lines.push(`      • ${item.id}: value=${item.value}`);
            const extra = Object.keys(item).filter(k => !['id', 'value'].includes(k));
            extra.forEach(k => {
                const v = typeof item[k] === 'object' ? JSON.stringify(item[k]) : item[k];
                lines.push(`          ${k}: ${v}`);
            });
        });
    });
    lines.push('');

    // ---- РАЗДЕЛ UI ----
    lines.push('🖥️ РАЗДЕЛ UI:');
    lines.push(`  layout:`);
    const layout = state.ui.layout;
    lines.push(`    hTop: ${layout.hTop}`);
    lines.push(`    hMid: ${layout.hMid}`);
    lines.push(`    hBot: ${layout.hBot}`);
    lines.push(`    wBotLeft: ${layout.wBotLeft}`);
    lines.push(`    isCollapsed: ${layout.isCollapsed}`);
    lines.push(`    isAutoCollapsed: ${layout.isAutoCollapsed}`);
    lines.push(`    hBotBeforeCollapse: ${layout.hBotBeforeCollapse}`);
    lines.push(`  freeMode:`);
    lines.push(`    enabled: ${state.ui.freeMode.enabled}`);
    lines.push(`    text: ${state.ui.freeMode.text || '""'}`);
    lines.push(`  selectedActions: ${JSON.stringify(state.ui.selectedActions)}`);
    lines.push(`  pendingRequest: ${state.ui.pendingRequest ? JSON.stringify(state.ui.pendingRequest) : 'null'}`);
    lines.push(`  turnDisplay:`);
    lines.push(`    statChanges: ${JSON.stringify(state.ui.turnDisplay.statChanges)}`);
    lines.push(`    updates: ${state.ui.turnDisplay.updates ? state.ui.turnDisplay.updates.substring(0, 200) + '…' : '""'}`);
    lines.push('');

    // ---- РАЗДЕЛ SETTINGS ----
    lines.push('⚙️ РАЗДЕЛ SETTINGS:');
    lines.push(`  apiProvider: ${state.settings.apiProvider}`);
    lines.push(`  apiKeyOpenrouter: ${state.settings.apiKeyOpenrouter ? '***' + state.settings.apiKeyOpenrouter.slice(-4) : '""'}`);
    lines.push(`  apiKeyVsegpt: ${state.settings.apiKeyVsegpt ? '***' + state.settings.apiKeyVsegpt.slice(-4) : '""'}`);
    lines.push(`  model: ${state.settings.model}`);
    lines.push(`  scale: ${state.settings.scale}`);
    lines.push(`  scaleIndex: ${state.settings.scaleIndex}`);
    lines.push(`  models (${state.settings.models.length}):`);
    state.settings.models.forEach((m, i) => {
        lines.push(`    [${i}] id: ${m.id}, name: ${m.name}, status: ${m.status}, context: ${m.context}, maxTokens: ${m.maxTokens}, price: ${m.price}`);
    });
    lines.push('');

    lines.push('='.repeat(60));
    lines.push('✅ КОНЕЦ ДАМПА');
    return lines.join('\n');
}

/**
 * Генерирует текст только для раздела GAME
 */
function generateGameSectionText() {
    const state = State.getState();
    const lines = [];
    lines.push(`id: ${state.game.id}`);
    lines.push(`type: ${state.game.type}`);
    lines.push(`turnCount: ${state.game.turnCount}`);
    lines.push(`summary: ${state.game.summary || '""'}`);
    // lines.push(`history (${state.game.history.length} записей):`); // история закомментирована
    // state.game.history.forEach((entry, i) => {
    //     lines.push(`  [${i}] turn: ${entry.turn}, choice: ${entry.choice}, fullText: ${(entry.fullText || '').substring(0, 100)}…`);
    // });
    lines.push(`aiMemory: ${JSON.stringify(state.game.currentScene.aiMemory, null, 2).replace(/\n/g, '\n  ')}`);
    lines.push(`currentScene:`);
    const scene = state.game.currentScene;
    if (scene) {
        lines.push(`  scene: ${(scene.scene || '').substring(0, 200)}…`);
        lines.push(`  reflection: ${scene.reflection || '""'}`);
        lines.push(`  typology: ${scene.typology || '""'}`);
        lines.push(`  personality: ${scene.personality || '""'}`);
        lines.push(`  design_notes: ${scene.design_notes || '""'}`);
        lines.push(`  choices (${scene.choices?.length || 0}):`);
        if (scene.choices) {
            scene.choices.forEach((c, i) => {
                lines.push(`    [${i}] text: ${c.text}, difficulty: ${c.difficulty_level}`);
                if (c.requirements?.length) lines.push(`      requirements: ${JSON.stringify(c.requirements)}`);
                if (c.success_rewards?.length) lines.push(`      success_rewards: ${JSON.stringify(c.success_rewards)}`);
                if (c.fail_penalties?.length) lines.push(`      fail_penalties: ${JSON.stringify(c.fail_penalties)}`);
            });
        }
        lines.push(`  events (${scene.events?.length || 0}):`);
        if (scene.events) {
            scene.events.forEach((e, i) => {
                lines.push(`    [${i}] type: ${e.type}, description: ${e.description}, reason: ${e.reason}, effects: ${JSON.stringify(e.effects)}`);
            });
        }
        lines.push(`  aiMemory: ${JSON.stringify(scene.aiMemory || {}, null, 2).replace(/\n/g, '\n    ')}`);
    } else {
        lines.push(`  null`);
    }
    lines.push(`organizationsHierarchy:`);
    const orgs = state.game.organizationsHierarchy || {};
    if (Object.keys(orgs).length === 0) {
        lines.push(`  {}`);
    } else {
        Object.entries(orgs).forEach(([orgId, hierarchy]) => {
            lines.push(`  ${orgId}: ${JSON.stringify(hierarchy, null, 2).replace(/\n/g, '\n    ')}`);
        });
    }
    lines.push(`meta:`);
    const meta = state.game.meta || {};
    lines.push(`  context: ${meta.context || '""'}`);
    lines.push(`  unknownFields (${meta.unknownFields?.length || 0}):`);
    if (meta.unknownFields) {
        meta.unknownFields.forEach((f, i) => lines.push(`    [${i}] key: ${f.key}, value: ${JSON.stringify(f.value)}`));
    }
    lines.push(`  unknownArrays (${meta.unknownArrays?.length || 0}):`);
    if (meta.unknownArrays) {
        meta.unknownArrays.forEach((a, i) => lines.push(`    [${i}] ${JSON.stringify(a)}`));
    }
    lines.push(`  unknownObjects (${meta.unknownObjects?.length || 0}):`);
    if (meta.unknownObjects) {
        meta.unknownObjects.forEach((o, i) => lines.push(`    [${i}] ${JSON.stringify(o)}`));
    }
    return lines.join('\n');
}

/**
 * Генерирует текст только для раздела HERO
 */
function generateHeroSectionText() {
    const state = State.getState();
    const lines = [];
    lines.push(`immortal: ${state.hero.immortal}`);
    lines.push(`thoughts (${state.hero.thoughts.length}):`);
    state.hero.thoughts.forEach((t, i) => lines.push(`  [${i}] ${t}`));
    lines.push(`ritual: active=${state.hero.ritual.active}, progress=${state.hero.ritual.progress}, target=${state.hero.ritual.target}`);
    lines.push(`items (game_item) (${state.hero.items.length}):`);
    const groups = {};
    state.hero.items.forEach(item => {
        const type = item.id.split(':')[0];
        if (!groups[type]) groups[type] = [];
        groups[type].push(item);
    });
    Object.keys(groups).sort().forEach(type => {
        lines.push(`  📁 ${type} (${groups[type].length}):`);
        groups[type].forEach(item => {
            lines.push(`    • ${item.id}: value=${item.value}`);
            const extra = Object.keys(item).filter(k => !['id', 'value'].includes(k));
            extra.forEach(k => {
                const v = typeof item[k] === 'object' ? JSON.stringify(item[k]) : item[k];
                lines.push(`        ${k}: ${v}`);
            });
        });
    });
    return lines.join('\n');
}

/**
 * Генерирует текст только для раздела UI
 */
function generateUISectionText() {
    const state = State.getState();
    const lines = [];
    lines.push(`layout:`);
    const layout = state.ui.layout;
    lines.push(`  hTop: ${layout.hTop}`);
    lines.push(`  hMid: ${layout.hMid}`);
    lines.push(`  hBot: ${layout.hBot}`);
    lines.push(`  wBotLeft: ${layout.wBotLeft}`);
    lines.push(`  isCollapsed: ${layout.isCollapsed}`);
    lines.push(`  isAutoCollapsed: ${layout.isAutoCollapsed}`);
    lines.push(`  hBotBeforeCollapse: ${layout.hBotBeforeCollapse}`);
    lines.push(`freeMode:`);
    lines.push(`  enabled: ${state.ui.freeMode.enabled}`);
    lines.push(`  text: ${state.ui.freeMode.text || '""'}`);
    lines.push(`selectedActions: ${JSON.stringify(state.ui.selectedActions)}`);
    lines.push(`pendingRequest: ${state.ui.pendingRequest ? JSON.stringify(state.ui.pendingRequest) : 'null'}`);
    lines.push(`turnDisplay:`);
    lines.push(`  statChanges: ${JSON.stringify(state.ui.turnDisplay.statChanges)}`);
    lines.push(`  updates: ${state.ui.turnDisplay.updates ? state.ui.turnDisplay.updates.substring(0, 200) + '…' : '""'}`);
    return lines.join('\n');
}

/**
 * Генерирует текст только для раздела SETTINGS
 */
function generateSettingsSectionText() {
    const state = State.getState();
    const lines = [];
    lines.push(`apiProvider: ${state.settings.apiProvider}`);
    lines.push(`apiKeyOpenrouter: ${state.settings.apiKeyOpenrouter ? '***' + state.settings.apiKeyOpenrouter.slice(-4) : '""'}`);
    lines.push(`apiKeyVsegpt: ${state.settings.apiKeyVsegpt ? '***' + state.settings.apiKeyVsegpt.slice(-4) : '""'}`);
    lines.push(`model: ${state.settings.model}`);
    lines.push(`scale: ${state.settings.scale}`);
    lines.push(`scaleIndex: ${state.settings.scaleIndex}`);
    lines.push(`models (${state.settings.models.length}):`);
    state.settings.models.forEach((m, i) => {
        lines.push(`  [${i}] id: ${m.id}, name: ${m.name}, status: ${m.status}, context: ${m.context}, maxTokens: ${m.maxTokens}, price: ${m.price}`);
    });
    return lines.join('\n');
}

// ============================================================================
// МОДАЛЬНОЕ ОКНО (СТЕКЛЯННЫЙ КОМПАКТНЫЙ ДИЗАЙН, КРОВАВО-ЧЁРНЫЙ)
// ============================================================================

function openDebugModal() {
    const fullText = generateFullDebugText();
    const state = State.getState();

    // Затемнённый фон с размытием
    const modal = document.createElement('div');
    modal.id = 'oto-debug-modal';
    Object.assign(modal.style, {
        position: 'fixed',
        top: '0',
        left: '0',
        width: '100%',
        height: '100%',
        background: 'rgba(0,0,0,0.7)',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
        zIndex: '20000',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        fontFamily: '"Courier New", monospace',
        fontSize: '12px',
        lineHeight: '1.3',
        color: '#ccc',
    });

    // Стеклянный контейнер
    const container = document.createElement('div');
    Object.assign(container.style, {
        background: 'rgba(10, 10, 10, 0.92)',
        border: '1px solid rgba(139, 0, 0, 0.6)',
        borderRadius: '6px',
        width: '90%',
        maxWidth: '1200px',
        height: '90%',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        boxShadow: '0 0 20px rgba(0,0,0,0.8), 0 0 0 1px rgba(180, 30, 30, 0.2) inset',
    });

    // Шапка (тонкая, тёмная)
    const header = document.createElement('div');
    Object.assign(header.style, {
        background: 'rgba(20, 20, 20, 0.9)',
        padding: '6px 12px',
        borderBottom: '1px solid #8B0000',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexShrink: '0',
    });
    header.innerHTML = `
        <span style="color:#b30000; font-weight:600; font-size:13px; letter-spacing:1px; text-transform:uppercase;">
            🐞 ОТЛАДКА STATE 5.1
        </span>
        <div style="display:flex; gap:8px;">
            <button id="debug-copy-btn" style="
                background: transparent;
                border: 1px solid #5a1e1e;
                color: #ccc;
                padding: 3px 10px;
                border-radius: 3px;
                cursor: pointer;
                font-size: 11px;
                font-weight: 500;
                transition: 0.15s;
                line-height: 1.4;
            ">📋 КОПИРОВАТЬ ВСЁ</button>
            <button id="debug-close-btn" style="
                background: transparent;
                border: 1px solid #5a1e1e;
                color: #ccc;
                padding: 3px 10px;
                border-radius: 3px;
                cursor: pointer;
                font-size: 11px;
                font-weight: 500;
                transition: 0.15s;
                line-height: 1.4;
            ">✕ ЗАКРЫТЬ</button>
        </div>
    `;

    // Контейнер для разделов (scroll)
    const sectionsWrapper = document.createElement('div');
    Object.assign(sectionsWrapper.style, {
        flex: '1',
        overflowY: 'auto',
        padding: '8px 10px',
        background: 'rgba(0,0,0,0.3)',
        scrollbarWidth: 'thin',
        scrollbarColor: '#8B0000 #1a1a1a',
    });

    // Стилизация скролла (webkit) и компактных details
    const style = document.createElement('style');
    style.textContent = `
        #oto-debug-modal ::-webkit-scrollbar {
            width: 6px;
            height: 6px;
        }
        #oto-debug-modal ::-webkit-scrollbar-track {
            background: #1a1a1a;
        }
        #oto-debug-modal ::-webkit-scrollbar-thumb {
            background: #8B0000;
            border-radius: 3px;
        }
        #oto-debug-modal details {
            margin-bottom: 6px;
            border: 1px solid #2a2a2a;
            border-radius: 4px;
            background: rgba(20,20,20,0.7);
        }
        #oto-debug-modal summary {
            padding: 5px 10px;
            cursor: pointer;
            color: #d4af37;
            font-weight: 600;
            font-size: 12px;
            letter-spacing: 0.5px;
            background: rgba(30,30,30,0.8);
            border-bottom: 1px solid #8B0000;
            border-radius: 4px 4px 0 0;
            user-select: none;
            list-style: none;
            display: flex;
            align-items: center;
            justify-content: space-between;
        }
        #oto-debug-modal summary::-webkit-details-marker {
            color: #8B0000;
            font-size: 11px;
            margin-right: 6px;
        }
        #oto-debug-modal details[open] summary {
            border-bottom-color: #b30000;
            background: rgba(40,40,40,0.9);
        }
        #oto-debug-modal .section-copy-btn {
            background: transparent;
            border: 1px solid #5a1e1e;
            color: #ccc;
            padding: 2px 6px;
            border-radius: 3px;
            cursor: pointer;
            font-size: 10px;
            font-weight: 400;
            transition: 0.15s;
            line-height: 1.2;
            margin-left: 8px;
        }
        #oto-debug-modal .section-copy-btn:hover {
            background: #8B0000;
            border-color: #b30000;
            color: #fff;
        }
        #oto-debug-modal pre {
            margin: 0;
            padding: 8px 10px;
            background: #0d0d0d;
            color: #bebebe;
            font-size: 11px;
            line-height: 1.4;
            white-space: pre-wrap;
            word-wrap: break-word;
            border-left: 2px solid #8B0000;
            border-radius: 0 0 4px 4px;
            font-family: 'Courier New', monospace;
        }
        #oto-debug-modal .info-line {
            background: rgba(139, 0, 0, 0.15);
            padding: 5px 10px;
            margin-bottom: 8px;
            border-left: 3px solid #b30000;
            font-size: 11px;
            color: #aaa;
            border-radius: 0 4px 4px 0;
        }
    `;
    document.head.appendChild(style);

    // Краткая информация (компактная строка)
    const infoDiv = document.createElement('div');
    infoDiv.className = 'info-line';
    infoDiv.innerHTML = `
        <strong style="color:#b30000;">ID:</strong> ${state.game.id} |
        <strong style="color:#b30000;">ХОД:</strong> ${state.game.turnCount} |
        <strong style="color:#b30000;">ТИП:</strong> ${state.game.type} |
        <strong style="color:#b30000;">items:</strong> ${state.hero.items.length} |
        <strong style="color:#b30000;">мысли:</strong> ${state.hero.thoughts.length} |
        <strong style="color:#b30000;">бессмертие:</strong> ${state.hero.immortal ? 'ДА' : 'НЕТ'} |
        <strong style="color:#b30000;">версия:</strong> ${state.version}
    `;
    sectionsWrapper.appendChild(infoDiv);

    // Массив с данными разделов
    const sections = [
        { title: '📁 GAME', content: generateGameSectionText(), defaultOpen: true },
        { title: '🦸 HERO', content: generateHeroSectionText(), defaultOpen: true },
        { title: '🖥️ UI', content: generateUISectionText(), defaultOpen: true },
        { title: '⚙️ SETTINGS', content: generateSettingsSectionText(), defaultOpen: true },
    ];

    // Функция создания раздела с кнопкой копирования
    function createSectionWithCopy(sectionData) {
        const details = document.createElement('details');
        if (sectionData.defaultOpen) details.open = true;

        const summary = document.createElement('summary');
        // Левый блок: маркер и заголовок
        const leftSpan = document.createElement('span');
        leftSpan.textContent = sectionData.title;

        // Правая кнопка копирования
        const copyBtn = document.createElement('button');
        copyBtn.className = 'section-copy-btn';
        copyBtn.textContent = '📋';
        copyBtn.title = 'Копировать содержимое раздела';
        copyBtn.addEventListener('click', (e) => {
            e.stopPropagation(); // чтобы не сворачивался раздел при клике на кнопку
            navigator.clipboard.writeText(sectionData.content).then(() => {
                Utils.showToast('Раздел скопирован', 'success', 1000);
            }).catch(err => {
                Utils.showToast('Ошибка', 'error', 1000);
                console.error(err);
            });
        });

        summary.appendChild(leftSpan);
        summary.appendChild(copyBtn);
        details.appendChild(summary);

        const pre = document.createElement('pre');
        pre.textContent = sectionData.content;
        details.appendChild(pre);

        return details;
    }

    // Добавляем разделы
    sections.forEach(s => sectionsWrapper.appendChild(createSectionWithCopy(s)));

    container.appendChild(header);
    container.appendChild(sectionsWrapper);
    modal.appendChild(container);
    document.body.appendChild(modal);

    // Обработчики кнопок (общая копия и закрытие)
    const closeBtn = document.getElementById('debug-close-btn');
    closeBtn.onclick = () => {
        document.body.removeChild(modal);
        document.head.removeChild(style); // опционально
    };
    const copyBtnGlobal = document.getElementById('debug-copy-btn');
    copyBtnGlobal.onclick = () => {
        navigator.clipboard.writeText(fullText).then(() => {
            Utils.showToast('Всё скопировано', 'success', 1500);
        }).catch(err => {
            Utils.showToast('Ошибка копирования', 'error', 1500);
            console.error(err);
        });
    };
    modal.addEventListener('click', (e) => {
        if (e.target === modal) document.body.removeChild(modal);
    });
}

// ============================================================================
// ГЛОБАЛЬНЫЕ КОМАНДЫ
// ============================================================================
if (typeof window !== 'undefined') {
    window.debugUI = openDebugModal;
    window.d = openDebugModal;
    window.stFull = () => {
        openDebugModal();
        return State.getState();
    };

    console.log(`
📱 ГЛОБАЛЬНЫЕ КОМАНДЫ ДЛЯ ОТЛАДКИ (ОБНОВЛЕНЫ ДЛЯ STATE 5.1):
• debugUI() / d()  - открыть модальное окно с полным состоянием, разделами и копированием
• stFull()         - то же самое (для обратной совместимости)
• st()             - полная информация в консоли (прежняя)
• s()              - краткая сводка в консоли
• stHero()         - детализация героя в консоли
• stFind("...")    - поиск в консоли
• stJson()         - экспорт JSON в консоль
• stPart('...')    - частичный просмотр
    `);
}

export const DebugUI = {
    open: openDebugModal,
    generateText: generateFullDebugText
};