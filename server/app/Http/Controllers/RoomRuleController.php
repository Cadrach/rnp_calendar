<?php

namespace App\Http\Controllers;

use App\Models\RoomRule;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class RoomRuleController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $request->validate([
            'room_id' => ['sometimes', 'integer', 'exists:rooms,id'],
        ]);

        $query = RoomRule::query();

        if ($request->has('room_id')) {
            $query->where('room_id', $request->integer('room_id'));
        }

        return response()->json($query->orderBy('priority', 'desc')->orderBy('id')->get());
    }

    public function show(RoomRule $roomRule): JsonResponse
    {
        return response()->json($roomRule);
    }

    public function store(Request $request): JsonResponse
    {
        $this->authorizeAdmin($request);

        $data = $request->validate([
            'room_id'     => ['required', 'integer', 'exists:rooms,id'],
            'kind'        => ['required', Rule::in([RoomRule::KIND_AVAILABLE, RoomRule::KIND_UNAVAILABLE])],
            'scope'       => ['required', Rule::in([RoomRule::SCOPE_DAILY, RoomRule::SCOPE_WEEKLY, RoomRule::SCOPE_ONCE])],
            'date'        => ['nullable', 'required_if:scope,once', 'date_format:Y-m-d'],
            'weekdays'    => ['nullable', 'required_if:scope,weekly', 'array'],
            'weekdays.*'  => ['integer', 'min:1', 'max:7'],
            'start_time'  => ['required', 'date_format:H:i'],
            'end_time'    => ['required', 'date_format:H:i', 'after:start_time'],
            'valid_from'  => ['nullable', 'date_format:Y-m-d'],
            'valid_until' => ['nullable', 'date_format:Y-m-d', 'after_or_equal:valid_from'],
            'priority'    => ['sometimes', 'integer'],
            'reason'      => ['nullable', 'string', 'max:255'],
        ]);

        $rule = RoomRule::create($data);

        return response()->json($rule, 201);
    }

    public function update(Request $request, RoomRule $roomRule): JsonResponse
    {
        $this->authorizeAdmin($request);

        $data = $request->validate([
            'kind'        => ['sometimes', Rule::in([RoomRule::KIND_AVAILABLE, RoomRule::KIND_UNAVAILABLE])],
            'scope'       => ['sometimes', Rule::in([RoomRule::SCOPE_DAILY, RoomRule::SCOPE_WEEKLY, RoomRule::SCOPE_ONCE])],
            'date'        => ['nullable', 'date_format:Y-m-d'],
            'weekdays'    => ['nullable', 'array'],
            'weekdays.*'  => ['integer', 'min:1', 'max:7'],
            'start_time'  => ['sometimes', 'date_format:H:i'],
            'end_time'    => ['sometimes', 'date_format:H:i', 'after:start_time'],
            'valid_from'  => ['nullable', 'date_format:Y-m-d'],
            'valid_until' => ['nullable', 'date_format:Y-m-d', 'after_or_equal:valid_from'],
            'priority'    => ['sometimes', 'integer'],
            'reason'      => ['nullable', 'string', 'max:255'],
        ]);

        $roomRule->update($data);

        return response()->json($roomRule);
    }

    public function destroy(Request $request, RoomRule $roomRule): JsonResponse
    {
        $this->authorizeAdmin($request);

        $roomRule->delete();

        return response()->json(null, 204);
    }

    private function authorizeAdmin(Request $request): void
    {
        if (! $request->user()->is_admin) {
            abort(403);
        }
    }
}
