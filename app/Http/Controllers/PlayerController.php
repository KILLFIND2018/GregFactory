<?php

namespace App\Http\Controllers;

use App\Models\Player;
use Illuminate\Http\Request;

class PlayerController extends Controller
{
    public function spawn(Request $request)
    {
        $player = Player::firstOrCreate(
            ['username' => $request->username],
            ['x' => 0, 'y' => 0]
        );

        return response()->json($player);
    }

    public function update(Request $request)
    {
        Player::where('id', $request->id)->update([
            'x' => $request->x,
            'y' => $request->y,
            'hp' => $request->hp,
        ]);

        return response()->json(['ok' => true]);
    }
}
