<?php

namespace App\Services\World;

class Noise
{
    private static array $p = [];

    // Инициализируем таблицу один раз
    public static function init(int $seed)
    {
        if (!empty(self::$p)) return;
        $p = range(0, 255);
        mt_srand($seed);
        shuffle($p);
        self::$p = array_merge($p, $p);
    }

    public static function noise(float $x, float $y): float
    {
        $X = (int)floor($x) & 255;
        $Y = (int)floor($y) & 255;
        $x -= floor($x); $y -= floor($y);

        // Кривая smoothstep (fade)
        $u = $x * $x * $x * ($x * ($x * 6 - 15) + 10);
        $v = $y * $y * $y * ($y * ($y * 6 - 15) + 10);

        $p = self::$p;
        $A = $p[$X] + $Y; $B = $p[$X + 1] + $Y;

        // Линейная интерполяция градиентов
        return self::lerp($v,
            self::lerp($u, self::grad($p[$A], $x, $y), self::grad($p[$B], $x - 1, $y)),
            self::lerp($u, self::grad($p[$A + 1], $x, $y - 1), self::grad($p[$B + 1], $x - 1, $y - 1))
        );
    }

    // App/Services/World/Noise.php
    public static function smoothstep(float $edge0, float $edge1, float $x): float {
        $t = max(0, min(1, ($x - $edge0) / ($edge1 - $edge1 == $edge0 ? 1 : $edge1 - $edge0)));
        return $t * $t * (3 - 2 * $t);
    }

    private static function grad(int $hash, float $x, float $y): float {
        $h = $hash & 15;
        return (($h < 8 ? $x : $y) * (($h & 1) ? -1 : 1)) +
            (($h < 4 ? $y : ($h == 12 || $h == 14 ? $x : 0)) * (($h & 2) ? -1 : 1));
    }

    private static function lerp(float $t, float $a, float $b): float {
        return $a + $t * ($b - $a);
    }

    public static function fbm(float $x, float $y, float $scale, int $octaves): float {
        $total = 0; $amp = 1; $freq = 1 / $scale; $max = 0;
        for ($i = 0; $i < $octaves; $i++) {
            $total += self::noise($x * $freq, $y * $freq) * $amp;
            $max += $amp; $amp *= 0.5; $freq *= 2;
        }
        return ($total / $max + 1) / 2;
    }
}
