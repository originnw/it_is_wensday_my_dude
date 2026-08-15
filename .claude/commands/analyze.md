---
description: Advisory-проверка согласованности spec.md/plan.md/tasks.md/constitution.md текущей фичи через субагента reviewer (режим «документы»). Ничего не блокирует и не правит — только отчёт
argument-hint: (аргументы не нужны)
---

## Шаги

1. Определи текущую ветку (`git branch --show-current`) — должна быть `feature/NNN-*`. Собери пути к `spec.md`, `plan.md`, `tasks.md` этой фичи и к `.specify/memory/constitution.md`. Если какого-то файла нет — сообщи, какой фазы не хватает (не обязательно останавливаться — `/analyze` можно запускать и на неполном наборе, просто отметь это в контексте вызова).
2. Вызови subagent `reviewer` (Agent tool, `subagent_type: "reviewer"`, foreground) с prompt: пути ко всем найденным файлам, режим «документы».
3. `reviewer` вернёт находки через `ReportFindings` — покажи их пользователю как есть, ничего не исправляй автоматически.
4. Это read-only проверка: `/commit` не требуется, если `reviewer` не создавал файл отчёта. Если находки решено зафиксировать отдельным файлом (`specs/NNN/analyze-report.md`) — тогда `/commit` «только закоммить».
