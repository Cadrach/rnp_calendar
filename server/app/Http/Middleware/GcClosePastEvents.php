<?php

namespace App\Http\Middleware;

use App\Services\EventCloser;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;

class GcClosePastEvents
{
    const CACHE_KEY = 'events:gc_last_run_date';

    public function __construct(private readonly EventCloser $closer) {}

    public function handle(Request $request, Closure $next): mixed
    {
        $today = now(config('app.club_timezone'))->toDateString();

        if (Cache::get(self::CACHE_KEY) !== $today) {
            Cache::put(self::CACHE_KEY, $today, now()->endOfDay());
            $this->closer->closeAll();
        }

        return $next($request);
    }
}
