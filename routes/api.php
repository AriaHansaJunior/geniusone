<?php

use App\Http\Controllers\Api\Admin\AuditLogApiController;
// Procurement Domain Controllers
use App\Http\Controllers\Api\Admin\RolePermissionApiController;
use App\Http\Controllers\Api\Admin\UserManagementApiController;
use App\Http\Controllers\Api\Auth\AuthApiController;
use App\Http\Controllers\Api\Auth\UserProfileApiController;
use App\Http\Controllers\Api\Common\ExchangeRateApiController;
use App\Http\Controllers\Api\Common\ReferenceMasterApiController;
use App\Http\Controllers\Api\Common\SystemContextApiController;
use App\Http\Controllers\Api\Dashboard\StockNotificationApiController;
use App\Http\Controllers\Api\Exim\Master\AccountApiController;
use App\Http\Controllers\Api\Exim\Master\BrandApiController;
use App\Http\Controllers\Api\Exim\Master\CategoryApiController;
use App\Http\Controllers\Api\Exim\Master\ClassificationApiController;
use App\Http\Controllers\Api\Exim\Master\ColourApiController;
use App\Http\Controllers\Api\Exim\Master\DepartmentApiController;
// Warehouse Domain Controllers
use App\Http\Controllers\Api\Exim\Master\FacilityApiController;
use App\Http\Controllers\Api\Exim\Master\HsCodeApiController;
use App\Http\Controllers\Api\Exim\Master\ItemApiController;
use App\Http\Controllers\Api\Exim\Master\ReportingTypeApiController;
// Exim Domain Controllers
use App\Http\Controllers\Api\Exim\Master\JobNumberApiController;
use App\Http\Controllers\Api\Exim\Master\StyleApiController;
use App\Http\Controllers\Api\Exim\Master\StyleImportApiController;
use App\Http\Controllers\Api\Exim\Master\UnitApiController;
use App\Http\Controllers\Api\Exim\Operations\DocumentHistoryApiController;
use App\Http\Controllers\Api\Exim\Operations\ReceiveNoteReturnApiController;
use App\Http\Controllers\Api\Procurement\Master\AdditionalCostsApiController;
use App\Http\Controllers\Api\Procurement\Master\CountryApiController;
use App\Http\Controllers\Api\Procurement\Master\CurrencyApiController;
use App\Http\Controllers\Api\Procurement\Master\DeliveryTermsApiController;
use App\Http\Controllers\Api\Procurement\Master\PaymentTermApiController;
use App\Http\Controllers\Api\Procurement\Master\PphApiController;
use App\Http\Controllers\Api\Procurement\Master\PurchaseCategoryApiController;
use App\Http\Controllers\Api\Procurement\Master\RafaksiTypeApiController;
use App\Http\Controllers\Api\Procurement\Master\SupplierApiController;
// Warehouse Extended Controllers
use App\Http\Controllers\Api\Procurement\PurchaseOrderApiController;
use App\Http\Controllers\Api\Procurement\PurchaseRequisitionApiController;
// Auth & User Domain Controllers
use App\Http\Controllers\Api\Reporting\TraceabilityReportApiController;
use App\Http\Controllers\Api\Warehouse\Master\DestinationLocationApiController;
use App\Http\Controllers\Api\Warehouse\Master\TypeOfRequestApiController;
use App\Http\Controllers\Api\Warehouse\Master\WarehouseMasterApiController;
use App\Http\Controllers\Api\Warehouse\MaterialRequestApiController;
use App\Http\Controllers\Api\Warehouse\ReceiveNoteApiController;
use App\Http\Controllers\Api\Warehouse\StockAdjustmentApiController;
use App\Http\Controllers\Api\Warehouse\TransferStockReturnApiController;
use App\Http\Controllers\Api\Warehouse\WarehouseApiController;
use App\Http\Controllers\Api\Warehouse\WarehouseReportApiController;
use App\Http\Controllers\Api\Workflow\ApprovalWorkflowApiController;
// Workflow & Approval Engine Controllers (BE-03, BE-04, BE-05, BE-06)
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Modular ERP API Routes
|--------------------------------------------------------------------------
|
| Stateless, domain-driven API endpoints consumed by React frontend components.
| Organized by functional modules:
| 1. Procurement (PR, PO, Master Data)
| 2. Warehouse & Logistics (RN, BPB, Master Warehouse & Coordinates)
| 3. Exim (Items, Masters, Returns, Document History)
| 4. Reporting & Traceability
|
*/

// =========================================================================
// 1. PROCUREMENT DOMAIN API
// =========================================================================
Route::middleware(['auth', 'active'])->prefix('procurement')->group(function () {
    // Purchase Requisition (PR)
    Route::get('/pr', [PurchaseRequisitionApiController::class, 'index']);
    Route::post('/pr', [PurchaseRequisitionApiController::class, 'store'])->middleware('permission:pr.create');
    Route::put('/pr/{id}', [PurchaseRequisitionApiController::class, 'update'])->middleware('permission:pr.update');
    Route::patch('/pr/{id}', [PurchaseRequisitionApiController::class, 'update'])->middleware('permission:pr.update');
    Route::delete('/pr/{id}', [PurchaseRequisitionApiController::class, 'destroy'])->middleware('permission:pr.delete');
    Route::get('/pr/{code}/attachment', [PurchaseRequisitionApiController::class, 'downloadAttachment'])->where('code', '.*(?<!/attachment)');
    Route::post('/pr/{code}/attachment', [PurchaseRequisitionApiController::class, 'uploadAttachment'])->where('code', '.*(?<!/attachment)')->middleware('permission:pr.update');
    Route::post('/pr/{id}/approve', [PurchaseRequisitionApiController::class, 'approve']);
    Route::post('/pr/{id}/reject', [PurchaseRequisitionApiController::class, 'reject']);
    Route::post('/pr/{id}/items/{itemId}/close', [PurchaseRequisitionApiController::class, 'closeItem']);
    Route::post('/pr/{id}/items/{itemId}/unclose', [PurchaseRequisitionApiController::class, 'uncloseItem']);
    Route::post('/pr/{id}/items/{itemId}/toggle-close', [PurchaseRequisitionApiController::class, 'toggleCloseItem']);
    Route::post('/purchase-requisitions/{id}/items/{itemId}/close', [PurchaseRequisitionApiController::class, 'closeItem']);
    Route::post('/purchase-requisitions/{id}/items/{itemId}/unclose', [PurchaseRequisitionApiController::class, 'uncloseItem']);
    Route::post('/purchase-requisitions/{id}/items/{itemId}/toggle-close', [PurchaseRequisitionApiController::class, 'toggleCloseItem']);
    Route::get('/pr/{code}', [PurchaseRequisitionApiController::class, 'show'])->where('code', '.*');

    // Purchase Order (PO)
    Route::get('/po', [PurchaseOrderApiController::class, 'index']);
    Route::post('/po', [PurchaseOrderApiController::class, 'store'])->middleware('permission:po.create');
    Route::put('/po/{id}', [PurchaseOrderApiController::class, 'update'])->middleware('permission:po.update');
    Route::patch('/po/{id}', [PurchaseOrderApiController::class, 'update'])->middleware('permission:po.update');
    Route::delete('/po/{id}', [PurchaseOrderApiController::class, 'destroy'])->middleware('permission:po.delete');
    Route::get('/po/{code}/attachment', [PurchaseOrderApiController::class, 'downloadAttachment'])->where('code', '.*(?<!/attachment)');
    Route::post('/po/{id}/approve', [PurchaseOrderApiController::class, 'approve']);
    Route::post('/po/{id}/reject', [PurchaseOrderApiController::class, 'reject']);
    Route::post('/po/{id}/additional-costs', [PurchaseOrderApiController::class, 'storeAdditionalCost'])->middleware('permission:po.update');
    Route::delete('/po/{id}/additional-costs/{costId}', [PurchaseOrderApiController::class, 'destroyAdditionalCost'])->middleware('permission:po.update');
    Route::get('/po/{code}', [PurchaseOrderApiController::class, 'show'])->where('code', '.*');

    // Procurement Master Data
    Route::prefix('master')->group(function () {
        Route::apiResource('suppliers', SupplierApiController::class)->only(['index', 'show']);
        Route::apiResource('payment-terms', PaymentTermApiController::class)->only(['index', 'show']);
        Route::apiResource('purchase-categories', PurchaseCategoryApiController::class)->only(['index', 'show']);
        Route::apiResource('delivery-terms', DeliveryTermsApiController::class)->only(['index', 'show']);
        Route::apiResource('additional-costs', AdditionalCostsApiController::class)->only(['index', 'show']);
        Route::get('pph-types', [PphApiController::class, 'pphTypes']);
        Route::apiResource('pph', PphApiController::class)->only(['index', 'show']);
        Route::apiResource('countries', CountryApiController::class)->only(['index', 'show']);
        Route::apiResource('rafaksi-types', RafaksiTypeApiController::class)->only(['index', 'show']);
        Route::apiResource('currencies', CurrencyApiController::class)->only(['index', 'show']);
        Route::apiResource('job-numbers', JobNumberApiController::class)->only(['index', 'show']);
        Route::apiResource('items', ItemApiController::class)->only(['index', 'show']);

        Route::middleware(['role:superadmin,admin,procurement,accounting,master_item_manager'])->group(function () {
            Route::apiResource('suppliers', SupplierApiController::class)->except(['index', 'show']);
            Route::patch('suppliers/{id}/toggle-status', [SupplierApiController::class, 'toggleStatus']);
            Route::apiResource('payment-terms', PaymentTermApiController::class)->except(['index', 'show']);
            Route::patch('payment-terms/{id}/toggle-status', [PaymentTermApiController::class, 'toggleStatus']);
            Route::apiResource('purchase-categories', PurchaseCategoryApiController::class)->except(['index', 'show']);
            Route::patch('purchase-categories/{id}/toggle-status', [PurchaseCategoryApiController::class, 'toggleStatus']);
            Route::apiResource('delivery-terms', DeliveryTermsApiController::class)->except(['index', 'show']);
            Route::patch('delivery-terms/{id}/toggle-status', [DeliveryTermsApiController::class, 'toggleStatus']);
            Route::apiResource('additional-costs', AdditionalCostsApiController::class)->except(['index', 'show']);
            Route::patch('additional-costs/{id}/toggle-status', [AdditionalCostsApiController::class, 'toggleStatus']);
            Route::post('pph-types', [ReferenceMasterApiController::class, 'store'])->defaults('key', 'pph-type');
            Route::put('pph-types/{id}', [ReferenceMasterApiController::class, 'update'])->defaults('key', 'pph-type');
            Route::patch('pph-types/{id}/toggle-status', [ReferenceMasterApiController::class, 'toggleStatus'])->defaults('key', 'pph-type');
            Route::delete('pph-types/{id}', [ReferenceMasterApiController::class, 'destroy'])->defaults('key', 'pph-type');
            Route::apiResource('pph', PphApiController::class)->except(['index', 'show']);
            Route::patch('pph/{id}/toggle-status', [PphApiController::class, 'toggleStatus']);
            Route::apiResource('countries', CountryApiController::class)->except(['index', 'show']);
            Route::patch('countries/{id}/toggle-status', [CountryApiController::class, 'toggleStatus']);
            Route::apiResource('rafaksi-types', RafaksiTypeApiController::class)->except(['index', 'show']);
            Route::patch('rafaksi-types/{id}/toggle-status', [RafaksiTypeApiController::class, 'toggleStatus']);
            Route::apiResource('currencies', CurrencyApiController::class)->except(['index', 'show']);
            Route::patch('currencies/{id}/toggle-status', [CurrencyApiController::class, 'toggleStatus']);
            Route::post('currencies/{id}/sync', [CurrencyApiController::class, 'sync']);
            Route::apiResource('job-numbers', JobNumberApiController::class)->except(['index', 'show']);
            Route::patch('job-numbers/{id}/toggle-status', [JobNumberApiController::class, 'toggleStatus']);
            Route::apiResource('items', ItemApiController::class)->except(['index', 'show']);
            Route::patch('items/{id}/toggle-status', [ItemApiController::class, 'toggleStatus']);
        });
    });
});

// =========================================================================
// 2. WAREHOUSE & LOGISTICS DOMAIN API
// =========================================================================
Route::middleware(['auth', 'active'])->prefix('warehouse')->group(function () {
    // Inbound BPB (Receive Material)
    Route::get('/bpb', [WarehouseApiController::class, 'index']);
    Route::get('/bpb/available-sources', [WarehouseApiController::class, 'availableSources']);
    Route::post('/bpb', [WarehouseApiController::class, 'store'])->middleware('permission:bpb.create');
    Route::put('/bpb/{id}', [WarehouseApiController::class, 'update'])->middleware('permission:bpb.update');
    Route::patch('/bpb/{id}', [WarehouseApiController::class, 'update'])->middleware('permission:bpb.update');
    Route::delete('/bpb/{id}', [WarehouseApiController::class, 'destroy'])->middleware('permission:bpb.delete');
    Route::get('/bpb/{code}', [WarehouseApiController::class, 'show'])->where('code', '.*');

    // Gate Receive Notes (RN)
    Route::get('/rn', [ReceiveNoteApiController::class, 'index']);
    Route::get('/rn/available-pos', [ReceiveNoteApiController::class, 'availablePos']);
    Route::post('/rn', [ReceiveNoteApiController::class, 'store'])->middleware('permission:rn.create');
    Route::put('/rn/{id}', [ReceiveNoteApiController::class, 'update'])->middleware('permission:rn.update');
    Route::patch('/rn/{id}', [ReceiveNoteApiController::class, 'update'])->middleware('permission:rn.update');
    Route::delete('/rn/{id}', [ReceiveNoteApiController::class, 'destroy'])->middleware('permission:rn.delete');
    Route::post('/rn/{id}/approve', [ReceiveNoteApiController::class, 'approve']);
    Route::post('/rn/{id}/reject', [ReceiveNoteApiController::class, 'reject']);
    Route::get('/rn/{code}', [ReceiveNoteApiController::class, 'show'])->where('code', '.*');

    // Warehouse Reports (Stock Card, Stock Item, Receive Material, Transfer, Mutation, Outstanding)
    Route::prefix('reports')->group(function () {
        Route::get('/stock-card', [WarehouseReportApiController::class, 'stockCard']);
        Route::get('/stock-item', [WarehouseReportApiController::class, 'stockItem']);
        Route::get('/stock-item/{itemId}/movements', [WarehouseReportApiController::class, 'stockItemMovements'])
            ->whereNumber('itemId');
        Route::get('/receive-material', [WarehouseReportApiController::class, 'receiveMaterialReport']);
        Route::get('/stock-transfer', [WarehouseReportApiController::class, 'stockTransferReport']);
        Route::get('/stock-mutation', [WarehouseReportApiController::class, 'stockMutationReport']);
        Route::get('/outstanding-request', [WarehouseReportApiController::class, 'outstandingRequestReport']);
    });

    // Material Requisitions (Request Material)
    Route::apiResource('request-materials', MaterialRequestApiController::class)->only(['index', 'show']);
    Route::post('request-materials', [MaterialRequestApiController::class, 'store'])->middleware('permission:rm.create');
    Route::match(['put', 'patch'], 'request-materials/{request_material}', [MaterialRequestApiController::class, 'update'])->middleware('permission:rm.update');
    Route::delete('request-materials/{request_material}', [MaterialRequestApiController::class, 'destroy'])->middleware('permission:rm.delete');
    Route::post('request-materials/{id}/approve', [MaterialRequestApiController::class, 'approve']);
    Route::post('request-materials/{id}/reject', [MaterialRequestApiController::class, 'reject']);

    // Transfer Stock Returns
    Route::get('transfer-stock-returns', [TransferStockReturnApiController::class, 'index']);
    Route::get('transfer-stock-returns/available-sources', [TransferStockReturnApiController::class, 'availableSourceItems']);
    Route::post('transfer-stock-returns/{id}/approve', [TransferStockReturnApiController::class, 'approve']);
    Route::post('transfer-stock-returns/{id}/reject', [TransferStockReturnApiController::class, 'reject']);
    Route::middleware('role:superadmin,admin,warehouse')->group(function () {
        Route::apiResource('transfer-stock-returns', TransferStockReturnApiController::class)->except(['index', 'show']);
    });
    Route::get('transfer-stock-returns/{code}', [TransferStockReturnApiController::class, 'show'])->where('code', '.*');

    // Adjustment Stock (Manual & Excel Inject)
    Route::get('adjustment-stock', [StockAdjustmentApiController::class, 'index']);
    Route::get('adjustment-stock/template', [StockAdjustmentApiController::class, 'template']);
    Route::middleware(['permission:inventory.adjust'])->group(function () {
        Route::post('adjustment-stock', [StockAdjustmentApiController::class, 'store']);
        Route::post('adjustment-stock/import', [StockAdjustmentApiController::class, 'import']);
    });
    Route::get('adjustment-stock/{code}', [StockAdjustmentApiController::class, 'show'])->where('code', '.*');

    // Warehouse Master, Coordinates, Types of Request, Destination Locations
    Route::prefix('master')->group(function () {
        Route::get('warehouse-types', [WarehouseMasterApiController::class, 'warehouseTypes']);
        Route::apiResource('warehouses', WarehouseMasterApiController::class)->only(['index', 'show']);
        Route::get('warehouses/{id}/coordinates', [WarehouseMasterApiController::class, 'listCoordinates']);
        Route::apiResource('type-of-requests', TypeOfRequestApiController::class)->only(['index', 'show']);
        Route::apiResource('destination-locations', DestinationLocationApiController::class)->only(['index', 'show']);

        Route::middleware(['role:superadmin,admin,warehouse,accounting,master_item_manager'])->group(function () {
            Route::post('warehouse-types', [ReferenceMasterApiController::class, 'store'])->defaults('key', 'warehouse-type');
            Route::put('warehouse-types/{id}', [ReferenceMasterApiController::class, 'update'])->defaults('key', 'warehouse-type');
            Route::patch('warehouse-types/{id}/toggle-status', [ReferenceMasterApiController::class, 'toggleStatus'])->defaults('key', 'warehouse-type');
            Route::delete('warehouse-types/{id}', [ReferenceMasterApiController::class, 'destroy'])->defaults('key', 'warehouse-type');
            Route::apiResource('warehouses', WarehouseMasterApiController::class)->except(['index', 'show']);
            Route::patch('warehouses/{id}/toggle-status', [WarehouseMasterApiController::class, 'toggleStatus']);
            Route::post('warehouses/{id}/coordinates', [WarehouseMasterApiController::class, 'storeCoordinate']);
            Route::put('coordinates/{id}', [WarehouseMasterApiController::class, 'updateCoordinate']);
            Route::patch('coordinates/{id}', [WarehouseMasterApiController::class, 'updateCoordinate']);
            Route::delete('coordinates/{id}', [WarehouseMasterApiController::class, 'destroyCoordinate']);

            Route::apiResource('type-of-requests', TypeOfRequestApiController::class)->except(['index', 'show']);
            Route::patch('type-of-requests/{id}/toggle-status', [TypeOfRequestApiController::class, 'toggleStatus']);

            Route::apiResource('destination-locations', DestinationLocationApiController::class)->except(['index', 'show']);
            Route::patch('destination-locations/{id}/toggle-status', [DestinationLocationApiController::class, 'toggleStatus']);
        });
    });
});

// =========================================================================
// 3. EXIM DOMAIN API
// =========================================================================
Route::middleware(['auth', 'active'])->prefix('exim')->group(function () {
    // Exim Master Data
    Route::prefix('master')->group(function () {
        Route::apiResource('units', UnitApiController::class)->only(['index', 'show']);
        Route::get('unit-references', [UnitApiController::class, 'unitReferences']);
        Route::apiResource('items', ItemApiController::class)->only(['index', 'show']);
        Route::apiResource('brands', BrandApiController::class)->only(['index', 'show']);
        Route::apiResource('classifications', ClassificationApiController::class)->only(['index', 'show']);
        Route::get('reporting-types', [ReportingTypeApiController::class, 'index']);
        Route::apiResource('departments', DepartmentApiController::class)->only(['index', 'show']);
        Route::get('sections', [DepartmentApiController::class, 'sections']);
        Route::apiResource('facilities', FacilityApiController::class)->only(['index', 'show']);
        Route::get('hs-codes/rate-types', [HsCodeApiController::class, 'rateTypes']);
        Route::apiResource('hs-codes', HsCodeApiController::class)->only(['index', 'show']);

        Route::get('types-rates-bm', [ReferenceMasterApiController::class, 'index'])->defaults('key', 'type-rates-bm');
        Route::get('types-rates-cukai', [ReferenceMasterApiController::class, 'index'])->defaults('key', 'type-rates-cukai');
        Route::get('custom-reports', [ReferenceMasterApiController::class, 'index'])->defaults('key', 'custom-report');
        Route::get('item-types', [ReferenceMasterApiController::class, 'index'])->defaults('key', 'item-type');
        Route::get('group-scrap-items', [ReferenceMasterApiController::class, 'index'])->defaults('key', 'group-scrap-item');
        Route::get('specifications', [ReferenceMasterApiController::class, 'index'])->defaults('key', 'specification');

        Route::apiResource('categories', CategoryApiController::class)->only(['index', 'show']);
        Route::get('styles/template', [StyleImportApiController::class, 'template']);
        Route::apiResource('styles', StyleApiController::class)->only(['index', 'show']);
        Route::apiResource('colours', ColourApiController::class)->only(['index', 'show']);
        Route::apiResource('accounts', AccountApiController::class)->only(['index', 'show']);
        Route::apiResource('job-numbers', JobNumberApiController::class)->only(['index', 'show']);

        Route::middleware(['role:superadmin,admin,accounting,master_item_manager,procurement'])->group(function () {
            Route::apiResource('units', UnitApiController::class)->except(['index', 'show']);
            Route::patch('units/{id}/toggle-status', [UnitApiController::class, 'toggleStatus']);
            Route::post('unit-references', [UnitApiController::class, 'storeUnitReference']);
            Route::put('unit-references/{id}', [UnitApiController::class, 'updateUnitReference']);
            Route::patch('unit-references/{id}/toggle-status', [UnitApiController::class, 'toggleUnitReferenceStatus']);
            Route::delete('unit-references/{id}', [UnitApiController::class, 'destroyUnitReference']);
            Route::apiResource('items', ItemApiController::class)->except(['index', 'show']);
            Route::patch('items/{id}/toggle-status', [ItemApiController::class, 'toggleStatus']);
            Route::apiResource('brands', BrandApiController::class)->except(['index', 'show']);
            Route::patch('brands/{id}/toggle-status', [BrandApiController::class, 'toggleStatus']);
            Route::apiResource('classifications', ClassificationApiController::class)->except(['index', 'show']);
            Route::patch('classifications/{id}/toggle-status', [ClassificationApiController::class, 'toggleStatus']);
            Route::apiResource('departments', DepartmentApiController::class)->except(['index', 'show']);
            Route::patch('departments/{id}/toggle-status', [DepartmentApiController::class, 'toggleStatus']);
            Route::post('sections', [DepartmentApiController::class, 'storeSection']);
            Route::put('sections/{id}', [DepartmentApiController::class, 'updateSection']);
            Route::patch('sections/{id}/toggle-status', [DepartmentApiController::class, 'toggleSectionStatus']);
            Route::delete('sections/{id}', [DepartmentApiController::class, 'destroySection']);
            Route::apiResource('facilities', FacilityApiController::class)->except(['index', 'show']);
            Route::patch('facilities/{id}/toggle-status', [FacilityApiController::class, 'toggleStatus']);
            Route::apiResource('hs-codes', HsCodeApiController::class)->except(['index', 'show']);
            Route::patch('hs-codes/{id}/toggle-status', [HsCodeApiController::class, 'toggleStatus']);

            Route::post('types-rates-bm', [ReferenceMasterApiController::class, 'store'])->defaults('key', 'type-rates-bm');
            Route::put('types-rates-bm/{id}', [ReferenceMasterApiController::class, 'update'])->defaults('key', 'type-rates-bm');
            Route::patch('types-rates-bm/{id}/toggle-status', [ReferenceMasterApiController::class, 'toggleStatus'])->defaults('key', 'type-rates-bm');
            Route::delete('types-rates-bm/{id}', [ReferenceMasterApiController::class, 'destroy'])->defaults('key', 'type-rates-bm');

            Route::post('types-rates-cukai', [ReferenceMasterApiController::class, 'store'])->defaults('key', 'type-rates-cukai');
            Route::put('types-rates-cukai/{id}', [ReferenceMasterApiController::class, 'update'])->defaults('key', 'type-rates-cukai');
            Route::patch('types-rates-cukai/{id}/toggle-status', [ReferenceMasterApiController::class, 'toggleStatus'])->defaults('key', 'type-rates-cukai');
            Route::delete('types-rates-cukai/{id}', [ReferenceMasterApiController::class, 'destroy'])->defaults('key', 'type-rates-cukai');

            Route::post('custom-reports', [ReferenceMasterApiController::class, 'store'])->defaults('key', 'custom-report');
            Route::put('custom-reports/{id}', [ReferenceMasterApiController::class, 'update'])->defaults('key', 'custom-report');
            Route::patch('custom-reports/{id}/toggle-status', [ReferenceMasterApiController::class, 'toggleStatus'])->defaults('key', 'custom-report');
            Route::delete('custom-reports/{id}', [ReferenceMasterApiController::class, 'destroy'])->defaults('key', 'custom-report');

            Route::post('item-types', [ReferenceMasterApiController::class, 'store'])->defaults('key', 'item-type');
            Route::put('item-types/{id}', [ReferenceMasterApiController::class, 'update'])->defaults('key', 'item-type');
            Route::patch('item-types/{id}/toggle-status', [ReferenceMasterApiController::class, 'toggleStatus'])->defaults('key', 'item-type');
            Route::delete('item-types/{id}', [ReferenceMasterApiController::class, 'destroy'])->defaults('key', 'item-type');

            Route::post('group-scrap-items', [ReferenceMasterApiController::class, 'store'])->defaults('key', 'group-scrap-item');
            Route::put('group-scrap-items/{id}', [ReferenceMasterApiController::class, 'update'])->defaults('key', 'group-scrap-item');
            Route::patch('group-scrap-items/{id}/toggle-status', [ReferenceMasterApiController::class, 'toggleStatus'])->defaults('key', 'group-scrap-item');
            Route::delete('group-scrap-items/{id}', [ReferenceMasterApiController::class, 'destroy'])->defaults('key', 'group-scrap-item');

            Route::post('specifications', [ReferenceMasterApiController::class, 'store'])->defaults('key', 'specification');
            Route::put('specifications/{id}', [ReferenceMasterApiController::class, 'update'])->defaults('key', 'specification');
            Route::patch('specifications/{id}/toggle-status', [ReferenceMasterApiController::class, 'toggleStatus'])->defaults('key', 'specification');
            Route::delete('specifications/{id}', [ReferenceMasterApiController::class, 'destroy'])->defaults('key', 'specification');

            Route::apiResource('categories', CategoryApiController::class)->except(['index', 'show']);
            Route::patch('categories/{id}/toggle-status', [CategoryApiController::class, 'toggleStatus']);
            Route::post('styles/import', [StyleImportApiController::class, 'import']);
            Route::apiResource('styles', StyleApiController::class)->except(['index', 'show']);
            Route::patch('styles/{id}/toggle-status', [StyleApiController::class, 'toggleStatus']);
            Route::apiResource('colours', ColourApiController::class)->except(['index', 'show']);
            Route::patch('colours/{id}/toggle-status', [ColourApiController::class, 'toggleStatus']);
            Route::apiResource('accounts', AccountApiController::class)->except(['index', 'show']);
            Route::patch('accounts/{id}/toggle-status', [AccountApiController::class, 'toggleStatus']);
            Route::apiResource('job-numbers', JobNumberApiController::class)->except(['index', 'show']);
            Route::patch('job-numbers/{id}/toggle-status', [JobNumberApiController::class, 'toggleStatus']);
        });
    });

    // Exim Operations
    Route::prefix('operations')->group(function () {
        Route::get('returns/available-sources', [ReceiveNoteReturnApiController::class, 'availableSourceItems']);
        Route::post('returns/{id}/approve', [ReceiveNoteReturnApiController::class, 'approve']);
        Route::post('returns/{id}/reject', [ReceiveNoteReturnApiController::class, 'reject']);
        Route::apiResource('returns', ReceiveNoteReturnApiController::class)->only(['index', 'show']);
        Route::apiResource('document-histories', DocumentHistoryApiController::class)->only(['index', 'show']);

        Route::middleware(['role:superadmin,admin,warehouse,accounting,master_item_manager'])->group(function () {
            Route::apiResource('returns', ReceiveNoteReturnApiController::class)->except(['index', 'show', 'update']);
            Route::post('document-histories/synchronize', [DocumentHistoryApiController::class, 'synchronize']);
            Route::post('document-histories/generate', [DocumentHistoryApiController::class, 'generate']);
            Route::apiResource('document-histories', DocumentHistoryApiController::class)->except(['index', 'show', 'update']);
        });
    });
});

// =========================================================================
// 4. REPORTING & TRACEABILITY DOMAIN API
// =========================================================================
Route::middleware(['auth', 'active'])->prefix('reporting')->group(function () {
    Route::get('/traceability', [TraceabilityReportApiController::class, 'index']);
    Route::get('/traceability/{code}', [TraceabilityReportApiController::class, 'show'])->where('code', '.*');
    Route::get('/pr-report', [TraceabilityReportApiController::class, 'prReport']);
    Route::get('/po-report', [TraceabilityReportApiController::class, 'poReport']);
});

// =========================================================================
// 5. AUTH & USER PROFILE DOMAIN API
// =========================================================================
Route::prefix('auth')->group(function () {
    Route::post('/login', [AuthApiController::class, 'login'])->middleware(['throttle:10,1']);
    Route::middleware(['auth', 'active'])->group(function () {
        Route::post('/logout', [AuthApiController::class, 'logout']);
        Route::get('/me', [AuthApiController::class, 'me']);
        Route::get('/users', [AuthApiController::class, 'users'])->middleware(['superadmin']);
    });
});

Route::middleware(['auth', 'active'])->prefix('user')->group(function () {
    Route::get('/profile', [UserProfileApiController::class, 'show']);
    Route::post('/profile', [UserProfileApiController::class, 'update']);
    Route::put('/profile', [UserProfileApiController::class, 'update']);
});

// =========================================================================
// 6. DASHBOARD, SYSTEM CONTEXT & COMMON UTILITIES DOMAIN API
// =========================================================================
Route::middleware(['auth', 'active'])->prefix('dashboard')->group(function () {
    Route::get('/exchange-rates/latest', [ExchangeRateApiController::class, 'latest']);
    Route::get('/exchange-rates', [ExchangeRateApiController::class, 'index']);
    Route::get('/stock-alerts', [StockNotificationApiController::class, 'alerts']);
    Route::apiResource('stock-notifications', StockNotificationApiController::class)->only(['index', 'show']);

    Route::middleware(['role:superadmin,admin,procurement,accounting,warehouse'])->group(function () {
        Route::post('/exchange-rates', [ExchangeRateApiController::class, 'store']);
        Route::put('/exchange-rates/{id}', [ExchangeRateApiController::class, 'update']);
        Route::delete('/exchange-rates/{id}', [ExchangeRateApiController::class, 'destroy']);
        Route::patch('/stock-notifications/{id}/toggle-status', [StockNotificationApiController::class, 'toggleStatus']);
        Route::apiResource('stock-notifications', StockNotificationApiController::class)->except(['index', 'show']);
    });
});

Route::middleware(['auth', 'active'])->prefix('system')->group(function () {
    Route::get('/context', [SystemContextApiController::class, 'context']);
    Route::get('/settings', [SystemContextApiController::class, 'settings']);
    Route::put('/settings', [SystemContextApiController::class, 'updateSettings'])->middleware(['superadmin']);
});

Route::middleware(['auth', 'active'])->group(function () {
    Route::get('/master/lookups', [SystemContextApiController::class, 'lookups']);
    Route::get('/master/reference/{key}', [ReferenceMasterApiController::class, 'index']);

    Route::middleware(['role:superadmin,admin,procurement,accounting,master_item_manager,warehouse'])->group(function () {
        Route::post('/master/reference/{key}', [ReferenceMasterApiController::class, 'store']);
        Route::put('/master/reference/{key}/{id}', [ReferenceMasterApiController::class, 'update']);
        Route::patch('/master/reference/{key}/{id}/toggle-status', [ReferenceMasterApiController::class, 'toggleStatus']);
        Route::delete('/master/reference/{key}/{id}', [ReferenceMasterApiController::class, 'destroy']);
    });
});

// =========================================================================
// 7. BACKWARD-COMPATIBILITY ALIASES (Direct Routes for Existing Frontend)
// =========================================================================
Route::middleware(['auth', 'active'])->group(function () {
    Route::get('/pr', [PurchaseRequisitionApiController::class, 'index']);
    Route::post('/pr', [PurchaseRequisitionApiController::class, 'store'])->middleware('permission:pr.create');
    Route::put('/pr/{id}', [PurchaseRequisitionApiController::class, 'update'])->middleware('permission:pr.update');
    Route::delete('/pr/{id}', [PurchaseRequisitionApiController::class, 'destroy'])->middleware('permission:pr.delete');
    Route::get('/pr/{code}/attachment', [PurchaseRequisitionApiController::class, 'downloadAttachment'])->where('code', '.*(?<!/attachment)');
    Route::post('/pr/{code}/attachment', [PurchaseRequisitionApiController::class, 'uploadAttachment'])->where('code', '.*(?<!/attachment)')->middleware('permission:pr.update');
    Route::get('/pr/{code}', [PurchaseRequisitionApiController::class, 'show'])->where('code', '.*');

    Route::get('/po', [PurchaseOrderApiController::class, 'index']);
    Route::post('/po', [PurchaseOrderApiController::class, 'store'])->middleware('permission:po.create');
    Route::put('/po/{id}', [PurchaseOrderApiController::class, 'update'])->middleware('permission:po.update');
    Route::delete('/po/{id}', [PurchaseOrderApiController::class, 'destroy'])->middleware('permission:po.delete');
    Route::get('/po/{code}/attachment', [PurchaseOrderApiController::class, 'downloadAttachment'])->where('code', '.*(?<!/attachment)');
    Route::get('/po/{code}', [PurchaseOrderApiController::class, 'show'])->where('code', '.*');

    Route::get('/rn', [ReceiveNoteApiController::class, 'index']);
    Route::post('/rn', [ReceiveNoteApiController::class, 'store'])->middleware('permission:rn.create');
    Route::put('/rn/{id}', [ReceiveNoteApiController::class, 'update'])->middleware('permission:rn.update');
    Route::delete('/rn/{id}', [ReceiveNoteApiController::class, 'destroy'])->middleware('permission:rn.delete');
    Route::get('/rn/{code}', [ReceiveNoteApiController::class, 'show'])->where('code', '.*');

    Route::get('/report', [TraceabilityReportApiController::class, 'index']);
    Route::get('/report/{code}', [TraceabilityReportApiController::class, 'show'])->where('code', '.*');
});

Route::middleware(['auth', 'active'])->group(function () {
    Route::get('/warehouse', [WarehouseApiController::class, 'index']);
    Route::post('/warehouse', [WarehouseApiController::class, 'store'])->middleware('permission:bpb.create');
    Route::put('/warehouse/{id}', [WarehouseApiController::class, 'update'])->middleware('permission:bpb.update');
    Route::delete('/warehouse/{id}', [WarehouseApiController::class, 'destroy'])->middleware('permission:bpb.delete');
    Route::get('/warehouse/{code}', [WarehouseApiController::class, 'show'])->where('code', '.*');
});

// =========================================================================
// 8. GOVERNANCE & SUPERADMIN API (BE-01, BE-02, BE-06)
// =========================================================================
Route::middleware(['auth', 'active', 'superadmin'])->prefix('admin')->group(function () {
    // User Account Management (BE-01)
    Route::get('/users', [UserManagementApiController::class, 'index']);
    Route::post('/users', [UserManagementApiController::class, 'store']);
    Route::get('/users/{id}', [UserManagementApiController::class, 'show']);
    Route::put('/users/{id}', [UserManagementApiController::class, 'update']);
    Route::patch('/users/{id}/toggle-status', [UserManagementApiController::class, 'toggleStatus']);
    Route::post('/users/{id}/reset-password', [UserManagementApiController::class, 'resetPassword']);
    Route::post('/users/{id}/permissions', [UserManagementApiController::class, 'updatePermissions']);
    Route::delete('/users/{id}', [UserManagementApiController::class, 'destroy']);

    // Role & Granular Permission Management (BE-02)
    Route::get('/roles', [RolePermissionApiController::class, 'listRoles']);
    Route::post('/roles', [RolePermissionApiController::class, 'storeRole']);
    Route::put('/roles/{id}', [RolePermissionApiController::class, 'updateRole']);
    Route::delete('/roles/{id}', [RolePermissionApiController::class, 'destroyRole']);
    Route::get('/permissions', [RolePermissionApiController::class, 'listPermissions']);
    Route::get('/permission-matrix', [RolePermissionApiController::class, 'permissionMatrix']);
    Route::post('/roles/{id}/permissions', [RolePermissionApiController::class, 'updateRolePermissions']);

    // Centralized Audit Trail & History (BE-06)
    Route::get('/audit-logs', [AuditLogApiController::class, 'index']);
    Route::get('/approval-histories', [AuditLogApiController::class, 'approvalHistories']);
});

// Versioned /v1/admin aliases
Route::middleware(['auth', 'active', 'superadmin'])->prefix('v1/admin')->group(function () {
    Route::get('/users', [UserManagementApiController::class, 'index']);
    Route::post('/users', [UserManagementApiController::class, 'store']);
    Route::get('/users/{id}', [UserManagementApiController::class, 'show']);
    Route::put('/users/{id}', [UserManagementApiController::class, 'update']);
    Route::patch('/users/{id}/toggle-status', [UserManagementApiController::class, 'toggleStatus']);
    Route::post('/users/{id}/reset-password', [UserManagementApiController::class, 'resetPassword']);
    Route::post('/users/{id}/permissions', [UserManagementApiController::class, 'updatePermissions']);
    Route::delete('/users/{id}', [UserManagementApiController::class, 'destroy']);

    Route::get('/roles', [RolePermissionApiController::class, 'listRoles']);
    Route::post('/roles', [RolePermissionApiController::class, 'storeRole']);
    Route::put('/roles/{id}', [RolePermissionApiController::class, 'updateRole']);
    Route::delete('/roles/{id}', [RolePermissionApiController::class, 'destroyRole']);
    Route::get('/permissions', [RolePermissionApiController::class, 'listPermissions']);
    Route::get('/permission-matrix', [RolePermissionApiController::class, 'permissionMatrix']);
    Route::post('/roles/{id}/permissions', [RolePermissionApiController::class, 'updateRolePermissions']);

    Route::get('/audit-logs', [AuditLogApiController::class, 'index']);
    Route::get('/approval-histories', [AuditLogApiController::class, 'approvalHistories']);
});

// =========================================================================
// 9. UNIFIED WORKFLOW APPROVAL ENGINE API (BE-03, BE-04, BE-05, BE-06)
// =========================================================================
Route::middleware(['auth', 'active'])->prefix('approval')->group(function () {
    Route::post('/{module}/{id}/approve', [ApprovalWorkflowApiController::class, 'approve']);
    Route::post('/{module}/{id}/unapprove', [ApprovalWorkflowApiController::class, 'unapprove']);
    Route::post('/{module}/{id}/reject', [ApprovalWorkflowApiController::class, 'reject']);
    Route::post('/{module}/{id}/resubmit', [ApprovalWorkflowApiController::class, 'resubmit']);
    Route::post('/{module}/{id}/activity', [ApprovalWorkflowApiController::class, 'recordActivity']);
    Route::get('/{module}/{id}/history', [ApprovalWorkflowApiController::class, 'history']);
});

Route::middleware(['auth', 'active'])->prefix('v1/approval')->group(function () {
    Route::post('/{module}/{id}/approve', [ApprovalWorkflowApiController::class, 'approve']);
    Route::post('/{module}/{id}/unapprove', [ApprovalWorkflowApiController::class, 'unapprove']);
    Route::post('/{module}/{id}/reject', [ApprovalWorkflowApiController::class, 'reject']);
    Route::post('/{module}/{id}/resubmit', [ApprovalWorkflowApiController::class, 'resubmit']);
    Route::post('/{module}/{id}/activity', [ApprovalWorkflowApiController::class, 'recordActivity']);
    Route::get('/{module}/{id}/history', [ApprovalWorkflowApiController::class, 'history']);
});

// Direct Per-Module Approval Routes (For Seamless Frontend Consumption)
Route::middleware(['auth', 'active'])->group(function () {
    $workflowModules = ['pr', 'po', 'rn', 'bpb', 'warehouse', 'request-materials', 'returns', 'return'];
    foreach ($workflowModules as $mod) {
        Route::post("{$mod}/{id}/approve", [ApprovalWorkflowApiController::class, 'approve'])->defaults('module', $mod);
        Route::post("{$mod}/{id}/unapprove", [ApprovalWorkflowApiController::class, 'unapprove'])->defaults('module', $mod);
        Route::post("{$mod}/{id}/reject", [ApprovalWorkflowApiController::class, 'reject'])->defaults('module', $mod);
        Route::post("{$mod}/{id}/resubmit", [ApprovalWorkflowApiController::class, 'resubmit'])->defaults('module', $mod);
        Route::post("{$mod}/{id}/activity", [ApprovalWorkflowApiController::class, 'recordActivity'])->defaults('module', $mod);
        Route::get("{$mod}/{id}/approval-history", [ApprovalWorkflowApiController::class, 'history'])->defaults('module', $mod);
    }
});

Route::middleware(['auth', 'active', 'permission:po.update'])->group(function () {
    Route::post('po/{id}/additional-costs', [PurchaseOrderApiController::class, 'storeAdditionalCost'])->where('id', '.*');
    Route::delete('po/{id}/additional-costs/{costId}', [PurchaseOrderApiController::class, 'destroyAdditionalCost'])->where('id', '.*');
    Route::post('procurement/transactions/purchase-order/{id}/additional-costs', [PurchaseOrderApiController::class, 'storeAdditionalCost'])->where('id', '.*');
    Route::delete('procurement/transactions/purchase-order/{id}/additional-costs/{costId}', [PurchaseOrderApiController::class, 'destroyAdditionalCost'])->where('id', '.*');
});
