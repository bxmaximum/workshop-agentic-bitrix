# Задача: bug-3-similar-vacancies

## Настройки flow

| Вопрос | Ответ |
|--------|-------|
| Кто проходит гейты | Агент (решения и обоснования — в `00-state.md`) |
| Что делать по завершении | Оставить в ветке `fix/bug-3-similar-vacancies`, без push, PR и мерджа |
| Отчёт для Битрикс24 | Нет |
| База | `lesson5` |

## Постановка

Баг №3 из `docs/bugfix_plan.md` (§2, п. 5): у детальной страницы вакансии в блоке «Похожие вакансии» (`RELATED_COUNT = 3`) появляются вакансии из чужого раздела. Если у вакансии в её разделе меньше трёх соседей, `VacancyRepository::getRelated()` добирает недостающие карточки из любого раздела по совпадению города (`CITY.VALUE`). Поэтому у инженера поддержки в «Похожих» оказывается PHP-разработчик.

Критерий готовности от пользователя: логика подбора похожих исправлена по плану, тесты проходят.

## Где живёт логика

- `www/local/modules/ws.vacancies/lib/Repository/VacancyRepository.php`, `getRelated(int $vacancyId, int $sectionId, int $cityId, int $limit)` (стр. 164–207). Шаг 1: активные вакансии того же раздела без текущей, `ACTIVE_FROM DESC, ID DESC`, лимит `$limit`. Шаг 2: если набралось меньше `$limit` и `$cityId > 0`, добор по `CITY.VALUE = $cityId` из любых разделов без уже выбранных.
- `www/local/modules/ws.vacancies/lib/Service/VacancyService.php`, `getRelated(VacancyDto $vacancy, int $limit, string $baseUrl)` (стр. 147–175): передаёт в репозиторий `id`, `sectionId`, `cityId`, `limit`.
- Цепочка вызова: компонент `legacy:vacancies` (`class.php` → `arResult['RELATED']`) → `VacancyPageService::detailPage()` → `SidebarService::getForDetail()` → `VacancyService::getRelated()` → `VacancyRepository::getRelated()`.
- Других вызовов `getRelated` нет: grep по `www/local`, `tests/`, `e2e/` находит только эти два метода и вызов в `SidebarService`. Тестов на `getRelated` сейчас нет.
- Шаблон: `www/local/components/legacy/vacancies/templates/.default/template.php`, стр. 131–156. «Похожие» — первый `div.lv-box` в `aside.lv-side` со списком `<ul>`, «Популярные» — второй `div.lv-box` со списком `<ol>`. Если «Похожих» нет, блок не выводится.

## Проверка на стенде (clarifier + planner)

Данные совпадают с `docs/legacy/seed.php`. Сверено SQL-запросами только на чтение через `Workshop\Mcp\StandTools::sqlSelect()`.

Активные вакансии по разделам, в порядке `ACTIVE_FROM DESC, ID DESC`:

| Раздел | Вакансии (ID, город) |
|--------|----------------------|
| 1 «Разработка», 7 | senior-php-bitrix (1, moscow), middle-php-developer (2, remote), frontend-vue (3, spb), devops-engineer (4, moscow), qa-engineer (5, remote), junior-php (6, spb), tech-lead (7, moscow) |
| 2 «Продажи», 4 | sales-manager-b2b (8, moscow), account-manager (9, spb), presale-engineer (10, remote), sales-intern (11, moscow) |
| 3 «Поддержка», 3 | support-l1 (12, remote), support-l2 (13, spb), support-lead (14, moscow) |

ID значений списка `CITY`: moscow = 1, spb = 2, remote = 3.

`ACTIVE_FROM` seed ставит как `time() - daysAgo * 86400`. Значения `daysAgo` внутри каждого раздела разные (Поддержка: 4, 8, 16), поэтому порядок в разделе не зависит от времени запуска seed и одинаков при каждом прогоне.

Похожие (`RELATED_COUNT = 3`):

| Вакансия | Сейчас | После правки |
|----------|--------|--------------|
| support-l1 | support-l2, support-lead, **middle-php-developer** | support-l2, support-lead |
| support-l2 | support-l1, support-lead, **frontend-vue** | support-l1, support-lead |
| support-lead | support-l1, support-l2, **senior-php-bitrix** | support-l1, support-l2 |
| senior-php-bitrix | middle-php-developer, frontend-vue, devops-engineer | без изменений |
| sales-manager-b2b | account-manager, presale-engineer, sales-intern | без изменений |

Выводы:

- Баг проявляется у **всех трёх** вакансий «Поддержки», а не только у support-l1, как написано в реестре. Добор включается, когда у вакансии в разделе меньше `RELATED_COUNT` соседей (в «Поддержке» их 2), а не когда «в разделе меньше 3 вакансий».
- «Разработку» и «Продажи» баг не затрагивает: там соседей не меньше трёх.
- Добор по общим тегам (`TAGS`, приоритет 2 плана) на этих данных тоже приводит чужой раздел: support-l2 получает senior-php-bitrix (3 общих тега: bitrix, php, mysql), support-l1 — sales-manager-b2b, support-lead — account-manager. Порог «≥ 2 общих тега» убирает продажи, но Senior PHP у support-l2 остаётся.
- Инфраструктура тестов сломана. Коммит `0a0985f` перенёс `tests/Integration` и `tests/Feature` в `tests/tests/`, а `tests/phpunit.xml` (`<directory>Integration</directory>`), `tests/Pest.php` (`->in('Integration')`, `->in('Feature')`), CI и доки ждут старые пути. `pest --test-directory . --list-tests` падает с `Test directory ".../tests/Integration" not found` и для всего набора, и для `--testsuite Integration`. Unit (9 тестов) проходит, поэтому pre-commit работает.
- Кеш компонента: `CACHE_TIME=3600`, `CACHE_TYPE=A` (`www/vacancies/index.php`), тег `ws_vacancies`, файлы в `www/bitrix/cache/s1/legacy/vacancies/`, тип кеша `files` (`www/bitrix/.settings.php`). Ни seed.php, ни bootstrap тестов (`e2e/tests/Pest.php`, `tests/Pest.php`) кеш не сбрасывают. После правки кода закешированные детальные страницы до часа показывают старые «Похожие».

## Решения гейта 1

Гейт проходит агент. Полные обоснования — в `00-state.md`, таблица «Решения гейта 1».

1. **Приоритет 2 (добор по тегам) не делаем.** На эталонных данных он буквально воспроизводит симптом бага (support-l2 → Senior PHP-разработчик), с порогом и без. Приоритеты 2 и 3 плана здесь противоречат друг другу; выбран тот, что убирает симптом. Отступление от буквы плана docs-keeper записывает в реестр.
2. Порог и порядок для тегов неактуальны, это следует из п. 1.
3. **Приоритет 3: вариант 3а, «только найденные».** Блок «Другие вакансии в вашем городе» не делаем: сайт не знает город пользователя, есть только город вакансии (у support-l1 это «Удалённо»). Такой блок был бы новой UI-фичей, пересекался бы с багом №16 и показывал бы те же чужие профессии под другим заголовком.
4. **Пути тестов чиним отдельным коммитом**: `git mv tests/tests/Integration tests/Integration` и то же для `Feature`. Конфиги под новый путь не правим: `phpunit.xml`, `Pest.php`, CI, `AGENTS.md` и скилл согласованно ждут `tests/Integration`. Перенос в `0a0985f` выглядит случайным: он попал в коммит про кеш компонента, файлы не менялись.

## Выбранный вариант

**Вариант 1: похожие только из своего раздела, без добора.**

1. `VacancyRepository::getRelated()`: убрать шаг 2 (добор по `CITY.VALUE`) и параметр `$cityId`. Новая сигнатура: `getRelated(int $vacancyId, int $sectionId, int $limit): array`. Для `$sectionId <= 0` или `$limit <= 0` метод возвращает `[]`.
2. `VacancyService::getRelated()`: не передавать город, вызывать репозиторий именованными аргументами. Сигнатура сервиса не меняется.
3. Шаблон, компонент, `SidebarService`, `VacancyDto::cityId`, seed не трогаем. Если соседей меньше `RELATED_COUNT`, блок показывает 1–2 карточки. Если соседей нет, блок не выводится: шаблон уже проверяет `!empty($arResult['RELATED'])`.
4. Тесты: Integration на репозиторий и сервис (красные до правки), обновлённый e2e-тест бага №3 по §3 реестра. Отрицательные проверки в e2e ограничены блоком «Похожие»: в «Популярных» на тех же страницах есть senior-php-bitrix, frontend-vue и devops-engineer.

## Критерии приёмки

- `VacancyRepository::getRelated()` и `VacancyService::getRelated()` для support-l1 возвращают ровно `[support-l2, support-lead]`, для support-l2 — `[support-l1, support-lead]`, для support-lead — `[support-l1, support-l2]`.
- Для senior-php-bitrix — ровно `[middle-php-developer, frontend-vue, devops-engineer]`: три карточки, все из «Разработки», без самой вакансии.
- Для `sectionId = 0` репозиторий возвращает `[]`, добора по городу нет.
- На `/vacancies/?CODE=support-l1` в блоке «Похожие вакансии» 2 ссылки (support-l2, support-lead), middle-php-developer в блоке нет. На `/vacancies/?CODE=support-l2` в блоке 2 ссылки, frontend-vue в блоке нет.
- `composer test:unit`, `composer test:integration`, `composer test:feature` находят свои тесты и проходят. Полный e2e проходит после сброса кеша компонента.
- docs-keeper обновил реестр: баг №3 закрыт, отступление от приоритета 2 записано с обоснованием, формулировки «меньше 3 вакансий» и «только support-l1» исправлены, строка матрицы §3 обновлена. В `project-context` отмечено закрытие бага №3.
