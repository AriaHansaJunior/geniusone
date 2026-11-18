<?php

namespace Tests\Feature;

use App\Models\Master\Customs\Facility;
use App\Models\Master\Finance\Account;
use App\Models\Master\Material\Classification;
use App\Models\Master\Material\Item;
use App\Models\Master\Material\ItemType;
use App\Models\Master\Material\UnitOfMeasurement;
use App\Models\Master\Organization\Department;
use App\Models\Master\Organization\ReportingType;
use App\Models\System\Auth\User;
use App\Models\Warehouse\Facility\Warehouse;
use App\Models\Warehouse\Facility\WarehouseType;
use App\Models\Warehouse\RequestMaterial\RequestMaterial;
use App\Models\Warehouse\RequestMaterial\RequestMaterialItem;
use App\Models\Warehouse\RequestMaterial\TypeOfRequest;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class RouteConsistencyTest extends TestCase
{
    use RefreshDatabase;

    /**
     * Test key application routes return 200 OK.
     */
    public function test_key_application_routes_resolve_successfully(): void
    {
        $routes = [
            '/',
            '/dashboard',
            '/procurement/purchase-master/supplier',
            '/procurement/purchase-master/payment-term',
            '/procurement/purchase-master/purchase-category',
            '/procurement/purchase-master/delivery-terms',
            '/procurement/purchase-master/additional-costs',
            '/procurement/purchase-master/pph',
            '/procurement/transactions/purchase-requisition',
            '/procurement/transactions/purchase-requisition/create',
            '/procurement/transactions/purchase-order',
            '/procurement/transactions/purchase-order/create',
            '/procurement/reports/report-pr-po',
            '/procurement/purchase-master/rafaksi-type',
            '/procurement/purchase-master/job-number',
            '/exim/master/unit',
            '/exim/master/satuan',
            '/exim/master/item',
            '/exim/master/brand',
            '/exim/master/facility',
            '/exim/master/hs',
            '/exim/master/category',
            '/exim/master/style',
            '/exim/master/colour',
            '/exim/master/country',
            '/exim/master/currency',
            '/exim/master/account',
            '/exim/receive-note',
            '/exim/receive-note-return',
            '/exim/document-history',
            '/warehouse/master/warehouse',
        ];

        foreach ($routes as $route) {
            $response = $this->get($route);
            $response->assertStatus(200);
        }
    }

    /**
     * Test unknown route returns 404 Not Found state.
     */
    public function test_unknown_route_returns_404(): void
    {
        $response = $this->get('/non-existent-route-for-testing-404');
        $response->assertStatus(404);
        $response->assertSee('data-initial-page="not-found"', false);
    }

    /**
     * Test newly added master data and transaction create routes render with exact initial-page attribute.
     */
    public function test_new_master_and_transaction_routes_resolve_with_correct_page_attribute(): void
    {
        $map = [
            '/exim/master/country' => 'country',
            '/exim/country' => 'country',
            '/exim/master/currency' => 'currency',
            '/exim/currency' => 'currency',
            '/exim/master/account' => 'account',
            '/exim/account' => 'account',
            '/procurement/purchase-master/job-number' => 'job-number',
            '/procurement/job-number' => 'job-number',
            '/procurement/purchase-master/rafaksi-type' => 'rafaksi-type',
            '/procurement/rafaksi-type' => 'rafaksi-type',
            '/procurement/transactions/purchase-requisition/create' => 'pr-create',
            '/pr/create' => 'pr-create',
            '/procurement/transactions/purchase-order/create' => 'po-create',
            '/po/create' => 'po-create',
        ];

        foreach ($map as $url => $expectedPage) {
            $response = $this->get($url);
            $response->assertStatus(200);
            $response->assertSee('data-initial-page="'.$expectedPage.'"', false);
        }
    }

    /**
     * Test dedicated create and edit web routes for standardized master modules and Transfer Stock Return.
     */
    public function test_dedicated_create_and_edit_routes_resolve_with_exact_page_and_code(): void
    {
        $createRoutes = [
            '/procurement/purchase-master/rafaksi-type/create' => 'rafaksi-type-create',
            '/procurement/purchase-master/rafaksi-type/add' => 'rafaksi-type-create',
            '/procurement/rafaksi-type/create' => 'rafaksi-type-create',
            '/procurement/purchase-master/job-number/create' => 'job-number-create',
            '/procurement/purchase-master/job-number/add' => 'job-number-create',
            '/procurement/job-number/create' => 'job-number-create',
            '/exim/master/job-number/create' => 'job-number-create',
            '/exim/master/country/create' => 'country-create',
            '/exim/master/country/add' => 'country-create',
            '/exim/country/create' => 'country-create',
            '/exim/master/currency/create' => 'currency-create',
            '/exim/master/currency/add' => 'currency-create',
            '/exim/currency/create' => 'currency-create',
            '/procurement/purchase-master/currency/create' => 'currency-create',
            '/exim/master/account/create' => 'account-create',
            '/exim/master/account/add' => 'account-create',
            '/exim/account/create' => 'account-create',
            '/procurement/purchase-master/account/create' => 'account-create',
            '/warehouse/incoming/transfer-stock-return/create' => 'transfer-stock-return-create',
            '/warehouse/incoming/transfer-stock-return/add' => 'transfer-stock-return-create',
            '/warehouse/transfer-stock-return/create' => 'transfer-stock-return-create',
        ];

        foreach ($createRoutes as $url => $expectedPage) {
            $response = $this->get($url);
            $response->assertStatus(200);
            $response->assertSee('data-initial-page="'.$expectedPage.'"', false);
        }

        $editAndDetailRoutes = [
            '/procurement/purchase-master/rafaksi-type/edit/42' => ['rafaksi-type-edit', '42'],
            '/procurement/rafaksi-type/edit/42' => ['rafaksi-type-edit', '42'],
            '/procurement/purchase-master/job-number/edit/15' => ['job-number-edit', '15'],
            '/exim/master/job-number/edit/15' => ['job-number-edit', '15'],
            '/exim/master/country/edit/7' => ['country-edit', '7'],
            '/exim/country/edit/7' => ['country-edit', '7'],
            '/exim/master/currency/edit/9' => ['currency-edit', '9'],
            '/procurement/purchase-master/currency/edit/9' => ['currency-edit', '9'],
            '/exim/master/account/edit/11' => ['account-edit', '11'],
            '/procurement/purchase-master/account/edit/11' => ['account-edit', '11'],
            '/warehouse/incoming/transfer-stock-return/edit/5' => ['transfer-stock-return-edit', '5'],
            '/warehouse/incoming/transfer-stock-return/edit/0001/TSR-IMLI/XI/2026' => ['transfer-stock-return-edit', '0001/TSR-IMLI/XI/2026'],
            '/warehouse/incoming/transfer-stock-return/detail/0001/TSR-IMLI/XI/2026' => ['transfer-stock-return-detail', '0001/TSR-IMLI/XI/2026'],
            '/warehouse/incoming/transfer-stock-return/0001/TSR-IMLI/XI/2026' => ['transfer-stock-return-detail', '0001/TSR-IMLI/XI/2026'],
        ];

        foreach ($editAndDetailRoutes as $url => [$expectedPage, $expectedCode]) {
            $response = $this->get($url);
            $response->assertStatus(200);
            $response->assertSee('data-initial-page="'.$expectedPage.'"', false);
            $response->assertSee('data-initial-code="'.$expectedCode.'"', false);
        }
    }

    /**
     * Test API write middleware enforces authentication and active account status.
     */
    public function test_write_routes_enforce_auth_and_active_middleware(): void
    {
        $this->postJson('/api/procurement/master/countries', ['code' => 'ID', 'name' => 'INDONESIA'])
            ->assertStatus(401);
        $this->patchJson('/api/procurement/master/countries/1/toggle-status')
            ->assertStatus(401);
        $this->postJson('/api/procurement/master/rafaksi-types', ['name' => 'MOISTURE'])
            ->assertStatus(401);
        $this->postJson('/api/procurement/master/currencies', ['code' => 'USD', 'name' => 'US Dollar'])
            ->assertStatus(401);
        $this->postJson('/api/procurement/master/job-numbers', ['code' => 'JOB-01', 'name' => 'Test Job'])
            ->assertStatus(401);
        $this->postJson('/api/exim/master/accounts', ['code' => '1101', 'name' => 'Cash'])
            ->assertStatus(401);
        $this->postJson('/api/warehouse/transfer-stock-returns', [])
            ->assertStatus(401);
        $this->postJson('/api/warehouse/transfer-stock-returns/1/approve', ['tier' => 1])
            ->assertStatus(401);

        $inactiveUser = User::create([
            'username' => 'inactive.user',
            'name' => 'Inactive User',
            'email' => 'inactive@geniusone.test',
            'password' => Hash::make('secret123'),
            'role' => User::ROLE_ADMIN,
            'status' => 0,
        ]);

        $this->actingAs($inactiveUser, 'web')
            ->postJson('/api/procurement/master/countries', ['code' => 'SG', 'name' => 'SINGAPORE'])
            ->assertStatus(403);
    }

    /**
     * Test authenticated CRUD persistence for Countries, Rafaksi Types, Currencies, Job Numbers, Accounts, and Transfer Stock Returns.
     */
    public function test_authenticated_master_and_tsr_crud_persistence(): void
    {
        $user = User::create([
            'username' => 'master.admin',
            'name' => 'Master Admin',
            'email' => 'master@geniusone.test',
            'password' => Hash::make('secret123'),
            'role' => User::ROLE_ADMIN,
            'status' => 1,
        ]);

        // 1. Country CRUD
        $countryRes = $this->actingAs($user, 'web')->postJson('/api/procurement/master/countries', [
            'code' => 'JP',
            'name' => 'JAPAN',
            'status' => 1,
        ])->assertStatus(201);
        $countryId = $countryRes->json('data.id');
        $this->actingAs($user, 'web')->putJson("/api/procurement/master/countries/{$countryId}", [
            'code' => 'JPN',
            'name' => 'JAPAN UPDATED',
            'status' => 1,
        ])->assertStatus(200);
        $this->actingAs($user, 'web')->patchJson("/api/procurement/master/countries/{$countryId}/toggle-status")
            ->assertStatus(200)
            ->assertJsonPath('data.status', 0);
        $this->actingAs($user, 'web')->deleteJson("/api/procurement/master/countries/{$countryId}")
            ->assertStatus(200);

        // 2. Rafaksi Type CRUD
        $rafaksiRes = $this->actingAs($user, 'web')->postJson('/api/procurement/master/rafaksi-types', [
            'code' => 'RFT-01',
            'name' => 'WATER CONTENT',
            'description' => 'Moisture deduction',
            'status' => 1,
        ])->assertStatus(201);
        $rafaksiId = $rafaksiRes->json('data.id');
        $this->actingAs($user, 'web')->putJson("/api/procurement/master/rafaksi-types/{$rafaksiId}", [
            'code' => 'RFT-01',
            'name' => 'WATER CONTENT V2',
            'description' => 'Updated deduction',
            'status' => 0,
        ])->assertStatus(200);
        $this->actingAs($user, 'web')->patchJson("/api/procurement/master/rafaksi-types/{$rafaksiId}/toggle-status")
            ->assertStatus(200);
        $this->actingAs($user, 'web')->deleteJson("/api/procurement/master/rafaksi-types/{$rafaksiId}")
            ->assertStatus(200);

        // 3. Currency CRUD
        $currencyRes = $this->actingAs($user, 'web')->postJson('/api/procurement/master/currencies', [
            'code' => 'eur',
            'name' => 'Euro',
            'symbol' => 'EUR',
            'sync_status' => 'Synced',
        ])->assertStatus(201);
        $currencyId = $currencyRes->json('data.id');
        $this->actingAs($user, 'web')->putJson("/api/procurement/master/currencies/{$currencyId}", [
            'code' => 'EUR',
            'name' => 'Eurozone Currency',
            'symbol' => '€',
            'sync_status' => 'Pending',
        ])->assertStatus(200);
        $this->actingAs($user, 'web')->deleteJson("/api/procurement/master/currencies/{$currencyId}")
            ->assertStatus(200);

        // 4. Job Number CRUD (including frontend-aligned field mapping)
        $maintenanceDepartment = Department::query()->create([
            'name' => 'MAINTENANCE',
            'status' => 1,
        ]);
        $technicalDepartment = Department::query()->create([
            'name' => 'TEKNIK',
            'status' => 1,
        ]);
        $jobRes = $this->actingAs($user, 'web')->postJson('/api/procurement/master/job-numbers', [
            'code' => 'JOB-2026-001',
            'name' => 'Furnace Overhaul',
            'departments_id' => $maintenanceDepartment->id,
            'status' => 1,
        ])->assertStatus(201);
        $jobId = $jobRes->json('data.id');
        $this->actingAs($user, 'web')->putJson("/api/procurement/master/job-numbers/{$jobId}", [
            'code' => 'JOB-2026-001',
            'description' => 'Furnace Overhaul Phase 2',
            'departments_id' => $technicalDepartment->id,
            'status' => 0,
        ])->assertStatus(200);
        $this->actingAs($user, 'web')->patchJson("/api/procurement/master/job-numbers/{$jobId}/toggle-status")
            ->assertStatus(200);
        $this->actingAs($user, 'web')->deleteJson("/api/procurement/master/job-numbers/{$jobId}")
            ->assertStatus(200);

        // 5. Account CRUD (string & boolean status normalization)
        $accountRes = $this->actingAs($user, 'web')->postJson('/api/exim/master/accounts', [
            'code' => '1102-01',
            'name' => 'Inventory Spareparts',
            'category' => 'Current Asset',
            'status' => 'active',
        ])->assertStatus(201);
        $accountId = $accountRes->json('data.id');
        $this->actingAs($user, 'web')->putJson("/api/exim/master/accounts/{$accountId}", [
            'code' => '1102-01',
            'name' => 'Inventory Spareparts Updated',
            'category' => 'Current Asset',
            'status' => 'inactive',
        ])->assertStatus(200)->assertJsonPath('data.status', 'inactive');
        $this->actingAs($user, 'web')->deleteJson("/api/exim/master/accounts/{$accountId}")
            ->assertStatus(200);

        // 6. Transfer Stock Return Store / Update / Show / Delete
        $facility = Facility::firstOrCreate(['name' => 'FASILITAS'], ['status' => 1]);
        $uom = UnitOfMeasurement::firstOrCreate(['name' => 'PCE'], ['status' => 1]);
        $repType = ReportingType::firstOrCreate(['name' => 'General Report']);
        $invAccount = Account::firstOrCreate(['code' => '115.01'], ['name' => 'Inventory Account']);
        $classification = Classification::firstOrCreate(
            ['code' => 'CLS-TSR'],
            ['name' => 'TSR Class', 'reporting_types_id' => $repType->id, 'accounts_id' => $invAccount->id]
        );
        $itemType = ItemType::firstOrCreate(['name' => 'Raw Material']);
        $whType = WarehouseType::firstOrCreate(['name' => 'Main Warehouse'], ['status' => 1]);
        $wh = Warehouse::create([
            'name' => 'Gudang TSR Test',
            'code' => 'WH-TSR-01',
            'warehouse_types_id' => $whType->id,
            'status' => 1,
        ]);
        $item = Item::create([
            'code' => 'ITM-TSR-01',
            'name' => 'TSR Test Item',
            'classifications_id' => $classification->id,
            'facilities_id' => $facility->id,
            'units_of_measurements_id' => $uom->id,
            'item_types_id' => $itemType->id,
            'stock' => 50,
            'status' => 1,
        ]);

        $tsrDept = Department::firstOrCreate(['name' => 'TSR Cutting Dept'], ['status' => 1]);
        $tsrReqType = TypeOfRequest::firstOrCreate(['name' => 'Production Issue'], ['status' => 1]);
        $sourceRm = RequestMaterial::create([
            'request_number' => 'REQ-WH-TSR-TEST-01',
            'departments_id' => $tsrDept->id,
            'warehouses_id' => $wh->id,
            'type_of_request_id' => $tsrReqType->id,
            'creator' => $user->id,
            'request_date' => '2026-11-15',
            'status' => 'Approved',
        ]);
        RequestMaterialItem::create([
            'request_material_id' => $sourceRm->id,
            'items_id' => $item->id,
            'request' => 15,
        ]);

        $tsrStoreRes = $this->actingAs($user, 'web')->postJson('/api/warehouse/transfer-stock-returns', [
            'request_material_id' => $sourceRm->id,
            'warehouses_id' => $wh->id,
            'production_code' => 'PRD-TEST-01',
            'job_number' => 'JOB-TSR-01',
            'return_date' => '2026-11-15',
            'note' => 'Excess return test',
            'items' => [
                [
                    'items_id' => $item->id,
                    'quantity' => 5,
                    'unit' => 'PCE',
                    'source_location' => 'Cutting Line',
                    'destination_location' => $wh->name,
                    'remark' => 'Good condition',
                ],
            ],
        ])->assertStatus(201);
        $tsrId = $tsrStoreRes->json('data.rawId');
        $tsrNumber = $tsrStoreRes->json('data.returnNumber');

        $this->getJson('/api/warehouse/transfer-stock-returns/'.urlencode((string) $tsrNumber))
            ->assertStatus(200);

        $this->actingAs($user, 'web')->putJson("/api/warehouse/transfer-stock-returns/{$tsrId}", [
            'warehouses_id' => $wh->id,
            'production_code' => 'PRD-TEST-02',
            'job_number' => 'JOB-TSR-02',
            'return_date' => '2026-11-15',
            'note' => 'Updated return note',
            'items' => [
                [
                    'items_id' => $item->id,
                    'quantity' => 8,
                    'unit' => 'PCE',
                    'source_location' => 'Cutting Line',
                    'destination_location' => $wh->name,
                    'remark' => 'Updated remark',
                ],
            ],
        ])->assertStatus(200);

        $this->actingAs($user, 'web')->deleteJson("/api/warehouse/transfer-stock-returns/{$tsrId}")
            ->assertStatus(200);
    }

    /**
     * Test Settings routes and isolated Default vs Modern theme routes resolve without overlap.
     */
    public function test_settings_and_dual_theme_routes_do_not_overlap(): void
    {
        $modernSettingsRoutes = [
            '/settings' => 'settings',
            '/settings/system-theme' => 'settings-system-theme',
            '/settings/edit-profile' => 'settings-edit-profile',
            '/settings/user-permissions' => 'settings-user-permissions',
            '/settings/audit-logs' => 'settings-audit-logs',
        ];

        foreach ($modernSettingsRoutes as $url => $expectedPage) {
            $res = $this->get($url);
            $res->assertStatus(200);
            $res->assertSee('data-initial-page="'.$expectedPage.'"', false);
            $res->assertSee('data-initial-theme="modern"', false);
        }

        $defaultThemeRoutes = [
            '/default' => 'dashboard',
            '/default/dashboard' => 'dashboard',
            '/default/settings' => 'settings',
            '/default/settings/system-theme' => 'settings-system-theme',
            '/default/settings/edit-profile' => 'settings-edit-profile',
            '/default/settings/user-permissions' => 'settings-user-permissions',
            '/default/settings/audit-logs' => 'settings-audit-logs',
            '/default/procurement/transactions/purchase-requisition' => 'default-route',
            '/default/procurement/transactions/purchase-order' => 'default-route',
            '/default/exim/receive-note' => 'default-route',
        ];

        foreach ($defaultThemeRoutes as $url => $expectedPage) {
            $res = $this->get($url);
            $res->assertStatus(200);
            $res->assertSee('data-initial-page="'.$expectedPage.'"', false);
            $res->assertSee('data-initial-theme="default"', false);
        }

        $modernDashboard = $this->get('/dashboard');
        $modernDashboard->assertStatus(200);
        $modernDashboard->assertSee('data-initial-theme="modern"', false);
    }
}
