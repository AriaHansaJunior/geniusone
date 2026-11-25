<?php

namespace App\Http\Controllers\Api\Dashboard;

use App\Http\Controllers\Controller;
use App\Services\Dashboard\DashboardService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\UnauthorizedException;

class DashboardAnalyticsApiController extends Controller
{
    public function __construct(
        private readonly DashboardService $dashboardService
    ) {}

    /**
     * GET /api/dashboard/summary (and /api/dashboard/completion-aggregation)
     * 1.1 Document Completion Aggregation scoped by user role & permissions.
     */
    public function summary(Request $request): JsonResponse
    {
        $user = $request->user();
        if (! $user) {
            return response()->json(['status' => 'error', 'message' => 'Authentication required.'], 401);
        }

        $modulesParam = $request->query('modules');
        $requestedModules = null;
        if (is_string($modulesParam) && trim($modulesParam) !== '') {
            $requestedModules = array_values(array_filter(array_map('trim', explode(',', $modulesParam))));
        } elseif (is_array($modulesParam) && ! empty($modulesParam)) {
            $requestedModules = $modulesParam;
        }

        try {
            $data = $this->dashboardService->getCompletionAggregation($user, $requestedModules);

            return response()->json([
                'status' => 'success',
                'data' => $data,
            ]);
        } catch (UnauthorizedException $e) {
            return response()->json([
                'status' => 'error',
                'message' => $e->getMessage(),
            ], 403);
        }
    }

    /**
     * GET /api/dashboard/tracking
     * 1.2 Document Tracking for the authenticated user (or cross-user strictly for admins).
     */
    public function tracking(Request $request): JsonResponse
    {
        $user = $request->user();
        if (! $user) {
            return response()->json(['status' => 'error', 'message' => 'Authentication required.'], 401);
        }

        try {
            $result = $this->dashboardService->getDocumentTracking($user, [
                'document_type' => $request->query('document_type'),
                'status' => $request->query('status'),
                'search' => $request->query('search'),
                'scope' => $request->query('scope', 'own'),
                'creator_id' => $request->query('creator_id'),
                'per_page' => $request->query('per_page', 50),
                'page' => $request->query('page', 1),
            ]);

            return response()->json([
                'status' => 'success',
                'rows' => $result['rows'],
                'meta' => $result['meta'],
            ]);
        } catch (UnauthorizedException $e) {
            return response()->json([
                'status' => 'error',
                'message' => $e->getMessage(),
            ], 403);
        }
    }

    /**
     * GET /api/dashboard/overview
     * 1.3 Role-based Dashboard combining aggregation, user tracking, and authorized alerts.
     */
    public function overview(Request $request): JsonResponse
    {
        $user = $request->user();
        if (! $user) {
            return response()->json(['status' => 'error', 'message' => 'Authentication required.'], 401);
        }

        $data = $this->dashboardService->getRoleOverview($user);

        return response()->json([
            'status' => 'success',
            'data' => $data,
        ]);
    }
}
