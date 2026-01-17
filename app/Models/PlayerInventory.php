<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PlayerInventory extends Model
{
    protected $table = 'player_inventories';

    protected $fillable = [
        'player_id', 'item_type', 'item_id',
        'quantity', 'durability', 'max_durability',
        'metadata'
    ];

    protected $casts = [
        'quantity' => 'integer',
        'durability' => 'integer',
        'max_durability' => 'integer',
        'metadata' => 'array'
    ];

    public function player(): BelongsTo
    {
        return $this->belongsTo(Player::class);
    }

    /**
     * Получить весь инвентарь игрока
     */
    public static function getFullInventory(int $playerId): array
    {
        $items = self::where('player_id', $playerId)->get();

        $inventory = [
            'blocks' => [],
            'tools' => [],
            'items' => []
        ];

        foreach ($items as $item) {
            switch ($item->item_type) {
                case 'block':
                    $inventory['blocks'][$item->item_id] = [
                        'count' => $item->quantity,
                        'item' => $item
                    ];
                    break;
                case 'tool':
                    $inventory['tools'][$item->item_id] = [
                        'durability' => $item->durability,
                        'max_durability' => $item->max_durability,
                        'item' => $item
                    ];
                    break;
                case 'item':
                    $inventory['items'][$item->item_id] = [
                        'count' => $item->quantity,
                        'item' => $item
                    ];
                    break;
            }
        }

        return $inventory;
    }

    /**
     * Добавить предмет в инвентарь
     */
    public static function addItem(int $playerId, string $itemType, string $itemId, int $quantity = 1, ?array $metadata = null): self
    {
        $item = self::firstOrNew([
            'player_id' => $playerId,
            'item_type' => $itemType,
            'item_id' => $itemId
        ]);

        if ($item->exists) {
            $item->quantity += $quantity;
        } else {
            $item->quantity = $quantity;

            // Устанавливаем прочность для инструментов
            if ($itemType === 'tool') {
                $toolConfig = config("game_tools.{$itemId}");
                if ($toolConfig) {
                    $item->durability = $toolConfig['durability'] ?? 60;
                    $item->max_durability = $toolConfig['durability'] ?? 60;
                }
            }

            $item->metadata = $metadata;
        }

        $item->save();
        return $item;
    }

    /**
     * Удалить предмет из инвентаря
     */
    public static function removeItem(int $playerId, string $itemType, string $itemId, int $quantity = 1): bool
    {
        $item = self::where([
            'player_id' => $playerId,
            'item_type' => $itemType,
            'item_id' => $itemId
        ])->first();

        if (!$item) {
            return false;
        }

        if ($item->quantity <= $quantity) {
            $item->delete();
        } else {
            $item->quantity -= $quantity;
            $item->save();
        }

        return true;
    }

    /**
     * Обновить прочность инструмента
     */
    public static function updateToolDurability(int $playerId, string $toolId, int $newDurability): bool
    {
        $tool = self::where([
            'player_id' => $playerId,
            'item_type' => 'tool',
            'item_id' => $toolId
        ])->first();

        if (!$tool) {
            return false;
        }

        $tool->durability = max(0, $newDurability);

        // Если прочность закончилась, удаляем инструмент
        if ($tool->durability <= 0) {
            $tool->delete();
            return true;
        }

        $tool->save();
        return true;
    }
}
