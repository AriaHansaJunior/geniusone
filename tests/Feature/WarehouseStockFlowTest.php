<?php

namespace Tests\Feature;

use App\Models\Master\Customs\Facility;
use App\Models\Master\Finance\Account;
use App\Models\Master\Material\Classification;
use App\Models\Master\Material\Item;
use App\Models\Master\Material\ItemType;
use App\Models\Master\Material\UnitOfMeasurement;
use App\Models\Master\Organization\Department;
use App\Models\Master\Organization\ReportingType;
use App\Models\System\Auth\User;
use App\Models\Warehouse\Facility\Warehouse;
use App\Models\Warehouse\Facility\WarehouseType;
use App\Models\Warehouse\Inventory\WarehouseStock;
use App\Models\Warehouse\RequestMaterial\TypeOfRequest;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class WarehouseStockFlowTest extends TestCase
{
    use RefreshDatabase;

    protected User $user;
    protected Department $dept;
    protected TypeOfRequest $requestType;
    protected Warehouse $warehouseA;
    protected Warehouse $warehouseB;
    protected Item $itemA;
    protected Item $itemB;

    protected function setUp(): void
    {
        parent::setUp();

        $this->user = User::query()->create([
            'username' => 'flow-tester',
            'name' => 'Flow Tester',
            'email' => 'flow-tester@geniusone.test',
            'password' => 'secret123',
            'role' => User::ROLE_ADMIN,
            'status' => 1,
        ]);
        $this->actingAs($this->user, 'web');

        $account = Account::query()->create([
            'code' => '115.99',
            'name' => 'Warehouse Flow Inventory Account',
            'category' => 'Inventory',
            'status' => 'active',
        ]);
        $reportingType = ReportingType::query()->create(['name' => 'Warehouse Flow', 'status' => 1]);
        $classification = Classification::query()->create([
            'reporting_types_id' => $reportingType->id,
            'accounts_id' => $account->id,
            'code' => 'FLOW-CLS',
            'name' => 'Flow Class',
            'status' => 1,
        ]);
        $facility = Facility::query()->create(['name' => 'FASILITAS', 'status' => 1]);
        $uom = UnitOfMeasurement::query()->create([
            'code' => 'PCS',
            'name' => 'Pieces',
            'status' => 1,
            'created_by' => $this->user->id,
        ]);
        $itemType = ItemType::query()->create(['name' => 'Raw Material', 'status' => 'active']);
        $whType = WarehouseType::query()->create(['name' => 'Main Storage', 'status' => 1]);

        $this->warehouseA = Warehouse::query()->create([
            'name' => 'Gudang Utama',
            'code' => 'WH-MAIN',
            'warehouse_types_id' => $whType->id,
            'status' => 1,
        ]);
        $this->warehouseB = Warehouse::query()->create([
            'name' => 'Gudang Kosong',
            'code' => 'WH-EMPTY',
            'warehouse_types_id' => $whType->id,
            'status' => 1,
        ]);

        $this->dept = Department::query()->create(['name' => 'Production Floor', 'status' => 1]);
        $this->requestType = TypeOfRequest::query()->create(['name' => 'Production Issue', 'status' => 1]);

        $this->itemA = Item::query()->create([
            'code' => 'RM-FLOW-001',
            'name' => 'Copper Ingot Flow Test',
            'classifications_id' => $classification->id,
            'facilities_id' => $facility->id,
            'item_types_id' => $itemType->id,
            'units_of_measurements_id' => $uom->id,
            'stock' => 100,
            'status' => 1,
        ]);
        $this->itemB = Item::query()->create([
            'code' => 'RM-FLOW-002',
            'name' => 'Steel Sheet Non-RM',
            'classifications_id' => $classification->id,
            'facilities_id' => $facility->id,
            'item_types_id' => $itemType->id,
            'units_of_measurements_id' => $uom->id,
            'stock' => 50,
            'status' => 1,
        ]);

        WarehouseStock::query()->create([
            'items_id' => $this->itemA->id,
            'warehouses_id' => $this->warehouseA->id,
            'quantity' => 100,
            'allocated_quantity' => 0,
            'available_quantity' => 100,
            'location_type' => 'Warehouse',
        ]);
        WarehouseStock::query()->create([
            'items_id' => $this->itemB->id,
            'warehouses_id' => $this->warehouseA->id,
            'quantity' => 50,
            'allocated_quantity' => 0,
            'available_quantity' => 50,
            'location_type' => 'Warehouse',
        ]);
    }

    public function test_request_material_validates_warehouse_stock_and_deducts_on_second_approval(): void
    {
        // Reject requesting from warehouse with zero stock for that item
        $this->postJson('/api/warehouse/request-materials', [
            'requestDate' => now()->toDateString(),
            'departments_id' => $this->dept->id,
            'warehouses_id' => $this->warehouseB->id,
            'type_of_request_id' => $this->requestType->id,
            'items' => [
                ['items_id' => $this->itemA->id, 'requestQty' => 10],
            ],
        ])->assertUnprocessable();

        // Reject requesting more than available stock in Warehouse A
        $this->postJson('/api/warehouse/request-materials', [
            'requestDate' => now()->toDateString(),
            'departments_id' => $this->dept->id,
            'warehouses_id' => $this->warehouseA->id,
            'type_of_request_id' => $this->requestType->id,
            'items' => [
                ['items_id' => $this->itemA->id, 'requestQty' => 150],
            ],
        ])->assertUnprocessable();

        // Create valid RM for 30 PCS from Warehouse A
        $createRes = $this->postJson('/api/warehouse/request-materials', [
            'requestDate' => now()->toDateString(),
            'departments_id' => $this->dept->id,
            'warehouses_id' => $this->warehouseA->id,
            'type_of_request_id' => $this->requestType->id,
            'items' => [
                ['items_id' => $this->itemA->id, 'requestQty' => 30],
            ],
        ]);
        $createRes->assertCreated();
        $rmId = $createRes->json('data.rawId');
        $rmNumber = $createRes->json('data.requestCode');

        // Stage 1 approve does NOT deduct stock yet
        $this->postJson("/api/warehouse/request-materials/{$rmId}/approve", ['tier' => 1])
            ->assertOk()
            ->assertJsonPath('data.approval', 'Waiting for Approve 2');

        $this->assertSame(100.0, (float) Item::find($this->itemA->id)->stock);

        // Stage 2 approve deducts Stock Item + WarehouseStock + writes OUT movement + appears in Stock Card
        $this->postJson("/api/warehouse/request-materials/{$rmId}/approve", ['tier' => 2])
            ->assertOk()
            ->assertJsonPath('data.approval', 'Approved');

        $this->assertSame(70.0, (float) Item::find($this->itemA->id)->stock);
        $this->assertSame(
            70.0,
            (float) DB::table('item_warehouse')
                ->where('items_id', $this->itemA->id)
                ->where('warehouses_id', $this->warehouseA->id)
                ->value('quantity')
        );
        $this->assertDatabaseHas('inventory_movements', [
            'items_id' => $this->itemA->id,
            'warehouses_id' => $this->warehouseA->id,
            'movement_type' => 'OUT',
            'reference_type' => 'RM',
            'reference_number' => $rmNumber,
            'quantity' => 30,
            'balance_before' => 100,
            'balance_after' => 70,
        ]);

        // Stock Card reflects RM as OUT with ending balance 70
        $stockCard = $this->getJson(
            '/api/warehouse/reports/stock-card?itemCode=' . $this->itemA->code
            . '&warehouseId=' . $this->warehouseA->id
            . '&startDate=' . now()->startOfYear()->toDateString()
            . '&endDate=' . now()->toDateString()
        )->assertOk();

        $stockCard->assertJsonPath('data.summary.total_out', 30)
            ->assertJsonPath('data.summary.ending_balance', 70)
            ->assertJsonPath('data.movements.0.doc_number', $rmNumber)
            ->assertJsonPath('data.movements.0.qty_out', 30)
            ->assertJsonPath('data.movements.0.balance', 70);
    }

    public function test_transfer_stock_return_requires_approved_rm_and_adds_stock_after_two_approvals(): void
    {
        // Create & approve RM for 25 PCS of itemA
        $rmRes = $this->postJson('/api/warehouse/request-materials', [
            'requestDate' => now()->toDateString(),
            'departments_id' => $this->dept->id,
            'warehouses_id' => $this->warehouseA->id,
            'type_of_request_id' => $this->requestType->id,
            'items' => [
                ['items_id' => $this->itemA->id, 'requestQty' => 25],
            ],
        ])->assertCreated();
        $rmId = $rmRes->json('data.rawId');
        $rmNumber = $rmRes->json('data.requestCode');

        $this->postJson("/api/warehouse/request-materials/{$rmId}/approve", ['tier' => 1])->assertOk();
        $this->postJson("/api/warehouse/request-materials/{$rmId}/approve", ['tier' => 2])->assertOk();
        $this->assertSame(75.0, (float) Item::find($this->itemA->id)->stock);

        // 1. Direct TSR without request_material_id is rejected
        $this->postJson('/api/warehouse/transfer-stock-returns', [
            'warehouses_id' => $this->warehouseA->id,
            'return_date' => now()->toDateString(),
            'items' => [
                ['items_id' => $this->itemA->id, 'quantity' => 5],
            ],
        ])->assertUnprocessable();

        // 2. TSR attempting to return an item NOT issued in the referenced RM is rejected
        $this->postJson('/api/warehouse/transfer-stock-returns', [
            'request_material_id' => $rmId,
            'warehouses_id' => $this->warehouseA->id,
            'return_date' => now()->toDateString(),
            'items' => [
                ['items_id' => $this->itemB->id, 'quantity' => 5],
            ],
        ])->assertUnprocessable();

        // 3. TSR attempting to return more than issued qty (25) is rejected
        $this->postJson('/api/warehouse/transfer-stock-returns', [
            'request_material_id' => $rmId,
            'warehouses_id' => $this->warehouseA->id,
            'return_date' => now()->toDateString(),
            'items' => [
                ['items_id' => $this->itemA->id, 'quantity' => 26],
            ],
        ])->assertUnprocessable();

        // 4. Create valid TSR for 10 PCS
        $tsrCreate = $this->postJson('/api/warehouse/transfer-stock-returns', [
            'request_material_id' => $rmId,
            'warehouses_id' => $this->warehouseA->id,
            'return_date' => now()->toDateString(),
            'note' => 'Return unused material',
            'items' => [
                ['items_id' => $this->itemA->id, 'quantity' => 10],
            ],
        ])->assertCreated();

        $tsrId = $tsrCreate->json('data.rawId');
        $tsrNumber = $tsrCreate->json('data.returnNumber');

        // Available sources should now show remainingReturnableQty = 15 for itemA
        $sourcesRes = $this->getJson('/api/warehouse/transfer-stock-returns/available-sources')->assertOk();
        $sourceEntry = collect($sourcesRes->json('data'))->firstWhere('id', $rmId);
        $this->assertNotNull($sourceEntry);
        $this->assertSame(15.0, (float) $sourceEntry['items'][0]['remainingReturnableQty']);

        // Cannot skip directly to Tier 2 before Tier 1
        $this->postJson("/api/warehouse/transfer-stock-returns/{$tsrId}/approve", ['tier' => 2])
            ->assertUnprocessable();

        // Stage 1 approve -> Waiting for Approve 2, stock still 75
        $this->postJson("/api/warehouse/transfer-stock-returns/{$tsrId}/approve", ['tier' => 1])
            ->assertOk()
            ->assertJsonPath('data.status', 'Waiting for Approve 2');
        $this->assertSame(75.0, (float) Item::find($this->itemA->id)->stock);

        // Stage 2 approve -> Approved, stock becomes 85 and IN movement recorded
        $this->postJson("/api/warehouse/transfer-stock-returns/{$tsrId}/approve", ['tier' => 2])
            ->assertOk()
            ->assertJsonPath('data.status', 'Approved');

        $this->assertSame(85.0, (float) Item::find($this->itemA->id)->stock);
        $this->assertSame(
            85.0,
            (float) DB::table('item_warehouse')
                ->where('items_id', $this->itemA->id)
                ->where('warehouses_id', $this->warehouseA->id)
                ->value('quantity')
        );
        $this->assertDatabaseHas('inventory_movements', [
            'items_id' => $this->itemA->id,
            'warehouses_id' => $this->warehouseA->id,
            'movement_type' => 'IN',
            'reference_type' => 'TRANSFER_STOCK_RETURN',
            'reference_number' => $tsrNumber,
            'quantity' => 10,
            'balance_before' => 75,
            'balance_after' => 85,
        ]);

        // Stock Card shows RM (OUT 25) and TSR (IN 10) with ending balance 85
        $stockCard = $this->getJson(
            '/api/warehouse/reports/stock-card?itemCode=' . $this->itemA->code
            . '&warehouseId=' . $this->warehouseA->id
            . '&startDate=' . now()->startOfYear()->toDateString()
            . '&endDate=' . now()->toDateString()
        )->assertOk();

        $stockCard->assertJsonPath('data.summary.total_in', 10)
            ->assertJsonPath('data.summary.total_out', 25)
            ->assertJsonPath('data.summary.ending_balance', 85);

        $movements = collect($stockCard->json('data.movements'));
        $this->assertTrue($movements->contains(fn ($m) => $m['doc_number'] === $rmNumber && (float) $m['qty_out'] === 25.0));
        $this->assertTrue($movements->contains(fn ($m) => $m['doc_number'] === $tsrNumber && (float) $m['qty_in'] === 10.0));
    }

    public function test_stock_adjustment_manual_and_excel_inject_update_stock_item_and_stock_card(): void
    {
        // 1. Download template endpoint returns 200 XLSX with Master_Data sheet & dropdown validations
        $tplRes = $this->get('/api/warehouse/adjustment-stock/template')
            ->assertOk()
            ->assertHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');

        $tmpXlsx = tempnam(sys_get_temp_dir(), 'tpl_test_');
        file_put_contents($tmpXlsx, $tplRes->getContent());
        if (class_exists(\ZipArchive::class)) {
            $zip = new \ZipArchive();
            $this->assertTrue($zip->open($tmpXlsx) === true);
            $workbookXml = (string) $zip->getFromName('xl/workbook.xml');
            $stylesXml = (string) $zip->getFromName('xl/styles.xml');
            $sharedStringsXml = (string) $zip->getFromName('xl/sharedStrings.xml');
            $sheet1Xml = (string) $zip->getFromName('xl/worksheets/sheet1.xml');
            $sheet2Xml = (string) $zip->getFromName('xl/worksheets/sheet2.xml');
            $sheet3Xml = (string) $zip->getFromName('xl/worksheets/sheet3.xml');
            $zip->close();
        } else {
            $entries = \App\Support\SimpleXlsxZip::extractEntries($tmpXlsx);
            $this->assertArrayHasKey('xl/workbook.xml', $entries);
            $workbookXml = (string) ($entries['xl/workbook.xml'] ?? '');
            $stylesXml = (string) ($entries['xl/styles.xml'] ?? '');
            $sharedStringsXml = (string) ($entries['xl/sharedStrings.xml'] ?? '');
            $sheet1Xml = (string) ($entries['xl/worksheets/sheet1.xml'] ?? '');
            $sheet2Xml = (string) ($entries['xl/worksheets/sheet2.xml'] ?? '');
            $sheet3Xml = (string) ($entries['xl/worksheets/sheet3.xml'] ?? '');
        }
        @unlink($tmpXlsx);

        $this->assertStringContainsString('name="Adjustment_Stock"', $workbookXml);
        $this->assertStringContainsString('name="Master_Data"', $workbookXml);
        $this->assertStringContainsString('name="Master_Warehouse"', $workbookXml);
        $this->assertStringContainsString('name="MasterItemCodes"', $workbookXml);
        $this->assertStringContainsString('name="MasterWarehouses"', $workbookXml);
        $this->assertStringContainsString('OFFSET(Master_Data!$A$2', $workbookXml);
        $this->assertStringContainsString('OFFSET(Master_Warehouse!$A$2', $workbookXml);
        $this->assertStringContainsString('<calcPr', $workbookXml);
        $this->assertStringContainsString('<cellStyles', $stylesXml);
        $this->assertStringContainsString('<sz val="11"/><color rgb="', $stylesXml);
        $this->assertStringContainsString('<selection pane="bottomLeft"', $sheet1Xml);
        $this->assertStringContainsString('<v/></c>', $sheet1Xml);
        $this->assertStringContainsString('<dimension ref="A1:D', $sheet2Xml);
        $this->assertStringContainsString('<dimension ref="A1:B', $sheet3Xml);
        $this->assertStringContainsString('errorStyle="information"', $sheet1Xml);
        $this->assertStringContainsString('sqref="A2:A500"', $sheet1Xml);
        $this->assertStringContainsString('sqref="C2:C500"', $sheet1Xml);
        $this->assertStringContainsString('sqref="D2:D500"', $sheet1Xml);
        $this->assertStringContainsString($this->itemA->code, $sharedStringsXml);
        $this->assertStringContainsString($this->warehouseA->name, $sharedStringsXml);
        $this->assertStringContainsString($this->warehouseB->name, $sharedStringsXml);

        // 2. Manual IN adjustment into Warehouse B (previously 0 for itemA) + SET adjustment on itemB in Warehouse A
        $manualRes = $this->postJson('/api/warehouse/adjustment-stock', [
            'warehouses_id' => $this->warehouseB->id,
            'adjustment_date' => now()->toDateString(),
            'reference_code' => 'INIT-WH-B',
            'note' => 'Initial injection into Warehouse B',
            'items' => [
                [
                    'items_id' => $this->itemA->id,
                    'warehouses_id' => $this->warehouseB->id,
                    'adjustment_type' => 'IN',
                    'quantity' => 40,
                    'lot_number' => 'LOT-B-01',
                    'coordinate_name' => 'B-01',
                    'remark' => 'Opening balance WH-B',
                ],
                [
                    'items_id' => $this->itemB->id,
                    'warehouses_id' => $this->warehouseA->id,
                    'adjustment_type' => 'SET',
                    'quantity' => 35,
                    'remark' => 'Set exact stock to 35',
                ],
            ],
        ])->assertCreated();

        $adjNumber1 = $manualRes->json('data.adjustmentNumber');
        $manualRes->assertJsonPath('data.sourceType', 'MANUAL');

        $this->assertSame(
            40.0,
            (float) DB::table('item_warehouse')
                ->where('items_id', $this->itemA->id)
                ->where('warehouses_id', $this->warehouseB->id)
                ->value('quantity')
        );
        $this->assertSame(
            35.0,
            (float) DB::table('item_warehouse')
                ->where('items_id', $this->itemB->id)
                ->where('warehouses_id', $this->warehouseA->id)
                ->value('quantity')
        );

        // 3. Excel Inject Import (parsed rows payload simulating Excel sheet)
        // First verify atomic rollback if one row has unknown item
        $this->postJson('/api/warehouse/adjustment-stock/import', [
            'default_warehouse_id' => $this->warehouseB->id,
            'adjustment_date' => now()->toDateString(),
            'rows' => [
                ['Item Code' => 'RM-FLOW-001', 'Warehouse' => 'Gudang Kosong', 'Type' => 'IN', 'Quantity' => 10],
                ['Item Code' => 'UNKNOWN-999', 'Warehouse' => 'Gudang Kosong', 'Type' => 'IN', 'Quantity' => 5],
            ],
        ])->assertUnprocessable();
        // Balance must remain unchanged (40) after failed batch validation
        $this->assertSame(
            40.0,
            (float) DB::table('item_warehouse')
                ->where('items_id', $this->itemA->id)
                ->where('warehouses_id', $this->warehouseB->id)
                ->value('quantity')
        );

        // Valid Excel Import batch: IN 15 for itemA in WH-B, OUT 5 for itemB in WH-A
        $importRes = $this->postJson('/api/warehouse/adjustment-stock/import', [
            'default_warehouse_id' => $this->warehouseB->id,
            'adjustment_date' => now()->toDateString(),
            'reference_code' => 'XLSX-BATCH-01',
            'note' => 'Bulk inject from Excel',
            'rows' => [
                [
                    'Item Code' => $this->itemA->code,
                    'Warehouse' => $this->warehouseB->name,
                    'Type' => 'IN',
                    'Quantity' => 15,
                    'Lot Number' => 'LOT-IMP-01',
                    'Coordinate' => 'B-02',
                    'Remark' => 'Inject Excel +15',
                ],
                [
                    'Item Code' => $this->itemB->code,
                    'Warehouse' => $this->warehouseA->name,
                    'Type' => 'OUT',
                    'Quantity' => 5,
                    'Remark' => 'Excel write-off -5',
                ],
            ],
        ])->assertCreated();

        $adjNumber2 = $importRes->json('data.adjustmentNumber');
        $importRes->assertJsonPath('data.sourceType', 'EXCEL_IMPORT')
            ->assertJsonPath('data.itemCount', 2);

        $this->assertSame(
            55.0,
            (float) DB::table('item_warehouse')
                ->where('items_id', $this->itemA->id)
                ->where('warehouses_id', $this->warehouseB->id)
                ->value('quantity')
        );
        $this->assertSame(
            30.0,
            (float) DB::table('item_warehouse')
                ->where('items_id', $this->itemB->id)
                ->where('warehouses_id', $this->warehouseA->id)
                ->value('quantity')
        );

        // Index & Detail endpoints return posted adjustments
        $this->getJson('/api/warehouse/adjustment-stock?sourceType=EXCEL_IMPORT')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.adjustmentNumber', $adjNumber2);

        $this->getJson('/api/warehouse/adjustment-stock/' . $adjNumber1)
            ->assertOk()
            ->assertJsonPath('data.itemCount', 2);

        // Stock Card for itemA in Warehouse B shows both IN movements (40 + 15 = 55)
        $stockCard = $this->getJson(
            '/api/warehouse/reports/stock-card?itemCode=' . $this->itemA->code
            . '&warehouseId=' . $this->warehouseB->id
            . '&startDate=' . now()->startOfYear()->toDateString()
            . '&endDate=' . now()->toDateString()
        )->assertOk();

        $stockCard->assertJsonPath('data.summary.total_in', 55)
            ->assertJsonPath('data.summary.ending_balance', 55);

        $movements = collect($stockCard->json('data.movements'));
        $this->assertTrue($movements->contains(fn ($m) => $m['doc_number'] === $adjNumber1 && (float) $m['qty_in'] === 40.0));
        $this->assertTrue($movements->contains(fn ($m) => $m['doc_number'] === $adjNumber2 && (float) $m['qty_in'] === 15.0));
    }

    public function test_stock_card_preserves_exact_movement_time_and_master_item_syncs_stock(): void
    {
        // Create Master Item with initial stock -> integrates into warehouse_stocks, item_warehouse, inventory_movements & stock card
        $classificationId = Classification::query()->value('id');
        $facilityId = Facility::query()->value('id');
        $uomId = UnitOfMeasurement::query()->value('id');
        $itemTypeId = ItemType::query()->value('id');

        $createItemRes = $this->postJson('/api/exim/master/items', [
            'name' => 'Integrated Sync Item',
            'code' => 'INT-SYNC-001',
            'classifications_id' => $classificationId,
            'facilities_id' => $facilityId,
            'units_of_measurements_id' => $uomId,
            'item_types_id' => $itemTypeId,
            'warehouses_id' => $this->warehouseA->id,
            'stock' => 25,
            'status' => 1,
        ])->assertCreated();

        $newItemId = $createItemRes->json('data.id');
        $this->assertSame(
            25.0,
            (float) DB::table('item_warehouse')
                ->where('items_id', $newItemId)
                ->where('warehouses_id', $this->warehouseA->id)
                ->value('quantity')
        );

        $todayWib = now('Asia/Jakarta')->toDateString();

        // Record OUT then IN with distinct hours on the same date to verify chronological WIB ordering in Stock Card
        $adjOut = $this->postJson('/api/warehouse/adjustment-stock', [
            'warehouses_id' => $this->warehouseA->id,
            'adjustment_date' => $todayWib,
            'items' => [
                ['items_id' => $newItemId, 'adjustment_type' => 'OUT', 'quantity' => 5],
            ],
        ])->assertCreated()->json('data.adjustmentNumber');

        // Backdate the initial and adjustment inventory_movements timestamps (stored UTC -> returned WIB/Asia/Jakarta)
        DB::table('inventory_movements')
            ->where('items_id', $newItemId)
            ->where('reference_type', 'INITIAL_STOCK')
            ->update(['created_at' => $todayWib . ' 08:15:10']);

        DB::table('inventory_movements')
            ->where('items_id', $newItemId)
            ->where('reference_number', $adjOut)
            ->update(['created_at' => $todayWib . ' 14:42:33']);

        $stockCard = $this->getJson(
            '/api/warehouse/reports/stock-card?itemCode=INT-SYNC-001'
            . '&warehouseId=' . $this->warehouseA->id
            . '&startDate=' . now('Asia/Jakarta')->startOfYear()->toDateString()
            . '&endDate=' . $todayWib
        )->assertOk();

        $stockCard->assertJsonPath('data.summary.ending_balance', 20)
            ->assertJsonPath('data.movements.0.no', 1)
            ->assertJsonPath('data.movements.0.date', $todayWib . ' 21:42:33')
            ->assertJsonPath('data.movements.0.balance', 20)
            ->assertJsonPath('data.movements.1.no', 2)
            ->assertJsonPath('data.movements.1.date', $todayWib . ' 15:15:10')
            ->assertJsonPath('data.movements.1.balance', 25);
    }

    public function test_excel_import_can_auto_create_missing_master_items(): void
    {
        $res = $this->postJson('/api/warehouse/adjustment-stock/import', [
            'default_warehouse_id' => $this->warehouseA->id,
            'adjustment_date' => now()->toDateString(),
            'reference_code' => 'AUTO-MASTER-01',
            'auto_create_missing_items' => true,
            'rows' => [
                [
                    'item_code' => 'BRAND-NEW-888',
                    'item_name' => 'Brand New Carton Box',
                    'warehouse' => $this->warehouseA->name,
                    'adjustment_type' => 'IN',
                    'quantity' => 30,
                    'lot_number' => 'LOT-NEW-01',
                    'coordinate' => 'Z-09',
                    'remark' => 'Auto-created directly from Excel row',
                ],
                [
                    'item_code' => 'BRAND-NEW-888',
                    'item_name' => 'Brand New Carton Box',
                    'warehouse' => $this->warehouseB->name,
                    'adjustment_type' => 'IN',
                    'quantity' => 12,
                    'remark' => 'Second row reusing newly created item in same batch',
                ],
            ],
        ])->assertCreated();

        $createdItem = Item::query()->where('code', 'BRAND-NEW-888')->first();
        $this->assertNotNull($createdItem);
        $this->assertSame('Brand New Carton Box', $createdItem->name);
        $this->assertSame(42.0, (float) $createdItem->stock);
        $this->assertSame(
            30.0,
            (float) DB::table('item_warehouse')
                ->where('items_id', $createdItem->id)
                ->where('warehouses_id', $this->warehouseA->id)
                ->value('quantity')
        );
        $this->assertSame(
            12.0,
            (float) DB::table('item_warehouse')
                ->where('items_id', $createdItem->id)
                ->where('warehouses_id', $this->warehouseB->id)
                ->value('quantity')
        );
        $this->assertNotEmpty($res->json('data.adjustmentNumber'));
    }
}
