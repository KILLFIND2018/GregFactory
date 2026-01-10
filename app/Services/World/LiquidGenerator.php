<?php

namespace App\Services\World;

class LiquidGenerator
{
    private array $liquidConfig;

    public function __construct(string $planet = 'earth')
    {
        // Читаем из config/game_liquids.php
        $this->liquidConfig = config("game_liquids.planets.{$planet}");
    }

    /**
     * Получает жидкость для чанка (cx, cy).
     * Генерация по канонам GregTech: weighted chance по типам, всегда есть жидкость? (но по конфигу chance суммируется).
     * Если выбрано, генерирует amount от min до max.
     * Нет вкраплений/индикаторов, вся жидкость на чанк.
     * @param int $cx Chunk X
     * @param int $cy Chunk Y
     * @return ?array ['type' => string, 'amount' => int] или null, если нет жидкости
     */
    public function getLiquidVeinForChunk(int $cx, int $cy): ?array
    {
        $conf = $this->liquidConfig;

        // Сетка: sector_size = 1, но поскольку чанки 16x16, а вызов по cx,cy - уникальный для чанка
        // Сид чанка (с солью для жидкостей)
        $sSeed = crc32($cx . "liquid_chunk_gen_v2" . $cy);
        mt_srand($sSeed);

        // Общий шанс на жидкость в чанке (если сумма chances <100, то шанс = total/100)
        $totalChance = array_sum(array_column($conf['liquids'], 'chance'));
        if (mt_rand(1, 100) > $totalChance) return null;  // Нет жидкости, если не 100%

        // Выбор типа по weighted chance
        $liquidType = $this->selectLiquidType($conf['liquids']);
        $liquid = $conf['liquids'][$liquidType];

        // VeinData = фиксированный max для всей жилы в чанке
        $maxAmount = mt_rand($liquid['min_amount'], $liquid['max_amount']);

        return [
            'type' => $liquid['registry'],
            'max_amount' => $maxAmount,
            'decrease_per_operation' => $liquid['decrease_per_operation']  // Для будущей добычи
        ];
    }

    private function selectLiquidType(array $liquids): string
    {
        $totalChance = array_sum(array_column($liquids, 'chance'));
        $rand = mt_rand(1, $totalChance);
        $current = 0;
        foreach ($liquids as $name => $data) {
            $current += $data['chance'];
            if ($rand <= $current) return $name;
        }
        return array_key_first($liquids);
    }
}
