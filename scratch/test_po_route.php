<?php
require __DIR__ . '/../vendor/autoload.php';
$app = require_once __DIR__ . '/../bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$testCodes = [
    'POL-1026-0001',
    'POL%2F1026%2F0001',
    '1',
    'po-1'
];

foreach ($testCodes as $c) {
    $request = \Illuminate\Http\Request::create("/api/po/{$c}", 'GET', [], [], [], [
        'HTTP_ACCEPT' => 'application/json'
    ]);
    $response = $app->handle($request);
    $status = $response->getStatusCode();
    echo "GET /api/po/{$c} => Status: {$status}\n";
    if ($status === 200) {
        $json = json_decode($response->getContent(), true);
        $items = $json['item']['items'] ?? [];
        foreach ($items as $it) {
            echo "   Line item: item='{$it['item']}', itemAlias='{$it['itemAlias']}'\n";
        }
    }
}

