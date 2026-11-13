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
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class BackendRevisionsIntegrationTest extends TestCase
{
    use RefreshDatabase;

    protected User $superAdmin;
    protected User $approver1;
    protected User $approver2;
    protected User $procurementUser;
    protected ReportingType $repType;
    protected Account $account;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(\Database\Seeders\GovernanceAndRbacSeeder::class);

        $this->superAdmin = User::where('role', Role::SUPERADMIN)->first() ?? User::factory()->create(['role' => Role::SUPERADMIN, 'status' => 1]);
        $this->approver1 = User::where('role', Role::APPROVER_TIER1)->first() ?? User::factory()->create(['role' => Role::APPROVER_TIER1, 'status' => 1]);
        $this->approver2 = User::where('role', Role::APPROVER_TIER2)->first() ?? User::factory()->create(['role' => Role::APPROVER_TIER2, 'status' => 1]);
        $this->procurementUser = User::where('role', Role::PROCUREMENT)->first() ?? User::factory()->create(['role' => Role::PROCUREMENT, 'status' => 1]);

        $this->repType = ReportingType::firstOrCreate(['name' => 'General Report']);
        $this->account = Account::firstOrCreate(['code' => '115.01'], ['name' => 'General Inventory Account']);
    }

    /**
     * BE-01: Master Item Facility & Additional Costs.
     */
    public function test_be_01_master_item_facility_and_additional_costs()
    {
        $facility = Facility::firstOrCreate(['name' => 'FASILITAS'], ['status' => 1]);
        $uom = UnitOfMeasurement::firstOrCreate(['name' => 'PCE'], ['status' => 1]);
        $classification = Classification::firstOrCreate(
            ['code' => 'CLS-TEST'],
            ['name' => 'Test Classification', 'reporting_types_id' => $this->repType->id, 'accounts_id' => $this->account->id]
        );
        $itemType = ItemType::firstOrCreate(['name' => 'Raw Material']);

        $item = Item::create([
            'name' => 'Test Anode Copper',
            'code' => 'ITM.99001',
            'facilities_id' => $facility->id,
            'classifications_id' => $classification->id,
            'units_of_measurements_id' => $uom->id,
            'item_types_id' => $itemType->id,
            'status' => 1,
        ]);

        $this->assertEquals('FASILITAS', $item->facility->name);

        // Additional Cost CRUD API
        $response = $this->actingAs($this->superAdmin, 'web')
            ->postJson('/api/procurement/master/additional-costs', [
                'code' => 'FRT01',
                'name' => 'Freight Shipping Express',
                'status' => 1,
            ]);

        $response->assertStatus(201);
        $this->assertDatabaseHas('additional_cost_types', ['code' => 'FRT01']);
    }

    /**
     * BE-03: Role and Permission Management.
     */
    public function test_be_03_role_and_permission_management()
    {
        $role = Role::where('name', Role::PROCUREMENT)->with('permissions')->first();
        $this->assertNotNull($role);

        // Procurement has master_item.create
        $this->assertTrue($this->procurementUser->hasPermission('master_item.create'));
        $this->assertTrue($this->procurementUser->hasPermission('pr.create'));

        // Approver 1 has approve_1 permission but not approve_2
        $this->assertTrue($this->approver1->hasPermission('pr.approve_1'));
        $this->assertFalse($this->approver1->hasPermission('pr.approve_2'));
    }

    /**
     * BE-04: Transaction History and Activity Log (including Print).
     */
    public function test_be_04_activity_log_and_print_tracking()
    {
        $dept = Department::firstOrCreate(['name' => 'Produksi']);
        $sec = Section::firstOrCreate(['name' => 'Smelting']);
        $uom = UnitOfMeasurement::firstOrCreate(['name' => 'PCE']);
        $class = Classification::firstOrCreate(
            ['code' => 'CLS-01'],
            ['name' => 'General', 'reporting_types_id' => $this->repType->id, 'accounts_id' => $this->account->id]
        );
        $fac = Facility::firstOrCreate(['name' => 'FASILITAS']);
        $type = ItemType::firstOrCreate(['name' => 'Mat']);

        $item = Item::create([
            'name' => 'Cable High Voltage',
            'code' => 'ITM.001',
            'classifications_id' => $class->id,
            'facilities_id' => $fac->id,
            'units_of_measurements_id' => $uom->id,
            'item_types_id' => $type->id,
        ]);

        $pr = PurchaseRequisition::create([
            'pr_number' => '0999/PR-TEST/XI/2026',
            'departments_id' => $dept->id,
            'sections_id' => $sec->id,
            'creator' => $this->procurementUser->id,
            'date' => '05-Nov-2026',
            'due_date' => '19-Nov-2026',
            'status' => 'Waiting for Approve 1',
        ]);

        PurchaseRequisitionItem::create([
            'purchase_requisitions_id' => $pr->id,
            'items_id' => $item->id,
            'quantity' => '10',
            'due_date' => '19-Nov-2026',
        ]);

        // Record print activity via API
        $response = $this->actingAs($this->procurementUser, 'web')
            ->postJson("/api/approval/pr/{$pr->id}/activity", [
                'action' => 'printed',
                'note' => 'Official document print triggered from UI',
            ]);

        $response->assertStatus(201);

        $this->assertDatabaseHas('approval_histories', [
            'document_type' => 'PR',
            'document_id' => $pr->id,
            'action' => 'PRINTED',
        ]);

        // Check history retrieval
        $histResp = $this->actingAs($this->procurementUser, 'web')
            ->getJson("/api/approval/pr/{$pr->id}/history");

        $histResp->assertStatus(200);
        $histResp->assertJsonFragment(['action' => 'printed']);
    }

    /**
     * BE-05: PR Item Closing and Unclosing.
     */
    public function test_be_05_pr_item_closing_and_unclosing()
    {
        $dept = Department::firstOrCreate(['name' => 'Produksi']);
        $sec = Section::firstOrCreate(['name' => 'Smelting']);
        $uom = UnitOfMeasurement::firstOrCreate(['name' => 'PCE']);
        $class = Classification::firstOrCreate(
            ['code' => 'CLS-02'],
            ['name' => 'General', 'reporting_types_id' => $this->repType->id, 'accounts_id' => $this->account->id]
        );
        $fac = Facility::firstOrCreate(['name' => 'FASILITAS']);
        $type = ItemType::firstOrCreate(['name' => 'Mat']);

        $item1 = Item::create([
            'name' => 'Hydraulic Hose',
            'code' => 'ITM.002',
            'classifications_id' => $class->id,
            'facilities_id' => $fac->id,
            'units_of_measurements_id' => $uom->id,
            'item_types_id' => $type->id,
        ]);

        $pr = PurchaseRequisition::create([
            'pr_number' => '0998/PR-TEST/XI/2026',
            'departments_id' => $dept->id,
            'sections_id' => $sec->id,
            'creator' => $this->procurementUser->id,
            'date' => '05-Nov-2026',
            'due_date' => '19-Nov-2026',
            'status' => 'Approved',
        ]);

        $prItem = PurchaseRequisitionItem::create([
            'purchase_requisitions_id' => $pr->id,
            'items_id' => $item1->id,
            'quantity' => '5',
            'due_date' => '19-Nov-2026',
            'is_closed' => false,
        ]);

        // 1. Close PR item via API
        $closeResp = $this->actingAs($this->procurementUser, 'web')
            ->postJson("/api/procurement/pr/{$pr->id}/items/{$prItem->id}/close");

        $closeResp->assertStatus(200);
        $prItem->refresh();
        $this->assertTrue($prItem->is_closed);

        // 2. PR item remains saved (not deleted)
        $this->assertDatabaseHas('purchase_requisitions_has_items', [
            'id' => $prItem->id,
            'is_closed' => 1,
            'deleted_at' => null,
        ]);

        // 3. Unclose PR item via API
        $uncloseResp = $this->actingAs($this->procurementUser, 'web')
            ->postJson("/api/procurement/pr/{$pr->id}/items/{$prItem->id}/unclose");

        $uncloseResp->assertStatus(200);
        $prItem->refresh();
        $this->assertFalse($prItem->is_closed);
    }

    /**
     * BE-06: 2-Tier Approval Workflow Integration.
     */
    public function test_be_06_two_tier_approval_workflow()
    {
        $dept = Department::firstOrCreate(['name' => 'Produksi']);
        $sec = Section::firstOrCreate(['name' => 'Smelting']);
        $uom = UnitOfMeasurement::firstOrCreate(['name' => 'PCE']);
        $class = Classification::firstOrCreate(
            ['code' => 'CLS-03'],
            ['name' => 'General', 'reporting_types_id' => $this->repType->id, 'accounts_id' => $this->account->id]
        );
        $fac = Facility::firstOrCreate(['name' => 'FASILITAS']);
        $type = ItemType::firstOrCreate(['name' => 'Mat']);

        $item = Item::create([
            'name' => 'Filter Bag Dust Collector',
            'code' => 'ITM.003',
            'classifications_id' => $class->id,
            'facilities_id' => $fac->id,
            'units_of_measurements_id' => $uom->id,
            'item_types_id' => $type->id,
        ]);

        $pr = PurchaseRequisition::create([
            'pr_number' => '0997/PR-TEST/XI/2026',
            'departments_id' => $dept->id,
            'sections_id' => $sec->id,
            'creator' => $this->procurementUser->id,
            'date' => '05-Nov-2026',
            'due_date' => '19-Nov-2026',
            'status' => 'Waiting for Approve 1',
        ]);

        PurchaseRequisitionItem::create([
            'purchase_requisitions_id' => $pr->id,
            'items_id' => $item->id,
            'quantity' => '20',
            'due_date' => '19-Nov-2026',
        ]);

        // 1. Stage 1 Approval by Tier 1 Approver
        $appr1Resp = $this->actingAs($this->approver1, 'web')
            ->postJson("/api/approval/pr/{$pr->id}/approve", [
                'tier' => 1,
                'note' => 'Approved Stage 1 by Dept Head',
            ]);

        $appr1Resp->assertStatus(200);
        $pr->refresh();
        $this->assertEquals('Waiting for Approve 2', $pr->status);

        // 2. Stage 2 Approval by Tier 2 Approver
        $appr2Resp = $this->actingAs($this->approver2, 'web')
            ->postJson("/api/approval/pr/{$pr->id}/approve", [
                'tier' => 2,
                'note' => 'Approved Stage 2 by Director',
            ]);

        $appr2Resp->assertStatus(200);
        $pr->refresh();
        $this->assertEquals('Approved', $pr->getRawOriginal('status'));
        $this->assertEquals('Outstanding', $pr->status);

        // 3. UnApprove Stage 2
        $unappr2Resp = $this->actingAs($this->approver2, 'web')
            ->postJson("/api/approval/pr/{$pr->id}/unapprove", [
                'tier' => 2,
                'reason' => 'Need budget recheck',
            ]);

        $unappr2Resp->assertStatus(200);
        $pr->refresh();
        $this->assertEquals('Waiting for Approve 2', $pr->status);
    }
}
