// Модуль DEBUG: Команды для отладки состояния игры (отдельный файл)
// Импортируй этот модуль в главном файле, и используй команды в консоли браузера

import { State } from './3-state.js';

export const DebugState = {
  /**
   * Полная информация о состоянии с акцентом на героя
   * Использовать в консоли: DebugState.st()
   */
  st: function() {
    const s = State.getState();
    
    console.log('📱 STATE 4.1 - ОТЛАДКА');
    console.log('='.repeat(40));
    
    // Основная информация
    console.group('🎯 СОСТОЯНИЕ ГЕРОЯ');
    console.log(`🆔 Game ID: ${s.gameId}`);
    console.log(`🔄 Ход: ${s.turnCount}`);
    
    const degree = s.heroState.find(item => item.id.startsWith('initiation_degree:'));
    const progress = s.heroState.find(item => item.id === 'progress:level');
    const personality = s.heroState.find(item => item.id === 'personality:hero');
    
    console.log(`🎓 Степень: ${degree?.value || 'Нет'}`);
    console.log(`📈 Прогресс OTO: ${progress?.value || 0}`);
    console.log(`🧠 Личность: ${personality?.value?.substring(0, 100) || 'Нет'}...`);
    console.groupEnd();
    
    // Детальный вывод всех объектов героя
    console.group('🦸 ВСЕ ОБЪЕКТЫ ГЕРОЯ (' + s.heroState.length + ' шт):');
    
    // Группируем по типам
    const grouped = {
      'stat': [], 'skill': [], 'ability': [], 'trait': [], 'item': [],
      'effect': [], 'status': [], 'buff': [], 'debuff': [], 'ritual': [],
      'knowledge': [], 'secret': [], 'relationship': [], 'location': [],
      'event': [], 'quest': [], 'initiation_degree': [], 'progress': [],
      'personality': [], 'other': []
    };
    
    s.heroState.forEach(item => {
      const type = item.id.split(':')[0];
      grouped[type] ? grouped[type].push(item) : grouped['other'].push(item);
    });
    
    // Выводим каждую группу
    Object.keys(grouped).forEach(type => {
      if (grouped[type].length > 0) {
        console.group(`📁 ${type.toUpperCase()} (${grouped[type].length}):`);
        grouped[type].forEach(item => {
          const prefix = item.id.startsWith('stat:') ? 
            (item.value <= 20 ? '🔴' : item.value <= 50 ? '🟡' : '🟢') : '📌';
          
          console.log(`${prefix} ${item.id}: ${item.value}`);
          
          // Дополнительные поля
          const extraFields = Object.keys(item).filter(k => !['id', 'value'].includes(k));
          if (extraFields.length > 0) {
            console.group('   Доп. поля:');
            extraFields.forEach(field => {
              console.log(`   ${field}:`, item[field]);
            });
            console.groupEnd();
          }
        });
        console.groupEnd();
      }
    });
    
    console.groupEnd(); // Конец списка
    
    // Статистика
    console.group('📊 СТАТИСТИКА:');
    Object.keys(grouped).forEach(type => {
      if (grouped[type].length > 0) {
        console.log(`• ${type}: ${grouped[type].length} объектов`);
      }
    });
    console.groupEnd();
    
    // Статы с анализом
    const stats = grouped['stat'];
    if (stats.length > 0) {
      console.group('📈 СТАТЫ ГЕРОЯ:');
      console.table(stats.map(item => ({
        'Стат': item.id.replace('stat:', ''),
        'Значение': item.value,
        'Состояние': item.value <= 20 ? 'КРИТИЧЕСКОЕ' : 
                    item.value <= 50 ? 'НИЗКОЕ' : 'НОРМАЛЬНОЕ',
        'Доп. поля': Object.keys(item).filter(k => !['id', 'value'].includes(k)).length
      })));
      console.groupEnd();
    }
    
    return {
      hero: s.heroState,
      stats: stats.reduce((acc, item) => {
        acc[item.id.replace('stat:', '')] = item.value;
        return acc;
      }, {}),
      summary: {
        totalItems: s.heroState.length,
        turn: s.turnCount,
        degree: degree?.value,
        progress: progress?.value
      }
    };
  },
  
  /**
   * Максимальная детализация состояния героя
   * Использовать в консоли: DebugState.stHero()
   */
  stHero: function() {
    const s = State.getState();
    
    console.log('🦸 HERO STATE - МАКСИМАЛЬНАЯ ДЕТАЛИЗАЦИЯ');
    console.log('='.repeat(50));
    
    // Полный дамп всех объектов
    console.group('📋 ПОЛНЫЙ ДАМП:');
    s.heroState.forEach((item, index) => {
      console.group(`[${index}] ${item.id}:`);
      console.log('Полный объект:', item);
      console.log('Тип:', item.id.split(':')[0]);
      console.log('Значение:', item.value);
      
      const extraFields = Object.keys(item).filter(k => !['id', 'value'].includes(k));
      if (extraFields.length > 0) {
        console.group('Доп. поля:');
        extraFields.forEach(field => {
          console.log(`• ${field}:`, item[field]);
        });
        console.groupEnd();
      }
      
      console.groupEnd();
    });
    console.groupEnd();
    
    return s.heroState;
  },
  
  /**
   * Поиск объектов героя
   * Использовать в консоли: DebugState.stFind("will")
   */
  stFind: function(searchTerm) {
    const s = State.getState();
    
    console.log(`🔍 ПОИСК: "${searchTerm}"`);
    console.log('='.repeat(40));
    
    const results = s.heroState.filter(item => 
      item.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      JSON.stringify(item.value).toLowerCase().includes(searchTerm.toLowerCase())
    );
    
    if (results.length === 0) {
      console.log('❌ Ничего не найдено');
      return [];
    }
    
    console.log(`✅ Найдено ${results.length} результатов:`);
    results.forEach((item, idx) => {
      console.group(`[${idx}] ${item.id}:`);
      console.log('Значение:', item.value);
      console.log('Полный объект:', item);
      console.groupEnd();
    });
    
    return results;
  },
  
  /**
   * Краткая сводка
   * Использовать в консоли: DebugState.s()
   */
  s: function() {
    const s = State.getState();
    
    console.log('📱 КРАТКАЯ СВОДКА:');
    console.log(`Ход: ${s.turnCount} | Объектов: ${s.heroState.length}`);
    
    // Быстрая таблица статов
    const stats = s.heroState.filter(item => item.id.startsWith('stat:'));
    if (stats.length > 0) {
      console.table(stats.map(item => ({
        'Стат': item.id.replace('stat:', ''),
        'Значение': item.value,
        ' ': item.value <= 20 ? '🔴' : item.value <= 50 ? '🟡' : '🟢'
      })));
    }
    
    return {
      turn: s.turnCount,
      stats: stats.reduce((acc, item) => {
        acc[item.id.replace('stat:', '')] = item.value;
        return acc;
      }, {})
    };
  },
  
  /**
   * Экспорт состояния в JSON
   * Использовать в консоли: DebugState.stJson()
   */
  stJson: function() {
    const s = State.getState();
    const json = JSON.stringify(s, null, 2);
    console.log('📋 JSON State (скопируй этот текст):');
    console.log(json);
    return json;
  },
  
  /**
   * Частичный просмотр
   * Использовать в консоли: DebugState.stPart('hero')
   */
  stPart: function(partName) {
    const s = State.getState();
    
    const parts = {
      hero: () => {
        console.group('🦸 HERO STATE:');
        s.heroState.forEach(item => {
          console.log(`${item.id}:`, item);
        });
        console.groupEnd();
      },
      scene: () => {
        console.group('🎭 ТЕКУЩАЯ СЦЕНА:');
        console.dir(s.gameState.currentScene, { depth: 5 });
        console.groupEnd();
      },
      settings: () => {
        console.group('⚙️ НАСТРОЙКИ:');
        console.dir(s.settings, { depth: 3 });
        console.groupEnd();
      },
      ui: () => {
        console.group('📐 UI:');
        console.dir(s.ui, { depth: 3 });
        console.groupEnd();
      },
      history: () => {
        console.group('📜 ИСТОРИЯ (последние 3):');
        s.gameState.history.slice(-3).forEach((h, i) => {
          console.log(`[${s.gameState.history.length - 3 + i}]`, h);
        });
        console.groupEnd();
      },
      thoughts: () => {
        console.group('💭 МЫСЛИ:');
        if (s.thoughtsOfHero?.length > 0) {
          s.thoughtsOfHero.forEach((t, i) => {
            console.log(`[${i}] ${t}`);
          });
        } else {
          console.log('Пусто');
        }
        console.groupEnd();
      }
    };
    
    if (parts[partName]) {
      parts[partName]();
    } else {
      console.log('❌ Доступные части:', Object.keys(parts).join(', '));
    }
  },
  
  /**
   * Инициализация глобальных команд для консоли
   * Вызывается один раз при загрузке
   */
  initGlobalCommands: function() {
    if (typeof window !== 'undefined') {
      // Делаем команды доступными глобально
      window.st = this.st.bind(this);
      window.s = this.s.bind(this);
      window.stHero = this.stHero.bind(this);
      window.stFind = this.stFind.bind(this);
      window.stJson = this.stJson.bind(this);
      window.stPart = this.stPart.bind(this);
      
      // Сообщение о доступных командах
      console.log(`
📱 ГЛОБАЛЬНЫЕ КОМАНДЫ ДЛЯ ОТЛАДКИ:
• st()          - Полная информация о состоянии
• s()           - Краткая сводка с таблицей статов
• stHero()      - Максимальная детализация героя
• stFind("текст") - Поиск объектов
• stJson()      - Экспорт в JSON
• stPart('hero') - Частичный просмотр

💡 Примеры:
stFind("will")    - найти всё связанное с волей
stFind("effect")  - найти все эффекты
stPart('scene')   - посмотреть текущую сцену
      `);
    }
  }
};

// Автоматически инициализируем глобальные команды при импорте
if (typeof window !== 'undefined') {
  DebugState.initGlobalCommands();
}