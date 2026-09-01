function loadAlertes(c){apiFetch('/alertes').then(function(a){var nbNonLues=a.filter(function(x){return!x.lue;}).length;var badge=document.getElementById('alert-badge');if(badge)badge.classList.toggle('hidden',nbNonLues===0);var typeBadge={retard:'badge-danger',echeance_jour:'badge-info',stock_faible:'badge-warning',credit_finissant:'badge-warning'};var niveauBadge={info:'badge-info',avertissement:'badge-warning',critique:'badge-danger'};c.innerHTML='<div class="fade-in space-y-6"><div class="flex items-center justify-between"><h3 class="text-xl font-bold">Alertes</h3><button onclick="marquerToutesLues()" class="bg-slate-200 text-slate-700 px-4 py-2 rounded-lg text-sm font-semibold hover:bg-slate-300">Tout marquer lu</button></div><div class="panel"><div class="table-wrapper"><table><thead><tr><th>Date</th><th>Type</th><th>Niveau</th><th>Message</th><th>Etat</th></tr></thead><tbody>'+(a.length>0?a.map(function(x){return '<tr class="'+(x.lue?'':'bg-amber-50')+'"><td class="text-xs">'+x.date_alerte.substring(0,10)+'</td><td><span class="badge '+(typeBadge[x.type]||'badge-info')+'">'+x.type+'</span></td><td><span class="badge '+(niveauBadge[x.niveau]||'badge-info')+'">'+x.niveau+'</span></td><td>'+x.message+'</td><td>'+(x.lue?'<span class="text-green-600 text-xs">Lu</span>':'<span class="text-amber-600 text-xs font-semibold">Nouveau</span>')+'</td></tr>';}).join(''):'<tr><td colspan="5" class="text-center text-muted py-4">Aucune alerte</td></tr>')+'</tbody></table></div></div></div>';});}
function marquerToutesLues(){apiFetch('/alertes/toutes-lues',{method:'PUT',body:'{}'}).then(function(){loadPage('alertes');});}


// Ajout automatique : gestion d'erreur générique
window.addEventListener('unhandledrejection', function(e) {
    console.error('Erreur non gérée:', e.reason);
    showAlert('Erreur: ' + (e.reason && e.reason.message ? e.reason.message : 'Inconnue'));
});


function esc(s) { var d = document.createElement('div'); d.textContent = s == null ? '' : String(s); return d.innerHTML; }

function loadAlertesGroupees(c) {
    apiFetch('/alertes').then(function(a) {
        var groupes = { retard: [], echeance_jour: [], stock_faible: [], autre: [] };
        a.forEach(function(x) { (groupes[x.type] || groupes.autre).push(x); });
        
        var niv = { info: 'badge-info', avertissement: 'badge-warning', critique: 'badge-danger' };
        
        function tableau(titre, lignes) {
            if (!lignes.length) return '';
            return '<div class="panel mb-4"><h3 class="text-lg font-semibold mb-2">' + esc(titre) + ' (' + lignes.length + ')</h3>' +
                '<div class="table-wrapper" style="max-height:400px;overflow:auto"><table><thead><tr>' +
                '<th>Date</th><th>Niveau</th><th>Message</th><th>Etat</th></tr></thead><tbody>' +
                lignes.map(function(x) {
                    return '<tr>' +
                        '<td class="text-xs">' + esc((x.date_alerte || '').substring(0, 10)) + '</td>' +
                        '<td><span class="badge ' + (niv[x.niveau] || 'badge-info') + '">' + esc(x.niveau) + '</span></td>' +
                        '<td>' + esc(x.message) + '</td>' +
                        '<td>' + (x.lue ? '<span class="text-green-600 text-xs">Lu</span>' : '<span class="text-amber-600 text-xs font-semibold">Nouveau</span>') + '</td></tr>';
                }).join('') + '</tbody></table></div></div>';
        }
        
        c.innerHTML = '<div class="fade-in space-y-4">' +
            '<div class="flex items-center justify-between"><h3 class="text-xl font-bold">Alertes</h3>' +
            '<button onclick="marquerToutesLues()" class="bg-slate-200 text-slate-700 px-4 py-2 rounded-lg text-sm font-semibold">Tout marquer lu</button></div>' +
            tableau('Retards de paiement', groupes.retard) +
            tableau('Échéances du jour', groupes.echeance_jour) +
            tableau('Stock faible', groupes.stock_faible) +
            tableau('Autres', groupes.autre) +
            '</div>';
    }).catch(function(e) {
        c.innerHTML = '<div class="panel text-center py-12"><p class="text-muted">Erreur : ' + esc(e.message) + '</p></div>';
    });
}
