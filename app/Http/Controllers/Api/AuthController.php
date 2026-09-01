<?php
namespace App\Http\Controllers\Api;
use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class AuthController extends Controller
{
    public function login(Request $request)
    {
        $request->validate([
            'identifiant' => 'required_without:email|string',
            'email' => 'required_without:identifiant|email',
            'password' => 'required',
            'role' => 'nullable|in:gerante,chef_agence,agent',
        ]);

        $identifiant = trim($request->identifiant ?? $request->email ?? '');
        $user = User::where('actif', true)
            ->where(function($q) use ($identifiant) {
                $q->where('email', $identifiant)
                  ->orWhere('telephone', $identifiant);
            })
            ->first();

        if (!$user || !\Hash::check($request->password, $user->password)) {
            return response()->json(['error' => 'Identifiants invalides'], 401);
        }

        if ($request->role && $user->role !== $request->role) {
            return response()->json(['error' => "Ce compte n'a pas le rôle " . $request->role], 403);
        }

        $token = Str::random(64);
        $user->update(['token' => $token, 'token_expires_at' => now()->addHours(24)]);

        return response()->json([
            'success' => true,
            'token' => $token,
            'user' => [
                'id' => $user->uuid,
                'nom' => $user->nom,
                'prenom' => $user->prenom,
                'role' => $user->role,
            ]
        ]);
    }
    public function me(Request $request)
    {
        $user = $request->user();
        return response()->json([
            'user' => [
                'id' => $user->uuid,
                'nom' => $user->nom,
                'prenom' => $user->prenom,
                'email' => $user->email,
                'telephone' => $user->telephone,
                'role' => $user->role,
            ]
        ]);
    }

    public function logout(Request $request)
    {
        $request->user()->update(['token' => null, 'token_expires_at' => null]);
        return response()->json(['success' => true]);
    }

    public function changePassword(Request $request)
    {
        $request->validate(['password' => 'required|min:4']);
        $request->user()->update(['password' => bcrypt($request->password)]);
        return response()->json(['success' => true, 'message' => 'Mot de passe modifié.']);
    }
}
