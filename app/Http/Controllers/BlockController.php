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

            // Получаем ПОЛНЫЙ тайл ДО изменений
            $originalTile = Block::getTileData($x, $y, $worldId);

            // === НОРМАЛИЗАЦИЯ ТАЙЛА ===
            $originalTile = array_merge([
                'b' => null,
                'l' => null,
                'la' => 0,
                'lm' => 0,
                'o' => null,
                's' => null,
                'g' => null,
            ], $originalTile);

            // Логируем для отладки
            \Log::info("Mining block", [
                'x' => $x,
                'y' => $y,
                'layer' => $layer,
                'blockType' => $blockType,
                'originalTile' => $originalTile
            ]);

            // === ВОССТАНОВЛЕНИЕ ДЕФОЛТНЫХ СЛОЁВ ===
            if ($originalTile['g'] === null && $blockType === 'grass') {
                $originalTile['g'] = 'dirt';
            }



            // Сохраняем ВСЕ важные данные из оригинального тайла
            $preservedData = [
                'b' => $originalTile['b'] ?? null,      // биом
                'l' => $originalTile['l'] ?? null,      // жидкость
                'la' => $originalTile['la'] ?? 0,
                'lm' => $originalTile['lm'] ?? 0,
                'o' => $originalTile['o'] ?? null,      // руда
                's' => $originalTile['s'] ?? null,      // поверхность
                'g' => $originalTile['g'] ?? null,      // грунт
            ];

            // Для персистентных блоков (камень) - только добавляем в инвентарь
            if ($isPersistent) {
                if ($dropCount > 0) {
                    PlayerInventory::addItem($playerId, $itemType, $blockType, $dropCount);
                }

                DB::commit();

                $updatedTile = Block::getTileData($x, $y, $worldId);
                $updatedTile = $this->mergePreservedData($updatedTile, $preservedData);

                return response()->json([
                    'success' => true,
                    'mined' => true,
                    'persistent' => true,
                    'drop' => $dropCount,
                    'added_to_inventory' => $dropCount > 0,
                    'tile' => $updatedTile
                ]);
            }

            // === ЛОГИКА УДАЛЕНИЯ СЛОЁВ ===

            // Удаляем ТОЛЬКО добываемый слой
            Block::where([
                'world_id' => $worldId,
                'x' => $x,
                'y' => $y,
                'layer' => $layer
            ])->delete();

            // Определяем изменения в зависимости от слоя
            $shouldUpdateSurface = false;
            $newSurfaceBlock = null;
            $shouldDeleteGround = false;

            switch($layer) {
                case 'e':
                    // Удалили объект (дерево/цветок/траву)
                    // НИЧЕГО больше не меняем! Поверхность и грунт остаются.
                    break;

                case 's':
                    // Удалили поверхность - показываем грунт или камень
                    $shouldUpdateSurface = true;

                    if (!empty($preservedData['g']) && $preservedData['g'] !== 'none') {
                        // Грунт становится новой поверхностью
                        $newSurfaceBlock = $preservedData['g'];
                        $shouldDeleteGround = true;
                    } else {
                        // Нет грунта - показываем камень
                        $newSurfaceBlock = 'stone';
                    }
                    break;

                case 'g':
                    // Удалили грунт - поверхность становится камнем
                    $shouldUpdateSurface = true;
                    $newSurfaceBlock = 'stone';
                    // Руда и жидкость остаются!
                    break;

                case 'o':
                    // Удалили руду - поверхность становится камнем
                    $shouldUpdateSurface = true;
                    $newSurfaceBlock = 'stone';
                    // Очищаем руду из preserved data
                    $preservedData['o'] = null;
                    break;
            }

            // Удаляем грунт если нужно (когда он стал поверхностью)
            if ($shouldDeleteGround) {
                Block::where([
                    'world_id' => $worldId,
                    'x' => $x,
                    'y' => $y,
                    'layer' => 'g'
                ])->delete();
                // Очищаем грунт из preserved data
                $preservedData['g'] = null;
            }

            // Обновляем поверхность если нужно
            if ($shouldUpdateSurface && $newSurfaceBlock !== null) {
                Block::updateOrCreate(
                    [
                        'world_id' => $worldId,
                        'x' => $x,
                        'y' => $y,
                        'layer' => 's'
                    ],
                    [
                        'block_type' => $newSurfaceBlock,
                        'amount' => 1
                    ]
                );
                // Обновляем preserved data
                $preservedData['s'] = $newSurfaceBlock;
            }

            // Добавляем в инвентарь
            if ($dropCount > 0 && $isFinite) {
                PlayerInventory::addItem($playerId, $itemType, $blockType, $dropCount);
            }

            // === СОХРАНЕНИЕ ИТОГОВОГО ТАЙЛА ===

            // Получаем текущий тайл (из БД или пустой)
            $currentTile = Block::getTileData($x, $y, $worldId);

            // Мержим с актуальными слоями после добычи
            $finalTile = $this->mergePreservedData($currentTile, $preservedData);

            // Сохраняем ВСЕ слои тайла в БД
            Block::saveTile($x, $y, $finalTile, $worldId);


            DB::commit();

            // Получаем обновлённый тайл
            $updatedTile = Block::getTileData($x, $y, $worldId);

            // Мержим сохранённые данные (жидкость, руда, биом)
            $updatedTile = $this->mergePreservedData($updatedTile, $preservedData);

            // Логируем результат
            \Log::info("Mining complete", [
                'updatedTile' => $updatedTile
            ]);

            return response()->json([
                'success' => true,
                'mined' => true,
                'persistent' => false,
                'drop' => $dropCount,
                'added_to_inventory' => $dropCount > 0 && $isFinite,
                'tile' => $updatedTile,
                'item_type' => $itemType,
                'block_type' => $blockType
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            \Log::error("Mining error: " . $e->getMessage());
            return response()->json(['error' => 'Ошибка добычи блока: ' . $e->getMessage()], 500);
        }
    }

    /**
     * Мержит сохранённые данные в тайл
     */
    private function mergePreservedData(array $tile, array $preservedData): array
    {
        // Биом - всегда сохраняем
        if (empty($tile['b']) && !empty($preservedData['b'])) {
            $tile['b'] = $preservedData['b'];
        }

        // Жидкость - всегда сохраняем
        if (!empty($preservedData['l']) && $preservedData['l'] !== 'none') {
            $tile['l'] = $preservedData['l'];
            $tile['la'] = $preservedData['la'];
            $tile['lm'] = $preservedData['lm'];
        }

        // Руда - сохраняем если не была добыта
        if (!empty($preservedData['o']) && $preservedData['o'] !== 'none') {
            if (empty($tile['o']) || $tile['o'] === 'none') {
                $tile['o'] = $preservedData['o'];
            }
        }

        // Поверхность - если пустая, берём из preserved или ставим stone
        if (empty($tile['s']) || $tile['s'] === 'none') {
            if (!empty($preservedData['s']) && $preservedData['s'] !== 'none') {
                $tile['s'] = $preservedData['s'];
            } else {
                $tile['s'] = 'stone';
            }
        }

        // Грунт - сохраняем если есть
        if (!empty($preservedData['g']) && $preservedData['g'] !== 'none') {
            if (empty($tile['g']) || $tile['g'] === 'none') {
                $tile['g'] = $preservedData['g'];
            }
        }

        return $tile;
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
