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
        // 1. Purchase Requisitions
        Schema::create('purchase_requisitions', function (Blueprint $table) {
            $table->id();
            $table->string('pr_number', 255);
            $table->foreignId('departments_id')->constrained('departments');
            $table->foreignId('creator')->constrained('users');
            $table->string('date', 45);
            $table->string('due_date', 45);
            $table->foreignId('sections_id')->constrained('sections');
            $table->string('attachment_file', 255)->nullable();
            $table->string('status', 45)->default('Draft');
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->integer('revision')->nullable()->default(0);
            $table->timestamps();
            $table->softDeletes();
        });

        // 2. Purchase Requisitions Items
        Schema::create('purchase_requisitions_has_items', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('purchase_requisitions_id');
            $table->unsignedBigInteger('items_id');
            $table->string('quantity', 45);
            $table->string('remark', 255)->nullable();
            $table->string('due_date', 45);
            $table->string('note', 500)->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->foreign('purchase_requisitions_id', 'fk_pr_items_pr')
                ->references('id')->on('purchase_requisitions')->cascadeOnDelete();
            $table->foreign('items_id', 'fk_pr_items_item')
                ->references('id')->on('items');
        });

        // 3. Approval PR
        Schema::create('approval_pr', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('purchase_requisitions_id');
            $table->unsignedBigInteger('users_id');
            $table->tinyInteger('status')->default(0);
            $table->enum('approval_ke', ['1', '2']);
            $table->timestamps();
            $table->softDeletes();

            $table->foreign('purchase_requisitions_id', 'fk_appr_pr_pr')
                ->references('id')->on('purchase_requisitions')->cascadeOnDelete();
            $table->foreign('users_id', 'fk_appr_pr_user')
                ->references('id')->on('users');
        });

        // 4. Logs
        Schema::create('logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('users_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('tipe', 255);
            $table->json('old')->nullable();
            $table->json('new');
            $table->timestamps();
            $table->softDeletes();
        });

        // 5. Delivery Terms
        Schema::create('delivery_terms', function (Blueprint $table) {
            $table->id();
            $table->string('name', 45);
            $table->tinyInteger('status')->default(1);
            $table->timestamps();
            $table->softDeletes();
        });

        // 6. Countries
        Schema::create('countries', function (Blueprint $table) {
            $table->id();
            $table->string('name', 45)->unique();
            $table->tinyInteger('status')->default(1);
            $table->timestamps();
            $table->softDeletes();
        });

        // 7. Payment Terms
        Schema::create('payment_terms', function (Blueprint $table) {
            $table->id();
            $table->string('name', 500)->unique();
            $table->tinyInteger('status')->default(1);
            $table->timestamps();
            $table->softDeletes();
        });

        // 8. Payment Methods
        Schema::create('payment_methods', function (Blueprint $table) {
            $table->id();
            $table->string('name', 45)->unique();
            $table->tinyInteger('status')->default(1);
            $table->timestamps();
            $table->softDeletes();
        });

        // 9. Rafaksi Types
        Schema::create('rafaksi_types', function (Blueprint $table) {
            $table->id();
            $table->string('name', 45)->unique();
            $table->tinyInteger('status')->default(1);
            $table->timestamps();
            $table->softDeletes();
        });

        // 10. Currencies
        Schema::create('currencies', function (Blueprint $table) {
            $table->id();
            $table->string('name', 45)->unique();
            $table->tinyInteger('status')->default(1);
            $table->timestamps();
            $table->softDeletes();
        });

        // 11. Ports
        Schema::create('ports', function (Blueprint $table) {
            $table->id();
            $table->string('name', 45)->unique();
            $table->tinyInteger('status')->default(1);
            $table->timestamps();
            $table->softDeletes();
        });

        // 12. Suppliers
        Schema::create('supliers', function (Blueprint $table) {
            $table->id();
            $table->string('code', 100);
            $table->string('name', 255);
            $table->string('address', 500)->nullable();
            $table->string('contact_person', 100)->nullable();
            $table->string('city', 100)->nullable();
            $table->string('state', 100)->nullable();
            $table->foreignId('countries_id')->constrained('countries');
            $table->string('zipcode', 45)->nullable();
            $table->string('email', 100)->nullable();
            $table->string('telephone_number', 45)->nullable();
            $table->foreignId('payment_terms_id')->constrained('payment_terms');
            $table->foreignId('payment_methods_id')->constrained('payment_methods');
            $table->foreignId('rafaksi_types_id')->constrained('rafaksi_types');
            $table->foreignId('currencies_id')->constrained('currencies');
            $table->foreignId('ports_id')->constrained('ports');
            $table->string('npwp', 45)->nullable();
            $table->string('nitku', 45)->nullable();
            $table->string('whatsapp', 45)->nullable();
            $table->string('wechat_id', 45)->nullable();
            $table->timestamps();
            $table->softDeletes();
        });

        // 13. Valutas
        Schema::create('valutas', function (Blueprint $table) {
            $table->id();
            $table->string('code', 45)->unique();
            $table->string('name', 45)->unique();
            $table->tinyInteger('status')->default(1);
            $table->timestamps();
            $table->softDeletes();
        });

        // 14. PO Types
        Schema::create('po_types', function (Blueprint $table) {
            $table->id();
            $table->string('code', 45)->unique();
            $table->string('name', 45);
            $table->tinyInteger('status')->default(1);
            $table->timestamps();
            $table->softDeletes();
        });

        // 15. Purchase Orders
        Schema::create('purchase_order', function (Blueprint $table) {
            $table->id();
            $table->string('po_number', 255)->nullable();
            $table->foreignId('creator_id')->constrained('users');
            $table->foreignId('po_types_id')->constrained('po_types');
            $table->string('date', 45);
            $table->string('due_date', 45);
            $table->foreignId('valutas_id')->constrained('valutas');
            $table->string('rate', 45)->default('1.00');
            $table->foreignId('supliers_id')->constrained('supliers');
            $table->string('address', 500);
            $table->foreignId('payment_terms_id')->constrained('payment_terms');
            $table->foreignId('payment_methods_id')->constrained('payment_methods');
            $table->tinyInteger('service_subkon')->default(0);
            $table->string('facility_status', 45)->default('FASILITAS');
            $table->foreignId('delivery_terms_id')->constrained('delivery_terms');
            $table->dateTime('latest_delivery');
            $table->string('remark', 500)->nullable();
            $table->integer('revision')->nullable()->default(0);
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();
        });

        // 16. Discount Types
        Schema::create('discount_types', function (Blueprint $table) {
            $table->id();
            $table->string('name', 45)->unique();
            $table->string('status', 45)->default('active');
            $table->timestamps();
            $table->softDeletes();
        });

        // 17. PPh Types
        Schema::create('pph_type', function (Blueprint $table) {
            $table->id();
            $table->string('nama', 45);
            $table->timestamps();
            $table->softDeletes();
        });

        // 18. PPh
        Schema::create('pph', function (Blueprint $table) {
            $table->id();
            $table->string('name', 45)->unique();
            $table->float('value')->default(0);
            $table->enum('deduction', ['yes', 'no'])->default('no');
            $table->string('status', 45)->default('active');
            $table->foreignId('pph_type_id')->constrained('pph_type');
            $table->timestamps();
            $table->softDeletes();
        });

        // 19. PPN
        Schema::create('ppn', function (Blueprint $table) {
            $table->id();
            $table->string('name', 45);
            $table->float('value')->default(0);
            $table->tinyInteger('status')->default(1);
            $table->timestamps();
            $table->softDeletes();
        });

        // 20. PO Has PR Items
        Schema::create('purchase_order_has_purchase_requisitions', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('purchase_order_id');
            $table->unsignedBigInteger('pr_has_items_id')->nullable();
            $table->string('item_alias', 100)->nullable();
            $table->float('price')->default(0);
            $table->float('purchased')->default(0);
            $table->float('order')->default(0);
            $table->unsignedBigInteger('discount_types_id')->nullable();
            $table->float('discount_val')->default(0);
            $table->float('subtotal')->default(0);
            $table->float('lme')->default(0);
            $table->float('optional_rate')->default(0);
            $table->float('percentage_lme')->default(0);
            $table->unsignedBigInteger('pph_id')->nullable();
            $table->float('subtotal_pph')->default(0);
            $table->float('total')->default(0);
            $table->float('discount')->default(0);
            $table->float('dpp')->default(0);
            $table->unsignedBigInteger('ppn_id')->nullable();
            $table->tinyInteger('ditangguhkan_kawasan_berikat')->default(0);
            $table->float('total_addional_cost')->default(0);
            $table->float('total_pph')->default(0);
            $table->float('grand_total')->default(0);
            $table->timestamps();
            $table->softDeletes();

            $table->foreign('purchase_order_id', 'fk_po_pr_po')
                ->references('id')->on('purchase_order')->cascadeOnDelete();
            $table->foreign('discount_types_id', 'fk_po_pr_disc')
                ->references('id')->on('discount_types')->nullOnDelete();
            $table->foreign('pph_id', 'fk_po_pr_pph')
                ->references('id')->on('pph')->nullOnDelete();
            $table->foreign('ppn_id', 'fk_po_pr_ppn')
                ->references('id')->on('ppn')->nullOnDelete();
        });

        // 21. Additional Cost Types
        Schema::create('additional_cost_types', function (Blueprint $table) {
            $table->id();
            $table->string('code', 45)->unique();
            $table->string('name', 45)->unique();
            $table->tinyInteger('status')->default(1);
            $table->timestamps();
            $table->softDeletes();
        });

        // 22. Additional Costs
        Schema::create('additional_costs', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('purchase_order_id');
            $table->unsignedBigInteger('additional_cost_types_id');
            $table->float('value')->default(0);
            $table->timestamps();
            $table->softDeletes();

            $table->foreign('purchase_order_id', 'fk_addcost_po')
                ->references('id')->on('purchase_order')->cascadeOnDelete();
            $table->foreign('additional_cost_types_id', 'fk_addcost_type')
                ->references('id')->on('additional_cost_types');
        });

        // 23. Approval PO
        Schema::create('approval_po', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('purchase_order_id');
            $table->unsignedBigInteger('users_id');
            $table->tinyInteger('status')->default(0);
            $table->enum('approval_ke', ['1', '2']);
            $table->timestamps();
            $table->softDeletes();

            $table->foreign('purchase_order_id', 'fk_appr_po_po')
                ->references('id')->on('purchase_order')->cascadeOnDelete();
            $table->foreign('users_id', 'fk_appr_po_user')
                ->references('id')->on('users');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('approval_po');
        Schema::dropIfExists('additional_costs');
        Schema::dropIfExists('additional_cost_types');
        Schema::dropIfExists('purchase_order_has_purchase_requisitions');
        Schema::dropIfExists('ppn');
        Schema::dropIfExists('pph');
        Schema::dropIfExists('pph_type');
        Schema::dropIfExists('discount_types');
        Schema::dropIfExists('purchase_order');
        Schema::dropIfExists('po_types');
        Schema::dropIfExists('valutas');
        Schema::dropIfExists('supliers');
        Schema::dropIfExists('ports');
        Schema::dropIfExists('currencies');
        Schema::dropIfExists('rafaksi_types');
        Schema::dropIfExists('payment_methods');
        Schema::dropIfExists('payment_terms');
        Schema::dropIfExists('countries');
        Schema::dropIfExists('delivery_terms');
        Schema::dropIfExists('logs');
        Schema::dropIfExists('approval_pr');
        Schema::dropIfExists('purchase_requisitions_has_items');
        Schema::dropIfExists('purchase_requisitions');
    }
};
