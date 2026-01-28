<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('player_inventories', function (Blueprint $table) {
            $table->id();
            $table->foreignId('player_id')->constrained('players')->onDelete('cascade');

            // 1. Добавляем индекс слота.
            // 0-8 это хотбар, 9-44 это основной инвентарь (всего 45 слотов)
            $table->integer('slot_index')->default(0);

            $table->string('item_type', 20)->nullable(false);
            $table->string('item_id', 50)->nullable(false);
            $table->integer('quantity')->default(0);
            $table->integer('durability')->nullable();
            $table->integer('max_durability')->nullable();
            $table->json('metadata')->nullable();
            $table->timestamps();

            // 2. ВАЖНО: Удаляем старый уникальный ключ и ставим новый.
            // Теперь уникальность — это "Один игрок + Один номер слота".
            $table->unique(['player_id', 'slot_index']);

            $table->index(['player_id', 'item_type']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('player_inventories');
    }
};
