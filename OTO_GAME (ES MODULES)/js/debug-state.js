// ===============================================================
// Модуль: debug-ui.js - Отладочный UI для просмотра и копирования состояния
// ===============================================================
// Добавляет глобальную команду window.debugUI(), открывающую модальное окно
// с полным деревом состояния и кнопкой копирования в буфер обмена.
// ===============================================================

'use strict';

import { State } from './3-state.js';
import { Utils } from './2-utils.js';

/**
 * Генерирует текстовое представление состояния для отладки
 * @returns {string} Многострочный текст с детализацией
 */
function generateDebugText() {
    const state = State.getState();
    const lines = [];

    lines.push('='.repeat(60));
    lines.push('📱 ПОЛНОЕ СОСТОЯНИЕ ИГРЫ (ФОРМАТ 4.1)');
    lines.push('='.repeat(60));
    lines.push(`🆔 Game ID: ${state.gameId}`);
    lines.push(`🔄 Ход: ${state.turnCount}`);
    lines.push(`🎮 Тип игры: ${state.gameType}`);
    lines.push(`📦 Всего game_item в герое: ${state.heroState.length}`);
    lines.push(`🧠 Мыслей в очереди: ${state.thoughtsOfHero.length}`);
    lines.push(`📜 История: ${state.gameState.history.length} записей`);
    lines.push('');

    // Герой: группировка по типам
    const heroGroups = {};
    state.heroState.forEach(item => {
        const type = item.id.split(':')[0];
        if (!heroGroups[type]) heroGroups[type] = [];
        heroGroups[type].push(item);
    });

    lines.push('🦸 ГЕРОЙ (game_item):');
    Object.keys(heroGroups).sort().forEach(type => {
        const items = heroGroups[type];
        lines.push(`  📁 ${type.toUpperCase()} (${items.length}):`);
        items.forEach(item => {
            const valueStr = typeof item.value === 'object' ? JSON.stringify(item.value) : item.value;
            lines.push(`    • ${item.id}: ${valueStr}`);
            // дополнительные поля, кроме id и value
            const extra = Object.keys(item).filter(k => !['id', 'value'].includes(k));
            if (extra.length) {
                extra.forEach(k => {
                    const v = typeof item[k] === 'object' ? JSON.stringify(item[k]) : item[k];
                    lines.push(`        ${k}: ${v}`);
                });
            }
        });
    });

    // Текущая сцена
    lines.push('');
    lines.push('🎭 ТЕКУЩАЯ СЦЕНА:');
    const scene = state.gameState.currentScene;
    if (scene) {
        lines.push(`  scene: ${scene.scene ? scene.scene.substring(0, 200) + '…' : 'нет'}`);
        lines.push(`  choices: ${scene.choices?.length || 0}`);
        lines.push(`  events: ${scene.events?.length || 0}`);
        lines.push(`  typology: ${scene.typology || 'нет'}`);
        lines.push(`  reflection: ${scene.reflection || 'нет'}`);
        lines.push(`  design_notes: ${scene.design_notes || 'нет'}`);
        if (scene.aiMemory && Object.keys(scene.aiMemory).length) {
            lines.push(`  aiMemory: ${JSON.stringify(scene.aiMemory).substring(0, 200)}…`);
        }
    } else {
        lines.push('  нет');
    }

    // gameState дополнительные поля
    lines.push('');
    lines.push('📁 GAME STATE:');
    lines.push(`  summary: ${state.gameState.summary || 'нет'}`);
    lines.push(`  organizationsHierarchy: ${Object.keys(state.gameState.organizationsHierarchy || {}).length} организаций`);
    lines.push(`  gameUserPrompt: ${state.gameState.gameUserPrompt || 'нет'}`);
    lines.push(`  gameScript: ${state.gameState.gameScript ? 'присутствует' : 'нет'}`);
    lines.push(`  initLastData: ${Object.keys(state.gameState.initLastData || {}).length} полей`);

    // Настройки
    lines.push('');
    lines.push('⚙️ НАСТРОЙКИ:');
    lines.push(`  apiProvider: ${state.settings.apiProvider}`);
    lines.push(`  model: ${state.settings.model}`);
    lines.push(`  scale: ${state.settings.scale}`);

    // Последние мысли
    if (state.thoughtsOfHero.length) {
        lines.push('');
        lines.push('💭 ПОСЛЕДНИЕ МЫСЛИ:');
        state.thoughtsOfHero.slice(-5).forEach((t, i) => {
            lines.push(`  [${i}] ${t}`);
        });
    }

    // Последние изменения хода
    if (state.lastTurnUpdates) {
        lines.push('');
        lines.push('🔄 ПОСЛЕДНИЕ ИЗМЕНЕНИЯ (HTML):');
        lines.push(state.lastTurnUpdates.replace(/<[^>]+>/g, ' ').substring(0, 500) + '…');
    }

    lines.push('');
    lines.push('='.repeat(60));
    lines.push('✅ КОНЕЦ ДАМПА');

    return lines.join('\n');
}

/**
 * Открывает модальное окно с отладочной информацией и кнопкой копирования
 */
function openDebugModal() {
    const text = generateDebugText();

    // Создаём элементы модального окна
    const modal = document.createElement('div');
    modal.id = 'oto-debug-modal';
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.85);
        z-index: 20000;
        display: flex;
        justify-content: center;
        align-items: center;
        font-family: 'Courier New', monospace;
        font-size: 12px;
        line-height: 1.4;
    `;

    const content = document.createElement('div');
    content.style.cssText = `
        background: #1a1a1a;
        color: #eee;
        width: 90%;
        max-width: 1200px;
        height: 90%;
        border-radius: 8px;
        border: 1px solid #fbc531;
        box-shadow: 0 0 30px rgba(251,197,49,0.2);
        display: flex;
        flex-direction: column;
        overflow: hidden;
    `;

    const header = document.createElement('div');
    header.style.cssText = `
        background: #2d2d2d;
        padding: 10px 15px;
        border-bottom: 1px solid #fbc531;
        display: flex;
        justify-content: space-between;
        align-items: center;
        flex-shrink: 0;
    `;
    header.innerHTML = `
        <span style="color:#fbc531; font-weight:bold; font-size:14px;">
            🐞 ОТЛАДОЧНАЯ ИНФОРМАЦИЯ
        </span>
        <div>
            <button id="debug-copy-btn" style="
                background: #fbc531;
                border: none;
                color: #000;
                padding: 5px 15px;
                border-radius: 4px;
                cursor: pointer;
                font-weight: bold;
                margin-right: 10px;
            ">📋 КОПИРОВАТЬ ВСЁ</button>
            <button id="debug-close-btn" style="
                background: transparent;
                border: 1px solid #fbc531;
                color: #fbc531;
                padding: 5px 15px;
                border-radius: 4px;
                cursor: pointer;
                font-weight: bold;
            ">✕ ЗАКРЫТЬ</button>
        </div>
    `;

    const textarea = document.createElement('textarea');
    textarea.readOnly = true;
    textarea.style.cssText = `
        width: 100%;
        flex: 1;
        background: #0d0d0d;
        color: #ccc;
        border: none;
        padding: 15px;
        font-family: 'Courier New', monospace;
        font-size: 12px;
        line-height: 1.4;
        resize: none;
        outline: none;
        white-space: pre;
        overflow: auto;
    `;
    textarea.value = text;

    content.appendChild(header);
    content.appendChild(textarea);
    modal.appendChild(content);
    document.body.appendChild(modal);

    // Обработчики
    const closeBtn = document.getElementById('debug-close-btn');
    closeBtn.onclick = () => {
        document.body.removeChild(modal);
    };

    const copyBtn = document.getElementById('debug-copy-btn');
    copyBtn.onclick = () => {
        textarea.select();
        navigator.clipboard.writeText(text).then(() => {
            Utils.showToast('Скопировано в буфер обмена!', 'success', 2000);
        }).catch(err => {
            Utils.showToast('Ошибка копирования', 'error', 2000);
            console.error(err);
        });
    };

    modal.onclick = (e) => {
        if (e.target === modal) {
            document.body.removeChild(modal);
        }
    };

    // Фокус на textarea для удобства прокрутки
    textarea.focus();
}

// Глобальные команды
if (typeof window !== 'undefined') {
    window.debugUI = openDebugModal;
    window.stFull = () => {
        openDebugModal();
        return State.getState(); // для консоли
    };

    console.log(`
📱 ГЛОБАЛЬНЫЕ КОМАНДЫ ДЛЯ ОТЛАДКИ (ОБНОВЛЕНЫ):
• debugUI()      - открыть модальное окно с полным состоянием и копированием
• stFull()       - то же самое (для обратной совместимости)
• st()           - полная информация в консоли (прежняя)
• s()            - краткая сводка в консоли
• stHero()       - детализация героя в консоли
• stFind("...")  - поиск в консоли
• stJson()       - экспорт JSON в консоль
• stPart('...')  - частичный просмотр
    `);
}

// Экспорт функций для использования в других модулях
export const DebugUI = {
    open: openDebugModal,
    generateText: generateDebugText
};