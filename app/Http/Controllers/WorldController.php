<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Services\World\WorldGenerator;

class WorldController extends Controller
{
    public function chunk(Request $request)
    {
        $cx = (int) $request->query('cx', 0);
        $cy = (int) $request->query('cy', 0);

        $generator = new WorldGenerator(
            config('world.seed'),
            config('world.chunk_size')
        );

        $key = "chunk_{$cx}_{$cy}";

        $tiles = cache()->remember($key, 3600, function () use ($generator, $cx, $cy) {
            return $generator->generateChunk($cx, $cy);
        });

        return response()->json([
            'cx' => $cx,
            'cy' => $cy,
            'tiles' => $tiles
        ]);
    }

}
