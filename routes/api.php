<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\WorldController;

// Убираем лишний /api, так как Laravel добавит его сам
Route::get('/chunk', [WorldController::class, 'chunk']);
