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
}
