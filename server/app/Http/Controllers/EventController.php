<?php

namespace App\Http\Controllers;

use App\Models\Event;
use App\Services\EventDiscordSync;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class EventController extends Controller
{
    public function __construct(private readonly EventDiscordSync $discordSync) {}

    public function index(): JsonResponse
    {
        return response()->json(Event::all());
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'datetime_start' => ['required', 'date'],
            'datetime_end'   => ['required', 'date', 'after:datetime_start'],
            'mj_user_id'     => ['required', 'exists:users,id'],
            'room_id'        => ['required', 'exists:rooms,id'],
            'game_id'        => ['required', 'exists:games,id'],
            'scenario_id'    => ['nullable', 'exists:scenarios,id'],
            'min_players'    => ['nullable', 'integer', 'min:1'],
            'max_players'    => ['nullable', 'integer', 'min:1', 'gte:min_players'],
            'player_ids'     => ['nullable', 'array'],
            'player_ids.*'   => ['string'],
        ]);

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
        if (! $request->user()->is_admin && $request->user()->id !== $event->mj_user_id) {
            abort(403);
        }
    }

    public function update(Request $request, Event $event): JsonResponse
    {
        $this->authorizeEventMutation($request, $event);

        $data = $request->validate([
            'datetime_start' => ['sometimes', 'date'],
            'datetime_end'   => ['sometimes', 'date', 'after:datetime_start'],
            'mj_user_id'     => ['sometimes', 'exists:users,id'],
            'room_id'        => ['sometimes', 'exists:rooms,id'],
            'game_id'        => ['sometimes', 'exists:games,id'],
            'scenario_id'    => ['nullable', 'exists:scenarios,id'],
            'min_players'    => ['nullable', 'integer', 'min:1'],
            'max_players'    => ['nullable', 'integer', 'min:1', 'gte:min_players'],
            'player_ids'     => ['nullable', 'array'],
            'player_ids.*'   => ['string'],
        ]);

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

        if (! $discordId) {
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

        if (! $discordId) {
            return response()->json(['message' => 'No Discord account linked to this user.'], 422);
        }

        $playerIds = $event->player_ids ?? [];

        if (! in_array($discordId, $playerIds)) {
            return response()->json(['message' => 'Not registered.'], 422);
        }

        $event->update(['player_ids' => array_values(array_filter($playerIds, fn($id) => $id !== $discordId))]);

        $this->discordSync->sync($event);

        return response()->json($event);
    }

    public function destroy(Request $request, Event $event): JsonResponse
    {
        $this->authorizeEventMutation($request, $event);

        $event->delete();

        return response()->json(null, 204);
    }
}
