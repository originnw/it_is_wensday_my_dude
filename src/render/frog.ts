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

import { FROG_HEIGHT_PX, FROG_WIDTH_PX, type FrogState } from '../game/frog';

const FROG_COLOR = '#2ecc71';
const FROG_CROUCH_COLOR = '#27ae60';
const CROUCH_HEIGHT_MULTIPLIER = 0.5;

export function drawFrog(ctx: CanvasRenderingContext2D, state: FrogState, groundY: number): void {
  const height = state.isCrouching ? FROG_HEIGHT_PX * CROUCH_HEIGHT_MULTIPLIER : FROG_HEIGHT_PX;
  const color = state.isCrouching ? FROG_CROUCH_COLOR : FROG_COLOR;
  const y = groundY - state.jumpOffsetY - height;

  ctx.fillStyle = color;
  ctx.fillRect(state.x, y, FROG_WIDTH_PX, height);
}
