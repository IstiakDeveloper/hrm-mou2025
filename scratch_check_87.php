<?php
require __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

echo "DB: " . config('database.connections.mysql.database') . PHP_EOL;
echo "Host: " . config('database.connections.mysql.host') . PHP_EOL;

// Check if any promotion evaluation was created today or yesterday
$any = \App\Models\PromotionEvaluation::withTrashed()->get();
echo "Total with trashed: " . $any->count() . PHP_EOL;
