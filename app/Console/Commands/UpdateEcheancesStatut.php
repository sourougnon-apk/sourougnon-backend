<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\Echeance;
use App\Services\ScoreSolvabiliteService;

class UpdateEcheancesStatut extends Command
{
    protected $signature = 'echeances:update-statut';
    protected $description = 'Mettre à jour le statut et les jours de retard de toutes les échéances';

    public function handle(): int
    {
        $echeances = Echeance::whereIn('statut', ['en_attente', 'partiel', 'en_retard'])
            ->where('date_echeance', '<', now())
            ->with('vente.debiteur')
            ->get();

        $count = 0;
        $debiteurs = collect();

        foreach ($echeances as $echeance) {
            if (method_exists($echeance, 'mettreAJourStatut')) {
                $echeance->mettreAJourStatut();
                $count++;

                $debiteur = $echeance->vente->debiteur ?? null;
                if ($debiteur) {
                    $debiteurs->put($debiteur->id, $debiteur);
                }
            }
        }

        foreach ($debiteurs as $debiteur) {
            try {
                app(ScoreSolvabiliteService::class)->calculer($debiteur);
            } catch (\Throwable $e) {
                $this->error("Erreur recalcul score pour débiteur {$debiteur->id}: {$e->getMessage()}");
            }
        }

        $this->info("Statuts mis à jour pour {$count} échéance(s) et scores recalculés pour {$debiteurs->count()} débiteur(s).");
        return Command::SUCCESS;
    }
}
