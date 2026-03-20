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
    public function __construct(private readonly DiscordClient $discord)
    {
    }

    public function __invoke(Request $request): JsonResponse
    {
        return response()->json([
            'user' => $request->user(),
            'games' => Game::all(),
            'rooms' => Room::all(),
            'scenarios' => Scenario::all(),
            'members' => $this->getMembers(),
        ]);
    }

    public function scenarii(Request $request): JsonResponse
    {
        $scenarii = Scenario::whereHas('mj')->with('mj')->get();

        $discordId = $request->user()->discord_id;

        $channelId = config('services.discord.propositions_channel_id');
        $proposals = collect();

        if ($channelId && $discordId) {
            $threads = collect($this->discord->getThreads($channelId))
                ->filter(fn($t) => $t['owner_id'] === $discordId)
                ->values();

            $proposals = $threads->map(function ($thread) use ($request) {
                $message = $this->discord->getMessage($thread['id'], $thread['id']);

                return [
                    'id' => null,
                    'mj_user_id' => $request->user()->id,
                    'game_id' => null,
                    'name' => $thread['name'],
                    'description' => $message['content'] ?? null,
                    'discord_thread_id' => $thread['id'],
                    'created_at' => null,
                    'updated_at' => null,
                    'mj' => null,
                ];
            });
        }

        $merged = $scenarii->toBase()->merge($proposals)->sortBy('name')->values();

        return response()->json($merged);
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
