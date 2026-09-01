<?php
namespace App\Http\Controllers\Api;
use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\Debiteur;
use App\Models\Vente;
use App\Models\AuditLog;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\DB;

class AgentController extends Controller
{
    public function index()
    {
        return response()->json(User::where('role', 'agent')->orderBy('nom')->get(['uuid','nom','prenom','email','telephone','actif','created_at']));
    }

    public function show(string $uuid)
    {
        $agent = User::where('uuid', $uuid)->where('role', 'agent')->firstOrFail();
        $agent->load('debiteurs');
        return response()->json($agent);
    }

    public function store(Request $request)
    {
        $request->validate(['nom' => 'required','prenom' => 'required','email' => 'required|email|unique:users']);
        $agent = User::create([
            'uuid' => Str::uuid(), 'nom' => $request->nom, 'prenom' => $request->prenom,
            'email' => $request->email, 'telephone' => $request->telephone ?? '',
            'role' => 'agent', 'password' => bcrypt($request->password ?? 'agent123'),
        ]);
        return response()->json(['success' => true, 'uuid' => $agent->uuid], 201);
    }

    public function update(Request $request, string $uuid)
    {
        $agent = User::where('uuid', $uuid)->where('role', 'agent')->firstOrFail();
        $data = $request->only(['nom','prenom','email','telephone']);
        if ($request->password) { $data['password'] = bcrypt($request->password); }
        $agent->update($data);
        return response()->json(['success' => true]);
    }

    public function destroy(Request $request, string $uuid)
    {
        $agent = User::where('uuid', $uuid)->where('role', 'agent')->firstOrFail();
        $transferToUuid = $request->transfer_to;
        $gerante = $request->user();
        $nbTransferes = 0;

        DB::transaction(function () use ($agent, $transferToUuid, $gerante, &$nbTransferes) {
            if ($transferToUuid) {
                $newAgent = User::where('uuid', $transferToUuid)->where('role', 'agent')->firstOrFail();

                $debiteurs = Debiteur::where('agent_id', $agent->id)->get();
                foreach ($debiteurs as $debiteur) {
                    // Calculer le taux de recouvrement et le reste à payer
                    $ventes = Vente::where('debiteur_id', $debiteur->id)->where('statut', 'en_cours')->get();
                    $totalRestant = 0;
                    $totalDu = 0;
                    foreach ($ventes as $vente) {
                        $totalDu += $vente->montant_total;
                        $totalRestant += $vente->resteAPayer();
                    }
                    $tauxRecouvrement = $totalDu > 0 ? round((($totalDu - $totalRestant) / $totalDu) * 100, 2) : 100;

                    $debiteur->update([
                        'agent_id' => $newAgent->id,
                        'ancien_agent_id' => $agent->id,
                        'date_transfert' => now(),
                        'taux_recouvrement_au_transfert' => $tauxRecouvrement,
                        'reste_a_payer_au_transfert' => $totalRestant,
                    ]);
                    $nbTransferes++;
                }

                // Créer l'audit log
                AuditLog::create([
                    'gerante_id' => $gerante->id,
                    'ancien_agent_id' => $agent->id,
                    'nouvel_agent_id' => $newAgent->id,
                    'nb_debiteurs_transferes' => $nbTransferes,
                    'details' => [
                        'ancien_agent' => $agent->nom . ' ' . $agent->prenom,
                        'nouvel_agent' => $newAgent->nom . ' ' . $newAgent->prenom,
                        'date' => now()->toDateTimeString(),
                    ],
                ]);
            }

            // Désactiver l'agent
            $agent->update(['actif' => false, 'token' => null, 'token_expires_at' => null]);
        });

        return response()->json([
            'success' => true,
            'nb_transferes' => $nbTransferes,
            'message' => "Agent désactivé. $nbTransferes débiteur(s) transféré(s)."
        ]);
    }

    // Historique complet d'un agent (export)
    public function exportHistory(string $uuid)
    {
        $agent = User::where('uuid', $uuid)->where('role', 'agent')->firstOrFail();
        $debiteurs = Debiteur::where('agent_id', $agent->id)->with('ventes.recouvrements')->get();

        $data = [];
        foreach ($debiteurs as $d) {
            foreach ($d->ventes as $v) {
                $data[] = [
                    'Débiteur' => $d->nom . ' ' . $d->prenom,
                    'Téléphone' => $d->telephone,
                    'Quartier' => $d->quartier,
                    'Vente' => $v->uuid,
                    'Montant total' => $v->montant_total,
                    'Payé' => $v->totalPaye(),
                    'Restant' => $v->resteAPayer(),
                    'Statut' => $v->statut,
                ];
            }
        }

        return response()->json([
            'agent' => $agent->nom . ' ' . $agent->prenom,
            'nb_debiteurs' => $debiteurs->count(),
            'donnees' => $data,
        ]);
    }
}
