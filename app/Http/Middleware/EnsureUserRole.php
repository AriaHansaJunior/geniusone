<?php

namespace App\Http\Middleware;

use App\Services\AuditLogger;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

class EnsureUserRole
{
    /**
     * Handle an incoming request.
     *
     * @param  Closure(Request): (Response)  $next
     * @param  string  ...$roles
     */
    public function handle(Request $request, Closure $next, ...$roles): Response
    {
        $user = Auth::user();

        if (! $user) {
            if ($request->expectsJson() || $request->is('api/*') || $request->header('X-Inertia')) {
                return response()->json([
                    'error' => 'Unauthenticated',
                    'message' => 'Please login to continue.',
                ], 401);
            }

            return redirect()->guest('/login');
        }

        // Check if user possesses at least one of the permitted roles
        if (! $user->hasRole($roles)) {
            AuditLogger::logAuth(
                event: 'UNAUTHORIZED_ROLE_ACCESS',
                userId: $user->id,
                details: [
                    'required_roles' => $roles,
                    'user_role' => $user->role,
                    'url' => $request->fullUrl(),
                    'method' => $request->method(),
                    'ip' => $request->ip(),
                ]
            );

            if ($request->expectsJson() || $request->is('api/*') || $request->header('X-Inertia')) {
                return response()->json([
                    'error' => 'Forbidden',
                    'message' => 'Access denied. You do not have the required role to access this module.',
                    'required_roles' => $roles,
                ], 403);
            }

            abort(403, 'Access denied. You do not have permission to view this page.');
        }

        return $next($request);
    }
}
