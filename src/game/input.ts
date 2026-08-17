/**
 * DOM-ввод с клавиатуры (impure) — единственный модуль этой фичи, который
 * трогает браузерные API напрямую (принцип IV конституции, AC-12: вся
 * остальная логика в frog.ts остаётся тестируемой без DOM).
 *
 * createInputTracker() подписывается на window keydown/keyup по event.code
 * (не event.key — независимость от раскладки клавиатуры, plan.md
 * §«game/input.ts») и накапливает состояние клавиш в едином mutable-объекте
 * FrogInput (без аллокаций внутри кадра — принцип III конституции). read()
 * возвращает ту же ссылку на каждый вызов и сбрасывает одноразовый
 * jumpRequested (one-shot consume — см. data-model.md FrogInput). dispose()
 * отписывает обработчики от window.
 */

import type { FrogInput } from './frog';

/**
 * API трекера ввода. `dispose()` отписывает обработчики `keydown`/`keyup` от
 * `window` — на случай будущего пересоздания трекера (например, рестарт игры
 * без перезагрузки страницы); в текущей фиче `main.ts` его не вызывает,
 * трекер создаётся один раз на всё время жизни страницы.
 */
export interface InputTracker {
  read(): FrogInput;
  dispose(): void;
}

export function createInputTracker(): InputTracker {
  // Единый mutable-объект, аллоцируемый один раз за всё время жизни трекера
  // (принцип III конституции — без аллокаций внутри кадра). Обработчики
  // keydown/keyup мутируют moveLeft/moveRight/crouch прямо на нём — эти три
  // поля level-triggered (текущее состояние клавиши), копия не нужна.
  const snapshot: FrogInput = {
    moveLeft: false,
    moveRight: false,
    crouch: false,
    jumpRequested: false,
  };

  // jumpRequested — edge-triggered one-shot (data-model.md), поэтому не может
  // мутироваться в handleKeyDown напрямую в snapshot.jumpRequested: если
  // read() сбросит его сразу после выставления true, вызывающий код (он
  // читает поле СИНХРОННО из той же ссылки уже ПОСЛЕ возврата read()) увидит
  // уже false — обнулять «на лету» нельзя, т.к. snapshot — общая ссылка, а не
  // копия. jumpPending — промежуточный флаг: handleKeyDown его выставляет,
  // read() переносит его значение в snapshot.jumpRequested и обнуляет
  // именно jumpPending (не то, что уже отдано наружу за этот вызов).
  let jumpPending = false;

  function handleKeyDown(event: KeyboardEvent): void {
    switch (event.code) {
      case 'ArrowLeft':
        snapshot.moveLeft = true;
        break;
      case 'ArrowRight':
        snapshot.moveRight = true;
        break;
      case 'ControlLeft':
        snapshot.crouch = true;
        break;
      case 'Space':
        // !event.repeat — автоповтор ОС при удержании клавиши не должен
        // порождать новые jumpRequested на каждый повторный keydown
        // (plan.md §«game/input.ts»); защита от двойного прыжка в воздухе
        // всё равно остаётся на updateFrog()/AC-7.
        if (!event.repeat) {
          jumpPending = true;
        }
        // preventDefault всегда (в том числе на repeat-событиях) — иначе
        // браузер проскроллит страницу пробелом.
        event.preventDefault();
        break;
      default:
        break;
    }
  }

  function handleKeyUp(event: KeyboardEvent): void {
    switch (event.code) {
      case 'ArrowLeft':
        snapshot.moveLeft = false;
        break;
      case 'ArrowRight':
        snapshot.moveRight = false;
        break;
      case 'ControlLeft':
        snapshot.crouch = false;
        break;
      default:
        break;
    }
  }

  window.addEventListener('keydown', handleKeyDown);
  window.addEventListener('keyup', handleKeyUp);

  return {
    read(): FrogInput {
      snapshot.jumpRequested = jumpPending;
      jumpPending = false;
      return snapshot;
    },
    dispose(): void {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    },
  };
}
