<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Scenario extends Model
{
    protected $fillable = ['mj_user_id', 'game_id', 'name', 'description'];
}
