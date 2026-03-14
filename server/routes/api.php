<?php

use App\Http\Controllers\DiscordController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Route;

Route::post('/login', function (Request $request) {
    $credentials = $request->validate([
        'email'    => ['required', 'email'],
        'password' => ['required'],
    ]);

    if (! Auth::attempt($credentials, $request->boolean('remember'))) {
        return response()->json(['message' => 'Invalid credentials.'], 401);
    }

    $request->session()->regenerate();

    return response()->json(['message' => 'Authenticated.']);
});

Route::post('/logout', function (Request $request) {
    Auth::logout();
    $request->session()->invalidate();
    $request->session()->regenerateToken();

    return response()->json(['message' => 'Logged out.']);
})->middleware('auth');

Route::prefix('discord')->controller(DiscordController::class)->group(function () {
    Route::get('/test', 'test');
    Route::get('/channels', 'channels');
    Route::get('/propositions', 'propositions');
    Route::get('/permissions', 'permissions');
    Route::get('/members', 'members');
});

// Protected routes go here
Route::middleware('auth')->group(function () {
    Route::get('/user', function (Request $request) {
        return $request->user();
    });
});
