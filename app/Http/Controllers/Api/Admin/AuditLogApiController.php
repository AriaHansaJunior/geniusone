<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\System\Audit\Log;
use App\Models\System\Governance\ApprovalHistory;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * System Audit Trail & Workflow Activity Log Controller.
 * Implements BE-06.
 */
class AuditLogApiController extends Controller
{
    /**
     * Get paginated system audit logs.
     * Strictly restricted to SuperAdmin authority.
     * GET /api/v1/admin/audit-logs
     */
    public function index(Request $request): JsonResponse
    {
        // Enforce SuperAdmin access only
        $actor = $request->user() ?: auth()->user();
        if (! $actor || (! $actor->isSuperAdmin() && $actor->role !== 'superadmin')) {
            return response()->json([
                'status' => 'error',
                'message' => 'Unauthorized: System audit logs are strictly reserved for Super Administrator authority.',
            ], 403);
        }

        $query = Log::with('user:id,name,username,role')->orderByDesc('id');

        // Filter by user ID
        if ($request->has('user_id') && is_numeric($request->query('user_id'))) {
            $query->where('users_id', (int) $request->query('user_id'));
        }

        // Filter by activity category
        if ($category = $request->query('category')) {
            if ($category === 'auth') {
                $query->where('tipe', 'like', 'AUTH_%');
            } elseif ($category === 'data') {
                $query->where(function ($q) {
                    $q->where('tipe', 'like', 'CREATED_%')
                        ->orWhere('tipe', 'like', 'UPDATED_%')
                        ->orWhere('tipe', 'like', 'DELETED_%')
                        ->orWhere('tipe', 'like', 'RESTORED_%')
                        ->orWhere('tipe', 'like', 'USER_%');
                });
            } elseif ($category === 'workflow') {
                $query->where(function ($q) {
                    $q->where('tipe', 'like', '%APPROVAL%')
                        ->orWhere('tipe', 'like', '%REJECT%')
                        ->orWhere('tipe', 'like', '%UNAPPROVAL%');
                });
            } elseif ($category === 'inventory') {
                $query->where(function ($q) {
                    $q->where('tipe', 'like', '%STOCK%')
                        ->orWhere('tipe', 'like', '%BPB%')
                        ->orWhere('tipe', 'like', '%RN%');
                });
            }
        }

        // Specific type filter
        if ($request->has('type') && ! empty($request->query('type'))) {
            $query->where('tipe', 'like', "%{$request->query('type')}%");
        }

        // Date range filters
        if ($fromDate = $request->query('from_date')) {
            $query->whereDate('created_at', '>=', $fromDate);
        }
        if ($toDate = $request->query('to_date')) {
            $query->whereDate('created_at', '<=', $toDate);
        }

        // General search query (by type, username, name, IP, or identifier)
        if ($request->has('search') && ! empty($request->query('search'))) {
            $s = trim($request->query('search'));
            $query->where(function ($q) use ($s) {
                $q->where('tipe', 'like', "%{$s}%")
                    ->orWhereHas('user', fn ($uq) => $uq->where('name', 'like', "%{$s}%")->orWhere('username', 'like', "%{$s}%"));
            });
        }

        $perPage = (int) $request->query('per_page', 25);
        $paginated = $query->paginate($perPage);

        // Transform items with WIB timezone (Asia/Jakarta), client IP, and human-readable metadata
        $transformed = collect($paginated->items())->map(function (Log $log) {
            $new = $log->new ?? [];
            $old = $log->old ?? [];
            $context = $new['_context'] ?? ($old['_context'] ?? []);

            $ip = $context['ip'] ?? ($new['ip'] ?? ($old['ip'] ?? '127.0.0.1'));
            $url = $context['url'] ?? null;
            $method = $context['method'] ?? null;
            $userAgent = $context['user_agent'] ?? null;

            $actionLabel = self::formatActionLabel($log->tipe);
            $category = self::categorizeAction($log->tipe);
            $description = self::formatDescription($log->tipe, $log->user?->name ?? 'System', $old, $new);

            return [
                'id' => $log->id,
                'type' => $log->tipe,
                'action_label' => $actionLabel,
                'category' => $category,
                'description' => $description,
                'ip_address' => $ip,
                'url' => $url,
                'method' => $method,
                'user_agent' => $userAgent,
                'created_at_utc' => $log->created_at?->toIso8601String(),
                'created_at_wib' => $log->created_at?->timezone('Asia/Jakarta')->format('d M Y, H:i:s').' WIB',
                'time_ago' => $log->created_at?->diffForHumans(),
                'user' => $log->user ? [
                    'id' => $log->user->id,
                    'name' => $log->user->name,
                    'username' => $log->user->username,
                    'role' => $log->user->role,
                    'is_super_admin' => $log->user->isSuperAdmin(),
                ] : [
                    'id' => $log->users_id,
                    'name' => 'System',
                    'username' => 'system',
                    'role' => 'system',
                    'is_super_admin' => false,
                ],
                'old' => $old,
                'new' => $new,
            ];
        });

        return response()->json([
            'status' => 'success',
            'data' => $transformed,
            'meta' => [
                'current_page' => $paginated->currentPage(),
                'last_page' => $paginated->lastPage(),
                'per_page' => $paginated->perPage(),
                'total' => $paginated->total(),
            ],
        ]);
    }

    /**
     * Categorize log action type into UI category groups.
     */
    protected static function categorizeAction(string $type): string
    {
        $type = strtoupper($type);
        if (str_starts_with($type, 'AUTH_')) {
            return 'Authentication';
        }
        if (str_contains($type, 'APPROVAL') || str_contains($type, 'REJECT') || str_contains($type, 'UNAPPROVAL')) {
            return 'Workflow Approval';
        }
        if (str_contains($type, 'STOCK') || str_contains($type, 'ITEM_') || str_contains($type, 'BPB') || str_contains($type, 'RN')) {
            return 'Warehouse & Inventory';
        }
        if (str_starts_with($type, 'USER_') || str_contains($type, 'PERMISSION')) {
            return 'Governance & Security';
        }

        return 'Data Mutation';
    }

    /**
     * Format a raw action type string into a human-readable title.
     */
    protected static function formatActionLabel(string $type): string
    {
        $clean = str_replace('_', ' ', $type);

        return match (strtoupper($type)) {
            'AUTH_LOGIN_SUCCESS' => 'User Login Successful',
            'AUTH_LOGOUT' => 'User Logged Out',
            'AUTH_LOGIN_FAILED' => 'Failed Login Attempt',
            'AUTH_LOGIN_BLOCKED' => 'Deactivated Login Blocked',
            'AUTH_UNAUTHORIZED_ROLE_ACCESS' => 'Unauthorized Role Access Blocked',
            'AUTH_UNAUTHORIZED_PERMISSION_ACCESS' => 'Unauthorized Permission Blocked',
            'USER_CREATED', 'CREATED_USER' => 'User Account Created',
            'USER_UPDATED', 'UPDATED_USER' => 'User Profile Updated',
            'USER_DELETED', 'DELETED_USER' => 'User Account Deleted',
            'USER_ACTIVATED' => 'User Status Activated',
            'USER_DEACTIVATED' => 'User Status Deactivated',
            'USER_PERMISSIONS_UPDATED' => 'User Permissions Updated',
            'CREATED_PURCHASEREQUISITION' => 'Purchase Requisition Created',
            'UPDATED_PURCHASEREQUISITION' => 'Purchase Requisition Updated',
            'DELETED_PURCHASEREQUISITION' => 'Purchase Requisition Deleted',
            'PR_APPROVAL_STAGE_1', 'PR_APPROVAL_1' => 'PR Approved (Stage 1)',
            'PR_APPROVAL_STAGE_2', 'PR_APPROVAL_2' => 'PR Approved (Stage 2 - Final)',
            'PR_UNAPPROVAL_STAGE_1' => 'PR Stage 1 Approval Revoked',
            'PR_UNAPPROVAL_STAGE_2' => 'PR Final Approval Revoked',
            'PR_REJECT_STAGE_1' => 'Purchase Requisition Rejected',
            'CREATED_PURCHASEORDER' => 'Purchase Order Created',
            'UPDATED_PURCHASEORDER' => 'Purchase Order Updated',
            'PO_APPROVAL_1' => 'PO Approved (Stage 1)',
            'PO_APPROVAL_2' => 'PO Approved (Stage 2 - Final)',
            'CREATED_RECEIVENOTE' => 'Receive Note Created',
            'UPDATED_RECEIVENOTE' => 'Receive Note Updated',
            'RN_APPROVAL_1' => 'Receive Note Verified & Approved',
            'CREATED_BPBRECEIVEMATERIAL' => 'Receive Material (BPB) Inbounded',
            'UPDATED_BPBRECEIVEMATERIAL' => 'Receive Material (BPB) Updated',
            'BPB_APPROVAL_1' => 'BPB Approved (Stage 1)',
            'BPB_APPROVAL_2' => 'BPB Approved (Stage 2 - Final)',
            'CREATED_ITEM' => 'Master Item Created',
            'UPDATED_ITEM' => 'Master Item Updated',
            'ITEM_STOCK_ADJUSTMENT' => 'Stock Quantity Adjusted',
            'CREATED_SUPPLIER' => 'Supplier Master Created',
            default => ucwords(strtolower($clean)),
        };
    }

    /**
     * Generate clear description of the tracked activity.
     */
    protected static function formatDescription(string $type, string $userName, ?array $old, ?array $new): string
    {
        $type = strtoupper($type);

        if ($type === 'AUTH_LOGIN_SUCCESS') {
            return "{$userName} successfully authenticated and signed in.";
        }
        if ($type === 'AUTH_LOGOUT') {
            return "{$userName} terminated session and logged out.";
        }
        if ($type === 'AUTH_LOGIN_FAILED') {
            $attempt = $new['attempted_username'] ?? ($new['username'] ?? 'unknown');

            return "Failed login attempt detected for username '{$attempt}'.";
        }
        if ($type === 'AUTH_LOGIN_BLOCKED') {
            return "Deactivated account login attempt blocked for {$userName}.";
        }
        if ($type === 'USER_PERMISSIONS_UPDATED') {
            return "{$userName} updated permissions and visible sidebar navigation.";
        }
        if ($type === 'USER_ACTIVATED') {
            return "{$userName} activated a user account.";
        }
        if ($type === 'USER_DEACTIVATED') {
            return "{$userName} deactivated a user account.";
        }

        // Model updates with diff tracking
        if (str_starts_with($type, 'UPDATED_')) {
            $model = $new['model'] ?? substr($type, 8);
            $identifier = $new['identifier'] ?? ($new['id'] ?? '');
            $changes = $new['changes'] ?? [];
            if (! empty($changes)) {
                $changedFields = implode(', ', array_keys($changes));

                return "{$userName} modified {$model} '{$identifier}': updated {$changedFields}.";
            }

            return "{$userName} modified {$model} record '{$identifier}'.";
        }

        // Model creation
        if (str_starts_with($type, 'CREATED_')) {
            $model = $new['model'] ?? substr($type, 8);
            $identifier = $new['identifier'] ?? ($new['name'] ?? ($new['code'] ?? ''));

            return "{$userName} created new {$model} '{$identifier}'.";
        }

        // Model deletion
        if (str_starts_with($type, 'DELETED_')) {
            $model = $old['model'] ?? substr($type, 8);
            $identifier = $old['identifier'] ?? ($old['name'] ?? ($old['id'] ?? ''));

            return "{$userName} deleted {$model} record '{$identifier}'.";
        }

        // Approvals & workflow
        if (str_contains($type, 'APPROVAL')) {
            $docType = $new['document_type'] ?? 'Document';
            $docNum = $new['document_number'] ?? '';

            return "{$userName} executed approval for {$docType} {$docNum}.";
        }

        return "{$userName} performed {$type}.";
    }

    /**
     * Get centralized approval workflow histories across all modules.
     * GET /api/v1/admin/approval-histories
     */
    public function approvalHistories(Request $request): JsonResponse
    {
        $query = ApprovalHistory::with('user:id,name,username,role')->orderByDesc('id');

        if ($request->has('document_type') && ! empty($request->query('document_type'))) {
            $query->where('document_type', strtoupper($request->query('document_type')));
        }

        if ($request->has('action') && ! empty($request->query('action'))) {
            $query->where('action', strtoupper($request->query('action')));
        }

        if ($request->has('search') && ! empty($request->query('search'))) {
            $s = trim($request->query('search'));
            $query->where(function ($q) use ($s) {
                $q->where('document_number', 'like', "%{$s}%")
                    ->orWhere('note', 'like', "%{$s}%");
            });
        }

        $perPage = (int) $request->query('per_page', 20);
        $paginated = $query->paginate($perPage);

        return response()->json([
            'status' => 'success',
            'data' => $paginated->items(),
            'meta' => [
                'current_page' => $paginated->currentPage(),
                'last_page' => $paginated->lastPage(),
                'per_page' => $paginated->perPage(),
                'total' => $paginated->total(),
            ],
        ]);
    }
}
