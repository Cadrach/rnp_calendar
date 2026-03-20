<?php

namespace App\Http\Controllers;

use App\Models\Room;
use App\Services\Availability\AvailabilityResolver;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class RoomController extends Controller
{
    public function __construct(private readonly AvailabilityResolver $resolver)
    {
    }

    /**
     * Returns the effective available intervals for a room over the requested date range.
     *
     * Query params:
     *   - start: Y-m-d  (required) — first day of the range, inclusive
     *   - end:   Y-m-d  (required) — last day of the range, inclusive
     *
     * Response shape mirrors react-big-calendar's event object so the frontend can feed
     * the `intervals` array directly into the `backgroundEvents` prop after mapping
     * each entry's `start`/`end` strings through `new Date()`.
     *
     * For unlimited rooms the entire requested range is returned as a single interval,
     * since no booking restriction applies.
     */
    public function availability(Request $request, Room $room): JsonResponse
    {
        $request->validate([
            'start' => ['required', 'date_format:Y-m-d'],
            'end'   => ['required', 'date_format:Y-m-d', 'after_or_equal:start'],
        ]);

        $rangeStart = Carbon::parse($request->input('start'))->startOfDay();
        $rangeEnd   = Carbon::parse($request->input('end'))->startOfDay();

        if ($room->unlimited) {
            $intervals = [[
                'start' => $rangeStart->toDateTimeString(),
                'end'   => $rangeEnd->endOfDay()->toDateTimeString(),
            ]];
        } else {
            $effective = $this->resolver->resolve($room, $rangeStart, $rangeEnd);

            $intervals = array_map(fn ($interval) => [
                'start' => $interval->start->toDateTimeString(),
                'end'   => $interval->end->toDateTimeString(),
            ], $effective);
        }

        return response()->json([
            'room_id'   => $room->id,
            'start'     => $request->input('start'),
            'end'       => $request->input('end'),
            'intervals' => $intervals,
        ]);
    }
}
