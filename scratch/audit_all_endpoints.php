<?php

require __DIR__ . '/../vendor/autoload.php';

$app = require_once __DIR__ . '/../bootstrap/app.php';
$consoleKernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$consoleKernel->bootstrap();
$kernel = $app->make(Illuminate\Contracts\Http\Kernel::class);

$routes = [
    // Auth & User
    ['GET', '/api/auth/me'],
    ['GET', '/api/user/profile'],

    // Procurement
    ['GET', '/api/procurement/pr'],
    ['GET', '/api/procurement/po'],
    ['GET', '/api/procurement/master/suppliers'],
    ['GET', '/api/procurement/master/payment-terms'],
    ['GET', '/api/procurement/master/purchase-categories'],
    ['GET', '/api/procurement/master/delivery-terms'],
    ['GET', '/api/procurement/master/additional-costs'],
    ['GET', '/api/procurement/master/pph'],
    ['GET', '/api/procurement/master/countries'],
    ['GET', '/api/procurement/master/rafaksi-types'],
    ['GET', '/api/procurement/master/currencies'],

    // Warehouse
    ['GET', '/api/warehouse/bpb'],
    ['GET', '/api/warehouse/rn'],
    ['GET', '/api/warehouse/reports/stock-card'],
    ['GET', '/api/warehouse/reports/stock-item'],
    ['GET', '/api/warehouse/request-materials'],
    ['GET', '/api/warehouse/master/warehouses'],

    // Exim
    ['GET', '/api/exim/master/units'],
    ['GET', '/api/exim/master/items'],
    ['GET', '/api/exim/master/brands'],
    ['GET', '/api/exim/master/classifications'],
    ['GET', '/api/exim/master/departments'],
    ['GET', '/api/exim/master/sections'],
    ['GET', '/api/exim/master/facilities'],
    ['GET', '/api/exim/master/hs-codes'],
    ['GET', '/api/exim/master/categories'],
    ['GET', '/api/exim/master/styles'],
    ['GET', '/api/exim/master/colours'],
    ['GET', '/api/exim/master/accounts'],
    ['GET', '/api/exim/master/job-numbers'],
    ['GET', '/api/exim/operations/returns'],
    ['GET', '/api/exim/operations/document-histories'],

    // Reporting
    ['GET', '/api/reporting/traceability'],

    // Admin & Governance (BE-01, BE-02, BE-06)
    ['GET', '/api/admin/users'],
    ['GET', '/api/admin/roles'],
    ['GET', '/api/admin/permissions'],
    ['GET', '/api/admin/permission-matrix'],
    ['GET', '/api/admin/audit-logs'],
    ['GET', '/api/admin/approval-histories'],

    // Dashboard Exchange Rates (Active Default)
    ['GET', '/api/dashboard/exchange-rates'],
];

echo "=====================================================" . PHP_EOL;
echo "  GENIUSONE ALL-API ENDPOINT AUDIT & HEALTH CHECK" . PHP_EOL;
echo "=====================================================" . PHP_EOL;

$passed = 0;
$failed = 0;
$errors = [];

foreach ($routes as [$method, $uri]) {
    $request = Illuminate\Http\Request::create($uri, $method);
    $request->headers->set('Accept', 'application/json');
    
    // Simulate SuperAdmin user context
    $user = \App\Models\System\Auth\User::first();
    if ($user) {
        $request->setUserResolver(fn() => $user);
    }

    try {
        $response = $kernel->handle($request);
        $status = $response->getStatusCode();
        
        if ($status >= 200 && $status < 400) {
            echo "[OK $status] $method $uri" . PHP_EOL;
            $passed++;
        } else {
            echo "[FAIL $status] $method $uri" . PHP_EOL;
            $failed++;
            $errors[] = "$method $uri -> HTTP $status: " . substr($response->getContent(), 0, 150);
        }
    } catch (\Throwable $e) {
        echo "[EXCEPTION] $method $uri: " . $e->getMessage() . PHP_EOL;
        $failed++;
        $errors[] = "$method $uri EXCEPTION: " . $e->getMessage();
    }
}

echo PHP_EOL . "=====================================================" . PHP_EOL;
echo "Total tested: " . count($routes) . " | Passed: $passed | Failed: $failed" . PHP_EOL;
if ($failed > 0) {
    echo "Failures details:" . PHP_EOL;
    foreach ($errors as $err) {
        echo "- $err" . PHP_EOL;
    }
} else {
    echo "ALL ENDPOINTS PASSED WITH 100% HEALTH!" . PHP_EOL;
}
echo "=====================================================" . PHP_EOL;
