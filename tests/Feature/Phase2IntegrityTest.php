<?php

namespace Tests\Feature;

use App\Models\Master\Customs\Facility;
use App\Models\Master\Finance\Account;
use App\Models\Master\Finance\Currency;
use App\Models\Master\Finance\DeliveryTerm;
use App\Models\Master\Finance\PaymentMethod;
use App\Models\Master\Finance\PaymentTerm;
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
use App\Models\Master\Partner\Supplier;
use App\Models\Procurement\PurchaseOrder\PoType;
use App\Models\Procurement\PurchaseOrder\PurchaseOrder;
use App\Models\Procurement\PurchaseOrder\PurchaseOrderItem;
use App\Models\Procurement\PurchaseRequest\PurchaseRequisition;
use App\Models\Procurement\PurchaseRequest\PurchaseRequisitionItem;
use App\Models\System\Auth\User;
use App\Models\System\Governance\Role;
use App\Models\Warehouse\Facility\Warehouse;
use App\Models\Warehouse\Facility\WarehouseType;
use App\Models\Warehouse\GateReceiving\PurchaseOrderReceiveNote;
use App\Models\Warehouse\GateReceiving\ReceiveNote;
use App\Services\DocumentNumber\DocumentNumberGenerator;
use App\Services\GeniusOneBackend;
use App\Services\Reporting\PrPoTraceabilityService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use InvalidArgumentException;
use Tests\TestCase;

class Phase2IntegrityTest extends TestCase
{
    use RefreshDatabase;

    public function test_document_number_generator_avoids_collisions_after_deletions(): void
    {
        $user = User::query()->create([
            'username' => 'docnum-tester',
            'name' => 'DocNum Tester',
            'email' => 'docnum@geniusone.test',
            'password' => 'secret123',
            'role' => User::ROLE_ADMIN,
            'status' => 1,
        ]);
        $dept = Department::query()->create(['name' => 'Num Dept', 'status' => 1]);
        $sec = Section::query()->create(['name' => 'Num Sec', 'departments_id' => $dept->id, 'status' => 1]);

        $pr1Num = DocumentNumberGenerator::generatePrNumber();
        $pr1 = PurchaseRequisition::create([
            'pr_number' => $pr1Num,
            'departments_id' => $dept->id,
            'sections_id' => $sec->id,
            'creator' => $user->id,
            'date' => now()->toDateString(),
            'due_date' => now()->addDays(7)->toDateString(),
            'status' => 'Waiting for Approve 1',
        ]);

        $pr2Num = DocumentNumberGenerator::generatePrNumber();
        $pr2 = PurchaseRequisition::create([
            'pr_number' => $pr2Num,
            'departments_id' => $dept->id,
            'sections_id' => $sec->id,
            'creator' => $user->id,
            'date' => now()->toDateString(),
            'due_date' => now()->addDays(7)->toDateString(),
            'status' => 'Waiting for Approve 1',
        ]);

        // Soft-delete PR 1 -> next generated number must be 0003, never collide with 0002 or soft-deleted 0001
        $pr1->delete();
        $pr3Num = DocumentNumberGenerator::generatePrNumber();
        $this->assertNotSame($pr1Num, $pr3Num);
        $this->assertNotSame($pr2Num, $pr3Num);
        $this->assertStringStartsWith('0003/PR-IMLI/', $pr3Num);
    }

    public function test_traceability_executive_summary_excludes_rejected_and_soft_deleted_records(): void
    {
        $user = User::query()->create([
            'username' => 'trace-tester',
            'name' => 'Trace Tester',
            'email' => 'trace@geniusone.test',
            'password' => 'secret123',
            'role' => User::ROLE_ADMIN,
            'status' => 1,
        ]);
        $supCountry = Country::query()->create(['code' => 'ID', 'name' => 'Indonesia', 'status' => 1]);
        $payTerm = PaymentTerm::query()->create(['name' => 'Net 30', 'status' => 1]);
        $payMethod = PaymentMethod::query()->create(['name' => 'Transfer', 'status' => 1]);
        $delivTerm = DeliveryTerm::query()->create(['name' => 'CIF', 'status' => 1]);
        $valuta = Valuta::query()->create(['code' => 'IDR', 'name' => 'Rupiah', 'status' => 1]);
        $currency = Currency::query()->create(['name' => 'IDR', 'status' => 1]);
        $rafaksi = \App\Models\Master\Finance\RafaksiType::query()->create(['code' => 'RF-01', 'name' => 'None', 'status' => 1]);
        $port = \App\Models\Master\Partner\Port::query()->create(['name' => 'Tanjung Priok', 'status' => 1]);
        $poType = PoType::query()->create(['code' => 'LOC', 'name' => 'Local', 'status' => 1]);
        $supplier = Supplier::query()->create([
            'code' => 'SUP-TR-01',
            'name' => 'Trace Supplier',
            'countries_id' => $supCountry->id,
            'payment_terms_id' => $payTerm->id,
            'payment_methods_id' => $payMethod->id,
            'rafaksi_types_id' => $rafaksi->id,
            'currencies_id' => $currency->id,
            'ports_id' => $port->id,
        ]);
        $job = JobNumber::query()->create(['code' => 'JOB-TR-01', 'name' => 'Trace Job', 'status' => 1]);

        $activePo = PurchaseOrder::create([
            'po_number' => 'POL-TR-0001',
            'creator_id' => $user->id,
            'po_types_id' => $poType->id,
            'date' => now()->toDateString(),
            'due_date' => now()->addDays(7)->toDateString(),
            'latest_delivery' => now()->addDays(7)->toDateString(),
            'valutas_id' => $valuta->id,
            'rate' => '1',
            'supliers_id' => $supplier->id,
            'address' => 'Test Vendor Address',
            'payment_terms_id' => $payTerm->id,
            'payment_methods_id' => $payMethod->id,
            'delivery_terms_id' => $delivTerm->id,
            'status' => 'Approved',
        ]);
        PurchaseOrderItem::create([
            'purchase_order_id' => $activePo->id,
            'item_alias' => 'Active Item',
            'price' => 1000,
            'order' => 10,
            'subtotal' => 10000,
            'dpp' => 10000,
            'grand_total' => 11100,
        ]);

        $rejectedPo = PurchaseOrder::create([
            'po_number' => 'POL-TR-0002',
            'creator_id' => $user->id,
            'po_types_id' => $poType->id,
            'date' => now()->toDateString(),
            'due_date' => now()->addDays(7)->toDateString(),
            'latest_delivery' => now()->addDays(7)->toDateString(),
            'valutas_id' => $valuta->id,
            'rate' => '1',
            'supliers_id' => $supplier->id,
            'address' => 'Test Vendor Address',
            'payment_terms_id' => $payTerm->id,
            'payment_methods_id' => $payMethod->id,
            'delivery_terms_id' => $delivTerm->id,
            'status' => 'Rejected',
        ]);
        PurchaseOrderItem::create([
            'purchase_order_id' => $rejectedPo->id,
            'item_alias' => 'Rejected Item',
            'price' => 5000,
            'order' => 50,
            'subtotal' => 250000,
            'dpp' => 250000,
            'grand_total' => 277500,
        ]);

        $deletedRn = ReceiveNote::create([
            'rn_number' => '0001/RN-TR/XI/2026',
            'status' => 'Approved',
            'supliers_id' => $supplier->id,
            'currencies_id' => $currency->id,
            'rate' => 1,
            'arrival_date' => now(),
            'updated_by' => $user->id,
        ]);
        PurchaseOrderReceiveNote::create([
            'purchase_order_id' => $activePo->id,
            'receive_note_id' => $deletedRn->id,
            'job_number_id' => $job->id,
            'item_name' => 'Active Item',
            'quantity' => 8,
            'rafaksi' => 0,
            'price' => 1000,
            'grand_total' => 8000,
        ]);
        $deletedRn->delete();

        $summary = app(PrPoTraceabilityService::class)->getExecutiveSummary();
        $this->assertSame(1, $summary['po']['total']);
        $this->assertSame(11100.0, (float) $summary['po']['total_value']);
        $this->assertSame(10.0, (float) $summary['warehouse']['ordered_quantity']);
        $this->assertSame(0.0, (float) $summary['warehouse']['net_received_quantity']);
        $this->assertSame(0, $summary['warehouse']['total_rn']);
    }

    public function test_consolidated_approval_delegators_and_service_sort_allowlists(): void
    {
        $this->seed(\Database\Seeders\GovernanceAndRbacSeeder::class);
        $approver1 = User::where('role', Role::APPROVER_TIER1)->firstOrFail();
        $approver2 = User::where('role', Role::APPROVER_TIER2)->firstOrFail();

        $dept = Department::query()->create(['name' => 'Sort Dept', 'status' => 1]);
        $sec = Section::query()->create(['name' => 'Sort Sec', 'departments_id' => $dept->id, 'status' => 1]);
        $pr = PurchaseRequisition::create([
            'pr_number' => '0555/PR-CON/XI/2026',
            'departments_id' => $dept->id,
            'sections_id' => $sec->id,
            'creator' => $approver1->id,
            'date' => now()->toDateString(),
            'due_date' => now()->addDays(7)->toDateString(),
            'status' => 'Waiting for Approve 1',
        ]);

        // Stage 2 cannot bypass Stage 1 through consolidated ApprovalWorkflowService
        $this->expectException(InvalidArgumentException::class);
        GeniusOneBackend::procurementApproval()->approvePr($pr->id, $approver2->id, 2);
    }

    public function test_services_ignore_invalid_sort_columns_and_direct_po_bpb_controller_delegates(): void
    {
        $user = User::query()->create([
            'username' => 'bpb-flow-user',
            'name' => 'BPB Flow User',
            'email' => 'bpb-flow@geniusone.test',
            'password' => 'secret123',
            'role' => User::ROLE_ADMIN,
            'status' => 1,
        ]);
        $this->actingAs($user, 'web');

        // Sorting allowlist safely rejects injected SQL expressions without throwing DB error
        $this->assertSame(0, GeniusOneBackend::pr()->listRequisitions(['sort_by' => 'id; DROP TABLE users--', 'sort_order' => 'sideways'])->total());
        $this->assertSame(0, GeniusOneBackend::po()->listOrders(['sort_by' => 'invalid_col', 'sort_order' => 'ASC'])->total());
        $this->assertSame(0, GeniusOneBackend::bpb()->listBpbs(['sort_by' => 'bad_col', 'sort_order' => 'desc'])->total());
        $this->assertSame(0, GeniusOneBackend::receiveNote()->listReceiveNotes(['sort_by' => 'bad_col', 'sort_order' => 'asc'])->total());

        // Direct Non-KB PO -> BPB via controller delegating to BpbWarehouseService (tests portable CASE WHEN query)
        $account = Account::query()->create(['code' => '115.77', 'name' => 'BPB Acc', 'category' => 'Inventory', 'status' => 'active']);
        $rep = ReportingType::query()->create(['name' => 'BPB Rep', 'status' => 1]);
        $cls = Classification::query()->create(['reporting_types_id' => $rep->id, 'accounts_id' => $account->id, 'code' => 'BPB-C', 'name' => 'BPB C', 'status' => 1]);
        $fac = Facility::query()->create(['name' => 'NON FASILITAS', 'status' => 1]);
        $uom = UnitOfMeasurement::query()->create(['code' => 'PCS', 'name' => 'Pieces', 'status' => 1]);
        $itemType = ItemType::query()->create(['name' => 'Raw Material', 'status' => 'active']);
        $item = Item::query()->create([
            'code' => 'BPB-ITM-01',
            'name' => 'BPB Bolt',
            'classifications_id' => $cls->id,
            'facilities_id' => $fac->id,
            'item_types_id' => $itemType->id,
            'units_of_measurements_id' => $uom->id,
            'status' => 1,
        ]);
        $whType = WarehouseType::query()->create(['name' => 'Main', 'status' => 1]);
        $wh = Warehouse::query()->create(['name' => 'Gudang NonKB', 'code' => 'WH-NKB', 'warehouse_types_id' => $whType->id, 'status' => 1]);
        $country = Country::query()->create(['code' => 'ID', 'name' => 'Indonesia', 'status' => 1]);
        $payTerm = PaymentTerm::query()->create(['name' => 'COD', 'status' => 1]);
        $payMethod = PaymentMethod::query()->create(['name' => 'Cash', 'status' => 1]);
        $delivTerm = DeliveryTerm::query()->create(['name' => 'EXW', 'status' => 1]);
        $valuta = Valuta::query()->create(['code' => 'IDR', 'name' => 'IDR', 'status' => 1]);
        $currency = Currency::query()->create(['name' => 'IDR', 'status' => 1]);
        $rafaksi = \App\Models\Master\Finance\RafaksiType::query()->create(['code' => 'RF-02', 'name' => 'None 2', 'status' => 1]);
        $port = \App\Models\Master\Partner\Port::query()->create(['name' => 'Tanjung Emas', 'status' => 1]);
        $poType = PoType::query()->create(['code' => 'LOC', 'name' => 'Local', 'status' => 1]);
        $supplier = Supplier::query()->create([
            'code' => 'SUP-BPB',
            'name' => 'BPB Vendor',
            'countries_id' => $country->id,
            'payment_terms_id' => $payTerm->id,
            'payment_methods_id' => $payMethod->id,
            'rafaksi_types_id' => $rafaksi->id,
            'currencies_id' => $currency->id,
            'ports_id' => $port->id,
        ]);
        JobNumber::query()->create(['code' => 'JOB-BPB-01', 'name' => 'BPB Job', 'status' => 1]);

        $po = PurchaseOrder::create([
            'po_number' => 'POL-BPB-0001',
            'creator_id' => $user->id,
            'po_types_id' => $poType->id,
            'date' => now()->toDateString(),
            'due_date' => now()->addDays(7)->toDateString(),
            'latest_delivery' => now()->addDays(7)->toDateString(),
            'valutas_id' => $valuta->id,
            'rate' => '1',
            'supliers_id' => $supplier->id,
            'address' => 'Test Vendor Address',
            'payment_terms_id' => $payTerm->id,
            'payment_methods_id' => $payMethod->id,
            'delivery_terms_id' => $delivTerm->id,
            'facility_status' => 'NON FASILITAS',
            'is_kawasan_berikat' => false,
            'status' => 'Approved',
        ]);
        $poItem = PurchaseOrderItem::create([
            'purchase_order_id' => $po->id,
            'items_id' => $item->id,
            'item_alias' => $item->name,
            'price' => 500,
            'order' => 10,
            'subtotal' => 5000,
            'dpp' => 5000,
            'grand_total' => 5550,
        ]);

        $this->postJson('/api/warehouse/bpb', [
            'source_type' => 'PO',
            'po_number' => $po->po_number,
            'warehouse_id' => $wh->id,
            'items' => [
                [
                    'po_has_items_id' => $poItem->id,
                    'po_number' => $po->po_number,
                    'warehouse_id' => $wh->id,
                    'receiveQty' => 6,
                ],
            ],
        ])->assertCreated()
            ->assertJsonPath('status', 'success');

        // Over-receiving remaining PO qty (6 + 5 > 10) must be rejected cleanly with 422
        $this->postJson('/api/warehouse/bpb', [
            'source_type' => 'PO',
            'po_number' => $po->po_number,
            'warehouse_id' => $wh->id,
            'items' => [
                [
                    'po_has_items_id' => $poItem->id,
                    'po_number' => $po->po_number,
                    'warehouse_id' => $wh->id,
                    'receiveQty' => 5,
                ],
            ],
        ])->assertStatus(422);
    }

    public function test_rejected_documents_cannot_be_approved_directly_and_return_requires_two_stage_approval(): void
    {
        $this->seed(\Database\Seeders\GovernanceAndRbacSeeder::class);
        $approver1 = User::where('role', Role::APPROVER_TIER1)->firstOrFail();
        $approver2 = User::where('role', Role::APPROVER_TIER2)->firstOrFail();
        $dept = Department::query()->create(['name' => 'Wf Dept', 'status' => 1]);
        $sec = Section::query()->create(['name' => 'Wf Sec', 'departments_id' => $dept->id, 'status' => 1]);

        $pr = PurchaseRequisition::create([
            'pr_number' => '0901/PR-WF/XI/2026',
            'departments_id' => $dept->id,
            'sections_id' => $sec->id,
            'creator' => $approver1->id,
            'date' => now()->toDateString(),
            'due_date' => now()->addDays(7)->toDateString(),
            'status' => 'Waiting for Approve 1',
        ]);

        // Reject PR at Stage 1
        $this->actingAs($approver1, 'web')
            ->postJson("/api/approval/pr/{$pr->id}/reject", ['tier' => 1, 'reason' => 'Missing qty detail'])
            ->assertOk();

        // Double reject must fail with 422
        $this->actingAs($approver1, 'web')
            ->postJson("/api/approval/pr/{$pr->id}/reject", ['tier' => 1, 'reason' => 'Double reject'])
            ->assertStatus(422);

        // Rejected PR MUST NOT be approvable directly at Stage 1 without resubmit
        $this->actingAs($approver1, 'web')
            ->postJson("/api/approval/pr/{$pr->id}/approve", ['tier' => 1])
            ->assertStatus(422);

        // After resubmit, Stage 1 -> Stage 2 approval works
        $this->actingAs($approver1, 'web')
            ->postJson("/api/approval/pr/{$pr->id}/resubmit", ['note' => 'Fixed quantity'])
            ->assertOk()
            ->assertJsonPath('data.status', 'Waiting for Approve 1');

        $this->actingAs($approver1, 'web')
            ->postJson("/api/approval/pr/{$pr->id}/approve", ['tier' => 1])
            ->assertOk()
            ->assertJsonPath('data.status', 'Waiting for Approve 2');

        // Receive Note Return cannot bypass Tier 2 approval via /api/exim/operations/returns/{id}/approve
        $ret = \App\Models\Warehouse\GateReceiving\ReceiveNoteReturn::create([
            'rn_number' => 'RNR-WF-0001',
            'customer' => 'Customer A',
            'delivery_order' => 'DO-001',
            'currency' => 'IDR',
            'exchange_rate' => 1,
            'approval_status' => 'Draft',
            'created_by' => $approver1->id,
            'updated_by' => $approver1->id,
        ]);

        // Skipping Stage 1 fails
        $this->actingAs($approver2, 'web')
            ->postJson("/api/exim/operations/returns/{$ret->id}/approve", ['tier' => 2])
            ->assertStatus(422);

        // Stage 1 moves Draft -> Waiting for Approve 2 (not straight to Approved)
        $this->actingAs($approver1, 'web')
            ->postJson("/api/exim/operations/returns/{$ret->id}/approve", ['tier' => 1])
            ->assertOk()
            ->assertJsonPath('data.approval_status', 'Waiting for Approve 2');

        // Stage 2 completes approval
        $this->actingAs($approver2, 'web')
            ->postJson("/api/exim/operations/returns/{$ret->id}/approve", ['tier' => 2])
            ->assertOk()
            ->assertJsonPath('data.approval_status', 'Approved');
    }

    public function test_pph_deduction_enum_yes_vs_no_matches_across_item_order_and_calculator(): void
    {
        $user = User::query()->create([
            'username' => 'pph-calc-tester',
            'name' => 'PPh Calc Tester',
            'email' => 'pph-calc@geniusone.test',
            'password' => 'secret123',
            'role' => User::ROLE_ADMIN,
            'status' => 1,
        ]);

        $pphType = \App\Models\Master\Finance\PphType::create(['nama' => 'PPh Pasal 23 Calc']);
        $pphNo = \App\Models\Master\Finance\Pph::create([
            'name' => 'PPh 2% Non Deduction',
            'value' => 2.0,
            'deduction' => 'no',
            'status' => 'active',
            'pph_type_id' => $pphType->id,
        ]);
        $pphYes = \App\Models\Master\Finance\Pph::create([
            'name' => 'PPh 2% Withholding',
            'value' => 2.0,
            'deduction' => 'yes',
            'status' => 'active',
            'pph_type_id' => $pphType->id,
        ]);

        $this->assertFalse($pphNo->isDeduction());
        $this->assertTrue($pphYes->isDeduction());

        $country = Country::query()->create(['code' => 'ID', 'name' => 'Indonesia PPh', 'status' => 1]);
        $payTerm = PaymentTerm::query()->create(['name' => 'Net 30 PPh', 'status' => 1]);
        $payMethod = PaymentMethod::query()->create(['name' => 'Bank PPh', 'status' => 1]);
        $delivTerm = DeliveryTerm::query()->create(['name' => 'FOB PPh', 'status' => 1]);
        $valuta = Valuta::query()->create(['code' => 'IDR', 'name' => 'Rupiah', 'status' => 1]);
        $currency = Currency::query()->create(['name' => 'IDR', 'status' => 1]);
        $rafaksi = \App\Models\Master\Finance\RafaksiType::query()->create(['code' => 'RF-PPH', 'name' => 'None PPh', 'status' => 1]);
        $port = \App\Models\Master\Partner\Port::query()->create(['name' => 'Port PPh', 'status' => 1]);
        $poType = PoType::query()->create(['code' => 'LOC', 'name' => 'Local PPh', 'status' => 1]);
        $supplier = Supplier::query()->create([
            'code' => 'SUP-PPH-01',
            'name' => 'PPh Vendor',
            'countries_id' => $country->id,
            'payment_terms_id' => $payTerm->id,
            'payment_methods_id' => $payMethod->id,
            'rafaksi_types_id' => $rafaksi->id,
            'currencies_id' => $currency->id,
            'ports_id' => $port->id,
        ]);

        // Case A: deduction = 'no' -> 100,000 + 11,000 PPN = 111,000 (PPh 2,000 does NOT deduct total)
        $calcNo = \App\Services\Procurement\ProcurementCalculationService::calculateItemFinancials(
            price: 10000,
            order: 10,
            ppnRate: 11.0,
            isKawasanBerikat: false,
            pphRate: 2.0,
            isPphDeduction: $pphNo->isDeduction()
        );
        $this->assertSame(2000.0, $calcNo['pph_amount']);
        $this->assertSame(111000.0, $calcNo['grand_total']);
        $this->assertSame(111000.0, \App\Services\Procurement\ProcurementCalculationService::calculateOrderGrandTotals([$calcNo])['grand_total']);

        $poNo = GeniusOneBackend::po()->createPo([
            'po_types_id' => $poType->id,
            'supliers_id' => $supplier->id,
            'date' => now()->toDateString(),
            'due_date' => now()->addDays(7)->toDateString(),
            'valutas_id' => $valuta->id,
            'rate' => '1',
            'address' => 'PPh Vendor Address',
            'payment_terms_id' => $payTerm->id,
            'payment_methods_id' => $payMethod->id,
            'delivery_terms_id' => $delivTerm->id,
            'latest_delivery' => now()->addDays(7)->toDateString(),
            'is_kawasan_berikat' => false,
            'facility_status' => 'NON FASILITAS',
        ], [
            ['item_alias' => 'Service A', 'price' => 10000, 'order' => 10, 'pph_id' => $pphNo->id, 'ppn_rate' => 11.0],
        ], [], $user->id)->load(['items.pph', 'items.ppn', 'additionalCosts']);

        $this->assertSame(111000.0, (float) $poNo->items->first()->grand_total);
        $this->assertSame(111000.0, $poNo->grand_total);

        // Case B: deduction = 'yes' -> 100,000 + 11,000 - 2,000 = 109,000
        $calcYes = \App\Services\Procurement\ProcurementCalculationService::calculateItemFinancials(
            price: 10000,
            order: 10,
            ppnRate: 11.0,
            isKawasanBerikat: false,
            pphRate: 2.0,
            isPphDeduction: $pphYes->isDeduction()
        );
        $this->assertSame(109000.0, $calcYes['grand_total']);
        $this->assertSame(109000.0, \App\Services\Procurement\ProcurementCalculationService::calculateOrderGrandTotals([$calcYes])['grand_total']);

        $poYes = GeniusOneBackend::po()->createPo([
            'po_types_id' => $poType->id,
            'supliers_id' => $supplier->id,
            'date' => now()->toDateString(),
            'due_date' => now()->addDays(7)->toDateString(),
            'valutas_id' => $valuta->id,
            'rate' => '1',
            'address' => 'PPh Vendor Address',
            'payment_terms_id' => $payTerm->id,
            'payment_methods_id' => $payMethod->id,
            'delivery_terms_id' => $delivTerm->id,
            'latest_delivery' => now()->addDays(7)->toDateString(),
            'is_kawasan_berikat' => false,
            'facility_status' => 'NON FASILITAS',
        ], [
            ['item_alias' => 'Service B', 'price' => 10000, 'order' => 10, 'pph_id' => $pphYes->id, 'ppn_rate' => 11.0],
        ], [], $user->id)->load(['items.pph', 'items.ppn', 'additionalCosts']);

        $this->assertSame(109000.0, (float) $poYes->items->first()->grand_total);
        $this->assertSame(109000.0, $poYes->grand_total);
    }
}
