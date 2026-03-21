<?php

namespace App\Http\Controllers;

use App\Models\Game;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class GameController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json(Game::orderBy('name')->get());
    }

    public function show(Game $game): JsonResponse
    {
        return response()->json($game);
    }

    public function store(Request $request): JsonResponse
    {
        $this->authorizeAdmin($request);

        $data = $request->validate([
            'name' => ['required', 'string', 'max:255', 'unique:games,name'],
        ]);

        return response()->json(Game::create($data), 201);
    }

    public function update(Request $request, Game $game): JsonResponse
    {
        $this->authorizeAdmin($request);

        $data = $request->validate([
            'name' => ['required', 'string', 'max:255', 'unique:games,name,' . $game->id],
        ]);

        $game->update($data);

        return response()->json($game);
    }

    public function destroy(Request $request, Game $game): JsonResponse
    {
        $this->authorizeAdmin($request);

        if ($game->isInUse()) {
            return response()->json([
                'message' => 'Ce jeu est utilisé dans des séances ou des scénarios et ne peut pas être supprimé.',
            ], 422);
        }

        $game->delete();

        return response()->json(null, 204);
    }

    private function authorizeAdmin(Request $request): void
    {
        if (! $request->user()->is_admin) {
            abort(403);
        }
    }
}
