<?php

use Illuminate\Support\Facades\Route;

// Procurement Domain Controllers
use App\Http\Controllers\Api\Procurement\PurchaseRequisitionApiController;
use App\Http\Controllers\Api\Procurement\PurchaseOrderApiController;
use App\Http\Controllers\Api\Procurement\Master\SupplierApiController;
use App\Http\Controllers\Api\Procurement\Master\PaymentTermApiController;
use App\Http\Controllers\Api\Procurement\Master\PurchaseCategoryApiController;
use App\Http\Controllers\Api\Procurement\Master\DeliveryTermsApiController;
use App\Http\Controllers\Api\Procurement\Master\AdditionalCostsApiController;
use App\Http\Controllers\Api\Procurement\Master\PphApiController;
use App\Http\Controllers\Api\Procurement\Master\CountryApiController;
use App\Http\Controllers\Api\Procurement\Master\RafaksiTypeApiController;
use App\Http\Controllers\Api\Procurement\Master\CurrencyApiController;

// Warehouse Domain Controllers
use App\Http\Controllers\Api\Warehouse\WarehouseApiController;
use App\Http\Controllers\Api\Warehouse\ReceiveNoteApiController;
use App\Http\Controllers\Api\Warehouse\Master\WarehouseMasterApiController;

// Exim Domain Controllers
use App\Http\Controllers\Api\Exim\Master\UnitApiController;
use App\Http\Controllers\Api\Exim\Master\ItemApiController;
use App\Http\Controllers\Api\Exim\Master\BrandApiController;
use App\Http\Controllers\Api\Exim\Master\ClassificationApiController;
use App\Http\Controllers\Api\Exim\Master\DepartmentApiController;
use App\Http\Controllers\Api\Exim\Master\FacilityApiController;
use App\Http\Controllers\Api\Exim\Master\HsCodeApiController;
use App\Http\Controllers\Api\Exim\Master\CategoryApiController;
use App\Http\Controllers\Api\Exim\Master\StyleApiController;
use App\Http\Controllers\Api\Exim\Master\ColourApiController;
use App\Http\Controllers\Api\Exim\Master\AccountApiController;
use App\Http\Controllers\Api\Exim\Master\JobNumberApiController;
use App\Http\Controllers\Api\Exim\Operations\ReceiveNoteReturnApiController;
use App\Http\Controllers\Api\Exim\Operations\DocumentHistoryApiController;

// Reporting Domain Controllers
use App\Http\Controllers\Api\Reporting\TraceabilityReportApiController;

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
Route::prefix('procurement')->group(function () {
    // Purchase Requisition (PR)
    Route::get('/pr', [PurchaseRequisitionApiController::class, 'index']);
    Route::post('/pr', [PurchaseRequisitionApiController::class, 'store']);
    Route::get('/pr/{code}', [PurchaseRequisitionApiController::class, 'show']);
    Route::post('/pr/{id}/approve', [PurchaseRequisitionApiController::class, 'approve']);
    Route::post('/pr/{id}/reject', [PurchaseRequisitionApiController::class, 'reject']);

    // Purchase Order (PO)
    Route::get('/po', [PurchaseOrderApiController::class, 'index']);
    Route::post('/po', [PurchaseOrderApiController::class, 'store']);
    Route::get('/po/{code}', [PurchaseOrderApiController::class, 'show']);
    Route::post('/po/{id}/approve', [PurchaseOrderApiController::class, 'approve']);
    Route::post('/po/{id}/reject', [PurchaseOrderApiController::class, 'reject']);

    // Procurement Master Data
    Route::prefix('master')->group(function () {
        Route::apiResource('suppliers', SupplierApiController::class);
        Route::apiResource('payment-terms', PaymentTermApiController::class);
        Route::apiResource('purchase-categories', PurchaseCategoryApiController::class);
        Route::apiResource('delivery-terms', DeliveryTermsApiController::class);
        Route::apiResource('additional-costs', AdditionalCostsApiController::class);
        Route::apiResource('pph', PphApiController::class);
        Route::apiResource('countries', CountryApiController::class);
        Route::apiResource('rafaksi-types', RafaksiTypeApiController::class);
        Route::apiResource('currencies', CurrencyApiController::class);
    });
});

// =========================================================================
// 2. WAREHOUSE & LOGISTICS DOMAIN API
// =========================================================================
Route::prefix('warehouse')->group(function () {
    // Inbound BPB (Receive Material)
    Route::get('/bpb', [WarehouseApiController::class, 'index']);
    Route::get('/bpb/{code}', [WarehouseApiController::class, 'show']);
    Route::post('/bpb', [WarehouseApiController::class, 'store']);

    // Gate Receive Notes (RN)
    Route::get('/rn', [ReceiveNoteApiController::class, 'index']);
    Route::post('/rn', [ReceiveNoteApiController::class, 'store']);
    Route::get('/rn/{code}', [ReceiveNoteApiController::class, 'show']);
    Route::post('/rn/{id}/approve', [ReceiveNoteApiController::class, 'approve']);
    Route::post('/rn/{id}/reject', [ReceiveNoteApiController::class, 'reject']);

    // Warehouse Master & Coordinates
    Route::prefix('master')->group(function () {
        Route::apiResource('warehouses', WarehouseMasterApiController::class);
        Route::get('warehouses/{id}/coordinates', [WarehouseMasterApiController::class, 'listCoordinates']);
        Route::post('warehouses/{id}/coordinates', [WarehouseMasterApiController::class, 'storeCoordinate']);
        Route::delete('coordinates/{id}', [WarehouseMasterApiController::class, 'destroyCoordinate']);
    });
});

// =========================================================================
// 3. EXIM DOMAIN API
// =========================================================================
Route::prefix('exim')->group(function () {
    // Exim Master Data
    Route::prefix('master')->group(function () {
        Route::apiResource('units', UnitApiController::class);
        Route::get('unit-references', [UnitApiController::class, 'unitReferences']);
        Route::apiResource('items', ItemApiController::class);
        Route::apiResource('brands', BrandApiController::class);
        Route::apiResource('classifications', ClassificationApiController::class);
        Route::apiResource('departments', DepartmentApiController::class);
        Route::get('sections', [DepartmentApiController::class, 'sections']);
        Route::apiResource('facilities', FacilityApiController::class);
        Route::apiResource('hs-codes', HsCodeApiController::class);
        Route::apiResource('categories', CategoryApiController::class);
        Route::apiResource('styles', StyleApiController::class);
        Route::apiResource('colours', ColourApiController::class);
        Route::apiResource('accounts', AccountApiController::class);
        Route::apiResource('job-numbers', JobNumberApiController::class);
    });

    // Exim Operations
    Route::prefix('operations')->group(function () {
        Route::apiResource('returns', ReceiveNoteReturnApiController::class);
        Route::post('returns/{id}/approve', [ReceiveNoteReturnApiController::class, 'approve']);

        Route::apiResource('document-histories', DocumentHistoryApiController::class);
    });
});

// =========================================================================
// 4. REPORTING & TRACEABILITY DOMAIN API
// =========================================================================
Route::prefix('reporting')->group(function () {
    Route::get('/traceability', [TraceabilityReportApiController::class, 'index']);
    Route::get('/traceability/{code}', [TraceabilityReportApiController::class, 'show']);
});

// =========================================================================
// 5. BACKWARD-COMPATIBILITY ALIASES (Direct Routes for Existing Frontend)
// =========================================================================
Route::get('/pr', [PurchaseRequisitionApiController::class, 'index']);
Route::post('/pr', [PurchaseRequisitionApiController::class, 'store']);
Route::get('/pr/{code}', [PurchaseRequisitionApiController::class, 'show']);

Route::get('/po', [PurchaseOrderApiController::class, 'index']);
Route::post('/po', [PurchaseOrderApiController::class, 'store']);
Route::get('/po/{code}', [PurchaseOrderApiController::class, 'show']);

Route::get('/rn', [ReceiveNoteApiController::class, 'index']);
Route::post('/rn', [ReceiveNoteApiController::class, 'store']);
Route::get('/rn/{code}', [ReceiveNoteApiController::class, 'show']);

Route::get('/report', [TraceabilityReportApiController::class, 'index']);
Route::get('/report/{code}', [TraceabilityReportApiController::class, 'show']);

Route::get('/warehouse', [WarehouseApiController::class, 'index']);
Route::get('/warehouse/{code}', [WarehouseApiController::class, 'show']);
Route::post('/warehouse', [WarehouseApiController::class, 'store']);

