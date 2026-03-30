<?php

use App\Http\Controllers\AuthController;
use App\Http\Controllers\DictionaryController;
use App\Http\Controllers\DiscordController;
use App\Http\Controllers\EventController;
use App\Http\Controllers\GameController;
use App\Http\Controllers\ScenarioController;
use App\Http\Controllers\RoomController;
use App\Http\Controllers\RoomCrudController;
use App\Http\Controllers\RoomRuleController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Route;

// TODO: remove this route after use — unauthenticated cache/config flush + diagnostics
Route::get('/artisan-clear', function () {
    Artisan::call('config:clear');
    Artisan::call('cache:clear');
    Artisan::call('route:clear');
    Artisan::call('view:clear');

    $prefix = \Illuminate\Support\Facades\DB::getTablePrefix();

    // Test cache write/read
    $cacheOk = false;
    $cacheError = null;
    try {
        \Illuminate\Support\Facades\Cache::put('_diag_test', 'ok', 10);
        $cacheOk = \Illuminate\Support\Facades\Cache::get('_diag_test') === 'ok';
    } catch (\Throwable $e) {
        $cacheError = $e->getMessage();
    }

    // Check which tables exist
    $tables = \Illuminate\Support\Facades\DB::select('SHOW TABLES');
    $tableList = array_map(fn($t) => array_values((array) $t)[0], $tables);

    return response()->json([
        'message'          => 'Cleared.',
        'db_prefix_env'    => env('DB_PREFIX'),
        'db_prefix_config' => config('database.connections.mysql.prefix'),
        'db_prefix_live'   => $prefix,
        'cache_write_ok'   => $cacheOk,
        'cache_error'      => $cacheError,
        'tables'           => $tableList,
        'app_url'          => config('app.url'),
        'verify_link'      => url('/api/auth/discord/verify?token=TEST'),
    ]);
});

Route::prefix('auth')->group(function () {
    Route::controller(AuthController::class)->group(function () {
        Route::post('/discord/request', 'discordRequest');
        Route::post('/discord/verify', 'discordVerify');
    });

    // GET redirect: DM link lands here, bounces to the frontend verify page
    // (Discord prefetch hits this GET safely — it just gets an HTML redirect, not a token consume)
    Route::get('/discord/verify', function (Request $request) {
        $token       = $request->query('token', '');
        $frontendUrl = rtrim(config('app.frontend_url'), '/');
        return redirect("{$frontendUrl}/auth/verify?token={$token}");
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
    Route::get('rooms/{room}/free-slots', [RoomController::class, 'freeSlots']);
    Route::apiResource('rooms', RoomCrudController::class);

    Route::apiResource('room-rules', RoomRuleController::class);
    Route::apiResource('games', GameController::class);
    Route::apiResource('scenarios', ScenarioController::class);

    Route::apiResource('events', EventController::class);
    Route::post('events/{event}/register', [EventController::class, 'register']);
    Route::post('events/{event}/unregister', [EventController::class, 'unregister']);
    Route::get('events-discord-summary', [EventController::class, 'discordSummary']);

    Route::prefix('discord')->controller(DiscordController::class)->group(function () {
        Route::get('/test', 'test');
        Route::get('/channels', 'channels');
        Route::get('/propositions', 'propositions');
        Route::get('/permissions', 'permissions');
        Route::get('/members', 'members');
        Route::get('/roles', 'roles');
    });
});
