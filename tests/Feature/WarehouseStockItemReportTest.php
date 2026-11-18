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
use App\Models\Warehouse\RequestMaterial\RequestMaterial;
use App\Models\Warehouse\RequestMaterial\RequestMaterialItem;
use App\Models\Warehouse\RequestMaterial\TypeOfRequest;
use App\Services\Inventory\InventoryService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class WarehouseStockItemReportTest extends TestCase
{
    use RefreshDatabase;

    public function test_report_groups_balances_by_warehouse_and_tracks_movements(): void
    {
        $user = User::query()->create([
            'username' => 'stock-report-user',
            'name' => 'Stock Report User',
            'email' => 'stock-report@example.test',
            'password' => 'test-password',
            'role' => User::ROLE_ADMIN,
            'status' => 1,
        ]);
        $this->actingAs($user, 'web');

        $account = Account::query()->create([
            'code' => 'STOCK-REPORT',
            'name' => 'Stock Report Account',
            'category' => 'Inventory',
            'status' => 'active',
        ]);
        $reportingType = ReportingType::query()->create([
            'name' => 'Stock Report',
            'status' => 1,
        ]);
        $classification = Classification::query()->create([
            'reporting_types_id' => $reportingType->id,
            'accounts_id' => $account->id,
            'code' => 'STOCK-REPORT',
            'name' => 'Stock Report Class',
            'status' => 1,
        ]);
        $facility = Facility::query()->create([
            'name' => 'Stock Report Facility',
            'status' => 1,
        ]);
        $unit = UnitOfMeasurement::query()->create([
            'code' => 'KG',
            'name' => 'Kilogram',
            'status' => 1,
            'created_by' => $user->id,
        ]);
        $itemType = ItemType::query()->create([
            'name' => 'Stock Report Item',
            'status' => 'active',
        ]);
        $warehouseType = WarehouseType::query()->create([
            'name' => 'Stock Report Warehouse',
            'status' => 1,
        ]);
        $warehouseA = Warehouse::query()->create([
            'name' => 'Warehouse A',
            'warehouse_types_id' => $warehouseType->id,
            'status' => 1,
        ]);
        $warehouseB = Warehouse::query()->create([
            'name' => 'Warehouse B',
            'warehouse_types_id' => $warehouseType->id,
            'status' => 1,
        ]);
        $item = Item::query()->create([
            'code' => 'STOCK-001',
            'name' => 'Test Stock Item',
            'classifications_id' => $classification->id,
            'facilities_id' => $facility->id,
            'item_types_id' => $itemType->id,
            'units_of_measurements_id' => $unit->id,
            'stock' => 999,
        ]);

        foreach ([
            [$warehouseA, 'A-01', 6],
            [$warehouseA, 'A-02', 4],
            [$warehouseB, 'B-01', 5],
        ] as [$warehouse, $coordinate, $quantity]) {
            WarehouseStock::query()->create([
                'items_id' => $item->id,
                'warehouses_id' => $warehouse->id,
                'coordinate_name' => $coordinate,
                'quantity' => $quantity,
                'available_quantity' => $coordinate === 'A-01' ? 0 : $quantity,
                'allocated_quantity' => 0,
                'location_type' => 'Warehouse',
            ]);
        }

        $response = $this->getJson('/api/warehouse/reports/stock-item');
        $response->assertOk()
            ->assertJsonPath('meta.total', 1)
            ->assertJsonPath('data.0.item_id', $item->id)
            ->assertJsonPath('data.0.quantity', 15)
            ->assertJsonPath('data.0.warehouseBalances.0.availableQuantity', 10);

        $balances = collect($response->json('data.0.warehouseBalances'))->keyBy('warehouseId');
        $this->assertSame(10.0, (float) $balances[$warehouseA->id]['quantity']);
        $this->assertSame(5.0, (float) $balances[$warehouseB->id]['quantity']);
        $this->assertTrue($item->warehouses()->whereKey($warehouseA->id)->exists());
        $this->assertSame(
            5.0,
            (float) $item->warehouses()->whereKey($warehouseB->id)->first()->pivot->quantity
        );

        DB::table('warehouse_stocks')
            ->where('items_id', $item->id)
            ->where('warehouses_id', $warehouseA->id)
            ->where('coordinate_name', 'A-01')
            ->update(['quantity' => 999]);

        $pivotSourceResponse = $this->getJson('/api/warehouse/reports/stock-item');
        $pivotSourceResponse->assertOk()
            ->assertJsonPath('data.0.quantity', 15);

        DB::table('warehouse_stocks')
            ->where('items_id', $item->id)
            ->where('warehouses_id', $warehouseA->id)
            ->where('coordinate_name', 'A-01')
            ->update(['quantity' => 6]);

        $warehouseResponse = $this->getJson('/api/warehouse/reports/stock-item?warehouseId='.$warehouseA->id);
        $warehouseResponse->assertOk()
            ->assertJsonPath('meta.total', 1)
            ->assertJsonPath('data.0.quantity', 10)
            ->assertJsonPath('data.0.warehouseBalances.0.warehouseName', 'Warehouse A');

        app(InventoryService::class)->recordStockMovement(
            item: $item,
            warehouseId: $warehouseA->id,
            movementType: 'OUT',
            quantity: 7,
            referenceType: 'RM',
            referenceNumber: 'RM-STOCK-001',
            userId: $user->id
        );

        $historyResponse = $this->getJson(
            '/api/warehouse/reports/stock-item/'.$item->id.'/movements?warehouseId='.$warehouseA->id
        );
        $historyResponse->assertOk()
            ->assertJsonPath('meta.total', 1)
            ->assertJsonPath('data.0.movementType', 'OUT')
            ->assertJsonPath('data.0.balanceBefore', 10)
            ->assertJsonPath('data.0.balanceAfter', 3);

        $this->assertSame(
            3.0,
            (float) $item->warehouses()->whereKey($warehouseA->id)->first()->pivot->quantity
        );
        $this->assertSame(
            5.0,
            (float) $item->warehouses()->whereKey($warehouseB->id)->first()->pivot->quantity
        );

        $department = Department::query()->create([
            'name' => 'Stock Request Department',
            'status' => 1,
        ]);
        $requestType = TypeOfRequest::query()->create([
            'name' => 'Stock Request Type',
            'status' => 1,
        ]);
        $materialRequest = RequestMaterial::query()->create([
            'request_number' => 'RM-STOCK-001',
            'departments_id' => $department->id,
            'warehouses_id' => $warehouseB->id,
            'type_of_request_id' => $requestType->id,
            'creator' => $user->id,
            'request_date' => now(),
            'status' => 'Waiting for Approve 1',
        ]);
        RequestMaterialItem::query()->create([
            'items_id' => $item->id,
            'request_material_id' => $materialRequest->id,
            'request' => 2,
        ]);

        $this->postJson('/api/warehouse/request-materials/'.$materialRequest->id.'/approve', ['tier' => 2])
            ->assertUnprocessable();
        $this->assertSame(
            5.0,
            (float) $item->warehouses()->whereKey($warehouseB->id)->first()->pivot->quantity
        );
        $this->postJson('/api/warehouse/request-materials/'.$materialRequest->id.'/approve', ['tier' => 1])
            ->assertOk()
            ->assertJsonPath('data.approval', 'Waiting for Approve 2');
        $this->postJson('/api/warehouse/request-materials/'.$materialRequest->id.'/approve', ['tier' => 2])
            ->assertOk()
            ->assertJsonPath('data.approval', 'Approved');
        $this->postJson('/api/warehouse/request-materials/'.$materialRequest->id.'/approve', ['tier' => 2])
            ->assertUnprocessable();

        $this->assertSame(
            3.0,
            (float) $item->warehouses()->whereKey($warehouseB->id)->first()->pivot->quantity
        );
        $this->getJson('/api/warehouse/reports/stock-item/'.$item->id.'/movements?warehouseId='.$warehouseB->id)
            ->assertOk()
            ->assertJsonPath('meta.total', 1)
            ->assertJsonPath('data.0.movementType', 'OUT')
            ->assertJsonPath('data.0.balanceBefore', 5)
            ->assertJsonPath('data.0.balanceAfter', 3);
    }
}
