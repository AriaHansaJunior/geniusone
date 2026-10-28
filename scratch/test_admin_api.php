<?php

use App\Services\Governance\UserManagementService;
use Illuminate\Contracts\Console\Kernel;

require __DIR__.'/../vendor/autoload.php';

$app = require_once __DIR__.'/../bootstrap/app.php';
$kernel = $app->make(Kernel::class);
$kernel->bootstrap();

$service = app(UserManagementService::class);
$users = $service->listUsers([], 20);

echo 'Total users in DB: '.$users->total().PHP_EOL;
foreach ($users->items() as $u) {
    echo "- ID: {$u->id} | {$u->username} ({$u->name}) | Role: {$u->role} | Dept: ".($u->department->name ?? '-').PHP_EOL;
}
