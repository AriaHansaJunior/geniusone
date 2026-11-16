<?php

namespace Tests\Feature;

use App\Models\System\Auth\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class WarehouseDestinationLocationApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_destination_location_is_created_with_only_form_fields(): void
    {
        $user = User::query()->create([
            'username' => 'destination-location-test',
            'name' => 'Destination Location Test',
            'email' => 'destination-location-test@example.test',
            'password' => Hash::make('test-password'),
            'role' => User::ROLE_ADMIN,
            'status' => 1,
        ]);

        $response = $this->actingAs($user, 'web')->postJson('/api/warehouse/master/destination-locations', [
            'name' => 'Furnace Charging Deck',
            'description' => 'Material delivery point for the furnace.',
            'status' => 1,
        ]);

        $response->assertCreated()
            ->assertJsonPath('data.name', 'Furnace Charging Deck')
            ->assertJsonPath('data.locationType', 'Production Area')
            ->assertJsonPath('data.pic', '');

        $this->assertNotEmpty($response->json('data.code'));
        $this->assertDatabaseHas('destination_location', [
            'id' => $response->json('data.id'),
            'name' => 'Furnace Charging Deck',
            'location_type' => 'Production Area',
            'pic' => null,
            'description' => 'Material delivery point for the furnace.',
            'status' => 1,
            'created_by' => $user->id,
        ]);
    }
}
