<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * An image attached to the event's Discord forum post.
 *
 * Discord is the only store: we keep the attachment's identity, never its URL. Attachment CDN URLs
 * are signed and expire after 24h, so the displayable URL is resolved on demand by
 * EventImageUrlResolver and served behind the stable /api/images/{slug} route.
 *
 * @property int         $id
 * @property int         $event_id
 * @property string      $slug                   Opaque public handle used by the display route
 * @property string      $discord_message_id     Starter message of the forum post (== thread id)
 * @property string      $discord_attachment_id
 * @property string      $filename
 * @property string|null $content_type
 * @property int|null    $size
 * @property int|null    $width
 * @property int|null    $height
 * @property int         $position
 */
class EventImage extends Model
{
    protected $fillable = [
        'event_id',
        'slug',
        'discord_message_id',
        'discord_attachment_id',
        'filename',
        'content_type',
        'size',
        'width',
        'height',
        'position',
    ];

    protected $casts = [
        'size'     => 'integer',
        'width'    => 'integer',
        'height'   => 'integer',
        'position' => 'integer',
    ];

    protected $appends = ['url'];

    // Discord ids are internal plumbing; the client only ever needs the slug and the url.
    protected $hidden = ['discord_message_id', 'discord_attachment_id'];

    public function event(): BelongsTo
    {
        return $this->belongsTo(Event::class);
    }

    /**
     * Stable absolute URL the frontend can drop straight into an <img>, mirroring how
     * DiscordMember::$avatar is already served as a ready-made absolute URL.
     */
    protected function url(): Attribute
    {
        return Attribute::get(fn () => url("/api/images/{$this->slug}"));
    }
}
