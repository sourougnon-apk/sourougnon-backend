function loadRemboursements(c) {
    c.innerHTML = `
        <div class="fade-in space-y-6">
            <div>
                <h3 class="text-xl font-bold text-slate-800">Mes demandes de remboursement</h3>
                <p class="text-sm text-muted mt-1">Suivi des demandes envoyées à la gérante.</p>
            </div>
            <div class="panel">
                <div class="table-wrapper">
                    <table>
                        <thead><tr><th>Date</th><th>Débiteur</th><th>Crédit payé</th><th>Remboursement (50%)</th><th>Statut</th><th>Motif</th></tr></thead>
                        <tbody id="remb-tbody">
                            <tr><td colspan="6" class="text-center text-muted py-4">Chargement...</td></tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    `;
    apiFetch('/remboursements').then(function(data) {
        var f = v => new Intl.NumberFormat('fr-FR', {style:'currency', currency:'XOF', maximumFractionDigits:0}).format(v || 0);
        var tb = document.getElementById('remb-tbody');
        if (!data || data.length === 0) {
            tb.innerHTML = '<tr><td colspan="6" class="text-center text-muted py-4">Aucune demande.</td></tr>';
            return;
        }
        tb.innerHTML = data.map(function(d) {
            var v = d.vente || {};
            var deb = v.debiteur || {};
            var badge = d.statut === 'validee' ? 'badge-success' : (d.statut === 'rejetee' ? 'badge-danger' : 'badge-warning');
            return `
                <tr>
                    <td class="text-xs">${new Date(d.created_at).toLocaleDateString('fr-FR')}</td>
                    <td class="font-medium">${deb.nom || '--'} ${deb.prenom || ''}</td>
                    <td>${f(d.montant_credit_paye)}</td>
                    <td class="font-semibold">${f(d.montant_rembourse)}</td>
                    <td><span class="badge ${badge}">${d.statut}</span></td>
                    <td class="text-xs text-muted">${d.motif_demande || '--'}</td>
                </tr>
            `;
        }).join('');
    });
}
