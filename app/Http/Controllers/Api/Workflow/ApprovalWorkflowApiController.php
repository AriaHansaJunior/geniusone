<?php

namespace App\Http\Controllers\Api\Workflow;

use App\Http\Controllers\Controller;
use App\Models\System\Auth\User;
use App\Models\System\Governance\ApprovalHistory;
use App\Services\AuditLogger;
use App\Services\Workflow\DocumentApprovalWorkflowService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Throwable;

/**
 * Unified Approval Workflow API Controller.
 * Implements BE-03, BE-04, BE-05, and BE-06.
 */
class ApprovalWorkflowApiController extends Controller
{
    protected DocumentApprovalWorkflowService $workflowService;

    public function __construct(DocumentApprovalWorkflowService $workflowService)
    {
        $this->workflowService = $workflowService;
    }

    protected function resolveUserId(Request $request): int
    {
        if ($request->user()) {
            return (int) $request->user()->id;
        }

        $headerId = $request->header('X-User-Id');
        if ($headerId && is_numeric($headerId)) {
            return (int) $headerId;
        }

        $inputId = $request->input('user_id');
        if ($inputId && is_numeric($inputId)) {
            return (int) $inputId;
        }

        return 1;
    }

    protected function resolveModuleAndId(Request $request, $module, $id): array
    {
        $resolvedModule = $request->route('module') ?? $module;
        $resolvedId = $request->route('id') ?? $id;

        // If module was swapped with id (e.g. route had only {id} with defaults)
        if (is_numeric($resolvedModule) && (! is_numeric($resolvedId) || empty($resolvedId))) {
            $temp = $resolvedModule;
            $resolvedModule = $resolvedId ?: $request->route('module');
            $resolvedId = $temp;
        }

        // Also check if module can be inferred from URL path
        if (empty($resolvedModule) || is_numeric($resolvedModule)) {
            $path = $request->path();
            if (preg_match('#(?:^|/)(pr|po|rn|bpb|warehouse|request-materials|returns)(?:/|$)#i', $path, $m)) {
                $resolvedModule = strtolower($m[1]);
            }
        }

        return [(string) $resolvedModule, $resolvedId];
    }

    /**
     * BE-03: Approve a document (Tier 1 or Tier 2).
     * POST /api/v1/approval/{module}/{id}/approve
     */
    public function approve(Request $request, string $module = '', $id = null): JsonResponse
    {
        [$module, $id] = $this->resolveModuleAndId($request, $module, $id);

        $validated = $request->validate([
            'tier' => 'nullable|integer|in:1,2',
            'note' => 'nullable|string|max:500',
            'user_id' => 'nullable|integer',
        ]);

        $tier = (int) ($validated['tier'] ?? 1);
        $note = $validated['note'] ?? null;
        $userId = $this->resolveUserId($request);

        try {
            $updatedDoc = $this->workflowService->approve($module, $id, $userId, $tier, $note);
            $newStatus = $this->workflowService->getDocumentStatus($updatedDoc);

            return response()->json([
                'status' => 'success',
                'message' => strtoupper($module)." Stage {$tier} approved successfully. Current status: '{$newStatus}'.",
                'data' => [
                    'id' => $updatedDoc->id,
                    'module' => strtoupper($module),
                    'status' => $newStatus,
                    'tier' => $tier,
                    'updatedAt' => $updatedDoc->updated_at?->format('Y-m-d H:i:s'),
                ],
            ]);
        } catch (Throwable $e) {
            return response()->json([
                'status' => 'error',
                'message' => $e->getMessage(),
            ], 422);
        }
    }

    /**
     * BE-04: UnApprove a document (Rollback Tier 1 or Tier 2).
     * POST /api/v1/approval/{module}/{id}/unapprove
     */
    public function unapprove(Request $request, string $module = '', $id = null): JsonResponse
    {
        [$module, $id] = $this->resolveModuleAndId($request, $module, $id);

        $validated = $request->validate([
            'tier' => 'nullable|integer|in:1,2',
            'reason' => 'nullable|string|max:500',
            'user_id' => 'nullable|integer',
        ]);

        $tier = (int) ($validated['tier'] ?? 1);
        $reason = $validated['reason'] ?? null;
        $userId = $this->resolveUserId($request);

        try {
            $updatedDoc = $this->workflowService->unapprove($module, $id, $userId, $tier, $reason);
            $newStatus = $this->workflowService->getDocumentStatus($updatedDoc);

            return response()->json([
                'status' => 'success',
                'message' => strtoupper($module)." Stage {$tier} unapproved successfully. Status reverted to: '{$newStatus}'.",
                'data' => [
                    'id' => $updatedDoc->id,
                    'module' => strtoupper($module),
                    'status' => $newStatus,
                    'tier' => $tier,
                    'updatedAt' => $updatedDoc->updated_at?->format('Y-m-d H:i:s'),
                ],
            ]);
        } catch (Throwable $e) {
            return response()->json([
                'status' => 'error',
                'message' => $e->getMessage(),
            ], 422);
        }
    }

    /**
     * BE-04: Reject a document with mandatory reason.
     * POST /api/v1/approval/{module}/{id}/reject
     */
    public function reject(Request $request, string $module = '', $id = null): JsonResponse
    {
        [$module, $id] = $this->resolveModuleAndId($request, $module, $id);

        $validated = $request->validate([
            'tier' => 'nullable|integer|in:1,2',
            'reason' => 'required|string|min:3|max:1000',
            'user_id' => 'nullable|integer',
        ], [
            'reason.required' => 'A reason is mandatory when rejecting a document for revision.',
            'reason.min' => 'Rejection reason must be at least 3 characters.',
        ]);

        $tier = (int) ($validated['tier'] ?? 1);
        $reason = $validated['reason'];
        $userId = $this->resolveUserId($request);

        try {
            $updatedDoc = $this->workflowService->reject($module, $id, $userId, $tier, $reason);
            $newStatus = $this->workflowService->getDocumentStatus($updatedDoc);

            return response()->json([
                'status' => 'success',
                'message' => strtoupper($module)." rejected and returned for revision. Status: '{$newStatus}'.",
                'data' => [
                    'id' => $updatedDoc->id,
                    'module' => strtoupper($module),
                    'status' => $newStatus,
                    'rejectionReason' => $reason,
                    'updatedAt' => $updatedDoc->updated_at?->format('Y-m-d H:i:s'),
                ],
            ]);
        } catch (Throwable $e) {
            return response()->json([
                'status' => 'error',
                'message' => $e->getMessage(),
            ], 422);
        }
    }

    /**
     * BE-04: Resubmit a document after revision.
     * POST /api/v1/approval/{module}/{id}/resubmit
     */
    public function resubmit(Request $request, string $module = '', $id = null): JsonResponse
    {
        [$module, $id] = $this->resolveModuleAndId($request, $module, $id);

        $validated = $request->validate([
            'note' => 'nullable|string|max:500',
            'user_id' => 'nullable|integer',
        ]);

        $userId = $this->resolveUserId($request);

        try {
            $updatedDoc = $this->workflowService->resubmit($module, $id, $userId, $validated['note'] ?? null);
            $newStatus = $this->workflowService->getDocumentStatus($updatedDoc);

            return response()->json([
                'status' => 'success',
                'message' => strtoupper($module)." resubmitted for approval. Status: '{$newStatus}'.",
                'data' => [
                    'id' => $updatedDoc->id,
                    'module' => strtoupper($module),
                    'status' => $newStatus,
                    'updatedAt' => $updatedDoc->updated_at?->format('Y-m-d H:i:s'),
                ],
            ]);
        } catch (Throwable $e) {
            return response()->json([
                'status' => 'error',
                'message' => $e->getMessage(),
            ], 422);
        }
    }

    /**
     * BE-04: Record document activity (e.g. printed, revised, closed_item, unclosed_item).
     * POST /api/approval/{module}/{id}/activity
     */
    public function recordActivity(Request $request, string $module = '', $id = null): JsonResponse
    {
        [$module, $id] = $this->resolveModuleAndId($request, $module, $id);

        $validated = $request->validate([
            'action' => 'required|string|max:100',
            'note' => 'nullable|string|max:1000',
            'tier' => 'nullable|integer',
            'user_id' => 'nullable|integer',
            'documentNumber' => 'nullable|string|max:100',
            'metadata' => 'nullable|array',
        ]);

        $userId = $this->resolveUserId($request);
        $user = User::find($userId) ?? User::first();
        $action = strtoupper(trim($validated['action']));
        $note = $validated['note'] ?? null;
        $tier = (int) ($validated['tier'] ?? 1);

        try {
            $doc = $this->workflowService->resolveDocument($module, $id);
            $normKey = $this->workflowService->normalizeModuleKey($module);
            $currentStatus = $this->workflowService->getDocumentStatus($doc);
            $docNumber = $validated['documentNumber'] ?? $this->workflowService->getDocumentNumber($doc);

            $actorName = $user?->name ?? 'System User';
            $actorRole = $user?->role ?? 'User';

            $history = ApprovalHistory::create([
                'document_type' => $normKey,
                'document_id' => $doc->id,
                'document_number' => $docNumber,
                'user_id' => $user?->id ?? 1,
                'action' => $action,
                'tier' => $tier,
                'from_status' => $currentStatus,
                'to_status' => $currentStatus,
                'note' => $note ?? "{$action} by {$actorName}",
                'metadata' => array_merge([
                    'actor_name' => $actorName,
                    'actor_role' => $actorRole,
                    'recorded_at' => now()->toIso8601String(),
                ], $validated['metadata'] ?? []),
            ]);

            AuditLogger::logWorkflow(
                documentType: $normKey,
                documentNumber: $docNumber,
                action: $action,
                fromStatus: $currentStatus,
                toStatus: $currentStatus,
                userId: $user?->id ?? 1,
                extra: ['note' => $note, 'tier' => $tier]
            );

            return response()->json([
                'status' => 'success',
                'message' => "Activity '{$action}' recorded successfully.",
                'data' => [
                    'id' => $history->id,
                    'action' => $action,
                    'documentNumber' => $docNumber,
                    'actor' => $actorName,
                    'timestamp' => $history->created_at?->format('d-M-Y H:i'),
                ],
            ], 201);
        } catch (Throwable $e) {
            return response()->json([
                'status' => 'error',
                'message' => $e->getMessage(),
            ], 422);
        }
    }

    /**
     * BE-06: Retrieve complete approval audit trail history for a document.
     * GET /api/v1/approval/{module}/{id}/history
     */
    public function history(Request $request, string $module = '', $id = null): JsonResponse
    {
        [$module, $id] = $this->resolveModuleAndId($request, $module, $id);

        try {
            $history = $this->workflowService->getApprovalHistory($module, $id);

            return response()->json([
                'status' => 'success',
                'data' => $history,
            ]);
        } catch (Throwable $e) {
            return response()->json([
                'status' => 'error',
                'message' => $e->getMessage(),
            ], 404);
        }
    }
}
