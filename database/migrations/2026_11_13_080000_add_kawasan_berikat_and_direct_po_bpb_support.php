<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasColumn('purchase_order', 'is_kawasan_berikat')) {
            Schema::table('purchase_order', function (Blueprint $table) {
                $table->boolean('is_kawasan_berikat')->default(true)->after('facility_status');
            });
        }

        DB::table('purchase_order')->orderBy('id')->chunkById(100, function ($orders) {
            foreach ($orders as $order) {
                $facility = strtoupper((string) ($order->facility_status ?? 'FASILITAS'));
                if ($facility === 'FASILITAS') {
                    $isKawasanBerikat = true;
                } else {
                    $isKawasanBerikat = DB::table('purchase_order_has_purchase_requisitions')
                        ->where('purchase_order_id', $order->id)
                        ->whereNull('deleted_at')
                        ->where('ditangguhkan_kawasan_berikat', 1)
                        ->exists();
                }

                DB::table('purchase_order')
                    ->where('id', $order->id)
                    ->update(['is_kawasan_berikat' => $isKawasanBerikat ? 1 : 0]);
            }
        });

        if (! Schema::hasColumn('bpb_receive_material', 'source_type')) {
            Schema::table('bpb_receive_material', function (Blueprint $table) {
                $table->string('source_type', 20)->default('RN');
            });
        }

        if (DB::getDriverName() === 'sqlite') {
            Schema::table('purchase_order_has_receive_note', function (Blueprint $table) {
                $table->unsignedBigInteger('receive_note_id')->nullable()->change();
            });
        } else {
            Schema::table('purchase_order_has_receive_note', function (Blueprint $table) {
                $table->dropForeign('fk_po_rn_rn');
            });

            Schema::table('purchase_order_has_receive_note', function (Blueprint $table) {
                $table->unsignedBigInteger('receive_note_id')->nullable()->change();
                $table->foreign('receive_note_id', 'fk_po_rn_rn')
                    ->references('id')
                    ->on('receive_note')
                    ->nullOnDelete();
            });
        }
    }

    public function down(): void
    {
        if (DB::getDriverName() === 'sqlite') {
            Schema::table('purchase_order_has_receive_note', function (Blueprint $table) {
                $table->unsignedBigInteger('receive_note_id')->nullable(false)->change();
            });
        } else {
            Schema::table('purchase_order_has_receive_note', function (Blueprint $table) {
                $table->dropForeign('fk_po_rn_rn');
            });

            Schema::table('purchase_order_has_receive_note', function (Blueprint $table) {
                $table->unsignedBigInteger('receive_note_id')->nullable(false)->change();
                $table->foreign('receive_note_id', 'fk_po_rn_rn')
                    ->references('id')
                    ->on('receive_note');
            });
        }

        if (Schema::hasColumn('bpb_receive_material', 'source_type')) {
            Schema::table('bpb_receive_material', function (Blueprint $table) {
                $table->dropColumn('source_type');
            });
        }

        if (Schema::hasColumn('purchase_order', 'is_kawasan_berikat')) {
            Schema::table('purchase_order', function (Blueprint $table) {
                $table->dropColumn('is_kawasan_berikat');
            });
        }
    }
};
