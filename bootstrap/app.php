<?php

use App\Http\Middleware\AuthenticateApiRequest;
use App\Http\Middleware\EnsureAuthenticated;
use App\Http\Middleware\EnsureUserIsActive;
use App\Http\Middleware\EnsureUserPermission;
use App\Http\Middleware\EnsureUserRole;
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
        $middleware->api(prepend: [
            AuthenticateApiRequest::class,
        ]);

        $middleware->alias([
            'auth' => EnsureAuthenticated::class,
            'active' => EnsureUserIsActive::class,
            'role' => EnsureUserRole::class,
            'permission' => EnsureUserPermission::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->shouldRenderJsonWhen(
            fn (Request $request) => $request->is('api/*') || $request->expectsJson(),
        );
    })->create();
