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

        // 4. Synchronize initial warehouse stock catalog only on already-seeded databases.
        // On fresh migrations (`php artisan migrate:fresh`), parent master tables are still empty
        // and will be populated afterwards by DatabaseSeeder -> WarehouseStockSeeder.
        $hasSeededMasters = DB::table('users')->exists()
            && DB::table('warehouse_types')->exists()
            && DB::table('classifications')->exists()
            && DB::table('item_types')->exists()
            && DB::table('facilities')->exists();

        if ($hasSeededMasters && class_exists(\Database\Seeders\WarehouseStockSeeder::class)) {
            \Database\Seeders\WarehouseStockSeeder::sync(createMissingMasters: false);
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
