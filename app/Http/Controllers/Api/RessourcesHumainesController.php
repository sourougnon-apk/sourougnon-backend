<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Absence;
use App\Models\Employe;
use App\Models\FichePaieConfig;
use App\Models\Salaire;
use App\Models\TourneeDemarrage;
use App\Models\User;
use App\Services\CaisseService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class RessourcesHumainesController extends Controller
{
    public function employes()
    {
        $employes = Employe::with('user:id,uuid,nom,prenom,email,role,actif')->get();
        return response()->json($employes);
    }

    public function storeEmploye(Request $request)
    {
        $request->validate([
            'user_id' => 'required|exists:users,uuid',
            'poste' => 'nullable|string',
            'date_embauche' => 'nullable|date',
            'salaire_base' => 'required|numeric|min:0',
            'mode_calcul' => 'required|in:fixe,journalier',
        ]);

        $user = User::where('uuid', $request->user_id)->firstOrFail();

        if (Employe::where('user_id', $user->id)->exists()) {
            return response()->json(['error' => 'Employé déjà existant.'], 422);
        }

        $employe = Employe::create([
            'uuid' => (string) Str::uuid(),
            'user_id' => $user->id,
            'poste' => $request->poste,
            'date_embauche' => $request->date_embauche,
            'salaire_base' => $request->salaire_base,
            'mode_calcul' => $request->mode_calcul,
        ]);

        return response()->json(['success' => true, 'employe' => $employe]);
    }

    public function updateEmploye(Request $request, $uuid)
    {
        $employe = Employe::where('uuid', $uuid)->firstOrFail();
        $request->validate([
            'poste' => 'nullable|string',
            'date_embauche' => 'nullable|date',
            'salaire_base' => 'numeric|min:0',
            'mode_calcul' => 'in:fixe,journalier',
        ]);
        $employe->update($request->only('poste', 'date_embauche', 'salaire_base', 'mode_calcul'));
        return response()->json(['success' => true]);
    }

    public function updateFichePaieConfig(Request $request, $user_uuid)
    {
        $user = User::where('uuid', $user_uuid)->firstOrFail();
        $request->validate([
            'retenues' => 'nullable|array',
            'mentions_libres' => 'nullable|array',
        ]);

        FichePaieConfig::updateOrCreate(
            ['user_id' => $user->id],
            [
                'retenues' => $request->input('retenues', []),
                'mentions_libres' => $request->input('mentions_libres', []),
            ]
        );

        return response()->json(['success' => true, 'message' => 'Configuration de fiche de paie enregistrée.']);
    }

    public function presences(Request $request)
    {
        $mois = $request->input('mois', now()->format('Y-m'));

        $presences = TourneeDemarrage::where('date_tournee', 'like', "$mois%")
            ->whereIn('statut', ['en_cours', 'terminee'])
            ->selectRaw('agent_id as user_id, COUNT(DISTINCT DATE(created_at)) as nb_jours')
            ->groupBy('agent_id')
            ->get()
            ->keyBy('user_id');

        $employes = Employe::with('user')->get()->map(function($emp) use ($presences) {
            $emp->nb_jours_travailles = $presences[$emp->user_id]->nb_jours ?? 0;
            return $emp;
        });

        return response()->json($employes);
    }

    public function absences()
    {
        return response()->json(Absence::with('employe.user')->get());
    }

    public function storeAbsence(Request $request)
    {
        $request->validate([
            'employe_uuid' => 'required|exists:employes,uuid',
            'date_debut' => 'required|date',
            'date_fin' => 'required|date|after_or_equal:date_debut',
            'type' => 'required|in:conge,maladie,injustifiee',
            'motif' => 'nullable|string',
        ]);

        $employe = Employe::where('uuid', $request->employe_uuid)->firstOrFail();

        $absence = Absence::create([
            'uuid' => (string) Str::uuid(),
            'employe_id' => $employe->id,
            'date_debut' => $request->date_debut,
            'date_fin' => $request->date_fin,
            'type' => $request->type,
            'motif' => $request->motif,
        ]);

        return response()->json(['success' => true, 'absence' => $absence]);
    }

    public function calculerSalaires(Request $request)
    {
        $request->validate([
            'periode' => 'required|date_format:Y-m', // ex: 2026-09
        ]);

        $periode = $request->periode;
        $debutMois = $periode . '-01';
        $finMois = (new \DateTime($debutMois))->modify('last day of this month')->format('Y-m-d');

        // Jours ouvrables simplifiés = jours du mois moins les dimanches (à affiner plus tard)
        $joursOuvrables = 0;
        $date = new \DateTime($debutMois);
        $end = new \DateTime($finMois);
        while ($date <= $end) {
            if ($date->format('N') != 7) $joursOuvrables++; // 7 = dimanche
            $date->modify('+1 day');
        }

        $employes = Employe::where('mode_calcul', 'journalier')->with('user')->get();

        foreach ($employes as $employe) {
            // Jours travaillés réels = jours distincts avec tournée
            $joursTravailles = TourneeDemarrage::where('agent_id', $employe->user_id)
                ->whereBetween('date_tournee', [$debutMois, $finMois])
                ->whereIn('statut', ['en_cours', 'terminee'])
                ->distinct('date_tournee')
                ->count('date_tournee');

            // Ajouter les absences justifiées comme jours travaillés
            $absJustifiees = Absence::where('employe_id', $employe->id)
                ->whereBetween('date_debut', [$debutMois, $finMois])
                ->whereIn('type', ['conge', 'maladie'])
                ->get();

            foreach ($absJustifiees as $abs) {
                $d = new \DateTime($abs->date_debut);
                $endAbs = new \DateTime($abs->date_fin);
                while ($d <= $endAbs) {
                    if ($d->format('N') != 7) $joursTravailles++;
                    $d->modify('+1 day');
                }
            }

            $salaireBrut = round($employe->salaire_base * $joursTravailles / max(1, $joursOuvrables), 2);

            $lignesRetenues = FichePaieConfig::where('user_id', $employe->user_id)->value('retenues') ?? [];
            $totalRetenues = 0;
            foreach ($lignesRetenues as $retenue) {
                if ($retenue['type'] === 'pourcentage') {
                    $montant = $salaireBrut * $retenue['valeur'] / 100;
                } else {
                    $montant = $retenue['valeur'];
                }
                $totalRetenues += $montant;
            }
            $salaireNet = $salaireBrut - $totalRetenues;

            $salaire = Salaire::updateOrCreate(
                ['user_id' => $employe->user_id, 'periode' => $periode],
                [
                    'uuid' => (string) Str::uuid(),
                    'employe_id' => $employe->id,
                    'nb_jours_travailles' => $joursTravailles,
                    'nb_jours_ouvrables' => $joursOuvrables,
                    'salaire_brut' => $salaireBrut,
                    'salaire_net' => $salaireNet,
                    'lignes_retenues' => $lignesRetenues,
                    'statut' => 'pending',
                    'created_by' => $request->user()->id,
                ]
            );
        }

        return response()->json(['success' => true, 'message' => 'Salaires calculés pour ' . $periode]);
    }

    public function salaires(Request $request)
    {
        $query = Salaire::with(['employe.user', 'createur'])
            ->orderByDesc('periode');
        if ($request->periode) $query->where('periode', $request->periode);
        return response()->json($query->get());
    }

    public function payerSalaire(Request $request, $uuid)
    {
        $salaire = Salaire::where('uuid', $uuid)->firstOrFail();
        if ($salaire->statut === 'paye') {
            return response()->json(['error' => 'Salaire déjà payé.'], 422);
        }

        $user = $salaire->user;
        $caisse = CaisseService::getCaisseActive($user->id, 'jour');

        $mouvement = \App\Models\MouvementCaisse::create([
            'uuid' => (string) Str::uuid(),
            'caisse_id' => $caisse->id,
            'user_id' => $user->id,
            'type' => 'salaire',
            'montant' => $salaire->salaire_net,
            'motif' => 'Paiement salaire ' . $salaire->periode,
            'date_mouvement' => now(),
            'statut_validation' => 'valide',
        ]);
        CaisseService::recalculer($caisse);

        $salaire->update([
            'statut' => 'paye',
            'date_paiement' => now(),
        ]);

        return response()->json(['success' => true, 'mouvement' => $mouvement]);
    }

    public function modifierRetenues(Request $request, $uuid)
    {
        $salaire = Salaire::where('uuid', $uuid)->firstOrFail();
        $request->validate([
            'retenues' => 'required|array',
        ]);
        $salaire->lignes_retenues = $request->retenues;
        $salaire->save();

        // Recalcul net
        $totalRetenues = 0;
        foreach ($salaire->lignes_retenues as $r) {
            $totalRetenues += ($r['type'] === 'pourcentage') ? $salaire->salaire_brut * $r['valeur'] / 100 : $r['valeur'];
        }
        $salaire->salaire_net = $salaire->salaire_brut - $totalRetenues;
        $salaire->save();

        return response()->json(['success' => true, 'salaire' => $salaire]);
    }

    public function fichePaie($uuid)
    {
        $salaire = Salaire::with(['employe.user', 'employe.user.agence'])->where('uuid', $uuid)->firstOrFail();
        $agence = $salaire->employe->user->agence;
        return view('rh.fiche-paie', compact('salaire', 'agence'));
    }
}
