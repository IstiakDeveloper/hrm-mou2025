<?php

namespace App\Support;

use FilesystemIterator;
use Illuminate\Support\Facades\Cache;
use RecursiveDirectoryIterator;
use RecursiveIteratorIterator;
use Tighten\Ziggy\BladeRouteGenerator;

class CachedZiggyScript
{
    public static function render(): string
    {
        $generator = app(BladeRouteGenerator::class);

        if (app()->runningUnitTests()) {
            return $generator->generate();
        }

        $key = 'ziggy:script:v1:'.md5(rtrim(url('/'), '/')).':'.self::stamp();

        return Cache::remember($key, now()->addHour(), fn () => $generator->generate());
    }

    private static function stamp(): string
    {
        $latest = 0;
        $iterator = new RecursiveIteratorIterator(
            new RecursiveDirectoryIterator(base_path('routes'), FilesystemIterator::SKIP_DOTS)
        );

        foreach ($iterator as $file) {
            if ($file->isFile() && $file->getExtension() === 'php') {
                $latest = max($latest, $file->getMTime());
            }
        }

        return (string) $latest;
    }
}
