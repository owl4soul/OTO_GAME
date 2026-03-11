// Модуль: PROMPTS - Итоговая сборка из общих и специфичных частей
'use strict';

import common from './prompts-common.js';
import oto from './prompts-oto.js';

// ============================================================================
// ИТОГОВЫЙ ЭКСПОРТ (полностью соответствует исходной структуре)
// ============================================================================
export const PROMPTS = {
  version: '5.3.0',
  lastUpdated: '2026-02-21',
  format: 'MODULAR_UNIVERSAL_GAME_ITEM_SYSTEM_WITH_SCHEMAS',
  
  system: {
    gameMaster: common.SYSTEM_GAME_MASTER_UNIVERSAL,
    scenarioWriter: common.SCENARIO_WRITER_BASE,
  },
  
  settings: {
    oto: {
      worldContext: oto.OTO_WORLD_CONTEXT,
      initialGameState: oto.OTO_INITIAL_GAME_STATE
    }
  },
  
  protocols: common.protocols,
  
  examples: common.examples,
  
  injections: common.injections,
  
  testModel: common.testModel,
  testProvider: common.testProvider,
  
  standardGameOTO: {
    system: {
      gameMaster: common.SYSTEM_GAME_MASTER_UNIVERSAL + '\n\n' + oto.OTO_WORLD_CONTEXT,
      scenarioWriter: common.SCENARIO_WRITER_BASE + '\n\nСЕТТИНГ: ' + oto.OTO_WORLD_CONTEXT,
    },
    initialGameState: oto.OTO_INITIAL_GAME_STATE
  },
  
  customGameOTO: {
    system: {
      gameMaster: common.SYSTEM_GAME_MASTER_UNIVERSAL,
      scenarioWriter: `Ты — автор сценариев для AI-based текстового ролевого симулятора. Сгенерируй начальную сцену нового сюжета по заданному пользовательскому промту.\n\nЭТО НЕ ИГРА, А СИМУЛЯЦИЯ. \nПРЕДУПРЕЖДЕНИЕ 21+: ОСТОРОЖНО, ПОТЕНЦИАЛЬНО ШОКИРУЮЩИЙ КОНТЕНТ ДЛЯ ВЗРОСЛОЙ АУДИТОРИИ.\n\n----\n\nЗАДАЙ ГЕРОЮ ПОЛНОЕ СТАРТОВОЕ СОСТОЯНИЕ ЧЕРЕЗ МАССИВ game_items [] В КОРНЕ JSON.\n\nТАКЖЕ ЗАДАЙ ЛИЧНОСТЬ ГЕРОЯ ЧЕРЕЗ СТРОКУ personality В КОРНЕ JSON.\n\nТАКЖЕ ЗАДАЙ ИГРЕ МЕТА-КОНТЕКСТ В ОБЪЕКТЕ meta_context В КОРНЕ JSON: СЕТТИНГ МИРА, НАПРАВЛЕННОСТЬ, ОСОБЕННОСТИ И/ИЛИ ОГРАНИЧЕНИЯ СЦЕНАРИЯ.\n\n`,
    },
    initialGameState: oto.OTO_INITIAL_GAME_STATE
  }
};

export default PROMPTS;