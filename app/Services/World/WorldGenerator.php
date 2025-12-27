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
        // Континенты (где вообще есть суша)
        $continent = Noise::valueNoise($x, $y, 512, $this->seed);

        if ($continent < 0.45) {
            return [
                'surface' => 'water',
                'biome' => 'ocean'
            ];
        }

        // Высота внутри континента
        $h = 0;
        $h += Noise::valueNoise($x, $y, 256, $this->seed + 1) * 0.6;
        $h += Noise::valueNoise($x, $y, 64,  $this->seed + 2) * 0.3;
        $h += Noise::valueNoise($x, $y, 16,  $this->seed + 3) * 0.1;

        if ($h > 0.8) {
            return [
                'surface' => 'stone',
                'biome' => 'mountains'
            ];
        }

        if ($h < 0.3) {
            return [
                'surface' => 'sand',
                'biome' => 'plains'
            ];
        }

        return [
            'surface' => 'grass',
            'biome' => 'plains'
        ];
    }

}
