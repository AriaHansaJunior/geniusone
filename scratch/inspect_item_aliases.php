<?php
require __DIR__ . '/../vendor/autoload.php';
$app = require_once __DIR__ . '/../bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$rows = DB::table('purchase_order_has_purchase_requisitions as pohpr')
    ->leftJoin('items as i', 'pohpr.items_id', '=', 'i.id')
    ->select('pohpr.id', 'pohpr.purchase_order_id', 'pohpr.items_id', 'pohpr.item_alias', 'i.code as item_code', 'i.name as item_name')
    ->get();

$matchesCode = 0;
foreach ($rows as $r) {
    if ($r->item_alias === $r->item_code || (strlen($r->item_alias) < 20 && preg_match('/^[0-9A-Z.\-]+$/', $r->item_alias) && !str_contains($r->item_alias, ' '))) {
        $matchesCode++;
        echo "PO #{$r->purchase_order_id} Row {$r->id}: item_alias is code '{$r->item_alias}' -> Real Item Name: '{$r->item_name}'\n";
    }
}
echo "\nTotal rows where item_alias is an item code: {$matchesCode} / {$rows->count()}\n";

