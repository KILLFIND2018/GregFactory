<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Block extends Model
{
    protected $table = 'blocks';

    protected $fillable = [
        'world_id', 'x', 'y', 'layer',
        'block_type', 'amount'
    ];

    protected $casts = [
        'amount' => 'integer',
        'x' => 'integer',
        'y' => 'integer',
        'world_id' => 'integer'
    ];

    /**
     * Получить все слои для координаты (x, y) в виде массива
     */
    public static function getTileData(int $x, int $y, int $worldId = 1): array
    {
        $blocks = self::where('world_id', $worldId)
            ->where('x', $x)
            ->where('y', $y)
            ->get()
            ->keyBy('layer');

        $tile = [];
        foreach ($blocks as $layer => $block) {
            $tile[$layer] = $block->block_type;
            // Для жидкости добавляем дополнительные поля
            if ($layer === 'l') {
                $tile['la'] = $block->amount;
                $tile['lm'] = $block->amount; // или отдельное поле max_amount
            }
        }

        return $tile;
    }

    /**
     * Сохранить изменения тайла
     */
    public static function saveTile(int $x, int $y, array $tileData, int $worldId = 1): void
    {
        $layers = ['s', 'g', 'o', 'e', 'p', 'l', 'r'];

        foreach ($layers as $layer) {
            if (isset($tileData[$layer])) {
                self::updateOrCreate(
                    [
                        'world_id' => $worldId,
                        'x' => $x,
                        'y' => $y,
                        'layer' => $layer
                    ],
                    [
                        'block_type' => $tileData[$layer],
                        'amount' => ($layer === 'l') ? ($tileData['la'] ?? 1) : 1
                    ]
                );
            } else {
                // Удаляем слой, если его нет в данных
                self::where('world_id', $worldId)
                    ->where('x', $x)
                    ->where('y', $y)
                    ->where('layer', $layer)
                    ->delete();
            }
        }
    }

    /**
     * Получить блоки для области
     */
    public static function getArea(int $minX, int $maxX, int $minY, int $maxY, int $worldId = 1): array
    {
        $blocks = self::where('world_id', $worldId)
            ->whereBetween('x', [$minX, $maxX])
            ->whereBetween('y', [$minY, $maxY])
            ->get();

        $result = [];
        foreach ($blocks as $block) {
            if (!isset($result[$block->y][$block->x])) {
                $result[$block->y][$block->x] = [];
            }
            $result[$block->y][$block->x][$block->layer] = $block->block_type;
            if ($block->layer === 'l') {
                $result[$block->y][$block->x]['la'] = $block->amount;
            }
        }

        return $result;
    }


}
