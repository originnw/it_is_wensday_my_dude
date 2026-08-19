/**
 * Чистая игровая логика насекомых: спавн, движение без ускорения, удаление
 * за краем мира.
 *
 * Никакого DOM/Canvas API — только примитивы и объект состояния (принцип IV
 * конституции). `updateInsects` мутирует переданный `state` на месте и не
 * аллоцирует новый массив внутри кадра (принцип III) — удаление вышедших за
 * край насекомых сделано обратным проходом с `splice()` по индексу.
 *
 * T009: реализует T003 (`insects.test.ts`) — конвенция порядка обращений к
 * `random()` внутри одного спавна ЗАФИКСИРОВАНА тестами буквально (см.
 * комментарий в начале insects.test.ts) и повторена здесь дословно:
 *   1) тип: random() < 0.5 → 'mosquito', иначе 'dragonfly'
 *   2) вход: random() < 1/3 → 'top'; < 2/3 → 'left'; иначе → 'right'
 *   3) высота появления над землёй (только для left/right):
 *      heightAboveGroundPx = random() * (JUMP_HEIGHT_PX + FROG_HEIGHT_PX)
 *   4) сброс таймера спавна: MIN + random() * (MAX - MIN)
 */

import { FROG_HEIGHT_PX, JUMP_HEIGHT_PX } from './frog';

export type InsectType = 'mosquito' | 'dragonfly';
export type InsectEntryPoint = 'top' | 'left' | 'right';

export interface Insect {
  type: InsectType;
  x: number;
  y: number;
  width: number;
  height: number;
  /** Базовая скорость, px/s — не включает текущий множитель бонусного эффекта. */
  vx: number;
  vy: number;
}

export interface InsectsState {
  list: Insect[];
  spawnTimerSeconds: number;
}

// Tuning-параметры (plan.md «Не-цели» — конкретные числа не зафиксированы спекой).
export const INSECT_SPAWN_INTERVAL_MIN_S = 1;
export const INSECT_SPAWN_INTERVAL_MAX_S = 3;
export const MOSQUITO_SCORE = 10;
export const DRAGONFLY_SCORE = 25;

const MOSQUITO_WIDTH_PX = 12;
const MOSQUITO_HEIGHT_PX = 8;
const DRAGONFLY_WIDTH_PX = 20;
const DRAGONFLY_HEIGHT_PX = 12;

const HORIZONTAL_SPEED_PX_S = 150;
const VERTICAL_SPEED_PX_S = 90;

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
  const entryRoll = random();
  const entry: InsectEntryPoint = entryRoll < 1 / 3 ? 'top' : entryRoll < 2 / 3 ? 'left' : 'right';
  const { width, height } = sizeFor(type);

  let x: number;
  let y: number;
  let vx: number;
  let vy: number;

  if (entry === 'top') {
    // T009, нетривиальное решение: конвенция random() из insects.test.ts
    // (комментарий в начале файла) явно фиксирует, что бросок "высоты
    // появления" потребляется ТОЛЬКО для left/right — для top НЕТ
    // дополнительного вызова random() между броском входа и сбросом
    // таймера. Поэтому x для top не рандомизируется через инжектированный
    // random, а фиксируется по центру мира (tuning, не влияет на AC).
    x = (worldWidth - width) / 2;
    y = 0;
    vx = 0;
    vy = VERTICAL_SPEED_PX_S;
  } else {
    const heightAboveGroundPx = random() * (JUMP_HEIGHT_PX + FROG_HEIGHT_PX);
    y = groundY - heightAboveGroundPx;

    if (entry === 'left') {
      x = -width;
      vx = HORIZONTAL_SPEED_PX_S;
    } else {
      x = worldWidth;
      vx = -HORIZONTAL_SPEED_PX_S;
    }
    vy = 0;
  }

  state.list.push({ type, x, y, width, height, vx, vy });
}

/**
 * Мутирует `state` на месте по одному кадру ввода/времени.
 *
 * `speedMultiplier` умножает эффективное перемещение КАЖДЫЙ кадр заново —
 * не «запекается» в vx/vy насекомого (AC-10/AC-11 через effects.ts).
 */
export function updateInsects(
  state: InsectsState,
  deltaTimeSeconds: number,
  worldWidth: number,
  worldHeight: number,
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
    insect.y += insect.vy * speedMultiplier * deltaTimeSeconds;
  }

  for (let i = state.list.length - 1; i >= 0; i--) {
    const insect = state.list[i];
    const leftEntryExit = insect.vx > 0 && insect.x > worldWidth;
    const rightEntryExit = insect.vx < 0 && insect.x + insect.width < 0;
    const topEntryExit = insect.vx === 0 && insect.y > worldHeight;

    if (leftEntryExit || rightEntryExit || topEntryExit) {
      state.list.splice(i, 1);
    }
  }
}
