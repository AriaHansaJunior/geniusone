<?php

namespace Tests\Feature;

use App\Models\System\Auth\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class EximAccountApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_account_code_and_name_create_an_account_with_default_category(): void
    {
        $user = User::query()->create([
            'username' => 'account-test-user',
            'name' => 'Account Test User',
            'email' => 'account-test@example.test',
            'password' => 'test-password',
            'role' => User::ROLE_ADMIN,
            'status' => 1,
        ]);
        $this->actingAs($user, 'web');

        $response = $this->postJson('/api/exim/master/accounts', [
            'code' => '1101',
            'name' => 'CASH',
        ]);

        $response->assertCreated()
            ->assertJsonPath('data.code', '1101')
            ->assertJsonPath('data.name', 'CASH')
            ->assertJsonPath('data.category', 'Inventory')
            ->assertJsonPath('data.status', 'active');

        $this->assertDatabaseHas('accounts', [
            'id' => $response->json('data.id'),
            'code' => '1101',
            'name' => 'CASH',
            'category' => 'Inventory',
            'status' => 'active',
            'created_by' => $user->id,
            'updated_by' => $user->id,
        ]);

        $this->postJson('/api/exim/master/accounts', [
            'code' => '1101',
            'name' => 'DUPLICATE ACCOUNT',
        ])->assertUnprocessable()
            ->assertJsonValidationErrors(['code']);
    }
}
