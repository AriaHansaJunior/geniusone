<?php

namespace App\Services\Governance;

use App\Models\System\Governance\Permission;
use App\Models\System\Governance\Role;
use App\Services\AuditLogger;
use Illuminate\Support\Collection;
use InvalidArgumentException;

/**
 * Granular Permission Management Service.
 * Implements BE-02.
 */
class PermissionManagementService
{
    /**
     * Get all roles with their assigned permissions.
     */
    public function listRoles(): Collection
    {
        return Role::with('permissions')->orderBy('id', 'asc')->get();
    }

    /**
     * Get all permissions grouped by module.
     */
    public function listPermissionsGrouped(): array
    {
        return Permission::all()->groupBy('module')->toArray();
    }

    /**
     * Create a custom role.
     */
    public function createRole(array $data, int $actorId): Role
    {
        $role = Role::create([
            'name' => strtolower(trim($data['name'])),
            'label' => $data['label'] ?? ucwords(str_replace('_', ' ', $data['name'])),
            'description' => $data['description'] ?? null,
            'is_system' => false,
        ]);

        if (!empty($data['permissions'])) {
            $role->syncPermissions($data['permissions']);
        }

        AuditLogger::log(
            userId: $actorId,
            type: 'ROLE_CREATED',
            old: null,
            new: ['id' => $role->id, 'name' => $role->name]
        );

        return $role->load('permissions');
    }

    /**
     * Update an existing role and sync its permissions.
     */
    public function updateRole(int $roleId, array $data, int $actorId): Role
    {
        $role = Role::findOrFail($roleId);

        $updateData = [];
        if (isset($data['label'])) {
            $updateData['label'] = $data['label'];
        }
        if (isset($data['description'])) {
            $updateData['description'] = $data['description'];
        }

        // Prevent renaming system role name
        if (!$role->is_system && isset($data['name'])) {
            $updateData['name'] = strtolower(trim($data['name']));
        }

        $role->update($updateData);

        if (array_key_exists('permissions', $data) && is_array($data['permissions'])) {
            $role->syncPermissions($data['permissions']);
        }

        AuditLogger::log(
            userId: $actorId,
            type: 'ROLE_UPDATED',
            old: null,
            new: ['id' => $role->id, 'name' => $role->name]
        );

        return $role->fresh('permissions');
    }

    /**
     * Delete custom role.
     */
    public function deleteRole(int $roleId, int $actorId): bool
    {
        $role = Role::findOrFail($roleId);

        if ($role->is_system || in_array($role->name, [Role::SUPERADMIN, Role::ADMIN], true)) {
            throw new InvalidArgumentException("System protected roles cannot be deleted.");
        }

        AuditLogger::log(
            userId: $actorId,
            type: 'ROLE_DELETED',
            old: ['id' => $role->id, 'name' => $role->name],
            new: null
        );

        return (bool) $role->delete();
    }

    /**
     * Build tabular Permission Matrix for UI presentation.
     * Generates a grid of [Module][Action] => [Roles that have permission].
     */
    public function getPermissionMatrix(): array
    {
        $roles = Role::with('permissions')->get();
        $permissions = Permission::all();

        $modules = $permissions->groupBy('module');

        $matrix = [];
        foreach ($modules as $modName => $modPerms) {
            $actions = [];
            foreach ($modPerms as $perm) {
                $roleGrants = [];
                foreach ($roles as $r) {
                    if ($r->name === Role::SUPERADMIN) {
                        $roleGrants[$r->name] = true;
                    } else {
                        $roleGrants[$r->name] = $r->permissions->contains('id', $perm->id);
                    }
                }

                $actions[$perm->action] = [
                    'permissionId' => $perm->id,
                    'permissionName' => $perm->name,
                    'label' => $perm->label,
                    'roles' => $roleGrants,
                ];
            }

            $matrix[$modName] = [
                'module' => $modName,
                'actions' => $actions,
            ];
        }

        return [
            'roles' => $roles->map(fn($r) => ['id' => $r->id, 'name' => $r->name, 'label' => $r->label, 'is_system' => $r->is_system])->values()->toArray(),
            'matrix' => $matrix,
        ];
    }

    /**
     * Batch update permission assignments for a specific role.
     */
    public function updateRolePermissions(int $roleId, array $permissionNames, int $actorId): Role
    {
        $role = Role::findOrFail($roleId);

        if ($role->name === Role::SUPERADMIN) {
            throw new InvalidArgumentException("SuperAdmin role permissions are immutable and inherently unrestricted (*).");
        }

        $role->syncPermissions($permissionNames);

        AuditLogger::log(
            userId: $actorId,
            type: 'ROLE_PERMISSIONS_SYNCED',
            old: null,
            new: ['role' => $role->name, 'count' => count($permissionNames)]
        );

        return $role->load('permissions');
    }
}
