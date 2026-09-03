<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\TourneeDemarrage;
use App\Models\Vente;
use App\Models\Echeance;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Database\QueryException;

class TourneeController extends Controller
{
    public function index(Request $request)
    {
        $query = TourneeDemarrage::with('agent:id,uuid,nom,prenom')
            ->orderByDesc('date_tournee')
            ->orderByDesc('heure_demarrage');

        if ($request->date) {
            $query->whereDate('date_tournee', $request->date);
        }
        if ($request->agent_id) {
            $query->whereHas('agent', fn($q) => $q->where('uuid', $request->agent_id));
        }

        return response()->json($query->limit(200)->get());
    }

    public function demarrer(Request $request)
    {
        $request->validate([
            'sync_uuid' => 'nullable|string|max:255',
        ]);

        $user = $request->user();
        $aujourdhui = now()->toDateString();
        $syncUuid = $request->sync_uuid;

        // Idempotence : retry avec le même sync_uuid
        if ($syncUuid) {
            $exist = TourneeDemarrage::where('sync_uuid', $syncUuid)->first();
            if ($exist) {
                return response()->json(['success' => true, 'deja_traite' => true, 'tournee' => $exist]);
            }
        }

        $existe = TourneeDemarrage::where('agent_id', $user->id)
            ->where('date_tournee', $aujourdhui)
            ->where('statut', 'en_cours')
            ->first();

        if ($existe) {
            return response()->json(['error' => 'Tournée déjà démarrée.'], 422);
        }

        try {
            $tournee = TourneeDemarrage::create([
                'uuid' => Str::uuid(),
                'agent_id' => $user->id,
                'date_tournee' => $aujourdhui,
                'heure_demarrage' => now(),
                'statut' => 'en_cours',
                'gps_depart' => $request->gps_depart ?? null,
                'synced' => true,
                'sync_uuid' => $syncUuid,
            ]);
        } catch (QueryException $e) {
            // 1062 = violation d'unicité : deux requêtes simultanées, même sync_uuid
            if ((int)($e->errorInfo[1] ?? 0) === 1062 && $syncUuid) {
                $tournee = TourneeDemarrage::where('sync_uuid', $syncUuid)->first();
                return response()->json(['success' => true, 'deja_traite' => true, 'tournee' => $tournee]);
            }
            throw $e;
        }

        return response()->json(['success' => true, 'tournee' => $tournee]);
    }

    public function terminer(Request $request)
    {
        $request->validate([
            'sync_uuid' => 'nullable|string|max:255',
        ]);

        $user = $request->user();
        $aujourdhui = now()->toDateString();
        $syncUuidFin = $request->sync_uuid;

        $tournee = TourneeDemarrage::where('agent_id', $user->id)
            ->where('date_tournee', $aujourdhui)
            ->where('statut', 'en_cours')
            ->first();

        if (!$tournee) {
            return response()->json(['error' => 'Aucune tournée en cours.'], 422);
        }

        // Idempotence : déjà terminée avec ce sync_uuid_fin
        if ($syncUuidFin) {
            $exist = TourneeDemarrage::where('sync_uuid_fin', $syncUuidFin)->first();
            if ($exist) {
                return response()->json(['success' => true, 'deja_traite' => true, 'tournee' => $exist]);
            }
        }

        // Vérifier que toutes les visites du jour sont traitées
        $visitesRestantes = Vente::where('agent_id', $user->id)
            ->where('statut', 'en_cours')
            ->whereDate('date_debut', '<=', $aujourdhui)
            ->whereDate('date_fin', '>=', $aujourdhui)
            ->whereHas('echeances', function($q) use ($aujourdhui) {
                $q->whereDate('date_echeance', $aujourdhui)
                  ->whereIn('statut', ['en_attente', 'en_retard']);
            })
            ->exists();

        if ($visitesRestantes) {
            return response()->json(['error' => 'Toutes les visites ne sont pas terminées.'], 422);
        }

        $retardsRestants = Echeance::whereIn('vente_id', Vente::where('agent_id', $user->id)->where('statut', 'en_cours')->pluck('id'))
            ->whereDate('date_echeance', '<', $aujourdhui)
            ->whereIn('statut', ['en_retard', 'partiel'])
            ->count();

        try {
            $tournee->update([
                'statut' => 'terminee',
                'heure_fin' => now(),
                'gps_arrivee' => $request->gps_arrivee ?? null,
                'sync_uuid_fin' => $syncUuidFin,
            ]);
        } catch (QueryException $e) {
            if ((int)($e->errorInfo[1] ?? 0) === 1062 && $syncUuidFin) {
                $tournee = TourneeDemarrage::where('sync_uuid_fin', $syncUuidFin)->first();
                return response()->json(['success' => true, 'deja_traite' => true, 'tournee' => $tournee]);
            }
            throw $e;
        }

        $message = $retardsRestants > 0
            ? 'Tournée clôturée sous réserve : ' . $retardsRestants . ' retard(s) à recouvrer.'
            : 'Tournée clôturée avec succès.';

        return response()->json(['success' => true, 'tournee' => $tournee, 'message' => $message]);
    }

    public function mesTournees(Request $request)
    {
        $user = $request->user();
        $tournees = TourneeDemarrage::where('agent_id', $user->id)
            ->orderByDesc('date_tournee')
            ->get([
                'uuid','date_tournee','heure_demarrage','heure_fin',
                'gps_depart','gps_arrivee','statut'
            ]);
        return response()->json($tournees);
    }

    public function statut(Request $request)
    {
        $user = $request->user();
        $aujourdhui = now()->toDateString();
        $tournee = TourneeDemarrage::where('agent_id', $user->id)
            ->where('date_tournee', $aujourdhui)
            ->orderByDesc('heure_demarrage')
            ->first();

        return response()->json([
            'en_cours' => $tournee && $tournee->statut === 'en_cours',
            'tournee' => $tournee,
        ]);
    }
}
