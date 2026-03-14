<?php

namespace App\Http\Controllers;

use App\Services\DiscordClient;
use Illuminate\Http\JsonResponse;

class DiscordController extends Controller
{
    public function __construct(private readonly DiscordClient $discord) {}

    public function test(): JsonResponse
    {
        return response()->json(['message' => 'Hello World']);
    }

    public function channels(): JsonResponse
    {
        return response()->json($this->discord->getChannels());
    }

    public function members(): JsonResponse
    {
        return response()->json($this->discord->getMembers());
    }

    public function threads(string $channelId): JsonResponse
    {
        return response()->json($this->discord->getThreads($channelId));
    }

    public function propositions(): JsonResponse
    {
        return response()->json($this->discord->getThreads(config('services.discord.propositions_channel_id')));
    }

    public function permissions(): JsonResponse
    {
        return response()->json($this->discord->getBotPermissions());
    }
}
