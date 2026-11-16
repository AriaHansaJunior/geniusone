<?php

namespace App\Http\Middleware;

use App\Models\System\Auth\User;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Cache;
use Symfony\Component\HttpFoundation\Response;

class AuthenticateApiRequest
{
    /**
     * Resolve the authenticated user from session or Bearer token for API requests.
     */
    public function handle(Request $request, Closure $next): Response
    {
        // 1. If already authenticated via session
        if (Auth::check()) {
            return $next($request);
        }

        // 2. Check Bearer token or X-Auth-Token
        $token = $request->bearerToken() ?: $request->header('X-Auth-Token');
        if ($token && ! in_array($token, ['null', 'undefined', '[object Object]'], true)) {
            $user = null;
            $userId = Cache::get("api_token:{$token}");

            if ($userId) {
                $user = User::find($userId);
            } else {
                $user = User::where('remember_token', $token)->first();
                if ($user) {
                    Cache::put("api_token:{$token}", $user->id, now()->addDays(30));
                }
            }

            if ($user && $user->isActive()) {
                Auth::setUser($user);
                $request->setUserResolver(fn () => $user);
            }
        }

        return $next($request);
    }
}
