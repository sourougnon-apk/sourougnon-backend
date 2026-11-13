function loadAlertes(c) {
    c.innerHTML = `
        <div class="fade-in space-y-6">
            <div class="flex items-center justify-between">
                <div>
                    <h3 class="text-xl font-bold text-slate-800">Centre d'alertes</h3>
                    <p class="text-sm text-muted mt-1">Suivez les événements critiques de votre réseau.</p>
                </div>
                <button onclick="marquerToutesLues()" class="bg-slate-100 text-slate-700 px-4 py-2 rounded-lg text-sm font-semibold hover:bg-slate-200 shadow-sm">Tout marquer comme lu</button>
            </div>
            <div id="alertes-list" class="space-y-3">
                <p class="text-muted text-center py-8">Chargement des alertes...</p>
            </div>
        </div>
    `;
    chargerAlertes();
}

function chargerAlertes() {
    apiFetch('/alertes').then(function(a) {
        var el = document.getElementById('alertes-list');
        if (!a || a.length === 0) {
            el.innerHTML = '<div class="panel text-center py-12"><p class="text-muted">Aucune alerte pour le moment. Tout est normal.</p></div>';
            return;
        }

        var badges = { info: 'badge-info', avertissement: 'badge-warning', critique: 'badge-danger' };
        var icons = { retard: '⏰', echeance_jour: '📅', stock_faible: '📦', credit_finissant: '⏳' };

        el.innerHTML = a.map(function(x) {
            var isUnread = !x.lue;
            var bgClass = isUnread ? 'bg-blue-50 border-blue-200' : 'bg-white border-slate-200';
            var icon = icons[x.type] || '🔔';
            var badge = badges[x.niveau] || 'badge-info';
            var date = new Date(x.date_alerte).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute:'2-digit' });

            return `
                <div class="panel p-4 border ${bgClass} flex gap-4 items-start relative">
                    ${isUnread ? '<span class="absolute top-4 right-4 w-2 h-2 bg-blue-600 rounded-full"></span>' : ''}
                    <div class="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-xl shrink-0">${icon}</div>
                    <div class="flex-1">
                        <div class="flex items-center gap-2 mb-1">
                            <h4 class="font-bold text-slate-800">${x.titre}</h4>
                            <span class="badge ${badge}">${x.niveau}</span>
                        </div>
                        <p class="text-sm text-slate-600 mb-2">${x.message}</p>
                        <div class="text-xs text-muted flex justify-between items-center">
                            <span>${date}</span>
                            <span class="capitalize">${x.type.replace('_', ' ')}</span>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }).catch(function(e) {
        document.getElementById('alertes-list').innerHTML = '<div class="panel text-center py-8 text-red-500">Erreur de chargement.</div>';
    });
}

function marquerToutesLues() {
    apiFetch('/alertes/toutes-lues', { method: 'PUT', body: '{}' }).then(function() {
        showAlert('Toutes les alertes ont été marquées comme lues.');
        chargerAlertes();
    });
}
