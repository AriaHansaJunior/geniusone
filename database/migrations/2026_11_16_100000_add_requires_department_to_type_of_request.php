<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('type_of_request') && ! Schema::hasColumn('type_of_request', 'requires_department')) {
            Schema::table('type_of_request', function (Blueprint $table) {
                $table->boolean('requires_department')->default(true)->after('department');
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('type_of_request') && Schema::hasColumn('type_of_request', 'requires_department')) {
            Schema::table('type_of_request', function (Blueprint $table) {
                $table->dropColumn('requires_department');
            });
        }
    }
};
