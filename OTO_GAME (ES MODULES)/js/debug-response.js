// ====================================================================
// ФАЙЛ: debug-response.js (v3.2 — ДРЕВОВИДНОЕ ОТОБРАЖЕНИЕ РЕЗУЛЬТАТОВ ПАРСИНГА)
// НАЗНАЧЕНИЕ: Отладчик ответов ИИ с ПОЛНЫМ реальным пайплайном.
// ДОПОЛНИТЕЛЬНЫЙ ФУНКЦИОНАЛ v3.2:
// - Добавлена вкладка "🌳 Дерево" с коллапсируемым древовидным представлением parsedData.
// - Визуализация всех полей, включая вложенные объекты и массивы.
// - Цветовое выделение типов данных (строки, числа, булевы, null, объекты, массивы).
// - Возможность сворачивать/разворачивать узлы кликом.
// - Подсветка ключей и значений.
// - Полная интеграция с существующими функциями (история, сравнение, экспорт).
// ====================================================================

'use strict';

import { Parser } from './parsing.js';
import { API } from './7-api-facade.js';
import { Game } from './6-game.js';
import { State } from './3-state.js';
import { Render } from './5-render.js';
import { log, LOG_CATEGORIES } from './logger.js';

// Глобальные ссылки
let debugModalOverlay = null;
let debugTextarea = null;
let isProcessing = false;
let originalSendAIRequest = null;
let lastSuccessfulJson = '';
let historyList = JSON.parse(localStorage.getItem('debug_history') || '[]');
let currentParsingResult = null;
let modalOpen = false; // флаг открытого модального окна для управления историей

// Примеры для быстрого тестирования
const SAMPLE_RESPONSES = {
    minimal: `{
  "scene": "<p>Тестовая сцена для проверки дебаггера.</p>",
  "choices": [{ "text": "Тестовый выбор", "difficulty_level": 5, "requirements": [], "success_rewards": [], "fail_penalties": [] }],
  "thoughts": ["Тестовая мысль"],
  "summary": "Тестовый саммари"
}`,
    full: `{
  "scene": "<p>Полная тестовая сцена с событиями и мыслями.</p>",
  "choices": [
    { "text": "Выбор 1", "difficulty_level": 4, "requirements": ["stat:will"], "success_rewards": [], "fail_penalties": [] },
    { "text": "Выбор 2", "difficulty_level": 7, "requirements": [], "success_rewards": [], "fail_penalties": [] }
  ],
  "events": [{ "type": "world_event", "description": "Тестовое событие", "effects": [] }],
  "thoughts": ["Мысли героя 1", "Мысли героя 2"],
  "summary": "Итоговый саммари",
  "aiMemory": { "last_event": "test" }
}`,
    corrupted: `{
  "scene": "<p>Обрезанный JSON без закрывающей скобки",
  "choices": [{ "text": "Выбор 1" }]`
};

// ============================================================================
// ИНИЦИАЛИЗАЦИЯ
// ============================================================================
function initDebugResponse() {
    if (document.getElementById('debugResponseBtn')) return;

    const btn = document.createElement('button');
    btn.id = 'debugResponseBtn';
    btn.innerHTML = '🐞';
    btn.title = 'Расширенный дебаггер v3.2 (древовидный просмотр)';
    btn.style.cssText = `
        position: fixed;
        top: 25px;
        right: 15px;
        width: 54px;
        height: 54px;
        border-radius: 50%;
        background: #111;
        color: #ffd700;
        opacity: 0%;
        border: 3px solid #ffd700;
        font-size: 28px;
        z-index: 99999;
        cursor: pointer;
        box-shadow: 0 0 20px rgba(255,215,0,0.7);
        transition: opacity 0.3s;
    `;

    btn.addEventListener('mouseenter', () => { btn.style.opacity = '100%'; });
    btn.addEventListener('mouseleave', () => { btn.style.opacity = '70%'; });
    btn.style.opacity = '70%';

    btn.addEventListener('click', openDebugModal);
    document.body.appendChild(btn);

    document.addEventListener('keydown', e => {
        if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'd') {
            e.preventDefault();
            openDebugModal();
        }
    });

    // Обработчик системной кнопки "назад" на телефоне
    window.addEventListener('popstate', (event) => {
        if (modalOpen && debugModalOverlay) {
            closeDebugModal(false);
            event.preventDefault();
        }
    });

    lastSuccessfulJson = localStorage.getItem('debug_last_json') || SAMPLE_RESPONSES.minimal;
    console.log('🐞 [DebugResponse v3.2] Древовидное отображение добавлено');
}

// ============================================================================
// ОТКРЫТИЕ МОДАЛЬНОГО ОКНА (с вкладками и адаптивной вёрсткой)
// ============================================================================
function openDebugModal() {
    if (debugModalOverlay) {
        debugModalOverlay.style.display = 'flex';
        debugTextarea.focus();
        return;
    }

    if (!modalOpen) {
        history.pushState({ modal: true }, '');
        modalOpen = true;
    }

    const overlay = document.createElement('div');
    overlay.style.cssText = `
        position: fixed;
        inset: 0;
        background: rgba(0,0,0,0.95);
        z-index: 100000;
        display: flex;
        align-items: center;
        justify-content: center;
        backdrop-filter: blur(10px);
        padding: 10px;
    `;

    const modal = document.createElement('div');
    modal.style.cssText = `
        width: 100%;
        max-width: 1200px;
        max-height: 90vh;
        background: #1a1a1a;
        border: 4px solid #d4af37;
        border-radius: 16px;
        display: flex;
        flex-direction: column;
        box-shadow: 0 0 50px rgba(212,175,55,0.6);
        overflow: hidden;
    `;

    modal.innerHTML = `
        <!-- Фиксированный заголовок с кнопкой закрытия -->
        <div style="display:flex; justify-content:space-between; align-items:center; padding:16px 24px; background:#1a1a1a; border-bottom:1px solid #444; flex-shrink:0;">
            <h2 style="margin:0; color:#d4af37; font-size:1.35rem;">🐞 ДЕБАГГЕР v3.2 (дерево)</h2>
            <button id="closeDebugBtn" style="background:none; border:none; color:#d4af37; font-size:32px; cursor:pointer; line-height:1;">×</button>
        </div>

        <!-- Прокручиваемый контент -->
        <div style="flex:1; overflow-y:auto; padding:16px 24px 24px 24px;">
            <!-- Панель инструментов -->
            <div style="margin-bottom:12px; display:flex; gap:8px; flex-wrap:wrap;">
                <select id="sampleSelect" style="padding:8px; background:#222; color:#ddd; border:1px solid #555; border-radius:6px;">
                    <option value="">— Выберите пример —</option>
                    <option value="minimal">Минимальный</option>
                    <option value="full">Полный</option>
                    <option value="corrupted">Повреждённый</option>
                </select>
                <button id="formatBtn" style="padding:8px 16px; background:#333; color:#ddd; border:none; border-radius:6px; cursor:pointer;">📐 Форматировать JSON</button>
                <button id="loadFileBtn" style="padding:8px 16px; background:#333; color:#ddd; border:none; border-radius:6px; cursor:pointer;">📂 Загрузить файл</button>
                <button id="saveJsonBtn" style="padding:8px 16px; background:#333; color:#ddd; border:none; border-radius:6px; cursor:pointer;">💾 Сохранить JSON</button>
                <button id="historyBtn" style="padding:8px 16px; background:#333; color:#ddd; border:none; border-radius:6px; cursor:pointer;">📜 История (${historyList.length})</button>
            </div>

            <!-- Текстовая область с JSON -->
            <textarea id="debugTextarea" style="width:100%; height:200px; background:#0a0a0a; color:#0f0; border:1px solid #444; 
                border-radius:8px; padding:14px; font-size:13.5px; resize:vertical; white-space:pre; overflow:auto; font-family:monospace;">${lastSuccessfulJson}</textarea>

            <!-- Вкладки -->
            <div style="margin-top:16px; border-bottom:1px solid #444; display:flex; gap:8px; flex-wrap:wrap;">
                <button class="debug-tab" data-tab="json" style="background:#d4af37; color:#000; border:none; padding:8px 16px; border-radius:6px 6px 0 0; cursor:pointer; font-weight:bold;">📦 JSON</button>
                <button class="debug-tab" data-tab="info" style="background:#333; color:#ddd; border:none; padding:8px 16px; border-radius:6px 6px 0 0; cursor:pointer;">ℹ️ Parsing Info</button>
                <button class="debug-tab" data-tab="logs" style="background:#333; color:#ddd; border:none; padding:8px 16px; border-radius:6px 6px 0 0; cursor:pointer;">📋 Логи парсинга</button>
                <button class="debug-tab" data-tab="compare" style="background:#333; color:#ddd; border:none; padding:8px 16px; border-radius:6px 6px 0 0; cursor:pointer;">⚖️ Сравнение</button>
                <button class="debug-tab" data-tab="tree" style="background:#333; color:#ddd; border:none; padding:8px 16px; border-radius:6px 6px 0 0; cursor:pointer;">🌳 Дерево</button>
            </div>

            <!-- Содержимое вкладок -->
            <div id="tabContent" style="margin-top:12px; min-height:200px; max-height:300px; overflow:auto; padding:12px; background:#111; border-radius:8px;">
                <pre id="jsonPreview" style="margin:0; white-space:pre-wrap; word-wrap:break-word;"></pre>
                <div id="infoPreview" style="display:none;"></div>
                <div id="logsPreview" style="display:none; font-family:monospace; font-size:12px;"></div>
                <div id="comparePreview" style="display:none;">
                    <textarea id="compareTextarea" placeholder="Вставьте второй JSON для сравнения..." style="width:100%; height:150px; background:#0a0a0a; color:#0f0; border:1px solid #444; border-radius:8px; padding:8px; font-size:12px;"></textarea>
                    <button id="compareBtn" style="margin-top:8px; padding:8px; background:#444; color:#fff; border:none; border-radius:6px; cursor:pointer;">🔍 Сравнить</button>
                    <div id="compareResult" style="margin-top:12px;"></div>
                </div>
                <div id="treePreview" style="display:none; font-family:monospace; font-size:13px;"></div>
            </div>

            <!-- Кнопки действий -->
            <div style="margin-top:18px; display:flex; gap:12px; flex-wrap:wrap;">
                <button id="quickParseBtn" style="flex:1; min-width:150px; padding:14px; background:#444; color:#fff; border:none; border-radius:8px; cursor:pointer; font-weight:bold;">
                    🔍 Только парсинг
                </button>
                <button id="fullPipelineBtn" style="flex:2; min-width:200px; padding:14px; background:#d4af37; color:#000; border:none; border-radius:8px; cursor:pointer; font-weight:bold;">
                    🚀 Полный пайплайн (submitTurn)
                </button>
                <button id="copyResultBtn" style="flex:1; min-width:120px; padding:14px; background:#333; color:#fff; border:none; border-radius:8px; cursor:pointer;">
                    📋 Копировать результат
                </button>
                <button id="exportInfoBtn" style="flex:1; min-width:120px; padding:14px; background:#333; color:#fff; border:none; border-radius:8px; cursor:pointer;">
                    📤 Экспорт parsing_info
                </button>
            </div>
        </div>
    `;

    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    debugModalOverlay = overlay;
    debugTextarea = modal.querySelector('#debugTextarea');

    // Инициализация вкладок
    const tabs = modal.querySelectorAll('.debug-tab');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => switchTab(tab.dataset.tab));
    });

    // Привязка событий
    const closeBtn = modal.querySelector('#closeDebugBtn');
    closeBtn.addEventListener('click', () => closeDebugModal(true));

    modal.querySelector('#formatBtn').addEventListener('click', formatJson);
    modal.querySelector('#sampleSelect').addEventListener('change', loadSample);
    modal.querySelector('#loadFileBtn').addEventListener('click', loadFile);
    modal.querySelector('#saveJsonBtn').addEventListener('click', saveJsonToFile);
    modal.querySelector('#historyBtn').addEventListener('click', showHistory);
    modal.querySelector('#quickParseBtn').addEventListener('click', runQuickParse);
    modal.querySelector('#fullPipelineBtn').addEventListener('click', runFullPipeline);
    modal.querySelector('#copyResultBtn').addEventListener('click', copyResult);
    modal.querySelector('#exportInfoBtn').addEventListener('click', exportInfo);
    modal.querySelector('#compareBtn')?.addEventListener('click', compareResponses);

    overlay.addEventListener('click', e => { if (e.target === overlay) closeDebugModal(true); });

    // Первоначальное переключение на вкладку JSON
    switchTab('json');
    updateJsonPreview();
    debugTextarea.focus();
}

// ============================================================================
// ЗАКРЫТИЕ МОДАЛЬНОГО ОКНА
// ============================================================================
function closeDebugModal(callHistoryBack = true) {
    if (!debugModalOverlay) return;

    debugModalOverlay.style.display = 'none';

    if (callHistoryBack && modalOpen) {
        history.back();
        modalOpen = false;
    } else {
        modalOpen = false;
    }
}

// ============================================================================
// ПЕРЕКЛЮЧЕНИЕ ВКЛАДОК
// ============================================================================
function switchTab(tabName) {
    const tabs = document.querySelectorAll('.debug-tab');
    tabs.forEach(t => {
        t.style.background = t.dataset.tab === tabName ? '#d4af37' : '#333';
        t.style.color = t.dataset.tab === tabName ? '#000' : '#ddd';
    });

    document.getElementById('jsonPreview').style.display = tabName === 'json' ? 'block' : 'none';
    document.getElementById('infoPreview').style.display = tabName === 'info' ? 'block' : 'none';
    document.getElementById('logsPreview').style.display = tabName === 'logs' ? 'block' : 'none';
    document.getElementById('comparePreview').style.display = tabName === 'compare' ? 'block' : 'none';
    document.getElementById('treePreview').style.display = tabName === 'tree' ? 'block' : 'none';

    if (tabName === 'info' && currentParsingResult) {
        displayInfo(currentParsingResult);
    }
    if (tabName === 'logs' && currentParsingResult) {
        displayLogs(currentParsingResult);
    }
    if (tabName === 'tree' && currentParsingResult) {
        displayTree(currentParsingResult);
    }
}

// ============================================================================
// ДРЕВОВИДНОЕ ОТОБРАЖЕНИЕ
// ============================================================================
function displayTree(data) {
    const container = document.getElementById('treePreview');
    container.innerHTML = ''; // очищаем
    if (!data) {
        container.innerHTML = '<div style="color:#666;">Нет данных для отображения</div>';
        return;
    }
    const tree = buildTree(data, 'root');
    container.appendChild(tree);
}

/**
 * Рекурсивно строит элемент дерева для переданного значения.
 * @param {*} value - значение (может быть объектом, массивом, примитивом)
 * @param {string} key - ключ (используется для отображения)
 * @returns {HTMLElement} - элемент <li> с вложенной структурой
 */
function buildTree(value, key) {
    const li = document.createElement('li');
    li.style.listStyle = 'none';
    li.style.margin = '2px 0';
    li.style.paddingLeft = '10px';
    li.style.borderLeft = '1px dotted #444';

    // Определяем тип значения
    const type = Array.isArray(value) ? 'array' : typeof value;

    // Создаем контейнер для заголовка узла
    const header = document.createElement('div');
    header.style.display = 'flex';
    header.style.alignItems = 'center';
    header.style.cursor = 'pointer';
    header.style.userSelect = 'none';

    // Ключ (или индекс)
    const keySpan = document.createElement('span');
    keySpan.textContent = key + ': ';
    keySpan.style.color = '#d4af37';
    keySpan.style.fontWeight = 'bold';
    header.appendChild(keySpan);

    // Значение (для примитивов) или иконка сворачивания
    if (value === null) {
        const valSpan = document.createElement('span');
        valSpan.textContent = 'null';
        valSpan.style.color = '#f66';
        header.appendChild(valSpan);
    } else if (type !== 'object' && type !== 'array') {
        const valSpan = document.createElement('span');
        let displayValue = String(value);
        if (displayValue.length > 50) displayValue = displayValue.substring(0, 50) + '…';
        if (type === 'string') {
            valSpan.textContent = '"' + displayValue + '"';
            valSpan.style.color = '#6f6';
        } else if (type === 'number') {
            valSpan.textContent = displayValue;
            valSpan.style.color = '#69f';
        } else if (type === 'boolean') {
            valSpan.textContent = displayValue;
            valSpan.style.color = '#f9f';
        } else {
            valSpan.textContent = displayValue;
        }
        header.appendChild(valSpan);
        li.appendChild(header);
        return li;
    } else {
        // Объект или массив — добавляем иконку сворачивания
        const toggle = document.createElement('span');
        toggle.textContent = '▼'; // свернуто? покажем развернутым по умолчанию
        toggle.style.marginRight = '5px';
        toggle.style.color = '#d4af37';
        toggle.style.fontSize = '12px';
        toggle.style.width = '16px';
        toggle.style.display = 'inline-block';
        toggle.style.textAlign = 'center';
        header.prepend(toggle); // слева от ключа

        const typeLabel = document.createElement('span');
        typeLabel.textContent = Array.isArray(value) ? `[${value.length}]` : `{${Object.keys(value).length}}`;
        typeLabel.style.color = '#aaa';
        typeLabel.style.fontSize = '11px';
        typeLabel.style.marginLeft = '6px';
        header.appendChild(typeLabel);

        li.appendChild(header);

        // Контейнер для детей
        const childrenContainer = document.createElement('ul');
        childrenContainer.style.margin = '0';
        childrenContainer.style.paddingLeft = '20px';
        childrenContainer.style.listStyle = 'none';

        // Рекурсивно добавляем детей
        if (Array.isArray(value)) {
            value.forEach((item, index) => {
                childrenContainer.appendChild(buildTree(item, index.toString()));
            });
        } else {
            Object.keys(value).forEach(childKey => {
                childrenContainer.appendChild(buildTree(value[childKey], childKey));
            });
        }
        li.appendChild(childrenContainer);

        // Логика сворачивания/разворачивания
        let expanded = true;
        toggle.addEventListener('click', (e) => {
            e.stopPropagation();
            if (expanded) {
                childrenContainer.style.display = 'none';
                toggle.textContent = '▶';
            } else {
                childrenContainer.style.display = 'block';
                toggle.textContent = '▼';
            }
            expanded = !expanded;
        });
    }

    return li;
}

// ============================================================================
// ОБНОВЛЕНИЕ ПРЕДПРОСМОТРА JSON
// ============================================================================
function updateJsonPreview() {
    const jsonPreview = document.getElementById('jsonPreview');
    try {
        const obj = JSON.parse(debugTextarea.value);
        jsonPreview.innerHTML = syntaxHighlight(JSON.stringify(obj, null, 2));
    } catch (e) {
        jsonPreview.textContent = debugTextarea.value;
    }
}

// ============================================================================
// ПОДСВЕТКА JSON
// ============================================================================
function syntaxHighlight(json) {
    json = json.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    return json.replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g, function (match) {
        let cls = 'json-number';
        if (/^"/.test(match)) {
            if (/:$/.test(match)) {
                cls = 'json-key';
            } else {
                cls = 'json-string';
            }
        } else if (/true|false/.test(match)) {
            cls = 'json-boolean';
        } else if (/null/.test(match)) {
            cls = 'json-null';
        }
        return '<span class="' + cls + '">' + match + '</span>';
    });
}

// ============================================================================
// ОТОБРАЖЕНИЕ ИНФОРМАЦИИ О ПАРСИНГЕ
// ============================================================================
function displayInfo(data) {
    const info = data.parsing_info || { status: 'unknown' };
    const infoPreview = document.getElementById('infoPreview');
    infoPreview.innerHTML = `
        <div style="background:#222; padding:12px; border-radius:8px;">
            <p><strong>Статус:</strong> <span style="color:${info.status === 'OK' ? '#0f0' : info.status === 'WARN' ? '#ff0' : '#f44'}">${info.status}</span></p>
            <p><strong>Подход:</strong> ${info.approach || '—'}</p>
            <p><strong>Операций извлечено:</strong> ${info.extractedOperationsCount || 0}</p>
            <p><strong>Восстановлено объектов:</strong> ${info.recoveredCount || 0}</p>
            <p><strong>Заметки нормализации:</strong> ${info.normalizationNotes?.length || 0}</p>
            <p><strong>Статистика choices:</strong> ${info.choicesStats || '0/0'}</p>
            <p><strong>Статистика events:</strong> ${info.eventsStats || '0/0'}</p>
            <p><strong>Время парсинга:</strong> ${info.durationMs} мс</p>
            <details>
                <summary style="cursor:pointer; color:#d4af37;">Подробности ошибок</summary>
                <pre style="background:#1a1a1a; padding:8px; border-radius:4px; overflow:auto;">${JSON.stringify(info.knownFieldErrors || {}, null, 2)}</pre>
            </details>
            <details>
                <summary style="cursor:pointer; color:#d4af37;">Шаги парсинга</summary>
                <ul>${(info.parsingSteps || []).map(step => `<li>${step}</li>`).join('')}</ul>
            </details>
        </div>
    `;
}

// ============================================================================
// ОТОБРАЖЕНИЕ ЛОГОВ ПАРСИНГА
// ============================================================================
function displayLogs(data) {
    const logsPreview = document.getElementById('logsPreview');
    const steps = data.parsing_info?.parsingSteps || [];
    logsPreview.innerHTML = steps.map(step => `<div style="border-bottom:1px solid #333; padding:4px 0;">${step}</div>`).join('');
    if (steps.length === 0) logsPreview.innerHTML = '<div style="color:#666;">Логи отсутствуют</div>';
}

// ============================================================================
// ФОРМАТИРОВАНИЕ JSON
// ============================================================================
function formatJson() {
    try {
        const obj = JSON.parse(debugTextarea.value);
        debugTextarea.value = JSON.stringify(obj, null, 2);
        updateJsonPreview();
        showToast('✅ JSON отформатирован');
    } catch (e) {
        showToast('❌ Некорректный JSON');
    }
}

// ============================================================================
// ЗАГРУЗКА ПРИМЕРА
// ============================================================================
function loadSample(e) {
    const key = e.target.value;
    if (key && SAMPLE_RESPONSES[key]) {
        debugTextarea.value = SAMPLE_RESPONSES[key];
        updateJsonPreview();
    }
}

// ============================================================================
// ЗАГРУЗКА ИЗ ФАЙЛА
// ============================================================================
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
            showToast(`✅ Загружен ${file.name}`);
        };
        reader.readAsText(file);
    };
    input.click();
}

// ============================================================================
// СОХРАНЕНИЕ JSON В ФАЙЛ
// ============================================================================
function saveJsonToFile() {
    const blob = new Blob([debugTextarea.value], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'debug_response.json';
    a.click();
    URL.revokeObjectURL(url);
    showToast('✅ JSON сохранён');
}

// ============================================================================
// ПОКАЗ ИСТОРИИ
// ============================================================================
function showHistory() {
    if (historyList.length === 0) {
        showToast('📭 История пуста');
        return;
    }
    const modal = document.createElement('div');
    modal.style.cssText = `
        position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
        background: #222; border: 2px solid #d4af37; border-radius: 12px;
        padding: 20px; max-width: 600px; width: 90%; max-height: 80vh; overflow: auto;
        z-index: 200001; color: #eee;
    `;
    modal.innerHTML = '<h3 style="margin-top:0;">История тестов</h3>';
    historyList.forEach((item, idx) => {
        const div = document.createElement('div');
        div.style.cssText = 'border-bottom:1px solid #444; padding:10px; cursor:pointer;';
        div.innerHTML = `<strong>${new Date(item.time).toLocaleString()}</strong> — ${item.scenePreview}`;
        div.addEventListener('click', () => {
            debugTextarea.value = item.json;
            updateJsonPreview();
            modal.remove();
            showToast('✅ Загружено из истории');
        });
        modal.appendChild(div);
    });
    const closeBtn = document.createElement('button');
    closeBtn.textContent = 'Закрыть';
    closeBtn.style.cssText = 'margin-top:15px; padding:8px 20px; background:#333; color:#fff; border:none; border-radius:6px; cursor:pointer;';
    closeBtn.onclick = () => modal.remove();
    modal.appendChild(closeBtn);
    document.body.appendChild(modal);
}

// ============================================================================
// ДОБАВЛЕНИЕ В ИСТОРИЮ
// ============================================================================
function addToHistory(json, result) {
    const scenePreview = result.scene ? result.scene.substring(0, 60) + '...' : '—';
    historyList.unshift({
        time: Date.now(),
        json: json,
        scenePreview: scenePreview
    });
    if (historyList.length > 10) historyList.pop();
    localStorage.setItem('debug_history', JSON.stringify(historyList));
    const historyBtn = document.getElementById('historyBtn');
    if (historyBtn) historyBtn.innerHTML = `📜 История (${historyList.length})`;
}

// ============================================================================
// КОПИРОВАНИЕ РЕЗУЛЬТАТА
// ============================================================================
function copyResult() {
    if (!currentParsingResult) {
        showToast('❌ Сначала выполните парсинг');
        return;
    }
    const text = JSON.stringify(currentParsingResult, null, 2);
    navigator.clipboard.writeText(text).then(() => showToast('✅ Результат скопирован'));
}

// ============================================================================
// ЭКСПОРТ PARSING_INFO
// ============================================================================
function exportInfo() {
    if (!currentParsingResult || !currentParsingResult.parsing_info) {
        showToast('❌ Нет данных parsing_info');
        return;
    }
    const info = currentParsingResult.parsing_info;
    const text = JSON.stringify(info, null, 2);
    const blob = new Blob([text], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'parsing_info.json';
    a.click();
    URL.revokeObjectURL(url);
    showToast('✅ parsing_info экспортирован');
}

// ============================================================================
// СРАВНЕНИЕ ДВУХ ОТВЕТОВ
// ============================================================================
function compareResponses() {
    const compareText = document.getElementById('compareTextarea')?.value;
    if (!compareText) {
        showToast('❌ Вставьте второй JSON');
        return;
    }
    try {
        const obj1 = JSON.parse(debugTextarea.value);
        const obj2 = JSON.parse(compareText);
        const keys1 = Object.keys(obj1).sort();
        const keys2 = Object.keys(obj2).sort();
        const allKeys = new Set([...keys1, ...keys2]);
        let html = '<table style="width:100%; border-collapse:collapse;">';
        html += '<tr><th>Ключ</th><th>Первый</th><th>Второй</th><th>Различие</th></tr>';
        allKeys.forEach(key => {
            const v1 = JSON.stringify(obj1[key]);
            const v2 = JSON.stringify(obj2[key]);
            const diff = v1 !== v2 ? '⚠️' : '✅';
            html += `<tr style="border-bottom:1px solid #333;">
                <td style="padding:4px;"><strong>${key}</strong></td>
                <td style="padding:4px; color:${v1 === v2 ? '#0f0' : '#ff0'};">${v1 || '—'}</td>
                <td style="padding:4px; color:${v1 === v2 ? '#0f0' : '#ff0'};">${v2 || '—'}</td>
                <td style="padding:4px;">${diff}</td>
            </tr>`;
        });
        html += '</table>';
        document.getElementById('compareResult').innerHTML = html;
    } catch (e) {
        showToast('❌ Ошибка парсинга одного из JSON');
    }
}

// ============================================================================
// ПОКАЗ УВЕДОМЛЕНИЯ
// ============================================================================
function showToast(message) {
    const toast = document.createElement('div');
    toast.textContent = message;
    toast.style.cssText = `
        position: fixed;
        top: 90px;
        left: 50%;
        transform: translateX(-50%);
        background: #111;
        color: #ffd700;
        padding: 14px 28px;
        border-radius: 30px;
        border: 2px solid #d4af37;
        z-index: 200000;
        box-shadow: 0 0 25px rgba(255,215,0,0.6);
        font-weight: bold;
    `;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
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
        const processed = Parser.processAIResponse(raw);
        currentParsingResult = processed;
        addToHistory(raw, processed);

        displayInfo(processed);
        displayLogs(processed);
        displayTree(processed); // обновляем дерево
        switchTab('info'); // можно оставить на info или переключить на tree, решайте

        showToast('✅ Парсинг выполнен');
    } catch (err) {
        showToast(`❌ Ошибка: ${err.message}`);
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

    originalSendAIRequest = API.sendAIRequest;

    try {
        const processedData = Parser.processAIResponse(raw);
        currentParsingResult = processedData;
        addToHistory(raw, processedData);

        const state = State.getState();
        const originalFreeMode = state.ui.freeMode.enabled;
        const originalFreeText = state.ui.freeMode.text;
        const originalSelectedActions = [...state.ui.selectedActions];

        State.updateUI({
            freeMode: { enabled: true, text: 'Debug action' },
            selectedActions: []
        });

        API.sendAIRequest = async () => {
            log.info(LOG_CATEGORIES.DEBUG, '🐞 [MOCK] sendAIRequest вернул тестовые данные');
            return processedData;
        };

        log.info(LOG_CATEGORIES.DEBUG, '🚀 Запускаем полный пайплайн через submitTurn() с freeMode');

        await Game.submitTurn();

        State.updateUI({
            freeMode: { enabled: originalFreeMode, text: originalFreeText },
            selectedActions: originalSelectedActions
        });

        Render.renderAll();

        lastSuccessfulJson = raw;
        localStorage.setItem('debug_last_json', raw);

        if (debugModalOverlay) closeDebugModal(true);
        showToast('✅ Полный пайплайн + рендер выполнен успешно');

    } catch (err) {
        console.error('❌ Ошибка в полном пайплайне:', err);
        showToast(`❌ Ошибка: ${err.message}`);
    } finally {
        if (originalSendAIRequest) API.sendAIRequest = originalSendAIRequest;
        isProcessing = false;
    }
}

// Автозапуск
initDebugResponse();

// Экспорт
export { initDebugResponse };