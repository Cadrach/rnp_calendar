<?php

namespace App\Console\Commands;

use App\Services\DiscordClient;
use Illuminate\Console\Command;

class SetupDiscordServer extends Command
{
    protected $signature = 'discord:setup';
    protected $description = 'Set up the Discord server channels and roles for a demo environment';

    // Discord channel type 15 = GUILD_FORUM (threads-only)
    private const FORUM_CHANNEL_TYPE = 15;

    private const TAG_LOOKING_FOR_PLAYERS = 'Inscription ouverte';

    private const CHANNELS = [
        'DISCORD_CHANNEL_ID_PROPOSITIONS' => 'Propositions',
        'DISCORD_CHANNEL_ID_SEANCES' => 'Séances',
    ];

    private const ROLES = [
        'DISCORD_ROLE_ID_MJ' => 'Maîtres du Jeu',
        'DISCORD_ROLE_ID_ADMIN' => 'Admin',
    ];

    public function __construct(private readonly DiscordClient $discord)
    {
        parent::__construct();
    }

    public function handle(): int
    {
        $this->info('=== Discord Server Setup ===');

        $guild = $this->discord->getGuild();
        $this->newLine();
        $this->line("  Server: <options=bold>{$guild['name']}</> (ID: {$guild['id']})");
        $this->newLine();

        if (!$this->confirm('Proceed with setup on this server?')) {
            $this->info('Aborted.');

            return self::SUCCESS;
        }

        $channelIds = $this->setupChannels();
        $this->setupRoles();
        $this->setupPropositionTags($channelIds['DISCORD_CHANNEL_ID_SEANCES']);

        $this->newLine();
        $this->info('Setup complete.');

        return self::SUCCESS;
    }

    private function setupChannels(): array
    {
        $this->newLine();
        $this->info('--- Channels ---');

        $existing = collect($this->discord->getChannels())
            ->keyBy(fn($c) => strtolower($c['name']));

        $ids = [];

        foreach (self::CHANNELS as $envKey => $name) {
            $match = $existing->first(
                fn($c) => strtolower($c['name']) === strtolower($name)
            );

            if ($match) {
                $this->line("  <comment>Found</comment>  #{$name} → {$match['id']}");
                $this->writeEnv($envKey, $match['id']);
                $ids[$envKey] = $match['id'];
            } else {
                $channel = $this->discord->createChannel([
                    'name' => $name,
                    'type' => self::FORUM_CHANNEL_TYPE,
                ]);
                $this->line("  <info>Created</info> #{$name} → {$channel['id']}");
                $this->writeEnv($envKey, $channel['id']);
                $ids[$envKey] = $channel['id'];
            }
        }

        return $ids;
    }

    private function setupPropositionTags(string $channelId): void
    {
        $this->newLine();
        $this->info('--- Forum Tags (Propositions) ---');

        $channel = $this->discord->getChannel($channelId);
        $existingTags = $channel['available_tags'] ?? [];

        $tag = collect($existingTags)->first(
            fn($t) => strtolower($t['name']) === strtolower(self::TAG_LOOKING_FOR_PLAYERS)
        );

        if ($tag) {
            $this->line("  <comment>Found</comment>  \"" . self::TAG_LOOKING_FOR_PLAYERS . "\" → {$tag['id']}");
            $this->writeEnv('DISCORD_TAG_ID_LOOKING_FOR_PLAYERS', $tag['id']);
        } else {
            $updated = $this->discord->patchChannel($channelId, [
                'available_tags' => [
                    ...$existingTags,
                    ['name' => self::TAG_LOOKING_FOR_PLAYERS, 'moderated' => false],
                ],
            ]);

            $newTag = collect($updated['available_tags'] ?? [])->first(
                fn($t) => strtolower($t['name']) === strtolower(self::TAG_LOOKING_FOR_PLAYERS)
            );

            $this->line("  <info>Created</info>  \"" . self::TAG_LOOKING_FOR_PLAYERS . "\" → {$newTag['id']}");
            $this->writeEnv('DISCORD_TAG_ID_LOOKING_FOR_PLAYERS', $newTag['id']);
        }
    }

    private function setupRoles(): void
    {
        $this->newLine();
        $this->info('--- Roles ---');

        $existing = collect($this->discord->getGuildRoles())
            ->keyBy(fn($r) => strtolower($r['name']));

        foreach (self::ROLES as $envKey => $name) {
            $match = $existing->first(
                fn($r) => strtolower($r['name']) === strtolower($name)
            );

            if ($match) {
                $this->line("  <comment>Found</comment>  @{$name} → {$match['id']}");
                $this->writeEnv($envKey, $match['id']);
            } else {
                $role = $this->discord->createRole(['name' => $name]);
                $this->line("  <info>Created</info> @{$name} → {$role['id']}");
                $this->writeEnv($envKey, $role['id']);
            }
        }
    }

    private function writeEnv(string $key, string $value): void
    {
        $path = base_path('.env');
        $content = file_get_contents($path);
        $line = "{$key}={$value}";

        if (preg_match("/^{$key}=.*/m", $content)) {
            $content = preg_replace("/^{$key}=.*/m", $line, $content);
        } else {
            $content .= PHP_EOL . $line;
        }

        file_put_contents($path, $content);
    }
}
