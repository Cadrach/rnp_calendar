<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class RoomRule extends Model
{
    public const KIND_AVAILABLE = 'available';
    public const KIND_UNAVAILABLE = 'unavailable';

    public const SCOPE_DAILY = 'daily';
    public const SCOPE_WEEKLY = 'weekly';
    public const SCOPE_ONCE = 'once';

    protected $fillable = [
        'room_id',
        'kind',
        'scope',
        'date',
        'weekdays',
        'start_time',
        'end_time',
        'valid_from',
        'valid_until',
        'priority',
        'reason',
    ];

    protected $casts = [
        'weekdays'    => 'array',
        'date'        => 'date',
        'valid_from'  => 'date',
        'valid_until' => 'date',
        'priority'    => 'integer',
    ];

    public function room(): BelongsTo
    {
        return $this->belongsTo(Room::class);
    }
}
