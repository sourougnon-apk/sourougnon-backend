<?php
namespace App\Http\Controllers\Api;
use App\Http\Controllers\Controller;
use App\Models\Vente;
use App\Models\Echeance;
use App\Models\Recouvrement;
use App\Models\Debiteur;
use Illuminate\Http\Request;

class SuiviController extends Controller
{
    public function index(Request $request)
    {
        $aujourdhui = now()->toDateString();
        $agentId = $request->agent_id;

        // Échéances du jour
        $query = Echeance::whereDate('date_echeance', $aujourdhui)->where('statut', '!=', 'annule')
            ->with(['vente.debiteur', 'vente.agent']);
        if ($agentId) {
            $query->whereHas('vente', fn($q) => $q->where('agent_id', $agentId));
        }
        $echeances = $query->get();

        // Stats du jour
        $montantAttendu = $echeances->sum('montant_prevu');
        $montantPaye = $echeances->sum('montant_paye');
        $nbTotal = $echeances->count();
        $nbPaye = $echeances->where('statut', 'paye')->count();
        $nbPartiel = $echeances->where('statut', 'partiel')->count();
        $nbImpaye = $echeances->whereIn('statut', ['en_attente','en_retard'])->count();

        // Retards
        $retards = Echeance::whereIn('statut', ['en_retard','partiel'])
            ->whereDate('date_echeance', '<', $aujourdhui)
            ->with(['vente.debiteur', 'vente.agent'])
            ->orderByDesc('jours_retard')
            ->limit(20)->get();

        // Agents avec leurs stats du jour
        $agents = \App\Models\User::where('role', 'agent')->where('actif', true)->get()
            ->map(function($agent) use ($aujourdhui) {
                $echs = Echeance::whereDate('date_echeance', $aujourdhui)
                    ->whereHas('vente', fn($q) => $q->where('agent_id', $agent->id))
                    ->get();
                return [
                    'uuid' => $agent->uuid, 'nom' => $agent->nom.' '.$agent->prenom,
                    'nb_echeances' => $echs->count(),
                    'montant_attendu' => $echs->sum('montant_prevu'),
                    'montant_paye' => $echs->sum('montant_paye'),
                    'taux' => $echs->sum('montant_prevu') > 0 ? round(($echs->sum('montant_paye') / $echs->sum('montant_prevu')) * 100, 1) : 0,
                ];
            });

        return response()->json([
            'stats' => compact('montantAttendu','montantPaye','nbTotal','nbPaye','nbPartiel','nbImpaye'),
            'echeances' => $echeances,
            'retards' => $retards,
            'agents' => $agents,
        ]);
    }
}
