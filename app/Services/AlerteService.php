<?php
namespace App\Services;
use App\Models\Alerte;
use App\Models\Echeance;
use App\Models\Vente;
use App\Models\Produit;
use Illuminate\Support\Str;

class AlerteService
{
    // Appelé après chaque action métier
    public static function verifierEtGenerer(): void
    {
        self::retards();
        self::echeancesJour();
        self::stocksFaibles();
        self::creditsFinissants();
    }

    private static function retards(): void
    {
        $retards = Echeance::whereIn('statut', ['en_retard', 'partiel'])
            ->whereDate('date_echeance', '<', now()->toDateString())
            ->with('vente.debiteur')
            ->get();
        foreach ($retards as $r) {
            $niveau = $r->jours_retard >= 7 ? 'critique' : ($r->jours_retard >= 3 ? 'avertissement' : 'info');
            Alerte::updateOrCreate(
                ['vente_id' => $r->vente_id, 'type' => 'retard'],
                [
                    'uuid' => Str::uuid(),
                    'debiteur_id' => $r->vente->debiteur_id,
                    'titre' => 'Retard de paiement',
                    'message' => ($r->vente->debiteur?->nom ?? 'Débiteur') . ' : ' . $r->jours_retard . ' jour(s) de retard. Restant : ' . number_format($r->restant(), 0, ',', ' ') . ' FCFA.',
                    'niveau' => $niveau,
                    'lue' => false,
                    'date_alerte' => now(),
                ]
            );
        }
    }

    private static function echeancesJour(): void
{
    $aujourdhui = now()->toDateString();
    $echeances = Echeance::whereDate('date_echeance', $aujourdhui)
        ->where('statut', 'en_attente')
        ->with('vente.debiteur')
        ->get();
    foreach ($echeances as $e) {
        Alerte::updateOrCreate(
            ['vente_id' => $e->vente_id, 'type' => 'echeance_jour', 'date_alerte' => $aujourdhui],
            [
                'uuid' => Str::uuid(),
                'debiteur_id' => $e->vente->debiteur_id,
                'titre' => 'Échéance du jour',
                'message' => ($e->vente->debiteur?->nom ?? 'Débiteur') . ' doit payer ' . number_format($e->montant_prevu, 0, ',', ' ') . ' FCFA aujourd\'hui.',
                'niveau' => 'info',
                'lue' => false,
            ]
        );
    }
}

    private static function stocksFaibles(): void
    {
        $stocks = Produit::where('actif', true)->where('stock', '<=', \DB::raw('seuil_alerte'))->get();
        foreach ($stocks as $p) {
            Alerte::updateOrCreate(
                ['produit_id' => $p->id, 'type' => 'stock_faible'],
                [
                    'uuid' => Str::uuid(),
                    'titre' => 'Stock faible',
                    'message' => $p->nom . ' : ' . $p->stock . ' unité(s) (seuil : ' . $p->seuil_alerte . ')',
                    'niveau' => $p->stock == 0 ? 'critique' : 'avertissement',
                    'lue' => false,
                    // 'date_alerte' déjà dans la clé, ne pas écraser
                ]
            );
        }
    }

    private static function creditsFinissants(): void
    {
        $credits = Vente::where('statut', 'en_cours')
            ->whereDate('date_fin', '<=', now()->addDays(1)->toDateString())
            ->with('debiteur')
            ->get();
        foreach ($credits as $v) {
            Alerte::updateOrCreate(
                ['vente_id' => $v->id, 'type' => 'credit_finissant'],
                [
                    'uuid' => Str::uuid(),
                    'debiteur_id' => $v->debiteur_id,
                    'titre' => 'Crédit finissant',
                    'message' => ($v->debiteur?->nom ?? 'Débiteur') . ' : échéance finale le ' . $v->date_fin->format('d/m/Y') . '. Restant : ' . number_format($v->resteAPayer(), 0, ',', ' ') . ' FCFA.',
                    'niveau' => 'avertissement',
                    'lue' => false,
                    'date_alerte' => now(),
                ]
            );
        }
    }
}
