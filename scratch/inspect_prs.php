<?php
require __DIR__ . '/../vendor/autoload.php';
$app = require_once __DIR__ . '/../bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$prs = \App\Models\Procurement\PurchaseRequest\PurchaseRequisition::with([
    'items.item.facility'
])->get();

echo "Total PRs: " . $prs->count() . "\n";
foreach ($prs as $pr) {
    echo "PR ID {$pr->id} ({$pr->pr_number}):\n";
    foreach ($pr->items as $it) {
        $facName = $it->item?->facility?->name ?? 'NO_FAC';
        $facId = $it->item?->facilities_id ?? 'null';
        echo "  PR Item ID {$it->id}: items_id={$it->items_id}, item_name='{$it->item?->name}', item_code='{$it->item?->code}', fac_id={$facId}, fac_name='{$facName}'\n";
    }
}

