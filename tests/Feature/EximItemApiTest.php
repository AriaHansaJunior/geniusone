<?php

namespace Tests\Feature;

use App\Models\Master\Customs\Facility;
use App\Models\Master\Finance\Account;
use App\Models\Master\Material\Classification;
use App\Models\Master\Material\ItemType;
use App\Models\Master\Material\UnitOfMeasurement;
use App\Models\Master\Organization\ReportingType;
use App\Models\System\Auth\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class EximItemApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_item_creation_persists_to_items_with_required_master_references(): void
    {
        $user = User::query()->create([
            'username' => 'item-test-user',
            'name' => 'Item Test User',
            'email' => 'item-test@example.test',
            'password' => 'test-password',
            'role' => User::ROLE_ADMIN,
            'status' => 1,
        ]);
        $this->actingAs($user, 'web');

        $account = Account::query()->create([
            'code' => '1140',
            'name' => 'Raw Materials',
            'category' => 'Inventory',
            'status' => 'active',
        ]);
        $reportingType = ReportingType::query()->create([
            'name' => 'Material Movement',
            'status' => 1,
        ]);
        $classification = Classification::query()->create([
            'reporting_types_id' => $reportingType->id,
            'accounts_id' => $account->id,
            'code' => 'RM',
            'name' => 'Raw Material',
            'status' => 1,
        ]);
        $facility = Facility::query()->create([
            'name' => 'Main Facility',
            'status' => 1,
        ]);
        $unit = UnitOfMeasurement::query()->create([
            'code' => 'PCS',
            'name' => 'Pieces',
            'status' => 1,
            'created_by' => $user->id,
        ]);
        $itemType = ItemType::query()->create([
            'name' => 'Material',
            'status' => 'active',
        ]);

        $response = $this->postJson('/api/exim/master/items', [
            'code' => 'ITM-TEST-01',
            'name' => 'Test Raw Material',
            'classifications_id' => $classification->id,
            'facilities_id' => $facility->id,
            'item_types_id' => $itemType->id,
            'units_of_measurements_id' => $unit->id,
            'smallest_unit_id' => $unit->id,
            'greatest_unit_id' => $unit->id,
            'status' => 1,
            'trace_by_lot' => 1,
        ]);

        $response->assertCreated()
            ->assertJsonPath('data.code', 'ITM-TEST-01')
            ->assertJsonPath('data.name', 'Test Raw Material')
            ->assertJsonPath('data.classifications_id', $classification->id)
            ->assertJsonPath('data.facilities_id', $facility->id)
            ->assertJsonPath('data.units_of_measurements_id', $unit->id);

        $this->assertDatabaseHas('items', [
            'id' => $response->json('data.id'),
            'code' => 'ITM-TEST-01',
            'name' => 'Test Raw Material',
            'classifications_id' => $classification->id,
            'facilities_id' => $facility->id,
            'item_types_id' => $itemType->id,
            'units_of_measurements_id' => $unit->id,
            'created_by' => $user->id,
            'updated_by' => $user->id,
        ]);

        $boxUnit = UnitOfMeasurement::query()->create([
            'code' => 'BOX',
            'name' => 'BOX',
            'description' => 'Standard Carton / Box',
            'status' => 1,
            'created_by' => $user->id,
        ]);

        $distinctResponse = $this->postJson('/api/exim/master/items', [
            'code' => 'ITM-TEST-02',
            'name' => 'Packaged Raw Material',
            'classifications_id' => $classification->id,
            'facilities_id' => $facility->id,
            'item_types_id' => $itemType->id,
            'units_of_measurements_id' => $unit->id,
            'smallest_unit_id' => $unit->id,
            'greatest_unit_id' => $boxUnit->id,
            'unit_conversion' => 12,
            'status' => 1,
            'trace_by_lot' => 0,
        ]);

        $distinctResponse->assertCreated()
            ->assertJsonPath('data.smallest_unit.code', 'PCS')
            ->assertJsonPath('data.greatest_unit.code', 'BOX')
            ->assertJsonPath('data.greatest_unit.description', 'Standard Carton / Box');

        $clearResponse = $this->putJson('/api/exim/master/items/'.$distinctResponse->json('data.id'), [
            'greatest_unit_id' => null,
        ]);

        $clearResponse->assertOk()
            ->assertJsonPath('data.greatest_unit_id', null)
            ->assertJsonPath('data.greatest_unit', null);
    }
}
