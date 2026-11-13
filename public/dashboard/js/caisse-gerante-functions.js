function loadCaisseGerante(c) {
    c.innerHTML = `
        <div class="fade-in space-y-6">
            <div class="flex items-center justify-between">
                <div>
                    <h3 class="text-xl font-bold text-slate-800">Vue consolidée des caisses</h3>
                    <p class="text-sm text-muted mt-1">Surveillance des flux de trésorerie de toutes les agences.</p>
                </div>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-5 gap-3" id="caisse-kpis">
                <div class="panel text-center py-4 text-muted text-sm col-span-5">Chargement...</div>
            </div>

            <div class="panel">
                <h4 class="text-lg font-bold text-slate-800 mb-4">Remises en attente de validation</h4>
                <div id="remises-attente-gerante">
                    <p class="text-muted text-sm">Chargement...</p>
                </div>
            </div>

            <div class="panel">
                <h4 class="text-lg font-bold text-slate-800 mb-4">Derniers mouvements</h4>
                <div id="mouvements-recents">
                    <p class="text-muted text-sm">Chargement...</p>
                </div>
            </div>
        </div>
    `;
    chargerCaisseGeranteKPI();
    chargerRemisesEnAttenteGerante();
    chargerMouvementsRecentsGerante();
}

function chargerCaisseGeranteKPI() {
    const today = new Date().toISOString().split('T')[0];
    const debut = new Date(); debut.setDate(1);
    const debutStr = debut.toISOString().split('T')[0];

    apiFetch(`/caisse/consolidee?debut=${debutStr}&fin=${today}`).then(data => {
        const f = v => new Intl.NumberFormat('fr-FR', {style:'currency', currency:'XOF', maximumFractionDigits:0}).format(v || 0);
        document.getElementById('caisse-kpis').innerHTML = `
            <div class="panel p-4 border-l-4 border-blue-600">
                <div class="text-xs text-muted font-semibold uppercase">Encaissements</div>
                <div class="text-xl font-bold text-slate-800">${f(data.encaissements)}</div>
            </div>
            <div class="panel p-4 border-l-4 border-red-600">
                <div class="text-xs text-muted font-semibold uppercase">Décaissements</div>
                <div class="text-xl font-bold text-slate-800">${f(data.decaissements)}</div>
            </div>
            <div class="panel p-4 border-l-4 border-green-600">
                <div class="text-xs text-muted font-semibold uppercase">Épargnes</div>
                <div class="text-xl font-bold text-slate-800">${f(data.epargnes)}</div>
            </div>
            <div class="panel p-4 border-l-4 border-amber-600">
                <div class="text-xs text-muted font-semibold uppercase">Pénalités</div>
                <div class="text-xl font-bold text-slate-800">${f(data.penalites)}</div>
            </div>
            <div class="panel p-4 border-l-4 border-slate-800">
                <div class="text-xs text-muted font-semibold uppercase">Solde</div>
                <div class="text-xl font-bold text-slate-800">${f(data.solde)}</div>
            </div>
        `;
    }).catch(() => {
        document.getElementById('caisse-kpis').innerHTML = '<div class="text-red-500 text-center col-span-5">Erreur de chargement des KPI.</div>';
    });
}

function chargerRemisesEnAttenteGerante() {
    apiFetch('/caisse/remises-en-attente').then(remises => {
        const el = document.getElementById('remises-attente-gerante');
        if (!remises || remises.length === 0) {
            el.innerHTML = '<p class="text-muted text-sm">Aucune remise en attente.</p>';
            return;
        }
        const f = v => new Intl.NumberFormat('fr-FR', {style:'currency', currency:'XOF', maximumFractionDigits:0}).format(v || 0);
        el.innerHTML = remises.map(r => `
            <div class="border-b border-slate-100 py-3 flex justify-between items-center">
                <div>
                    <div class="font-semibold text-slate-800">${r.agent ? r.agent.nom + ' ' + (r.agent.prenom||'') : 'Agent'}</div>
                    <div class="text-xs text-muted">Réf: ${r.reference} - ${new Date(r.created_at).toLocaleDateString('fr-FR')}</div>
                </div>
                <div class="text-lg font-bold text-blue-600">${f(r.montant_declare)}</div>
            </div>
        `).join('');
    }).catch(() => {
        document.getElementById('remises-attente-gerante').innerHTML = '<p class="text-red-500 text-sm">Erreur de chargement.</p>';
    });
}

function chargerMouvementsRecentsGerante() {
    apiFetch('/caisse/mouvements-recents').then(mouvements => {
        const el = document.getElementById('mouvements-recents');
        if (!mouvements || mouvements.length === 0) {
            el.innerHTML = '<p class="text-muted text-sm">Aucun mouvement récent.</p>';
            return;
        }
        const f = v => new Intl.NumberFormat('fr-FR', {style:'currency', currency:'XOF', maximumFractionDigits:0}).format(v || 0);
        el.innerHTML = `
            <div class="table-wrapper">
                <table>
                    <thead><tr><th>Date</th><th>Type</th><th>Montant</th><th>Utilisateur</th><th>Statut</th></tr></thead>
                    <tbody>${mouvements.map(m => `
                        <tr>
                            <td class="text-xs">${m.date_mouvement ? new Date(m.date_mouvement).toLocaleDateString('fr-FR', {day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit'}) : '--'}</td>
                            <td><span class="badge ${m.type === 'encaissement' ? 'badge-success' : (m.type === 'epargne' ? 'badge-info' : 'badge-warning')}">${m.type}</span></td>
                            <td class="font-bold">${f(m.montant)}</td>
                            <td class="text-xs">${m.user_nom || '--'}</td>
                            <td><span class="badge ${m.statut_validation === 'valide' ? 'badge-success' : 'badge-warning'}">${m.statut_validation}</span></td>
                        </tr>
                    `).join('')}</tbody>
                </table>
            </div>
        `;
    }).catch(() => {
        document.getElementById('mouvements-recents').innerHTML = '<p class="text-red-500 text-sm">Erreur de chargement.</p>';
    });
}
