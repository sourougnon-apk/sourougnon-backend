<?php
namespace App\Http\Controllers\Api;
use App\Http\Controllers\Controller;
use App\Models\Vente;
use App\Models\Recouvrement;
use App\Models\Debiteur;
use App\Models\User;
use App\Models\Produit;
use Illuminate\Http\Request;
use Barryvdh\DomPDF\Facade\Pdf;

class RapportController extends Controller
{
    public function ventes(Request $request)
    {
        $query = Vente::with(['debiteur', 'agent', 'produit']);
        if ($request->date_debut) $query->whereDate('date_debut', '>=', $request->date_debut);
        if ($request->date_fin) $query->whereDate('date_fin', '<=', $request->date_fin);
        if ($request->agent_id) $query->whereHas('agent', fn($q) => $q->where('uuid', $request->agent_id));
        if ($request->statut) $query->where('statut', $request->statut);
        $donnees = $query->orderByDesc('created_at')->get();
        if ($request->format === 'csv') return $this->exportVentesCSV($donnees);
        if ($request->format === 'pdf') {
            $pdf = Pdf::loadView('rapports.ventes', compact('donnees'));
            return $pdf->download('rapport_ventes_' . date('Ymd_His') . '.pdf');
        }
        return response()->json($donnees);
        return response()->json($query->orderByDesc('created_at')->get());
    }

    private function exportVentesCSV($ventes)
    {
        $headers = ['Content-Type' => 'text/csv; charset=utf-8', 'Content-Disposition' => 'attachment; filename=rapport_ventes_' . date('Ymd') . '.csv'];
        $callback = function() use ($ventes) {
            $file = fopen('php://output', 'w');
            fputcsv($file, ['N° Vente', 'Date', 'Débiteur', 'Téléphone', 'Agent', 'Type', 'Montant', 'Journalier', 'Payé', 'Restant', 'Statut']);
            foreach ($ventes as $v) {
                fputcsv($file, [
                    $v->uuid, $v->date_debut, $v->debiteur?->nom . ' ' . $v->debiteur?->prenom,
                    $v->debiteur?->telephone, $v->agent?->nom . ' ' . $v->agent?->prenom,
                    $v->type_vente, $v->montant_total, $v->montant_journalier,
                    $v->totalPaye(), $v->resteAPayer(), $v->statut
                ]);
            }
            fclose($file);
        };
        return response()->stream($callback, 200, $headers);
    }

    public function recouvrements(Request $request)
    {
        $query = Recouvrement::with(['vente.debiteur', 'agent']);
        if ($request->date_debut) $query->whereDate('date_recouvrement', '>=', $request->date_debut);
        if ($request->date_fin) $query->whereDate('date_recouvrement', '<=', $request->date_fin);
        if ($request->agent_id) $query->whereHas('agent', fn($q) => $q->where('uuid', $request->agent_id));
        if ($request->statut) $query->where('statut', $request->statut);
        $donnees = $query->orderByDesc('date_recouvrement')->get();
        if ($request->format === 'csv') return $this->exportRecouvrementsCSV($donnees);
        if ($request->format === 'pdf') {
            $pdf = Pdf::loadView('rapports.recouvrements', ['recouvrements' => $donnees]);
            return $pdf->download('rapport_paiements_' . date('Ymd_His') . '.pdf');
        }
        return response()->json($donnees);
        return response()->json($query->orderByDesc('date_recouvrement')->get());
    }

    private function exportRecouvrementsCSV($recouvrements)
    {
        $headers = ['Content-Type' => 'text/csv; charset=utf-8', 'Content-Disposition' => 'attachment; filename=rapport_paiements_' . date('Ymd') . '.csv'];
        $callback = function() use ($recouvrements) {
            $file = fopen('php://output', 'w');
            fputcsv($file, ['Date', 'Débiteur', 'Agent', 'Montant', 'Mode', 'Statut', 'Commentaire']);
            foreach ($recouvrements as $r) {
                fputcsv($file, [$r->date_recouvrement, $r->vente?->debiteur?->nom . ' ' . $r->vente?->debiteur?->prenom, $r->agent?->nom, $r->montant, $r->mode_paiement, $r->statut, $r->commentaire]);
            }
            fclose($file);
        };
        return response()->stream($callback, 200, $headers);
    }

    public function resume()
    {
        $aujourdhui = now()->toDateString();
        $debutMois = now()->startOfMonth()->toDateString();
        return response()->json([
            'aujourdhui' => [
                'encaissements' => Recouvrement::whereDate('date_recouvrement', $aujourdhui)->where('statut', 'paye')->sum('montant'),
                'nb_paiements' => Recouvrement::whereDate('date_recouvrement', $aujourdhui)->where('statut', 'paye')->count(),
                'ventes_jour' => Vente::whereDate('created_at', $aujourdhui)->count(),
                'ca_jour' => Recouvrement::whereDate('date_recouvrement', $aujourdhui)->where('statut', 'paye')->sum('montant'),
            ],
            'mois' => [
                'encaissements' => Recouvrement::where('statut', 'paye')->whereDate('date_recouvrement', '>=', $debutMois)->sum('montant'),
                'nb_paiements' => Recouvrement::where('statut', 'paye')->whereDate('date_recouvrement', '>=', $debutMois)->count(),
                'ventes_mois' => Vente::whereDate('created_at', '>=', $debutMois)->count(),
                'creances' => Vente::where('statut', 'en_cours')->get()->sum(fn($v) => $v->resteAPayer()),
            ],
            'top_debiteurs_retard' => Vente::where('statut', 'en_cours')->where('date_debut', '<=', now()->subDays(3))
                ->whereDoesntHave('recouvrements', fn($q) => $q->where('date_recouvrement', '>=', now()->subDays(3))->where('statut', 'paye'))
                ->with('debiteur')->get()->pluck('debiteur')->unique()->values()->take(10),
            'top_agents_mois' => Recouvrement::where('statut', 'paye')->whereDate('date_recouvrement', '>=', $debutMois)
                ->selectRaw('agent_id, SUM(montant) as total')->with('agent')->groupBy('agent_id')->orderByDesc('total')->limit(5)->get(),
        ]);
    }

    public function resumePdf(Request $request)
    {
        $resume = $this->resume()->original ?? [];
        $pdf = Pdf::loadView('rapports.resume', ['resume' => $resume]);
        return $pdf->download('resume_mensuel_' . date('Ymd_His') . '.pdf');
    }
}
