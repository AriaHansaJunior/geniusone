<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('type_of_request')) {
            return;
        }

        if (! Schema::hasColumn('type_of_request', 'departments_id')) {
            Schema::table('type_of_request', function (Blueprint $table) {
                $table->foreignId('departments_id')->nullable()->constrained('departments')->nullOnDelete();
            });
        }

        if (Schema::hasTable('departments') && Schema::hasColumn('type_of_request', 'department')) {
            DB::table('type_of_request')
                ->whereNotNull('department')
                ->orderBy('id')
                ->get(['id', 'department', 'departments_id'])
                ->each(function (object $requestType): void {
                    if ($requestType->departments_id !== null || trim((string) $requestType->department) === '') {
                        return;
                    }

                    $departmentId = DB::table('departments')
                        ->whereRaw('LOWER(name) = ?', [mb_strtolower(trim((string) $requestType->department))])
                        ->value('id');

                    if ($departmentId !== null) {
                        DB::table('type_of_request')->where('id', $requestType->id)->update([
                            'departments_id' => $departmentId,
                        ]);
                    }
                });
        }

        $columns = array_values(array_filter(
            ['department', 'requires_department'],
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

        if (Schema::hasColumn('type_of_request', 'departments_id')) {
            Schema::table('type_of_request', function (Blueprint $table) {
                $table->dropConstrainedForeignId('departments_id');
            });
        }

        if (! Schema::hasColumn('type_of_request', 'department')) {
            Schema::table('type_of_request', function (Blueprint $table) {
                $table->string('department', 100)->nullable()->after('name');
            });
        }

        if (! Schema::hasColumn('type_of_request', 'requires_department')) {
            Schema::table('type_of_request', function (Blueprint $table) {
                $table->boolean('requires_department')->default(true)->after('department');
            });
        }
    }
};
