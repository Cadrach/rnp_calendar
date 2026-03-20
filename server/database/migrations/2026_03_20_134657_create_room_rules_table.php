<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('room_rules', function (Blueprint $table) {
            $table->id();
            $table->foreignId('room_id')->constrained()->cascadeOnDelete();
            $table->string('kind'); // available, unavailable
            $table->string('scope'); // daily, weekly, once
            $table->date('date')->nullable(); // for scope=once
            $table->json('weekdays')->nullable(); // for scope=weekly, e.g. [1,3,5]
            $table->time('start_time');
            $table->time('end_time');
            $table->date('valid_from')->nullable();
            $table->date('valid_until')->nullable();
            $table->integer('priority')->default(0);
            $table->string('reason')->nullable();
            $table->timestamps();

            $table->index(['room_id', 'kind']);
            $table->index(['room_id', 'scope']);
        });

        // Seed default rules for all rooms
        $roomIds = DB::table('rooms')->pluck('id');
        $now = now();

        foreach ($roomIds as $roomId) {
            // Available daily from 14:00 to 23:00
            DB::table('room_rules')->insert([
                'room_id'    => $roomId,
                'kind'       => 'available',
                'scope'      => 'daily',
                'date'       => null,
                'weekdays'   => null,
                'start_time' => '14:00:00',
                'end_time'   => '23:00:00',
                'valid_from' => null,
                'valid_until'=> null,
                'priority'   => 0,
                'reason'     => null,
                'created_at' => $now,
                'updated_at' => $now,
            ]);

            // Unavailable on Wednesday (3) from 14:00 to 18:00
            DB::table('room_rules')->insert([
                'room_id'    => $roomId,
                'kind'       => 'unavailable',
                'scope'      => 'weekly',
                'date'       => null,
                'weekdays'   => json_encode([3]),
                'start_time' => '14:00:00',
                'end_time'   => '18:00:00',
                'valid_from' => null,
                'valid_until'=> null,
                'priority'   => 0,
                'reason'     => 'Fermé le mercredi après-midi',
                'created_at' => $now,
                'updated_at' => $now,
            ]);
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('room_rules');
    }
};
