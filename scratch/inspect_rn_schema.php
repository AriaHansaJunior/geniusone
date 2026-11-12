<?php

require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

echo "=== receive_note columns ===" . PHP_EOL;
$cols = Illuminate\Support\Facades\Schema::getColumnListing('receive_note');
print_r($cols);

echo "=== purchase_order_has_receive_notes columns ===" . PHP_EOL;
$cols2 = Illuminate\Support\Facades\Schema::getColumnListing('purchase_order_has_receive_notes');
print_r($cols2);

echo "=== Sample receive_note row ===" . PHP_EOL;
$sample = Illuminate\Support\Facades\DB::table('receive_note')->orderBy('id', 'desc')->first();
print_r($sample);

echo "=== Sample purchase_order_has_receive_notes row ===" . PHP_EOL;
$sampleItem = Illuminate\Support\Facades\DB::table('purchase_order_has_receive_notes')->orderBy('id', 'desc')->first();
print_r($sampleItem);

