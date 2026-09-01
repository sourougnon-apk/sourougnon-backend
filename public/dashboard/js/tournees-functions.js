// === PAGE TOURNÉES ===
function loadTournees(c) {
    apiFetch('/tournees').then(function(list) {
        if (!Array.isArray(list)) list = [];
        const rows = list.map(function(t) {
            const agent = t.agent ? (t.agent.nom + ' ' + t.agent.prenom) : '-';
            const debut = t.heure_demarrage ? new Date(t.heure_demarrage).toLocaleTimeString('fr-FR') : '-';
            const fin = t.heure_fin ? new Date(t.heure_fin).toLocaleTimeString('fr-FR') : '-';
            let duree = '-';
            if (t.heure_demarrage && t.heure_fin) {
                const ms = new Date(t.heure_fin) - new Date(t.heure_demarrage);
                const mins = Math.round(ms / 60000);
                duree = Math.floor(mins / 60) + 'h ' + (mins % 60) + 'm';
            }
            const statut = t.statut === 'en_cours' ? '<span class="badge badge-info">En cours</span>' : '<span class="badge badge-success">Terminée</span>';
            return `<tr>
                <td>${agent}</td>
                <td>${t.date_tournee}</td>
                <td>${debut}</td>
                <td>${fin}</td>
                <td>${duree}</td>
                <td>${statut}</td>
            </tr>`;
        }).join('');
        c.innerHTML = `<div class="fade-in space-y-6">
            <h3 class="text-xl font-bold">Tournées des agents</h3>
            <div class="panel">
                <div class="table-wrapper">
                    <table>
                        <thead><tr><th>Agent</th><th>Date</th><th>Démarrage</th><th>Fin</th><th>Durée</th><th>Statut</th></tr></thead>
                        <tbody>${rows || '<tr><td colspan="6" class="text-center">Aucune tournée</td></tr>'}</tbody>
                    </table>
                </div>
            </div>
        </div>`;
    }).catch(function() {
        c.innerHTML = '<div class="panel text-center py-12"><p class="text-muted">Erreur chargement.</p></div>';
    });
}
