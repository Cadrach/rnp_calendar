<?php

namespace App\Data;

class DiscordMember
{
    public function __construct(
        public readonly string $id,
        public readonly string $username,
        public readonly ?string $avatar,
    ) {}

    public static function fromApiResponse(array $member): self
    {
        $user = $member['user'];

        return new self(
            id:       $user['id'],
            username: $user['global_name'] ?? $user['username'],
            avatar:   isset($user['avatar'])
                ? "https://cdn.discordapp.com/avatars/{$user['id']}/{$user['avatar']}.png"
                : null,
        );
    }
}
