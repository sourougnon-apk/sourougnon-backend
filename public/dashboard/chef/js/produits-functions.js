function loadProduits(c){
    apiFetch('/produits').then(function(p){
        function f(v){return new Intl.NumberFormat('fr-FR',{style:'currency',currency:'XOF',maximumFractionDigits:0}).format(v||0);}
        
        c.innerHTML='<div class="fade-in space-y-6">'+
            '<div class="flex items-center justify-between">'+
                '<h3 class="text-xl font-bold">Produits ('+p.length+')</h3>'+
                '<button onclick="showAddProduitModal()" class="bg-accent text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-700">+ Nouveau Produit</button>'+
            '</div>'+
            '<div class="panel">'+
                '<div class="flex items-center justify-between mb-4">'+
                    '<h3>Liste des produits</h3>'+
                    '<input type="text" id="prod-search" placeholder="Rechercher..." onkeyup="filterProduits()" class="px-4 py-2 border border-slate-200 rounded-xl text-sm w-64">'+
                '</div>'+
                '<div class="table-wrapper">'+
                    '<table><thead><tr><th>Produit</th><th>Prix Achat</th><th>Prix Vente</th><th>Benefice</th><th>Marge</th><th>Stock</th><th>Actions</th></tr></thead>'+
                    '<tbody id="produits-tbody">'+
                        p.map(function(x){
                            var benefice = (x.prix_vente||0) - (x.prix_achat||0);
                            var marge = (x.prix_achat > 0) ? ((benefice / x.prix_achat) * 100).toFixed(1) + '%' : '--';
                            return '<tr>'+
                                '<td class="font-medium">'+x.nom+'</td>'+
                                '<td><input type="number" value="'+(x.prix_achat||0)+'" onchange="updateProduitPrix(\''+x.uuid+'\',\'prix_achat\',this.value)" class="w-24 px-2 py-1 border rounded text-xs text-right"></td>'+
                                '<td><input type="number" value="'+(x.prix_vente||0)+'" onchange="updateProduitPrix(\''+x.uuid+'\',\'prix_vente\',this.value)" class="w-24 px-2 py-1 border rounded text-xs text-right"></td>'+
                                '<td class="font-semibold text-green-600">'+f(benefice)+'</td>'+
                                '<td class="text-xs">'+marge+'</td>'+
                                '<td><span class="badge '+(x.stock<=x.seuil_alerte?'badge-danger':'badge-success')+'">'+(x.stock||0)+'</span></td>'+
                                '<td><div class="flex gap-1">'+
                                    '<button onclick="categoriserProduit(\''+x.uuid+'\',\''+x.nom+'\')" class="text-blue-600 text-xs">Cat.</button>'+
                                    '<button onclick="supprimerProduit(\''+x.uuid+'\',\''+x.nom+'\')" class="text-red-600 text-xs">Suppr.</button>'+
                                '</div></td>'+
                            '</tr>';
                        }).join('')+
                    '</tbody></table>'+
                '</div>'+
            '</div>'+
            '<div class="panel max-w-md">'+
                '<h3>Resume des benefices</h3>'+
                '<div class="grid grid-cols-3 gap-3 mt-4">'+
                    '<div class="text-center"><span class="text-xs text-muted">Valeur achat</span><div class="font-bold">'+f(p.reduce((s,x)=>s+(x.prix_achat||0)*(x.stock||0),0))+'</div></div>'+
                    '<div class="text-center"><span class="text-xs text-muted">Valeur vente</span><div class="font-bold text-green-600">'+f(p.reduce((s,x)=>s+(x.prix_vente||0)*(x.stock||0),0))+'</div></div>'+
                    '<div class="text-center"><span class="text-xs text-muted">Benefice potentiel</span><div class="font-bold text-accent">'+f(p.reduce((s,x)=>s+((x.prix_vente||0)-(x.prix_achat||0))*(x.stock||0),0))+'</div></div>'+
                '</div>'+
            '</div>'+
        '</div>';
    });
}

function filterProduits(){
    var q = document.getElementById('prod-search').value.toLowerCase();
    document.querySelectorAll('#produits-tbody tr').forEach(function(row){
        var nom = row.cells[0].textContent.toLowerCase();
        row.style.display = nom.includes(q) ? '' : 'none';
    });
}

function updateProduitPrix(uuid, champ, valeur){
    var data = {};
    data[champ] = parseFloat(valeur) || 0;
    apiFetch('/produits/'+uuid, {method:'PUT', body:JSON.stringify(data)}).then(function(){
        loadPage('produits');
    });
}

async function categoriserProduit(uuid, nom){
    // Ouvrir un prompt avec les catégories existantes ou créer
    var categories = ['Riz','Sucre','Huile','Tomate','Boisson','Lait','Sardine','Pates','Farine','Savon','Autre'];
    var choix = await showPrompt('Catégorie pour ' + nom + ' :\n' + categories.join(', '), ''); if(!choix) return;
    if(!choix) return;
    apiFetch('/produits/'+uuid, {method:'PUT', body:JSON.stringify({categorie_nom:choix})}).then(function(){
        loadPage('produits');
    });
}

async function supprimerProduit(uuid, nom){
    if (!(await showConfirm('Supprimer ' + nom + ' ?'))) return;
    apiFetch('/produits/'+uuid, {method:'DELETE'}).then(function(){
        loadPage('produits');
    });
}

function showAddProduitModal(){document.getElementById('add-produit-modal').classList.remove('hidden');}
function closeAddProduitModal(){document.getElementById('add-produit-modal').classList.add('hidden');}
function createProduit(e){
    e.preventDefault();
    var data = {
        nom: document.getElementById('prod-nom').value,
        prix_achat: parseFloat(document.getElementById('prod-prix-achat').value)||0,
        prix_vente: parseFloat(document.getElementById('prod-prix-vente').value)||0,
        seuil_alerte: parseInt(document.getElementById('prod-seuil').value)||5
    };
    apiFetch('/produits', {method:'POST', body:JSON.stringify(data)}).then(function(){
        closeAddProduitModal();
        loadPage('produits');
    });
}
