/**
 * Порог накопленного времени (в секундах), по достижении которого счётчик
 * пересчитывает FPS и обновляет текст оверлея. Ровно 1 секунда — "кадров
 * за последнюю секунду" буквально из формулировки задачи.
 */
const REPORT_INTERVAL_SECONDS = 1;

/**
 * Создаёт dev-only FPS-оверлей: добавляет в document.body <div> с
 * position: fixed в левом верхнем углу (минимальные инлайн-стили, без
 * отдельного CSS-файла — см. plan.md, "FPS-счётчик — только dev"),
 * и возвращает объект с report(deltaTimeSeconds), который должен
 * вызываться каждый кадр из игрового цикла.
 *
 * Алгоритм: report() накапливает количество вызовов (frameCount) и
 * суммарное прошедшее время (elapsedSeconds) через переданный delta-time.
 * Как только elapsedSeconds достигает REPORT_INTERVAL_SECONDS (~1с),
 * текст оверлея обновляется на frameCount (число кадров за этот
 * интервал), после чего оба счётчика сбрасываются — не скользящее
 * окно, а последовательные неперекрывающиеся интервалы примерно по
 * секунде, что проще и достаточно для dev-индикатора.
 */
export function createFpsCounter(): { report(deltaTimeSeconds: number): void } {
  const overlay = document.createElement('div');
  overlay.style.position = 'fixed';
  overlay.style.top = '0';
  overlay.style.left = '0';
  overlay.style.padding = '4px 8px';
  overlay.style.background = 'rgba(0, 0, 0, 0.6)';
  overlay.style.color = '#0f0';
  overlay.style.font = '12px monospace';
  overlay.style.zIndex = '9999';
  overlay.style.pointerEvents = 'none';
  overlay.textContent = 'FPS: --';
  document.body.appendChild(overlay);

  let frameCount = 0;
  let elapsedSeconds = 0;

  function report(deltaTimeSeconds: number): void {
    frameCount += 1;
    elapsedSeconds += deltaTimeSeconds;

    if (elapsedSeconds >= REPORT_INTERVAL_SECONDS) {
      overlay.textContent = `FPS: ${frameCount}`;
      frameCount = 0;
      elapsedSeconds = 0;
    }
  }

  return { report };
}
