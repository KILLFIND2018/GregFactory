<?php

namespace App\Services\World;

class OreGenerator
{
    private array $veinConfig;

    public function __construct(string $planet = 'earth')
    {
        // Читаем из config/game_ores.php
        $this->veinConfig = config("game_ores.planets.{$planet}");
    }

    public function getOreAt(int $wx, int $wy, float $h, bool $isSurface = false): ?string
    {
        $conf = $this->veinConfig;

        // Сетка
        $sectorX = (int)floor($wx / $conf['sector_size']);
        $sectorY = (int)floor($wy / $conf['sector_size']);

        // Сид сектора
        $sSeed = crc32($sectorX . "vein_gt_v2" . $sectorY);
        mt_srand($sSeed);

        // Есть ли жила
        if ((mt_rand(0, 100) / 100) > $conf['vein_chance']) return null;

        $veinType = $this->selectVeinType($conf['veins']);
        $vein = $conf['veins'][$veinType];

        // Геометрия жилы
        $centerX = ($sectorX * $conf['sector_size']) + ($conf['sector_size'] / 2);
        $centerY = ($sectorY * $conf['sector_size']) + ($conf['sector_size'] / 2);

        $dist = sqrt(pow($wx - $centerX, 2) + pow($wy - $centerY, 2));
        $shapeNoise = Noise::noise($wx * 0.15, $wy * 0.15) * 7;

        if (($dist + $shapeNoise) > $vein['radius']) return null;

        // Индикаторы на поверхности (маленькие точки)
        if ($isSurface) {
            $indConf = $conf['indicator'];
            $indicatorNoise = abs(Noise::noise($wx * $indConf['scale'], $wy * $indConf['scale']));
            return ($indicatorNoise < $indConf['chance']) ? $vein['indicator'] : null;
        }

        // Внутренности жилы (Density + Mix)
        $densityNoise = (Noise::noise($wx * 0.5, $wy * 0.5) + 1) / 2;
        if ($densityNoise > $vein['density']) return null;

        $oreNoise = (Noise::noise($wx * 0.3, $wy * 0.3) + 1) / 2;

        if ($oreNoise > 0.75) return $vein['ores']['primary'];
        if ($oreNoise > 0.45) return $vein['ores']['secondary'];
        if ($oreNoise > 0.15) return $vein['ores']['between'];
        return $vein['ores']['sporadic'];
    }

    private function selectVeinType(array $veins): string
    {
        $totalRarity = array_sum(array_column($veins, 'rarity'));
        $rand = mt_rand(0, $totalRarity);
        $current = 0;
        foreach ($veins as $name => $data) {
            $current += $data['rarity'];
            if ($rand <= $current) return $name;
        }
        return array_key_first($veins);
    }
}
