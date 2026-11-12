<?php
require __DIR__ . '/../vendor/autoload.php';
$app = require_once __DIR__ . '/../bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$pos = \App\Models\Procurement\PurchaseOrder\PurchaseOrder::with(['items.item.facility', 'items.requisitionItem.item.facility'])->get();

foreach ($pos as $po) {
    $hasNonItem = false;
    foreach ($po->items as $it) {
        $mItem = $it->item ?? $it->requisitionItem?->item;
        if (!$mItem && $it->item_alias) {
            $mItem = \App\Models\Master\Material\Item::where('code', $it->item_alias)->orWhere('name', $it->item_alias)->first();
        }
        $fac = $mItem?->facility?->name;
        if ($fac && stripos($fac, 'non') !== false) {
            $hasNonItem = true;
            break;
        }
    }
    if ($hasNonItem && $po->facility_status !== 'NON FASILITAS') {
        echo "PO ID {$po->id} ({$po->po_number}) has NON FASILITAS items but facility_status is '{$po->facility_status}'!\n";
    }
}

