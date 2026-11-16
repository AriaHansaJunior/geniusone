<?php

namespace Tests\Feature;

use App\Models\Master\Organization\Department;
use App\Models\System\Auth\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class JobNumberDepartmentApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_job_number_persists_a_department_relationship(): void
    {
        $user = User::query()->create([
            'username' => 'job-number-test',
            'name' => 'Job Number Test',
            'email' => 'job-number-test@example.test',
            'password' => Hash::make('test-password'),
            'role' => User::ROLE_ADMIN,
            'status' => 1,
        ]);
        $department = Department::query()->create([
            'name' => 'Operations',
            'status' => 1,
        ]);

        $response = $this->actingAs($user, 'web')->postJson('/api/procurement/master/job-numbers', [
            'code' => 'JOB-DEP-01',
            'name' => 'Operations Expansion',
            'departments_id' => $department->id,
            'status' => 1,
        ]);

        $response->assertCreated()
            ->assertJsonPath('data.code', 'JOB-DEP-01')
            ->assertJsonPath('data.department.id', $department->id)
            ->assertJsonPath('data.department.name', 'Operations');

        $this->assertTrue(Schema::hasColumn('job_number', 'departments_id'));
        $this->assertFalse(Schema::hasColumn('job_number', 'department'));
        $this->assertDatabaseHas('job_number', [
            'id' => $response->json('data.id'),
            'code' => 'JOB-DEP-01',
            'name' => 'Operations Expansion',
            'departments_id' => $department->id,
            'created_by' => $user->id,
        ]);

        $nextDepartment = Department::query()->create([
            'name' => 'Maintenance',
            'status' => 1,
        ]);

        $updateResponse = $this->actingAs($user, 'web')->putJson(
            '/api/procurement/master/job-numbers/' . $response->json('data.id'),
            ['departments_id' => $nextDepartment->id],
        );

        $updateResponse->assertOk()
            ->assertJsonPath('data.department.id', $nextDepartment->id)
            ->assertJsonPath('data.department.name', 'Maintenance');
        $this->assertDatabaseHas('job_number', [
            'id' => $response->json('data.id'),
            'departments_id' => $nextDepartment->id,
        ]);
    }
}
