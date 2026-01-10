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
            'mountains'   => 600,
            'mtn_mask'    => 1500,
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
                $wx = ($cx * $this->chunkSize + $x) + 50;
                $wy = ($cy * $this->chunkSize + $y) + 50;
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
        if ($elevation > 0.05 && $mMask > 0.45) {  // Уменьшили порог mMask с 0.50 → 0.45 для большего количества гор
            $maskStrength = ($mMask - 0.45) * 2.0;  // Увеличили multiplier с 2.0 → 2.5 для большей силы маски
            $peakBoost = pow($ridge, 0.8);  // Уменьшили exponent с 1.2 → 0.8 для острее пиков (ridge становится "пиковее")
            $elevation += $peakBoost * 0.65 * $maskStrength;  // Увеличили коэффициент с 0.5 → 0.65 для выше гор
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
            // Вычисляем "линию снега" на основе температуры (t): в холодных регионах снег ниже, в теплых — выше
            $snow_line = 0.65 - ($t * 0.15);  // При t<0.45 (тундра/тайга холодная) снег с ~0.65; при t>0.6 (теплее) — выше 0.7-0.8
            $snow_line = max(0.55, min(0.85, $snow_line));  // Ограничиваем, чтобы не было снега слишком низко/высоко

            // Определяем, является ли это пиком
            $isPeak = ($elevation > 0.72 && $ridge > 0.88);

            // Поверхность теперь зависит от elevation vs snow_line
            if ($isPeak) {
                if ($elevation > $snow_line + 0.1) {  // Снег на пиках только очень высоко
                    $surface = 'snow_peak';
                } else {
                    $surface = 'rock_peak';
                }
            } else {
                if ($elevation > $snow_line) {
                    $surface = 'snow';
                } else {
                    $surface = 'stone';
                }
            }
            $subRidge = (Noise::noise($wx / 50, $wy / 50) + 1) / 2;  // Маленький шум для суб-пиков
            if ($subRidge > 0.7) {
                $elevation += 0.1 * $subRidge;  // Добавляем мини-пики для текстуры
            }

            $tile = ['s' => $surface, 'b' => 'mountains', 'g' => 'stone'];
        }
        // СУША
        else {
            if ($elevation > 0.32) {
                $biome = ($t < 0.45) ? 'tundra' : 'taiga';
                $surface = ($t < 0.45) ? 'freeze_grass' : 'grass_cold';
            } elseif ($t > 0.60 && $m < 0.38) {
                $biome = 'desert';
                $surface = 'desert_sand';
            } elseif ($t > 0.58 && $m > 0.72) {
                $biome = 'jungle';
                $surface = 'jungle';
            } else {
                $biome = ($m > 0.6) ? 'forest' : 'plains';
                $surface = ($m > 0.6) ? 'grass_forest' : 'grass';
            }
            $tile = ['s' => $surface, 'b' => $biome, 'g' => 'dirt'];


        }

        // --- ГЕНЕРАЦИЯ ОБЪЕКТОВ (Деревья, кусты) ---
        $vNoise = (Noise::noise($wx / 20, $wy / 20) + 1) / 2; // Пятна растительности
        $dNoise = (Noise::noise($wx * 1.5, $wy * 1.5) + 1) / 2; // Детализация (травинки)

        if ($elevation > 0.025) {
            // 1. ГОРЫ (теперь цветы проверяются ПЕРВЫМИ)
            if ($elevation >= 0.52 && $elevation < 0.72) {
                if ($dNoise > 0.78) { // $dNoise - шанс для цветка, если уменьшить, то увеличишь количество
                    $tile['e'] = 'stone_flower';
                } elseif ($vNoise > 0.4 && $dNoise > 0.7) { // $dNoise - шанс для елки
                    $tile['e'] = 'pine';
                }
            }
            // 2. ЛОГИКА ДЛЯ РАВНИН
            elseif (isset($biome) && $biome === 'plains') {
                if ($vNoise > 0.65 && $dNoise > 0.6) {
                    $tile['e'] = 'tree';
                }
                // ЧАСТОТА ЦВЕТОВ: снижаем порог до 0.7 для густоты
                elseif ($dNoise > 0.79) {
                    // Смешиваем цвета через остаток от деления координат
                    $mix = abs($wx + $wy) % 3;
                    if ($mix === 0) $tile['e'] = 'flower_red';
                    elseif ($mix === 1) $tile['e'] = 'flower_yellow';
                    else $tile['e'] = 'flower_white';
                }
                elseif ($dNoise > 0.6) {
                    $tile['e'] = 'grass_detail';
                }
            }
            // ПУСТЫНЯ: Кактусы чаще
            elseif (isset($biome) && $biome === 'desert') {
                if ($dNoise > 0.75) { // Примерно 25% площади
                    $tile['e'] = 'cactus';
                }
            }

            // ЛОГИКА ДЛЯ ЛЕСА
            elseif (isset($biome) && $biome === 'forest') {
                if ($vNoise > 0.35 && $dNoise > 0.3) $tile['e'] = 'tree';
            }
            // ТАЙГА
            elseif (isset($biome) && $biome === 'taiga') {
                if ($vNoise > 0.4 && $dNoise > 0.4) $tile['e'] = 'pine';
                elseif ($dNoise > 0.8) $tile['e'] = 'bush_cold';
            }
            // ДЖУНГЛИ
            elseif (isset($biome) && $biome === 'jungle') {
                if ($vNoise > 0.2 && $dNoise > 0.2) $tile['e'] = 'jungle_tree';
            }
            elseif (isset($biome) && $biome === 'tundra') {
                // Редкие сосны и много мелких холодных кустов
                if ($vNoise > 0.5 && $dNoise > 0.8) {
                    $tile['e'] = 'pine';
                } elseif ($dNoise > 0.7) {
                    $tile['e'] = 'bush_cold';
                }
            }
        }

        // БЕРЕГ: Кактусы редко (elevation < 0.025)
        elseif ($elevation > 0) {
            if ($dNoise > 0.85) { // Очень редко, примерно 15% площади
                $tile['e'] = 'cactus';
            } elseif ($dNoise > 0.8) {
                $tile['e'] = 'sugar_cane';
            }
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
