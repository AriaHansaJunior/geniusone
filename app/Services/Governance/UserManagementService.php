<?php

namespace App\Services\Governance;

use App\Models\System\Auth\User;
use App\Models\System\Governance\Permission;
use App\Models\System\Governance\Role;
use App\Services\AuditLogger;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\Hash;
use InvalidArgumentException;

/**
 * SuperAdmin User Account Management Service.
 * Implements BE-01.
 */
class UserManagementService
{
    /**
     * Get paginated list of users with comprehensive filtering.
     */
    public function listUsers(array $filters = [], int $perPage = 15): LengthAwarePaginator
    {
        $query = User::with(['department', 'roleModel'])->orderBy('id', 'desc');

        if (! empty($filters['search'])) {
            $search = trim($filters['search']);
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('username', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%");
            });
        }

        if (! empty($filters['role']) && $filters['role'] !== 'all') {
            $query->where('role', $filters['role']);
        }

        if (isset($filters['status']) && $filters['status'] !== '' && $filters['status'] !== 'all') {
            $query->where('status', (int) $filters['status']);
        }

        if (! empty($filters['departments_id'])) {
            $query->where('departments_id', (int) $filters['departments_id']);
        }

        return $query->paginate($perPage);
    }

    /**
     * Create a new user account.
     */
    public function createUser(array $data, int $actorId): User
    {
        $roleName = $data['role'] ?? Role::VIEWER;

        $user = User::create([
            'name' => $data['name'],
            'username' => $data['username'],
            'email' => $data['email'],
            'password' => Hash::make($data['password']),
            'role' => $roleName,
            'departments_id' => $data['departments_id'] ?? null,
            'status' => isset($data['status']) ? (int) $data['status'] : 1,
            'photo' => $data['photo'] ?? null,
            'sidebar_permissions' => $data['sidebar_permissions'] ?? null,
        ]);

        if (! empty($data['permissions']) && is_array($data['permissions'])) {
            $this->syncUserDirectPermissions($user, $data['permissions']);
        }

        AuditLogger::log(
            userId: $actorId,
            type: 'USER_CREATED',
            old: null,
            new: ['id' => $user->id, 'username' => $user->username, 'role' => $user->role]
        );

        return $user->load(['department', 'roleModel', 'directPermissions']);
    }

    /**
     * Update an existing user account.
     */
    public function updateUser(int $userId, array $data, int $actorId): User
    {
        $user = User::findOrFail($userId);
        $oldData = $user->only(['name', 'username', 'email', 'role', 'departments_id', 'status']);

        // Prevent demoting primary superadmin (id 1 or username superadmin)
        if ($user->id === 1 && isset($data['role']) && $data['role'] !== Role::SUPERADMIN) {
            throw new InvalidArgumentException('The primary SuperAdmin account role cannot be changed.');
        }

        $updatePayload = [
            'name' => $data['name'] ?? $user->name,
            'username' => $data['username'] ?? $user->username,
            'email' => $data['email'] ?? $user->email,
            'role' => $data['role'] ?? $user->role,
            'departments_id' => array_key_exists('departments_id', $data) ? $data['departments_id'] : $user->departments_id,
            'status' => isset($data['status']) ? (int) $data['status'] : $user->status,
        ];

        if (! empty($data['password'])) {
            $updatePayload['password'] = Hash::make($data['password']);
        }

        if (array_key_exists('photo', $data)) {
            $updatePayload['photo'] = $data['photo'];
        }

        if (array_key_exists('sidebar_permissions', $data)) {
            $updatePayload['sidebar_permissions'] = $data['sidebar_permissions'];
        }

        $user->update($updatePayload);

        if (array_key_exists('permissions', $data) && is_array($data['permissions'])) {
            $this->syncUserDirectPermissions($user, $data['permissions']);
        }

        AuditLogger::log(
            userId: $actorId,
            type: 'USER_UPDATED',
            old: $oldData,
            new: $user->only(['name', 'username', 'email', 'role', 'departments_id', 'status'])
        );

        return $user->fresh(['department', 'roleModel', 'directPermissions']);
    }

    /**
     * Update user sidebar permissions and granular module permissions.
     */
    public function updateUserPermissions(int $userId, array $permissions, ?array $sidebarPermissions, int $actorId): User
    {
        $user = User::findOrFail($userId);

        if ($sidebarPermissions !== null) {
            $user->update(['sidebar_permissions' => $sidebarPermissions]);
        }

        $this->syncUserDirectPermissions($user, $permissions);

        AuditLogger::log(
            userId: $actorId,
            type: 'USER_PERMISSIONS_UPDATED',
            old: null,
            new: ['user_id' => $user->id, 'permissions_count' => count($permissions)]
        );

        return $user->fresh(['department', 'roleModel', 'directPermissions']);
    }

    /**
     * Toggle active/inactive account status.
     */
    public function toggleStatus(int $userId, int $actorId): User
    {
        $user = User::findOrFail($userId);

        if ($user->id === 1 || $user->role === Role::SUPERADMIN) {
            throw new InvalidArgumentException('SuperAdmin accounts cannot be deactivated.');
        }

        $oldStatus = (int) $user->status;
        $newStatus = ($oldStatus === 1) ? 0 : 1;
        $user->update(['status' => $newStatus]);

        AuditLogger::log(
            userId: $actorId,
            type: $newStatus === 1 ? 'USER_ACTIVATED' : 'USER_DEACTIVATED',
            old: ['status' => $oldStatus, 'target_user' => $user->username, 'name' => $user->name],
            new: ['status' => $newStatus, 'target_user' => $user->username, 'name' => $user->name]
        );

        return $user;
    }

    /**
     * Reset user password.
     */
    public function resetPassword(int $userId, string $newPassword, int $actorId): void
    {
        $user = User::findOrFail($userId);

        $user->update([
            'password' => Hash::make($newPassword),
        ]);

        AuditLogger::log(
            userId: $actorId,
            type: 'PASSWORD_RESET',
            old: null,
            new: ['user_id' => $user->id, 'username' => $user->username]
        );
    }

    /**
     * Soft delete user account.
     */
    public function deleteUser(int $userId, int $actorId): bool
    {
        $user = User::findOrFail($userId);

        if ($user->id === 1 || $user->role === Role::SUPERADMIN) {
            throw new InvalidArgumentException('SuperAdmin accounts cannot be deleted.');
        }

        if ($user->id === $actorId) {
            throw new InvalidArgumentException('You cannot delete your own active account.');
        }

        AuditLogger::log(
            userId: $actorId,
            type: 'USER_DELETED',
            old: ['id' => $user->id, 'username' => $user->username],
            new: ['deleted_at' => now()]
        );

        return (bool) $user->delete();
    }

    /**
     * Sync user direct custom permission overrides.
     */
    public function syncUserDirectPermissions(User $user, array $permissionNames): void
    {
        $permissionIds = Permission::whereIn('name', $permissionNames)->pluck('id')->toArray();
        $user->directPermissions()->sync($permissionIds);
    }
}
