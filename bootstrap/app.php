<?php

use App\Http\Middleware\AuthenticateApiRequest;
use App\Http\Middleware\EnsureAuthenticated;
use App\Http\Middleware\EnsureUserIsActive;
use App\Http\Middleware\EnsureUserPermission;
use App\Http\Middleware\EnsureUserRole;
use App\Http\Middleware\ResolveUiTheme;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->web(append: [
            ResolveUiTheme::class,
        ]);

        $middleware->api(prepend: [
            AuthenticateApiRequest::class,
        ]);

        $middleware->alias([
            'auth' => EnsureAuthenticated::class,
            'active' => EnsureUserIsActive::class,
            'role' => EnsureUserRole::class,
            'permission' => EnsureUserPermission::class,
            'superadmin' => \App\Http\Middleware\EnsureSuperAdmin::class,
            'ui.theme' => ResolveUiTheme::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->shouldRenderJsonWhen(
            fn (Request $request) => $request->is('api/*') || $request->expectsJson(),
        );

        $exceptions->render(function (QueryException $e, Request $request) {
            if (! ($request->is('api/*') || $request->expectsJson())) {
                return null;
            }

            $sqlState = (string) ($e->errorInfo[0] ?? $e->getCode());
            $driverCode = (int) ($e->errorInfo[1] ?? 0);
            $isFkConstraint = $sqlState === '23000' || $driverCode === 1451 || $driverCode === 19;

            if ($isFkConstraint && $request->isMethod('DELETE')) {
                return response()->json([
                    'message' => 'This record cannot be deleted because it is still referenced by existing transactions or related records.',
                ], 422);
            }

            return null;
        });
    })->create();
