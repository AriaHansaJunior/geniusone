<?php

namespace Tests\Feature;

use App\Models\System\Auth\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class EximStyleApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_exim_style_can_be_created_and_persisted(): void
    {
        $user = User::query()->create([
            'username' => 'style-test-user',
            'name' => 'Style Test User',
            'email' => 'style-test@example.test',
            'password' => 'test-password',
            'role' => User::ROLE_ADMIN,
            'status' => 1,
        ]);
        $this->actingAs($user, 'web');

        $response = $this->postJson('/api/exim/master/styles', [
            'code' => 'STY-INGOT',
            'name' => 'Lead Ingot',
            'description' => 'Primary ingot style',
            'status' => 'active',
        ]);

        $response->assertCreated()
            ->assertJsonPath('data.code', 'STY-INGOT')
            ->assertJsonPath('data.name', 'Lead Ingot')
            ->assertJsonPath('data.status', 'active');

        $this->assertDatabaseHas('styles', [
            'id' => $response->json('data.id'),
            'code' => 'STY-INGOT',
            'name' => 'Lead Ingot',
            'description' => 'Primary ingot style',
            'status' => 'active',
        ]);

        $this->postJson('/api/exim/master/styles', [
            'code' => 'STY-INGOT',
            'name' => 'Another Style',
        ])->assertUnprocessable()
            ->assertJsonValidationErrors(['code']);
    }
}
