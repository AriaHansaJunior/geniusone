<?php

require __DIR__.'/../vendor/autoload.php';
$app = require_once __DIR__.'/../bootstrap/app.php';
$kernel = $app->make(Kernel::class);
$kernel->bootstrap();

use App\Http\Controllers\Api\Auth\AuthApiController;
use Illuminate\Contracts\Console\Kernel;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

$controller = app(AuthApiController::class);

echo "\n=== TEST 5: CALL /api/auth/me IN FRESH REQUEST (UNAUTHENTICATED) ===\n";
Auth::logout();
$freshReq = Request::create('/api/auth/me', 'GET');
$resFresh = $controller->me($freshReq);
echo 'Status: '.$resFresh->getStatusCode()."\n";
echo 'Response: '.$resFresh->getContent()."\n";
