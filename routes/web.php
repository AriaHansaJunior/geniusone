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

// Purchase Request
Route::get('/pr', function () {
    return view('app', ['page' => 'pr']);
})->name('pr.index');

Route::get('/purchase-requests', function () {
    return view('app', ['page' => 'pr']);
})->name('purchase-requests.index');

// Purchase Order
Route::get('/po', function () {
    return view('app', ['page' => 'po']);
})->name('po.index');

Route::get('/purchase-orders', function () {
    return view('app', ['page' => 'po']);
})->name('purchase-orders.index');

// Combined PR-PO Report
Route::get('/report', function () {
    return view('app', ['page' => 'report']);
})->name('report.index');

Route::get('/pr-po-report', function () {
    return view('app', ['page' => 'report']);
})->name('pr-po-report.index');

// Warehouse / BPB
Route::get('/warehouse', function () {
    return view('app', ['page' => 'warehouse']);
})->name('warehouse.index');

Route::get('/warehouse/bpb', function () {
    return view('app', ['page' => 'warehouse']);
})->name('warehouse.bpb.index');
