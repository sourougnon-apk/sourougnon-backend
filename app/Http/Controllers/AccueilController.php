<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Models\Vente;
use App\Models\Recouvrement;
use App\Models\Debiteur;
use App\Models\Echeance;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AccueilController extends Controller
{
    public function index()
    {
        $agents = User::where('role', 'agent')->where('actif', true)->get();
        $gerante = User::where('role', 'gerante')->first();

        $allUsers = $agents->toArray();
        if ($gerante) $allUsers[] = $gerante->toArray();

        $debutMois = now()->startOfMonth()->toDateString();
        $aujourdhui = now()->toDateString();

        $leaderboard = [];
        foreach ($allUsers as $user) {
            $userId = $user['id'];

            $nbDebiteurs = Debiteur::where('agent_id', $userId)->where('actif', true)->count();

            $nbJoursTravailles = Recouvrement::where('agent_id', $userId)
                ->where('statut', 'paye')
                ->whereDate('date_recouvrement', '>=', $debutMois)
                ->distinct('date_recouvrement')
                ->count('date_recouvrement');

            $joursEcoules = max(1, now()->diffInDays(now()->startOfMonth()) + 1);
            $regularite = $joursEcoules > 0 ? min(100, round(($nbJoursTravailles / $joursEcoules) * 100, 1)) : 0;
            // Score non financier basé sur la régularité et le nombre de clients suivis
            $score = round(($regularite * 0.7) + (min($nbDebiteurs, 10) * 3), 1);

            $leaderboard[] = [
                'nom' => $user['nom'] . ' ' . ($user['prenom'] ?? ''),
                'role' => $user['role'] == 'gerante' ? 'Gérante' : 'Agent',
                'nb_debiteurs' => $nbDebiteurs,
                'jours_travailles' => $nbJoursTravailles,
                'regularite' => $regularite,
                'score' => $score,
            ];
        }
        usort($leaderboard, fn($a, $b) => $b['score'] <=> $a['score']);

        // KPI non sensibles
        $nbVisitesAujourdhui = Echeance::whereDate('date_echeance', $aujourdhui)
            ->whereIn('statut', ['en_attente', 'en_retard', 'partiel'])
            ->distinct('vente_id')
            ->count();

        $nbPaiementsAujourdhui = Recouvrement::whereDate('date_recouvrement', $aujourdhui)
            ->where('statut', 'paye')
            ->count();

        $nbRetardsClients = Echeance::whereIn('statut', ['en_retard', 'partiel'])
            ->whereDate('date_echeance', '<', $aujourdhui)
            ->whereHas('vente', fn($q) => $q->where('statut', 'en_cours'))
            ->distinct('vente_id')
            ->count();

        $tauxPonctualite = $nbVisitesAujourdhui > 0
            ? round(($nbPaiementsAujourdhui / $nbVisitesAujourdhui) * 100)
            : 0;

        $stats = [
            'nb_agents' => count($allUsers),
            'nb_debiteurs_actifs' => Debiteur::where('actif', true)->count(),
            'visites_aujourdhui' => $nbVisitesAujourdhui,
            'paiements_aujourdhui' => $nbPaiementsAujourdhui,
            'nb_retards' => $nbRetardsClients,
            'taux_recouvrement' => $tauxPonctualite,
        ];

        // Évolution de l'activité : paiements et visites par jour (quantités, pas montants)
        $activite = ['labels' => [], 'paiements' => [], 'visites' => []];
        for ($i = 6; $i >= 0; $i--) {
            $date = now()->subDays($i)->toDateString();
            $activite['labels'][] = now()->subDays($i)->format('d/m');
            $activite['paiements'][] = Recouvrement::whereDate('date_recouvrement', $date)
                ->where('statut', 'paye')->count();
            $activite['visites'][] = Echeance::whereDate('date_echeance', $date)
                ->whereIn('statut', ['en_attente', 'en_retard', 'partiel'])
                ->distinct('vente_id')->count();
        }

        return view('accueil', compact('leaderboard', 'stats', 'activite'));
    }
}
