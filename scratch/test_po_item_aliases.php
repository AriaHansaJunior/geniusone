<?php

require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$pos = \App\Models\Procurement\PurchaseOrder\PurchaseOrder::with(['items.directItem', 'items.requisitionItem.item'])->get();
echo 'Total POs: ' . $pos->count() . PHP_EOL;
$badCount = 0;
$totalItems = 0;
foreach ($pos as $po) {
    foreach ($po->items as $it) {
        $totalItems++;
        $mItem = $it->directItem ?? $it->requisitionItem?->item;
        $alias = $it->item_alias;
        $code = $mItem?->code;
        if (empty($alias) || in_array($alias, ['-', '—']) || ($code && $alias === $code)) {
            echo 'PO #' . $po->po_number . ' Item ID ' . $it->id . ' has bad alias: [' . $alias . '] (Item code: ' . $code . ')' . PHP_EOL;
            $badCount++;
        }
    }
}
if ($badCount === 0) {
    echo "SUCCESS: All {$totalItems} PO items across {$pos->count()} POs in database have valid, descriptive Item Aliases!" . PHP_EOL;
} else {
    echo "FAIL: {$badCount} items have bad aliases." . PHP_EOL;
}

// Also test API response for po-1, po-40, POL-1026-0001
$controller = app(\App\Http\Controllers\Api\Procurement\PurchaseOrderApiController::class);
foreach (['1', 'po-1', 'POL-1026-0001'] as $target) {
    $req = \Illuminate\Http\Request::create("/api/po/{$target}", 'GET', ['format' => 'json']);
    $req->headers->set('Accept', 'application/json');
    $res = $controller->show($req, $target);
    $data = $res->getData(true);
    echo "Target: $target, status: " . $res->getStatusCode() . ", statusField: " . ($data['status'] ?? 'unknown') . PHP_EOL;
    $row = $data['item'] ?? $data['data'] ?? [];
    if (!empty($row['_items'])) {
        $firstItem = $row['_items'][0];
        echo "API target [{$target}] -> first itemAlias: '{$firstItem['itemAlias']}', item: '{$firstItem['item']}'" . PHP_EOL;
    } else {
        echo "No items in row keys: " . implode(', ', array_keys($row)) . PHP_EOL;
    }
}
