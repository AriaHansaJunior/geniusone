<?php

namespace Tests\Feature;

use App\Models\System\Auth\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class EximCategoryApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_exim_category_can_be_created_and_persisted(): void
    {
        $user = User::query()->create([
            'username' => 'category-test-user',
            'name' => 'Category Test User',
            'email' => 'category-test@example.test',
            'password' => 'test-password',
            'role' => User::ROLE_ADMIN,
            'status' => 1,
        ]);
        $this->actingAs($user, 'web');

        $response = $this->postJson('/api/exim/master/categories', [
            'code' => 'CAT-RAW',
            'name' => 'Raw Materials',
            'description' => 'Production raw materials',
            'status' => 1,
        ]);

        $response->assertCreated()
            ->assertJsonPath('data.code', 'CAT-RAW')
            ->assertJsonPath('data.name', 'Raw Materials');

        $this->assertDatabaseHas('categories', [
            'id' => $response->json('data.id'),
            'code' => 'CAT-RAW',
            'name' => 'Raw Materials',
            'description' => 'Production raw materials',
            'status' => 1,
        ]);

        $this->postJson('/api/exim/master/categories', [
            'code' => 'CAT-RAW',
            'name' => 'Other Raw Materials',
        ])->assertUnprocessable()
            ->assertJsonValidationErrors(['code']);
    }
}
