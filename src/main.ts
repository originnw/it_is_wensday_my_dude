import './style.css';
import { setupCanvas } from './render/canvas';
import { createGameLoop } from './game/loop';
import { createFrogState, updateFrog } from './game/frog';
import { createInputTracker } from './game/input';
import { drawFrog } from './render/frog';

const { canvas, ctx } = setupCanvas();

// Цвет заливки фона на каждый кадр — заменяет прежнюю статичную заливку
// каркаса 000-project-bootstrap, теперь используется для очистки canvas
// перед отрисовкой лягушки (T010).
const BACKGROUND_COLOR = '#2b2b2b';
ctx.fillStyle = BACKGROUND_COLOR;

// Отступ «земли» от нижнего края canvas, px. Не хранится в FrogState —
// логика лягушки не должна знать о размерах canvas по вертикали (plan.md
// §«render/frog.ts», AC-3 требует только горизонтальные границы).
const GROUND_MARGIN_PX = 40;
const groundY = canvas.height - GROUND_MARGIN_PX;

const frogState = createFrogState(canvas.width);
const input = createInputTracker();

// FPS-счётчик — только в dev-сборке, через динамический импорт, чтобы
// модуль src/dev/fpsCounter.ts не попадал в прод-бандл (см. plan.md,
// "FPS-счётчик — только dev").
let fps: { report(deltaTimeSeconds: number): void } | undefined;

if (import.meta.env.DEV) {
  const { createFpsCounter } = await import('./dev/fpsCounter');
  fps = createFpsCounter();
}

createGameLoop((deltaTime) => {
  const frogInput = input.read();
  updateFrog(frogState, frogInput, deltaTime, canvas.width);

  ctx.fillStyle = BACKGROUND_COLOR;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  drawFrog(ctx, frogState, groundY);

  fps?.report(deltaTime);
}).start();
