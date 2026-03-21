<?php

namespace App\Console\Commands;

use App\Models\Event;
use App\Services\DiscordClient;
use Carbon\Carbon;
use Illuminate\Console\Command;

class ClosePastEvents extends Command
{
    protected $signature   = 'events:close-past';
    protected $description = 'Close all past events and remove their "looking for players" Discord tag';

    public function __construct(private readonly DiscordClient $discord)
    {
        parent::__construct();
    }

    public function handle(): int
    {
        $tagId = config('services.discord.tag_id_looking_for_players');

        $events = Event::query()
            ->where('is_closed', false)
            ->where('datetime_end', '<', Carbon::now())
            ->get();

        if ($events->isEmpty()) {
            $this->info('No past events to close.');

            return self::SUCCESS;
        }

        foreach ($events as $event) {
            $event->updateQuietly(['is_closed' => true]);

            if ($tagId && $event->discord_thread_id) {
                try {
                    $this->discord->setThreadTags($event->discord_thread_id, []);
                } catch (\Throwable $e) {
                    $this->warn("  Could not update Discord tags for event #{$event->id}: {$e->getMessage()}");
                }
            }

            $this->line("  Closed event #{$event->id}");
        }

        $this->info("Closed {$events->count()} event(s).");

        return self::SUCCESS;
    }
}
