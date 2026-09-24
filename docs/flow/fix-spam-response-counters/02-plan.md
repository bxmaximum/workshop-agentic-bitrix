# План: SPAM только из недельного счётчика детали

- **Ветка:** `fix/fix-spam-response-counters`
- **Задача:** ./01-task.md
- **Статус:** утверждён

## 1. Цель

Убрать учёт `STATUS = SPAM` из недельного счётчика детальной страницы вакансии (вариант 1 гейта 1). После фикса у `senior-php-bitrix` «2 отклика» и «2 за неделю»; сайдбар остаётся «7 откликов на 6 вакансий» (уже корректно через `getWeekSummary`). Whitelist `ACCEPTED` не вводить; канон — `whereNot('STATUS', 'SPAM')`.

## 2. Критерии готовности

- [x] `/vacancies/?CODE=senior-php-bitrix` после seed: общий счётчик «2 отклика», недельный «2 за неделю» (не «3»). — Integration зелёный; e2e на шаге 4.
- [ ] `/vacancies/`: сайдбар «За неделю: 7 откликов на 6 вакансий» без изменения логики `SidebarService` / `getWeekSummary`.
- [x] `VacancyResponseRepository::getWeekCount` с `whereNot('STATUS', 'SPAM')`; вызов в `VacancyService` обновлён; метода `getWeekCountIncludingSpam` нет.
- [ ] Новые и обновлённые тесты зелёные: Integration (новый red→green), e2e детальной и сайдбара.
- [ ] Реестр багов и документация обновлены (docs-keeper): §4 и матрица §3 — сайдбар 7 на 6, не 6; детальный счётчик закрыт.

## 3. Файлы

| Файл | Что меняется |
|------|--------------|
| `tests/tests/Integration/VacancyResponseRepositoryTest.php` | **Создать.** Красный Integration-тест: week-count senior без SPAM = 2. |
| `www/local/modules/ws.vacancies/lib/Repository/VacancyResponseRepository.php` | `getWeekCountIncludingSpam` → `getWeekCount` + `whereNot('STATUS', 'SPAM')`; обновить PHPDoc (убрать «баг №2»). |
| `www/local/modules/ws.vacancies/lib/Service/VacancyService.php` | Вызов `$this->responses->getWeekCount($vacancyId)` вместо `getWeekCountIncludingSpam`. |
| `e2e/tests/Browser/VacanciesTest.php` | Детальная: «3 за неделю» → «2 за неделю»; сайдбар: ожидание `7 … на 6` оставить, переименовать тест (убрать «со SPAM» / зафиксировать корректное поведение). |
| `docs/bugfix_plan.md` | **docs-keeper:** §4 и матрица §3 — числа сайдбара 7 на 6; пути `www/local/...`; закрытие детального счётчика. |
| `docs/legacy/vacancies.md` | **docs-keeper (по желанию):** строка бага №2 про сайдбар «вместо 6» — поправить на факт 7 на 6 без SPAM. |

**Не трогать:** `SidebarService.php`, `getWeekSummary()`, seed, `.cursor/agents/reviewer.md`, `.vscode/changelists.json`, `.cursor/commands/flow.md`.

## 4. Шаги

- [x] **Шаг 1.** Красный тест (Integration): создать `tests/tests/Integration/VacancyResponseRepositoryTest.php`. Сьют **Integration**, не Unit: репозиторий ходит в ORM/ядро и seed; Feature/e2e избыточны для первого сигнала. Через `VacancyRepository::getByCode('senior-php-bitrix')` взять ID; вызвать текущий `getWeekCountIncludingSpam` (после шага 2 — `getWeekCount`) и `getValidCountByVacancyId`. Ожидания по seed: valid = 2, week = 2. До фикса week вернёт 3 → тест красный. При необходимости сразу назвать метод в тесте `getWeekCount` и править репозиторий в том же чекпоинте после красного прогона.
- [x] **Шаг 2.** Правка репозитория — `www/local/modules/ws.vacancies/lib/Repository/VacancyResponseRepository.php`: переименовать метод, добавить `->whereNot('STATUS', 'SPAM')` рядом с фильтром по `CREATED`, обновить комментарий.
- [x] **Шаг 3.** Правка сервиса — `www/local/modules/ws.vacancies/lib/Service/VacancyService.php`: заменить вызов на `getWeekCount`.
- [ ] **Коммит:** `fix(vacancies): exclude SPAM from detail week response count`
- [ ] **Шаг 4.** Обновить характеризующие e2e в `e2e/tests/Browser/VacanciesTest.php`:
  - `рассинхрон счётчиков откликов у senior-php (баг №2)` → ожидание `.lv-stats-week` = `2 за неделю` (общий «2 отклика» без изменений); название можно сменить на согласованность счётчиков без рассинхрона.
  - `сайдбар: направления, популярные и сводка со SPAM (баг №2)` → оставить assert `За неделю: 7 откликов на 6 вакансий`; переименовать (например, убрать «со SPAM»), чтобы не требовать ошибочные «6» из реестра.
- [ ] **Коммит:** `test(vacancies): expect spam-free week counters in e2e`

## 5. Проверка

Команды (из `.cursor/skills/project-context/SKILL.md`):

```bash
export PATH="$HOME/Library/Application Support/Omut/bin/php-8.4:$PATH"
export PHPRC="$HOME/Library/Application Support/Omut/configs/php/php-8.4-mysql-8.4.ini"

cd tests && composer test:integration
# при необходимости точечно: ./vendor/bin/pest --test-directory . tests/Integration/VacancyResponseRepositoryTest.php

export PATH="$HOME/Library/Application Support/Omut/bin/shims:$PATH"
cd e2e && ./vendor/bin/pest --filter='баг №2|сводк|рассинхрон|счётчик'
```

Линт затронутых PHP: `.githooks/lib/lint-file.sh www/local/modules/ws.vacancies/lib/Repository/VacancyResponseRepository.php` (и `VacancyService.php`).

Проверка на данных стенда (MCP `bitrix-stand`, после `php docs/legacy/seed.php`):

```sql
-- senior: 3 всего, 1 SPAM; за 7 дней без SPAM = 2
SELECT v.CODE, r.STATUS, COUNT(*) CNT
FROM legacy_vacancy_response r
JOIN b_iblock_element v ON v.ID = r.VACANCY_ID
WHERE v.CODE = 'senior-php-bitrix'
  AND r.CREATED >= NOW() - INTERVAL 7 DAY
GROUP BY v.CODE, r.STATUS;

-- сайдбар без SPAM: 7 откликов, 6 вакансий
SELECT COUNT(*) total, COUNT(DISTINCT VACANCY_ID) vacancies
FROM legacy_vacancy_response
WHERE CREATED >= NOW() - INTERVAL 7 DAY
  AND STATUS <> 'SPAM';
```

Ручная проверка:

- `http://lesson3-copy.bitrix:8765/vacancies/?CODE=senior-php-bitrix` — «2 отклика», «2 за неделю».
- `http://lesson3-copy.bitrix:8765/vacancies/` — «За неделю: 7 откликов на 6 вакансий».

## 6. Риски и откат

| Риск | Что делаем |
|------|------------|
| Реестр и `docs/legacy/vacancies.md` требуют «6» в сайдбаре — путаница при ревью | В этой задаче сайдбар **не** меняем; docs-keeper правит числа на 7 на 6. Не «чинить» сайдбар под ошибочный реестр. |
| Грязная БД стенда без seed даст другие числа | Integration/e2e сами сидят; для MCP/ручной проверки — `php docs/legacy/seed.php`. |
| Поиск по старому имени метода в docs/refactoring_plan.md | Вне scope варианта 1; docs-keeper может упомянуть, implementer не обязан править refactoring_plan. |
| Откат | `git revert` двух коммитов задачи или reset ветки на `lesson5`. |

## 7. Для docs-keeper

- Реестр `docs/bugfix_plan.md`: §4 — проблема/решение только про детальный week-count (3→2); сайдбар уже без SPAM, целевое **7 на 6**, не 6; убрать `ACCEPTED` и несуществующий `getWeekCount` как предпосылку; пути с `www/`. Матрица §3: строка детальной — `2 за неделю`; строка сайдбара — ожидание остаётся `7 … на 6` (или «название/формулировка без „со SPAM“»), **не** «6 на 6». Отметить баг №2 закрытым для детального счётчика.
- `docs/legacy/vacancies.md` (таблица аномалий №2): фраза «вместо 6 валидных» — поправить под 7 на 6.
- `AGENTS.md` / `project-context`: канон «SPAM не в счётчиках» уже верный — **не выдумывать** правки.
- `docs/refactoring_plan.md` (упоминания `getWeekCountIncludingSpam` как намеренного бага) — опционально синхронизировать формулировку, не блокер.

## 8. Прогресс

- Шаги 1–3: красный Integration (`getWeekCount` undefined) → правка repo/service → Integration 4 passed (1 warning в соседнем тесте).
- Коммит 1 — в процессе.
