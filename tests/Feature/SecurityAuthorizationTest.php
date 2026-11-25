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
use App\Models\Master\Organization\Section;
use App\Models\Procurement\PurchaseRequest\PurchaseRequisition;
use App\Models\Procurement\PurchaseRequest\PurchaseRequisitionItem;
use App\Models\System\Auth\User;
use App\Models\System\Governance\Role;
use App\Models\Warehouse\Facility\Warehouse;
use App\Models\Warehouse\Facility\WarehouseType;
use App\Models\Warehouse\InboundStorage\BpbReceiveMaterial;
use App\Models\Warehouse\Inventory\WarehouseStock;
use App\Models\Warehouse\RequestMaterial\TypeOfRequest;
use App\Support\ApiTokenResolver;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class SecurityAuthorizationTest extends TestCase
{
    use RefreshDatabase;

    public function test_unauthenticated_requests_are_rejected_across_protected_api_domains(): void
    {
        $protectedGets = [
            '/api/auth/me',
            '/api/auth/users',
            '/api/user/profile',
            '/api/system/context',
            '/api/system/settings',
            '/api/master/lookups',
            '/api/admin/users',
            '/api/v1/admin/roles',
            '/api/procurement/pr',
            '/api/procurement/po',
            '/api/warehouse/bpb',
            '/api/warehouse/rn',
            '/api/warehouse/request-materials',
            '/api/reporting/traceability',
        ];

        foreach ($protectedGets as $uri) {
            $this->getJson($uri)->assertStatus(401);
        }

        $this->putJson('/api/system/settings', ['settings' => ['company_name' => 'Hack']])->assertStatus(401);
        $this->postJson('/api/approval/pr/1/approve', ['tier' => 1])->assertStatus(401);
        $this->postJson('/api/exim/master/brands', ['code' => 'X', 'name' => 'X'])->assertStatus(401);
    }

    public function test_non_superadmin_is_blocked_from_admin_and_system_settings_mutations(): void
    {
        $adminUser = User::query()->create([
            'username' => 'ops-admin',
            'name' => 'Ops Admin',
            'email' => 'ops-admin@geniusone.test',
            'password' => Hash::make('secret123'),
            'role' => User::ROLE_ADMIN,
            'status' => 1,
        ]);

        $this->actingAs($adminUser, 'web');
        $this->getJson('/api/admin/users')->assertStatus(403);
        $this->getJson('/api/v1/admin/roles')->assertStatus(403);
        $this->getJson('/api/admin/audit-logs')->assertStatus(403);
        $this->getJson('/api/auth/users')->assertStatus(403);
        $this->putJson('/api/system/settings', ['settings' => ['company_name' => 'Blocked']])->assertStatus(403);

        $superAdmin = User::query()->create([
            'username' => 'root-super',
            'name' => 'Root SuperAdmin',
            'email' => 'root-super@geniusone.test',
            'password' => Hash::make('secret123'),
            'role' => User::ROLE_SUPERADMIN,
            'status' => 1,
        ]);

        $this->actingAs($superAdmin, 'web');
        $this->getJson('/api/admin/users')->assertOk();
        $this->getJson('/api/auth/users')->assertOk();
        $this->putJson('/api/system/settings', ['settings' => ['company_name' => 'GENIUSONE']])->assertOk();
    }

    public function test_login_prevents_enumeration_hashes_token_revokes_and_rate_limits(): void
    {
        $user = User::query()->create([
            'username' => 'token-tester',
            'name' => 'Token Tester',
            'email' => 'token-tester@geniusone.test',
            'password' => Hash::make('CorrectPass1!'),
            'role' => User::ROLE_PROCUREMENT,
            'status' => 1,
        ]);

        $missingRes = $this->postJson('/api/auth/login', [
            'username' => 'nonexistent_user',
            'password' => 'WrongPass1!',
        ])->assertStatus(401);

        $wrongRes = $this->postJson('/api/auth/login', [
            'username' => 'token-tester',
            'password' => 'WrongPass1!',
        ])->assertStatus(401);

        $this->assertSame($missingRes->json('message'), $wrongRes->json('message'));

        $okRes = $this->postJson('/api/auth/login', [
            'username' => 'token-tester',
            'password' => 'CorrectPass1!',
        ])->assertOk();

        $plainToken = (string) $okRes->json('data.token');
        $this->assertNotEmpty($plainToken);

        $user->refresh();
        $expectedHash = ApiTokenResolver::hashToken($plainToken);
        $this->assertNotSame($plainToken, $user->remember_token);
        $this->assertSame($expectedHash, $user->remember_token);
        $this->assertEquals($user->id, Cache::get(ApiTokenResolver::cacheKey($expectedHash)));

        // Logout revokes token hash from cache and DB
        $this->withHeader('Authorization', 'Bearer '.$plainToken)
            ->postJson('/api/auth/logout')
            ->assertOk();

        $user->refresh();
        $this->assertNull($user->remember_token);
        $this->assertNull(Cache::get(ApiTokenResolver::cacheKey($expectedHash)));
        $this->withHeader('Authorization', 'Bearer '.$plainToken)
            ->getJson('/api/auth/me')
            ->assertStatus(401);

        // Rate limiting blocks excessive failed login attempts (throttle:10,1)
        for ($i = 0; $i < 12; $i++) {
            $resp = $this->postJson('/api/auth/login', [
                'username' => 'brute-test',
                'password' => 'WrongPass1!',
            ]);
            if ($resp->status() === 429) {
                $this->assertSame(429, $resp->status());

                return;
            }
        }
        $this->fail('Expected login route to return 429 Too Many Requests after threshold.');
    }

    public function test_avatar_upload_validates_payload_and_cleans_up_replaced_file(): void
    {
        Storage::fake('public');

        $user = User::query()->create([
            'username' => 'avatar-tester',
            'name' => 'Avatar Tester',
            'email' => 'avatar@geniusone.test',
            'password' => Hash::make('secret123'),
            'role' => User::ROLE_PROCUREMENT,
            'status' => 1,
        ]);
        $this->actingAs($user, 'web');

        // Reject arbitrary non-image string injection
        $this->postJson('/api/user/profile', [
            'photo' => 'javascript:alert(1)',
        ])->assertStatus(422)->assertJsonValidationErrors(['photo']);

        // Reject invalid base64 content claiming image/png
        $this->postJson('/api/user/profile', [
            'photo' => 'data:image/png;base64,'.base64_encode('not-a-real-png-binary'),
        ])->assertStatus(422)->assertJsonValidationErrors(['photo']);

        // Minimal valid 1x1 PNG base64 payload
        $pngB64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';
        $firstRes = $this->postJson('/api/user/profile', [
            'photo' => 'data:image/png;base64,'.$pngB64,
        ])->assertOk();

        $firstPhoto = (string) $firstRes->json('data.photo');
        $this->assertStringStartsWith('/avatars/', $firstPhoto);
        Storage::disk('public')->assertExists('avatars/'.basename($firstPhoto));

        // Second upload cleans up the first avatar file
        $secondRes = $this->postJson('/api/user/profile', [
            'photo' => 'data:image/png;base64,'.$pngB64,
        ])->assertOk();

        $secondPhoto = (string) $secondRes->json('data.photo');
        $this->assertNotSame($firstPhoto, $secondPhoto);
        Storage::disk('public')->assertMissing('avatars/'.basename($firstPhoto));
        Storage::disk('public')->assertExists('avatars/'.basename($secondPhoto));
    }

    public function test_client_status_injection_tier1_unapprove_bypass_and_bpb_rejection_are_blocked(): void
    {
        $this->seed(\Database\Seeders\GovernanceAndRbacSeeder::class);

        $approver1 = User::where('role', Role::APPROVER_TIER1)->firstOrFail();
        $approver2 = User::where('role', Role::APPROVER_TIER2)->firstOrFail();
        $warehouseUser = User::where('role', Role::WAREHOUSE)->firstOrFail();

        $account = Account::query()->create(['code' => '115.88', 'name' => 'Sec Account', 'category' => 'Inventory', 'status' => 'active']);
        $rep = ReportingType::query()->create(['name' => 'Sec Rep', 'status' => 1]);
        $cls = Classification::query()->create(['reporting_types_id' => $rep->id, 'accounts_id' => $account->id, 'code' => 'SEC-CLS', 'name' => 'Sec Class', 'status' => 1]);
        $fac = Facility::query()->create(['name' => 'FASILITAS', 'status' => 1]);
        $uom = UnitOfMeasurement::query()->create(['code' => 'PCS', 'name' => 'Pieces', 'status' => 1]);
        $type = ItemType::query()->create(['name' => 'Raw Material', 'status' => 'active']);
        $dept = Department::query()->create(['name' => 'Sec Dept', 'status' => 1]);
        $sec = Section::query()->create(['name' => 'Sec 01', 'departments_id' => $dept->id, 'status' => 1]);
        $whType = WarehouseType::query()->create(['name' => 'Sec WH Type', 'status' => 1]);
        $wh = Warehouse::query()->create(['name' => 'Sec WH', 'code' => 'SEC-WH', 'warehouse_types_id' => $whType->id, 'status' => 1]);
        $reqType = TypeOfRequest::query()->create(['name' => 'Sec Req', 'status' => 1]);
        $item = Item::query()->create([
            'code' => 'SEC-ITM-01',
            'name' => 'Sec Item',
            'classifications_id' => $cls->id,
            'facilities_id' => $fac->id,
            'item_types_id' => $type->id,
            'units_of_measurements_id' => $uom->id,
            'stock' => 50,
            'status' => 1,
        ]);
        WarehouseStock::query()->create([
            'items_id' => $item->id,
            'warehouses_id' => $wh->id,
            'quantity' => 50,
            'allocated_quantity' => 0,
        ]);

        // 1. Client-supplied status='Approved' on Request Material create is ignored
        $this->actingAs($warehouseUser, 'web');
        $rmRes = $this->postJson('/api/warehouse/request-materials', [
            'requestDate' => now()->toDateString(),
            'departments_id' => $dept->id,
            'warehouses_id' => $wh->id,
            'type_of_request_id' => $reqType->id,
            'status' => 'Approved',
            'items' => [['items_id' => $item->id, 'requestQty' => 5]],
        ])->assertCreated();
        $this->assertSame('Waiting for Approve 1', $rmRes->json('data.approval'));

        // 2. Stage 1 approver cannot unapprove a Stage-2 Approved PR
        $pr = PurchaseRequisition::create([
            'pr_number' => '0888/PR-SEC/XI/2026',
            'departments_id' => $dept->id,
            'sections_id' => $sec->id,
            'creator' => $warehouseUser->id,
            'date' => now()->toDateString(),
            'due_date' => now()->addDays(7)->toDateString(),
            'status' => 'Waiting for Approve 1',
        ]);
        PurchaseRequisitionItem::create([
            'purchase_requisitions_id' => $pr->id,
            'items_id' => $item->id,
            'quantity' => '10',
            'due_date' => now()->addDays(7)->toDateString(),
        ]);

        $this->actingAs($approver1, 'web')
            ->postJson("/api/approval/pr/{$pr->id}/approve", ['tier' => 1])
            ->assertOk();
        $this->actingAs($approver2, 'web')
            ->postJson("/api/approval/pr/{$pr->id}/approve", ['tier' => 2])
            ->assertOk();

        // Tier 1 unapprove MUST fail while Stage 2 final approval is active
        $this->actingAs($approver1, 'web')
            ->postJson("/api/approval/pr/{$pr->id}/unapprove", ['tier' => 1, 'reason' => 'Bypass test'])
            ->assertStatus(422);

        // 3. Rejecting an already Approved BPB is blocked
        $bpb = BpbReceiveMaterial::create([
            'bpb_number' => 'BPB-SEC-0001',
            'source_type' => 'PO',
            'bpb_type' => 'Direct PO',
            'status' => 'Approved',
            'receive_date' => now(),
            'creator_id' => $warehouseUser->id,
            'updated_by' => $warehouseUser->id,
        ]);
        $this->actingAs($approver1, 'web')
            ->postJson("/api/warehouse/{$bpb->id}/reject", ['tier' => 1, 'reason' => 'Attempt post-approval reject'])
            ->assertStatus(422);
    }

    public function test_unauthenticated_web_route_does_not_leak_initial_data(): void
    {
        $response = $this->get('/procurement/transactions/purchase-requisition');
        $response->assertOk();
        $response->assertViewIs('app');
        $response->assertViewMissing('initialData');
    }

    public function test_password_reset_and_deactivation_revoke_active_tokens_and_viewer_cannot_mutate_items(): void
    {
        $superAdmin = User::query()->create([
            'username' => 'revoke-superadmin',
            'name' => 'Revoke SuperAdmin',
            'email' => 'revoke-sa@geniusone.test',
            'password' => Hash::make('secret123'),
            'role' => User::ROLE_SUPERADMIN,
            'status' => 1,
        ]);

        $viewer = User::query()->create([
            'username' => 'readonly-viewer',
            'name' => 'Readonly Viewer',
            'email' => 'readonly-viewer@geniusone.test',
            'password' => Hash::make('ViewerPass1!'),
            'role' => User::ROLE_VIEWER,
            'status' => 1,
        ]);

        $loginRes = $this->postJson('/api/auth/login', [
            'username' => 'readonly-viewer',
            'password' => 'ViewerPass1!',
        ])->assertOk();
        $viewerToken = (string) $loginRes->json('data.token');

        // Viewer is blocked from mutating Master Item and from approving RM
        $this->withHeader('Authorization', 'Bearer '.$viewerToken)
            ->postJson('/api/exim/master/items', ['code' => 'NOPE', 'name' => 'Blocked'])
            ->assertStatus(403);

        $this->withHeader('Authorization', 'Bearer '.$viewerToken)
            ->postJson('/api/warehouse/request-materials/1/approve', ['tier' => 1])
            ->assertStatus(403);

        // SuperAdmin resets viewer password -> viewer token immediately revoked
        $this->actingAs($superAdmin, 'web')
            ->postJson("/api/admin/users/{$viewer->id}/reset-password", ['password' => 'NewPass123!'])
            ->assertOk();

        $viewer->refresh();
        $this->assertNull($viewer->remember_token);
        \Illuminate\Support\Facades\Auth::logout();
        $this->app['auth']->forgetGuards();

        $this->withHeader('Authorization', 'Bearer '.$viewerToken)
            ->getJson('/api/auth/me')
            ->assertStatus(401);

        // Re-login then deactivate -> token immediately revoked
        $loginRes2 = $this->postJson('/api/auth/login', [
            'username' => 'readonly-viewer',
            'password' => 'NewPass123!',
        ])->assertOk();
        $viewerToken2 = (string) $loginRes2->json('data.token');

        $this->actingAs($superAdmin, 'web')
            ->patchJson("/api/admin/users/{$viewer->id}/toggle-status")
            ->assertOk();

        $viewer->refresh();
        $this->assertNull($viewer->remember_token);
        \Illuminate\Support\Facades\Auth::logout();
        $this->app['auth']->forgetGuards();

        $this->withHeader('Authorization', 'Bearer '.$viewerToken2)
            ->getJson('/api/auth/me')
            ->assertStatus(401);

        // Verify fail-closed fallback on unknown role returns empty array (never wildcard '*')
        $unknownRoleUser = User::query()->create([
            'username' => 'unknown-role-user',
            'name' => 'Unknown Role',
            'email' => 'unknown@geniusone.test',
            'password' => Hash::make('secret123'),
            'role' => 'unrecognized_role',
            'status' => 1,
        ]);
        $this->assertSame([], $unknownRoleUser->getAllPermissions());
    }

    public function test_legacy_plaintext_token_is_compatibly_migrated_and_viewer_cannot_bypass_aliases(): void
    {
        $legacyToken = str_repeat('L', 60);
        $user = User::query()->create([
            'username' => 'legacy-token-user',
            'name' => 'Legacy Token User',
            'email' => 'legacy-token@geniusone.test',
            'password' => Hash::make('secret123'),
            'role' => User::ROLE_PROCUREMENT,
            'status' => 1,
        ]);
        $user->forceFill(['remember_token' => $legacyToken])->save();
        Cache::put(ApiTokenResolver::cacheKey($legacyToken), $user->id, now()->addDays(5));

        // 1. Pre-upgrade legacy plaintext token still authenticates cleanly
        $this->withHeader('Authorization', 'Bearer '.$legacyToken)
            ->getJson('/api/auth/me')
            ->assertOk()
            ->assertJsonPath('data.username', 'legacy-token-user');

        // 2. Transparently migrated to SHA-256 hash in both DB & Cache
        $user->refresh();
        $expectedHash = ApiTokenResolver::hashToken($legacyToken);
        $this->assertSame($expectedHash, $user->remember_token);
        $this->assertNull(Cache::get(ApiTokenResolver::cacheKey($legacyToken)));
        $this->assertEquals($user->id, Cache::get(ApiTokenResolver::cacheKey($expectedHash)));

        // 3. Migrated token continues working & logout revokes it
        \Illuminate\Support\Facades\Auth::logout();
        $this->app['auth']->forgetGuards();
        $this->withHeader('Authorization', 'Bearer '.$legacyToken)
            ->postJson('/api/auth/logout')
            ->assertOk();

        \Illuminate\Support\Facades\Auth::logout();
        $this->app['auth']->forgetGuards();
        $this->withHeader('Authorization', 'Bearer '.$legacyToken)
            ->getJson('/api/auth/me')
            ->assertStatus(401);

        // 4. Viewer cannot bypass RBAC via backward-compatibility aliases, TSR reject, or web POST
        $viewer = User::query()->create([
            'username' => 'viewer-alias-test',
            'name' => 'Viewer Alias Test',
            'email' => 'viewer-alias@geniusone.test',
            'password' => Hash::make('secret123'),
            'role' => User::ROLE_VIEWER,
            'status' => 1,
        ]);
        $this->actingAs($viewer, 'web');

        $this->postJson('/api/pr', [])->assertStatus(403);
        $this->postJson('/api/po', [])->assertStatus(403);
        $this->postJson('/api/rn', [])->assertStatus(403);
        $this->postJson('/api/warehouse', [])->assertStatus(403);
        $this->deleteJson('/api/warehouse/bpb/1')->assertStatus(403);
        $this->postJson('/api/procurement/master/rafaksi-types', ['name' => 'Nope'])->assertStatus(403);
        $this->postJson('/api/exim/master/brands', ['name' => 'Nope'])->assertStatus(403);
        $this->postJson('/api/warehouse/transfer-stock-returns', [])->assertStatus(403);
        $this->postJson('/api/warehouse/transfer-stock-returns/1/reject', ['reason' => 'Nope'])->assertStatus(403);
        $this->post('/warehouse/create', [])->assertStatus(403);
    }
}
