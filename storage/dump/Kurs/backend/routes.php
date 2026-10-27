<?php

use App\Kurs\KursApiController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Modular Kurs & Currency Exchange Routes
|--------------------------------------------------------------------------
|
| This file is automatically loaded if the /app/Kurs folder exists.
| If /app/Kurs is deleted, the application seamlessly reverts to standard fallback.
|
*/

Route::get('/dashboard/exchange-rates', [KursApiController::class, 'index']);
Route::get('/kurs/latest', [KursApiController::class, 'latestUsd']);
Route::get('/kurs/rates', [KursApiController::class, 'index']);
Route::get('/kurs/currencies', [KursApiController::class, 'currencies']);
