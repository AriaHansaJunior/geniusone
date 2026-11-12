<?php

require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$controller = app(\App\Http\Controllers\Api\Warehouse\ReceiveNoteApiController::class);

$payload = [
    'rn_number' => 'RN-TEST-' . time(),
    'supliers_id' => 1,
    'currencies_id' => 1,
    'rate' => 1.0,
    'arrival_date' => '2026-11-12',
    'invoice_number' => 'INV-TEST-999',
    'invoice_date' => '2026-11-12',
    'tax_invoice' => '010.000-26.99999999',
    'tax_invoice_date' => '2026-11-12',
    'license_plate' => 'B 9999 ABC',
    'vehicle_type' => 'TRUK BOX',
    'aju_number' => '00004001456220261014009999',
    'no_daftar' => '090999',
    'tanggal_daftar' => '2026-11-12',
    'pl_number' => 'PL-TEST-999',
    'pl_date' => '2026-11-12',
    'sj_number' => 'SJ-TEST-999',
    'sj_date' => '2026-11-12',
    'note' => 'Catatan penting gate receiving dari testing',
    'remark' => 'Catatan penting gate receiving dari testing',
    'items' => [
        [
            'purchase_order_id' => 1,
            'quantity' => 10,
            'price' => 250000,
            'item_name' => 'Steel Plate Grade SS400 10mm',
            'remark' => 'Item remark: batch 1',
        ]
    ]
];

$req = \Illuminate\Http\Request::create('/api/warehouse/rn', 'POST', $payload);
$req->headers->set('Accept', 'application/json');

$res = $controller->store($req);
$created = $res->getData(true);
echo "Store status: " . $res->getStatusCode() . PHP_EOL;
echo "Created RN Number: " . ($created['data']['rn_number'] ?? 'N/A') . PHP_EOL;

$rnNumber = $created['data']['rn_number'];
$showReq = \Illuminate\Http\Request::create("/api/warehouse/rn/{$rnNumber}", 'GET');
$showReq->headers->set('Accept', 'application/json');
$showRes = $controller->show($showReq, $rnNumber);
$showData = $showRes->getData(true)['item'] ?? [];

echo "Verified fields from show API:" . PHP_EOL;
echo "  invoice_number: " . ($showData['invoice_number'] ?? 'MISSING') . PHP_EOL;
echo "  tax_invoice: " . ($showData['tax_invoice'] ?? 'MISSING') . PHP_EOL;
echo "  vehicle_type: " . ($showData['vehicle_type'] ?? 'MISSING') . PHP_EOL;
echo "  license_plate: " . ($showData['license_plate'] ?? 'MISSING') . PHP_EOL;
echo "  aju_number: " . ($showData['aju_number'] ?? 'MISSING') . PHP_EOL;
echo "  no_daftar: " . ($showData['no_daftar'] ?? 'MISSING') . PHP_EOL;
echo "  tanggal_daftar: " . ($showData['tanggal_daftar'] ?? 'MISSING') . PHP_EOL;
echo "  pl_number: " . ($showData['pl_number'] ?? 'MISSING') . PHP_EOL;
echo "  note/remark: " . ($showData['note'] ?? 'MISSING') . PHP_EOL;
if (!empty($showData['items'])) {
    $first = $showData['items'][0];
    echo "  item 1 price: " . ($first['price'] ?? 'MISSING') . PHP_EOL;
    echo "  item 1 quantity: " . ($first['gross_quantity'] ?? 'MISSING') . PHP_EOL;
    echo "  item 1 remark: " . ($first['remark'] ?? 'MISSING') . PHP_EOL;
}

