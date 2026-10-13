<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;

use Illuminate\Database\Eloquent\SoftDeletes;

use App\Traits\LogsActivity;

#[Fillable(['username', 'name', 'email', 'password', 'photo', 'role', 'status'])]
#[Hidden(['password', 'remember_token'])]
class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasFactory, Notifiable, SoftDeletes, LogsActivity;

    public const ROLE_ADMIN = 'admin';
    public const ROLE_PROCUREMENT = 'procurement';
    public const ROLE_WAREHOUSE = 'warehouse';
    public const ROLE_APPROVER = 'approver';
    public const ROLE_VIEWER = 'viewer';

    public const ROLE_PERMISSIONS = [
        self::ROLE_ADMIN => ['*'],
        self::ROLE_PROCUREMENT => [
            'pr.view', 'pr.create', 'pr.update', 'pr.delete',
            'po.view', 'po.create', 'po.update', 'po.delete',
            'report.view',
        ],
        self::ROLE_APPROVER => [
            'pr.view', 'pr.approve',
            'po.view', 'po.approve',
            'rn.view', 'rn.approve',
            'bpb.view', 'bpb.approve',
            'report.view',
        ],
        self::ROLE_WAREHOUSE => [
            'rn.view', 'rn.create', 'rn.update',
            'bpb.view', 'bpb.create', 'bpb.update',
            'inventory.view', 'inventory.adjust',
            'report.view',
        ],
        self::ROLE_VIEWER => [
            'pr.view', 'po.view', 'rn.view', 'bpb.view', 'report.view',
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
        ];
    }

    /**
     * Check if user has specific role or roles.
     */
    public function hasRole(string|array $roles): bool
    {
        if ($this->isAdmin()) {
            return true;
        }

        $roles = is_array($roles) ? $roles : explode(',', $roles);
        $roles = array_map('trim', $roles);

        return in_array($this->role, $roles, true);
    }

    /**
     * Check if user is administrator.
     */
    public function isAdmin(): bool
    {
        return in_array($this->role, [self::ROLE_ADMIN, 'superadmin'], true);
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
        if ($this->isAdmin()) {
            return true;
        }

        $permissions = self::ROLE_PERMISSIONS[$this->role] ?? [];
        if (in_array('*', $permissions, true)) {
            return true;
        }

        return in_array($permission, $permissions, true);
    }
}
