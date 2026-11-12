<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        if (Schema::hasTable('purchase_order_has_receive_note')) {
            Schema::table('purchase_order_has_receive_note', function (Blueprint $table) {
                if (! Schema::hasColumn('purchase_order_has_receive_note', 'remark')) {
                    $table->string('remark', 255)->nullable()->after('grand_total');
                }
                if (! Schema::hasColumn('purchase_order_has_receive_note', 'po_has_items_id')) {
                    $table->unsignedBigInteger('po_has_items_id')->nullable()->after('purchase_order_id');
                }
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasTable('purchase_order_has_receive_note')) {
            Schema::table('purchase_order_has_receive_note', function (Blueprint $table) {
                if (Schema::hasColumn('purchase_order_has_receive_note', 'remark')) {
                    $table->dropColumn('remark');
                }
                if (Schema::hasColumn('purchase_order_has_receive_note', 'po_has_items_id')) {
                    $table->dropColumn('po_has_items_id');
                }
            });
        }
    }
};

