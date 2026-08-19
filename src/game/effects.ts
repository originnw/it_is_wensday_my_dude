/**
 * Чистая игровая логика активного эффекта бонуса: длительность,
 * продление/гашение при повторном подборе, влияние на скорость насекомых.
 *
 * Никакого DOM/Canvas API — только примитивы и объект состояния (принцип IV
 * конституции).
 *
 * T011: реализует T005 (`effects.test.ts`).
 */

import type { BonusSign } from './bonuses';
import {
  BONUS_EFFECT_DURATION_S,
  BONUS_EFFECT_POSITIVE_SPEED_MULTIPLIER,
  BONUS_EFFECT_NEGATIVE_SPEED_MULTIPLIER,
} from './tuning';

export interface BonusEffectState {
  sign: BonusSign | null;
  remainingSeconds: number;
}

// Сами значения — в game/tuning.ts; здесь re-export под прежними именами,
// чтобы внешние импорты (`from './effects'` в тестах) не менялись.
export { BONUS_EFFECT_DURATION_S, BONUS_EFFECT_POSITIVE_SPEED_MULTIPLIER, BONUS_EFFECT_NEGATIVE_SPEED_MULTIPLIER };

export function createEffectState(): BonusEffectState {
  return { sign: null, remainingSeconds: 0 };
}

/**
 * Все три сценария AC-13 (нет активного эффекта / тот же знак продлевает /
 * противоположный знак гасит и запускает новый) приводят к идентичному
 * присваиванию — см. обоснование в plan.md §`game/effects.ts`.
 */
export function applyBonusEffect(state: BonusEffectState, sign: BonusSign): void {
  state.sign = sign;
  state.remainingSeconds = BONUS_EFFECT_DURATION_S;
}

export function tickEffect(state: BonusEffectState, deltaTimeSeconds: number): void {
  state.remainingSeconds -= deltaTimeSeconds;
  if (state.remainingSeconds <= 0) {
    state.sign = null;
    state.remainingSeconds = 0;
  }
}

export function insectSpeedMultiplier(state: BonusEffectState): number {
  if (state.sign === 'positive') {
    return BONUS_EFFECT_POSITIVE_SPEED_MULTIPLIER;
  }
  if (state.sign === 'negative') {
    return BONUS_EFFECT_NEGATIVE_SPEED_MULTIPLIER;
  }
  return 1;
}
