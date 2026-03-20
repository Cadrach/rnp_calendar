<?php

namespace App\Services;

use App\Models\Event;
use App\Models\Room;
use App\Models\Scenario;
use Carbon\Carbon;

class EventDiscordSync
{
    public function __construct(private readonly DiscordClient $discord)
    {
    }

    public function sync(Event $event): void
    {
        $event->load(['mj', 'room', 'game', 'scenario']);

        $title   = $this->buildTitle($event);
        $content = $this->buildContent($event);

        if ($event->discord_thread_id) {
            $this->discord->editThread($event->discord_thread_id, $title);
            // The starter message ID equals the thread ID for forum posts
            $this->discord->editMessage($event->discord_thread_id, $event->discord_thread_id, $content);
        } else {
            $channelId = config('services.discord.channel_seances');
            $thread    = $this->discord->createForumThread($channelId, $title, $content);
            $event->updateQuietly(['discord_thread_id' => $thread['id']]);
        }
    }

    private function buildTitle(Event $event): string
    {
        $date  = Carbon::parse($event->datetime_start)->timezone('Europe/Paris')->format('d/m/y');
        $title = "[{$event->room->code}][{$date}] {$event->game->name}";

        if ($event->scenario) {
            $title .= " - {$event->scenario->name}";
        }

        return $title;
    }

    private function buildContent(Event $event): string
    {
        $tz    = config('app.club_timezone');
        $start = Carbon::parse($event->datetime_start)->timezone($tz)->locale('fr');
        $end   = Carbon::parse($event->datetime_end)->timezone($tz)->locale('fr');

        $date     = $start->isoFormat('dddd D MMMM YYYY');
        $timeFrom = $start->format('H\hi');
        $timeTo   = $end->format('H\hi');

        $lines = [
            "## {$this->buildTitle($event)}",
            '',
            "📅 **Date :** {$date}, {$timeFrom} → {$timeTo}",
            "🏠 **Salle :** {$this->roomLabel($event->room)}",
            "🎲 **Jeu :** {$event->game->name}",
        ];

        if ($event->scenario) {
            $lines[] = "📖 **Scénario :** {$this->scenarioLabel($event->scenario)}";
        }

        $mjMention = $event->mj?->discord_id
            ? "<@{$event->mj->discord_id}>"
            : $event->mj?->name ?? '—';

        $lines[] = "👑 **MJ :** {$mjMention}";

        $playerCount = '';

        if ($event->min_players && $event->max_players) {
            $playerCount = "{$event->min_players} – {$event->max_players}";
        } elseif ($event->max_players) {
            $playerCount = "max {$event->max_players}";
        } elseif ($event->min_players) {
            $playerCount = "min {$event->min_players}";
        }

        if ($playerCount) {
            $lines[] = "👥 **Joueurs :** {$playerCount}";
        }

        $playerIds = $event->player_ids ?? [];

        if (! empty($playerIds)) {
            $mentions = implode(', ', array_map(fn ($id) => "<@{$id}>", $playerIds));
            $lines[]  = "🎭 **Inscrits :** {$mentions}";
        }

        $registeredCount = count($playerIds);
        $isFull          = $event->max_players !== null && $registeredCount >= $event->max_players;

        if (! $isFull) {
            $url     = rtrim(config('app.frontend_url'), '/') . '/show/' . $event->id;
            $lines[] = '';
            $lines[] = "👉 [S'inscrire à cette séance]({$url})";
        }

        return implode("\n", $lines);
    }

    private function roomLabel(Room $room): string
    {
        return $room->url
            ? "[{$room->name}]({$room->url})"
            : $room->name;
    }

    private function scenarioLabel(Scenario $scenario): string
    {
        if ($scenario->discord_thread_id) {
            $guildId = config('services.discord.guild_id');
            $url = "https://discord.com/channels/{$guildId}/{$scenario->discord_thread_id}";
            return "[{$scenario->name}]({$url})";
        }

        return $scenario->name;
    }
}
