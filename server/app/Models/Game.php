<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Game extends Model
{
    public $timestamps = false;

    protected $fillable = ['name'];

    public function events(): HasMany
    {
        return $this->hasMany(Event::class);
    }

    public function scenarios(): HasMany
    {
        return $this->hasMany(Scenario::class);
    }

    public function isInUse(): bool
    {
        return $this->events()->exists() || $this->scenarios()->exists();
    }
}
