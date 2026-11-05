<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations for BE-05: Closing and Unclosing PR line items.
     */
    public function up(): void
    {
        Schema::table('purchase_requisitions_has_items', function (Blueprint $table) {
            if (! Schema::hasColumn('purchase_requisitions_has_items', 'is_closed')) {
                $table->boolean('is_closed')->default(false)->after('note')->index();
            }
            if (! Schema::hasColumn('purchase_requisitions_has_items', 'closed_at')) {
                $table->timestamp('closed_at')->nullable()->after('is_closed');
            }
            if (! Schema::hasColumn('purchase_requisitions_has_items', 'closed_by')) {
                $table->foreignId('closed_by')->nullable()->after('closed_at')->constrained('users')->nullOnDelete();
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('purchase_requisitions_has_items', function (Blueprint $table) {
            if (Schema::hasColumn('purchase_requisitions_has_items', 'closed_by')) {
                $table->dropForeign(['closed_by']);
                $table->dropColumn('closed_by');
            }
            if (Schema::hasColumn('purchase_requisitions_has_items', 'closed_at')) {
                $table->dropColumn('closed_at');
            }
            if (Schema::hasColumn('purchase_requisitions_has_items', 'is_closed')) {
                $table->dropColumn('is_closed');
            }
        });
    }
};
