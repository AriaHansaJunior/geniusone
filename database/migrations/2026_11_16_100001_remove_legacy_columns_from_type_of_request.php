<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('type_of_request')) {
            return;
        }

        $columns = array_values(array_filter(
            ['code', 'requires_approval_2'],
            fn (string $column): bool => Schema::hasColumn('type_of_request', $column),
        ));

        if ($columns !== []) {
            Schema::table('type_of_request', function (Blueprint $table) use ($columns) {
                $table->dropColumn($columns);
            });
        }
    }

    public function down(): void
    {
        if (! Schema::hasTable('type_of_request')) {
            return;
        }

        Schema::table('type_of_request', function (Blueprint $table) {
            if (! Schema::hasColumn('type_of_request', 'code')) {
                $table->string('code', 45)->nullable()->after('id');
            }
            if (! Schema::hasColumn('type_of_request', 'department')) {
                $table->string('department', 100)->nullable()->after('name');
            }
            if (! Schema::hasColumn('type_of_request', 'requires_approval_2')) {
                $table->boolean('requires_approval_2')->default(false)->after('requires_job_number');
            }
        });
    }
};
