function loadGestionBancaire(c) {
    c.innerHTML = `
        <div class="fade-in space-y-6">
            <div class="flex items-center justify-between">
                <div>
                    <h3 class="text-xl font-bold text-slate-800">Gestion Bancaire</h3>
                    <p class="text-sm text-muted mt-1">Gérez vos comptes et opérations financières.</p>
                </div>
                <div class="flex gap-2">
                    <button onclick="showBanqueModal('depot')" class="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-green-700 shadow-sm">+ Dépôt</button>
                    <button onclick="showBanqueModal('retrait')" class="bg-amber-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-amber-700 shadow-sm">- Retrait</button>
                    <button onclick="showBanqueModal('transfert')" class="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-700 shadow-sm">⇄ Transfert</button>
                </div>
            </div>

            <!-- Comptes Cards -->
            <div id="bancaire-comptes" class="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div class="panel text-center text-muted text-sm py-6">Chargement des comptes...</div>
            </div>

            <!-- Historique Table -->
            <div class="panel">
                <h4 class="text-lg font-bold text-slate-800 mb-4">Dernières opérations</h4>
                <div class="table-wrapper">
                    <table>
                        <thead>
                            <tr><th>Date</th><th>Type</th><th>Compte Débit</th><th>Compte Crédit</th><th>Montant</th><th>Auteur</th></tr>
                        </thead>
                        <tbody id="bancaire-historique">
                            <tr><td colspan="6" class="text-center text-muted py-4">Chargement...</td></tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    `;
    chargerComptesBancaires();
    chargerHistoriqueBancaire();
}

function chargerComptesBancaires() {
    apiFetch('/bancaire/comptes').then(function(comptes) {
        var el = document.getElementById('bancaire-comptes');
        if (!comptes || comptes.length === 0) {
            el.innerHTML = '<div class="panel text-center text-muted text-sm py-6 col-span-3">Aucun compte configuré.</div>';
            return;
        }
        
        el.innerHTML = comptes.map(function(cpt) {
            return `
                <div class="panel p-5 border-t-4 border-t-blue-600 relative">
                    <h4 class="font-bold text-slate-800">${cpt.nom}</h4>
                    <p class="text-xs text-muted uppercase mt-1">${cpt.type}</p>
                    <div class="mt-4">
                        <div class="text-xs text-muted mb-1">Solde disponible</div>
                        <div class="text-2xl font-bold text-slate-800" id="solde-${cpt.uuid}">...</div>
                    </div>
                </div>
            `;
        }).join('');

        comptes.forEach(function(cpt) {
            apiFetch('/bancaire/comptes/' + cpt.uuid + '/solde').then(function(res) {
                var el = document.getElementById('solde-' + cpt.uuid);
                if (el) {
                    var montant = new Intl.NumberFormat('fr-FR', {style:'currency', currency:'XOF', maximumFractionDigits:0}).format(res.solde || 0);
                    el.textContent = montant;
                    if (res.solde < 0) el.classList.replace('text-slate-800', 'text-red-600');
                }
            }).catch(() => {});
        });
    });
}

function chargerHistoriqueBancaire() {
    apiFetch('/bancaire/historique').then(function(ops) {
        var tb = document.getElementById('bancaire-historique');
        if (!ops || ops.length === 0) {
            tb.innerHTML = '<tr><td colspan="6" class="text-center text-muted py-4">Aucune opération enregistrée.</td></tr>';
            return;
        }
        
        tb.innerHTML = ops.slice(0, 10).map(function(op) {
            var date = new Date(op.date_operation).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
            var f = new Intl.NumberFormat('fr-FR', {style:'currency', currency:'XOF', maximumFractionDigits:0}).format(op.montant || 0);
            var typeBadge = op.type === 'depot' ? 'badge-success' : (op.type === 'retrait' ? 'badge-danger' : 'badge-info');
            var auteur = op.user ? op.user.nom : 'Système';

            return `
                <tr>
                    <td class="text-xs">${date}</td>
                    <td><span class="badge ${typeBadge}">${op.type}</span></td>
                    <td>${op.compte_debit ? op.compte_debit.nom : '-'}</td>
                    <td>${op.compte_credit ? op.compte_credit.nom : '-'}</td>
                    <td class="font-semibold ${op.type === 'depot' ? 'text-green-600' : 'text-slate-800'}">${f}</td>
                    <td class="text-xs">${auteur}</td>
                </tr>
            `;
        }).join('');
    });
}

function showBanqueModal(type) {
    var isDepot = type === 'depot';
    var isTransfert = type === 'transfert';
    var title = isDepot ? 'Nouveau Dépôt' : (isTransfert ? 'Nouveau Transfert' : 'Nouveau Retrait');
    
    apiFetch('/bancaire/comptes').then(function(comptes) {
        if (!comptes || comptes.length === 0) {
            showAlert('Veuillez créer un compte bancaire d\'abord.');
            return;
        }
        var options = comptes.map(c => `<option value="${c.uuid}">${c.nom}</option>`).join('');
        var optionsSrc = '<option value="">-- Sélectionner --</option>' + options;
        var optionsDest = '<option value="">-- Sélectionner --</option>' + options;

        var html = `
            <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" id="modal-banque">
                <div class="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl fade-in">
                    <div class="flex justify-between items-center mb-4">
                        <h3 class="text-lg font-bold">${title}</h3>
                        <button onclick="document.getElementById('modal-banque').remove()" class="text-slate-400 hover:text-slate-700">✕</button>
                    </div>
                    <form onsubmit="submitBanqueOp(event, '${type}')" class="space-y-4">
                        ${!isDepot ? `<div><label class="block text-xs font-semibold text-slate-600 mb-1">Compte source</label><select id="bq-src" required class="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm">${optionsSrc}</select></div>` : ''}
                        ${isDepot || isTransfert ? `<div><label class="block text-xs font-semibold text-slate-600 mb-1">Compte destinataire</label><select id="bq-dest" required class="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm">${optionsDest}</select></div>` : ''}
                        
                        <div>
                            <label class="block text-xs font-semibold text-slate-600 mb-1">Montant (FCFA)</label>
                            <input type="number" id="bq-montant" min="1" required class="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-bold">
                        </div>
                        <div>
                            <label class="block text-xs font-semibold text-slate-600 mb-1">Motif / Bénéficiaire</label>
                            <input type="text" id="bq-motif" placeholder="Ex: Dépôt recettes" class="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm">
                        </div>
                        ${!isTransfert ? `<div><label class="flex items-center gap-2 text-sm"><input type="checkbox" id="bq-caisse" class="rounded text-accent"> Lier à la caisse physique ?</label></div>` : ''}

                        <div class="flex gap-3 pt-2">
                            <button type="button" onclick="document.getElementById('modal-banque').remove()" class="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold hover:bg-slate-50">Annuler</button>
                            <button type="submit" class="flex-1 px-4 py-2.5 bg-slate-800 text-white rounded-xl text-sm font-semibold hover:bg-slate-900 shadow-md">Valider</button>
                        </div>
                    </form>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', html);
    });
}

function submitBanqueOp(e, type) {
    e.preventDefault();
    var montant = parseFloat(document.getElementById('bq-montant').value);
    var motif = document.getElementById('bq-motif').value;
    var payload = { montant: montant, motif: motif };
    
    if (type === 'depot') {
        payload.compte_destinataire_uuid = document.getElementById('bq-dest').value;
        payload.source = document.getElementById('bq-caisse') && document.getElementById('bq-caisse').checked ? 'caisse' : 'externe';
    } else if (type === 'retrait') {
        payload.compte_source_uuid = document.getElementById('bq-src').value;
        payload.source = document.getElementById('bq-caisse') && document.getElementById('bq-caisse').checked ? 'caisse' : 'externe';
    } else {
        payload.compte_source_uuid = document.getElementById('bq-src').value;
        payload.compte_destinataire_uuid = document.getElementById('bq-dest').value;
    }

    apiFetch('/bancaire/' + type, { method: 'POST', body: JSON.stringify(payload) }).then(function() {
        document.getElementById('modal-banque').remove();
        showAlert('Opération enregistrée avec succès.');
        loadGestionBancaire(document.getElementById('page-content'));
    }).catch(function(err) {
        showAlert('Erreur : ' + err.message);
    });
}
