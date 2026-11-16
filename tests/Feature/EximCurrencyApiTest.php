<?php

namespace Tests\Feature;

use App\Models\System\Auth\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class EximCurrencyApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_currency_code_only_creates_valuta_and_currency_records(): void
    {
        $user = User::query()->create([
            'username' => 'currency-test-user',
            'name' => 'Currency Test User',
            'email' => 'currency-test@example.test',
            'password' => 'test-password',
            'role' => User::ROLE_ADMIN,
            'status' => 1,
        ]);
        $this->actingAs($user, 'web');

        $response = $this->postJson('/api/procurement/master/currencies', [
            'code' => 'usd',
        ]);

        $response->assertCreated()
            ->assertJsonPath('data.code', 'USD')
            ->assertJsonPath('data.name', 'USD')
            ->assertJsonPath('data.symbol', 'USD')
            ->assertJsonPath('data.sync_status', 'Synced');

        $this->assertDatabaseHas('valutas', [
            'id' => $response->json('data.id'),
            'code' => 'USD',
            'name' => 'USD',
            'symbol' => 'USD',
            'sync_status' => 'Synced',
        ]);

        $this->assertDatabaseHas('currencies', [
            'name' => 'USD',
            'status' => 1,
        ]);
    }
}
