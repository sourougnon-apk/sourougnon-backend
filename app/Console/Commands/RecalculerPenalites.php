<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\Echeance;
use App\Services\PenaliteService;

class RecalculerPenalites extends Command
{
    protected $signature = 'penalites:recalculer';
    protected $description = 'Met à jour les statuts des échéances et recalcule les pénalités en attente';

    public function handle()
    {
        $this->info('Mise à jour des échéances échues...');

        Echeance::whereDate('date_echeance', '<', today())
            ->whereNotIn('statut', ['paye', 'annule'])
            ->chunkById(200, function ($lot) {
                foreach ($lot as $e) {
                    $e->mettreAJourStatut();
                }
            });

        PenaliteService::genererEnAttente();
        PenaliteService::genererPenalitesRetardPaye();

        $this->info('Pénalités recalculées.');
        return 0;
    }
}
