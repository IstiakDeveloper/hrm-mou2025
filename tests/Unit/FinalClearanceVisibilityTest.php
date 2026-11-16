<?php

use App\Models\FinalClearanceSignature;
use App\Services\Appraisal\FinalClearanceVisibility as Visibility;
use Illuminate\Support\Collection;

function clearanceSignatures(bool $withSentBack = false): Collection
{
    $rows = [
        ['user_id' => 10, 'stage' => 'field', 'action' => 'submitted', 'comments' => 'field'],
        ['user_id' => 20, 'stage' => 'hr', 'action' => 'forwarded', 'comments' => 'hr'],
        ['user_id' => 30, 'stage' => 'accounts', 'action' => 'forwarded', 'comments' => 'accounts'],
        ['user_id' => 40, 'stage' => 'director_fa', 'action' => 'approved', 'comments' => 'director'],
        ['user_id' => 50, 'stage' => 'ed', 'action' => 'approved', 'comments' => 'ed'],
    ];

    if ($withSentBack) {
        $rows[] = ['user_id' => 31, 'stage' => 'accounts', 'action' => 'sent_back', 'comments' => 'fix this'];
    }

    return collect($rows)->map(fn ($row) => new FinalClearanceSignature($row));
}

test('preparer sees only the field stage', function () {
    $visible = Visibility::filter(clearanceSignatures(), 0, 10, true);

    expect($visible->pluck('stage')->all())->toBe(['field']);
});

test('hr sees field and hr but not accounts, director or ed', function () {
    $visible = Visibility::filter(clearanceSignatures(), 1, 20, false);

    expect($visible->pluck('stage')->all())->toBe(['field', 'hr']);
});

test('accounts sees field, hr and accounts', function () {
    $visible = Visibility::filter(clearanceSignatures(), 2, 30, false);

    expect($visible->pluck('stage')->all())->toBe(['field', 'hr', 'accounts']);
});

test('director sees everything except ed', function () {
    $visible = Visibility::filter(clearanceSignatures(), 3, 40, false);

    expect($visible->pluck('stage')->all())->toBe(['field', 'hr', 'accounts', 'director_fa']);
});

test('top rank sees every signature including unknown stages', function () {
    $all = clearanceSignatures()->push(new FinalClearanceSignature(['user_id' => 1, 'stage' => 'unknown', 'action' => 'x']));

    expect(Visibility::filter($all, Visibility::RANK_TOP, 999, false))->toHaveCount(6);
});

test('a viewer always sees their own signature', function () {
    $visible = Visibility::filter(clearanceSignatures(), 0, 50, false);

    expect($visible->pluck('stage')->all())->toBe(['field', 'ed']);
});

test('send back comment reaches the preparer but not other low-level viewers', function () {
    $sigs = clearanceSignatures(true);

    $asPreparer = Visibility::filter($sigs, 0, 10, true);
    expect($asPreparer->pluck('action')->all())->toContain('sent_back');

    $asOther = Visibility::filter($sigs, 0, 11, false);
    expect($asOther->pluck('action')->all())->not->toContain('sent_back');
});

test('unknown stage is hidden from non top viewers', function () {
    $sigs = collect([new FinalClearanceSignature(['user_id' => 1, 'stage' => 'reviewer', 'action' => 'forwarded'])]);

    expect(Visibility::filter($sigs, 3, 2, false))->toHaveCount(0);
});

test('hr and accounts comment columns are hidden from lower stages', function () {
    expect(Visibility::hiddenFields(0))->toBe(['hr_issue', 'hr_issue_note', 'accounts_comments']);
    expect(Visibility::hiddenFields(1))->toBe(['accounts_comments']);
    expect(Visibility::hiddenFields(2))->toBe([]);
    expect(Visibility::hiddenFields(Visibility::RANK_TOP))->toBe([]);
});

test('apply hides stage columns and signatures on a clearance model', function () {
    $clearance = new \App\Models\FinalClearance([
        'initiator_id' => 10,
        'preparer_comments' => 'prep',
        'hr_issue_note' => 'hr note',
        'accounts_comments' => 'acc note',
    ]);
    $clearance->setRelation('signatures', clearanceSignatures());

    Visibility::apply($clearance, 0, 10);

    $array = $clearance->toArray();
    expect($array)->toHaveKey('preparer_comments');
    expect($array)->not->toHaveKey('hr_issue_note');
    expect($array)->not->toHaveKey('accounts_comments');
    expect($clearance->signatures->pluck('stage')->all())->toBe(['field']);
});
