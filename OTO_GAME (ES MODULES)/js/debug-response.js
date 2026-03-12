// ====================================================================
// ФАЙЛ: debug-response.js
// ВЕРСИЯ: v4.0 — РАСШИРЕННЫЙ ДЕБАГГЕР (named queries, full export, tree JSON)
// ====================================================================
// ИЗМЕНЕНИЯ v4.0:
//   - Сохранение именованных запросов (Named Queries) в localStorage
//   - Экспорт полного лога парсинга: JSON / TXT / HTML
//   - Кнопка "Копировать дерево как JSON" в табе дерева
//   - Вкладка "Логи" показывает полный debugLog из Parser.getLastDebugLog()
//   - Исправлена опечатка closeDebu.gModal → closeDebugModal
//   - Расширенные примеры с операциями success_rewards/fail_penalties/effects
//   - Статистика операций по каждому choice в древовидном виде
// ====================================================================

'use strict';

import { Parser } from './parsing.js';
import { API } from './7-api-facade.js';
import { Game } from './6-game.js';
import { State } from './3-state.js';
import { Render } from './5-render.js';
import { log, LOG_CATEGORIES } from './logger.js';

// ============================================================================
// СОСТОЯНИЕ
// ============================================================================
let debugModalOverlay  = null;
let debugTextarea      = null;
let isProcessing       = false;
let originalSendAI     = null;
let lastSuccessfulJson = '';
let historyList        = JSON.parse(localStorage.getItem('debug_history') || '[]');
let savedQueries       = JSON.parse(localStorage.getItem('debug_saved_queries') || '{}');
let currentResult      = null;
let modalOpen          = false;

// ============================================================================
// ПРИМЕРЫ
// ============================================================================
const SAMPLE_RESPONSES = {
    minimal: JSON.stringify({
        scene: '<p>Тестовая сцена для проверки дебаггера.</p>',
        choices: [{
            text: 'Тестовый выбор',
            difficulty_level: 5,
            requirements: [],
            success_rewards: [],
            fail_penalties: []
        }],
        thoughts: ['Тестовая мысль'],
        summary: 'Тестовый саммари'
    }, null, 2),

    full: JSON.stringify({
        design_notes: 'Отладочная сцена с полным набором данных',
        scene: '<p>Полная сцена с событиями, мыслями и мета-памятью.</p>',
        reflection: 'Размышление героя об увиденном.',
        typology: 'INTJ — Стратег',
        personality: 'Осторожный, наблюдательный, склонный к анализу.',
        summary: 'Итоговый саммари хода',
        choices: [
            {
                text: 'Выбор 1: Атаковать противника',
                difficulty_level: 7,
                requirements: ['stat:will', 'stat:stealth'],
                success_rewards: [
                    { operation: 'MODIFY', id: 'stat:will', delta: 2, description: 'Уверенность возрастает' },
                    { operation: 'ADD', id: 'skill:combat', value: 'Базовый бой', description: 'Новый навык' }
                ],
                fail_penalties: [
                    { operation: 'MODIFY', id: 'stat:sanity', delta: -3, description: 'Тяжёлый удар' },
                    { operation: 'ADD', id: 'debuff:injury', value: -5, duration: 3, description: 'Ранение' }
                ]
            },
            {
                text: 'Выбор 2: Наблюдать издали',
                difficulty_level: 3,
                requirements: ['stat:stealth'],
                success_rewards: [
                    { operation: 'MODIFY', id: 'stat:influence', delta: 1 }
                ],
                fail_penalties: [
                    { operation: 'MODIFY', id: 'stat:stealth', delta: -1 }
                ]
            }
        ],
        events: [{
            type: 'discovery',
            description: 'Обнаружен зашифрованный документ',
            effects: [
                { operation: 'ADD', id: 'inventory:encrypted_doc', value: 'Зашифрованный документ', description: 'Неизвестное послание' }
            ],
            reason: 'Тщательный осмотр помещения'
        }],
        aiMemory: {
            location: 'Конспиративная квартира',
            key_characters: { frater_marsyas: 'Харизматичный лидер' },
            plot_hooks: ['Кто фигура в капюшоне?'],
            notes: 'Первое собрание под гонениями'
        },
        thoughts: ['Мысль 1', 'Мысль 2', 'Мысль 3'],
    }, null, 2),

    corrupted: `{
  "scene": "<p>Повреждённый JSON без закрывающей скобки",
  "choices": [{"text": "Выбор 1", "difficulty_level": 5, "success_rewards": [{"operation": "MODIFY", "id": "stat:will", "delta": 1}]`,

    with_operations: JSON.stringify({
        scene: '<p>Сцена с вложенными операциями для проверки парсинга.</p>',
        choices: [
            {
                text: 'Провести ритуал',
                difficulty_level: 8,
                requirements: ['stat:will', 'organization_rank:oto'],
                success_rewards: [
                    { operation: 'MODIFY', id: 'stat:sanity', delta: 5 },
                    { operation: 'MODIFY', id: 'organization_rank:oto', delta: 1 },
                    { operation: 'ADD', id: 'bless:ritual_protection', value: 10, duration: 5, description: 'Защита ритуала' }
                ],
                fail_penalties: [
                    { operation: 'MODIFY', id: 'stat:sanity', delta: -8 },
                    { operation: 'ADD', id: 'curse:ritual_failure', value: -5, duration: 3, description: 'Провал ритуала' }
                ]
            }
        ],
        events: [
            {
                type: 'curse_activation',
                description: 'Печать активировалась',
                effects: [
                    { operation: 'ADD', id: 'debuff:cursed_seal', value: -10, duration: 7, description: 'Проклятая печать' },
                    { operation: 'MODIFY', id: 'stat:will', delta: -3 }
                ],
                reason: 'Нарушение условий договора'
            }
        ],
        thoughts: ['Что я наделал?'],
        summary: 'Ритуал с непредвиденными последствиями'
    }, null, 2),
};

// ============================================================================
// ИНИЦИАЛИЗАЦИЯ
// ============================================================================
function initDebugResponse() {
    if (document.getElementById('debugResponseBtn')) return;

    const btn = document.createElement('button');
    btn.id    = 'debugResponseBtn';
    btn.innerHTML = '🐞';
    btn.title = 'Дебаггер v4.0 (Ctrl+Shift+D)';
    btn.style.cssText = `
        position:fixed; top:25px; left:15px;
        width:54px; height:54px; border-radius:50%;
        background:#111; color:#ffd700; opacity:70%;
        border:3px solid #ffd700; font-size:28px;
        z-index:99999; cursor:pointer;
        box-shadow:0 0 20px rgba(255,215,0,0.7);
        transition:opacity 0.3s;
        opacity: 30%;
    `;
    btn.addEventListener('mouseenter', () => btn.style.opacity = '100%');
    btn.addEventListener('mouseleave', () => btn.style.opacity = '70%');
    btn.addEventListener('click', openDebugModal);
    document.body.appendChild(btn);

    document.addEventListener('keydown', e => {
        if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'd') {
            e.preventDefault();
            openDebugModal();
        }
    });

    window.addEventListener('popstate', () => {
        if (modalOpen && debugModalOverlay) closeDebugModal(false);
    });

    lastSuccessfulJson = localStorage.getItem('debug_last_json') || SAMPLE_RESPONSES.full;
    console.log('🐞 [DebugResponse v4.0] инициализирован');
}

// ============================================================================
// ОТКРЫТИЕ МОДАЛЬНОГО ОКНА
// ============================================================================
function openDebugModal() {
    if (debugModalOverlay) {
        debugModalOverlay.style.display = 'flex';
        debugTextarea?.focus();
        return;
    }

    if (!modalOpen) { history.pushState({ modal: true }, ''); modalOpen = true; }

    const overlay = document.createElement('div');
    overlay.style.cssText = `
        position:fixed; inset:0; background:rgba(0,0,0,0.95);
        z-index:100000; display:flex; align-items:center; justify-content:center;
        backdrop-filter:blur(10px); padding:10px;
    `;

    overlay.innerHTML = `
    <div id="debugModal" style="
        width:100%; max-width:1200px; max-height:92vh;
        background:#1a1a1a; border:4px solid #d4af37; border-radius:16px;
        display:flex; flex-direction:column;
        box-shadow:0 0 50px rgba(212,175,55,0.6); overflow:hidden;
    ">
        <!-- Заголовок -->
        <div style="display:flex; justify-content:space-between; align-items:center;
                    padding:14px 22px; background:#1a1a1a; border-bottom:1px solid #444; flex-shrink:0;">
            <h2 style="margin:0; color:#d4af37; font-size:1.25rem;">🐞 ДЕБАГГЕР v4.0</h2>
            <button id="closeDebugBtn" style="background:none; border:none; color:#d4af37; font-size:32px; cursor:pointer; line-height:1;">×</button>
        </div>

        <!-- Прокручиваемый контент -->
        <div style="flex:1; overflow-y:auto; padding:14px 20px 20px;">

            <!-- Панель инструментов — строка 1 -->
            <div style="display:flex; gap:7px; flex-wrap:wrap; margin-bottom:8px;">
                <select id="sampleSelect" style="padding:7px; background:#222; color:#ddd; border:1px solid #555; border-radius:6px; min-width:160px;">
                    <option value="">— Примеры —</option>
                    <option value="minimal">Минимальный</option>
                    <option value="full">Полный (с choices+events)</option>
                    <option value="with_operations">С операциями</option>
                    <option value="corrupted">Повреждённый</option>
                </select>
                <select id="savedSelect" style="padding:7px; background:#222; color:#ddd; border:1px solid #555; border-radius:6px; min-width:180px;">
                    <option value="">— Сохранённые запросы —</option>
                </select>
                <button id="saveQueryBtn"   class="dbg-btn">💾 Сохранить запрос</button>
                <button id="deleteQueryBtn" class="dbg-btn">🗑️ Удалить запрос</button>
            </div>

            <!-- Панель инструментов — строка 2 -->
            <div style="display:flex; gap:7px; flex-wrap:wrap; margin-bottom:10px;">
                <button id="formatBtn"   class="dbg-btn">📐 Форматировать</button>
                <button id="loadFileBtn" class="dbg-btn">📂 Загрузить файл</button>
                <button id="clearBtn"    class="dbg-btn">🧹 Очистить</button>
                <button id="historyBtn"  class="dbg-btn">📜 История (${historyList.length})</button>
            </div>

            <!-- Textarea -->
            <textarea id="debugTextarea" style="
                width:100%; height:185px; background:#0a0a0a; color:#0f0;
                border:1px solid #444; border-radius:8px; padding:12px;
                font-size:13px; resize:vertical; font-family:monospace; box-sizing:border-box;
            ">${escapeHtml(lastSuccessfulJson)}</textarea>

            <!-- Вкладки -->
            <div style="margin-top:14px; border-bottom:1px solid #444; display:flex; gap:6px; flex-wrap:wrap;">
                <button class="debug-tab active-tab" data-tab="json">📦 JSON</button>
                <button class="debug-tab" data-tab="info">ℹ️ Parsing Info</button>
                <button class="debug-tab" data-tab="logs">📋 Логи</button>
                <button class="debug-tab" data-tab="tree">🌳 Дерево</button>
                <button class="debug-tab" data-tab="compare">⚖️ Сравнение</button>
            </div>

            <!-- Контент вкладок -->
            <div id="tabContent" style="
                margin-top:10px; min-height:180px; max-height:320px;
                overflow:auto; padding:12px; background:#111; border-radius:8px;
            ">
                <pre id="jsonPreview"    style="margin:0; white-space:pre-wrap; word-wrap:break-word;"></pre>
                <div id="infoPreview"    style="display:none;"></div>
                <div id="logsPreview"    style="display:none; font-family:monospace; font-size:12px; line-height:1.5;"></div>
                <div id="treePreview"    style="display:none; font-family:monospace; font-size:13px;"></div>
                <div id="comparePreview" style="display:none;">
                    <textarea id="compareTextarea" placeholder="Вставьте второй JSON для сравнения..."
                        style="width:100%; height:120px; background:#0a0a0a; color:#0f0; border:1px solid #444;
                               border-radius:8px; padding:8px; font-size:12px; box-sizing:border-box;"></textarea>
                    <button id="compareBtn" style="margin-top:8px; padding:8px 16px; background:#444; color:#fff; border:none; border-radius:6px; cursor:pointer;">🔍 Сравнить</button>
                    <div id="compareResult" style="margin-top:10px;"></div>
                </div>
            </div>

            <!-- Кнопки действий -->
            <div style="margin-top:16px; display:flex; gap:10px; flex-wrap:wrap;">
                <button id="quickParseBtn"    style="flex:1; min-width:140px; padding:13px; background:#444; color:#fff; border:none; border-radius:8px; cursor:pointer; font-weight:bold;">🔍 Парсинг</button>
                <button id="fullPipelineBtn"  style="flex:2; min-width:180px; padding:13px; background:#d4af37; color:#000; border:none; border-radius:8px; cursor:pointer; font-weight:bold;">🚀 Полный пайплайн</button>
                <button id="copyResultBtn"    style="flex:1; min-width:120px; padding:13px; background:#333; color:#fff; border:none; border-radius:8px; cursor:pointer;">📋 Копировать</button>
                <button id="exportMenuBtn"    style="flex:1; min-width:120px; padding:13px; background:#333; color:#fff; border:none; border-radius:8px; cursor:pointer;">📤 Экспорт ▾</button>
            </div>

            <!-- Меню экспорта (скрытое) -->
            <div id="exportMenu" style="display:none; margin-top:8px; gap:8px; flex-wrap:wrap; justify-content:flex-end;">
                <button class="dbg-btn" id="exportJsonBtn">📄 JSON (полный результат)</button>
                <button class="dbg-btn" id="exportInfoJsonBtn">📊 JSON (parsing_info)</button>
                <button class="dbg-btn" id="exportTxtBtn">📝 TXT (лог)</button>
                <button class="dbg-btn" id="exportHtmlBtn">🌐 HTML (отчёт)</button>
                <button class="dbg-btn" id="exportRawBtn">💾 Сохранить входной JSON</button>
            </div>
        </div>
    </div>
    `;

    document.body.appendChild(overlay);
    debugModalOverlay = overlay;
    debugTextarea     = overlay.querySelector('#debugTextarea');

    // Стили кнопок
    injectDebugStyles();

    // Вкладки
    overlay.querySelectorAll('.debug-tab').forEach(tab =>
        tab.addEventListener('click', () => switchTab(tab.dataset.tab))
    );

    // Привязка событий
    overlay.querySelector('#closeDebugBtn').addEventListener('click', () => closeDebugModal(true));
    overlay.querySelector('#formatBtn').addEventListener('click', formatJson);
    overlay.querySelector('#sampleSelect').addEventListener('change', loadSample);
    overlay.querySelector('#savedSelect').addEventListener('change', loadSavedQuery);
    overlay.querySelector('#saveQueryBtn').addEventListener('click', saveCurrentQuery);
    overlay.querySelector('#deleteQueryBtn').addEventListener('click', deleteSavedQuery);
    overlay.querySelector('#loadFileBtn').addEventListener('click', loadFile);
    overlay.querySelector('#clearBtn').addEventListener('click', clearAll);
    overlay.querySelector('#historyBtn').addEventListener('click', showHistory);
    overlay.querySelector('#quickParseBtn').addEventListener('click', runQuickParse);
    overlay.querySelector('#fullPipelineBtn').addEventListener('click', runFullPipeline);
    overlay.querySelector('#copyResultBtn').addEventListener('click', copyResult);
    overlay.querySelector('#exportMenuBtn').addEventListener('click', toggleExportMenu);
    overlay.querySelector('#exportJsonBtn').addEventListener('click', () => exportData('json-full'));
    overlay.querySelector('#exportInfoJsonBtn').addEventListener('click', () => exportData('json-info'));
    overlay.querySelector('#exportTxtBtn').addEventListener('click', () => exportData('txt'));
    overlay.querySelector('#exportHtmlBtn').addEventListener('click', () => exportData('html'));
    overlay.querySelector('#exportRawBtn').addEventListener('click', saveJsonToFile);
    overlay.querySelector('#compareBtn')?.addEventListener('click', compareResponses);

    overlay.addEventListener('click', e => { if (e.target === overlay) closeDebugModal(true); });

    populateSavedQueriesSelect();
    switchTab('json');
    updateJsonPreview();
    debugTextarea.focus();
}

// ============================================================================
// СТИЛИ
// ============================================================================
function injectDebugStyles() {
    if (document.getElementById('dbg-styles')) return;
    const style = document.createElement('style');
    style.id = 'dbg-styles';
    style.textContent = `
        .dbg-btn {
            padding: 7px 14px; background: #333; color: #ddd;
            border: none; border-radius: 6px; cursor: pointer;
            transition: background 0.15s;
        }
        .dbg-btn:hover { background: #444; }
        .debug-tab {
            padding: 8px 15px; background: #333; color: #ddd;
            border: none; border-radius: 6px 6px 0 0; cursor: pointer;
        }
        .debug-tab.active-tab { background: #d4af37 !important; color: #000 !important; font-weight: bold; }
        .tree-node { list-style: none; margin: 2px 0; padding-left: 12px; border-left: 1px dotted #444; }
        .tree-toggle { cursor: pointer; user-select: none; margin-right: 4px; color: #d4af37; font-size: 11px; }
        .tree-key { color: #d4af37; font-weight: bold; }
        .tree-val-str { color: #6f6; }
        .tree-val-num { color: #69f; }
        .tree-val-bool { color: #f9f; }
        .tree-val-null { color: #f66; }
        .tree-count { color: #aaa; font-size: 11px; margin-left: 5px; }
        .log-ok   { color: #0f0; }
        .log-warn { color: #ff0; }
        .log-err  { color: #f44; }
        .log-info { color: #aaa; }
        .ops-badge { background: #d4af37; color: #000; border-radius: 10px;
                     padding: 1px 6px; font-size: 10px; margin-left: 5px; }
    `;
    document.head.appendChild(style);
}

// ============================================================================
// ЗАКРЫТИЕ
// ============================================================================
function closeDebugModal(callHistoryBack = true) {
    if (!debugModalOverlay) return;
    debugModalOverlay.style.display = 'none';
    if (callHistoryBack && modalOpen) { history.back(); }
    modalOpen = false;
}

// ============================================================================
// ВКЛАДКИ
// ============================================================================
function switchTab(name) {
    document.querySelectorAll('.debug-tab').forEach(t => {
        t.classList.toggle('active-tab', t.dataset.tab === name);
    });
    ['json','info','logs','tree','compare'].forEach(id => {
        const el = document.getElementById(`${id}Preview`);
        if (el) el.style.display = id === name ? 'block' : 'none';
    });

    if (name === 'info' && currentResult)    renderInfo(currentResult);
    if (name === 'logs' && currentResult)    renderLogs(currentResult);
    if (name === 'tree' && currentResult)    renderTree(currentResult);
}

// ============================================================================
// ПРЕДПРОСМОТР JSON
// ============================================================================
function updateJsonPreview() {
    const pre = document.getElementById('jsonPreview');
    if (!pre) return;
    try {
        const obj = JSON.parse(debugTextarea.value);
        pre.innerHTML = syntaxHighlight(JSON.stringify(obj, null, 2));
    } catch {
        pre.textContent = debugTextarea.value;
    }
}

function syntaxHighlight(json) {
    json = json.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    return json.replace(/(\"(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*\"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g, m => {
        let cls = 'color:#69f';
        if (/^"/.test(m))       cls = /:$/.test(m) ? 'color:#d4af37;font-weight:bold' : 'color:#6f6';
        else if (/true|false/.test(m)) cls = 'color:#f9f';
        else if (/null/.test(m))       cls = 'color:#f66';
        return `<span style="${cls}">${m}</span>`;
    });
}

// ============================================================================
// ОТОБРАЖЕНИЕ ВКЛАДКИ INFO
// ============================================================================
function renderInfo(data) {
    const el = document.getElementById('infoPreview');
    if (!el) return;
    const info = data.parsing_info || {};
    const statusColor = info.status === 'OK' ? '#0f0' : info.status === 'WARN' ? '#ff0' : '#f44';

    // Считаем детальную статистику операций
    let totalOps = 0, opsBreakdown = [];
    (data.choices || []).forEach((c, i) => {
        const sr = c.success_rewards?.length || 0;
        const fp = c.fail_penalties?.length  || 0;
        if (sr + fp > 0) opsBreakdown.push(`choice[${i}]: +${sr} rewards / -${fp} penalties`);
        totalOps += sr + fp;
    });
    (data.events || []).forEach((e, i) => {
        const ef = e.effects?.length || 0;
        if (ef > 0) opsBreakdown.push(`event[${i}]: ${ef} effects`);
        totalOps += ef;
    });

    el.innerHTML = `
    <div style="background:#222; padding:12px; border-radius:8px; font-size:13px; line-height:1.7;">
        <table style="border-collapse:collapse; width:100%;">
            <tr><td style="color:#aaa; padding:2px 12px 2px 0;">Статус</td>
                <td style="color:${statusColor}; font-weight:bold;">${info.status || '—'}</td></tr>
            <tr><td style="color:#aaa; padding:2px 12px 2px 0;">Подход</td>
                <td>${info.approach || '—'}</td></tr>
            <tr><td style="color:#aaa; padding:2px 12px 2px 0;">Choices</td>
                <td>${info.choicesCount || '0/0'}</td></tr>
            <tr><td style="color:#aaa; padding:2px 12px 2px 0;">Events</td>
                <td>${info.eventsCount || '0/0'}</td></tr>
            <tr><td style="color:#aaa; padding:2px 12px 2px 0;">Thoughts</td>
                <td>${info.thoughtsCount || 0}</td></tr>
            <tr><td style="color:#aaa; padding:2px 12px 2px 0;">Операций всего</td>
                <td style="color:#d4af37; font-weight:bold;">${totalOps}</td></tr>
            <tr><td style="color:#aaa; padding:2px 12px 2px 0;">Восстановлено</td>
                <td>${info.recoveredCount || 0}</td></tr>
            <tr><td style="color:#aaa; padding:2px 12px 2px 0;">Время</td>
                <td>${info.durationMs ?? '—'} мс</td></tr>
        </table>

        ${opsBreakdown.length ? `
        <details style="margin-top:10px;">
            <summary style="cursor:pointer; color:#d4af37;">📊 Операции по элементам (${totalOps})</summary>
            <ul style="margin:6px 0; padding-left:18px; color:#aaa;">
                ${opsBreakdown.map(l => `<li>${l}</li>`).join('')}
            </ul>
        </details>` : ''}

        ${(info.normalizationNotes?.length) ? `
        <details style="margin-top:8px;">
            <summary style="cursor:pointer; color:#d4af37;">📝 Нормализация (${info.normalizationNotes.length})</summary>
            <ul style="margin:6px 0; padding-left:18px; color:#aaa; font-size:12px;">
                ${info.normalizationNotes.map(n => `<li>${escapeHtml(n)}</li>`).join('')}
            </ul>
        </details>` : ''}

        ${Object.keys(info.knownFieldErrors || {}).length ? `
        <details style="margin-top:8px;">
            <summary style="cursor:pointer; color:#f66;">❌ Ошибки полей</summary>
            <pre style="background:#1a1a1a; padding:8px; border-radius:4px; overflow:auto; font-size:11px;">${escapeHtml(JSON.stringify(info.knownFieldErrors, null, 2))}</pre>
        </details>` : ''}

        <details style="margin-top:8px;">
            <summary style="cursor:pointer; color:#d4af37;">🔢 Шаги парсинга</summary>
            <ol style="margin:6px 0; padding-left:20px; color:#aaa; font-size:12px;">
                ${(info.parsingSteps || []).map(s => `<li>${escapeHtml(s)}</li>`).join('')}
            </ol>
        </details>
    </div>`;
}

// ============================================================================
// ОТОБРАЖЕНИЕ ВКЛАДКИ ЛОГИ
// ============================================================================
function renderLogs(data) {
    const el = document.getElementById('logsPreview');
    if (!el) return;

    // Берём полный debugLog из parsing_info (экспортируется Parser.getLastDebugLog())
    const lines = data.parsing_info?.debugLog || Parser.getLastDebugLog();

    if (!lines.length) {
        el.innerHTML = '<div style="color:#666;">Логи отсутствуют. Включите debug: window.toggleParserDebug(true)</div>';
        return;
    }

    const coloredLines = lines.map(line => {
        let cls = 'log-info';
        if (line.startsWith('✅') || line.startsWith('🏁')) cls = 'log-ok';
        else if (line.startsWith('❌') || line.startsWith('🔥')) cls = 'log-err';
        else if (line.startsWith('⚠️')) cls = 'log-warn';
        return `<div class="${cls}">${escapeHtml(line)}</div>`;
    }).join('');

    el.innerHTML = `
        <div style="margin-bottom:8px; display:flex; gap:8px; align-items:center;">
            <strong style="color:#d4af37;">📋 Debug Log (${lines.length} записей)</strong>
            <button onclick="window.toggleParserDebug(true)" style="padding:4px 10px; background:#333; color:#ddd; border:none; border-radius:4px; cursor:pointer; font-size:11px;">Включить debug</button>
            <button onclick="window.toggleParserDebug(false)" style="padding:4px 10px; background:#333; color:#ddd; border:none; border-radius:4px; cursor:pointer; font-size:11px;">Выключить debug</button>
        </div>
        ${coloredLines}
    `;
}

// ============================================================================
// ДРЕВОВИДНЫЙ ПРОСМОТР
// ============================================================================
function renderTree(data) {
    const el = document.getElementById('treePreview');
    if (!el) return;
    el.innerHTML = '';

    // Кнопка "Копировать дерево как JSON"
    const copyTreeBtn = document.createElement('button');
    copyTreeBtn.className = 'dbg-btn';
    copyTreeBtn.style.marginBottom = '10px';
    copyTreeBtn.innerHTML = '📋 Копировать дерево как JSON';
    copyTreeBtn.addEventListener('click', () => {
        // Копируем данные без служебных функций
        const clean = JSON.parse(JSON.stringify(data, (k, v) => typeof v === 'function' ? undefined : v));
        navigator.clipboard.writeText(JSON.stringify(clean, null, 2))
            .then(() => showToast('✅ Дерево скопировано как JSON'));
    });
    el.appendChild(copyTreeBtn);

    const ul = document.createElement('ul');
    ul.style.cssText = 'margin:0; padding:0; list-style:none;';
    const li = buildTreeNode(data, 'result');
    ul.appendChild(li);
    el.appendChild(ul);
}

function buildTreeNode(value, key) {
    const li = document.createElement('li');
    li.className = 'tree-node';

    const header = document.createElement('div');
    header.style.display = 'flex';
    header.style.alignItems = 'center';

    const keySpan = document.createElement('span');
    keySpan.className = 'tree-key';
    keySpan.textContent = key + ': ';
    header.appendChild(keySpan);

    const type = Array.isArray(value) ? 'array' : typeof value;

    if (value === null) {
        const s = document.createElement('span');
        s.className = 'tree-val-null'; s.textContent = 'null';
        header.appendChild(s);
        li.appendChild(header);
        return li;
    }

    if (type !== 'object' && type !== 'array') {
        const s = document.createElement('span');
        let txt = String(value);
        if (txt.length > 80) txt = txt.substring(0, 80) + '…';
        if (type === 'string')  { s.className = 'tree-val-str';  txt = `"${txt}"`; }
        if (type === 'number')  { s.className = 'tree-val-num'; }
        if (type === 'boolean') { s.className = 'tree-val-bool'; }
        s.textContent = txt;
        header.appendChild(s);
        li.appendChild(header);
        return li;
    }

    // Объект или массив
    const toggle = document.createElement('span');
    toggle.className  = 'tree-toggle';
    toggle.textContent = '▼';
    header.prepend(toggle);

    const count = document.createElement('span');
    count.className  = 'tree-count';

    // Специальная статистика для choices
    if (key === 'choices' && Array.isArray(value)) {
        const totalOps = value.reduce((a, c) =>
            a + (c.success_rewards?.length||0) + (c.fail_penalties?.length||0), 0);
        count.innerHTML = `[${value.length}] <span class="ops-badge">${totalOps} ops</span>`;
    } else if (key === 'events' && Array.isArray(value)) {
        const totalEff = value.reduce((a, e) => a + (e.effects?.length||0), 0);
        count.innerHTML = `[${value.length}] <span class="ops-badge">${totalEff} effects</span>`;
    } else {
        count.textContent = Array.isArray(value) ? `[${value.length}]` : `{${Object.keys(value).length}}`;
    }
    header.appendChild(count);
    li.appendChild(header);

    const children = document.createElement('ul');
    children.style.cssText = 'margin:0; padding:0 0 0 16px; list-style:none;';

    const entries = Array.isArray(value)
        ? value.map((v, i) => [i.toString(), v])
        : Object.entries(value);

    for (const [k, v] of entries) {
        if (k === 'copyToClipboard' || typeof v === 'function') continue;
        children.appendChild(buildTreeNode(v, k));
    }
    li.appendChild(children);

    let expanded = true;
    toggle.addEventListener('click', e => {
        e.stopPropagation();
        expanded = !expanded;
        children.style.display = expanded ? 'block' : 'none';
        toggle.textContent = expanded ? '▼' : '▶';
    });

    return li;
}

// ============================================================================
// ИМЕНОВАННЫЕ ЗАПРОСЫ
// ============================================================================
function populateSavedQueriesSelect() {
    const sel = document.getElementById('savedSelect');
    if (!sel) return;
    // Сохраняем первую опцию
    while (sel.options.length > 1) sel.remove(1);
    Object.keys(savedQueries).sort().forEach(name => {
        const opt = document.createElement('option');
        opt.value = name;
        opt.textContent = name;
        sel.appendChild(opt);
    });
}

function loadSavedQuery(e) {
    const name = e.target.value;
    if (name && savedQueries[name]) {
        debugTextarea.value = savedQueries[name];
        updateJsonPreview();
        showToast(`✅ Загружен: ${name}`);
    }
}

function saveCurrentQuery() {
    const json = debugTextarea.value.trim();
    if (!json) { showToast('❌ Пустой ввод'); return; }

    const name = prompt('Введите имя для сохранения запроса:');
    if (!name) return;

    savedQueries[name] = json;
    localStorage.setItem('debug_saved_queries', JSON.stringify(savedQueries));
    populateSavedQueriesSelect();

    // Выбрать только что сохранённый
    const sel = document.getElementById('savedSelect');
    if (sel) sel.value = name;

    showToast(`✅ Сохранено: "${name}"`);
}

function deleteSavedQuery() {
    const sel = document.getElementById('savedSelect');
    const name = sel?.value;
    if (!name) { showToast('❌ Выберите запрос для удаления'); return; }

    if (!confirm(`Удалить запрос "${name}"?`)) return;
    delete savedQueries[name];
    localStorage.setItem('debug_saved_queries', JSON.stringify(savedQueries));
    populateSavedQueriesSelect();
    showToast(`🗑️ Удалён: "${name}"`);
}

// ============================================================================
// ФОРМАТИРОВАНИЕ, ЗАГРУЗКА, ОЧИСТКА
// ============================================================================
function formatJson() {
    try {
        const obj = JSON.parse(debugTextarea.value);
        debugTextarea.value = JSON.stringify(obj, null, 2);
        updateJsonPreview();
        showToast('✅ JSON отформатирован');
    } catch { showToast('❌ Некорректный JSON'); }
}

function loadSample(e) {
    const key = e.target.value;
    if (key && SAMPLE_RESPONSES[key]) {
        debugTextarea.value = SAMPLE_RESPONSES[key];
        updateJsonPreview();
    }
    e.target.value = '';
}

function loadFile() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,application/json';
    input.onchange = e => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = e2 => {
            debugTextarea.value = e2.target.result;
            updateJsonPreview();
            showToast(`✅ Загружен: ${file.name}`);
        };
        reader.readAsText(file);
    };
    input.click();
}

function saveJsonToFile() {
    downloadBlob(debugTextarea.value, 'debug_input.json', 'application/json');
    showToast('✅ Входной JSON сохранён');
}

function clearAll() {
    debugTextarea.value = '';
    currentResult = null;
    updateJsonPreview();
    ['infoPreview','logsPreview','treePreview','compareResult','compareTextarea'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.innerHTML = '';
    });
    showToast('🧹 Очищено');
}

// ============================================================================
// ИСТОРИЯ
// ============================================================================
function showHistory() {
    if (!historyList.length) { showToast('📭 История пуста'); return; }

    const m = document.createElement('div');
    m.style.cssText = `
        position:fixed; top:50%; left:50%; transform:translate(-50%,-50%);
        background:#222; border:2px solid #d4af37; border-radius:12px;
        padding:20px; max-width:600px; width:90%; max-height:80vh; overflow:auto;
        z-index:200001; color:#eee;
    `;
    m.innerHTML = '<h3 style="margin-top:0; color:#d4af37;">📜 История</h3>';
    historyList.forEach(item => {
        const d = document.createElement('div');
        d.style.cssText = 'border-bottom:1px solid #444; padding:10px; cursor:pointer;';
        d.innerHTML = `<strong>${new Date(item.time).toLocaleString()}</strong> — ${escapeHtml(item.scenePreview)}`;
        d.addEventListener('click', () => {
            debugTextarea.value = item.json;
            updateJsonPreview();
            m.remove();
            showToast('✅ Загружено из истории');
        });
        m.appendChild(d);
    });

    const btns = document.createElement('div');
    btns.style.cssText = 'display:flex; justify-content:center; gap:10px; margin-top:15px;';
    btns.innerHTML = `
        <button onclick="this.closest('div[style]').remove(); window._clearDebugHistory();" style="padding:8px 20px; background:#a00; color:#fff; border:none; border-radius:6px; cursor:pointer;">🗑️ Очистить</button>
        <button onclick="this.closest('div[style]').remove();" style="padding:8px 20px; background:#333; color:#fff; border:none; border-radius:6px; cursor:pointer;">Закрыть</button>
    `;
    window._clearDebugHistory = () => {
        historyList = [];
        localStorage.removeItem('debug_history');
        const btn = document.getElementById('historyBtn');
        if (btn) btn.innerHTML = '📜 История (0)';
        showToast('📭 История очищена');
    };
    m.appendChild(btns);
    document.body.appendChild(m);
}

function addToHistory(json, result) {
    const preview = (result.scene || '').replace(/<[^>]+>/g, '').substring(0, 60) + '...';
    historyList.unshift({ time: Date.now(), json, scenePreview: preview });
    if (historyList.length > 20) historyList.pop();
    localStorage.setItem('debug_history', JSON.stringify(historyList));
    const btn = document.getElementById('historyBtn');
    if (btn) btn.innerHTML = `📜 История (${historyList.length})`;
}

// ============================================================================
// КОПИРОВАНИЕ И ЭКСПОРТ
// ============================================================================
function copyResult() {
    if (!currentResult) { showToast('❌ Сначала выполните парсинг'); return; }
    const clean = JSON.stringify(currentResult, (k, v) => typeof v === 'function' ? undefined : v, 2);
    navigator.clipboard.writeText(clean).then(() => showToast('✅ Результат скопирован'));
}

function toggleExportMenu() {
    const m = document.getElementById('exportMenu');
    if (!m) return;
    const visible = m.style.display !== 'none';
    m.style.display = visible ? 'none' : 'flex';
}

function exportData(type) {
    if (!currentResult) { showToast('❌ Сначала выполните парсинг'); return; }
    const info = currentResult.parsing_info || {};

    switch (type) {
        case 'json-full': {
            const clean = JSON.stringify(currentResult, (k, v) => typeof v === 'function' ? undefined : v, 2);
            downloadBlob(clean, 'parsing_result.json', 'application/json');
            break;
        }
        case 'json-info': {
            downloadBlob(JSON.stringify(info, null, 2), 'parsing_info.json', 'application/json');
            break;
        }
        case 'txt': {
            const lines = [
                `=== ПАРСИНГ ОТЧЁТ ===`,
                `Дата: ${new Date().toLocaleString()}`,
                `Статус: ${info.status}`,
                `Подход: ${info.approach}`,
                `Choices: ${info.choicesCount}`,
                `Events: ${info.eventsCount}`,
                `Thoughts: ${info.thoughtsCount}`,
                `Операций: ${info.extractedOperationsCount}`,
                `Восстановлено: ${info.recoveredCount}`,
                `Время: ${info.durationMs}мс`,
                ``,
                `=== ШАГИparsingSteps ===`,
                ...(info.parsingSteps || []).map((s, i) => `${i + 1}. ${s}`),
                ``,
                `=== НОРМАЛИЗАЦИЯ ===`,
                ...(info.normalizationNotes || []),
                ``,
                `=== DEBUG LOG ===`,
                ...(info.debugLog || Parser.getLastDebugLog()),
            ];
            downloadBlob(lines.join('\n'), 'parsing_log.txt', 'text/plain');
            break;
        }
        case 'html': {
            const html = buildHtmlReport(currentResult, info);
            downloadBlob(html, 'parsing_report.html', 'text/html');
            break;
        }
    }
    showToast(`✅ Экспортировано (${type})`);
    document.getElementById('exportMenu').style.display = 'none';
}

function buildHtmlReport(data, info) {
    const sc = info.status === 'OK' ? '#0f0' : info.status === 'WARN' ? '#ff0' : '#f44';
    return `<!DOCTYPE html><html><head><meta charset="utf-8">
<title>Parsing Report</title>
<style>
  body { background:#111; color:#eee; font-family:monospace; padding:20px; }
  h1,h2 { color:#d4af37; } table { border-collapse:collapse; width:100%; }
  td,th { border:1px solid #444; padding:6px 10px; }
  th { background:#222; } .ok{color:#0f0;} .warn{color:#ff0;} .err{color:#f44;}
  pre { background:#0a0a0a; padding:10px; border-radius:6px; overflow:auto; }
  details summary { cursor:pointer; color:#d4af37; }
</style></head><body>
<h1>🐞 Parser Report v8.0</h1>
<p>Дата: ${new Date().toLocaleString()}</p>
<h2>Статус: <span style="color:${sc}">${info.status}</span></h2>
<table>
  <tr><th>Поле</th><th>Значение</th></tr>
  <tr><td>Подход</td><td>${info.approach}</td></tr>
  <tr><td>Choices</td><td>${info.choicesCount}</td></tr>
  <tr><td>Events</td><td>${info.eventsCount}</td></tr>
  <tr><td>Thoughts</td><td>${info.thoughtsCount}</td></tr>
  <tr><td>Операций</td><td>${info.extractedOperationsCount}</td></tr>
  <tr><td>Восстановлено</td><td>${info.recoveredCount}</td></tr>
  <tr><td>Время</td><td>${info.durationMs}мс</td></tr>
</table>

<h2>Шаги парсинга</h2>
<ol>${(info.parsingSteps||[]).map(s=>`<li>${s}</li>`).join('')}</ol>

<h2>Debug Log (${(info.debugLog||[]).length} записей)</h2>
<pre>${(info.debugLog||Parser.getLastDebugLog()).join('\n')}</pre>

<h2>Нормализация</h2>
<ul>${(info.normalizationNotes||[]).map(n=>`<li>${n}</li>`).join('')}</ul>

<h2>Choices (${(data.choices||[]).length})</h2>
${(data.choices||[]).map((c,i)=>`
<details><summary>choice[${i}]: ${c.text?.substring(0,60)} | diff:${c.difficulty_level} | +${c.success_rewards?.length||0}r -${c.fail_penalties?.length||0}p</summary>
<pre>${JSON.stringify(c, null, 2)}</pre></details>`).join('')}

<h2>Events (${(data.events||[]).length})</h2>
${(data.events||[]).map((e,i)=>`
<details><summary>event[${i}]: ${e.type} | ${e.description?.substring(0,60)} | ${e.effects?.length||0} effects</summary>
<pre>${JSON.stringify(e, null, 2)}</pre></details>`).join('')}

<h2>Полный результат</h2>
<pre>${JSON.stringify(data, (k,v)=>typeof v==='function'?undefined:v, 2)}</pre>
</body></html>`;
}

// ============================================================================
// СРАВНЕНИЕ
// ============================================================================
function compareResponses() {
    const t2 = document.getElementById('compareTextarea')?.value;
    if (!t2) { showToast('❌ Вставьте второй JSON'); return; }
    try {
        const o1 = JSON.parse(debugTextarea.value);
        const o2 = JSON.parse(t2);
        const keys = new Set([...Object.keys(o1), ...Object.keys(o2)]);
        let html = '<table style="width:100%; border-collapse:collapse;">';
        html += '<tr><th style="padding:4px;">Ключ</th><th>Первый</th><th>Второй</th><th>≠</th></tr>';
        for (const key of keys) {
            const v1 = JSON.stringify(o1[key])?.substring(0, 60);
            const v2 = JSON.stringify(o2[key])?.substring(0, 60);
            const diff = v1 !== v2 ? '⚠️' : '✅';
            const c = v1 !== v2 ? '#ff0' : '#0f0';
            html += `<tr style="border-bottom:1px solid #333;">
                <td style="padding:4px;"><strong>${key}</strong></td>
                <td style="padding:4px; color:${c};">${escapeHtml(v1||'—')}</td>
                <td style="padding:4px; color:${c};">${escapeHtml(v2||'—')}</td>
                <td style="padding:4px;">${diff}</td></tr>`;
        }
        html += '</table>';
        document.getElementById('compareResult').innerHTML = html;
    } catch { showToast('❌ Ошибка парсинга'); }
}

// ============================================================================
// РЕЖИМ 1: ТОЛЬКО ПАРСИНГ
// ============================================================================
async function runQuickParse() {
    if (isProcessing) return;
    isProcessing = true;
    const raw = debugTextarea.value.trim();
    if (!raw) { showToast('❌ Вставьте JSON'); isProcessing = false; return; }
    try {
        const result = Parser.processAIResponse(raw);
        currentResult = result;
        addToHistory(raw, result);
        renderInfo(result);
        renderLogs(result);
        renderTree(result);
        switchTab('info');
        showToast(`✅ Парсинг: ${result.parsing_info?.status} | ops:${result.parsing_info?.extractedOperationsCount}`);
    } catch (e) {
        showToast(`❌ ${e.message}`);
    } finally {
        isProcessing = false;
    }
}

// ============================================================================
// РЕЖИМ 2: ПОЛНЫЙ ПАЙПЛАЙН
// ============================================================================
async function runFullPipeline() {
    if (isProcessing) return;
    isProcessing = true;
    const raw = debugTextarea.value.trim();
    if (!raw) { showToast('❌ Вставьте JSON'); isProcessing = false; return; }

    originalSendAI = API.sendAIRequest;
    try {
        const processedData = Parser.processAIResponse(raw);
        currentResult = processedData;
        addToHistory(raw, processedData);

        const state = State.getState();
        const origFree    = state.ui.freeMode.enabled;
        const origText    = state.ui.freeMode.text;
        const origActions = [...state.ui.selectedActions];

        State.updateUI({ freeMode: { enabled: true, text: 'Debug' }, selectedActions: [] });
        API.sendAIRequest = async () => processedData;

        await Game.submitTurn();

        State.updateUI({ freeMode: { enabled: origFree, text: origText }, selectedActions: origActions });
        Render.renderAll();

        lastSuccessfulJson = raw;
        localStorage.setItem('debug_last_json', raw);

        closeDebugModal(true);
        showToast('✅ Полный пайплайн завершён');
    } catch (e) {
        console.error('❌ Ошибка пайплайна:', e);
        showToast(`❌ ${e.message}`);
    } finally {
        if (originalSendAI) API.sendAIRequest = originalSendAI;
        isProcessing = false;
    }
}

// ============================================================================
// УТИЛИТЫ
// ============================================================================
function escapeHtml(str) {
    return String(str || '')
        .replace(/&/g,'&amp;')
        .replace(/</g,'&lt;')
        .replace(/>/g,'&gt;')
        .replace(/"/g,'&quot;');
}

function downloadBlob(content, filename, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
}

function showToast(message) {
    const t = document.createElement('div');
    t.textContent = message;
    t.style.cssText = `
        position:fixed; top:85px; left:50%; transform:translateX(-50%);
        background:#111; color:#ffd700; padding:12px 26px;
        border-radius:30px; border:2px solid #d4af37;
        z-index:200000; box-shadow:0 0 25px rgba(255,215,0,0.6); font-weight:bold;
    `;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 3000);
}

// ============================================================================
// ЗАПУСК
// ============================================================================
initDebugResponse();
export { initDebugResponse };