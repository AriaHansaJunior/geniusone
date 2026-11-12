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
        // 1. Add items_id to purchase_order_has_purchase_requisitions
        if (! Schema::hasColumn('purchase_order_has_purchase_requisitions', 'items_id')) {
            Schema::table('purchase_order_has_purchase_requisitions', function (Blueprint $table) {
                $table->unsignedBigInteger('items_id')->nullable()->after('pr_has_items_id');
                $table->foreign('items_id')->references('id')->on('items')->nullOnDelete();
            });
        }

        // 2. Backfill items_id and item_alias
        $rows = DB::table('purchase_order_has_purchase_requisitions as pohpr')
            ->leftJoin('purchase_requisitions_has_items as prhi', 'pohpr.pr_has_items_id', '=', 'prhi.id')
            ->select('pohpr.id', 'pohpr.pr_has_items_id', 'pohpr.item_alias', 'prhi.items_id as pr_item_id')
            ->get();

        foreach ($rows as $r) {
            $resolvedItemId = $r->pr_item_id;
            if (! $resolvedItemId && ! empty($r->item_alias)) {
                $mItem = DB::table('items')
                    ->where('code', $r->item_alias)
                    ->orWhere('name', $r->item_alias)
                    ->first();
                $resolvedItemId = $mItem?->id;
            }

            $updateData = [];
            if ($resolvedItemId) {
                $updateData['items_id'] = $resolvedItemId;
            }

            $currAlias = trim((string) $r->item_alias);
            if ($currAlias === '' || in_array($currAlias, ['—', '-'], true)) {
                $itemName = null;
                if ($resolvedItemId) {
                    $itemName = DB::table('items')->where('id', $resolvedItemId)->value('name');
                }
                if ($itemName) {
                    $updateData['item_alias'] = $itemName;
                }
            }

            if (! empty($updateData)) {
                DB::table('purchase_order_has_purchase_requisitions')
                    ->where('id', $r->id)
                    ->update($updateData);
            }
        }

        // 3. Fix mismatched facility_status on purchase_order table
        $pos = DB::table('purchase_order')->get();
        foreach ($pos as $po) {
            $hasNonItem = DB::table('purchase_order_has_purchase_requisitions as pohpr')
                ->leftJoin('items as i', 'pohpr.items_id', '=', 'i.id')
                ->leftJoin('facilities as f', 'i.facilities_id', '=', 'f.id')
                ->where('pohpr.purchase_order_id', $po->id)
                ->where(function ($q) {
                    $q->where('i.facilities_id', 3)
                        ->orWhere('f.name', 'like', '%NON%');
                })
                ->exists();

            if ($hasNonItem && $po->facility_status !== 'NON FASILITAS') {
                DB::table('purchase_order')
                    ->where('id', $po->id)
                    ->update(['facility_status' => 'NON FASILITAS']);
            }
        }

        // 4. Seed standard additional cost types into additional_cost_types table
        $standardCosts = [
            ['code' => 'INS', 'name' => 'Insurance'],
            ['code' => 'SUPP', 'name' => 'Additional Support'],
            ['code' => 'ASRF', 'name' => 'Assuransi Fee'],
            ['code' => 'BNKF', 'name' => 'Bank Fee'],
            ['code' => 'CIF', 'name' => 'CIF Surabaya Port 1x20 FCL'],
            ['code' => 'COUR', 'name' => 'Courier Fee'],
            ['code' => 'EXPP', 'name' => 'Export Packing, Inland Freight'],
            ['code' => 'FRTC', 'name' => 'Freight Cost'],
            ['code' => 'ONGK', 'name' => 'Ongkos Kirim'],
            ['code' => 'FEDX', 'name' => 'Packing Inland Freight Door to Door By Fedex'],
            ['code' => 'SHIP', 'name' => 'Shipping Cost'],
            ['code' => 'WRNT', 'name' => 'Warranty Claim'],
            ['code' => 'COMM', 'name' => 'Commission'],
            ['code' => 'BJAP', 'name' => 'Biaya Jasa Aplikasi'],
            ['code' => 'BLAY', 'name' => 'Biaya Layanan'],
            ['code' => 'TGOP', 'name' => 'Biaya Top-up GoPay'],
            ['code' => 'PPH22', 'name' => 'PPh Psl 22 (0.3%)'],
            ['code' => 'BPEN', 'name' => 'Biaya Penanganan'],
            ['code' => 'RBYM', 'name' => 'ribbon fargo YMCKO PN 45500 colour'],
            ['code' => 'RBLK', 'name' => 'ribbon fargo black'],
            ['code' => 'PPN11', 'name' => 'PPN 1.1%'],
            ['code' => 'PPH01', 'name' => 'PPh 22 0.1%'],
            ['code' => 'PBBKB', 'name' => 'PBBKB'],
            ['code' => 'BMTR', 'name' => 'Biaya Materai'],
        ];

        foreach ($standardCosts as $sc) {
            $exists = DB::table('additional_cost_types')
                ->where('code', $sc['code'])
                ->orWhere('name', $sc['name'])
                ->exists();

            if (! $exists) {
                DB::table('additional_cost_types')->insert([
                    'code' => $sc['code'],
                    'name' => $sc['name'],
                    'status' => 1,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasColumn('purchase_order_has_purchase_requisitions', 'items_id')) {
            Schema::table('purchase_order_has_purchase_requisitions', function (Blueprint $table) {
                $table->dropForeign(['items_id']);
                $table->dropColumn('items_id');
            });
        }
    }
};
