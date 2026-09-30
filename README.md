# Agentic Bitrix: стенд воркшопа

Репозиторий стенда воркшопа [«Agentic Bitrix: разработка на 1С-Битрикс через AI-агентов»](https://bxmax.ru/workshops/agentic-bitrix), сентябрьский поток 2026 года. Ведёт Кирилл Новожилов. Шесть занятий прошли с 8 по 29 сентября, [запись потока](https://bxmax.ru/workshops/agentic-bitrix-sentyabr-2026) есть на сайте.

Здесь лежит всё, что на занятиях делали агенты: модуль с нуля, рефакторинг легаси-раздела «Вакансии», тесты, ревью, хуки, собственный MCP-сервер, конвейер субагентов и ферма, которая берёт задачи из Telegram. История коммитов идёт по занятиям и шагам, так что по ней можно пройти весь воркшоп заново.

## Как читать историю

```bash
git log --oneline --reverse main
```

Заголовки коммитов в формате `Занятие N · шаг M: …`, в теле написано, что сделали и где смотреть. Шаги сквозные: 1–6 на занятии 3, 7–11 на занятии 4. У занятия 5 вместо шагов блоки, как на слайдах.

| Ветка | Что в ней |
|---|---|
| [`main`](https://github.com/bxmaximum/workshop-agentic-bitrix/tree/main) | всё, последнее состояние |
| [`lesson3`](https://github.com/bxmaximum/workshop-agentic-bitrix/tree/lesson3) … [`lesson6`](https://github.com/bxmaximum/workshop-agentic-bitrix/tree/lesson6) | стенд на конец занятия |
| [`lesson5-flow-bug2`](https://github.com/bxmaximum/workshop-agentic-bitrix/tree/lesson5-flow-bug2) | демо занятия 5: `/flow` в Cursor чинит баг №2 |
| [`lesson6-farm-bug3`](https://github.com/bxmaximum/workshop-agentic-bitrix/tree/lesson6-farm-bug3) | демо занятия 6: ферма без человека чинит баг №3 |

Коммиты в демо-ветках сделали агенты, их сообщения не переписаны.

## Занятия

### 1. Агентное окружение: Cursor + Omut + MCP + skills · 8 сентября

| Коммит | Что сделали |
|---|---|
| [`53390ff`](https://github.com/bxmaximum/workshop-agentic-bitrix/commit/53390ff) | Пак скиллов bitrix-framework-skills в `.agents/skills/`, `AGENTS.md` с канонами D7 |

Отдельной истории занятий 1 и 2 нет: первые три коммита нарезаны из снимка стенда на 15 сентября.

### 2. Новый код: модуль D7 от ТЗ до ревью · 10 сентября

| Коммит | Что сделали |
|---|---|
| [`4c11750`](https://github.com/bxmaximum/workshop-agentic-bitrix/commit/4c11750) | Модуль `ws.faq`: вопросы и ответы с оценкой полезности. Агент писал его по контракту через plan mode и `make:*` |

### 3. Легаси: безопасный рефакторинг спагетти-компонентов · 15 сентября

Ветка [`lesson3`](https://github.com/bxmaximum/workshop-agentic-bitrix/tree/lesson3).

| Коммит | Что сделали |
|---|---|
| [`afb4dba`](https://github.com/bxmaximum/workshop-agentic-bitrix/commit/afb4dba) | Исходное легаси: компонент `legacy:vacancies` на ~670 строк с сырым SQL в шаблоне, `legacy_helpers.php`, эталонные данные `docs/legacy/seed.php` |
| [`6ebee08`](https://github.com/bxmaximum/workshop-agentic-bitrix/commit/6ebee08) | Шаг 1. Слепок поведения: 68 браузерных тестов Pest в `e2e/` фиксируют раздел вместе с багами, описание в `docs/legacy/vacancies.md` |
| [`40b85ee`](https://github.com/bxmaximum/workshop-agentic-bitrix/commit/40b85ee) | Шаг 2. План рефакторинга «баг-в-баг» и реестр 18 багов: `docs/refactoring_plan.md`, `docs/bugfix_plan.md` |
| [`5c442f6`](https://github.com/bxmaximum/workshop-agentic-bitrix/commit/5c442f6) | Шаг 3. Модуль `ws.vacancies`: ORM-таблеты, репозитории, сервисы |
| [`724ece7`](https://github.com/bxmaximum/workshop-agentic-bitrix/commit/724ece7) | Шаг 4. Компонент переведён на сервисы модуля, без `CIBlockElement::GetList` и сырого SQL |
| [`4b5d232`](https://github.com/bxmaximum/workshop-agentic-bitrix/commit/4b5d232) | Шаг 5, после эфира. Контроллеры модуля, тонкий `ajax.php`, `legacy_helpers.php` стал прокси к модулю |
| [`49d7e33`](https://github.com/bxmaximum/workshop-agentic-bitrix/commit/49d7e33) | Шаг 6, после эфира. Тонкий компонент: страницу собирает `VacancyPageService`, в шаблон данные идут через презентер |

### 4. Контроль качества: тесты, агентное ревью, безопасность · 17 сентября

Ветка [`lesson4`](https://github.com/bxmaximum/workshop-agentic-bitrix/tree/lesson4).

| Коммит | Что сделали |
|---|---|
| [`da1ec28`](https://github.com/bxmaximum/workshop-agentic-bitrix/commit/da1ec28) | Шаг 7. Ревью-скилл `bitrix-code-review` и фикс бага №1: сортировка по просмотрам работала внутри страницы. Отчёт ревью в `docs/review/` |
| [`9c2d4e0`](https://github.com/bxmaximum/workshop-agentic-bitrix/commit/9c2d4e0) | Шаг 8. Пирамида тестов в `tests/`: Unit, Integration, Feature |
| [`ab448f9`](https://github.com/bxmaximum/workshop-agentic-bitrix/commit/ab448f9) | Шаг 9. Правки по ревью: тесты на равные просмотры и на вакансию без статистики |
| [`5a3e877`](https://github.com/bxmaximum/workshop-agentic-bitrix/commit/5a3e877) | Шаг 10. Хуки Cursor, git pre-commit и GitHub Actions на общих скриптах `.githooks/lib/` |
| [`33ef676`](https://github.com/bxmaximum/workshop-agentic-bitrix/commit/33ef676) | Шаг 11. Кеш компонента с тегами, персональные данные идут мимо кеша |

### 5. Свои инструменты: скиллы, субагенты, собственный MCP-сервер · 24 сентября

Ветка [`lesson5`](https://github.com/bxmaximum/workshop-agentic-bitrix/tree/lesson5).

| Коммит | Что сделали |
|---|---|
| [`d88f6da`](https://github.com/bxmaximum/workshop-agentic-bitrix/commit/d88f6da) | MCP-сервер `bitrix-stand` на PHP в `mcp/`: опции модулей, инфоблоки, SELECT к базе, только чтение |
| [`cf55258`](https://github.com/bxmaximum/workshop-agentic-bitrix/commit/cf55258) | Проектный скилл `project-context`: предметка, эталонные данные, команды |
| [`0063704`](https://github.com/bxmaximum/workshop-agentic-bitrix/commit/0063704) | Конвейер `/flow`: оркестратор и пять субагентов (clarifier, planner, implementer, reviewer, docs-keeper), три гейта для человека |
| [`5d9d631`](https://github.com/bxmaximum/workshop-agentic-bitrix/commit/5d9d631) | `/init` и субагент `analyzer`: как перенести проектный слой на свой проект |
| [`1ee34a4`](https://github.com/bxmaximum/workshop-agentic-bitrix/commit/1ee34a4) | После эфира: команда `/flow` с настройками запуска (кто закрывает гейты, чем заканчивать, нужен ли отчёт) |

Демо в ветке [`lesson5-flow-bug2`](https://github.com/bxmaximum/workshop-agentic-bitrix/compare/5d9d631...lesson5-flow-bug2): `/flow` в Cursor чинит баг №2, спам в недельном счётчике откликов. Четыре коммита агента, артефакты конвейера в `docs/flow/fix-spam-response-counters/`, включая отчёт для Битрикс24.

### 6. За пределами Cursor: Codex, Claude Code, OpenCode + демо-день · 29 сентября

Ветка [`lesson6`](https://github.com/bxmaximum/workshop-agentic-bitrix/tree/lesson6).

| Коммит | Что сделали |
|---|---|
| [`3e0cfbd`](https://github.com/bxmaximum/workshop-agentic-bitrix/commit/3e0cfbd) | Ферма в `farm/`: постоянная сессия Claude Code принимает задачу из Telegram и запускает headless `claude -p` в репозитории проекта, запуски видны в вебе. Подробности в [`farm/README.md`](farm/README.md) |
| [`20d2118`](https://github.com/bxmaximum/workshop-agentic-bitrix/commit/20d2118) | Починка шага 11: сьюты Integration и Feature вернулись в `tests/` |
| [`32770d2`](https://github.com/bxmaximum/workshop-agentic-bitrix/commit/32770d2) | Конфиг для Claude Code: субагенты и скиллы конвейера переехали в `.claude/`, общие с Cursor, плюс `.mcp.json` |

Демо в ветке [`lesson6-farm-bug3`](https://github.com/bxmaximum/workshop-agentic-bitrix/compare/3e0cfbd...lesson6-farm-bug3): ферма получила задачу из Telegram и без человека провела `/flow` на баге №3, где в «Похожих вакансиях» попадались вакансии из чужого раздела. Семь коммитов агента, решения на гейтах в `docs/flow/bug-3-similar-vacancies/00-state.md`. Конфига `.claude/` тогда ещё не было, и агент прошёл конвейер по `.cursor/commands/flow.md`.

## Что где

| Путь | Что |
|---|---|
| `www/local/modules/ws.faq/` | модуль занятия 2 |
| `www/local/modules/ws.vacancies/` | модуль, в который переехал раздел «Вакансии» |
| `www/local/components/legacy/vacancies/` | компонент раздела, после рефакторинга тонкий |
| `docs/` | описание легаси, план рефакторинга, реестр багов, отчёты ревью |
| `e2e/` | браузерные характеризационные тесты: Pest 5 и Playwright |
| `tests/` | Unit, Integration и Feature на Pest 5 |
| `mcp/` | MCP-сервер `bitrix-stand` |
| `.agents/skills/` | пак скиллов Bitrix и проектные `bitrix-code-review`, `pest-browser-characterization` |
| `.claude/` | субагенты и скиллы конвейера `/flow`, их читают и Cursor, и Claude Code |
| `.cursor/` | подключение MCP, хуки агента, команды `/flow` и `/init` |
| `farm/` | ферма агентов |

## Запуск и проверки

Репозиторий лежит в корне сайта Omut (на занятиях это `~/Omut/workshop.bitrix/`). Ядро Битрикса, база и публичная часть сайта в него не входят. Каноны кода и команды для агентов собраны в [`AGENTS.md`](AGENTS.md).

Git-хуки лежат в `.githooks/`, подключить их нужно один раз после клонирования:

```bash
git config core.hooksPath .githooks
```

После этого `git commit` прогоняет `php -l` по изменённым PHP-файлам и Unit-тесты и отменяет коммит при ошибке. Те же скрипты из `.githooks/lib/` запускают хуки агента Cursor (`.cursor/hooks.json`) и CI (`.github/workflows/ci.yml`). В CI только линт и Unit: остальным сьютам нужны ядро и база.

Тесты модуля (перед первым запуском `cd tests && composer install`):

```bash
export PATH="$HOME/Library/Application Support/Omut/bin/php-8.4:$PATH"
export PHPRC="$HOME/Library/Application Support/Omut/configs/php/php-8.4-mysql-8.4.ini"
cd tests && composer test
```

Сьюты по отдельности: `composer test:unit`, `test:integration`, `test:feature`. Feature ходит на `SITE_URL`, по умолчанию `http://workshop.bitrix`. Integration, Feature и e2e перед прогоном перезаливают данные из `docs/legacy/seed.php`.

Браузерные тесты:

```bash
export PATH="$HOME/Library/Application Support/Omut/bin/shims:$PATH"
cd e2e && ./vendor/bin/pest
```
