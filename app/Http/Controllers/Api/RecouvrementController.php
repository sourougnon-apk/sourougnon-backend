<?php
namespace App\Http\Controllers\Api;
use App\Http\Controllers\Controller;
use App\Models\Recouvrement;
use App\Models\Vente;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class RecouvrementController extends Controller
{
    public function index(Request $request)
    {
        $query = Recouvrement::with(['vente.debiteur', 'agent']);
        if ($request->agent_id) {
            $query->whereHas('agent', fn($q) => $q->where('uuid', $request->agent_id));
        }
        if ($request->date) {
            $query->whereDate('date_recouvrement', $request->date);
        }
        if ($request->statut) {
            $query->where('statut', $request->statut);
        }
        return response()->json($query->orderByDesc('created_at')->limit(200)->get());
    }

    public function store(Request $request)
    {
        $request->validate([
            'vente_id' => 'required|exists:ventes,uuid',
            'agent_id' => 'required|exists:users,uuid',
            'montant' => 'required|numeric|min:0',
            'mode_paiement' => 'required|in:especes,mobile,autre',
        ]);

        $vente = Vente::where('uuid', $request->vente_id)->firstOrFail();
        $agent = User::where('uuid', $request->agent_id)->firstOrFail();

        if ($vente->statut !== 'en_cours') {
            return response()->json(['error' => 'Cette vente est terminée ou annulée.'], 422);
        }

        $recouvrement = Recouvrement::create([
            'uuid' => Str::uuid(),
            'vente_id' => $vente->id,
            'agent_id' => $agent->id,
            'montant' => $request->montant,
            'date_recouvrement' => $request->date_recouvrement ?? now()->toDateString(),
            'mode_paiement' => $request->mode_paiement,
            'statut' => $request->statut ?? 'paye',
            'commentaire' => $request->commentaire ?? null,
            'synced' => true,
        ]);

        // Vérifier si la vente est soldée
        $totalPaye = $vente->totalPaye();
        if ($totalPaye >= $vente->montant_total) {
            $vente->update(['statut' => 'termine']);
        }

        return response()->json([
            'success' => true,
            'uuid' => $recouvrement->uuid,
            'reste_a_payer' => $vente->resteAPayer(),
            'vente_terminee' => $vente->statut === 'termine',
        ], 201);
    }

    public function show(string $uuid)
    {
        return response()->json(Recouvrement::where('uuid', $uuid)->with(['vente.debiteur', 'agent'])->firstOrFail());
    }

    public function encaissementGroup(Request $request)
    {
        $request->validate([
            'agent_id' => 'required|exists:users,uuid',
            'paiements' => 'required|array|min:1',
            'paiements.*.vente_id' => 'required|exists:ventes,uuid',
            'paiements.*.montant' => 'required|numeric|min:0',
            'paiements.*.statut' => 'required|in:paye,partiel,refus,absent,promesse',
        ]);

        $agent = User::where('uuid', $request->agent_id)->firstOrFail();
        $resultats = [];

        foreach ($request->paiements as $p) {
            $vente = Vente::where('uuid', $p['vente_id'])->firstOrFail();
            if ($vente->statut !== 'en_cours') continue;

            $rec = Recouvrement::create([
                'uuid' => Str::uuid(),
                'vente_id' => $vente->id,
                'agent_id' => $agent->id,
                'montant' => $p['montant'],
                'date_recouvrement' => $p['date_recouvrement'] ?? now()->toDateString(),
                'mode_paiement' => $p['mode_paiement'] ?? 'especes',
                'statut' => $p['statut'],
                'commentaire' => $p['commentaire'] ?? null,
                'synced' => true,
            ]);

            if ($p['statut'] === 'paye' && $vente->totalPaye() >= $vente->montant_total) {
                $vente->update(['statut' => 'termine']);
            }

            $resultats[] = ['vente_uuid' => $vente->uuid, 'success' => true, 'reste' => $vente->resteAPayer()];
        }

        return response()->json(['success' => true, 'nb_traites' => count($resultats), 'details' => $resultats]);
    }
}
