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

class EventController extends Controller
{
    public function __construct(
        private readonly EventDiscordSync   $discordSync,
        private readonly DiscordClient      $discord,
        private readonly EventBookingValidator $bookingValidator,
    ) {
    }

    public function index(Request $request): JsonResponse
    {
        $request->validate([
            'start' => ['sometimes', 'date'],
            'end'   => ['sometimes', 'date', 'after:start'],
        ]);

        $query = Event::query();

        if ($request->has('start') && $request->has('end')) {
            $start = Carbon::parse($request->input('start'));
            $end   = Carbon::parse($request->input('end'));
            $query->where('datetime_start', '<', $end)
                  ->where('datetime_end', '>', $start);
        }

        return response()->json($query->get());
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'datetime_start'  => ['required', 'date'],
            'datetime_end'    => ['required', 'date', 'after:datetime_start'],
            'mj_discord_id'   => ['required', 'string', 'exists:users,discord_id'],
            'room_id'         => ['required', 'exists:rooms,id'],
            'game_id'         => ['required', 'exists:games,id'],
            'scenario_key'    => ['nullable', 'string'],
            'min_players'     => ['nullable', 'integer', 'min:1'],
            'max_players'     => ['nullable', 'integer', 'min:1', 'gte:min_players'],
            'player_ids'      => ['nullable', 'array'],
            'player_ids.*'    => ['string'],
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
            return (int) substr($key, 3);
        }

        if (str_starts_with($key, 'discord:')) {
            $threadId = substr($key, 8);

            $existing = Scenario::where('discord_thread_id', $threadId)->first();
            if ($existing) {
                return $existing->id;
            }

            $mjUserId = User::where('discord_id', $mjDiscordId)->value('id');

            $thread  = $this->discord->getChannel($threadId);
            $message = $this->discord->getMessage($threadId, $threadId);

            $scenario = Scenario::create([
                'mj_user_id'        => $mjUserId,
                'game_id'           => $gameId,
                'name'              => $thread['name'] ?? 'Sans titre',
                'description'       => $message['content'] ?? null,
                'discord_thread_id' => $threadId,
            ]);

            return $scenario->id;
        }

        return null;
    }

    public function update(Request $request, Event $event): JsonResponse
    {
        $this->authorizeEventMutation($request, $event);

        $data = $request->validate([
            'datetime_start'  => ['sometimes', 'date'],
            'datetime_end'    => ['sometimes', 'date', 'after:datetime_start'],
            'mj_discord_id'   => ['sometimes', 'string', 'exists:users,discord_id'],
            'room_id'         => ['sometimes', 'exists:rooms,id'],
            'game_id'         => ['sometimes', 'exists:games,id'],
            'scenario_key'    => ['nullable', 'string'],
            'min_players'     => ['nullable', 'integer', 'min:1'],
            'max_players'     => ['nullable', 'integer', 'min:1', 'gte:min_players'],
            'player_ids'      => ['nullable', 'array'],
            'player_ids.*'    => ['string'],
        ]);

        if (array_key_exists('scenario_key', $data)) {
            $mjDiscordId = $data['mj_discord_id'] ?? $event->mj_discord_id;
            $gameId      = $data['game_id'] ?? $event->game_id;
            $data['scenario_id'] = $this->resolveScenarioId($data['scenario_key'], $mjDiscordId, $gameId);
            unset($data['scenario_key']);
        }

        $room  = Room::findOrFail($data['room_id'] ?? $event->room_id);
        $start = Carbon::parse($data['datetime_start'] ?? $event->datetime_start);
        $end   = Carbon::parse($data['datetime_end'] ?? $event->datetime_end);
        $this->bookingValidator->validate($room, $start, $end, excludeEventId: $event->id);

        $event->update($data);

        $this->discordSync->sync($event);

        return response()->json($event);
    }

    public function register(Request $request, Event $event): JsonResponse
    {
        $request->validate([
            'user_id' => ['required', 'integer', 'exists:users,id'],
        ]);

        if ($request->user()->id !== (int) $request->user_id) {
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

        return response()->json($event);
    }

    public function unregister(Request $request, Event $event): JsonResponse
    {
        $request->validate([
            'user_id' => ['required', 'integer', 'exists:users,id'],
        ]);

        if ($request->user()->id !== (int) $request->user_id) {
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

        return response()->json($event);
    }

    public function destroy(Request $request, Event $event): JsonResponse
    {
        $this->authorizeEventMutation($request, $event);

        $this->discordSync->cancel($event);

        $event->delete();

        return response()->json(null, 204);
    }
}
