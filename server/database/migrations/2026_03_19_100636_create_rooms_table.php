<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('rooms', function (Blueprint $table) {
            $table->id();
            $table->string('code');
            $table->string('name');
            $table->boolean('unlimited')->default(false);
        });

        DB::table('rooms')->insert([
            ['code' => 'BAR',  'name' => 'BAR',  'unlimited' => false],
            ['code' => 'BBS1', 'name' => 'BBS1', 'unlimited' => false],
            ['code' => 'CAVE', 'name' => 'CAVE', 'unlimited' => false],
            ['code' => 'CSb1', 'name' => 'CSb1', 'unlimited' => false],
            ['code' => 'CSb2', 'name' => 'CSb2', 'unlimited' => false],
            ['code' => 'CSsm', 'name' => 'CSsm', 'unlimited' => false],
            ['code' => 'DIST', 'name' => 'DIST', 'unlimited' => false],
            ['code' => 'HOTE', 'name' => 'HOTE', 'unlimited' => true],
            ['code' => 'MSO1', 'name' => 'MSO1', 'unlimited' => false],
        ]);
    }

    public function down(): void
    {
        Schema::dropIfExists('rooms');
    }
};
