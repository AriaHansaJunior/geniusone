<?php

namespace Tests\Feature;

use App\Models\Master\Organization\Department;
use App\Models\System\Auth\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class WarehouseTypeOfRequestApiTest extends TestCase
{
    use RefreshDatabase;

    protected User $user;

    protected function setUp(): void
    {
        parent::setUp();

        $this->user = User::query()->create([
            'username' => 'type-of-request-test',
            'name' => 'Type of Request Test',
            'email' => 'type-of-request-test@example.test',
            'password' => Hash::make('test-password'),
            'role' => User::ROLE_ADMIN,
            'status' => 1,
        ]);
    }

    public function test_type_of_request_persists_without_removed_columns(): void
    {
        $department = Department::query()->create([
            'name' => 'Operations',
            'status' => 1,
        ]);

        $response = $this->actingAs($this->user, 'web')->postJson('/api/warehouse/master/type-of-requests', [
            'name' => 'Production Requisition',
            'departments_id' => $department->id,
            'requires_job_number' => true,
            'description' => 'Material request for production.',
            'status' => 1,
        ]);

        $response->assertCreated()
            ->assertJsonPath('data.name', 'Production Requisition')
            ->assertJsonPath('data.departmentId', (string) $department->id)
            ->assertJsonPath('data.department', 'Operations')
            ->assertJsonPath('data.requiresJobNumber', true);

        $this->assertArrayNotHasKey('code', $response->json('data'));
        $this->assertArrayNotHasKey('requiresDepartment', $response->json('data'));
        $this->assertArrayNotHasKey('requiresApproval2', $response->json('data'));
        $this->assertTrue(Schema::hasColumn('type_of_request', 'departments_id'));
        $this->assertFalse(Schema::hasColumn('type_of_request', 'requires_department'));
        $this->assertFalse(Schema::hasColumn('type_of_request', 'department'));
        $this->assertFalse(Schema::hasColumn('type_of_request', 'code'));
        $this->assertFalse(Schema::hasColumn('type_of_request', 'requires_approval_2'));
        $this->assertDatabaseHas('type_of_request', [
            'id' => $response->json('data.id'),
            'name' => 'Production Requisition',
            'departments_id' => $department->id,
            'requires_job_number' => 1,
            'created_by' => $this->user->id,
        ]);

        $updatedDepartment = Department::query()->create([
            'name' => 'Maintenance',
            'status' => 1,
        ]);
        $updateResponse = $this->actingAs($this->user, 'web')->putJson(
            '/api/warehouse/master/type-of-requests/' . $response->json('data.id'),
            ['departments_id' => $updatedDepartment->id],
        );

        $updateResponse->assertOk()
            ->assertJsonPath('data.departmentId', (string) $updatedDepartment->id)
            ->assertJsonPath('data.department', 'Maintenance');
        $this->assertDatabaseHas('type_of_request', [
            'id' => $response->json('data.id'),
            'departments_id' => $updatedDepartment->id,
        ]);
    }
}
