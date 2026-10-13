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

// Default route -> Dashboard
Route::get('/', function () {
    return view('app', ['page' => 'dashboard']);
})->name('home');

Route::get('/dashboard', function () {
    return view('app', ['page' => 'dashboard']);
})->name('dashboard');

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

// Procurement - Purchase Master Routes
Route::get('/procurement/supplier', function () {
    return view('app', ['page' => 'supplier']);
})->name('procurement.supplier');

Route::get('/procurement/payment-term', function () {
    return view('app', ['page' => 'payment-term']);
})->name('procurement.payment-term');

Route::get('/procurement/purchase-category', function () {
    return view('app', ['page' => 'purchase-category']);
})->name('procurement.purchase-category');

Route::get('/procurement/delivery-terms', function () {
    return view('app', ['page' => 'delivery-terms']);
})->name('procurement.delivery-terms');

Route::get('/procurement/additional-costs', function () {
    return view('app', ['page' => 'additional-costs']);
})->name('procurement.additional-costs');

Route::get('/procurement/pph', function () {
    return view('app', ['page' => 'pph']);
})->name('procurement.pph');

// Procurement - Reports Routes
Route::get('/procurement/pr-report', function () {
    return view('app', ['page' => 'pr-report']);
})->name('procurement.pr-report');

Route::get('/procurement/po-report', function () {
    return view('app', ['page' => 'po-report']);
})->name('procurement.po-report');

// Exim - Master Routes
Route::get('/exim/unit', function () {
    return view('app', ['page' => 'unit']);
})->name('exim.unit');

Route::get('/exim/satuan', function () {
    return view('app', ['page' => 'satuan']);
})->name('exim.satuan');

Route::get('/exim/item', function () {
    return view('app', ['page' => 'item']);
})->name('exim.item');

Route::get('/exim/brand', function () {
    return view('app', ['page' => 'brand']);
})->name('exim.brand');

Route::get('/exim/classification', function () {
    return view('app', ['page' => 'classification']);
})->name('exim.classification');

Route::get('/exim/department', function () {
    return view('app', ['page' => 'department']);
})->name('exim.department');

Route::get('/exim/facility', function () {
    return view('app', ['page' => 'facility']);
})->name('exim.facility');

Route::get('/exim/hs', function () {
    return view('app', ['page' => 'hs']);
})->name('exim.hs');

Route::get('/exim/category', function () {
    return view('app', ['page' => 'category']);
})->name('exim.category');

Route::get('/exim/style', function () {
    return view('app', ['page' => 'style']);
})->name('exim.style');

Route::get('/exim/colour', function () {
    return view('app', ['page' => 'colour']);
})->name('exim.colour');

// Exim - Other Routes
Route::get('/exim/receive-note', function () {
    return view('app', ['page' => 'receive-note']);
})->name('exim.receive-note');

Route::get('/exim/receive-note-return', function () {
    return view('app', ['page' => 'receive-note-return']);
})->name('exim.receive-note-return');

Route::get('/exim/document-history', function () {
    return view('app', ['page' => 'document-history']);
})->name('exim.document-history');

// Warehouse Master Route
Route::get('/warehouse/master', function () {
    return view('app', ['page' => 'warehouse-master']);
})->name('warehouse.master');

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
