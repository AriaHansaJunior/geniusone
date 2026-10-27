<?php

namespace App\Models\System\Governance;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class Permission extends Model
{
    use HasFactory;

    protected $table = 'permissions';

    protected $fillable = [
        'name',
        'module',
        'action',
        'label',
    ];

    /**
     * Standard Actions.
     */
    public const ACTION_CREATE = 'create';
    public const ACTION_VIEW = 'view';
    public const ACTION_UPDATE = 'update';
    public const ACTION_DELETE = 'delete';
    public const ACTION_APPROVE_1 = 'approve_1';
    public const ACTION_UNAPPROVE_1 = 'unapprove_1';
    public const ACTION_APPROVE_2 = 'approve_2';
    public const ACTION_UNAPPROVE_2 = 'unapprove_2';

    /**
     * Roles having this permission.
     */
    public function roles(): BelongsToMany
    {
        return $this->belongsToMany(
            Role::class,
            'role_has_permissions',
            'permission_id',
            'role_id'
        );
    }
}
