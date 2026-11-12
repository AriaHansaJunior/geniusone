<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // 1. Table warehouse_stocks: tracks real stock per material in each warehouse location/coordinate
        if (! Schema::hasTable('warehouse_stocks')) {
            Schema::create('warehouse_stocks', function (Blueprint $table) {
                $table->id();
                $table->foreignId('items_id')->constrained('items')->cascadeOnDelete();
                $table->foreignId('warehouses_id')->constrained('warehouses')->cascadeOnDelete();
                $table->foreignId('warehouse_coordinates_id')->nullable()->constrained('warehouse_coordinates')->nullOnDelete();
                $table->string('coordinate_name', 100)->nullable();
                $table->decimal('quantity', 15, 2)->default(0);
                $table->decimal('allocated_quantity', 15, 2)->default(0);
                $table->decimal('available_quantity', 15, 2)->default(0);
                $table->string('lot_number', 100)->nullable();
                $table->string('location_type', 50)->default('Warehouse'); // 'Warehouse' or 'Production Area'
                $table->dateTime('last_movement_date')->nullable();
                $table->timestamps();

                $table->index(['items_id', 'warehouses_id']);
            });
        }

        // 2. Table transfer_stock_returns: tracks returns from Request Material back to warehouse
        if (! Schema::hasTable('transfer_stock_returns')) {
            Schema::create('transfer_stock_returns', function (Blueprint $table) {
                $table->id();
                $table->string('return_number', 100)->unique();
                $table->foreignId('request_material_id')->nullable()->constrained('request_material')->nullOnDelete();
                $table->foreignId('warehouses_id')->constrained('warehouses')->cascadeOnDelete();
                $table->date('return_date');
                $table->text('note')->nullable();
                $table->string('status', 50)->default('Approved');
                $table->foreignId('creator_id')->default(1);
                $table->timestamps();
            });
        }

        // 3. Table transfer_stock_return_items
        if (! Schema::hasTable('transfer_stock_return_items')) {
            Schema::create('transfer_stock_return_items', function (Blueprint $table) {
                $table->id();
                $table->foreignId('transfer_stock_return_id')->constrained('transfer_stock_returns')->cascadeOnDelete();
                $table->foreignId('items_id')->constrained('items')->cascadeOnDelete();
                $table->decimal('quantity', 15, 2);
                $table->string('remark', 255)->nullable();
                $table->timestamps();
            });
        }

        // 4. Ensure master warehouses exist
        $masterWarehouses = [
            ['name' => 'Gudang Sparepart', 'warehouse_types_id' => 3, 'description' => 'Penyimpanan Sparepart & Mekanik'],
            ['name' => 'Gudang Finish Good', 'warehouse_types_id' => 3, 'description' => 'Barang Jadi Tembaga & Timah'],
            ['name' => 'Gudang ATK', 'warehouse_types_id' => 1, 'description' => 'Alat Tulis Kantor & General Supplies'],
            ['name' => 'Gudang Bahan Bakar', 'warehouse_types_id' => 4, 'description' => 'Bahan Bakar & Solar'],
            ['name' => 'Gudang Raw Material', 'warehouse_types_id' => 2, 'description' => 'Scrap & Ingot Logam'],
        ];

        foreach ($masterWarehouses as $wh) {
            $existing = DB::table('warehouses')->where('name', $wh['name'])->first();
            if (! $existing) {
                DB::table('warehouses')->insert([
                    'name' => $wh['name'],
                    'warehouse_types_id' => $wh['warehouse_types_id'],
                    'description' => $wh['description'],
                    'status' => 1,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }
        }

        // 5. Ensure master items have external codes and exist in database
        $catalogItems = [
            [
                'code' => '60.154.300.101',
                'external_code' => 'NZ-SUS-316',
                'name' => 'Nozzle Jet Spray Spiral SUS 316 size ½" (Male thread)',
                'category_name' => 'MESIN & SPARE PART',
                'unit_name' => 'PCE',
                'stock' => 45.0,
                'facility_name' => 'FASILITAS',
                'wh_name' => 'Gudang Sparepart',
                'coord_name' => 'A-01-01',
                'location_type' => 'Warehouse',
                'lot' => 'LOT-202610-09',
            ],
            [
                'code' => '60.149.301.404',
                'external_code' => 'BT-M10-40',
                'name' => 'Mur Baut M 10 x 40 + ring pir',
                'category_name' => 'MESIN & SPARE PART',
                'unit_name' => 'PCE',
                'stock' => 150.0,
                'facility_name' => 'FASILITAS',
                'wh_name' => 'Gudang Sparepart',
                'coord_name' => 'A-01-02',
                'location_type' => 'Warehouse',
                'lot' => 'LOT-202610-02',
            ],
            [
                'code' => '50.112.100.001',
                'external_code' => 'CU-ING-99',
                'name' => 'Tembaga Batangan Murni 99.9% Grade A',
                'category_name' => 'FINISH GOOD',
                'unit_name' => 'KGS',
                'stock' => 750.0,
                'facility_name' => 'FASILITAS',
                'wh_name' => 'Gudang Finish Good',
                'coord_name' => 'B-02-01',
                'location_type' => 'Warehouse',
                'lot' => 'LOT-CU-261004',
            ],
            [
                'code' => '50.112.100.002',
                'external_code' => 'SN-ING-99',
                'name' => 'Timah Murni Ingot Grade A SN 99.9%',
                'category_name' => 'FINISH GOOD',
                'unit_name' => 'KGS',
                'stock' => 0.0,
                'facility_name' => 'FASILITAS',
                'wh_name' => 'Gudang Finish Good',
                'coord_name' => 'B-03-04',
                'location_type' => 'Warehouse',
                'lot' => 'LOT-SN-261001',
            ],
            [
                'code' => '10.002.400.012',
                'external_code' => 'P1-A4-80',
                'name' => 'Kertas HVS A4 80gr PaperOne',
                'category_name' => 'GENERAL ATK',
                'unit_name' => 'RIM',
                'stock' => 35.0,
                'facility_name' => 'NON FASILITAS',
                'wh_name' => 'Gudang ATK',
                'coord_name' => 'Gudang ATK',
                'location_type' => 'Warehouse',
                'lot' => 'LOT-ATK-2610',
            ],
            [
                'code' => '20.100.005.001',
                'external_code' => 'SCR-CU-01',
                'name' => 'Scrap Tembaga Heavy Copper Millberry',
                'category_name' => 'BAHAN BAKU',
                'unit_name' => 'KGS',
                'stock' => 3200.0,
                'facility_name' => 'FASILITAS',
                'wh_name' => 'Gudang Raw Material',
                'coord_name' => 'PROD-LINE-01',
                'location_type' => 'Production Area',
                'lot' => 'LOT-SCR-2610',
            ],
            [
                'code' => '30.200.010.003',
                'external_code' => 'FLUX-SMT',
                'name' => 'Flux Refining Powder Smelting Grade',
                'category_name' => 'BAHAN PENOLONG',
                'unit_name' => 'SAK',
                'stock' => 12.0,
                'facility_name' => 'FASILITAS',
                'wh_name' => 'Gudang Kimia C3',
                'coord_name' => 'PROD-LINE-02',
                'location_type' => 'Production Area',
                'lot' => 'LOT-FLX-2610',
            ],
            [
                'code' => '40.301.002.005',
                'external_code' => 'SOL-B35',
                'name' => 'Solar Industri B35 Pertamina',
                'category_name' => 'BAHAN PENOLONG',
                'unit_name' => 'LTR',
                'stock' => 4800.0,
                'facility_name' => 'NON FASILITAS',
                'wh_name' => 'Gudang Bahan Bakar',
                'coord_name' => 'C-01-01',
                'location_type' => 'Warehouse',
                'lot' => 'LOT-SOL-2610',
            ],
            [
                'code' => '70.500.001.008',
                'external_code' => 'BOX-W100',
                'name' => 'Karton Box Heavy Duty 40x40x30 Double Wall',
                'category_name' => 'KEMASAN & PACKING',
                'unit_name' => 'PCE',
                'stock' => 0.0,
                'facility_name' => 'FASILITAS',
                'wh_name' => 'Gudang Sparepart',
                'coord_name' => 'A-01-02',
                'location_type' => 'Warehouse',
                'lot' => 'LOT-BOX-2610',
            ],
        ];

        foreach ($catalogItems as $c) {
            $catId = DB::table('categories')->where('name', $c['category_name'])->value('id');
            if (! $catId) {
                $code = strtoupper(substr(preg_replace('/[^A-Za-z]/', '', $c['category_name']), 0, 4));
                if (DB::table('categories')->where('code', $code)->exists()) {
                    $code = 'CAT-' . strtoupper(substr(md5($c['category_name']), 0, 4));
                }
                $catId = DB::table('categories')->insertGetId([
                    'name' => $c['category_name'],
                    'code' => $code,
                    'status' => 1,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }

            $unitId = DB::table('units_of_measurements')->where('name', $c['unit_name'])->value('id');
            if (! $unitId) {
                $unitId = DB::table('units_of_measurements')->insertGetId([
                    'name' => $c['unit_name'],
                    'status' => 1,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }

            $facId = DB::table('facilities')->where('name', $c['facility_name'])->value('id') ?? 1;

            $item = DB::table('items')->where('code', $c['code'])->first();
            if ($item) {
                DB::table('items')->where('id', $item->id)->update([
                    'external_code' => $c['external_code'],
                    'name' => $c['name'],
                    'categories_id' => $catId,
                    'facilities_id' => $facId,
                    'stock' => $c['stock'],
                    'units_of_measurements_id' => $unitId,
                ]);
                $itemId = $item->id;
            } else {
                $itemId = DB::table('items')->insertGetId([
                    'code' => $c['code'],
                    'external_code' => $c['external_code'],
                    'name' => $c['name'],
                    'classifications_id' => 1,
                    'item_types_id' => 1,
                    'categories_id' => $catId,
                    'facilities_id' => $facId,
                    'stock' => $c['stock'],
                    'units_of_measurements_id' => $unitId,
                    'status' => 1,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }

            // Sync warehouse_stocks
            $whId = DB::table('warehouses')->where('name', $c['wh_name'])->value('id')
                ?: DB::table('warehouses')->where('name', 'like', "%{$c['wh_name']}%")->value('id')
                ?: 1;

            $stockRecord = DB::table('warehouse_stocks')
                ->where('items_id', $itemId)
                ->where('warehouses_id', $whId)
                ->first();

            if (! $stockRecord) {
                DB::table('warehouse_stocks')->insert([
                    'items_id' => $itemId,
                    'warehouses_id' => $whId,
                    'coordinate_name' => $c['coord_name'],
                    'quantity' => $c['stock'],
                    'available_quantity' => $c['stock'],
                    'allocated_quantity' => 0,
                    'lot_number' => $c['lot'],
                    'location_type' => $c['location_type'],
                    'last_movement_date' => '2026-10-15 16:40:00',
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            } else {
                DB::table('warehouse_stocks')->where('id', $stockRecord->id)->update([
                    'coordinate_name' => $c['coord_name'],
                    'quantity' => $c['stock'],
                    'available_quantity' => $c['stock'],
                    'lot_number' => $c['lot'],
                    'location_type' => $c['location_type'],
                ]);
            }
        }

        // 6. Seed historical October 2026 transactions for Nozzle item (matching screenshot 1)
        $nozzleItem = DB::table('items')->where('code', '60.154.300.101')->first();
        $whSparepartId = DB::table('warehouses')->where('name', 'Gudang Sparepart')->value('id')
            ?: DB::table('warehouses')->where('name', 'like', '%Sparepart%')->value('id')
            ?: 1;
        $jobId = DB::table('job_number')->first()?->id ?? 1;

        if ($nozzleItem) {
            // Check if October movements already exist
            $hasOctBpb = DB::table('bpb_receive_material')->where('bpb_number', '0138/WHIN-IMLI/G/X/2026')->exists();

            if (! $hasOctBpb) {
                // Inward BPB 1: 0112/WHIN-IMLI/G/IX/2026 on 2026-10-01
                $bpb1Id = DB::table('bpb_receive_material')->insertGetId([
                    'bpb_number' => '0112/WHIN-IMLI/G/IX/2026',
                    'note' => 'Beginning Balance / Inward Transfer',
                    'receive_date' => '2026-10-01 08:30:00',
                    'status' => 'Approved',
                    'creator_id' => 1,
                    'updated_by' => 1,
                    'created_at' => '2026-10-01 08:30:00',
                    'updated_at' => '2026-10-01 08:30:00',
                ]);

                $rn1Id = DB::table('receive_note')->insertGetId([
                    'rn_number' => 'RN-2026-0891',
                    'arrival_date' => '2026-10-01 08:00:00',
                    'status' => 'Approved',
                    'creator_id' => 1,
                    'supliers_id' => 1,
                    'created_at' => '2026-10-01 08:00:00',
                    'updated_at' => '2026-10-01 08:00:00',
                ]);

                $poRn1Id = DB::table('purchase_order_has_receive_note')->insertGetId([
                    'purchase_order_id' => 1,
                    'receive_note_id' => $rn1Id,
                    'dn_number' => 'LOT-202609-01',
                    'job_number_id' => $jobId,
                    'item_name' => $nozzleItem->name,
                    'quantity' => 50.0,
                    'rafaksi' => 0,
                    'price' => 350000,
                    'grand_total' => 17500000,
                    'remark' => 'JOB-2026-77',
                    'created_at' => '2026-10-01 08:30:00',
                    'updated_at' => '2026-10-01 08:30:00',
                ]);

                DB::table('po_rn_to_bpb')->insert([
                    'po_has_rn_id' => $poRn1Id,
                    'bpb_receive_material_id' => $bpb1Id,
                    'warehouses_id' => $whSparepartId,
                    'created_at' => '2026-10-01 08:30:00',
                    'updated_at' => '2026-10-01 08:30:00',
                ]);

                // Outbound RM 1: 0120/WHOUT-IMLI/X/2026 on 2026-10-03
                $rm1Id = DB::table('request_material')->insertGetId([
                    'request_number' => 'REQ-WH-2026-001',
                    'departments_id' => 1,
                    'warehouses_id' => $whSparepartId,
                    'type_of_request_id' => 1,
                    'destination_location_id' => 1,
                    'creator' => 1,
                    'updated_by' => 1,
                    'request_date' => '2026-10-03 14:15:00',
                    'note' => '0120/WHOUT-IMLI/X/2026: Issue to Maintenance Line 2',
                    'status' => 'Approved 2',
                    'created_at' => '2026-10-03 14:15:00',
                    'updated_at' => '2026-10-03 14:15:00',
                ]);

                DB::table('request_material_item')->insert([
                    'items_id' => $nozzleItem->id,
                    'request_material_id' => $rm1Id,
                    'request' => 10.0,
                    'remark' => 'Issue to Maintenance Line 2 | JOB-2026-77 | LOT-202609-01',
                    'created_at' => '2026-10-03 14:15:00',
                    'updated_at' => '2026-10-03 14:15:00',
                ]);

                // Inbound BPB 2: 0138/WHIN-IMLI/G/X/2026 on 2026-10-08
                $bpb2Id = DB::table('bpb_receive_material')->insertGetId([
                    'bpb_number' => '0138/WHIN-IMLI/G/X/2026',
                    'note' => 'Receipt BPB from PT. Hasil Fastindo',
                    'receive_date' => '2026-10-08 15:50:00',
                    'status' => 'Approved',
                    'creator_id' => 1,
                    'updated_by' => 1,
                    'created_at' => '2026-10-08 15:50:00',
                    'updated_at' => '2026-10-08 15:50:00',
                ]);

                $rn2Id = DB::table('receive_note')->insertGetId([
                    'rn_number' => '0131/RN-IMLI/X/2026',
                    'arrival_date' => '2026-10-08 15:00:00',
                    'status' => 'Approved',
                    'creator_id' => 1,
                    'supliers_id' => 1,
                    'created_at' => '2026-10-08 15:00:00',
                    'updated_at' => '2026-10-08 15:00:00',
                ]);

                $poRn2Id = DB::table('purchase_order_has_receive_note')->insertGetId([
                    'purchase_order_id' => 1,
                    'receive_note_id' => $rn2Id,
                    'dn_number' => 'LOT-202610-09',
                    'job_number_id' => $jobId,
                    'item_name' => $nozzleItem->name,
                    'quantity' => 25.0,
                    'rafaksi' => 0,
                    'price' => 350000,
                    'grand_total' => 8750000,
                    'remark' => 'JOB-2026-88',
                    'created_at' => '2026-10-08 15:50:00',
                    'updated_at' => '2026-10-08 15:50:00',
                ]);

                DB::table('po_rn_to_bpb')->insert([
                    'po_has_rn_id' => $poRn2Id,
                    'bpb_receive_material_id' => $bpb2Id,
                    'warehouses_id' => $whSparepartId,
                    'created_at' => '2026-10-08 15:50:00',
                    'updated_at' => '2026-10-08 15:50:00',
                ]);

                // Outbound RM 2: 0142/WHOUT-IMLI/X/2026 on 2026-10-12
                $rm2Id = DB::table('request_material')->insertGetId([
                    'request_number' => 'REQ-WH-2026-002',
                    'departments_id' => 1,
                    'warehouses_id' => $whSparepartId,
                    'type_of_request_id' => 1,
                    'destination_location_id' => 1,
                    'creator' => 1,
                    'updated_by' => 1,
                    'request_date' => '2026-10-12 11:20:00',
                    'note' => '0142/WHOUT-IMLI/X/2026: Issue to Production Workstation 3',
                    'status' => 'Approved 2',
                    'created_at' => '2026-10-12 11:20:00',
                    'updated_at' => '2026-10-12 11:20:00',
                ]);

                DB::table('request_material_item')->insert([
                    'items_id' => $nozzleItem->id,
                    'request_material_id' => $rm2Id,
                    'request' => 15.0,
                    'remark' => 'Issue to Production Workstation 3 | JOB-2026-88 | LOT-202610-09',
                    'created_at' => '2026-10-12 11:20:00',
                    'updated_at' => '2026-10-12 11:20:00',
                ]);

                // Outbound RM 3: 0150/WHOUT-IMLI/X/2026 on 2026-10-15
                $rm3Id = DB::table('request_material')->insertGetId([
                    'request_number' => 'REQ-WH-2026-003',
                    'departments_id' => 1,
                    'warehouses_id' => $whSparepartId,
                    'type_of_request_id' => 1,
                    'destination_location_id' => 1,
                    'creator' => 1,
                    'updated_by' => 1,
                    'request_date' => '2026-10-15 16:40:00',
                    'note' => '0150/WHOUT-IMLI/X/2026: Issue to Preventive Overhaul Team',
                    'status' => 'Approved 2',
                    'created_at' => '2026-10-15 16:40:00',
                    'updated_at' => '2026-10-15 16:40:00',
                ]);

                DB::table('request_material_item')->insert([
                    'items_id' => $nozzleItem->id,
                    'request_material_id' => $rm3Id,
                    'request' => 5.0,
                    'remark' => 'Issue to Preventive Overhaul Team | JOB-2026-88 | LOT-202610-09',
                    'created_at' => '2026-10-15 16:40:00',
                    'updated_at' => '2026-10-15 16:40:00',
                ]);
            }
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('transfer_stock_return_items');
        Schema::dropIfExists('transfer_stock_returns');
        Schema::dropIfExists('warehouse_stocks');
    }
};
