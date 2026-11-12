<?php
require __DIR__ . '/../vendor/autoload.php';
$app = require_once __DIR__ . '/../bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$rows = DB::table('purchase_order_has_purchase_requisitions as pohpr')
    ->leftJoin('purchase_requisitions_has_items as prhi', 'pohpr.pr_has_items_id', '=', 'prhi.id')
    ->leftJoin('items as i', 'prhi.items_id', '=', 'i.id')
    ->where(function($q) {
        $q->whereNull('pohpr.item_alias')
          ->orWhere('pohpr.item_alias', '')
          ->orWhere('pohpr.item_alias', '—')
          ->orWhere('pohpr.item_alias', '-');
    })
    ->select('pohpr.id', 'pohpr.item_alias', 'i.name as item_name', 'i.code as item_code')
    ->get();

echo "Found " . $rows->count() . " rows with empty or dash item_alias:\n";
foreach ($rows as $r) {
    echo "ID: {$r->id}, Current: '{$r->item_alias}', ItemName: '{$r->item_name}', ItemCode: '{$r->item_code}'\n";
}

