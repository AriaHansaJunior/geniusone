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
        // =========================================================================
        // 1. WAREHOUSE COORDINATES (Master Koordinat Rak/Lokasi Gudang)
        // =========================================================================
        if (! Schema::hasTable('warehouse_coordinates')) {
            Schema::create('warehouse_coordinates', function (Blueprint $table) {
                $table->id();
                $table->foreignId('warehouses_id')->constrained('warehouses')->cascadeOnDelete();
                $table->string('name', 100);
                $table->string('description', 255)->nullable();
                $table->tinyInteger('status')->default(1);
                $table->timestamps();
                $table->softDeletes();
            });
        }

        // =========================================================================
        // 2. RECEIVE NOTE RETURNS (Retur Penerimaan Barang Exim)
        // =========================================================================
        if (! Schema::hasTable('receive_note_returns')) {
            Schema::create('receive_note_returns', function (Blueprint $table) {
                $table->id();
                $table->string('rn_number', 100)->nullable();
                $table->dateTime('rn_date')->nullable();
                $table->string('delivery_order', 100)->nullable();
                $table->dateTime('do_date')->nullable();
                $table->string('customer', 255)->nullable();
                $table->string('facility', 100)->nullable();
                $table->string('bc_code', 45)->nullable();
                $table->string('aju_number', 100)->nullable();
                $table->string('no_daftar', 100)->nullable();
                $table->float('amount')->default(0);
                $table->string('type_of_return', 100)->nullable();
                $table->string('sales_delivery_number', 100)->nullable();
                $table->string('vehicle_type', 100)->nullable();
                $table->string('license_plate', 45)->nullable();
                $table->text('notes')->nullable();
                $table->string('approval_status', 45)->default('Draft');
                $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
                $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
                $table->timestamps();
                $table->softDeletes();
            });
        }

        if (! Schema::hasTable('receive_note_return_items')) {
            Schema::create('receive_note_return_items', function (Blueprint $table) {
                $table->id();
                $table->foreignId('receive_note_return_id')->constrained('receive_note_returns')->cascadeOnDelete();
                $table->foreignId('items_id')->nullable()->constrained('items')->nullOnDelete();
                $table->string('item_code', 100)->nullable();
                $table->string('item_name', 255);
                $table->string('do_number', 100)->nullable();
                $table->dateTime('do_date')->nullable();
                $table->string('sj_number', 100)->nullable();
                $table->float('quantity')->default(0);
                $table->string('unit', 45)->nullable();
                $table->float('qty_package')->default(0);
                $table->string('package_type', 45)->nullable();
                $table->float('price')->default(0);
                $table->float('subtotal')->default(0);
                $table->float('subtotal_idr')->default(0);
                $table->float('delivery_qty')->default(0);
                $table->float('retur_qty')->default(0);
                $table->timestamps();
                $table->softDeletes();
            });
        }

        // =========================================================================
        // 3. EXIM DOCUMENT HISTORIES (Pelacakan Riwayat Dokumen BC & Invoice)
        // =========================================================================
        if (! Schema::hasTable('document_histories')) {
            Schema::create('document_histories', function (Blueprint $table) {
                $table->id();
                $table->string('invoice_number', 100)->nullable();
                $table->string('invoice_alias', 100)->nullable();
                $table->dateTime('invoice_date')->nullable();
                $table->string('transaction_number', 100)->nullable();
                $table->string('mutation_type', 100)->nullable();
                $table->string('customer_supplier', 255)->nullable();
                $table->string('customer', 255)->nullable();
                $table->string('destination', 255)->nullable();
                $table->string('bl_number', 100)->nullable();
                $table->string('currency', 45)->nullable();
                $table->string('customs_document', 100)->nullable();
                $table->float('amount')->default(0);
                $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
                $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
                $table->timestamps();
                $table->softDeletes();
            });
        }

        if (! Schema::hasTable('document_history_items')) {
            Schema::create('document_history_items', function (Blueprint $table) {
                $table->id();
                $table->foreignId('document_history_id')->constrained('document_histories')->cascadeOnDelete();
                $table->foreignId('items_id')->nullable()->constrained('items')->nullOnDelete();
                $table->string('so_number', 100)->nullable();
                $table->dateTime('so_date')->nullable();
                $table->string('pl_number', 100)->nullable();
                $table->dateTime('pl_date')->nullable();
                $table->string('item_code', 100)->nullable();
                $table->string('item_name', 255)->nullable();
                $table->float('nett_weight')->default(0);
                $table->float('gross_weight')->default(0);
                $table->float('pack')->default(0);
                $table->string('pack_unit', 45)->nullable();
                $table->float('quantity')->default(0);
                $table->string('unit', 45)->nullable();
                $table->float('unit_price')->default(0);
                $table->float('subtotal')->default(0);
                $table->string('nomor_aju', 100)->nullable();
                $table->dateTime('nomor_aju_date')->nullable();
                $table->string('nomor_daftar', 100)->nullable();
                $table->dateTime('nomor_daftar_date')->nullable();
                $table->string('jenis_dokumen', 100)->nullable();
                $table->string('seri_barang', 100)->nullable();
                $table->timestamps();
                $table->softDeletes();
            });
        }

        // =========================================================================
        // 4. COLUMN ALIGNMENTS PADA TABEL YANG SUDAH ADA
        // =========================================================================

        // A. Pelengkapan Kolom Items (Satuan Terkecil/Terbesar & Created By)
        Schema::table('items', function (Blueprint $table) {
            if (! Schema::hasColumn('items', 'smallest_unit_id')) {
                $table->foreignId('smallest_unit_id')->nullable()->constrained('units_of_measurements')->nullOnDelete();
            }
            if (! Schema::hasColumn('items', 'greatest_unit_id')) {
                $table->foreignId('greatest_unit_id')->nullable()->constrained('units_of_measurements')->nullOnDelete();
            }
            if (! Schema::hasColumn('items', 'created_by')) {
                $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            }
        });

        // B. Pelengkapan Kolom Supliers (Created By)
        Schema::table('supliers', function (Blueprint $table) {
            if (! Schema::hasColumn('supliers', 'created_by')) {
                $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            }
        });

        // C. Pelengkapan Catatan Persetujuan (Note / Reject Reason)
        if (Schema::hasTable('approval_pr')) {
            Schema::table('approval_pr', function (Blueprint $table) {
                if (! Schema::hasColumn('approval_pr', 'note')) {
                    $table->text('note')->nullable();
                }
            });
        }

        if (Schema::hasTable('approval_po')) {
            Schema::table('approval_po', function (Blueprint $table) {
                if (! Schema::hasColumn('approval_po', 'note')) {
                    $table->text('note')->nullable();
                }
            });
        }

        if (Schema::hasTable('approval_rn')) {
            Schema::table('approval_rn', function (Blueprint $table) {
                if (! Schema::hasColumn('approval_rn', 'note')) {
                    $table->text('note')->nullable();
                }
            });
        }

        if (Schema::hasTable('approval_bpb')) {
            Schema::table('approval_bpb', function (Blueprint $table) {
                if (! Schema::hasColumn('approval_bpb', 'note')) {
                    $table->text('note')->nullable();
                }
            });
        }

        if (Schema::hasTable('purchase_requisitions')) {
            Schema::table('purchase_requisitions', function (Blueprint $table) {
                if (! Schema::hasColumn('purchase_requisitions', 'rejection_note')) {
                    $table->text('rejection_note')->nullable();
                }
            });
        }

        if (Schema::hasTable('purchase_order')) {
            Schema::table('purchase_order', function (Blueprint $table) {
                if (! Schema::hasColumn('purchase_order', 'rejection_note')) {
                    $table->text('rejection_note')->nullable();
                }
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('purchase_order', function (Blueprint $table) {
            if (Schema::hasColumn('purchase_order', 'rejection_note')) {
                $table->dropColumn('rejection_note');
            }
        });

        Schema::table('purchase_requisitions', function (Blueprint $table) {
            if (Schema::hasColumn('purchase_requisitions', 'rejection_note')) {
                $table->dropColumn('rejection_note');
            }
        });

        if (Schema::hasTable('approval_bpb') && Schema::hasColumn('approval_bpb', 'note')) {
            Schema::table('approval_bpb', fn (Blueprint $table) => $table->dropColumn('note'));
        }
        if (Schema::hasTable('approval_rn') && Schema::hasColumn('approval_rn', 'note')) {
            Schema::table('approval_rn', fn (Blueprint $table) => $table->dropColumn('note'));
        }
        if (Schema::hasTable('approval_po') && Schema::hasColumn('approval_po', 'note')) {
            Schema::table('approval_po', fn (Blueprint $table) => $table->dropColumn('note'));
        }
        if (Schema::hasTable('approval_pr') && Schema::hasColumn('approval_pr', 'note')) {
            Schema::table('approval_pr', fn (Blueprint $table) => $table->dropColumn('note'));
        }

        Schema::table('supliers', function (Blueprint $table) {
            if (Schema::hasColumn('supliers', 'created_by')) {
                $table->dropForeign(['created_by']);
                $table->dropColumn('created_by');
            }
        });

        Schema::table('items', function (Blueprint $table) {
            if (Schema::hasColumn('items', 'created_by')) {
                $table->dropForeign(['created_by']);
                $table->dropColumn('created_by');
            }
            if (Schema::hasColumn('items', 'greatest_unit_id')) {
                $table->dropForeign(['greatest_unit_id']);
                $table->dropColumn('greatest_unit_id');
            }
            if (Schema::hasColumn('items', 'smallest_unit_id')) {
                $table->dropForeign(['smallest_unit_id']);
                $table->dropColumn('smallest_unit_id');
            }
        });

        Schema::dropIfExists('document_history_items');
        Schema::dropIfExists('document_histories');
        Schema::dropIfExists('receive_note_return_items');
        Schema::dropIfExists('receive_note_returns');
        Schema::dropIfExists('warehouse_coordinates');
    }
};
