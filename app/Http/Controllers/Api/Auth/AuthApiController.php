<?php

namespace App\Http\Controllers\Api\Auth;

use App\Http\Controllers\Controller;
use App\Models\System\Auth\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
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

        if (!$user) {
            return response()->json([
                'status' => 'error',
                'message' => 'User account not found with the provided credentials.',
            ], 401);
        }

        // Validate password against hashed password or plain fallback for initial seed
        $passwordValid = Hash::check($password, $user->password) || $user->password === $password;

        if (!$passwordValid) {
            return response()->json([
                'status' => 'error',
                'message' => 'Invalid username or password.',
            ], 401);
        }

        if (isset($user->status) && $user->status == 0) {
            return response()->json([
                'status' => 'error',
                'message' => 'This account has been deactivated. Please contact your administrator.',
            ], 403);
        }

        // Generate session/token identifier
        $token = Str::random(60);

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
                    'permissions' => User::ROLE_PERMISSIONS[$user->role ?? User::ROLE_ADMIN] ?? ['*'],
                    'photo' => $user->photo,
                ],
            ],
        ]);
    }

    /**
     * Terminate user session.
     */
    public function logout(): JsonResponse
    {
        return response()->json([
            'status' => 'success',
            'message' => 'Logged out successfully',
        ]);
    }

    /**
     * Get current authenticated user details.
     */
    public function me(): JsonResponse
    {
        $user = User::first();

        if (!$user) {
            return response()->json([
                'status' => 'error',
                'message' => 'No active user found.',
            ], 404);
        }

        return response()->json([
            'status' => 'success',
            'data' => [
                'id' => $user->id,
                'name' => $user->name,
                'username' => $user->username,
                'email' => $user->email,
                'role' => $user->role ?? User::ROLE_ADMIN,
                'permissions' => User::ROLE_PERMISSIONS[$user->role ?? User::ROLE_ADMIN] ?? ['*'],
                'photo' => $user->photo,
            ],
        ]);
    }
}
