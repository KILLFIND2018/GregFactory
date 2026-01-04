<?php

namespace App\Services\World;

class WorldGenerator
{
    private int $seed;
    private int $chunkSize;

    // app/Services/World/WorldGenerator.php

    public function __construct(int $seed, int $chunkSize = 16)
    {
        $this->seed = $seed;
        $this->chunkSize = $chunkSize;
        // ОБЯЗАТЕЛЬНО: инициализируем таблицу шумов этим сидом
        Noise::init($seed);
    }

    public function generateChunk(int $cx, int $cy): array
    {
        $tiles = [];

        for ($y = 0; $y < $this->chunkSize; $y++) {
            for ($x = 0; $x < $this->chunkSize; $x++) {

                $wx = $cx * $this->chunkSize + $x;
                $wy = $cy * $this->chunkSize + $y;

                $tiles[$y][$x] = $this->generateTile($wx, $wy);
            }
        }

        return $tiles;
    }

    private function generateTile(int $x, int $y): array
    {
        $h = Noise::fbm($x, $y, 140, 4); // Высота
        $t = Noise::fbm($x, $y, 500, 2); // Температура (всего 2 октавы!)
        $m = Noise::fbm($x, $y, 500, 2); // Влажность

        if ($h < 0.3) return ['s' => 'water', 'b' => 'ocean'];

        $isCold = $t < 0.3;
        $isHot = $t > 0.7;
        $isDry = $m < 0.3;

        $surface = 'grass';
        $biome = 'plains';

        if ($h > 0.8) {
            $surface = $isCold ? 'snow' : 'stone';
            $biome = 'mountains';
        } elseif ($isHot && $isDry) {
            $surface = 'sand';
            $biome = 'desert';
        } elseif ($isCold) {
            $surface = 'grass_cold';
            $biome = 'taiga';
        }

        return [
            's' => $surface,
            'b' => $biome,
            // Используем встроенный шум для деревьев (быстрее)
            'f' => ($surface === 'grass' && Noise::noise($x * 0.5, $y * 0.5) > 0.8) ? 'tree' : null
        ];
    }
}
