<?php
require __DIR__ . '/../vendor/autoload.php';
$app = require_once __DIR__ . '/../bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\Procurement\PurchaseOrder\PurchaseOrder;
use App\Services\GeniusOneBackend;
use Illuminate\Http\Request;

echo "====================================================\n";
echo "TESTING NON-DELETION OF ADDITIONAL COSTS IN DETAIL PO\n";
echo "====================================================\n\n";

$controller = app(\App\Http\Controllers\Api\Procurement\PurchaseOrderApiController::class);
$po1 = PurchaseOrder::with(['additionalCosts'])->find(1);

assert($po1 !== null, "PO 1 must exist");
echo "Found PO 1 ({$po1->po_number}) with " . $po1->additionalCosts->count() . " additional costs.\n";

// Attempt to delete an existing additional cost
$firstCost = $po1->additionalCosts->first();
if ($firstCost) {
    echo "Attempting to delete additional cost ID {$firstCost->id} from PO 1...\n";
    $delReq = Request::create("/api/po/{$po1->id}/additional-costs/{$firstCost->id}", 'DELETE');
    $delRes = $controller->destroyAdditionalCost($delReq, (string) $po1->id, $firstCost->id);
    
    $status = $delRes->getStatusCode();
    $data = json_decode($delRes->getContent(), true);
    
    echo "Response status: {$status}\n";
    echo "Response message: '{$data['message']}'\n";
    
    assert($status === 403, "Must return HTTP 403 Forbidden");
    assert(str_contains($data['message'], 'cannot be deleted'), "Must indicate cost cannot be deleted");
    
    // Check that the cost still exists in DB
    $stillExists = \App\Models\Procurement\PurchaseOrder\AdditionalCost::where('id', $firstCost->id)->exists();
    assert($stillExists, "Cost must still exist in DB!");
    echo "Cost ID {$firstCost->id} safely preserved in DB.\n";
}

echo "\n==> PASS: Additional costs in PO Detail cannot be deleted.\n";

