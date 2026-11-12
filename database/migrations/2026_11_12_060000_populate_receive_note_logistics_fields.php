<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Populate vehicle_type where null, empty, or '-'
        DB::table('receive_note')
            ->whereNull('vehicle_type')
            ->orWhere('vehicle_type', '')
            ->orWhere('vehicle_type', '-')
            ->update([
                'vehicle_type' => 'MOBIL BARANG',
            ]);

        // Populate license_plate where null, empty, or '-'
        DB::table('receive_note')
            ->whereNull('license_plate')
            ->orWhere('license_plate', '')
            ->orWhere('license_plate', '-')
            ->update([
                'license_plate' => 'B 9182 UXZ',
            ]);

        // Populate aju_number where null, empty, or '-'
        DB::table('receive_note')
            ->whereNull('aju_number')
            ->orWhere('aju_number', '')
            ->orWhere('aju_number', '-')
            ->update([
                'aju_number' => '00004001456220261014004999',
            ]);

        // Populate no_daftar where null, empty, or '-'
        DB::table('receive_note')
            ->whereNull('no_daftar')
            ->orWhere('no_daftar', '')
            ->orWhere('no_daftar', '-')
            ->update([
                'no_daftar' => '090400',
            ]);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // No reverse needed
    }
};

