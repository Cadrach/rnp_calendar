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
            if (! Schema::hasColumn('rooms', 'url')) {
                $table->string('url')->nullable()->after('name');
            }
            if (! Schema::hasIndex('rooms', 'rooms_code_unique')) {
                $table->unique('code');
            }
        });

        DB::table('rooms')->upsert([
            ['code' => 'BAR',  'name' => 'BAR',  'url' => null, 'unlimited' => false],
            ['code' => 'BBS1', 'name' => 'BBS1', 'url' => null, 'unlimited' => false],
            ['code' => 'CAVE', 'name' => 'CAVE', 'url' => null, 'unlimited' => false],
            ['code' => 'CSb1', 'name' => 'Centre Social (Salle 1)', 'url' => 'https://maps.app.goo.gl/XwGtDhiaE6EYYmby5', 'unlimited' => false],
            ['code' => 'CSb2', 'name' => 'Centre Social (Salle 2)', 'url' => 'https://maps.app.goo.gl/XwGtDhiaE6EYYmby5', 'unlimited' => false],
            ['code' => 'CSsm', 'name' => 'CSsm', 'url' => null, 'unlimited' => false],
            ['code' => 'DIST', 'name' => 'DIST', 'url' => null, 'unlimited' => false],
            ['code' => 'HOTE', 'name' => 'Chez l\'hôte', 'url' => null, 'unlimited' => true],
            ['code' => 'MSO1', 'name' => 'MSO1', 'url' => null, 'unlimited' => false],
        ], ['code'], ['name', 'url', 'unlimited']);
    }

    public function down(): void
    {
        Schema::table('rooms', function (Blueprint $table) {
            $table->dropColumn('url');
        });
    }
};
