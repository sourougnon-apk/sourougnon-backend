function loadStatistiques(c) {
    c.innerHTML = `
        <div class="fade-in space-y-6">
            <div>
                <h3 class="text-xl font-bold text-slate-800">Statistiques de performance</h3>
                <p class="text-sm text-muted mt-1">Analyse des résultats et de la productivité des agents.</p>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" id="stats-kpis">
                <div class="panel text-center text-muted py-6 text-sm col-span-3">Chargement des KPI...</div>
            </div>
            <div class="panel">
                <h4 class="text-lg font-bold text-slate-800 mb-4">Performance par Agent</h4>
                <div class="table-wrapper">
                    <table>
                        <thead><tr><th>Agent</th><th>Débiteurs</th><th>Ventes</th><th>CA</th><th>Attendu</th><th>Encaissé</th><th>Taux</th></tr></thead>
                        <tbody id="stats-agents"><tr><td colspan="7" class="text-center text-muted py-4">Chargement...</td></tr></tbody>
                    </table>
                </div>
            </div>
        </div>
    `;

    apiFetch('/statistiques').then(function(d) {
        var r = d.resume || {};
        var f = v => new Intl.NumberFormat('fr-FR', {style:'currency', currency:'XOF', maximumFractionDigits:0}).format(v || 0);
        
        // KPIs
        document.getElementById('stats-kpis').innerHTML = `
            <div class="panel p-4 border-l-4 border-blue-600">
                <div class="text-xs text-muted font-semibold uppercase">Chiffre d'Affaires</div>
                <div class="text-2xl font-bold text-slate-800 mt-1">${f(r.ca_total)}</div>
            </div>
            <div class="panel p-4 border-l-4 border-green-600">
                <div class="text-xs text-muted font-semibold uppercase">Total Encaissé</div>
                <div class="text-2xl font-bold text-slate-800 mt-1">${f(r.encaissements)}</div>
            </div>
            <div class="panel p-4 border-l-4 border-purple-600">
                <div class="text-xs text-muted font-semibold uppercase">Taux de Recouvrement</div>
                <div class="text-2xl font-bold text-slate-800 mt-1">${r.taux_recouvrement || 0}%</div>
            </div>
            <div class="panel p-4 border-l-4 border-red-600">
                <div class="text-xs text-muted font-semibold uppercase">Créances (Impayés)</div>
                <div class="text-2xl font-bold text-slate-800 mt-1">${f(r.creances)}</div>
            </div>
            <div class="panel p-4 border-l-4 border-amber-500">
                <div class="text-xs text-muted font-semibold uppercase">Nombre de Ventes</div>
                <div class="text-2xl font-bold text-slate-800 mt-1">${r.nb_ventes || 0}</div>
            </div>
            <div class="panel p-4 border-l-4 border-slate-600">
                <div class="text-xs text-muted font-semibold uppercase">Bénéfice Estimé</div>
                <div class="text-2xl font-bold text-slate-800 mt-1">${f(r.benefice_estime)}</div>
            </div>
        `;

        // Tableau agents
        var tb = document.getElementById('stats-agents');
        if (!d.performance_agents || d.performance_agents.length === 0) {
            tb.innerHTML = '<tr><td colspan="7" class="text-center text-muted py-4">Aucune performance enregistrée.</td></tr>';
            return;
        }
        tb.innerHTML = d.performance_agents.map(function(a) {
            var badge = a.taux >= 50 ? 'badge-success' : 'badge-danger';
            return `
                <tr>
                    <td class="font-medium text-slate-800">${a.nom}</td>
                    <td>${a.nb_debiteurs}</td>
                    <td>${a.nb_ventes}</td>
                    <td class="font-semibold">${f(a.ca)}</td>
                    <td>${f(a.montant_attendu)}</td>
                    <td class="text-green-600 font-semibold">${f(a.montant_encaisse)}</td>
                    <td><span class="badge ${badge}">${a.taux}%</span></td>
                </tr>
            `;
        }).join('');
    }).catch(function(e) {
        document.getElementById('stats-kpis').innerHTML = '<div class="panel text-center text-red-500 py-6 col-span-3">Erreur de chargement.</div>';
    });
}
