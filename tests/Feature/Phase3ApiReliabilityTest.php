<?php

namespace Tests\Feature;

use App\Models\Master\Customs\HsCode;
use App\Models\Master\Customs\TypeRateBm;
use App\Models\Master\Customs\TypeRateCukai;
use App\Models\Master\Material\ItemType;
use App\Models\System\Auth\User;
use App\Support\SimpleXlsxZip;
use App\Support\SpreadsheetParser;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Tests\TestCase;

class Phase3ApiReliabilityTest extends TestCase
{
    use RefreshDatabase;

    private function createAdminUser(): User
    {
        return User::create([
            'name' => 'Phase 3 Admin',
            'username' => 'phase3admin_' . uniqid(),
            'email' => 'phase3_' . uniqid() . '@geniusone.test',
            'password' => bcrypt('secret123'),
            'role' => User::ROLE_ADMIN,
            'status' => 1,
        ]);
    }

    public function test_reference_master_crud_and_status_toggle_across_domain_routes(): void
    {
        $user = $this->createAdminUser();
        $this->actingAs($user, 'web');

        // 1. PPH Type (uses 'nama' column and has no status column)
        $pphRes = $this->postJson('/api/procurement/master/pph-types', [
            'name' => 'PPh 23 Jasa Teknik',
        ])->assertCreated();
        $pphId = $pphRes->json('data.id');
        $this->assertDatabaseHas('pph_type', ['id' => $pphId, 'nama' => 'PPh 23 Jasa Teknik']);

        // Duplicate name rejected cleanly (422)
        $this->postJson('/api/procurement/master/pph-types', [
            'name' => 'pph 23 jasa teknik',
        ])->assertStatus(422);

        // Toggle unsupported cleanly returns 422
        $this->patchJson("/api/procurement/master/pph-types/{$pphId}/toggle-status")
            ->assertStatus(422);

        // 2. Item Type (string 'active' / 'inactive' status)
        $itemTypeRes = $this->postJson('/api/exim/master/item-types', [
            'name' => 'Packaging Film',
            'status' => true,
        ])->assertCreated();
        $itemTypeId = $itemTypeRes->json('data.id');
        $this->assertSame('active', ItemType::findOrFail($itemTypeId)->status);

        $this->patchJson("/api/exim/master/item-types/{$itemTypeId}/toggle-status")
            ->assertOk()
            ->assertJsonPath('data.status', false);
        $this->assertSame('inactive', ItemType::findOrFail($itemTypeId)->status);

        // 3. Group Scrap Item (requires code + name)
        $this->postJson('/api/exim/master/group-scrap-items', [
            'name' => 'No Code Provided',
        ])->assertStatus(422);

        $scrapRes = $this->postJson('/api/exim/master/group-scrap-items', [
            'code' => 'SCR-01',
            'name' => 'Plastic Trim Scrap',
            'status' => true,
        ])->assertCreated();
        $scrapId = $scrapRes->json('data.id');
        $this->patchJson("/api/exim/master/group-scrap-items/{$scrapId}/toggle-status")
            ->assertOk()
            ->assertJsonPath('data.status', false);

        // 4. Other domain endpoints + canonical reference endpoints
        $bmId = $this->postJson('/api/exim/master/types-rates-bm', ['name' => 'Ad Valorem Test'])->assertCreated()->json('data.id');
        $this->patchJson("/api/exim/master/types-rates-bm/{$bmId}/toggle-status")->assertOk()->assertJsonPath('data.status', false);

        $cukaiId = $this->postJson('/api/exim/master/types-rates-cukai', ['name' => 'Spesifik Test'])->assertCreated()->json('data.id');
        $this->patchJson("/api/exim/master/types-rates-cukai/{$cukaiId}/toggle-status")->assertOk()->assertJsonPath('data.status', false);

        $crId = $this->postJson('/api/exim/master/custom-reports', ['name' => 'BC 2.3 Test'])->assertCreated()->json('data.id');
        $this->patchJson("/api/exim/master/custom-reports/{$crId}/toggle-status")->assertOk()->assertJsonPath('data.status', false);

        $specId = $this->postJson('/api/exim/master/specifications', ['name' => 'Food Grade PE'])->assertCreated()->json('data.id');
        $this->patchJson("/api/exim/master/specifications/{$specId}/toggle-status")->assertOk()->assertJsonPath('data.status', false);

        $wtId = $this->postJson('/api/warehouse/master/warehouse-types', ['name' => 'Cold Storage'])->assertCreated()->json('data.id');
        $this->patchJson("/api/warehouse/master/warehouse-types/{$wtId}/toggle-status")->assertOk()->assertJsonPath('data.status', false);
    }

    public function test_hs_code_status_toggle_persists(): void
    {
        $user = $this->createAdminUser();
        $bm = TypeRateBm::create(['name' => 'Persentase', 'status' => 1]);
        $cukai = TypeRateCukai::create(['name' => 'None', 'status' => 1]);

        $hs = HsCode::create([
            'name' => '3920.10.90',
            'description' => 'Film polymers of ethylene',
            'rates_bm' => 5,
            'rates_cukai' => 0,
            'rates_ppn' => 11,
            'rates_pph' => 2.5,
            'rates_ppnbm' => 0,
            'types_rates_bm_id' => $bm->id,
            'types_rates_cukai_id' => $cukai->id,
            'status' => 1,
        ]);

        $this->actingAs($user, 'web')
            ->patchJson("/api/exim/master/hs-codes/{$hs->id}/toggle-status")
            ->assertOk()
            ->assertJsonPath('data.status', 0);

        $this->assertSame(0, (int) $hs->fresh()->status);
    }

    public function test_xlsx_zip_roundtrip_and_style_import_upload_limit(): void
    {
        $user = $this->createAdminUser();
        $tmpPath = tempnam(sys_get_temp_dir(), 'g1xlsx');
        file_put_contents($tmpPath, SimpleXlsxZip::createBinary([
            '[Content_Types].xml' => '<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/></Types>',
            'xl/sharedStrings.xml' => '<?xml version="1.0"?><sst><si><t>code</t></si><si><t>name</t></si><si><t>STYLE-001</t></si><si><t>Jacket</t></si></sst>',
            'xl/worksheets/sheet1.xml' => '<?xml version="1.0"?><worksheet><sheetData><row r="1"><c r="A1" t="s"><v>0</v></c><c r="C1" t="s"><v>1</v></c></row><row r="2"><c r="A2" t="s"><v>2</v></c><c r="C2" t="s"><v>3</v></c></row></sheetData></worksheet>',
        ]));

        $rows = SpreadsheetParser::parseXlsx($tmpPath, true);
        @unlink($tmpPath);
        $this->assertSame([['code' => 'STYLE-001', 'name' => 'Jacket']], $rows);

        $oversized = UploadedFile::fake()->create('too_big.csv', 6000, 'text/csv');
        $this->actingAs($user, 'web')
            ->postJson('/api/exim/master/styles/import', ['file' => $oversized])
            ->assertStatus(422);
    }

    public function test_bounded_pagination_metadata_and_cap_enforced_across_endpoints(): void
    {
        $user = $this->createAdminUser();
        $this->actingAs($user, 'web');

        foreach ([
            '/api/procurement/pr',
            '/api/procurement/po',
            '/api/warehouse/bpb',
            '/api/warehouse/rn',
            '/api/warehouse/request-materials',
            '/api/warehouse/transfer-stock-returns',
            '/api/warehouse/adjustment-stock',
            '/api/dashboard/exchange-rates',
            '/api/dashboard/stock-notifications',
            '/api/warehouse/master/destination-locations',
            '/api/warehouse/master/type-of-requests',
            '/api/warehouse/reports/stock-item',
            '/api/reporting/traceability',
        ] as $endpoint) {
            $res = $this->getJson("{$endpoint}?per_page=9999")->assertOk();
            $this->assertLessThanOrEqual(500, (int) $res->json('meta.per_page'), "Endpoint {$endpoint} failed per_page cap");
        }
    }

    public function test_system_context_and_lookups_cache_invalidation_and_shared_helpers(): void
    {
        $user = $this->createAdminUser();
        $this->actingAs($user, 'web');

        \Illuminate\Support\Facades\Cache::flush();

        $this->getJson('/api/system/context')->assertOk();
        $this->assertTrue(\Illuminate\Support\Facades\Cache::has(\App\Http\Controllers\Api\Common\SystemContextApiController::CONTEXT_CACHE_KEY));

        $this->getJson('/api/master/lookups')->assertOk();
        $this->assertTrue(\Illuminate\Support\Facades\Cache::has(\App\Http\Controllers\Api\Common\SystemContextApiController::LOOKUPS_CACHE_KEY));

        // Creating a destination location invalidates the lookups cache
        $this->postJson('/api/warehouse/master/destination-locations', [
            'name' => 'Cache Test Dock',
            'status' => 1,
        ])->assertCreated();
        $this->assertFalse(\Illuminate\Support\Facades\Cache::has(\App\Http\Controllers\Api\Common\SystemContextApiController::LOOKUPS_CACHE_KEY));

        // Warm lookups again and verify reference master store invalidates it
        $this->getJson('/api/master/lookups')->assertOk();
        $this->assertTrue(\Illuminate\Support\Facades\Cache::has(\App\Http\Controllers\Api\Common\SystemContextApiController::LOOKUPS_CACHE_KEY));

        $this->postJson('/api/exim/master/specifications', [
            'name' => 'Cache Spec Test',
        ])->assertCreated();
        $this->assertFalse(\Illuminate\Support\Facades\Cache::has(\App\Http\Controllers\Api\Common\SystemContextApiController::LOOKUPS_CACHE_KEY));

        // DocumentCodeHelper behavior
        $this->assertSame('PO/G1/2026/0001', \App\Support\DocumentCodeHelper::hyphenToSlash('PO-G1-2026-0001'));
        $this->assertSame('PO-G1-2026-0001', \App\Support\DocumentCodeHelper::toSlug('PO/G1/2026/0001'));

        // InventoryService helpers handle zero/missing rows cleanly
        $inventoryService = app(\App\Services\Inventory\InventoryService::class);
        $this->assertIsArray($inventoryService->getItemStockTotals());
        $this->assertSame(0.0, $inventoryService->getWarehouseStockBalance(999999, 999999));

        // Additional Master invalidation coverage (Brand create/toggle/delete + validation failure preservation)
        $this->getJson('/api/master/lookups')->assertOk();
        $this->assertTrue(\Illuminate\Support\Facades\Cache::has(\App\Http\Controllers\Api\Common\SystemContextApiController::LOOKUPS_CACHE_KEY));

        $brandRes = $this->postJson('/api/exim/master/brands', [
            'code' => 'BRD-CACHE-1',
            'name' => 'Cache Brand One',
            'status' => 1,
        ])->assertCreated();
        $brandId = $brandRes->json('data.id');
        $this->assertFalse(\Illuminate\Support\Facades\Cache::has(\App\Http\Controllers\Api\Common\SystemContextApiController::LOOKUPS_CACHE_KEY));

        // Re-warm cache and verify status toggle invalidates cache
        $this->getJson('/api/master/lookups')->assertOk();
        $this->assertTrue(\Illuminate\Support\Facades\Cache::has(\App\Http\Controllers\Api\Common\SystemContextApiController::LOOKUPS_CACHE_KEY));
        $this->patchJson("/api/exim/master/brands/{$brandId}/toggle-status")->assertOk();
        $this->assertFalse(\Illuminate\Support\Facades\Cache::has(\App\Http\Controllers\Api\Common\SystemContextApiController::LOOKUPS_CACHE_KEY));

        // Failed validation write MUST NOT poison or invalidate warm cache
        $this->getJson('/api/master/lookups')->assertOk();
        $this->postJson('/api/exim/master/brands', ['code' => 'BRD-CACHE-1', 'name' => 'Duplicate'])->assertStatus(422);
        $this->assertTrue(\Illuminate\Support\Facades\Cache::has(\App\Http\Controllers\Api\Common\SystemContextApiController::LOOKUPS_CACHE_KEY));

        // Failed DB transaction rollback leaves committed lookups intact
        try {
            \Illuminate\Support\Facades\DB::transaction(function () {
                \App\Models\Master\Material\Brand::create(['code' => 'BRD-ROLLBACK', 'name' => 'Should Rollback', 'status' => 1]);
                throw new \RuntimeException('Simulated failure');
            });
        } catch (\RuntimeException $e) {
            // Expected rollback
        }
        $lookupsAfterRollback = $this->getJson('/api/master/lookups')->assertOk()->json('data.brands');
        $this->assertFalse(collect($lookupsAfterRollback)->contains(fn ($b) => ($b['code'] ?? '') === 'BRD-ROLLBACK'));
    }

    public function test_hs_code_status_migration_preserves_existing_rows_on_rollback_and_reapply(): void
    {
        $user = $this->createAdminUser();
        $this->actingAs($user, 'web');

        $bm = TypeRateBm::create(['name' => 'BM MIG', 'status' => 1]);
        $cukai = TypeRateCukai::create(['name' => 'CK MIG', 'status' => 1]);

        $hs = HsCode::create([
            'name' => '8471.30.10',
            'description' => 'Existing Laptop HS Code',
            'rates_bm' => 5.0,
            'rates_cukai' => 0,
            'rates_ppn' => 11.0,
            'rates_pph' => 2.5,
            'rates_ppnbm' => 0,
            'types_rates_bm_id' => $bm->id,
            'types_rates_cukai_id' => $cukai->id,
            'status' => 1,
        ]);

        $migration = require database_path('migrations/2026_11_25_000001_add_status_to_hs_code_table.php');

        // Rollback removes status column without deleting existing hs_code rows
        $migration->down();
        $this->assertFalse(\Illuminate\Support\Facades\Schema::hasColumn('hs_code', 'status'));
        $this->assertDatabaseHas('hs_code', ['id' => $hs->id, 'name' => '8471.30.10']);

        // Re-apply migration onto populated table defaults existing rows to status = 1
        $migration->up();
        $this->assertTrue(\Illuminate\Support\Facades\Schema::hasColumn('hs_code', 'status'));
        $this->assertDatabaseHas('hs_code', ['id' => $hs->id, 'name' => '8471.30.10', 'status' => 1]);

        // Pre-existing row remains readable & status toggleable via API
        $this->getJson('/api/exim/master/hs-codes')->assertOk();
        $this->patchJson("/api/exim/master/hs-codes/{$hs->id}/toggle-status")
            ->assertOk()
            ->assertJsonPath('data.status', 0);
    }
}
