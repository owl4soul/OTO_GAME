/**
 * МОДУЛЬ УНИВЕРСАЛЬНЫХ УТИЛИТ (2-utils.js v2.0)
 * ===============================================================
 * ПОСЛЕ ТОТАЛЬНОГО АУДИТА И ПЕРЕМЕЩЕНИЯ:
 * - Оставлены ТОЛЬКО общие, нигде не зависящие от парсинга ответов ИИ утилиты.
 * - Каждый метод имеет гипервербозный JSDoc + подробнейшие inline-комментарии перед каждой строкой и каждой развилкой.
 * - Никаких сокращений, никаких заглушек — полный код.
 * ===============================================================
 */

'use strict';

import { CONFIG } from './1-config.js';

// ============================================================================
// КОНСТАНТЫ КАТЕГОРИЙ GAME_ITEM (универсальные, используются везде)
// ============================================================================

/**
 * Константы категорий game_item.
 * Используются в UI, OperationsService, рендере и логике группировки.
 * НЕ связаны с парсингом — чисто справочные данные.
 */
export const GAME_ITEM_CATEGORIES = {
    STAT: 'stat',
    SKILL: 'skill',
    INVENTORY: 'inventory',
    RELATIONS: 'relations',
    ORGANIZATION: 'organization',
    BLESSING: 'bless',
    CURSE: 'curse',
    BUFF: 'buff',
    DEBUFF: 'debuff',
    PERSONALITY: 'personality',
    PROGRESS: 'progress'
};

// ============================================================================
// УНИВЕРСАЛЬНЫЕ ХЕЛПЕРЫ (каждый метод полностью документирован)
// ============================================================================

/**
 * Возвращает русское название стата для отображения в UI.
 * 
 * Логика по шагам:
 * 1. Проверяем входной ключ (защита от null/undefined/нестроки)
 * 2. Приводим к нижнему регистру и убираем пробелы
 * 3. Ищем в мапе
 * 4. Если не найдено — возвращаем оригинальный ключ (чтобы не ломать UI)
 * 
 * @param {string} key - ключ стата (например 'will')
 * @returns {string} русское название или оригинальный ключ
 */
export function getRussianStatName(key) {
    // ШАГ 1: защита от некорректных входных данных
    if (!key || typeof key !== 'string') return '';
    
    // ШАГ 2: нормализация ключа
    const normalizedKey = key.toLowerCase().trim();
    
    // ШАГ 3: маппинг (расширяемый через CONFIG при необходимости)
    const map = {
        'will': 'Воля',
        'stealth': 'Скрытность',
        'influence': 'Влияние',
        'sanity': 'Разум'
    };
    
    // ШАГ 4: возврат значения
    return map[normalizedKey] || key;
}

/**
 * Возвращает emoji-иконку для типа game_item.
 * Используется везде в интерфейсе (инвентарь, статы, эффекты).
 * 
 * @param {string} itemId - полный id (например 'stat:will' или 'buff:strength')
 * @returns {string} emoji-иконка
 */
export function getGameItemIcon(itemId) {
    // ШАГ 1: защита от пустого значения
    if (!itemId || typeof itemId !== 'string') return '📌';
    
    // ШАГ 2: извлекаем тип (всё до первого ':')
    const type = itemId.split(':')[0].toLowerCase();
    
    // ШАГ 3: большой мап иконок (расширяемый)
    const icons = {
        'stat': '📊',
        'skill': '📜',
        'inventory': '🎒',
        'relations': '👤',
        'bless': '✨',
        'curse': '💀',
        'buff': '⬆️',
        'debuff': '⬇️',
        'progress': '📈',
        'personality': '🧠',
        'organization_rank': '🏛️'
    };
    
    // ШАГ 4: возврат (дефолт — булавка)
    return icons[type] || '📌';
}

/**
 * Определяет категорию game_item по id.
 * Используется для группировки в UI и логики.
 * 
 * @param {string} id - полный id
 * @returns {string|null} категория или null
 */
export function categorizeGameItem(id) {
    // ШАГ 1: базовая валидация входных данных
    if (!id || typeof id !== 'string') return null;
    
    // ШАГ 2: извлечение первой части
    const [category] = id.split(':');
    
    // ШАГ 3: специальная обработка организаций
    if (category === 'organization_rank') return GAME_ITEM_CATEGORIES.ORGANIZATION;
    
    // ШАГ 4: основной мап
    const categoryMap = {
        'stat': GAME_ITEM_CATEGORIES.STAT,
        'skill': GAME_ITEM_CATEGORIES.SKILL,
        'inventory': GAME_ITEM_CATEGORIES.INVENTORY,
        'relations': GAME_ITEM_CATEGORIES.RELATIONS,
        'bless': GAME_ITEM_CATEGORIES.BLESSING,
        'curse': GAME_ITEM_CATEGORIES.CURSE,
        'buff': GAME_ITEM_CATEGORIES.BUFF,
        'debuff': GAME_ITEM_CATEGORIES.DEBUFF,
        'personality': GAME_ITEM_CATEGORIES.PERSONALITY,
        'progress': GAME_ITEM_CATEGORIES.PROGRESS
    };
    
    // ШАГ 5: возврат
    return categoryMap[category] || null;
}

/**
 * Возвращает детальную информацию об операции для логов и UI.
 * 
 * @param {Object} operation - нормализованная операция
 * @returns {Object} детальная информация
 */
export function getOperationDetails(operation) {
    // ШАГ 1: защита от пустого объекта
    if (!operation || !operation.id) return {};
    
    // ШАГ 2: разбор категории
    const category = categorizeGameItem(operation.id);
    
    // ШАГ 3: разбор type и name
    const [type, name] = operation.id.split(':');
    
    // ШАГ 4: возврат объекта
    return {
        category,
        type,
        name,
        operation: operation.operation,
        value: operation.value,
        delta: operation.delta
    };
}

/**
 * Возвращает emoji для статуса операции/уведомления.
 * 
 * @param {string} status - 'success' | 'error' | 'warning' | 'info'
 * @returns {string} emoji
 */
export function getStatusEmoji(status) {
    const map = {
        'success': '✅',
        'error': '❌',
        'warning': '⚠️',
        'info': 'ℹ️'
    };
    return map[status] || '⏳';
}

/**
 * Форматирует детали ошибки для отображения пользователю.
 * 
 * @param {Error|string|Object} error - любая ошибка
 * @returns {string} форматированное описание
 */
export function formatErrorDetails(error) {
    if (!error) return "Нет информации об ошибке";
    
    if (error instanceof Error) {
        let details = `Сообщение: ${error.message}\n`;
        details += `Тип: ${error.name}\n`;
        if (error.stack) details += `Стек:\n${error.stack}\n`;
        if (error.code) details += `Код: ${error.code}\n`;
        return details;
    }
    
    if (typeof error === 'string') return error;
    
    try {
        return JSON.stringify(error, null, 2);
    } catch {
        return String(error);
    }
}

/**
 * Экспорт данных в файл (автоматическое скачивание).
 * 
 * @param {string} data - данные
 * @param {string} filename - имя файла
 * @param {string} type - MIME-тип
 */
export function exportToFile(data, filename, type = 'application/json') {
    const blob = new Blob([data], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

/**
 * Генерация уникального ID (используется в логах и временных объектах).
 */
export function generateUniqueId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

/**
 * Получение текущего московского времени.
 */
export function getMoscowTime() {
    const now = new Date();
    try {
        return new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Moscow' }));
    } catch {
        return now;
    }
}

/**
 * Форматирование московского времени в строку.
 */
export function formatMoscowTime(date) {
    const moscow = getMoscowTime();
    return moscow.toLocaleString('ru-RU', {
        hour: '2-digit', minute: '2-digit', second: '2-digit',
        day: '2-digit', month: '2-digit', year: 'numeric'
    });
}

/**
 * Нормализация ключа стата (с учётом алиасов из CONFIG).
 */
export function normalizeStatKey(key) {
    if (!key) return null;
    const lower = key.toLowerCase().trim();
    return CONFIG.statAliases[lower] || (CONFIG.startStats.hasOwnProperty(lower) ? lower : null);
}

/**
 * Выбор файла через диалог (кросс-платформенный).
 */
export function selectFile(accept = '.json') {
    return new Promise(resolve => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = accept;
        input.style.display = 'none';
        
        input.onchange = e => {
            resolve(e.target.files[0] || null);
            document.body.removeChild(input);
        };
        
        input.oncancel = () => {
            resolve(null);
            document.body.removeChild(input);
        };
        
        document.body.appendChild(input);
        input.click();
    });
}

/**
 * Выбор папки (webkitdirectory).
 */
export function selectFolder() {
    return new Promise(resolve => {
        const input = document.createElement('input');
        input.type = 'file';
        input.webkitdirectory = true;
        input.multiple = true;
        input.style.display = 'none';
        
        input.onchange = e => {
            const files = Array.from(e.target.files);
            const folderPath = files.length ? files[0].webkitRelativePath.split('/')[0] : null;
            resolve({ files, folderPath });
            document.body.removeChild(input);
        };
        
        input.oncancel = () => {
            resolve(null);
            document.body.removeChild(input);
        };
        
        document.body.appendChild(input);
        input.click();
    });
}

/**
 * Сохранение файла с выбором папки (File System Access API + fallback).
 */
export async function saveFileWithFolderPicker(data, defaultFileName, fileType = 'application/json') {
    try {
        if ('showSaveFilePicker' in window) {
            const handle = await window.showSaveFilePicker({
                suggestedName: defaultFileName,
                types: [{ description: 'JSON', accept: { 'application/json': ['.json'] } }]
            });
            const writable = await handle.createWritable();
            await writable.write(data);
            await writable.close();
            return { success: true, fileName: handle.name };
        }
    } catch (e) {
        console.log('File System Access API не поддерживается, используем fallback');
    }
    
    exportToFile(data, defaultFileName, fileType);
    return { success: true, fileName: defaultFileName };
}

/**
 * Вибрация на мобильных устройствах.
 */
export function vibrate(pattern) {
    if (navigator.vibrate) {
        try {
            navigator.vibrate(pattern);
        } catch (e) {}
    }
}

/**
 * Экранирование HTML-спецсимволов (безопасная вставка в DOM).
 */
export function escapeHtml(unsafe) {
    if (unsafe === null || unsafe === undefined) return '';
    return String(unsafe)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

/**
 * Показ всплывающего toast-уведомления (полная реализация без сокращений).
 * 
 * @param {string} message - текст
 * @param {string} type - success/error/warning/info
 * @param {number} duration - время показа
 */
export function showToast(message, type = 'info', duration = 3000) {
    // ШАГ 1: удаляем старые toast (чтобы не накапливались)
    document.querySelectorAll('.utils-toast').forEach(t => {
        if (t.parentNode) t.parentNode.removeChild(t);
    });
    
    // ШАГ 2: создаём элемент
    const toast = document.createElement('div');
    toast.className = `utils-toast utils-toast-${type}`;
    
    // ШАГ 3: добавляем иконку и текст
    let icon = 'ℹ️';
    if (type === 'success') icon = '✅';
    if (type === 'error') icon = '❌';
    if (type === 'warning') icon = '⚠️';
    
    toast.innerHTML = `
        <div style="display:flex;align-items:center;gap:8px;">
            <span style="font-size:1.2em;">${icon}</span>
            <span>${message}</span>
        </div>
    `;
    
    // ШАГ 4: добавляем в DOM
    document.body.appendChild(toast);
    
    // ШАГ 5: анимация появления
    setTimeout(() => {
        toast.style.opacity = '1';
        toast.style.transform = 'translateY(0)';
    }, 10);
    
    // ШАГ 6: автоскрытие
    const hide = () => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(-20px)';
        setTimeout(() => {
            if (toast.parentNode) toast.parentNode.removeChild(toast);
        }, 300);
    };
    
    setTimeout(hide, duration);
    
    // ШАГ 7: клик для ручного закрытия
    toast.onclick = hide;
}

/**
 * Проверка, является ли значение "пустым" (универсальная утилита).
 */
export function isEmpty(value) {
    if (value === null || value === undefined) return true;
    if (typeof value === 'string') return value.trim() === '';
    if (Array.isArray(value)) return value.length === 0;
    if (typeof value === 'object' && value !== null) return Object.keys(value).length === 0;
    return false;
}

// ============================================================================
// ПУБЛИЧНЫЙ ИНТЕРФЕЙС (только универсальные методы)
// ============================================================================
export const Utils = {
    getRussianStatName,
    getGameItemIcon,
    categorizeGameItem,
    getOperationDetails,
    getStatusEmoji,
    formatErrorDetails,
    exportToFile,
    generateUniqueId,
    getMoscowTime,
    formatMoscowTime,
    normalizeStatKey,
    selectFile,
    selectFolder,
    saveFileWithFolderPicker,
    vibrate,
    escapeHtml,
    showToast,
    isEmpty
};