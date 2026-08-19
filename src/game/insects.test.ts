import { describe, it, expect } from 'vitest';
import {
  createInsectsState,
  updateInsects,
  MOSQUITO_SCORE,
  DRAGONFLY_SCORE,
  INSECT_SPAWN_INTERVAL_MIN_S,
  INSECT_SPAWN_INTERVAL_MAX_S,
  type Insect,
  type InsectsState,
} from './insects';
import { FROG_HEIGHT_PX, JUMP_HEIGHT_PX } from './frog';

const WORLD_WIDTH = 800;
const WORLD_HEIGHT = 600;
const GROUND_Y = WORLD_HEIGHT - FROG_HEIGHT_PX;

/**
 * T003 — нетривиальное решение (НЕ зафиксировано дословно в plan.md): чтобы
 * протестировать "детерминированный тип/точка входа по граничным значениям
 * random()", тесты фиксируют конкретную конвенцию порядка обращений к
 * random() внутри одного спавна, которую должна повторить Green-реализация
 * insects.ts (T009):
 *
 *   1) бросок типа:  random() <  0.5           → 'mosquito', иначе 'dragonfly'
 *   2) бросок входа:  random() <  1/3           → 'top'
 *                      random() <  2/3           → 'left'
 *                      иначе                      → 'right'
 *   3) бросок высоты появления НАД ЗЕМЛЁЙ (px) — потребляется ТОЛЬКО когда
 *      вход 'left'/'right' (для 'top' по plan.md высота не рандомизируется
 *      отдельно, насекомое стартует от y = 0):
 *        heightAboveGroundPx = random() * (JUMP_HEIGHT_PX + FROG_HEIGHT_PX)
 *        insect.y = groundY - heightAboveGroundPx
 *   4) бросок сброса таймера спавна:
 *        spawnTimerSeconds = MIN + random() * (MAX - MIN)
 *
 * Если Green-реализация выберет другую конвенцию (другие пороги/порядок),
 * численные значения в fakeRandom() ниже нужно будет пересчитать — сам факт
 * "граничные значения → детерминированный результат" при этом не меняется.
 */
function fakeRandom(sequence: number[]): () => number {
  let i = 0;
  return () => sequence[Math.min(i++, sequence.length - 1)];
}

describe('createInsectsState (AC-1)', () => {
  it('начинает с пустым списком и положительным таймером спавна', () => {
    const state = createInsectsState();

    expect(state.list).toEqual([]);
    expect(state.spawnTimerSeconds).toBeGreaterThan(0);
  });
});

describe('спавн насекомых (AC-1, AC-3)', () => {
  it('низкое граничное значение random() даёт mosquito, вход top', () => {
    const state = createInsectsState();
    state.spawnTimerSeconds = 0.001; // истекает на этом кадре

    updateInsects(state, 0.016, WORLD_WIDTH, WORLD_HEIGHT, GROUND_Y, 1, fakeRandom([0, 0, 0]));

    expect(state.list.length).toBe(1);
    expect(state.list[0].type).toBe('mosquito');
    // top: строго вертикальное движение вниз
    expect(state.list[0].vx).toBe(0);
    expect(state.list[0].vy).toBeGreaterThan(0);
  });

  it('высокое граничное значение random() даёт dragonfly, вход right', () => {
    const state = createInsectsState();
    state.spawnTimerSeconds = 0.001;

    updateInsects(state, 0.016, WORLD_WIDTH, WORLD_HEIGHT, GROUND_Y, 1, fakeRandom([0.999999, 0.999999, 0.999999]));

    expect(state.list.length).toBe(1);
    expect(state.list[0].type).toBe('dragonfly');
    // right: строго горизонтальное движение (влево, к меньшим x)
    expect(state.list[0].vy).toBe(0);
    expect(state.list[0].vx).toBeLessThan(0);
  });

  it('среднее значение random() для броска входа даёт left — строго горизонтальное движение вправо', () => {
    const state = createInsectsState();
    state.spawnTimerSeconds = 0.001;

    // 0 → mosquito; 0.5 → left (в средней трети [1/3, 2/3)); 0 → высота появления
    updateInsects(state, 0.016, WORLD_WIDTH, WORLD_HEIGHT, GROUND_Y, 1, fakeRandom([0, 0.5, 0]));

    expect(state.list.length).toBe(1);
    expect(state.list[0].vy).toBe(0);
    expect(state.list[0].vx).toBeGreaterThan(0);
  });

  it('сбрасывает таймер спавна в диапазон [MIN, MAX) после спавна', () => {
    const state = createInsectsState();
    state.spawnTimerSeconds = 0.001;

    updateInsects(state, 0.016, WORLD_WIDTH, WORLD_HEIGHT, GROUND_Y, 1, fakeRandom([0, 0, 0, 0]));
    expect(state.spawnTimerSeconds).toBeGreaterThanOrEqual(INSECT_SPAWN_INTERVAL_MIN_S);
    expect(state.spawnTimerSeconds).toBeLessThan(INSECT_SPAWN_INTERVAL_MAX_S);

    const state2 = createInsectsState();
    state2.spawnTimerSeconds = 0.001;
    updateInsects(state2, 0.016, WORLD_WIDTH, WORLD_HEIGHT, GROUND_Y, 1, fakeRandom([0.999999, 0.999999, 0.999999, 0.999999]));
    expect(state2.spawnTimerSeconds).toBeGreaterThanOrEqual(INSECT_SPAWN_INTERVAL_MIN_S);
    expect(state2.spawnTimerSeconds).toBeLessThan(INSECT_SPAWN_INTERVAL_MAX_S);
  });

  it('не спавнит, пока таймер спавна ещё не истёк', () => {
    const state = createInsectsState();
    state.spawnTimerSeconds = 10;

    updateInsects(state, 0.016, WORLD_WIDTH, WORLD_HEIGHT, GROUND_Y, 1, fakeRandom([0, 0, 0]));

    expect(state.list.length).toBe(0);
    expect(state.spawnTimerSeconds).toBeCloseTo(10 - 0.016, 5);
  });
});

describe('высота появления left/right (AC-3)', () => {
  it('низкое значение random() для высоты — появление у земли, достижимо стоя (heightAboveGround <= FROG_HEIGHT_PX)', () => {
    const state = createInsectsState();
    state.spawnTimerSeconds = 0.001;

    // 0.5 → left; 0 → минимальная высота появления
    updateInsects(state, 0.016, WORLD_WIDTH, WORLD_HEIGHT, GROUND_Y, 1, fakeRandom([0, 0.5, 0]));

    const insect = state.list[0];
    const heightAboveGround = GROUND_Y - insect.y;

    expect(heightAboveGround).toBeGreaterThanOrEqual(0);
    expect(heightAboveGround).toBeLessThanOrEqual(FROG_HEIGHT_PX);
  });

  it('высокое значение random() для высоты — появление достижимо только прыжком (heightAboveGround > FROG_HEIGHT_PX)', () => {
    const state = createInsectsState();
    state.spawnTimerSeconds = 0.001;

    // 0.5 → left; ~1 → максимальная высота появления
    updateInsects(state, 0.016, WORLD_WIDTH, WORLD_HEIGHT, GROUND_Y, 1, fakeRandom([0, 0.5, 0.999999]));

    const insect = state.list[0];
    const heightAboveGround = GROUND_Y - insect.y;

    expect(heightAboveGround).toBeGreaterThan(FROG_HEIGHT_PX);
    expect(heightAboveGround).toBeLessThanOrEqual(JUMP_HEIGHT_PX + FROG_HEIGHT_PX);
  });
});

describe('движение без ускорения (AC-2)', () => {
  function makeStateWithInsect(insect: Insect): InsectsState {
    return { list: [insect], spawnTimerSeconds: 1000 };
  }

  it('vx/vy насекомого не меняются кадр к кадру при постоянном speedMultiplier', () => {
    const insect: Insect = { type: 'mosquito', x: 100, y: 100, width: 10, height: 10, vx: 50, vy: 0 };
    const state = makeStateWithInsect(insect);

    updateInsects(state, 1 / 60, WORLD_WIDTH, WORLD_HEIGHT, GROUND_Y, 1);
    const { vx: vxAfterFirst, vy: vyAfterFirst } = state.list[0];

    updateInsects(state, 1 / 60, WORLD_WIDTH, WORLD_HEIGHT, GROUND_Y, 1);
    const { vx: vxAfterSecond, vy: vyAfterSecond } = state.list[0];

    expect(vxAfterFirst).toBe(50);
    expect(vyAfterFirst).toBe(0);
    expect(vxAfterSecond).toBe(50);
    expect(vyAfterSecond).toBe(0);
  });

  it('left/right насекомые движутся строго горизонтально (vy === 0)', () => {
    const insect: Insect = { type: 'mosquito', x: 100, y: 100, width: 10, height: 10, vx: 50, vy: 0 };
    const state = makeStateWithInsect(insect);

    updateInsects(state, 1, WORLD_WIDTH, WORLD_HEIGHT, GROUND_Y, 1);

    expect(state.list[0].y).toBe(100);
    expect(state.list[0].x).toBeCloseTo(150, 5);
  });

  it('top насекомое движется строго вертикально (vx === 0)', () => {
    const insect: Insect = { type: 'dragonfly', x: 200, y: 0, width: 10, height: 10, vx: 0, vy: 80 };
    const state = makeStateWithInsect(insect);

    updateInsects(state, 1, WORLD_WIDTH, WORLD_HEIGHT, GROUND_Y, 1);

    expect(state.list[0].x).toBe(200);
    expect(state.list[0].y).toBeCloseTo(80, 5);
  });

  it('speedMultiplier масштабирует эффективное перемещение на этом же кадре, не изменяя базовые vx/vy', () => {
    const insect: Insect = { type: 'mosquito', x: 100, y: 100, width: 10, height: 10, vx: 50, vy: 0 };
    const state = makeStateWithInsect(insect);

    updateInsects(state, 1, WORLD_WIDTH, WORLD_HEIGHT, GROUND_Y, 2);

    // эффективное смещение x2 от базового vx
    expect(state.list[0].x).toBeCloseTo(200, 5);
    // базовая скорость насекомого при этом не "запечена" с учётом множителя
    expect(state.list[0].vx).toBe(50);
  });
});

describe('удаление за краем мира без штрафа (AC-4)', () => {
  it('left-насекомое (движется вправо) удаляется, когда x > worldWidth', () => {
    const leaving: Insect = { type: 'mosquito', x: WORLD_WIDTH + 1, y: 100, width: 10, height: 10, vx: 50, vy: 0 };
    const staying: Insect = { type: 'mosquito', x: 100, y: 100, width: 10, height: 10, vx: 50, vy: 0 };
    const state: InsectsState = { list: [leaving, staying], spawnTimerSeconds: 1000 };

    updateInsects(state, 0.001, WORLD_WIDTH, WORLD_HEIGHT, GROUND_Y, 1);

    expect(state.list).toHaveLength(1);
    expect(state.list[0]).toBe(staying);
  });

  it('right-насекомое (движется влево) удаляется, когда x + width < 0', () => {
    const leaving: Insect = { type: 'mosquito', x: -11, y: 100, width: 10, height: 10, vx: -50, vy: 0 };
    const staying: Insect = { type: 'mosquito', x: 100, y: 100, width: 10, height: 10, vx: -50, vy: 0 };
    const state: InsectsState = { list: [leaving, staying], spawnTimerSeconds: 1000 };

    updateInsects(state, 0.001, WORLD_WIDTH, WORLD_HEIGHT, GROUND_Y, 1);

    expect(state.list).toHaveLength(1);
    expect(state.list[0]).toBe(staying);
  });

  it('top-насекомое (движется вниз) удаляется, когда y > worldHeight', () => {
    const leaving: Insect = { type: 'dragonfly', x: 100, y: WORLD_HEIGHT + 1, width: 10, height: 10, vx: 0, vy: 80 };
    const staying: Insect = { type: 'dragonfly', x: 100, y: 100, width: 10, height: 10, vx: 0, vy: 80 };
    const state: InsectsState = { list: [leaving, staying], spawnTimerSeconds: 1000 };

    updateInsects(state, 0.001, WORLD_WIDTH, WORLD_HEIGHT, GROUND_Y, 1);

    expect(state.list).toHaveLength(1);
    expect(state.list[0]).toBe(staying);
  });

  it('не удаляет насекомых, ещё находящихся в пределах мира', () => {
    const insideAll: Insect = { type: 'mosquito', x: 400, y: 300, width: 10, height: 10, vx: 50, vy: 0 };
    const state: InsectsState = { list: [insideAll], spawnTimerSeconds: 1000 };

    updateInsects(state, 0.001, WORLD_WIDTH, WORLD_HEIGHT, GROUND_Y, 1);

    expect(state.list).toHaveLength(1);
  });
});

describe('очки за насекомых (AC-6)', () => {
  it('DRAGONFLY_SCORE строго больше MOSQUITO_SCORE', () => {
    expect(DRAGONFLY_SCORE).toBeGreaterThan(MOSQUITO_SCORE);
  });
});
