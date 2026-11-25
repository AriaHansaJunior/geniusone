<?php

namespace Tests\Feature;

use App\Models\Master\Customs\Facility;
use App\Models\Master\Finance\Account;
use App\Models\Master\Finance\Currency;
use App\Models\Master\Finance\DeliveryTerm;
use App\Models\Master\Finance\PaymentMethod;
use App\Models\Master\Finance\PaymentTerm;
use App\Models\Master\Finance\RafaksiType;
use App\Models\Master\Finance\Valuta;
use App\Models\Master\Material\Classification;
use App\Models\Master\Material\Item;
use App\Models\Master\Material\ItemType;
use App\Models\Master\Material\UnitOfMeasurement;
use App\Models\Master\Organization\Department;
use App\Models\Master\Organization\JobNumber;
use App\Models\Master\Organization\ReportingType;
use App\Models\Master\Organization\Section;
use App\Models\Master\Partner\Country;
use App\Models\Master\Partner\Port;
use App\Models\Master\Partner\Supplier;
use App\Models\Procurement\PurchaseOrder\PoServiceClosure;
use App\Models\Procurement\PurchaseOrder\PoType;
use App\Models\Procurement\PurchaseOrder\PurchaseOrder;
use App\Models\Procurement\PurchaseRequest\PurchaseRequisition;
use App\Models\Procurement\PurchaseRequest\PurchaseRequisitionItem;
use App\Models\System\Auth\User;
use App\Models\Warehouse\Facility\Warehouse;
use App\Models\Warehouse\Facility\WarehouseCoordinate;
use App\Models\Warehouse\Facility\WarehouseType;
use App\Models\Warehouse\InboundStorage\BpbReceiveMaterial;
use App\Models\Warehouse\Inventory\WarehouseStock;
use App\Models\Warehouse\Inventory\WarehouseStockTransfer;
use App\Models\Warehouse\RequestMaterial\RequestMaterial;
use App\Models\Warehouse\RequestMaterial\TypeOfRequest;
use App\Services\Inventory\InventoryService;
use Database\Seeders\GovernanceAndRbacSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class BackendRevisionRequirementsTest extends TestCase
{
    use RefreshDatabase;

    protected User $admin;

    protected User $requester;

    protected User $procurement;

    protected User $warehouseUser;

    protected User $approver1;

    protected User $approver2;

    protected Department $deptA;

    protected Department $deptB;

    protected Section $sectionA;

    protected Warehouse $whA;

    protected Warehouse $whB;

    protected Warehouse $whInactive;

    protected WarehouseCoordinate $coordA;

    protected WarehouseCoordinate $coordB;

    protected Item $itemGoods;

    protected Item $itemService;

    protected Supplier $supplier;

    protected PoType $poTypeStd;

    protected PoType $poTypeSrv;

    protected TypeOfRequest $requestType;

    protected Valuta $idr;

    protected DeliveryTerm $delivTerm;

    protected PaymentTerm $payTerm;

    protected PaymentMethod $payMethod;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(GovernanceAndRbacSeeder::class);

        $this->deptA = Department::create(['name' => 'Production Alpha', 'status' => 1]);
        $this->deptB = Department::create(['name' => 'Engineering Beta', 'status' => 1]);
        $this->sectionA = Section::create(['name' => 'Line Alpha 1', 'departments_id' => $this->deptA->id, 'status' => 1]);

        $this->admin = User::create([
            'username' => 'rev-admin',
            'name' => 'Revision Admin',
            'email' => 'rev-admin@geniusone.test',
            'password' => 'secret123',
            'role' => User::ROLE_SUPERADMIN,
            'departments_id' => $this->deptA->id,
            'status' => 1,
        ]);

        $this->requester = User::create([
            'username' => 'rev-requester',
            'name' => 'Revision Requester',
            'email' => 'rev-requester@geniusone.test',
            'password' => 'secret123',
            'role' => User::ROLE_REQUESTER,
            'departments_id' => $this->deptA->id,
            'status' => 1,
        ]);

        $this->procurement = User::create([
            'username' => 'rev-proc',
            'name' => 'Revision Procurement',
            'email' => 'rev-proc@geniusone.test',
            'password' => 'secret123',
            'role' => User::ROLE_PROCUREMENT,
            'departments_id' => $this->deptA->id,
            'status' => 1,
        ]);

        $this->warehouseUser = User::create([
            'username' => 'rev-wh',
            'name' => 'Revision Warehouse',
            'email' => 'rev-wh@geniusone.test',
            'password' => 'secret123',
            'role' => User::ROLE_WAREHOUSE,
            'departments_id' => $this->deptB->id,
            'status' => 1,
        ]);

        $this->approver1 = User::create([
            'username' => 'rev-appr1',
            'name' => 'Approver Tier 1',
            'email' => 'rev-appr1@geniusone.test',
            'password' => 'secret123',
            'role' => User::ROLE_APPROVER_TIER1,
            'departments_id' => $this->deptA->id,
            'status' => 1,
        ]);

        $this->approver2 = User::create([
            'username' => 'rev-appr2',
            'name' => 'Approver Tier 2',
            'email' => 'rev-appr2@geniusone.test',
            'password' => 'secret123',
            'role' => User::ROLE_APPROVER_TIER2,
            'departments_id' => $this->deptA->id,
            'status' => 1,
        ]);

        $account = Account::create([
            'code' => '115.88',
            'name' => 'Revision Test Inventory Account',
            'category' => 'Inventory',
            'status' => 'active',
        ]);
        $repType = ReportingType::create(['name' => 'Revision Material', 'status' => 1]);
        $cls = Classification::create([
            'reporting_types_id' => $repType->id,
            'accounts_id' => $account->id,
            'code' => 'REV-CLS',
            'name' => 'Revision Class',
            'status' => 1,
        ]);
        $facility = Facility::create(['name' => 'NON FASILITAS', 'status' => 1]);
        $uom = UnitOfMeasurement::create(['code' => 'PCE', 'name' => 'Pieces', 'status' => 1]);
        $itemType = ItemType::create(['name' => 'Raw Material', 'status' => 1]);
        $whType = WarehouseType::create(['name' => 'Main Storage', 'status' => 1]);

        $this->whA = Warehouse::create([
            'code' => 'WH-SRC',
            'name' => 'Warehouse Source',
            'warehouse_types_id' => $whType->id,
            'status' => 1,
        ]);
        $this->whB = Warehouse::create([
            'code' => 'WH-DST',
            'name' => 'Warehouse Destination',
            'warehouse_types_id' => $whType->id,
            'status' => 1,
        ]);
        $this->whInactive = Warehouse::create([
            'code' => 'WH-OFF',
            'name' => 'Warehouse Inactive',
            'warehouse_types_id' => $whType->id,
            'status' => 0,
        ]);

        $this->coordA = WarehouseCoordinate::create([
            'warehouses_id' => $this->whA->id,
            'code' => 'A-01',
            'name' => 'Rack A-01',
            'status' => 1,
        ]);
        $this->coordB = WarehouseCoordinate::create([
            'warehouses_id' => $this->whB->id,
            'code' => 'B-01',
            'name' => 'Rack B-01',
            'status' => 1,
        ]);

        $this->itemGoods = Item::create([
            'classifications_id' => $cls->id,
            'facilities_id' => $facility->id,
            'item_types_id' => $itemType->id,
            'units_of_measurements_id' => $uom->id,
            'code' => 'ITM-GOODS-01',
            'name' => 'Aluminum Plate',
            'stock' => 0,
            'status' => 1,
        ]);

        $this->itemService = Item::create([
            'classifications_id' => $cls->id,
            'facilities_id' => $facility->id,
            'item_types_id' => $itemType->id,
            'units_of_measurements_id' => $uom->id,
            'code' => 'SRV-REPAIR-01',
            'name' => 'CNC Machine Calibration Service',
            'stock' => 0,
            'status' => 1,
        ]);

        $this->idr = Valuta::create(['code' => 'IDR', 'name' => 'Rupiah', 'status' => 1]);
        $currency = Currency::create(['name' => 'IDR', 'status' => 1]);
        $country = Country::create(['name' => 'Indonesia', 'status' => 1]);
        $port = Port::create(['name' => 'Tanjung Priok', 'status' => 1]);
        $rafaksiType = RafaksiType::create(['name' => 'None', 'status' => 1]);
        $this->delivTerm = DeliveryTerm::create(['name' => 'Locco Warehouse', 'status' => 1]);
        $this->payTerm = PaymentTerm::create(['name' => 'Net 30', 'status' => 1]);
        $this->payMethod = PaymentMethod::create(['name' => 'Bank Transfer', 'status' => 1]);

        $this->supplier = Supplier::create([
            'code' => 'SUP-REV-01',
            'name' => 'PT Mitra Teknik Jasa',
            'address' => 'Kawasan Industri Cikarang',
            'countries_id' => $country->id,
            'payment_terms_id' => $this->payTerm->id,
            'payment_methods_id' => $this->payMethod->id,
            'rafaksi_types_id' => $rafaksiType->id,
            'currencies_id' => $currency->id,
            'ports_id' => $port->id,
            'status' => 1,
        ]);

        $this->poTypeStd = PoType::create(['code' => 'STD', 'name' => 'PO Standard', 'status' => 1]);
        $this->poTypeSrv = PoType::create(['code' => 'SRV', 'name' => 'PO Jasa Perbaikan', 'status' => 1]);
        $this->requestType = TypeOfRequest::create(['name' => 'Production Supply', 'status' => 1]);
        JobNumber::create(['code' => 'JN-REV-01', 'name' => 'Revision General Job', 'status' => 1]);

        // Seed 100 units of itemGoods into whA via InventoryService
        app(InventoryService::class)->recordStockMovement(
            item: $this->itemGoods,
            warehouseId: $this->whA->id,
            movementType: 'IN',
            quantity: 100,
            referenceType: 'INIT',
            referenceNumber: 'INIT-REV-001',
            userId: $this->admin->id,
            coordinateId: $this->coordA->id,
            coordinateName: $this->coordA->name
        );
    }

    public function test_dashboard_completion_aggregation_tracking_and_role_scoping(): void
    {
        // Requester creates 1 Approved PR -> linked to 1 Approved PO, plus 1 Waiting PR
        $prCompleted = PurchaseRequisition::create([
            'pr_number' => 'PR-DASH-001',
            'departments_id' => $this->deptA->id,
            'sections_id' => $this->sectionA->id,
            'creator' => $this->requester->id,
            'date' => '2026-11-20',
            'due_date' => '2026-11-28',
            'status' => 'Approved',
        ]);
        $prItem = PurchaseRequisitionItem::create([
            'purchase_requisitions_id' => $prCompleted->id,
            'items_id' => $this->itemGoods->id,
            'quantity' => 5,
            'due_date' => '2026-11-28',
        ]);
        PurchaseRequisition::create([
            'pr_number' => 'PR-DASH-002',
            'departments_id' => $this->deptA->id,
            'sections_id' => $this->sectionA->id,
            'creator' => $this->requester->id,
            'date' => '2026-11-21',
            'due_date' => '2026-11-28',
            'status' => 'Waiting for Approve 1',
        ]);
        // Soft-deleted PR must not be counted
        $deletedPr = PurchaseRequisition::create([
            'pr_number' => 'PR-DASH-DEL',
            'departments_id' => $this->deptA->id,
            'sections_id' => $this->sectionA->id,
            'creator' => $this->requester->id,
            'date' => '2026-11-21',
            'due_date' => '2026-11-28',
            'status' => 'Approved',
        ]);
        $deletedPr->delete();

        // Admin creates another user's PR and a SERVICE PO (Approved, not yet Closed)
        PurchaseRequisition::create([
            'pr_number' => 'PR-OTHER-001',
            'departments_id' => $this->deptA->id,
            'sections_id' => $this->sectionA->id,
            'creator' => $this->procurement->id,
            'date' => '2026-11-22',
            'due_date' => '2026-11-28',
            'status' => 'Approved',
        ]);

        $poGoods = PurchaseOrder::create([
            'po_number' => 'PO-DASH-GOODS',
            'creator_id' => $this->procurement->id,
            'po_types_id' => $this->poTypeStd->id,
            'order_category' => 'GOODS',
            'date' => '2026-11-20',
            'due_date' => '2026-11-30',
            'valutas_id' => $this->idr->id,
            'rate' => '1',
            'supliers_id' => $this->supplier->id,
            'address' => 'Cikarang',
            'payment_terms_id' => $this->payTerm->id,
            'payment_methods_id' => $this->payMethod->id,
            'delivery_terms_id' => $this->delivTerm->id,
            'latest_delivery' => '2026-11-30',
            'facility_status' => 'NON FASILITAS',
            'is_kawasan_berikat' => false,
            'status' => 'Approved',
        ]);
        DB::table('purchase_order_has_purchase_requisitions')->insert([
            'purchase_order_id' => $poGoods->id,
            'pr_has_items_id' => $prItem->id,
            'items_id' => $this->itemGoods->id,
            'order' => 5,
            'purchased' => 5,
            'price' => 1000,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        PurchaseOrder::create([
            'po_number' => 'PO-DASH-SRV',
            'creator_id' => $this->procurement->id,
            'po_types_id' => $this->poTypeSrv->id,
            'order_category' => 'SERVICE',
            'date' => '2026-11-21',
            'due_date' => '2026-11-30',
            'valutas_id' => $this->idr->id,
            'rate' => '1',
            'supliers_id' => $this->supplier->id,
            'address' => 'Cikarang',
            'payment_terms_id' => $this->payTerm->id,
            'payment_methods_id' => $this->payMethod->id,
            'delivery_terms_id' => $this->delivTerm->id,
            'latest_delivery' => '2026-11-30',
            'facility_status' => 'NON FASILITAS',
            'is_kawasan_berikat' => false,
            'status' => 'Approved',
        ]);

        // 1. Requester sees ONLY own PR + RM in aggregation (1 approved / 2 total = 50%)
        $reqAggRes = $this->actingAs($this->requester, 'web')->getJson('/api/dashboard/summary');
        $reqAggRes->assertOk()
            ->assertJsonPath('data.scope', 'own_documents')
            ->assertJsonPath('data.total', 2)
            ->assertJsonPath('data.completed', 1)
            ->assertJsonPath('data.incomplete', 1)
            ->assertJsonPath('data.completion_rate', 50);

        // 2. Requester tracking returns ONLY requester's 2 PRs, including downstream PO relation on PR-DASH-001
        $reqTrackRes = $this->actingAs($this->requester, 'web')->getJson('/api/dashboard/tracking');
        $reqTrackRes->assertOk()->assertJsonPath('meta.total', 2);
        $trackedPr = collect($reqTrackRes->json('rows'))->firstWhere('document_number', 'PR-DASH-001');
        $this->assertNotNull($trackedPr);
        $this->assertEquals('Completed', $trackedPr['workflow_stage']);
        $this->assertSame('PO-DASH-GOODS', $trackedPr['downstream_documents'][0]['document_number']);

        // 3. Cross-user tracking / unauthorized module requests must fail with 403
        $this->actingAs($this->requester, 'web')
            ->getJson('/api/dashboard/tracking?scope=all')
            ->assertStatus(403);
        $this->actingAs($this->requester, 'web')
            ->getJson('/api/dashboard/tracking?creator_id='.$this->procurement->id)
            ->assertStatus(403);
        $this->actingAs($this->requester, 'web')
            ->getJson('/api/dashboard/summary?modules=PO')
            ->assertStatus(403);

        // 4. Procurement sees PR (3 total: 2 approved) + PO (2 total: 1 GOODS Approved complete, 1 SERVICE Approved pending Berita Acara -> 1 complete) => 3/5 = 60%
        $procRes = $this->actingAs($this->procurement, 'web')->getJson('/api/dashboard/summary');
        $procRes->assertOk()
            ->assertJsonPath('data.accessible_modules', ['PR', 'PO'])
            ->assertJsonPath('data.total', 5)
            ->assertJsonPath('data.completed', 3)
            ->assertJsonPath('data.incomplete', 2)
            ->assertJsonPath('data.completion_rate', 60);

        // 5. Admin may inspect global tracking across users
        $this->actingAs($this->admin, 'web')
            ->getJson('/api/dashboard/tracking?scope=all')
            ->assertOk()
            ->assertJsonPath('meta.total', 5);
    }

    public function test_service_po_flow_blocks_kawasan_berikat_and_rn_and_closes_via_berita_acara(): void
    {
        // Reject Kawasan Berikat flag on SERVICE PO
        $this->actingAs($this->procurement, 'web')
            ->postJson('/api/procurement/po', [
                'po_types_id' => $this->poTypeSrv->id,
                'supliers_id' => $this->supplier->id,
                'is_kawasan_berikat' => true,
                'items' => [
                    ['items_id' => $this->itemService->id, 'order' => 1, 'price' => 2500000],
                ],
            ])
            ->assertStatus(422);

        // Create valid SERVICE PO
        $createRes = $this->actingAs($this->procurement, 'web')
            ->postJson('/api/procurement/po', [
                'po_types_id' => $this->poTypeSrv->id,
                'supliers_id' => $this->supplier->id,
                'items' => [
                    ['items_id' => $this->itemService->id, 'order' => 1, 'price' => 2500000],
                ],
            ]);
        $createRes->assertStatus(201);
        $poId = (int) $createRes->json('data.id');
        $po = PurchaseOrder::findOrFail($poId);
        $this->assertSame('SERVICE', $po->order_category);
        $this->assertFalse((bool) $po->is_kawasan_berikat);

        // Closing BEFORE approval must fail
        $this->actingAs($this->procurement, 'web')
            ->postJson("/api/procurement/po/{$poId}/close-service", [
                'berita_acara_date' => '2026-11-25',
                'completion_percentage' => 100,
            ])
            ->assertStatus(422);

        // Approve Stage 1 -> Stage 2
        $this->actingAs($this->approver1, 'web')->postJson("/api/procurement/po/{$poId}/approve", ['tier' => 1])->assertOk();
        $this->actingAs($this->approver2, 'web')->postJson("/api/procurement/po/{$poId}/approve", ['tier' => 2])->assertOk();

        // Physical Gate Receive Note (RN) against SERVICE PO must be rejected
        $this->actingAs($this->warehouseUser, 'web')
            ->postJson('/api/warehouse/rn', [
                'supplier_id' => $this->supplier->id,
                'items' => [
                    [
                        'purchase_order_id' => $poId,
                        'item_name' => $this->itemService->name,
                        'quantity' => 1,
                    ],
                ],
            ])
            ->assertStatus(422);

        // Close SERVICE PO via Berita Acara
        $closeRes = $this->actingAs($this->procurement, 'web')
            ->postJson("/api/procurement/po/{$poId}/close-service", [
                'berita_acara_number' => 'BA-2026-0001',
                'berita_acara_date' => '2026-11-25',
                'completion_percentage' => 100,
                'service_description' => 'Calibration verified and signed by plant head.',
                'verified_by_name' => 'Ir. Hendra',
            ]);
        $closeRes->assertOk()
            ->assertJsonPath('data.status', 'Closed')
            ->assertJsonPath('data.order_category', 'SERVICE');

        $po->refresh();
        $this->assertSame('Closed', $po->status);
        $this->assertSame($this->procurement->id, $po->closed_by);
        $this->assertDatabaseHas('po_service_closures', [
            'purchase_order_id' => $po->id,
            'berita_acara_number' => 'BA-2026-0001',
            'status' => 'Closed',
        ]);
        $this->assertDatabaseHas('approval_histories', [
            'document_type' => 'PO',
            'document_id' => $po->id,
            'action' => 'CLOSED_BERITA_ACARA',
            'to_status' => 'Closed',
        ]);

        // Double close & unapprove/reject on Closed PO must fail
        $this->actingAs($this->procurement, 'web')
            ->postJson("/api/procurement/po/{$poId}/close-service", [
                'berita_acara_date' => '2026-11-25',
            ])
            ->assertStatus(422);
        $this->actingAs($this->approver2, 'web')
            ->postJson("/api/approval/po/{$poId}/unapprove", ['tier' => 2])
            ->assertStatus(422);
    }

    public function test_bpb_service_skips_warehouse_and_inventory_while_bpb_goods_preserves_stock_flow(): void
    {
        $stockBefore = (float) $this->itemGoods->fresh()->stock;
        $serviceStockBefore = (float) $this->itemService->fresh()->stock;

        // Approved SERVICE PO
        $poSrvRes = $this->actingAs($this->procurement, 'web')
            ->postJson('/api/procurement/po', [
                'po_types_id' => $this->poTypeSrv->id,
                'supliers_id' => $this->supplier->id,
                'items' => [['items_id' => $this->itemService->id, 'order' => 1, 'price' => 1500000]],
            ])->assertStatus(201);
        $poSrvId = (int) $poSrvRes->json('data.id');
        $poSrvNumber = (string) $poSrvRes->json('data.po_number');
        $this->actingAs($this->approver1, 'web')->postJson("/api/procurement/po/{$poSrvId}/approve", ['tier' => 1])->assertOk();
        $this->actingAs($this->approver2, 'web')->postJson("/api/procurement/po/{$poSrvId}/approve", ['tier' => 2])->assertOk();

        // Attempting GOODS BPB on SERVICE PO -> 422
        $this->actingAs($this->warehouseUser, 'web')
            ->postJson('/api/warehouse/bpb', [
                'source_type' => 'PO',
                'bpb_category' => 'GOODS',
                'po_number' => $poSrvNumber,
                'items' => [
                    ['poNumber' => $poSrvNumber, 'name' => $this->itemService->name, 'receiveQty' => 1, 'warehouse_id' => $this->whA->id],
                ],
            ])
            ->assertStatus(422);

        // Creating SERVICE BPB without warehouse succeeds
        $bpbSrvRes = $this->actingAs($this->warehouseUser, 'web')
            ->postJson('/api/warehouse/bpb', [
                'source_type' => 'PO',
                'bpb_category' => 'SERVICE',
                'po_number' => $poSrvNumber,
                'items' => [
                    ['poNumber' => $poSrvNumber, 'name' => $this->itemService->name, 'receiveQty' => 1],
                ],
            ]);
        $bpbSrvRes->assertStatus(201)->assertJsonPath('data.bpb_category', 'SERVICE');
        $bpbSrvId = (int) $bpbSrvRes->json('data.id');

        $this->assertDatabaseHas('po_rn_to_bpb', [
            'bpb_receive_material_id' => $bpbSrvId,
            'warehouses_id' => null,
        ]);

        // Approve SERVICE BPB Stage 1 -> Stage 2: inventory must NOT change
        $movementsBefore = DB::table('inventory_movements')->count();
        $this->actingAs($this->approver1, 'web')->postJson("/api/approval/bpb/{$bpbSrvId}/approve", ['tier' => 1])->assertOk();
        $this->actingAs($this->approver2, 'web')->postJson("/api/approval/bpb/{$bpbSrvId}/approve", ['tier' => 2])->assertOk();
        $this->assertEquals($serviceStockBefore, (float) $this->itemService->fresh()->stock);
        $this->assertEquals($movementsBefore, DB::table('inventory_movements')->count());

        // Now verify GOODS BPB still requires warehouse and increases stock on Stage 2 approval
        $poGoodsRes = $this->actingAs($this->procurement, 'web')
            ->postJson('/api/procurement/po', [
                'po_types_id' => $this->poTypeStd->id,
                'supliers_id' => $this->supplier->id,
                'facility_status' => 'NON FASILITAS',
                'is_kawasan_berikat' => false,
                'items' => [['items_id' => $this->itemGoods->id, 'order' => 10, 'price' => 50000]],
            ])->assertStatus(201);
        $poGoodsId = (int) $poGoodsRes->json('data.id');
        $poGoodsNumber = (string) $poGoodsRes->json('data.po_number');
        $this->actingAs($this->approver1, 'web')->postJson("/api/procurement/po/{$poGoodsId}/approve", ['tier' => 1])->assertOk();
        $this->actingAs($this->approver2, 'web')->postJson("/api/procurement/po/{$poGoodsId}/approve", ['tier' => 2])->assertOk();

        // Missing warehouse on GOODS BPB fails
        $this->actingAs($this->warehouseUser, 'web')
            ->postJson('/api/warehouse/bpb', [
                'source_type' => 'PO',
                'po_number' => $poGoodsNumber,
                'items' => [['poNumber' => $poGoodsNumber, 'name' => $this->itemGoods->name, 'receiveQty' => 10]],
            ])
            ->assertStatus(422);

        // With warehouse succeeds and updates stock on Tier 2 approval
        $bpbGoodsRes = $this->actingAs($this->warehouseUser, 'web')
            ->postJson('/api/warehouse/bpb', [
                'source_type' => 'PO',
                'po_number' => $poGoodsNumber,
                'items' => [
                    [
                        'poNumber' => $poGoodsNumber,
                        'name' => $this->itemGoods->name,
                        'receiveQty' => 10,
                        'warehouse_id' => $this->whB->id,
                    ],
                ],
            ])->assertStatus(201);
        $bpbGoodsId = (int) $bpbGoodsRes->json('data.id');
        $this->actingAs($this->approver1, 'web')->postJson("/api/approval/bpb/{$bpbGoodsId}/approve", ['tier' => 1])->assertOk();
        $this->actingAs($this->approver2, 'web')->postJson("/api/approval/bpb/{$bpbGoodsId}/approve", ['tier' => 2])->assertOk();

        $this->assertEquals($stockBefore + 10.0, (float) $this->itemGoods->fresh()->stock);
        $this->assertEquals(10.0, app(InventoryService::class)->getWarehouseStockBalance($this->itemGoods->id, $this->whB->id));
    }

    public function test_rm_derives_department_from_authenticated_user_and_ignores_removed_fields(): void
    {
        // Reject attempt to override authenticated requester's department with deptB
        $this->actingAs($this->requester, 'web')
            ->postJson('/api/warehouse/request-materials', [
                'departments_id' => $this->deptB->id,
                'warehouses_id' => $this->whA->id,
                'type_of_request_id' => $this->requestType->id,
                'items' => [['items_id' => $this->itemGoods->id, 'quantity' => 5]],
            ])
            ->assertStatus(422);

        // Create RM omitting departments_id (should derive deptA from $this->requester)
        // Sending deprecated customer/job_number/project_type/size must not persist
        $rmRes = $this->actingAs($this->requester, 'web')
            ->postJson('/api/warehouse/request-materials', [
                'warehouses_id' => $this->whA->id,
                'type_of_request_id' => $this->requestType->id,
                'customer' => 'Legacy Customer Ignored',
                'job_number' => 'JOB-999',
                'project_type' => 'Dedicated',
                'items' => [['items_id' => $this->itemGoods->id, 'quantity' => 5, 'size' => '100x200']],
            ]);
        $rmRes->assertStatus(201);
        $rmId = (int) $rmRes->json('data.rawId');

        $rm = RequestMaterial::findOrFail($rmId);
        $this->assertSame($this->deptA->id, (int) $rm->departments_id);
        $this->assertNull($rm->customer);
        $this->assertNull($rm->job_number_id);
        $this->assertNull($rm->job_number);
        $this->assertNull($rm->project_type);

        // Update attempt with another department must also return 422
        $this->actingAs($this->requester, 'web')
            ->putJson("/api/warehouse/request-materials/{$rmId}", [
                'departments_id' => $this->deptB->id,
                'warehouses_id' => $this->whA->id,
            ])
            ->assertStatus(422);

        // Legacy historical RM remains readable
        $job = JobNumber::create(['code' => 'JN-OLD-01', 'name' => 'Legacy Project', 'status' => 1]);
        RequestMaterial::create([
            'request_number' => 'REQ-WH-LEGACY-001',
            'departments_id' => $this->deptB->id,
            'warehouses_id' => $this->whA->id,
            'type_of_request_id' => $this->requestType->id,
            'job_number_id' => $job->id,
            'job_number' => 'JN-OLD-01',
            'customer' => 'Historical PT Lama',
            'project_type' => 'Palah',
            'creator' => $this->admin->id,
            'request_date' => '2026-01-10',
            'status' => 'Approved',
        ]);
        $this->actingAs($this->admin, 'web')
            ->getJson('/api/warehouse/request-materials?search=REQ-WH-LEGACY-001')
            ->assertOk()
            ->assertJsonFragment(['customer' => 'Historical PT Lama', 'jobNumber' => 'Legacy Project']);
    }

    public function test_tsr_resolves_warehouse_from_rm_and_rejects_conflicting_warehouse(): void
    {
        $rmRes = $this->actingAs($this->requester, 'web')
            ->postJson('/api/warehouse/request-materials', [
                'warehouses_id' => $this->whA->id,
                'type_of_request_id' => $this->requestType->id,
                'items' => [['items_id' => $this->itemGoods->id, 'quantity' => 20]],
            ])->assertStatus(201);
        $rmId = (int) $rmRes->json('data.rawId');

        $this->actingAs($this->approver1, 'web')->postJson("/api/approval/rm/{$rmId}/approve", ['tier' => 1])->assertOk();
        $this->actingAs($this->approver2, 'web')->postJson("/api/approval/rm/{$rmId}/approve", ['tier' => 2])->assertOk();

        // Requester role is unauthorized to create TSR (sidebar/endpoint permission check)
        $this->actingAs($this->requester, 'web')
            ->postJson('/api/warehouse/transfer-stock-returns', [
                'request_material_id' => $rmId,
                'items' => [['items_id' => $this->itemGoods->id, 'quantity' => 5]],
            ])
            ->assertStatus(403);

        // Conflicting warehouse whB against RM on whA must be rejected with 422
        $this->actingAs($this->warehouseUser, 'web')
            ->postJson('/api/warehouse/transfer-stock-returns', [
                'request_material_id' => $rmId,
                'warehouses_id' => $this->whB->id,
                'items' => [['items_id' => $this->itemGoods->id, 'quantity' => 5]],
            ])
            ->assertStatus(422);

        // Omitting warehouses_id automatically resolves whA from RM
        $tsrRes = $this->actingAs($this->warehouseUser, 'web')
            ->postJson('/api/warehouse/transfer-stock-returns', [
                'request_material_id' => $rmId,
                'items' => [['items_id' => $this->itemGoods->id, 'quantity' => 5]],
            ]);
        $tsrRes->assertStatus(201)->assertJsonPath('data.warehouseId', $this->whA->id);
        $tsrId = (int) $tsrRes->json('data.rawId');

        // Updating with conflicting warehouse must fail
        $this->actingAs($this->warehouseUser, 'web')
            ->putJson("/api/warehouse/transfer-stock-returns/{$tsrId}", [
                'warehouses_id' => $this->whB->id,
            ])
            ->assertStatus(422);
    }

    public function test_warehouse_stock_transfer_validation_atomicity_and_idempotency(): void
    {
        // 1. Requester lacks inventory.adjust permission -> 403
        $this->actingAs($this->requester, 'web')
            ->postJson('/api/warehouse/stock-transfers', [
                'source_warehouse_id' => $this->whA->id,
                'destination_warehouse_id' => $this->whB->id,
                'items' => [['items_id' => $this->itemGoods->id, 'quantity' => 10]],
            ])
            ->assertStatus(403);

        // 2. Same source & destination -> 422
        $this->actingAs($this->warehouseUser, 'web')
            ->postJson('/api/warehouse/stock-transfers', [
                'source_warehouse_id' => $this->whA->id,
                'destination_warehouse_id' => $this->whA->id,
                'items' => [['items_id' => $this->itemGoods->id, 'quantity' => 10]],
            ])
            ->assertStatus(422);

        // 3. Inactive destination warehouse -> 422
        $this->actingAs($this->warehouseUser, 'web')
            ->postJson('/api/warehouse/stock-transfers', [
                'source_warehouse_id' => $this->whA->id,
                'destination_warehouse_id' => $this->whInactive->id,
                'items' => [['items_id' => $this->itemGoods->id, 'quantity' => 10]],
            ])
            ->assertStatus(422);

        // 4. Exceeding source warehouse balance -> 422
        $this->actingAs($this->warehouseUser, 'web')
            ->postJson('/api/warehouse/stock-transfers', [
                'source_warehouse_id' => $this->whA->id,
                'destination_warehouse_id' => $this->whB->id,
                'items' => [['items_id' => $this->itemGoods->id, 'quantity' => 500]],
            ])
            ->assertStatus(422);

        // 5. Item not present in source warehouse (itemService has 0 / no relation in whA) -> 422
        $this->actingAs($this->warehouseUser, 'web')
            ->postJson('/api/warehouse/stock-transfers', [
                'source_warehouse_id' => $this->whA->id,
                'destination_warehouse_id' => $this->whB->id,
                'items' => [['items_id' => $this->itemService->id, 'quantity' => 1]],
            ])
            ->assertStatus(422);

        // 6. Atomic transfer with idempotency_key moves 25 units whA -> whB; total stock remains 100
        $res1 = $this->actingAs($this->warehouseUser, 'web')
            ->postJson('/api/warehouse/stock-transfers', [
                'source_warehouse_id' => $this->whA->id,
                'destination_warehouse_id' => $this->whB->id,
                'source_coordinate_id' => $this->coordA->id,
                'destination_coordinate_id' => $this->coordB->id,
                'transfer_date' => '2026-11-25',
                'idempotency_key' => 'tx-key-abc-001',
                'note' => 'Rebalance storage',
                'items' => [['items_id' => $this->itemGoods->id, 'quantity' => 25]],
            ]);
        $res1->assertStatus(201)->assertJsonPath('data.status', 'Posted');

        $inv = app(InventoryService::class);
        $this->assertEquals(75.0, $inv->getWarehouseStockBalance($this->itemGoods->id, $this->whA->id));
        $this->assertEquals(25.0, $inv->getWarehouseStockBalance($this->itemGoods->id, $this->whB->id));
        $this->assertEquals(100.0, (float) $this->itemGoods->fresh()->stock);

        // Idempotent replay does NOT deduct again
        $resReplay = $this->actingAs($this->warehouseUser, 'web')
            ->postJson('/api/warehouse/stock-transfers', [
                'source_warehouse_id' => $this->whA->id,
                'destination_warehouse_id' => $this->whB->id,
                'idempotency_key' => 'tx-key-abc-001',
                'items' => [['items_id' => $this->itemGoods->id, 'quantity' => 25]],
            ]);
        $resReplay->assertOk()->assertJsonPath('idempotent_replay', true);
        $this->assertEquals(75.0, $inv->getWarehouseStockBalance($this->itemGoods->id, $this->whA->id));

        // 7. Draft -> Post flow + double-post guard
        $draftRes = $this->actingAs($this->warehouseUser, 'web')
            ->postJson('/api/warehouse/stock-transfers', [
                'source_warehouse_id' => $this->whA->id,
                'destination_warehouse_id' => $this->whB->id,
                'auto_post' => false,
                'items' => [['items_id' => $this->itemGoods->id, 'quantity' => 15]],
            ]);
        $draftRes->assertStatus(201)->assertJsonPath('data.status', 'Draft');
        $draftId = (int) $draftRes->json('data.id');

        // Still 75 / 25 before post
        $this->assertEquals(75.0, $inv->getWarehouseStockBalance($this->itemGoods->id, $this->whA->id));

        $this->actingAs($this->warehouseUser, 'web')
            ->postJson("/api/warehouse/stock-transfers/{$draftId}/post")
            ->assertOk()
            ->assertJsonPath('data.status', 'Posted');

        $this->assertEquals(60.0, $inv->getWarehouseStockBalance($this->itemGoods->id, $this->whA->id));
        $this->assertEquals(40.0, $inv->getWarehouseStockBalance($this->itemGoods->id, $this->whB->id));
        $this->assertEquals(100.0, (float) $this->itemGoods->fresh()->stock);

        // Second post attempt must be rejected with 422
        $this->actingAs($this->warehouseUser, 'web')
            ->postJson("/api/warehouse/stock-transfers/{$draftId}/post")
            ->assertStatus(422);

        $this->assertEquals(2, WarehouseStockTransfer::count());
    }
}
