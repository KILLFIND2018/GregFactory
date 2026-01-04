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

    // Настройки частот (Noise Settings)
    private array $config = [
        'scales' => [
            'continents' => 650, // Размер материков
            'mountains'  => 130, // Размер горных цепей
            'biomes'     => 450, // Как часто сменяются биомы (лес/пустыня)
        ],
        'levels' => [
            'deep_ocean' => 0.20,
            'ocean'      => 0.41,
            'beach'      => 0.46,
            'highland'   => 0.75, // Начало гор
            'peaks'      => 0.88, // Снежные шапки
        ],
        'thresholds' => [
            'cold' => 0.35,
            'hot'  => 0.70,
            'dry'  => 0.35,
            'wet'  => 0.65,
        ]
    ];

    private function generateTile(int $x, int $y): array
    {
        $conf = $this->config;

        // Генерация базовых значений шума
        $hBase = Noise::fbm($x, $y, $conf['scales']['continents'], 4);
        $t = Noise::fbm($x, $y, $conf['scales']['biomes'], 3);
        $m = Noise::fbm($x, $y, $conf['scales']['biomes'], 3);

        // Маска гор
        $mMask = Noise::smoothstep(0.45, 0.75, Noise::fbm($x + 500, $y + 500, 300, 3));
        $mRidges = pow(1.0 - abs(Noise::noise($x / $conf['scales']['mountains'], $y / $conf['scales']['mountains'])), 2.0);

        // Финальная высота
        $h = $hBase;
        if ($h > $conf['levels']['ocean']) {
            $h += ($mRidges * $mMask * 0.45);
        }

        // --- ЛОГИКА ВЫБОРА ТАЙЛА (Конфигуратор) ---

        // 1. Водная и береговая зона
        if ($h < $conf['levels']['deep_ocean']) return ['s' => 'deep_ocean', 'b' => 'deep_ocean'];
        if ($h < $conf['levels']['ocean'])      return ['s' => 'water', 'b' => 'ocean'];
        if ($h < $conf['levels']['beach'])      return ['s' => 'beach_sand', 'b' => 'beach'];

        // 2. Высокогорье
        if ($h > $conf['levels']['highland']) {
            $isSnow = ($t < $conf['thresholds']['cold'] || $h > $conf['levels']['peaks']);
            return ['s' => $isSnow ? 'snow' : 'stone', 'b' => 'mountains'];
        }

        // 3. Биомы суши
        if ($t < $conf['thresholds']['cold']) {
            return ['s' => ($m < $conf['thresholds']['dry'] ? 'snow' : 'grass_cold'), 'b' => 'taiga'];
        }

        if ($t > $conf['thresholds']['hot']) {
            if ($m < $conf['thresholds']['dry']) return ['s' => 'sand', 'b' => 'desert'];
            return ['s' => 'dry_grass', 'b' => 'savanna'];
        }

        if ($m > $conf['thresholds']['wet']) return ['s' => 'trees', 'b' => 'forest'];

        return ['s' => 'grass', 'b' => 'plains'];
    }
}
