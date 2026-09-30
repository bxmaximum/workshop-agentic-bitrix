# Farm — автоферма стенда

Минимальная версия «фермы»: одна постоянная сессия Claude Code принимает задачи из Telegram, находит проект в реестре, запускает в его репозитории отдельного headless-агента и возвращает итог в тот же чат. Ход и результат видны в вебе. Работает под подпиской claude.ai, без API-ключа.

```
iPhone ──Telegram──▶ плагин telegram ──▶ claude (tmux, cwd=farm/, скилл ops)
                                             │
                                             ├─ Projects/registry.md   slug → репо, режим
                                             ├─ bin/farm run <slug> …  claude -p в репо проекта (/flow, гейты: агент)
                                             └─ runs/<run>.json|.err   итог и лог  ──▶ web/server.mjs  http://localhost:4420
```

Два уровня агентов. Сессия фермы ведёт чат на дешёвом effort и код проектов не трогает. Код пишет вложенный `claude -p` на максимальном effort в чужом репозитории, со скиллами, субагентами и MCP того репозитория.

## Установка

1. `brew install tmux`, Node 22+, Claude Code залогинен под подпиской.
2. `claude plugin install telegram@claude-plugins-official`.
3. В `~/.claude/settings.json` плагин должен быть **выключен** глобально: `"enabledPlugins": {"telegram@claude-plugins-official": false}`. Ферма включает его сама через `farm/claude/settings.json`. Иначе любая сессия `claude` на этом Маке, включая вложенный `claude -p`, отберёт у бота поллер.
4. Бот в BotFather. Потом `bin/farm up`, `bin/farm attach`, в сессии один раз: `/telegram:configure <token>`, `bin/farm restart`, написать боту, получить код, `/telegram:access pair <код>`, `/telegram:access policy allowlist`. Выход из tmux: `Ctrl-b d`.
5. `bin/farm doctor` показывает, что настроено.

Модели и порт: `config/farm.env` (пример в `farm.env.example`), без файла работают значения по умолчанию: чат `claude-opus-5-5` / `low`, задачи `claude-opus-5-5` / `xhigh`, веб `4420`.

## Демо

Ферма запущена (`bin/farm up`), веб открыт. С телефона боту:

> Запусти flow на баге №3 в lesson3-copy, гейты агент

Что происходит: скилл `ops` находит `lesson3-copy` в реестре → сессия отвечает «Принял, запускаю…» → в фоне `bin/farm run lesson3-copy "…"` → в репозитории стартует `claude -p "/flow … Гейты: агент"` → в вебе появляется запуск со статусом «идёт» и хвостом лога → через 10–15 минут сессия читает `runs/<run>.json` и присылает итог: ветку, находки ревью, что проверить, стоимость.

Вложенному агенту нужен Claude-Code-конфиг в репозитории проекта: `.claude/skills/flow`, `.claude/agents/`, `.mcp.json`. В стенде он лежит в ветке `lesson6`: субагенты и скиллы `flow`, `project-context` перенесены из `.cursor/` в `.claude/` и общие с Cursor (он читает обе папки), `.mcp.json` рядом с `.cursor/mcp.json`. `AGENTS.md` Claude Code читает сам. Без `flow` агент возьмёт задачу как обычную и сделает её одним контекстом.

## Как устроено

| Путь | Что |
|---|---|
| `CLAUDE.md` | кто такая ферма, правило каналов (отвечать только через `reply`), безопасность |
| `Projects/registry.md` | реестр: slug, репо, режим `flow` или `manual`, статус |
| `claude/skills/ops/SKILL.md` | как принимать задачу, запускать, возвращать итог |
| `claude/settings.json` | плагин Telegram включён, `Bash(*)` разрешён, секреты и push в deny |
| `.claude` | симлинк на `claude/`: Claude Code ищет конфиг там, `bin/farm up` создаёт его сам |
| `bin/farm` | `up`/`down`/`status`/`doctor` и `run <slug> <задача>`: команда `claude -p` со всеми флагами |
| `web/server.mjs` | страница с реестром и запусками, `/api/state`, SSE на `/events`, лог по `/runs/<run>.err` |
| `runs/` | `<run>.meta.json` (кто, что, когда), `.json` (итог `claude -p`), `.err` (лог), `.exit` (код выхода) |
| `config/farm.env` | модели, порт; в `.gitignore` |

`bin/farm run` синхронный: завершается вместе с агентом. Сессия фермы запускает его в фоне и получает уведомление Bash по окончании, поэтому «сообщу по готовности» работает без опроса.

Флаги вложенного агента, из-за которых он вообще работает без человека:

- `--permission-mode dontAsk` плюс `--allowedTools`: кнопок «Разрешить» в headless нет, в `acceptEdits` и `auto` команда вне allow-листа отклоняется молча (Pint, тесты, `docker compose exec` — видно в `permission_denials` в json).
- `--disallowedTools` на push, ssh, деплой, `git reset --hard`, `sudo`, `rm -rf`: это шаги человека.
- `--settings '{"enabledPlugins":{"telegram@claude-plugins-official":false}}'`: иначе вложенный агент заберёт поллер бота, и ферма замолчит до `bin/farm restart`.
- `--allowedTools mcp__<имя>` для каждого сервера из `.mcp.json` репозитория, иначе агент их не увидит. Скрипт берёт имена сам.
- `--max-turns 200`: страховка от зацикливания. `--output-format json`: `result`, `total_cost_usd`, `num_turns`, `is_error`.

## Грабли

- **Поллер Telegram один.** Симптом: ферма перестала отвечать после того, как открыли `claude` в другом терминале. Лечение: закрыть ту сессию, `bin/farm restart`. Профилактика: пункт 3 установки.
- **Папка внутри репозитория.** Claude Code подгружает `CLAUDE.md`/`AGENTS.md` из родительских папок, поэтому сессия фермы видит и правила стенда. На работу не влияет (об этом сказано в `farm/CLAUDE.md`), но занимает контекст. Для боевой фермы папку лучше держать отдельно: `cp -r farm ~/Farm`, всё работает так же, пути в реестре абсолютные.
- **Гейты.** Вложенный агент вопросов задать не может, поэтому `bin/farm run` запускает flow с гейтами-агентом. Для задачи, где выбор варианта стоит денег, скилл `ops` сначала гонит только clarifier и присылает вопросы в чат, потом полный flow с принятыми решениями.
- **Один запуск на проект.** Второй параллельный запуск в том же репозитории будет драться за файлы и ветки. Для параллели нужны worktrees: `claude --worktree`.
- Telegram Bot API не даёт истории: ферма видит только новые сообщения. Веб доступен только в локальной сети без авторизации; с телефона через Tailscale по адресу Мака.
