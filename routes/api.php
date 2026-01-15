<?php

use App\Http\Controllers\PlayerController;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\WorldController;

// Убираем лишний /api, так как Laravel добавит его сам
Route::get('/chunk', [WorldController::class, 'chunk']);

Route::post('/player/spawn', [PlayerController::class, 'spawn']);
Route::post('/player/update', [PlayerController::class, 'update']);

