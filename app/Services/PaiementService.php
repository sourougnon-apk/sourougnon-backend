<?php

namespace App\Services;

use App\Models\Recouvrement;
use App\Models\Echeance;
use App\Models\Vente;

class PaiementService
{
    /**
     * Traiter un paiement selon le statut choisi par l'agent.
     * Gère les excédents : un paiement peut couvrir plusieurs échéances.
     */
    public static function affecterPaiement(Recouvrement $recouvrement): void
    {
        $vente = $recouvrement->vente;
        $aujourdhui = now()->toDateString();

        // Statuts non payants : absent, refus, promesse
        if (!in_array($recouvrement->statut, ['paye', 'partiel'])) {
            $echeance = Echeance::where('vente_id', $vente->id)
                ->whereDate('date_echeance', $aujourdhui)
                ->first()
                ?? Echeance::where('vente_id', $vente->id)
                    ->whereIn('statut', ['en_attente', 'en_retard', 'partiel'])
                    ->orderBy('date_echeance')
                    ->first();

            if ($echeance) {
                $echeance->statut = match ($recouvrement->statut) {
                    'absent' => 'absent',
                    'refus' => 'refus',
                    'promesse' => 'promesse',
                    default => $echeance->statut,
                };
                $echeance->save();
            }

            $vente->mettreAJourStatutGlobal();
            return;
        }

        // Paiements réels : paye ou partiel
        $montantRestant = $recouvrement->montant;

        // 1. Échéances échues non soldées (retards)
        $echeancesDues = Echeance::where('vente_id', $vente->id)
            ->whereIn('statut', ['en_retard', 'partiel', 'en_attente'])
            ->whereDate('date_echeance', '<=', $aujourdhui)
            ->orderBy('date_echeance')
            ->get();

        foreach ($echeancesDues as $echeance) {
            if ($montantRestant <= 0) break;
            $reste = $echeance->restant();
            if ($reste <= 0) continue;

            $payer = min($montantRestant, $reste);
            $echeance->montant_paye += $payer;
            $echeance->date_paiement = $recouvrement->date_recouvrement;
            $echeance->jours_retard = 0;
            $echeance->statut = $echeance->montant_paye >= $echeance->montant_prevu ? 'paye' : 'partiel';
            $echeance->save();
            if ($echeance->statut === 'paye') {
                EpargneService::collecter($vente, $recouvrement, $echeance->date_echeance->toDateString());
            }

            $montantRestant -= $payer;
        }

        // 2. Excédent vers les échéances futures
        if ($montantRestant > 0) {
            $echeancesFutures = Echeance::where('vente_id', $vente->id)
                ->where('statut', 'en_attente')
                ->whereDate('date_echeance', '>', $aujourdhui)
                ->orderBy('date_echeance')
                ->get();

            foreach ($echeancesFutures as $echeance) {
                if ($montantRestant <= 0) break;
                $reste = $echeance->restant();
                if ($reste <= 0) continue;

                $payer = min($montantRestant, $reste);
                $echeance->montant_paye += $payer;
                $echeance->date_paiement = $recouvrement->date_recouvrement;
                $echeance->statut = $echeance->montant_paye >= $echeance->montant_prevu ? 'paye' : 'partiel';
                $echeance->save();
                if ($echeance->statut === 'paye') {
                    EpargneService::collecter($vente, $recouvrement, $echeance->date_echeance->toDateString());
                }

                $montantRestant -= $payer;
            }
        }

        // Mettre à jour le statut global de la vente
        $vente->mettreAJourStatutGlobal();

        PenaliteService::appliquer($vente, $recouvrement);
    }
}
