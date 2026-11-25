<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('warehouse_stock_transfers', function (Blueprint $table) {
            $table->id();
            $table->string('transfer_number', 100)->unique();
            $table->unsignedBigInteger('source_warehouse_id');
            $table->unsignedBigInteger('destination_warehouse_id');
            $table->unsignedBigInteger('source_coordinate_id')->nullable();
            $table->unsignedBigInteger('destination_coordinate_id')->nullable();
            $table->date('transfer_date');
            $table->string('reference_code', 100)->nullable();
            $table->string('idempotency_key', 100)->nullable()->unique();
            $table->string('status', 30)->default('Draft');
            $table->text('note')->nullable();
            $table->unsignedBigInteger('creator_id')->nullable();
            $table->unsignedBigInteger('posted_by')->nullable();
            $table->timestamp('posted_at')->nullable();
            $table->unsignedBigInteger('updated_by')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->foreign('source_warehouse_id', 'fk_wst_src_wh')
                ->references('id')->on('warehouses');
            $table->foreign('destination_warehouse_id', 'fk_wst_dst_wh')
                ->references('id')->on('warehouses');
            $table->foreign('source_coordinate_id', 'fk_wst_src_coord')
                ->references('id')->on('warehouse_coordinates')->nullOnDelete();
            $table->foreign('destination_coordinate_id', 'fk_wst_dst_coord')
                ->references('id')->on('warehouse_coordinates')->nullOnDelete();
            $table->foreign('creator_id', 'fk_wst_creator')
                ->references('id')->on('users')->nullOnDelete();
            $table->foreign('posted_by', 'fk_wst_posted_by')
                ->references('id')->on('users')->nullOnDelete();
            $table->foreign('updated_by', 'fk_wst_updated_by')
                ->references('id')->on('users')->nullOnDelete();
        });

        Schema::create('warehouse_stock_transfer_items', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('warehouse_stock_transfer_id');
            $table->unsignedBigInteger('items_id');
            $table->decimal('quantity', 18, 4);
            $table->string('unit', 45)->nullable();
            $table->string('lot_number', 100)->nullable();
            $table->string('remark', 255)->nullable();
            $table->timestamps();

            $table->foreign('warehouse_stock_transfer_id', 'fk_wsti_transfer')
                ->references('id')->on('warehouse_stock_transfers')->cascadeOnDelete();
            $table->foreign('items_id', 'fk_wsti_item')
                ->references('id')->on('items');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('warehouse_stock_transfer_items');
        Schema::dropIfExists('warehouse_stock_transfers');
    }
};
