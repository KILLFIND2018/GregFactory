<?php

namespace App\Services\World;

class WorldGenerator
{
    private int $seed;
    private int $chunkSize;
    private OreGenerator $oreGenerator;

    private array $config = [
        'scales' => [
            'continents'  => 800,
            'mountains'   => 450,
            'mtn_mask'    => 1200,
            'temperature' => 900,
            'moisture'    => 900,
            'shore_variation' => 80, // Размер пятен (меньше число - четче пятна)
        ]
    ];

    public function __construct(int $seed = 1767904171111, int $chunkSize = 16, string $planet = 'earth')
    {
        $this->seed = $seed;
        $this->chunkSize = $chunkSize;
        Noise::init($seed);
        $this->oreGenerator = new OreGenerator($planet);
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

    private function generateTile(int $wx, int $wy): array
    {
        $hBase = $this->getNoiseValue($wx, $wy, 'continents');
        $t = $this->getNoiseValue($wx, $wy, 'temperature');
        $m = $this->getNoiseValue($wx, $wy, 'moisture');
        $rNoise = $this->getNoiseValue($wx, $wy, 'mountains');
        $mMask = $this->getNoiseValue($wx, $wy, 'mtn_mask');

        $elevation = $hBase - 0.45;

        // ГОРЫ
        $ridge = 1.0 - abs($rNoise - 0.5) * 2.0;
        if ($elevation > 0.05 && $mMask > 0.50) {
            $maskStrength = ($mMask - 0.50) * 2.5;
            $elevation += pow($ridge, 1.2) * 0.5 * $maskStrength;
        }

        $tile = [];

        // --- ЛОГИКА ТАЙЛОВ ---

        // ОКЕАН
        if ($elevation < 0) {
            $isDeep = $elevation < -0.15;
            $tile = ['s' => $isDeep ? 'deep_ocean' : 'water', 'b' => 'ocean', 'g' => 'sand'];
        }
        // БЕРЕГ (Песок с равными пятнами глины и гравия)
        elseif ($elevation < 0.025) {
            $sVar = $this->getNoiseValue($wx, $wy, 'shore_variation');

            // Распределение: 0.0--0.2 (Глина), 0.2--0.8 (Песок), 0.8--1.0 (Гравий)
            if ($sVar < 0.25) {
                $material = 'clay';        // Пятно глины
                $ground = 'clay';
            } elseif ($sVar > 0.75) {
                $material = 'gravel';      // Пятно гравия
                $ground = 'gravel';
            } else {
                $material = 'beach_sand';  // Основной песок
                $ground = 'sand';
            }

            $tile = ['s' => $material, 'b' => 'coast', 'g' => $ground];
        }
        // ГОРЫ
        elseif ($elevation > 0.52) {
            $isPeak = ($elevation > 0.72 && $ridge > 0.88);
            $surface = $isPeak ? (($t < 0.4) ? 'snow_peak' : 'rock_peak') : (($t < 0.45) ? 'snow' : 'stone');
            $tile = ['s' => $surface, 'b' => 'mountains', 'g' => 'stone'];
        }
        // СУША
        else {
            if ($elevation > 0.32) {
                $biome = ($t < 0.45) ? 'tundra' : 'taiga';
                $surface = ($t < 0.45) ? 'freeze_grass' : 'grass_cold';
            }
            elseif ($t > 0.60 && $m < 0.38) {
                $biome = 'desert'; $surface = 'desert_sand';
            }
            elseif ($t > 0.58 && $m > 0.72) {
                $biome = 'jungle'; $surface = 'jungle';
            }
            else {
                $biome = ($m > 0.6) ? 'forest' : 'plains';
                $surface = ($m > 0.6) ? 'grass_forest' : 'grass';
            }
            $tile = ['s' => $surface, 'b' => $biome, 'g' => 'dirt'];
        }

        // РУДА
        if (!in_array($tile['s'], ['water', 'deep_ocean'])) {
            $indicator = $this->oreGenerator->getOreAt($wx, $wy, $elevation, true);
            if ($indicator) $tile['s'] = $indicator;
        }
        $ore = $this->oreGenerator->getOreAt($wx, $wy, $elevation, false);
        if ($ore) $tile['o'] = $ore;

        return $tile;
    }

    private function getNoiseValue(int $wx, int $wy, ...$layers): float
    {
        $val = 0; $weightTotal = 0;
        foreach ($layers as $index => $layer) {
            if (!isset($this->config['scales'][$layer])) continue;
            $scale = $this->config['scales'][$layer];
            $weight = 1.0 / ($index + 1);
            $noise = (Noise::noise($wx / $scale, $wy / $scale) + 1) / 2;
            $val += $noise * $weight;
            $weightTotal += $weight;
        }
        return $weightTotal > 0 ? $val / $weightTotal : 0.5;
    }
}
