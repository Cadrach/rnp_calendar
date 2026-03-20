<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('rooms', function (Blueprint $table) {
            if (! Schema::hasColumn('rooms', 'color')) {
                $table->string('color', 7)->default('#3b82f6')->after('url');
            }
        });

        // Colors optimized for dark mode:
        // - CS* rooms (Centre Social): teal shades
        // - Others: distinct colors with good contrast
        DB::table('rooms')->upsert([
            ['code' => 'BAR',  'name' => 'BAR',  'url' => null, 'color' => '#f59e0b', 'unlimited' => false],
            ['code' => 'BBS1', 'name' => 'BBS1', 'url' => null, 'color' => '#8b5cf6', 'unlimited' => false],
            ['code' => 'CAVE', 'name' => 'CAVE', 'url' => null, 'color' => '#22c55e', 'unlimited' => false],
            ['code' => 'CSb1', 'name' => 'Centre Social (Salle 1)', 'url' => 'https://maps.app.goo.gl/XwGtDhiaE6EYYmby5', 'color' => '#06b6d4', 'unlimited' => false],
            ['code' => 'CSb2', 'name' => 'Centre Social (Salle 2)', 'url' => 'https://maps.app.goo.gl/XwGtDhiaE6EYYmby5', 'color' => '#0891b2', 'unlimited' => false],
            ['code' => 'CSsm', 'name' => 'CSsm', 'url' => null, 'color' => '#0e7490', 'unlimited' => false],
            ['code' => 'DIST', 'name' => 'DIST', 'url' => null, 'color' => '#3b82f6', 'unlimited' => false],
            ['code' => 'HOTE', 'name' => 'Chez l\'hôte', 'url' => null, 'color' => '#ec4899', 'unlimited' => true],
            ['code' => 'MSO1', 'name' => 'MSO1', 'url' => null, 'color' => '#6366f1', 'unlimited' => false],
        ], ['code'], ['name', 'url', 'color', 'unlimited']);
    }

    public function down(): void
    {
        Schema::table('rooms', function (Blueprint $table) {
            $table->dropColumn('color');
        });
    }
};
