<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Services\World\WorldGenerator;
use Illuminate\Support\Facades\Cache;

class WorldController extends Controller
{
    // app/Http/Controllers/WorldController.php

    public function chunk(Request $request)
    {
        $coords = $request->query('batch');
        $seed = (int) ($request->query('seed') ?? 987654);

        // Инициализируем генератор
        $generator = new WorldGenerator($seed);

        $results = [];
        if (!empty($coords)) {
            foreach (explode(';', $coords) as $coord) {
                // Проверяем, что в координатах есть и X и Y
                $parts = explode(',', $coord);
                if (count($parts) === 2) {
                    [$cx, $cy] = $parts;
                    $results[$coord] = $generator->generateChunk((int)$cx, (int)$cy);
                }
            }
        }

        return response()->json($results);
    }
}
