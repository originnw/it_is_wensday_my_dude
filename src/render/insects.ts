/**
 * Отрисовка насекомых на Canvas 2D — чистая функция без побочных эффектов
 * помимо рисования на переданном ctx (принцип IV: разделена от
 * game/insects.ts, который вычисляет InsectsState без знания о Canvas).
 *
 * Плейсхолдер-прямоугольники (plan.md §«render/insects.ts» / «Не-цели»
 * spec.md — конкретный спрайт вне объёма этой фичи): различимость типов
 * (AC-1) обеспечена только размером/цветом — комар маленький серый,
 * стрекоза крупнее и бирюзовая. Геометрия (x/y/width/height) целиком
 * берётся из уже вычисленного `Insect` — здесь ничего не вычисляется.
 */

import type { Insect } from '../game/insects';

const MOSQUITO_COLOR = '#7f8c8d';
const DRAGONFLY_COLOR = '#1abc9c';

export function drawInsects(ctx: CanvasRenderingContext2D, insects: Insect[]): void {
  for (const insect of insects) {
    ctx.fillStyle = insect.type === 'mosquito' ? MOSQUITO_COLOR : DRAGONFLY_COLOR;
    ctx.fillRect(insect.x, insect.y, insect.width, insect.height);
  }
}
