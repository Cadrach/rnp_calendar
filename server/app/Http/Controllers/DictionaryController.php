<?php

namespace App\Http\Controllers;

use App\Data\DiscordMember;
use App\Models\Game;
use App\Models\Room;
use App\Models\Scenario;
use App\Services\DiscordClient;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;

class DictionaryController extends Controller
{
    public function __construct(private readonly DiscordClient $discord) {}

    public function __invoke(Request $request): JsonResponse
    {
        return response()->json([
            'user'      => $request->user(),
            'games'     => Game::all(),
            'rooms'     => Room::all(),
            'scenarios' => Scenario::all(),
            'members'   => $this->getMembers(),
        ]);
    }

    /** @return DiscordMember[] */
    private function getMembers(): array
    {
        return Cache::remember('discord_members', now()->addHour(), function () {
            return collect($this->discord->getMembers(limit: 1000))
                ->filter(fn($m) => empty($m['user']['bot']))
                ->map(fn($m) => DiscordMember::fromApiResponse($m))
                ->sortBy('username', SORT_NATURAL | SORT_FLAG_CASE)
                ->values()
                ->all();
        });
    }
}
