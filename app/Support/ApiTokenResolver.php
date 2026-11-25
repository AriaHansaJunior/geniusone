<?php

namespace App\Support;

use App\Models\System\Auth\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;

class ApiTokenResolver
{
    public const CACHE_PREFIX = 'api_token:';

    public const TTL_DAYS = 30;

    /**
     * Hash a plaintext bearer token with SHA-256 for server-side cache and DB lookups.
     */
    public static function hashToken(string $plainToken): string
    {
        return hash('sha256', $plainToken);
    }

    /**
     * Cache key for a hashed bearer token.
     */
    public static function cacheKey(string $tokenHash): string
    {
        return self::CACHE_PREFIX.$tokenHash;
    }

    /**
     * Extract a sanitized bearer or X-Auth-Token header from the incoming request.
     */
    public static function extractToken(Request $request): ?string
    {
        $token = $request->bearerToken() ?: $request->header('X-Auth-Token');
        if (! is_string($token) || $token === '' || in_array($token, ['null', 'undefined', '[object Object]'], true)) {
            return null;
        }

        return $token;
    }

    /**
     * Resolve an authenticated active user from the request's hashed API token.
     */
    public static function resolveUserFromRequest(Request $request): ?User
    {
        $plainToken = self::extractToken($request);
        if (! $plainToken) {
            return null;
        }

        $tokenHash = self::hashToken($plainToken);
        $userId = Cache::get(self::cacheKey($tokenHash));

        $user = $userId ? User::find($userId) : User::where('remember_token', $tokenHash)->first();

        if (! $user || ! $user->isActive()) {
            if ($user && ! $user->isActive()) {
                Cache::forget(self::cacheKey($tokenHash));
            }

            return null;
        }

        if (! $userId) {
            Cache::put(self::cacheKey($tokenHash), $user->id, now()->addDays(self::TTL_DAYS));
        }

        return $user;
    }

    /**
     * Persist a hashed bearer token for the given user and return the plain token once.
     */
    public static function storeIssuedToken(User $user, string $plainToken): void
    {
        $tokenHash = self::hashToken($plainToken);
        Cache::put(self::cacheKey($tokenHash), $user->id, now()->addDays(self::TTL_DAYS));
        $user->forceFill(['remember_token' => $tokenHash])->save();
    }

    /**
     * Revoke the current request token and clear matching persisted remember_token hash.
     */
    public static function revokeRequestToken(Request $request, ?User $user = null): void
    {
        $plainToken = self::extractToken($request);
        if ($plainToken) {
            $tokenHash = self::hashToken($plainToken);
            Cache::forget(self::cacheKey($tokenHash));

            if ($user && ! empty($user->remember_token) && hash_equals((string) $user->remember_token, $tokenHash)) {
                $user->forceFill(['remember_token' => null])->save();
            }

            return;
        }

        if ($user) {
            self::revokeUserTokens($user);
        }
    }

    /**
     * Revoke any tracked API token for the user (used on deactivation or password reset).
     */
    public static function revokeUserTokens(User $user): void
    {
        if (! empty($user->remember_token)) {
            Cache::forget(self::cacheKey((string) $user->remember_token));
            $user->forceFill(['remember_token' => null])->save();
        }
    }
}
