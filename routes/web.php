<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\PurchaseRequisitionController;
use App\Http\Controllers\PurchaseOrderController;
use App\Http\Controllers\ReportController;
use App\Http\Controllers\WarehouseController;

/*
|--------------------------------------------------------------------------
| Web Routes
|--------------------------------------------------------------------------
|
| Controllers serve both the Web Page views and dual-mode JSON API responses.
| The 4 connected modules:
| 1. Purchase Requisition (PR)
| 2. Purchase Order (PO)
| 3. Combined PR-PO Traceability Report
| 4. Warehouse Receive Material (BPB)
|
*/

// Default route -> Dashboard
Route::get('/', function () {
    return view('app', ['page' => 'dashboard']);
})->name('home');

Route::get('/dashboard', function () {
    return view('app', ['page' => 'dashboard']);
})->name('dashboard');

// Dashboard - Master Notifikasi Buffer Stok
Route::get('/dashboard/stock-notification-master', fn() => view('app', ['page' => 'stock-notification-master']))->name('dashboard.stock-notification');
Route::get('/dashboard/stock-notification-master/create', fn() => view('app', ['page' => 'stock-notification-create']))->name('dashboard.stock-notification.create');
Route::get('/dashboard/stock-notification-master/add', fn() => view('app', ['page' => 'stock-notification-create']));
Route::get('/dashboard/notification-master', fn() => redirect('/dashboard/stock-notification-master'));

// Purchase Requisition (PR)
Route::get('/pr', [PurchaseRequisitionController::class, 'index'])->name('pr.index');
Route::get('/purchase-requisitions', [PurchaseRequisitionController::class, 'index'])->name('purchase-requisitions.index');
Route::get('/purchase-requests', fn() => redirect('/pr'));
Route::get('/procurement/transactions/purchase-requisition', [PurchaseRequisitionController::class, 'index'])->name('procurement.transactions.pr');

Route::get('/pr/create', fn() => view('app', ['page' => 'pr-create']))->name('pr.create');
Route::get('/pr/add', fn() => view('app', ['page' => 'pr-create']));
Route::get('/purchase-requisition/create', fn() => view('app', ['page' => 'pr-create']));
Route::get('/purchase-requisitions/create', fn() => view('app', ['page' => 'pr-create']));
Route::get('/procurement/transactions/purchase-requisition/create', fn() => view('app', ['page' => 'pr-create']))->name('procurement.transactions.pr.create');
Route::get('/procurement/transactions/purchase-requisition/add', fn() => view('app', ['page' => 'pr-create']));

Route::get('/pr/detail/{code}', [PurchaseRequisitionController::class, 'show'])->name('pr.detail');
Route::get('/pr/details/{code}', [PurchaseRequisitionController::class, 'show']);
Route::get('/purchase-requisition/detail/{code}', [PurchaseRequisitionController::class, 'show']);
Route::get('/purchase-requisitions/detail/{code}', [PurchaseRequisitionController::class, 'show']);
Route::get('/procurement/transactions/purchase-requisition/detail/{code}', [PurchaseRequisitionController::class, 'show']);
Route::get('/procurement/transactions/purchase-requisition/details/{code}', [PurchaseRequisitionController::class, 'show']);

// Purchase Order (PO)
Route::get('/po', [PurchaseOrderController::class, 'index'])->name('po.index');
Route::get('/purchase-orders', [PurchaseOrderController::class, 'index'])->name('purchase-orders.index');
Route::get('/procurement/transactions/purchase-order', [PurchaseOrderController::class, 'index'])->name('procurement.transactions.po');

Route::get('/po/create', fn() => view('app', ['page' => 'po-create']))->name('po.create');
Route::get('/po/add', fn() => view('app', ['page' => 'po-create']));
Route::get('/purchase-order/create', fn() => view('app', ['page' => 'po-create']));
Route::get('/purchase-orders/create', fn() => view('app', ['page' => 'po-create']));
Route::get('/procurement/transactions/purchase-order/create', fn() => view('app', ['page' => 'po-create']))->name('procurement.transactions.po.create');
Route::get('/procurement/transactions/purchase-order/add', fn() => view('app', ['page' => 'po-create']));

Route::get('/po/detail/{code}', [PurchaseOrderController::class, 'show'])->name('po.detail');
Route::get('/po/details/{code}', [PurchaseOrderController::class, 'show']);
Route::get('/procurement/transactions/purchase-order/detail/{code}', [PurchaseOrderController::class, 'show']);
Route::get('/procurement/transactions/purchase-order/details/{code}', [PurchaseOrderController::class, 'show']);

// Combined PR-PO Report
Route::get('/report', [ReportController::class, 'index'])->name('report.index');
Route::get('/pr-po-report', [ReportController::class, 'index'])->name('pr-po-report.index');
Route::get('/procurement/reports/report-pr-po', [ReportController::class, 'index'])->name('procurement.reports.report-pr-po');

Route::get('/report/detail/{code}', [ReportController::class, 'show'])->name('report.detail');
Route::get('/report/details/{code}', [ReportController::class, 'show']);
Route::get('/procurement/reports/report-pr-po/detail/{code}', [ReportController::class, 'show']);
Route::get('/procurement/reports/report-pr-po/details/{code}', [ReportController::class, 'show']);

// Warehouse / BPB (Short & Hierarchical)
Route::get('/warehouse', [WarehouseController::class, 'index'])->name('warehouse.index');
Route::get('/warehouse/bpb', [WarehouseController::class, 'index'])->name('warehouse.bpb.index');
Route::get('/warehouse/incoming/receive-material-bpb', [WarehouseController::class, 'index'])->name('warehouse.incoming.bpb');
Route::get('/warehouse/incoming/receiving-material-bpb', [WarehouseController::class, 'index']);
Route::get('/warehouse/incoming/receive-material', [WarehouseController::class, 'index']);
Route::get('/warehouse/incoming/receiving material (bpb)', fn() => redirect('/warehouse/incoming/receive-material-bpb'));
Route::get('/warehouse/incoming/receive material (bpb)', fn() => redirect('/warehouse/incoming/receive-material-bpb'));

Route::get('/warehouse/create', fn() => view('app', ['page' => 'warehouse-create']))->name('warehouse.create');
Route::get('/warehouse/add', fn() => view('app', ['page' => 'warehouse-create']));
Route::get('/warehouse/incoming/receive-material-bpb/create', fn() => view('app', ['page' => 'warehouse-create']));
Route::get('/warehouse/incoming/receive-material-bpb/add', fn() => view('app', ['page' => 'warehouse-create']));
Route::post('/warehouse/create', [WarehouseController::class, 'store']);
Route::post('/warehouse/store', [WarehouseController::class, 'store']);
Route::post('/warehouse/incoming/receive-material-bpb/create', [WarehouseController::class, 'store']);

Route::get('/warehouse/detail/{code}', [WarehouseController::class, 'show'])->name('warehouse.detail');
Route::get('/warehouse/details/{code}', [WarehouseController::class, 'show']);
Route::get('/warehouse/incoming/receive-material-bpb/detail/{code}', [WarehouseController::class, 'show']);
Route::get('/warehouse/incoming/receive-material-bpb/details/{code}', [WarehouseController::class, 'show']);

// Procurement - Purchase Master Routes
Route::get('/procurement/supplier', fn() => view('app', ['page' => 'supplier']))->name('procurement.supplier');
Route::get('/procurement/purchase-master/supplier', fn() => view('app', ['page' => 'supplier']));
Route::get('/procurement/supplier/create', fn() => view('app', ['page' => 'supplier-create']))->name('procurement.supplier.create');
Route::get('/procurement/supplier/add', fn() => view('app', ['page' => 'supplier-create']));
Route::get('/procurement/purchase-master/supplier/create', fn() => view('app', ['page' => 'supplier-create']));
Route::get('/procurement/purchase-master/supplier/add', fn() => view('app', ['page' => 'supplier-create']));

Route::get('/procurement/payment-term', fn() => view('app', ['page' => 'payment-term']))->name('procurement.payment-term');
Route::get('/procurement/purchase-master/payment-term', fn() => view('app', ['page' => 'payment-term']));
Route::get('/procurement/payment-term/create', fn() => view('app', ['page' => 'payment-term-create']))->name('procurement.payment-term.create');
Route::get('/procurement/payment-term/add', fn() => view('app', ['page' => 'payment-term-create']));
Route::get('/procurement/purchase-master/payment-term/create', fn() => view('app', ['page' => 'payment-term-create']));
Route::get('/procurement/purchase-master/payment-term/add', fn() => view('app', ['page' => 'payment-term-create']));

Route::get('/procurement/purchase-category', fn() => view('app', ['page' => 'purchase-category']))->name('procurement.purchase-category');
Route::get('/procurement/purchase-master/purchase-category', fn() => view('app', ['page' => 'purchase-category']));
Route::get('/procurement/purchase-category/create', fn() => view('app', ['page' => 'purchase-category-create']))->name('procurement.purchase-category.create');
Route::get('/procurement/purchase-category/add', fn() => view('app', ['page' => 'purchase-category-create']));
Route::get('/procurement/purchase-master/purchase-category/create', fn() => view('app', ['page' => 'purchase-category-create']));
Route::get('/procurement/purchase-master/purchase-category/add', fn() => view('app', ['page' => 'purchase-category-create']));

Route::get('/procurement/delivery-terms', fn() => view('app', ['page' => 'delivery-terms']))->name('procurement.delivery-terms');
Route::get('/procurement/purchase-master/delivery-terms', fn() => view('app', ['page' => 'delivery-terms']));
Route::get('/procurement/delivery-terms/create', fn() => view('app', ['page' => 'delivery-terms-create']))->name('procurement.delivery-terms.create');
Route::get('/procurement/delivery-terms/add', fn() => view('app', ['page' => 'delivery-terms-create']));
Route::get('/procurement/purchase-master/delivery-terms/create', fn() => view('app', ['page' => 'delivery-terms-create']));
Route::get('/procurement/purchase-master/delivery-terms/add', fn() => view('app', ['page' => 'delivery-terms-create']));

Route::get('/procurement/additional-costs', fn() => view('app', ['page' => 'additional-costs']))->name('procurement.additional-costs');
Route::get('/procurement/purchase-master/additional-costs', fn() => view('app', ['page' => 'additional-costs']));
Route::get('/procurement/additional-costs/create', fn() => view('app', ['page' => 'additional-costs-create']))->name('procurement.additional-costs.create');
Route::get('/procurement/additional-costs/add', fn() => view('app', ['page' => 'additional-costs-create']));
Route::get('/procurement/purchase-master/additional-costs/create', fn() => view('app', ['page' => 'additional-costs-create']));
Route::get('/procurement/purchase-master/additional-costs/add', fn() => view('app', ['page' => 'additional-costs-create']));

Route::get('/procurement/pph', fn() => view('app', ['page' => 'pph']))->name('procurement.pph');
Route::get('/procurement/purchase-master/pph', fn() => view('app', ['page' => 'pph']));
Route::get('/procurement/pph/create', fn() => view('app', ['page' => 'pph-create']))->name('procurement.pph.create');
Route::get('/procurement/pph/add', fn() => view('app', ['page' => 'pph-create']));
Route::get('/procurement/purchase-master/pph/create', fn() => view('app', ['page' => 'pph-create']));
Route::get('/procurement/purchase-master/pph/add', fn() => view('app', ['page' => 'pph-create']));

Route::get('/procurement/rafaksi-type', fn() => view('app', ['page' => 'rafaksi-type']))->name('procurement.rafaksi-type');
Route::get('/procurement/purchase-master/rafaksi-type', fn() => view('app', ['page' => 'rafaksi-type']));

Route::get('/procurement/job-number', fn() => view('app', ['page' => 'job-number']))->name('procurement.job-number');
Route::get('/procurement/purchase-master/job-number', fn() => view('app', ['page' => 'job-number']));
Route::get('/exim/master/job-number', fn() => view('app', ['page' => 'job-number']));

// Procurement - Reports Routes
Route::get('/procurement/pr-report', fn() => view('app', ['page' => 'pr-report']))->name('procurement.pr-report');
Route::get('/procurement/reports/purchase-requisition-report', fn() => view('app', ['page' => 'pr-report']));

Route::get('/procurement/po-report', fn() => view('app', ['page' => 'po-report']))->name('procurement.po-report');
Route::get('/procurement/reports/purchase-order-report', fn() => view('app', ['page' => 'po-report']));

// Exim - Master Routes (Hierarchical & Aliases)
Route::get('/exim/unit', fn() => view('app', ['page' => 'unit']))->name('exim.unit');
Route::get('/exim/master/unit', fn() => view('app', ['page' => 'unit']));
Route::get('/exim/unit/create', fn() => view('app', ['page' => 'unit-create']))->name('exim.unit.create');
Route::get('/exim/unit/add', fn() => view('app', ['page' => 'unit-create']));
Route::get('/exim/master/unit/create', fn() => view('app', ['page' => 'unit-create']));
Route::get('/exim/master/unit/add', fn() => view('app', ['page' => 'unit-create']));

Route::get('/exim/satuan', fn() => view('app', ['page' => 'satuan']))->name('exim.satuan');
Route::get('/exim/master/satuan', fn() => view('app', ['page' => 'satuan']));
Route::get('/exim/unit-reference', fn() => view('app', ['page' => 'satuan']))->name('exim.unit-reference');
Route::get('/exim/master/unit-reference', fn() => view('app', ['page' => 'satuan']));

Route::get('/exim/item', fn() => view('app', ['page' => 'item']))->name('exim.item');
Route::get('/exim/master/item', fn() => view('app', ['page' => 'item']));
Route::get('/exim/item/create', fn() => view('app', ['page' => 'item-create']))->name('exim.item.create');
Route::get('/exim/item/add', fn() => view('app', ['page' => 'item-create']));
Route::get('/exim/master/item/create', fn() => view('app', ['page' => 'item-create']));
Route::get('/exim/master/item/add', fn() => view('app', ['page' => 'item-create']));
Route::get('/exim/item/qr', fn() => view('app', ['page' => 'item-qr']))->name('exim.item.qr');
Route::get('/exim/master/item/qr', fn() => view('app', ['page' => 'item-qr']));
Route::get('/exim/item/generate-qr', fn() => view('app', ['page' => 'item-qr']));
Route::get('/exim/master/item/generate-qr', fn() => view('app', ['page' => 'item-qr']));

Route::get('/exim/brand', fn() => view('app', ['page' => 'brand']))->name('exim.brand');
Route::get('/exim/master/brand', fn() => view('app', ['page' => 'brand']));
Route::get('/exim/brand/create', fn() => view('app', ['page' => 'brand-create']))->name('exim.brand.create');
Route::get('/exim/brand/add', fn() => view('app', ['page' => 'brand-create']));
Route::get('/exim/master/brand/create', fn() => view('app', ['page' => 'brand-create']));
Route::get('/exim/master/brand/add', fn() => view('app', ['page' => 'brand-create']));

Route::get('/exim/classification', fn() => view('app', ['page' => 'classification']))->name('exim.classification');
Route::get('/exim/master/classification', fn() => view('app', ['page' => 'classification']));
Route::get('/exim/classification/create', fn() => view('app', ['page' => 'classification-create']))->name('exim.classification.create');
Route::get('/exim/classification/add', fn() => view('app', ['page' => 'classification-create']));
Route::get('/exim/master/classification/create', fn() => view('app', ['page' => 'classification-create']));
Route::get('/exim/master/classification/add', fn() => view('app', ['page' => 'classification-create']));

Route::get('/exim/department', fn() => view('app', ['page' => 'department']))->name('exim.department');
Route::get('/exim/master/department', fn() => view('app', ['page' => 'department']));
Route::get('/exim/department/create', fn() => view('app', ['page' => 'department-create']))->name('exim.department.create');
Route::get('/exim/department/add', fn() => view('app', ['page' => 'department-create']));
Route::get('/exim/master/department/create', fn() => view('app', ['page' => 'department-create']));
Route::get('/exim/master/department/add', fn() => view('app', ['page' => 'department-create']));

Route::get('/exim/facility', fn() => view('app', ['page' => 'facility']))->name('exim.facility');
Route::get('/exim/master/facility', fn() => view('app', ['page' => 'facility']));
Route::get('/exim/facility/create', fn() => view('app', ['page' => 'facility-create']))->name('exim.facility.create');
Route::get('/exim/facility/add', fn() => view('app', ['page' => 'facility-create']));
Route::get('/exim/master/facility/create', fn() => view('app', ['page' => 'facility-create']));
Route::get('/exim/master/facility/add', fn() => view('app', ['page' => 'facility-create']));


Route::get('/exim/hs', fn() => view('app', ['page' => 'hs']))->name('exim.hs');
Route::get('/exim/master/hs', fn() => view('app', ['page' => 'hs']));
Route::get('/exim/hs/create', fn() => view('app', ['page' => 'hs-create']))->name('exim.hs.create');
Route::get('/exim/hs/add', fn() => view('app', ['page' => 'hs-create']));
Route::get('/exim/master/hs/create', fn() => view('app', ['page' => 'hs-create']));
Route::get('/exim/master/hs/add', fn() => view('app', ['page' => 'hs-create']));


Route::get('/exim/category', fn() => view('app', ['page' => 'category']))->name('exim.category');
Route::get('/exim/master/category', fn() => view('app', ['page' => 'category']));
Route::get('/exim/category/create', fn() => view('app', ['page' => 'category-create']))->name('exim.category.create');
Route::get('/exim/category/add', fn() => view('app', ['page' => 'category-create']));
Route::get('/exim/master/category/create', fn() => view('app', ['page' => 'category-create']));
Route::get('/exim/master/category/add', fn() => view('app', ['page' => 'category-create']));

Route::get('/exim/style', fn() => view('app', ['page' => 'style']))->name('exim.style');
Route::get('/exim/master/style', fn() => view('app', ['page' => 'style']));
Route::get('/exim/style/create', fn() => view('app', ['page' => 'style-create']))->name('exim.style.create');
Route::get('/exim/style/add', fn() => view('app', ['page' => 'style-create']));
Route::get('/exim/master/style/create', fn() => view('app', ['page' => 'style-create']));
Route::get('/exim/master/style/add', fn() => view('app', ['page' => 'style-create']));
Route::get('/exim/style/import', fn() => view('app', ['page' => 'style-import']))->name('exim.style.import');
Route::get('/exim/master/style/import', fn() => view('app', ['page' => 'style-import']));

Route::get('/exim/colour', fn() => view('app', ['page' => 'colour']))->name('exim.colour');
Route::get('/exim/master/colour', fn() => view('app', ['page' => 'colour']));
Route::get('/exim/color', fn() => view('app', ['page' => 'colour']))->name('exim.color');
Route::get('/exim/master/color', fn() => view('app', ['page' => 'colour']));
Route::get('/exim/colour/create', fn() => view('app', ['page' => 'colour-create']))->name('exim.colour.create');
Route::get('/exim/colour/add', fn() => view('app', ['page' => 'colour-create']));
Route::get('/exim/master/colour/create', fn() => view('app', ['page' => 'colour-create']));
Route::get('/exim/master/colour/add', fn() => view('app', ['page' => 'colour-create']));
Route::get('/exim/color/create', fn() => view('app', ['page' => 'colour-create']))->name('exim.color.create');
Route::get('/exim/color/add', fn() => view('app', ['page' => 'colour-create']));
Route::get('/exim/master/color/create', fn() => view('app', ['page' => 'colour-create']));
Route::get('/exim/master/color/add', fn() => view('app', ['page' => 'colour-create']));

Route::get('/exim/country', fn() => view('app', ['page' => 'country']))->name('exim.country');
Route::get('/exim/master/country', fn() => view('app', ['page' => 'country']));

Route::get('/exim/currency', fn() => view('app', ['page' => 'currency']))->name('exim.currency');
Route::get('/exim/master/currency', fn() => view('app', ['page' => 'currency']));
Route::get('/procurement/purchase-master/currency', fn() => view('app', ['page' => 'currency']));

Route::get('/exim/account', fn() => view('app', ['page' => 'account']))->name('exim.account');
Route::get('/exim/master/account', fn() => view('app', ['page' => 'account']));
Route::get('/procurement/purchase-master/account', fn() => view('app', ['page' => 'account']));

// Exim - Other Routes
Route::get('/exim/receive-note', fn() => view('app', ['page' => 'receive-note']))->name('exim.receive-note');
Route::get('/exim/receive-note/create', fn() => view('app', ['page' => 'receive-note-create']))->name('exim.receive-note.create');
Route::get('/exim/receive-note/add', fn() => view('app', ['page' => 'receive-note-create']));
Route::get('/exim/receive-note/detail/{code}', fn($code) => view('app', ['page' => 'receive-note-detail', 'code' => $code]))->name('exim.receive-note.detail');
Route::get('/exim/receive-note-return', fn() => view('app', ['page' => 'receive-note-return']))->name('exim.receive-note-return');
Route::get('/exim/receive-note-return/create', fn() => view('app', ['page' => 'receive-note-return-create']))->name('exim.receive-note-return.create');
Route::get('/exim/receive-note-return/add', fn() => view('app', ['page' => 'receive-note-return-create']));
Route::get('/exim/receive-note-return/detail/{code}', fn($code) => view('app', ['page' => 'receive-note-return-detail', 'code' => $code]))->name('exim.receive-note-return.detail');
Route::get('/exim/document-history', fn() => view('app', ['page' => 'document-history']))->name('exim.document-history');
Route::get('/exim/document-history/detail/{code}', fn($code) => view('app', ['page' => 'document-history-detail', 'code' => $code]))->name('exim.document-history.detail');
Route::get('/exim/document-history/details/{code}', fn($code) => view('app', ['page' => 'document-history-detail', 'code' => $code]));

// Warehouse Master Routes
Route::get('/warehouse/master', fn() => view('app', ['page' => 'warehouse-master']))->name('warehouse.master');
Route::get('/warehouse/master/warehouse', fn() => view('app', ['page' => 'warehouse-master']));
Route::get('/warehouse/master/warehouse/create', fn() => view('app', ['page' => 'warehouse-master-create']))->name('warehouse.master.warehouse.create');
Route::get('/warehouse/master/warehouse/add', fn() => view('app', ['page' => 'warehouse-master-create']));
Route::get('/warehouse/master/warehouse/{id}/coordinate', fn($id) => view('app', ['page' => 'warehouse-coordinate', 'code' => $id]))->name('warehouse.master.warehouse.coordinate');
Route::get('/warehouse/master/warehouse/coordinate/{id}', fn($id) => view('app', ['page' => 'warehouse-coordinate', 'code' => $id]));
Route::get('/warehouse/master/warehouse/{id}/coordinate/create', fn($id) => view('app', ['page' => 'warehouse-coordinate-create', 'code' => $id]))->name('warehouse.master.warehouse.coordinate.create');
Route::get('/warehouse/master/warehouse/coordinate/{id}/create', fn($id) => view('app', ['page' => 'warehouse-coordinate-create', 'code' => $id]));
Route::get('/warehouse/master/type-of-mutation', fn() => view('app', ['page' => 'type-of-mutation']));

// Warehouse Master - Type of Request
Route::get('/warehouse/master/type-of-request', fn() => view('app', ['page' => 'wh-type-of-request']))->name('warehouse.master.type-of-request');
Route::get('/warehouse/type-of-request', fn() => redirect('/warehouse/master/type-of-request'));
Route::get('/warehouse/master/type-of-request/create', fn() => view('app', ['page' => 'wh-type-of-request-create']))->name('warehouse.master.type-of-request.create');
Route::get('/warehouse/master/type-of-request/add', fn() => view('app', ['page' => 'wh-type-of-request-create']));

// Warehouse Master - Destination Location
Route::get('/warehouse/master/destination-location', fn() => view('app', ['page' => 'wh-destination-location']))->name('warehouse.master.destination-location');
Route::get('/warehouse/destination-location', fn() => redirect('/warehouse/master/destination-location'));
Route::get('/warehouse/master/destination-location/create', fn() => view('app', ['page' => 'wh-destination-location-create']))->name('warehouse.master.destination-location.create');
Route::get('/warehouse/master/destination-location/add', fn() => view('app', ['page' => 'wh-destination-location-create']));

// Warehouse Adjustment Routes
Route::get('/warehouse/adjustment/adjustment-production', fn() => view('app', ['page' => 'wh-adj-prod']));
Route::get('/warehouse/adjustment/adjustment-stock-bc', fn() => view('app', ['page' => 'wh-adj-bc']));
Route::get('/warehouse/adjustment/opname-material', fn() => view('app', ['page' => 'wh-opname-material']));
Route::get('/warehouse/adjustment/adjustment-stock', fn() => view('app', ['page' => 'wh-adj-stock']));

// Warehouse Incoming Routes
Route::get('/warehouse/incoming/transfer-stock-return', fn() => view('app', ['page' => 'transfer-stock-return']));
Route::get('/warehouse/incoming/transfer-stock-result', fn() => view('app', ['page' => 'transfer-stock-result']));
Route::get('/warehouse/incoming/receive-material-non-fasilitas', fn() => view('app', ['page' => 'receive-material-non-fasilitas']));
Route::get('/warehouse/incoming/purchase-return', fn() => view('app', ['page' => 'purchase-return']));
Route::get('/warehouse/incoming/sales-return', fn() => view('app', ['page' => 'sales-return']));

// Warehouse Outcoming Routes
Route::get('/warehouse/outcoming/delivery-order', fn() => view('app', ['page' => 'wh-out-do']));
Route::get('/warehouse/outcoming/issue-material', fn() => view('app', ['page' => 'wh-out-issue']));
Route::get('/warehouse/outcoming/disposal', fn() => view('app', ['page' => 'wh-out-disposal']));

// Warehouse Request Routes
Route::get('/warehouse/request/weight-note', fn() => view('app', ['page' => 'wh-req-weight-note']));
Route::get('/warehouse/request/request-material', fn() => view('app', ['page' => 'wh-req-material']));
Route::get('/warehouse/request/request-material/create', fn() => view('app', ['page' => 'wh-req-material-create']));
Route::get('/warehouse/request/request-material/add', fn() => view('app', ['page' => 'wh-req-material-create']));
Route::get('/warehouse/request/request-material/{id}', fn($id) => view('app', ['page' => 'wh-req-material-detail', 'code' => $id]));
Route::get('/warehouse/request/request-material/detail/{id}', fn($id) => view('app', ['page' => 'wh-req-material-detail', 'code' => $id]));
Route::get('/warehouse/request/weight-note-multiple-fg', fn() => view('app', ['page' => 'wh-req-weight-note-fg']));
Route::get('/warehouse/request/shipping-instruction', fn() => view('app', ['page' => 'wh-req-shipping']));

// Warehouse Move Location Route
Route::get('/warehouse/move-location', fn() => view('app', ['page' => 'warehouse-move-location']));

// Warehouse Report Routes
Route::get('/warehouse/report/receive-material', fn() => view('app', ['page' => 'wh-rep-receive-material']));
Route::get('/warehouse/report/stock-item', fn() => view('app', ['page' => 'wh-rep-stock-item']));
Route::get('/warehouse/report/stock-card', fn() => view('app', ['page' => 'wh-rep-stock-card']));
Route::get('/warehouse/report/stock-transfer-report', fn() => view('app', ['page' => 'wh-rep-stock-transfer']));
Route::get('/warehouse/report/delivery-order-report', fn() => view('app', ['page' => 'wh-rep-delivery-order']));
Route::get('/warehouse/report/stock-mutation-report', fn() => view('app', ['page' => 'wh-rep-stock-mutation']));
Route::get('/warehouse/report/outstanding-request', fn() => view('app', ['page' => 'wh-rep-outstanding-request']));

// User Authentication (Frontend UI)
Route::get('/login', fn() => view('app', ['page' => 'login']))->name('login');

// Edit Profile Page
Route::get('/profile/edit', fn() => view('app', ['page' => 'edit-profile']))->name('profile.edit');
Route::get('/edit-profile', fn() => view('app', ['page' => 'edit-profile']));

// Fallback Route for Unknown URLs (Requirement 5.3)
Route::fallback(function () {
    return response()->view('app', ['page' => 'not-found'], 404);
});

