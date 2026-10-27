<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use App\Models\System\Auth\User;
use App\Models\System\Governance\Role;
use App\Models\System\Governance\Permission;

class GovernanceAndRbacSeeder extends Seeder
{
    public function run(): void
    {
        $this->command?->info("Seeding Governance & RBAC System (BE-01 & BE-02)...");

        // 1. ROLES
        $rolesData = [
            [
                'name' => Role::SUPERADMIN,
                'label' => 'Super Administrator',
                'description' => 'Unrestricted master access with full user, permission, and workflow authority',
                'is_system' => true,
            ],
            [
                'name' => Role::ADMIN,
                'label' => 'Operations Administrator',
                'description' => 'System administrative manager for day-to-day operations',
                'is_system' => true,
            ],
            [
                'name' => Role::APPROVER_TIER1,
                'label' => 'Approver Tier 1 (Section / Dept Head)',
                'description' => 'First stage reviewer and approver for operational documents',
                'is_system' => true,
            ],
            [
                'name' => Role::APPROVER_TIER2,
                'label' => 'Approver Tier 2 (Director / GM / Division Head)',
                'description' => 'Final approving authority releasing documents for downstream execution',
                'is_system' => true,
            ],
            [
                'name' => Role::PROCUREMENT,
                'label' => 'Procurement Officer',
                'description' => 'Purchasing staff responsible for PR handling and PO creation',
                'is_system' => true,
            ],
            [
                'name' => Role::WAREHOUSE,
                'label' => 'Warehouse & Inventory Officer',
                'description' => 'Logistics staff responsible for gate receiving (RN), BPB, and RM issuance',
                'is_system' => true,
            ],
            [
                'name' => Role::REQUESTER,
                'label' => 'Department Requisitioner',
                'description' => 'Staff creating purchase and material requisitions for departmental needs',
                'is_system' => false,
            ],
            [
                'name' => Role::VIEWER,
                'label' => 'Auditor / Read-Only Viewer',
                'description' => 'Read-only access for compliance, reporting, and audit verification',
                'is_system' => false,
            ],
        ];

        $roles = [];
        foreach ($rolesData as $rd) {
            $roles[$rd['name']] = Role::updateOrCreate(['name' => $rd['name']], $rd);
        }

        // 2. PERMISSIONS DEFINITION (BE-02)
        $modules = [
            'pr' => 'Purchase Requisition',
            'po' => 'Purchase Order',
            'rn' => 'Receive Note (Gate Receiving)',
            'bpb' => 'BPB (Warehouse Inbound)',
            'rm' => 'Request Material',
            'return' => 'Receive Note Return',
        ];

        $allPermissions = [];

        // Operational Document Permissions: CRUD + 4 Approval Actions
        foreach ($modules as $modKey => $modLabel) {
            $actions = [
                'view' => "View {$modLabel} list and details",
                'create' => "Create new {$modLabel}",
                'update' => "Edit {$modLabel} (Draft / Revision)",
                'delete' => "Delete {$modLabel}",
                'approve_1' => "Perform Stage 1 Approval for {$modLabel}",
                'unapprove_1' => "Rollback Stage 1 Approval for {$modLabel}",
                'approve_2' => "Perform Stage 2 (Final) Approval for {$modLabel}",
                'unapprove_2' => "Rollback Stage 2 Approval for {$modLabel}",
            ];

            foreach ($actions as $actKey => $actLabel) {
                $permName = "{$modKey}.{$actKey}";
                $allPermissions[$permName] = Permission::updateOrCreate(
                    ['name' => $permName],
                    [
                        'module' => $modKey,
                        'action' => $actKey,
                        'label' => $actLabel,
                    ]
                );
            }
        }

        // Master Data Permissions (CRUD Only — Master has NO approval)
        $masterModules = [
            'master_supplier' => 'Master Supplier',
            'master_item' => 'Master Item & Material',
            'master_warehouse' => 'Master Warehouse & Coordinates',
            'master_department' => 'Master Department & Section',
            'master_finance' => 'Master Finance (Payment Term, PPh, Currency)',
        ];

        foreach ($masterModules as $mKey => $mLabel) {
            foreach (['view', 'create', 'update', 'delete'] as $act) {
                $permName = "{$mKey}.{$act}";
                $allPermissions[$permName] = Permission::updateOrCreate(
                    ['name' => $permName],
                    [
                        'module' => $mKey,
                        'action' => $act,
                        'label' => ucfirst($act) . " {$mLabel}",
                    ]
                );
            }
        }

        // Administrative & Governance Permissions
        $adminPermissions = [
            'users.view' => ['admin_users', 'view', 'View Users list and profile'],
            'users.create' => ['admin_users', 'create', 'Create new User accounts'],
            'users.update' => ['admin_users', 'update', 'Edit User details and roles'],
            'users.delete' => ['admin_users', 'delete', 'Deactivate or delete User accounts'],
            'users.reset_password' => ['admin_users', 'update', 'Reset User password'],
            'roles.manage' => ['admin_rbac', 'update', 'Manage Roles and assign Permissions'],
            'audit.view' => ['admin_audit', 'view', 'View System Audit Logs and History'],
            'reports.view' => ['reports', 'view', 'View Traceability and Operational Reports'],
            'reports.export' => ['reports', 'export', 'Export Reports and Data to XLSX / PDF'],
            'inventory.view' => ['inventory', 'view', 'View Stock Cards and Warehouse Balances'],
            'inventory.adjust' => ['inventory', 'update', 'Perform Physical Stock Adjustments'],
        ];

        foreach ($adminPermissions as $pName => $pConfig) {
            $allPermissions[$pName] = Permission::updateOrCreate(
                ['name' => $pName],
                [
                    'module' => $pConfig[0],
                    'action' => $pConfig[1],
                    'label' => $pConfig[2],
                ]
            );
        }

        // 3. ROLE-PERMISSION MAPPINGS
        // Superadmin: receives all permissions
        $roles[Role::SUPERADMIN]->permissions()->sync(array_values(array_map(fn($p) => $p->id, $allPermissions)));
        $roles[Role::ADMIN]->permissions()->sync(array_values(array_map(fn($p) => $p->id, $allPermissions)));

        // Approver Tier 1
        $tier1Perms = Permission::where(function($q) {
            $q->whereIn('action', ['view', 'approve_1', 'unapprove_1'])
              ->orWhereIn('module', ['reports', 'inventory']);
        })->pluck('id')->toArray();
        $roles[Role::APPROVER_TIER1]->permissions()->sync($tier1Perms);

        // Approver Tier 2
        $tier2Perms = Permission::where(function($q) {
            $q->whereIn('action', ['view', 'approve_2', 'unapprove_2'])
              ->orWhereIn('module', ['reports', 'inventory']);
        })->pluck('id')->toArray();
        $roles[Role::APPROVER_TIER2]->permissions()->sync($tier2Perms);

        // Procurement Staff
        $procPerms = Permission::where(function($q) {
            $q->whereIn('module', ['pr', 'po', 'master_supplier'])
              ->whereIn('action', ['view', 'create', 'update', 'delete'])
              ->orWhereIn('module', ['reports']);
        })->pluck('id')->toArray();
        $roles[Role::PROCUREMENT]->permissions()->sync($procPerms);

        // Warehouse Staff
        $whPerms = Permission::where(function($q) {
            $q->whereIn('module', ['rn', 'bpb', 'rm', 'return', 'master_warehouse', 'inventory'])
              ->whereIn('action', ['view', 'create', 'update', 'delete'])
              ->orWhereIn('module', ['reports']);
        })->pluck('id')->toArray();
        $roles[Role::WAREHOUSE]->permissions()->sync($whPerms);

        // Requisitioner
        $reqPerms = Permission::where(function($q) {
            $q->whereIn('module', ['pr', 'rm'])
              ->whereIn('action', ['view', 'create', 'update']);
        })->pluck('id')->toArray();
        $roles[Role::REQUESTER]->permissions()->sync($reqPerms);

        // Viewer
        $viewPerms = Permission::where('action', 'view')->pluck('id')->toArray();
        $roles[Role::VIEWER]->permissions()->sync($viewPerms);

        // 4. ENSURE REAL ENTERPRISE USERS & PERSONAS (BE-01)
        $enterpriseUsers = [
            [
                'username' => 'superadmin',
                'name' => 'Super Administrator GeniusOne',
                'email' => 'superadmin@geniusone.internal',
                'role' => Role::SUPERADMIN,
            ],
            [
                'username' => 'admin',
                'name' => 'Administrator GeniusOne',
                'email' => 'admin@geniusone.internal',
                'role' => Role::SUPERADMIN,
            ],
            [
                'username' => 'rizky.aditya',
                'name' => 'Rizky Aditya',
                'email' => 'rizky.aditya@geniusone.internal',
                'role' => Role::ADMIN,
            ],
            [
                'username' => 'arsyeila',
                'name' => 'Arsyeila Putri',
                'email' => 'arsyeila.putri@geniusone.internal',
                'role' => Role::PROCUREMENT,
            ],
            [
                'username' => 'yustina',
                'name' => 'Yustina',
                'email' => 'yustina@geniusone.internal',
                'role' => Role::APPROVER_TIER1,
            ],
            [
                'username' => 'awi.l',
                'name' => 'Awi L',
                'email' => 'awi.l@geniusone.internal',
                'role' => Role::APPROVER_TIER2,
            ],
            [
                'username' => 'bambang.s',
                'name' => 'Bambang Sudarmono',
                'email' => 'bambang.s@geniusone.internal',
                'role' => Role::WAREHOUSE,
            ],
            [
                'username' => 'budi.s',
                'name' => 'Budi Santoso',
                'email' => 'budi.s@geniusone.internal',
                'role' => Role::WAREHOUSE,
            ],
            [
                'username' => 'hendra_mgr',
                'name' => 'Hendra Setiawan',
                'email' => 'hendra@geniusone.internal',
                'role' => Role::APPROVER_TIER1,
            ],
            [
                'username' => 'viewer_test',
                'name' => 'Auditor / Read-Only Viewer',
                'email' => 'viewer@geniusone.internal',
                'role' => Role::VIEWER,
            ],
        ];

        foreach ($enterpriseUsers as $eu) {
            User::updateOrCreate(
                ['username' => $eu['username']],
                [
                    'name' => $eu['name'],
                    'email' => $eu['email'],
                    'password' => Hash::make('secret123'),
                    'role' => $eu['role'],
                    'status' => 1,
                ]
            );
        }

        // Ensure user ID 1 is also superadmin
        $user1 = User::find(1);
        if ($user1 && $user1->role !== Role::SUPERADMIN) {
            $user1->update(['role' => Role::SUPERADMIN]);
        }

        $this->command?->info("Governance & RBAC System Seeding Completed successfully!");
    }
}
