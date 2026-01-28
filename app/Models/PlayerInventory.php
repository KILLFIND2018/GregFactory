<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PlayerInventory extends Model
{
    protected $table = 'player_inventories';

    protected $fillable = [
        'player_id', 'item_type', 'item_id', 'slot_index', // Добавили slot_index
        'quantity', 'durability', 'max_durability', 'metadata'
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
        // Просто возвращаем все предметы игрока.
        // На фронте мы будем искать предмет по полю slot_index
        return self::where('player_id', $playerId)->get()->toArray();
    }

    /**
     * Добавить предмет в инвентарь
     */
    public static function addItem(int $playerId, string $itemType, string $itemId, int $quantity = 1, ?int $slotIndex = null, ?array $metadata = null): self
    {
        // Если слот указан, проверяем, свободен ли он
        if ($slotIndex !== null) {
            $existingItem = self::where([
                'player_id' => $playerId,
                'slot_index' => $slotIndex
            ])->first();

            if ($existingItem) {
                // Если слот занят, ищем свободный слот
                $slotIndex = null;
            }
        }

        // Если слот не указан или указанный занят, ищем первый свободный
        if ($slotIndex === null) {
            $occupiedSlots = self::where('player_id', $playerId)
                ->pluck('slot_index')
                ->toArray();

            for ($i = 0; $i < 45; $i++) {
                if (!in_array($i, $occupiedSlots)) {
                    $slotIndex = $i;
                    break;
                }
            }

            // Если все слоты заняты, выбрасываем исключение
            if ($slotIndex === null) {
                throw new \Exception('Инвентарь полон');
            }
        }

        // Проверяем, есть ли уже такой предмет (для стаканья)
        $item = self::where([
            'player_id' => $playerId,
            'item_id' => $itemId,
            'item_type' => $itemType
        ])->first();

        if ($item && $itemType !== 'tool') {
            // Для не-инструментов увеличиваем количество
            $item->quantity += $quantity;
            $item->save();
            return $item;
        }

        // Создаем новый предмет
        $item = new self([
            'player_id' => $playerId,
            'item_type' => $itemType,
            'item_id' => $itemId,
            'slot_index' => $slotIndex,
            'quantity' => $quantity,
            'metadata' => $metadata
        ]);

        if ($itemType === 'tool') {
            $item->durability = 60;
            $item->max_durability = 60;
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
