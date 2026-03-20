<?php

use App\Http\Controllers\AuthController;
use App\Http\Controllers\DictionaryController;
use App\Http\Controllers\DiscordController;
use App\Http\Controllers\EventController;
use App\Http\Controllers\RoomController;
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
    Route::get('/dictionary', DictionaryController::class);
    Route::get('/dictionary/scenarii', [DictionaryController::class, 'scenarii']);

    Route::get('rooms/available', [RoomController::class, 'availableRooms']);
    Route::get('rooms/{room}/availability', [RoomController::class, 'availability']);

    Route::apiResource('events', EventController::class);
    Route::post('events/{event}/register', [EventController::class, 'register']);
    Route::post('events/{event}/unregister', [EventController::class, 'unregister']);

    Route::prefix('discord')->controller(DiscordController::class)->group(function () {
        Route::get('/test', 'test');
        Route::get('/channels', 'channels');
        Route::get('/propositions', 'propositions');
        Route::get('/permissions', 'permissions');
        Route::get('/members', 'members');
        Route::get('/roles', 'roles');
    });
});
