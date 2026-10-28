<?php

namespace App\Http\Middleware;

use App\Models\System\Auth\User;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Symfony\Component\HttpFoundation\Response;

class EnsureSuperAdmin
{
    /**
     * Handle an incoming request.
     * Restricts access strictly to SuperAdmin users (BE-01).
     */
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (! $user && auth()->check()) {
            $user = auth()->user();
        }

        if (! $user) {
            $token = $request->bearerToken() ?: $request->header('X-Auth-Token');
            if ($token) {
                $userId = Cache::get("api_token:{$token}")
                    ?: User::where('remember_token', $token)->value('id');
                if ($userId) {
                    $user = User::find($userId);
                }
            }
        }

        if (! $user) {
            return response()->json([
                'status' => 'error',
                'message' => 'Unauthenticated: Please log in to access this resource.',
            ], 401);
        }

        if (! $user->isActive()) {
            return response()->json([
                'status' => 'error',
                'message' => 'Forbidden: This account has been deactivated.',
            ], 403);
        }

        if (! $user->isSuperAdmin() && $user->role !== 'superadmin') {
            return response()->json([
                'status' => 'error',
                'message' => 'Unauthorized: This action is strictly reserved for SuperAdmin authority.',
            ], 403);
        }

        return $next($request);
    }
}
