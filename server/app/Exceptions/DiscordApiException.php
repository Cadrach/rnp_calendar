<?php

namespace App\Exceptions;

use RuntimeException;

class DiscordApiException extends RuntimeException
{
    public function __construct(private readonly array $error, int $status)
    {
        parent::__construct('Discord API error', $status);
    }

    public function getError(): array
    {
        return $this->error;
    }
}
