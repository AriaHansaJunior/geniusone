<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('hs_code') && ! Schema::hasColumn('hs_code', 'status')) {
            Schema::table('hs_code', function (Blueprint $table) {
                $table->tinyInteger('status')->default(1)->after('types_rates_cukai_id');
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('hs_code') && Schema::hasColumn('hs_code', 'status')) {
            Schema::table('hs_code', function (Blueprint $table) {
                $table->dropColumn('status');
            });
        }
    }
};
