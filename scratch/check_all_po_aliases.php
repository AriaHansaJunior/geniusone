<?php
require __DIR__ . '/../vendor/autoload.php';
$app = require_once __DIR__ . '/../bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\Procurement\PurchaseOrder\PurchaseOrder;

$pos = PurchaseOrder::all();
echo "Checking all " . $pos->count() . " POs in DB...\n";

$controller = app(\App\Http\Controllers\Api\Procurement\PurchaseOrderApiController::class);

foreach ($pos as $po) {
    $row = $controller->formatPoRow($po, 1, true);
    $items = $row['items'] ?? [];
    echo "PO #{$po->id} ({$po->po_number}) has " . count($items) . " items:\n";
    foreach ($items as $it) {
        $alias = $it['itemAlias'] ?? 'MISSING';
        $item = $it['item'] ?? 'MISSING';
        echo "   - [{$it['no']}] Item: '{$item}', Alias: '{$alias}'\n";
    }
}

