<?php

namespace Tests\Feature;

use App\Models\Master\Customs\CustomsReport;
use App\Models\Master\Customs\Facility;
use App\Models\Master\Customs\TypeRateBm;
use App\Models\Master\Customs\TypeRateCukai;
use App\Models\Master\Finance\Account;
use App\Models\Master\Finance\PphType;
use App\Models\Master\Material\Brand;
use App\Models\Master\Material\Classification;
use App\Models\Master\Material\GroupScrapItem;
use App\Models\Master\Material\Item;
use App\Models\Master\Material\ItemType;
use App\Models\Master\Material\Specification;
use App\Models\Master\Material\UnitOfMeasurement;
use App\Models\Master\Organization\ReportingType;
use App\Models\System\Auth\User;
use App\Models\Warehouse\Facility\Warehouse;
use App\Models\Warehouse\Facility\WarehouseCoordinate;
use App\Models\Warehouse\Facility\WarehouseType;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class MasterDeleteApiTest extends TestCase
{
    use RefreshDatabase;

    private function actingAsAdmin(): User
    {
        $user = User::query()->create([
            'username' => 'master-delete-admin',
            'name' => 'Master Delete Admin',
            'email' => 'master-delete@example.test',
            'password' => 'test-password',
            'role' => User::ROLE_ADMIN,
            'status' => 1,
        ]);
        $this->actingAs($user, 'web');

        return $user;
    }

    public function test_reference_master_records_can_be_deleted_via_api(): void
    {
        $this->actingAsAdmin();

        $pphType = PphType::create(['nama' => 'PPh Delete Test']);
        $bm = TypeRateBm::create(['name' => 'BM Delete Test', 'status' => 1]);
        $cukai = TypeRateCukai::create(['name' => 'Cukai Delete Test', 'status' => 1]);
        $customReport = CustomsReport::create(['name' => 'BC Delete Test', 'status' => 1]);
        $itemType = ItemType::create(['name' => 'Item Type Delete Test', 'status' => 1]);
        $scrap = GroupScrapItem::create(['code' => 'SCR-DEL', 'name' => 'Scrap Delete Test', 'status' => 1]);
        $spec = Specification::create(['name' => 'Spec Delete Test', 'status' => 1]);
        $whType = WarehouseType::create(['name' => 'WH Type Delete Test', 'status' => 1]);

        $this->deleteJson("/api/master/reference/pph-type/{$pphType->id}")->assertOk();
        $this->deleteJson("/api/master/reference/type-rates-bm/{$bm->id}")->assertOk();
        $this->deleteJson("/api/master/reference/type-rates-cukai/{$cukai->id}")->assertOk();
        $this->deleteJson("/api/master/reference/custom-report/{$customReport->id}")->assertOk();
        $this->deleteJson("/api/master/reference/item-type/{$itemType->id}")->assertOk();
        $this->deleteJson("/api/master/reference/group-scrap-item/{$scrap->id}")->assertOk();
        $this->deleteJson("/api/master/reference/specification/{$spec->id}")->assertOk();
        $this->deleteJson("/api/master/reference/warehouse-type/{$whType->id}")->assertOk();

        $this->assertSoftDeleted('pph_type', ['id' => $pphType->id]);
        $this->assertSoftDeleted('types_rates_bm', ['id' => $bm->id]);
        $this->assertSoftDeleted('types_rates_cukai', ['id' => $cukai->id]);
        $this->assertSoftDeleted('customs_reports', ['id' => $customReport->id]);
        $this->assertSoftDeleted('item_types', ['id' => $itemType->id]);
        $this->assertSoftDeleted('group_scrap_items', ['id' => $scrap->id]);
        $this->assertSoftDeleted('specifications', ['id' => $spec->id]);
        $this->assertSoftDeleted('warehouse_types', ['id' => $whType->id]);

        $this->getJson('/api/master/lookups')
            ->assertOk()
            ->assertJsonMissing(['name' => 'Item Type Delete Test'])
            ->assertJsonMissing(['name' => 'Spec Delete Test'])
            ->assertJsonMissing(['name' => 'Warehouse Type Delete Test']);

        $this->getJson('/api/procurement/master/pph-types')
            ->assertOk()
            ->assertJsonMissing(['nama' => 'PPh Delete Test']);
    }

    public function test_unknown_reference_master_key_returns_404(): void
    {
        $this->actingAsAdmin();

        $this->deleteJson('/api/master/reference/non-existent-master/1')
            ->assertNotFound();
    }

    public function test_standard_master_delete_and_foreign_key_constraint_protection(): void
    {
        $actor = $this->actingAsAdmin();

        $brand = Brand::create([
            'code' => 'BRD-DEL-01',
            'name' => 'Deletable Brand',
            'status' => 1,
        ]);

        $this->deleteJson("/api/exim/master/brands/{$brand->id}")
            ->assertOk();
        $this->assertSoftDeleted('brands', ['id' => $brand->id]);

        $whType = WarehouseType::create(['name' => 'Main Storage', 'status' => 1]);
        $warehouse = Warehouse::create([
            'code' => 'WH-DEL-01',
            'name' => 'Deletable Warehouse',
            'warehouse_types_id' => $whType->id,
            'status' => 1,
            'created_by' => $actor->id,
            'updated_by' => $actor->id,
        ]);
        $coord = WarehouseCoordinate::create([
            'warehouses_id' => $warehouse->id,
            'name' => 'RACK-DEL-01',
            'status' => 1,
            'created_by' => $actor->id,
            'updated_by' => $actor->id,
        ]);

        $this->deleteJson("/api/warehouse/master/coordinates/{$coord->id}")
            ->assertOk();
        $this->assertSoftDeleted('warehouse_coordinates', ['id' => $coord->id]);

        $this->deleteJson("/api/warehouse/master/warehouses/{$warehouse->id}")
            ->assertOk();
        $this->assertSoftDeleted('warehouses', ['id' => $warehouse->id]);

        // Deleting a Classification (hard delete) while referenced by an Item triggers FK constraint -> clean 422 JSON
        if (DB::getDriverName() === 'sqlite') {
            DB::statement('PRAGMA foreign_keys = ON');
        }

        $account = Account::create([
            'code' => '1140-FK',
            'name' => 'Inventory FK',
            'category' => 'Asset',
            'status' => 'active',
        ]);
        $reportingType = ReportingType::create(['name' => 'RM Report', 'status' => 1]);
        $classification = Classification::create([
            'reporting_types_id' => $reportingType->id,
            'accounts_id' => $account->id,
            'code' => 'CLS-FK',
            'name' => 'Protected Classification',
            'description' => 'Used by item',
            'status' => 1,
        ]);
        $facility = Facility::create(['name' => 'FASILITAS', 'status' => 1]);
        $itemType = ItemType::create(['name' => 'Raw Material', 'status' => 1]);
        $uom = UnitOfMeasurement::create(['code' => 'KGS', 'name' => 'Kilogram', 'status' => 1]);

        Item::create([
            'classifications_id' => $classification->id,
            'facilities_id' => $facility->id,
            'item_types_id' => $itemType->id,
            'units_of_measurements_id' => $uom->id,
            'code' => 'ITM-FK-01',
            'name' => 'FK Guarded Item',
            'status' => 1,
            'created_by' => $actor->id,
            'updated_by' => $actor->id,
        ]);

        $this->deleteJson("/api/exim/master/classifications/{$classification->id}")
            ->assertStatus(422)
            ->assertJsonPath(
                'message',
                'This record cannot be deleted because it is still referenced by existing transactions or related records.'
            );
    }
}
