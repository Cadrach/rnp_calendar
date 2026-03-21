<?php

namespace App\Http\Controllers;

use App\Models\Scenario;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ScenarioController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json(Scenario::orderBy('name')->get());
    }

    public function show(Scenario $scenario): JsonResponse
    {
        return response()->json($scenario);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'game_id'     => ['required', 'integer', 'exists:games,id'],
            'name'        => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
        ]);

        $scenario = Scenario::create([
            ...$data,
            'mj_user_id' => $request->user()->id,
        ]);

        return response()->json($scenario, 201);
    }

    public function update(Request $request, Scenario $scenario): JsonResponse
    {
        $this->authorizeOwner($request, $scenario);

        $data = $request->validate([
            'game_id'     => ['sometimes', 'integer', 'exists:games,id'],
            'name'        => ['sometimes', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
        ]);

        $scenario->update($data);

        return response()->json($scenario);
    }

    public function destroy(Request $request, Scenario $scenario): JsonResponse
    {
        $this->authorizeOwner($request, $scenario);

        if ($scenario->isInUse()) {
            return response()->json([
                'message' => 'Ce scénario est utilisé dans des séances et ne peut pas être supprimé.',
            ], 422);
        }

        $scenario->delete();

        return response()->json(null, 204);
    }

    private function authorizeOwner(Request $request, Scenario $scenario): void
    {
        if ($request->user()->id !== $scenario->mj_user_id) {
            abort(403);
        }
    }
}
