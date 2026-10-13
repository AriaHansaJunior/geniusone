<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\DB;
use App\Models\User;
use App\Models\Department;
use App\Models\Section;
use App\Models\Currency;
use App\Models\Valuta;
use App\Models\UnitOfMeasurement;
use App\Models\Category;
use App\Models\Classification;
use App\Models\Facility;
use App\Models\Origin;
use App\Models\Port;
use App\Models\ItemType;
use App\Models\JobNumber;
use App\Models\WarehouseType;
use App\Models\Warehouse;
use App\Models\PaymentTerm;
use App\Models\PaymentMethod;
use App\Models\DeliveryTerm;
use App\Models\PoType;
use App\Models\RafaksiType;
use App\Models\ReportingType;
use App\Models\Account;
use App\Models\Supplier;
use App\Models\Item;
use App\Models\PurchaseRequisition;
use App\Models\PurchaseRequisitionItem;
use App\Models\PurchaseOrder;
use App\Models\PurchaseOrderItem;
use App\Models\ReceiveNote;
use App\Models\PurchaseOrderReceiveNote;
use App\Models\BpbReceiveMaterial;
use App\Models\PoRnToBpb;
use App\Models\ApprovalPr;
use App\Models\ApprovalPo;
use App\Models\ApprovalRn;
use App\Models\ApprovalBpb;
use App\Models\Log;
use Carbon\Carbon;

class GeniusOneDemoSeeder extends Seeder
{
    public function run(): void
    {
        $this->command->info("Seeding Master Data for GeniusOne...");

        // 1. Users
        $admin = User::updateOrCreate(
            ['email' => 'admin@geniusone.test'],
            [
                'username' => 'admin',
                'name' => 'Administrator GeniusOne',
                'password' => Hash::make('secret123'),
                'role' => User::ROLE_ADMIN,
                'status' => 1,
            ]
        );

        $procurementUser = User::updateOrCreate(
            ['email' => 'procurement@geniusone.test'],
            [
                'username' => 'arsyeila',
                'name' => 'Arsyeila (Purchasing)',
                'password' => Hash::make('secret123'),
                'role' => User::ROLE_PROCUREMENT,
                'status' => 1,
            ]
        );

        $approverUser = User::updateOrCreate(
            ['email' => 'manager@geniusone.test'],
            [
                'username' => 'hendra_mgr',
                'name' => 'Hendra Setiawan (Operations Head)',
                'password' => Hash::make('secret123'),
                'role' => User::ROLE_APPROVER,
                'status' => 1,
            ]
        );

        $warehouseUser = User::updateOrCreate(
            ['email' => 'warehouse@geniusone.test'],
            [
                'username' => 'budi_wh',
                'name' => 'Budi Santoso (Warehouse Supervisor)',
                'password' => Hash::make('secret123'),
                'role' => User::ROLE_WAREHOUSE,
                'status' => 1,
            ]
        );

        // 2. Departments & Sections
        $deptProd = Department::firstOrCreate(['name' => 'Produksi & Smelting'], ['status' => 1]);
        $deptMaint = Department::firstOrCreate(['name' => 'Maintenance & Engineering'], ['status' => 1]);
        $deptHse = Department::firstOrCreate(['name' => 'HSE & K3'], ['status' => 1]);
        $deptPpic = Department::firstOrCreate(['name' => 'PPIC & Logistik'], ['status' => 1]);

        $secSmelt = Section::firstOrCreate(['name' => 'Smelting Furnace Unit'], ['status' => 1]);
        $secMech = Section::firstOrCreate(['name' => 'Mechanical & Electrical'], ['status' => 1]);
        $secSafety = Section::firstOrCreate(['name' => 'Safety & Environment'], ['status' => 1]);
        $secWarehouse = Section::firstOrCreate(['name' => 'Raw Material Yard'], ['status' => 1]);

        // 3. Units of Measurement
        $uomKg = UnitOfMeasurement::firstOrCreate(['name' => 'KGM'], ['status' => 1]);
        $uomPce = UnitOfMeasurement::firstOrCreate(['name' => 'PCE'], ['status' => 1]);
        $uomSet = UnitOfMeasurement::firstOrCreate(['name' => 'SET'], ['status' => 1]);
        $uomLtr = UnitOfMeasurement::firstOrCreate(['name' => 'LTR'], ['status' => 1]);
        $uomTon = UnitOfMeasurement::firstOrCreate(['name' => 'TON'], ['status' => 1]);

        // 4. Financial & Logistics Master
        $curIdr = Currency::firstOrCreate(['name' => 'IDR'], ['status' => 1]);
        $curUsd = Currency::firstOrCreate(['name' => 'USD'], ['status' => 1]);
        $valIdr = Valuta::firstOrCreate(['code' => 'IDR'], ['name' => 'Rupiah', 'status' => 1]);
        $valUsd = Valuta::firstOrCreate(['code' => 'USD'], ['name' => 'US Dollar', 'status' => 1]);

        $repType = ReportingType::firstOrCreate(['name' => 'Laporan Operasional']);
        $accRaw = Account::firstOrCreate(['code' => '115.10'], ['name' => 'Persediaan Bahan Baku']);
        $accPart = Account::firstOrCreate(['code' => '115.20'], ['name' => 'Persediaan Sparepart']);

        $catRaw = Category::firstOrCreate(['code' => 'CAT-RAW'], ['name' => 'Bahan Baku Logam']);
        $catPart = Category::firstOrCreate(['code' => 'CAT-SPARE'], ['name' => 'Suku Cadang & Komponen']);
        $catChem = Category::firstOrCreate(['code' => 'CAT-CHEM'], ['name' => 'Bahan Kimia Industri']);
        $catHse = Category::firstOrCreate(['code' => 'CAT-HSE'], ['name' => 'Alat Pelindung Diri (APD)']);

        $classMetal = Classification::firstOrCreate(['code' => 'CLS-MET'], ['name' => 'Lead & Metal Scrap', 'reporting_types_id' => $repType->id, 'accounts_id' => $accRaw->id]);
        $classSpare = Classification::firstOrCreate(['code' => 'CLS-SPARE'], ['name' => 'Mechanical Parts', 'reporting_types_id' => $repType->id, 'accounts_id' => $accPart->id]);
        $classChem = Classification::firstOrCreate(['code' => 'CLS-CHEM'], ['name' => 'Reagent & Chemical', 'reporting_types_id' => $repType->id, 'accounts_id' => $accRaw->id]);
        $classHse = Classification::firstOrCreate(['code' => 'CLS-HSE'], ['name' => 'Safety & PPE Equipment', 'reporting_types_id' => $repType->id, 'accounts_id' => $accPart->id]);

        $facSurabaya = Facility::firstOrCreate(['name' => 'Main Plant Surabaya']);
        $originLokal = Origin::firstOrCreate(['name' => 'Lokal']);
        $originImport = Origin::firstOrCreate(['name' => 'Import']);
        $itemTypeBaku = ItemType::firstOrCreate(['name' => 'Bahan Baku']);
        $itemTypeSpare = ItemType::firstOrCreate(['name' => 'Sparepart']);

        $jobAlpha = JobNumber::firstOrCreate(['name' => 'JOB-2026-001'], ['status' => 1]);
        $jobBeta = JobNumber::firstOrCreate(['name' => 'JOB-2026-002'], ['status' => 1]);

        $whTypeRaw = WarehouseType::firstOrCreate(['name' => 'Gudang Bahan Baku']);
        $whTypeSpare = WarehouseType::firstOrCreate(['name' => 'Gudang Suku Cadang']);
        $whTypeChem = WarehouseType::firstOrCreate(['name' => 'Gudang Kimia']);

        $whA1 = Warehouse::firstOrCreate(['name' => 'Gudang Utama Raw Material A1'], ['warehouse_types_id' => $whTypeRaw->id, 'description' => 'Penyimpanan Ingot & Scrap Logam']);
        $whB2 = Warehouse::firstOrCreate(['name' => 'Gudang Sparepart B2'], ['warehouse_types_id' => $whTypeSpare->id, 'description' => 'Komponen Mesin & Kelistrikan']);
        $whC3 = Warehouse::firstOrCreate(['name' => 'Gudang Kimia C3'], ['warehouse_types_id' => $whTypeChem->id, 'description' => 'Asam Sulfat & Reagen Pembersih']);

        $country = \App\Models\Country::firstOrCreate(['name' => 'Indonesia']);
        $payTerm30 = PaymentTerm::firstOrCreate(['name' => 'Net 30 Days']);
        $payTerm14 = PaymentTerm::firstOrCreate(['name' => 'Net 14 Days']);
        $payMethodTf = PaymentMethod::firstOrCreate(['name' => 'Bank Transfer']);
        $delivLoco = DeliveryTerm::firstOrCreate(['name' => 'Loco Pabrik']);
        $delivFranco = DeliveryTerm::firstOrCreate(['name' => 'Franco Gudang Surabaya']);
        $poTypeStd = PoType::firstOrCreate(['code' => 'STD'], ['name' => 'PO Standard']);
        $rafaksiAir = RafaksiType::firstOrCreate(['name' => 'Kadar Air & Kotoran']);
        $portPerak = Port::firstOrCreate(['name' => 'Tanjung Perak']);

        // 5. Suppliers
        $supTimah = Supplier::updateOrCreate(
            ['code' => 'SUP-TI01'],
            [
                'name' => 'PT Timah Industri',
                'address' => 'Cilegon Industrial Estate, Banten',
                'email' => 'sales@timahindustri.co.id',
                'telephone_number' => '0254-311222',
                'countries_id' => $country->id,
                'payment_terms_id' => $payTerm30->id,
                'payment_methods_id' => $payMethodTf->id,
                'rafaksi_types_id' => $rafaksiAir->id,
                'currencies_id' => $curIdr->id,
                'ports_id' => $portPerak->id,
            ]
        );

        $supKrakatau = Supplier::updateOrCreate(
            ['code' => 'SUP-KS02'],
            [
                'name' => 'PT Krakatau Steel Tbk',
                'address' => 'Krakatau Industrial Area, Cilegon',
                'email' => 'sales@krakatausteel.com',
                'telephone_number' => '0254-391111',
                'countries_id' => $country->id,
                'payment_terms_id' => $payTerm30->id,
                'payment_methods_id' => $payMethodTf->id,
                'rafaksi_types_id' => $rafaksiAir->id,
                'currencies_id' => $curIdr->id,
                'ports_id' => $portPerak->id,
            ]
        );

        $supUT = Supplier::updateOrCreate(
            ['code' => 'SUP-UT03'],
            [
                'name' => 'PT United Tractors Tbk',
                'address' => 'Jl. Raya Rungkut Industri No. 45, Surabaya',
                'email' => 'heavyparts@unitedtractors.com',
                'telephone_number' => '031-8438811',
                'countries_id' => $country->id,
                'payment_terms_id' => $payTerm14->id,
                'payment_methods_id' => $payMethodTf->id,
                'rafaksi_types_id' => $rafaksiAir->id,
                'currencies_id' => $curIdr->id,
                'ports_id' => $portPerak->id,
            ]
        );

        $supPetro = Supplier::updateOrCreate(
            ['code' => 'SUP-PG04'],
            [
                'name' => 'PT Petrokimia Gresik',
                'address' => 'Jl. Jenderal Ahmad Yani, Gresik',
                'email' => 'chemicals@petrokimia-gresik.com',
                'telephone_number' => '031-3981811',
                'countries_id' => $country->id,
                'payment_terms_id' => $payTerm30->id,
                'payment_methods_id' => $payMethodTf->id,
                'rafaksi_types_id' => $rafaksiAir->id,
                'currencies_id' => $curIdr->id,
                'ports_id' => $portPerak->id,
            ]
        );

        $supSafety = Supplier::updateOrCreate(
            ['code' => 'SUP-DF05'],
            [
                'name' => 'PT Duta Firza Safety',
                'address' => 'Komplek Pertokoan Glodok Jaya, Jakarta',
                'email' => 'info@dutafirza.com',
                'telephone_number' => '021-6288990',
                'countries_id' => $country->id,
                'payment_terms_id' => $payTerm14->id,
                'payment_methods_id' => $payMethodTf->id,
                'rafaksi_types_id' => $rafaksiAir->id,
                'currencies_id' => $curIdr->id,
                'ports_id' => $portPerak->id,
            ]
        );

        // 6. Materials / Items (10 Items)
        $itemsData = [
            ['code' => '10.100.100.001', 'name' => 'Battery Scrap / Lead Ingot 99.9%', 'uom' => $uomKg, 'cat' => $catRaw, 'class' => $classMetal, 'type' => $itemTypeBaku, 'stock' => 150000.0],
            ['code' => '10.100.100.002', 'name' => 'Steel Plate SS400 10mm x 5ft x 20ft', 'uom' => $uomPce, 'cat' => $catRaw, 'class' => $classMetal, 'type' => $itemTypeBaku, 'stock' => 85.0],
            ['code' => '20.200.200.001', 'name' => 'Electric Motor Induction 18.5 kW 4P', 'uom' => $uomPce, 'cat' => $catPart, 'class' => $classSpare, 'type' => $itemTypeSpare, 'stock' => 12.0],
            ['code' => '20.200.200.002', 'name' => 'Centrifugal Slurry Pump 4/3 D-AH', 'uom' => $uomSet, 'cat' => $catPart, 'class' => $classSpare, 'type' => $itemTypeSpare, 'stock' => 6.0],
            ['code' => '30.300.300.001', 'name' => 'Hydraulic Oil Tellus S2 MX 68 (Drum 209L)', 'uom' => $uomLtr, 'cat' => $catChem, 'class' => $classChem, 'type' => $itemTypeBaku, 'stock' => 4500.0],
            ['code' => '30.300.300.002', 'name' => 'Sulfuric Acid H2SO4 Technical Grade 98%', 'uom' => $uomTon, 'cat' => $catChem, 'class' => $classChem, 'type' => $itemTypeBaku, 'stock' => 28.5],
            ['code' => '40.400.400.001', 'name' => 'Welding Electrode LB-52 Kobe Steel 3.2mm', 'uom' => $uomKg, 'cat' => $catPart, 'class' => $classSpare, 'type' => $itemTypeSpare, 'stock' => 450.0],
            ['code' => '50.500.500.001', 'name' => 'Safety Helmet Full Brim MSA V-Gard White', 'uom' => $uomPce, 'cat' => $catHse, 'class' => $classHse, 'type' => $itemTypeSpare, 'stock' => 120.0],
            ['code' => '20.200.200.003', 'name' => 'High Temperature Filter Bag PPS 130x3000', 'uom' => $uomPce, 'cat' => $catPart, 'class' => $classSpare, 'type' => $itemTypeSpare, 'stock' => 300.0],
            ['code' => '10.100.100.003', 'name' => 'Refractory Fire Brick SK-34 High Alumina', 'uom' => $uomPce, 'cat' => $catRaw, 'class' => $classMetal, 'type' => $itemTypeBaku, 'stock' => 2500.0],
        ];

        $items = [];
        foreach ($itemsData as $idat) {
            $items[$idat['code']] = Item::updateOrCreate(
                ['code' => $idat['code']],
                [
                    'name' => $idat['name'],
                    'units_of_measurements_id' => $idat['uom']->id,
                    'categories_id' => $idat['cat']->id,
                    'classifications_id' => $idat['class']->id,
                    'item_types_id' => $idat['type']->id,
                    'facilities_id' => $facSurabaya->id,
                    'job_number_id' => $jobAlpha->id,
                    'stock' => $idat['stock'],
                    'status' => 1,
                ]
            );
        }

        $this->command->info("Master Data ready. Seeding 10 Complete Procurement Lifecycle Records...");

        // =========================================================================
        // 10 PROCUREMENT LIFECYCLE RECORDS (PR -> PO -> RN -> BPB)
        // =========================================================================

        $dataset = [
            // [1] Fully Received Battery Scrap
            [
                'pr_number' => '0021/PR-IMLI/IX/2026',
                'pr_status' => 'Approved 2',
                'dept' => $deptProd, 'sec' => $secSmelt,
                'date' => '2026-09-10', 'due' => '2026-09-24',
                'item_code' => '10.100.100.001', 'qty_pr' => 20000.0,
                'po_number' => 'POL-0926-0035',
                'po_status' => 'Approved 2',
                'supplier' => $supTimah, 'valuta' => $valIdr,
                'qty_po' => 20000.0, 'price' => 14500.0, 'discount' => 1000000.0, 'ppn' => 34680000.0,
                'rn_number' => '0125/RN-IMLI/IX/2026',
                'sj_number' => 'SJ-TI-8812', 'plate' => 'L 9281 UZ',
                'qty_rn' => 20000.0, 'rafaksi' => 0.0,
                'bpb_number' => '0130/WHIN-IMLI/G/IX/2026',
                'warehouse' => $whA1,
            ],
            // [2] Partial Received Steel Plate
            [
                'pr_number' => '0022/PR-IMLI/IX/2026',
                'pr_status' => 'Approved 2',
                'dept' => $deptMaint, 'sec' => $secMech,
                'date' => '2026-09-15', 'due' => '2026-09-30',
                'item_code' => '10.100.100.002', 'qty_pr' => 50.0,
                'po_number' => 'POL-0926-0036',
                'po_status' => 'Approved 2',
                'supplier' => $supKrakatau, 'valuta' => $valIdr,
                'qty_po' => 50.0, 'price' => 2850000.0, 'discount' => 2500000.0, 'ppn' => 16800000.0,
                'rn_number' => '0126/RN-IMLI/IX/2026',
                'sj_number' => 'SJ-KS-9912', 'plate' => 'B 8812 TX',
                'qty_rn' => 30.0, 'rafaksi' => 0.0,
                'bpb_number' => '0131/WHIN-IMLI/G/IX/2026',
                'warehouse' => $whA1,
            ],
            // [3] Partial Received with Rafaksi (Motors)
            [
                'pr_number' => '0023/PR-IMLI/IX/2026',
                'pr_status' => 'Approved 2',
                'dept' => $deptMaint, 'sec' => $secMech,
                'date' => '2026-09-20', 'due' => '2026-10-05',
                'item_code' => '20.200.200.001', 'qty_pr' => 15.0,
                'po_number' => 'POL-0926-0037',
                'po_status' => 'Approved 2',
                'supplier' => $supUT, 'valuta' => $valIdr,
                'qty_po' => 15.0, 'price' => 18750000.0, 'discount' => 5000000.0, 'ppn' => 33150000.0,
                'rn_number' => '0127/RN-IMLI/X/2026',
                'sj_number' => 'SJ-UT-1049', 'plate' => 'W 7711 NY',
                'qty_rn' => 12.0, 'rafaksi' => 1.0, // net 11
                'bpb_number' => '0132/WHIN-IMLI/G/X/2026',
                'warehouse' => $whB2,
            ],
            // [4] Ordered / Awaiting Delivery (Chemical Acid)
            [
                'pr_number' => '0024/PR-IMLI/X/2026',
                'pr_status' => 'Approved 2',
                'dept' => $deptProd, 'sec' => $secSmelt,
                'date' => '2026-10-01', 'due' => '2026-10-15',
                'item_code' => '30.300.300.002', 'qty_pr' => 10.0,
                'po_number' => 'POL-1026-0038',
                'po_status' => 'Approved 2',
                'supplier' => $supPetro, 'valuta' => $valIdr,
                'qty_po' => 10.0, 'price' => 4500000.0, 'discount' => 500000.0, 'ppn' => 5340000.0,
                'rn_number' => null, // Not arrived yet
                'bpb_number' => null,
            ],
            // [5] Ordered / Pending Delivery (Safety Equipment)
            [
                'pr_number' => '0025/PR-IMLI/X/2026',
                'pr_status' => 'Approved 2',
                'dept' => $deptHse, 'sec' => $secSafety,
                'date' => '2026-10-03', 'due' => '2026-10-17',
                'item_code' => '50.500.500.001', 'qty_pr' => 100.0,
                'po_number' => 'POL-1026-0039',
                'po_status' => 'Approved 1',
                'supplier' => $supSafety, 'valuta' => $valIdr,
                'qty_po' => 100.0, 'price' => 285000.0, 'discount' => 1000000.0, 'ppn' => 3300000.0,
                'rn_number' => null,
                'bpb_number' => null,
            ],
            // [6] Fully Received Slurry Pumps (Reference Standard POL-1026-0040)
            [
                'pr_number' => '0026/PR-IMLI/X/2026',
                'pr_status' => 'Approved 2',
                'dept' => $deptMaint, 'sec' => $secMech,
                'date' => '2026-10-05', 'due' => '2026-10-19',
                'item_code' => '20.200.200.002', 'qty_pr' => 4.0,
                'po_number' => 'POL-1026-0040',
                'po_status' => 'Approved 2',
                'supplier' => $supUT, 'valuta' => $valIdr,
                'qty_po' => 4.0, 'price' => 58583988.9, 'discount' => 0.0, 'ppn' => 28120314.7,
                'rn_number' => '0131/RN-IMLI/X/2026',
                'sj_number' => 'SJ-UT-5511', 'plate' => 'L 1029 AZ',
                'qty_rn' => 4.0, 'rafaksi' => 0.0,
                'bpb_number' => '0138/WHIN-IMLI/G/X/2026',
                'warehouse' => $whB2,
            ],
            // [7] Fully Received Hydraulic Oil
            [
                'pr_number' => '0027/PR-IMLI/X/2026',
                'pr_status' => 'Approved 2',
                'dept' => $deptProd, 'sec' => $secSmelt,
                'date' => '2026-10-06', 'due' => '2026-10-20',
                'item_code' => '30.300.300.001', 'qty_pr' => 1000.0,
                'po_number' => 'POL-1026-0041',
                'po_status' => 'Approved 2',
                'supplier' => $supPetro, 'valuta' => $valIdr,
                'qty_po' => 1000.0, 'price' => 42000.0, 'discount' => 1000000.0, 'ppn' => 4920000.0,
                'rn_number' => '0132/RN-IMLI/X/2026',
                'sj_number' => 'SJ-PG-7788', 'plate' => 'W 9901 QZ',
                'qty_rn' => 1000.0, 'rafaksi' => 0.0,
                'bpb_number' => '0139/WHIN-IMLI/G/X/2026',
                'warehouse' => $whC3,
            ],
            // [8] PR Approved 2, Unordered (No PO yet)
            [
                'pr_number' => '0028/PR-IMLI/X/2026',
                'pr_status' => 'Approved 2',
                'dept' => $deptMaint, 'sec' => $secMech,
                'date' => '2026-10-08', 'due' => '2026-10-22',
                'item_code' => '40.400.400.001', 'qty_pr' => 200.0,
                'po_number' => null,
            ],
            // [9] PR Approved 1, Pending Approval 2
            [
                'pr_number' => '0029/PR-IMLI/X/2026',
                'pr_status' => 'Approved 1',
                'dept' => $deptProd, 'sec' => $secSmelt,
                'date' => '2026-10-10', 'due' => '2026-10-24',
                'item_code' => '10.100.100.003', 'qty_pr' => 500.0,
                'po_number' => null,
            ],
            // [10] PR Draft
            [
                'pr_number' => '0030/PR-IMLI/X/2026',
                'pr_status' => 'Draft',
                'dept' => $deptPpic, 'sec' => $secWarehouse,
                'date' => '2026-10-12', 'due' => '2026-10-26',
                'item_code' => '20.200.200.003', 'qty_pr' => 50.0,
                'po_number' => null,
            ],
        ];

        foreach ($dataset as $idx => $d) {
            $itemModel = $items[$d['item_code']];

            // 1. Create PR
            $pr = PurchaseRequisition::updateOrCreate(
                ['pr_number' => $d['pr_number']],
                [
                    'departments_id' => $d['dept']->id,
                    'sections_id' => $d['sec']->id,
                    'creator' => $procurementUser->id,
                    'date' => Carbon::parse($d['date'])->format('d-M-Y'),
                    'due_date' => $d['due'],
                    'status' => $d['pr_status'],
                    'revision' => 0,
                    'created_at' => Carbon::parse($d['date']),
                    'updated_at' => Carbon::parse($d['date']),
                ]
            );

            $prItem = PurchaseRequisitionItem::updateOrCreate(
                [
                    'purchase_requisitions_id' => $pr->id,
                    'items_id' => $itemModel->id,
                ],
                [
                    'quantity' => (string) $d['qty_pr'],
                    'due_date' => $d['due'],
                    'remark' => 'PP Sby Kebutuhan Operasional',
                    'note' => 'Standard JIS Material Specification',
                ]
            );

            // PR Approvals
            if (in_array($d['pr_status'], ['Approved 1', 'Approved 2'])) {
                ApprovalPr::updateOrCreate(
                    ['purchase_requisitions_id' => $pr->id, 'approval_ke' => '1'],
                    ['users_id' => $approverUser->id, 'status' => 1]
                );
            }
            if ($d['pr_status'] === 'Approved 2') {
                ApprovalPr::updateOrCreate(
                    ['purchase_requisitions_id' => $pr->id, 'approval_ke' => '2'],
                    ['users_id' => $admin->id, 'status' => 1]
                );
            }

            // 2. Create PO if applicable
            if (!empty($d['po_number'])) {
                $subtotal = $d['qty_po'] * $d['price'];
                $dpp = $subtotal - ($d['discount'] ?? 0);
                $ppn = $d['ppn'] ?? ($dpp * 0.12);
                $grandTotal = $dpp + $ppn;

                $po = PurchaseOrder::updateOrCreate(
                    ['po_number' => $d['po_number']],
                    [
                        'creator_id' => $procurementUser->id,
                        'po_types_id' => $poTypeStd->id,
                        'date' => Carbon::parse($d['date'])->addDays(2)->format('d-M-Y'),
                        'due_date' => $d['due'],
                        'valutas_id' => $d['valuta']->id,
                        'rate' => '1.00',
                        'supliers_id' => $d['supplier']->id,
                        'address' => $d['supplier']->address,
                        'payment_terms_id' => $payTerm30->id,
                        'payment_methods_id' => $payMethodTf->id,
                        'delivery_terms_id' => $delivFranco->id,
                        'latest_delivery' => Carbon::parse($d['due']),
                        'facility_status' => 'FASILITAS',
                        'service_subkon' => 0,
                        'remark' => 'Pengadaan reguler sesuai PR ' . $pr->pr_number,
                        'created_at' => Carbon::parse($d['date'])->addDays(2),
                        'updated_at' => Carbon::parse($d['date'])->addDays(2),
                    ]
                );

                $poItem = PurchaseOrderItem::updateOrCreate(
                    [
                        'purchase_order_id' => $po->id,
                        'pr_has_items_id' => $prItem->id,
                    ],
                    [
                        'item_alias' => $itemModel->name,
                        'price' => $d['price'],
                        'order' => $d['qty_po'],
                        'purchased' => $d['qty_po'],
                        'subtotal' => $subtotal,
                        'discount' => $d['discount'] ?? 0,
                        'dpp' => $dpp,
                        'ppn_id' => null,
                        'total' => $subtotal,
                        'grand_total' => $grandTotal,
                    ]
                );

                // PO Approvals
                if (in_array($d['po_status'], ['Approved 1', 'Approved 2'])) {
                    ApprovalPo::updateOrCreate(
                        ['purchase_order_id' => $po->id, 'approval_ke' => '1'],
                        ['users_id' => $approverUser->id, 'status' => 1]
                    );
                }
                if ($d['po_status'] === 'Approved 2') {
                    ApprovalPo::updateOrCreate(
                        ['purchase_order_id' => $po->id, 'approval_ke' => '2'],
                        ['users_id' => $admin->id, 'status' => 1]
                    );
                }

                // 3. Create Receive Note (RN) if applicable
                if (!empty($d['rn_number'])) {
                    $rnDate = Carbon::parse($d['date'])->addDays(5);
                    $rn = ReceiveNote::updateOrCreate(
                        ['rn_number' => $d['rn_number']],
                        [
                            'supliers_id' => $d['supplier']->id,
                            'currencies_id' => $curIdr->id,
                            'rate' => 1.0,
                            'arrival_date' => $rnDate,
                            'invoice_number' => 'INV/' . substr($d['po_number'], 4),
                            'invoice_date' => $rnDate,
                            'sj_number' => $d['sj_number'],
                            'sj_date' => $rnDate,
                            'license_plate' => $d['plate'],
                            'note' => 'Barang diterima lengkap dan lolos pemeriksaan fisik gerbang',
                            'dn_status' => 1,
                            'updated_by' => $warehouseUser->id,
                            'created_at' => $rnDate,
                            'updated_at' => $rnDate,
                        ]
                    );

                    $poRn = PurchaseOrderReceiveNote::updateOrCreate(
                        [
                            'purchase_order_id' => $po->id,
                            'receive_note_id' => $rn->id,
                        ],
                        [
                            'dn_number' => 'DN-' . substr($rn->rn_number, 0, 4),
                            'job_number_id' => $jobAlpha->id,
                            'item_name' => $itemModel->name,
                            'quantity' => $d['qty_rn'],
                            'rafaksi' => $d['rafaksi'] ?? 0,
                            'price' => $d['price'],
                            'grand_total' => ($d['qty_rn'] - ($d['rafaksi'] ?? 0)) * $d['price'],
                        ]
                    );

                    ApprovalRn::updateOrCreate(
                        ['receive_note_id' => $rn->id, 'approval_ke' => '1'],
                        ['users_id' => $warehouseUser->id, 'status' => 1]
                    );

                    // 4. Create BPB (Warehouse Inbound) if applicable
                    if (!empty($d['bpb_number'])) {
                        $bpbDate = $rnDate->copy()->addDay();
                        $bpb = BpbReceiveMaterial::updateOrCreate(
                            ['bpb_number' => $d['bpb_number']],
                            [
                                'receive_date' => $bpbDate,
                                'note' => 'Diterima di ' . $d['warehouse']->name,
                                'creator_id' => $warehouseUser->id,
                                'updated_by' => $warehouseUser->id,
                                'created_at' => $bpbDate,
                                'updated_at' => $bpbDate,
                            ]
                        );

                        PoRnToBpb::updateOrCreate(
                            [
                                'bpb_receive_material_id' => $bpb->id,
                                'po_has_rn_id' => $poRn->id,
                            ],
                            [
                                'warehouses_id' => $d['warehouse']->id,
                            ]
                        );

                        ApprovalBpb::updateOrCreate(
                            ['bpb_receive_material_id' => $bpb->id, 'approval_ke' => '1'],
                            ['users_id' => $warehouseUser->id, 'status' => 1]
                        );
                        ApprovalBpb::updateOrCreate(
                            ['bpb_receive_material_id' => $bpb->id, 'approval_ke' => '2'],
                            ['users_id' => $approverUser->id, 'status' => 1]
                        );
                    }
                }
            }

            $this->command->info("Seeded record #" . ($idx + 1) . ": PR {$d['pr_number']}" . (!empty($d['po_number']) ? " -> PO {$d['po_number']}" : ""));
        }

        $this->command->info("GeniusOne 10 Demo Records successfully seeded!");
    }
}
