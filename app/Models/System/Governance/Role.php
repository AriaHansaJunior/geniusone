<?php

namespace App\Models\System\Governance;

use App\Models\System\Auth\User;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class Role extends Model
{
    use HasFactory;

    protected $table = 'roles';

    protected $fillable = [
        'name',
        'label',
        'description',
        'is_system',
    ];

    protected $casts = [
        'is_system' => 'boolean',
    ];

    /**
     * Standard System Role Constants.
     */
    public const SUPERADMIN = 'superadmin';
    public const ADMIN = 'admin';
    public const APPROVER_TIER1 = 'approver_tier1';
    public const APPROVER_TIER2 = 'approver_tier2';
    public const PROCUREMENT = 'procurement';
    public const WAREHOUSE = 'warehouse';
    public const REQUESTER = 'requester';
    public const VIEWER = 'viewer';

    /**
     * Permissions belonging to this role.
     */
    public function permissions(): BelongsToMany
    {
        return $this->belongsToMany(
            Permission::class,
            'role_has_permissions',
            'role_id',
            'permission_id'
        );
    }

    /**
     * Check if role has a specific permission.
     */
    public function hasPermission(string $permissionName): bool
    {
        if ($this->name === self::SUPERADMIN) {
            return true;
        }

        return $this->permissions->contains('name', $permissionName);
    }

    /**
     * Sync permissions by array of permission names or IDs.
     */
    public function syncPermissions(array $permissionIdentifiers): void
    {
        $ids = [];
        foreach ($permissionIdentifiers as $identifier) {
            if (is_numeric($identifier)) {
                $ids[] = (int) $identifier;
            } elseif (is_string($identifier)) {
                $perm = Permission::where('name', $identifier)->first();
                if ($perm) {
                    $ids[] = $perm->id;
                }
            }
        }

        $this->permissions()->sync($ids);
    }
}
