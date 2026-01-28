<?php

namespace App\Http\Controllers;

use App\Models\Player;
use App\Models\PlayerInventory;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;


class PlayerController extends Controller
{
    public function spawn(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'username' => 'required|string|max:50'
        ]);

        if ($validator->fails()) {
            return response()->json(['error' => $validator->errors()], 400);
        }

        try {
            // Проверяем, существует ли уже игрок
            $player = Player::where('username', $request->username)->first();

            if (!$player) {
                // Создаем нового игрока
                $player = Player::create([
                    'username' => $request->username,
                    'x' => 0,
                    'y' => 0,
                    'hp' => 100,
                    'world' => 'earth'
                ]);

                // Даем стартовые инструменты только новому игроку
                $this->giveStarterTools($player->id);
            } else {
                // Если игрок уже существует, не даем повторно стартовые инструменты
                // Можно просто вернуть существующего игрока
            }

            return response()->json([
                'id' => $player->id,
                'username' => $player->username,
                'x' => $player->x,
                'y' => $player->y,
                'hp' => $player->hp,
                'world' => $player->world
            ]);
        } catch (\Exception $e) {
            return response()->json(['error' => 'Ошибка создания игрока: ' . $e->getMessage()], 500);
        }
    }

    /**
     * Дать стартовые инструменты игроку
     */
    private function giveStarterTools(int $playerId): void
    {
        $starterItems = [
            ['type' => 'tool', 'id' => 'wooden_pickaxe', 'slot' => 0],
            ['type' => 'tool', 'id' => 'wooden_axe', 'slot' => 1],
            ['type' => 'block', 'id' => 'dirt', 'qty' => 64, 'slot' => 2],
            ['type' => 'block', 'id' => 'grass', 'qty' => 32, 'slot' => 3],
        ];

        foreach ($starterItems as $item) {
            PlayerInventory::addItem(
                $playerId,
                $item['type'],
                $item['id'],
                $item['qty'] ?? 1,
                $item['slot'] // Передаем индекс слота
            );
        }
    }

    public function update(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'id' => 'required|integer|exists:players,id',
            'x' => 'required|numeric',
            'y' => 'required|numeric',
            'hp' => 'required|integer|min:0|max:100'
        ]);

        if ($validator->fails()) {
            return response()->json(['error' => $validator->errors()], 400);
        }

        try {
            Player::where('id', $request->id)->update([
                'x' => $request->x,
                'y' => $request->y,
                'hp' => $request->hp,
            ]);

            return response()->json(['success' => true]);
        } catch (\Exception $e) {
            return response()->json(['error' => 'Ошибка обновления игрока: ' . $e->getMessage()], 500);
        }
    }

    /**
     * Получить информацию об игроке
     */
    public function show(Request $request, $id)
    {
        try {
            $player = Player::find($id);

            if (!$player) {
                return response()->json(['error' => 'Игрок не найден'], 404);
            }

            return response()->json([
                'success' => true,
                'player' => $player
            ]);
        } catch (\Exception $e) {
            return response()->json(['error' => 'Ошибка получения игрока: ' . $e->getMessage()], 500);
        }
    }

    /**
     * Обновить здоровье игрока
     */
    public function updateHp(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'id' => 'required|integer|exists:players,id',
            'hp' => 'required|integer|min:0|max:100',
            'operation' => 'string|in:add,subtract,set' // add - добавить, subtract - отнять, set - установить
        ]);

        if ($validator->fails()) {
            return response()->json(['error' => $validator->errors()], 400);
        }

        try {
            $player = Player::find($request->id);
            $operation = $request->input('operation', 'set');
            $hp = $request->hp;

            switch ($operation) {
                case 'add':
                    $player->hp = min(100, $player->hp + $hp);
                    break;
                case 'subtract':
                    $player->hp = max(0, $player->hp - $hp);
                    break;
                case 'set':
                default:
                    $player->hp = $hp;
                    break;
            }

            $player->save();

            return response()->json([
                'success' => true,
                'hp' => $player->hp
            ]);
        } catch (\Exception $e) {
            return response()->json(['error' => 'Ошибка обновления здоровья: ' . $e->getMessage()], 500);
        }
    }
}
