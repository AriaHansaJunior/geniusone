<?php

namespace Database\Seeders;

use App\Models\Master\Customs\DocumentHistory;
use App\Models\Master\Customs\DocumentHistoryItem;
use App\Models\Master\Customs\Facility;
use App\Models\Master\Customs\HsCode;
use App\Models\Master\Finance\Account;
use App\Models\Master\Finance\Currency;
use App\Models\Master\Finance\DeliveryTerm;
use App\Models\Master\Finance\PaymentMethod;
use App\Models\Master\Finance\PaymentTerm;
use App\Models\Master\Finance\Pph;
use App\Models\Master\Finance\PphType;
use App\Models\Master\Finance\RafaksiType;
use App\Models\Master\Finance\Valuta;
use App\Models\Master\Material\Brand;
use App\Models\Master\Material\Category;
use App\Models\Master\Material\Classification;
use App\Models\Master\Material\Colour;
use App\Models\Master\Material\Item;
use App\Models\Master\Material\ItemType;
use App\Models\Master\Material\Style;
use App\Models\Master\Material\UnitOfMeasurement;
use App\Models\Master\Organization\Department;
use App\Models\Master\Organization\JobNumber;
use App\Models\Master\Organization\ReportingType;
use App\Models\Master\Organization\Section;
use App\Models\Master\Partner\Country;
use App\Models\Master\Partner\Origin;
use App\Models\Master\Partner\Port;
use App\Models\Master\Partner\Supplier;
use App\Models\Procurement\PurchaseOrder\AdditionalCostType;
use App\Models\Procurement\PurchaseOrder\ApprovalPo;
use App\Models\Procurement\PurchaseOrder\PoType;
use App\Models\Procurement\PurchaseOrder\PurchaseOrder;
use App\Models\Procurement\PurchaseOrder\PurchaseOrderItem;
use App\Models\Procurement\PurchaseRequest\ApprovalPr;
use App\Models\Procurement\PurchaseRequest\PurchaseRequisition;
use App\Models\Procurement\PurchaseRequest\PurchaseRequisitionItem;
use App\Models\System\Auth\User;
use App\Models\Warehouse\Facility\Warehouse;
use App\Models\Warehouse\Facility\WarehouseCoordinate;
use App\Models\Warehouse\Facility\WarehouseType;
use App\Models\Warehouse\GateReceiving\ApprovalRn;
use App\Models\Warehouse\GateReceiving\PurchaseOrderReceiveNote;
use App\Models\Warehouse\GateReceiving\ReceiveNote;
use App\Models\Warehouse\GateReceiving\ReceiveNoteReturn;
use App\Models\Warehouse\GateReceiving\ReceiveNoteReturnItem;
use App\Models\Warehouse\InboundStorage\ApprovalBpb;
use App\Models\Warehouse\InboundStorage\BpbReceiveMaterial;
use App\Models\Warehouse\InboundStorage\PoRnToBpb;
use Carbon\Carbon;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class GeniusOneDemoSeeder extends Seeder
{
    public function run(): void
    {
        $this->command->info('Seeding Master Data for GeniusOne...');

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

        WarehouseCoordinate::firstOrCreate(['warehouses_id' => $whA1->id, 'name' => 'RACK-A1-01'], ['description' => 'Rak Besi Lantai 1']);
        WarehouseCoordinate::firstOrCreate(['warehouses_id' => $whA1->id, 'name' => 'RACK-A1-02'], ['description' => 'Rak Besi Lantai 2']);
        WarehouseCoordinate::firstOrCreate(['warehouses_id' => $whB2->id, 'name' => 'ZONE-B2-01'], ['description' => 'Area Sparepart Elektrik']);

        $country = Country::firstOrCreate(['name' => 'Indonesia']);
        $payTerm30 = PaymentTerm::firstOrCreate(['name' => 'Net 30 Days']);
        $payTerm14 = PaymentTerm::firstOrCreate(['name' => 'Net 14 Days']);
        $payMethodTf = PaymentMethod::firstOrCreate(['name' => 'Bank Transfer']);
        $delivLoco = DeliveryTerm::firstOrCreate(['name' => 'Loco Pabrik']);
        $delivFranco = DeliveryTerm::firstOrCreate(['name' => 'Franco Gudang Surabaya']);
        $poTypeStd = PoType::firstOrCreate(['code' => 'STD'], ['name' => 'PO Standard']);
        $poTypeImp = PoType::firstOrCreate(['code' => 'IMP'], ['name' => 'PO Import']);
        $poTypeJasa = PoType::firstOrCreate(['code' => 'SRV'], ['name' => 'PO Jasa Perbaikan']);
        $rafaksiAir = RafaksiType::firstOrCreate(['name' => 'Kadar Air & Kotoran']);
        $portPerak = Port::firstOrCreate(['name' => 'Tanjung Perak']);

        // Brands
        Brand::firstOrCreate(['code' => 'BRD-MITS'], ['name' => 'Mitsubishi Electric', 'description' => 'Industrial Automation & Motors', 'status' => 1]);
        Brand::firstOrCreate(['code' => 'BRD-KOM'], ['name' => 'Komatsu Heavy Industries', 'description' => 'Heavy Equipment & Parts', 'status' => 1]);
        Brand::firstOrCreate(['code' => 'BRD-SCH'], ['name' => 'Schneider Electric', 'description' => 'Electrical Switchgear & Breakers', 'status' => 1]);
        Brand::firstOrCreate(['code' => 'BRD-KOBE'], ['name' => 'Kobe Steel Welding', 'description' => 'Welding Consumables', 'status' => 1]);
        Brand::firstOrCreate(['code' => 'BRD-SHELL'], ['name' => 'Shell Lubricants', 'description' => 'Hydraulic & Gear Oils', 'status' => 1]);

        // Models / Styles
        Style::firstOrCreate(['code' => 'MOD-HEAVY'], ['name' => 'Heavy Duty Industrial', 'description' => 'Tipe beban berat kontinu', 'status' => 'active']);
        Style::firstOrCreate(['code' => 'MOD-STD'], ['name' => 'Standard Industrial', 'description' => 'Tipe standar operasional', 'status' => 'active']);
        Style::firstOrCreate(['code' => 'MOD-COMP'], ['name' => 'Compact High Temp', 'description' => 'Tahan panas & ruang sempit', 'status' => 'active']);

        // Colours
        Colour::firstOrCreate(['name' => 'Safety Yellow'], ['grade' => 'A', 'status' => 1]);
        Colour::firstOrCreate(['name' => 'Industrial Blue'], ['grade' => 'A', 'status' => 1]);
        Colour::firstOrCreate(['name' => 'Signal Red'], ['grade' => 'A', 'status' => 1]);
        Colour::firstOrCreate(['name' => 'Matte Black'], ['grade' => 'B', 'status' => 1]);
        Colour::firstOrCreate(['name' => 'Clean White'], ['grade' => 'A', 'status' => 1]);

        // Additional Costs
        AdditionalCostType::firstOrCreate(['code' => 'FRT'], ['name' => 'Biaya Angkut / Freight', 'status' => 1]);
        AdditionalCostType::firstOrCreate(['code' => 'BKM'], ['name' => 'Biaya Bongkar Muat', 'status' => 1]);
        AdditionalCostType::firstOrCreate(['code' => 'ASR'], ['name' => 'Asuransi Pengiriman', 'status' => 1]);
        AdditionalCostType::firstOrCreate(['code' => 'CRN'], ['name' => 'Jasa Crane / Lifting', 'status' => 1]);

        // PPh
        $pphT21 = PphType::firstOrCreate(['nama' => 'PPh Pasal 21']);
        $pphT23 = PphType::firstOrCreate(['nama' => 'PPh Pasal 23']);
        $pphT42 = PphType::firstOrCreate(['nama' => 'PPh Final 4(2)']);
        Pph::firstOrCreate(['name' => 'PPh 21 (2.5%)'], ['value' => 2.5, 'deduction' => 'no', 'status' => 'active', 'pph_type_id' => $pphT21->id]);
        Pph::firstOrCreate(['name' => 'PPh 23 Jasa (2.0%)'], ['value' => 2.0, 'deduction' => 'no', 'status' => 'active', 'pph_type_id' => $pphT23->id]);
        Pph::firstOrCreate(['name' => 'PPh 4(2) Sewa (10.0%)'], ['value' => 10.0, 'deduction' => 'no', 'status' => 'active', 'pph_type_id' => $pphT42->id]);

        // HS Codes
        HsCode::firstOrCreate(['name' => '7801.10.00'], ['description' => 'Unwrought lead - Refined lead', 'rates_bm' => 5.0, 'rates_ppn' => 11.0, 'rates_pph' => 2.5]);
        HsCode::firstOrCreate(['name' => '7208.51.00'], ['description' => 'Flat-rolled products of iron/non-alloy steel', 'rates_bm' => 10.0, 'rates_ppn' => 11.0, 'rates_pph' => 2.5]);
        HsCode::firstOrCreate(['name' => '8501.52.00'], ['description' => 'AC motors, multi-phase, 750W to 75kW', 'rates_bm' => 5.0, 'rates_ppn' => 11.0, 'rates_pph' => 2.5]);
        HsCode::firstOrCreate(['name' => '2807.00.00'], ['description' => 'Sulphuric acid; oleum', 'rates_bm' => 5.0, 'rates_ppn' => 11.0, 'rates_pph' => 2.5]);

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

        $this->command->info('Master Data ready. Seeding 10 Complete Procurement Lifecycle Records...');

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
            if (! empty($d['po_number'])) {
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
                        'remark' => 'Pengadaan reguler sesuai PR '.$pr->pr_number,
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
                if (! empty($d['rn_number'])) {
                    $rnDate = Carbon::parse($d['date'])->addDays(5);
                    $rn = ReceiveNote::updateOrCreate(
                        ['rn_number' => $d['rn_number']],
                        [
                            'supliers_id' => $d['supplier']->id,
                            'currencies_id' => $curIdr->id,
                            'rate' => 1.0,
                            'arrival_date' => $rnDate,
                            'invoice_number' => 'INV/'.substr($d['po_number'], 4),
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
                            'dn_number' => 'DN-'.substr($rn->rn_number, 0, 4),
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
                    if (! empty($d['bpb_number'])) {
                        $bpbDate = $rnDate->copy()->addDay();
                        $bpb = BpbReceiveMaterial::updateOrCreate(
                            ['bpb_number' => $d['bpb_number']],
                            [
                                'receive_date' => $bpbDate,
                                'note' => 'Diterima di '.$d['warehouse']->name,
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

            $this->command->info('Seeded record #'.($idx + 1).": PR {$d['pr_number']}".(! empty($d['po_number']) ? " -> PO {$d['po_number']}" : ''));
        }

        // Seed sample Receive Note Return
        $returnDoc = ReceiveNoteReturn::firstOrCreate(
            ['rn_number' => 'RNR-2026-0001'],
            [
                'rn_date' => now()->subDays(5),
                'delivery_order' => 'DO-RET-001',
                'do_date' => now()->subDays(6),
                'customer' => 'PT Mitra Logam Mandiri',
                'facility' => 'FASILITAS',
                'bc_code' => 'BC 2.7',
                'aju_number' => '000027-010203-20261010-001234',
                'no_daftar' => '001234',
                'amount' => 15000000,
                'type_of_return' => 'Reject Quality / Cacat Material',
                'sales_delivery_number' => 'SD-2026-0099',
                'vehicle_type' => 'Truk Fuso Box',
                'license_plate' => 'B 9123 UXZ',
                'notes' => 'Retur ingot timah karena kadar air di atas toleransi',
                'approval_status' => 'Approved',
                'created_by' => $warehouseUser->id,
                'updated_by' => $approverUser->id,
            ]
        );

        ReceiveNoteReturnItem::firstOrCreate(
            [
                'receive_note_return_id' => $returnDoc->id,
                'item_name' => 'Timah Murni Ingot Sn 99.9%',
            ],
            [
                'item_code' => 'ING-SN-001',
                'do_number' => 'DO-RET-001',
                'quantity' => 100,
                'unit' => 'KG',
                'price' => 150000,
                'subtotal' => 15000000,
                'subtotal_idr' => 15000000,
                'retur_qty' => 100,
            ]
        );

        // Seed sample Document History
        $docHistory = DocumentHistory::firstOrCreate(
            ['invoice_number' => 'INV-EXIM-2026-001'],
            [
                'invoice_alias' => 'INV/TI/X/2026',
                'invoice_date' => now()->subDays(10),
                'transaction_number' => 'TRX-EXIM-001',
                'mutation_type' => 'Pemasukan Bahan Baku',
                'customer_supplier' => 'PT Timah Industri',
                'customer' => 'PT Timah Industri',
                'destination' => 'Pabrik Cilegon',
                'bl_number' => 'BL-SML-998811',
                'currency' => 'IDR',
                'customs_document' => 'BC 4.0',
                'amount' => 450000000,
                'created_by' => $procurementUser->id,
                'updated_by' => $approverUser->id,
            ]
        );

        DocumentHistoryItem::firstOrCreate(
            [
                'document_history_id' => $docHistory->id,
                'item_name' => 'Timah Murni Ingot Sn 99.9%',
            ],
            [
                'item_code' => 'ING-SN-001',
                'so_number' => 'SO-2026-001',
                'quantity' => 3000,
                'unit' => 'KG',
                'unit_price' => 150000,
                'subtotal' => 450000000,
                'nomor_aju' => '000040-010203-20261005-009876',
                'nomor_daftar' => '009876',
                'jenis_dokumen' => 'BC 4.0',
                'seri_barang' => '1',
            ]
        );

        $this->command->info('GeniusOne 10 Demo Records successfully seeded!');
    }
}
