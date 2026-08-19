import { describe, it, expect } from 'vitest';
import {
  createBonusesState,
  updateBonuses,
  BONUS_WIDTH_PX,
  BONUS_FALL_SPEED_PX_S,
  type Bonus,
  type BonusesState,
} from './bonuses';

const WORLD_WIDTH = 800;
const WORLD_HEIGHT = 600;

/**
 * T004 — нетривиальное решение (НЕ зафиксировано дословно в plan.md), по
 * аналогии с insects.test.ts: фиксируем конвенцию порядка обращений к
 * random() внутри одного спавна бонуса, которую должна повторить
 * Green-реализация bonuses.ts (T010):
 *
 *   1) бросок x:    x = random() * (worldWidth - BONUS_WIDTH_PX)
 *   2) бросок знака: random() < 0.5 → 'positive', иначе 'negative'
 *   3) (опционально) бросок сброса таймера спавна — тесты ниже не проверяют
 *      конкретное значение таймера после спавна (только сам факт > 0 у
 *      createBonusesState()), поэтому лишние вызовы random() в fakeRandom()
 *      просто повторяют последнее значение последовательности.
 */
function fakeRandom(sequence: number[]): () => number {
  let i = 0;
  return () => sequence[Math.min(i++, sequence.length - 1)];
}

describe('createBonusesState (AC-7)', () => {
  it('начинает с пустым списком и положительным таймером спавна', () => {
    const state = createBonusesState();

    expect(state.list).toEqual([]);
    expect(state.spawnTimerSeconds).toBeGreaterThan(0);
  });
});

describe('спавн бонусов (AC-7)', () => {
  it('низкое граничное значение random() для x даёт x = 0, y = 0', () => {
    const state = createBonusesState();
    state.spawnTimerSeconds = 0.001;

    updateBonuses(state, 0.016, WORLD_WIDTH, WORLD_HEIGHT, fakeRandom([0, 0]));

    expect(state.list).toHaveLength(1);
    expect(state.list[0].x).toBeCloseTo(0, 5);
    expect(state.list[0].y).toBe(0);
  });

  it('высокое граничное значение random() для x приближает x к worldWidth - BONUS_WIDTH_PX', () => {
    const state = createBonusesState();
    state.spawnTimerSeconds = 0.001;

    updateBonuses(state, 0.016, WORLD_WIDTH, WORLD_HEIGHT, fakeRandom([0.999999, 0]));

    expect(state.list).toHaveLength(1);
    expect(state.list[0].x).toBeLessThanOrEqual(WORLD_WIDTH - BONUS_WIDTH_PX);
    expect(state.list[0].x).toBeGreaterThan((WORLD_WIDTH - BONUS_WIDTH_PX) * 0.9);
    expect(state.list[0].y).toBe(0);
  });

  it('x всегда остаётся в пределах [0, worldWidth - BONUS_WIDTH_PX]', () => {
    for (const roll of [0, 0.25, 0.5, 0.75, 0.999999]) {
      const state = createBonusesState();
      state.spawnTimerSeconds = 0.001;

      updateBonuses(state, 0.016, WORLD_WIDTH, WORLD_HEIGHT, fakeRandom([roll, 0]));

      expect(state.list[0].x).toBeGreaterThanOrEqual(0);
      expect(state.list[0].x).toBeLessThanOrEqual(WORLD_WIDTH - BONUS_WIDTH_PX);
    }
  });

  it('низкое граничное значение random() для знака даёт positive', () => {
    const state = createBonusesState();
    state.spawnTimerSeconds = 0.001;

    updateBonuses(state, 0.016, WORLD_WIDTH, WORLD_HEIGHT, fakeRandom([0, 0]));

    expect(state.list[0].sign).toBe('positive');
  });

  it('высокое граничное значение random() для знака даёт negative', () => {
    const state = createBonusesState();
    state.spawnTimerSeconds = 0.001;

    updateBonuses(state, 0.016, WORLD_WIDTH, WORLD_HEIGHT, fakeRandom([0, 0.999999]));

    expect(state.list[0].sign).toBe('negative');
  });

  it('не спавнит, пока таймер спавна ещё не истёк', () => {
    const state = createBonusesState();
    state.spawnTimerSeconds = 10;

    updateBonuses(state, 0.016, WORLD_WIDTH, WORLD_HEIGHT, fakeRandom([0, 0]));

    expect(state.list).toHaveLength(0);
    expect(state.spawnTimerSeconds).toBeCloseTo(10 - 0.016, 5);
  });
});

describe('движение строго вертикально вниз (AC-7)', () => {
  function makeStateWithBonus(bonus: Bonus): BonusesState {
    return { list: [bonus], spawnTimerSeconds: 1000 };
  }

  it('у Bonus структурно нет поля vx — горизонтальная составляющая невозможна', () => {
    const bonus: Bonus = { sign: 'positive', x: 100, y: 0, width: 10, height: 10 };

    // структурная проверка, а не проверка значения "vx === 0"
    expect('vx' in bonus).toBe(false);
  });

  it('x не меняется, y растёт с постоянной скоростью BONUS_FALL_SPEED_PX_S', () => {
    const bonus: Bonus = { sign: 'positive', x: 100, y: 0, width: 10, height: 10 };
    const state = makeStateWithBonus(bonus);

    updateBonuses(state, 1, WORLD_WIDTH, WORLD_HEIGHT);

    expect(state.list[0].x).toBe(100);
    expect(state.list[0].y).toBeCloseTo(BONUS_FALL_SPEED_PX_S, 5);
  });

  it('скорость падения не меняется кадр к кадру (равные приращения за равные dt)', () => {
    const bonus: Bonus = { sign: 'negative', x: 50, y: 0, width: 10, height: 10 };
    const state = makeStateWithBonus(bonus);

    updateBonuses(state, 1, WORLD_WIDTH, WORLD_HEIGHT);
    const yAfterFirst = state.list[0].y;

    updateBonuses(state, 1, WORLD_WIDTH, WORLD_HEIGHT);
    const yAfterSecond = state.list[0].y;

    expect(yAfterFirst).toBeCloseTo(BONUS_FALL_SPEED_PX_S, 5);
    expect(yAfterSecond - yAfterFirst).toBeCloseTo(BONUS_FALL_SPEED_PX_S, 5);
  });
});

describe('удаление за нижним краем без эффекта (AC-9)', () => {
  it('бонус удаляется без применения эффекта, когда y > worldHeight', () => {
    const leaving: Bonus = { sign: 'positive', x: 100, y: WORLD_HEIGHT + 1, width: 10, height: 10 };
    const staying: Bonus = { sign: 'negative', x: 200, y: 100, width: 10, height: 10 };
    const state: BonusesState = { list: [leaving, staying], spawnTimerSeconds: 1000 };

    updateBonuses(state, 0.001, WORLD_WIDTH, WORLD_HEIGHT);

    expect(state.list).toHaveLength(1);
    expect(state.list[0]).toBe(staying);
  });

  it('updateBonuses не возвращает признак пойманного бонуса (void)', () => {
    const bonus: Bonus = { sign: 'positive', x: 100, y: WORLD_HEIGHT + 1, width: 10, height: 10 };
    const state: BonusesState = { list: [bonus], spawnTimerSeconds: 1000 };

    const result = updateBonuses(state, 0.001, WORLD_WIDTH, WORLD_HEIGHT);

    expect(result).toBeUndefined();
  });

  it('не удаляет бонусы, ещё находящиеся в пределах мира', () => {
    const insideWorld: Bonus = { sign: 'positive', x: 100, y: 300, width: 10, height: 10 };
    const state: BonusesState = { list: [insideWorld], spawnTimerSeconds: 1000 };

    updateBonuses(state, 0.001, WORLD_WIDTH, WORLD_HEIGHT);

    expect(state.list).toHaveLength(1);
  });
});
