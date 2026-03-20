<?php

namespace App\Data;

use App\Models\Scenario;
use App\Models\User;

class ScenarioItem
{
    public function __construct(
        public readonly string $key,
        public readonly ?int $id,
        public readonly int $mj_user_id,
        public readonly ?int $game_id,
        public readonly string $name,
        public readonly ?string $description,
        public readonly ?string $discord_thread_id,
        public readonly ?string $created_at,
        public readonly ?string $updated_at,
        public readonly ?User $mj,
    ) {
    }

    public static function fromScenario(Scenario $scenario): self
    {
        return new self(
            key: 'id:' . $scenario->id,
            id: $scenario->id,
            mj_user_id: $scenario->mj_user_id,
            game_id: $scenario->game_id,
            name: $scenario->name,
            description: $scenario->description,
            discord_thread_id: null,
            created_at: $scenario->created_at?->toISOString(),
            updated_at: $scenario->updated_at?->toISOString(),
            mj: $scenario->mj,
        );
    }

    public static function fromDiscordThread(array $thread, int $userId, ?string $content): self
    {
        return new self(
            key: 'discord:' . $thread['id'],
            id: null,
            mj_user_id: $userId,
            game_id: null,
            name: $thread['name'],
            description: $content,
            discord_thread_id: $thread['id'],
            created_at: null,
            updated_at: null,
            mj: null,
        );
    }
}
