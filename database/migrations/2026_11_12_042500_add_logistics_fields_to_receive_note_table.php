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
        if (Schema::hasTable('receive_note')) {
            Schema::table('receive_note', function (Blueprint $table) {
                if (! Schema::hasColumn('receive_note', 'vehicle_type')) {
                    $table->string('vehicle_type', 100)->nullable()->after('license_plate');
                }
                if (! Schema::hasColumn('receive_note', 'aju_number')) {
                    $table->string('aju_number', 100)->nullable()->after('vehicle_type');
                }
                if (! Schema::hasColumn('receive_note', 'no_daftar')) {
                    $table->string('no_daftar', 100)->nullable()->after('aju_number');
                }
                if (! Schema::hasColumn('receive_note', 'tanggal_daftar')) {
                    $table->date('tanggal_daftar')->nullable()->after('no_daftar');
                }
                if (! Schema::hasColumn('receive_note', 'remark')) {
                    $table->text('remark')->nullable()->after('note');
                }
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasTable('receive_note')) {
            Schema::table('receive_note', function (Blueprint $table) {
                $columns = ['vehicle_type', 'aju_number', 'no_daftar', 'tanggal_daftar', 'remark'];
                foreach ($columns as $col) {
                    if (Schema::hasColumn('receive_note', $col)) {
                        $table->dropColumn($col);
                    }
                }
            });
        }
    }
};

