<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Cache;
use App\Models\System\Auth\User;
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
        if ($token) {
            $userId = Cache::get("api_token:{$token}")
                ?: User::where('remember_token', $token)->value('id');

            if ($userId) {
                $user = User::find($userId);
                if ($user && $user->isActive()) {
                    Auth::setUser($user);
                    $request->setUserResolver(fn() => $user);
                }
            }
        }

        return $next($request);
    }
}
