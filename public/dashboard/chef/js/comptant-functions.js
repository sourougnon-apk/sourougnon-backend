
function formatDate(iso) { if (!iso) return '-'; const d = new Date(iso); return isNaN(d.getTime()) ? iso : d.toLocaleDateString('fr-FR'); }

function loadComptant(c) {
    apiFetch('/ventes?type_vente=comptant').then(function(v) {
        function f(x) {
            return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF', maximumFractionDigits: 0 }).format(x);
        }
        c.innerHTML = '<div class="fade-in space-y-6"><div class="flex items-center justify-between"><h3 class="text-xl font-bold">Ventes au Comptant</h3></div><div class="panel"><div class="table-wrapper"><table><thead><tr><th>Date</th><th>Client</th><th>Telephone</th><th>Produit</th><th>Montant</th><th>Mode</th></tr></thead><tbody>' +
            (v.length > 0 ? v.map(function(x) {
                var clientNom = '--';
                var clientTel = '--';
                var produitNom = '--';
                if (x.client_comptant) {
                    clientNom = x.client_comptant.nom || 'Client';
                    clientTel = x.client_comptant.telephone || '--';
                }
                if (x.produit) {
                    produitNom = x.produit.nom;
                } else if (x.vente_produits && x.vente_produits.length) {
                    produitNom = x.vente_produits.map(function(vp) {
                        return vp.produit ? vp.produit.nom : '--';
                    }).join(', ');
                }
                return '<tr><td>' + formatDate(x.date_debut) + '</td><td class="font-medium">' + clientNom + '</td><td>' + clientTel + '</td><td>' + produitNom + '</td><td class="font-semibold">' + f(x.montant_total) + '</td><td>Especes</td></tr>';
            }).join('') : '<tr><td colspan="6" class="text-center text-muted py-4">Aucune vente comptant</td></tr>') +
            '</tbody></table></div></div></div>';
    });
}

