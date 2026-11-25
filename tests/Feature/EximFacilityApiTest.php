<?php

namespace Tests\Feature;

use App\Models\System\Auth\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class EximFacilityApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_exim_facility_can_be_created_and_persisted(): void
    {
        $user = User::query()->create([
            'username' => 'facility-test-user',
            'name' => 'Facility Test User',
            'email' => 'facility-test@example.test',
            'password' => 'test-password',
            'role' => User::ROLE_ADMIN,
            'status' => 1,
        ]);
        $this->actingAs($user, 'web');

        $response = $this->postJson('/api/exim/master/facilities', [
            'name' => 'Fasilitas Produksi',
            'description' => 'Area production support',
            'status' => 1,
        ]);

        $response->assertCreated()
            ->assertJsonPath('data.name', 'Fasilitas Produksi')
            ->assertJsonPath('data.description', 'Area production support');

        $this->assertDatabaseHas('facilities', [
            'id' => $response->json('data.id'),
            'name' => 'Fasilitas Produksi',
            'description' => 'Area production support',
            'status' => 1,
        ]);

        $this->postJson('/api/exim/master/facilities', [
            'name' => 'Fasilitas Produksi',
        ])->assertUnprocessable()
            ->assertJsonValidationErrors(['name']);
    }
}
