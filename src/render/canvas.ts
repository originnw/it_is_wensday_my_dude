/**
 * Идентификатор canvas-элемента, используемый как соглашение между
 * setupCanvas() и разметкой index.html (если в будущем там появится
 * статический <canvas id="game-canvas">).
 */
const CANVAS_ID = 'game-canvas';

/**
 * Получает существующий <canvas> из DOM (по id "game-canvas") либо создаёт
 * новый и добавляет его в document.body, если такого элемента ещё нет.
 * Один раз при вызове выставляет размер буфера рисования (canvas.width/height)
 * равным текущему размеру viewport — не только CSS-размер, чтобы избежать
 * блюра/растяжения растра. Обработчик window resize намеренно не добавляется
 * (см. plan.md, раздел "Fullscreen canvas").
 */
export function setupCanvas(): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } {
  let canvas = document.getElementById(CANVAS_ID) as HTMLCanvasElement | null;

  if (!canvas) {
    canvas = document.createElement('canvas');
    canvas.id = CANVAS_ID;
    document.body.appendChild(canvas);
  }

  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    // Реальная граница браузерного API: getContext('2d') может вернуть null
    // (например, контекст уже занят под webgl на этом элементе, либо
    // окружение не поддерживает Canvas 2D). Без ctx рендеринг невозможен,
    // поэтому это осмысленный throw, а не избыточная валидация.
    throw new Error('setupCanvas: canvas.getContext("2d") вернул null — 2D-контекст недоступен в этом браузере/окружении.');
  }

  return { canvas, ctx };
}
