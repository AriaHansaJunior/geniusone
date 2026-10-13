<?php

use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Web Routes
|--------------------------------------------------------------------------
|
| Frontend routes for GENIUSONE enterprise operations application.
| All pages are integrated with the shared application shell and layout.
|
*/

// Default route -> Dashboard
Route::get('/', function () {
    return view('app', ['page' => 'dashboard']);
})->name('home');

Route::get('/dashboard', function () {
    return view('app', ['page' => 'dashboard']);
})->name('dashboard');

// Purchase Requisition List
Route::get('/pr', function () {
    return view('app', ['page' => 'pr']);
})->name('pr.index');

Route::get('/purchase-requisitions', function () {
    return view('app', ['page' => 'pr']);
})->name('purchase-requisitions.index');

Route::get('/purchase-requests', function () {
    return redirect('/pr');
});

// Purchase Requisition Details
Route::get('/pr/detail/{code}', function ($code) {
    return view('app', ['page' => 'pr-detail', 'code' => $code]);
})->name('pr.detail');

Route::get('/pr/details/{code}', function ($code) {
    return view('app', ['page' => 'pr-detail', 'code' => $code]);
});

Route::get('/purchase-requisition/detail/{code}', function ($code) {
    return view('app', ['page' => 'pr-detail', 'code' => $code]);
});

Route::get('/purchase-requisitions/detail/{code}', function ($code) {
    return view('app', ['page' => 'pr-detail', 'code' => $code]);
});

// Purchase Order List
Route::get('/po', function () {
    return view('app', ['page' => 'po']);
})->name('po.index');

Route::get('/purchase-orders', function () {
    return view('app', ['page' => 'po']);
})->name('purchase-orders.index');

// Purchase Order Details
Route::get('/po/detail/{code}', function ($code) {
    return view('app', ['page' => 'po-detail', 'code' => $code]);
})->name('po.detail');

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

// Warehouse / BPB List
Route::get('/warehouse', function () {
    return view('app', ['page' => 'warehouse']);
})->name('warehouse.index');

Route::get('/warehouse/bpb', function () {
    return view('app', ['page' => 'warehouse']);
})->name('warehouse.bpb.index');

// Warehouse Master Route
Route::get('/warehouse/master', function () {
    return view('app', ['page' => 'warehouse-master']);
})->name('warehouse.master');

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
