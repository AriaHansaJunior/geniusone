<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\View;
use Symfony\Component\HttpFoundation\Response;

class ResolveUiTheme
{
    /**
     * Resolve and bind the active UI theme ('modern' or 'default') to the request and views.
     */
    public function handle(Request $request, Closure $next, ?string $forcedTheme = null): Response
    {
        $theme = $forcedTheme;

        if (! $theme) {
            $theme = ($request->is('default') || $request->is('default/*'))
                ? 'default'
                : 'modern';
        }

        $request->attributes->set('ui_theme', $theme);
        View::share('uiTheme', $theme);

        return $next($request);
    }
}
