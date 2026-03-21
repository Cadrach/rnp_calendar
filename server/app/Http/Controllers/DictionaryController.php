<?php

namespace App\Http\Controllers;

use App\Data\DiscordMember;
use App\Data\ScenarioItem;
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
            'discord_guild_id' => config('services.discord.guild_id'),
        ]);
    }

    /**
     * @response array{key: string, id: int|null, mj_user_id: int, game_id: int|null, name: string, description: string|null, discord_thread_id: string|null, created_at: string|null, updated_at: string|null, mj: array{id: int, name: string}|null}[]
     */
    public function scenarii(Request $request): array
    {
        $dbScenarii = Scenario::whereHas('mj')->with('mj')->get();

        $existingThreadIds = $dbScenarii->pluck('discord_thread_id')->filter()->all();

        $scenarii = $dbScenarii->map(fn($s) => ScenarioItem::fromScenario($s));

        $discordId = $request->user()->discord_id;

        $channelId = config('services.discord.propositions_channel_id');
        $proposals = collect();

        // Merge in the list of propositions which have not been created as scenario yet
        if ($channelId && $discordId) {
            $threads = collect($this->discord->getThreads($channelId))
                ->filter(fn($t) => $t['owner_id'] === $discordId)
                ->filter(fn($t) => !in_array($t['id'], $existingThreadIds, true))
                ->values();

            $proposals = $threads->map(fn($thread) => ScenarioItem::fromDiscordThread(
                $thread,
                $request->user()->id,
                null
            ));
        }

        return $scenarii->toBase()->merge($proposals)->sortBy('name')->values()->all();
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
