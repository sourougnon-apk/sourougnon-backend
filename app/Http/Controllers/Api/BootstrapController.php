<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Recouvrement;
use App\Models\Penalite;
use App\Models\Epargne;
use App\Models\TourneeDemarrage;
use App\Models\Vente;
use App\Models\Debiteur;
use Carbon\Carbon;
use Illuminate\Http\Request;

class BootstrapController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();

        // Tournée du jour
        $tournee = app(AgentSpaceController::class)->tournee($request)->getData();

        // Débiteurs : utiliser la même transformation que l'endpoint /agent/debiteurs
        $debiteurs = app(\App\Http\Controllers\Api\DebiteurController::class)
            ->indexAgent($request)
            ->getData();

        // Pénalités
        $penalites = Penalite::whereHas('vente', fn($q) => $q->where('agent_id', $user->id))
            ->with(['debiteur:id,uuid,nom,prenom', 'vente:id,uuid,montant_total'])
            ->orderByDesc('date_appliquee')
            ->limit(200)
            ->get();

        // Épargnes
        $epargnes = Epargne::whereHas('vente', fn($q) => $q->where('agent_id', $user->id))
            ->with(['debiteur:id,uuid,nom,prenom', 'vente:id,uuid,montant_total'])
            ->orderByDesc('date_collecte')
            ->limit(200)
            ->get();

        // Statut tournée
        $statutTournee = app(TourneeController::class)->statut($request)->getData();

        // Notifications
        $notifications = \App\Models\Notification::where('user_id', $user->id)
            ->orderByDesc('created_at')
            ->limit(50)
            ->get();

        // Profil
        $me = app(AuthController::class)->me($request)->getData();

        // Archives du mois courant
        $archives = app(ArchiveController::class)->archivesAgent($request)->getData();

        return response()->json([
            'tournee'          => $tournee,
            'debiteurs'        => $debiteurs,
            'penalites'        => $penalites,
            'epargnes'         => $epargnes,
            'statut_tournee'   => $statutTournee,
            'notifications'    => $notifications,
            'user'             => $me->user,
            'archives_courant' => $archives,
        ]);
    }
}
