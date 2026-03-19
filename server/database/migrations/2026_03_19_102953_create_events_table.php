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
        Schema::create('events', function (Blueprint $table) {
            $table->id();
            $table->string('title');
            $table->dateTime('datetime_start');
            $table->dateTime('datetime_end');
            $table->foreignId('mj_user_id')->constrained('users');
            $table->foreignId('room_id')->constrained('rooms');
            $table->foreignId('game_id')->constrained('games');
            $table->foreignId('scenario_id')->nullable()->constrained('scenarios');
            $table->unsignedTinyInteger('min_players')->nullable();
            $table->unsignedTinyInteger('max_players')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('events');
    }
};
