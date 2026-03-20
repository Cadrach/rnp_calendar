<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * @property int         $id
 * @property string      $code       Short code used in Discord thread titles (e.g. "CSb1")
 * @property string      $name       Full display name (e.g. "Centre Social (Salle 1)")
 * @property string|null $url        Optional URL shown as a clickable link in Discord posts
 * @property string      $color      Hex color used on the frontend calendar (e.g. "#06b6d4")
 * @property bool        $unlimited  When true, room has no availability rules — only overlap is checked
 */
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
