<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations for Material Request Domain.
     */
    public function up(): void
    {
        // =========================================================================
        // 1. TYPE OF REQUEST (Master Tipe Permintaan Bahan Baku)
        // =========================================================================
        if (!Schema::hasTable('type_of_request')) {
            Schema::create('type_of_request', function (Blueprint $table) {
                $table->id();
                $table->string('name', 45);
                $table->tinyInteger('status')->default(1);
                $table->timestamps();
                $table->softDeletes();
            });
        }

        // =========================================================================
        // 2. DESTINATION LOCATION (Master Lokasi Tujuan Penyaluran Material)
        // =========================================================================
        if (!Schema::hasTable('destination_location')) {
            Schema::create('destination_location', function (Blueprint $table) {
                $table->id();
                $table->string('name', 45);
                $table->tinyInteger('status')->default(1);
                $table->timestamps();
                $table->softDeletes();
            });
        }

        // =========================================================================
        // 3. REQUEST MATERIAL (Header Transaksi Permintaan Material)
        // =========================================================================
        if (!Schema::hasTable('request_material')) {
            Schema::create('request_material', function (Blueprint $table) {
                $table->id();
                $table->string('request_number', 100)->nullable()->index();
                $table->foreignId('departments_id')->constrained('departments');
                $table->foreignId('warehouses_id')->nullable()->constrained('warehouses')->nullOnDelete();
                $table->foreignId('type_of_request_id')->constrained('type_of_request');
                $table->foreignId('destination_location_id')->nullable()->constrained('destination_location')->nullOnDelete();
                $table->foreignId('creator')->constrained('users');
                $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
                $table->dateTime('request_date');
                $table->string('note', 255)->nullable();
                $table->integer('revision')->nullable()->default(0);
                $table->string('status', 45)->default('Draft');
                $table->timestamps();
                $table->softDeletes();
            });
        }

        // =========================================================================
        // 4. REQUEST MATERIAL ITEM (Detail Item Bahan yang Diminta)
        // =========================================================================
        if (!Schema::hasTable('request_material_item')) {
            Schema::create('request_material_item', function (Blueprint $table) {
                $table->foreignId('items_id')->constrained('items');
                $table->foreignId('request_material_id')->constrained('request_material')->cascadeOnDelete();
                $table->float('request')->default(0);
                $table->string('remark', 255)->nullable();
                $table->timestamps();
                $table->softDeletes();

                $table->primary(['items_id', 'request_material_id']);
            });
        }

        // =========================================================================
        // 5. APPROVAL RM (Persetujuan Berjenjang Request Material Ke-1 dan Ke-2)
        // =========================================================================
        if (!Schema::hasTable('approval_rm')) {
            Schema::create('approval_rm', function (Blueprint $table) {
                $table->foreignId('request_material_id')->constrained('request_material')->cascadeOnDelete();
                $table->foreignId('users_id')->constrained('users');
                $table->enum('approval_ke', ['1', '2']);
                $table->tinyInteger('status')->default(0);
                $table->string('note', 255)->nullable();
                $table->timestamps();
                $table->softDeletes();

                $table->primary(['request_material_id', 'users_id']);
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('approval_rm');
        Schema::dropIfExists('request_material_item');
        Schema::dropIfExists('request_material');
        Schema::dropIfExists('destination_location');
        Schema::dropIfExists('type_of_request');
    }
};
