<?php

use App\Http\Controllers\AuthController;
use App\Http\Controllers\DiscordController;
use App\Http\Controllers\EventController;
use App\Models\Game;
use App\Models\Room;
use App\Models\Scenario;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Route;

Route::prefix('auth')->group(function () {
    Route::controller(AuthController::class)->group(function () {
        Route::post('/discord/request', 'discordRequest');
        Route::get('/discord/verify', 'discordVerify');
    });

    Route::post('/logout', function (Request $request) {
        Auth::logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return response()->json(['message' => 'Logged out.']);
    })->middleware('auth');
});



// Protected routes go here
Route::middleware('auth')->group(function () {
    Route::get('/dictionary', function (Request $request) {
        return response()->json([
            'user'      => $request->user(),
            'games'     => Game::all(),
            'rooms'     => Room::all(),
            'scenarios' => Scenario::all(),
        ]);
    });

    Route::apiResource('events', EventController::class);

    Route::prefix('discord')->controller(DiscordController::class)->group(function () {
        Route::get('/test', 'test');
        Route::get('/channels', 'channels');
        Route::get('/propositions', 'propositions');
        Route::get('/permissions', 'permissions');
        Route::get('/members', 'members');
        Route::get('/roles', 'roles');
    });
});
