<?php

namespace Tests\Feature;

use App\Models\Master\Customs\Facility;
use App\Models\Master\Finance\Account;
use App\Models\Master\Finance\DeliveryTerm;
use App\Models\Master\Finance\PaymentMethod;
use App\Models\Master\Finance\PaymentTerm;
use App\Models\Master\Finance\Valuta;
use App\Models\Master\Material\Classification;
use App\Models\Master\Material\Item;
use App\Models\Master\Material\ItemType;
use App\Models\Master\Material\UnitOfMeasurement;
use App\Models\Master\Organization\Department;
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
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class AttachmentDownloadTest extends TestCase
{
    use RefreshDatabase;

    protected User $user;
    protected Department $dept;
    protected Section $sec;
    protected Item $item;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(\Database\Seeders\GovernanceAndRbacSeeder::class);

        $this->user = User::where('role', Role::SUPERADMIN)->first()
            ?? User::factory()->create(['role' => Role::SUPERADMIN, 'status' => 1]);

        $this->dept = Department::firstOrCreate(['name' => 'IT']);
        $this->sec = Section::firstOrCreate(['name' => 'Section 01']);
        $uom = UnitOfMeasurement::firstOrCreate(['name' => 'PCE']);
        $repType = ReportingType::firstOrCreate(['name' => 'General Report']);
        $account = Account::firstOrCreate(['code' => '115.01'], ['name' => 'General Inventory Account']);
        $class = Classification::firstOrCreate(
            ['code' => 'CLS-ATT'],
            ['name' => 'General', 'reporting_types_id' => $repType->id, 'accounts_id' => $account->id]
        );
        $fac = Facility::firstOrCreate(['name' => 'FASILITAS']);
        $type = ItemType::firstOrCreate(['name' => 'Mat']);

        $this->item = Item::create([
            'name' => 'Attachment Spec Item',
            'code' => 'ITM-ATT-001',
            'classifications_id' => $class->id,
            'facilities_id' => $fac->id,
            'units_of_measurements_id' => $uom->id,
            'item_types_id' => $type->id,
        ]);
    }

    public function test_pr_upload_and_download_attachment_supports_hyphenated_pr_numbers(): void
    {
        Storage::fake('public');

        $pr = PurchaseRequisition::create([
            'pr_number' => '0015/PR-IMLI/XI/2026',
            'departments_id' => $this->dept->id,
            'sections_id' => $this->sec->id,
            'creator' => $this->user->id,
            'date' => '2026-11-12',
            'due_date' => '2026-11-26',
            'status' => 'Waiting for Approve 1',
        ]);

        // 1. Returns JSON 404 when no attachment has been uploaded
        $missingResp = $this->actingAs($this->user, 'web')
            ->getJson("/api/procurement/pr/{$pr->id}/attachment");
        $missingResp->assertStatus(404);
        $missingResp->assertJsonFragment(['status' => 'error']);

        // 2. Upload attachment to PR via API
        $file = UploadedFile::fake()->create('tech_spec_v1.pdf', 120, 'application/pdf');
        $uploadResp = $this->actingAs($this->user, 'web')
            ->post("/api/procurement/pr/{$pr->id}/attachment", [
                'attachment_file' => $file,
            ]);

        $uploadResp->assertStatus(200);
        $uploadResp->assertJson([
            'status' => 'success',
            'attachment_file' => 'tech_spec_v1.pdf',
            'attachment_url' => "/api/procurement/pr/{$pr->id}/attachment",
        ]);

        // 3. Download by ID works
        $byIdResp = $this->actingAs($this->user, 'web')
            ->get("/api/procurement/pr/{$pr->id}/attachment");
        $byIdResp->assertStatus(200);
        $this->assertStringContainsString('tech_spec_v1.pdf', (string) $byIdResp->headers->get('Content-Disposition'));

        // 4. Download by slugified PR number with internal hyphens works (0015-PR-IMLI-XI-2026)
        $bySlugResp = $this->actingAs($this->user, 'web')
            ->get('/api/procurement/pr/0015-PR-IMLI-XI-2026/attachment');
        $bySlugResp->assertStatus(200);
        $this->assertStringContainsString('tech_spec_v1.pdf', (string) $bySlugResp->headers->get('Content-Disposition'));

        // 5. Show endpoint exposes API download URL rather than /storage/ path
        $showResp = $this->actingAs($this->user, 'web')
            ->getJson('/api/procurement/pr/0015-PR-IMLI-XI-2026');
        $showResp->assertStatus(200);
        $showResp->assertJsonPath('item.attachment_file', 'tech_spec_v1.pdf');
        $showResp->assertJsonPath('item.attachment_url', "/api/procurement/pr/{$pr->id}/attachment");
    }

    public function test_po_attachment_endpoint_resolves_and_downloads_linked_pr_attachment(): void
    {
        Storage::fake('public');

        $stored = Storage::disk('public')->putFileAs(
            'attachments/pr',
            UploadedFile::fake()->create('po_linked_spec.xlsx', 80, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'),
            '1794897241_po_linked_spec.xlsx'
        );

        $pr = PurchaseRequisition::create([
            'pr_number' => '0016/PR-IMLI/XI/2026',
            'departments_id' => $this->dept->id,
            'sections_id' => $this->sec->id,
            'creator' => $this->user->id,
            'date' => '2026-11-12',
            'due_date' => '2026-11-26',
            'attachment_file' => $stored,
            'status' => 'Approved',
        ]);

        $prItem = PurchaseRequisitionItem::create([
            'purchase_requisitions_id' => $pr->id,
            'items_id' => $this->item->id,
            'quantity' => '5',
            'due_date' => '2026-11-26',
        ]);

        $country = Country::firstOrCreate(['name' => 'Indonesia'], ['status' => 1]);
        $valuta = Valuta::firstOrCreate(['code' => 'IDR'], ['name' => 'Indonesian Rupiah']);
        $poType = PoType::firstOrCreate(['code' => 'LOC'], ['name' => 'Local']);
        $payTerm = PaymentTerm::firstOrCreate(['name' => 'Net 14 Days']);
        $payMethod = PaymentMethod::firstOrCreate(['name' => 'Bank Transfer']);
        $delivTerm = DeliveryTerm::firstOrCreate(['name' => 'Franco']);
        $currencyId = DB::table('currencies')->insertGetId(['name' => 'IDR', 'status' => 1, 'created_at' => now(), 'updated_at' => now()]);
        $portId = DB::table('ports')->insertGetId(['name' => 'Tanjung Priok', 'status' => 1, 'created_at' => now(), 'updated_at' => now()]);
        $rafaksiId = DB::table('rafaksi_types')->insertGetId(['name' => 'None', 'status' => 1, 'created_at' => now(), 'updated_at' => now()]);

        $supplier = Supplier::firstOrCreate(
            ['code' => 'SUP-ATT-01'],
            [
                'name' => 'PT Attachment Supplier',
                'countries_id' => $country->id,
                'payment_terms_id' => $payTerm->id,
                'payment_methods_id' => $payMethod->id,
                'rafaksi_types_id' => $rafaksiId,
                'currencies_id' => $currencyId,
                'ports_id' => $portId,
                'address' => 'Jakarta',
            ]
        );

        $po = PurchaseOrder::create([
            'po_number' => 'POL-1126-0099',
            'creator_id' => $this->user->id,
            'po_types_id' => $poType->id,
            'date' => '2026-11-16',
            'due_date' => '2026-12-16',
            'valutas_id' => $valuta->id,
            'rate' => '1.00',
            'supliers_id' => $supplier->id,
            'address' => 'Jakarta',
            'payment_terms_id' => $payTerm->id,
            'payment_methods_id' => $payMethod->id,
            'delivery_terms_id' => $delivTerm->id,
            'latest_delivery' => '2026-12-16 00:00:00',
            'status' => 'Waiting for Approve 1',
        ]);

        PurchaseOrderItem::create([
            'purchase_order_id' => $po->id,
            'pr_has_items_id' => $prItem->id,
            'items_id' => $this->item->id,
            'item_alias' => $this->item->name,
            'price' => 10000,
            'purchased' => 5,
            'order' => 5,
            'subtotal' => 50000,
            'total' => 50000,
            'dpp' => 50000,
            'grand_total' => 50000,
        ]);

        $showPoResp = $this->actingAs($this->user, 'web')
            ->getJson("/api/procurement/po/{$po->po_number}");
        $showPoResp->assertStatus(200);
        $showPoResp->assertJsonPath('item.attachment_file', 'po_linked_spec.xlsx');
        $showPoResp->assertJsonPath('item.attachment_url', "/api/procurement/po/{$po->id}/attachment");

        $downloadPoResp = $this->actingAs($this->user, 'web')
            ->get("/api/procurement/po/{$po->po_number}/attachment");
        $downloadPoResp->assertStatus(200);
        $this->assertStringContainsString('po_linked_spec.xlsx', (string) $downloadPoResp->headers->get('Content-Disposition'));
    }
}
