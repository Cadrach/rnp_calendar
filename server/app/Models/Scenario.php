<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Scenario extends Model
{
    protected $fillable = ['mj_user_id', 'game_id', 'name', 'description', 'discord_thread_id'];

    public function mj(): BelongsTo
    {
        return $this->belongsTo(User::class, 'mj_user_id');
    }
}
