<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('events', function (Blueprint $table) {
            // Soft-delete scope appears in every query; index allows the DB to skip deleted rows early.
            $table->index('deleted_at');

            // FK used in Event::with('mj') — SQLite does not auto-index FK columns.
            $table->index('mj_user_id');

            // Overlap check in EventBookingValidator::hasOverlap():
            //   WHERE room_id = ? AND datetime_start < $end AND datetime_end > $start
            // The leading room_id narrows the scan; datetime_start drives the range seek;
            // datetime_end is a covering column that avoids a table lookup in most cases.
            $table->index(['room_id', 'datetime_start', 'datetime_end'], 'events_room_range_idx');

            // Range filter in EventController::index():
            //   WHERE datetime_start < $end AND datetime_end > $start
            $table->index(['datetime_start', 'datetime_end'], 'events_range_idx');
        });

        Schema::table('scenarios', function (Blueprint $table) {
            // Looked up by discord_thread_id in EventController::resolveScenarioId();
            // also used to exclude already-linked threads in DictionaryController::scenarii().
            $table->unique('discord_thread_id');

            // FK used when filtering/joining scenarios by their MJ.
            $table->index('mj_user_id');
        });
    }

    public function down(): void
    {
        Schema::table('events', function (Blueprint $table) {
            $table->dropIndex(['deleted_at']);
            $table->dropIndex(['mj_user_id']);
            $table->dropIndex('events_room_range_idx');
            $table->dropIndex('events_range_idx');
        });

        Schema::table('scenarios', function (Blueprint $table) {
            $table->dropUnique(['discord_thread_id']);
            $table->dropIndex(['mj_user_id']);
        });
    }
};
