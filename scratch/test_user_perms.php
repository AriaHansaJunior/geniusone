<?php

require __DIR__ . '/../vendor/autoload.php';
$app = require_once __DIR__ . '/../bootstrap/app.php';
$kernel = $app->make(\Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$user = \App\Models\System\Auth\User::where('username', 'procurement_test')->first();
if ($user) {
    echo "User: " . $user->name . " (Role: " . $user->role . ")\n";
    echo "Permissions:\n" . json_encode($user->getAllPermissions(), JSON_PRETTY_PRINT) . "\n";
} else {
    echo "User not found\n";
}
