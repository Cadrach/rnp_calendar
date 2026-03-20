<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Room extends Model
{
    public $timestamps = false;

    protected $casts = [
        'unlimited' => 'boolean',
    ];

    public function rules(): HasMany
    {
        return $this->hasMany(RoomRule::class);
    }
}
