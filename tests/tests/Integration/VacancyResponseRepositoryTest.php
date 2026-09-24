<?php

declare(strict_types=1);

use Ws\Vacancies\Repository\VacancyRepository;
use Ws\Vacancies\Repository\VacancyResponseRepository;

/**
 * Seed: у senior-php-bitrix 3 отклика за неделю, из них 1 SPAM.
 * Канон: SPAM не входит ни в общий, ни в недельный счётчик.
 */
test('senior-php-bitrix: week-count и valid-count без SPAM', function () {
    $vacancy = (new VacancyRepository())->getByCode('senior-php-bitrix');
    expect($vacancy)->not->toBeNull();

    $vacancyId = (int)$vacancy['ID'];
    $responses = new VacancyResponseRepository();

    expect($responses->getValidCountByVacancyId($vacancyId))->toBe(2)
        ->and($responses->getWeekCount($vacancyId))->toBe(2);
});
