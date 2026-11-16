<?php

namespace Tests\Unit;

use App\Support\BangladeshDate;
use Illuminate\Support\Carbon;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class BangladeshDateTest extends TestCase
{
    #[Test]
    public function is_due_uses_bangladesh_timezone_for_today(): void
    {
        Carbon::setTestNow(Carbon::parse('2026-06-22 00:30:00', BangladeshDate::TIMEZONE));

        $this->assertTrue(BangladeshDate::isDue('2026-06-22'));
        $this->assertTrue(BangladeshDate::isDue('2026-06-21'));
        $this->assertFalse(BangladeshDate::isDue('2026-06-23'));

        Carbon::setTestNow();
    }

    #[Test]
    public function is_due_treats_null_as_immediate(): void
    {
        $this->assertTrue(BangladeshDate::isDue(null));
        $this->assertTrue(BangladeshDate::isDue(''));
    }
}
