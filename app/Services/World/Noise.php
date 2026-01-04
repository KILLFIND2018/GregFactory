<?php

namespace App\Services\World;

class Noise
{
    public static function hash(int $x, int $y, int $seed): float
    {
        $n = $x * 374761393 + $y * 668265263 + $seed * 1447;
        $n = ($n ^ ($n >> 13)) * 1274126177;
        $n = $n ^ ($n >> 16);

        return ($n & 0xffffffff) / 4294967295;
    }

    public static function lerp(float $a, float $b, float $t): float
    {
        return $a + ($b - $a) * $t;
    }

    public static function smoothstep(float $t): float
    {
        return $t * $t * (3 - 2 * $t);
    }

    public static function fbm(
        float $x,
        float $y,
        float $scale,
        int $seed,
        int $octaves = 4,
        float $persistence = 0.5,
        float $lacunarity = 2.0
    ): float {
        $result = 0.0;
        $amplitude = 1.0;
        $frequency = 1.0 / $scale;

        for ($i = 0; $i < $octaves; $i++) {
            $result += self::valueNoise($x * $frequency, $y * $frequency, 1, $seed + $i) * $amplitude;
            $amplitude *= $persistence;
            $frequency *= $lacunarity;
        }

        $maxAmp = (1 - pow($persistence, $octaves)) / (1 - $persistence);
        return $result / $maxAmp; // normalize to 0-1
    }

    public static function valueNoise(
        float $x,
        float $y,
        float $scale,
        int $seed
    ): float {
        $sx = $x / $scale;
        $sy = $y / $scale;

        $x0 = floor($sx);
        $y0 = floor($sy);

        $fx = self::smoothstep($sx - $x0);
        $fy = self::smoothstep($sy - $y0);

        $v00 = self::hash($x0,     $y0,     $seed);
        $v10 = self::hash($x0 + 1, $y0,     $seed);
        $v01 = self::hash($x0,     $y0 + 1, $seed);
        $v11 = self::hash($x0 + 1, $y0 + 1, $seed);

        $i1 = self::lerp($v00, $v10, $fx);
        $i2 = self::lerp($v01, $v11, $fx);

        return self::lerp($i1, $i2, $fy);
    }
}
