<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Event extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'datetime_start',
        'datetime_end',
        'mj_discord_id',
        'room_id',
        'game_id',
        'scenario_id',
        'min_players',
        'max_players',
        'player_ids',
        'discord_thread_id',
        'is_closed',
        'description',
    ];

    // EventShowModal reads events out of the cached index query before falling back to show,
    // so images have to be present on every return path or the detail view misses them.
    protected $with = ['images'];

    protected $casts = [
        'datetime_start' => 'datetime',
        'datetime_end'   => 'datetime',
        'player_ids'     => 'array',
        'is_closed'      => 'boolean',
    ];

    public function room(): BelongsTo
    {
        return $this->belongsTo(Room::class);
    }

    public function game(): BelongsTo
    {
        return $this->belongsTo(Game::class);
    }

    public function scenario(): BelongsTo
    {
        return $this->belongsTo(Scenario::class);
    }

    public function images(): HasMany
    {
        return $this->hasMany(EventImage::class)->orderBy('position')->orderBy('id');
    }
}
