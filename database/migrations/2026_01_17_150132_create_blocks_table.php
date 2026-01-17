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
        Schema::create('blocks', function (Blueprint $table) {
            $table->id();
            $table->integer('world_id')->default(1);
            $table->integer('x')->nullable(false);
            $table->integer('y')->nullable(false);
            $table->char('layer', 1)->nullable(false); // 's', 'g', 'o', 'e', 'p', 'l', 'r'
            $table->string('block_type', 50)->nullable(false);
            $table->integer('amount')->default(1);
            $table->timestamps();

            $table->unique(['world_id', 'x', 'y', 'layer']);
            $table->index(['world_id', 'x', 'y']);
            $table->index('layer');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('blocks');
    }
};
