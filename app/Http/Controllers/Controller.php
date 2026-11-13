<?php

namespace App\Http\Controllers;

use App\Models\System\Auth\User;
use Illuminate\Http\Exceptions\HttpResponseException;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

abstract class Controller
{
    protected function resolveActor(?Request $request = null): ?User
    {
        $user = $request?->user() ?: Auth::user();

        return $user instanceof User ? $user : null;
    }

    protected function requireActor(?Request $request = null): User
    {
        $user = $this->resolveActor($request);
        if (! $user) {
            throw new HttpResponseException(response()->json([
                'status' => 'error',
                'message' => 'Unauthenticated.',
            ], 401));
        }

        return $user;
    }

    protected function requireActorId(?Request $request = null): int
    {
        return (int) $this->requireActor($request)->id;
    }

    protected function optionalActorId(?Request $request = null): ?int
    {
        return $this->resolveActor($request)?->id;
    }

    protected function requireSuperAdmin(?Request $request = null): User
    {
        $user = $this->requireActor($request);
        if (! $user->isSuperAdmin() && $user->role !== User::ROLE_SUPERADMIN) {
            throw new HttpResponseException(response()->json([
                'status' => 'error',
                'message' => 'Unauthorized: Super Administrator privileges required.',
            ], 403));
        }

        return $user;
    }
}
