<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('purchase_order_has_purchase_requisitions') && !Schema::hasColumn('purchase_order_has_purchase_requisitions', 'remark')) {
            Schema::table('purchase_order_has_purchase_requisitions', function (Blueprint $table) {
                $table->text('remark')->nullable()->after('item_alias');
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('purchase_order_has_purchase_requisitions') && Schema::hasColumn('purchase_order_has_purchase_requisitions', 'remark')) {
            Schema::table('purchase_order_has_purchase_requisitions', function (Blueprint $table) {
                $table->dropColumn('remark');
            });
        }
    }
};

