import { describe, it, expect } from 'vitest';
import {
  createEffectState,
  applyBonusEffect,
  tickEffect,
  insectSpeedMultiplier,
  BONUS_EFFECT_DURATION_S,
} from './effects';

describe('createEffectState (AC-12)', () => {
  it('начинает без активного эффекта — sign: null, remainingSeconds: 0', () => {
    const state = createEffectState();

    expect(state.sign).toBeNull();
    expect(state.remainingSeconds).toBe(0);
  });
});

describe('applyBonusEffect — три сценария AC-13, проверяются по отдельности', () => {
  it('нет активного эффекта → устанавливается впервые с полной длительностью', () => {
    const state = createEffectState();

    applyBonusEffect(state, 'positive');

    expect(state.sign).toBe('positive');
    expect(state.remainingSeconds).toBe(BONUS_EFFECT_DURATION_S);
  });

  it('тот же знак поверх уже активного эффекта → remainingSeconds сбрасывается на полную длительность, sign не меняется', () => {
    const state = createEffectState();
    applyBonusEffect(state, 'positive');
    tickEffect(state, BONUS_EFFECT_DURATION_S * 0.7); // эффект частично истёк, но ещё активен

    applyBonusEffect(state, 'positive');

    expect(state.sign).toBe('positive');
    expect(state.remainingSeconds).toBe(BONUS_EFFECT_DURATION_S);
  });

  it('противоположный знак поверх активного → sign меняется, remainingSeconds — снова полная длительность, без промежуточного нулевого состояния', () => {
    const state = createEffectState();
    applyBonusEffect(state, 'positive');
    tickEffect(state, BONUS_EFFECT_DURATION_S * 0.3);

    applyBonusEffect(state, 'negative');

    expect(state.sign).toBe('negative');
    expect(state.remainingSeconds).toBe(BONUS_EFFECT_DURATION_S);
  });

  it('гашение и новый эффект работают и в обратную сторону (negative → positive)', () => {
    const state = createEffectState();
    applyBonusEffect(state, 'negative');
    tickEffect(state, BONUS_EFFECT_DURATION_S * 0.5);

    applyBonusEffect(state, 'positive');

    expect(state.sign).toBe('positive');
    expect(state.remainingSeconds).toBe(BONUS_EFFECT_DURATION_S);
  });
});

describe('tickEffect (AC-12)', () => {
  it('уменьшает remainingSeconds на deltaTimeSeconds, пока эффект активен', () => {
    const state = createEffectState();
    applyBonusEffect(state, 'positive');

    tickEffect(state, 1);

    expect(state.sign).toBe('positive');
    expect(state.remainingSeconds).toBeCloseTo(BONUS_EFFECT_DURATION_S - 1, 5);
  });

  it('переходит в sign: null, remainingSeconds: 0, когда время истекает (<= 0)', () => {
    const state = createEffectState();
    applyBonusEffect(state, 'negative');

    tickEffect(state, BONUS_EFFECT_DURATION_S + 10); // явно больше остатка

    expect(state.sign).toBeNull();
    expect(state.remainingSeconds).toBe(0);
  });

  it('переходит в базовое состояние ровно в момент remainingSeconds === 0 (граничный случай)', () => {
    const state = createEffectState();
    applyBonusEffect(state, 'positive');

    tickEffect(state, BONUS_EFFECT_DURATION_S);

    expect(state.sign).toBeNull();
    expect(state.remainingSeconds).toBe(0);
  });

  it('tickEffect на неактивном эффекте не переводит state в некорректное отрицательное время', () => {
    const state = createEffectState();

    tickEffect(state, 1);

    expect(state.sign).toBeNull();
    expect(state.remainingSeconds).toBe(0);
  });
});

describe('insectSpeedMultiplier (AC-10, AC-11)', () => {
  it('null (нет эффекта) → множитель 1 (базовая скорость)', () => {
    const state = createEffectState();

    expect(insectSpeedMultiplier(state)).toBe(1);
  });

  it("'positive' → множитель меньше 1 (насекомые медленнее, легче ловить)", () => {
    const state = createEffectState();
    applyBonusEffect(state, 'positive');

    expect(insectSpeedMultiplier(state)).toBeLessThan(1);
  });

  it("'negative' → множитель больше 1 (насекомые быстрее, сложнее ловить)", () => {
    const state = createEffectState();
    applyBonusEffect(state, 'negative');

    expect(insectSpeedMultiplier(state)).toBeGreaterThan(1);
  });
});
