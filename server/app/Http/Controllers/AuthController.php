<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Services\DiscordClient;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Str;

class AuthController extends Controller
{
    public function __construct(private readonly DiscordClient $discord) {}

    public function discordRequest(Request $request): JsonResponse
    {
        $request->validate(['username' => ['required', 'string']]);

        $members = $this->discord->searchMembers($request->username);

        $search = strtolower($request->username);

        $member = collect($members)->first(function ($m) use ($search) {
            $user = $m['user'];
            return strtolower($user['username']) === $search
                || strtolower($user['global_name'] ?? '') === $search;
        });

        if ($member) {
            $token = Str::random(64);

            Cache::put("discord_auth:{$token}", $member['user']['id'], now()->addMinutes(15));

            $link = url("/api/auth/discord/verify?token={$token}");

            $dm = $this->discord->createDmChannel($member['user']['id']);
            $this->discord->sendMessage($dm['id'], "Click the link below to log in:\n{$link}");
        }

        // Always return the same response to prevent username enumeration
        return response()->json(['message' => 'If that username exists in the server, a login link has been sent via DM.']);
    }

    public function discordVerify(Request $request): JsonResponse|\Illuminate\Http\RedirectResponse
    {
        $request->validate(['token' => ['required', 'string']]);

        $discordUserId = Cache::pull("discord_auth:{$request->token}");

        if (! $discordUserId) {
            return response()->json(['message' => 'Invalid or expired token.'], 401);
        }

        $member      = $this->discord->getGuildMember($discordUserId);
        $discordUser = $member['user'];

        $user = User::firstOrCreate(
            ['discord_id' => $discordUserId],
            ['name' => $discordUser['global_name'] ?? $discordUser['username']],
        );

        $user->update([
            'name'  => $discordUser['global_name'] ?? $discordUser['username'],
            'roles' => array_map('intval', $member['roles'] ?? []),
        ]);

        Auth::login($user);
        $request->session()->regenerate();

        return redirect(config('app.frontend_url'));
    }
}
