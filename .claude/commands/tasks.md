---
description: Разбить plan.md текущей фичи на нумерованные задачи — делегировать субагенту architect
argument-hint: (аргументы не нужны — команда использует plan.md и spec.md текущей ветки)
---

## Шаги

1. Определи текущую ветку (`git branch --show-current`) — должна быть `feature/NNN-*`. Найди `specs/NNN-feature-name/plan.md` и `spec.md`. Если `plan.md` не найден — сообщи, что сперва нужен `/plan-feature`, и останови выполнение.
2. Вызови subagent `architect` (Agent tool, `subagent_type: "architect"`, foreground) с prompt: пути к `plan.md`, `spec.md`, `.specify/templates/tasks-template.md`, режим «tasks».
3. После завершения — покажи пользователю итоговый `tasks.md`. Убедись на глаз, что у каждой нетривиальной задачи есть ссылка на `AC-N`.
4. Предложи `/commit` с аргументом «только закоммить, не мержи и не пушь».
5. Напомни, что дальше — `/implement` (или, для дополнительной подстраховки перед реализацией, необязательный `/analyze`).
