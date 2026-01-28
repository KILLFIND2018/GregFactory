<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\WorldController;
use App\Http\Controllers\PlayerController;
use App\Http\Controllers\BlockController;
use App\Http\Controllers\InventoryController;

/*
|--------------------------------------------------------------------------
| World
|--------------------------------------------------------------------------
*/
Route::get('/chunk', [WorldController::class, 'chunk']);

/*
|--------------------------------------------------------------------------
| Blocks
|--------------------------------------------------------------------------
*/
Route::prefix('blocks')->group(function () {
    // Маршруты для блоков
    Route::get('/area', [BlockController::class, 'getArea']);
    Route::get('/tile', [BlockController::class, 'getTile']);
    Route::post('/update', [BlockController::class, 'update']);
    Route::post('/update-tile', [BlockController::class, 'updateTile']);
    Route::post('/batch-update', [BlockController::class, 'batchUpdate']);
    Route::post('/mine', [BlockController::class, 'mineBlock']);
    Route::delete('/delete', [BlockController::class, 'destroy']);
    Route::delete('/clear-area', [BlockController::class, 'clearArea']);
});

/*
|--------------------------------------------------------------------------
| Player
|--------------------------------------------------------------------------
*/
Route::prefix('player')->group(function () {
    Route::post('/spawn', [PlayerController::class, 'spawn']);
    Route::post('/update', [PlayerController::class, 'update']);
    Route::get('/{id}', [PlayerController::class, 'show']);
    Route::post('/update-hp', [PlayerController::class, 'updateHp']);
});

/*
|--------------------------------------------------------------------------
| Inventory
|--------------------------------------------------------------------------
*/
Route::prefix('inventory')->group(function () {
    Route::get('/', [InventoryController::class, 'show']);
    Route::post('/add', [InventoryController::class, 'addItem']);
    Route::post('/remove', [InventoryController::class, 'removeItem']);
    Route::post('/update-tool', [InventoryController::class, 'updateToolDurability']);
    Route::post('/transfer', [InventoryController::class, 'transferItem']);
    Route::get('/item-count', [InventoryController::class, 'getItemCount']);
    Route::get('/update-slot', [InventoryController::class, 'updateSlot']);
    Route::post('/move', [InventoryController::class, 'moveItem']);
});
