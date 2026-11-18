<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('item_warehouse', function (Blueprint $table) {
            $table->id();
            $table->foreignId('items_id')->constrained('items')->cascadeOnDelete();
            $table->foreignId('warehouses_id')->constrained('warehouses')->cascadeOnDelete();
            $table->decimal('quantity', 15, 2)->default(0);
            $table->timestamps();
            $table->unique(['items_id', 'warehouses_id']);
        });

        foreach (DB::table('warehouse_stocks')
            ->select('items_id', 'warehouses_id')
            ->selectRaw('SUM(quantity) as quantity')
            ->groupBy('items_id', 'warehouses_id')
            ->cursor() as $stock) {
            DB::table('item_warehouse')->insert([
                'items_id' => $stock->items_id,
                'warehouses_id' => $stock->warehouses_id,
                'quantity' => $stock->quantity,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }

        Schema::create('inventory_movements', function (Blueprint $table) {
            $table->id();
            $table->foreignId('items_id')->constrained('items')->cascadeOnDelete();
            $table->foreignId('warehouses_id')->nullable()->constrained('warehouses')->nullOnDelete();
            $table->foreignId('warehouse_coordinates_id')->nullable()->constrained('warehouse_coordinates')->nullOnDelete();
            $table->foreignId('users_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('movement_type', 10);
            $table->decimal('quantity', 15, 2);
            $table->decimal('balance_before', 15, 2);
            $table->decimal('balance_after', 15, 2);
            $table->string('reference_type', 50);
            $table->string('reference_number', 100);
            $table->text('notes')->nullable();
            $table->timestamps();
            $table->index(['items_id', 'warehouses_id', 'created_at'], 'inventory_movements_item_warehouse_date_idx');
            $table->index(['reference_type', 'reference_number'], 'inventory_movements_reference_idx');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('inventory_movements');
        Schema::dropIfExists('item_warehouse');
    }
};
