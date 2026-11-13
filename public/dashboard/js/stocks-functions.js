function loadStocks(c) {
    var isGerante = (currentUser.role === 'gerante');
    var titreSuffix = isGerante ? "Globaux" : "de l'Agence";
    
    var boutonEntree = isGerante 
        ? `<button onclick="showStockEntreeModal()" class="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-green-700">+ Approvisionner</button>` 
        : '';

    c.innerHTML = `
        <div class="fade-in space-y-6">
            <div class="flex items-center justify-between">
                <div>
                    <h3 class="text-xl font-bold text-slate-800">Gestion des Stocks ${titreSuffix}</h3>
                    <p class="text-sm text-muted mt-1">${isGerante ? 'Allouez les stocks aux différentes agences.' : 'Consultez votre stock et enregistrez les sorties.'}</p>
                </div>
                <div class="flex gap-2">
                    ${boutonEntree}
                    <button onclick="showStockSortieModal()" class="bg-amber-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-amber-700">- Sortie</button>
                </div>
            </div>
            <div class="kpi-grid" id="stocks-kpis">
                <div class="panel text-center py-4 text-muted text-sm col-span-2">Chargement...</div>
            </div>
            <div class="panel">
                <div class="flex items-center justify-between mb-4">
                    <h3 class="text-lg font-semibold">Mouvements de stock</h3>
                </div>
                <div id="mouvements-stock-content">
                    <p class="text-center text-muted py-4">Chargement...</p>
                </div>
            </div>
        </div>
    `;
    loadMouvementsStock();
    
    apiFetch('/stocks').then(function(d) {
        var p = d.produits || [];
        var f = v => new Intl.NumberFormat('fr-FR', {style:'currency', currency:'XOF', maximumFractionDigits:0}).format(v || 0);
        var totalValeur = p.reduce((s, x) => s + (x.prix_vente || 0) * (x.stock || 0), 0);
        
        document.getElementById('stocks-kpis').innerHTML = `
            <div class="panel p-4 border-l-4 border-blue-600">
                <div class="text-xs text-muted font-semibold uppercase">Produits en stock</div>
                <div class="text-2xl font-bold text-slate-800">${p.filter(x => x.stock > 0).length} / ${p.length}</div>
            </div>
            <div class="panel p-4 border-l-4 border-green-600">
                <div class="text-xs text-muted font-semibold uppercase">Valeur du stock (vente)</div>
                <div class="text-2xl font-bold text-slate-800">${f(totalValeur)}</div>
            </div>
        `;
    });
}

function loadMouvementsStock() {
    apiFetch('/stocks/mouvements').then(function(m) {
        var c = document.getElementById('mouvements-stock-content');
        if (!m || m.length === 0) {
            c.innerHTML = '<p class="text-center text-muted py-4">Aucun mouvement enregistré.</p>';
            return;
        }
        var f = v => new Intl.NumberFormat('fr-FR', {style:'currency', currency:'XOF', maximumFractionDigits:0}).format(v || 0);
        var badges = { entree: 'badge-success', sortie: 'badge-danger', inventaire: 'badge-info', vente: 'badge-warning', perte: 'badge-danger' };

        c.innerHTML = `
            <div class="table-wrapper">
                <table>
                    <thead><tr><th>Date</th><th>Type</th><th>Produit</th><th>Qté</th><th>Prix Unit.</th><th>Action par</th></tr></thead>
                    <tbody>${m.map(x => `
                        <tr>
                            <td class="text-xs">${new Date(x.created_at).toLocaleDateString('fr-FR')}</td>
                            <td><span class="badge ${badges[x.type] || 'badge-info'}">${x.type}</span></td>
                            <td class="font-medium">${x.produit ? x.produit.nom : '--'}</td>
                            <td class="font-bold">${x.quantite}</td>
                            <td>${f(x.prix_unitaire)}</td>
                            <td class="text-xs">${x.user ? x.user.nom : '--'}</td>
                        </tr>
                    `).join('')}</tbody>
                </table>
            </div>
        `;
    });
}

function showStockEntreeModal() {
    Promise.all([apiFetch('/produits'), apiFetch('/parametres')]).then(function(results) {
        var produits = results[0] || [];
        var parametres = results[1] || {};
        var agences = parametres.agences || [];

        var prodOptions = produits.map(p => `<option value="${p.uuid}">${p.nom}</option>`).join('');
        var agenceOptions = agences.map(a => `<option value="${a.id}">${a.nom}</option>`).join('');

        var html = `
            <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" id="modal-entree">
                <div class="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl fade-in">
                    <h3 class="text-lg font-bold mb-4">Approvisionner une agence</h3>
                    <form onsubmit="submitStockEntree(event)" class="space-y-3">
                        <div><label class="block text-xs font-semibold mb-1">Agence destinataire</label><select id="se-agence" required class="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm">${agenceOptions}</select></div>
                        <div><label class="block text-xs font-semibold mb-1">Produit</label><select id="se-produit" required class="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm">${prodOptions}</select></div>
                        <div class="grid grid-cols-2 gap-3">
                            <div><label class="block text-xs font-semibold mb-1">Quantité</label><input type="number" id="se-quantite" required min="1" class="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm"></div>
                            <div><label class="block text-xs font-semibold mb-1">Prix Achat</label><input type="number" id="se-prix-achat" class="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm"></div>
                        </div>
                        <div class="flex gap-3 pt-2">
                            <button type="button" onclick="document.getElementById('modal-entree').remove()" class="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl text-sm">Annuler</button>
                            <button type="submit" class="flex-1 px-4 py-2.5 bg-green-600 text-white rounded-xl text-sm font-semibold">Valider</button>
                        </div>
                    </form>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', html);
    });
}

function submitStockEntree(e) {
    e.preventDefault();
    var data = {
        produit_id: document.getElementById('se-produit').value,
        quantite: parseInt(document.getElementById('se-quantite').value),
        prix_achat: parseFloat(document.getElementById('se-prix-achat').value) || 0,
        agence_id: parseInt(document.getElementById('se-agence').value)
    };
    apiFetch('/stocks/entree', {method:'POST', body:JSON.stringify(data)}).then(function() {
        document.getElementById('modal-entree').remove();
        showAlert('Stock alloué avec succès.');
        loadStocks(document.getElementById('page-content'));
    }).catch(function(err){ showAlert('Erreur : ' + err.message); });
}

function showStockSortieModal() {
    apiFetch('/produits').then(function(produits) {
        var prodOptions = produits.map(p => `<option value="${p.uuid}">${p.nom}</option>`).join('');
        var html = `
            <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" id="modal-sortie">
                <div class="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl fade-in">
                    <h3 class="text-lg font-bold mb-4">Sortie de Stock</h3>
                    <form onsubmit="submitStockSortie(event)" class="space-y-3">
                        <div><label class="block text-xs font-semibold mb-1">Produit</label><select id="ss-produit" required class="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm">${prodOptions}</select></div>
                        <div><label class="block text-xs font-semibold mb-1">Quantité</label><input type="number" id="ss-quantite" required min="1" class="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm"></div>
                        <div><label class="block text-xs font-semibold mb-1">Motif</label><select id="ss-type" required class="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm"><option value="vente">Vente</option><option value="perte">Perte / Avarie</option></select></div>
                        <div class="flex gap-3 pt-2">
                            <button type="button" onclick="document.getElementById('modal-sortie').remove()" class="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl text-sm">Annuler</button>
                            <button type="submit" class="flex-1 px-4 py-2.5 bg-amber-600 text-white rounded-xl text-sm font-semibold">Valider</button>
                        </div>
                    </form>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', html);
    });
}

function submitStockSortie(e) {
    e.preventDefault();
    var data = {
        produit_id: document.getElementById('ss-produit').value,
        quantite: parseInt(document.getElementById('ss-quantite').value),
        type: document.getElementById('ss-type').value,
    };
    apiFetch('/stocks/sortie', {method:'POST', body:JSON.stringify(data)}).then(function() {
        document.getElementById('modal-sortie').remove();
        showAlert('Sortie de stock enregistrée.');
        loadStocks(document.getElementById('page-content'));
    }).catch(function(err){ showAlert('Erreur : ' + err.message); });
}
