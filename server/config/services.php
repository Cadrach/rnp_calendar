<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Third Party Services
    |--------------------------------------------------------------------------
    |
    | This file is for storing the credentials for third party services such
    | as Mailgun, Postmark, AWS and more. This file provides the de facto
    | location for this type of information, allowing packages to have
    | a conventional file to locate the various service credentials.
    |
    */

    'postmark' => [
        'key' => env('POSTMARK_API_KEY'),
    ],

    'resend' => [
        'key' => env('RESEND_API_KEY'),
    ],

    'ses' => [
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

    'discord' => [
        'token'                   => env('DISCORD_BOT_TOKEN'),
        'guild_id'                => env('DISCORD_GUILD_ID'),
        'propositions_channel_id' => env('DISCORD_CHANNEL_ID_PROPOSITIONS'),
        'channel_seances'         => env('DISCORD_CHANNEL_ID_SEANCES'),
        'role_id_mj'              => env('DISCORD_ROLE_ID_MJ'),
        'role_id_admin'           => env('DISCORD_ROLE_ID_ADMIN'),
    ],

    'slack' => [
        'notifications' => [
            'bot_user_oauth_token' => env('SLACK_BOT_USER_OAUTH_TOKEN'),
            'channel' => env('SLACK_BOT_USER_DEFAULT_CHANNEL'),
        ],
    ],

];
