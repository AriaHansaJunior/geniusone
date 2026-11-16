<?php

namespace Tests\Feature;

use App\Models\System\Auth\User;
use App\Models\Warehouse\Facility\WarehouseType;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class WarehouseMasterTypeApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_warehouse_is_created_with_a_type_from_warehouse_types(): void
    {
        $user = User::query()->create([
            'username' => 'warehouse-test-user',
            'name' => 'Warehouse Test User',
            'email' => 'warehouse-test@example.test',
            'password' => 'test-password',
            'role' => User::ROLE_ADMIN,
            'status' => 1,
        ]);
        $this->actingAs($user, 'web');

        $warehouseType = WarehouseType::query()->create([
            'name' => 'Raw Material',
            'status' => 1,
        ]);

        $this->getJson('/api/warehouse/master/warehouse-types')
            ->assertOk()
            ->assertJsonPath('data.0.id', $warehouseType->id)
            ->assertJsonPath('data.0.name', 'Raw Material');

        $response = $this->postJson('/api/warehouse/master/warehouses', [
            'name' => 'Main Warehouse',
            'warehouse_types_id' => (string) $warehouseType->id,
            'status' => 1,
        ]);

        $response->assertCreated()
            ->assertJsonPath('data.name', 'Main Warehouse')
            ->assertJsonPath('data.warehouse_types_id', (string) $warehouseType->id)
            ->assertJsonPath('data.type.name', 'Raw Material');

        $this->assertDatabaseHas('warehouses', [
            'id' => $response->json('data.id'),
            'name' => 'Main Warehouse',
            'warehouse_types_id' => $warehouseType->id,
            'created_by' => $user->id,
        ]);
    }
}
