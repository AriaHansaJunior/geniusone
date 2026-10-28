<?php

namespace App\Models\System\Governance;

use App\Models\System\Auth\User;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ApprovalHistory extends Model
{
    use HasFactory;

    protected $table = 'approval_histories';

    protected $fillable = [
        'document_type',
        'document_id',
        'document_number',
        'user_id',
        'action',
        'tier',
        'from_status',
        'to_status',
        'note',
        'metadata',
    ];

    protected $casts = [
        'tier' => 'integer',
        'metadata' => 'array',
    ];

    /**
     * Standard Actions.
     */
    public const ACTION_APPROVE_1 = 'APPROVE_1';

    public const ACTION_APPROVE_2 = 'APPROVE_2';

    public const ACTION_UNAPPROVE_1 = 'UNAPPROVE_1';

    public const ACTION_UNAPPROVE_2 = 'UNAPPROVE_2';

    public const ACTION_REJECT = 'REJECT';

    public const ACTION_RESUBMIT = 'RESUBMIT';

    /**
     * User who performed the action.
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }
}
