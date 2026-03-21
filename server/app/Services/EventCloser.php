<?php

namespace App\Services;

use App\Models\Event;
use Carbon\Carbon;

class EventCloser
{
    public function __construct(
        private readonly DiscordClient $discord,
        private readonly EventDiscordSync $discordSync,
    ) {}

    public function closeAll(): int
    {
        $tagId = config('services.discord.tag_id_looking_for_players');

        $events = Event::query()
            ->where('is_closed', false)
            ->where('datetime_end', '<', Carbon::now())
            ->get();

        foreach ($events as $event) {
            $event->updateQuietly(['is_closed' => true]);

            if ($event->discord_thread_id) {
                try {
                    if ($tagId) {
                        $this->discord->setThreadTags($event->discord_thread_id, []);
                    }
                    $this->discordSync->trailClosed($event);
                } catch (\Throwable) {
                    // non-fatal — don't break the request
                }
            }
        }

        return $events->count();
    }
}
