<?php
function searchDir($dir, $pattern) {
    $iterator = new RecursiveIteratorIterator(new RecursiveDirectoryIterator($dir));
    foreach ($iterator as $file) {
        if ($file->isDir()) continue;
        $path = $file->getPathname();
        // Skip node_modules, vendor, etc.
        if (str_contains($path, 'node_modules') || str_contains($path, 'vendor') || str_contains($path, '.git') || str_contains($path, 'storage')) {
            continue;
        }
        $content = @file_get_contents($path);
        if ($content && str_contains(strtolower($content), strtolower($pattern))) {
            echo "Match found in: $path\n";
        }
    }
}

echo "Searching for 'payment-receipts'...\n";
searchDir(__DIR__, 'payment-receipts');

echo "Searching for 'payment_receipt'...\n";
searchDir(__DIR__, 'payment_receipt');

echo "Searching for 'paymentReceipt'...\n";
searchDir(__DIR__, 'paymentReceipt');

echo "Searching for 'Receipt Inventory'...\n";
searchDir(__DIR__, 'Receipt Inventory');
