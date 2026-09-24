# Задача: fix-spam-response-counters

## Настройки flow

| Вопрос | Ответ |
|--------|--------|
| Кто контролирует гейты | Пользователь |
| Что делать по завершении | Оставить в ветке |
| Нужен ли отчёт | Да |

## Постановка

Баг №2 из `docs/bugfix_plan.md` §4: на детальной странице вакансии недельный счётчик откликов учитывает `STATUS = SPAM`, поэтому у `senior-php-bitrix` показывается «2 отклика» и «3 за неделю». По канону модуля (`project-context`, статусы `NEW` / `VIEWED` / `SPAM`) **SPAM не входит ни в один счётчик**.

Общий счётчик (`getValidCountByVacancyId`) и сводка сайдбара (`getWeekSummary`) уже фильтруют `whereNot('STATUS', 'SPAM')`. Чинить нужно только недельный счётчик детали.

## Проверка на стенде (clarifier)

Код (`www/local/modules/ws.vacancies/lib/Repository/VacancyResponseRepository.php`):

- `getValidCountByVacancyId` / `getValidCountMap` / `getWeekSummary` — `whereNot('STATUS', 'SPAM')`.
- `getWeekCountIncludingSpam` — **без** фильтра по статусу; вызывается из `VacancyService` (строка с `$weekCount`).

Seed (`docs/legacy/seed.php`): 12 откликов, 1 SPAM у `senior-php-bitrix` (1 день назад). За неделю при свежем seed:

| Метрика | Со SPAM | Без SPAM |
|---------|---------|----------|
| Сайдбар | 8 на 6 | **7 на 6** |
| Senior за неделю | 3 | **2** |

Стенд на момент уточнения был загрязнён (устаревшие даты); e2e/integration сами перезаливают seed. Ожидаемые числа — из seed, не из «грязной» БД.

Ошибки реестра `docs/bugfix_plan.md` §4 / матрица §3:

- «сайдбар 7→6» неверно; корректно **7 на 6** без SPAM.
- Метода `getWeekCount` ещё нет (есть `getWeekCountIncludingSpam`).
- Статуса `ACCEPTED` в проекте нет.
- Путь указан как `local/...` без `www/`.

e2e `сайдбар: … со SPAM (баг №2)` уже ждёт `7 … на 6` — это поведение **без** спама; матрица «после фикса → 6» ошибочна.

## Решения гейта 1

Человек выбрал **вариант 1**.

## Выбранный вариант

Починить только недельный счётчик детали:

1. В `getWeekCountIncludingSpam` добавить `whereNot('STATUS', 'SPAM')`, переименовать в `getWeekCount`, обновить вызов в `VacancyService`.
2. e2e: «3 за неделю» → «2 за неделю».
3. Сайдбар оставить **7 откликов на 6 вакансий**; поправить название теста и матрицу в реестре (не требовать «6»).
4. `getWeekSummary` / `SidebarService` **не менять**.
5. Whitelist `ACCEPTED` **не вводить**. Канон: `whereNot('STATUS', 'SPAM')`.

## Критерии приёмки

- На `/vacancies/?CODE=senior-php-bitrix` (после seed): «2 отклика» и «2 за неделю».
- На `/vacancies/`: сайдбар «За неделю: 7 откликов на 6 вакансий» без регрессии.
- Метод репозитория называется `getWeekCount`, фильтрует SPAM так же, как остальные агрегаты.
- Integration-тест на week-count для senior красный до фикса, зелёный после; e2e детальной и сайдбара обновлены под корректные ожидания.
- Реестр бага №2 (docs-keeper): сайдбар 7 на 6, не 6; баг закрыт для детального счётчика.
