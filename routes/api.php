<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\WorldController;

Route::get('/chunk', [WorldController::class, 'chunk']);

