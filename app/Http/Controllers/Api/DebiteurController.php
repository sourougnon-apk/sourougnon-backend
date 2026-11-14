<?php
namespace App\Http\Controllers\Api;
use App\Http\Controllers\Controller;
use App\Models\Debiteur;
use App\Models\User;
use Illuminate\Http\Request;
use Maatwebsite\Excel\Facades\Excel;
use App\Imports\ClientsImport;
use Illuminate\Support\Str;

class DebiteurController extends Controller
{
    public function index(Request $request)
    {
        $query = Debiteur::where('actif', true)->with(['agent:id,uuid,nom,prenom', 'ancienAgent:id,uuid,nom,prenom']);
        if ($request->agent_id) {
            $query->whereHas('agent', fn($q) => $q->where('uuid', $request->agent_id));
        }
        if ($request->q) {
            $q = $request->q;
            $query->where(function($sql) use ($q) {
                $sql->where('nom', 'LIKE', "%$q%")->orWhere('prenom', 'LIKE', "%$q%")->orWhere('telephone', 'LIKE', "%$q%")->orWhere('quartier', 'LIKE', "%$q%");
            });
        }
        return response()->json($query->orderBy('nom')->get());
    }

    public function showAgent(Request $request, string $uuid)
    {
        $user = $request->user();
        $debiteur = Debiteur::where('uuid', $uuid)
            ->where('agent_id', $user->id)
            ->with([
                'agent:id,uuid,nom,prenom',
                'score',
                'ventes' => fn($q) => $q->orderByDesc('created_at'),
                'ventes.recouvrements',
                'ventes.echeances',
                'ventes.venteProduits.produit',
                'ventes.produit',
            ])
            ->first();

        if (!$debiteur) {
            return response()->json(['error' => 'Débiteur introuvable ou non autorisé.'], 404);
        }

        // Ajouter totalPaye, reste, jours payes/impayes et pénalités
        $debiteur->ventes->transform(function ($v) {
            $v->total_paye = $v->totalPaye();
            $v->reste_a_payer = $v->resteAPayer();
            $v->jours_payes = $v->echeances()->where('statut', 'paye')->count();
            $v->jours_total = max(1, $v->nombre_jours);
            $v->jours_impayes = $v->echeances()
                ->whereIn('statut', ['en_retard', 'partiel'])
                ->whereDate('date_echeance', '<', now()->toDateString())
                ->count();
            $v->penalites_en_attente = $v->penalites()->where('statut', 'en_attente')->sum('montant');
            return $v;
        });

        return response()->json($debiteur);
    }

    public function indexAgent(Request $request)
    {
        $user = $request->user();
        $debiteurs = Debiteur::where('agent_id', $user->id)
            ->where('actif', true)
            ->with(['agent:id,uuid,nom,prenom', 'ventes' => fn($q) => $q->where('statut', 'en_cours'), 'ventes.echeances'])
            ->orderBy('nom')
            ->get();

        $debiteurs->transform(function ($debiteur) {
            $ventes = $debiteur->ventes ?? collect();
            $enRetard = $ventes->flatMap->echeances
                ->whereIn('statut', ['en_retard', 'partiel'])
                ->where('date_echeance', '<', now()->toDateString())
                ->isNotEmpty();
            $reste = $ventes->sum(fn($v) => $v->resteAPayer());
            $debiteur->statut_global = $enRetard ? 'en_retard' : 'a_jour';
            $debiteur->reste_a_payer_total = $reste;
            unset($debiteur->ventes);
            return $debiteur;
        });

        return response()->json($debiteurs);
    }

    public function show(string $uuid)
    {
        $debiteur = Debiteur::where('uuid', $uuid)
            ->with(['agent:id,uuid,nom,prenom', 'ancienAgent:id,uuid,nom,prenom'])
            ->firstOrFail();
        $debiteur->load(['ventes' => fn($q) => $q->orderByDesc('created_at'), 'ventes.recouvrements', 'ventes.echeances', 'ventes.penalites']);
        $debiteur->ventes->transform(function ($v) {
            $v->total_paye = $v->totalPaye();
            $v->reste_a_payer = $v->resteAPayer();
            $v->jours_payes = $v->echeances()->where('statut', 'paye')->count();
            $v->jours_total = max(1, $v->nombre_jours);
            $v->jours_impayes = $v->echeances()
                ->whereIn('statut', ['en_retard', 'partiel'])
                ->whereDate('date_echeance', '<', now()->toDateString())
                ->count();
            $v->penalites_en_attente = $v->penalites()->where('statut', 'en_attente')->sum('montant');
            return $v;
        });
        return response()->json($debiteur);
    }

    public function store(Request $request)
    {
        $request->validate(['agent_id' => 'required|exists:users,uuid', 'nom' => 'required|string|max:100']);
        $agent = User::where('uuid', $request->agent_id)->firstOrFail();
        $debiteur = Debiteur::create([
            'uuid' => Str::uuid(),
            'agent_id' => $agent->id,
            'nom' => $request->nom,
            'prenom' => $request->prenom ?? '',
            'telephone' => $request->telephone ?? '',
            'quartier' => $request->quartier ?? '',
            'adresse' => $request->adresse ?? '',
            'activite' => $request->activite ?? '',
            'personne_reference_nom' => $request->personne_reference_nom ?? '',
            'personne_reference_tel' => $request->personne_reference_tel ?? '',
            'credits_autorises' => (int) ($request->credits_autorises ?? $request->limite_credit ?? 1),
            'score_solvabilite' => 50,
        ]);
        return response()->json(['success' => true, 'uuid' => $debiteur->uuid], 201);
    }

    public function update(Request $request, string $uuid)
    {
        $debiteur = Debiteur::where('uuid', $uuid)->firstOrFail();
        $debiteur->update($request->only(['nom','prenom','telephone','quartier','adresse','activite','credits_autorises','personne_reference_nom','personne_reference_tel']));
        return response()->json(['success' => true]);
    }

    public function destroy(string $uuid)
    {
        $debiteur = Debiteur::where('uuid', $uuid)->firstOrFail();
        $debiteur->update(['actif' => false]);
        return response()->json(['success' => true]);
    }

    public function import(Request $request)
    {
        $request->validate([
            'file' => 'required|file|mimes:xlsx,xls,csv|max:10240' // Max 10 Mo
        ]);

        try {
            $file = $request->file('file');
            $nomFichier = 'import_clients_' . time() . '.' . $file->getClientOriginalExtension();
            $file->move(storage_path('app/imports'), $nomFichier);
            
            Excel::import(new ClientsImport, storage_path('app/imports/' . $nomFichier));

            return response()->json([
                'success' => true,
                'message' => 'Importation terminée avec succès.',
                'count' => \App\Models\Debiteur::count(),
            ]);
        } catch (\Throwable $e) {
            return response()->json(['error' => 'Erreur d\'importation : ' . $e->getMessage()], 500);
        }
    }


    public function searchByCodes(Request $request)
    {
        $codes = array_map('trim', explode(',', $request->input('codes', '')));
        $codes = array_filter($codes);

        $debiteurs = \App\Models\Debiteur::with('agence')
            ->whereIn('code_client', $codes)
            ->get();

        return response()->json($debiteurs);
    }

    public function attribuerAgence(Request $request)
    {
        $request->validate([
            'uuids' => 'required|array',
            'uuids.*' => 'exists:debiteurs,uuid',
            'agence_id' => 'required|exists:agences,id',
        ]);

        \App\Models\Debiteur::whereIn('uuid', $request->uuids)
            ->update(['agence_id' => $request->agence_id]);

        return response()->json(['success' => true, 'count' => count($request->uuids)]);
    }

}
