<?php

namespace App\Http\Middleware;

use App\Services\AuditLogger;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

class EnsureUserPermission
{
    /**
     * Handle an incoming request.
     *
     * @param  Closure(Request): (Response)  $next
     */
    public function handle(Request $request, Closure $next, string $permission): Response
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

        if (! $user->hasPermission($permission)) {
            AuditLogger::logAuth(
                event: 'UNAUTHORIZED_PERMISSION_ACCESS',
                userId: $user->id,
                details: [
                    'required_permission' => $permission,
                    'user_role' => $user->role,
                    'url' => $request->fullUrl(),
                    'method' => $request->method(),
                    'ip' => $request->ip(),
                ]
            );

            if ($request->expectsJson() || $request->is('api/*') || $request->header('X-Inertia')) {
                return response()->json([
                    'error' => 'Forbidden',
                    'message' => "Access denied. Required permission: '{$permission}'.",
                    'required_permission' => $permission,
                ], 403);
            }

            abort(403, "Access denied. Required permission: '{$permission}'.");
        }

        return $next($request);
    }
}
