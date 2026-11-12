<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        if (Schema::hasTable('purchase_order_has_purchase_requisitions')) {
            $items = DB::table('purchase_order_has_purchase_requisitions')
                ->where('subtotal', '<=', 0)
                ->where('price', '>', 0)
                ->get();

            foreach ($items as $it) {
                $qty = (float) $it->order;
                if ($qty <= 0) {
                    $qty = 1.0;
                }
                $price = (float) $it->price;
                $disc = (float) $it->discount_val;
                $subtotal = round($price * $qty, 2);
                $dpp = max(0.0, round($subtotal - $disc, 2));
                $total = (float) ($it->total > 0 ? $it->total : $dpp);
                $grandTotal = (float) ($it->grand_total > 0 ? $it->grand_total : $total);

                DB::table('purchase_order_has_purchase_requisitions')
                    ->where('id', $it->id)
                    ->update([
                        'subtotal' => $subtotal,
                        'total' => $total,
                        'dpp' => $dpp,
                        'grand_total' => $grandTotal,
                    ]);
            }
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // No-op
    }
};

