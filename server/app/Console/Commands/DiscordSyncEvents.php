<?php

namespace App\Console\Commands;

use App\Models\Event;
use App\Services\EventDiscordSync;
use Illuminate\Console\Command;

class DiscordSyncEvents extends Command
{
    protected $signature = 'discord:sync:events';
    protected $description = 'Re-sync all active events to their Discord threads';

    public function handle(EventDiscordSync $sync): int
    {
        $events = Event::with(['room', 'game', 'scenario'])->get();

        if ($events->isEmpty()) {
            $this->info('No events to sync.');
            return self::SUCCESS;
        }

        $this->withProgressBar($events, function (Event $event) use ($sync) {
            $sync->sync($event);
        });

        $this->newLine();
        $this->info("Synced {$events->count()} event(s).");

        return self::SUCCESS;
    }
}
