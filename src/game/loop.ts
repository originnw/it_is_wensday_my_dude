/**
 * Игровой цикл на базе requestAnimationFrame.
 *
 * deltaTime вычисляется каждый тик из реальных таймстемпов rAF (в секундах,
 * не мс) — никаких захардкоженных констант вида «16.6 мс» или «1/60»
 * (AC-5). Передаётся в callback как примитив number, а не объект — чтобы
 * не аллоцировать структуру на каждый кадр (принцип III конституции).
 *
 * Браузер сам приостанавливает rAF для неактивных/свёрнутых вкладок —
 * отдельная обработка visibilitychange не требуется (см. plan.md).
 */
export function createGameLoop(
  callback: (deltaTimeSeconds: number) => void,
): { start(): void } {
  let lastTimestamp: number | null = null;

  const tick = (timestamp: number): void => {
    const deltaTime = lastTimestamp === null ? 0 : (timestamp - lastTimestamp) / 1000;
    lastTimestamp = timestamp;
    callback(deltaTime);
    requestAnimationFrame(tick);
  };

  return {
    start(): void {
      requestAnimationFrame(tick);
    },
  };
}
