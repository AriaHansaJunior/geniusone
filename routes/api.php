<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\PurchaseRequisitionController;
use App\Http\Controllers\PurchaseOrderController;
use App\Http\Controllers\ReportController;
use App\Http\Controllers\WarehouseController;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
|
| Stateless API endpoints consumed by React frontend components.
|
*/

// Purchase Requisition (PR)
Route::get('/pr', [PurchaseRequisitionController::class, 'index']);
Route::get('/pr/{code}', [PurchaseRequisitionController::class, 'show']);

// Purchase Order (PO)
Route::get('/po', [PurchaseOrderController::class, 'index']);
Route::get('/po/{code}', [PurchaseOrderController::class, 'show']);

// Combined PR-PO Traceability Report
Route::get('/report', [ReportController::class, 'index']);
Route::get('/report/{code}', [ReportController::class, 'show']);

// Warehouse / BPB
Route::get('/warehouse', [WarehouseController::class, 'index']);
Route::get('/warehouse/{code}', [WarehouseController::class, 'show']);
Route::post('/warehouse', [WarehouseController::class, 'store']);
