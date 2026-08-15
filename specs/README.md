# Спецификации фич

Каждая фича — отдельная директория `NNN-feature-name/`, созданная командой `/specify`. Нумерация трёхзначная, начинается с `000`.

Внутри директории фичи:

- `spec.md` — что и почему (роль `analyst`), обязателен.
- `plan.md` — как технически (роль `architect`), появляется после `/plan-feature`.
- `tasks.md` — разбивка на задачи (роль `architect`), появляется после `/tasks`.
- `research.md` / `data-model.md` / `quickstart.md` — по необходимости, если `plan.md` на них ссылается.

Полное описание процесса — в [`../docs/sdd-workflow.md`](../docs/sdd-workflow.md).

Первая фича после bootstrap-итерации — `000-project-bootstrap` (скелет Vite + TypeScript + Canvas).
