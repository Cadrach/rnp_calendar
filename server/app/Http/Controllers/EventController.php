<?php

namespace App\Http\Controllers;

use App\Models\Event;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class EventController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json(Event::all());
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'title'          => ['required', 'string'],
            'datetime_start' => ['required', 'date'],
            'datetime_end'   => ['required', 'date', 'after:datetime_start'],
            'mj_user_id'     => ['required', 'exists:users,id'],
            'room_id'        => ['required', 'exists:rooms,id'],
            'game_id'        => ['required', 'exists:games,id'],
            'scenario_id'    => ['nullable', 'exists:scenarios,id'],
            'min_players'    => ['nullable', 'integer', 'min:1'],
            'max_players'    => ['nullable', 'integer', 'min:1', 'gte:min_players'],
        ]);

        $event = Event::create($data);

        return response()->json($event, 201);
    }

    public function show(Event $event): JsonResponse
    {
        return response()->json($event);
    }

    public function update(Request $request, Event $event): JsonResponse
    {
        $data = $request->validate([
            'title'          => ['sometimes', 'string'],
            'datetime_start' => ['sometimes', 'date'],
            'datetime_end'   => ['sometimes', 'date', 'after:datetime_start'],
            'mj_user_id'     => ['sometimes', 'exists:users,id'],
            'room_id'        => ['sometimes', 'exists:rooms,id'],
            'game_id'        => ['sometimes', 'exists:games,id'],
            'scenario_id'    => ['nullable', 'exists:scenarios,id'],
            'min_players'    => ['nullable', 'integer', 'min:1'],
            'max_players'    => ['nullable', 'integer', 'min:1', 'gte:min_players'],
        ]);

        $event->update($data);

        return response()->json($event);
    }

    public function destroy(Event $event): JsonResponse
    {
        $event->delete();

        return response()->json(null, 204);
    }
}
