/**
 * Отрисовка бонусов на Canvas 2D — чистая функция без побочных эффектов
 * помимо рисования на переданном ctx (принцип IV: разделена от
 * game/bonuses.ts, который вычисляет BonusesState без знания о Canvas).
 *
 * Плейсхолдер-круг (plan.md §«render/bonuses.ts» / «Не-цели» spec.md —
 * конкретный спрайт вне объёма этой фичи): одна форма (`ctx.arc`), цвет
 * зависит от `sign` — `positive` зелёный, `negative` красный. Закрывает
 * AC-17 («визуально различим ещё до поимки») минимальным способом.
 * Геометрия центра/радиуса выводится из уже вычисленного `Bonus`
 * (x/y/width/height) — здесь ничего не вычисляется, кроме перевода
 * прямоугольника в центр+радиус для `ctx.arc`.
 */

import type { Bonus } from '../game/bonuses';

const POSITIVE_COLOR = '#2ecc71';
const NEGATIVE_COLOR = '#e74c3c';

export function drawBonuses(ctx: CanvasRenderingContext2D, bonuses: Bonus[]): void {
  for (const bonus of bonuses) {
    const radius = Math.min(bonus.width, bonus.height) / 2;
    const centerX = bonus.x + bonus.width / 2;
    const centerY = bonus.y + bonus.height / 2;

    ctx.fillStyle = bonus.sign === 'positive' ? POSITIVE_COLOR : NEGATIVE_COLOR;
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.fill();
  }
}
