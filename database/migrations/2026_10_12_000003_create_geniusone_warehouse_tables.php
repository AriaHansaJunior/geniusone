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
        // 1. Receive Note (Surat Penerimaan / RN)
        Schema::create('receive_note', function (Blueprint $table) {
            $table->id();
            $table->string('rn_number', 100)->nullable();
            $table->foreignId('supliers_id')->constrained('supliers');
            $table->foreignId('currencies_id')->constrained('currencies');
            $table->float('rate')->default(1.0);
            $table->dateTime('arrival_date');
            $table->string('invoice_number', 100)->nullable();
            $table->dateTime('invoice_date')->nullable();
            $table->string('tax_invoice', 100)->nullable();
            $table->dateTime('tax_invoice_date')->nullable();
            $table->string('license_plate', 45)->nullable();
            $table->string('note', 255)->nullable();
            $table->string('sj_number', 45)->nullable();
            $table->dateTime('sj_date')->nullable();
            $table->string('pl_number', 45)->nullable();
            $table->dateTime('pl_date')->nullable();
            $table->tinyInteger('dn_status')->default(0);
            $table->tinyInteger('service_subkon')->default(0);
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();
        });

        // 2. PO Has Receive Note
        Schema::create('purchase_order_has_receive_note', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('purchase_order_id');
            $table->unsignedBigInteger('receive_note_id');
            $table->string('dn_number', 45)->nullable();
            $table->unsignedBigInteger('job_number_id');
            $table->string('item_name', 255)->nullable();
            $table->float('quantity')->default(0);
            $table->float('rafaksi')->default(0);
            $table->float('price')->default(0);
            $table->float('additional_price')->default(0);
            $table->float('discount')->default(0);
            $table->float('ppn')->default(0);
            $table->float('grand_total')->default(0);
            $table->timestamps();
            $table->softDeletes();

            $table->foreign('purchase_order_id', 'fk_po_rn_po')
                ->references('id')->on('purchase_order')->cascadeOnDelete();
            $table->foreign('receive_note_id', 'fk_po_rn_rn')
                ->references('id')->on('receive_note')->cascadeOnDelete();
            $table->foreign('job_number_id', 'fk_po_rn_job')
                ->references('id')->on('job_number');
        });

        // 3. BPB Receive Material (Bukti Penerimaan Barang Gudang)
        Schema::create('bpb_receive_material', function (Blueprint $table) {
            $table->id();
            $table->string('bpb_number', 100)->nullable();
            $table->string('note', 500)->nullable();
            $table->dateTime('receive_date');
            $table->unsignedBigInteger('creator_id');
            $table->unsignedBigInteger('updated_by');
            $table->timestamps();
            $table->softDeletes();

            $table->foreign('creator_id', 'fk_bpb_creator')->references('id')->on('users');
            $table->foreign('updated_by', 'fk_bpb_updater')->references('id')->on('users');
        });

        // 4. Warehouse Types
        Schema::create('warehouse_types', function (Blueprint $table) {
            $table->id();
            $table->string('name', 45)->unique();
            $table->tinyInteger('status')->default(1);
            $table->timestamps();
            $table->softDeletes();
        });

        // 5. Warehouses
        Schema::create('warehouses', function (Blueprint $table) {
            $table->id();
            $table->string('name', 45);
            $table->foreignId('warehouse_types_id')->constrained('warehouse_types');
            $table->string('description', 255)->nullable();
            $table->tinyInteger('status')->default(1);
            $table->timestamps();
            $table->softDeletes();
        });

        // 6. PO RN to BPB Mapping
        Schema::create('po_rn_to_bpb', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('po_has_rn_id')->nullable();
            $table->unsignedBigInteger('bpb_receive_material_id');
            $table->unsignedBigInteger('warehouses_id');
            $table->timestamps();
            $table->softDeletes();

            $table->foreign('bpb_receive_material_id', 'fk_po_rn_bpb_mat')
                ->references('id')->on('bpb_receive_material')->cascadeOnDelete();
            $table->foreign('warehouses_id', 'fk_po_rn_bpb_wh')
                ->references('id')->on('warehouses');
        });

        // 7. Approval BPB
        Schema::create('approval_bpb', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('bpb_receive_material_id');
            $table->unsignedBigInteger('users_id');
            $table->tinyInteger('status')->default(0);
            $table->enum('approval_ke', ['1', '2']);
            $table->timestamps();
            $table->softDeletes();

            $table->foreign('bpb_receive_material_id', 'fk_appr_bpb_mat')
                ->references('id')->on('bpb_receive_material')->cascadeOnDelete();
            $table->foreign('users_id', 'fk_appr_bpb_user')
                ->references('id')->on('users');
        });

        // 8. Approval RN
        Schema::create('approval_rn', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('users_id');
            $table->unsignedBigInteger('receive_note_id');
            $table->enum('approval_ke', ['1', '2']);
            $table->tinyInteger('status')->default(0);
            $table->timestamps();
            $table->softDeletes();

            $table->foreign('users_id', 'fk_appr_rn_user')->references('id')->on('users');
            $table->foreign('receive_note_id', 'fk_appr_rn_rn')
                ->references('id')->on('receive_note')->cascadeOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('approval_rn');
        Schema::dropIfExists('approval_bpb');
        Schema::dropIfExists('po_rn_to_bpb');
        Schema::dropIfExists('warehouses');
        Schema::dropIfExists('warehouse_types');
        Schema::dropIfExists('bpb_receive_material');
        Schema::dropIfExists('purchase_order_has_receive_note');
        Schema::dropIfExists('receive_note');
    }
};
