<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations for BE-01 through BE-06:
     * - RBAC: Roles, Permissions, RoleHasPermissions, UserHasPermissions
     * - Approval History & Tracking: approval_histories, approval_rn_returns
     * - Status & Gating Columns on Transaction Tables (PR, PO, RN, BPB, RM, Return)
     * - Department link on users table
     */
    public function up(): void
    {
        // =========================================================================
        // 1. RBAC TABLES (BE-01 & BE-02: SuperAdmin & Granular Permissions)
        // =========================================================================
        if (!Schema::hasTable('roles')) {
            Schema::create('roles', function (Blueprint $table) {
                $table->id();
                $table->string('name', 50)->unique();
                $table->string('label', 100);
                $table->string('description', 255)->nullable();
                $table->boolean('is_system')->default(false);
                $table->timestamps();
            });
        }

        if (!Schema::hasTable('permissions')) {
            Schema::create('permissions', function (Blueprint $table) {
                $table->id();
                $table->string('name', 100)->unique(); // e.g. pr.approve_1
                $table->string('module', 50)->index();  // e.g. pr, po, rn, bpb, rm, return
                $table->string('action', 50)->index();  // create, view, update, delete, approve_1, unapprove_1, approve_2, unapprove_2
                $table->string('label', 150);
                $table->timestamps();
            });
        }

        if (!Schema::hasTable('role_has_permissions')) {
            Schema::create('role_has_permissions', function (Blueprint $table) {
                $table->foreignId('role_id')->constrained('roles')->cascadeOnDelete();
                $table->foreignId('permission_id')->constrained('permissions')->cascadeOnDelete();
                $table->primary(['role_id', 'permission_id']);
            });
        }

        if (!Schema::hasTable('user_has_permissions')) {
            Schema::create('user_has_permissions', function (Blueprint $table) {
                $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
                $table->foreignId('permission_id')->constrained('permissions')->cascadeOnDelete();
                $table->boolean('is_granted')->default(true);
                $table->primary(['user_id', 'permission_id']);
            });
        }

        // =========================================================================
        // 2. APPROVAL RN RETURNS (Retur Material 2-Tier Approval)
        // =========================================================================
        if (!Schema::hasTable('approval_rn_returns')) {
            Schema::create('approval_rn_returns', function (Blueprint $table) {
                $table->id();
                $table->foreignId('receive_note_return_id')->constrained('receive_note_returns')->cascadeOnDelete();
                $table->foreignId('users_id')->constrained('users');
                $table->enum('approval_ke', ['1', '2']);
                $table->tinyInteger('status')->default(0); // 0=Pending, 1=Approved, 2=Rejected
                $table->text('note')->nullable();
                $table->timestamps();
                $table->softDeletes();
            });
        }

        // =========================================================================
        // 3. CENTRALIZED APPROVAL AUDIT HISTORIES (BE-06: Riwayat & Jejak Audit)
        // =========================================================================
        if (!Schema::hasTable('approval_histories')) {
            Schema::create('approval_histories', function (Blueprint $table) {
                $table->id();
                $table->string('document_type', 50)->index(); // 'PR', 'PO', 'RN', 'BPB', 'RM', 'RETURN'
                $table->unsignedBigInteger('document_id')->index();
                $table->string('document_number', 100)->nullable()->index();
                $table->unsignedBigInteger('user_id')->nullable();
                $table->string('action', 50); // APPROVE_1, APPROVE_2, UNAPPROVE_1, UNAPPROVE_2, REJECT, RESUBMIT
                $table->tinyInteger('tier')->default(1);
                $table->string('from_status', 50)->nullable();
                $table->string('to_status', 50);
                $table->text('note')->nullable();
                $table->json('metadata')->nullable();
                $table->timestamps();

                $table->foreign('user_id')->references('id')->on('users')->nullOnDelete();
                $table->index(['document_type', 'document_id']);
            });
        }

        // =========================================================================
        // 4. TRANSACTION TABLES ENHANCEMENTS (BE-03, BE-04, BE-05)
        // =========================================================================

        // Users table: add department link
        Schema::table('users', function (Blueprint $table) {
            if (!Schema::hasColumn('users', 'departments_id')) {
                $table->foreignId('departments_id')->nullable()->after('role')->constrained('departments')->nullOnDelete();
            }
        });

        // Purchase Orders table: ensure status column
        Schema::table('purchase_order', function (Blueprint $table) {
            if (!Schema::hasColumn('purchase_order', 'status')) {
                $table->string('status', 50)->default('Waiting for Approve 1')->after('facility_status')->index();
            }
            if (!Schema::hasColumn('purchase_order', 'rejection_note')) {
                $table->text('rejection_note')->nullable()->after('remark');
            }
        });

        // Receive Notes table: ensure status column
        Schema::table('receive_note', function (Blueprint $table) {
            if (!Schema::hasColumn('receive_note', 'status')) {
                $table->string('status', 50)->default('Waiting for Approve 1')->after('service_subkon')->index();
            }
            if (!Schema::hasColumn('receive_note', 'rejection_note')) {
                $table->text('rejection_note')->nullable()->after('note');
            }
        });

        // BPB Receive Material table: ensure status column
        Schema::table('bpb_receive_material', function (Blueprint $table) {
            if (!Schema::hasColumn('bpb_receive_material', 'status')) {
                $table->string('status', 50)->default('Waiting for Approve 1')->after('receive_date')->index();
            }
            if (!Schema::hasColumn('bpb_receive_material', 'rejection_note')) {
                $table->text('rejection_note')->nullable()->after('note');
            }
        });

        // Request Material table: ensure rejection_note column
        Schema::table('request_material', function (Blueprint $table) {
            if (!Schema::hasColumn('request_material', 'rejection_note')) {
                $table->text('rejection_note')->nullable()->after('note');
            }
        });

        // Receive Note Returns table: ensure rejection_note column
        Schema::table('receive_note_returns', function (Blueprint $table) {
            if (!Schema::hasColumn('receive_note_returns', 'rejection_note')) {
                $table->text('rejection_note')->nullable()->after('notes');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('receive_note_returns', function (Blueprint $table) {
            if (Schema::hasColumn('receive_note_returns', 'rejection_note')) {
                $table->dropColumn('rejection_note');
            }
        });

        Schema::table('request_material', function (Blueprint $table) {
            if (Schema::hasColumn('request_material', 'rejection_note')) {
                $table->dropColumn('rejection_note');
            }
        });

        Schema::table('bpb_receive_material', function (Blueprint $table) {
            if (Schema::hasColumn('bpb_receive_material', 'rejection_note')) {
                $table->dropColumn('rejection_note');
            }
            if (Schema::hasColumn('bpb_receive_material', 'status')) {
                $table->dropColumn('status');
            }
        });

        Schema::table('receive_note', function (Blueprint $table) {
            if (Schema::hasColumn('receive_note', 'rejection_note')) {
                $table->dropColumn('rejection_note');
            }
            if (Schema::hasColumn('receive_note', 'status')) {
                $table->dropColumn('status');
            }
        });

        Schema::table('purchase_order', function (Blueprint $table) {
            if (Schema::hasColumn('purchase_order', 'rejection_note')) {
                $table->dropColumn('rejection_note');
            }
            if (Schema::hasColumn('purchase_order', 'status')) {
                $table->dropColumn('status');
            }
        });

        Schema::table('users', function (Blueprint $table) {
            if (Schema::hasColumn('users', 'departments_id')) {
                $table->dropForeign(['departments_id']);
                $table->dropColumn('departments_id');
            }
        });

        Schema::dropIfExists('approval_histories');
        Schema::dropIfExists('approval_rn_returns');
        Schema::dropIfExists('user_has_permissions');
        Schema::dropIfExists('role_has_permissions');
        Schema::dropIfExists('permissions');
        Schema::dropIfExists('roles');
    }
};
