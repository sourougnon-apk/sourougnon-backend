// === MOTEUR DE RECHERCHE GLOBALE ===
var rechercheTimeout;

function rechercheGlobale(query) {
    clearTimeout(rechercheTimeout);
    var resultsDiv = document.getElementById('search-results');
    if (!resultsDiv) return;
    
    if (!query || query.length < 2) {
        resultsDiv.classList.add('hidden');
        return;
    }
    
    rechercheTimeout = setTimeout(function() {
        apiFetch('/recherche?q=' + encodeURIComponent(query)).then(function(data) {
            if (!data || (!data.debiteurs.length && !data.ventes.length && !data.agents.length && !data.produits.length)) {
                resultsDiv.innerHTML = '<div class="p-4 text-sm text-muted text-center">Aucun resultat pour "' + query + '"</div>';
                resultsDiv.classList.remove('hidden');
                return;
            }
            
            var html = '';
            
            if (data.debiteurs && data.debiteurs.length > 0) {
                html += '<div class="p-2 text-xs font-semibold text-muted uppercase">Debiteurs (' + data.debiteurs.length + ')</div>';
                data.debiteurs.forEach(function(d) {
                    html += '<div class="px-4 py-2 hover:bg-slate-50 cursor-pointer text-sm" onclick="loadPage(\'debiteurs\');document.getElementById(\'search-results\').classList.add(\'hidden\')">' +
                        '<span class="font-medium">' + d.nom + ' ' + (d.prenom||'') + '</span> ' +
                        '<span class="text-muted text-xs">' + (d.quartier||'') + ' | ' + (d.telephone||'') + '</span></div>';
                });
            }
            
            if (data.agents && data.agents.length > 0) {
                html += '<div class="p-2 text-xs font-semibold text-muted uppercase border-t">Agents (' + data.agents.length + ')</div>';
                data.agents.forEach(function(a) {
                    html += '<div class="px-4 py-2 hover:bg-slate-50 cursor-pointer text-sm" onclick="loadPage(\'agents\');document.getElementById(\'search-results\').classList.add(\'hidden\')">' +
                        '<span class="font-medium">' + a.nom + ' ' + (a.prenom||'') + '</span> ' +
                        '<span class="text-muted text-xs">' + a.email + ' | ' + a.role + '</span></div>';
                });
            }
            
            if (data.ventes && data.ventes.length > 0) {
                html += '<div class="p-2 text-xs font-semibold text-muted uppercase border-t">Ventes (' + data.ventes.length + ')</div>';
                data.ventes.forEach(function(v) {
                    html += '<div class="px-4 py-2 hover:bg-slate-50 cursor-pointer text-sm" onclick="loadPage(\'ventes\');document.getElementById(\'search-results\').classList.add(\'hidden\')">' +
                        '<span class="font-medium">' + (v.debiteur_nom||'Client') + '</span> ' +
                        '<span class="text-muted text-xs">' + v.type_vente + ' | ' + new Intl.NumberFormat('fr-FR',{style:'currency',currency:'XOF'}).format(v.montant_total||0) + '</span></div>';
                });
            }
            
            if (data.produits && data.produits.length > 0) {
                html += '<div class="p-2 text-xs font-semibold text-muted uppercase border-t">Produits (' + data.produits.length + ')</div>';
                data.produits.forEach(function(p) {
                    html += '<div class="px-4 py-2 hover:bg-slate-50 cursor-pointer text-sm" onclick="loadPage(\'produits\');document.getElementById(\'search-results\').classList.add(\'hidden\')">' +
                        '<span class="font-medium">' + p.nom + '</span> ' +
                        '<span class="text-muted text-xs">Stock: ' + (p.stock||0) + ' | Prix: ' + new Intl.NumberFormat('fr-FR',{style:'currency',currency:'XOF'}).format(p.prix_vente||0) + '</span></div>';
                });
            }
            
            resultsDiv.innerHTML = html;
            resultsDiv.classList.remove('hidden');
        }).catch(function(e) {
            console.error('Erreur recherche:', e);
        });
    }, 300);
}

// Fermer les resultats si on clique ailleurs
document.addEventListener('click', function(e) {
    var resultsDiv = document.getElementById('search-results');
    var searchInput = document.getElementById('search-input');
    if (resultsDiv && !resultsDiv.contains(e.target) && e.target !== searchInput) {
        resultsDiv.classList.add('hidden');
    }
});
