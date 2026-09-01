function loadRemboursements(c) {
    apiFetch('/remboursements').then(function(d) {
        function f(v) { return new Intl.NumberFormat('fr-FR', {style:'currency', currency:'XOF', maximumFractionDigits:0}).format(v); }

        var enAttente = d.filter(function(x) { return x.statut === 'en_attente'; });
        var traitees = d.filter(function(x) { return x.statut !== 'en_attente'; });

        var estGerante = currentUser && (currentUser.role === 'gerante' || currentUser.role === 'gérante');

        c.innerHTML = '<div class="fade-in space-y-6">' +
            '<div class="flex items-center justify-between"><h3 class="text-xl font-bold">Remboursements</h3></div>' +

            '<div class="panel"><h3>Demandes en attente</h3><div class="table-wrapper"><table><thead><tr>' +
            '<th>Débiteur</th><th>Vente</th><th>Crédit payé</th><th>Remboursement (50%)</th><th>Épargne (100%)</th><th>Demandeur</th><th>Actions</th>' +
            '</tr></thead><tbody>' +
            (enAttente.length > 0 ? enAttente.map(function(x) {
                var v = x.vente || {};
                var deb = v.debiteur || {};
                var btnValider = estGerante ? '<button onclick="validerRemboursement(\''+x.uuid+'\')" class="text-green-600 text-xs font-semibold px-2 py-1 bg-green-50 rounded">Valider</button>' : '';
                var btnRejeter = estGerante ? '<button onclick="rejeterRemboursement(\''+x.uuid+'\')" class="text-red-600 text-xs font-semibold px-2 py-1 bg-red-50 rounded">Rejeter</button>' : '';
                return '<tr><td class="font-medium">'+(deb.nom || '--')+'</td><td class="font-mono text-xs">'+(v.uuid ? v.uuid.substring(0,8) : '--')+'</td><td>'+f(x.montant_credit_paye)+'</td><td>'+f(x.montant_rembourse)+'</td><td>'+f(x.montant_epargne_rembourse)+'</td><td>'+(x.demandeur ? x.demandeur.nom : '--')+'</td><td><div class="flex gap-1">'+btnValider+' '+btnRejeter+'</div></td></tr>';
            }).join('') : '<tr><td colspan="7" class="text-center text-muted py-4">Aucune demande</td></tr>') +
            '</tbody></table></div></div>' +

            '<div class="panel"><h3>Historique traité</h3><div class="table-wrapper"><table><thead><tr>' +
            '<th>Débiteur</th><th>Statut</th><th>Commentaire</th><th>Validée le</th>' +
            '</tr></thead><tbody>' +
            (traitees.length > 0 ? traitees.map(function(x) {
                var v = x.vente || {};
                var deb = v.debiteur || {};
                return '<tr><td class="font-medium">'+(deb.nom || '--')+'</td><td><span class="badge '+(x.statut === 'validee' ? 'badge-success' : 'badge-danger')+'">'+x.statut+'</span></td><td>'+(x.commentaire_gerante || '--')+'</td><td>'+(x.date_validation ? x.date_validation.substring(0,10) : '--')+'</td></tr>';
            }).join('') : '<tr><td colspan="4" class="text-center text-muted py-4">Aucun historique</td></tr>') +
            '</tbody></table></div></div>' +
        '</div>';
    }).catch(function() {
        c.innerHTML = '<div class="panel text-center py-12"><p class="text-muted">Erreur chargement.</p></div>';
    });
}

async function validerRemboursement(uuid) {
    var commentaire = await showPrompt('Commentaire gérante (optionnel) :', '');
    apiFetch('/remboursements/' + uuid + '/valider', {
        method: 'PUT',
        body: JSON.stringify({commentaire: commentaire || ''})
    }).then(function() {
        loadPage('remboursements');
    }).catch(function(e) {
        showAlert(e.message);
    });
}

async function rejeterRemboursement(uuid) {
    var commentaire = await showPrompt('Motif du rejet :', '');
    apiFetch('/remboursements/' + uuid + '/rejeter', {
        method: 'PUT',
        body: JSON.stringify({commentaire: commentaire || ''})
    }).then(function() {
        loadPage('remboursements');
    }).catch(function(e) {
        showAlert(e.message);
    });
}
