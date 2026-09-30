<?php

require __DIR__ . '/../vendor/autoload.php';
$app = require_once __DIR__ . '/../bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

foreach (App\Models\Document::all() as $d) {
    $exists = Illuminate\Support\Facades\Storage::disk('public')->exists($d->file_path);
    echo $d->id . " - " . $d->file_path . " exists: " . ($exists ? 'YES' : 'NO') . "\n";
}
