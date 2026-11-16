<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class EximCategoryApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_exim_category_can_be_created_and_persisted(): void
    {
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
