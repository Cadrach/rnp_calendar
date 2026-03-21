<?php

namespace App\Http\Controllers;

use App\Models\Room;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class RoomCrudController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json(Room::orderBy('name')->get());
    }

    public function show(Room $room): JsonResponse
    {
        return response()->json($room);
    }

    public function store(Request $request): JsonResponse
    {
        $this->authorizeAdmin($request);

        $data = $request->validate([
            'code'      => ['required', 'string', 'max:255', 'unique:rooms,code'],
            'name'      => ['required', 'string', 'max:255'],
            'url'       => ['nullable', 'url', 'max:255'],
            'color'     => ['required', 'string', 'regex:/^#[0-9a-fA-F]{6}$/'],
            'unlimited' => ['boolean'],
        ]);

        return response()->json(Room::create($data), 201);
    }

    public function update(Request $request, Room $room): JsonResponse
    {
        $this->authorizeAdmin($request);

        $data = $request->validate([
            'code'      => ['sometimes', 'string', 'max:255', 'unique:rooms,code,' . $room->id],
            'name'      => ['sometimes', 'string', 'max:255'],
            'url'       => ['nullable', 'url', 'max:255'],
            'color'     => ['sometimes', 'string', 'regex:/^#[0-9a-fA-F]{6}$/'],
            'unlimited' => ['boolean'],
        ]);

        $room->update($data);

        return response()->json($room);
    }

    public function destroy(Request $request, Room $room): JsonResponse
    {
        $this->authorizeAdmin($request);

        if ($room->isInUse()) {
            return response()->json([
                'message' => 'Cette salle est utilisée dans des séances et ne peut pas être supprimée.',
            ], 422);
        }

        $room->delete();

        return response()->json(null, 204);
    }

    private function authorizeAdmin(Request $request): void
    {
        if (! $request->user()->is_admin) {
            abort(403);
        }
    }
}
