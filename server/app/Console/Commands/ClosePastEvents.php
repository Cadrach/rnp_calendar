<?php

namespace App\Console\Commands;

use App\Services\EventCloser;
use Illuminate\Console\Command;

class ClosePastEvents extends Command
{
    protected $signature   = 'events:close-past';
    protected $description = 'Close all past events and remove their "looking for players" Discord tag';

    public function __construct(private readonly EventCloser $closer)
    {
        parent::__construct();
    }

    public function handle(): int
    {
        $count = $this->closer->closeAll();

        if ($count === 0) {
            $this->info('No past events to close.');
        } else {
            $this->info("Closed {$count} event(s).");
        }

        return self::SUCCESS;
    }
}
