<?php

namespace Tests\Feature;

use App\Models\System\Auth\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class ModularApiTest extends TestCase
{
    use RefreshDatabase;

    /**
     * Test Procurement Master APIs.
     */
    public function test_procurement_master_apis(): void
    {
        $user = User::query()->create([
            'username' => 'modular-proc-user',
            'name' => 'Modular Proc User',
            'email' => 'modular-proc@example.test',
            'password' => 'test-password',
            'role' => User::ROLE_ADMIN,
            'status' => 1,
        ]);
        $this->actingAs($user, 'web');

        $endpoints = [
            '/api/procurement/master/suppliers',
            '/api/procurement/master/payment-terms',
            '/api/procurement/master/purchase-categories',
            '/api/procurement/master/delivery-terms',
            '/api/procurement/master/additional-costs',
            '/api/procurement/master/pph',
        ];

        foreach ($endpoints as $endpoint) {
            $response = $this->getJson($endpoint);
            $response->assertStatus(200);
            $response->assertJsonStructure(['data', 'meta']);
        }
    }

    public function test_supplier_can_be_created_and_persisted_individually(): void
    {
        $user = User::query()->create([
            'username' => 'supplier-test-user',
            'name' => 'Supplier Test User',
            'email' => 'supplier-test@example.test',
            'password' => 'test-password',
            'role' => User::ROLE_ADMIN,
            'status' => 1,
        ]);
        $this->actingAs($user);

        $referenceIds = [];
        foreach ([
            'countries' => 'Test Country',
            'payment_terms' => 'Test Payment Term',
            'payment_methods' => 'Test Payment Method',
            'rafaksi_types' => 'Test Rafaksi Type',
            'currencies' => 'Test Currency',
            'ports' => 'Test Port',
        ] as $table => $name) {
            $referenceIds[$table] = DB::table($table)->insertGetId([
                'name' => $name,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }

        $response = $this->postJson('/api/procurement/master/suppliers', [
            'name' => 'Individual Supplier',
            'countries_id' => $referenceIds['countries'],
            'payment_terms_id' => $referenceIds['payment_terms'],
            'payment_methods_id' => $referenceIds['payment_methods'],
            'rafaksi_types_id' => $referenceIds['rafaksi_types'],
            'currencies_id' => $referenceIds['currencies'],
            'ports_id' => $referenceIds['ports'],
        ]);

        $response->assertCreated()
            ->assertJsonPath('data.name', 'Individual Supplier')
            ->assertJsonPath('data.code', 'SUP.0001');

        $this->assertDatabaseHas('supliers', [
            'id' => $response->json('data.id'),
            'name' => 'Individual Supplier',
            'code' => 'SUP.0001',
            'created_by' => $user->id,
        ]);
    }

    public function test_payment_term_can_be_created_and_persisted_individually(): void
    {
        $user = User::query()->create([
            'username' => 'payment-term-user',
            'name' => 'Payment Term User',
            'email' => 'payment-term@example.test',
            'password' => 'test-password',
            'role' => User::ROLE_ADMIN,
            'status' => 1,
        ]);
        $this->actingAs($user);

        $response = $this->postJson('/api/procurement/master/payment-terms', [
            'name' => 'Net 60 Days',
            'status' => 1,
        ]);

        $response->assertCreated()
            ->assertJsonPath('data.name', 'Net 60 Days')
            ->assertJsonPath('data.status', 1);

        $this->assertDatabaseHas('payment_terms', [
            'id' => $response->json('data.id'),
            'name' => 'Net 60 Days',
            'status' => 1,
        ]);

        // Duplicate name validation check
        $duplicateResponse = $this->postJson('/api/procurement/master/payment-terms', [
            'name' => 'Net 60 Days',
            'status' => 1,
        ]);
        $duplicateResponse->assertStatus(422)
            ->assertJsonValidationErrors(['name']);
    }

    public function test_delivery_term_can_be_created_and_persisted_individually(): void
    {
        $user = User::query()->create([
            'username' => 'delivery-term-user',
            'name' => 'Delivery Term User',
            'email' => 'delivery-term@example.test',
            'password' => 'test-password',
            'role' => User::ROLE_ADMIN,
            'status' => 1,
        ]);
        $this->actingAs($user);

        $response = $this->postJson('/api/procurement/master/delivery-terms', [
            'name' => 'FOB Destination',
            'status' => 1,
        ]);

        $response->assertCreated()
            ->assertJsonPath('data.name', 'FOB Destination')
            ->assertJsonPath('data.status', 1);

        $this->assertDatabaseHas('delivery_terms', [
            'id' => $response->json('data.id'),
            'name' => 'FOB Destination',
            'status' => 1,
        ]);

        // Duplicate name validation check
        $duplicateResponse = $this->postJson('/api/procurement/master/delivery-terms', [
            'name' => 'FOB Destination',
            'status' => 1,
        ]);
        $duplicateResponse->assertStatus(422)
            ->assertJsonValidationErrors(['name']);
    }

    public function test_additional_cost_can_be_created_and_persisted_individually(): void
    {
        $user = User::query()->create([
            'username' => 'additional-cost-user',
            'name' => 'Additional Cost User',
            'email' => 'additional-cost@example.test',
            'password' => 'test-password',
            'role' => User::ROLE_ADMIN,
            'status' => 1,
        ]);
        $this->actingAs($user);

        $response = $this->postJson('/api/procurement/master/additional-costs', [
            'code' => 'AC-001',
            'name' => 'Handling Fee',
            'status' => 1,
        ]);

        $response->assertCreated()
            ->assertJsonPath('data.code', 'AC-001')
            ->assertJsonPath('data.name', 'Handling Fee')
            ->assertJsonPath('data.status', 1);

        $this->assertDatabaseHas('additional_cost_types', [
            'id' => $response->json('data.id'),
            'code' => 'AC-001',
            'name' => 'Handling Fee',
            'status' => 1,
        ]);

        // Duplicate code validation check
        $duplicateCodeResponse = $this->postJson('/api/procurement/master/additional-costs', [
            'code' => 'AC-001',
            'name' => 'Another Handling Fee',
            'status' => 1,
        ]);
        $duplicateCodeResponse->assertStatus(422)
            ->assertJsonValidationErrors(['code']);

        // Duplicate name validation check
        $duplicateNameResponse = $this->postJson('/api/procurement/master/additional-costs', [
            'code' => 'AC-002',
            'name' => 'Handling Fee',
            'status' => 1,
        ]);
        $duplicateNameResponse->assertStatus(422)
            ->assertJsonValidationErrors(['name']);
    }

    public function test_pph_can_be_created_and_persisted_individually(): void
    {
        $user = User::query()->create([
            'username' => 'pph-test-user',
            'name' => 'PPH Test User',
            'email' => 'pph-test@example.test',
            'password' => 'test-password',
            'role' => User::ROLE_ADMIN,
            'status' => 1,
        ]);
        $this->actingAs($user);

        // Ensure a pph_type exists
        $pphTypeId = DB::table('pph_type')->insertGetId([
            'nama' => 'PPh Pasal 21 Test',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        // Check pph-types endpoint
        $typesResponse = $this->getJson('/api/procurement/master/pph-types');
        $typesResponse->assertStatus(200)
            ->assertJsonPath('status', 'success');

        // Store new PPH
        $response = $this->postJson('/api/procurement/master/pph', [
            'name' => 'PPh 21 Pegawai Tetap',
            'value' => 5.0,
            'deduction' => 'yes',
            'pph_type_id' => $pphTypeId,
            'status' => 'active',
        ]);

        $response->assertCreated()
            ->assertJsonPath('data.name', 'PPh 21 Pegawai Tetap')
            ->assertJsonPath('data.value', 5)
            ->assertJsonPath('data.pph_type_id', $pphTypeId);

        $this->assertDatabaseHas('pph', [
            'id' => $response->json('data.id'),
            'name' => 'PPh 21 Pegawai Tetap',
            'value' => 5.0,
            'pph_type_id' => $pphTypeId,
            'deduction' => 'yes',
            'status' => 'active',
        ]);

        // Duplicate name validation check
        $duplicateResponse = $this->postJson('/api/procurement/master/pph', [
            'name' => 'PPh 21 Pegawai Tetap',
            'value' => 5.0,
            'pph_type_id' => $pphTypeId,
        ]);
        $duplicateResponse->assertStatus(422)
            ->assertJsonValidationErrors(['name']);
    }

    /**
     * Test Rafaksi Type can be created and persisted individually.
     */
    public function test_rafaksi_type_can_be_created_and_persisted_individually(): void
    {
        $user = User::query()->create([
            'username' => 'rafaksi-type-user',
            'name'     => 'Rafaksi Type User',
            'email'    => 'rafaksi-type@example.test',
            'password' => 'test-password',
            'role'     => User::ROLE_ADMIN,
            'status'   => 1,
        ]);
        $this->actingAs($user);

        $response = $this->postJson('/api/procurement/master/rafaksi-types', [
            'code'        => 'RFK-001',
            'name'        => 'Rafaksi Berat',
            'description' => 'Deduction based on weight',
            'status'      => 1,
        ]);

        $response->assertCreated()
            ->assertJsonPath('data.name', 'Rafaksi Berat')
            ->assertJsonPath('data.code', 'RFK-001');

        $this->assertDatabaseHas('rafaksi_types', [
            'id'         => $response->json('data.id'),
            'name'       => 'Rafaksi Berat',
            'code'       => 'RFK-001',
            'created_by' => $user->id,
        ]);

        // Duplicate name validation check
        $duplicateResponse = $this->postJson('/api/procurement/master/rafaksi-types', [
            'code'   => 'RFK-002',
            'name'   => 'Rafaksi Berat',
            'status' => 1,
        ]);
        $duplicateResponse->assertStatus(422)
            ->assertJsonValidationErrors(['name']);
    }

    /**
     * Test Exim Master APIs.
     */
    public function test_exim_master_apis(): void
    {
        $user = User::query()->create([
            'username' => 'modular-exim-user',
            'name' => 'Modular Exim User',
            'email' => 'modular-exim@example.test',
            'password' => 'test-password',
            'role' => User::ROLE_ADMIN,
            'status' => 1,
        ]);
        $this->actingAs($user, 'web');

        $endpoints = [
            '/api/exim/master/units',
            '/api/exim/master/unit-references',
            '/api/exim/master/items',
            '/api/exim/master/brands',
            '/api/exim/master/classifications',
            '/api/exim/master/departments',
            '/api/exim/master/facilities',
            '/api/exim/master/hs-codes',
            '/api/exim/master/categories',
            '/api/exim/master/styles',
            '/api/exim/master/colours',
        ];

        foreach ($endpoints as $endpoint) {
            $response = $this->getJson($endpoint);
            $response->assertStatus(200);
            $response->assertJsonStructure(['data']);
        }
    }

    /**
     * Test Exim Operations & Warehouse Master APIs.
     */
    public function test_exim_operations_and_warehouse_master_apis(): void
    {
        $user = User::query()->create([
            'username' => 'modular-wh-user',
            'name' => 'Modular WH User',
            'email' => 'modular-wh@example.test',
            'password' => 'test-password',
            'role' => User::ROLE_ADMIN,
            'status' => 1,
        ]);
        $this->actingAs($user, 'web');

        $endpoints = [
            '/api/exim/operations/returns',
            '/api/exim/operations/document-histories',
            '/api/warehouse/master/warehouses',
        ];

        foreach ($endpoints as $endpoint) {
            $response = $this->getJson($endpoint);
            $response->assertStatus(200);
            $response->assertJsonStructure(['data', 'meta']);
        }
    }

    /**
     * Test Core Transactional APIs (PR, PO, RN, BPB, Traceability).
     */
    public function test_core_transactional_apis(): void
    {
        $user = User::query()->create([
            'username' => 'modular-tx-user',
            'name' => 'Modular Tx User',
            'email' => 'modular-tx@example.test',
            'password' => 'test-password',
            'role' => User::ROLE_ADMIN,
            'status' => 1,
        ]);
        $this->actingAs($user, 'web');

        $endpoints = [
            '/api/procurement/pr',
            '/api/procurement/po',
            '/api/warehouse/bpb',
            '/api/warehouse/rn',
            '/api/reporting/traceability',
        ];

        foreach ($endpoints as $endpoint) {
            $response = $this->getJson($endpoint);
            $response->assertStatus(200);
        }
    }
}
