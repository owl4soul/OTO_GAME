// Модуль: GAMEITEM UI MANAGER - Универсальный менеджер отображения различных game_item
'use strict';

import { State } from './3-state.js';
import { Utils } from './2-utils.js';
import { CONFIG } from './1-config.js';

class GameItemUIManager {
    constructor() {
        console.log('🔧 GameItemUIManager: конструктор вызван');
        
        // DOM элементы для каждого типа game item
        this.containers = {};
        // Конфигурация отображения для каждого типа
        this.typeConfigs = {};
        // Кэш для оптимизации рендеринга
        this.renderCache = new Map();
        // Последний отрендеренный ход
        this.lastRenderedTurn = 0;
        // Инициализируем
        this.initialized = false;
        // Ссылка на текущую модалку иерархии (для предотвращения дублирования)
        this.currentHierarchyModal = null;
        
        // ПЕРВОЕ: инициализируем typeConfigs ПЕРЕД использованием
        this.initializeTypeConfigs();
    }
    
    /**
     * Инициализация конфигурации типов (исправленная - безопасное создание)
     */
    initializeTypeConfigs() {
        console.log('🔧 GameItemUIManager: инициализация конфигурации типов');
        
        this.typeConfigs = {
            // ЛИЧНОСТЬ - ЖЁЛТЫЙ (ВСЕГДА ОТОБРАЖАЕТСЯ)
            'personality': {
                containerId: 'personalityBlockContainer',
                title: 'ЛИЧНОСТЬ',
                icon: 'fas fa-user-circle',
                color: '#fbc531',
                borderColor: '#4a3a0a',
                renderFunction: () => this.renderPersonality(), // БЕЗОПАСНЫЙ ВЫЗОВ
                priority: 100,
                alwaysVisible: true
            },
            
            // ТИПОЛОГИЯ - ЗЕЛЁНЫЙ (ВСЕГДА ОТОБРАЖАЕТСЯ)
            'typology': {
                containerId: 'typologyContainer',
                title: 'ТИПОЛОГИЯ',
                icon: 'fas fa-fingerprint',
                color: '#4cd137',
                borderColor: '#2d8b57',
                renderFunction: () => this.renderTypology(), // БЕЗОПАСНЫЙ ВЫЗОВ
                priority: 95,
                alwaysVisible: true
            },
            
            // ОРГАНИЗАЦИИ - ЗОЛОТОЙ (НОВЫЙ БЛОК, ВСЕГДА ОТОБРАЖАЕТСЯ)
            'organization': {
                containerId: 'organizationsContainer',
                title: 'ОРГАНИЗАЦИИ',
                icon: 'fas fa-users',
                color: '#d4af37',
                borderColor: '#8b4513',
                renderFunction: () => this.renderOrganizations(), // БЕЗОПАСНЫЙ ВЫЗОВ
                priority: 85,
                alwaysVisible: true
            },
            
            // ОТНОШЕНИЯ - НЕЖНО-РОЗОВЫЙ
            'relations': {
                containerId: 'relationsContainer',
                title: 'ОТНОШЕНИЯ',
                icon: 'fas fa-users',
                color: '#ff9ff3',
                borderColor: '#6a2a5a',
                renderFunction: () => this.renderRelations(), // БЕЗОПАСНЫЙ ВЫЗОВ
                priority: 90,
                alwaysVisible: false
            },
            
            // НАВЫКИ - ТЁМНО-ФИОЛЕТОВЫЙ
            'skill': {
                containerId: 'skillsContainer',
                title: 'НАВЫКИ',
                icon: 'fas fa-scroll',
                color: '#6c5ce7',
                borderColor: '#3a2a6a',
                renderFunction: () => this.renderSkills(), // БЕЗОПАСНЫЙ ВЫЗОВ
                priority: 85,
                alwaysVisible: false
            },
            
            // +/- К СТАТАМ - СИНИЙ
            'stat_buffs': {
                containerId: 'statBuffsContainer',
                title: '+/- К СТАТАМ',
                icon: 'fas fa-tachometer-alt',
                color: '#3498db',
                borderColor: '#1a4a7a',
                renderFunction: () => this.renderStatBuffs(), // БЕЗОПАСНЫЙ ВЫЗОВ
                priority: 80,
                alwaysVisible: false
            },
            
            // БЛАГОСЛОВЕНИЯ - СЕРЕБРЯНО-БЕЛЫЙ
            'bless': {
                containerId: 'blessingsContainer',
                title: 'БЛАГОСЛОВЕНИЯ',
                icon: 'fas fa-star',
                color: '#bdc3c7',
                borderColor: '#6a6a6a',
                renderFunction: () => this.renderBlessings(), // БЕЗОПАСНЫЙ ВЫЗОВ
                priority: 75,
                alwaysVisible: false
            },
            
            // ПРОКЛЯТИЯ - КРАСНЫЙ
            'curse': {
                containerId: 'cursesContainer',
                title: 'ПРОКЛЯТИЯ',
                icon: 'fas fa-skull-crossbones',
                color: '#ff3838',
                borderColor: '#8a0a0a',
                renderFunction: () => this.renderCurses(), // БЕЗОПАСНЫЙ ВЫЗОВ
                priority: 70,
                alwaysVisible: false
            },
            
            // БАФФЫ/ДЕБАФФЫ - ГОЛУБОЙ
            'buff_debuff': {
                containerId: 'buffsDebuffsContainer',
                title: 'БАФФЫ/ДЕБАФФЫ',
                icon: 'fas fa-chart-line',
                color: '#00cec9',
                borderColor: '#0a4a4a',
                renderFunction: () => this.renderBuffsDebuffs(), // БЕЗОПАСНЫЙ ВЫЗОВ
                priority: 65,
                alwaysVisible: false
            },
            
            // ДЕТАЛИ - ГОЛУБОЙ (дополнительные game items)
            'details': {
                containerId: 'detailsContainer',
                title: 'ДЕТАЛИ',
                icon: 'fas fa-info-circle',
                color: '#00cec9',
                borderColor: '#0a4a4a',
                renderFunction: () => this.renderDetails(), // БЕЗОПАСНЫЙ ВЫЗОВ
                priority: 60,
                alwaysVisible: false
            },
            
            // ИНВЕНТАРЬ - КОРИЧНЕВЫЙ
            'inventory': {
                containerId: 'inventoryContainer',
                title: 'ИНВЕНТАРЬ',
                icon: 'fas fa-box',
                color: '#8b4513',
                borderColor: '#4a2a0a',
                renderFunction: () => this.renderInventory(), // БЕЗОПАСНЫЙ ВЫЗОВ
                priority: 55,
                alwaysVisible: false
            }
        };
        
        console.log('✅ Конфигурация типов инициализирована:', Object.keys(this.typeConfigs));
    }
    
    /**
     * Инициализация менеджера
     */
    initialize() {
        if (this.initialized) {
            console.log('⚠️ GameItemUI уже инициализирован');
            return;
        }
        
        console.log('🎮 Инициализация GameItemUIManager...');
        
        // Находим и кэшируем DOM контейнеры
        this.cacheContainers();
        
        // Регистрируем глобальные функции ТОЛЬКО если они еще не существуют
        if (!window.showOrganizationHierarchy) {
            window.showOrganizationHierarchy = (orgId) => this.showOrganizationHierarchy(orgId);
            console.log('🌐 Глобальная функция showOrganizationHierarchy зарегистрирована');
        }
        
        if (!window.showGameItemTooltip) {
            window.showGameItemTooltip = (element, gameItem) => this.showGameItemTooltip(element, gameItem);
            console.log('🌐 Глобальная функция showGameItemTooltip зарегистрирована');
        }
        
        // Подписываемся на события изменений героя
        this.setupEventListeners();
        
        // Первоначальный рендеринг ВСЕХ контейнеров (даже пустых)
        this.renderAll();
        
        this.initialized = true;
        console.log('✅ GameItemUIManager инициализирован');
    }
    
    /**
     * Кэширует DOM контейнеры для каждого типа
     */
    cacheContainers() {
        // Основной контейнер для всех game items
        this.mainContainer = document.getElementById('personalityDisplay')?.parentNode;
        if (!this.mainContainer) {
            console.error('❌ GameItemUIManager: Не найден основной контейнер для game items');
            // Создаем резервный контейнер если основной не найден
            this.createFallbackContainer();
            return;
        }
        
        console.log('📦 GameItemUIManager: Найден основной контейнер:', this.mainContainer.id);
        
        // Создаем DOM элементы для каждого типа, если их нет
        Object.values(this.typeConfigs).forEach(config => {
            // Удаляем существующий контейнер (очищаем старый)
            const existing = document.getElementById(config.containerId);
            if (existing) {
                existing.remove();
                console.log(`🗑️ Удален старый контейнер: ${config.containerId}`);
            }
            
            // Создаем новый контейнер
            const container = document.createElement('div');
            container.id = config.containerId;
            container.className = 'game-item-section';
            container.style.cssText = 'margin-bottom: 8px; display: block;'; // ВСЕГДА display: block
            
            this.containers[config.containerId] = container;
            console.log(`📦 Создан контейнер: ${config.containerId} (alwaysVisible: ${config.alwaysVisible})`);
        });
    }
    
    /**
     * Создает резервный контейнер если основной не найден
     */
    createFallbackContainer() {
        console.warn('⚠️ Создаем резервный контейнер для game items');
        this.mainContainer = document.createElement('div');
        this.mainContainer.id = 'gameItemsFallbackContainer';
        this.mainContainer.style.cssText = 'position: relative; width: 100%; height: 100%; overflow-y: auto;';
        document.body.appendChild(this.mainContainer);
    }
    
    /**
     * Настраивает подписки на события
     */
    setupEventListeners() {
        // Подписываемся на изменения героя (для немедленных обновлений)
        State.on(State.EVENTS.HERO_CHANGED, (data) => {
            console.log('🎯 GameItemUI: HERO_CHANGED событие', data);
            // Для немедленной обратной связи
            this.handleHeroChanged(data);
        });
        
        // Подписываемся на завершение хода (для гарантированного одного рендера за ход)
        State.on(State.EVENTS.TURN_COMPLETED, (data) => {
            this.handleTurnCompleted(data?.turnCount || State.getState().turnCount);
        });
        
        // Подписываемся на изменения сцены (для типологии)
        State.on(State.EVENTS.SCENE_CHANGED, (data) => {
            this.handleSceneChanged(data);
        });
        
        // Подписываемся на изменения организаций
        State.on(State.EVENTS.ORGANIZATION_JOINED, (data) => {
            console.log('🎯 GameItemUI: ORGANIZATION_JOINED событие', data);
            this.renderType(this.typeConfigs.organization);
        });
        
        State.on(State.EVENTS.ORGANIZATION_RANK_CHANGED, (data) => {
            console.log('🎯 GameItemUI: ORGANIZATION_RANK_CHANGED событие', data);
            this.renderType(this.typeConfigs.organization);
        });
        
        State.on(State.EVENTS.ORGANIZATION_HIERARCHY_UPDATED, (data) => {
            console.log('🎯 GameItemUI: ORGANIZATION_HIERARCHY_UPDATED событие', data);
            this.renderType(this.typeConfigs.organization);
        });
        
        console.log('🔗 GameItemUIManager: все подписки установлены');
    }
    
    /**
     * Обработчик изменения героя
     * @param {Object} data Данные события
     */
    handleHeroChanged(data) {
        // Оптимизация: обновляем только изменившиеся типы
        const changedTypes = this.getChangedItemTypes(data.operations || []);
        
        if (changedTypes.length === 0 && !data.categories?.includes('typology')) {
            console.log('🔍 Нет изменений в game items, пропускаем рендеринг');
            return;
        }
        
        console.log('🔄 GameItemUI: обновление для типов:', changedTypes);
        
        // Для каждого измененного типа выполняем рендеринг
        changedTypes.forEach(type => {
            const config = Object.values(this.typeConfigs).find(c => 
                this.getTypeFromConfig(c) === type
            );
            if (config) {
                this.renderType(config);
            }
        });
        
        // Всегда обновляем организации, так как они могут измениться через операции
        this.renderType(this.typeConfigs.organization);
    }
    
    /**
     * Обработчик изменения сцены
     * @param {Object} data Данные события
     */
    handleSceneChanged(data) {
        // При изменении сцены обновляем типологию и личности
        this.renderType(this.typeConfigs.typology);
        this.renderType(this.typeConfigs.personality);
    }
    
    /**
     * Обработчик завершения хода
     */
    handleTurnCompleted(turnCount) {
        console.log(`🔄 GameItemUI: получен TURN_COMPLETED, ход ${turnCount}`);
        
        // Обновляем все контейнеры ВСЕГДА при завершении хода
        this.renderAll();
        this.lastRenderedTurn = turnCount;
        console.log('✅ GameItemUI: полный рендер выполнен после завершения хода');
    }
    
    /**
     * Определяет типы game items, которые изменились
     * @param {Array} operations Массив операций
     * @returns {Array} Массив типов
     */
    getChangedItemTypes(operations) {
        const types = new Set();
        
        operations.forEach(op => {
            if (!op.id) return;
            
            // Определяем тип по префиксу id
            const [prefix] = op.id.split(':');
            
            switch(prefix) {
                case 'personality':
                    types.add('personality');
                    break;
                case 'relations':
                    types.add('relations');
                    break;
                case 'skill':
                    types.add('skill');
                    break;
                case 'bless':
                    types.add('bless');
                    break;
                case 'curse':
                    types.add('curse');
                    break;
                case 'buff':
                case 'debuff':
                    // Определяем, к какому блоку относится
                    const statName = op.id.split(':')[1];
                    if (['will', 'stealth', 'influence', 'sanity'].includes(statName)) {
                        types.add('stat_buffs');
                    } else {
                        types.add('buff_debuff');
                    }
                    break;
                case 'inventory':
                    types.add('inventory');
                    break;
                case 'organization_rank':
                    types.add('organization');
                    break;
                default:
                    // Для неизвестных префиксов добавляем в детали
                    const knownPrefixes = ['stat', 'skill', 'inventory', 'relations', 
                                         'bless', 'curse', 'buff', 'debuff', 
                                         'personality', 'initiation_degree', 'progress',
                                         'organization_rank'];
                    if (!knownPrefixes.includes(prefix)) {
                        types.add('details');
                    }
                    break;
            }
        });
        
        return Array.from(types);
    }
    
    /**
     * Получает тип из конфигурации
     * @param {Object} config Конфигурация типа
     * @returns {String} Тип
     */
    getTypeFromConfig(config) {
        return Object.keys(this.typeConfigs).find(key => this.typeConfigs[key] === config);
    }
    
    /**
     * Рендерит все типы game items (ВСЕГДА отображает все контейнеры)
     */
    renderAll() {
        console.log('🎨 GameItemUI: ПОЛНЫЙ рендеринг ВСЕХ game items...');
        
        // Сортируем типы по приоритету
        const sortedTypes = Object.values(this.typeConfigs)
            .sort((a, b) => b.priority - a.priority);
        
        // Очищаем основной контейнер
        if (this.mainContainer) {
            this.mainContainer.innerHTML = '';
        } else {
            console.error('❌ Основной контейнер не найден при renderAll');
            return;
        }
        
        // Рендерим каждый тип ВСЕГДА
        sortedTypes.forEach(config => {
            this.renderType(config);
        });
        
        console.log('✅ GameItemUI: ВСЕ game items отрендерены (включая пустые)');
    }
    
    /**
     * Рендерит конкретный тип game items (ВСЕГДА создает контент)
     * @param {Object} config Конфигурация типа
     */
    renderType(config) {
        try {
            if (!this.containers[config.containerId]) {
                console.warn(`⚠️ Контейнер ${config.containerId} не найден в кэше`);
                return;
            }
            
            // Вызываем функцию рендеринга для этого типа (ВСЕГДА)
            const html = config.renderFunction();
            
            // ВСЕГДА обновляем контейнер (даже если html пустой)
            this.containers[config.containerId].innerHTML = html || '';
            
            // Добавляем контейнер в основной, если его там нет
            if (!this.containers[config.containerId].parentNode) {
                this.mainContainer.appendChild(this.containers[config.containerId]);
                console.log(`➕ Контейнер ${config.containerId} добавлен в основной контейнер`);
            }
            
            // ВСЕГДА показываем контейнер если он alwaysVisible ИЛИ содержит контент
            const shouldShow = config.alwaysVisible || html.trim() !== '';
            this.containers[config.containerId].style.display = shouldShow ? 'block' : 'none';
            
            if (shouldShow) {
                console.log(`👁️ Контейнер ${config.containerId} отображен (alwaysVisible: ${config.alwaysVisible}, имеет контент: ${html.trim() !== ''})`);
            }
            
        } catch (error) {
            console.error(`❌ Ошибка при рендеринге типа ${config.containerId}:`, error);
            // Даже при ошибке показываем контейнер с сообщением об ошибке
            this.containers[config.containerId].innerHTML = `
                <div style="color: #ff3838; font-size: 0.75em; padding: 4px;">
                    <i class="fas fa-exclamation-triangle"></i> Ошибка отображения
                </div>
            `;
            this.containers[config.containerId].style.display = 'block';
        }
    }
    
    /**
     * Создает базовый HTML для секции
     * @param {Object} config Конфигурация типа
     * @param {String} content HTML содержимое
     * @param {Number} count Количество элементов
     * @returns {String} HTML
     */
    createSectionHTML(config, content, count = 0) {
        return `
            <div class="section-header" style="color: ${config.color}; border-bottom: 1px solid ${config.borderColor}; padding: 2px 0; margin-bottom: 3px; font-size: 0.75em; font-weight: bold;">
                <i class="${config.icon}"></i> ${config.title}${count > 0 ? ` (${count})` : ''}
            </div>
            <div class="section-content" style="padding: 3px 0; font-size: 0.75em;">
                ${content}
            </div>
        `;
    }
    
    /**
     * Рендерит личность (ВСЕГДА отображается, даже если пустая)
     * @returns {String} HTML
     */
    renderPersonality() {
        try {
            const personalityVal = State.getGameItemValue('personality:hero');
            
            if (personalityVal && personalityVal.trim() !== '' && personalityVal !== 'true') {
                return this.createSectionHTML(
                    this.typeConfigs.personality,
                    `<div style="padding: 4px 0; color: #ccc; font-style: italic; line-height: 1.3;">
                        ${personalityVal}
                    </div>`
                );
            } else {
                return this.createSectionHTML(
                    this.typeConfigs.personality,
                    `<div style="padding: 4px 0; color: #888; font-style: italic;">
                        <i class="fas fa-user-clock"></i> Личность ещё не определена...
                    </div>`
                );
            }
        } catch (error) {
            console.error('❌ Ошибка рендеринга личности:', error);
            return this.createSectionHTML(
                this.typeConfigs.personality,
                `<div style="padding: 4px 0; color: #ff3838; font-style: italic;">
                    <i class="fas fa-exclamation-triangle"></i> Ошибка загрузки личности
                </div>`
            );
        }
    }
    
    /**
     * Рендерит типологию (ВСЕГДА отображается, даже если пустая)
     * @returns {String} HTML
     */
    renderTypology() {
        try {
            const state = State.getState();
            const currentScene = state.gameState.currentScene || {};
            const typologyText = currentScene.typology || '';
            
            if (typologyText && typologyText.trim() !== '') {
                return this.createSectionHTML(
                    this.typeConfigs.typology,
                    `<div style="padding: 4px 0; color: #4cd137; font-style: italic; line-height: 1.3;">
                        ${typologyText}
                    </div>`
                );
            } else {
                return this.createSectionHTML(
                    this.typeConfigs.typology,
                    `<div style="padding: 4px 0; color: #888; font-style: italic;">
                        <i class="fas fa-fingerprint"></i> Типология не определена...
                    </div>`
                );
            }
        } catch (error) {
            console.error('❌ Ошибка рендеринга типологии:', error);
            return this.createSectionHTML(
                this.typeConfigs.typology,
                `<div style="padding: 4px 0; color: #ff3838; font-style: italic;">
                    <i class="fas fa-exclamation-triangle"></i> Ошибка загрузки типологии
                </div>`
            );
        }
    }
    
    /**
     * Рендерит организации (ВСЕГДА отображается с кнопкой просмотра иерархии)
     * @returns {String} HTML
     */
    renderOrganizations() {
        try {
            const organizations = State.getHeroOrganizations();
            let content = '';
            
            if (organizations.length > 0) {
                let orgsHTML = '';
                organizations.forEach(org => {
                    const orgId = org.id.toUpperCase();
                    
                    orgsHTML += `
                        <div class="organization-badge" 
                             onclick="showOrganizationHierarchy('${org.id}')"
                             style="background: linear-gradient(135deg, #2a1a05 0%, #1a0d02 100%); 
                                    border: 1px solid ${this.typeConfigs.organization.color}40; 
                                    padding: 2px 6px; 
                                    cursor: pointer;
                                    display: inline-block;
                                    margin: 2px;
                                    border-radius: 3px;
                                    transition: all 0.2s ease;">
                            <span style="color: ${this.typeConfigs.organization.color}; font-size: 0.75em;">👥</span>
                            <span style="color: #ddd; font-size: 0.75em; margin-left: 2px;">${orgId}</span>
                            <span style="color: #fbc531; font-size: 0.75em; margin-left: 3px; font-weight: bold;">${org.rankName}</span>
                            <span style="color: #888; font-size: 0.6em; margin-left: 3px;">(клик для иерархии)</span>
                        </div>
                    `;
                });
                
                content = `<div style="display: flex; flex-wrap: wrap; gap: 2px;">${orgsHTML}</div>`;
                
                // Добавляем подсказку о возможности просмотра иерархии
                content += `
                    <div style="margin-top: 5px; padding: 3px; background: rgba(212, 175, 55, 0.1); border-radius: 2px;">
                        <span style="color: #aaa; font-size: 0.65em; font-style: italic;">
                            <i class="fas fa-info-circle"></i> Кликните на организацию для просмотра полной иерархии
                        </span>
                    </div>
                `;
            } else {
                content = `
                    <div style="padding: 4px 0; color: #888; font-style: italic;">
                        <i class="fas fa-users-slash"></i> Герой не состоит в организациях...
                    </div>
                    <div style="margin-top: 5px; padding: 3px; background: rgba(212, 175, 55, 0.05); border-radius: 2px;">
                        <span style="color: #666; font-size: 0.65em; font-style: italic;">
                            <i class="fas fa-info-circle"></i> Организации будут появляться по мере развития сюжета
                        </span>
                    </div>
                `;
            }
            
            return this.createSectionHTML(
                this.typeConfigs.organization,
                content,
                organizations.length
            );
        } catch (error) {
            console.error('❌ Ошибка рендеринга организаций:', error);
            return this.createSectionHTML(
                this.typeConfigs.organization,
                `<div style="padding: 4px 0; color: #ff3838; font-style: italic;">
                    <i class="fas fa-exclamation-triangle"></i> Ошибка загрузки организаций
                </div>`
            );
        }
    }
    
    /**
     * Рендерит отношения (всегда возвращает контент)
     */
    renderRelations() {
        try {
            const relationsItems = State.getGameItemsByType('relations:');
            
            if (relationsItems.length > 0) {
                // Функция для получения цвета отношения
                const getRelationColor = (value) => {
                    const normalized = Math.max(0, Math.min(100, (value + 100) / 2));
                    return this.getStatColor(normalized);
                };
                
                // Функция для получения эмодзи отношения
                const getRelationEmoji = (value) => {
                    if (value >= 75) return '😍';
                    if (value >= 50) return '😊';
                    if (value >= 25) return '🙂';
                    if (value >= -25) return '😐';
                    if (value >= -50) return '😠';
                    if (value >= -75) return '😡';
                    return '💀';
                };
                
                let relationsHTML = '';
                
                relationsItems.forEach(rel => {
                    const name = rel.id.split(':')[1] || 'Unknown';
                    const value = rel.value !== undefined ? rel.value : 0;
                    const color = getRelationColor(value);
                    const emoji = getRelationEmoji(value);
                    
                    relationsHTML += `
                        <div class="game-item-badge" 
                             style="background: linear-gradient(135deg, #2a0a2a 0%, #1a051a 100%); 
                                    border: 1px solid #ff9ff340; 
                                    padding: 2px 6px; 
                                    display: inline-block;
                                    margin: 2px;
                                    border-radius: 3px;">
                            <span style="font-size: 0.85em;">${emoji}</span>
                            <span style="color: #ff9ff3; font-size: 0.75em; margin: 0 3px;">${name}</span>
                            <span style="color: ${color}; font-size: 0.75em; font-weight: bold;">${value}</span>
                        </div>
                    `;
                });
                
                return this.createSectionHTML(
                    this.typeConfigs.relations,
                    `<div style="display: flex; flex-wrap: wrap; gap: 2px;">${relationsHTML}</div>`,
                    relationsItems.length
                );
            } else {
                return this.createSectionHTML(
                    this.typeConfigs.relations,
                    `<div style="padding: 4px 0; color: #888; font-style: italic;">
                        <i class="fas fa-user-friends"></i> Отношения ещё не установлены...
                    </div>`,
                    0
                );
            }
        } catch (error) {
            console.error('❌ Ошибка рендеринга отношений:', error);
            return this.createSectionHTML(
                this.typeConfigs.relations,
                `<div style="padding: 4px 0; color: #ff3838; font-style: italic;">
                    <i class="fas fa-exclamation-triangle"></i> Ошибка загрузки отношений
                </div>`
            );
        }
    }
    
    /**
     * Рендерит навыки (всегда возвращает контент)
     */
    renderSkills() {
        try {
            const skillsItems = State.getGameItemsByType('skill:');
            
            if (skillsItems.length > 0) {
                let skillsHTML = '';
                
                skillsItems.forEach(skill => {
                    const name = skill.value || skill.id.split(':')[1];
                    
                    skillsHTML += `
                        <div class="game-item-badge" 
                             style="background: linear-gradient(135deg, #0a0a2a 0%, #05051a 100%); 
                                    border: 1px solid #6c5ce740; 
                                    padding: 2px 6px; 
                                    display: inline-block;
                                    margin: 2px;
                                    border-radius: 3px;">
                            <span style="color: #6c5ce7; font-size: 0.75em;">📜</span>
                            <span style="color: #ddd; font-size: 0.75em; margin-left: 2px;">${name}</span>
                        </div>
                    `;
                });
                
                return this.createSectionHTML(
                    this.typeConfigs.skill,
                    `<div style="display: flex; flex-wrap: wrap; gap: 2px;">${skillsHTML}</div>`,
                    skillsItems.length
                );
            } else {
                return this.createSectionHTML(
                    this.typeConfigs.skill,
                    `<div style="padding: 4px 0; color: #888; font-style: italic;">
                        <i class="fas fa-scroll"></i> Навыки ещё не получены...
                    </div>`,
                    0
                );
            }
        } catch (error) {
            console.error('❌ Ошибка рендеринга навыков:', error);
            return this.createSectionHTML(
                this.typeConfigs.skill,
                `<div style="padding: 4px 0; color: #ff3838; font-style: italic;">
                    <i class="fas fa-exclamation-triangle"></i> Ошибка загрузки навыков
                </div>`
            );
        }
    }
    
    /**
     * Рендерит баффы/дебаффы к основным статам
     */
    renderStatBuffs() {
        try {
            const statBuffsItems = State.getGameItemsByType('buff:').filter(item => {
                const statName = item.id.split(':')[1];
                return ['will', 'stealth', 'influence', 'sanity'].includes(statName);
            });
            
            const statDebuffsItems = State.getGameItemsByType('debuff:').filter(item => {
                const statName = item.id.split(':')[1];
                return ['will', 'stealth', 'influence', 'sanity'].includes(statName);
            });
            
            const statBuffsDebuffs = [...statBuffsItems, ...statDebuffsItems];
            
            if (statBuffsDebuffs.length > 0) {
                // Функция для получения русского названия стата
                const getRussianStatName = (key) => {
                    const map = {
                        'will': 'Воля',
                        'stealth': 'Скрытность',
                        'influence': 'Влияние',
                        'sanity': 'Разум'
                    };
                    return map[key] || key;
                };
                
                let itemsHTML = '';
                
                statBuffsDebuffs.forEach(item => {
                    const isBuff = item.id.startsWith('buff:');
                    const statName = item.id.split(':')[1];
                    const russianName = getRussianStatName(statName);
                    const value = item.value || 0;
                    const sign = value > 0 ? '+' : '';
                    const duration = item.duration !== undefined ? `[${item.duration}]` : '';
                    const color = isBuff ? '#4cd137' : '#e84118';
                    const icon = isBuff ? '⬆️' : '⬇️';
                    
                    itemsHTML += `
                        <div class="game-item-badge" 
                             style="background: linear-gradient(135deg, ${isBuff ? '#0a1a2a' : '#2a0a1a'} 0%, ${isBuff ? '#051025' : '#1a050d'} 100%); 
                                    border: 1px solid ${color}40; 
                                    padding: 2px 6px; 
                                    display: inline-block;
                                    margin: 2px;
                                    border-radius: 3px;">
                            <span style="color: ${color}; font-size: 0.75em;">${icon}</span>
                            <span style="color: #ccc; font-size: 0.75em; margin: 0 2px;">${russianName}${sign}${value}</span>
                            ${duration ? `<span style="color: #888; font-size: 0.7em; margin-left: 2px;">${duration}</span>` : ''}
                        </div>
                    `;
                });
                
                return this.createSectionHTML(
                    this.typeConfigs.stat_buffs,
                    `<div style="display: flex; flex-wrap: wrap; gap: 2px;">${itemsHTML}</div>`,
                    statBuffsDebuffs.length
                );
            } else {
                return this.createSectionHTML(
                    this.typeConfigs.stat_buffs,
                    `<div style="padding: 4px 0; color: #888; font-style: italic;">
                        <i class="fas fa-tachometer-alt"></i> Нет баффов/дебаффов к статам...
                    </div>`,
                    0
                );
            }
        } catch (error) {
            console.error('❌ Ошибка рендеринга баффов к статам:', error);
            return this.createSectionHTML(
                this.typeConfigs.stat_buffs,
                `<div style="padding: 4px 0; color: #ff3838; font-style: italic;">
                    <i class="fas fa-exclamation-triangle"></i> Ошибка загрузки баффов к статам
                </div>`
            );
        }
    }
    
    /**
     * Рендерит благословения
     */
    renderBlessings() {
        try {
            const blessItems = State.getGameItemsByType('bless:');
            
            if (blessItems.length > 0) {
                let blessHTML = '';
                
                blessItems.forEach(bless => {
                    const name = bless.value || bless.id.split(':')[1];
                    const duration = bless.duration !== undefined ? `[${bless.duration}]` : '';
                    
                    blessHTML += `
                        <div class="game-item-badge" 
                             style="background: linear-gradient(135deg, #2a2a2a 0%, #1a1a1a 100%); 
                                    border: 1px solid #bdc3c740; 
                                    padding: 2px 6px; 
                                    display: inline-block;
                                    margin: 2px;
                                    border-radius: 3px;">
                            <span style="color: #bdc3c7; font-size: 0.75em;">✨</span>
                            <span style="color: #ddd; font-size: 0.75em; margin-left: 2px;">${name}</span>
                            ${duration ? `<span style="color: #888; font-size: 0.7em; margin-left: 2px;">${duration}</span>` : ''}
                        </div>
                    `;
                });
                
                return this.createSectionHTML(
                    this.typeConfigs.bless,
                    `<div style="display: flex; flex-wrap: wrap; gap: 2px;">${blessHTML}</div>`,
                    blessItems.length
                );
            } else {
                return this.createSectionHTML(
                    this.typeConfigs.bless,
                    `<div style="padding: 4px 0; color: #888; font-style: italic;">
                        <i class="fas fa-star"></i> Нет благословений...
                    </div>`,
                    0
                );
            }
        } catch (error) {
            console.error('❌ Ошибка рендеринга благословений:', error);
            return this.createSectionHTML(
                this.typeConfigs.bless,
                `<div style="padding: 4px 0; color: #ff3838; font-style: italic;">
                    <i class="fas fa-exclamation-triangle"></i> Ошибка загрузки благословений
                </div>`
            );
        }
    }
    
    /**
     * Рендерит проклятия
     */
    renderCurses() {
        try {
            const curseItems = State.getGameItemsByType('curse:');
            
            if (curseItems.length > 0) {
                let curseHTML = '';
                
                curseItems.forEach(curse => {
                    const name = curse.value || curse.id.split(':')[1];
                    const duration = curse.duration !== undefined ? `[${curse.duration}]` : '';
                    
                    curseHTML += `
                        <div class="game-item-badge" 
                             style="background: linear-gradient(135deg, #2a0000 0%, #1a0000 100%); 
                                    border: 1px solid #ff383840; 
                                    padding: 2px 6px; 
                                    display: inline-block;
                                    margin: 2px;
                                    border-radius: 3px;">
                            <span style="color: #ff3838; font-size: 0.75em;">💀</span>
                            <span style="color: #ddd; font-size: 0.75em; margin-left: 2px;">${name}</span>
                            ${duration ? `<span style="color: #888; font-size: 0.7em; margin-left: 2px;">${duration}</span>` : ''}
                        </div>
                    `;
                });
                
                return this.createSectionHTML(
                    this.typeConfigs.curse,
                    `<div style="display: flex; flex-wrap: wrap; gap: 2px;">${curseHTML}</div>`,
                    curseItems.length
                );
            } else {
                return this.createSectionHTML(
                    this.typeConfigs.curse,
                    `<div style="padding: 4px 0; color: #888; font-style: italic;">
                        <i class="fas fa-skull-crossbones"></i> Нет проклятий...
                    </div>`,
                    0
                );
            }
        } catch (error) {
            console.error('❌ Ошибка рендеринга проклятий:', error);
            return this.createSectionHTML(
                this.typeConfigs.curse,
                `<div style="padding: 4px 0; color: #ff3838; font-style: italic;">
                    <i class="fas fa-exclamation-triangle"></i> Ошибка загрузки проклятий
                </div>`
            );
        }
    }
    
    /**
     * Рендерит остальные баффы/дебаффы
     */
    renderBuffsDebuffs() {
        try {
            const allBuffs = State.getGameItemsByType('buff:');
            const allDebuffs = State.getGameItemsByType('debuff:');
            
            // Исключаем те, что уже в блоке +/- К СТАТАМ
            const otherBuffs = allBuffs.filter(item => {
                const statName = item.id.split(':')[1];
                return !['will', 'stealth', 'influence', 'sanity'].includes(statName);
            });
            
            const otherDebuffs = allDebuffs.filter(item => {
                const statName = item.id.split(':')[1];
                return !['will', 'stealth', 'influence', 'sanity'].includes(statName);
            });
            
            const otherBuffsDebuffs = [...otherBuffs, ...otherDebuffs];
            
            if (otherBuffsDebuffs.length > 0) {
                let itemsHTML = '';
                
                otherBuffsDebuffs.forEach(item => {
                    const isBuff = item.id.startsWith('buff:');
                    const statName = item.id.split(':')[1];
                    const value = item.value || 0;
                    const sign = value > 0 ? '+' : '';
                    const duration = item.duration !== undefined ? `[${item.duration}]` : '';
                    const color = isBuff ? '#4cd137' : '#e84118';
                    const icon = isBuff ? '⬆️' : '⬇️';
                    
                    itemsHTML += `
                        <div class="game-item-badge" 
                             style="background: linear-gradient(135deg, ${isBuff ? '#0a1a2a' : '#2a0a1a'} 0%, ${isBuff ? '#051025' : '#1a050d'} 100%); 
                                    border: 1px solid ${color}40; 
                                    padding: 2px 6px; 
                                    display: inline-block;
                                    margin: 2px;
                                    border-radius: 3px;">
                            <span style="color: ${color}; font-size: 0.75em;">${icon}</span>
                            <span style="color: #ccc; font-size: 0.75em; margin: 0 2px;">${statName}${sign}${value}</span>
                            ${duration ? `<span style="color: #888; font-size: 0.7em;">${duration}</span>` : ''}
                        </div>
                    `;
                });
                
                return this.createSectionHTML(
                    this.typeConfigs.buff_debuff,
                    `<div style="display: flex; flex-wrap: wrap; gap: 2px;">${itemsHTML}</div>`,
                    otherBuffsDebuffs.length
                );
            } else {
                return this.createSectionHTML(
                    this.typeConfigs.buff_debuff,
                    `<div style="padding: 4px 0; color: #888; font-style: italic;">
                        <i class="fas fa-chart-line"></i> Нет других баффов/дебаффов...
                    </div>`,
                    0
                );
            }
        } catch (error) {
            console.error('❌ Ошибка рендеринга других баффов/дебаффов:', error);
            return this.createSectionHTML(
                this.typeConfigs.buff_debuff,
                `<div style="padding: 4px 0; color: #ff3838; font-style: italic;">
                    <i class="fas fa-exclamation-triangle"></i> Ошибка загрузки баффов/дебаффов
                </div>`
            );
        }
    }
    
    /**
     * Рендерит детали (неизвестные game items)
     */
    renderDetails() {
        try {
            const knownPrefixes = [
                'stat:', 'skill:', 'inventory:', 'relations:', 'bless:', 'curse:',
                'buff:', 'debuff:', 'personality:', 'initiation_degree:', 'progress:',
                'organization_rank:'
            ];
            
            const state = State.getState();
            const allItems = state.heroState || [];
            
            const unknownItems = allItems.filter(item => {
                return !knownPrefixes.some(prefix => item.id.startsWith(prefix));
            });
            
            if (unknownItems.length > 0) {
                // Функция для получения иконки game item
                const getGameItemIcon = (itemId) => {
                    if (!itemId) return '📌';
                    
                    const type = itemId.split(':')[0];
                    const icons = {
                        'stat': '📊',
                        'skill': '📜',
                        'inventory': '🎒',
                        'relations': '👤',
                        'bless': '✨',
                        'curse': '💀',
                        'buff': '⬆️',
                        'debuff': '⬇️',
                        'initiation_degree': '🎓',
                        'progress': '📈',
                        'personality': '🧠',
                        'effect': '⚡',
                        'status': '🔘',
                        'ability': '💫',
                        'trait': '🎭',
                        'item': '🎁',
                        'ritual': '🕯️',
                        'knowledge': '📚',
                        'secret': '🔐',
                        'location': '📍',
                        'event': '📅',
                        'quest': '🎯'
                    };
                    
                    return icons[type] || '📌';
                };
                
                let detailsHTML = '';
                
                unknownItems.forEach(item => {
                    const [type, name] = item.id.split(':');
                    const displayName = item.value || name || item.id;
                    const duration = item.duration !== undefined ? `[${item.duration}]` : '';
                    const icon = getGameItemIcon(item.id);
                    
                    detailsHTML += `
                        <div class="game-item-badge" 
                             style="background: linear-gradient(135deg, #1a2a2a 0%, #0d1a1a 100%); 
                                    border: 1px solid #00cec940; 
                                    padding: 2px 6px; 
                                    display: inline-block;
                                    margin: 2px;
                                    border-radius: 3px;">
                            <span style="color: #00cec9; font-size: 0.75em;">${icon}</span>
                            <span style="color: #ddd; font-size: 0.75em; margin-left: 2px;">${displayName}</span>
                            ${duration ? `<span style="color: #888; font-size: 0.7em; margin-left: 2px;">${duration}</span>` : ''}
                        </div>
                    `;
                });
                
                return this.createSectionHTML(
                    this.typeConfigs.details,
                    `<div style="display: flex; flex-wrap: wrap; gap: 2px;">${detailsHTML}</div>`,
                    unknownItems.length
                );
            } else {
                return this.createSectionHTML(
                    this.typeConfigs.details,
                    `<div style="padding: 4px 0; color: #888; font-style: italic;">
                        <i class="fas fa-info-circle"></i> Нет дополнительных деталей...
                    </div>`,
                    0
                );
            }
        } catch (error) {
            console.error('❌ Ошибка рендеринга деталей:', error);
            return this.createSectionHTML(
                this.typeConfigs.details,
                `<div style="padding: 4px 0; color: #ff3838; font-style: italic;">
                    <i class="fas fa-exclamation-triangle"></i> Ошибка загрузки деталей
                </div>`
            );
        }
    }
    
    /**
     * Рендерит инвентарь
     */
    renderInventory() {
        try {
            const inventoryItems = State.getGameItemsByType('inventory:');
            
            if (inventoryItems.length > 0) {
                let inventoryHTML = '';
                
                inventoryItems.forEach(item => {
                    const name = item.value || item.id.split(':')[1];
                    
                    inventoryHTML += `
                        <div class="game-item-badge" 
                             style="background: linear-gradient(135deg, #2a1a0a 0%, #1a0d05 100%); 
                                    border: 1px solid #8b451340; 
                                    padding: 2px 6px; 
                                    display: inline-block;
                                    margin: 2px;
                                    border-radius: 3px;">
                            <span style="color: #8b4513; font-size: 0.75em;">🎒</span>
                            <span style="color: #ddd; font-size: 0.75em; margin-left: 2px;">${name}</span>
                        </div>
                    `;
                });
                
                return this.createSectionHTML(
                    this.typeConfigs.inventory,
                    `<div style="display: flex; flex-wrap: wrap; gap: 2px;">${inventoryHTML}</div>`,
                    inventoryItems.length
                );
            } else {
                return this.createSectionHTML(
                    this.typeConfigs.inventory,
                    `<div style="padding: 4px 0; color: #888; font-style: italic;">
                        <i class="fas fa-box"></i> Инвентарь пуст...
                    </div>`,
                    0
                );
            }
        } catch (error) {
            console.error('❌ Ошибка рендеринга инвентаря:', error);
            return this.createSectionHTML(
                this.typeConfigs.inventory,
                `<div style="padding: 4px 0; color: #ff3838; font-style: italic;">
                    <i class="fas fa-exclamation-triangle"></i> Ошибка загрузки инвентаря
                </div>`
            );
        }
    }
    
/**
 * Показывает компактное модальное окно с иерархией организации
 * @param {String} orgId ID организации
 */
showOrganizationHierarchy(orgId) {
    try {
        console.log(`🏛️ Компактная иерархия: ${orgId}`);
        
        // Закрываем предыдущую модалку
        if (this.currentHierarchyModal) {
            this.currentHierarchyModal.remove();
            this.currentHierarchyModal = null;
        }
        
        // Получаем данные
        const organizations = State.getHeroOrganizations();
        const org = organizations.find(o => o.id === orgId);
        
        if (!org) {
            Utils.showToast(`Организация ${orgId.toUpperCase()} не найдена`, 'error');
            return;
        }
        
        const hierarchy = State.getOrganizationHierarchy(orgId);
        if (!hierarchy?.description || !Array.isArray(hierarchy.description)) {
            Utils.showToast(`Иерархия ${orgId.toUpperCase()} не найдена`, 'warning');
            return;
        }
        
        const sortedRanks = [...hierarchy.description].sort((a, b) => a.lvl - b.lvl);
        const totalRanks = sortedRanks.length;
        
        // Создаем модалку
        const modal = document.createElement('div');
        modal.id = `orgHierarchyCompact_${orgId}_${Date.now()}`;
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.95);
            z-index: 10000;
            display: flex;
            justify-content: center;
            align-items: flex-start;
            padding-top: 10px;
            overflow-y: auto;
            -webkit-overflow-scrolling: touch;
        `;
        
        // Компактный контент
        const content = document.createElement('div');
        content.style.cssText = `
            background: #111;
            border: 1px solid #d4af37;
            border-radius: 8px;
            width: 95%;
            max-width: 400px;
            max-height: 95vh;
            overflow-y: auto;
            color: #ccc;
            box-shadow: 0 0 20px rgba(212, 175, 55, 0.3);
            font-size: 12px;
        `;
        
        // Шапка
        const header = document.createElement('div');
        header.style.cssText = `
            background: #1a1a1a;
            padding: 8px 12px;
            border-bottom: 1px solid #d4af37;
            display: flex;
            justify-content: space-between;
            align-items: center;
        `;
        
        const title = document.createElement('div');
        title.innerHTML = `
            <div style="color: #d4af37; font-weight: bold; font-size: 14px;">${orgId.toUpperCase()}</div>
            <div style="color: #888; font-size: 10px; margin-top: 2px;">ИЕРАРХИЯ</div>
        `;
        
        const closeBtn = document.createElement('button');
        closeBtn.innerHTML = '✕';
        closeBtn.style.cssText = `
            background: transparent;
            border: none;
            color: #d4af37;
            font-size: 16px;
            cursor: pointer;
            padding: 4px 8px;
            line-height: 1;
        `;
        closeBtn.onclick = () => {
            modal.remove();
            this.currentHierarchyModal = null;
        };
        
        header.appendChild(title);
        header.appendChild(closeBtn);
        content.appendChild(header);
        
        // Текущая позиция
        const currentPos = document.createElement('div');
        currentPos.style.cssText = `
            padding: 8px 12px;
            background: rgba(255,0,0,0.1);
            border-bottom: 1px solid #333;
            margin: 0;
        `;
        
        currentPos.innerHTML = `
            <div style="color: #ff5555; font-size: 11px; font-weight: bold; margin-bottom: 4px;">
                <span style="background: #ff5555; color: #000; padding: 2px 6px; border-radius: 3px; margin-right: 6px;">●</span>
                ТЕКУЩАЯ ПОЗИЦИЯ
            </div>
            <div style="display: flex; align-items: center; justify-content: space-between;">
                <div>
                    <div style="color: #fff; font-size: 13px; font-weight: bold;">${org.rankName}</div>
                    <div style="color: #888; font-size: 10px;">Уровень ${org.rank}/${totalRanks}</div>
                </div>
                <div style="color: #d4af37; font-size: 18px; font-weight: bold;">${org.rank}°</div>
            </div>
        `;
        content.appendChild(currentPos);
        
        // Иерархия
        const hierarchyContainer = document.createElement('div');
        hierarchyContainer.style.cssText = `
            padding: 8px 0;
            max-height: 300px;
            overflow-y: auto;
        `;
        
        sortedRanks.forEach(rankInfo => {
            const isCurrentRank = rankInfo.lvl === org.rank;
            const rankItem = document.createElement('div');
            rankItem.style.cssText = `
                padding: 6px 12px;
                border-bottom: 1px solid #222;
                background: ${isCurrentRank ? 'rgba(255,0,0,0.15)' : 'transparent'};
                border-left: ${isCurrentRank ? '3px solid #ff5555' : '3px solid transparent'};
                margin: 0;
            `;
            
            rankItem.innerHTML = `
                <div style="display: flex; align-items: center; justify-content: space-between;">
                    <div style="display: flex; align-items: center; gap: 8px; flex: 1;">
                        <span style="color: #d4af37; font-weight: bold; min-width: 20px;">${rankInfo.lvl}°</span>
                        <span style="color: ${isCurrentRank ? '#fff' : '#ccc'}; font-weight: ${isCurrentRank ? 'bold' : 'normal'};">
                            ${rankInfo.rank}
                        </span>
                        ${isCurrentRank ? '<span style="color: #ff5555; font-size: 10px; background: rgba(255,0,0,0.2); padding: 1px 4px; border-radius: 3px; margin-left: 4px;">ВЫ</span>' : ''}
                    </div>
                    ${rankInfo.threshold !== undefined ? 
                        `<span style="color: #fbc531; font-size: 11px; background: rgba(251,197,49,0.1); padding: 2px 6px; border-radius: 3px; white-space: nowrap;">
                            ${rankInfo.threshold}
                        </span>` : 
                        '<span style="color: #666; font-size: 10px; padding: 2px 6px;">—</span>'
                    }
                </div>
                ${rankInfo.description ? 
                    `<div style="color: #888; font-size: 10px; margin-top: 4px; padding-left: 28px; line-height: 1.3;">
                        ${rankInfo.description}
                    </div>` : ''
                }
            `;
            
            hierarchyContainer.appendChild(rankItem);
        });
        
        content.appendChild(hierarchyContainer);
        
        // Компактная легенда
        const legend = document.createElement('div');
        legend.style.cssText = `
            padding: 8px 12px;
            background: #1a1a1a;
            border-top: 1px solid #333;
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
            font-size: 10px;
        `;
        
        legend.innerHTML = `
            <div style="display: flex; align-items: center; gap: 4px;">
                <div style="width: 8px; height: 8px; background: #ff5555; border-radius: 2px;"></div>
                <span style="color: #aaa;">Ваша позиция</span>
            </div>
            <div style="display: flex; align-items: center; gap: 4px;">
                <div style="width: 8px; height: 8px; background: #d4af37; border-radius: 2px;"></div>
                <span style="color: #aaa;">Уровень</span>
            </div>
            <div style="display: flex; align-items: center; gap: 4px;">
                <div style="width: 8px; height: 8px; background: #fbc531; border-radius: 2px;"></div>
                <span style="color: #aaa;">Требование</span>
            </div>
        `;
        
        content.appendChild(legend);
        
        // Инфо
        const info = document.createElement('div');
        info.style.cssText = `
            padding: 6px 12px;
            background: #0a0a0a;
            border-top: 1px solid #222;
            font-size: 10px;
            color: #666;
            text-align: center;
        `;
        info.textContent = `Всего уровней: ${totalRanks} • Закройте кликом вне окна`;
        content.appendChild(info);
        
        modal.appendChild(content);
        
        // Закрытие по клику вне окна
        modal.onclick = (e) => {
            if (e.target === modal) {
                modal.remove();
                this.currentHierarchyModal = null;
            }
        };
        
        // Закрытие по Escape
        const handleEscape = (e) => {
            if (e.key === 'Escape') {
                modal.remove();
                this.currentHierarchyModal = null;
                document.removeEventListener('keydown', handleEscape);
            }
        };
        document.addEventListener('keydown', handleEscape);
        
        this.currentHierarchyModal = modal;
        document.body.appendChild(modal);
        
        console.log(`✅ Компактная иерархия ${orgId} отображена`);
        
    } catch (error) {
        console.error('❌ Ошибка при отображении иерархии:', error);
        Utils.showToast('Ошибка при отображении иерархии', 'error');
    }
}

/**
 * Добавляет CSS стили для анимаций модального окна в новом стиле
 */
addNeoHierarchyStyles() {
    // Проверяем, не добавлены ли стили уже
    if (document.getElementById('neoHierarchyModalStyles')) return;
    
    const style = document.createElement('style');
    style.id = 'neoHierarchyModalStyles';
    style.textContent = `
        @keyframes neoFadeIn {
            from { 
                opacity: 0; 
                backdrop-filter: blur(0px);
            }
            to { 
                opacity: 1; 
                backdrop-filter: blur(8px);
            }
        }
        
        @keyframes neoSlideUp {
            from { 
                opacity: 0;
                transform: translateY(60px) scale(0.95);
            }
            to { 
                opacity: 1;
                transform: translateY(0) scale(1);
            }
        }
        
        @keyframes neoPulse {
            0%, 100% { 
                opacity: 0.3;
                transform: scale(1);
            }
            50% { 
                opacity: 0.6;
                transform: scale(1.05);
            }
        }
        
        /* Стиль для скроллбара */
        div::-webkit-scrollbar {
            width: 8px;
        }
        
        div::-webkit-scrollbar-track {
            background: rgba(20, 15, 5, 0.5);
            border-radius: 4px;
        }
        
        div::-webkit-scrollbar-thumb {
            background: linear-gradient(to bottom, #d4af37, #b8941f);
            border-radius: 4px;
        }
        
        div::-webkit-scrollbar-thumb:hover {
            background: linear-gradient(to bottom, #fbc531, #d4af37);
        }
        
        /* Анимация при наведении на элементы иерархии */
        .hierarchy-item-hover {
            transition: all 0.3s ease;
        }
        
        .hierarchy-item-hover:hover {
            transform: translateX(-3px);
            border-color: rgba(212, 175, 55, 0.4) !important;
            box-shadow: 0 5px 20px rgba(212, 175, 55, 0.2) !important;
        }
    `;
    document.head.appendChild(style);
}
    
    /**
     * Получает цвет для стата
     * @param {Number} value Значение стата (0-100)
     * @returns {String} Цвет в формате HEX
     */
    getStatColor(value) {
        const val = Math.max(0, Math.min(100, value));
        
        if (val <= 10) return '#800000';
        if (val <= 20) return '#FF0000';
        if (val <= 30) return '#FF5500';
        if (val <= 40) return '#FFAA00';
        if (val <= 50) return '#FFD700';
        if (val <= 60) return '#ADFF2F';
        if (val <= 70) return '#00FF00';
        if (val <= 80) return '#20B2AA';
        if (val <= 90) return '#87CEEB';
        return '#FFFFFF';
    }
    
    /**
     * Вспомогательная функция для отображения тултипа game item
     */
    showGameItemTooltip(element, gameItem) {
        // Упрощенная реализация тултипов
        console.log('ℹ️ Показать тултип для:', gameItem.id);
        // Здесь можно реализовать детальный тултип
    }
    
    /**
     * Принудительно обновляет все game items
     * Используется при инициализации или принудительном обновлении
     */
    forceUpdate() {
        console.log('🔄 GameItemUI: ПРИНУДИТЕЛЬНОЕ обновление ВСЕХ game items');
        this.renderAll();
    }
    
    /**
     * Уничтожает менеджер, очищает ресурсы
     */
    destroy() {
        // Отписываемся от событий
        State.off(State.EVENTS.HERO_CHANGED, this.handleHeroChanged);
        State.off(State.EVENTS.TURN_COMPLETED, this.handleTurnCompleted);
        State.off(State.EVENTS.SCENE_CHANGED, this.handleSceneChanged);
        
        // Удаляем глобальные функции
        delete window.showOrganizationHierarchy;
        delete window.showGameItemTooltip;
        
        // Очищаем контейнеры
        this.containers = {};
        this.renderCache.clear();
        
        // Закрываем модалку если открыта
        if (this.currentHierarchyModal) {
            this.currentHierarchyModal.remove();
            this.currentHierarchyModal = null;
        }
        
        console.log('🗑️ GameItemUIManager уничтожен');
    }
}

// Создаем и экспортируем синглтон
const gameItemUI = new GameItemUIManager();
export { gameItemUI as GameItemUI };