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
            $table->string('item_type', 20)->nullable(false); // 'block', 'tool', 'item'
            $table->string('item_id', 50)->nullable(false); // 'stone', 'wood_planks', 'axe'
            $table->integer('quantity')->default(0);
            $table->integer('durability')->nullable(); // для инструментов
            $table->integer('max_durability')->nullable(); // максимальная прочность
            $table->json('metadata')->nullable(); // дополнительные данные
            $table->timestamps();

            $table->unique(['player_id', 'item_type', 'item_id']);
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
