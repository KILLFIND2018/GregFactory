<?php

namespace App\Services\World;

class WorldGenerator
{
    private int $seed;
    private int $chunkSize;
    private OreGenerator $oreGenerator;

    // 1. НАСТРОЙКИ МАСШТАБОВ (ОБЯЗАТЕЛЬНО проверь наличие всех ключей!)
    private array $config = [
        'scales' => [
            'continents'  => 600, // Размер материков                                       600
            'mountains'   => 200, // Размер гор                                             200
            'temperature' => 1000, // Масштаб тепла (больше число - плавнее переходы)       1000
            'moisture'    => 900,  // Масштаб влажности                                     900
            'rivers'      => 250, // Масштаб извилистости рек                               250
            'shore_patches' => 40,  // Размер пятен песка/глины/гравия на берегу            40
        ]
    ];

    public function __construct(int $seed = 2585858, int $chunkSize = 16)
    {
        $this->seed = $seed;
        $this->chunkSize = $chunkSize;
        Noise::init($seed);
        $this->oreGenerator = new OreGenerator();
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
        $h = $this->getNoiseValue($wx, $wy, 'continents', 'mountains');
        $t = $this->getNoiseValue($wx, $wy, 'temperature');
        $m = $this->getNoiseValue($wx, $wy, 'moisture');

        // Шум для рек
        $rScale = $this->config['scales']['rivers'] ?? 300;
        $rNoise = abs(Noise::noise($wx / $rScale, $wy / $rScale));

        $tile = [];

        // 1. ОКЕАН
        if ($h < 0.43) {
            $isDeep = $h < 0.35;
            $tile = ['s' => $isDeep ? 'deep_ocean' : 'water', 'b' => 'ocean', 'g' => 'sand'];
        }
        // 2. РЕКИ (Центральная часть - вода)
        elseif ($rNoise < 0.025 && $h < 0.75) {
            $tile = ['s' => 'water', 'b' => 'river', 'g' => 'gravel'];
        }
        // 3. БЕРЕГА РЕК (Новое!)
        elseif ($rNoise < 0.055 && $h < 0.75) {
            // Получаем шум для пятен (от 0 до 1)
            $sPatch = $this->getNoiseValue($wx, $wy, 'shore_patches');

            if ($sPatch < 0.33) {
                $material = 'beach_sand';
            } elseif ($m > 0.6 && $sPatch < 0.5) {
                $material = 'clay'; //Глина только в лесу
            } else {
                $material = 'gravel';
            }

            $tile = ['s' => $material, 'b' => 'river_bank', 'g' => $material];
        }
        // 4. ОЗЕРА
        elseif ($h < 0.60 && $m > 0.65) {
            // Сама вода (центр озера)
            if ($h < 0.59) {
                $tile = ['s' => 'water', 'b' => 'lake', 'g' => 'sand'];
            }
            // Береговая зона озера (с использованием пятен шума)
            else {
                $sPatch = $this->getNoiseValue($wx, $wy, 'shore_patches');

                if ($sPatch < 0.4) {
                    $material = 'beach_sand';
                } elseif ($sPatch < 0.7) {
                    $material = 'gravel';
                } else {
                    $material = 'clay'; // Глина на берегах озер
                }

                $tile = ['s' => $material, 'b' => 'lake_shore', 'g' => $material];
            }
        }
        // 5. ПЛЯЖ (Океанический)
        elseif ($h < 0.46) {
            $tile = ['s' => 'beach_sand', 'b' => 'beach', 'g' => 'sand'];
        }
        // 6. ГОРЫ
        elseif ($h > 0.75) {
            $isSnow = ($h > 0.85 && $t < 0.5);
            $tile = ['s' => $isSnow ? 'snow' : 'stone', 'b' => 'mountains', 'g' => 'stone'];
        }
        // 7. БИОМЫ СУШИ
        else {
            $biome = 'plains'; $surface = 'grass';
            if ($t < 0.42) {
                if ($m < 0.45 && $h > 0.55) { $biome = 'tundra'; $surface = 'freeze_grass'; }
                else { $biome = 'taiga'; $surface = 'grass_cold'; }
            } elseif ($t > 0.65) {
                if ($m < 0.40) { $biome = 'desert'; $surface = 'sand'; }
                else { $biome = 'savanna'; $surface = 'dry_grass'; }
            } else {
                if ($m > 0.55) { $biome = 'forest'; $surface = 'grass_forest'; }
            }
            $tile = ['s' => $surface, 'b' => $biome, 'g' => 'stone'];
        }

        // РУДА
        $ore = $this->oreGenerator->getOreAt($wx, $wy, $h);
        if ($ore) { $tile['o'] = $ore; }

        return $tile;
    }

    private function getNoiseValue(int $wx, int $wy, ...$layers): float
    {
        $val = 0;
        $weightTotal = 0;

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
