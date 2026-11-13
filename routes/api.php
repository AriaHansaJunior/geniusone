<?php

use App\Http\Controllers\Api\Admin\AuditLogApiController;
// Procurement Domain Controllers
use App\Http\Controllers\Api\Admin\RolePermissionApiController;
use App\Http\Controllers\Api\Admin\UserManagementApiController;
use App\Http\Controllers\Api\Auth\AuthApiController;
use App\Http\Controllers\Api\Auth\UserProfileApiController;
use App\Http\Controllers\Api\Common\ExchangeRateApiController;
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
Route::prefix('procurement')->group(function () {
    // Purchase Requisition (PR)
    Route::get('/pr', [PurchaseRequisitionApiController::class, 'index']);
    Route::post('/pr', [PurchaseRequisitionApiController::class, 'store']);
    Route::put('/pr/{id}', [PurchaseRequisitionApiController::class, 'update']);
    Route::patch('/pr/{id}', [PurchaseRequisitionApiController::class, 'update']);
    Route::delete('/pr/{id}', [PurchaseRequisitionApiController::class, 'destroy']);
    Route::get('/pr/{code}/attachment', [PurchaseRequisitionApiController::class, 'downloadAttachment'])->where('code', '.*(?<!/attachment)');
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
    Route::post('/po', [PurchaseOrderApiController::class, 'store']);
    Route::put('/po/{id}', [PurchaseOrderApiController::class, 'update']);
    Route::patch('/po/{id}', [PurchaseOrderApiController::class, 'update']);
    Route::delete('/po/{id}', [PurchaseOrderApiController::class, 'destroy']);
    Route::post('/po/{id}/approve', [PurchaseOrderApiController::class, 'approve']);
    Route::post('/po/{id}/reject', [PurchaseOrderApiController::class, 'reject']);
    Route::post('/po/{id}/additional-costs', [PurchaseOrderApiController::class, 'storeAdditionalCost']);
    Route::delete('/po/{id}/additional-costs/{costId}', [PurchaseOrderApiController::class, 'destroyAdditionalCost']);
    Route::get('/po/{code}', [PurchaseOrderApiController::class, 'show'])->where('code', '.*');

    // Procurement Master Data
    Route::prefix('master')->group(function () {
        Route::apiResource('suppliers', SupplierApiController::class);
        Route::patch('suppliers/{id}/toggle-status', [SupplierApiController::class, 'toggleStatus']);
        Route::apiResource('payment-terms', PaymentTermApiController::class);
        Route::patch('payment-terms/{id}/toggle-status', [PaymentTermApiController::class, 'toggleStatus']);
        Route::apiResource('purchase-categories', PurchaseCategoryApiController::class);
        Route::patch('purchase-categories/{id}/toggle-status', [PurchaseCategoryApiController::class, 'toggleStatus']);
        Route::apiResource('delivery-terms', DeliveryTermsApiController::class);
        Route::patch('delivery-terms/{id}/toggle-status', [DeliveryTermsApiController::class, 'toggleStatus']);
        Route::apiResource('additional-costs', AdditionalCostsApiController::class);
        Route::patch('additional-costs/{id}/toggle-status', [AdditionalCostsApiController::class, 'toggleStatus']);
        Route::get('pph-types', [PphApiController::class, 'pphTypes']);
        Route::apiResource('pph', PphApiController::class);
        Route::patch('pph/{id}/toggle-status', [PphApiController::class, 'toggleStatus']);
        Route::apiResource('countries', CountryApiController::class);
        Route::patch('countries/{id}/toggle-status', [CountryApiController::class, 'toggleStatus']);
        Route::apiResource('rafaksi-types', RafaksiTypeApiController::class);
        Route::patch('rafaksi-types/{id}/toggle-status', [RafaksiTypeApiController::class, 'toggleStatus']);
        Route::apiResource('currencies', CurrencyApiController::class);
        Route::patch('currencies/{id}/toggle-status', [CurrencyApiController::class, 'toggleStatus']);
        Route::post('currencies/{id}/sync', [CurrencyApiController::class, 'sync']);
        Route::apiResource('job-numbers', JobNumberApiController::class);
        Route::patch('job-numbers/{id}/toggle-status', [JobNumberApiController::class, 'toggleStatus']);
        Route::apiResource('items', ItemApiController::class);
        Route::patch('items/{id}/toggle-status', [ItemApiController::class, 'toggleStatus']);
    });
});

// =========================================================================
// 2. WAREHOUSE & LOGISTICS DOMAIN API
// =========================================================================
Route::prefix('warehouse')->group(function () {
    // Inbound BPB (Receive Material)
    Route::get('/bpb', [WarehouseApiController::class, 'index']);
    Route::get('/bpb/available-sources', [WarehouseApiController::class, 'availableSources']);
    Route::post('/bpb', [WarehouseApiController::class, 'store']);
    Route::put('/bpb/{id}', [WarehouseApiController::class, 'update']);
    Route::patch('/bpb/{id}', [WarehouseApiController::class, 'update']);
    Route::delete('/bpb/{id}', [WarehouseApiController::class, 'destroy']);
    Route::get('/bpb/{code}', [WarehouseApiController::class, 'show'])->where('code', '.*');

    // Gate Receive Notes (RN)
    Route::get('/rn', [ReceiveNoteApiController::class, 'index']);
    Route::get('/rn/available-pos', [ReceiveNoteApiController::class, 'availablePos']);
    Route::post('/rn', [ReceiveNoteApiController::class, 'store']);
    Route::put('/rn/{id}', [ReceiveNoteApiController::class, 'update']);
    Route::patch('/rn/{id}', [ReceiveNoteApiController::class, 'update']);
    Route::delete('/rn/{id}', [ReceiveNoteApiController::class, 'destroy']);
    Route::post('/rn/{id}/approve', [ReceiveNoteApiController::class, 'approve']);
    Route::post('/rn/{id}/reject', [ReceiveNoteApiController::class, 'reject']);
    Route::get('/rn/{code}', [ReceiveNoteApiController::class, 'show'])->where('code', '.*');

    // Warehouse Reports (Stock Card & Stock Item)
    Route::prefix('reports')->group(function () {
        Route::get('/stock-card', [WarehouseReportApiController::class, 'stockCard']);
        Route::get('/stock-item', [WarehouseReportApiController::class, 'stockItem']);
    });

    // Material Requisitions (Request Material)
    Route::apiResource('request-materials', MaterialRequestApiController::class);
    Route::post('request-materials/{id}/approve', [MaterialRequestApiController::class, 'approve']);
    Route::post('request-materials/{id}/reject', [MaterialRequestApiController::class, 'reject']);

    // Transfer Stock Returns
    Route::get('transfer-stock-returns/available-sources', [TransferStockReturnApiController::class, 'availableSourceItems']);
    Route::post('transfer-stock-returns/{id}/approve', [TransferStockReturnApiController::class, 'approve']);
    Route::post('transfer-stock-returns/{id}/reject', [TransferStockReturnApiController::class, 'reject']);
    Route::get('transfer-stock-returns/{code}', [TransferStockReturnApiController::class, 'show'])->where('code', '.*');
    Route::apiResource('transfer-stock-returns', TransferStockReturnApiController::class)->except(['show']);

    // Warehouse Master, Coordinates, Types of Request, Destination Locations
    Route::prefix('master')->group(function () {
        Route::get('warehouse-types', [WarehouseMasterApiController::class, 'warehouseTypes']);
        Route::apiResource('warehouses', WarehouseMasterApiController::class);
        Route::patch('warehouses/{id}/toggle-status', [WarehouseMasterApiController::class, 'toggleStatus']);
        Route::get('warehouses/{id}/coordinates', [WarehouseMasterApiController::class, 'listCoordinates']);
        Route::post('warehouses/{id}/coordinates', [WarehouseMasterApiController::class, 'storeCoordinate']);
        Route::put('coordinates/{id}', [WarehouseMasterApiController::class, 'updateCoordinate']);
        Route::patch('coordinates/{id}', [WarehouseMasterApiController::class, 'updateCoordinate']);
        Route::delete('coordinates/{id}', [WarehouseMasterApiController::class, 'destroyCoordinate']);

        Route::apiResource('type-of-requests', TypeOfRequestApiController::class);
        Route::patch('type-of-requests/{id}/toggle-status', [TypeOfRequestApiController::class, 'toggleStatus']);

        Route::apiResource('destination-locations', DestinationLocationApiController::class);
        Route::patch('destination-locations/{id}/toggle-status', [DestinationLocationApiController::class, 'toggleStatus']);
    });
});

// =========================================================================
// 3. EXIM DOMAIN API
// =========================================================================
Route::prefix('exim')->group(function () {
    // Exim Master Data
    Route::prefix('master')->group(function () {
        Route::apiResource('units', UnitApiController::class);
        Route::patch('units/{id}/toggle-status', [UnitApiController::class, 'toggleStatus']);
        Route::get('unit-references', [UnitApiController::class, 'unitReferences']);
        Route::post('unit-references', [UnitApiController::class, 'storeUnitReference']);
        Route::put('unit-references/{id}', [UnitApiController::class, 'updateUnitReference']);
        Route::patch('unit-references/{id}/toggle-status', [UnitApiController::class, 'toggleUnitReferenceStatus']);
        Route::delete('unit-references/{id}', [UnitApiController::class, 'destroyUnitReference']);
        Route::apiResource('items', ItemApiController::class);
        Route::patch('items/{id}/toggle-status', [ItemApiController::class, 'toggleStatus']);
        Route::apiResource('brands', BrandApiController::class);
        Route::patch('brands/{id}/toggle-status', [BrandApiController::class, 'toggleStatus']);
        Route::apiResource('classifications', ClassificationApiController::class);
        Route::patch('classifications/{id}/toggle-status', [ClassificationApiController::class, 'toggleStatus']);
        Route::apiResource('departments', DepartmentApiController::class);
        Route::patch('departments/{id}/toggle-status', [DepartmentApiController::class, 'toggleStatus']);
        Route::get('sections', [DepartmentApiController::class, 'sections']);
        Route::post('sections', [DepartmentApiController::class, 'storeSection']);
        Route::put('sections/{id}', [DepartmentApiController::class, 'updateSection']);
        Route::patch('sections/{id}/toggle-status', [DepartmentApiController::class, 'toggleSectionStatus']);
        Route::delete('sections/{id}', [DepartmentApiController::class, 'destroySection']);
        Route::apiResource('facilities', FacilityApiController::class);
        Route::patch('facilities/{id}/toggle-status', [FacilityApiController::class, 'toggleStatus']);
        Route::get('hs-codes/rate-types', [HsCodeApiController::class, 'rateTypes']);
        Route::apiResource('hs-codes', HsCodeApiController::class);
        Route::apiResource('categories', CategoryApiController::class);
        Route::patch('categories/{id}/toggle-status', [CategoryApiController::class, 'toggleStatus']);
        Route::post('styles/import', [StyleImportApiController::class, 'import']);
        Route::get('styles/template', [StyleImportApiController::class, 'template']);
        Route::apiResource('styles', StyleApiController::class);
        Route::patch('styles/{id}/toggle-status', [StyleApiController::class, 'toggleStatus']);
        Route::apiResource('colours', ColourApiController::class);
        Route::patch('colours/{id}/toggle-status', [ColourApiController::class, 'toggleStatus']);
        Route::apiResource('accounts', AccountApiController::class);
        Route::patch('accounts/{id}/toggle-status', [AccountApiController::class, 'toggleStatus']);
        Route::apiResource('job-numbers', JobNumberApiController::class);
        Route::patch('job-numbers/{id}/toggle-status', [JobNumberApiController::class, 'toggleStatus']);
    });

    // Exim Operations
    Route::prefix('operations')->group(function () {
        Route::get('returns/available-sources', [ReceiveNoteReturnApiController::class, 'availableSourceItems']);
        Route::post('returns/{id}/approve', [ReceiveNoteReturnApiController::class, 'approve']);
        Route::post('returns/{id}/reject', [ReceiveNoteReturnApiController::class, 'reject']);
        Route::apiResource('returns', ReceiveNoteReturnApiController::class)->except(['update']);

        Route::post('document-histories/synchronize', [DocumentHistoryApiController::class, 'synchronize']);
        Route::post('document-histories/generate', [DocumentHistoryApiController::class, 'generate']);
        Route::apiResource('document-histories', DocumentHistoryApiController::class)->except(['update']);
    });
});

// =========================================================================
// 4. REPORTING & TRACEABILITY DOMAIN API
// =========================================================================
Route::prefix('reporting')->group(function () {
    Route::get('/traceability', [TraceabilityReportApiController::class, 'index']);
    Route::get('/traceability/{code}', [TraceabilityReportApiController::class, 'show'])->where('code', '.*');
    Route::get('/pr-report', [TraceabilityReportApiController::class, 'prReport']);
    Route::get('/po-report', [TraceabilityReportApiController::class, 'poReport']);
});

// =========================================================================
// 5. AUTH & USER PROFILE DOMAIN API
// =========================================================================
Route::prefix('auth')->group(function () {
    Route::post('/login', [AuthApiController::class, 'login']);
    Route::post('/logout', [AuthApiController::class, 'logout']);
    Route::get('/me', [AuthApiController::class, 'me']);
    Route::get('/users', [AuthApiController::class, 'users']);
});

Route::prefix('user')->group(function () {
    Route::get('/profile', [UserProfileApiController::class, 'show']);
    Route::post('/profile', [UserProfileApiController::class, 'update']);
    Route::put('/profile', [UserProfileApiController::class, 'update']);
});

// =========================================================================
// 6. DASHBOARD, SYSTEM CONTEXT & COMMON UTILITIES DOMAIN API
// =========================================================================
Route::prefix('dashboard')->group(function () {
    Route::get('/exchange-rates/latest', [ExchangeRateApiController::class, 'latest']);
    Route::get('/exchange-rates', [ExchangeRateApiController::class, 'index']);
    Route::post('/exchange-rates', [ExchangeRateApiController::class, 'store']);
    Route::put('/exchange-rates/{id}', [ExchangeRateApiController::class, 'update']);
    Route::delete('/exchange-rates/{id}', [ExchangeRateApiController::class, 'destroy']);

    Route::get('/stock-alerts', [StockNotificationApiController::class, 'alerts']);
    Route::patch('/stock-notifications/{id}/toggle-status', [StockNotificationApiController::class, 'toggleStatus']);
    Route::apiResource('stock-notifications', StockNotificationApiController::class);
});

Route::prefix('system')->group(function () {
    Route::get('/context', [SystemContextApiController::class, 'context']);
    Route::get('/settings', [SystemContextApiController::class, 'settings']);
    Route::put('/settings', [SystemContextApiController::class, 'updateSettings']);
});

Route::get('/master/lookups', [SystemContextApiController::class, 'lookups']);

// =========================================================================
// 7. BACKWARD-COMPATIBILITY ALIASES (Direct Routes for Existing Frontend)
// =========================================================================
Route::get('/pr', [PurchaseRequisitionApiController::class, 'index']);
Route::post('/pr', [PurchaseRequisitionApiController::class, 'store']);
Route::put('/pr/{id}', [PurchaseRequisitionApiController::class, 'update']);
Route::delete('/pr/{id}', [PurchaseRequisitionApiController::class, 'destroy']);
Route::get('/pr/{code}/attachment', [PurchaseRequisitionApiController::class, 'downloadAttachment'])->where('code', '.*(?<!/attachment)');
Route::get('/pr/{code}', [PurchaseRequisitionApiController::class, 'show'])->where('code', '.*');

Route::get('/po', [PurchaseOrderApiController::class, 'index']);
Route::post('/po', [PurchaseOrderApiController::class, 'store']);
Route::put('/po/{id}', [PurchaseOrderApiController::class, 'update']);
Route::delete('/po/{id}', [PurchaseOrderApiController::class, 'destroy']);
Route::get('/po/{code}', [PurchaseOrderApiController::class, 'show'])->where('code', '.*');

Route::get('/rn', [ReceiveNoteApiController::class, 'index']);
Route::post('/rn', [ReceiveNoteApiController::class, 'store']);
Route::put('/rn/{id}', [ReceiveNoteApiController::class, 'update']);
Route::delete('/rn/{id}', [ReceiveNoteApiController::class, 'destroy']);
Route::get('/rn/{code}', [ReceiveNoteApiController::class, 'show'])->where('code', '.*');

Route::get('/report', [TraceabilityReportApiController::class, 'index']);
Route::get('/report/{code}', [TraceabilityReportApiController::class, 'show'])->where('code', '.*');

Route::get('/warehouse', [WarehouseApiController::class, 'index']);
Route::post('/warehouse', [WarehouseApiController::class, 'store']);
Route::put('/warehouse/{id}', [WarehouseApiController::class, 'update']);
Route::delete('/warehouse/{id}', [WarehouseApiController::class, 'destroy']);
Route::get('/warehouse/{code}', [WarehouseApiController::class, 'show'])->where('code', '.*');

// =========================================================================
// 8. GOVERNANCE & SUPERADMIN API (BE-01, BE-02, BE-06)
// =========================================================================
Route::prefix('admin')->group(function () {
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
Route::prefix('v1/admin')->group(function () {
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
Route::prefix('approval')->group(function () {
    Route::post('/{module}/{id}/approve', [ApprovalWorkflowApiController::class, 'approve']);
    Route::post('/{module}/{id}/unapprove', [ApprovalWorkflowApiController::class, 'unapprove']);
    Route::post('/{module}/{id}/reject', [ApprovalWorkflowApiController::class, 'reject']);
    Route::post('/{module}/{id}/resubmit', [ApprovalWorkflowApiController::class, 'resubmit']);
    Route::post('/{module}/{id}/activity', [ApprovalWorkflowApiController::class, 'recordActivity']);
    Route::get('/{module}/{id}/history', [ApprovalWorkflowApiController::class, 'history']);
});

Route::prefix('v1/approval')->group(function () {
    Route::post('/{module}/{id}/approve', [ApprovalWorkflowApiController::class, 'approve']);
    Route::post('/{module}/{id}/unapprove', [ApprovalWorkflowApiController::class, 'unapprove']);
    Route::post('/{module}/{id}/reject', [ApprovalWorkflowApiController::class, 'reject']);
    Route::post('/{module}/{id}/resubmit', [ApprovalWorkflowApiController::class, 'resubmit']);
    Route::post('/{module}/{id}/activity', [ApprovalWorkflowApiController::class, 'recordActivity']);
    Route::get('/{module}/{id}/history', [ApprovalWorkflowApiController::class, 'history']);
});

// Direct Per-Module Approval Routes (For Seamless Frontend Consumption)
$workflowModules = ['pr', 'po', 'rn', 'bpb', 'warehouse', 'request-materials', 'returns', 'return'];
foreach ($workflowModules as $mod) {
    Route::post("{$mod}/{id}/approve", [ApprovalWorkflowApiController::class, 'approve'])->defaults('module', $mod);
    Route::post("{$mod}/{id}/unapprove", [ApprovalWorkflowApiController::class, 'unapprove'])->defaults('module', $mod);
    Route::post("{$mod}/{id}/reject", [ApprovalWorkflowApiController::class, 'reject'])->defaults('module', $mod);
    Route::post("{$mod}/{id}/resubmit", [ApprovalWorkflowApiController::class, 'resubmit'])->defaults('module', $mod);
    Route::post("{$mod}/{id}/activity", [ApprovalWorkflowApiController::class, 'recordActivity'])->defaults('module', $mod);
    Route::get("{$mod}/{id}/approval-history", [ApprovalWorkflowApiController::class, 'history'])->defaults('module', $mod);
}

Route::post('po/{id}/additional-costs', [PurchaseOrderApiController::class, 'storeAdditionalCost'])->where('id', '.*');
Route::delete('po/{id}/additional-costs/{costId}', [PurchaseOrderApiController::class, 'destroyAdditionalCost'])->where('id', '.*');
Route::post('procurement/transactions/purchase-order/{id}/additional-costs', [PurchaseOrderApiController::class, 'storeAdditionalCost'])->where('id', '.*');
Route::delete('procurement/transactions/purchase-order/{id}/additional-costs/{costId}', [PurchaseOrderApiController::class, 'destroyAdditionalCost'])->where('id', '.*');
