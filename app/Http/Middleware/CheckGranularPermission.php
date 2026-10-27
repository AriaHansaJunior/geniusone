<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class CheckGranularPermission
{
    /**
     * Handle an incoming request.
     * Enforces granular permission check (BE-02).
     */
    public function handle(Request $request, Closure $next, string $permission): Response
    {
        $user = $request->user();

        if (!$user && auth()->check()) {
            $user = auth()->user();
        }

        if (!$user) {
            $token = $request->bearerToken() ?: $request->header('X-Auth-Token');
            if ($token) {
                $userId = \Illuminate\Support\Facades\Cache::get("api_token:{$token}")
                    ?: \App\Models\System\Auth\User::where('remember_token', $token)->value('id');
                if ($userId) {
                    $user = \App\Models\System\Auth\User::find($userId);
                }
            }
        }

        if (!$user) {
            return response()->json([
                'status' => 'error',
                'message' => 'Unauthenticated: Please log in to perform this action.',
            ], 401);
        }

        if (!$user->isActive()) {
            return response()->json([
                'status' => 'error',
                'message' => 'Forbidden: This account has been deactivated.',
            ], 403);
        }

        if (!$user->hasPermission($permission)) {
            return response()->json([
                'status' => 'error',
                'message' => "Forbidden: You do not possess the required permission '{$permission}'.",
            ], 403);
        }

        return $next($request);
    }
}
