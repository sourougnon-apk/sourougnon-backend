function loadComptabilite(c) {
    var journalPage = 1;
    var journalCompte = '';
    var journalDebut = '';
    var journalFin = '';

    function chargerJournal() {
        var params = '?page=' + journalPage + '&par_page=50';
        if (journalCompte) params += '&compte=' + journalCompte;
        if (journalDebut) params += '&date_debut=' + journalDebut;
        if (journalFin) params += '&date_fin=' + journalFin;
        return apiFetch('/comptabilite/journal' + params);
    }

    function money(v) {
        return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF', maximumFractionDigits: 0 }).format(v || 0);
    }

    function formatDate(iso) {
        if (!iso) return '-';
        const d = new Date(iso);
        if (isNaN(d.getTime())) return iso;
        return d.toLocaleDateString('fr-FR');
    }

    function renderJournalRows(journal) {
        if (!Array.isArray(journal) || journal.length === 0) {
            return '<tr><td colspan="7" class="text-center text-muted py-4">Aucune écriture</td></tr>';
        }
        return journal.map(function(j) {
            return '<tr><td>' + formatDate(j.date_ecriture) + '</td><td>' + j.numero_ecriture + '</td><td>' + j.compte_debit + '</td><td>' + j.compte_credit + '</td><td>' + j.libelle + '</td><td class="text-right">' + money(j.montant) + '</td><td>' + j.reference + '</td></tr>';
        }).join('');
    }

    function renderPagination(jr) {
        var page = Number(jr.page || 1);
        var totalPages = Math.max(1, Number(jr.total_pages || 1));
        return '<div class="flex gap-2 items-center">' +
            '<button id="journal-page-precedente" class="px-3 py-1 border rounded-lg text-sm" ' + (page <= 1 ? 'disabled' : '') + '>Précédente</button>' +
            '<span class="text-sm">Page ' + page + ' / ' + totalPages + '</span>' +
            '<button id="journal-page-suivante" class="px-3 py-1 border rounded-lg text-sm" ' + (page >= totalPages ? 'disabled' : '') + '>Suivante</button>' +
        '</div>';
    }

    function renderGrandLivre(grandLivre) {
        if (!Array.isArray(grandLivre) || grandLivre.length === 0) {
            return '<tr><td colspan="5" class="text-center text-muted py-4">Aucune écriture</td></tr>';
        }
        return grandLivre.map(function(x) {
            var solde = Number(x.solde || 0);
            var classeSolde = solde >= 0 ? 'text-green-600' : 'text-red-600';
            return '<tr><td>' + x.compte + '</td><td>' + x.libelle + '</td><td class="text-right">' + money(x.debit) + '</td><td class="text-right">' + money(x.credit) + '</td><td class="text-right font-semibold ' + classeSolde + '">' + money(solde) + '</td></tr>';
        }).join('');
    }

    function chargerEtAfficher() {
        Promise.all([
            apiFetch('/comptabilite/balance'),
            apiFetch('/comptabilite/grand-livre'),
            chargerJournal(),
            apiFetch('/comptabilite/etats-financiers')
        ]).then(function(resultats) {
            var balance = resultats[0] || {};
            var grandLivre = Array.isArray(resultats[1]) ? resultats[1] : [];
            var journalData = resultats[2] || {};
            var etats = resultats[3] || {};

            var totalDebit = Number(balance.total_debit || 0);
            var totalCredit = Number(balance.total_credit || 0);
            var balanceEstEquilibree = balance.equilibree === true || balance.equilibre === true;

            var compteResultat = etats.compte_resultat || {};
            var bilan = etats.bilan_synthetique || {};

            c.innerHTML = '<div class="fade-in space-y-6">' +
                '<div class="flex items-center justify-between">' +
                    '<h3 class="text-xl font-bold">Comptabilité</h3>' +
                    '<div class="flex gap-2">' +
                        '<button onclick="exportJournal()" class="bg-accent text-white px-3 py-2 rounded-lg text-xs font-semibold">Journal CSV</button>' +
                        '<button onclick="exportGrandLivre()" class="bg-blue-600 text-white px-3 py-2 rounded-lg text-xs font-semibold">Grand Livre CSV</button>' +
                        '<button onclick="exportEtatsFinanciers()" class="bg-emerald-600 text-white px-3 py-2 rounded-lg text-xs font-semibold">États Financiers CSV</button>' +
                    '</div>' +
                '</div>' +

                '<div class="kpi-grid">' +
                    '<div class="kpi-card" style="border-left:3px solid #0066ff"><div class="kpi-label">Total Débit</div><div class="kpi-value">' + money(totalDebit) + '</div></div>' +
                    '<div class="kpi-card" style="border-left:3px solid #00c853"><div class="kpi-label">Total Crédit</div><div class="kpi-value">' + money(totalCredit) + '</div></div>' +
                    '<div class="kpi-card" style="border-left:3px solid ' + (balanceEstEquilibree ? '#00c853' : '#ef4444') + '"><div class="kpi-label">Balance</div><div class="kpi-value">' + (balanceEstEquilibree ? 'Équilibrée' : 'Déséquilibrée') + '</div></div>' +
                '</div>' +

                '<div class="panel"><h3>Grand Livre</h3><div class="table-wrapper"><table><thead><tr><th>Compte</th><th>Libellé</th><th class="text-right">Débit</th><th class="text-right">Crédit</th><th class="text-right">Solde</th></tr></thead><tbody>' + renderGrandLivre(grandLivre) + '</tbody></table></div></div>' +

                '<div class="panel"><div class="flex items-center justify-between mb-3"><h3>Journal Comptable</h3><div id="journal-pagination">' + renderPagination(journalData) + '</div></div>' +
                '<div class="table-wrapper" style="max-height:450px;overflow:auto"><table><thead><tr><th>Date</th><th>N°</th><th>Débit</th><th>Crédit</th><th>Libellé</th><th class="text-right">Montant</th><th>Référence</th></tr></thead><tbody id="journal-table">' + renderJournalRows(journalData.donnees) + '</tbody></table></div></div>' +

                '<div class="panel"><h3>États Financiers</h3><div class="grid grid-cols-2 gap-4">' +
                    '<div><p class="text-sm text-muted">Chiffre d\'affaires</p><p class="text-lg font-bold">' + money(compteResultat.chiffre_affaires) + '</p></div>' +
                    '<div><p class="text-sm text-muted">Encaissements</p><p class="text-lg font-bold">' + money(compteResultat.encaissements) + '</p></div>' +
                    '<div><p class="text-sm text-muted">Charges</p><p class="text-lg font-bold">' + money(compteResultat.charges) + '</p></div>' +
                    '<div><p class="text-sm text-muted">Bénéfice brut</p><p class="text-lg font-bold">' + money(compteResultat.benefice_brut) + '</p></div>' +
                    '<div><p class="text-sm text-muted">Valeur stock</p><p class="text-lg font-bold">' + money(compteResultat.valeur_stock) + '</p></div>' +
                    '<div><p class="text-sm text-muted">Actif total</p><p class="text-lg font-bold">' + money(bilan.actif_total) + '</p></div>' +
                '</div></div>' +
            '</div>';

            // Ajouter les sections Comptabilité 2 et Consolidée
            var sec = document.createElement('div');
            sec.id = 'compta-secondaire-content';
            var cons = document.createElement('div');
            cons.id = 'compta-consolidee-content';
            c.appendChild(sec);
            c.appendChild(cons);
            loadComptabiliteSecondaire();
            loadComptabiliteConsolidee();

            // Pagination
            var btnPrec = document.getElementById('journal-page-precedente');
            var btnSuiv = document.getElementById('journal-page-suivante');
            if (btnPrec) btnPrec.onclick = function() { if (journalPage > 1) { journalPage--; chargerEtAfficher(); } };
            if (btnSuiv) btnSuiv.onclick = function() { var tp = Number(journalData.total_pages || 1); if (journalPage < tp) { journalPage++; chargerEtAfficher(); } };
        }).catch(function(err) {
            console.error(err);
            c.innerHTML = '<div class="panel text-center py-12"><p class="text-muted">Erreur de chargement de la comptabilité.</p></div>';
        });
    }

    chargerEtAfficher();
}

function loadComptabiliteSecondaire() {
    apiFetch('/comptabilite/secondaire').then(function(data) {
        const conteneur = document.getElementById('compta-secondaire-content');
        if (!conteneur) return;
        const f = v => new Intl.NumberFormat('fr-FR',{style:'currency',currency:'XOF',maximumFractionDigits:0}).format(v||0);

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
        const f = v => new Intl.NumberFormat('fr-FR',{style:'currency',currency:'XOF',maximumFractionDigits:0}).format(v||0);

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

function exportJournal() {
    window.open('/api/comptabilite/export', '_blank');
}

function exportGrandLivre() {
    var token = localStorage.getItem('sourougnon_token') || '';
    window.open('/api/comptabilite/export-grand-livre?token=' + encodeURIComponent(token), '_blank');
}

function exportEtatsFinanciers() {
    var token = localStorage.getItem('sourougnon_token') || '';
    window.open('/api/comptabilite/export-etats-financiers?token=' + encodeURIComponent(token), '_blank');
}
