<?php

namespace Tests\Feature;

use App\Models\Common\ExchangeRate;
use App\Models\Master\Customs\Facility;
use App\Models\Master\Finance\Account;
use App\Models\Master\Finance\Currency;
use App\Models\Master\Finance\Valuta;
use App\Models\Master\Material\Classification;
use App\Models\Master\Material\Item;
use App\Models\Master\Material\ItemType;
use App\Models\Master\Material\Style;
use App\Models\Master\Material\UnitOfMeasurement;
use App\Models\Master\Organization\Department;
use App\Models\Master\Organization\ReportingType;
use App\Models\Warehouse\Facility\Warehouse;
use App\Models\Warehouse\Facility\WarehouseType;
use App\Models\Warehouse\Inventory\WarehouseStock;
use App\Models\Warehouse\RequestMaterial\TypeOfRequest;
use App\Models\System\Auth\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class NewModulesBackendTest extends TestCase
{
    use RefreshDatabase;

    protected User $user;

    protected function setUp(): void
    {
        parent::setUp();

        // Seed a test user
        $this->user = User::create([
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
        $unauthRes = $this->getJson('/api/user/profile');
        $unauthRes->assertStatus(401);

        $showRes = $this->actingAs($this->user, 'web')->getJson('/api/user/profile');
        $showRes->assertStatus(200);
        $showRes->assertJsonPath('data.username', 'test.user');

        $updateRes = $this->actingAs($this->user, 'web')->postJson('/api/user/profile', [
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
        $dept = Department::firstOrCreate(['name' => 'Cutting Department'], ['status' => 1]);
        $type = TypeOfRequest::firstOrCreate(['name' => 'Production Issue'], ['status' => 1]);
        $uom = UnitOfMeasurement::firstOrCreate(['name' => 'KG'], ['status' => 1]);
        $facility = Facility::firstOrCreate(['name' => 'FASILITAS'], ['status' => 1]);
        $repType = ReportingType::firstOrCreate(['name' => 'General Report']);
        $account = Account::firstOrCreate(['code' => '115.01'], ['name' => 'General Inventory Account']);
        $classification = Classification::firstOrCreate(
            ['code' => 'CLS-RM-TEST'],
            ['name' => 'Test RM Class', 'reporting_types_id' => $repType->id, 'accounts_id' => $account->id]
        );
        $itemType = ItemType::firstOrCreate(['name' => 'Raw Material']);
        $whType = WarehouseType::firstOrCreate(['name' => 'Main Warehouse'], ['status' => 1]);
        $wh = Warehouse::create([
            'name' => 'Gudang Test',
            'code' => 'WH-TEST',
            'warehouse_types_id' => $whType->id,
            'status' => 1,
        ]);
        $item = Item::create([
            'code' => '60.154.300.999',
            'name' => 'Test Fabric Item',
            'classifications_id' => $classification->id,
            'facilities_id' => $facility->id,
            'units_of_measurements_id' => $uom->id,
            'item_types_id' => $itemType->id,
            'stock' => 100,
            'status' => 1,
        ]);
        WarehouseStock::create([
            'items_id' => $item->id,
            'warehouses_id' => $wh->id,
            'quantity' => 100,
            'allocated_quantity' => 0,
            'available_quantity' => 100,
            'location_type' => 'Warehouse',
        ]);

        // 1. Index
        $indexRes = $this->actingAs($this->user, 'web')->getJson('/api/warehouse/request-materials');
        $indexRes->assertStatus(200);
        $indexRes->assertJsonStructure(['status', 'data', 'meta']);

        // 2. Store new request
        $storeRes = $this->actingAs($this->user, 'web')->postJson('/api/warehouse/request-materials', [
            'requestDate' => '2026-10-20',
            'departments_id' => $dept->id,
            'warehouses_id' => $wh->id,
            'type_of_request_id' => $type->id,
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
        $showRes = $this->actingAs($this->user, 'web')->getJson("/api/warehouse/request-materials/{$createdId}");
        $showRes->assertStatus(200);
        $showRes->assertJsonPath('data.department', 'Cutting Department');

        // 4. Approve (Stage 1 -> Waiting for Approve 2, Stage 2 -> Approved)
        $approveRes = $this->actingAs($this->user, 'web')->postJson("/api/warehouse/request-materials/{$createdId}/approve");
        $approveRes->assertStatus(200);
        $approveRes->assertJsonPath('data.approval', 'Waiting for Approve 2');

        $approve2Res = $this->actingAs($this->user, 'web')->postJson("/api/warehouse/request-materials/{$createdId}/approve", ['tier' => 2]);
        $approve2Res->assertStatus(200);
        $approve2Res->assertJsonPath('data.approval', 'Approved');
    }

    /**
     * Test Dashboard Exchange Rates endpoint.
     */
    public function test_dashboard_exchange_rates(): void
    {
        $valuta = Valuta::firstOrCreate(['code' => 'USD'], ['name' => 'US Dollar']);
        $currency = Currency::firstOrCreate(['name' => 'USD'], ['symbol' => '$', 'status' => 1]);
        ExchangeRate::create([
            'currencies_id' => $currency->id,
            'rate_date' => now()->toDateString(),
            'rate_type' => 'KURS TENGAH BI',
            'buy_rate' => 15700,
            'sell_rate' => 15900,
            'middle_rate' => 15800,
            'source' => 'Bank Indonesia',
            'created_by' => $this->user->id,
        ]);

        $ratesRes = $this->getJson('/api/dashboard/exchange-rates');
        $ratesRes->assertStatus(200);
        $ratesRes->assertJsonStructure(['status', 'data', 'meta']);
        $this->assertGreaterThan(0, count($ratesRes->json('data')));
    }
}
