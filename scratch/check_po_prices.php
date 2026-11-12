<?php

require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$items = Illuminate\Support\Facades\DB::table('purchase_order_has_purchase_requisitions')
    ->select('id', 'purchase_order_id', 'item_alias', 'price', 'order', 'subtotal')
    ->take(15)
    ->get();

foreach ($items as $it) {
    echo "ID: {$it->id}, PO_ID: {$it->purchase_order_id}, Alias: {$it->item_alias}, Price: {$it->price}, Order: {$it->order}, Subtotal: {$it->subtotal}" . PHP_EOL;
}

