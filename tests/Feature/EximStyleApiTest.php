<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class EximStyleApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_exim_style_can_be_created_and_persisted(): void
    {
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
