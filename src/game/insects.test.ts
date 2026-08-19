import { describe, it, expect } from 'vitest';
import {
  createInsectsState,
  updateInsects,
  MOSQUITO_SCORE,
  DRAGONFLY_SCORE,
  INSECT_SPAWN_INTERVAL_MIN_S,
  INSECT_SPAWN_INTERVAL_MAX_S,
  CURVE_TOTAL_AMPLITUDE_PX,
  type Insect,
  type InsectsState,
} from './insects';
import { FROG_HEIGHT_PX, JUMP_HEIGHT_PX } from './frog';

const WORLD_WIDTH = 800;
const GROUND_Y = 600 - FROG_HEIGHT_PX;

/**
 * Конвенция порядка обращений к `random()` внутри одного спавна
 * ЗАФИКСИРОВАНА этими тестами буквально (см. комментарий в начале
 * insects.ts, который Green-реализация обязана повторить дословно):
 *
 *   1) бросок типа:   random() <  0.5 → 'mosquito', иначе 'dragonfly'
 *   2) бросок входа:  random() <  0.5 → 'left', иначе 'right' (входа
 *      'сверху' у насекомых больше нет — см. spec.md AC-1)
 *   3) бросок типа движения: random() < 0.5 → 'straight', иначе 'curve'
 *   4) бросок высоты появления НАД ЗЕМЛЁЙ (px) — формула зависит от типа
 *      движения (см. insects.ts, CURVE_TOTAL_AMPLITUDE_PX)
 *   5) (только 'curve') бросок фазы волны: random() * Math.PI * 2
 *   6) бросок сброса таймера спавна: MIN + random() * (MAX - MIN)
 *
 * Если Green-реализация выберет другую конвенцию, численные значения в
 * fakeRandom() ниже нужно будет пересчитать — сам факт "граничные значения →
 * детерминированный результат" при этом не меняется.
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

describe('спавн насекомых (AC-1, AC-18)', () => {
  it('низкое граничное значение random() даёт mosquito, вход left, движение straight', () => {
    const state = createInsectsState();
    state.spawnTimerSeconds = 0.001; // истекает на этом кадре

    // 0 → mosquito; 0 → left; 0 → straight; 0 → минимальная высота
    updateInsects(state, 0.016, WORLD_WIDTH, GROUND_Y, 1, fakeRandom([0, 0, 0, 0, 0]));

    expect(state.list.length).toBe(1);
    expect(state.list[0].type).toBe('mosquito');
    expect(state.list[0].movementType).toBe('straight');
    // left: движение вправо
    expect(state.list[0].vx).toBeGreaterThan(0);
  });

  it('высокое граничное значение random() даёт dragonfly, вход right, движение curve', () => {
    const state = createInsectsState();
    state.spawnTimerSeconds = 0.001;

    // ~1 → dragonfly; ~1 → right; ~1 → curve; ~1 → максимальная высота; ~1 → фаза; ~1 → таймер
    updateInsects(state, 0.016, WORLD_WIDTH, GROUND_Y, 1, fakeRandom([0.999999, 0.999999, 0.999999, 0.999999, 0.999999]));

    expect(state.list.length).toBe(1);
    expect(state.list[0].type).toBe('dragonfly');
    expect(state.list[0].movementType).toBe('curve');
    // right: движение влево (к меньшим x)
    expect(state.list[0].vx).toBeLessThan(0);
  });

  it('сбрасывает таймер спавна в диапазон [MIN, MAX) после спавна', () => {
    const state = createInsectsState();
    state.spawnTimerSeconds = 0.001;

    updateInsects(state, 0.016, WORLD_WIDTH, GROUND_Y, 1, fakeRandom([0, 0, 0, 0, 0]));
    expect(state.spawnTimerSeconds).toBeGreaterThanOrEqual(INSECT_SPAWN_INTERVAL_MIN_S);
    expect(state.spawnTimerSeconds).toBeLessThan(INSECT_SPAWN_INTERVAL_MAX_S);

    const state2 = createInsectsState();
    state2.spawnTimerSeconds = 0.001;
    updateInsects(state2, 0.016, WORLD_WIDTH, GROUND_Y, 1, fakeRandom([0.999999, 0.999999, 0.999999, 0.999999, 0.999999]));
    expect(state2.spawnTimerSeconds).toBeGreaterThanOrEqual(INSECT_SPAWN_INTERVAL_MIN_S);
    expect(state2.spawnTimerSeconds).toBeLessThan(INSECT_SPAWN_INTERVAL_MAX_S);
  });

  it('не спавнит, пока таймер спавна ещё не истёк', () => {
    const state = createInsectsState();
    state.spawnTimerSeconds = 10;

    updateInsects(state, 0.016, WORLD_WIDTH, GROUND_Y, 1, fakeRandom([0, 0, 0, 0, 0]));

    expect(state.list.length).toBe(0);
    expect(state.spawnTimerSeconds).toBeCloseTo(10 - 0.016, 5);
  });
});

describe('высота появления (AC-3) — всегда отсчитывается от НИЖНЕГО края насекомого', () => {
  it('straight: низкое значение random() для высоты — появление у земли, достижимо стоя, и НЕ ниже уровня земли', () => {
    const state = createInsectsState();
    state.spawnTimerSeconds = 0.001;

    // 0 → mosquito; 0 → left; 0 → straight; 0 → минимальная высота появления
    updateInsects(state, 0.016, WORLD_WIDTH, GROUND_Y, 1, fakeRandom([0, 0, 0, 0]));

    const insect = state.list[0];
    const bottomY = insect.y + insect.height;
    const heightAboveGround = GROUND_Y - bottomY;

    // Низ насекомого не ниже уровня земли — это и есть исправляемый баг.
    expect(bottomY).toBeLessThanOrEqual(GROUND_Y);
    expect(heightAboveGround).toBeGreaterThanOrEqual(0);
    expect(heightAboveGround).toBeLessThanOrEqual(FROG_HEIGHT_PX);
  });

  it('straight: высокое значение random() для высоты — появление достижимо только прыжком', () => {
    const state = createInsectsState();
    state.spawnTimerSeconds = 0.001;

    // 0 → mosquito; 0 → left; 0 → straight; ~1 → максимальная высота появления
    updateInsects(state, 0.016, WORLD_WIDTH, GROUND_Y, 1, fakeRandom([0, 0, 0, 0.999999]));

    const insect = state.list[0];
    const bottomY = insect.y + insect.height;
    const heightAboveGround = GROUND_Y - bottomY;

    expect(bottomY).toBeLessThanOrEqual(GROUND_Y);
    expect(heightAboveGround).toBeGreaterThan(FROG_HEIGHT_PX);
    expect(heightAboveGround).toBeLessThanOrEqual(JUMP_HEIGHT_PX + FROG_HEIGHT_PX);
  });

  it('curve: даже при минимальном броске высоты низ насекомого не опускается ниже уровня земли с учётом амплитуды волны', () => {
    const state = createInsectsState();
    state.spawnTimerSeconds = 0.001;

    // 0 → mosquito; 0 → left; ~1 → curve; 0 → минимальная высота (для curve — CURVE_TOTAL_AMPLITUDE_PX); 0 → фаза
    updateInsects(state, 0.016, WORLD_WIDTH, GROUND_Y, 1, fakeRandom([0, 0, 0.999999, 0, 0]));

    const insect = state.list[0];
    expect(insect.movementType).toBe('curve');

    // Пик волны вниз (худший случай) не должен утащить насекомое под землю.
    const worstCaseBottomY = insect.curveBaseY! + CURVE_TOTAL_AMPLITUDE_PX + insect.height;
    expect(worstCaseBottomY).toBeLessThanOrEqual(GROUND_Y + 1e-6);
  });
});

describe('движение без ускорения (AC-2)', () => {
  function makeStateWithInsect(insect: Insect): InsectsState {
    return { list: [insect], spawnTimerSeconds: 1000 };
  }

  it('vx насекомого не меняется кадр к кадру при постоянном speedMultiplier', () => {
    const insect: Insect = { type: 'mosquito', movementType: 'straight', x: 100, y: 100, width: 10, height: 10, vx: 50 };
    const state = makeStateWithInsect(insect);

    updateInsects(state, 1 / 60, WORLD_WIDTH, GROUND_Y, 1);
    const { vx: vxAfterFirst } = state.list[0];

    updateInsects(state, 1 / 60, WORLD_WIDTH, GROUND_Y, 1);
    const { vx: vxAfterSecond } = state.list[0];

    expect(vxAfterFirst).toBe(50);
    expect(vxAfterSecond).toBe(50);
  });

  it('straight-насекомое движется строго горизонтально (y не меняется)', () => {
    const insect: Insect = { type: 'mosquito', movementType: 'straight', x: 100, y: 100, width: 10, height: 10, vx: 50 };
    const state = makeStateWithInsect(insect);

    updateInsects(state, 1, WORLD_WIDTH, GROUND_Y, 1);

    expect(state.list[0].y).toBe(100);
    expect(state.list[0].x).toBeCloseTo(150, 5);
  });

  it('speedMultiplier масштабирует эффективное перемещение на этом же кадре, не изменяя базовый vx', () => {
    const insect: Insect = { type: 'mosquito', movementType: 'straight', x: 100, y: 100, width: 10, height: 10, vx: 50 };
    const state = makeStateWithInsect(insect);

    updateInsects(state, 1, WORLD_WIDTH, GROUND_Y, 2);

    // эффективное смещение x2 от базового vx
    expect(state.list[0].x).toBeCloseTo(200, 5);
    // базовая скорость насекомого при этом не "запечена" с учётом множителя
    expect(state.list[0].vx).toBe(50);
  });
});

describe('криволинейное движение (AC-18)', () => {
  function makeCurveInsect(overrides: Partial<Insect> = {}): Insect {
    return {
      type: 'dragonfly',
      movementType: 'curve',
      x: 0,
      y: 300,
      width: 10,
      height: 10,
      vx: 150,
      curveBaseY: 300,
      curvePhase: 0,
      ...overrides,
    };
  }

  it('x двигается как обычно (горизонтальная скорость постоянна)', () => {
    const insect = makeCurveInsect();
    const state: InsectsState = { list: [insect], spawnTimerSeconds: 1000 };

    updateInsects(state, 1, WORLD_WIDTH, GROUND_Y, 1);

    expect(state.list[0].x).toBeCloseTo(150, 5);
  });

  it('y колеблется вокруг curveBaseY, а не остаётся постоянным', () => {
    const insect = makeCurveInsect();
    const state: InsectsState = { list: [insect], spawnTimerSeconds: 1000 };

    const ys: number[] = [];
    for (let i = 0; i < 20; i++) {
      updateInsects(state, 0.05, WORLD_WIDTH, GROUND_Y, 1);
      ys.push(state.list[0].y);
    }

    const distinctValues = new Set(ys.map((y) => Math.round(y * 1000)));
    expect(distinctValues.size).toBeGreaterThan(1);
  });

  it('пики волны не всегда одинаковой высоты (не вырождается в одиночную синусоиду)', () => {
    // Широкий мир, чтобы насекомое не покинуло его за время наблюдения нескольких пиков волны.
    const WIDE_WORLD_WIDTH = 10000;
    const insect = makeCurveInsect({ curvePhase: 1.234 });
    const state: InsectsState = { list: [insect], spawnTimerSeconds: 1000 };

    const ys: number[] = [];
    for (let i = 0; i < 400; i++) {
      updateInsects(state, 0.02, WIDE_WORLD_WIDTH, GROUND_Y, 1);
      ys.push(state.list[0].y);
    }

    // Локальные максимумы (пики) траектории.
    const peaks: number[] = [];
    for (let i = 1; i < ys.length - 1; i++) {
      if (ys[i] > ys[i - 1] && ys[i] > ys[i + 1]) {
        peaks.push(ys[i]);
      }
    }

    expect(peaks.length).toBeGreaterThan(1);
    const uniquePeaks = new Set(peaks.map((p) => Math.round(p * 100)));
    expect(uniquePeaks.size).toBeGreaterThan(1);
  });
});

describe('удаление за боковым краем мира без штрафа (AC-4)', () => {
  it('left-насекомое (движется вправо) удаляется, когда x > worldWidth', () => {
    const leaving: Insect = { type: 'mosquito', movementType: 'straight', x: WORLD_WIDTH + 1, y: 100, width: 10, height: 10, vx: 50 };
    const staying: Insect = { type: 'mosquito', movementType: 'straight', x: 100, y: 100, width: 10, height: 10, vx: 50 };
    const state: InsectsState = { list: [leaving, staying], spawnTimerSeconds: 1000 };

    updateInsects(state, 0.001, WORLD_WIDTH, GROUND_Y, 1);

    expect(state.list).toHaveLength(1);
    expect(state.list[0]).toBe(staying);
  });

  it('right-насекомое (движется влево) удаляется, когда x + width < 0', () => {
    const leaving: Insect = { type: 'mosquito', movementType: 'straight', x: -11, y: 100, width: 10, height: 10, vx: -50 };
    const staying: Insect = { type: 'mosquito', movementType: 'straight', x: 100, y: 100, width: 10, height: 10, vx: -50 };
    const state: InsectsState = { list: [leaving, staying], spawnTimerSeconds: 1000 };

    updateInsects(state, 0.001, WORLD_WIDTH, GROUND_Y, 1);

    expect(state.list).toHaveLength(1);
    expect(state.list[0]).toBe(staying);
  });

  it('не удаляет насекомых, ещё находящихся в пределах мира', () => {
    const insideAll: Insect = { type: 'mosquito', movementType: 'straight', x: 400, y: 300, width: 10, height: 10, vx: 50 };
    const state: InsectsState = { list: [insideAll], spawnTimerSeconds: 1000 };

    updateInsects(state, 0.001, WORLD_WIDTH, GROUND_Y, 1);

    expect(state.list).toHaveLength(1);
  });
});

describe('очки за насекомых (AC-6)', () => {
  it('DRAGONFLY_SCORE строго больше MOSQUITO_SCORE', () => {
    expect(DRAGONFLY_SCORE).toBeGreaterThan(MOSQUITO_SCORE);
  });
});
