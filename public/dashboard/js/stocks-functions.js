function loadStocks(c){
    apiFetch('/stocks').then(function(d){
        function f(v){return new Intl.NumberFormat('fr-FR',{style:'currency',currency:'XOF',maximumFractionDigits:0}).format(v);}
        var p=d.produits;
        var produitsEnStock = p.filter(function(x){return (x.stock || 0) > 0;});
        var nbEnStock = produitsEnStock.length;
        var al=produitsEnStock.filter(function(x){return x.stock<=x.seuil_alerte;});
        
        c.innerHTML='<div class="fade-in space-y-6">'+
            '<div class="flex items-center justify-between"><h3 class="text-xl font-bold">Stock</h3>'+
            '<div class="flex gap-2">'+
                '<button onclick="showStockEntreeModal()" class="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-green-700">+ Entree</button>'+
                '<button onclick="showStockSortieModal()" class="bg-amber-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-amber-700">- Sortie</button>'+
                '<button onclick="showInventaireModal()" class="bg-purple-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-purple-700">Inventaire</button>'+
            '</div></div>'+
            '<div class="kpi-grid">'+
                '<div class="kpi-card" style="border-left:3px solid #0066ff"><div class="kpi-label">Produits en stock</div><div class="kpi-value">'+nbEnStock+' / '+p.length+'</div></div>'+
                '<div class="kpi-card" style="border-left:3px solid #059669"><div class="kpi-label">Valeur Achat</div><div class="kpi-value">'+f(d.valeur_totale_achat)+'</div></div>'+
                '<div class="kpi-card" style="border-left:3px solid #8b5cf6"><div class="kpi-label">Valeur Vente</div><div class="kpi-value">'+f(d.valeur_totale_vente)+'</div></div>'+
                '<div class="kpi-card" style="border-left:3px solid #00c853"><div class="kpi-label">CA Attendu</div><div class="kpi-value">'+f(d.ca_attendu)+'</div></div>'+
            '</div>'+
            '<div class="panel">'+
                '<div class="flex items-center justify-between mb-4"><h3 class="text-lg font-semibold">Mouvements de stock</h3></div>'+
                '<div id="mouvements-stock-content"><p class="text-center text-muted py-4">Chargement...</p></div>'+
            '</div>'+
        '</div>';
        loadMouvementsStock();
    }).catch(function(e){c.innerHTML='<div class="panel text-center py-12"><p class="text-muted">Erreur de chargement.</p></div>';});
}

function loadMouvementsStock() {
    apiFetch('/stocks/mouvements').then(function(m) {
        window.allMouvementsStock = m;
        renderMouvementsStock(m);
    });
}

function renderMouvementsStock(m) {
    function f(v) {
        return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF', maximumFractionDigits: 0 }).format(v);
    }
    var c = document.getElementById('mouvements-stock-content');
    if (!c) return;
    var tb = { entree: 'badge-success', vente: 'badge-danger', sortie: 'badge-danger', perte: 'badge-danger', retour: 'badge-warning', inventaire: 'badge-info' };
    var actionBadge = { creation: 'badge-success', modification: 'badge-warning', suppression: 'badge-danger', inventaire: 'badge-info' };
    
    c.innerHTML = '<div class="table-wrapper"><table><thead><tr><th>Date</th><th>Type</th><th>Action</th><th>Produit</th><th>Qte</th><th>Prix Unit.</th><th>Fournisseur</th><th>Actions</th></tr></thead><tbody>' +
    (m.length > 0 ? m.map(function(x) {
        return '<tr>' +
        '<td class="text-xs">' + new Date(x.created_at).toLocaleDateString('fr-FR') + ' ' + new Date(x.created_at).toLocaleTimeString('fr-FR', {hour:'2-digit',minute:'2-digit'}) + '</td>' +
        '<td><span class="badge ' + (tb[x.type] || 'badge-info') + '">' + x.type + '</span></td>' +
        '<td><span class="badge ' + (actionBadge[x.action] || 'badge-success') + '">' + (x.action || 'creation') + '</span></td>' +
        '<td class="font-medium">' + (x.produit ? x.produit.nom : '-') + '</td>' +
        '<td>' + x.quantite + '</td>' +
        '<td>' + f(x.prix_unitaire) + '</td>' +
        '<td>' + (x.fournisseur || '-') + '</td>' +
        '<td><div class="flex gap-1">' +
        '<button onclick="openModifierMouvementModal(' + x.id + ',' + x.quantite + ',' + x.prix_unitaire + ',\'' + (x.fournisseur || '').replace(/'/g, "\\'") + '\')" class="text-amber-600 text-xs font-semibold px-2 py-1 bg-amber-50 rounded hover:bg-amber-100">Mod.</button>' +
        '<button onclick="openSupprimerMouvementModal(' + x.id + ')" class="text-red-600 text-xs font-semibold px-2 py-1 bg-red-50 rounded hover:bg-red-100">Suppr.</button>' +
        '</div></td></tr>';
    }).join('') : '<tr><td colspan="8" class="text-center text-muted py-4">Aucun mouvement trouve</td></tr>') +
    '</tbody></table></div>';
}

function openModifierMouvementModal(id, qte, prix, fournisseur) {
    document.getElementById('modif-mouvement-id').value = id;
    document.getElementById('modif-quantite').value = qte;
    document.getElementById('modif-prix').value = prix;
    document.getElementById('modif-fournisseur').value = fournisseur;
    document.getElementById('modifier-mouvement-modal').classList.remove('hidden');
}

function closeModifierMouvementModal() {
    document.getElementById('modifier-mouvement-modal').classList.add('hidden');
}

function submitModifierMouvement(e) {
    e.preventDefault();
    var id = document.getElementById('modif-mouvement-id').value;
    apiFetch('/stocks/mouvements/' + id, {
        method: 'PUT',
        body: {
            quantite: parseFloat(document.getElementById('modif-quantite').value),
            prix_unitaire: parseFloat(document.getElementById('modif-prix').value),
            fournisseur: document.getElementById('modif-fournisseur').value
        }
    }).then(function() {
        closeModifierMouvementModal();
        loadPage('stocks');
    });
}

function openSupprimerMouvementModal(id) {
    document.getElementById('suppr-mouvement-id').value = id;
    document.getElementById('supprimer-mouvement-modal').classList.remove('hidden');
}

function closeSupprimerMouvementModal() {
    document.getElementById('supprimer-mouvement-modal').classList.add('hidden');
}

function confirmerSupprimerMouvement() {
    var id = document.getElementById('suppr-mouvement-id').value;
    apiFetch('/stocks/mouvements/' + id, { method: 'DELETE' }).then(function() {
        closeSupprimerMouvementModal();
        loadPage('stocks');
    });
}

function showStockEntreeModal(){document.getElementById('stock-entree-modal').classList.remove('hidden');apiFetch('/produits').then(function(p){document.getElementById('se-produit').innerHTML='<option value="">-- Produit --</option>'+p.map(function(x){return '<option value="'+x.uuid+'">'+x.nom+' (Stock: '+x.stock+')</option>';}).join('');});}
function closeStockEntreeModal(){document.getElementById('stock-entree-modal').classList.add('hidden');}
function submitStockEntree(e){e.preventDefault();apiFetch('/stocks/entree',{method:'POST',body:{produit_id:document.getElementById('se-produit').value,quantite:parseInt(document.getElementById('se-quantite').value),prix_achat:parseFloat(document.getElementById('se-prix-achat').value)||0,prix_vente:parseFloat(document.getElementById('se-prix-vente').value)||0,fournisseur:document.getElementById('se-fournisseur').value,reference:document.getElementById('se-reference').value}}).then(function(){closeStockEntreeModal();loadPage('stocks');});}
function showStockSortieModal(){document.getElementById('stock-sortie-modal').classList.remove('hidden');apiFetch('/produits').then(function(p){document.getElementById('ss-produit').innerHTML='<option value="">-- Produit --</option>'+p.map(function(x){return '<option value="'+x.uuid+'">'+x.nom+' (Stock: '+x.stock+')</option>';}).join('');});}
function closeStockSortieModal(){document.getElementById('stock-sortie-modal').classList.add('hidden');}
function submitStockSortie(e){e.preventDefault();apiFetch('/stocks/sortie',{method:'POST',body:{produit_id:document.getElementById('ss-produit').value,quantite:parseInt(document.getElementById('ss-quantite').value),type:document.getElementById('ss-type').value,prix_vente_unitaire:parseFloat(document.getElementById('ss-prix-vente').value)||0,motif:document.getElementById('ss-motif').value}}).then(function(r){if(r&&r.error){showAlert(r.error);return;}closeStockSortieModal();loadPage('stocks');});}
function showInventaireModal(){document.getElementById('inventaire-modal').classList.remove('hidden');apiFetch('/produits').then(function(p){document.getElementById('inv-produit').innerHTML='<option value="">-- Produit --</option>'+p.map(function(x){return '<option value="'+x.uuid+'">'+x.nom+' (Stock: '+x.stock+')</option>';}).join('');});}
function closeInventaireModal(){document.getElementById('inventaire-modal').classList.add('hidden');}
function submitInventaire(e){e.preventDefault();apiFetch('/stocks/inventaire',{method:'POST',body:{produit_id:document.getElementById('inv-produit').value,stock_reel:parseInt(document.getElementById('inv-stock-reel').value),prix_achat:parseFloat(document.getElementById('inv-prix-achat').value)||0,prix_vente:parseFloat(document.getElementById('inv-prix-vente').value)||0,motif:document.getElementById('inv-motif').value}}).then(function(r){closeInventaireModal();loadPage('stocks');});}
