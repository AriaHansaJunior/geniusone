<?php
require __DIR__ . '/../vendor/autoload.php';
$app = require_once __DIR__ . '/../bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$controller = app(\App\Http\Controllers\Api\Procurement\PurchaseOrderApiController::class);
$pos = \App\Models\Procurement\PurchaseOrder\PurchaseOrder::with(['items.requisitionItem.item.facility'])->get();

foreach ($pos as $po) {
    $row = $controller->formatPoRow($po, 1, false);
    if ($po->facility_status === 'NON FASILITAS' || str_contains($row['facility'] ?? '', 'NON') || $po->id == 22) {
        echo "PO ID {$po->id} ({$po->po_number}): DB facility_status='{$po->facility_status}', formatPoRow facility='{$row['facility']}', statusFacility='{$row['statusFacility']}'\n";
    }
}

