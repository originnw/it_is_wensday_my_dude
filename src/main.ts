import './style.css';
import { setupCanvas } from './render/canvas';
import { createGameLoop } from './game/loop';
import { createWorldState, updateWorld } from './game/world';
import { createInputTracker } from './game/input';
import { drawFrog } from './render/frog';
import { drawInsects } from './render/insects';
import { drawBonuses } from './render/bonuses';

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

const worldState = createWorldState(canvas.width);
const input = createInputTracker();

// FPS-счётчик — только в dev-сборке, через динамический импорт, чтобы
// модуль src/dev/fpsCounter.ts не попадал в прод-бандл (см. plan.md,
// "FPS-счётчик — только dev").
let fps: { report(deltaTimeSeconds: number): void } | undefined;

if (import.meta.env.DEV) {
  const { createFpsCounter } = await import('./dev/fpsCounter');
  fps = createFpsCounter();
}

// Диагностика счёта — только в dev-сборке, по аналогии с fps-счётчиком выше.
// Не UI/HUD-элемент (spec.md «Не-цели»), на canvas не рисуется.
let previousScore = worldState.score;

createGameLoop((deltaTime) => {
  const frogInput = input.read();
  updateWorld(worldState, frogInput, deltaTime, canvas.width, canvas.height, groundY);

  ctx.fillStyle = BACKGROUND_COLOR;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  drawFrog(ctx, worldState.frog, groundY);
  drawInsects(ctx, worldState.insects.list);
  drawBonuses(ctx, worldState.bonuses.list);

  if (import.meta.env.DEV && worldState.score !== previousScore) {
    console.log('score:', worldState.score);
    previousScore = worldState.score;
  }

  fps?.report(deltaTime);
}).start();
