<?php

use App\Exceptions\DiscordApiException;
use App\Services\DiscordClient;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->api(append: [
            \Illuminate\Cookie\Middleware\EncryptCookies::class,
            \Illuminate\Cookie\Middleware\AddQueuedCookiesToResponse::class,
            \Illuminate\Session\Middleware\StartSession::class,
            \App\Http\Middleware\GcClosePastEvents::class,
        ]);
        // API-only app: never redirect to a login route, return 401 JSON instead
        $middleware->redirectGuestsTo(fn () => null);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->render(function (AuthenticationException $e) {
            return response()->json(['message' => 'Unauthenticated.'], 401);
        });
        $exceptions->render(function (DiscordApiException $e) {
            return response()->json(['message' => 'Discord API error.', 'error' => $e->getError()], $e->getCode());
        });
    })
    ->booted(function (Application $app): void {
        $app->singleton(DiscordClient::class, fn() => new DiscordClient(
            token:   config('services.discord.token'),
            guildId: config('services.discord.guild_id'),
        ));
    })
    ->create();
