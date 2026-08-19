/**
 * Отрисовка лягушки на Canvas 2D — чистая функция без побочных эффектов
 * помимо рисования на переданном ctx (принцип IV: разделена от game/frog.ts,
 * который вычисляет FrogState без знания о Canvas).
 *
 * Плейсхолдер-прямоугольник (plan.md §«render/frog.ts», spec.md «Не-цели» —
 * конкретный спрайт вне объёма этой фичи): стандартная высота/цвет либо
 * уменьшенная высота и другой цвет при state.isCrouching — визуально
 * отличимая присевшая поза (AC-10).
 */

import { getFrogRect, type FrogState } from '../game/frog';

const FROG_COLOR = '#2ecc71';
const FROG_CROUCH_COLOR = '#27ae60';

/**
 * T013 (002-insects-and-bonuses): геометрия (x/y/ширина/высота) больше не
 * вычисляется здесь на месте — единственный источник истины теперь
 * getFrogRect() из game/frog.ts (см. T008). Формула идентична прежней
 * локальной, поведение drawFrog не изменилось.
 */
export function drawFrog(ctx: CanvasRenderingContext2D, state: FrogState, groundY: number): void {
  const rect = getFrogRect(state, groundY);
  const color = state.isCrouching ? FROG_CROUCH_COLOR : FROG_COLOR;

  ctx.fillStyle = color;
  ctx.fillRect(rect.x, rect.y, rect.width, rect.height);
}
