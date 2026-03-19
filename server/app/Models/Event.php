<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Event extends Model
{
    protected $fillable = [
        'title',
        'datetime_start',
        'datetime_end',
        'mj_user_id',
        'room_id',
        'game_id',
        'scenario_id',
        'min_players',
        'max_players',
    ];

    protected $casts = [
        'datetime_start' => 'datetime',
        'datetime_end'   => 'datetime',
    ];
}
