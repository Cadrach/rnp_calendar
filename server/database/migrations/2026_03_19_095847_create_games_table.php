<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('games', function (Blueprint $table) {
            $table->id();
            $table->string('name');
        });

        DB::table('games')->insert([
            ['name' => 'Donjons & Dragons'],
            ['name' => 'Pathfinder'],
            ['name' => "L'Appel de Cthulhu"],
            ['name' => 'Warhammer Fantasy Roleplay'],
            ['name' => 'Vampire : La Mascarade'],
            ['name' => 'Shadowrun'],
            ['name' => 'Chroniques Oubliées Fantasy'],
            ['name' => 'Star Wars : Aux Confins de l\'Empire'],
            ['name' => 'Runequest : Glorantha'],
            ['name' => 'Cyberpunk Red'],
        ]);
    }

    public function down(): void
    {
        Schema::dropIfExists('games');
    }
};
