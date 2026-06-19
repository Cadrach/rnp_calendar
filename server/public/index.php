<?php

use Illuminate\Foundation\Application;
use Illuminate\Http\Request;

define('LARAVEL_START', microtime(true));

// When the public folder lives outside the app tree, place a _basepath.php file next to
// this index.php. It must define APP_PUBLIC_DIR and return the absolute app root path.
$basePath = file_exists(__DIR__.'/_basepath.php')
    ? require __DIR__.'/_basepath.php'
    : realpath(__DIR__.'/../');

// Determine if the application is in maintenance mode...
if (file_exists($maintenance = $basePath.'/storage/framework/maintenance.php')) {
    require $maintenance;
}

// Register the Composer autoloader...
require $basePath.'/vendor/autoload.php';

// Bootstrap Laravel and handle the request...
/** @var Application $app */
$app = require_once $basePath.'/bootstrap/app.php';

$app->handleRequest(Request::capture());
