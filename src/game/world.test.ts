import { describe, it, expect } from 'vitest';
import {
  createWorldState,
  updateWorld,
  resolveInsectCollisions,
  resolveBonusCollisions,
  type WorldState,
} from './world';
import type { Rect } from './geometry';
import { MOSQUITO_SCORE, DRAGONFLY_SCORE, type Insect, type InsectsState } from './insects';
import { BONUS_FALL_SPEED_PX_S, type Bonus, type BonusesState } from './bonuses';
import { createEffectState, applyBonusEffect, insectSpeedMultiplier, BONUS_EFFECT_DURATION_S } from './effects';
import { FROG_SPEED_PX_S } from './frog';

const WORLD_WIDTH = 800;
const GROUND_Y = 500;

describe('createWorldState (AC-14, инфраструктура для AC-5/AC-6/AC-8)', () => {
  it('возвращает валидный WorldState с пустыми списками, отсутствующим эффектом и нулевым счётом', () => {
    const state = createWorldState(WORLD_WIDTH);

    expect(state.insects.list).toEqual([]);
    expect(state.bonuses.list).toEqual([]);
    expect(state.effect.sign).toBeNull();
    expect(state.score).toBe(0);
    // frog — валидный FrogState из createFrogState (001-frog-movement), не в воздухе, не приседает
    expect(state.frog.isAirborne).toBe(false);
    expect(state.frog.isCrouching).toBe(false);
  });
});

describe('resolveInsectCollisions (AC-5, AC-6) — экспортирована отдельно от updateWorld', () => {
  it('удаляет пересекающихся насекомых из list и возвращает сумму очков по типу, не трогая непересекающихся', () => {
    const frogRect: Rect = { x: 0, y: 0, width: 50, height: 50 };
    const eatenMosquito: Insect = { type: 'mosquito', movementType: 'straight', x: 10, y: 10, width: 10, height: 10, vx: 0 };
    const eatenDragonfly: Insect = { type: 'dragonfly', movementType: 'straight', x: 20, y: 20, width: 10, height: 10, vx: 0 };
    const untouched: Insect = { type: 'mosquito', movementType: 'straight', x: 500, y: 500, width: 10, height: 10, vx: 0 };
    const insects: InsectsState = { list: [eatenMosquito, eatenDragonfly, untouched], spawnTimerSeconds: 1000 };

    const points = resolveInsectCollisions(frogRect, insects);

    expect(points).toBe(MOSQUITO_SCORE + DRAGONFLY_SCORE);
    expect(insects.list).toEqual([untouched]);
  });

  it('не удаляет ничего и возвращает 0, если ни одно насекомое не пересекается', () => {
    const frogRect: Rect = { x: 0, y: 0, width: 10, height: 10 };
    const farAway: Insect = { type: 'dragonfly', movementType: 'straight', x: 500, y: 500, width: 10, height: 10, vx: 0 };
    const insects: InsectsState = { list: [farAway], spawnTimerSeconds: 1000 };

    const points = resolveInsectCollisions(frogRect, insects);

    expect(points).toBe(0);
    expect(insects.list).toEqual([farAway]);
  });
});

describe('resolveBonusCollisions (AC-8, AC-14) — экспортирована отдельно от updateWorld', () => {
  it('удаляет пойманный бонус и применяет его эффект через applyBonusEffect', () => {
    const frogRect: Rect = { x: 0, y: 0, width: 50, height: 50 };
    const caught: Bonus = { sign: 'negative', x: 10, y: 10, width: 10, height: 10 };
    const untouched: Bonus = { sign: 'positive', x: 500, y: 500, width: 10, height: 10 };
    const bonuses: BonusesState = { list: [caught, untouched], spawnTimerSeconds: 1000, lastSpawnX: null };
    const effect = createEffectState();

    resolveBonusCollisions(frogRect, bonuses, effect);

    expect(bonuses.list).toEqual([untouched]);
    expect(effect.sign).toBe('negative');
    expect(effect.remainingSeconds).toBe(BONUS_EFFECT_DURATION_S);
  });

  it('не трогает эффект и список, если ни один бонус не пересекается', () => {
    const frogRect: Rect = { x: 0, y: 0, width: 10, height: 10 };
    const farAway: Bonus = { sign: 'positive', x: 500, y: 500, width: 10, height: 10 };
    const bonuses: BonusesState = { list: [farAway], spawnTimerSeconds: 1000, lastSpawnX: null };
    const effect = createEffectState();

    resolveBonusCollisions(frogRect, bonuses, effect);

    expect(bonuses.list).toEqual([farAway]);
    expect(effect.sign).toBeNull();
  });
});

describe('updateWorld — порядок 8 шагов (plan.md §game/world.ts)', () => {
  it('AC-15: state.frog обновляется через updateFrog без изменения его поведения', () => {
    const state = createWorldState(WORLD_WIDTH);
    const startX = state.frog.x;

    updateWorld(
      state,
      { moveLeft: false, moveRight: true, crouch: false, jumpRequested: false },
      1,
      WORLD_WIDTH,
      GROUND_Y,
      () => 0.5,
    );

    expect(state.frog.x - startX).toBeCloseTo(FROG_SPEED_PX_S, 5);
  });

  it('AC-10/AC-11: бонус, пойманный на кадре N, мгновенно влияет на движение уже летящих насекомых на этом же кадре N', () => {
    const state: WorldState = createWorldState(WORLD_WIDTH);
    const dt = 0.1;

    // Лягушка стоит на месте: x = 100, groundY = 500, FROG_HEIGHT_PX = 32 → rect y = 468..500.
    state.frog.x = 100;

    // Бонус расположен так, чтобы после шага 2 (updateBonuses, падение на BONUS_FALL_SPEED_PX_S * dt)
    // оказаться внутри прямоугольника лягушки (x: 100..132, y: 468..500) — будет поймано на этом кадре.
    const bonus: Bonus = {
      sign: 'positive',
      x: 110,
      y: 480 - BONUS_FALL_SPEED_PX_S * dt,
      width: 10,
      height: 10,
    };
    state.bonuses.list = [bonus];
    state.bonuses.spawnTimerSeconds = 1000; // не спавнить новый бонус на этом кадре

    // Насекомое уже летит, но НЕ пересекается с лягушкой на этом кадре (проверяем только скорость).
    const insect: Insect = { type: 'mosquito', movementType: 'straight', x: 400, y: 400, width: 10, height: 10, vx: 100 };
    state.insects.list = [insect];
    state.insects.spawnTimerSeconds = 1000; // не спавнить новое насекомое на этом кадре

    updateWorld(
      state,
      { moveLeft: false, moveRight: false, crouch: false, jumpRequested: false },
      dt,
      WORLD_WIDTH,
      GROUND_Y,
      () => 0.5,
    );

    // Бонус пойман и удалён, эффект применён немедленно.
    expect(state.bonuses.list).toHaveLength(0);
    expect(state.effect.sign).toBe('positive');

    // Ожидаемый множитель вычисляется независимо через effects.ts (уже протестирован в effects.test.ts) —
    // здесь проверяется только то, что updateWorld применил его к движению насекомого В ЭТОМ ЖЕ кадре.
    const expectedEffect = createEffectState();
    applyBonusEffect(expectedEffect, 'positive');
    const expectedMultiplier = insectSpeedMultiplier(expectedEffect);

    expect(state.insects.list).toHaveLength(1);
    expect(state.insects.list[0].x).toBeCloseTo(400 + 100 * expectedMultiplier * dt, 5);
    // базовая скорость насекомого не "запечена" с учётом множителя
    expect(state.insects.list[0].vx).toBe(100);

    // Проглоченный бонус не даёт очков (AC-14) — насекомое не поймано в этом сценарии, score остаётся 0.
    expect(state.score).toBe(0);
  });

  it('AC-6/AC-14: счёт увеличивается только за счёт съеденных насекомых, не за счёт бонусов', () => {
    const state: WorldState = createWorldState(WORLD_WIDTH);
    const dt = 0.001; // минимальное движение за кадр, чтобы облегчить позиционирование

    state.frog.x = 100; // rect: x 100..132, y 468..500 (groundY=500, FROG_HEIGHT_PX=32)

    const eatenInsect: Insect = { type: 'mosquito', movementType: 'straight', x: 110, y: 480, width: 10, height: 10, vx: 0 };
    state.insects.list = [eatenInsect];
    state.insects.spawnTimerSeconds = 1000;
    state.bonuses.list = [];
    state.bonuses.spawnTimerSeconds = 1000;

    updateWorld(
      state,
      { moveLeft: false, moveRight: false, crouch: false, jumpRequested: false },
      dt,
      WORLD_WIDTH,
      GROUND_Y,
      () => 0.5,
    );

    expect(state.score).toBe(MOSQUITO_SCORE);
    expect(state.insects.list).toHaveLength(0);
  });

  it('AC-12: tickEffect уменьшает remainingSeconds в конце кадра (шаг 8, после движения насекомых)', () => {
    const state: WorldState = createWorldState(WORLD_WIDTH);
    applyBonusEffect(state.effect, 'negative');
    const dt = 0.5;

    state.bonuses.list = [];
    state.bonuses.spawnTimerSeconds = 1000;
    state.insects.list = [];
    state.insects.spawnTimerSeconds = 1000;

    updateWorld(
      state,
      { moveLeft: false, moveRight: false, crouch: false, jumpRequested: false },
      dt,
      WORLD_WIDTH,
      GROUND_Y,
      () => 0.5,
    );

    expect(state.effect.sign).toBe('negative');
    expect(state.effect.remainingSeconds).toBeCloseTo(BONUS_EFFECT_DURATION_S - dt, 5);
  });
});
