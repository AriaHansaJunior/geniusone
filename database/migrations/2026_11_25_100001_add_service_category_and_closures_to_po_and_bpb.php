<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('purchase_order', function (Blueprint $table) {
            if (! Schema::hasColumn('purchase_order', 'order_category')) {
                $table->string('order_category', 20)->default('GOODS')->after('po_types_id');
            }
            if (! Schema::hasColumn('purchase_order', 'closed_at')) {
                $table->timestamp('closed_at')->nullable()->after('rejection_note');
            }
            if (! Schema::hasColumn('purchase_order', 'closed_by')) {
                $table->unsignedBigInteger('closed_by')->nullable()->after('closed_at');
                $table->foreign('closed_by', 'fk_po_closed_by')
                    ->references('id')->on('users')->nullOnDelete();
            }
            if (! Schema::hasColumn('purchase_order', 'closing_note')) {
                $table->text('closing_note')->nullable()->after('closed_by');
            }
        });

        if (! Schema::hasTable('po_service_closures')) {
            Schema::create('po_service_closures', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('purchase_order_id');
                $table->string('berita_acara_number', 100)->unique();
                $table->date('berita_acara_date');
                $table->decimal('completion_percentage', 5, 2)->default(100);
                $table->text('service_description')->nullable();
                $table->string('verified_by_name', 150)->nullable();
                $table->string('attachment_path', 255)->nullable();
                $table->text('notes')->nullable();
                $table->string('status', 30)->default('Closed');
                $table->unsignedBigInteger('closed_by')->nullable();
                $table->timestamps();
                $table->softDeletes();

                $table->foreign('purchase_order_id', 'fk_po_srv_closure_po')
                    ->references('id')->on('purchase_order')->cascadeOnDelete();
                $table->foreign('closed_by', 'fk_po_srv_closure_user')
                    ->references('id')->on('users')->nullOnDelete();
            });
        }

        if (! Schema::hasColumn('bpb_receive_material', 'bpb_category')) {
            Schema::table('bpb_receive_material', function (Blueprint $table) {
                $table->string('bpb_category', 20)->default('GOODS')->after('bpb_type');
            });
        }

        if (DB::getDriverName() === 'sqlite') {
            Schema::table('po_rn_to_bpb', function (Blueprint $table) {
                $table->unsignedBigInteger('warehouses_id')->nullable()->change();
            });
        } else {
            Schema::table('po_rn_to_bpb', function (Blueprint $table) {
                $table->dropForeign('fk_po_rn_bpb_wh');
            });

            Schema::table('po_rn_to_bpb', function (Blueprint $table) {
                $table->unsignedBigInteger('warehouses_id')->nullable()->change();
                $table->foreign('warehouses_id', 'fk_po_rn_bpb_wh')
                    ->references('id')->on('warehouses')->nullOnDelete();
            });
        }
    }

    public function down(): void
    {
        if (DB::getDriverName() === 'sqlite') {
            Schema::table('po_rn_to_bpb', function (Blueprint $table) {
                $table->unsignedBigInteger('warehouses_id')->nullable(false)->change();
            });
        } else {
            Schema::table('po_rn_to_bpb', function (Blueprint $table) {
                $table->dropForeign('fk_po_rn_bpb_wh');
            });

            Schema::table('po_rn_to_bpb', function (Blueprint $table) {
                $table->unsignedBigInteger('warehouses_id')->nullable(false)->change();
                $table->foreign('warehouses_id', 'fk_po_rn_bpb_wh')
                    ->references('id')->on('warehouses');
            });
        }

        if (Schema::hasColumn('bpb_receive_material', 'bpb_category')) {
            Schema::table('bpb_receive_material', function (Blueprint $table) {
                $table->dropColumn('bpb_category');
            });
        }

        Schema::dropIfExists('po_service_closures');

        Schema::table('purchase_order', function (Blueprint $table) {
            if (Schema::hasColumn('purchase_order', 'closed_by')) {
                $table->dropForeign('fk_po_closed_by');
                $table->dropColumn('closed_by');
            }
            foreach (['closing_note', 'closed_at', 'order_category'] as $col) {
                if (Schema::hasColumn('purchase_order', $col)) {
                    $table->dropColumn($col);
                }
            }
        });
    }
};
