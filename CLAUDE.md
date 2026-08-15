# CLAUDE.md — контекст проекта «it_is_wensday_my_dude»

Дополняет глобальный `~/.claude/CLAUDE.md`, не дублирует его.

## Что это за проект

Пиксельная браузерная игра про лягушку из мема «it's wednesday my dude» (референс геймплея — офлайн-динозавр Chrome). Игра вторична — первичная цель репозитория — учебный полигон для spec-driven development (SDD) поверх мультиагентной разработки в Claude Code. Подробности — [`docs/sdd-workflow.md`](docs/sdd-workflow.md).

Стек: TypeScript + Vite + HTML5 Canvas, статический бандл, без бэкенда.

Принципы проекта (простота, тестируемость, производительность рендера и т.д.) — источник истины [`.specify/memory/constitution.md`](.specify/memory/constitution.md), не дублируются здесь.

## SDD-команды

`/constitution`, `/specify`, `/clarify`, `/plan-feature`, `/tasks`, `/analyze`, `/implement` — определения в [`.claude/commands/`](.claude/commands/), делегируют субагентам `analyst`/`architect`/`developer`/`tester`/`reviewer` из [`.claude/agents/`](.claude/agents/). Артефакты фичи лежат в `specs/NNN-feature-name/` (`spec.md`, `plan.md`, `tasks.md`).

## Локальные правила git, отличающиеся от типового проекта

- Целевая ветка `/commit` в этом репозитории — **`master`** (не `main`).
- Внутри одной SDD-фичи ветка живёт от `/specify` до конца `/implement`. Промежуточные коммиты — `/commit` с аргументом «только закоммить, не мержи и не пушь». Только финальный коммит `/implement` (после выполнения Definition of Done) — обычный `/commit`, мержащий в `master`.
- Субагенты (`analyst`/`architect`/`developer`/`tester`/`reviewer`) никогда не выполняют git-команды — branch/commit/push/merge остаются исключительно в основном потоке.

## Что сознательно не зафиксировано здесь

Конкретика стека (test runner, линтер, структура `src/`) не задаётся в этом файле — по принципу «SDD прежде кода» она появится в `plan.md` первой фичи (`specs/000-project-bootstrap`), а не будет предрешена заранее.
