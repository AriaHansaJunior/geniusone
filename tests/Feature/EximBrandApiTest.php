<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class EximBrandApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_exim_brand_can_be_created_and_persisted(): void
    {
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
