import { describe, it, expect } from 'vitest';
import { createFrogState, updateFrog, FROG_SPEED_PX_S, FROG_WIDTH_PX, JUMP_DURATION_S, JUMP_HEIGHT_PX } from './frog';

// Решение T002 (не зафиксировано дословно в data-model.md/plan.md): createFrogState
// принимает worldWidth, чтобы вычислить стартовый x как центр видимой ширины canvas
// (data-model.md: "x — центр видимой ширины canvas... разумный дефолт"). T005 должен
// реализовать createFrogState с этой сигнатурой, чтобы эти тесты стали зелёными.
const WORLD_WIDTH = 800;

describe('updateFrog — горизонтальное движение (AC-1–AC-4)', () => {
  it('AC-1: перемещает лягушку влево с постоянной скоростью, без разгона', () => {
    const state = createFrogState(WORLD_WIDTH);
    const startX = state.x;

    updateFrog(state, { moveLeft: true, moveRight: false, crouch: false, jumpRequested: false }, 1, WORLD_WIDTH);
    const afterFirstSecond = startX - state.x;

    updateFrog(state, { moveLeft: true, moveRight: false, crouch: false, jumpRequested: false }, 1, WORLD_WIDTH);
    const afterSecondSecond = (startX - afterFirstSecond) - state.x;

    // скорость постоянна: за равные промежутки времени — равное перемещение, без ускорения
    expect(afterFirstSecond).toBeCloseTo(FROG_SPEED_PX_S, 5);
    expect(afterSecondSecond).toBeCloseTo(FROG_SPEED_PX_S, 5);
  });

  it('AC-1: перемещает лягушку вправо с той же постоянной скоростью', () => {
    const state = createFrogState(WORLD_WIDTH);
    const startX = state.x;

    updateFrog(state, { moveLeft: false, moveRight: true, crouch: false, jumpRequested: false }, 1, WORLD_WIDTH);

    expect(state.x - startX).toBeCloseTo(FROG_SPEED_PX_S, 5);
  });

  it('AC-1: перемещение пропорционально deltaTime (например, за 0.5с — половина скорости)', () => {
    const state = createFrogState(WORLD_WIDTH);
    const startX = state.x;

    updateFrog(state, { moveLeft: false, moveRight: true, crouch: false, jumpRequested: false }, 0.5, WORLD_WIDTH);

    expect(state.x - startX).toBeCloseTo(FROG_SPEED_PX_S * 0.5, 5);
  });

  it('AC-2: отпускание клавиши мгновенно останавливает движение — без инерции', () => {
    const state = createFrogState(WORLD_WIDTH);

    updateFrog(state, { moveLeft: false, moveRight: true, crouch: false, jumpRequested: false }, 1, WORLD_WIDTH);
    const xAfterMoving = state.x;

    updateFrog(state, { moveLeft: false, moveRight: false, crouch: false, jumpRequested: false }, 1, WORLD_WIDTH);

    expect(state.x).toBe(xAfterMoving);
  });

  it('AC-3: упирается в левый край мира (x = 0) и не движется дальше влево', () => {
    const state = createFrogState(WORLD_WIDTH);
    state.x = 5;

    updateFrog(state, { moveLeft: true, moveRight: false, crouch: false, jumpRequested: false }, 1, WORLD_WIDTH);

    expect(state.x).toBe(0);
  });

  it('AC-3: упирается в правый край мира (worldWidth - FROG_WIDTH_PX) и не движется дальше вправо', () => {
    const state = createFrogState(WORLD_WIDTH);
    state.x = WORLD_WIDTH - FROG_WIDTH_PX - 5;

    updateFrog(state, { moveLeft: false, moveRight: true, crouch: false, jumpRequested: false }, 1, WORLD_WIDTH);

    expect(state.x).toBe(WORLD_WIDTH - FROG_WIDTH_PX);
  });

  it('AC-3: после упора в левый край движение вправо возобновляется сразу, без телепорта на противоположный край', () => {
    const state = createFrogState(WORLD_WIDTH);
    state.x = 0;

    updateFrog(state, { moveLeft: true, moveRight: false, crouch: false, jumpRequested: false }, 1, WORLD_WIDTH);
    expect(state.x).toBe(0);

    updateFrog(state, { moveLeft: false, moveRight: true, crouch: false, jumpRequested: false }, 1, WORLD_WIDTH);

    expect(state.x).toBeCloseTo(FROG_SPEED_PX_S, 5);
  });

  it('AC-3: после упора в правый край движение влево возобновляется сразу, без телепорта на противоположный край', () => {
    const state = createFrogState(WORLD_WIDTH);
    const rightEdge = WORLD_WIDTH - FROG_WIDTH_PX;
    state.x = rightEdge;

    updateFrog(state, { moveLeft: false, moveRight: true, crouch: false, jumpRequested: false }, 1, WORLD_WIDTH);
    expect(state.x).toBe(rightEdge);

    updateFrog(state, { moveLeft: true, moveRight: false, crouch: false, jumpRequested: false }, 1, WORLD_WIDTH);

    expect(state.x).toBeCloseTo(rightEdge - FROG_SPEED_PX_S, 5);
  });

  it('AC-4: одновременное зажатие moveLeft и moveRight взаимно гасит движение — x не меняется', () => {
    const state = createFrogState(WORLD_WIDTH);
    const startX = state.x;

    updateFrog(state, { moveLeft: true, moveRight: true, crouch: false, jumpRequested: false }, 1, WORLD_WIDTH);

    expect(state.x).toBe(startX);
  });

  it('AC-4: гашение детерминировано на нескольких последовательных кадрах подряд', () => {
    const state = createFrogState(WORLD_WIDTH);
    const startX = state.x;

    for (let i = 0; i < 5; i += 1) {
      updateFrog(state, { moveLeft: true, moveRight: true, crouch: false, jumpRequested: false }, 1 / 60, WORLD_WIDTH);
    }

    expect(state.x).toBe(startX);
  });
});

// Примечание T003 (plan.md §«game/frog.ts» п.2, каскадный порядок): в одном вызове updateFrog
// старт прыжка ("а") и накопление jumpElapsedSeconds ("б") происходят каскадно, а не как
// взаимоисключающие ветки. Из-за этого на кадре старта jumpElapsedSeconds по итогу вызова
// равен переданному deltaTime, а не строго 0. Тесты ниже намеренно не проверяют
// "jumpElapsedSeconds === 0 сразу после старта" — вместо этого они оперируют суммарным
// прошедшим временем (deltaTime, накопленным за вызовы), что и требует AC-6.
describe('прыжок (AC-5..AC-9, AC-14)', () => {
  it('AC-5: нажатие пробела без стрелок запускает прыжок — isAirborne становится true, а jumpOffsetY сразу больше 0 (без телепорта)', () => {
    const state = createFrogState(WORLD_WIDTH);
    const dt = JUMP_DURATION_S / 10;

    updateFrog(state, { moveLeft: false, moveRight: false, crouch: false, jumpRequested: true }, dt, WORLD_WIDTH);

    expect(state.isAirborne).toBe(true);
    expect(state.jumpOffsetY).toBeGreaterThan(0);
  });

  it('AC-5: параболическая дуга возвращает jumpOffsetY ровно к 0 и приземляет лягушку к концу JUMP_DURATION_S', () => {
    const state = createFrogState(WORLD_WIDTH);
    const steps = 10;
    const dt = JUMP_DURATION_S / steps;

    updateFrog(state, { moveLeft: false, moveRight: false, crouch: false, jumpRequested: true }, dt, WORLD_WIDTH);
    for (let i = 1; i < steps; i += 1) {
      updateFrog(state, { moveLeft: false, moveRight: false, crouch: false, jumpRequested: false }, dt, WORLD_WIDTH);
    }

    expect(state.isAirborne).toBe(false);
    expect(state.jumpOffsetY).toBe(0);
    expect(state.jumpElapsedSeconds).toBe(0);
  });

  it('AC-5: смещение плавно растёт до середины дуги и затем убывает к 0 — без телепорта в верхнюю точку и обратно', () => {
    const state = createFrogState(WORLD_WIDTH);
    const steps = 10;
    const dt = JUMP_DURATION_S / steps;
    const offsets: number[] = [];

    updateFrog(state, { moveLeft: false, moveRight: false, crouch: false, jumpRequested: true }, dt, WORLD_WIDTH);
    offsets.push(state.jumpOffsetY);
    for (let i = 1; i < steps; i += 1) {
      updateFrog(state, { moveLeft: false, moveRight: false, crouch: false, jumpRequested: false }, dt, WORLD_WIDTH);
      offsets.push(state.jumpOffsetY);
    }

    const peakIndex = offsets.indexOf(Math.max(...offsets));
    for (let i = 1; i <= peakIndex; i += 1) {
      expect(offsets[i]).toBeGreaterThanOrEqual(offsets[i - 1]);
    }
    for (let i = peakIndex + 1; i < offsets.length; i += 1) {
      expect(offsets[i]).toBeLessThanOrEqual(offsets[i - 1]);
    }
    expect(offsets[offsets.length - 1]).toBe(0);
  });

  it('AC-5: пик дуги (fraction = 0.5) обычного прыжка равен activeJumpHeightPx (= JUMP_HEIGHT_PX вне приседа)', () => {
    const state = createFrogState(WORLD_WIDTH);
    // каскадный порядок (plan.md): один вызов со start + продолжение тем же кадром даёт
    // jumpElapsedSeconds === dt после вызова, поэтому для fraction=0.5 достаточно dt = JUMP_DURATION_S/2.
    const dt = JUMP_DURATION_S / 2;

    updateFrog(state, { moveLeft: false, moveRight: false, crouch: false, jumpRequested: true }, dt, WORLD_WIDTH);

    expect(state.jumpOffsetY).toBeCloseTo(JUMP_HEIGHT_PX, 5);
  });

  it('AC-6: тот же суммарный deltaTime даёт тот же jumpOffsetY независимо от числа шагов (FPS-независимость)', () => {
    const targetElapsed = JUMP_DURATION_S * 0.4;

    const fewSteps = createFrogState(WORLD_WIDTH);
    updateFrog(fewSteps, { moveLeft: false, moveRight: false, crouch: false, jumpRequested: true }, targetElapsed, WORLD_WIDTH);

    const manySteps = createFrogState(WORLD_WIDTH);
    const stepCount = 8;
    const dt = targetElapsed / stepCount;
    updateFrog(manySteps, { moveLeft: false, moveRight: false, crouch: false, jumpRequested: true }, dt, WORLD_WIDTH);
    for (let i = 1; i < stepCount; i += 1) {
      updateFrog(manySteps, { moveLeft: false, moveRight: false, crouch: false, jumpRequested: false }, dt, WORLD_WIDTH);
    }

    expect(fewSteps.jumpElapsedSeconds).toBeCloseTo(manySteps.jumpElapsedSeconds, 10);
    expect(fewSteps.jumpOffsetY).toBeCloseTo(manySteps.jumpOffsetY, 10);
  });

  it('AC-7: повторный jumpRequested во время isAirborne не меняет траекторию — идентична одиночному нажатию (без сброса/повторного старта)', () => {
    const dt = JUMP_DURATION_S / 10;
    const singlePress = createFrogState(WORLD_WIDTH);
    const spammedPress = createFrogState(WORLD_WIDTH);

    updateFrog(singlePress, { moveLeft: false, moveRight: false, crouch: false, jumpRequested: true }, dt, WORLD_WIDTH);
    updateFrog(spammedPress, { moveLeft: false, moveRight: false, crouch: false, jumpRequested: true }, dt, WORLD_WIDTH);

    for (let i = 0; i < 5; i += 1) {
      updateFrog(singlePress, { moveLeft: false, moveRight: false, crouch: false, jumpRequested: false }, dt, WORLD_WIDTH);
      // спам пробела в воздухе — по AC-7 не должен запускать новый прыжок/сбрасывать текущий
      updateFrog(spammedPress, { moveLeft: false, moveRight: false, crouch: false, jumpRequested: true }, dt, WORLD_WIDTH);
    }

    expect(spammedPress.isAirborne).toBe(true);
    expect(spammedPress.jumpElapsedSeconds).toBeCloseTo(singlePress.jumpElapsedSeconds, 10);
    expect(spammedPress.jumpOffsetY).toBeCloseTo(singlePress.jumpOffsetY, 10);
    expect(spammedPress.activeJumpHeightPx).toBe(singlePress.activeJumpHeightPx);
  });

  it('AC-7: приземление доступно только после isAirborne === false — до этого следующий прыжок не начинается заново', () => {
    const state = createFrogState(WORLD_WIDTH);
    const dt = JUMP_DURATION_S / 10;

    updateFrog(state, { moveLeft: false, moveRight: false, crouch: false, jumpRequested: true }, dt, WORLD_WIDTH);
    // спамим jumpRequested до самого приземления
    for (let i = 1; i < 10; i += 1) {
      updateFrog(state, { moveLeft: false, moveRight: false, crouch: false, jumpRequested: true }, dt, WORLD_WIDTH);
    }

    expect(state.isAirborne).toBe(false);
    expect(state.jumpOffsetY).toBe(0);
  });

  // Добавлено tester-ом: AC-7 явно требует, чтобы следующий прыжок был
  // ДОСТУПЕН именно после приземления (а не заблокирован навсегда защитой
  // от двойного прыжка). Существующий тест выше проверяет только запрет во
  // время полёта, но не восстановление доступности после посадки.
  it('AC-7: после приземления новый jumpRequested снова запускает прыжок (доступность прыжка восстанавливается, а не блокируется навсегда)', () => {
    const state = createFrogState(WORLD_WIDTH);
    const dt = JUMP_DURATION_S / 10;

    updateFrog(state, { moveLeft: false, moveRight: false, crouch: false, jumpRequested: true }, dt, WORLD_WIDTH);
    for (let i = 1; i < 10; i += 1) {
      updateFrog(state, { moveLeft: false, moveRight: false, crouch: false, jumpRequested: false }, dt, WORLD_WIDTH);
    }
    expect(state.isAirborne).toBe(false);

    updateFrog(state, { moveLeft: false, moveRight: false, crouch: false, jumpRequested: true }, dt, WORLD_WIDTH);

    expect(state.isAirborne).toBe(true);
    expect(state.jumpOffsetY).toBeGreaterThan(0);
  });

  it('AC-8: боковой прыжок даёт ту же вертикальную дугу, что и вертикальный прыжок, плюс горизонтальное смещение в сторону зажатой стрелки', () => {
    const dt = JUMP_DURATION_S / 10;
    const straightJump = createFrogState(WORLD_WIDTH);
    const sideJump = createFrogState(WORLD_WIDTH);
    const startX = sideJump.x;

    updateFrog(straightJump, { moveLeft: false, moveRight: false, crouch: false, jumpRequested: true }, dt, WORLD_WIDTH);
    updateFrog(sideJump, { moveLeft: false, moveRight: true, crouch: false, jumpRequested: true }, dt, WORLD_WIDTH);

    for (let i = 1; i < 4; i += 1) {
      updateFrog(straightJump, { moveLeft: false, moveRight: false, crouch: false, jumpRequested: false }, dt, WORLD_WIDTH);
      updateFrog(sideJump, { moveLeft: false, moveRight: true, crouch: false, jumpRequested: false }, dt, WORLD_WIDTH);
    }

    // вертикальная составляющая идентична прыжку без стрелки
    expect(sideJump.jumpElapsedSeconds).toBeCloseTo(straightJump.jumpElapsedSeconds, 10);
    expect(sideJump.jumpOffsetY).toBeCloseTo(straightJump.jumpOffsetY, 10);
    // плюс горизонтальное смещение вправо за то же суммарное время (4 вызова по dt)
    expect(sideJump.x - startX).toBeCloseTo(FROG_SPEED_PX_S * (dt * 4), 5);
  });

  it('AC-9: стрелки продолжают управлять x во время полёта, включая упор в правый край worldWidth', () => {
    const state = createFrogState(WORLD_WIDTH);
    const dt = JUMP_DURATION_S / 10;
    state.x = WORLD_WIDTH - FROG_WIDTH_PX - 5;

    updateFrog(state, { moveLeft: false, moveRight: true, crouch: false, jumpRequested: true }, dt, WORLD_WIDTH);
    expect(state.isAirborne).toBe(true);
    expect(state.x).toBe(WORLD_WIDTH - FROG_WIDTH_PX);

    updateFrog(state, { moveLeft: false, moveRight: true, crouch: false, jumpRequested: false }, dt, WORLD_WIDTH);
    expect(state.isAirborne).toBe(true);
    expect(state.x).toBe(WORLD_WIDTH - FROG_WIDTH_PX);

    updateFrog(state, { moveLeft: true, moveRight: false, crouch: false, jumpRequested: false }, dt, WORLD_WIDTH);
    expect(state.isAirborne).toBe(true);
    expect(state.x).toBeCloseTo(WORLD_WIDTH - FROG_WIDTH_PX - FROG_SPEED_PX_S * dt, 5);
  });

  // Тесты ниже добавлены tester-ом (независимая приёмка) — AC-9 явно требует,
  // чтобы в воздухе действовала "та же логика горизонтального перемещения,
  // что и на земле (AC-1, AC-2, AC-3)". Существующий тест AC-9 выше проверяет
  // только продолжение движения и упор в край, но не AC-2 (мгновенная
  // остановка без инерции) и не AC-4 (взаимное гашение) непосредственно во
  // время полёта. Код не содержит отдельной ветки для isAirborne (горизонталь
  // вычисляется безусловно), поэтому по построению эти тесты должны быть
  // зелёными уже сейчас — они лишь делают эту гарантию явной и проверяемой.
  it('AC-9/AC-2: отпускание стрелки во время полёта мгновенно останавливает горизонтальное движение — без инерции', () => {
    const state = createFrogState(WORLD_WIDTH);
    const dt = JUMP_DURATION_S / 10;

    updateFrog(state, { moveLeft: false, moveRight: true, crouch: false, jumpRequested: true }, dt, WORLD_WIDTH);
    expect(state.isAirborne).toBe(true);
    const xAfterMoving = state.x;

    updateFrog(state, { moveLeft: false, moveRight: false, crouch: false, jumpRequested: false }, dt, WORLD_WIDTH);

    expect(state.isAirborne).toBe(true);
    expect(state.x).toBe(xAfterMoving);
  });

  it('AC-9/AC-4: одновременное зажатие обеих стрелок во время полёта взаимно гасит горизонтальное движение', () => {
    const state = createFrogState(WORLD_WIDTH);
    const dt = JUMP_DURATION_S / 10;

    updateFrog(state, { moveLeft: false, moveRight: false, crouch: false, jumpRequested: true }, dt, WORLD_WIDTH);
    expect(state.isAirborne).toBe(true);
    const xAfterStart = state.x;

    updateFrog(state, { moveLeft: true, moveRight: true, crouch: false, jumpRequested: false }, dt, WORLD_WIDTH);

    expect(state.isAirborne).toBe(true);
    expect(state.x).toBe(xAfterStart);
  });

  it('AC-14: прыжок, запрошенный на кадре, где isCrouching === true, стартует так же, как обычный, и в этом же кадре переводит isCrouching в false (Crouching → Airborne)', () => {
    const state = createFrogState(WORLD_WIDTH);
    state.isCrouching = true;

    updateFrog(state, { moveLeft: false, moveRight: false, crouch: true, jumpRequested: true }, 0.01, WORLD_WIDTH);

    expect(state.isAirborne).toBe(true);
    expect(state.isCrouching).toBe(false);
  });

  it('AC-14: пик jumpOffsetY (fraction = 0.5, activeJumpHeightPx) прыжка из приседа строго больше пика обычного прыжка при тех же JUMP_DURATION_S', () => {
    const dt = JUMP_DURATION_S / 2;

    const normalJump = createFrogState(WORLD_WIDTH);
    updateFrog(normalJump, { moveLeft: false, moveRight: false, crouch: false, jumpRequested: true }, dt, WORLD_WIDTH);

    const crouchJump = createFrogState(WORLD_WIDTH);
    crouchJump.isCrouching = true;
    updateFrog(crouchJump, { moveLeft: false, moveRight: false, crouch: true, jumpRequested: true }, dt, WORLD_WIDTH);

    expect(normalJump.jumpOffsetY).toBeCloseTo(JUMP_HEIGHT_PX, 5);
    expect(crouchJump.jumpOffsetY).toBeGreaterThan(normalJump.jumpOffsetY);
  });

  it('AC-14: удержание/отпускание Ctrl во время уже идущего прыжка, запущенного из приседа, не меняет activeJumpHeightPx задним числом', () => {
    const dt = JUMP_DURATION_S / 10;
    const state = createFrogState(WORLD_WIDTH);
    state.isCrouching = true;

    updateFrog(state, { moveLeft: false, moveRight: false, crouch: true, jumpRequested: true }, dt, WORLD_WIDTH);
    const heightFixedAtStart = state.activeJumpHeightPx;

    // отпускание Ctrl в полёте — не должно повлиять на уже зафиксированную высоту
    updateFrog(state, { moveLeft: false, moveRight: false, crouch: false, jumpRequested: false }, dt, WORLD_WIDTH);
    expect(state.activeJumpHeightPx).toBe(heightFixedAtStart);

    // повторное зажатие Ctrl в полёте — тоже не должно повлиять (AC-11: приседание недоступно в воздухе)
    updateFrog(state, { moveLeft: false, moveRight: false, crouch: true, jumpRequested: false }, dt, WORLD_WIDTH);
    expect(state.activeJumpHeightPx).toBe(heightFixedAtStart);
    expect(state.isCrouching).toBe(false);
  });
});

describe('приседание (AC-10, AC-11)', () => {
  it('AC-10: crouch зажат на земле — isCrouching становится true', () => {
    const state = createFrogState(WORLD_WIDTH);

    updateFrog(state, { moveLeft: false, moveRight: false, crouch: true, jumpRequested: false }, 1 / 60, WORLD_WIDTH);

    expect(state.isCrouching).toBe(true);
  });

  it('AC-10: отпускание crouch мгновенно снимает isCrouching — без задержки на следующий кадр', () => {
    const state = createFrogState(WORLD_WIDTH);

    updateFrog(state, { moveLeft: false, moveRight: false, crouch: true, jumpRequested: false }, 1 / 60, WORLD_WIDTH);
    expect(state.isCrouching).toBe(true);

    updateFrog(state, { moveLeft: false, moveRight: false, crouch: false, jumpRequested: false }, 1 / 60, WORLD_WIDTH);

    expect(state.isCrouching).toBe(false);
  });

  it('AC-11: isCrouching остаётся false весь полёт, даже если crouch зажат от старта и до приземления (обычный прыжок, не из приседа)', () => {
    const state = createFrogState(WORLD_WIDTH);
    const steps = 10;
    const dt = JUMP_DURATION_S / steps;

    updateFrog(state, { moveLeft: false, moveRight: false, crouch: false, jumpRequested: true }, dt, WORLD_WIDTH);
    expect(state.isAirborne).toBe(true);

    // T007: проверка ограничена итерациями ДО кадра посадки (steps - 1) — на самой
    // последней итерации происходит приземление, и isCrouching по AC-11 уже должен
    // стать true в том же кадре (см. отдельный тест ниже про восстановление на
    // кадре приземления). Исходная версия проверяла false и на этой итерации тоже,
    // что логически противоречило соседнему тесту — баг теста, найден и исправлен в T007.
    for (let i = 1; i < steps - 1; i += 1) {
      updateFrog(state, { moveLeft: false, moveRight: false, crouch: true, jumpRequested: false }, dt, WORLD_WIDTH);
      expect(state.isCrouching).toBe(false);
    }

    updateFrog(state, { moveLeft: false, moveRight: false, crouch: true, jumpRequested: false }, dt, WORLD_WIDTH);

    expect(state.isAirborne).toBe(false);
  });

  it('AC-11: isCrouching появляется сразу на кадре приземления, если crouch всё ещё зажат', () => {
    const state = createFrogState(WORLD_WIDTH);
    const steps = 10;
    const dt = JUMP_DURATION_S / steps;

    updateFrog(state, { moveLeft: false, moveRight: false, crouch: false, jumpRequested: true }, dt, WORLD_WIDTH);
    for (let i = 1; i < steps; i += 1) {
      updateFrog(state, { moveLeft: false, moveRight: false, crouch: true, jumpRequested: false }, dt, WORLD_WIDTH);
    }

    expect(state.isAirborne).toBe(false);
    expect(state.isCrouching).toBe(true);
  });

  it('AC-11/AC-14: прыжок, начатый из приседа, тоже держит isCrouching в false весь полёт и восстанавливает его сразу после приземления, если crouch зажат', () => {
    const state = createFrogState(WORLD_WIDTH);
    state.isCrouching = true;
    const steps = 10;
    const dt = JUMP_DURATION_S / steps;

    updateFrog(state, { moveLeft: false, moveRight: false, crouch: true, jumpRequested: true }, dt, WORLD_WIDTH);
    expect(state.isAirborne).toBe(true);
    expect(state.isCrouching).toBe(false);

    // T007: тот же off-set-баг, что и в предыдущем тесте выше — цикл ограничен
    // итерациями ДО кадра посадки, сама посадка проверяется отдельным вызовом ниже.
    for (let i = 1; i < steps - 1; i += 1) {
      updateFrog(state, { moveLeft: false, moveRight: false, crouch: true, jumpRequested: false }, dt, WORLD_WIDTH);
      expect(state.isCrouching).toBe(false);
    }

    updateFrog(state, { moveLeft: false, moveRight: false, crouch: true, jumpRequested: false }, dt, WORLD_WIDTH);

    expect(state.isAirborne).toBe(false);
    expect(state.isCrouching).toBe(true);
  });

  it('AC-11: приседание сочетается с горизонтальным движением — moveRight продолжает менять x, пока isCrouching true', () => {
    const state = createFrogState(WORLD_WIDTH);
    const startX = state.x;

    updateFrog(state, { moveLeft: false, moveRight: true, crouch: true, jumpRequested: false }, 1, WORLD_WIDTH);

    expect(state.isCrouching).toBe(true);
    expect(state.x - startX).toBeCloseTo(FROG_SPEED_PX_S, 5);
  });

  it('AC-11: приседание не блокируется и не блокирует moveLeft — движение и присед работают одновременно в обе стороны', () => {
    const state = createFrogState(WORLD_WIDTH);
    const startX = state.x;

    updateFrog(state, { moveLeft: true, moveRight: false, crouch: true, jumpRequested: false }, 1, WORLD_WIDTH);

    expect(state.isCrouching).toBe(true);
    expect(state.x - startX).toBeCloseTo(-FROG_SPEED_PX_S, 5);
  });
});
