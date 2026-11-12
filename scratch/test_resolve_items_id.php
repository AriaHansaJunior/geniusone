<?php
require __DIR__ . '/../vendor/autoload.php';
$app = require_once __DIR__ . '/../bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$rows = DB::table('purchase_order_has_purchase_requisitions as pohpr')
    ->leftJoin('purchase_requisitions_has_items as prhi', 'pohpr.pr_has_items_id', '=', 'prhi.id')
    ->select('pohpr.id', 'pohpr.pr_has_items_id', 'pohpr.item_alias', 'prhi.items_id as pr_item_id')
    ->get();

foreach ($rows as $r) {
    $resolvedItemId = $r->pr_item_id;
    if (!$resolvedItemId && $r->item_alias) {
        $mItem = DB::table('items')
            ->where('code', $r->item_alias)
            ->orWhere('name', $r->item_alias)
            ->first();
        $resolvedItemId = $mItem?->id;
    }
    echo "PO Item ID {$r->id}: pr_has_items_id={$r->pr_has_items_id}, item_alias='{$r->item_alias}', resolved items_id=" . ($resolvedItemId ?? 'null') . "\n";
}

