<?php

namespace App\Models\System\Auth;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;

use Illuminate\Database\Eloquent\SoftDeletes;

use App\Traits\LogsActivity;

#[Fillable(['username', 'name', 'email', 'password', 'photo', 'role', 'departments_id', 'status', 'sidebar_permissions'])]
#[Hidden(['password', 'remember_token'])]
class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasFactory, Notifiable, SoftDeletes, LogsActivity;

    public const ROLE_SUPERADMIN = 'superadmin';
    public const ROLE_ADMIN = 'admin';
    public const ROLE_APPROVER_TIER1 = 'approver_tier1';
    public const ROLE_APPROVER_TIER2 = 'approver_tier2';
    public const ROLE_PROCUREMENT = 'procurement';
    public const ROLE_WAREHOUSE = 'warehouse';
    public const ROLE_APPROVER = 'approver';
    public const ROLE_REQUESTER = 'requester';
    public const ROLE_VIEWER = 'viewer';

    public const ROLE_PERMISSIONS = [
        self::ROLE_SUPERADMIN => ['*'],
        self::ROLE_ADMIN => ['*'],
        self::ROLE_APPROVER_TIER1 => [
            'pr.view', 'pr.approve_1', 'pr.unapprove_1',
            'po.view', 'po.approve_1', 'po.unapprove_1',
            'rn.view', 'rn.approve_1', 'rn.unapprove_1',
            'bpb.view', 'bpb.approve_1', 'bpb.unapprove_1',
            'rm.view', 'rm.approve_1', 'rm.unapprove_1',
            'return.view', 'return.approve_1', 'return.unapprove_1',
            'report.view',
        ],
        self::ROLE_APPROVER_TIER2 => [
            'pr.view', 'pr.approve_2', 'pr.unapprove_2',
            'po.view', 'po.approve_2', 'po.unapprove_2',
            'rn.view', 'rn.approve_2', 'rn.unapprove_2',
            'bpb.view', 'bpb.approve_2', 'bpb.unapprove_2',
            'rm.view', 'rm.approve_2', 'rm.unapprove_2',
            'return.view', 'return.approve_2', 'return.unapprove_2',
            'report.view',
        ],
        self::ROLE_PROCUREMENT => [
            'pr.view', 'pr.create', 'pr.update', 'pr.delete',
            'po.view', 'po.create', 'po.update', 'po.delete',
            'report.view',
        ],
        self::ROLE_APPROVER => [
            'pr.view', 'pr.approve_1', 'pr.unapprove_1', 'pr.approve_2', 'pr.unapprove_2',
            'po.view', 'po.approve_1', 'po.unapprove_1', 'po.approve_2', 'po.unapprove_2',
            'rn.view', 'rn.approve_1', 'rn.unapprove_1', 'rn.approve_2', 'rn.unapprove_2',
            'bpb.view', 'bpb.approve_1', 'bpb.unapprove_1', 'bpb.approve_2', 'bpb.unapprove_2',
            'rm.view', 'rm.approve_1', 'rm.unapprove_1', 'rm.approve_2', 'rm.unapprove_2',
            'report.view',
        ],
        self::ROLE_WAREHOUSE => [
            'rn.view', 'rn.create', 'rn.update',
            'bpb.view', 'bpb.create', 'bpb.update',
            'rm.view', 'rm.create', 'rm.update',
            'inventory.view', 'inventory.adjust',
            'report.view',
        ],
        self::ROLE_REQUESTER => [
            'pr.view', 'pr.create', 'pr.update',
            'rm.view', 'rm.create', 'rm.update',
            'report.view',
        ],
        self::ROLE_VIEWER => [
            'pr.view', 'po.view', 'rn.view', 'bpb.view', 'rm.view', 'report.view',
        ],
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'status' => 'integer',
            'departments_id' => 'integer',
            'sidebar_permissions' => 'array',
        ];
    }

    /**
     * User's primary department relation.
     */
    public function department(): \Illuminate\Database\Eloquent\Relations\BelongsTo
    {
        return $this->belongsTo(\App\Models\Master\Organization\Department::class, 'departments_id');
    }

    /**
     * Direct custom user-specific permission overrides.
     */
    public function directPermissions(): \Illuminate\Database\Eloquent\Relations\BelongsToMany
    {
        return $this->belongsToMany(
            \App\Models\System\Governance\Permission::class,
            'user_has_permissions',
            'user_id',
            'permission_id'
        )->withPivot('is_granted');
    }

    /**
     * Associated Role model if present in database.
     */
    public function roleModel(): \Illuminate\Database\Eloquent\Relations\BelongsTo
    {
        return $this->belongsTo(\App\Models\System\Governance\Role::class, 'role', 'name');
    }

    /**
     * Check if user is SuperAdmin.
     */
    public function isSuperAdmin(): bool
    {
        return $this->role === self::ROLE_SUPERADMIN;
    }

    /**
     * Check if user is administrator (superadmin or admin).
     */
    public function isAdmin(): bool
    {
        return in_array($this->role, [self::ROLE_SUPERADMIN, self::ROLE_ADMIN], true);
    }

    /**
     * Check if user has specific role or roles.
     */
    public function hasRole(string|array $roles): bool
    {
        if ($this->isSuperAdmin()) {
            return true;
        }

        $roles = is_array($roles) ? $roles : explode(',', $roles);
        $roles = array_map('trim', $roles);

        return in_array($this->role, $roles, true);
    }

    /**
     * Check if user account is currently active.
     */
    public function isActive(): bool
    {
        return (int) $this->status === 1;
    }

    /**
     * Check if user has a specific granular permission.
     */
    public function hasPermission(string $permission): bool
    {
        if ($this->isSuperAdmin()) {
            return true;
        }

        if (!$this->isActive()) {
            return false;
        }

        // 1. Check direct user-specific permission override in user_has_permissions
        try {
            $direct = $this->directPermissions()->where('name', $permission)->first();
            if ($direct !== null) {
                return (bool) $direct->pivot->is_granted;
            }
        } catch (\Throwable $e) {
            // Ignore if DB not yet loaded
        }

        // 2. Check Role model permissions from DB
        try {
            $roleModel = \App\Models\System\Governance\Role::where('name', $this->role)->with('permissions')->first();
            if ($roleModel) {
                if ($roleModel->permissions->contains('name', '*')) {
                    return true;
                }
                if ($roleModel->permissions->contains('name', $permission)) {
                    return true;
                }
            }
        } catch (\Throwable $e) {
            // Ignore if DB not yet loaded
        }

        // 3. Fallback to hardcoded matrix
        $permissions = self::ROLE_PERMISSIONS[$this->role] ?? [];
        if (in_array('*', $permissions, true)) {
            return true;
        }

        // Match exact or wildcard (e.g. pr.*)
        if (in_array($permission, $permissions, true)) {
            return true;
        }

        $parts = explode('.', $permission);
        if (count($parts) === 2 && in_array("{$parts[0]}.*", $permissions, true)) {
            return true;
        }

        return false;
    }

    /**
     * Get all effective permissions for the user (role + direct overrides).
     *
     * @return array<string>
     */
    public function getAllPermissions(): array
    {
        if ($this->isSuperAdmin()) {
            return ['*'];
        }

        $perms = collect();

        try {
            $roleModel = \App\Models\System\Governance\Role::where('name', $this->role)->with('permissions')->first();
            if ($roleModel) {
                if ($roleModel->permissions->contains('name', '*')) {
                    return ['*'];
                }
                $perms = $perms->merge($roleModel->permissions->pluck('name'));
            } else {
                $constantPerms = self::ROLE_PERMISSIONS[$this->role] ?? [];
                if (in_array('*', $constantPerms, true)) {
                    return ['*'];
                }
                $perms = $perms->merge($constantPerms);
            }

            $directs = $this->directPermissions()->get();
            foreach ($directs as $dp) {
                if ($dp->pivot->is_granted) {
                    $perms->push($dp->name);
                } else {
                    $perms = $perms->reject(fn($name) => $name === $dp->name);
                }
            }
        } catch (\Throwable $e) {
            return self::ROLE_PERMISSIONS[$this->role] ?? ['*'];
        }

        return $perms->unique()->values()->all();
    }
}
