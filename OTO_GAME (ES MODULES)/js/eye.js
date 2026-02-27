// Модуль: Глаз ожидания с физикой и подробным логированием (исправленная версия)
'use strict';

import { DOM } from './4-dom.js';

const dom = DOM.getDOM();

// ==================== КОНФИГУРАЦИЯ ФИЗИКИ ====================
/*
const PHYSICS_CONFIG = {
  friction: 2.0,           // трение (чем выше, тем быстрее остановка)
  elasticity: 0.7,         // упругость отскока (0..1)
  minSpeed: 0.02,          // пикс/мс – ниже этой скорости останавливаем
  maxSpeed: 1.5,           // макс. скорость (пикс/мс)
  throwFactor: 1.2,        // множитель броска (чтобы летел дальше)
  speedSamples: 5          // сколько последних точек хранить
};
*/

const PHYSICS_CONFIG = {
  friction: 1.2,           // меньше – дольше катится
  elasticity: 0.85,        // почти упругий отскок
  minSpeed: 0.005,         // очень маленькая скорость остановки
  maxSpeed: 1.5,           // макс. скорость броска
  throwFactor: 1.5,        // усилитель броска
  speedSamples: 5
};
// =============================================================

let isDragging = false;
let startX, startY, startLeft, startTop;
let moved = false;
let holdTimer, tapTimer;
const DRAG_THRESHOLD = 5;
const HOLD_DELAY = 200;
const TAP_TIMEOUT = 200;

// Физика
let vx = 0, vy = 0;
let animFrame = null;
let lastTimestamp = null;
let isPhysicalMoving = false;

// История точек для вычисления скорости броска
let points = []; // { x, y, time }

const DEBUG = true;
function log(...args) {
  if (DEBUG) console.log('[EyePhysics]', ...args);
}

/**
 * Показать глаз над контейнером мыслей
 */
export function showEye() {
  const eye = dom.waitingEye;
  if (!eye) return;

  stopPhysics();
  eye.style.display = 'block';
  eye.classList.remove('visible');

  requestAnimationFrame(() => {
    const textElement = dom.thoughtsOfHeroText;
    if (!textElement) return;

    const rect = textElement.getBoundingClientRect();
    const eyeWidth = eye.offsetWidth;
    const left = rect.left + rect.width / 2 - eyeWidth / 2;
    const top = rect.top - 100;

    setPosition(left, top);
    eye.classList.add('visible');
    log('showEye: позиция установлена', left, top);
  });
}

/**
 * Скрыть глаз с затуханием
 */
export function hideEye() {
  const eye = dom.waitingEye;
  if (!eye) return;

  stopPhysics();
  eye.classList.remove('visible');
  setTimeout(() => {
    if (!eye.classList.contains('visible')) {
      eye.style.display = 'none';
      eye.classList.remove('dragging', 'holding', 'tapped');
      log('hideEye: глаз скрыт');
    }
  }, 500);
}

/**
 * Инициализация обработчиков перетаскивания
 */
export function initEyeDrag() {
  const eye = dom.waitingEye;
  if (!eye) return;
  eye.addEventListener('touchstart', onTouchStart, { passive: false });
  eye.addEventListener('touchmove', onTouchMove, { passive: false });
  eye.addEventListener('touchend', onTouchEnd);
  eye.addEventListener('touchcancel', onTouchCancel);
  eye.addEventListener('mousedown', onMouseDown);
  log('initEyeDrag: обработчики добавлены');
}

// ==================== УТИЛИТЫ ====================

function setPosition(left, top) {
  const eye = dom.waitingEye;
  if (!eye) return;

  const maxLeft = window.innerWidth - eye.offsetWidth;
  const maxTop = window.innerHeight - eye.offsetHeight;
  const clampedLeft = Math.max(0, Math.min(left, maxLeft));
  const clampedTop = Math.max(0, Math.min(top, maxTop));

  eye.style.left = clampedLeft + 'px';
  eye.style.top = clampedTop + 'px';
  eye.style.right = 'auto';
  eye.style.bottom = 'auto';
}

// ==================== ФИЗИКА ====================

// Остановить анимацию, но сохранить скорость (для перезапуска)
function cancelAnimation() {
  if (animFrame) {
    cancelAnimationFrame(animFrame);
    animFrame = null;
  }
  isPhysicalMoving = false;
  lastTimestamp = null;
  // НЕ обнуляем vx, vy
}

// Полная остановка физики (с обнулением скорости)
function stopPhysics() {
  cancelAnimation();
  vx = 0;
  vy = 0;
  log('stopPhysics: физика полностью остановлена');
}

function startPhysics(initialVx, initialVy) {
  log('startPhysics: входные скорость', initialVx, initialVy);

  // Множитель броска
  initialVx *= PHYSICS_CONFIG.throwFactor;
  initialVy *= PHYSICS_CONFIG.throwFactor;
  log('после throwFactor', initialVx, initialVy);

  // Ограничение максимальной скорости
  const speed = Math.hypot(initialVx, initialVy);
  if (speed > PHYSICS_CONFIG.maxSpeed) {
    const scale = PHYSICS_CONFIG.maxSpeed / speed;
    initialVx *= scale;
    initialVy *= scale;
    log('ограничение maxSpeed: скорость стала', initialVx, initialVy);
  }

  // Если скорость слишком мала, не запускаем
  if (Math.abs(initialVx) < PHYSICS_CONFIG.minSpeed && Math.abs(initialVy) < PHYSICS_CONFIG.minSpeed) {
    log('скорость ниже minSpeed, физика не запущена');
    return;
  }

  // Останавливаем предыдущую анимацию (без сброса скорости)
  cancelAnimation();

  // Устанавливаем новую скорость
  vx = initialVx;
  vy = initialVy;

  isPhysicalMoving = true;
  lastTimestamp = null;
  animFrame = requestAnimationFrame(updatePhysics);
  log('startPhysics: анимация ЗАПУЩЕНА, vx=', vx, 'vy=', vy);
}

function updatePhysics(timestamp) {
  if (!isPhysicalMoving) {
    log('updatePhysics: isPhysicalMoving = false, выход');
    return;
  }

  const eye = dom.waitingEye;
  if (!eye || eye.style.display === 'none') {
    log('updatePhysics: глаз не найден или скрыт, остановка');
    stopPhysics();
    return;
  }

  if (!lastTimestamp) {
    lastTimestamp = timestamp;
    animFrame = requestAnimationFrame(updatePhysics);
    log('updatePhysics: первый кадр, инициализация времени');
    return;
  }

  const deltaTime = Math.min(100, timestamp - lastTimestamp);
  lastTimestamp = timestamp;
  log('updatePhysics: deltaTime =', deltaTime, 'ms, vx=', vx, 'vy=', vy);

  // Трение
  const frictionFactor = Math.exp(-PHYSICS_CONFIG.friction * deltaTime / 1000);
  vx *= frictionFactor;
  vy *= frictionFactor;
  log('после трения vx=', vx, 'vy=', vy);

  // Текущая позиция
  let left = parseFloat(eye.style.left) || 0;
  let top = parseFloat(eye.style.top) || 0;

  // Новая позиция
  left += vx * deltaTime;
  top += vy * deltaTime;
  log('позиция до отскоков:', left, top);

  // Границы и отскоки
  const maxLeft = window.innerWidth - eye.offsetWidth;
  const maxTop = window.innerHeight - eye.offsetHeight;
  let collision = false;

  if (left < 0) {
    left = 0;
    vx = -vx * PHYSICS_CONFIG.elasticity;
    collision = true;
    log('отскок слева, новая vx=', vx);
  } else if (left > maxLeft) {
    left = maxLeft;
    vx = -vx * PHYSICS_CONFIG.elasticity;
    collision = true;
    log('отскок справа, новая vx=', vx);
  }

  if (top < 0) {
    top = 0;
    vy = -vy * PHYSICS_CONFIG.elasticity;
    collision = true;
    log('отскок сверху, новая vy=', vy);
  } else if (top > maxTop) {
    top = maxTop;
    vy = -vy * PHYSICS_CONFIG.elasticity;
    collision = true;
    log('отскок снизу, новая vy=', vy);
  }

  if (collision && navigator.vibrate) {
    navigator.vibrate(10);
  }

  setPosition(left, top);

  // Проверка на остановку
  if (Math.abs(vx) < PHYSICS_CONFIG.minSpeed && Math.abs(vy) < PHYSICS_CONFIG.minSpeed) {
    log('скорость ниже minSpeed, останавливаем физику');
    stopPhysics();
  } else {
    animFrame = requestAnimationFrame(updatePhysics);
  }
}

// ==================== ОБРАБОТЧИКИ КАСАНИЙ ====================

function onTouchStart(e) {
  e.preventDefault();
  log('onTouchStart');
  stopPhysics();

  const touch = e.touches[0];
  startX = touch.clientX;
  startY = touch.clientY;

  const rect = dom.waitingEye.getBoundingClientRect();
  startLeft = rect.left;
  startTop = rect.top;

  points = [{ x: startX, y: startY, time: performance.now() }];
  log('начальная точка сохранена', startX, startY);

  moved = false;
  isDragging = false;

  dom.waitingEye.classList.add('dragging');

  clearTimeout(holdTimer);
  holdTimer = setTimeout(() => {
    if (!isDragging) dom.waitingEye.classList.add('holding');
  }, HOLD_DELAY);

  clearTimeout(tapTimer);
  tapTimer = setTimeout(() => {
    if (!moved && !isDragging) {
      dom.waitingEye.classList.add('tapped');
      setTimeout(() => dom.waitingEye.classList.remove('tapped'), 300);
    }
  }, TAP_TIMEOUT);
}

function onTouchMove(e) {
  e.preventDefault();
  const touch = e.touches[0];
  const now = performance.now();

  points.push({ x: touch.clientX, y: touch.clientY, time: now });
  if (points.length > PHYSICS_CONFIG.speedSamples) {
    points.shift();
  }
  log(`onTouchMove: точек в истории ${points.length}, текущие координаты`, touch.clientX, touch.clientY);

  const deltaX = touch.clientX - startX;
  const deltaY = touch.clientY - startY;

  if (!isDragging && (Math.abs(deltaX) > DRAG_THRESHOLD || Math.abs(deltaY) > DRAG_THRESHOLD)) {
    isDragging = true;
    moved = true;
    clearTimeout(holdTimer);
    clearTimeout(tapTimer);
    dom.waitingEye.classList.add('holding');
    log('начало перетаскивания');
  }

  if (isDragging) {
    const newLeft = startLeft + deltaX;
    const newTop = startTop + deltaY;
    setPosition(newLeft, newTop);
  }
}

function onTouchEnd(e) {
  e.preventDefault();
  log('onTouchEnd');
  dom.waitingEye.classList.remove('dragging');
  clearTimeout(holdTimer);
  clearTimeout(tapTimer);

  if (isDragging) {
    log('было перетаскивание, точек в истории:', points.length);
    if (points.length >= 2) {
      const first = points[0];
      const last = points[points.length - 1];
      const totalTime = last.time - first.time;
      log('первая точка:', first, 'последняя:', last, 'разница во времени:', totalTime, 'ms');

      let vxCalc = 0, vyCalc = 0;
      if (totalTime > 0) {
        vxCalc = (last.x - first.x) / totalTime;
        vyCalc = (last.y - first.y) / totalTime;
        log('скорость по общему вектору:', vxCalc, vyCalc, 'пикс/мс');
      }

      if (points.length >= 3) {
        const prev = points[points.length - 2];
        const segmentTime = last.time - prev.time;
        if (segmentTime > 0) {
          const vxSeg = (last.x - prev.x) / segmentTime;
          const vySeg = (last.y - prev.y) / segmentTime;
          log('скорость по последнему сегменту:', vxSeg, vySeg);
          vxCalc = vxSeg * 0.6 + vxCalc * 0.4;
          vyCalc = vySeg * 0.6 + vyCalc * 0.4;
          log('усреднённая скорость:', vxCalc, vyCalc);
        }
      }

      startPhysics(vxCalc, vyCalc);
    } else {
      log('недостаточно точек для расчёта скорости (меньше 2)');
    }

    dom.waitingEye.classList.remove('holding');
    if (navigator.vibrate) navigator.vibrate(20);
  } else {
    log('не было перетаскивания');
    if (!moved) {
      if (!dom.waitingEye.classList.contains('tapped')) {
        dom.waitingEye.classList.add('tapped');
        setTimeout(() => dom.waitingEye.classList.remove('tapped'), 300);
        log('тап');
      }
      dom.waitingEye.classList.remove('holding');
    }
  }

  isDragging = false;
  moved = false;
  points = [];
}

function onTouchCancel(e) {
  log('onTouchCancel');
  dom.waitingEye.classList.remove('dragging', 'holding');
  clearTimeout(holdTimer);
  clearTimeout(tapTimer);
  isDragging = false;
  moved = false;
  stopPhysics();
  points = [];
}

// ===== Мышиные события (минимум) =====
function onMouseDown(e) {
  e.preventDefault();
  // не реализовано
}

initEyeDrag();