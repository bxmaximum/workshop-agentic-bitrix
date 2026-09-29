<?php

declare(strict_types=1);

use Bitrix\Main\DI\ServiceLocator;
use Ws\Vacancies\Dto\VacancyDto;
use Ws\Vacancies\Repository\VacancyRepository;
use Ws\Vacancies\Service\VacancyService;

/**
 * Сервис передаёт аргументы в репозиторий: при сдвиге позиционных аргументов
 * (cityId уходит в $limit) у senior-php-bitrix (moscow = 1) вернулась бы 1 карточка вместо 3.
 */
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
