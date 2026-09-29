# План: похожие вакансии только из своего раздела (баг №3)

- **Ветка:** `fix/bug-3-similar-vacancies` (от `lesson5`)
- **Задача:** ./01-task.md
- **Статус:** утверждён (гейт 2, агент, 2026-09-29 — см. `00-state.md`)

## 1. Цель

Убрать из `VacancyRepository::getRelated()` добор похожих вакансий по городу из чужих разделов. Вариант 1 из `01-task.md`: приоритеты 1 и 3а плана, без добора по тегам. «Похожие» — только активные соседи по разделу, свежие первыми. Если соседей меньше `RELATED_COUNT`, показываем сколько есть. До правки возвращаем Integration и Feature в `tests/`, иначе эти сьюты не запускаются и красный тест писать некуда.

## 2. Критерии готовности

- [x] Репозиторий и сервис для support-l1 возвращают ровно `[support-l2, support-lead]`, для support-l2 — `[support-l1, support-lead]`, для support-lead — `[support-l1, support-l2]`.
- [x] Для senior-php-bitrix — ровно `[middle-php-developer, frontend-vue, devops-engineer]`. Для `sectionId = 0` репозиторий возвращает `[]`.
- [x] `/vacancies/?CODE=support-l1`: в блоке «Похожие вакансии» 2 ссылки (support-l2, support-lead), middle-php-developer в блоке нет. `/vacancies/?CODE=support-l2`: 2 ссылки, frontend-vue в блоке нет.
- [x] `composer test:integration` и `test:feature` находят тесты в `tests/Integration` и `tests/Feature`.
- [x] Новые и обновлённые тесты зелёные: Unit, Integration (в том числе новые `getRelated`), Feature, полный e2e после сброса кеша компонента.
- [ ] Реестр багов и документация обновлены (docs-keeper).

## 3. Файлы

| Файл | Что меняется |
|------|--------------|
| `tests/tests/Integration/` → `tests/Integration/` | `git mv`, содержимое не меняется |
| `tests/tests/Feature/` → `tests/Feature/` | `git mv`, содержимое не меняется |
| `tests/Integration/VacancyRepositoryTest.php` | Новый `describe` с тестами `getRelated` на уровне репозитория |
| `tests/Integration/VacancyServiceTest.php` | **Создать.** `VacancyService::getRelated()`: логика плюс передача аргументов из сервиса в репозиторий |
| `www/local/modules/ws.vacancies/lib/Repository/VacancyRepository.php` | `getRelated()`: убрать добор по `CITY.VALUE` и параметр `$cityId`, добавить guard и PHPDoc |
| `www/local/modules/ws.vacancies/lib/Service/VacancyService.php` | `getRelated()`: не передавать `cityId`, вызывать репозиторий именованными аргументами |
| `e2e/tests/Browser/VacanciesTest.php` | Тест `похожие для Поддержки добираются из Разработки (баг №3)` (стр. 449–455): переименовать и переписать по §3 реестра, проверять только блок «Похожие» |
| `docs/bugfix_plan.md`, `.cursor/skills/project-context/SKILL.md`, по желанию `docs/legacy/vacancies.md`, `docs/refactoring_plan.md` | Правит docs-keeper, см. раздел 7 |

**Не трогать:** `template.php` и `class.php` компонента, `SidebarService.php`, `VacancyDto` (поле `cityId` нужно `VacancyPresenter`), `docs/legacy/seed.php`, `tests/phpunit.xml`, `tests/Pest.php`, `.github/workflows/ci.yml`, `.githooks/`. Чужие изменения рабочей копии (`.vscode/changelists.json`, `farm/`) в коммиты не включать: добавлять файлы только поимённо, без `git add -A` и `git commit -a`.

## 4. Шаги

Шаг 1 — подготовка инфраструктуры, а не красный тест: без него Integration не запускается вообще (решение 4 гейта 1).

- [x] **Шаг 1.** Вернуть сьюты на место:
  ```bash
  cd /Users/kirk/Omut/lesson3-copy.bitrix
  git mv tests/tests/Integration tests/Integration
  git mv tests/tests/Feature tests/Feature
  rmdir tests/tests/Unit tests/tests   # остаются пустые неотслеживаемые каталоги
  ```
  Planner проверил: в `VacancyRepositoryTest.php` и `VacanciesPageTest.php` нет `__DIR__` и `dirname()`, перенос ничего не ломает. `tests/Pest.php` считает пути от `tests/` (`__DIR__ . '/../www'`, `dirname(__DIR__) . '/docs/legacy/seed.php'`) и остаётся верным. Проверка на базе, до правки бага: `composer test:integration` — 4 теста зелёные («инфоблок найден», «активных 14», два теста `sort=views`). `SITE_URL=http://lesson3-copy.bitrix:8765 composer test:feature` — 2 зелёных. Результат записать в «Прогресс». Если что-то из старых тестов красное, попутно не чинить: записать и вернуться к оркестратору. Эти сьюты не запускались с `0a0985f`.
- [x] **Коммит:** `test: вернуть сьюты Integration и Feature в tests/`. В теле: «0a0985f случайно перенёс их в tests/tests/, а phpunit.xml, Pest.php, CI и доки ждут tests/Integration и tests/Feature».

- [x] **Шаг 2.** Красные тесты, сьют **Integration**. Почему не Unit: `VacancyRepository` и `VacancyService` объявлены `final` (подменить их нельзя), конструктор репозитория вызывает `Loader::includeModule('iblock')` и `IblockTable::compileEntity()`, а сам подбор — ORM-запрос к инфоблоку. Без ядра и БД проверять нечего. Feature и e2e для первого сигнала избыточны и зависят от кеша компонента.

  **2a.** В конец `tests/Integration/VacancyRepositoryTest.php` добавить блок. Стиль файла — Pest-замыкания в `describe` с `use`. ID ищутся по коду через `getByCode()`: ID в коде не зашивать. До правки хелпер вызывает текущую сигнатуру с реальным `CITY_ID`, чтобы тест падал на ассерте и воспроизводил баг, а не на `ArgumentCountError`:
  ```php
  describe('getRelated: только свой раздел, без добора по городу', function () {
      /**
       * @return list<string> коды похожих вакансий
       */
      $relatedCodes = static function (string $code, ?int $sectionId = null, int $limit = 3): array {
          $repo = new VacancyRepository();
          $row = $repo->getByCode($code);
          expect($row)->not->toBeNull();

          $rows = $repo->getRelated(
              (int)$row['ID'],
              $sectionId ?? (int)$row['IBLOCK_SECTION_ID'],
              (int)$row['CITY_ID'], // старая сигнатура; в шаге 3 строку удалить
              $limit,
          );

          return array_map(static fn(array $item): string => (string)$item['CODE'], $rows);
      };

      test('у вакансий «Поддержки» только соседи по разделу', function (string $code, array $expected) use ($relatedCodes) {
          expect($relatedCodes($code))->toBe($expected);
      })->with([
          'support-l1' => ['support-l1', ['support-l2', 'support-lead']],
          'support-l2' => ['support-l2', ['support-l1', 'support-lead']],
          'support-lead' => ['support-lead', ['support-l1', 'support-l2']],
      ]);

      test('у senior-php-bitrix три соседа из «Разработки» без неё самой', function () use ($relatedCodes) {
          expect($relatedCodes('senior-php-bitrix'))
              ->toBe(['middle-php-developer', 'frontend-vue', 'devops-engineer']);
      });

      test('без раздела похожих нет', function () use ($relatedCodes) {
          expect($relatedCodes('senior-php-bitrix', sectionId: 0))->toBe([]);
      });
  });
  ```
  **2b.** Создать `tests/Integration/VacancyServiceTest.php` (`declare(strict_types=1)`, как в соседнем файле). Зачем тест сервиса: PHP молча отбрасывает лишние позиционные аргументы. Если репозиторий поменяли, а сервис продолжает передавать `cityId`, то в `$limit` уйдёт ID города. У senior-php-bitrix (moscow = 1) вернётся 1 карточка вместо 3, а у «Поддержки» (remote = 3) ошибку не видно. Тест на senior-php-bitrix ловит этот сдвиг.
  ```php
  use Bitrix\Main\DI\ServiceLocator;
  use Ws\Vacancies\Dto\VacancyDto;
  use Ws\Vacancies\Repository\VacancyRepository;
  use Ws\Vacancies\Service\VacancyService;

  describe('VacancyService::getRelated', function () {
      /**
       * @return list<string>
       */
      $relatedCodes = static function (string $code, int $limit = 3): array {
          $row = (new VacancyRepository())->getByCode($code);
          expect($row)->not->toBeNull();

          // $row и как properties: cityId берётся из CITY_ID, как у DTO детальной страницы
          $vacancy = VacancyDto::fromRow($row, $row);
          $items = ServiceLocator::getInstance()->get(VacancyService::class)->getRelated($vacancy, $limit);

          return array_map(static fn(VacancyDto $item): string => $item->code, $items);
      };

      test('support-l1: только вакансии «Поддержки»', function () use ($relatedCodes) {
          expect($relatedCodes('support-l1'))->toBe(['support-l2', 'support-lead']);
      });

      test('senior-php-bitrix: ровно RELATED_COUNT соседей из «Разработки»', function () use ($relatedCodes) {
          expect($relatedCodes('senior-php-bitrix'))
              ->toBe(['middle-php-developer', 'frontend-vue', 'devops-engineer']);
      });
  });
  ```
  DTO собирать через `VacancyDto::fromRow()`, а не через `getDetail()`. `getDetail()` зовёт `FavoriteService::isFavorite()`, которому в CLI нужна сессия, и на GET увеличивает просмотры. `ServiceLocator` автоматически собирает незарегистрированные классы, так же сервисы получает компонент (`class.php`, стр. 79–84). Если в CLI автосборка не сработает, собрать вручную: `new VacancyService(new VacancyRepository(), new VacancyStatRepository(), new VacancyResponseRepository(), new FavoriteService(new VacancyRepository()))`.

  **Запуск:** `composer test:integration`. Ожидаемо красные 5 тестов: 3 случая «Поддержки» (лишние middle-php-developer / frontend-vue / senior-php-bitrix), «без раздела» (вернёт 3 московские вакансии по городу) и «support-l1» в сервисе. Зелёными остаются senior-php-bitrix в обоих файлах и 4 старых теста. Вывод записать в «Прогресс».

- [x] **Шаг 3.** Правка — `www/local/modules/ws.vacancies/lib/Repository/VacancyRepository.php`, метод `getRelated()` (стр. 164–207). Стиль файла: табы, фигурные скобки на новой строке.
  ```php
  /**
   * Похожие: активные вакансии того же раздела без текущей, свежие первыми.
   * Соседей меньше $limit — отдаём сколько есть; из чужих разделов не добираем (баг №3).
   *
   * @return list<array<string, mixed>>
   */
  public function getRelated(int $vacancyId, int $sectionId, int $limit): array
  {
      if ($sectionId <= 0 || $limit <= 0)
      {
          return [];
      }
      // один запрос: baseActiveQuery() + IBLOCK_SECTION_ID + whereNot ID
      // + ACTIVE_FROM DESC, ID DESC + setLimit($limit), как сейчас в шаге 1
      // $excludeIds и весь блок добора по CITY.VALUE удалить
  }
  ```
  `www/local/modules/ws.vacancies/lib/Service/VacancyService.php`, стр. 149–154: `$this->vacancies->getRelated(vacancyId: $vacancy->id, sectionId: $vacancy->sectionId, limit: $limit)`. С именованными аргументами несовпадение сигнатур падает с ошибкой, а не сдвигает аргументы молча. В хелпере `tests/Integration/VacancyRepositoryTest.php` удалить строку с `CITY_ID`.
  Линт: `.githooks/lib/lint-file.sh www/local/modules/ws.vacancies/lib/Repository/VacancyRepository.php www/local/modules/ws.vacancies/lib/Service/VacancyService.php tests/Integration/VacancyRepositoryTest.php tests/Integration/VacancyServiceTest.php`.
  `composer test:unit` и `composer test:integration` — всё зелёное: 11 Integration (4 старых, 3 случая из датасета, 2 в репозитории, 2 в сервисе). Сбросить кеш компонента (раздел 5), затем `SITE_URL=http://lesson3-copy.bitrix:8765 composer test:feature` — 2 зелёных.
- [x] **Коммит:** `fix(vacancies): похожие вакансии только из своего раздела`. В теле: убран добор по CITY_ID, параметр $cityId удалён; при нехватке соседей блок показывает сколько есть; добор по тегам сознательно не делали (см. 01-task.md). В коммит входят оба PHP-файла модуля и оба файла тестов.

- [x] **Шаг 4.** Обновить характеризующий e2e — `e2e/tests/Browser/VacanciesTest.php`, стр. 449–455. Название — без «(баг №N)», как при исправлении бага №1 в `bd0043a` («по просмотрам сортирует глобально до пагинации»). Проверки по всей странице (`assertSourceHas/Missing`) для отрицательных случаев не годятся: в «Популярных» на support-l2 есть frontend-vue, на support-lead — senior-php-bitrix. Поэтому все проверки ограничены блоком «Похожие». Это первый `div.lv-box` в `aside.lv-side` (`template.php`, стр. 131–144), якорь — его `h3`. В Pest Browser v5.0.1 (`e2e/vendor/pestphp/pest-plugin-browser`) для этого есть `assertSeeIn`, `assertDontSeeIn`, `assertCount`, `assertSourceInHas` и `assertSourceInMissing` (innerHTML элемента). Локатор работает в strict-режиме, селектор должен давать ровно один элемент — `.lv-side > .lv-box:first-child` даёт.
  ```php
  test('похожие для Поддержки только из своего раздела', function () {
      $related = '.lv-side > .lv-box:first-child';

      visit(site('/vacancies/?CODE=support-l1'))
          ->assertSeeIn($related . ' h3', 'Похожие вакансии')
          ->assertCount($related . ' li', 2)
          ->assertSourceInHas($related, '?CODE=support-l2">Инженер поддержки (2-я линия, Битрикс)')
          ->assertSourceInHas($related, '?CODE=support-lead">Руководитель поддержки')
          ->assertSourceInMissing($related, '?CODE=middle-php-developer"');

      // frontend-vue есть в «Популярных» этой страницы — поэтому проверка только внутри «Похожих»
      visit(site('/vacancies/?CODE=support-l2'))
          ->assertSeeIn($related . ' h3', 'Похожие вакансии')
          ->assertCount($related . ' li', 2)
          ->assertSourceInHas($related, '?CODE=support-l1">Специалист техподдержки (1-я линия)')
          ->assertSourceInHas($related, '?CODE=support-lead">Руководитель поддержки')
          ->assertSourceInMissing($related, '?CODE=frontend-vue"');
  });
  ```
  support-l2 добавлен сознательно: это случай, где проверка по всей странице дала бы ложное падение, так что проверка внутри блока здесь действительно нужна. support-lead покрыт Integration-тестами, третий визит в e2e избыточен. Соседние тесты остаются без изменений (проверено): «популярные на детальной исключают текущую» (стр. 457–465) и «сайдбар детальной без «Направления» и «Сводка» (баг №16)» (стр. 467–473). У senior-php-bitrix после правки по-прежнему 3 «Похожих», блок есть. Лишние просмотры от визитов (баг №13) порядок «Популярных» не меняют: разрывы 120 → 70 → 41.
  Прогон: сбросить кеш, затем полный e2e (раздел 5). Для точечной проверки: `php ./vendor/bin/pest --filter='похожие|сайдбар детальной|популярные на детальной'`.
- [x] **Коммит:** `test(vacancies): e2e похожих — только вакансии своего раздела`.

- [ ] **Шаг 5.** docs-keeper по разделу 7. Отдельный коммит `docs(vacancies): …` делает он, не implementer.

## 5. Проверка

Команды (`project-context`, PHP для ядра — Omut php-8.4 с ini):

```bash
cd /Users/kirk/Omut/lesson3-copy.bitrix
export PATH="$HOME/Library/Application Support/Omut/bin/php-8.4:$PATH"
export PHPRC="$HOME/Library/Application Support/Omut/configs/php/php-8.4-mysql-8.4.ini"

(cd tests && composer test:unit)
(cd tests && composer test:integration)                  # сам перезаливает seed
rm -rf www/bitrix/cache/s1/legacy/vacancies               # сброс кеша компонента, см. ниже
(cd tests && SITE_URL=http://lesson3-copy.bitrix:8765 composer test:feature)
(cd e2e && php ./vendor/bin/pest)                         # браузер, сам перезаливает seed
```

- **Кеш компонента.** `www/vacancies/index.php` включает `CACHE_TYPE=A` и `CACHE_TIME=3600`, тег `ws_vacancies`, тип кеша `files` (`www/bitrix/.settings.php`). Файлы лежат в `www/bitrix/cache/s1/legacy/vacancies/`. Сброса кеша нет ни в `docs/legacy/seed.php`, ни в `e2e/tests/Pest.php` (`seedSite()` только запускает seed), ни в `tests/Pest.php`. Кеш нужно чистить после правки кода и перед каждым Feature/e2e, если страницы открывались старым кодом меньше часа назад. Иначе support-l1 покажет закешированные 3 карточки. На стенде достаточно `rm -rf www/bitrix/cache/s1/legacy/vacancies`: строки `b_cache_tag` останутся, но они безвредны. Штатный способ, он же для выкладки: `Application::getInstance()->getTaggedCache()->clearByTag('ws_vacancies')` из скрипта с ядром. Он пишет в `b_cache_tag`, planner его не запускал.
- **e2e и seed.** `seedSite()` в e2e вызывает `php` из `PATH` и проверяет только код выхода. Если `php` не тот (Herd без ini Omut), seed молча завершается с кодом 0, и тесты идут на грязных данных. Вариант с `php-8.4` в `PATH` и `PHPRC` работает независимо от шима. Шим из `project-context` (`export PATH="$HOME/Library/Application Support/Omut/bin/shims:$PATH"; cd e2e && ./vendor/bin/pest`) сейчас тоже годится: на 2026-09-29 он запускает `php-8.4 -c php-8.4-mysql-8.4.ini`. Запись в памяти о шиме на PHP 8.3 устарела. Контроль, что seed отработал: e2e «сайдбар: … (баг №2)» видит «За неделю: 7 откликов на 6 вакансий». `tests/Pest.php` сам проверяет строку «Готово» в выводе seed.
- **Базовый e2e до правки** — по желанию, чтобы отличить старые падения от регрессий. Если его запускали, после шага 3 кеш сбросить обязательно.
- **Данные стенда** (MCP `bitrix-stand` или `StandTools::sqlSelect()`, только чтение, после seed):
  ```sql
  SELECT e.ID, e.CODE, e.ACTIVE_FROM
  FROM b_iblock_element e
  JOIN b_iblock i ON i.ID = e.IBLOCK_ID AND i.CODE = 'VACANCIES'
  WHERE e.ACTIVE = 'Y' AND e.IBLOCK_SECTION_ID = 3
  ORDER BY e.ACTIVE_FROM DESC, e.ID DESC;
  ```
  Ожидается 12 support-l1, 13 support-l2, 14 support-lead. С `IBLOCK_SECTION_ID = 1`: 1 senior-php-bitrix, 2 middle-php-developer, 3 frontend-vue, 4 devops-engineer, 5 qa-engineer, 6 junior-php, 7 tech-lead.
- **Ручная проверка** (после сброса кеша): `http://lesson3-copy.bitrix:8765/vacancies/?CODE=support-l1`, `?CODE=support-l2`, `?CODE=support-lead` — в «Похожих» по 2 карточки из «Поддержки». `?CODE=senior-php-bitrix` — 3 карточки из «Разработки».

## 6. Риски и откат

| Риск | Что делаем |
|------|------------|
| Устаревший кеш компонента: ложно красный e2e/Feature или старые «Похожие» до часа после выкладки | Сбрасывать кеш по разделу 5. При выкладке — `clearByTag('ws_vacancies')`. Автосброс в seed/e2e — отдельная задача, см. развилки в ответе planner |
| Сервис передаёт `cityId` в новую 3-параметровую сигнатуру: PHP молча отбрасывает лишний аргумент, `$limit` = ID города | Именованные аргументы в сервисе и тест сервиса на senior-php-bitrix (ждёт 3, при сдвиге получит 1) |
| После переноса старые Integration/Feature-тесты окажутся красными (не запускались с `0a0985f`) | Шаг 1 фиксирует результат на базе. Попутно не чинить, вернуться к оркестратору |
| Не влитая ветка `fix/fix-spam-response-counters` (баг №2) создаёт `tests/tests/Integration/VacancyResponseRepositoryTest.php` и правит те же `docs/bugfix_plan.md` (соседний §2 п. 4 и матрица §3), строку «Баг №1 закрыт» в `project-context`, `VacanciesTest.php` (стр. 441–446) и `VacancyService.php` | При слиянии второй ветки проследить, чтобы тест оказался в `tests/Integration/` (конфликт переименования каталога) и разрешить текстовые конфликты в доках. В коде пересечений нет |
| Селектор `.lv-side > .lv-box:first-child` опирается на порядок блоков в шаблоне | Якорь `h3` «Похожие вакансии» даёт понятное падение при смене порядка. Альтернативы: `.lv-side ul` («Похожие» — `<ul>`, «Популярные» — `<ol>`) или класс `lv-related` в шаблоне (вне задачи) |
| `ServiceLocator` в CLI не соберёт `VacancyService` | Собрать вручную (шаг 2b) |
| Откат | `git revert` коммитов шагов 3 и 4. Коммит шага 1 независим, его оставить |

## 7. Для docs-keeper

- **Реестр `docs/bugfix_plan.md`**, формат как у закрытого бага №2 в ветке `fix/fix-spam-response-counters`:
  - §2 п. 5: в заголовок добавить «— **закрыто**».
  - «Проблема»: «если у вакансии в её разделе меньше `RELATED_COUNT` (3) соседей» вместо «если в разделе меньше 3 вакансий». Затронуты все три вакансии «Поддержки»: support-l1 → middle-php-developer, support-l2 → frontend-vue, support-lead → senior-php-bitrix, а не только «инженер поддержки».
  - «Решение»: сделано по приоритетам 1 и 3а. Приоритет 2 (теги) сознательно не делали. Обоснование: на эталонных данных он приводит чужой раздел (support-l2 → senior-php-bitrix по тегам bitrix/php/mysql, support-l1 → sales-manager-b2b, support-lead → account-manager; порог «≥ 2 тега» оставляет Senior PHP у support-l2) и противоречит приоритету 3 и §3. Блок «Другие вакансии в вашем городе» не делали: у сайта есть город вакансии, а не пользователя; это новая UI-фича, пересекается с багом №16.
  - «Затрагиваемые файлы»: пути с `www/`, плюс тесты `tests/Integration/VacancyRepositoryTest.php` и `tests/Integration/VacancyServiceTest.php`.
  - §3, строка бага №3: `похожие для Поддержки только из своего раздела` (ранее `… добираются из Разработки (баг №3)`). Проверяет в блоке «Похожие»: у support-l1 — support-l2 и support-lead, 2 карточки, без middle-php-developer; у support-l2 — без frontend-vue. **Закрыто.**
  - §5 «План развёртывания»: после выкладки сбросить кеш компонента (тег `ws_vacancies`).
- **`.cursor/skills/project-context/SKILL.md`**, стр. 30: «Баг №1 закрыт.» → «Баги №1 и №3 закрыты.» (в ветке бага №2 эта строка тоже меняется, будет конфликт). В «Грабли» стоит добавить: кеш компонента (`ws_vacancies`, `www/bitrix/cache/s1/legacy/vacancies/`) seed не сбрасывает, после правки кода чистить его перед Feature/e2e.
- **Пути тестов в доках:** упоминаний `tests/tests` в документации нет (проверено grep). Комментарии «без флага Pest ищет tests/tests/» в `.githooks/lib/unit.sh:19` и `.github/workflows/ci.yml:36` описывают поведение Pest по умолчанию и верны, их не трогать. `AGENTS.md` не меняется.
- **По желанию:** `docs/legacy/vacancies.md` — §5.3 (аномалия «Похожих»), таблица сайдбара «Есть (3 вакансии)», строка 3 таблицы аномалий: пометить, что исправлено, у «Поддержки» теперь 2 карточки. `docs/refactoring_plan.md`, стр. 35 и 297–299: там `getRelated` описан с `$cityId` «сохраняя баг №3» — исторический план, можно добавить пометку.

## 8. Прогресс

PHP для всех прогонов: Omut php-8.4 (8.4.25) + `PHPRC=php-8.4-mysql-8.4.ini`.

### Шаг 1 — сьюты на месте (база, до правки)

- `git mv tests/tests/{Integration,Feature} tests/`, пустые `tests/tests/Unit` и `tests/tests` удалены.
- `composer test:unit` — **9 passed**, 0 failed.
- `composer test:integration` — **3 passed + 1 warning**, 0 failed, код выхода 0. Warning в первом тесте («инфоблок «Вакансии» найден»): `Entity \Bitrix\Iblock\Elements\ElementVacancy already has Field with name TAGS` (E_USER_WARNING из `IblockTable::compileEntity()`, ядро `main/lib/ORM/Entity.php:465`). Свойство инфоблока `TAGS` совпадает по имени с полем `TAGS` элемента, предупреждение возникает при первой компиляции сущности в процессе. Ассерты теста выполняются, `failOnWarning="false"` в `phpunit.xml`, так что тест не красный. По правилу шага попутно не чиню, это не относится к багу №3.
- `SITE_URL=http://lesson3-copy.bitrix:8765 composer test:feature` — **2 passed**, 0 failed.
- Коммит `3dc6dbd`.

### Шаг 2 — красные Integration-тесты (до правки)

- Добавлен `describe('getRelated: …')` в `tests/Integration/VacancyRepositoryTest.php`, создан `tests/Integration/VacancyServiceTest.php` — код как в плане.
- `ServiceLocator::getInstance()->get(VacancyService::class)` в CLI собрал сервис автоматически, ручная сборка не понадобилась. `VacancyDto::fromRow($row, $row)` подошёл: сигнатура `fromRow(array $fields, array $properties = [], array $extra = [])`.
- `composer test:integration` — **5 failed, 5 passed + 1 warning** (тот же warning `TAGS`, что на базе). Как и ожидалось по плану:
  - support-l1 → `[support-l2, support-lead, middle-php-developer]`;
  - support-l2 → `[support-l1, support-lead, frontend-vue]`;
  - support-lead → `[support-l1, support-l2, senior-php-bitrix]`;
  - «без раздела» (senior-php-bitrix, `sectionId = 0`) → `[sales-manager-b2b, devops-engineer, tech-lead]` — добор по городу moscow из любых разделов;
  - сервис, support-l1 → `[support-l2, support-lead, middle-php-developer]`.
  - Зелёные: senior-php-bitrix в репозитории и сервисе, 4 старых теста (первый с warning).

### Шаг 3 — правка

- `VacancyRepository::getRelated(int $vacancyId, int $sectionId, int $limit)`: guard `$sectionId <= 0 || $limit <= 0 → []`, один запрос по разделу, добор по `CITY.VALUE` и `$excludeIds` удалены, PHPDoc добавлен. `VacancyService::getRelated()` вызывает репозиторий именованными аргументами без `cityId`. Строка с `CITY_ID` в хелпере теста удалена. Других вызовов репозиторного `getRelated` нет (grep по `www/local`, `tests/`, `e2e/tests`).
- Линт `.githooks/lib/lint-file.sh` на 4 файла — без ошибок.
- `composer test:unit` — **9 passed**, 0 failed.
- `composer test:integration` — **10 passed + 1 warning**, 0 failed (тот же warning `TAGS` в первом старом тесте).
- Сброс кеша компонента, затем `SITE_URL=http://lesson3-copy.bitrix:8765 composer test:feature` — **2 passed**, 0 failed. Ручная проверка `curl …/vacancies/?CODE=support-l1`: в «Похожих» support-l2 и support-lead, 2 карточки.
- **Отклонение 1 (счёт тестов).** В плане ожидалось «11 Integration (4 старых, 3 случая из датасета, 2 в репозитории, 2 в сервисе)», по факту 4 + 3 + 2 + 2 = 11 тестов, из них 10 passed + 1 passed-with-warning. Pest считает warning отдельно от passed, отсюда «10 passed, 1 warning». Ничего не упало.
- **Отклонение 2 (сброс кеша).** `rm -rf www/bitrix/cache/s1/legacy/vacancies` в этой сессии не разрешён системой прав (неинтерактивный режим). Кеш сбрасывал штатным способом из раздела 5: `Application::getInstance()->getTaggedCache()->clearByTag('ws_vacancies')` через `php -r` с ядром (bootstrap как в `seed.php`). Файловый кеш Bitrix при этом не удаляет файлы сразу, а переименовывает каталог (`cd2` → `cd2.~NNNNNN`) под отложенное удаление агентом `cacheCleanJob`: по старому пути кеш больше не читается, эффект тот же. Побочный эффект — запись в `b_cache_tag`, безвредно.
- Коммит `74e3f2e`.

### Шаг 4 — e2e

- Тест переименован в `похожие для Поддержки только из своего раздела` и переписан по плану: проверки ограничены блоком `.lv-side > .lv-box:first-child`, support-l1 и support-l2. Селектор в strict-режиме сработал, запасные варианты не понадобились.
- Сброс кеша (`clearByTag`), затем `php ./vendor/bin/pest --filter='похожие|сайдбар детальной|популярные на детальной'` — **3 passed** (20 assertions), 0 failed.
- Сброс кеша, затем полный e2e `cd e2e && php ./vendor/bin/pest` (php-8.4 + PHPRC в PATH) — **68 passed** (251 assertions), 0 failed, код выхода 0, 14.8 с. Контроль seed: «сайдбар: направления, популярные и сводка со SPAM (баг №2)» с «За неделю: 7 откликов на 6 вакансий» зелёный.
- Падений нет, прогон на коммите шага 1 для сравнения не понадобился.

### Итог по сьютам

| Сьют | База (после шага 1) | До правки (шаг 2) | После правки (шаги 3–4) |
|------|---------------------|-------------------|--------------------------|
| Unit | 9 passed | — | 9 passed |
| Integration | 3 passed + 1 warning | 5 failed, 5 passed + 1 warning | 10 passed + 1 warning, 0 failed |
| Feature | 2 passed | — | 2 passed |
| e2e (полный) | не запускался | — | 68 passed, 0 failed |

Warning в Integration на всех прогонах один и тот же (`TAGS` в `compileEntity`), он был до задачи и к ней не относится.
