# ETAT DU PROJET — SOUROUGNON

## ROLE ET PROTOCOLE (a respecter sans le reformuler)
Architecte Laravel senior, testeur QA, priorite absolue a la fiabilite des
donnees financieres. Travail en SSH direct sur la production AlwaysData
(Laravel, PHP, MySQL sourougnon_db, frontend JS vanilla sans build).
ATTENTION : public/dashboard/js/ et public/dashboard/chef/js/ contiennent
des fichiers DUPLIQUES aux memes noms. Une correction dans l'un ne
s'applique pas a l'autre — toujours verifier les deux.

Protocole calibre par risque :
- Affichage/CSS/JS front simple -> correction directe + test visuel
- Requete de lecture / KPI / filtre -> controle SQL avant/apres
- Ecriture en base, calcul financier, migration -> 5 etapes : diagnostic,
  controle (verifier avant de conclure, poser 1 question si info manquante),
  avis critique, double-check anti-regression, plan d'action numerote avec
  critere de succes.

Regles absolues :
1. Ne jamais inventer un fichier/colonne/relation non verifiee — demander
   le grep/cat reel avant de patcher.
2. Distinguer cause PROUVEE / PROBABLE / information MANQUANTE.
3. Une correction = un probleme. Jamais backend+frontend sans test entre les deux.
4. php -l apres toute edition PHP, node --check apres toute edition JS.
5. php artisan optimize:clear apres toute modif config/route.
6. Cache-busting (?v=) obligatoire sur tout <script src> modifie.
7. Un script de remplacement (sed/python) doit verifier que le pattern existe
   et annoncer l'echec — jamais ecrire un fichier inchange en silence.
8. Le cache navigateur est le premier suspect : verifier au curl direct
   avant de chercher un bug de code.
9. Erreur reseau (offline) != 401 (session expiree) — ne jamais les confondre
   dans la gestion d'erreur JS.
10. Une valeur a 0 n'est pas une valeur absente : jamais de `if(x)` ou
    `x || fallback` sur un champ numerique qui peut valoir 0.
11. Le serveur est seule autorite de calcul. Le mobile ne soumet que des
    faits bruts + un sync_uuid pour l'idempotence, jamais un calcul metier.
12. Ne pas relancer un sujet marque REGLE ci-dessous.

## REGLES METIER (ne jamais reinventer differemment)
- Mise quotidienne : montant_journalier = (montant + epargne_total) / jours
  (jours max 20). epargne_total = epargne_par_jour (defaut 300) x jours.
  Exemple valide : dette 20000, 20j -> epargne 6000 -> journalier 1300.
- Penalite fixe si dû du jour impaye : 1000 FCFA (penalite_par_jour).
- Mise agent : a la fin d'un credit solde normalement, l'agent recupere
  1 jour d'epargne (300 FCFA), la gerante reverse le reste (19j = 5700 FCFA)
  a la debitrice. Si la debitrice ne paie pas ses dus, l'epargne accumulee
  est retenue par la gerante pour se rembourser au lieu d'etre reversee.
- Epargne : visible en Caisse uniquement, jamais en Comptabilite.
  Penalites : peuvent apparaitre dans les deux, en "divers".
- credits_autorises (sur debiteurs) = NOMBRE de credits simultanes
  autorises, PAS un plafond en FCFA. Chef d'agence peut deroger si le
  score de solvabilite le justifie (motif obligatoire si score < 40%,
  trace dans DerogationSolvabilite pour recalibrage futur).
- Score de solvabilite : scorecard pondere (PAS un modele statistique
  "scientifique" a presenter comme tel) — comportement paiement ~50%,
  retards ponderes par recence (decroissance exponentielle, demi-vie 90j),
  credits termines, anciennete, regularite. Cold start : score neutre 50
  si < 5 echeances observees. Calcule via
  app(ScoreSolvabiliteService::class)->calculer($debiteur), jamais en
  statique. Echeance::mettreAJourStatut() est rafraichie automatiquement
  a chaque calcul de score, ce point est ferme.
- Roles : gerante (tout), chef_agence (son agence, restrictions UI a
  completer — filtrage reel par agence_id JAMAIS confirme implemente),
  agent (PWA terrain uniquement).

## REGLE — NE PLUS Y REVENIR
- Score de solvabilite : bug d'appel statique corrige, filtre type_vente
  credit applique, retards partiels inclus dans la severite.
- Alertes en double (echeance_jour) : cle de recherche vs valeur ecrite
  corrigee dans AlerteService.
- Fiche debiteur : historique achats/paiements reintegre apres regression,
  fuite de modals empilees corrigee (getElementById + .remove() avant creation).
- Dashboard : 14 KPI dont "echeances du jour" distinct de "retard",
  table Performance Agents fusionnee (plus de doublon avec Statistiques).
- AgentSpaceController::encaisser : idempotence sync_uuid ajoutee,
  garde-fou montant > 0 pour statut paye/partiel (evite l'epargne fantome).
- .env et futur keystore exclus de git, .gitignore verifie a la racine
  ~/sourougnon-backend (pas dans public/).

## OUVERT — PAR PRIORITE
- P1 CaisseController.php:16 — colonne "periode" inexistante sur la table
  caisses, plante a chaque ouverture de caisse. Jamais corrige.
- P2 "Jours payes" affiche 1/20 au lieu de 2/20 apres avoir solde un
  retard en un seul versement. Cause non trouvee — lire
  AgentSpaceController.php lignes 40-105 pour la suite du calcul.
- P3 Boutons Export CSV Epargnes/Penalites jamais ajoutes — noms reels
  des elements HTML cibles jamais identifies
  (grep "innerHTML = " epargnes-penalites-functions.js a faire).
- P4 CORS Capacitor : ajouter https://localhost (pas seulement
  capacitor://localhost) a allowed_origins — propose, non confirme applique.
- P5 Migration sync_uuid unique sur recouvrements — verifier l'absence de
  doublons existants avant de poser la contrainte.
- P6 preloadAllData() (mode offline type KoboCollect : precharger tournee +
  debiteurs + notifications + epargnes + penalites apres login) — concu,
  jamais ecrit.
- P7 Keystore de signature APK release — jamais genere. Sans lui, aucune
  mise a jour compatible apres la premiere distribution aux agents.
- P8 Compilation APK (GitHub Actions ou machine Android Studio) — jamais
  mise en place.
- P9 Filtrage reel par agence_id pour chef_agence — jamais confirme
  implemente en base ni dans les controleurs.

## CHANTIER EN COURS
[a completer avant de coller dans la nouvelle conversation]
