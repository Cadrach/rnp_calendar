<?php

namespace App\Http\Controllers;

use App\Models\Event;
use App\Models\Room;
use App\Models\Scenario;
use App\Models\User;
use App\Services\Availability\EventBookingValidator;
use App\Services\DiscordClient;
use App\Services\EventDiscordSync;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class EventController extends Controller
{
    public function __construct(
        private readonly EventDiscordSync      $discordSync,
        private readonly DiscordClient         $discord,
        private readonly EventBookingValidator $bookingValidator,
    )
    {
    }

    /**
     * Generate a Discord-formatted summary of upcoming events.
     * Admin only.
     */
    public function discordSummary(Request $request): JsonResponse
    {
        if (!$request->user()->is_admin) {
            abort(403);
        }

        $events = Event::where('datetime_start', '>', now())
            ->with(['game', 'room'])
            ->orderBy('datetime_start')
            ->get();

        // Group events
        $missingPlayers = [];
        $hasRoom = [];
        $full = [];

        foreach ($events as $event) {
            $playerCount = count($event->player_ids ?? []);
            $minPlayers = $event->min_players ?? 1;
            $maxPlayers = $event->max_players;

            // 0 players = always looking for players
            if ($playerCount === 0 || $playerCount < $minPlayers) {
                $missingPlayers[] = $event;
            } elseif ($maxPlayers === null || $playerCount < $maxPlayers) {
                $hasRoom[] = $event;
            } else {
                $full[] = $event;
            }
        }

        $frontendUrl = rtrim(config('app.frontend_url'), '/');
        $guildId = config('services.discord.guild_id');

        $formatEvent = function (Event $event) use ($frontendUrl, $guildId) {
            $date = str_replace(' À ', ' à ', ucwords($event->datetime_start->locale('fr')->isoFormat('dddd D MMMM [à] HH[h]mm')));
            $gameName = $event->game?->name ?? 'Jeu inconnu';

            // Date + game name links to Discord thread if available
            $titleText = "{$date} — {$gameName}";
            $titleLabel = $event->discord_thread_id
                ? "[{$titleText}](https://discord.com/channels/{$guildId}/{$event->discord_thread_id})"
                : $titleText;

            $room = $event->room;
            $roomLabel = $room
                ? ($room->url ? "[{$room->name}]({$room->url})" : $room->name)
                : 'Salle inconnue';

            $mjMention = $event->mj_discord_id ? "<@{$event->mj_discord_id}>" : '—';
            $playerCount = count($event->player_ids ?? []);
            $minPlayers = $event->min_players ?? 1;
            $maxPlayers = $event->max_players ?? '∞';
            $link = "{$frontendUrl}/show/{$event->id}";

            return "### {$titleLabel}\n" .
                "- 👥 Joueur'euses: {$playerCount}/{$maxPlayers} - minimum {$minPlayers}\n" .
                "- 📍 Salle: {$roomLabel}\n" .
                "- 🎲 MJ: {$mjMention}\n" .
                "- 🔗 [S'inscrire]({$link})";
        };

        $lines = [];

        if (count($missingPlayers) > 0) {
            $lines[] = "## 🔴 Parties en recherche de joueurs\n";
            foreach ($missingPlayers as $event) {
                $lines[] = $formatEvent($event);
                $lines[] = "";
            }
        }

        if (count($hasRoom) > 0) {
            $lines[] = "## 🟡 Parties avec des places disponibles\n";
            foreach ($hasRoom as $event) {
                $lines[] = $formatEvent($event);
                $lines[] = "";
            }
        }

        $content = implode("\n", $lines);

        if (empty(trim($content))) {
            $content = "*Aucune partie à venir avec des places disponibles.*";
        }

        return response()->json(['content' => $content]);
    }

    public function index(Request $request): JsonResponse
    {
        $request->validate([
            'start' => ['sometimes', 'date'],
            'end' => ['sometimes', 'date', 'after:start'],
        ]);

        $query = Event::query();

        if ($request->has('start') && $request->has('end')) {
            $start = Carbon::parse($request->input('start'));
            $end = Carbon::parse($request->input('end'));
            $query->where('datetime_start', '<', $end)
                ->where('datetime_end', '>', $start);
        }

        return response()->json($query->get());
    }

    public function store(Request $request): JsonResponse
    {
        if (!$request->user()->is_mj) {
            abort(403);
        }

        $data = $request->validate([
            'datetime_start' => ['required', 'date'],
            'datetime_end' => ['required', 'date', 'after:datetime_start'],
            'mj_discord_id' => ['required', 'string', 'exists:users,discord_id'],
            'room_id' => ['required', 'exists:rooms,id'],
            'game_id' => ['required', 'exists:games,id'],
            'scenario_key' => ['nullable', 'string'],
            'min_players' => ['nullable', 'integer', 'min:1'],
            'max_players' => ['nullable', 'integer', 'min:1', Rule::when($request->filled('min_players'), 'gte:min_players')],
            'player_ids' => ['nullable', 'array'],
            'player_ids.*' => ['string'],
        ]);

        $data['scenario_id'] = $this->resolveScenarioId(
            $data['scenario_key'] ?? null,
            $data['mj_discord_id'],
            $data['game_id']
        );
        unset($data['scenario_key']);

        $room = Room::findOrFail($data['room_id']);
        $this->bookingValidator->validate(
            $room,
            Carbon::parse($data['datetime_start']),
            Carbon::parse($data['datetime_end']),
        );

        $event = Event::create($data);

        $this->discordSync->sync($event);

        return response()->json($event, 201);
    }

    public function show(Event $event): JsonResponse
    {
        return response()->json($event);
    }

    private function authorizeEventMutation(Request $request, Event $event): void
    {
        if (!$request->user()->is_admin && $request->user()->discord_id !== $event->mj_discord_id) {
            abort(403);
        }
    }

    /**
     * Converts a scenario_key to a scenario_id, inserting a new scenario in DB if required.
     * Accepts the MJ's Discord ID and resolves the DB user ID internally for scenario creation.
     */
    private function resolveScenarioId(?string $key, string $mjDiscordId, int $gameId): ?int
    {
        if (!$key) {
            return null;
        }

        if (str_starts_with($key, 'id:')) {
            return (int)substr($key, 3);
        }

        if (str_starts_with($key, 'discord:')) {
            $threadId = substr($key, 8);

            $existing = Scenario::where('discord_thread_id', $threadId)->first();
            if ($existing) {
                return $existing->id;
            }

            $mjUserId = User::where('discord_id', $mjDiscordId)->value('id');

            $thread = $this->discord->getChannel($threadId);
            $message = $this->discord->getMessage($threadId, $threadId);

            $scenario = Scenario::create([
                'mj_user_id' => $mjUserId,
                'game_id' => $gameId,
                'name' => $thread['name'] ?? 'Sans titre',
                'description' => $message['content'] ?? null,
                'discord_thread_id' => $threadId,
            ]);

            return $scenario->id;
        }

        return null;
    }

    public function update(Request $request, Event $event): JsonResponse
    {
        if ($event->is_closed) {
            return response()->json(['message' => 'Cette séance est terminée et ne peut plus être modifiée.'], 422);
        }

        $this->authorizeEventMutation($request, $event);

        $data = $request->validate([
            'datetime_start' => ['sometimes', 'date'],
            'datetime_end' => ['sometimes', 'date', 'after:datetime_start'],
            'mj_discord_id' => ['sometimes', 'string', 'exists:users,discord_id'],
            'room_id' => ['sometimes', 'exists:rooms,id'],
            'game_id' => ['sometimes', 'exists:games,id'],
            'scenario_key' => ['nullable', 'string'],
            'min_players' => ['nullable', 'integer', 'min:1'],
            'max_players' => ['nullable', 'integer', 'min:1', Rule::when($request->filled('min_players'), 'gte:min_players')],
            'player_ids' => ['nullable', 'array'],
            'player_ids.*' => ['string'],
        ]);

        if (array_key_exists('scenario_key', $data)) {
            $mjDiscordId = $data['mj_discord_id'] ?? $event->mj_discord_id;
            $gameId = $data['game_id'] ?? $event->game_id;
            $data['scenario_id'] = $this->resolveScenarioId($data['scenario_key'], $mjDiscordId, $gameId);
            unset($data['scenario_key']);
        }

        $room = Room::findOrFail($data['room_id'] ?? $event->room_id);
        $start = Carbon::parse($data['datetime_start'] ?? $event->datetime_start);
        $end = Carbon::parse($data['datetime_end'] ?? $event->datetime_end);
        $this->bookingValidator->validate($room, $start, $end, excludeEventId: $event->id);

        $event->load(['room', 'game', 'scenario']);
        $before = $this->discordSync->snapshot($event);

        $event->update($data);

        $this->discordSync->sync($event);
        $this->discordSync->trailUpdated($before, $event, $request->user()->discord_id ?? '');

        return response()->json($event);
    }

    public function register(Request $request, Event $event): JsonResponse
    {
        if ($event->is_closed) {
            return response()->json(['message' => 'Cette séance est terminée.'], 422);
        }

        $request->validate([
            'user_id' => ['required', 'integer', 'exists:users,id'],
        ]);

        if ($request->user()->id !== (int)$request->user_id) {
            abort(403);
        }

        $discordId = $request->user()->discord_id;

        if (!$discordId) {
            return response()->json(['message' => 'No Discord account linked to this user.'], 422);
        }

        $playerIds = $event->player_ids ?? [];

        if (in_array($discordId, $playerIds)) {
            return response()->json(['message' => 'Already registered.'], 422);
        }

        if ($event->max_players !== null && count($playerIds) >= $event->max_players) {
            return response()->json(['message' => 'Event is full.'], 422);
        }

        $event->update(['player_ids' => [...$playerIds, $discordId]]);

        $this->discordSync->sync($event);
        $this->discordSync->trailRegistered($event, $discordId);

        return response()->json($event);
    }

    public function unregister(Request $request, Event $event): JsonResponse
    {
        if ($event->is_closed) {
            return response()->json(['message' => 'Cette séance est terminée.'], 422);
        }

        $request->validate([
            'user_id' => ['required', 'integer', 'exists:users,id'],
        ]);

        if ($request->user()->id !== (int)$request->user_id) {
            abort(403);
        }

        $discordId = $request->user()->discord_id;

        if (!$discordId) {
            return response()->json(['message' => 'No Discord account linked to this user.'], 422);
        }

        $playerIds = $event->player_ids ?? [];

        if (!in_array($discordId, $playerIds)) {
            return response()->json(['message' => 'Not registered.'], 422);
        }

        $event->update(['player_ids' => array_values(array_filter($playerIds, fn($id) => $id !== $discordId))]);

        $this->discordSync->sync($event);
        $this->discordSync->trailUnregistered($event, $discordId);

        return response()->json($event);
    }

    public function destroy(Request $request, Event $event): JsonResponse
    {
        $this->authorizeEventMutation($request, $event);

        $this->discordSync->trailDeleted($event, $request->user()->discord_id ?? '');
        $this->discordSync->cancel($event);

        $event->delete();

        return response()->json(null, 204);
    }
}
