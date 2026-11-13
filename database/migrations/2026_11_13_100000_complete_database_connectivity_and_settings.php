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
        // 1. Exchange Rates (DB-backed currency benchmark history)
        if (! Schema::hasTable('exchange_rates')) {
            Schema::create('exchange_rates', function (Blueprint $table) {
                $table->id();
                $table->foreignId('currencies_id')->constrained('currencies')->cascadeOnDelete();
                $table->date('rate_date');
                $table->string('rate_type', 60);
                $table->decimal('buy_rate', 18, 4)->default(0);
                $table->decimal('sell_rate', 18, 4)->default(0);
                $table->decimal('middle_rate', 18, 4)->default(0);
                $table->string('source', 100)->nullable();
                $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
                $table->timestamps();
                $table->softDeletes();

                $table->index(['currencies_id', 'rate_date', 'rate_type'], 'idx_exchange_rates_lookup');
            });
        }

        // 2. Stock Notification Master (DB-backed buffer stock alert rules)
        if (! Schema::hasTable('stock_notifications')) {
            Schema::create('stock_notifications', function (Blueprint $table) {
                $table->id();
                $table->foreignId('items_id')->nullable()->constrained('items')->nullOnDelete();
                $table->string('item_code', 100)->index();
                $table->string('item_name', 255);
                $table->string('category', 100)->nullable();
                $table->string('unit', 45)->nullable();
                $table->decimal('buffer_quantity', 15, 2)->default(10);
                $table->string('trigger_condition', 45)->default('Stock <= Buffer');
                $table->string('notification_level', 45)->default('Warning');
                $table->tinyInteger('status')->default(1);
                $table->dateTime('last_triggered_at')->nullable();
                $table->text('notes')->nullable();
                $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
                $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
                $table->timestamps();
                $table->softDeletes();
            });
        }

        // 3. System Settings (Company branding, form metadata, default tax/operational settings)
        if (! Schema::hasTable('system_settings')) {
            Schema::create('system_settings', function (Blueprint $table) {
                $table->id();
                $table->string('key', 100)->unique();
                $table->text('value')->nullable();
                $table->string('group', 50)->default('general');
                $table->string('label', 150)->nullable();
                $table->timestamps();
            });
        }

        // 4. Configurable Reference Options (Eliminates hardcoded frontend select options)
        if (! Schema::hasTable('reference_options')) {
            Schema::create('reference_options', function (Blueprint $table) {
                $table->id();
                $table->string('category', 60)->index();
                $table->string('code', 60);
                $table->string('name', 120);
                $table->json('meta')->nullable();
                $table->integer('sort_order')->default(0);
                $table->tinyInteger('status')->default(1);
                $table->timestamps();
                $table->softDeletes();

                $table->unique(['category', 'code'], 'uq_ref_opt_category_code');
            });
        }

        // 5. Extend Users with profile attributes (removes EditProfile.tsx hardcodes)
        if (Schema::hasTable('users')) {
            Schema::table('users', function (Blueprint $table) {
                if (! Schema::hasColumn('users', 'job_title')) {
                    $table->string('job_title', 120)->nullable()->after('role');
                }
                if (! Schema::hasColumn('users', 'employee_id')) {
                    $table->string('employee_id', 60)->nullable()->after('job_title');
                }
                if (! Schema::hasColumn('users', 'preferred_language')) {
                    $table->string('preferred_language', 10)->default('EN')->after('employee_id');
                }
            });
        }

        // 6. Extend Suppliers with status
        if (Schema::hasTable('supliers') && ! Schema::hasColumn('supliers', 'status')) {
            Schema::table('supliers', function (Blueprint $table) {
                $table->tinyInteger('status')->default(1)->after('wechat_id');
            });
        }

        // 7. Extend Exim & Procurement master tables so all UI fields persist in DB
        if (Schema::hasTable('accounts')) {
            Schema::table('accounts', function (Blueprint $table) {
                if (! Schema::hasColumn('accounts', 'category')) {
                    $table->string('category', 80)->default('Current Asset')->after('name');
                }
                if (! Schema::hasColumn('accounts', 'created_by')) {
                    $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
                }
                if (! Schema::hasColumn('accounts', 'updated_by')) {
                    $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
                }
            });
        }

        if (Schema::hasTable('countries')) {
            Schema::table('countries', function (Blueprint $table) {
                if (! Schema::hasColumn('countries', 'code')) {
                    $table->string('code', 20)->nullable()->after('id');
                }
                if (! Schema::hasColumn('countries', 'created_by')) {
                    $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
                }
                if (! Schema::hasColumn('countries', 'updated_by')) {
                    $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
                }
            });
        }

        if (Schema::hasTable('valutas')) {
            Schema::table('valutas', function (Blueprint $table) {
                if (! Schema::hasColumn('valutas', 'symbol')) {
                    $table->string('symbol', 15)->nullable()->after('name');
                }
                if (! Schema::hasColumn('valutas', 'sync_status')) {
                    $table->string('sync_status', 30)->default('Synced')->after('status');
                }
                if (! Schema::hasColumn('valutas', 'last_synced_at')) {
                    $table->dateTime('last_synced_at')->nullable()->after('sync_status');
                }
                if (! Schema::hasColumn('valutas', 'created_by')) {
                    $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
                }
                if (! Schema::hasColumn('valutas', 'updated_by')) {
                    $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
                }
            });
        }

        if (Schema::hasTable('job_number')) {
            Schema::table('job_number', function (Blueprint $table) {
                if (! Schema::hasColumn('job_number', 'code')) {
                    $table->string('code', 60)->nullable()->after('id');
                }
                if (! Schema::hasColumn('job_number', 'department')) {
                    $table->string('department', 100)->nullable()->after('name');
                }
                if (! Schema::hasColumn('job_number', 'created_by')) {
                    $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
                }
                if (! Schema::hasColumn('job_number', 'updated_by')) {
                    $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
                }
            });
        }

        if (Schema::hasTable('rafaksi_types')) {
            Schema::table('rafaksi_types', function (Blueprint $table) {
                if (! Schema::hasColumn('rafaksi_types', 'code')) {
                    $table->string('code', 45)->nullable()->after('id');
                }
                if (! Schema::hasColumn('rafaksi_types', 'description')) {
                    $table->string('description', 255)->nullable()->after('name');
                }
                if (! Schema::hasColumn('rafaksi_types', 'created_by')) {
                    $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
                }
                if (! Schema::hasColumn('rafaksi_types', 'updated_by')) {
                    $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
                }
            });
        }

        if (Schema::hasTable('units_of_measurements')) {
            Schema::table('units_of_measurements', function (Blueprint $table) {
                if (! Schema::hasColumn('units_of_measurements', 'code')) {
                    $table->string('code', 45)->nullable()->after('id');
                }
                if (! Schema::hasColumn('units_of_measurements', 'description')) {
                    $table->string('description', 255)->nullable()->after('name');
                }
                if (! Schema::hasColumn('units_of_measurements', 'created_by')) {
                    $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
                }
            });
        }

        if (Schema::hasTable('colours') && ! Schema::hasColumn('colours', 'code')) {
            Schema::table('colours', function (Blueprint $table) {
                $table->string('code', 45)->nullable()->after('id');
            });
        }

        // 8. Warehouse Master, Coordinates, Type of Request, Destination Location
        if (Schema::hasTable('warehouses')) {
            Schema::table('warehouses', function (Blueprint $table) {
                if (! Schema::hasColumn('warehouses', 'code')) {
                    $table->string('code', 45)->nullable()->after('id');
                }
                if (! Schema::hasColumn('warehouses', 'created_by')) {
                    $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
                }
                if (! Schema::hasColumn('warehouses', 'updated_by')) {
                    $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
                }
            });
        }

        if (Schema::hasTable('warehouse_coordinates') && ! Schema::hasColumn('warehouse_coordinates', 'code')) {
            Schema::table('warehouse_coordinates', function (Blueprint $table) {
                $table->string('code', 45)->nullable()->after('id');
            });
        }

        if (Schema::hasTable('type_of_request')) {
            Schema::table('type_of_request', function (Blueprint $table) {
                if (! Schema::hasColumn('type_of_request', 'code')) {
                    $table->string('code', 45)->nullable()->after('id');
                }
                if (! Schema::hasColumn('type_of_request', 'department')) {
                    $table->string('department', 100)->nullable()->after('name');
                }
                if (! Schema::hasColumn('type_of_request', 'description')) {
                    $table->string('description', 255)->nullable()->after('department');
                }
                if (! Schema::hasColumn('type_of_request', 'requires_job_number')) {
                    $table->boolean('requires_job_number')->default(false)->after('description');
                }
                if (! Schema::hasColumn('type_of_request', 'requires_approval_2')) {
                    $table->boolean('requires_approval_2')->default(false)->after('requires_job_number');
                }
                if (! Schema::hasColumn('type_of_request', 'created_by')) {
                    $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
                }
                if (! Schema::hasColumn('type_of_request', 'updated_by')) {
                    $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
                }
            });
        }

        if (Schema::hasTable('destination_location')) {
            Schema::table('destination_location', function (Blueprint $table) {
                if (! Schema::hasColumn('destination_location', 'code')) {
                    $table->string('code', 45)->nullable()->after('id');
                }
                if (! Schema::hasColumn('destination_location', 'location_type')) {
                    $table->string('location_type', 60)->default('Production Area')->after('name');
                }
                if (! Schema::hasColumn('destination_location', 'pic')) {
                    $table->string('pic', 100)->nullable()->after('location_type');
                }
                if (! Schema::hasColumn('destination_location', 'description')) {
                    $table->string('description', 255)->nullable()->after('pic');
                }
                if (! Schema::hasColumn('destination_location', 'created_by')) {
                    $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
                }
                if (! Schema::hasColumn('destination_location', 'updated_by')) {
                    $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
                }
            });
        }

        // 9. Request Material & Transfer Stock Return completeness
        if (Schema::hasTable('request_material')) {
            Schema::table('request_material', function (Blueprint $table) {
                if (! Schema::hasColumn('request_material', 'job_number_id')) {
                    $table->foreignId('job_number_id')->nullable()->constrained('job_number')->nullOnDelete();
                }
                if (! Schema::hasColumn('request_material', 'job_number')) {
                    $table->string('job_number', 100)->nullable();
                }
                if (! Schema::hasColumn('request_material', 'customer')) {
                    $table->string('customer', 255)->nullable();
                }
                if (! Schema::hasColumn('request_material', 'project_type')) {
                    $table->string('project_type', 100)->nullable();
                }
                if (! Schema::hasColumn('request_material', 'is_internal_warehouse')) {
                    $table->boolean('is_internal_warehouse')->default(false);
                }
                if (! Schema::hasColumn('request_material', 'is_specific_station')) {
                    $table->boolean('is_specific_station')->default(false);
                }
            });
        }

        if (Schema::hasTable('transfer_stock_returns')) {
            Schema::table('transfer_stock_returns', function (Blueprint $table) {
                if (! Schema::hasColumn('transfer_stock_returns', 'production_code')) {
                    $table->string('production_code', 100)->nullable()->after('return_number');
                }
                if (! Schema::hasColumn('transfer_stock_returns', 'job_number_id')) {
                    $table->foreignId('job_number_id')->nullable()->constrained('job_number')->nullOnDelete();
                }
                if (! Schema::hasColumn('transfer_stock_returns', 'job_number')) {
                    $table->string('job_number', 100)->nullable();
                }
                if (! Schema::hasColumn('transfer_stock_returns', 'updated_by')) {
                    $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
                }
            });
        }

        if (Schema::hasTable('transfer_stock_return_items')) {
            Schema::table('transfer_stock_return_items', function (Blueprint $table) {
                if (! Schema::hasColumn('transfer_stock_return_items', 'unit')) {
                    $table->string('unit', 45)->nullable()->after('quantity');
                }
                if (! Schema::hasColumn('transfer_stock_return_items', 'source_location')) {
                    $table->string('source_location', 150)->nullable()->after('unit');
                }
                if (! Schema::hasColumn('transfer_stock_return_items', 'destination_location')) {
                    $table->string('destination_location', 150)->nullable()->after('source_location');
                }
            });
        }

        // 10. PR, PO, RN, BPB, RN Return full field persistence
        if (Schema::hasTable('purchase_requisitions_has_items')) {
            Schema::table('purchase_requisitions_has_items', function (Blueprint $table) {
                if (! Schema::hasColumn('purchase_requisitions_has_items', 'job_number_id')) {
                    $table->foreignId('job_number_id')->nullable()->constrained('job_number')->nullOnDelete();
                }
                if (! Schema::hasColumn('purchase_requisitions_has_items', 'job_number')) {
                    $table->string('job_number', 100)->nullable();
                }
            });
        }

        if (Schema::hasTable('purchase_order')) {
            Schema::table('purchase_order', function (Blueprint $table) {
                if (! Schema::hasColumn('purchase_order', 'ppn_rate')) {
                    $table->decimal('ppn_rate', 8, 2)->default(11)->after('rate');
                }
                if (! Schema::hasColumn('purchase_order', 'discount_overall_percent')) {
                    $table->decimal('discount_overall_percent', 8, 2)->default(0)->after('ppn_rate');
                }
            });
        }

        if (Schema::hasTable('purchase_order_has_purchase_requisitions') && ! Schema::hasColumn('purchase_order_has_purchase_requisitions', 'pph_rate')) {
            Schema::table('purchase_order_has_purchase_requisitions', function (Blueprint $table) {
                $table->decimal('pph_rate', 8, 2)->default(0)->after('pph_id');
            });
        }

        if (Schema::hasTable('receive_note')) {
            Schema::table('receive_note', function (Blueprint $table) {
                if (! Schema::hasColumn('receive_note', 'facility')) {
                    $table->string('facility', 60)->nullable()->after('arrival_date');
                }
                if (! Schema::hasColumn('receive_note', 'bc_code')) {
                    $table->string('bc_code', 45)->nullable()->after('facility');
                }
                if (! Schema::hasColumn('receive_note', 'biaya_lain')) {
                    $table->decimal('biaya_lain', 15, 2)->default(0)->after('rate');
                }
                if (! Schema::hasColumn('receive_note', 'discount_percent')) {
                    $table->decimal('discount_percent', 8, 2)->default(0)->after('biaya_lain');
                }
                if (! Schema::hasColumn('receive_note', 'creator_id')) {
                    $table->foreignId('creator_id')->nullable()->constrained('users')->nullOnDelete();
                }
            });
        }

        if (Schema::hasTable('receive_note_returns')) {
            Schema::table('receive_note_returns', function (Blueprint $table) {
                if (! Schema::hasColumn('receive_note_returns', 'currency')) {
                    $table->string('currency', 20)->default('IDR')->after('amount');
                }
                if (! Schema::hasColumn('receive_note_returns', 'exchange_rate')) {
                    $table->decimal('exchange_rate', 15, 4)->default(1)->after('currency');
                }
            });
        }

        if (Schema::hasTable('bpb_receive_material') && ! Schema::hasColumn('bpb_receive_material', 'bpb_type')) {
            Schema::table('bpb_receive_material', function (Blueprint $table) {
                $table->string('bpb_type', 45)->default('Gudang')->after('source_type');
            });
        }

        if (Schema::hasTable('po_rn_to_bpb') && ! Schema::hasColumn('po_rn_to_bpb', 'warehouse_coordinates_id')) {
            Schema::table('po_rn_to_bpb', function (Blueprint $table) {
                $table->foreignId('warehouse_coordinates_id')->nullable()->constrained('warehouse_coordinates')->nullOnDelete();
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasTable('po_rn_to_bpb') && Schema::hasColumn('po_rn_to_bpb', 'warehouse_coordinates_id')) {
            Schema::table('po_rn_to_bpb', function (Blueprint $table) {
                $table->dropConstrainedForeignId('warehouse_coordinates_id');
            });
        }

        if (Schema::hasTable('bpb_receive_material') && Schema::hasColumn('bpb_receive_material', 'bpb_type')) {
            Schema::table('bpb_receive_material', function (Blueprint $table) {
                $table->dropColumn('bpb_type');
            });
        }

        if (Schema::hasTable('receive_note_returns')) {
            Schema::table('receive_note_returns', function (Blueprint $table) {
                foreach (['currency', 'exchange_rate'] as $col) {
                    if (Schema::hasColumn('receive_note_returns', $col)) {
                        $table->dropColumn($col);
                    }
                }
            });
        }

        if (Schema::hasTable('receive_note')) {
            Schema::table('receive_note', function (Blueprint $table) {
                if (Schema::hasColumn('receive_note', 'creator_id')) {
                    $table->dropConstrainedForeignId('creator_id');
                }
                foreach (['facility', 'bc_code', 'biaya_lain', 'discount_percent'] as $col) {
                    if (Schema::hasColumn('receive_note', $col)) {
                        $table->dropColumn($col);
                    }
                }
            });
        }

        if (Schema::hasTable('purchase_order_has_purchase_requisitions') && Schema::hasColumn('purchase_order_has_purchase_requisitions', 'pph_rate')) {
            Schema::table('purchase_order_has_purchase_requisitions', function (Blueprint $table) {
                $table->dropColumn('pph_rate');
            });
        }

        if (Schema::hasTable('purchase_order')) {
            Schema::table('purchase_order', function (Blueprint $table) {
                foreach (['ppn_rate', 'discount_overall_percent'] as $col) {
                    if (Schema::hasColumn('purchase_order', $col)) {
                        $table->dropColumn($col);
                    }
                }
            });
        }

        if (Schema::hasTable('purchase_requisitions_has_items')) {
            Schema::table('purchase_requisitions_has_items', function (Blueprint $table) {
                if (Schema::hasColumn('purchase_requisitions_has_items', 'job_number_id')) {
                    $table->dropConstrainedForeignId('job_number_id');
                }
                if (Schema::hasColumn('purchase_requisitions_has_items', 'job_number')) {
                    $table->dropColumn('job_number');
                }
            });
        }

        if (Schema::hasTable('transfer_stock_return_items')) {
            Schema::table('transfer_stock_return_items', function (Blueprint $table) {
                foreach (['unit', 'source_location', 'destination_location'] as $col) {
                    if (Schema::hasColumn('transfer_stock_return_items', $col)) {
                        $table->dropColumn($col);
                    }
                }
            });
        }

        if (Schema::hasTable('transfer_stock_returns')) {
            Schema::table('transfer_stock_returns', function (Blueprint $table) {
                foreach (['job_number_id', 'updated_by'] as $fk) {
                    if (Schema::hasColumn('transfer_stock_returns', $fk)) {
                        $table->dropConstrainedForeignId($fk);
                    }
                }
                foreach (['production_code', 'job_number'] as $col) {
                    if (Schema::hasColumn('transfer_stock_returns', $col)) {
                        $table->dropColumn($col);
                    }
                }
            });
        }

        if (Schema::hasTable('request_material')) {
            Schema::table('request_material', function (Blueprint $table) {
                if (Schema::hasColumn('request_material', 'job_number_id')) {
                    $table->dropConstrainedForeignId('job_number_id');
                }
                foreach (['job_number', 'customer', 'project_type', 'is_internal_warehouse', 'is_specific_station'] as $col) {
                    if (Schema::hasColumn('request_material', $col)) {
                        $table->dropColumn($col);
                    }
                }
            });
        }

        if (Schema::hasTable('destination_location')) {
            Schema::table('destination_location', function (Blueprint $table) {
                foreach (['created_by', 'updated_by'] as $fk) {
                    if (Schema::hasColumn('destination_location', $fk)) {
                        $table->dropConstrainedForeignId($fk);
                    }
                }
                foreach (['code', 'location_type', 'pic', 'description'] as $col) {
                    if (Schema::hasColumn('destination_location', $col)) {
                        $table->dropColumn($col);
                    }
                }
            });
        }

        if (Schema::hasTable('type_of_request')) {
            Schema::table('type_of_request', function (Blueprint $table) {
                foreach (['created_by', 'updated_by'] as $fk) {
                    if (Schema::hasColumn('type_of_request', $fk)) {
                        $table->dropConstrainedForeignId($fk);
                    }
                }
                foreach (['code', 'department', 'description', 'requires_job_number', 'requires_approval_2'] as $col) {
                    if (Schema::hasColumn('type_of_request', $col)) {
                        $table->dropColumn($col);
                    }
                }
            });
        }

        if (Schema::hasTable('warehouse_coordinates') && Schema::hasColumn('warehouse_coordinates', 'code')) {
            Schema::table('warehouse_coordinates', function (Blueprint $table) {
                $table->dropColumn('code');
            });
        }

        if (Schema::hasTable('warehouses')) {
            Schema::table('warehouses', function (Blueprint $table) {
                foreach (['created_by', 'updated_by'] as $fk) {
                    if (Schema::hasColumn('warehouses', $fk)) {
                        $table->dropConstrainedForeignId($fk);
                    }
                }
                if (Schema::hasColumn('warehouses', 'code')) {
                    $table->dropColumn('code');
                }
            });
        }

        if (Schema::hasTable('colours') && Schema::hasColumn('colours', 'code')) {
            Schema::table('colours', function (Blueprint $table) {
                $table->dropColumn('code');
            });
        }

        if (Schema::hasTable('units_of_measurements')) {
            Schema::table('units_of_measurements', function (Blueprint $table) {
                if (Schema::hasColumn('units_of_measurements', 'created_by')) {
                    $table->dropConstrainedForeignId('created_by');
                }
                foreach (['code', 'description'] as $col) {
                    if (Schema::hasColumn('units_of_measurements', $col)) {
                        $table->dropColumn($col);
                    }
                }
            });
        }

        if (Schema::hasTable('rafaksi_types')) {
            Schema::table('rafaksi_types', function (Blueprint $table) {
                foreach (['created_by', 'updated_by'] as $fk) {
                    if (Schema::hasColumn('rafaksi_types', $fk)) {
                        $table->dropConstrainedForeignId($fk);
                    }
                }
                foreach (['code', 'description'] as $col) {
                    if (Schema::hasColumn('rafaksi_types', $col)) {
                        $table->dropColumn($col);
                    }
                }
            });
        }

        if (Schema::hasTable('job_number')) {
            Schema::table('job_number', function (Blueprint $table) {
                foreach (['created_by', 'updated_by'] as $fk) {
                    if (Schema::hasColumn('job_number', $fk)) {
                        $table->dropConstrainedForeignId($fk);
                    }
                }
                foreach (['code', 'department'] as $col) {
                    if (Schema::hasColumn('job_number', $col)) {
                        $table->dropColumn($col);
                    }
                }
            });
        }

        if (Schema::hasTable('valutas')) {
            Schema::table('valutas', function (Blueprint $table) {
                foreach (['created_by', 'updated_by'] as $fk) {
                    if (Schema::hasColumn('valutas', $fk)) {
                        $table->dropConstrainedForeignId($fk);
                    }
                }
                foreach (['symbol', 'sync_status', 'last_synced_at'] as $col) {
                    if (Schema::hasColumn('valutas', $col)) {
                        $table->dropColumn($col);
                    }
                }
            });
        }

        if (Schema::hasTable('countries')) {
            Schema::table('countries', function (Blueprint $table) {
                foreach (['created_by', 'updated_by'] as $fk) {
                    if (Schema::hasColumn('countries', $fk)) {
                        $table->dropConstrainedForeignId($fk);
                    }
                }
                if (Schema::hasColumn('countries', 'code')) {
                    $table->dropColumn('code');
                }
            });
        }

        if (Schema::hasTable('accounts')) {
            Schema::table('accounts', function (Blueprint $table) {
                foreach (['created_by', 'updated_by'] as $fk) {
                    if (Schema::hasColumn('accounts', $fk)) {
                        $table->dropConstrainedForeignId($fk);
                    }
                }
                if (Schema::hasColumn('accounts', 'category')) {
                    $table->dropColumn('category');
                }
            });
        }

        if (Schema::hasTable('supliers') && Schema::hasColumn('supliers', 'status')) {
            Schema::table('supliers', function (Blueprint $table) {
                $table->dropColumn('status');
            });
        }

        if (Schema::hasTable('users')) {
            Schema::table('users', function (Blueprint $table) {
                foreach (['job_title', 'employee_id', 'preferred_language'] as $col) {
                    if (Schema::hasColumn('users', $col)) {
                        $table->dropColumn($col);
                    }
                }
            });
        }

        Schema::dropIfExists('reference_options');
        Schema::dropIfExists('system_settings');
        Schema::dropIfExists('stock_notifications');
        Schema::dropIfExists('exchange_rates');
    }
};

