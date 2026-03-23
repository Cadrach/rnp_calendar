<?php

namespace App\Data;

class DiscordMember
{
    public function __construct(
        public readonly string  $id,
        public readonly string  $username,
        public readonly ?string $avatar,
        public readonly bool    $is_mj,
        public readonly bool    $is_admin,
    ) {
    }

    public static function fromApiResponse(array $member): self
    {
        $user  = $member['user'];
        $roles = $member['roles'] ?? [];

        $mjRoleId    = config('services.discord.role_id_mj');
        $adminRoleId = config('services.discord.role_id_admin');

        return new self(
            id:       $user['id'],
            username: $user['global_name'] ?? $user['username'],
            avatar:   isset($user['avatar'])
                ? "https://cdn.discordapp.com/avatars/{$user['id']}/{$user['avatar']}.png"
                : null,
            is_mj:    $mjRoleId && in_array($mjRoleId, $roles),
            is_admin: $adminRoleId && in_array($adminRoleId, $roles),
        );
    }
}
