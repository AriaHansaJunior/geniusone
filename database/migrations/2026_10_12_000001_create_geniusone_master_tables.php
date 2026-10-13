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
        // 1. Units
        Schema::create('units', function (Blueprint $table) {
            $table->id();
            $table->string('nama', 45);
            $table->tinyInteger('status')->default(1);
            $table->timestamps();
            $table->softDeletes();
        });

        // 2. Departments
        Schema::create('departments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('units_id')->nullable()->constrained('units')->nullOnDelete();
            $table->string('name', 45);
            $table->tinyInteger('status')->default(1);
            $table->timestamps();
            $table->softDeletes();
        });

        // 3. Sections
        Schema::create('sections', function (Blueprint $table) {
            $table->id();
            $table->string('name', 45);
            $table->tinyInteger('status')->default(1);
            $table->timestamps();
            $table->softDeletes();
        });

        // 4. Reporting Types
        Schema::create('reporting_types', function (Blueprint $table) {
            $table->id();
            $table->string('name', 45);
            $table->tinyInteger('status')->default(1);
            $table->timestamps();
            $table->softDeletes();
        });

        // 5. Accounts
        Schema::create('accounts', function (Blueprint $table) {
            $table->id();
            $table->string('code', 45);
            $table->string('name', 45);
            $table->string('status', 45)->default('active');
            $table->timestamps();
            $table->softDeletes();
        });

        // 6. Classifications
        Schema::create('classifications', function (Blueprint $table) {
            $table->id();
            $table->foreignId('reporting_types_id')->constrained('reporting_types')->cascadeOnDelete();
            $table->foreignId('accounts_id')->constrained('accounts')->cascadeOnDelete();
            $table->string('code', 45);
            $table->string('name', 45);
            $table->string('description', 255)->nullable();
            $table->tinyInteger('status')->default(1);
        });

        // 7. Categories
        Schema::create('categories', function (Blueprint $table) {
            $table->id();
            $table->string('code', 45)->unique();
            $table->string('name', 45);
            $table->string('description', 255)->nullable();
            $table->tinyInteger('status')->default(1);
            $table->timestamps();
            $table->softDeletes();
        });

        // 8. Facilities
        Schema::create('facilities', function (Blueprint $table) {
            $table->id();
            $table->string('name', 45);
            $table->string('description', 255)->nullable();
            $table->tinyInteger('status')->default(1);
            $table->timestamps();
            $table->softDeletes();
        });

        // 9. Origins
        Schema::create('origins', function (Blueprint $table) {
            $table->id();
            $table->string('name', 45);
            $table->tinyInteger('status')->default(1);
            $table->timestamps();
            $table->softDeletes();
        });

        // 10. Item Types
        Schema::create('item_types', function (Blueprint $table) {
            $table->id();
            $table->string('name', 45);
            $table->string('status', 45)->default('active');
            $table->timestamps();
            $table->softDeletes();
        });

        // 11. Units of Measurements
        Schema::create('units_of_measurements', function (Blueprint $table) {
            $table->id();
            $table->string('name', 45);
            $table->tinyInteger('status')->default(1);
            $table->timestamps();
            $table->softDeletes();
        });

        // 12. Colours
        Schema::create('colours', function (Blueprint $table) {
            $table->id();
            $table->string('grade', 45);
            $table->string('name', 45);
            $table->tinyInteger('status')->default(1);
            $table->timestamps();
            $table->softDeletes();
        });

        // 13. Brands
        Schema::create('brands', function (Blueprint $table) {
            $table->id();
            $table->string('name', 45);
            $table->string('code', 45);
            $table->string('description', 255)->nullable();
            $table->tinyInteger('status')->default(1);
            $table->timestamps();
            $table->softDeletes();
        });

        // 14. Styles
        Schema::create('styles', function (Blueprint $table) {
            $table->id();
            $table->string('code', 45);
            $table->string('name', 45);
            $table->string('description', 255)->nullable();
            $table->string('status', 45)->default('active');
            $table->timestamps();
            $table->softDeletes();
        });

        // 15. Customs Reports
        Schema::create('customs_reports', function (Blueprint $table) {
            $table->id();
            $table->string('name', 45);
            $table->tinyInteger('status')->default(1);
            $table->timestamps();
            $table->softDeletes();
        });

        // 16. Group Scrap Items
        Schema::create('group_scrap_items', function (Blueprint $table) {
            $table->id();
            $table->string('code', 45);
            $table->string('name', 45);
            $table->tinyInteger('status')->default(1);
            $table->timestamps();
            $table->softDeletes();
        });

        // 17. Specifications
        Schema::create('specifications', function (Blueprint $table) {
            $table->id();
            $table->string('name', 45);
            $table->tinyInteger('status')->default(1);
            $table->timestamps();
            $table->softDeletes();
        });

        // 18. Types Rates BM
        Schema::create('types_rates_bm', function (Blueprint $table) {
            $table->id();
            $table->string('name', 45);
            $table->tinyInteger('status')->default(1);
            $table->timestamps();
            $table->softDeletes();
        });

        // 19. Types Rates Cukai
        Schema::create('types_rates_cukai', function (Blueprint $table) {
            $table->id();
            $table->string('name', 45);
            $table->tinyInteger('status')->default(1);
            $table->timestamps();
            $table->softDeletes();
        });

        // 20. HS Code
        Schema::create('hs_code', function (Blueprint $table) {
            $table->id();
            $table->string('name', 45);
            $table->string('description', 255)->nullable();
            $table->float('rates_bm')->default(0);
            $table->float('rates_cukai')->default(0);
            $table->float('rates_ppn')->default(0);
            $table->float('rates_pph')->default(0);
            $table->float('rates_ppnbm')->default(0);
            $table->string('hs_codecol', 45)->nullable();
            $table->foreignId('types_rates_bm_id')->nullable()->constrained('types_rates_bm')->nullOnDelete();
            $table->foreignId('types_rates_cukai_id')->nullable()->constrained('types_rates_cukai')->nullOnDelete();
        });

        // 21. Job Number
        Schema::create('job_number', function (Blueprint $table) {
            $table->id();
            $table->string('name', 45);
            $table->tinyInteger('status')->default(1);
            $table->timestamps();
            $table->softDeletes();
        });

        // 22. Items (Master Material / Barang)
        Schema::create('items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('categories_id')->nullable()->constrained('categories')->nullOnDelete();
            $table->foreignId('classifications_id')->constrained('classifications');
            $table->tinyInteger('status')->default(1);
            $table->string('code', 45);
            $table->string('external_code', 45)->nullable();
            $table->string('name', 255);
            $table->tinyInteger('trace_by_lot')->default(0);
            $table->foreignId('facilities_id')->constrained('facilities');
            $table->foreignId('origins_id')->nullable()->constrained('origins')->nullOnDelete();
            $table->foreignId('item_types_id')->constrained('item_types');
            $table->foreignId('units_of_measurements_id')->constrained('units_of_measurements');
            $table->float('unit_conversion')->default(1);
            $table->float('netto')->default(0);
            $table->foreignId('colours_id')->nullable()->constrained('colours')->nullOnDelete();
            $table->foreignId('brands_id')->nullable()->constrained('brands')->nullOnDelete();
            $table->string('size', 45)->default('');
            $table->float('dimension_p')->default(0);
            $table->float('dimension_l')->default(0);
            $table->float('dimension_t')->default(0);
            $table->foreignId('styles_id')->nullable()->constrained('styles')->nullOnDelete();
            $table->foreignId('customs_reports_id')->nullable()->constrained('customs_reports')->nullOnDelete();
            $table->foreignId('group_scrap_items_id')->nullable()->constrained('group_scrap_items')->nullOnDelete();
            $table->foreignId('specifications_id')->nullable()->constrained('specifications')->nullOnDelete();
            $table->foreignId('hs_code_id')->nullable()->constrained('hs_code')->nullOnDelete();
            $table->float('stock')->default(0);
            $table->timestamps();
            $table->softDeletes();
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('job_number_id')->nullable()->constrained('job_number')->nullOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('items');
        Schema::dropIfExists('job_number');
        Schema::dropIfExists('hs_code');
        Schema::dropIfExists('types_rates_cukai');
        Schema::dropIfExists('types_rates_bm');
        Schema::dropIfExists('specifications');
        Schema::dropIfExists('group_scrap_items');
        Schema::dropIfExists('customs_reports');
        Schema::dropIfExists('styles');
        Schema::dropIfExists('brands');
        Schema::dropIfExists('colours');
        Schema::dropIfExists('units_of_measurements');
        Schema::dropIfExists('item_types');
        Schema::dropIfExists('origins');
        Schema::dropIfExists('facilities');
        Schema::dropIfExists('categories');
        Schema::dropIfExists('classifications');
        Schema::dropIfExists('accounts');
        Schema::dropIfExists('reporting_types');
        Schema::dropIfExists('sections');
        Schema::dropIfExists('departments');
        Schema::dropIfExists('units');
    }
};
