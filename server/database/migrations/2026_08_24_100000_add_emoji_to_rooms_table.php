<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Marker prefixed to the room's Discord forum thread name, so a séance's venue is readable
     * straight from the forum list.
     *
     * The three Centre Social rooms share 🏢 on purpose: the emoji answers "which venue", and the
     * room code follows it immediately, so 🏢 CSb1 and 🏢 CSb2 stay distinguishable.
     */
    private const SEED = [
        'BAR'  => '🍺',  // Bar / Café
        'BBS1' => '📚',  // Black Book Shop
        'CSb1' => '🏢',  // Centre Social (Salle 1)
        'CSb2' => '🏢',  // Centre Social (Salle 2)
        'CSsm' => '🏢',  // Centre Social
        'CAVE' => '🍷',  // Caveau
        'HOTE' => '🏠',  // Chez l'hôte
        'DIST' => '💻',  // Distanciel
        'MSO1' => '🏛️',  // Maison des Sociétés
    ];

    public function up(): void
    {
        Schema::table('rooms', function (Blueprint $table) {
            if (! Schema::hasColumn('rooms', 'emoji')) {
                // 16 chars comfortably holds a ZWJ sequence or a variation selector
                // (🏛️ is two code points: U+1F3DB + U+FE0F).
                $table->string('emoji', 16)->nullable()->after('color');
            }
        });

        // Targeted updates rather than an upsert: this must never insert a room or clobber one
        // whose code no longer matches.
        foreach (self::SEED as $code => $emoji) {
            DB::table('rooms')->where('code', $code)->update(['emoji' => $emoji]);
        }
    }

    public function down(): void
    {
        Schema::table('rooms', function (Blueprint $table) {
            if (Schema::hasColumn('rooms', 'emoji')) {
                $table->dropColumn('emoji');
            }
        });
    }
};
