<?php

namespace App\Services;

use App\Models\Event;
use Illuminate\Support\Facades\Cache;

/**
 * Resolves displayable URLs for an event's Discord-hosted images.
 *
 * Discord attachment CDN URLs are signed (`?ex=…&is=…&hm=…`) and expire, so they must never be
 * persisted. Re-fetching the forum post's starter message returns freshly signed URLs for all of its
 * attachments at once, which is what this cache holds.
 */
class EventImageUrlResolver
{
    /** Never trust a cached signature right up to its expiry. */
    private const EXPIRY_MARGIN_SECONDS = 300;

    /** Upper bound, in case Discord ever stops sending `ex` or widens the window a lot. */
    private const MAX_TTL_SECONDS = 43200; // 12h

    public function __construct(private readonly DiscordClient $discord)
    {
    }

    /**
     * Signed URL for one attachment, or null if it is no longer on the message
     * (e.g. someone deleted it in Discord by hand).
     */
    public function urlFor(Event $event, string $attachmentId): ?string
    {
        return $this->urlsFor($event)[$attachmentId] ?? null;
    }

    /**
     * Freshly signed URLs for every attachment on the event's starter message, keyed by attachment id.
     *
     * @return array<string, string>
     */
    public function urlsFor(Event $event): array
    {
        if (! $event->discord_thread_id) {
            return [];
        }

        $key = $this->cacheKey($event);

        if (($cached = Cache::get($key)) !== null) {
            return $cached;
        }

        // The starter message id equals the thread id for forum posts.
        $message = $this->discord->getMessage($event->discord_thread_id, $event->discord_thread_id);

        $urls = [];
        foreach ($message['attachments'] ?? [] as $attachment) {
            $urls[(string) $attachment['id']] = $attachment['url'];
        }

        Cache::put($key, $urls, $this->ttlFor($urls));

        return $urls;
    }

    public function forget(Event $event): void
    {
        Cache::forget($this->cacheKey($event));
    }

    private function cacheKey(Event $event): string
    {
        return "event_image_urls:{$event->id}";
    }

    /**
     * Derives the TTL from the signature itself rather than hardcoding Discord's window: `ex` is a
     * hex unix timestamp marking when the URL stops working.
     *
     * @param  array<string, string>  $urls
     */
    private function ttlFor(array $urls): int
    {
        $expiries = [];

        foreach ($urls as $url) {
            parse_str((string) parse_url($url, PHP_URL_QUERY), $query);

            if (isset($query['ex']) && ctype_xdigit((string) $query['ex'])) {
                $expiries[] = hexdec((string) $query['ex']);
            }
        }

        if (empty($expiries)) {
            return self::MAX_TTL_SECONDS;
        }

        $ttl = min($expiries) - time() - self::EXPIRY_MARGIN_SECONDS;

        // A signature already at (or past) its margin is not worth caching.
        return max(0, min($ttl, self::MAX_TTL_SECONDS));
    }
}
