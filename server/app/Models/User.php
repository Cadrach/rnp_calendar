<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Foundation\Auth\User as Authenticatable;

class User extends Authenticatable
{
    protected $fillable = [
        'discord_id',
        'name',
        'roles',
    ];

    protected $hidden = [
        'remember_token',
    ];

    protected $casts = [
        'roles' => 'array',
    ];

    protected $appends = ['is_mj'];

    protected function isMj(): Attribute
    {
        return Attribute::get(function () {
            $mjRoleId = (int) config('services.discord.role_id_mj');
            return in_array($mjRoleId, $this->roles ?? [], strict: true);
        });
    }
}
