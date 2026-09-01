<?php
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\AgentController;
use App\Http\Controllers\Api\DebiteurController;
use App\Http\Controllers\Api\VenteController;
use App\Http\Controllers\Api\ProduitController;
use App\Http\Controllers\Api\RecouvrementController;
use App\Http\Controllers\Api\RapportController;
use App\Http\Controllers\Api\ParametreController;
use App\Http\Controllers\Api\StockController;
use App\Http\Controllers\Api\AgentSpaceController;
use App\Http\Controllers\Api\SuiviController;
use App\Http\Controllers\Api\AlerteController;
use App\Http\Controllers\Api\CaisseController;
use App\Http\Controllers\Api\RechercheController;
use App\Http\Controllers\Api\ComptabiliteController;
use App\Http\Controllers\Api\StatistiquesController;
use App\Http\Controllers\Api\NotificationController;
use App\Http\Controllers\Api\ChefAgenceController;
use App\Http\Controllers\Api\RemboursementController;
use App\Http\Controllers\Api\LocalisationController;

// --- Public ---
Route::post('/auth/login', [AuthController::class, 'login']);
Route::get('/localisations', [LocalisationController::class, 'index']);
Route::get('/localisations/seed', [LocalisationController::class, 'seed']);

// FAILLE CONNUE : exports accessibles sans authentification.
// Conserves tels quels volontairement (les boutons "Export CSV" utilisent un lien
// direct sans header Authorization). A securiser dans un chantier dedie.
Route::get('/comptabilite/export', [ComptabiliteController::class, 'exportJournal']);
Route::get('/comptabilite/export-grand-livre', [ComptabiliteController::class, 'exportGrandLivre']);
Route::get('/comptabilite/export-etats-financiers', [ComptabiliteController::class, 'exportEtatsFinanciers']);

Route::middleware('auth.token')->group(function () {

    // --- Tous roles authentifies ---
    Route::get('/auth/me', [AuthController::class, 'me']);
    Route::post('/auth/logout', [AuthController::class, 'logout']);
    Route::post('/auth/change-password', [AuthController::class, 'changePassword']);
    Route::get('/notifications', [NotificationController::class, 'index']);
    Route::get('/notifications/count', [NotificationController::class, 'count']);
    Route::put('/notifications/{uuid}/lue', [NotificationController::class, 'marquerLue']);
    Route::put('/notifications/toutes-lues', [NotificationController::class, 'marquerToutesLues']);
    Route::post('/notifications/generer', [NotificationController::class, 'generer']);

    // --- Espace terrain : agents, chef d'agence (PAS la gerante) ---
    Route::middleware('role:agent,chef_agence')->group(function () {
        Route::get('/agent-space/tournee', [AgentSpaceController::class, 'tournee']);
        Route::post('/agent-space/encaisser', [AgentSpaceController::class, 'encaisser']);
    });

    // --- Espace terrain : agents uniquement ---
    Route::middleware('role:agent')->group(function () {
        Route::get('/agent/debiteurs', [DebiteurController::class, 'indexAgent']);
        Route::get('/agent/debiteurs/{uuid}', [DebiteurController::class, 'showAgent']);
        Route::post('/agent/tournee/demarrer', [App\Http\Controllers\Api\TourneeController::class, 'demarrer']);
        Route::post('/agent/tournee/terminer', [App\Http\Controllers\Api\TourneeController::class, 'terminer']);
        Route::get('/agent/tournee/statut', [App\Http\Controllers\Api\TourneeController::class, 'statut']);

            // Épargnes et pénalités agent
            Route::get('/agent/epargnes', [App\Http\Controllers\Api\EpargneController::class, 'indexAgent']);
            Route::get('/agent/penalites', [App\Http\Controllers\Api\EpargneController::class, 'penalitesAgent']);
        Route::get('/agent/archives', [App\Http\Controllers\Api\ArchiveController::class, 'archivesAgent']);
        Route::get('/agent/bootstrap', [App\Http\Controllers\Api\BootstrapController::class, 'index']);
        Route::get('/agent/encaissements-attente', [App\Http\Controllers\Api\CaisseController::class, 'encaissementsAttenteAgent']);
        Route::get('/agent/remises', [App\Http\Controllers\Api\CaisseController::class, 'remisesAgent']);
        Route::post('/agent/remises', [App\Http\Controllers\Api\CaisseController::class, 'remise']);
        Route::post('/agent/epargnes/{uuid}/restituer', [App\Http\Controllers\Api\EpargneController::class, 'restituerEpargne']);
            Route::post('/agent/penalites/{uuid}/payer', [App\Http\Controllers\Api\EpargneController::class, 'payerPenalite']);
            Route::post('/agent/penalites/{uuid}/refuser', [App\Http\Controllers\Api\EpargneController::class, 'refuserPenalite']);
    });

    // --- Perimetre operationnel complet : chef d'agence + gerante ---
    Route::middleware('role:chef_agence,gerante')->group(function () {

        // Dashboard
        Route::get('/dashboard', [DashboardController::class, 'index']);
        Route::post('/epargnes/{uuid}/valider-restitution', [App\Http\Controllers\Api\EpargneController::class, 'validerRestitution']);
        Route::get('/tournees', [App\Http\Controllers\Api\TourneeController::class, 'index']);

        // Épargnes et pénalités
        Route::get('/epargnes', [App\Http\Controllers\Api\EpargneController::class, 'index']);
        Route::get('/epargnes/export', [\App\Http\Controllers\Api\EpargneController::class, 'exportEpargnes']);
        Route::get('/penalites/export', [\App\Http\Controllers\Api\EpargneController::class, 'exportPenalites']);
        Route::get('/penalites', [App\Http\Controllers\Api\EpargneController::class, 'penalites']);
        Route::get('/chef-agence/dashboard', [ChefAgenceController::class, 'dashboard']);

        // Ventes chef d'agence
        Route::post('/chef-agence/vente-comptant', [ChefAgenceController::class, 'venteComptant']);
        Route::post('/chef-agence/vente-credit', [ChefAgenceController::class, 'venteCredit']);
        Route::post('/chef-agence/create-debiteur', [DebiteurController::class, 'store']);

        // Agents
        Route::get('/agents/export/{uuid}', [AgentController::class, 'exportHistory']);
        Route::apiResource('agents', AgentController::class);

        // Debiteurs
        Route::get('/debiteurs/{uuid}/historique', [ChefAgenceController::class, 'historiqueDebiteur']);
        Route::get('/debiteurs/{uuid}/score', [ChefAgenceController::class, 'scoreDebiteur']);
        Route::apiResource('debiteurs', DebiteurController::class);

        // Ventes
        Route::put('/ventes/{uuid}/annuler', [VenteController::class, 'annuler']);
        Route::get('/ventes/{uuid}/contrat', [VenteController::class, 'contrat']);
        Route::apiResource('ventes', VenteController::class);

        // Produits
        Route::post('/produits/{uuid}/approvisionner', [ProduitController::class, 'approvisionner']);
        Route::apiResource('produits', ProduitController::class);

        // Recouvrements
        Route::post('/recouvrements/group', [RecouvrementController::class, 'encaissementGroup']);
        Route::apiResource('recouvrements', RecouvrementController::class);

        // Stocks
        Route::get('/stocks', [StockController::class, 'index']);
        Route::get('/stocks/mouvements', [StockController::class, 'mouvements']);
        Route::put('/stocks/mouvements/{id}', [StockController::class, 'updateMouvement']);
        Route::delete('/stocks/mouvements/{id}', [StockController::class, 'deleteMouvement']);
        Route::post('/stocks/entree', [StockController::class, 'entree']);
        Route::post('/stocks/sortie', [StockController::class, 'sortie']);
        Route::post('/stocks/inventaire', [StockController::class, 'inventaire']);
        Route::get('/stocks/export', [StockController::class, 'exportMouvements']);

        // Caisse
        Route::get('/caisse', [CaisseController::class, 'index']);
        Route::get('/caisse/remises-en-attente', [CaisseController::class, 'remisesEnAttente']);
        Route::get('/caisse/restitutions-attente', [CaisseController::class, 'restitutionsAttente']);
        Route::get('/caisse/historique', [CaisseController::class, 'historique']);
        Route::get('/caisse/export', [CaisseController::class, 'export']);
        Route::post('/caisse/decaisser', [CaisseController::class, 'decaisser']);
        Route::post('/caisse/cloturer', [CaisseController::class, 'cloturer']);
        Route::post('/caisse/salaire', [CaisseController::class, 'payerSalaire']);
        Route::post('/caisse/remise', [CaisseController::class, 'remise']);
        Route::post('/caisse/remise/{reference}/valider', [CaisseController::class, 'validerRemise']);
        Route::post('/caisse/remise/{reference}/valider', [CaisseController::class, 'validerRemise']);
        Route::get('/caisse/consolidee', [CaisseController::class, 'consolidee']);
        Route::get('/caisse/periode', [CaisseController::class, 'periode']);
        Route::get('/caisse/export-periode', [CaisseController::class, 'exportPeriode']);
        Route::get('/caisse/{uuid}/mouvements', [CaisseController::class, 'mouvements']);
        Route::get('/caisse/{uuid}/export', [CaisseController::class, 'exportCsv']);

        // Suivi et alertes
        Route::get('/suivi', [SuiviController::class, 'index']);
        Route::get('/alertes', [AlerteController::class, 'index']);
        Route::get('/alertes/count', [AlerteController::class, 'count']);
        Route::put('/alertes/toutes-lues', [AlerteController::class, 'marquerToutesLues']);
        Route::put('/alertes/{uuid}/lue', [AlerteController::class, 'marquerLue']);

        // Comptabilite
        Route::get('/comptabilite/journal', [ComptabiliteController::class, 'journal']);
        Route::get('/comptabilite/grand-livre', [ComptabiliteController::class, 'grandLivre']);
        Route::get('/comptabilite/balance', [ComptabiliteController::class, 'balance']);
        Route::get('/comptabilite/secondaire', [App\Http\Controllers\Api\ComptabiliteController::class, 'secondaire']);
        Route::get('/comptabilite/consolidee', [App\Http\Controllers\Api\ComptabiliteController::class, 'consolidee']);
        Route::get('/comptabilite/etats-financiers', [ComptabiliteController::class, 'etatsFinanciers']);

        // Remboursements
        Route::get('/remboursements', [RemboursementController::class, 'index']);
        Route::post('/remboursements', [RemboursementController::class, 'store']);
        Route::put('/remboursements/{uuid}/valider', [RemboursementController::class, 'valider']);
        Route::put('/remboursements/{uuid}/rejeter', [RemboursementController::class, 'rejeter']);

        // Rapports, statistiques, recherche
        Route::get('/rapports/ventes', [RapportController::class, 'ventes']);
        Route::get('/rapports/recouvrements', [RapportController::class, 'recouvrements']);
        Route::get('/rapports/resume', [RapportController::class, 'resume']);
        Route::get('/rapports/resume-pdf', [App\Http\Controllers\Api\RapportController::class, 'resumePdf']);
        Route::get('/statistiques', [StatistiquesController::class, 'index']);
        Route::get('/recherche', [RechercheController::class, 'globale']);
    });

    // --- Gerante exclusivement : parametres et pages futures (Banque, etc.) ---
    Route::middleware('role:gerante')->group(function () {
        Route::get('/parametres', [ParametreController::class, 'index']);
        Route::post('/parametres/agences', [ParametreController::class, 'storeAgence']);
        Route::post('/parametres/magasins', [ParametreController::class, 'storeMagasin']);
        Route::post('/parametres/permissions', [ParametreController::class, 'togglePermission']);
    });
});
