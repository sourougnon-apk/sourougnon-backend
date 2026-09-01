<?php
namespace App\Services;
use App\Models\SyntheseJournaliere;
use App\Models\Vente;
use App\Models\Recouvrement;
use App\Models\User;

class SyntheseService
{
    public static function generer(): void
    {
        $aujourdhui = now()->toDateString();
        $agents = User::where('role', 'agent')->where('actif', true)->get();
        foreach ($agents as $agent) {
            $ventes = Vente::where('agent_id', $agent->id)
                ->where('statut', 'en_cours')
                ->whereDate('date_debut', '<=', $aujourdhui)
                ->whereDate('date_fin', '>=', $aujourdhui);
            $attendu = $ventes->sum('montant_journalier');
            $encaisse = Recouvrement::where('agent_id', $agent->id)
                ->where('statut', 'paye')
                ->whereDate('date_recouvrement', $aujourdhui)
                ->sum('montant');
            SyntheseJournaliere::updateOrCreate(
                ['date' => $aujourdhui, 'agent_id' => $agent->id],
                [
                    'nb_debiteurs' => $ventes->distinct('debiteur_id')->count('debiteur_id'),
                    'montant_attendu' => $attendu,
                    'montant_encaisse' => $encaisse,
                    'montant_impaye' => max(0, $attendu - $encaisse),
                    'taux_recouvrement' => $attendu > 0 ? round(($encaisse / $attendu) * 100, 2) : 0,
                ]
            );
        }
    }
}
