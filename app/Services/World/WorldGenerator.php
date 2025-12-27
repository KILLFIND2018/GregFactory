<?php

namespace App\Services\World;

class WorldGenerator
{
    private int $seed;
    private int $chunkSize;

    public function __construct(int $seed, int $chunkSize)
    {
        $this->seed = $seed;
        $this->chunkSize = $chunkSize;
    }

    public function generateChunk(int $cx, int $cy): array
    {
        $chunk = [];

        for ($y = 0; $y < $this->chunkSize; $y++) {
            $row = [];
            for ($x = 0; $x < $this->chunkSize; $x++) {

                $wx = $cx * $this->chunkSize + $x;
                $wy = $cy * $this->chunkSize + $y;

                $row[] = $this->generateTile($wx, $wy);
            }
            $chunk[] = $row;
        }

        return $chunk;
    }

    private function generateTile(int $x, int $y): array
    {
        // 1. Континенты
        $continent = Noise::valueNoise($x, $y, 256, $this->seed);

        if ($continent < 0.45) {
            return [
                'surface' => 'water',
                'biome' => 'ocean'
            ];
        }

        // 2. Базовая высота
        $baseHeight = Noise::valueNoise($x, $y, 128, $this->seed + 1);

        // 3. Горная маска (крупная)
        $mountainMask = Noise::valueNoise($x, $y, 192, $this->seed + 2);

        $mountainStrength = max(0, ($mountainMask - 0.3));

        // Горы ближе к океану
        $inlandFactor = min(1, ($continent - 0.42) * 3);
        $mountainStrength *= $inlandFactor;

        // Итоговая высота
        $height = $baseHeight + $mountainStrength * 1.4;

        // === ВЕРШИНЫ ===
        if ($height > 0.85) {
            return [
                'surface' => 'stone',
                'biome' => 'mountains'
            ];
        }

        // === ХОЛМЫ ===
        if ($height > 0.65) {
            return [
                'surface' => 'gray_stone',
                'biome' => 'hills'
            ];
        }

        // === ПЛЯЖ ===
        if ($continent < 0.52) {
            return [
                'surface' => 'sand',
                'biome' => 'beach'
            ];
        }

        // === РАВНИНЫ ===
        return [
            'surface' => 'grass',
            'biome' => 'plains'
        ];
    }






}
