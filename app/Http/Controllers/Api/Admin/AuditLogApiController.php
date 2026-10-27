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
     * GET /api/v1/admin/audit-logs
     */
    public function index(Request $request): JsonResponse
    {
        $query = Log::with('user:id,name,username,role')->orderByDesc('id');

        if ($request->has('user_id') && is_numeric($request->query('user_id'))) {
            $query->where('users_id', (int) $request->query('user_id'));
        }

        if ($request->has('type') && !empty($request->query('type'))) {
            $query->where('tipe', 'like', "%{$request->query('type')}%");
        }

        if ($request->has('search') && !empty($request->query('search'))) {
            $s = trim($request->query('search'));
            $query->where(function ($q) use ($s) {
                $q->where('tipe', 'like', "%{$s}%")
                  ->orWhereHas('user', fn($uq) => $uq->where('name', 'like', "%{$s}%")->orWhere('username', 'like', "%{$s}%"));
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

    /**
     * Get centralized approval workflow histories across all modules.
     * GET /api/v1/admin/approval-histories
     */
    public function approvalHistories(Request $request): JsonResponse
    {
        $query = ApprovalHistory::with('user:id,name,username,role')->orderByDesc('id');

        if ($request->has('document_type') && !empty($request->query('document_type'))) {
            $query->where('document_type', strtoupper($request->query('document_type')));
        }

        if ($request->has('action') && !empty($request->query('action'))) {
            $query->where('action', strtoupper($request->query('action')));
        }

        if ($request->has('search') && !empty($request->query('search'))) {
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
