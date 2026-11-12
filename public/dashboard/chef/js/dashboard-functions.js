function loadDashboard(c) {
    // On utilise la route spécifique au chef d'agence
    apiFetch('/chef-agence/dashboard').then(function(d) {
        var k = d.kpis || {};
        function f(v) { return new Intl.NumberFormat('fr-FR', {style:'currency', currency:'XOF', maximumFractionDigits:0}).format(v || 0); }
        
        var kpis = [
            {label:'Agents', value:k.agents_count || 0, icon:'👥', color:'#0066ff'},
            {label:'Débiteurs Actifs', value:k.debiteurs_actifs || 0, icon:'🔄', color:'#7c3aed'},
            {label:'A Jour', value:k.debiteurs_a_jour || 0, icon:'✅', color:'#00c853'},
            {label:'En Retard', value:k.debiteurs_en_retard || 0, icon:'⚠️', color:'#ef4444'},
            {label:'Encaissé Jour', value:f(k.encaisse_du_jour), icon:'💵', color:'#00c853'},
            {label:'Créances Retard', value:f(k.creances_en_retard), icon:'📋', color:'#d97706'}
        ];

        c.innerHTML = `
        <div class="space-y-6 fade-in">
            <div class="kpi-grid">
                ${kpis.map(x => `<div class="kpi-card" style="border-left:3px solid ${x.color}"><div class="kpi-label">${x.icon} ${x.label}</div><div class="kpi-value">${x.value}</div></div>`).join('')}
            </div>

            <div class="row-grid">
                <div class="panel">
                    <h3>👥 Mes Agents</h3>
                    <div class="table-wrapper">
                        <table>
                            <thead><tr><th>Agent</th><th>Nb Débiteurs</th><th>Statut</th></tr></thead>
                            <tbody>
                                ${(d.agents && d.agents.length > 0) ? d.agents.map(a => `<tr>
                                    <td class="font-medium">${a.nom} ${a.prenom || ''}</td>
                                    <td>${a.debiteurs_count || 0}</td>
                                    <td><span class="badge ${a.actif ? 'badge-success' : 'badge-danger'}">${a.actif ? 'Actif' : 'Inactif'}</span></td>
                                </tr>`).join('') : '<tr><td colspan="3" class="text-center text-muted py-4">Aucun agent</td></tr>'}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div class="panel">
                    <h3>🚨 Alertes Retard</h3>
                    <div class="table-wrapper">
                        <table>
                            <thead><tr><th>Débiteur</th><th>Agent</th><th>Jours</th><th>Montant</th></tr></thead>
                            <tbody>
                                ${(d.alertes && d.alertes.length > 0) ? d.alertes.map(a => `<tr>
                                    <td class="font-medium">${a.debiteur}</td>
                                    <td>${a.agent}</td>
                                    <td><span class="badge badge-danger">${a.jours_retard} j</span></td>
                                    <td class="font-semibold">${f(a.montant)}</td>
                                </tr>`).join('') : '<tr><td colspan="4" class="text-center text-muted py-4">✅ Aucune alerte</td></tr>'}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>`;
    }).catch(function(e) {
        console.error('Erreur dashboard chef:', e);
        c.innerHTML = '<div class="panel text-center py-12"><p class="text-red-500 font-bold">Erreur de chargement des données.</p><p class="text-sm text-muted mt-2">Veuillez vérifier les logs serveur.</p></div>';
    });
}
