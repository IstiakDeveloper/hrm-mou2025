<?php

use App\Models\PromotionEvaluationSignature;
use App\Services\Appraisal\AppraisalSignatureVisibility as Visibility;
use Illuminate\Support\Collection;

function appraisalSignatures(bool $withSentBack = false): Collection
{
    $rows = [
        ['user_id' => 10, 'stage' => 'initiator', 'action' => 'submitted', 'comments' => 'bm'],
        ['user_id' => 20, 'stage' => 'rm', 'action' => 'forwarded', 'comments' => 'rm'],
        ['user_id' => 30, 'stage' => 'zm', 'action' => 'forwarded', 'comments' => 'zm'],
        ['user_id' => 40, 'stage' => 'hr', 'action' => 'forwarded', 'comments' => 'hr'],
        ['user_id' => 50, 'stage' => 'ed', 'action' => 'approved', 'comments' => 'ed'],
    ];

    if ($withSentBack) {
        $rows[] = ['user_id' => 31, 'stage' => 'zm', 'action' => 'sent_back', 'comments' => 'fix this'];
    }

    return collect($rows)->map(fn ($row) => new PromotionEvaluationSignature($row));
}

test('creator (rank 0) does not see the RM comment or anything above', function () {
    $visible = Visibility::filter(appraisalSignatures(), 0, 10, true);

    expect($visible->pluck('stage')->all())->toBe(['initiator']);
});

test('RM sees creator and RM only', function () {
    $visible = Visibility::filter(appraisalSignatures(), 1, 20, false);

    expect($visible->pluck('stage')->all())->toBe(['initiator', 'rm']);
});

test('ZM sees creator, RM and ZM but not HR or ED', function () {
    $visible = Visibility::filter(appraisalSignatures(), 2, 30, false);

    expect($visible->pluck('stage')->all())->toBe(['initiator', 'rm', 'zm']);
});

test('HR sees everything up to HR but not ED', function () {
    $visible = Visibility::filter(appraisalSignatures(), Visibility::RANK_HR, 40, false);

    expect($visible->pluck('stage')->all())->toBe(['initiator', 'rm', 'zm', 'hr']);
});

test('top rank sees every signature including unknown stages', function () {
    $all = appraisalSignatures()->push(new PromotionEvaluationSignature(['user_id' => 1, 'stage' => 'unknown', 'action' => 'x']));

    expect(Visibility::filter($all, Visibility::RANK_TOP, 999, false))->toHaveCount(6);
});

test('a viewer always sees their own signature', function () {
    $visible = Visibility::filter(appraisalSignatures(), 0, 50, false);

    expect($visible->pluck('stage')->all())->toBe(['initiator', 'ed']);
});

test('send back comment reaches the creator but not other low-level viewers', function () {
    $sigs = appraisalSignatures(true);

    $asCreator = Visibility::filter($sigs, 0, 10, true);
    expect($asCreator->pluck('action')->all())->toContain('sent_back');

    $asOther = Visibility::filter($sigs, 0, 11, false);
    expect($asOther->pluck('action')->all())->not->toContain('sent_back');
});

test('unknown stage is hidden from non top viewers', function () {
    $sigs = collect([new PromotionEvaluationSignature(['user_id' => 1, 'stage' => 'reviewer', 'action' => 'forwarded'])]);

    expect(Visibility::filter($sigs, 4, 2, false))->toHaveCount(0);
});

test('auto generated default comments are recognised', function (string $text) {
    expect(Visibility::isDefaultComment($text))->toBeTrue();
})->with([
    'Initial Evaluation Drafted',
    'Initial Confirmation Evaluation Drafted',
    'Initial appraisal created',
    'Resubmitted by creator',
    'মূল্যায়নটি আঞ্চলিক ব্যবস্থাপক (RM) বরাবর দাখিল করা হয়েছে।',
    'মূল্যায়নটি জোনাল ম্যানেজার (ZM) বরাবর দাখিল করা হয়েছে।',
    'সুপারিশ ও স্বাক্ষরসহ অনুমোদনপূর্বক পরবর্তী স্তরে অগ্রবর্তী করা হলো।',
]);

test('real human comments are not treated as default', function (string $text) {
    expect(Visibility::isDefaultComment($text))->toBeFalse();
})->with([
    'Please fix the loan figures',
    'Good performance, recommended',
    '',
]);

test('stripDefaultComments blanks only default comments, in memory', function () {
    $sigs = collect([
        new PromotionEvaluationSignature(['user_id' => 1, 'stage' => 'initiator', 'action' => 'drafted', 'comments' => 'Initial Evaluation Drafted']),
        new PromotionEvaluationSignature(['user_id' => 2, 'stage' => 'rm', 'action' => 'forwarded', 'comments' => 'Needs more training']),
    ]);

    Visibility::stripDefaultComments($sigs);

    expect($sigs[0]->comments)->toBeNull();
    expect($sigs[1]->comments)->toBe('Needs more training');
});
