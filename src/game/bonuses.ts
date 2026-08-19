/**
 * Чистая игровая логика бонусов: спавн у верхнего края, строго вертикальное
 * падение с постоянной скоростью, удаление за нижним краем без эффекта.
 *
 * Никакого DOM/Canvas API — только примитивы и объект состояния (принцип IV
 * конституции). `updateBonuses` мутирует переданный `state` на месте и не
 * аллоцирует новый массив внутри кадра (принцип III) — удаление вышедших за
 * край бонусов сделано обратным проходом с `splice()` по индексу.
 *
 * T010: реализует T004 (`bonuses.test.ts`) — конвенция порядка обращений к
 * `random()` внутри одного спавна ЗАФИКСИРОВАНА тестами буквально (см.
 * комментарий в начале bonuses.test.ts) и повторена здесь дословно:
 *   1) бросок x:     x = random() * (worldWidth - BONUS_WIDTH_PX)
 *   2) бросок знака:  random() < 0.5 → 'positive', иначе 'negative'
 */

export type BonusSign = 'positive' | 'negative';

export interface Bonus {
  sign: BonusSign;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface BonusesState {
  list: Bonus[];
  spawnTimerSeconds: number;
}

// Tuning-параметры (plan.md «Не-цели» — конкретные числа не зафиксированы спекой).
export const BONUS_SPAWN_INTERVAL_MIN_S = 2;
export const BONUS_SPAWN_INTERVAL_MAX_S = 5;
export const BONUS_WIDTH_PX = 16;
export const BONUS_HEIGHT_PX = 16;
export const BONUS_FALL_SPEED_PX_S = 100;

function randomSpawnTimer(random: () => number): number {
  return (
    BONUS_SPAWN_INTERVAL_MIN_S +
    random() * (BONUS_SPAWN_INTERVAL_MAX_S - BONUS_SPAWN_INTERVAL_MIN_S)
  );
}

export function createBonusesState(): BonusesState {
  return {
    list: [],
    spawnTimerSeconds: randomSpawnTimer(Math.random),
  };
}

function spawnBonus(state: BonusesState, worldWidth: number, random: () => number): void {
  const x = random() * (worldWidth - BONUS_WIDTH_PX);
  const sign: BonusSign = random() < 0.5 ? 'positive' : 'negative';

  state.list.push({ sign, x, y: 0, width: BONUS_WIDTH_PX, height: BONUS_HEIGHT_PX });
}

/**
 * Мутирует `state` на месте по одному кадру ввода/времени.
 * Движение строго вертикально вниз — у `Bonus` структурно нет поля `vx`.
 *
 * Движение применяется к списку ДО спавна — только что появившийся на этом
 * кадре бонус стартует ровно с y = 0 (контракт bonuses.test.ts), а не сразу
 * смещается на BONUS_FALL_SPEED_PX_S * dt в тот же кадр.
 */
export function updateBonuses(
  state: BonusesState,
  deltaTimeSeconds: number,
  worldWidth: number,
  worldHeight: number,
  random: () => number = Math.random,
): void {
  for (const bonus of state.list) {
    bonus.y += BONUS_FALL_SPEED_PX_S * deltaTimeSeconds;
  }

  state.spawnTimerSeconds -= deltaTimeSeconds;
  if (state.spawnTimerSeconds <= 0) {
    spawnBonus(state, worldWidth, random);
    state.spawnTimerSeconds = randomSpawnTimer(random);
  }

  for (let i = state.list.length - 1; i >= 0; i--) {
    if (state.list[i].y > worldHeight) {
      state.list.splice(i, 1);
    }
  }
}
