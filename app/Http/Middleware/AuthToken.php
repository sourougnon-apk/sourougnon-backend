<?php

namespace App\Http\Middleware;

use App\Models\User;
use Closure;
use Illuminate\Http\Request;

class AuthToken
{
    public function handle(Request $request, Closure $next)
    {
        $token = $request->bearerToken();

        if (!$token) {
            return response()->json(['error' => 'Non authentifie'], 401);
        }

        $user = User::where('token', $token)
            ->where('token_expires_at', '>', now())
            ->first();

        if (!$user) {
            return response()->json(['error' => 'Session expiree'], 401);
        }

        $request->setUserResolver(fn() => $user);

        return $next($request);
    }
}
