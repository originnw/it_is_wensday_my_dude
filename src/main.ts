import './style.css';
import { setupCanvas } from './render/canvas';
import { createGameLoop } from './game/loop';

const { canvas, ctx } = setupCanvas();

// Цвет закраски канваса — единственное видимое доказательство того, что
// каркас (canvas + игровой цикл) работает (AC-3, AC-9). Никаких игровых
// сущностей здесь и в коллбэке цикла нет — это задача будущих фич.
ctx.fillStyle = '#2b2b2b';

// FPS-счётчик — только в dev-сборке, через динамический импорт, чтобы
// модуль src/dev/fpsCounter.ts не попадал в прод-бандл (см. plan.md,
// "FPS-счётчик — только dev").
let fps: { report(deltaTimeSeconds: number): void } | undefined;

if (import.meta.env.DEV) {
  const { createFpsCounter } = await import('./dev/fpsCounter');
  fps = createFpsCounter();
}

createGameLoop((deltaTime) => {
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  fps?.report(deltaTime);
}).start();
