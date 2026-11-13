<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\Agence;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class ParametreController extends Controller
{
    public function index()
    {
        return response()->json([
            'agences' => Agence::orderBy('nom')->get(),
            'utilisateurs' => User::with('permissions')->orderBy('nom')->get()
        ]);
    }

    public function storeAgence(Request $request)
    {
        $request->validate([
            'nom' => 'required|string|max:150',
            'adresse' => 'nullable|string',
            'telephone' => 'nullable|string|max:20',
            'chef_uuid' => 'nullable|exists:users,uuid'
        ]);

        $agence = Agence::create([
            'uuid' => Str::uuid(),
            'nom' => $request->nom,
            'adresse' => $request->adresse,
            'telephone' => $request->telephone,
            'actif' => true
        ]);

        if ($request->chef_uuid) {
            $chef = User::where('uuid', $request->chef_uuid)->first();
            if ($chef) {
                $chef->update(['agence_id' => $agence->id, 'role' => 'chef_agence']);
            }
        }

        return response()->json(['success' => true, 'agence' => $agence]);
    }

    public function updateAgence(Request $request, $id)
    {
        $agence = Agence::findOrFail($id);
        $request->validate([
            'nom' => 'required|string|max:150',
            'adresse' => 'nullable|string',
            'telephone' => 'nullable|string|max:20',
            'actif' => 'boolean'
        ]);
        
        $agence->update($request->all());
        return response()->json(['success' => true]);
    }

    public function assignerAgence(Request $request, $uuid)
    {
        $request->validate(['agence_id' => 'required|exists:agences,id']);
        $user = User::where('uuid', $uuid)->firstOrFail();
        
        if ($user->role === 'gerante') {
            return response()->json(['error' => 'La gérante gère le groupe et n\'est rattachée à aucune agence.'], 422);
        }

        $user->update(['agence_id' => $request->agence_id]);
        return response()->json(['success' => true]);
    }

    public function storeMagasin(Request $request)
    {
        // Logique existante (à compléter si besoin)
        return response()->json(['success' => true, 'message' => 'Fonctionnalité magasin à venir']);
    }

    public function togglePermission(Request $request)
    {
        // Logique existante
    }

    public function resetPassword(Request $request, $uuid)
    {
        $request->validate([
            'password' => 'required|string|min:6|confirmed'
        ]);

        $user = User::where('uuid', $uuid)->firstOrFail();
        
        // Sécurité : la gérante ne peut pas se réinitialiser elle-même par cette route
        if ($user->role === 'gerante') {
            return response()->json(['error' => 'Utilisez le formulaire de sécurité de votre propre compte pour changer votre mot de passe.'], 422);
        }

        $user->update(['password' => bcrypt($request->password)]);

        return response()->json(['success' => true, 'message' => 'Mot de passe réinitialisé avec succès.']);
    }


    public function storeUtilisateur(Request $request)
    {
        $request->validate([
            'nom' => 'required|string|max:255',
            'prenom' => 'nullable|string|max:255',
            'email' => 'required|email|unique:users,email',
            'telephone' => 'nullable|string|max:20',
            'role' => 'required|in:agent,chef_agence',
            'agence_id' => 'required|exists:agences,id',
            'password' => 'required|string|min:6',
        ]);

        $user = User::create([
            'uuid' => Str::uuid(),
            'nom' => $request->nom,
            'prenom' => $request->prenom,
            'email' => $request->email,
            'telephone' => $request->telephone,
            'role' => $request->role,
            'agence_id' => $request->agence_id,
            'password' => bcrypt($request->password),
            'actif' => true,
        ]);

        // Créer automatiquement une fiche employé RH pour les agents
        if ($request->role === 'agent') {
            \App\Models\Employe::create([
                'uuid' => (string) Str::uuid(),
                'user_id' => $user->id,
                'poste' => 'Agent de terrain',
                'date_embauche' => now()->toDateString(),
                'salaire_base' => 0,
                'mode_calcul' => 'journalier',
            ]);
        }

        return response()->json(['success' => true, 'user' => $user]);
    }

}
