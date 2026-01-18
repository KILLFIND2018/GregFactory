<?php

namespace App\Http\Controllers;

use App\Models\Block;
use App\Models\PlayerInventory;
use App\Helpers\ResourceHelper; // Добавляем импорт
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;

class BlockController extends Controller
{
    /**
     * Получить блоки в области
     */
    public function getArea(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'minX' => 'required|integer',
            'maxX' => 'required|integer|gte:minX',
            'minY' => 'required|integer',
            'maxY' => 'required|integer|gte:minY',
            'world_id' => 'integer|min:1'
        ]);

        if ($validator->fails()) {
            return response()->json(['error' => $validator->errors()], 400);
        }

        $minX = $request->input('minX');
        $maxX = $request->input('maxX');
        $minY = $request->input('minY');
        $maxY = $request->input('maxY');
        $worldId = $request->input('world_id', 1);

        try {
            $blocks = Block::getArea($minX, $maxX, $minY, $maxY, $worldId);
            return response()->json($blocks);
        } catch (\Exception $e) {
            return response()->json(['error' => 'Ошибка получения блоков: ' . $e->getMessage()], 500);
        }
    }

    /**
     * Получить тайл по координатам
     */
    public function getTile(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'x' => 'required|integer',
            'y' => 'required|integer',
            'world_id' => 'integer|min:1'
        ]);

        if ($validator->fails()) {
            return response()->json(['error' => $validator->errors()], 400);
        }

        $x = $request->input('x');
        $y = $request->input('y');
        $worldId = $request->input('world_id', 1);

        try {
            $tile = Block::getTileData($x, $y, $worldId);
            return response()->json($tile);
        } catch (\Exception $e) {
            return response()->json(['error' => 'Ошибка получения тайла: ' . $e->getMessage()], 500);
        }
    }

    /**
     * Обновить или создать блок
     */
    public function update(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'world_id' => 'integer|min:1',
            'x' => 'required|integer',
            'y' => 'required|integer',
            'layer' => 'required|string|max:1|in:s,g,o,e,p,l,r',
            'block_type' => 'required|string|max:50',
            'amount' => 'integer|min:0'
        ]);

        if ($validator->fails()) {
            return response()->json(['error' => $validator->errors()], 400);
        }

        try {
            DB::beginTransaction();

            $worldId = $request->input('world_id', 1);
            $x = $request->input('x');
            $y = $request->input('y');
            $layer = $request->input('layer');
            $blockType = $request->input('block_type');
            $amount = $request->input('amount', 1);

            $block = Block::updateOrCreate(
                [
                    'world_id' => $worldId,
                    'x' => $x,
                    'y' => $y,
                    'layer' => $layer
                ],
                [
                    'block_type' => $blockType,
                    'amount' => $amount
                ]
            );

            DB::commit();

            return response()->json([
                'success' => true,
                'block' => $block
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['error' => 'Ошибка сохранения блока: ' . $e->getMessage()], 500);
        }
    }

    /**
     * Обновить несколько блоков за раз
     */
    public function batchUpdate(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'blocks' => 'required|array|min:1',
            'blocks.*.x' => 'required|integer',
            'blocks.*.y' => 'required|integer',
            'blocks.*.layer' => 'required|string|max:1',
            'blocks.*.block_type' => 'required|string|max:50',
            'blocks.*.amount' => 'integer|min:0',
            'world_id' => 'integer|min:1'
        ]);

        if ($validator->fails()) {
            return response()->json(['error' => $validator->errors()], 400);
        }

        try {
            DB::beginTransaction();

            $worldId = $request->input('world_id', 1);
            $blocks = $request->input('blocks');
            $results = [];

            foreach ($blocks as $blockData) {
                $block = Block::updateOrCreate(
                    [
                        'world_id' => $worldId,
                        'x' => $blockData['x'],
                        'y' => $blockData['y'],
                        'layer' => $blockData['layer']
                    ],
                    [
                        'block_type' => $blockData['block_type'],
                        'amount' => $blockData['amount'] ?? 1
                    ]
                );

                $results[] = $block;
            }

            DB::commit();

            return response()->json([
                'success' => true,
                'count' => count($results),
                'blocks' => $results
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['error' => 'Ошибка пакетного обновления: ' . $e->getMessage()], 500);
        }
    }

    /**
     * Удалить блок
     */
    public function destroy(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'world_id' => 'integer|min:1',
            'x' => 'required|integer',
            'y' => 'required|integer',
            'layer' => 'required|string|max:1'
        ]);

        if ($validator->fails()) {
            return response()->json(['error' => $validator->errors()], 400);
        }

        try {
            $worldId = $request->input('world_id', 1);
            $x = $request->input('x');
            $y = $request->input('y');
            $layer = $request->input('layer');

            $deleted = Block::where([
                'world_id' => $worldId,
                'x' => $x,
                'y' => $y,
                'layer' => $layer
            ])->delete();

            return response()->json([
                'success' => $deleted > 0,
                'deleted' => $deleted
            ]);
        } catch (\Exception $e) {
            return response()->json(['error' => 'Ошибка удаления блока: ' . $e->getMessage()], 500);
        }
    }

    /**
     * Очистить все блоки в области (для отладки)
     */
    public function clearArea(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'minX' => 'required|integer',
            'maxX' => 'required|integer|gte:minX',
            'minY' => 'required|integer',
            'maxY' => 'required|integer|gte:minY',
            'world_id' => 'integer|min:1'
        ]);

        if ($validator->fails()) {
            return response()->json(['error' => $validator->errors()], 400);
        }

        try {
            DB::beginTransaction();

            $minX = $request->input('minX');
            $maxX = $request->input('maxX');
            $minY = $request->input('minY');
            $maxY = $request->input('maxY');
            $worldId = $request->input('world_id', 1);

            $deleted = Block::where('world_id', $worldId)
                ->whereBetween('x', [$minX, $maxX])
                ->whereBetween('y', [$minY, $maxY])
                ->delete();

            DB::commit();

            return response()->json([
                'success' => true,
                'deleted' => $deleted
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['error' => 'Ошибка очистки области: ' . $e->getMessage()], 500);
        }
    }

    // Добавим новый метод для обработки добычи блока
    public function mineBlock(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'player_id' => 'required|integer|exists:players,id',
            'x' => 'required|integer',
            'y' => 'required|integer',
            'layer' => 'required|string|max:1|in:s,g,o,e,p,l,r',
            'block_type' => 'required|string|max:50',
            'world_id' => 'integer|min:1'
        ]);

        if ($validator->fails()) {
            return response()->json(['error' => $validator->errors()], 400);
        }

        try {
            DB::beginTransaction();

            $playerId = $request->input('player_id');
            $x = $request->input('x');
            $y = $request->input('y');
            $layer = $request->input('layer');
            $blockType = $request->input('block_type');
            $worldId = $request->input('world_id', 1);

            // Проверяем, можно ли добывать этот блок
            if (!ResourceHelper::isMineable($blockType)) {
                throw new \Exception('Этот блок нельзя добыть');
            }

            // Получаем информацию о дропе
            $dropCount = ResourceHelper::getDropCount($blockType);
            $isPersistent = ResourceHelper::isPersistent($blockType);
            $isFinite = ResourceHelper::isFinite($blockType);
            $itemType = ResourceHelper::getItemType($blockType);

            // Логика обработки добычи:

            // 1. Если блок персистентный - он остается на карте
            if (!$isPersistent) {
                // Удаляем блок из мира
                Block::where([
                    'world_id' => $worldId,
                    'x' => $x,
                    'y' => $y,
                    'layer' => $layer
                ])->delete();

                // ЛОГИКА ЗАМЕНЫ СЛОЯ (аналогично клиенту)
                // Получаем текущий тайл
                $tile = Block::getTileData($x, $y, $worldId);

                switch($layer) {
                    case 'e':
                        // Удаляем объект - ничего не заменяем
                        break;

                    case 's':
                        // Поверхность -> грунт/подпочва/руда/скала
                        if (isset($tile['g']) && $tile['g'] !== 'none') {
                            Block::saveTile($x, $y, ['s' => $tile['g']], $worldId);
                            Block::where([
                                'world_id' => $worldId,
                                'x' => $x,
                                'y' => $y,
                                'layer' => 'g'
                            ])->delete();
                        } else if (isset($tile['p']) && $tile['p'] !== 'none') {
                            Block::saveTile($x, $y, ['s' => $tile['p']], $worldId);
                            Block::where([
                                'world_id' => $worldId,
                                'x' => $x,
                                'y' => $y,
                                'layer' => 'p'
                            ])->delete();
                        } else if (isset($tile['o']) && $tile['o'] !== 'none') {
                            Block::saveTile($x, $y, ['s' => $tile['o']], $worldId);
                            Block::where([
                                'world_id' => $worldId,
                                'x' => $x,
                                'y' => $y,
                                'layer' => 'o'
                            ])->delete();
                        } else {
                            // Достигли скальной породы
                            Block::saveTile($x, $y, ['s' => 'stone'], $worldId);
                        }
                        break;

                    case 'g':
                        // Грунт -> подпочва/руда/скала
                        if (isset($tile['p']) && $tile['p'] !== 'none') {
                            Block::saveTile($x, $y, ['s' => $tile['p']], $worldId);
                            Block::where([
                                'world_id' => $worldId,
                                'x' => $x,
                                'y' => $y,
                                'layer' => 'p'
                            ])->delete();
                        } else if (isset($tile['o']) && $tile['o'] !== 'none') {
                            Block::saveTile($x, $y, ['s' => $tile['o']], $worldId);
                            Block::where([
                                'world_id' => $worldId,
                                'x' => $x,
                                'y' => $y,
                                'layer' => 'o'
                            ])->delete();
                        } else {
                            Block::saveTile($x, $y, ['s' => 'stone'], $worldId);
                        }
                        break;

                    case 'o':
                        // Руда -> скала
                        Block::saveTile($x, $y, ['s' => 'stone'], $worldId);
                        break;
                }
            }

            // 2. Если блок конечный и дает дроп - добавляем в инвентарь
            if ($dropCount > 0 && $isFinite) {
                // Добавляем в инвентарь игрока
                $inventoryItem = PlayerInventory::addItem(
                    $playerId,
                    $itemType,
                    $blockType,
                    $dropCount
                );
            }

            DB::commit();

            return response()->json([
                'success' => true,
                'mined' => true,
                'persistent' => $isPersistent,
                'drop' => $dropCount,
                'added_to_inventory' => $dropCount > 0 && $isFinite
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['error' => 'Ошибка добычи блока: ' . $e->getMessage()], 500);
        }
    }

    /**
     * Обновить весь тайл (все слои)
     */
    public function updateTile(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'world_id' => 'integer|min:1',
            'x' => 'required|integer',
            'y' => 'required|integer',
            'layers' => 'required|array'
        ]);

        if ($validator->fails()) {
            return response()->json(['error' => $validator->errors()], 400);
        }

        try {
            DB::beginTransaction();

            $worldId = $request->input('world_id', 1);
            $x = $request->input('x');
            $y = $request->input('y');
            $layers = $request->input('layers');

            // Удаляем все существующие слои для этой клетки
            Block::where([
                'world_id' => $worldId,
                'x' => $x,
                'y' => $y
            ])->delete();

            // Создаем новые слои
            foreach ($layers as $layer => $blockType) {
                // Пропускаем служебные поля жидкости
                if (in_array($layer, ['la', 'lm', 'ld'])) continue;

                // Для жидкости сохраняем amount
                $amount = 1;
                if ($layer === 'l' && isset($layers['la'])) {
                    $amount = $layers['la'];
                }

                Block::create([
                    'world_id' => $worldId,
                    'x' => $x,
                    'y' => $y,
                    'layer' => $layer,
                    'block_type' => $blockType,
                    'amount' => $amount
                ]);
            }

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Тайл обновлен'
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['error' => 'Ошибка обновления тайла: ' . $e->getMessage()], 500);
        }
    }
}
