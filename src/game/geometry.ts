export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Стандартный AABB-тест пересечения прямоугольников по осям.
 * Единственный источник истины для геометрии столкновений — переиспользуется
 * и «лягушка × насекомое» (AC-5), и «лягушка × бонус» (AC-8).
 * Прямоугольники, касающиеся ровно краями, не считаются пересекающимися.
 */
export function rectsIntersect(a: Rect, b: Rect): boolean {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}
