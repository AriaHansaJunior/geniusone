<?php

namespace App\Http\Controllers\Api\Auth;

use App\Http\Controllers\Controller;
use App\Models\System\Auth\User;
use App\Services\AuditLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class AuthApiController extends Controller
{
    /**
     * Authenticate user credentials and start session.
     */
    public function login(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'username' => 'required|string',
            'password' => 'required|string',
        ]);

        $loginInput = trim($validated['username']);
        $password = $validated['password'];

        $user = User::where('username', $loginInput)
            ->orWhere('email', $loginInput)
            ->first();

        if (! $user) {
            AuditLogger::logAuth('LOGIN_FAILED', null, [
                'attempted_username' => $loginInput,
                'reason' => 'User account not found',
                'ip' => $request->ip(),
            ]);

            return response()->json([
                'status' => 'error',
                'message' => 'User account not found with the provided credentials.',
            ], 401);
        }

        // Validate password against hashed password or plain fallback for initial seed
        $passwordValid = Hash::check($password, $user->password) || $user->password === $password;

        if (! $passwordValid) {
            AuditLogger::logAuth('LOGIN_FAILED', $user->id, [
                'username' => $user->username,
                'reason' => 'Invalid password credentials',
                'ip' => $request->ip(),
            ]);

            return response()->json([
                'status' => 'error',
                'message' => 'Invalid username or password.',
            ], 401);
        }

        if (isset($user->status) && (int) $user->status === 0) {
            AuditLogger::logAuth('LOGIN_BLOCKED', $user->id, [
                'username' => $user->username,
                'reason' => 'Account is deactivated',
                'ip' => $request->ip(),
            ]);

            return response()->json([
                'status' => 'error',
                'message' => 'This account has been deactivated. Please contact your administrator.',
            ], 403);
        }

        // Establish real authenticated session
        Auth::login($user, true);
        if ($request->hasSession()) {
            $request->session()->regenerate();
        }

        // Record successful login audit log
        AuditLogger::logAuth('LOGIN_SUCCESS', $user->id, [
            'username' => $user->username,
            'name' => $user->name,
            'role' => $user->role,
            'ip' => $request->ip(),
        ]);

        // Generate stateless API Bearer token
        $token = Str::random(60);
        Cache::put("api_token:{$token}", $user->id, now()->addDays(30));
        $user->update(['remember_token' => $token]);

        return response()->json([
            'status' => 'success',
            'message' => 'Login successful',
            'data' => [
                'token' => $token,
                'user' => [
                    'id' => $user->id,
                    'name' => $user->name,
                    'username' => $user->username,
                    'email' => $user->email,
                    'role' => $user->role ?? User::ROLE_ADMIN,
                    'role_label' => $user->roleModel?->label ?? ucfirst($user->role),
                    'is_super_admin' => $user->isSuperAdmin(),
                    'permissions' => $user->getAllPermissions(),
                    'sidebar_permissions' => $user->sidebar_permissions,
                    'photo' => $user->photo,
                ],
            ],
        ]);
    }

    /**
     * Terminate user session and revoke token.
     */
    public function logout(Request $request): JsonResponse
    {
        $token = $request->bearerToken() ?: $request->header('X-Auth-Token');
        if ($token) {
            Cache::forget("api_token:{$token}");
        }

        $user = $request->user() ?: Auth::user();
        if ($user) {
            AuditLogger::logAuth('LOGOUT', $user->id, [
                'username' => $user->username,
                'name' => $user->name,
                'ip' => $request->ip(),
            ]);
            $user->update(['remember_token' => null]);
        }

        Auth::logout();

        if ($request->hasSession()) {
            $request->session()->invalidate();
            $request->session()->regenerateToken();
        }

        return response()->json([
            'status' => 'success',
            'message' => 'Logged out successfully',
        ]);
    }

    /**
     * Get current authenticated user details.
     */
    public function me(Request $request): JsonResponse
    {
        $user = $request->user() ?: Auth::user();

        if (! $user) {
            return response()->json([
                'status' => 'error',
                'message' => 'Unauthenticated.',
            ], 401);
        }

        return response()->json([
            'status' => 'success',
            'data' => [
                'id' => $user->id,
                'name' => $user->name,
                'username' => $user->username,
                'email' => $user->email,
                'role' => $user->role ?? User::ROLE_ADMIN,
                'role_label' => $user->roleModel?->label ?? ucfirst($user->role),
                'is_super_admin' => $user->isSuperAdmin(),
                'permissions' => $user->getAllPermissions(),
                'sidebar_permissions' => $user->sidebar_permissions,
                'photo' => $user->photo,
            ],
        ]);
    }

    /**
     * List active users for assignment and administration.
     */
    public function users(): JsonResponse
    {
        $users = User::where('status', 1)
            ->with('roleModel')
            ->select('id', 'name', 'username', 'email', 'role', 'status')
            ->get()
            ->map(fn ($u) => [
                'id' => $u->id,
                'name' => $u->name,
                'username' => $u->username,
                'email' => $u->email,
                'role' => $u->roleModel?->label ?? ucfirst($u->role),
                'role_code' => $u->role,
                'is_super_admin' => $u->isSuperAdmin(),
            ]);

        return response()->json([
            'status' => 'success',
            'data' => $users,
        ]);
    }
}
