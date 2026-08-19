/**
 * Чистая игровая логика насекомых: спавн, движение (прямолинейное и
 * криволинейное) без ускорения по горизонтали, удаление за боковым краем
 * мира.
 *
 * Никакого DOM/Canvas API — только примитивы и объект состояния (принцип IV
 * конституции). `updateInsects` мутирует переданный `state` на месте и не
 * аллоцирует новый массив внутри кадра (принцип III) — удаление вышедших за
 * край насекомых сделано обратным проходом с `splice()` по индексу.
 *
 * Правки по фидбеку игрока после первой реализации (см. spec.md,
 * «Сессия уточнений — 2026-08-19»): AC-1/AC-2 — насекомые больше не влетают
 * сверху (верх зарезервирован под бонусы, bonuses.ts); высота появления
 * теперь отсчитывается от НИЖНЕГО края насекомого, а не от верхнего — иначе
 * при малых random() насекомое целиком оказывалось ниже уровня земли; новый
 * AC-18 — криволинейная траектория как альтернатива прямолинейной.
 *
 * Конвенция порядка обращений к random() внутри одного спавна ЗАФИКСИРОВАНА
 * тестами буквально (см. комментарий в начале insects.test.ts):
 *   1) тип: random() < 0.5 → 'mosquito', иначе 'dragonfly'
 *   2) вход: random() < 0.5 → 'left', иначе → 'right'
 *   3) тип движения: random() < 0.5 → 'straight', иначе → 'curve'
 *   4) высота появления над землёй, px (формула зависит от типа движения —
 *      см. curveVerticalOffset ниже и CURVE_TOTAL_AMPLITUDE_PX):
 *        - 'straight': heightAboveGroundPx = random() * (JUMP_HEIGHT_PX + FROG_HEIGHT_PX)
 *        - 'curve':    heightAboveGroundPx = CURVE_TOTAL_AMPLITUDE_PX +
 *                         random() * (JUMP_HEIGHT_PX + FROG_HEIGHT_PX - CURVE_TOTAL_AMPLITUDE_PX)
 *   5) (только 'curve') фаза волны: random() * Math.PI * 2
 *   6) сброс таймера спавна: MIN + random() * (MAX - MIN)
 */

import { FROG_HEIGHT_PX, JUMP_HEIGHT_PX } from './frog';
import {
  INSECT_SPAWN_INTERVAL_MIN_S,
  INSECT_SPAWN_INTERVAL_MAX_S,
  MOSQUITO_SCORE,
  DRAGONFLY_SCORE,
  MOSQUITO_WIDTH_PX,
  MOSQUITO_HEIGHT_PX,
  DRAGONFLY_WIDTH_PX,
  DRAGONFLY_HEIGHT_PX,
  INSECT_HORIZONTAL_SPEED_PX_S,
  INSECT_CURVE_PRIMARY_WAVELENGTH_PX,
  INSECT_CURVE_SECONDARY_WAVELENGTH_PX,
  INSECT_CURVE_PRIMARY_AMPLITUDE_PX,
  INSECT_CURVE_SECONDARY_AMPLITUDE_PX,
} from './tuning';

// Сами значения — в game/tuning.ts (единая точка редактирования числовых
// параметров игры); здесь только re-export под прежними именами, чтобы
// внешние импорты (`from './insects'` в тестах) не менялись.
export { INSECT_SPAWN_INTERVAL_MIN_S, INSECT_SPAWN_INTERVAL_MAX_S, MOSQUITO_SCORE, DRAGONFLY_SCORE };

export type InsectType = 'mosquito' | 'dragonfly';
export type InsectEntryPoint = 'left' | 'right';
export type InsectMovementType = 'straight' | 'curve';

export interface Insect {
  type: InsectType;
  movementType: InsectMovementType;
  x: number;
  y: number;
  width: number;
  height: number;
  /** Базовая горизонтальная скорость, px/s — не включает множитель бонусного эффекта. */
  vx: number;
  /** Только для movementType === 'curve': Y без вертикальной волны. */
  curveBaseY?: number;
  /** Только для movementType === 'curve': случайная фаза старта волны. */
  curvePhase?: number;
}

export interface InsectsState {
  list: Insect[];
  spawnTimerSeconds: number;
}

// Суммарная максимально возможная амплитуда волны — используется как нижняя
// граница heightAboveGroundPx для 'curve', чтобы гребень волны не утащил
// насекомое ниже уровня земли (тот же класс бага, что и в основной формуле
// высоты появления — см. комментарий к файлу). Производная величина, а не
// самостоятельный tuning-параметр, поэтому считается здесь, а не в tuning.ts.
export const CURVE_TOTAL_AMPLITUDE_PX = INSECT_CURVE_PRIMARY_AMPLITUDE_PX + INSECT_CURVE_SECONDARY_AMPLITUDE_PX;

function curveVerticalOffset(x: number, phase: number): number {
  const primary = Math.sin((x / INSECT_CURVE_PRIMARY_WAVELENGTH_PX) * Math.PI * 2 + phase);
  const secondary = Math.sin((x / INSECT_CURVE_SECONDARY_WAVELENGTH_PX) * Math.PI * 2 + phase * 1.9);
  return INSECT_CURVE_PRIMARY_AMPLITUDE_PX * primary + INSECT_CURVE_SECONDARY_AMPLITUDE_PX * secondary;
}

function randomSpawnTimer(random: () => number): number {
  return (
    INSECT_SPAWN_INTERVAL_MIN_S +
    random() * (INSECT_SPAWN_INTERVAL_MAX_S - INSECT_SPAWN_INTERVAL_MIN_S)
  );
}

export function createInsectsState(): InsectsState {
  return {
    list: [],
    spawnTimerSeconds: randomSpawnTimer(Math.random),
  };
}

function sizeFor(type: InsectType): { width: number; height: number } {
  return type === 'mosquito'
    ? { width: MOSQUITO_WIDTH_PX, height: MOSQUITO_HEIGHT_PX }
    : { width: DRAGONFLY_WIDTH_PX, height: DRAGONFLY_HEIGHT_PX };
}

function spawnInsect(
  state: InsectsState,
  worldWidth: number,
  groundY: number,
  random: () => number,
): void {
  const type: InsectType = random() < 0.5 ? 'mosquito' : 'dragonfly';
  const entry: InsectEntryPoint = random() < 0.5 ? 'left' : 'right';
  const movementType: InsectMovementType = random() < 0.5 ? 'straight' : 'curve';
  const { width, height } = sizeFor(type);

  // Высота отсчитывается от НИЖНЕГO края насекомого (baseY = верх насекомого,
  // baseY + height = низ) — иначе при heightAboveGroundPx около 0 насекомое
  // целиком оказывалось бы ниже groundY.
  const heightAboveGroundPx =
    movementType === 'curve'
      ? CURVE_TOTAL_AMPLITUDE_PX + random() * (JUMP_HEIGHT_PX + FROG_HEIGHT_PX - CURVE_TOTAL_AMPLITUDE_PX)
      : random() * (JUMP_HEIGHT_PX + FROG_HEIGHT_PX);
  const baseY = groundY - heightAboveGroundPx - height;

  const x = entry === 'left' ? -width : worldWidth;
  const vx = entry === 'left' ? INSECT_HORIZONTAL_SPEED_PX_S : -INSECT_HORIZONTAL_SPEED_PX_S;

  const insect: Insect = { type, movementType, x, y: baseY, width, height, vx };

  if (movementType === 'curve') {
    insect.curveBaseY = baseY;
    insect.curvePhase = random() * Math.PI * 2;
  }

  state.list.push(insect);
}

/**
 * Мутирует `state` на месте по одному кадру ввода/времени.
 *
 * `speedMultiplier` умножает эффективное горизонтальное перемещение КАЖДЫЙ
 * кадр заново — не «запекается» в vx насекомого (AC-10/AC-11 через
 * effects.ts). Для 'curve' он же ускоряет/замедляет прохождение волны, т.к.
 * вертикальное смещение — функция от x, а не от времени напрямую.
 */
export function updateInsects(
  state: InsectsState,
  deltaTimeSeconds: number,
  worldWidth: number,
  groundY: number,
  speedMultiplier: number,
  random: () => number = Math.random,
): void {
  state.spawnTimerSeconds -= deltaTimeSeconds;
  if (state.spawnTimerSeconds <= 0) {
    spawnInsect(state, worldWidth, groundY, random);
    state.spawnTimerSeconds = randomSpawnTimer(random);
  }

  for (const insect of state.list) {
    insect.x += insect.vx * speedMultiplier * deltaTimeSeconds;

    if (insect.movementType === 'curve') {
      insect.y = insect.curveBaseY! + curveVerticalOffset(insect.x, insect.curvePhase!);
    }
  }

  for (let i = state.list.length - 1; i >= 0; i--) {
    const insect = state.list[i];
    const leftEntryExit = insect.vx > 0 && insect.x > worldWidth;
    const rightEntryExit = insect.vx < 0 && insect.x + insect.width < 0;

    if (leftEntryExit || rightEntryExit) {
      state.list.splice(i, 1);
    }
  }
}
