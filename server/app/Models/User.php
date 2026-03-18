<?php

namespace App\Models;

use Illuminate\Foundation\Auth\User as Authenticatable;

class User extends Authenticatable
{
    protected $fillable = [
        'discord_id',
        'name',
    ];

    protected $hidden = [
        'remember_token',
    ];
}
