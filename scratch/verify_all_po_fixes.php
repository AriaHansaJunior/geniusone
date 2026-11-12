<?php
require __DIR__ . '/../vendor/autoload.php';
$app = require_once __DIR__ . '/../bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\Procurement\PurchaseOrder\PurchaseOrder;
use App\Models\Procurement\PurchaseOrder\PurchaseOrderItem;
use App\Models\Master\Material\Item;
use App\Services\GeniusOneBackend;
use Illuminate\Http\Request;

echo "====================================================\n";
echo "STARTING VERIFICATION OF PURCHASE ORDER FIXES\n";
echo "====================================================\n\n";

$controller = app(\App\Http\Controllers\Api\Procurement\PurchaseOrderApiController::class);

// =========================================================================
// 1. VERIFY ISSUE 1: Item Alias on PO Detail
// =========================================================================
echo "1. TESTING ISSUE 1: Item Alias in PO Detail...\n";
$po1 = PurchaseOrder::with(['items.directItem', 'items.requisitionItem.item'])->find(1);
$formattedPo1 = $controller->formatPoRow($po1, 1, true);

$items1 = $formattedPo1['items'] ?? [];
assert(!empty($items1), "PO 1 must have line items");
foreach ($items1 as $it) {
    echo "  Line {$it['no']}: item='{$it['item']}', itemAlias='{$it['itemAlias']}', item_alias='{$it['item_alias']}'\n";
    if (empty($it['itemAlias']) || $it['itemAlias'] === '—' || $it['itemAlias'] === '-') {
        throw new Exception("FAIL: Item alias in PO 1 is empty or dash: '{$it['itemAlias']}'");
    }
}
echo "  ==> PASS: Item Alias correctly populated for PO 1.\n\n";

// =========================================================================
// 2. VERIFY ISSUE 2: Additional Cost Addition and Deletion
// =========================================================================
echo "2. TESTING ISSUE 2: Additional Cost API...\n";
// Create a temporary PO for testing additional cost
$supplierId = DB::table('supliers')->value('id') ?? 1;
$poService = GeniusOneBackend::po();

$testPo = $poService->createOrder([
    'supliers_id' => $supplierId,
    'date' => date('d-M-Y'),
    'due_date' => date('Y-m-d', strtotime('+14 days')),
    'status' => 'Waiting for Approve 1',
    'facility_status' => 'FASILITAS',
    'rate' => 1.00,
    'remark' => 'Test PO for Additional Cost Verification',
], [
    [
        'items_id' => 1,
        'item_alias' => 'Steel Plate SS400 Verification',
        'price' => 100000,
        'order' => 2,
    ]
]);

echo "  Created test PO #{$testPo->id} ({$testPo->po_number})\n";

// Add Additional Cost via API Controller
$addReq = Request::create("/api/po/{$testPo->id}/additional-costs", 'POST', [
    'name' => 'Ongkos Angkut Uji Coba Fix',
    'costName' => 'Ongkos Angkut Uji Coba Fix',
    'amount' => 75000,
    'note' => 'Freight delivery fee verified',
]);

$addRes = $controller->storeAdditionalCost($addReq, (string) $testPo->id);
$resData = json_decode($addRes->getContent(), true);

assert($addRes->getStatusCode() === 201, "Additional cost should return 201");
echo "  Added additional cost: ID={$resData['data']['id']}, Value={$resData['data']['value']}\n";

$updatedPo = PurchaseOrder::with(['additionalCosts', 'items'])->find($testPo->id);
echo "  PO Grand Total with additional cost: {$updatedPo->grand_total} (Expected: 275000)\n";
assert((float) $updatedPo->grand_total == 275000.0, "Grand total must be 200000 + 75000 = 275000");

// Delete the Additional Cost
$costId = $resData['data']['id'];
$delReq = Request::create("/api/po/{$testPo->id}/additional-costs/{$costId}", 'DELETE');
$delRes = $controller->destroyAdditionalCost($delReq, (string) $testPo->id, $costId);
assert($delRes->getStatusCode() === 200, "Delete cost should return 200");

$afterDelPo = PurchaseOrder::with(['additionalCosts', 'items'])->find($testPo->id);
echo "  PO Grand Total after deleting cost: {$afterDelPo->grand_total} (Expected: 200000)\n";
assert((float) $afterDelPo->grand_total == 200000.0, "Grand total after delete must be 200000");

// Clean up test PO
$testPo->items()->delete();
$testPo->additionalCosts()->delete();
$testPo->forceDelete();
echo "  ==> PASS: Additional Cost addition and deletion verified successfully.\n\n";

// =========================================================================
// 3. VERIFY ISSUE 3: Facility / Non Facility Label on PO Outer View
// =========================================================================
echo "3. TESTING ISSUE 3: Facility vs Non Facility on Outer View...\n";

// Test PO 22 (has item 22 which is Non Facility)
$po22 = PurchaseOrder::with(['items.directItem.facility', 'items.requisitionItem.item.facility'])->find(22);
$formatted22 = $controller->formatPoRow($po22, 1, false);
echo "  PO 22 ({$po22->po_number}): facility='{$formatted22['facility']}', statusFacility='{$formatted22['statusFacility']}'\n";
assert($formatted22['facility'] === 'NON FASILITAS', "PO 22 must have facility 'NON FASILITAS'");
assert($formatted22['statusFacility'] === 'NON FASILITAS', "PO 22 must have statusFacility 'NON FASILITAS'");

// Test PO 39 and PO 40 (which had non-facility items)
$po39 = PurchaseOrder::with(['items.directItem.facility', 'items.requisitionItem.item.facility'])->find(39);
$formatted39 = $controller->formatPoRow($po39, 1, false);
echo "  PO 39 ({$po39->po_number}): facility='{$formatted39['facility']}', statusFacility='{$formatted39['statusFacility']}'\n";
assert($formatted39['facility'] === 'NON FASILITAS', "PO 39 must have facility 'NON FASILITAS'");
assert($formatted39['statusFacility'] === 'NON FASILITAS', "PO 39 must have statusFacility 'NON FASILITAS'");

$po40 = PurchaseOrder::with(['items.directItem.facility', 'items.requisitionItem.item.facility'])->find(40);
$formatted40 = $controller->formatPoRow($po40, 1, false);
echo "  PO 40 ({$po40->po_number}): facility='{$formatted40['facility']}', statusFacility='{$formatted40['statusFacility']}'\n";
assert($formatted40['facility'] === 'NON FASILITAS', "PO 40 must have facility 'NON FASILITAS'");
assert($formatted40['statusFacility'] === 'NON FASILITAS', "PO 40 must have statusFacility 'NON FASILITAS'");

// Test PO 1 (which has only Facility items)
echo "  PO 1 ({$po1->po_number}): facility='{$formattedPo1['facility']}', statusFacility='{$formattedPo1['statusFacility']}'\n";
assert($formattedPo1['facility'] === 'FASILITAS', "PO 1 must have facility 'FASILITAS'");
assert($formattedPo1['statusFacility'] === 'FASILITAS', "PO 1 must have statusFacility 'FASILITAS'");

// Now test creating a NEW PO with Non Facility item (Item ID 22) without specifying facility_status
$nonFacPo = $poService->createOrder([
    'supliers_id' => $supplierId,
    'date' => date('d-M-Y'),
    'due_date' => date('Y-m-d', strtotime('+14 days')),
    'status' => 'Waiting for Approve 1',
    'remark' => 'PO created with Non Facility item',
], [
    [
        'items_id' => 22, // Besi H-Beam (NON FASILITAS)
        'item_alias' => 'Besi H-Beam Non Fasilitas Test',
        'price' => 500000,
        'order' => 1,
    ]
]);

$formattedNewNonFac = $controller->formatPoRow($nonFacPo, 1, false);
echo "  Newly Created Non-Fac PO ({$nonFacPo->po_number}): DB facility_status='{$nonFacPo->facility_status}', format facility='{$formattedNewNonFac['facility']}', statusFacility='{$formattedNewNonFac['statusFacility']}'\n";
assert($nonFacPo->facility_status === 'NON FASILITAS', "Newly created PO with Non Facility item must have DB facility_status 'NON FASILITAS'");
assert($formattedNewNonFac['facility'] === 'NON FASILITAS', "Newly created PO must have formatted facility 'NON FASILITAS'");
assert($formattedNewNonFac['statusFacility'] === 'NON FASILITAS', "Newly created PO must have formatted statusFacility 'NON FASILITAS'");

// Clean up
$nonFacPo->items()->delete();
$nonFacPo->forceDelete();

echo "  ==> PASS: Facility / Non Facility labels on outer view verified successfully.\n\n";

echo "====================================================\n";
echo "ALL TESTS PASSED SUCCESSFULLY!\n";
echo "====================================================\n";

