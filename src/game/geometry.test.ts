import { describe, it, expect } from 'vitest';
import { rectsIntersect, type Rect } from './geometry';

describe('rectsIntersect (AC-5, AC-8 — инфраструктурный AABB-тест)', () => {
  it('возвращает true для явно пересекающихся прямоугольников', () => {
    const a: Rect = { x: 0, y: 0, width: 10, height: 10 };
    const b: Rect = { x: 5, y: 5, width: 10, height: 10 };

    expect(rectsIntersect(a, b)).toBe(true);
  });

  it('возвращает false, когда прямоугольники разнесены только по оси X', () => {
    const a: Rect = { x: 0, y: 0, width: 10, height: 10 };
    const b: Rect = { x: 20, y: 0, width: 10, height: 10 };

    expect(rectsIntersect(a, b)).toBe(false);
  });

  it('возвращает false, когда прямоугольники разнесены только по оси Y', () => {
    const a: Rect = { x: 0, y: 0, width: 10, height: 10 };
    const b: Rect = { x: 0, y: 20, width: 10, height: 10 };

    expect(rectsIntersect(a, b)).toBe(false);
  });

  it('возвращает false, когда прямоугольники разнесены по обеим осям одновременно', () => {
    const a: Rect = { x: 0, y: 0, width: 10, height: 10 };
    const b: Rect = { x: 20, y: 20, width: 10, height: 10 };

    expect(rectsIntersect(a, b)).toBe(false);
  });

  it('граничный случай: прямоугольники, касающиеся ровно краями, не считаются пересекающимися', () => {
    const a: Rect = { x: 0, y: 0, width: 10, height: 10 };
    // b начинается ровно там, где заканчивается a по X — общих внутренних точек нет
    const b: Rect = { x: 10, y: 0, width: 10, height: 10 };

    expect(rectsIntersect(a, b)).toBe(false);
  });

  it('результат симметричен относительно порядка аргументов', () => {
    const a: Rect = { x: 0, y: 0, width: 10, height: 10 };
    const b: Rect = { x: 5, y: 5, width: 10, height: 10 };

    expect(rectsIntersect(a, b)).toBe(rectsIntersect(b, a));
  });
});
