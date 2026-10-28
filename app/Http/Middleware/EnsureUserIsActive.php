<?php

namespace App\Http\Middleware;

use App\Services\AuditLogger;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

class EnsureUserIsActive
{
    /**
     * Handle an incoming request.
     *
     * @param  Closure(Request): (Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $user = Auth::user();

        if ($user && ! $user->isActive()) {
            AuditLogger::logAuth(
                event: 'DEACTIVATED_USER_BLOCKED',
                userId: $user->id,
                details: [
                    'ip' => $request->ip(),
                    'url' => $request->fullUrl(),
                    'user_agent' => $request->header('User-Agent'),
                ]
            );

            // Log out suspended user and invalidate active session
            Auth::logout();
            if ($request->hasSession()) {
                $request->session()->invalidate();
                $request->session()->regenerateToken();
            }

            if ($request->expectsJson() || $request->is('api/*') || $request->header('X-Inertia')) {
                return response()->json([
                    'error' => 'Account Deactivated',
                    'message' => 'Your account is currently deactivated. Please contact your system administrator.',
                ], 403);
            }

            return redirect('/login')->withErrors([
                'email' => 'Your account has been deactivated. Please contact an administrator.',
            ]);
        }

        return $next($request);
    }
}
