<?php

require __DIR__ . '/../vendor/autoload.php';
$app = require_once __DIR__ . '/../bootstrap/app.php';
$kernel = $app->make(\Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use Illuminate\Http\Request;
use App\Http\Controllers\Api\Auth\AuthApiController;

$controller = app(AuthApiController::class);

echo "=== TEST 1: LOGIN AS RIZKY.ADITYA ===\n";
$req = Request::create('/api/auth/login', 'POST', [
    'username' => 'rizky.aditya',
    'password' => 'secret123',
]);
$res = $controller->login($req);
echo "Status: " . $res->getStatusCode() . "\n";
$data = json_decode($res->getContent(), true);
echo "Result: " . json_encode($data['data']['user'], JSON_PRETTY_PRINT) . "\n";
$token = $data['data']['token'];

echo "\n=== TEST 2: CALL /api/auth/me WITH BEARER TOKEN ===\n";
$meReq = Request::create('/api/auth/me', 'GET');
$meReq->headers->set('Authorization', 'Bearer ' . $token);
// Simulate AuthenticateApiRequest middleware
$middleware = new \App\Http\Middleware\AuthenticateApiRequest();
$response = $middleware->handle($meReq, function($r) use ($controller) {
    return $controller->me($r);
});
echo "Status: " . $response->getStatusCode() . "\n";
echo "Me Data: " . $response->getContent() . "\n";

echo "\n=== TEST 3: CALL /api/auth/me WITHOUT TOKEN ===\n";
$unauthReq = Request::create('/api/auth/me', 'GET');
$response2 = $controller->me($unauthReq);
echo "Status: " . $response2->getStatusCode() . "\n";
echo "Response: " . $response2->getContent() . "\n";

echo "\n=== TEST 4: LOGOUT ===\n";
$logoutReq = Request::create('/api/auth/logout', 'POST');
$logoutReq->headers->set('Authorization', 'Bearer ' . $token);
$resLogout = $controller->logout($logoutReq);
echo "Logout Status: " . $resLogout->getStatusCode() . "\n";
echo "Logout Response: " . $resLogout->getContent() . "\n";
