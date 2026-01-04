<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Services\World\WorldGenerator;
use Illuminate\Support\Facades\Cache;

class WorldController extends Controller
{
    public function chunk(Request $request)
    {
        $request->validate([
            'cx' => 'required|integer',
            'cy' => 'required|integer',
            'seed' => 'integer',
        ]);

        $cx = (int) $request->query('cx');
        $cy = (int) $request->query('cy');
        $seed = (int) ($request->query('seed') ?? 12345);

        $generator = new WorldGenerator($seed);

        // Временно убираем кэш, чтобы видеть изменения в реальном времени
        $tiles = $generator->generateChunk($cx, $cy);

        return response()->json([
            'tiles' => $tiles
        ]);
    }
}
