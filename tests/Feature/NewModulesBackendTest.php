<?php

namespace Tests\Feature;

use App\Models\Master\Material\Style;
use App\Models\System\Auth\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class NewModulesBackendTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        // Seed a test user
        User::create([
            'username' => 'test.user',
            'name' => 'Test User',
            'email' => 'test@geniusone.com',
            'password' => Hash::make('secret123'),
            'role' => User::ROLE_ADMIN,
            'status' => 1,
        ]);
    }

    /**
     * Test Auth login, logout, and me endpoints.
     */
    public function test_auth_endpoints(): void
    {
        // 1. Valid login
        $loginRes = $this->postJson('/api/auth/login', [
            'username' => 'test.user',
            'password' => 'secret123',
        ]);
        $loginRes->assertStatus(200);
        $loginRes->assertJsonPath('status', 'success');
        $loginRes->assertJsonStructure(['data' => ['token', 'user']]);

        // 2. Invalid password
        $badRes = $this->postJson('/api/auth/login', [
            'username' => 'test.user',
            'password' => 'wrongpass',
        ]);
        $badRes->assertStatus(401);

        // 3. Me endpoint
        $meRes = $this->getJson('/api/auth/me');
        $meRes->assertStatus(200);
        $meRes->assertJsonPath('data.username', 'test.user');

        // 4. Logout endpoint
        $logoutRes = $this->postJson('/api/auth/logout');
        $logoutRes->assertStatus(200);
    }

    /**
     * Test User profile show and update.
     */
    public function test_user_profile_endpoints(): void
    {
        $showRes = $this->getJson('/api/user/profile');
        $showRes->assertStatus(200);
        $showRes->assertJsonPath('data.username', 'test.user');

        $updateRes = $this->postJson('/api/user/profile', [
            'name' => 'Updated User Name',
            'email' => 'updated@geniusone.com',
        ]);
        $updateRes->assertStatus(200);
        $updateRes->assertJsonPath('data.name', 'Updated User Name');
        $this->assertDatabaseHas('users', ['email' => 'updated@geniusone.com']);
    }

    /**
     * Test Style bulk CSV/XLSX import and template.
     */
    public function test_style_import_endpoints(): void
    {
        // 1. Download template
        $templateRes = $this->get('/api/exim/master/styles/template');
        $templateRes->assertStatus(200);
        $this->assertStringContainsString('text/csv', $templateRes->headers->get('content-type'));

        // 2. Import parsed JSON rows
        $importRes = $this->postJson('/api/exim/master/styles/import', [
            'rows' => [
                ['code' => 'TEST-STY-01', 'name' => 'Imported Style 01', 'description' => 'Test Desc 1', 'status' => 1],
                ['code' => 'TEST-STY-02', 'name' => 'Imported Style 02', 'description' => 'Test Desc 2', 'status' => 1],
            ],
        ]);
        $importRes->assertStatus(200);
        $importRes->assertJsonPath('status', 'success');
        $importRes->assertJsonPath('data.imported_count', 2);
        $this->assertDatabaseHas('styles', ['code' => 'TEST-STY-01']);
    }

    /**
     * Test Warehouse Stock Card and Stock Item reports.
     */
    public function test_warehouse_reports_endpoints(): void
    {
        $stockCardRes = $this->getJson('/api/warehouse/reports/stock-card');
        $stockCardRes->assertStatus(200);
        $stockCardRes->assertJsonStructure(['status', 'data' => ['summary', 'movements']]);

        $stockItemRes = $this->getJson('/api/warehouse/reports/stock-item');
        $stockItemRes->assertStatus(200);
        $stockItemRes->assertJsonStructure(['status', 'data', 'meta']);
    }

    /**
     * Test Warehouse Request Material API.
     */
    public function test_request_material_endpoints(): void
    {
        // 1. Index
        $indexRes = $this->getJson('/api/warehouse/request-materials');
        $indexRes->assertStatus(200);
        $indexRes->assertJsonStructure(['status', 'data', 'meta']);

        // 2. Store new request
        $storeRes = $this->postJson('/api/warehouse/request-materials', [
            'requestDate' => '2026-10-20',
            'department' => 'Cutting Department',
            'typeOfRequest' => 'Production Issue',
            'customer' => 'PT Test Apparel',
            'items' => [
                [
                    'itemCode' => '60.154.300.999',
                    'itemName' => 'Test Fabric Item',
                    'unit' => 'KG',
                    'requestQty' => 50,
                ],
            ],
        ]);
        $storeRes->assertStatus(201);
        $createdId = $storeRes->json('data.id');
        $this->assertNotEmpty($createdId);

        // 3. Show
        $showRes = $this->getJson("/api/warehouse/request-materials/{$createdId}");
        $showRes->assertStatus(200);
        $showRes->assertJsonPath('data.department', 'Cutting Department');

        // 4. Approve
        $approveRes = $this->postJson("/api/warehouse/request-materials/{$createdId}/approve");
        $approveRes->assertStatus(200);
        $approveRes->assertJsonPath('data.approval', 'Approved 1');
    }

    /**
     * Test Dashboard Exchange Rates endpoint.
     */
    public function test_dashboard_exchange_rates(): void
    {
        $ratesRes = $this->getJson('/api/dashboard/exchange-rates');
        $ratesRes->assertStatus(200);
        $ratesRes->assertJsonStructure(['status', 'data', 'meta']);
        $this->assertGreaterThan(0, count($ratesRes->json('data')));
    }
}
