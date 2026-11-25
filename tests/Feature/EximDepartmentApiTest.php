<?php

namespace Tests\Feature;

use App\Models\System\Auth\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class EximDepartmentApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_department_can_be_created_with_a_unit_from_the_units_table(): void
    {
        $user = User::query()->create([
            'username' => 'dept-test-user',
            'name' => 'Dept Test User',
            'email' => 'dept-test@example.test',
            'password' => 'test-password',
            'role' => User::ROLE_ADMIN,
            'status' => 1,
        ]);
        $this->actingAs($user, 'web');

        $unitResponse = $this->postJson('/api/exim/master/units', [
            'name' => 'Operations',
            'status' => 1,
        ]);
        $unitResponse->assertCreated();
        $unitId = $unitResponse->json('data.id');

        $response = $this->postJson('/api/exim/master/departments', [
            'name' => 'Production',
            'units_id' => $unitId,
            'status' => 1,
        ]);

        $response->assertCreated()
            ->assertJsonPath('data.name', 'Production')
            ->assertJsonPath('data.units_id', $unitId)
            ->assertJsonPath('data.unit.nama', 'Operations');

        $this->assertDatabaseHas('departments', [
            'id' => $response->json('data.id'),
            'name' => 'Production',
            'units_id' => $unitId,
            'status' => 1,
        ]);
    }
}
