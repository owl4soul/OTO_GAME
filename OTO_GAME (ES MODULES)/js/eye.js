// Модуль: Глаз ожидания с физикой, вращением, деформацией и вибрацией от силы удара
// Полностью оптимизирован для мобильных устройств. Комментарии подробно описывают логику.
'use strict';

import { DOM } from './4-dom.js';

const dom = DOM.getDOM();

// ==================== КОНФИГУРАЦИЯ (легко настраивается) ====================
const PHYSICS_CONFIG = {
  friction: 1.2, // трение (чем меньше, тем дольше катится)
  elasticity: 0.85, // упругость при отскоке (0..1)
  minSpeed: 0.005, // порог остановки (пикс/мс) – ниже этой скорости останавливаем
  maxSpeed: 1.5, // максимальная начальная скорость броска (ограничение)
  throwFactor: 1.5, // множитель броска – усиливает инерцию
  speedSamples: 5 // количество сохраняемых точек касания для расчёта скорости
};

const SPIN_CONFIG = {
  enabled: true, // включить вращение при движении
  factor: 0.03, // чувствительность вращения (рад/пикс)
};

const VIBRO_CONFIG = {
  baseDuration: 10, // минимальная длительность вибрации при слабом ударе (мс)
  maxDuration: 50, // максимальная длительность при сильном ударе (мс)
};

const DEFORM_CONFIG = {
  maxSquash: 0.6, // максимальное сжатие по оси удара (scale = 0.6 при интенсивности 1)
  maxStretch: 1.4, // максимальное растяжение по перпендикулярной оси (scale = 1.4)
  animDuration: 200, // длительность анимации деформации (мс)
};

// ==================== ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ ====================
let isDragging = false; // флаг перетаскивания (палец на глазу)
let startX, startY; // координаты начала касания (экранные)
let startLeft, startTop; // координаты глаза в момент начала касания
let moved = false; // было ли движение (для отличия тапа от драга)
let holdTimer, tapTimer; // таймеры для удержания и тапа
const DRAG_THRESHOLD = 5; // порог движения для начала перетаскивания
const HOLD_DELAY = 200; // задержка для включения режима удержания (holding)
const TAP_TIMEOUT = 200; // окно для определения тапа

// Физические переменные
let vx = 0,
  vy = 0; // скорость (пикс/мс)
let animFrame = null; // id requestAnimationFrame
let lastTimestamp = null; // время предыдущего кадра
let isPhysicalMoving = false; // флаг, что анимация физики запущена
let rotationAngle = 0; // текущий угол вращения (радианы)

// Текущие координаты глаза (хранятся отдельно для оптимизации)
let eyeX = 0,
  eyeY = 0;

// История точек касания для вычисления скорости броска
let points = [];

// Кешированные размеры окна и глаза (чтобы не запрашивать DOM часто)
let winWidth = window.innerWidth;
let winHeight = window.innerHeight;
let eyeWidth = 80; // ширина глаза (обновится при показе)
let eyeHeight = 80; // высота глаза

// Отладка (можно включить для проверки)
const DEBUG = false;

function log(...args) { if (DEBUG) console.log('[EyePhysics]', ...args); }

// ==================== ОБНОВЛЕНИЕ РАЗМЕРОВ ПРИ ПОВОРОТЕ ЭКРАНА ====================
window.addEventListener('resize', () => {
  winWidth = window.innerWidth;
  winHeight = window.innerHeight;
  const eye = dom.waitingEye;
  if (eye && eye.classList.contains('visible')) {
    const maxX = winWidth - eye.offsetWidth;
    const maxY = winHeight - eye.offsetHeight;
    eyeX = Math.max(0, Math.min(eyeX, maxX));
    eyeY = Math.max(0, Math.min(eyeY, maxY));
    updateElementTransform();
  }
});

// ==================== ФУНКЦИИ ОБНОВЛЕНИЯ ПОЗИЦИИ ====================

/**
 * Обновляет CSS-трансформацию глаза (translate3d + rotate)
 * Использует аппаратное ускорение GPU через translate3d.
 * Также сохраняет координаты в CSS-переменные для анимаций.
 */
function updateElementTransform() {
  const eye = dom.waitingEye;
  if (!eye) return;
  eye.style.transform = `translate3d(${eyeX}px, ${eyeY}px, 0) rotate(${rotationAngle}rad) scale(1)`;
  eye.style.setProperty('--tx', eyeX + 'px');
  eye.style.setProperty('--ty', eyeY + 'px');
  eye.style.setProperty('--rotation', rotationAngle + 'rad');
}

// ==================== ПУБЛИЧНЫЕ ФУНКЦИИ (API) ====================

/**
 * Показать глаз над контейнером мыслей (например, при начале ожидания ответа).
 */
export function showEye() {
  const eye = dom.waitingEye;
  if (!eye) return;
  
  stopPhysics(); // останавливаем текущее движение
  eye.style.display = 'block';
  eye.classList.remove('visible');
  
  requestAnimationFrame(() => {
    const textElement = dom.thoughtsOfHeroText;
    if (!textElement) return;
    
    const rect = textElement.getBoundingClientRect();
    eyeWidth = eye.offsetWidth || 80;
    eyeHeight = eye.offsetHeight || 80;
    const left = rect.left + rect.width / 2 - eyeWidth / 2;
    const top = rect.top - 100;
    
    const maxX = winWidth - eyeWidth;
    const maxY = winHeight - eyeHeight;
    eyeX = Math.max(0, Math.min(left, maxX));
    eyeY = Math.max(0, Math.min(top, maxY));
    rotationAngle = 0; // сбрасываем вращение
    
    updateElementTransform();
    eye.classList.add('visible');
    log('showEye');
  });
}

/**
 * Скрыть глаз с затуханием.
 */
export function hideEye() {
  const eye = dom.waitingEye;
  if (!eye) return;
  
  stopPhysics();
  eye.classList.remove('visible');
  setTimeout(() => {
    if (!eye.classList.contains('visible')) {
      eye.style.display = 'none';
      eye.classList.remove('dragging', 'holding', 'tapped', 'wall-hit');
    }
  }, 500);
}

/**
 * Инициализирует обработчики касаний (вызывается один раз при загрузке).
 */
export function initEyeDrag() {
  const eye = dom.waitingEye;
  if (!eye) return;
  eye.addEventListener('touchstart', onTouchStart, { passive: false });
  eye.addEventListener('touchmove', onTouchMove, { passive: false });
  eye.addEventListener('touchend', onTouchEnd);
  eye.addEventListener('touchcancel', onTouchCancel);
  eye.addEventListener('mousedown', onMouseDown); // для десктопа (можно расширить)
  log('initEyeDrag');
}

// ==================== ОБРАБОТЧИКИ КАСАНИЙ ====================

function onTouchStart(e) {
  e.preventDefault();
  log('touchstart');
  stopPhysics(); // останавливаем физику, так как начинаем перетаскивание
  
  const touch = e.touches[0];
  startX = touch.clientX;
  startY = touch.clientY;
  startLeft = eyeX;
  startTop = eyeY;
  
  points = [{ x: startX, y: startY, time: performance.now() }];
  moved = false;
  isDragging = false;
  
  rotationAngle = 0; // при начале перетаскивания сбрасываем вращение
  updateElementTransform();
  
  dom.waitingEye.classList.add('dragging'); // визуальный класс
  
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
  if (!isDragging && !dom.waitingEye) return;
  
  const touch = e.touches[0];
  const now = performance.now();
  
  points.push({ x: touch.clientX, y: touch.clientY, time: now });
  if (points.length > PHYSICS_CONFIG.speedSamples) {
    points.shift();
  }
  
  const deltaX = touch.clientX - startX;
  const deltaY = touch.clientY - startY;
  
  // Определяем начало перетаскивания (превышен порог)
  if (!isDragging && (Math.abs(deltaX) > DRAG_THRESHOLD || Math.abs(deltaY) > DRAG_THRESHOLD)) {
    isDragging = true;
    moved = true;
    clearTimeout(holdTimer);
    clearTimeout(tapTimer);
    dom.waitingEye.classList.add('holding');
  }
  
  if (isDragging) {
    let newX = startLeft + deltaX;
    let newY = startTop + deltaY;
    
    const maxX = winWidth - eyeWidth;
    const maxY = winHeight - eyeHeight;
    eyeX = Math.max(0, Math.min(newX, maxX));
    eyeY = Math.max(0, Math.min(newY, maxY));
    
    updateElementTransform();
  }
}

function onTouchEnd(e) {
  e.preventDefault();
  log('touchend');
  dom.waitingEye.classList.remove('dragging');
  clearTimeout(holdTimer);
  clearTimeout(tapTimer);
  
  if (isDragging) {
    // Вычисляем скорость броска по накопленным точкам
    if (points.length >= 2) {
      const first = points[0];
      const last = points[points.length - 1];
      const totalTime = last.time - first.time;
      let vxCalc = 0,
        vyCalc = 0;
      if (totalTime > 0) {
        vxCalc = (last.x - first.x) / totalTime;
        vyCalc = (last.y - first.y) / totalTime;
      }
      
      // Усредняем с последним сегментом (более свежее движение)
      if (points.length >= 3) {
        const prev = points[points.length - 2];
        const segTime = last.time - prev.time;
        if (segTime > 0) {
          const vxSeg = (last.x - prev.x) / segTime;
          const vySeg = (last.y - prev.y) / segTime;
          vxCalc = vxSeg * 0.6 + vxCalc * 0.4;
          vyCalc = vySeg * 0.6 + vyCalc * 0.4;
        }
      }
      
      startPhysics(vxCalc, vyCalc); // запускаем физику с вычисленной скоростью
    }
    
    dom.waitingEye.classList.remove('holding');
    if (navigator.vibrate) {
      navigator.vibrate(VIBRO_CONFIG.maxDuration); // лёгкая вибрация при броске
    }
  } else {
    if (!moved) {
      dom.waitingEye.classList.add('tapped');
      setTimeout(() => dom.waitingEye.classList.remove('tapped'), 300);
    }
    dom.waitingEye.classList.remove('holding');
  }
  
  isDragging = false;
  moved = false;
  points = [];
}

function onTouchCancel(e) {
  log('touchcancel');
  dom.waitingEye.classList.remove('dragging', 'holding');
  clearTimeout(holdTimer);
  clearTimeout(tapTimer);
  isDragging = false;
  moved = false;
  stopPhysics();
  points = [];
}

function onMouseDown(e) {
  e.preventDefault(); // заглушка для мыши (можно добавить позже)
}

// ==================== ФИЗИКА ДВИЖЕНИЯ ====================

/**
 * Отменяет текущую анимацию физики (без сброса скорости).
 */
function cancelAnimation() {
  if (animFrame) {
    cancelAnimationFrame(animFrame);
    animFrame = null;
  }
  isPhysicalMoving = false;
  lastTimestamp = null;
}

/**
 * Полная остановка физики (обнуление скорости и отмена анимации).
 */
function stopPhysics() {
  cancelAnimation();
  vx = 0;
  vy = 0;
  log('stopPhysics');
}

/**
 * Запускает физику с заданной начальной скоростью.
 * @param {number} initialVx - скорость по X (пикс/мс)
 * @param {number} initialVy - скорость по Y (пикс/мс)
 */
function startPhysics(initialVx, initialVy) {
  log('startPhysics input:', initialVx, initialVy);
  
  initialVx *= PHYSICS_CONFIG.throwFactor;
  initialVy *= PHYSICS_CONFIG.throwFactor;
  
  const speed = Math.hypot(initialVx, initialVy);
  if (speed > PHYSICS_CONFIG.maxSpeed) {
    const scale = PHYSICS_CONFIG.maxSpeed / speed;
    initialVx *= scale;
    initialVy *= scale;
  }
  
  if (Math.abs(initialVx) < PHYSICS_CONFIG.minSpeed && Math.abs(initialVy) < PHYSICS_CONFIG.minSpeed) {
    return; // слишком медленно, не запускаем анимацию
  }
  
  cancelAnimation();
  vx = initialVx;
  vy = initialVy;
  isPhysicalMoving = true;
  lastTimestamp = null;
  animFrame = requestAnimationFrame(updatePhysics);
  log('physics started, vx=', vx, 'vy=', vy);
}

/**
 * Применяет вибрацию и деформацию при ударе о стену.
 * @param {number} impactSpeed - модуль скорости до удара (для расчёта силы)
 * @param {string} direction - 'horizontal' (левая/правая стена) или 'vertical' (верхняя/нижняя)
 */
function applyHitEffect(impactSpeed, direction) {
  const eye = dom.waitingEye;
  if (!eye) return;
  
  // Интенсивность удара от 0 до 1 (относительно максимальной скорости)
  const intensity = Math.min(1, impactSpeed / PHYSICS_CONFIG.maxSpeed);
  
  // Вибрация – длительность линейно зависит от интенсивности
  if (navigator.vibrate) {
    const vibroTime = Math.round(
      VIBRO_CONFIG.baseDuration + intensity * (VIBRO_CONFIG.maxDuration - VIBRO_CONFIG.baseDuration)
    );
    navigator.vibrate(vibroTime);
    log(`Vibro: ${vibroTime}ms, intensity: ${intensity}`);
  }
  
  // Деформация: в зависимости от направления удара задаём коэффициенты сжатия/растяжения
  let squashX, squashY;
  if (direction === 'horizontal') {
    // Удар о левую/правую стену – сжатие по X, растяжение по Y
    squashX = 1 - intensity * (1 - DEFORM_CONFIG.maxSquash);
    squashY = 1 + intensity * (DEFORM_CONFIG.maxStretch - 1);
  } else {
    // Удар о верхнюю/нижнюю стену – сжатие по Y, растяжение по X
    squashY = 1 - intensity * (1 - DEFORM_CONFIG.maxSquash);
    squashX = 1 + intensity * (DEFORM_CONFIG.maxStretch - 1);
  }
  
  // Сохраняем в CSS-переменные (будут использованы в анимации)
  eye.style.setProperty('--squash-x', squashX);
  eye.style.setProperty('--squash-y', squashY);
  
  // Запускаем анимацию удара (через класс wall-hit)
  eye.classList.remove('wall-hit');
  // Небольшая задержка, чтобы браузер увидел удаление класса и перезапустил анимацию
  setTimeout(() => {
    eye.classList.add('wall-hit');
  }, 10);
  
  // Убираем класс после окончания анимации
  setTimeout(() => {
    eye.classList.remove('wall-hit');
  }, DEFORM_CONFIG.animDuration);
}

/**
 * Основной цикл физики (вызывается через requestAnimationFrame).
 */
function updatePhysics(timestamp) {
  if (!isPhysicalMoving) return;
  
  const eye = dom.waitingEye;
  if (!eye || eye.style.display === 'none') {
    stopPhysics();
    return;
  }
  
  if (!lastTimestamp) {
    lastTimestamp = timestamp;
    animFrame = requestAnimationFrame(updatePhysics);
    return;
  }
  
  const deltaTime = Math.min(50, timestamp - lastTimestamp); // ограничиваем, чтобы избежать рывков
  lastTimestamp = timestamp;
  
  // Трение (экспоненциальное затухание)
  const frictionFactor = Math.exp(-PHYSICS_CONFIG.friction * deltaTime / 1000);
  vx *= frictionFactor;
  vy *= frictionFactor;
  
  // Запоминаем скорость до обработки столкновений (нужна для расчёта силы удара)
  const speedBefore = Math.hypot(vx, vy);
  
  // Обновляем координаты
  eyeX += vx * deltaTime;
  eyeY += vy * deltaTime;
  
  // Границы экрана и отскоки
  const maxX = winWidth - eyeWidth;
  const maxY = winHeight - eyeHeight;
  let collided = false;
  let collisionDirection = null;
  
  if (eyeX < 0) {
    eyeX = 0;
    vx = -vx * PHYSICS_CONFIG.elasticity;
    collided = true;
    collisionDirection = 'horizontal';
  } else if (eyeX > maxX) {
    eyeX = maxX;
    vx = -vx * PHYSICS_CONFIG.elasticity;
    collided = true;
    collisionDirection = 'horizontal';
  }
  
  if (eyeY < 0) {
    eyeY = 0;
    vy = -vy * PHYSICS_CONFIG.elasticity;
    collided = true;
    collisionDirection = 'vertical';
  } else if (eyeY > maxY) {
    eyeY = maxY;
    vy = -vy * PHYSICS_CONFIG.elasticity;
    collided = true;
    collisionDirection = 'vertical';
  }
  
  if (collided) {
    // Применяем вибрацию и деформацию, пропорциональные скорости до удара
    applyHitEffect(speedBefore, collisionDirection);
  }
  
  // Вращение (если включено)
  if (SPIN_CONFIG.enabled) {
    const speed = Math.hypot(vx, vy);
    if (speed > 0.001) {
      const direction = Math.abs(vx) > 0.001 ? Math.sign(vx) : Math.sign(vy);
      rotationAngle += speed * deltaTime * SPIN_CONFIG.factor * direction;
    }
  }
  
  // Применяем трансформацию
  updateElementTransform();
  
  // Продолжаем, если скорость выше порога
  if (Math.abs(vx) < PHYSICS_CONFIG.minSpeed && Math.abs(vy) < PHYSICS_CONFIG.minSpeed) {
    stopPhysics();
  } else {
    animFrame = requestAnimationFrame(updatePhysics);
  }
}

// ==================== АВТОЗАПУСК ====================
// Инициализируем обработчики при импорте модуля (экспортируемая функция уже вызвана?)
initEyeDrag(); // можно вызвать здесь или оставить на усмотрение вызывающего кода