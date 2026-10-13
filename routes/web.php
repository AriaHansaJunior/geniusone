<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\PurchaseRequisitionController;
use App\Http\Controllers\PurchaseOrderController;
use App\Http\Controllers\ReportController;
use App\Http\Controllers\WarehouseController;

/*
|--------------------------------------------------------------------------
| Web Routes
|--------------------------------------------------------------------------
|
| Controllers serve both the Web Page views and dual-mode JSON API responses.
| The 4 connected modules:
| 1. Purchase Requisition (PR)
| 2. Purchase Order (PO)
| 3. Combined PR-PO Traceability Report
| 4. Warehouse Receive Material (BPB)
|
*/

// Default route -> Combined PR-PO Report
Route::get('/', [ReportController::class, 'index'])->name('home');

// Purchase Requisition (PR)
Route::get('/pr', [PurchaseRequisitionController::class, 'index'])->name('pr.index');
Route::get('/purchase-requisitions', [PurchaseRequisitionController::class, 'index'])->name('purchase-requisitions.index');
Route::get('/purchase-requests', fn() => redirect('/pr'));

Route::get('/pr/detail/{code}', [PurchaseRequisitionController::class, 'show'])->name('pr.detail');
Route::get('/pr/details/{code}', [PurchaseRequisitionController::class, 'show']);
Route::get('/purchase-requisition/detail/{code}', [PurchaseRequisitionController::class, 'show']);
Route::get('/purchase-requisitions/detail/{code}', [PurchaseRequisitionController::class, 'show']);

// Purchase Order (PO)
Route::get('/po', [PurchaseOrderController::class, 'index'])->name('po.index');
Route::get('/purchase-orders', [PurchaseOrderController::class, 'index'])->name('purchase-orders.index');

Route::get('/po/detail/{code}', [PurchaseOrderController::class, 'show'])->name('po.detail');
Route::get('/po/details/{code}', [PurchaseOrderController::class, 'show']);

// Combined PR-PO Report
Route::get('/report', [ReportController::class, 'index'])->name('report.index');
Route::get('/pr-po-report', [ReportController::class, 'index'])->name('pr-po-report.index');

Route::get('/report/detail/{code}', [ReportController::class, 'show'])->name('report.detail');
Route::get('/report/details/{code}', [ReportController::class, 'show']);

// Warehouse / BPB
Route::get('/warehouse', [WarehouseController::class, 'index'])->name('warehouse.index');
Route::get('/warehouse/bpb', [WarehouseController::class, 'index'])->name('warehouse.bpb.index');

Route::get('/warehouse/create', fn() => view('app', ['page' => 'warehouse-create']))->name('warehouse.create');
Route::get('/warehouse/add', fn() => view('app', ['page' => 'warehouse-create']));
Route::post('/warehouse/create', [WarehouseController::class, 'store']);
Route::post('/warehouse/store', [WarehouseController::class, 'store']);

Route::get('/warehouse/detail/{code}', [WarehouseController::class, 'show'])->name('warehouse.detail');
Route::get('/warehouse/details/{code}', [WarehouseController::class, 'show']);


Route::get('/po/details/{code}', function ($code) {
    return view('app', ['page' => 'po-detail', 'code' => $code]);
});

// Combined PR-PO Report List
Route::get('/report', function () {
    return view('app', ['page' => 'report']);
})->name('report.index');

Route::get('/pr-po-report', function () {
    return view('app', ['page' => 'report']);
})->name('pr-po-report.index');

// Combined PR-PO Report Details
Route::get('/report/detail/{code}', function ($code) {
    return view('app', ['page' => 'report-detail', 'code' => $code]);
})->name('report.detail');

Route::get('/report/details/{code}', function ($code) {
    return view('app', ['page' => 'report-detail', 'code' => $code]);
});

// Warehouse / BPB List
Route::get('/warehouse', function () {
    return view('app', ['page' => 'warehouse']);
})->name('warehouse.index');

Route::get('/warehouse/bpb', function () {
    return view('app', ['page' => 'warehouse']);
})->name('warehouse.bpb.index');

// Warehouse Receive Material Create (Add New Data)
Route::get('/warehouse/create', function () {
    return view('app', ['page' => 'warehouse-create']);
})->name('warehouse.create');

Route::get('/warehouse/add', function () {
    return view('app', ['page' => 'warehouse-create']);
});

// Warehouse Receive Material Details
Route::get('/warehouse/detail/{code}', function ($code) {
    return view('app', ['page' => 'warehouse-detail', 'code' => $code]);
})->name('warehouse.detail');

Route::get('/warehouse/details/{code}', function ($code) {
    return view('app', ['page' => 'warehouse-detail', 'code' => $code]);
});

// User Authentication (Frontend UI)
Route::get('/login', function () {
    return view('app', ['page' => 'login']);
})->name('login');

// Edit Profile Page
Route::get('/profile/edit', function () {
    return view('app', ['page' => 'edit-profile']);
})->name('profile.edit');

Route::get('/edit-profile', function () {
    return view('app', ['page' => 'edit-profile']);
});

