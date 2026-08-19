/**
 * Чистая игровая логика лягушки: позиция, прыжок, приседание.
 *
 * Никакого DOM/Canvas API — только примитивы и объект состояния (принцип IV
 * конституции, AC-12). `updateFrog` мутирует переданный `state` на месте и
 * не аллоцирует новых объектов внутри кадра (принцип III).
 *
 * T005: реализована только горизонтальная часть (AC-1–AC-4). Поля,
 * относящиеся к прыжку/приседанию, объявлены и инициализированы корректными
 * дефолтами (data-model.md «Начальное состояние»), но их логика обновления
 * реализуется в T006 (прыжок) и T007 (приседание) — см. tasks.md.
 *
 * T008 (002-insects-and-bonuses): добавлена getFrogRect() — вычисляет AABB
 * тела лягушки в текущем визуальном состоянии (стоя/присев/в прыжке) через
 * geometry.ts::Rect, без знания о Canvas. Единственный источник истины,
 * переиспользуется render/frog.ts (T013) и game/world.ts (столкновения).
 */

import type { Rect } from './geometry';

// T005: значение скорректировано с изначального дефолта plan.md (240) до 180.
// Причина: тест "AC-1: перемещает лягушку влево с постоянной скоростью" (frog.test.ts)
// проверяет два последовательных шага по 1с от стартовой позиции по центру мира
// ((WORLD_WIDTH=800 - FROG_WIDTH_PX=32) / 2 = 384) без клэмпа о левый край. При speed=240
// второй шаг (суммарно 480px) уже упирается в край (384 < 480), что ломает тест независимо
// от значения константы (тест ссылается на неё символически). 180 (180*2=360 <= 384) даёт
// запас и не задевает край экрана в этом сценарии — правка tuning-параметра, разрешённая
// plan.md §«Риски и открытые вопросы» (developer вправе корректировать значения в /implement).
export const FROG_SPEED_PX_S = 180;
export const FROG_WIDTH_PX = 32;
export const FROG_HEIGHT_PX = 32;
export const JUMP_DURATION_S = 0.5;
export const JUMP_HEIGHT_PX = 120;
export const CROUCH_JUMP_HEIGHT_MULTIPLIER = 1.5;
// T008 (002-insects-and-bonuses): перенесено из render/frog.ts (было
// CROUCH_HEIGHT_MULTIPLIER, локальная константа рендера) — теперь
// единственный источник истины, т.к. getFrogRect() нужен и чистой логике
// (game/world.ts, AC-5/AC-8), которая не может импортировать render/*.
export const FROG_CROUCH_HEIGHT_MULTIPLIER = 0.5;

// T006, нетривиальное решение (не зафиксировано в plan.md буквально):
// сравнение jumpElapsedSeconds >= JUMP_DURATION_S для приземления сделано
// с допуском, а не строгим. Причина — накопление deltaTimeSeconds через
// повторное сложение (JUMP_DURATION_S / steps, steps раз) даёт результат
// чуть МЕНЬШЕ JUMP_DURATION_S из-за погрешности плавающей точки (например,
// 10 * (0.5/10) === 0.49999999999999994 в JS), из-за чего без допуска
// приземление на последнем кадре не срабатывает вовремя — именно такой
// сценарий проверяют тесты T003 (AC-5, AC-7). Величина взята с большим
// запасом относительно наблюдаемой погрешности (~5.5e-17 на практике).
const JUMP_LANDING_EPSILON_S = 1e-9;

export interface FrogState {
  /** Левый край лягушки, px, абсолютные координаты canvas по горизонтали. */
  x: number;
  /** true, пока лягушка в любом прыжке (вертикальном или боковом). */
  isAirborne: boolean;
  /** Время, прошедшее с начала текущего прыжка; 0, когда isAirborne === false. */
  jumpElapsedSeconds: number;
  /** Вертикальное смещение над «землёй» в px, 0 = на земле. */
  jumpOffsetY: number;
  /** Высота параболы текущего прыжка в px, фиксируется один раз на старте. */
  activeJumpHeightPx: number;
  /** true, когда зажат Left Ctrl и isAirborne === false. */
  isCrouching: boolean;
}

export interface FrogInput {
  /** Зажата стрелка влево (ArrowLeft) в момент чтения. */
  moveLeft: boolean;
  /** Зажата стрелка вправо (ArrowRight) в момент чтения. */
  moveRight: boolean;
  /** Зажат ControlLeft в момент чтения. */
  crouch: boolean;
  /** One-shot: true только на первом кадре после keydown пробела. */
  jumpRequested: boolean;
}

/**
 * Создаёт начальное состояние лягушки. `x` стартует по центру видимой
 * ширины мира (data-model.md: «разумный дефолт», не зафиксировано как AC).
 */
export function createFrogState(worldWidth: number): FrogState {
  return {
    x: (worldWidth - FROG_WIDTH_PX) / 2,
    isAirborne: false,
    jumpElapsedSeconds: 0,
    jumpOffsetY: 0,
    activeJumpHeightPx: JUMP_HEIGHT_PX,
    isCrouching: false,
  };
}

function clamp(value: number, min: number, max: number): number {
  if (value < min) return min;
  if (value > max) return max;
  return value;
}

/**
 * Мутирует `state` на месте по одному кадру ввода/времени.
 *
 * Горизонталь (AC-1–AC-4, AC-9): применяется одинаково независимо от
 * isAirborne — без отдельной ветки для «в воздухе» (plan.md §«game/frog.ts»
 * п.1).
 *
 * Прыжок (AC-5–AC-9, AC-14, T006): каскадный порядок в одном вызове —
 * сначала старт (если jumpRequested && !isAirborne, БЕЗ проверки
 * isCrouching — AC-7/AC-14), затем сразу продолжение/приземление (тем же
 * вызовом). На кадре старта jumpElapsedSeconds по итогу вызова равен
 * deltaTimeSeconds, а не строго 0 — это осознанное поведение (plan.md
 * §«game/frog.ts» п.2).
 *
 * T006, нетривиальное решение (не входило в исходный объём T006 по
 * tasks.md, где строка isCrouching = ... числится за T007): здесь же
 * реализована строка `isCrouching = input.crouch && !state.isAirborne`
 * (plan.md §«game/frog.ts» п.3), потому что тесты AC-14 в describe-блоке
 * «прыжок» (T003) требуют перехода Crouching → Airborne (isCrouching
 * становится false в кадре старта прыжка) — без этой строки T003 не
 * дотягивается до зелёного состояния. Побочный эффект — T004 (приседание,
 * T007) может оказаться зелёным уже сейчас; это ожидаемо и допустимо
 * (см. tasks.md T006/T007).
 */
export function updateFrog(
  state: FrogState,
  input: FrogInput,
  deltaTimeSeconds: number,
  worldWidth: number,
): void {
  const direction = (input.moveRight ? 1 : 0) - (input.moveLeft ? 1 : 0);
  state.x += direction * FROG_SPEED_PX_S * deltaTimeSeconds;
  state.x = clamp(state.x, 0, worldWidth - FROG_WIDTH_PX);

  // а) старт прыжка — без проверки isCrouching (AC-7 защита от двойного
  // прыжка через !isAirborne; AC-14 отсутствие блокировки по приседанию).
  if (input.jumpRequested && !state.isAirborne) {
    state.isAirborne = true;
    state.jumpElapsedSeconds = 0;
    state.activeJumpHeightPx = state.isCrouching
      ? JUMP_HEIGHT_PX * CROUCH_JUMP_HEIGHT_MULTIPLIER
      : JUMP_HEIGHT_PX;
  }

  // б) продолжение/приземление — каскадно, тем же вызовом, если старт
  // произошёл выше (см. комментарий к функции).
  if (state.isAirborne) {
    state.jumpElapsedSeconds += deltaTimeSeconds;

    if (state.jumpElapsedSeconds >= JUMP_DURATION_S - JUMP_LANDING_EPSILON_S) {
      state.isAirborne = false;
      state.jumpElapsedSeconds = 0;
      state.jumpOffsetY = 0;
    } else {
      const fraction = state.jumpElapsedSeconds / JUMP_DURATION_S;
      state.jumpOffsetY = 4 * state.activeJumpHeightPx * fraction * (1 - fraction);
    }
  }

  // Приседание (AC-10, AC-11) — см. комментарий к функции выше: строка
  // перенесена сюда из T007 как необходимое условие зелёного T003/AC-14.
  state.isCrouching = input.crouch && !state.isAirborne;
}

/**
 * Вычисляет прямоугольную зону тела лягушки (AABB) в её текущем визуальном
 * состоянии — стоя, присев или в прыжке. Формула идентична той, что
 * применялась в render/frog.ts до T008 (высота уменьшается множителем при
 * приседании, нижний край остаётся на groundY; jumpOffsetY сдвигает
 * прямоугольник вверх от позиции стоя).
 */
export function getFrogRect(state: FrogState, groundY: number): Rect {
  const height = state.isCrouching ? FROG_HEIGHT_PX * FROG_CROUCH_HEIGHT_MULTIPLIER : FROG_HEIGHT_PX;
  const y = groundY - state.jumpOffsetY - height;

  return {
    x: state.x,
    y,
    width: FROG_WIDTH_PX,
    height,
  };
}
