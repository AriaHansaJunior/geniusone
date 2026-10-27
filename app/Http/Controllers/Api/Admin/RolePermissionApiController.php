<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Services\Governance\PermissionManagementService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Granular Permission & Role Management API Controller.
 * Implements BE-02.
 */
class RolePermissionApiController extends Controller
{
    protected PermissionManagementService $permissionService;

    public function __construct(PermissionManagementService $permissionService)
    {
        $this->permissionService = $permissionService;
    }

    /**
     * List all roles with attached permissions.
     * GET /api/v1/admin/roles
     */
    public function listRoles(): JsonResponse
    {
        $roles = $this->permissionService->listRoles();

        return response()->json([
            'status' => 'success',
            'data' => $roles,
        ]);
    }

    /**
     * Create a new custom role.
     * POST /api/v1/admin/roles
     */
    public function storeRole(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:50|unique:roles,name',
            'label' => 'nullable|string|max:100',
            'description' => 'nullable|string|max:255',
            'permissions' => 'nullable|array',
            'permissions.*' => 'string',
        ]);

        $actorId = $request->user()?->id ?? 1;
        $role = $this->permissionService->createRole($validated, $actorId);

        return response()->json([
            'status' => 'success',
            'message' => "Role '{$role->name}' created successfully.",
            'data' => $role,
        ], 201);
    }

    /**
     * Update an existing role.
     * PUT /api/v1/admin/roles/{id}
     */
    public function updateRole(Request $request, int $id): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'sometimes|required|string|max:50',
            'label' => 'nullable|string|max:100',
            'description' => 'nullable|string|max:255',
            'permissions' => 'nullable|array',
            'permissions.*' => 'string',
        ]);

        $actorId = $request->user()?->id ?? 1;
        $role = $this->permissionService->updateRole($id, $validated, $actorId);

        return response()->json([
            'status' => 'success',
            'message' => "Role '{$role->name}' updated successfully.",
            'data' => $role,
        ]);
    }

    /**
     * Delete custom role.
     * DELETE /api/v1/admin/roles/{id}
     */
    public function destroyRole(Request $request, int $id): JsonResponse
    {
        $actorId = $request->user()?->id ?? 1;
        $this->permissionService->deleteRole($id, $actorId);

        return response()->json([
            'status' => 'success',
            'message' => "Role ID {$id} has been deleted successfully.",
        ]);
    }

    /**
     * List all granular permissions grouped by module.
     * GET /api/v1/admin/permissions
     */
    public function listPermissions(): JsonResponse
    {
        $grouped = $this->permissionService->listPermissionsGrouped();

        return response()->json([
            'status' => 'success',
            'data' => $grouped,
        ]);
    }

    /**
     * Get complete Permission Matrix representation for tabular UI.
     * GET /api/v1/admin/permission-matrix
     */
    public function permissionMatrix(): JsonResponse
    {
        $matrix = $this->permissionService->getPermissionMatrix();

        return response()->json([
            'status' => 'success',
            'data' => $matrix,
        ]);
    }

    /**
     * Batch update permissions assigned to a role.
     * POST /api/v1/admin/roles/{id}/permissions
     */
    public function updateRolePermissions(Request $request, int $id): JsonResponse
    {
        $validated = $request->validate([
            'permissions' => 'required|array',
            'permissions.*' => 'string',
        ]);

        $actorId = $request->user()?->id ?? 1;
        $role = $this->permissionService->updateRolePermissions($id, $validated['permissions'], $actorId);

        return response()->json([
            'status' => 'success',
            'message' => "Permissions for role '{$role->name}' updated successfully.",
            'data' => $role,
        ]);
    }
}
