<?php

namespace App\Services\World;

class WorldGenerator
{
    private int $seed;
    private int $chunkSize;

    public function __construct(int $seed, int $chunkSize = 16)
    {
        $this->seed = $seed;
        $this->chunkSize = $chunkSize;
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
        // 1. Оптимизация: используем один вызов шума для биома и высоты, если можно
        // Снижаем октавы для второстепенных шумов
        $biomeNoise = Noise::fbm($x, $y, 1024, $this->seed, 4, 0.5, 2.0); // Было 6 октав

        // 2. Высота - самый важный параметр
        $height = Noise::fbm($x, $y, 128, $this->seed + 1, 4, 0.6, 2.2); // Было 5

        // 3. Используем упрощенный шум для маски гор
        $mountainMask = Noise::valueNoise($x, $y, 192, $this->seed + 2);
        if ($mountainMask > 0.6) {
            $height += ($mountainMask - 0.6) * 1.5;
        }

        // 4. Температуру и влажность считаем только если мы не в океане (Экономия CPU)
        $biome = 'plains';
        if ($biomeNoise < 0.3) {
            $biome = 'ocean';
        } else {
            $temperature = Noise::valueNoise($x, $y, 512, $this->seed + 3);
            $moisture = Noise::valueNoise($x, $y, 512, $this->seed + 4);

            if ($temperature > 0.7 && $moisture < 0.3) $biome = 'desert';
            elseif ($temperature < 0.3 && $moisture > 0.7) $biome = 'taiga';
            elseif ($moisture > 0.6) $biome = 'forest';
        }

        // Финализация типа тайла
        $surface = 'grass';
        if ($biome === 'ocean') $surface = 'water';
        elseif ($height > 0.8) $surface = 'stone';
        elseif ($biome === 'desert') $surface = 'sand';
        elseif ($biomeNoise < 0.32) $surface = 'sand'; // Берег

        return [
            'biome' => $biome,
            'surface' => $surface,
            'feature' => ($biome === 'forest' && Noise::hash($x, $y, $this->seed) > 0.98) ? 'tree' : null
        ];
    }
}
