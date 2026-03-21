<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Scenario extends Model
{
    protected $fillable = ['mj_user_id', 'game_id', 'name', 'description', 'discord_thread_id'];

    public function mj(): BelongsTo
    {
        return $this->belongsTo(User::class, 'mj_user_id');
    }

    public function events(): HasMany
    {
        return $this->hasMany(Event::class);
    }

    public function isInUse(): bool
    {
        return $this->events()->exists();
    }
}
