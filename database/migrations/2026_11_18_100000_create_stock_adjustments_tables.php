<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('stock_adjustments')) {
            Schema::create('stock_adjustments', function (Blueprint $table) {
                $table->id();
                $table->string('adjustment_number', 100)->unique();
                $table->foreignId('warehouses_id')->nullable()->constrained('warehouses')->nullOnDelete();
                $table->date('adjustment_date');
                $table->string('source_type', 30)->default('MANUAL');
                $table->string('reference_code', 100)->nullable();
                $table->text('note')->nullable();
                $table->string('status', 45)->default('Posted');
                $table->foreignId('creator_id')->nullable()->constrained('users')->nullOnDelete();
                $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
                $table->timestamps();
            });
        }

        if (! Schema::hasTable('stock_adjustment_items')) {
            Schema::create('stock_adjustment_items', function (Blueprint $table) {
                $table->id();
                $table->foreignId('stock_adjustment_id')->constrained('stock_adjustments')->cascadeOnDelete();
                $table->foreignId('items_id')->constrained('items')->cascadeOnDelete();
                $table->foreignId('warehouses_id')->constrained('warehouses')->cascadeOnDelete();
                $table->string('adjustment_type', 10);
                $table->decimal('quantity', 15, 2);
                $table->decimal('balance_before', 15, 2)->default(0);
                $table->decimal('balance_after', 15, 2)->default(0);
                $table->string('coordinate_name', 100)->nullable();
                $table->string('lot_number', 100)->nullable();
                $table->string('remark', 255)->nullable();
                $table->timestamps();
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('stock_adjustment_items');
        Schema::dropIfExists('stock_adjustments');
    }
};
