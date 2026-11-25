<?php

namespace Tests\Feature;

use App\Models\System\Auth\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class EximBrandApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_exim_brand_can_be_created_and_persisted(): void
    {
        $user = User::query()->create([
            'username' => 'brand-test-user',
            'name' => 'Brand Test User',
            'email' => 'brand-test@example.test',
            'password' => 'test-password',
            'role' => User::ROLE_ADMIN,
            'status' => 1,
        ]);
        $this->actingAs($user, 'web');

        $response = $this->postJson('/api/exim/master/brands', [
            'code' => 'BRD-NEW',
            'name' => 'New Brand',
            'description' => 'Brand created through Exim master data',
            'status' => 1,
        ]);

        $response->assertCreated()
            ->assertJsonPath('data.code', 'BRD-NEW')
            ->assertJsonPath('data.name', 'New Brand');

        $this->assertDatabaseHas('brands', [
            'id' => $response->json('data.id'),
            'code' => 'BRD-NEW',
            'name' => 'New Brand',
            'description' => 'Brand created through Exim master data',
            'status' => 1,
        ]);

        $this->postJson('/api/exim/master/brands', [
            'code' => 'BRD-NEW',
            'name' => 'Another Brand',
        ])->assertUnprocessable()
            ->assertJsonValidationErrors(['code']);
    }
}
