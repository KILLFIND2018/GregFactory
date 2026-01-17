<?php

namespace App\Http\Controllers;

use App\Models\PlayerInventory;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\DB;

class InventoryController extends Controller
{
    /**
     * Получить инвентарь игрока
     */
    public function show(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'player_id' => 'required|integer|exists:players,id'
        ]);

        if ($validator->fails()) {
            return response()->json(['error' => $validator->errors()], 400);
        }

        $playerId = $request->input('player_id');

        try {
            $inventory = PlayerInventory::getFullInventory($playerId);

            return response()->json([
                'success' => true,
                'inventory' => $inventory
            ]);
        } catch (\Exception $e) {
            return response()->json(['error' => 'Ошибка получения инвентаря: ' . $e->getMessage()], 500);
        }
    }

    /**
     * Добавить предмет в инвентарь
     */
    public function addItem(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'player_id' => 'required|integer|exists:players,id',
            'item_type' => 'required|string|in:block,tool,item',
            'item_id' => 'required|string|max:50',
            'quantity' => 'integer|min:1',
            'durability' => 'integer|nullable|min:0',
            'max_durability' => 'integer|nullable|min:1',
            'metadata' => 'array|nullable'
        ]);

        if ($validator->fails()) {
            return response()->json(['error' => $validator->errors()], 400);
        }

        try {
            DB::beginTransaction();

            $playerId = $request->input('player_id');
            $itemType = $request->input('item_type');
            $itemId = $request->input('item_id');
            $quantity = $request->input('quantity', 1);
            $durability = $request->input('durability');
            $maxDurability = $request->input('max_durability');
            $metadata = $request->input('metadata');

            $item = PlayerInventory::addItem($playerId, $itemType, $itemId, $quantity, $metadata);

            // Если указана прочность, обновляем
            if ($durability !== null) {
                $item->durability = $durability;
            }
            if ($maxDurability !== null) {
                $item->max_durability = $maxDurability;
            }
            $item->save();

            DB::commit();

            return response()->json([
                'success' => true,
                'item' => $item
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['error' => 'Ошибка добавления предмета: ' . $e->getMessage()], 500);
        }
    }

    /**
     * Удалить предмет из инвентаря
     */
    public function removeItem(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'player_id' => 'required|integer|exists:players,id',
            'item_type' => 'required|string|in:block,tool,item',
            'item_id' => 'required|string|max:50',
            'quantity' => 'integer|min:1'
        ]);

        if ($validator->fails()) {
            return response()->json(['error' => $validator->errors()], 400);
        }

        try {
            DB::beginTransaction();

            $playerId = $request->input('player_id');
            $itemType = $request->input('item_type');
            $itemId = $request->input('item_id');
            $quantity = $request->input('quantity', 1);

            $success = PlayerInventory::removeItem($playerId, $itemType, $itemId, $quantity);

            DB::commit();

            return response()->json([
                'success' => $success,
                'message' => $success ? 'Предмет удален' : 'Предмет не найден'
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['error' => 'Ошибка удаления предмета: ' . $e->getMessage()], 500);
        }
    }

    /**
     * Обновить прочность инструмента
     */
    public function updateToolDurability(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'player_id' => 'required|integer|exists:players,id',
            'tool_id' => 'required|string|max:50',
            'durability' => 'required|integer|min:0'
        ]);

        if ($validator->fails()) {
            return response()->json(['error' => $validator->errors()], 400);
        }

        try {
            $playerId = $request->input('player_id');
            $toolId = $request->input('tool_id');
            $durability = $request->input('durability');

            $success = PlayerInventory::updateToolDurability($playerId, $toolId, $durability);

            return response()->json([
                'success' => $success,
                'message' => $success ? 'Прочность обновлена' : 'Инструмент не найден'
            ]);
        } catch (\Exception $e) {
            return response()->json(['error' => 'Ошибка обновления прочности: ' . $e->getMessage()], 500);
        }
    }

    /**
     * Обмен предметами между игроками (для будущей торговли)
     */
    public function transferItem(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'from_player_id' => 'required|integer|exists:players,id',
            'to_player_id' => 'required|integer|exists:players,id|different:from_player_id',
            'item_type' => 'required|string|in:block,tool,item',
            'item_id' => 'required|string|max:50',
            'quantity' => 'required|integer|min:1'
        ]);

        if ($validator->fails()) {
            return response()->json(['error' => $validator->errors()], 400);
        }

        try {
            DB::beginTransaction();

            $fromPlayerId = $request->input('from_player_id');
            $toPlayerId = $request->input('to_player_id');
            $itemType = $request->input('item_type');
            $itemId = $request->input('item_id');
            $quantity = $request->input('quantity');

            // Проверяем, есть ли у отправителя достаточно предметов
            $fromItem = PlayerInventory::where([
                'player_id' => $fromPlayerId,
                'item_type' => $itemType,
                'item_id' => $itemId
            ])->first();

            if (!$fromItem || $fromItem->quantity < $quantity) {
                throw new \Exception('Недостаточно предметов для передачи');
            }

            // Уменьшаем количество у отправителя
            PlayerInventory::removeItem($fromPlayerId, $itemType, $itemId, $quantity);

            // Добавляем получателю
            // Для инструментов передаем также прочность
            if ($itemType === 'tool' && $fromItem) {
                // Если передаем весь инструмент
                if ($fromItem->quantity === $quantity) {
                    PlayerInventory::addItem(
                        $toPlayerId,
                        $itemType,
                        $itemId,
                        $quantity,
                        $fromItem->metadata
                    );

                    // Обновляем прочность
                    $toItem = PlayerInventory::where([
                        'player_id' => $toPlayerId,
                        'item_type' => $itemType,
                        'item_id' => $itemId
                    ])->first();

                    if ($toItem) {
                        $toItem->durability = $fromItem->durability;
                        $toItem->max_durability = $fromItem->max_durability;
                        $toItem->save();
                    }
                } else {
                    // Если передаем часть инструментов - создаем новые с полной прочностью
                    PlayerInventory::addItem($toPlayerId, $itemType, $itemId, $quantity);
                }
            } else {
                // Для блоков и предметов просто добавляем
                PlayerInventory::addItem($toPlayerId, $itemType, $itemId, $quantity);
            }

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Предметы успешно переданы'
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['error' => 'Ошибка передачи предметов: ' . $e->getMessage()], 500);
        }
    }

    /**
     * Получить количество конкретного предмета
     */
    public function getItemCount(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'player_id' => 'required|integer|exists:players,id',
            'item_type' => 'required|string|in:block,tool,item',
            'item_id' => 'required|string|max:50'
        ]);

        if ($validator->fails()) {
            return response()->json(['error' => $validator->errors()], 400);
        }

        $playerId = $request->input('player_id');
        $itemType = $request->input('item_type');
        $itemId = $request->input('item_id');

        $item = PlayerInventory::where([
            'player_id' => $playerId,
            'item_type' => $itemType,
            'item_id' => $itemId
        ])->first();

        return response()->json([
            'success' => true,
            'count' => $item ? $item->quantity : 0,
            'item' => $item
        ]);
    }
}
