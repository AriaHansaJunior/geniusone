<?php
require __DIR__ . '/../vendor/autoload.php';
$app = require_once __DIR__ . '/../bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$pos = \App\Models\Procurement\PurchaseOrder\PurchaseOrder::with([
    'items.item.facility',
    'items.requisitionItem.item.facility'
])->get();

echo "Total POs: " . $pos->count() . "\n";
foreach ($pos as $po) {
    echo "PO ID {$po->id} ({$po->po_number}): facility_status = '{$po->facility_status}'\n";
    foreach ($po->items as $idx => $it) {
        $item = $it->item;
        $prItem = $it->requisitionItem;
        $prItemItem = $prItem?->item;
        $fac1 = $item?->facility?->name;
        $fac2 = $prItemItem?->facility?->name;
        $facId1 = $item?->facilities_id;
        $facId2 = $prItemItem?->facilities_id;
        echo "  Item {$idx} (id={$it->id}): item_id=" . ($item?->id ?? 'null') . ", facilities_id=" . ($facId1 ?? 'null') . " (fac: '{$fac1}'), pr_facilities_id=" . ($facId2 ?? 'null') . " (pr_fac: '{$fac2}')\n";
    }
}

