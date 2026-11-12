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
        // 1. Add 'note' column to additional_costs table if not exists
        if (Schema::hasTable('additional_costs')) {
            Schema::table('additional_costs', function (Blueprint $table) {
                if (! Schema::hasColumn('additional_costs', 'note')) {
                    $table->string('note', 255)->nullable()->after('value');
                }
            });
        }

        // 2. Synchronize PO facility_status with item facilities
        // Fix any historical PO records where all items are NON FASILITAS but PO was flagged as FASILITAS
        try {
            $pos = DB::table('purchase_order')->get();
            foreach ($pos as $po) {
                $poItems = DB::table('purchase_order_has_purchase_requisitions')
                    ->where('purchase_order_id', $po->id)
                    ->get();

                if ($poItems->isEmpty()) {
                    continue;
                }

                $facilities = collect();
                foreach ($poItems as $pi) {
                    if (! empty($pi->pr_has_items_id)) {
                        $pri = DB::table('purchase_requisitions_has_items')
                            ->where('id', $pi->pr_has_items_id)
                            ->first();
                        if ($pri && ! empty($pri->items_id)) {
                            $item = DB::table('items')->where('id', $pri->items_id)->first();
                            if ($item && ! empty($item->facilities_id)) {
                                $fac = DB::table('facilities')->where('id', $item->facilities_id)->value('name');
                                if ($fac) {
                                    $facilities->push(strtoupper(trim($fac)));
                                }
                            }
                        }
                    }
                }

                if ($facilities->isNotEmpty()) {
                    $hasNon = $facilities->contains(fn ($f) => str_contains($f, 'NON'));
                    $hasFac = $facilities->contains(fn ($f) => ! str_contains($f, 'NON') && (str_contains($f, 'FASILITAS') || str_contains($f, 'BERIKAT')));

                    if ($hasNon && ! $hasFac) {
                        DB::table('purchase_order')
                            ->where('id', $po->id)
                            ->update(['facility_status' => 'NON FASILITAS']);
                    } elseif ($hasFac) {
                        DB::table('purchase_order')
                            ->where('id', $po->id)
                            ->update(['facility_status' => 'FASILITAS']);
                    }
                }
            }
        } catch (\Throwable $e) {
            // Log or ignore if table not present in tests
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasTable('additional_costs')) {
            Schema::table('additional_costs', function (Blueprint $table) {
                if (Schema::hasColumn('additional_costs', 'note')) {
                    $table->dropColumn('note');
                }
            });
        }
    }
};

