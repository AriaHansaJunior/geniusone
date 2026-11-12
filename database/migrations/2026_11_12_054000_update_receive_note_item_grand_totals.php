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
        if (Schema::hasTable('purchase_order_has_receive_note')) {
            DB::table('purchase_order_has_receive_note')
                ->where(function ($q) {
                    $q->where('grand_total', 0)->orWhereNull('grand_total');
                })
                ->where('price', '>', 0)
                ->update([
                    'grand_total' => DB::raw('quantity * price')
                ]);
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // No reverse operation needed for calculating totals
    }
};

