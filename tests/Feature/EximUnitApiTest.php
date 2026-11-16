<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class EximUnitApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_exim_unit_can_be_created_and_persisted(): void
    {
        $response = $this->postJson('/api/exim/master/units', [
            'name' => 'Quality Assurance',
            'status' => 1,
        ]);

        $response->assertCreated()
            ->assertJsonPath('data.nama', 'Quality Assurance')
            ->assertJsonPath('data.name', 'Quality Assurance');

        $this->assertDatabaseHas('units', [
            'id' => $response->json('data.id'),
            'nama' => 'Quality Assurance',
            'status' => 1,
        ]);

        $this->postJson('/api/exim/master/units', [
            'name' => 'Quality Assurance',
        ])->assertUnprocessable()
            ->assertJsonValidationErrors(['nama']);
    }
}
