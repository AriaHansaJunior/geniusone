<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('job_number')) {
            return;
        }

        if (! Schema::hasColumn('job_number', 'departments_id')) {
            Schema::table('job_number', function (Blueprint $table) {
                $table->foreignId('departments_id')->nullable()->constrained('departments')->nullOnDelete();
            });
        }

        if (Schema::hasTable('departments') && Schema::hasColumn('job_number', 'department')) {
            DB::table('job_number')
                ->whereNotNull('department')
                ->orderBy('id')
                ->get(['id', 'department', 'departments_id'])
                ->each(function (object $jobNumber): void {
                    if ($jobNumber->departments_id !== null || trim((string) $jobNumber->department) === '') {
                        return;
                    }

                    $departmentId = DB::table('departments')
                        ->whereRaw('LOWER(name) = ?', [mb_strtolower(trim((string) $jobNumber->department))])
                        ->value('id');

                    if ($departmentId !== null) {
                        DB::table('job_number')->where('id', $jobNumber->id)->update([
                            'departments_id' => $departmentId,
                        ]);
                    }
                });
        }

        if (Schema::hasColumn('job_number', 'department')) {
            Schema::table('job_number', function (Blueprint $table) {
                $table->dropColumn('department');
            });
        }
    }

    public function down(): void
    {
        if (! Schema::hasTable('job_number')) {
            return;
        }

        $departments = [];
        if (Schema::hasColumn('job_number', 'departments_id') && Schema::hasTable('departments')) {
            $departments = DB::table('job_number')
                ->leftJoin('departments', 'job_number.departments_id', '=', 'departments.id')
                ->pluck('departments.name', 'job_number.id')
                ->all();
        }

        if (Schema::hasColumn('job_number', 'departments_id')) {
            Schema::table('job_number', function (Blueprint $table) {
                $table->dropConstrainedForeignId('departments_id');
            });
        }

        if (! Schema::hasColumn('job_number', 'department')) {
            Schema::table('job_number', function (Blueprint $table) {
                $table->string('department', 100)->nullable()->after('name');
            });
        }

        foreach ($departments as $jobNumberId => $departmentName) {
            if ($departmentName !== null) {
                DB::table('job_number')->where('id', $jobNumberId)->update([
                    'department' => $departmentName,
                ]);
            }
        }
    }
};
