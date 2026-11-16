<?php

namespace Tests\Feature;

use App\Models\System\Auth\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class EximCountryApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_exim_country_can_be_created_and_persisted(): void
    {
        $user = User::query()->create([
            'username' => 'country-test-user',
            'name' => 'Country Test User',
            'email' => 'country-test@example.test',
            'password' => 'test-password',
            'role' => User::ROLE_ADMIN,
            'status' => 1,
        ]);
        $this->actingAs($user, 'web');

        $response = $this->postJson('/api/procurement/master/countries', [
            'code' => 'JP',
            'name' => 'JAPAN',
            'status' => 1,
        ]);

        $response->assertCreated()
            ->assertJsonPath('data.code', 'JP')
            ->assertJsonPath('data.name', 'JAPAN');

        $this->assertDatabaseHas('countries', [
            'id' => $response->json('data.id'),
            'code' => 'JP',
            'name' => 'JAPAN',
            'status' => 1,
            'created_by' => $user->id,
            'updated_by' => $user->id,
        ]);

        $this->postJson('/api/procurement/master/countries', [
            'code' => 'JPN',
            'name' => 'JAPAN',
        ])->assertUnprocessable()
            ->assertJsonValidationErrors(['name']);
    }
}
