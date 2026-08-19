/**
 * Чистая игровая логика бонусов: спавн у верхнего края, строго вертикальное
 * падение с постоянной скоростью, удаление на уровне земли без эффекта.
 *
 * Никакого DOM/Canvas API — только примитивы и объект состояния (принцип IV
 * конституции). `updateBonuses` мутирует переданный `state` на месте и не
 * аллоцирует новый массив внутри кадра (принцип III) — удаление вышедших за
 * край бонусов сделано обратным проходом с `splice()` по индексу.
 *
 * Правка по фидбеку игрока (spec.md, AC-9, «Сессия уточнений — 2026-08-19»):
 * бонус исчезает на уровне земли/воды под ногами лягушки (groundY), а не у
 * нижнего края canvas — по геймплейному замыслу непойманный бонус «тонет»
 * или «разбивается» об землю, не долетая до самого низа экрана.
 *
 * T010: реализует T004 (`bonuses.test.ts`) — конвенция порядка обращений к
 * `random()` внутри одного спавна ЗАФИКСИРОВАНА тестами буквально (см.
 * комментарий в начале bonuses.test.ts) и повторена здесь дословно:
 *   1) бросок x:     см. spawnX() — обычный random()*(worldWidth - BONUS_WIDTH_PX)
 *      для самого первого бонуса, но для всех следующих x выбирается с
 *      минимальным отступом BONUS_MIN_X_GAP_PX от x предыдущего спавна
 *      (фидбек игрока: «бонусы часто падают в одну линию») — оба варианта
 *      потребляют ровно один random(), конвенция количества бросков не
 *      меняется.
 *   2) бросок знака:  random() < BONUS_POSITIVE_PROBABILITY → 'positive', иначе 'negative'
 */

import {
  BONUS_SPAWN_INTERVAL_MIN_S,
  BONUS_SPAWN_INTERVAL_MAX_S,
  BONUS_WIDTH_PX,
  BONUS_HEIGHT_PX,
  BONUS_FALL_SPEED_PX_S,
  BONUS_POSITIVE_PROBABILITY,
  BONUS_MIN_X_GAP_PX,
} from './tuning';

// Сами значения — в game/tuning.ts; здесь re-export под прежними именами,
// чтобы внешние импорты (`from './bonuses'` в тестах) не менялись.
export {
  BONUS_SPAWN_INTERVAL_MIN_S,
  BONUS_SPAWN_INTERVAL_MAX_S,
  BONUS_WIDTH_PX,
  BONUS_HEIGHT_PX,
  BONUS_FALL_SPEED_PX_S,
  BONUS_POSITIVE_PROBABILITY,
  BONUS_MIN_X_GAP_PX,
};

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
  /** X последнего заспавненного бонуса (даже если он уже покинул экран) — используется spawnX() для отступа. */
  lastSpawnX: number | null;
}

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
    lastSpawnX: null,
  };
}

/**
 * X нового бонуса — не ближе BONUS_MIN_X_GAP_PX к X предыдущего спавна
 * (по кругу в обе стороны), чтобы бонусы не падали систематически «в одну
 * линию» (фидбек игрока). Для самого первого бонуса (lastSpawnX === null)
 * отступать не от чего — обычный равномерный бросок по всей ширине.
 */
function spawnX(lastSpawnX: number | null, worldWidth: number, random: () => number): number {
  const maxX = worldWidth - BONUS_WIDTH_PX;
  const gap = Math.min(BONUS_MIN_X_GAP_PX, maxX / 2 - 1);

  if (lastSpawnX === null || gap <= 0) {
    return random() * maxX;
  }

  // offset ∈ [gap, maxX - gap] гарантирует круговое расстояние >= gap в обе стороны.
  const offset = gap + random() * (maxX - 2 * gap);
  return (lastSpawnX + offset) % maxX;
}

function spawnBonus(state: BonusesState, worldWidth: number, random: () => number): void {
  const x = spawnX(state.lastSpawnX, worldWidth, random);
  const sign: BonusSign = random() < BONUS_POSITIVE_PROBABILITY ? 'positive' : 'negative';

  state.list.push({ sign, x, y: 0, width: BONUS_WIDTH_PX, height: BONUS_HEIGHT_PX });
  state.lastSpawnX = x;
}

/**
 * Мутирует `state` на месте по одному кадру ввода/времени.
 * Движение строго вертикально вниз — у `Bonus` структурно нет поля `vx`.
 *
 * Движение применяется к списку ДО спавна — только что появившийся на этом
 * кадре бонус стартует ровно с y = 0 (контракт bonuses.test.ts), а не сразу
 * смещается на BONUS_FALL_SPEED_PX_S * dt в тот же кадр.
 *
 * `groundY` — та же Y-координата, на которой стоит нижняя часть тела
 * лягушки (getFrogRect в frog.ts). Бонус удаляется, когда его НИЖНИЙ край
 * достигает этого уровня, а не когда он долетает до низа canvas (AC-9).
 */
export function updateBonuses(
  state: BonusesState,
  deltaTimeSeconds: number,
  worldWidth: number,
  groundY: number,
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
    if (state.list[i].y + state.list[i].height >= groundY) {
      state.list.splice(i, 1);
    }
  }
}
