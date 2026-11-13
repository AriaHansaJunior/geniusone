<?php

namespace Database\Seeders;

use App\Models\Common\ExchangeRate;
use App\Models\Inventory\StockNotification;
use App\Models\Master\Finance\Currency;
use App\Models\Master\Finance\Pph;
use App\Models\Master\Finance\PphType;
use App\Models\Master\Finance\Ppn;
use App\Models\Master\Finance\Valuta;
use App\Models\Master\Material\Item;
use App\Models\Master\Material\UnitOfMeasurement;
use App\Models\System\Setting\ReferenceOption;
use App\Models\System\Setting\SystemSetting;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class SystemReferenceDataSeeder extends Seeder
{
    public function run(): void
    {
        $now = now();
        $adminId = DB::table('users')->whereIn('role', ['superadmin', 'admin'])->value('id')
            ?: DB::table('users')->value('id');

        // 1. System Settings (Branding, Document Prefixes, Operational Defaults)
        $settings = [
            ['key' => 'company_name', 'value' => 'PT. GENIUS MANUFACTURING', 'group' => 'branding', 'label' => 'Company Legal Name'],
            ['key' => 'company_short_name', 'value' => 'GENIUSONE', 'group' => 'branding', 'label' => 'Application Short Name'],
            ['key' => 'company_tagline', 'value' => 'Enterprise Operations', 'group' => 'branding', 'label' => 'Application Tagline'],
            ['key' => 'company_address', 'value' => 'Kawasan Industri Surabaya, Jawa Timur', 'group' => 'branding', 'label' => 'Company Address'],
            ['key' => 'company_phone', 'value' => '+62 31 8000 1000', 'group' => 'branding', 'label' => 'Company Phone'],
            ['key' => 'company_npwp', 'value' => '01.234.567.8-609.000', 'group' => 'branding', 'label' => 'Company NPWP'],
            ['key' => 'app_version', 'value' => 'v2.0', 'group' => 'branding', 'label' => 'Application Version'],
            ['key' => 'default_currency', 'value' => 'IDR', 'group' => 'finance', 'label' => 'Default Functional Currency'],
            ['key' => 'default_ppn_rate', 'value' => '11', 'group' => 'finance', 'label' => 'Default PPN Rate (%)'],
            ['key' => 'default_facility_status', 'value' => 'FASILITAS', 'group' => 'customs', 'label' => 'Default Customs Facility Status'],
            ['key' => 'default_bc_code', 'value' => 'BC 4.0', 'group' => 'customs', 'label' => 'Default BC Document Code'],
            ['key' => 'pr_doc_code', 'value' => 'F-PRC-001', 'group' => 'documents', 'label' => 'PR Print Form Code'],
            ['key' => 'pr_revision', 'value' => '00', 'group' => 'documents', 'label' => 'PR Print Form Revision'],
            ['key' => 'po_doc_code', 'value' => 'F-PRC-002', 'group' => 'documents', 'label' => 'PO Print Form Code'],
            ['key' => 'po_revision', 'value' => '00', 'group' => 'documents', 'label' => 'PO Print Form Revision'],
            ['key' => 'rn_doc_code', 'value' => 'F-EXM-001', 'group' => 'documents', 'label' => 'Receive Note Form Code'],
            ['key' => 'rn_revision', 'value' => '00', 'group' => 'documents', 'label' => 'Receive Note Form Revision'],
            ['key' => 'bpb_doc_code', 'value' => 'F-WHS-001', 'group' => 'documents', 'label' => 'BPB Form Code'],
            ['key' => 'bpb_revision', 'value' => '00', 'group' => 'documents', 'label' => 'BPB Form Revision'],
            ['key' => 'rm_doc_code', 'value' => 'F-WHS-002', 'group' => 'documents', 'label' => 'Request Material Form Code'],
            ['key' => 'rm_revision', 'value' => '00', 'group' => 'documents', 'label' => 'Request Material Form Revision'],
            ['key' => 'stock_card_doc_code', 'value' => 'F-WHS-003', 'group' => 'documents', 'label' => 'Stock Card Form Code'],
            ['key' => 'stock_card_revision', 'value' => '00', 'group' => 'documents', 'label' => 'Stock Card Form Revision'],
            ['key' => 'transfer_return_doc_code', 'value' => 'F-WHS-004', 'group' => 'documents', 'label' => 'Transfer Stock Return Form Code'],
            ['key' => 'transfer_return_revision', 'value' => '00', 'group' => 'documents', 'label' => 'Transfer Stock Return Form Revision'],
        ];

        foreach ($settings as $setting) {
            SystemSetting::updateOrCreate(['key' => $setting['key']], $setting);
        }

        // 2. Configurable Reference Options
        $referenceCategories = [
            'bc_document_type' => [
                ['code' => 'BC 2.3', 'name' => 'BC 2.3 - Pemberitahuan Impor Barang ke TPB', 'meta' => ['direction' => 'INBOUND', 'facility' => 'FASILITAS']],
                ['code' => 'BC 2.5', 'name' => 'BC 2.5 - Pengeluaran Barang Impor dari TPB ke TLDDP', 'meta' => ['direction' => 'OUTBOUND', 'facility' => 'FASILITAS']],
                ['code' => 'BC 2.6.1', 'name' => 'BC 2.6.1 - Pengeluaran Sementara ke TLDDP (Subkon/Repair)', 'meta' => ['direction' => 'OUTBOUND', 'facility' => 'FASILITAS']],
                ['code' => 'BC 2.6.2', 'name' => 'BC 2.6.2 - Pemasukan Kembali dari TLDDP', 'meta' => ['direction' => 'INBOUND', 'facility' => 'FASILITAS']],
                ['code' => 'BC 2.7', 'name' => 'BC 2.7 - Pemasukan/Pengeluaran Antar TPB', 'meta' => ['direction' => 'TRANSFER', 'facility' => 'FASILITAS']],
                ['code' => 'BC 3.0', 'name' => 'BC 3.0 - Pemberitahuan Ekspor Barang', 'meta' => ['direction' => 'EXPORT', 'facility' => 'FASILITAS']],
                ['code' => 'BC 4.0', 'name' => 'BC 4.0 - Pemasukan Barang Asal TLDDP ke TPB', 'meta' => ['direction' => 'INBOUND', 'facility' => 'FASILITAS']],
                ['code' => 'BC 4.1', 'name' => 'BC 4.1 - Pengeluaran Barang Asal TLDDP dari TPB ke TLDDP', 'meta' => ['direction' => 'OUTBOUND', 'facility' => 'FASILITAS']],
            ],
            'vehicle_type' => [
                ['code' => 'BOX', 'name' => 'Truck Box'],
                ['code' => 'TRONTON', 'name' => 'Tronton'],
                ['code' => 'WINGBOX', 'name' => 'Wingbox'],
                ['code' => 'CONT20', 'name' => 'Container 20ft'],
                ['code' => 'CONT40', 'name' => 'Container 40ft'],
                ['code' => 'PICKUP', 'name' => 'Pick Up'],
                ['code' => 'FUSO', 'name' => 'Fuso'],
                ['code' => 'ENGKEL', 'name' => 'Colt Diesel / Engkel'],
            ],
            'return_type' => [
                ['code' => 'REJECT_QUALITY', 'name' => 'Reject Quality'],
                ['code' => 'EXCESS_QTY', 'name' => 'Excess Quantity'],
                ['code' => 'WRONG_SPEC', 'name' => 'Wrong Specification'],
                ['code' => 'REPAIR_RETURN', 'name' => 'Repair / Subcontract Return'],
                ['code' => 'SAMPLE_RETURN', 'name' => 'Sample Return'],
            ],
            'location_type' => [
                ['code' => 'PRODUCTION', 'name' => 'Production Area'],
                ['code' => 'WORKSHOP', 'name' => 'Workshop'],
                ['code' => 'WAREHOUSE', 'name' => 'Warehouse Zone'],
                ['code' => 'OFFICE', 'name' => 'Office / Support'],
                ['code' => 'QC_LAB', 'name' => 'Quality Lab'],
            ],
            'bpb_type' => [
                ['code' => 'GUDANG', 'name' => 'Gudang'],
                ['code' => 'FASILITAS', 'name' => 'Facility (Kawasan Berikat)'],
                ['code' => 'NON_FASILITAS', 'name' => 'Non Facility'],
            ],
            'request_project_type' => [
                ['code' => 'INTERNAL', 'name' => 'Internal Operational'],
                ['code' => 'PRODUCTION', 'name' => 'Production Order'],
                ['code' => 'MAINTENANCE', 'name' => 'Maintenance & Repair'],
                ['code' => 'SAMPLE', 'name' => 'R&D / Sample'],
            ],
            'requisition_type' => [
                ['code' => 'STD', 'name' => 'Standard PR'],
                ['code' => 'URG', 'name' => 'Urgent PR'],
                ['code' => 'SRV', 'name' => 'Service / Subcontract PR'],
                ['code' => 'CAPEX', 'name' => 'Asset / Capex PR'],
            ],
            'alert_trigger_condition' => [
                ['code' => 'LTE', 'name' => 'Stock <= Buffer'],
                ['code' => 'LT', 'name' => 'Stock < Buffer'],
                ['code' => 'ZERO', 'name' => 'Stock == 0'],
            ],
            'alert_level' => [
                ['code' => 'CRITICAL', 'name' => 'Critical'],
                ['code' => 'WARNING', 'name' => 'Warning'],
                ['code' => 'INFO', 'name' => 'Info'],
            ],
            'colour_grade' => [
                ['code' => 'A', 'name' => 'A'],
                ['code' => 'B', 'name' => 'B'],
                ['code' => 'C', 'name' => 'C'],
                ['code' => 'STD', 'name' => 'Standard'],
            ],
            'account_category' => [
                ['code' => 'CURRENT_ASSET', 'name' => 'Current Asset'],
                ['code' => 'INVENTORY', 'name' => 'Inventory'],
                ['code' => 'EXPENSE', 'name' => 'Expense'],
                ['code' => 'COGS', 'name' => 'COGS'],
                ['code' => 'LIABILITY', 'name' => 'Liability'],
                ['code' => 'REVENUE', 'name' => 'Revenue'],
            ],
            'customs_report_type' => [
                ['code' => 'INBOUND', 'name' => 'Pemasukan Bahan Baku'],
                ['code' => 'OUTBOUND', 'name' => 'Pengeluaran Hasil Produksi'],
                ['code' => 'MUTATION', 'name' => 'Mutasi Barang'],
                ['code' => 'WIP', 'name' => 'Work in Process (WIP)'],
                ['code' => 'CAPITAL', 'name' => 'Barang Modal & Mesin'],
            ],
            'facility_status' => [
                ['code' => 'FASILITAS', 'name' => 'FASILITAS (Kawasan Berikat)'],
                ['code' => 'NON FASILITAS', 'name' => 'NON FASILITAS'],
            ],
        ];

        foreach ($referenceCategories as $category => $items) {
            foreach ($items as $idx => $entry) {
                ReferenceOption::updateOrCreate(
                    ['category' => $category, 'code' => $entry['code']],
                    [
                        'name' => $entry['name'],
                        'meta' => $entry['meta'] ?? null,
                        'sort_order' => $idx + 1,
                        'status' => 1,
                    ]
                );
            }
        }

        // 3. Currencies & Valutas
        $currencyCatalog = [
            ['code' => 'IDR', 'name' => 'Rupiah', 'symbol' => 'Rp', 'rate' => 1.0000],
            ['code' => 'USD', 'name' => 'US Dollar', 'symbol' => '$', 'rate' => 16250.0000],
            ['code' => 'EUR', 'name' => 'Euro', 'symbol' => '€', 'rate' => 17580.0000],
            ['code' => 'SGD', 'name' => 'Singapore Dollar', 'symbol' => 'S$', 'rate' => 12120.0000],
            ['code' => 'JPY', 'name' => 'Japanese Yen', 'symbol' => '¥', 'rate' => 106.5000],
            ['code' => 'CNY', 'name' => 'Chinese Yuan', 'symbol' => '¥', 'rate' => 2245.0000],
        ];

        foreach ($currencyCatalog as $cur) {
            $currency = Currency::firstOrCreate(
                ['name' => $cur['code']],
                ['status' => 1]
            );

            $valuta = Valuta::where('code', $cur['code'])->first();
            if ($valuta) {
                $valuta->update([
                    'name' => $valuta->name ?: $cur['name'],
                    'symbol' => $valuta->symbol ?: $cur['symbol'],
                    'sync_status' => $valuta->sync_status ?: 'Synced',
                    'last_synced_at' => $valuta->last_synced_at ?: $now,
                    'created_by' => $valuta->created_by ?: $adminId,
                    'updated_by' => $valuta->updated_by ?: $adminId,
                ]);
            } else {
                Valuta::create([
                    'code' => $cur['code'],
                    'name' => $cur['name'],
                    'symbol' => $cur['symbol'],
                    'sync_status' => 'Synced',
                    'last_synced_at' => $now,
                    'status' => 1,
                    'created_by' => $adminId,
                    'updated_by' => $adminId,
                ]);
            }

            // Seed real DB exchange rate benchmarks across last 7 days if none exist for today
            foreach (['KURS TENGAH BI', 'KURS PAJAK'] as $rateType) {
                for ($d = 0; $d < 3; $d++) {
                    $dateStr = $now->copy()->subDays($d)->format('Y-m-d');
                    $exists = ExchangeRate::where('currencies_id', $currency->id)
                        ->whereDate('rate_date', $dateStr)
                        ->where('rate_type', $rateType)
                        ->exists();
                    if (! $exists) {
                        $mid = $cur['rate'];
                        $spread = $cur['code'] === 'IDR' ? 0 : round($mid * 0.004, 4);
                        ExchangeRate::create([
                            'currencies_id' => $currency->id,
                            'rate_date' => $dateStr,
                            'rate_type' => $rateType,
                            'buy_rate' => $mid - $spread,
                            'sell_rate' => $mid + $spread,
                            'middle_rate' => $mid,
                            'source' => $rateType === 'KURS PAJAK' ? 'Kemenkeu RI Benchmark' : 'Bank Indonesia Benchmark',
                            'created_by' => $adminId,
                        ]);
                    }
                }
            }
        }

        // 4. Master Lookup Tables (Ensure all dropdown masters have real rows)
        $this->seedSimpleLookup('po_types', [
            ['code' => 'STD', 'name' => 'PO Standard', 'status' => 1],
            ['code' => 'IMP', 'name' => 'PO Import', 'status' => 1],
            ['code' => 'SRV', 'name' => 'PO Jasa Perbaikan', 'status' => 1],
            ['code' => 'LKL', 'name' => 'PO Lokal', 'status' => 1],
        ], 'code');

        $this->seedSimpleLookup('payment_methods', [
            ['name' => 'Bank Transfer', 'status' => 1],
            ['name' => 'Cash', 'status' => 1],
            ['name' => 'Letter of Credit (L/C)', 'status' => 1],
            ['name' => 'Giro / Cheque', 'status' => 1],
            ['name' => 'Open Account', 'status' => 1],
        ], 'name');

        $this->seedSimpleLookup('payment_terms', [
            ['name' => 'COD', 'status' => 1],
            ['name' => 'Net 7 Days', 'status' => 1],
            ['name' => 'Net 14 Days', 'status' => 1],
            ['name' => 'Net 30 Days', 'status' => 1],
            ['name' => 'Net 45 Days', 'status' => 1],
            ['name' => 'Net 60 Days', 'status' => 1],
        ], 'name');

        $this->seedSimpleLookup('delivery_terms', [
            ['name' => 'Loco Surabaya', 'status' => 1],
            ['name' => 'Loco Pabrik', 'status' => 1],
            ['name' => 'Franco Gudang Surabaya', 'status' => 1],
            ['name' => 'FOB (Free On Board)', 'status' => 1],
            ['name' => 'CIF (Cost Insurance & Freight)', 'status' => 1],
            ['name' => 'EXW (Ex Works)', 'status' => 1],
        ], 'name');

        $pphTypes = ['PPh Pasal 21', 'PPh Pasal 22', 'PPh Pasal 23', 'PPh Final 4(2)'];
        $pphTypeMap = [];
        foreach ($pphTypes as $nama) {
            $pt = PphType::firstOrCreate(['nama' => $nama]);
            $pphTypeMap[$nama] = $pt->id;
        }

        $pphCatalog = [
            ['name' => 'PPh 21 (2.5%)', 'value' => 2.5, 'deduction' => 'no', 'type' => 'PPh Pasal 21'],
            ['name' => 'PPh 22 Import (2.5%)', 'value' => 2.5, 'deduction' => 'no', 'type' => 'PPh Pasal 22'],
            ['name' => 'PPh 23 Jasa (2.0%)', 'value' => 2.0, 'deduction' => 'no', 'type' => 'PPh Pasal 23'],
            ['name' => 'PPh 4(2) Sewa (10.0%)', 'value' => 10.0, 'deduction' => 'no', 'type' => 'PPh Final 4(2)'],
        ];
        foreach ($pphCatalog as $entry) {
            Pph::firstOrCreate(
                ['name' => $entry['name']],
                [
                    'value' => $entry['value'],
                    'deduction' => $entry['deduction'],
                    'status' => 'active',
                    'pph_type_id' => $pphTypeMap[$entry['type']] ?? 1,
                ]
            );
        }

        foreach ([['name' => 'PPN 11%', 'value' => 11], ['name' => 'PPN 12%', 'value' => 12], ['name' => 'Non PPN', 'value' => 0]] as $ppnRow) {
            Ppn::firstOrCreate(['name' => $ppnRow['name']], ['value' => $ppnRow['value'], 'status' => 1]);
        }

        $this->seedSimpleLookup('discount_types', [
            ['name' => 'Percentage', 'status' => '1'],
            ['name' => 'Nominal', 'status' => '1'],
        ], 'name');

        // Countries with codes
        $countrySeeds = [
            ['name' => 'Indonesia', 'code' => 'ID'],
            ['name' => 'China', 'code' => 'CN'],
            ['name' => 'Japan', 'code' => 'JP'],
            ['name' => 'Singapore', 'code' => 'SG'],
            ['name' => 'Germany', 'code' => 'DE'],
            ['name' => 'United States', 'code' => 'US'],
            ['name' => 'Malaysia', 'code' => 'MY'],
            ['name' => 'South Korea', 'code' => 'KR'],
        ];
        foreach ($countrySeeds as $cs) {
            $existing = DB::table('countries')->where('name', $cs['name'])->first();
            if ($existing) {
                DB::table('countries')->where('id', $existing->id)->update([
                    'code' => $existing->code ?: $cs['code'],
                    'created_by' => $existing->created_by ?: $adminId,
                    'updated_by' => $existing->updated_by ?: $adminId,
                    'updated_at' => $now,
                ]);
            } else {
                DB::table('countries')->insert([
                    'code' => $cs['code'],
                    'name' => $cs['name'],
                    'status' => 1,
                    'created_by' => $adminId,
                    'updated_by' => $adminId,
                    'created_at' => $now,
                    'updated_at' => $now,
                ]);
            }
        }

        $this->seedSimpleLookup('ports', [
            ['name' => 'Tanjung Perak', 'status' => 1],
            ['name' => 'Tanjung Priok', 'status' => 1],
            ['name' => 'Juanda Cargo', 'status' => 1],
            ['name' => 'Soekarno-Hatta Cargo', 'status' => 1],
            ['name' => 'Belawan', 'status' => 1],
        ], 'name');

        $this->seedSimpleLookup('reporting_types', [
            ['name' => 'Internal Report', 'status' => 1],
            ['name' => 'Laporan Operasional', 'status' => 1],
            ['name' => 'Laporan Bea Cukai', 'status' => 1],
        ], 'name');

        $this->seedSimpleLookup('origins', [
            ['name' => 'Lokal', 'status' => 1],
            ['name' => 'Import', 'status' => 1],
        ], 'name');

        $this->seedSimpleLookup('item_types', [
            ['name' => 'Bahan Baku', 'status' => 'active'],
            ['name' => 'Sparepart', 'status' => 'active'],
            ['name' => 'Barang Jadi', 'status' => 'active'],
            ['name' => 'Bahan Penolong', 'status' => 'active'],
            ['name' => 'ATK & Umum', 'status' => 'active'],
        ], 'name');

        $this->seedSimpleLookup('group_scrap_items', [
            ['code' => 'SCR-CU', 'name' => 'Copper Scrap', 'status' => 1],
            ['code' => 'SCR-AL', 'name' => 'Aluminum Scrap', 'status' => 1],
            ['code' => 'SCR-FE', 'name' => 'Steel / Iron Scrap', 'status' => 1],
            ['code' => 'SCR-PKG', 'name' => 'Packaging Waste', 'status' => 1],
        ], 'code');

        $this->seedSimpleLookup('specifications', [
            ['name' => 'SNI Standard', 'status' => 1],
            ['name' => 'ASTM Standard', 'status' => 1],
            ['name' => 'JIS Standard', 'status' => 1],
            ['name' => 'ISO 9001 Grade', 'status' => 1],
            ['name' => 'OEM Industrial Spec', 'status' => 1],
        ], 'name');

        $this->seedSimpleLookup('types_rates_bm', [
            ['name' => 'Ad Valorem (%)', 'status' => 1],
            ['name' => 'Specific (IDR / Unit)', 'status' => 1],
            ['name' => 'Exempted (0%)', 'status' => 1],
        ], 'name');

        $this->seedSimpleLookup('types_rates_cukai', [
            ['name' => 'Ad Valorem (%)', 'status' => 1],
            ['name' => 'Specific (IDR / Unit)', 'status' => 1],
            ['name' => 'Non-Excise', 'status' => 1],
        ], 'name');

        $this->seedSimpleLookup('customs_reports', [
            ['name' => 'Laporan Pemasukan Barang', 'status' => 1],
            ['name' => 'Laporan Pengeluaran Barang', 'status' => 1],
            ['name' => 'Laporan Pertanggungjawaban Mutasi', 'status' => 1],
            ['name' => 'Laporan Posisi WIP', 'status' => 1],
        ], 'name');

        $uomCatalog = [
            ['code' => 'KG', 'name' => 'KG', 'description' => 'Kilogram'],
            ['code' => 'KGM', 'name' => 'KGM', 'description' => 'Kilogram (Customs Code)'],
            ['code' => 'KGS', 'name' => 'KGS', 'description' => 'Kilograms'],
            ['code' => 'PCE', 'name' => 'PCE', 'description' => 'Piece'],
            ['code' => 'PIECE', 'name' => 'PIECE', 'description' => 'Single Unit / Piece'],
            ['code' => 'SET', 'name' => 'SET', 'description' => 'Complete Set'],
            ['code' => 'LTR', 'name' => 'LTR', 'description' => 'Liter'],
            ['code' => 'TON', 'name' => 'TON', 'description' => 'Metric Ton'],
            ['code' => 'SAK', 'name' => 'SAK', 'description' => 'Sack / Bag'],
            ['code' => 'RIM', 'name' => 'RIM', 'description' => 'Ream (500 Sheets)'],
            ['code' => 'BOX', 'name' => 'BOX', 'description' => 'Standard Carton / Box'],
            ['code' => 'MTR', 'name' => 'MTR', 'description' => 'Meter'],
            ['code' => 'ROL', 'name' => 'ROL', 'description' => 'Roll / Coil'],
        ];
        foreach ($uomCatalog as $u) {
            $row = UnitOfMeasurement::where('name', $u['name'])->first();
            if ($row) {
                $row->update([
                    'code' => $row->code ?: $u['code'],
                    'description' => $row->description ?: $u['description'],
                    'created_by' => $row->created_by ?: $adminId,
                ]);
            } else {
                UnitOfMeasurement::create([
                    'code' => $u['code'],
                    'name' => $u['name'],
                    'description' => $u['description'],
                    'status' => 1,
                    'created_by' => $adminId,
                ]);
            }
        }

        $unitNames = ['Kilogram', 'Piece', 'Set', 'Liter', 'Box', 'Meter', 'Ton', 'Rim', 'Sak', 'Roll'];
        foreach ($unitNames as $uName) {
            if (! DB::table('units')->where('nama', $uName)->exists()) {
                DB::table('units')->insert([
                    'nama' => $uName,
                    'status' => 1,
                    'created_at' => $now,
                    'updated_at' => $now,
                ]);
            }
        }

        // Backfill metadata on existing rows without overwriting custom user edits
        DB::table('accounts')->get()->each(function ($acc) use ($adminId, $now) {
            DB::table('accounts')->where('id', $acc->id)->update([
                'category' => $acc->category ?: 'Current Asset',
                'created_by' => $acc->created_by ?: $adminId,
                'updated_by' => $acc->updated_by ?: $adminId,
                'updated_at' => $acc->updated_at ?: $now,
            ]);
        });

        DB::table('job_number')->get()->each(function ($job, $idx) use ($adminId, $now) {
            DB::table('job_number')->where('id', $job->id)->update([
                'code' => $job->code ?: $job->name,
                'department' => $job->department ?: ($idx % 2 === 0 ? 'REFINING' : 'SMELTING'),
                'created_by' => $job->created_by ?: $adminId,
                'updated_by' => $job->updated_by ?: $adminId,
                'updated_at' => $job->updated_at ?: $now,
            ]);
        });

        DB::table('rafaksi_types')->get()->each(function ($raf, $idx) use ($adminId, $now) {
            DB::table('rafaksi_types')->where('id', $raf->id)->update([
                'code' => $raf->code ?: ('RAF-0' . ($idx + 1)),
                'description' => $raf->description ?: ($raf->name . ' deduction standard'),
                'created_by' => $raf->created_by ?: $adminId,
                'updated_by' => $raf->updated_by ?: $adminId,
                'updated_at' => $raf->updated_at ?: $now,
            ]);
        });

        $colourCodes = [
            'Safety Yellow' => 'CLR-YLW',
            'Industrial Blue' => 'CLR-BLU',
            'Signal Red' => 'CLR-RED',
            'Matte Black' => 'CLR-BLK',
            'Clean White' => 'CLR-WHT',
        ];
        DB::table('colours')->get()->each(function ($col, $idx) use ($colourCodes) {
            if (! $col->code) {
                DB::table('colours')->where('id', $col->id)->update([
                    'code' => $colourCodes[$col->name] ?? ('CLR-' . str_pad((string) ($idx + 1), 3, '0', STR_PAD_LEFT)),
                ]);
            }
        });

        DB::table('warehouses')->get()->each(function ($wh, $idx) use ($adminId) {
            DB::table('warehouses')->where('id', $wh->id)->update([
                'code' => $wh->code ?: ('WH-' . str_pad((string) ($idx + 1), 3, '0', STR_PAD_LEFT)),
                'created_by' => $wh->created_by ?: $adminId,
                'updated_by' => $wh->updated_by ?: $adminId,
            ]);
        });

        DB::table('warehouse_coordinates')->get()->each(function ($coord, $idx) {
            if (! $coord->code) {
                DB::table('warehouse_coordinates')->where('id', $coord->id)->update([
                    'code' => $coord->name ?: ('CRD-' . str_pad((string) ($idx + 1), 3, '0', STR_PAD_LEFT)),
                ]);
            }
        });

        $torDefaults = [
            'Production Issue' => ['code' => 'TOR-01', 'department' => 'Production', 'description' => 'Raw material & consumable issuance for production runs', 'requires_job_number' => true, 'requires_approval_2' => true],
            'Sample Requisition' => ['code' => 'TOR-02', 'department' => 'R&D / QC', 'description' => 'Material requisition for laboratory sample testing', 'requires_job_number' => false, 'requires_approval_2' => false],
            'Subkon Issue' => ['code' => 'TOR-03', 'department' => 'Subcontracting', 'description' => 'Material issuance for external subcontractor processing', 'requires_job_number' => true, 'requires_approval_2' => true],
            'Packing Material' => ['code' => 'TOR-04', 'department' => 'Logistics', 'description' => 'Carton, pallet, and packaging supplies issuance', 'requires_job_number' => false, 'requires_approval_2' => false],
        ];
        foreach ($torDefaults as $name => $meta) {
            $row = DB::table('type_of_request')->where('name', $name)->first();
            if ($row) {
                DB::table('type_of_request')->where('id', $row->id)->update([
                    'code' => $row->code ?: $meta['code'],
                    'department' => $row->department ?: $meta['department'],
                    'description' => $row->description ?: $meta['description'],
                    'requires_job_number' => $row->requires_job_number ?: $meta['requires_job_number'],
                    'requires_approval_2' => $row->requires_approval_2 ?: $meta['requires_approval_2'],
                    'created_by' => $row->created_by ?: $adminId,
                    'updated_by' => $row->updated_by ?: $adminId,
                ]);
            } else {
                DB::table('type_of_request')->insert(array_merge($meta, [
                    'name' => $name,
                    'status' => 1,
                    'created_by' => $adminId,
                    'updated_by' => $adminId,
                    'created_at' => $now,
                    'updated_at' => $now,
                ]));
            }
        }

        $destDefaults = [
            'Cutting Department' => ['code' => 'LOC-CUT', 'location_type' => 'Production Area', 'pic' => 'Production Supervisor', 'description' => 'Metal cutting & preparation station'],
            'Sewing Line 1' => ['code' => 'LOC-LINE1', 'location_type' => 'Production Area', 'pic' => 'Line Leader 1', 'description' => 'Primary assembly workstation line'],
            'Finishing & Packing' => ['code' => 'LOC-FIN', 'location_type' => 'Warehouse Zone', 'pic' => 'Logistics Lead', 'description' => 'Final inspection & packaging area'],
            'Sample Room' => ['code' => 'LOC-QC', 'location_type' => 'Quality Lab', 'pic' => 'QC Lead', 'description' => 'Quality verification & lab sample testing room'],
        ];
        foreach ($destDefaults as $name => $meta) {
            $row = DB::table('destination_location')->where('name', $name)->first();
            if ($row) {
                DB::table('destination_location')->where('id', $row->id)->update([
                    'code' => $row->code ?: $meta['code'],
                    'location_type' => $row->location_type ?: $meta['location_type'],
                    'pic' => $row->pic ?: $meta['pic'],
                    'description' => $row->description ?: $meta['description'],
                    'created_by' => $row->created_by ?: $adminId,
                    'updated_by' => $row->updated_by ?: $adminId,
                ]);
            } else {
                DB::table('destination_location')->insert(array_merge($meta, [
                    'name' => $name,
                    'status' => 1,
                    'created_by' => $adminId,
                    'updated_by' => $adminId,
                    'created_at' => $now,
                    'updated_at' => $now,
                ]));
            }
        }

        // Backfill user profile metadata
        $roleTitles = [
            'superadmin' => 'Enterprise Systems Administrator',
            'admin' => 'Operations Administrator',
            'approver_tier1' => 'Department Operations Head',
            'approver_tier2' => 'Operations Director',
            'procurement' => 'Procurement Specialist',
            'accounting' => 'Accounting & Cost Control Officer',
            'master_item_manager' => 'Master Data & Customs Specialist',
            'warehouse' => 'Warehouse & Inventory Officer',
            'requester' => 'Department Requisitioner',
            'viewer' => 'Compliance Auditor',
        ];
        DB::table('users')->get()->each(function ($user) use ($roleTitles) {
            $updates = [];
            if (! $user->job_title) {
                $updates['job_title'] = $roleTitles[$user->role] ?? 'Operations Staff';
            }
            if (! $user->employee_id) {
                $updates['employee_id'] = 'EMP-' . str_pad((string) $user->id, 4, '0', STR_PAD_LEFT);
            }
            if (! $user->preferred_language) {
                $updates['preferred_language'] = 'EN';
            }
            if (! empty($updates)) {
                DB::table('users')->where('id', $user->id)->update($updates);
            }
        });

        // 5. Stock Notifications (DB-backed buffer alert rules linked to real Items)
        if (StockNotification::count() === 0) {
            $items = Item::with(['classification', 'unit'])->orderBy('id')->limit(15)->get();
            foreach ($items as $item) {
                $bufferQty = max(10, round((float) ($item->stock ?? 10) * 0.25, 2));
                if ((float) $item->stock <= 5) {
                    $bufferQty = 20;
                }
                StockNotification::create([
                    'items_id' => $item->id,
                    'item_code' => $item->code,
                    'item_name' => $item->name,
                    'category' => $item->classification?->name ?? 'General Material',
                    'unit' => $item->unit?->name ?? 'PCE',
                    'buffer_quantity' => $bufferQty,
                    'trigger_condition' => 'Stock <= Buffer',
                    'notification_level' => (float) $item->stock <= 0 ? 'Critical' : 'Warning',
                    'status' => 1,
                    'notes' => 'Auto-configured minimum buffer rule from catalog stock.',
                    'created_by' => $adminId,
                    'updated_by' => $adminId,
                ]);
            }
        }
    }

    private function seedSimpleLookup(string $table, array $rows, string $uniqueKey): void
    {
        if (! Schema::hasTable($table)) {
            return;
        }
        $now = now();
        foreach ($rows as $row) {
            if (! DB::table($table)->where($uniqueKey, $row[$uniqueKey])->exists()) {
                DB::table($table)->insert(array_merge($row, [
                    'created_at' => $now,
                    'updated_at' => $now,
                ]));
            }
        }
    }
}

