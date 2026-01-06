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
            'mountains'  => 250, // Размер горных цепей
            'biomes'     => 350, // Как часто сменяются биомы (лес/пустыня)
            'lakes'      => 180, // Масштаб озер (меньше континентов)
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

        // --- 1. ГЕНЕРАЦИЯ БАЗОВЫХ ШУМОВ ---
        // Высота (континенты)
        $hBase = Noise::fbm($x, $y, $conf['scales']['continents'], 4);

        // Температура (без смещения)
        $t = Noise::fbm($x, $y, $conf['scales']['biomes'], 3);

        // Влажность (с большим смещением, чтобы не совпадала с температурой)
        $m = Noise::fbm($x + 10000, $y + 10000, $conf['scales']['biomes'], 3);

        // Шум для озер (смещение и свой масштаб)
        $lNoise = Noise::fbm($x - 20000, $y - 20000, $conf['scales']['lakes'] ?? 180, 2);

        // Шум для подложки камня (андезит/базальт)
        $gNoise = Noise::fbm($x + 5000, $y - 5000, 120, 2);

        // --- 2. ЛОГИКА ОЗЕР (CARVING) ---
        $h = $hBase;
        // Если мы на суше, но не слишком высоко, "вдавливаем" ямы под озера
        if ($hBase > $conf['levels']['ocean'] && $hBase < 0.6) {
            $lMask = Noise::smoothstep(0.65, 0.85, $lNoise);
            $h -= ($lMask * 0.25); // Глубина озера
        }

        // --- 3. ЛОГИКА ГОР ---
        // Горы считаем только там, где высота осталась выше уровня океана
        if ($h > $conf['levels']['ocean']) {
            $mMask = Noise::smoothstep(0.45, 0.75, Noise::fbm($x + 500, $y + 500, 300, 3));
            $mRidges = pow(1.0 - abs(Noise::noise($x / $conf['scales']['mountains'], $y / $conf['scales']['mountains'])), 2.0);
            $h += ($mRidges * $mMask * 0.45);
        }

        // --- 4. ОПРЕДЕЛЕНИЕ ПОДЛОЖКИ (СЛОЙ ГРУНТА) ---
        $ground = 'stone';
        if ($gNoise > 0.75) $ground = 'andesite';
        elseif ($gNoise < 0.25) $ground = 'basalt';

        // --- 5. ВЫБОР ТАЙЛА (ИЕРАРХИЯ) ---

        // А. ОКЕАН И ГЛУБИНЫ
        if ($h < $conf['levels']['deep_ocean']) {
            return ['s' => 'deep_ocean', 'b' => 'deep_ocean', 'g' => 'sand'];
        }
        if ($h < $conf['levels']['ocean']) {
            return ['s' => 'water', 'b' => 'ocean', 'g' => 'sand'];
        }

        // Б. БЕРЕГОВАЯ ЛИНИЯ (Пляж)
        // Делаем пляж чуть шире (0.48), чтобы он обрамлял и океаны, и озера
        if ($h < 0.435) {
            $surface = ($t < 0.3) ? 'snow' : 'beach_sand';
            return ['s' => $surface, 'b' => 'beach', 'g' => 'sand'];
        }

        // В. ВЫСОКОГОРЬЕ
        if ($h > $conf['levels']['highland']) {
            $isSnow = ($t < 0.4 || $h > $conf['levels']['peaks']);
            return ['s' => $isSnow ? 'snow' : 'stone', 'b' => 'mountains', 'g' => $ground];
        }

        // Г. БИОМЫ СУШИ (Распределение по T и M)
        $biome = 'plains';
        $surface = 'grass';

        if ($t < 0.45) { // Холодная зона
            // ТУНДРА: только если холодно И мы находимся в предгорье (высота > 0.55)
            // Это создает "пояс" тундры вокруг горных массивов.
            if ($m < 0.5 && $h > 0.50) {
                $biome = 'tundra';
                $surface = 'freeze_grass';
            } else {
                // В низинах при холоде будет тайга
                $biome = 'taiga';
                $surface = 'grass_cold';
            }
        }
        elseif ($t > 0.65) { // Жаркая зона
            // Пустыня (сухо) или Саванна (влажно)
            if ($m < 0.45) {
                $biome = 'desert'; $surface = 'sand';
            } else {
                $biome = 'savanna'; $surface = 'dry_grass';
            }
        }
        else { // Умеренная зона (Буфер между холодом и жарой)
            if ($m > 0.60) {
                $biome = 'forest'; $surface = 'grass_forest';
            }
        }

        return [
            's' => $surface,
            'b' => $biome,
            'g' => $ground
        ];
    }
}
