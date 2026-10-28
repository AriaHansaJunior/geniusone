<?php

use App\Http\Controllers\Api\Admin\AuditLogApiController;
// Procurement Domain Controllers
use App\Http\Controllers\Api\Admin\RolePermissionApiController;
use App\Http\Controllers\Api\Admin\UserManagementApiController;
use App\Http\Controllers\Api\Auth\AuthApiController;
use App\Http\Controllers\Api\Auth\UserProfileApiController;
use App\Http\Controllers\Api\Common\ExchangeRateApiController;
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
use App\Http\Controllers\Api\Warehouse\Master\WarehouseMasterApiController;
// Common & Dashboard Controllers
use App\Http\Controllers\Api\Warehouse\MaterialRequestApiController;
// Reporting Domain Controllers
use App\Http\Controllers\Api\Warehouse\ReceiveNoteApiController;
// Governance & Admin Controllers (BE-01, BE-02, BE-06)
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

    // Warehouse Reports (Stock Card & Stock Item)
    Route::prefix('reports')->group(function () {
        Route::get('/stock-card', [WarehouseReportApiController::class, 'stockCard']);
        Route::get('/stock-item', [WarehouseReportApiController::class, 'stockItem']);
    });

    // Material Requisitions (Request Material)
    Route::apiResource('request-materials', MaterialRequestApiController::class);
    Route::post('request-materials/{id}/approve', [MaterialRequestApiController::class, 'approve']);

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
        Route::post('styles/import', [StyleImportApiController::class, 'import']);
        Route::get('styles/template', [StyleImportApiController::class, 'template']);
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
// 6. DASHBOARD & COMMON UTILITIES DOMAIN API
// =========================================================================
Route::prefix('dashboard')->group(function () {
    Route::get('/exchange-rates', [ExchangeRateApiController::class, 'index']);
});

// =========================================================================
// 7. BACKWARD-COMPATIBILITY ALIASES (Direct Routes for Existing Frontend)
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
    Route::get('/{module}/{id}/history', [ApprovalWorkflowApiController::class, 'history']);
});

Route::prefix('v1/approval')->group(function () {
    Route::post('/{module}/{id}/approve', [ApprovalWorkflowApiController::class, 'approve']);
    Route::post('/{module}/{id}/unapprove', [ApprovalWorkflowApiController::class, 'unapprove']);
    Route::post('/{module}/{id}/reject', [ApprovalWorkflowApiController::class, 'reject']);
    Route::post('/{module}/{id}/resubmit', [ApprovalWorkflowApiController::class, 'resubmit']);
    Route::get('/{module}/{id}/history', [ApprovalWorkflowApiController::class, 'history']);
});

// Direct Per-Module Approval Routes (For Seamless Frontend Consumption)
$workflowModules = ['pr', 'po', 'rn', 'bpb', 'warehouse', 'request-materials', 'returns'];
foreach ($workflowModules as $mod) {
    Route::post("{$mod}/{id}/approve", [ApprovalWorkflowApiController::class, 'approve'])->defaults('module', $mod);
    Route::post("{$mod}/{id}/unapprove", [ApprovalWorkflowApiController::class, 'unapprove'])->defaults('module', $mod);
    Route::post("{$mod}/{id}/reject", [ApprovalWorkflowApiController::class, 'reject'])->defaults('module', $mod);
    Route::post("{$mod}/{id}/resubmit", [ApprovalWorkflowApiController::class, 'resubmit'])->defaults('module', $mod);
    Route::get("{$mod}/{id}/approval-history", [ApprovalWorkflowApiController::class, 'history'])->defaults('module', $mod);
}
