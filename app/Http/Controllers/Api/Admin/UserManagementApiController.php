<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\System\Auth\User;
use App\Services\Governance\UserManagementService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/**
 * SuperAdmin User Account Management API Controller.
 * Implements BE-01.
 */
class UserManagementApiController extends Controller
{
    protected UserManagementService $userService;

    public function __construct(UserManagementService $userService)
    {
        $this->userService = $userService;
    }

    /**
     * List all users with pagination and filters.
     * GET /api/v1/admin/users
     */
    public function index(Request $request): JsonResponse
    {
        $filters = [
            'search' => $request->query('search'),
            'role' => $request->query('role'),
            'status' => $request->query('status'),
            'departments_id' => $request->query('department_id') ?? $request->query('departments_id'),
        ];

        $perPage = (int) $request->query('per_page', 15);
        $paginated = $this->userService->listUsers($filters, $perPage);

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
     * Create a new user account.
     * POST /api/v1/admin/users
     */
    public function store(Request $request): JsonResponse
    {
        if ($request->has('department_id') && ! $request->has('departments_id')) {
            $request->merge(['departments_id' => $request->input('department_id')]);
        }

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'username' => 'required|string|max:50|unique:users,username',
            'email' => 'required|email|max:255|unique:users,email',
            'password' => 'required|string|min:6',
            'role' => 'required|string|max:50',
            'departments_id' => 'nullable|integer',
            'status' => 'nullable|integer|in:0,1',
            'permissions' => 'nullable|array',
            'permissions.*' => 'string',
            'sidebar_permissions' => 'nullable|array',
        ]);

        $actorId = $request->user()?->id ?? 1;
        $user = $this->userService->createUser($validated, $actorId);

        return response()->json([
            'status' => 'success',
            'message' => "User '{$user->username}' created successfully.",
            'data' => $user,
        ], 201);
    }

    /**
     * Show single user details.
     * GET /api/v1/admin/users/{id}
     */
    public function show(int $id): JsonResponse
    {
        $user = User::with(['department', 'roleModel', 'directPermissions'])->findOrFail($id);

        return response()->json([
            'status' => 'success',
            'data' => [
                'id' => $user->id,
                'name' => $user->name,
                'username' => $user->username,
                'email' => $user->email,
                'role' => $user->role,
                'status' => $user->status,
                'department' => $user->department ? [
                    'id' => $user->department->id,
                    'name' => $user->department->name,
                ] : null,
                'permissions' => $user->getAllPermissions(),
                'sidebar_permissions' => $user->sidebar_permissions,
                'createdAt' => $user->created_at?->format('Y-m-d H:i:s'),
            ],
        ]);
    }

    /**
     * Update an existing user.
     * PUT /api/v1/admin/users/{id}
     */
    public function update(Request $request, int $id): JsonResponse
    {
        $user = User::findOrFail($id);

        if ($request->has('department_id') && ! $request->has('departments_id')) {
            $request->merge(['departments_id' => $request->input('department_id')]);
        }

        $validated = $request->validate([
            'name' => 'sometimes|required|string|max:255',
            'username' => ['sometimes', 'required', 'string', 'max:50', Rule::unique('users', 'username')->ignore($user->id)],
            'email' => ['sometimes', 'required', 'email', 'max:255', Rule::unique('users', 'email')->ignore($user->id)],
            'password' => 'nullable|string|min:6',
            'role' => 'sometimes|required|string|max:50',
            'departments_id' => 'nullable|integer',
            'status' => 'nullable|integer|in:0,1',
            'permissions' => 'nullable|array',
            'permissions.*' => 'string',
            'sidebar_permissions' => 'nullable|array',
        ]);

        $actorId = $request->user()?->id ?? 1;
        $updatedUser = $this->userService->updateUser($id, $validated, $actorId);

        return response()->json([
            'status' => 'success',
            'message' => "User '{$updatedUser->username}' updated successfully.",
            'data' => $updatedUser,
        ]);
    }

    /**
     * Update user sidebar and action permissions.
     * POST /api/admin/users/{id}/permissions
     */
    public function updatePermissions(Request $request, int $id): JsonResponse
    {
        $validated = $request->validate([
            'permissions' => 'nullable|array',
            'sidebar_permissions' => 'nullable|array',
        ]);

        $actorId = $request->user()?->id ?? 1;
        $updatedUser = $this->userService->updateUserPermissions(
            $id,
            $validated['permissions'] ?? [],
            $validated['sidebar_permissions'] ?? null,
            $actorId
        );

        return response()->json([
            'status' => 'success',
            'message' => "Permissions for user '{$updatedUser->username}' updated successfully.",
            'data' => [
                'id' => $updatedUser->id,
                'username' => $updatedUser->username,
                'permissions' => $updatedUser->getAllPermissions(),
                'sidebar_permissions' => $updatedUser->sidebar_permissions,
            ],
        ]);
    }

    /**
     * Toggle active status.
     * PATCH /api/v1/admin/users/{id}/toggle-status
     */
    public function toggleStatus(Request $request, int $id): JsonResponse
    {
        $actorId = $request->user()?->id ?? 1;
        $user = $this->userService->toggleStatus($id, $actorId);

        $statusLabel = $user->status === 1 ? 'activated' : 'deactivated';

        return response()->json([
            'status' => 'success',
            'message' => "User '{$user->username}' has been {$statusLabel}.",
            'data' => [
                'id' => $user->id,
                'status' => $user->status,
                'statusLabel' => $statusLabel,
            ],
        ]);
    }

    /**
     * Reset user password.
     * POST /api/v1/admin/users/{id}/reset-password
     */
    public function resetPassword(Request $request, int $id): JsonResponse
    {
        $validated = $request->validate([
            'password' => 'required|string|min:6',
        ]);

        $actorId = $request->user()?->id ?? 1;
        $this->userService->resetPassword($id, $validated['password'], $actorId);

        return response()->json([
            'status' => 'success',
            'message' => "Password reset successfully for user ID {$id}.",
        ]);
    }

    /**
     * Delete user account.
     * DELETE /api/v1/admin/users/{id}
     */
    public function destroy(Request $request, int $id): JsonResponse
    {
        $actorId = $request->user()?->id ?? 1;
        $this->userService->deleteUser($id, $actorId);

        return response()->json([
            'status' => 'success',
            'message' => "User ID {$id} has been deleted successfully.",
        ]);
    }
}
