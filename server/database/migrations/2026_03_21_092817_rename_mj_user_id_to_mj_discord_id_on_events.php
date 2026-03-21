<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // 1. Add the new string column alongside the old one
        Schema::table('events', function (Blueprint $table) {
            $table->string('mj_discord_id')->nullable()->after('mj_user_id');
        });

        // 2. Populate from the users table
        DB::statement('UPDATE events SET mj_discord_id = (SELECT discord_id FROM users WHERE users.id = events.mj_user_id)');

        // 3. Make it required now that all rows are populated
        Schema::table('events', function (Blueprint $table) {
            $table->string('mj_discord_id')->nullable(false)->change();
        });

        // 4. Drop the index added in the performance migration, then drop the FK column
        Schema::table('events', function (Blueprint $table) {
            $table->dropIndex(['mj_user_id']);
            $table->dropForeign(['mj_user_id']);
            $table->dropColumn('mj_user_id');
        });
    }

    public function down(): void
    {
        Schema::table('events', function (Blueprint $table) {
            $table->foreignId('mj_user_id')->nullable()->constrained('users');
        });

        DB::statement('UPDATE events SET mj_user_id = (SELECT id FROM users WHERE users.discord_id = events.mj_discord_id)');

        Schema::table('events', function (Blueprint $table) {
            $table->unsignedBigInteger('mj_user_id')->nullable(false)->change();
            $table->index('mj_user_id');
            $table->dropColumn('mj_discord_id');
        });
    }
};
