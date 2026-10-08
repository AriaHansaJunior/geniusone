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

// Default route -> Combined PR-PO Report
Route::get('/', function () {
    return view('app', ['page' => 'report']);
})->name('home');

// Purchase Request List
Route::get('/pr', function () {
    return view('app', ['page' => 'pr']);
})->name('pr.index');

Route::get('/purchase-requests', function () {
    return view('app', ['page' => 'pr']);
})->name('purchase-requests.index');

// Purchase Request Details
Route::get('/pr/detail/{code}', function ($code) {
    return view('app', ['page' => 'pr-detail', 'code' => $code]);
})->name('pr.detail');

Route::get('/pr/details/{code}', function ($code) {
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
