<?php

namespace App\Support;

use Spatie\Browsershot\Browsershot;

class PayrollReportPrintPdf
{
    public static function generate(string $html): string
    {
        $shot = Browsershot::html(self::wrapHtmlDocument($html))
            ->showBackground()
            ->emulateMedia('print')
            ->preferCssPageSize()
            ->timeout(180)
            ->setOption('args', ['--no-sandbox', '--disable-setuid-sandbox']);

        $chromePath = self::chromePath();
        if ($chromePath !== null) {
            $shot->setChromePath($chromePath);
        }

        return $shot->pdf();
    }

    public static function chromePath(): ?string
    {
        $configured = config('payroll_reports.print.chrome_path');
        if (is_string($configured) && $configured !== '' && is_file($configured)) {
            return $configured;
        }

        if (PHP_OS_FAMILY === 'Windows') {
            foreach ([
                'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
                'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
            ] as $path) {
                if (is_file($path)) {
                    return $path;
                }
            }
        }

        return null;
    }

    public static function canGenerate(): bool
    {
        return self::chromePath() !== null;
    }

    /**
     * Browsershot expects a full HTML document when using emulateMedia(print).
     */
    protected static function wrapHtmlDocument(string $html): string
    {
        $trimmed = trim($html);
        if (stripos($trimmed, '<!DOCTYPE') === 0 || stripos($trimmed, '<html') === 0) {
            return $trimmed;
        }

        return '<!DOCTYPE html><html><head><meta charset="UTF-8"></head><body>'.$trimmed.'</body></html>';
    }
}
