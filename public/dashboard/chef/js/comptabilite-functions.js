(function () {
    'use strict';

    function formaterMontant(valeur) {
        var nombre = Number(valeur || 0);
        return new Intl.NumberFormat('fr-FR', {
            style: 'currency',
            currency: 'XOF',
            maximumFractionDigits: 0
        }).format(nombre);
    }

    function echapper(valeur) {
        var element = document.createElement('div');
        element.textContent = valeur == null ? '' : String(valeur);
        return element.innerHTML;
    }

    function chargerJournal(page) {
        page = page || 1;
        return apiFetch('/comptabilite/journal?page=' + page + '&par_page=50')
            .then(function (reponse) {
                return reponse || { donnees: [], page: 1, total_pages: 1 };
            });
    }

    function chargerBalance() {
        return apiFetch('/comptabilite/balance');
    }

    function chargerGrandLivre() {
        return apiFetch('/comptabilite/grand-livre');
    }

    function chargerEtatsFinanciers() {
        return apiFetch('/comptabilite/etats-financiers');
    }

    function afficherErreur(conteneur, erreur) {
        console.error('Erreur comptabilité:', erreur);
        conteneur.innerHTML =
            '<div class="panel text-center py-12">' +
                '<p class="text-red-600 font-semibold">Erreur de chargement de la comptabilité.</p>' +
                '<p class="text-sm text-muted mt-2">' +
                    echapper(erreur && erreur.message ? erreur.message : 'Erreur inconnue') +
                '</p>' +
            '</div>';
    }

    function construireLignesGrandLivre(comptes) {
        if (!Array.isArray(comptes) || comptes.length === 0) {
            return '<tr><td colspan="5" class="text-center text-muted py-4">Aucune écriture</td></tr>';
        }

        return comptes.map(function (compte) {
            var solde = Number(compte.solde || 0);
            var classeSolde = solde >= 0 ? 'text-green-600' : 'text-red-600';

            return '<tr>' +
                '<td class="font-mono text-xs">' + echapper(compte.compte) + '</td>' +
                '<td class="font-medium">' + echapper(compte.libelle) + '</td>' +
                '<td class="text-right">' + formaterMontant(compte.debit) + '</td>' +
                '<td class="text-right">' + formaterMontant(compte.credit) + '</td>' +
                '<td class="text-right font-semibold ' + classeSolde + '">' + formaterMontant(solde) + '</td>' +
            '</tr>';
        }).join('');
    }

    function construireLignesJournal(journal) {
        if (!Array.isArray(journal) || journal.length === 0) {
            return '<tr><td colspan="7" class="text-center text-muted py-4">Aucune écriture comptable</td></tr>';
        }

        return journal.map(function (ecriture) {
            return '<tr>' +
                '<td>' + echapper(new Date(ecriture.date_ecriture).toLocaleDateString('fr-FR')) + '</td>' +
                '<td>' + echapper(ecriture.numero_ecriture) + '</td>' +
                '<td>' + echapper(ecriture.compte_debit) + '</td>' +
                '<td>' + echapper(ecriture.compte_credit) + '</td>' +
                '<td>' + echapper(ecriture.libelle) + '</td>' +
                '<td class="text-right">' + formaterMontant(ecriture.montant) + '</td>' +
                '<td>' + echapper(ecriture.reference) + '</td>' +
            '</tr>';
        }).join('');
    }

    function afficherPagination(journal) {
        var page = Number(journal.page || 1);
        var totalPages = Math.max(1, Number(journal.total_pages || 1));

        return '<div class="flex gap-2 items-center">' +
            '<button id="journal-page-precedente" class="px-3 py-1 border rounded-lg text-sm" ' + (page <= 1 ? 'disabled' : '') + '>Précédente</button>' +
            '<span class="text-sm">Page ' + page + ' / ' + totalPages + '</span>' +
            '<button id="journal-page-suivante" class="px-3 py-1 border rounded-lg text-sm" ' + (page >= totalPages ? 'disabled' : '') + '>Suivante</button>' +
        '</div>';
    }

    function loadComptabilite(conteneur) {
        var pageJournal = 1;

        function chargerEtAfficher() {
            Promise.all([
                chargerBalance(),
                chargerGrandLivre(),
                chargerJournal(pageJournal),
                chargerEtatsFinanciers()
            ])
            .then(function (resultats) {
                var balance = resultats[0] || {};
                var grandLivre = Array.isArray(resultats[1]) ? resultats[1] : [];
                var journal = resultats[2] || {};
                var etats = resultats[3] || {};

                var totalDebit = Number(balance.total_debit || 0);
                var totalCredit = Number(balance.total_credit || 0);
                var ecart = Number(balance.ecart || (totalDebit - totalCredit));

                var balanceEstEquilibree =
                    balance.equilibree === true ||
                    balance.equilibre === true ||
                    Math.abs(ecart) < 0.01;

                var compteResultat = etats.compte_resultat || {};
                var bilan = etats.bilan_synthetique || {};

                conteneur.innerHTML =
                    '<div class="fade-in space-y-6">' +
                        '<div class="flex items-center justify-between">' +
                            '<h3 class="text-xl font-bold">Comptabilité</h3>' +
                            '<div class="flex gap-2">' +
                                '<button onclick="exportJournal()" class="bg-accent text-white px-3 py-2 rounded-lg text-xs font-semibold">Journal CSV</button>' +
                                '<button onclick="exportGrandLivre()" class="bg-blue-600 text-white px-3 py-2 rounded-lg text-xs font-semibold">Grand Livre CSV</button>' +
                                '<button onclick="exportEtatsFinanciers()" class="bg-emerald-600 text-white px-3 py-2 rounded-lg text-xs font-semibold">États Financiers CSV</button>' +
                            '</div>' +
                        '</div>' +

                        '<div class="kpi-grid">' +
                            '<div class="kpi-card" style="border-left:3px solid #0066ff">' +
                                '<div class="kpi-label">Total Débit</div>' +
                                '<div class="kpi-value">' + formaterMontant(totalDebit) + '</div>' +
                            '</div>' +

                            '<div class="kpi-card" style="border-left:3px solid #00c853">' +
                                '<div class="kpi-label">Total Crédit</div>' +
                                '<div class="kpi-value">' + formaterMontant(totalCredit) + '</div>' +
                            '</div>' +

                            '<div class="kpi-card" style="border-left:3px solid ' + (balanceEstEquilibree ? '#00c853' : '#ef4444') + '">' +
                                '<div class="kpi-label">Balance</div>' +
                                '<div class="kpi-value">' + (balanceEstEquilibree ? 'Équilibrée' : 'Déséquilibrée') + '</div>' +
                                '<div class="text-xs text-muted mt-1">Écart : ' + formaterMontant(ecart) + '</div>' +
                            '</div>' +
                        '</div>' +

                        '<div class="panel">' +
                            '<h3>Grand Livre</h3>' +
                            '<div class="table-wrapper">' +
                                '<table>' +
                                    '<thead><tr><th>Compte</th><th>Libellé</th><th class="text-right">Débit</th><th class="text-right">Crédit</th><th class="text-right">Solde</th></tr></thead>' +
                                    '<tbody>' + construireLignesGrandLivre(balance.comptes && balance.comptes.length ? balance.comptes : grandLivre) + '</tbody>' +
                                '</table>' +
                            '</div>' +
                        '</div>' +

                        '<div class="panel">' +
                            '<div class="flex items-center justify-between mb-3">' +
                                '<h3>Journal Comptable</h3>' +
                                '<div id="journal-pagination">' + afficherPagination(journal) + '</div>' +
                            '</div>' +
                            '<div class="table-wrapper" style="max-height:450px;overflow:auto">' +
                                '<table>' +
                                    '<thead><tr><th>Date</th><th>N°</th><th>Débit</th><th>Crédit</th><th>Libellé</th><th class="text-right">Montant</th><th>Référence</th></tr></thead>' +
                                    '<tbody id="journal-table">' + construireLignesJournal(journal.donnees || []) + '</tbody>' +
                                '</table>' +
                            '</div>' +
                        '</div>' +

                        '<div class="panel">' +
                            '<h3>États Financiers</h3>' +
                            '<div class="grid grid-cols-2 gap-4">' +
                                '<div><p class="text-sm text-muted">Chiffre d\'affaires</p><p class="text-lg font-bold">' + formaterMontant(compteResultat.chiffre_affaires) + '</p></div>' +
                                '<div><p class="text-sm text-muted">Encaissements</p><p class="text-lg font-bold">' + formaterMontant(compteResultat.encaissements) + '</p></div>' +
                                '<div><p class="text-sm text-muted">Charges</p><p class="text-lg font-bold">' + formaterMontant(compteResultat.charges) + '</p></div>' +
                                '<div><p class="text-sm text-muted">Bénéfice brut</p><p class="text-lg font-bold">' + formaterMontant(compteResultat.benefice_brut) + '</p></div>' +
                                '<div><p class="text-sm text-muted">Valeur stock</p><p class="text-lg font-bold">' + formaterMontant(compteResultat.valeur_stock) + '</p></div>' +
                                '<div><p class="text-sm text-muted">Actif total</p><p class="text-lg font-bold">' + formaterMontant(bilan.actif_total) + '</p></div>' +
                                '<div><p class="text-sm text-muted">Passif total</p><p class="text-lg font-bold">' + formaterMontant(bilan.passif_total) + '</p></div>' +
                            '</div>' +
                        '</div>' +
                    '</div>';

                // Ajouter les sections secondaire et consolidée
                var sec = document.createElement('div');
                sec.id = 'compta-secondaire-content';
                var cons = document.createElement('div');
                cons.id = 'compta-consolidee-content';
                conteneur.appendChild(sec);
                conteneur.appendChild(cons);
                loadComptabiliteSecondaire();
                loadComptabiliteConsolidee();

                // Pagination
                var boutonPrecedent = document.getElementById('journal-page-precedente');
                var boutonSuivant = document.getElementById('journal-page-suivante');

                if (boutonPrecedent) {
                    boutonPrecedent.onclick = function () {
                        if (pageJournal > 1) {
                            pageJournal--;
                            chargerEtAfficher();
                        }
                    };
                }

                if (boutonSuivant) {
                    boutonSuivant.onclick = function () {
                        var totalPages = Number(journal.total_pages || 1);
                        if (pageJournal < totalPages) {
                            pageJournal++;
                            chargerEtAfficher();
                        }
                    };
                }
            })
            .catch(function (erreur) {
                afficherErreur(conteneur, erreur);
            });
        }

        chargerEtAfficher();
    }

    function loadComptabiliteSecondaire() {
        apiFetch('/comptabilite/secondaire').then(function(data) {
            const conteneur = document.getElementById('compta-secondaire-content');
            if (!conteneur) return;
            const f = formaterMontant;

            conteneur.innerHTML = `
                <div class="panel">
                    <h3>Comptabilité 2 — Épargnes & Pénalités</h3>
                    <div class="grid grid-cols-2 gap-4">
                        <div><p class="text-sm text-muted">Total Débit</p><p class="text-lg font-bold">${f(data.balance?.total_debit)}</p></div>
                        <div><p class="text-sm text-muted">Total Crédit</p><p class="text-lg font-bold">${f(data.balance?.total_credit)}</p></div>
                    </div>
                    <div class="table-wrapper mt-4">
                        <table>
                            <thead><tr><th>Compte</th><th>Libellé</th><th class="text-right">Débit</th><th class="text-right">Crédit</th><th class="text-right">Solde</th></tr></thead>
                            <tbody>
                                ${(data.grand_livre||[]).map(l => `<tr>
                                    <td>${l.compte}</td>
                                    <td>${l.libelle}</td>
                                    <td class="text-right">${f(l.debit)}</td>
                                    <td class="text-right">${f(l.credit)}</td>
                                    <td class="text-right font-semibold">${f(l.solde)}</td>
                                </tr>`).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            `;
        }).catch(function(err) { console.error(err); });
    }

    function loadComptabiliteConsolidee() {
        apiFetch('/comptabilite/consolidee').then(function(data) {
            const conteneur = document.getElementById('compta-consolidee-content');
            if (!conteneur) return;
            const f = formaterMontant;

            conteneur.innerHTML = `
                <div class="panel">
                    <h3>Comptabilité Consolidée</h3>
                    <div class="grid grid-cols-2 gap-4 mb-4">
                        <div><p class="text-sm text-muted">Total Débit</p><p class="text-lg font-bold">${f(data.total_debit)}</p></div>
                        <div><p class="text-sm text-muted">Total Crédit</p><p class="text-lg font-bold">${f(data.total_credit)}</p></div>
                    </div>
                    <div class="table-wrapper">
                        <table>
                            <thead><tr><th>Compte</th><th>Libellé</th><th class="text-right">Débit</th><th class="text-right">Crédit</th><th class="text-right">Solde</th></tr></thead>
                            <tbody>
                                ${(data.comptes||[]).map(l => `<tr>
                                    <td>${l.compte}</td>
                                    <td>${l.libelle}</td>
                                    <td class="text-right">${f(l.debit)}</td>
                                    <td class="text-right">${f(l.credit)}</td>
                                    <td class="text-right font-semibold">${f(l.solde)}</td>
                                </tr>`).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            `;
        }).catch(function(err) { console.error(err); });
    }

    window.loadComptabilite = loadComptabilite;

    window.exportJournal = function () {
        var token = localStorage.getItem('sourougnon_token') || '';
        window.open('/api/comptabilite/export?token=' + encodeURIComponent(token), '_blank');
    };

    window.exportGrandLivre = function () {
        var token = localStorage.getItem('sourougnon_token') || '';
        window.open('/api/comptabilite/export-grand-livre?token=' + encodeURIComponent(token), '_blank');
    };

    window.exportEtatsFinanciers = function () {
        var token = localStorage.getItem('sourougnon_token') || '';
        window.open('/api/comptabilite/export-etats-financiers?token=' + encodeURIComponent(token), '_blank');
    };
})();
