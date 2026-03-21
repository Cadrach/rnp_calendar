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
        $event->load(['room', 'game', 'scenario']);

        $title   = $this->buildTitle($event);
        $content = $this->buildContent($event);
        $tagIds  = $this->openSpotsTagIds($event);

        if ($event->discord_thread_id) {
            $this->discord->editThread($event->discord_thread_id, $title);
            // The starter message ID equals the thread ID for forum posts
            $this->discord->editMessage($event->discord_thread_id, $event->discord_thread_id, $content);
            $this->discord->setThreadTags($event->discord_thread_id, $tagIds);
        } else {
            $channelId = config('services.discord.channel_seances');
            $thread    = $this->discord->createForumThread($channelId, $title, $content, $tagIds);
            $event->updateQuietly(['discord_thread_id' => $thread['id']]);
        }
    }

    /**
     * Returns the list of tag IDs to apply to the thread.
     * Adds the "open spots" tag when max_players is unset or not yet reached.
     */
    private function openSpotsTagIds(Event $event): array
    {
        $tagId = config('services.discord.tag_id_looking_for_players');

        if (! $tagId) {
            return [];
        }

        $registered = count($event->player_ids ?? []);
        $hasOpenSpots = $event->max_players === null || $registered < $event->max_players;

        return $hasOpenSpots ? [$tagId] : [];
    }

    /**
     * Marks the Discord thread as cancelled by prepending [ANNULÉ] to the title.
     * Only acts if the event has an associated thread.
     */
    public function cancel(Event $event): void
    {
        if (! $event->discord_thread_id) {
            return;
        }

        $event->load(['room', 'game', 'scenario']);

        $this->discord->editThread(
            $event->discord_thread_id,
            '[ANNULÉ] ' . $this->buildTitle($event),
        );
    }

    // ── Trail messages ──────────────────────────────────────────────────────────

    /**
     * Captures a displayable snapshot of the event's current state for diffing.
     * Call this *before* an update, then pass the result to trailUpdated().
     */
    public function snapshot(Event $event): array
    {
        $tz = config('app.club_timezone');

        return [
            'datetime_start' => Carbon::parse($event->datetime_start)->timezone($tz)->format('d/m/y H\hi'),
            'datetime_end'   => Carbon::parse($event->datetime_end)->timezone($tz)->format('d/m/y H\hi'),
            'mj_discord_id'  => $event->mj_discord_id,
            'room'           => $event->room?->name ?? '—',
            'game'           => $event->game?->name ?? '—',
            'scenario'       => $event->scenario?->name,
            'min_players'    => $event->min_players !== null ? (string) $event->min_players : null,
            'max_players'    => $event->max_players !== null ? (string) $event->max_players : null,
        ];
    }

    public function trailRegistered(Event $event, string $discordId): void
    {
        if (! $event->discord_thread_id) {
            return;
        }

        $this->discord->sendMessage(
            $event->discord_thread_id,
            "✅ <@{$discordId}> s'est inscrit(e).",
        );
    }

    public function trailUnregistered(Event $event, string $discordId): void
    {
        if (! $event->discord_thread_id) {
            return;
        }

        $this->discord->sendMessage(
            $event->discord_thread_id,
            "❌ <@{$discordId}> s'est désinscrit(e).",
        );
    }

    /**
     * @param array $before Snapshot captured before the update via snapshot()
     */
    public function trailUpdated(array $before, Event $event, string $editorDiscordId): void
    {
        if (! $event->discord_thread_id) {
            return;
        }

        $after   = $this->snapshot($event);
        $changes = $this->buildChangeDiff($before, $after);

        if (empty($changes)) {
            return;
        }

        $lines = ["✏️ <@{$editorDiscordId}> a modifié la séance :"];
        foreach ($changes as $line) {
            $lines[] = "- {$line}";
        }

        $this->discord->sendMessage($event->discord_thread_id, implode("\n", $lines));
    }

    public function trailClosed(Event $event): void
    {
        if (! $event->discord_thread_id) {
            return;
        }

        $this->discord->sendMessage(
            $event->discord_thread_id,
            '🔒 Cette séance est maintenant terminée.',
        );
    }

    public function trailDeleted(Event $event, string $editorDiscordId): void
    {
        if (! $event->discord_thread_id) {
            return;
        }

        $this->discord->sendMessage(
            $event->discord_thread_id,
            "🗑️ Séance annulée par <@{$editorDiscordId}>.",
        );
    }

    private function buildChangeDiff(array $before, array $after): array
    {
        $changes = [];

        $fieldLabels = [
            'datetime_start' => 'Début',
            'datetime_end'   => 'Fin',
            'room'           => 'Salle',
            'game'           => 'Jeu',
            'scenario'       => 'Scénario',
            'min_players'    => 'Min joueurs',
            'max_players'    => 'Max joueurs',
        ];

        foreach ($fieldLabels as $key => $label) {
            $old = $before[$key] ?? null;
            $new = $after[$key] ?? null;

            if ($old !== $new) {
                $changes[] = "**{$label}** : " . ($old ?? '—') . ' → ' . ($new ?? '—');
            }
        }

        if ($before['mj_discord_id'] !== $after['mj_discord_id']) {
            $changes[] = '**MJ** : <@' . $before['mj_discord_id'] . '> → <@' . $after['mj_discord_id'] . '>';
        }

        return $changes;
    }

    private function buildTitle(Event $event): string
    {
        $date  = Carbon::parse($event->datetime_start)->timezone('Europe/Paris')->format('d/m/y');
        $title = "{$event->room->code} {$date} · {$event->game->name}";

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

        $mjMention = $event->mj_discord_id
            ? "<@{$event->mj_discord_id}>"
            : '—';

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
