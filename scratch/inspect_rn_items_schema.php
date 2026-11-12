<?php

require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

echo "=== purchase_order_has_receive_note columns ===" . PHP_EOL;
$cols = Illuminate\Support\Facades\Schema::getColumnListing('purchase_order_has_receive_note');
print_r($cols);

$row = Illuminate\Support\Facades\DB::table('purchase_order_has_receive_note')->orderBy('id', 'desc')->first();
echo "=== Sample item row ===" . PHP_EOL;
print_r($row);

