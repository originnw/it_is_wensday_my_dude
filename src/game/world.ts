/**
 * Чистая игровая логика верхнего уровня: связывает лягушку, насекомых,
 * бонусы и активный эффект в единый кадр обновления.
 *
 * Никакого DOM/Canvas API — только примитивы и объект состояния (принцип IV
 * конституции). `updateWorld` мутирует переданный `state` на месте и не
 * аллоцирует новых массивов внутри кадра (принцип III) — удаление пойманных
 * насекомых/бонусов сделано обратным проходом с `splice()` по индексу.
 *
 * T012: реализует T006 (`world.test.ts`). Порядок 8 шагов внутри
 * `updateWorld` зафиксирован буквально в plan.md §«game/world.ts» и
 * воспроизведён здесь дословно — см. комментарий к функции.
 */

import { createFrogState, getFrogRect, updateFrog, type FrogInput, type FrogState } from './frog';
import { createInsectsState, updateInsects, MOSQUITO_SCORE, DRAGONFLY_SCORE, type InsectsState } from './insects';
import { createBonusesState, updateBonuses, type BonusesState } from './bonuses';
import { createEffectState, applyBonusEffect, tickEffect, insectSpeedMultiplier, type BonusEffectState } from './effects';
import { rectsIntersect, type Rect } from './geometry';

export interface WorldState {
  frog: FrogState;
  insects: InsectsState;
  bonuses: BonusesState;
  effect: BonusEffectState;
  score: number;
}

export function createWorldState(worldWidth: number): WorldState {
  return {
    frog: createFrogState(worldWidth),
    insects: createInsectsState(),
    bonuses: createBonusesState(),
    effect: createEffectState(),
    score: 0,
  };
}

/**
 * Удаляет насекомых, пересекающихся с `frogRect`, из `insects.list` и
 * возвращает суммарные очки за все пойманные на этом кадре (AC-5, AC-6).
 * Проходит по всему списку — не останавливается на первом пересечении,
 * чтобы обработать несколько одновременных попаданий за кадр.
 */
export function resolveInsectCollisions(frogRect: Rect, insects: InsectsState): number {
  let points = 0;

  for (let i = insects.list.length - 1; i >= 0; i--) {
    const insect = insects.list[i];
    if (rectsIntersect(frogRect, insect)) {
      points += insect.type === 'mosquito' ? MOSQUITO_SCORE : DRAGONFLY_SCORE;
      insects.list.splice(i, 1);
    }
  }

  return points;
}

/**
 * Удаляет бонусы, пересекающиеся с `frogRect`, из `bonuses.list` и
 * применяет их эффект через `applyBonusEffect` (AC-8, AC-14). Проходит по
 * всему списку — не останавливается на первом пересечении.
 */
export function resolveBonusCollisions(frogRect: Rect, bonuses: BonusesState, effect: BonusEffectState): void {
  for (let i = bonuses.list.length - 1; i >= 0; i--) {
    const bonus = bonuses.list[i];
    if (rectsIntersect(frogRect, bonus)) {
      applyBonusEffect(effect, bonus.sign);
      bonuses.list.splice(i, 1);
    }
  }
}

/**
 * Мутирует `state` на месте по одному кадру ввода/времени. Порядок шагов
 * КРИТИЧЕН (plan.md §«game/world.ts»):
 *   1. updateFrog — без изменений (AC-15)
 *   2. updateBonuses — бонусы двигаются до проверки столкновений
 *   3. frogRect = getFrogRect(...) — вычисляется один раз, переиспользуется
 *      на шагах 4 и 6
 *   4. resolveBonusCollisions — проглоченные бонусы удаляются, эффект
 *      применяется немедленно
 *   5. multiplier = insectSpeedMultiplier(...) — читается ПОСЛЕ шага 4, чтобы
 *      бонус, пойманный на этом кадре, сразу влиял на движение насекомых
 *      (AC-10, AC-11)
 *   6. updateInsects — с учётом multiplier
 *   7. score += resolveInsectCollisions
 *   8. tickEffect — в конце кадра
 *
 * `worldHeight` больше не принимается: после правки AC-9/AC-1 (spec.md,
 * «Сессия уточнений — 2026-08-19») ни бонусы (удаление по groundY), ни
 * насекомые (удаление только по worldWidth, входа сверху больше нет) не
 * используют вертикальный размер мира.
 */
export function updateWorld(
  state: WorldState,
  input: FrogInput,
  deltaTimeSeconds: number,
  worldWidth: number,
  groundY: number,
  random: () => number = Math.random,
): void {
  updateFrog(state.frog, input, deltaTimeSeconds, worldWidth);

  updateBonuses(state.bonuses, deltaTimeSeconds, worldWidth, groundY, random);

  const frogRect = getFrogRect(state.frog, groundY);

  resolveBonusCollisions(frogRect, state.bonuses, state.effect);

  const multiplier = insectSpeedMultiplier(state.effect);

  updateInsects(state.insects, deltaTimeSeconds, worldWidth, groundY, multiplier, random);

  state.score += resolveInsectCollisions(frogRect, state.insects);

  tickEffect(state.effect, deltaTimeSeconds);
}
