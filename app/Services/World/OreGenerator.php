<?php

namespace App\Services\World;

class OreGenerator
{
    private array $config = [
        'sector_size' => 48,
        'vein_radius' => 25,
        'chance' => 0.8, // Высокий шанс для проверки
    ];

    private array $oreMixes = [
        // Равнины и холмы
        'iron_mix' => [
            'primary'   => 'ore_brown_limonite',
            'secondary' => 'ore_yellow_limonite',
            'inbetween' => 'ore_malachite',
            'min_h'     => 0.40,
            'max_h'     => 0.70,
        ],
        // Горы и высокогорье
        'mountain_mix' => [
            'primary'   => 'ore_cassiterite',
            'secondary' => 'ore_tin',
            'inbetween' => 'ore_bismuth',
            'min_h'     => 0.65, // Начинается в предгорьях
            'max_h'     => 1.5,  // С запасом для любых пиков
        ]
    ];

    public function getOreAt(int $wx, int $wy, float $h): ?string
    {
        $sectorSize = $this->config['sector_size'];
        $sectorX = (int)floor($wx / $sectorSize);
        $sectorY = (int)floor($wy / $sectorSize);

        $hash = crc32($sectorX . "ores" . $sectorY . "v5"); // Обновите сид
        if (($hash % 100) / 100 > $this->config['chance']) return null;

        // 1. ВЫБИРАЕМ МИКС для всего сектора сразу (независимо от высоты)
        $allKeys = array_keys($this->oreMixes);
        $mixKey = $allKeys[$hash % count($allKeys)];
        $mix = $this->oreMixes[$mixKey];

        // 2. ПРОВЕРЯЕМ ВЫСОТУ для этого конкретного микса
        if ($h < $mix['min_h'] || $h > $mix['max_h']) return null;

        // 3. ГЕОМЕТРИЯ (радиус и шум)
        $centerX = ($sectorX * $sectorSize) + 24;
        $centerY = ($sectorY * $sectorSize) + 24;
        $dist = sqrt(pow($wx - $centerX, 2) + pow($wy - $centerY, 2));
        $shape = Noise::noise($wx * 0.2, $wy * 0.2) * 10;

        if ($dist + $shape < $this->config['vein_radius']) {
            $mixNoise = abs(Noise::noise($wx * 0.4, $wy * 0.4));
            if ($mixNoise > 0.6) return $mix['primary'];
            if ($mixNoise > 0.3) return $mix['secondary'];
            return $mix['inbetween'];
        }

        return null;
    }
}
