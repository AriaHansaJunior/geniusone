<?php
require __DIR__ . '/../vendor/autoload.php';
$app = require_once __DIR__ . '/../bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$emptyAliases = DB::table('purchase_order_has_purchase_requisitions')
    ->where(function($q) {
        $q->whereNull('item_alias')
          ->orWhere('item_alias', '')
          ->orWhere('item_alias', '—')
          ->orWhere('item_alias', '-');
    })->count();

$itemsWithItemsId = DB::table('purchase_order_has_purchase_requisitions')
    ->whereNotNull('items_id')->count();
$totalItems = DB::table('purchase_order_has_purchase_requisitions')->count();

$po39Fac = DB::table('purchase_order')->where('id', 39)->value('facility_status');
$po40Fac = DB::table('purchase_order')->where('id', 40)->value('facility_status');
$costTypesCount = DB::table('additional_cost_types')->count();

echo "Empty item_alias count: {$emptyAliases}\n";
echo "Items with items_id: {$itemsWithItemsId} / {$totalItems}\n";
echo "PO 39 facility_status: '{$po39Fac}'\n";
echo "PO 40 facility_status: '{$po40Fac}'\n";
echo "Additional cost types count: {$costTypesCount}\n";

