<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class EximColourApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_exim_colour_can_be_created_and_persisted(): void
    {
        $response = $this->postJson('/api/exim/master/colours', [
            'code' => 'BLCK',
            'name' => 'Black',
            'status' => 1,
        ]);

        $response->assertCreated()
            ->assertJsonPath('data.code', 'BLCK')
            ->assertJsonPath('data.name', 'Black');

        $this->assertDatabaseHas('colours', [
            'id' => $response->json('data.id'),
            'code' => 'BLCK',
            'name' => 'Black',
            'grade' => '',
            'status' => 1,
        ]);

        $this->postJson('/api/exim/master/colours', [
            'code' => 'BLCK-2',
            'name' => 'Black',
        ])->assertUnprocessable()
            ->assertJsonValidationErrors(['name']);
    }
}
