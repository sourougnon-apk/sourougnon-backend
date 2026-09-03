function loadSauvegarde(c) {
    c.innerHTML = `
        <div class="fade-in space-y-6">
            <h3 class="text-xl font-bold">Sauvegarde</h3>
            <button onclick="sauvegardeLancer()" class="bg-accent text-white px-4 py-2 rounded-lg text-sm font-semibold">Sauvegarder maintenant</button>
            <div id="sauvegarde-liste" class="panel p-4">Chargement...</div>
            <div id="sauvegarde-logs" class="panel p-4 mt-3"><h4>Journal de restauration</h4><div id="logs-content">Chargement...</div></div>
        </div>
    `;
    sauvegardeLister();
    sauvegardeListerLogs();
}

async function sauvegardeLister() {
    try {
        const res = await apiFetch('/sauvegarde/lister');
        const el = document.getElementById('sauvegarde-liste');
        if (!Array.isArray(res) || res.length === 0) {
            el.innerHTML = '<p class="text-muted">Aucune sauvegarde</p>';
            return;
        }
        el.innerHTML = `
            <table class="min-w-full">
                <thead><tr><th>Fichier</th><th>Taille (Ko)</th><th>Date</th><th>Actions</th></tr></thead>
                <tbody>${res.map(x => `
                    <tr>
                        <td>${x.fichier}</td><td>${x.taille}</td><td>${x.date}</td>
                        <td class="flex gap-1">
                            <button class="small-btn small-btn--primary" onclick="sauvegardeTelecharger('${x.fichier}')">Télécharger</button>
                            <button class="small-btn small-btn--danger" style="background-color:#dc2626;border-color:#b91c1c;color:white;font-weight:700;" title="DANGER : restauration irréversible" onclick="sauvegardeRestaurer('${x.fichier}')">⚠ Restaurer</button>
                        </td>
                    </tr>
                `).join('')}</tbody>
            </table>
        `;
    } catch(e) {
        document.getElementById('sauvegarde-liste').innerHTML = '<p class="text-red-600">Erreur de chargement</p>';
    }
}

async function sauvegardeLancer() {
    try {
        await apiFetch('/sauvegarde/run', {method:'POST'});
        showAlert('Sauvegarde lancée.');
        sauvegardeLister();
    } catch(e) {
        showAlert('Erreur : ' + e.message);
    }
}

function sauvegardeTelecharger(fichier) {
    apiDownload(`/sauvegarde/telecharger/${encodeURIComponent(fichier)}`, fichier);
}

async function sauvegardeRestaurer(fichier) {
    // Modal de danger explicite avant toute chose
    const dangerMsg = `⚠️ DANGER — RESTAURATION IRRÉVERSIBLE\n\nLe fichier ${fichier} va écraser TOUTES les données actuelles.\nCette action peut entraîner une perte définitive des opérations récentes.\n\nVoulez-vous vraiment continuer ?`;
    if (!(await showConfirm(dangerMsg))) return;

    // Deuxième confirmation : taper le nom exact
    const confirmation = await showPrompt(`Pour confirmer, tapez exactement le nom du fichier :\n${fichier}`, '');
    if (!confirmation || confirmation !== fichier) {
        showAlert('Confirmation incorrecte. Restauration annulée.');
        return;
    }
    try {
        const res = await apiFetch(`/sauvegarde/restaurer/${encodeURIComponent(fichier)}`, {
            method: 'POST',
            body: JSON.stringify({ confirmation: confirmation })
        });
        if (res.success) {
            showAlert('Restauration lancée en arrière-plan.');
            sauvegardeListerLogs();
        } else {
            showAlert('Erreur : ' + (res.error || 'inconnue'));
        }
    } catch(e) {
        showAlert('Erreur : ' + e.message);
    }
}

async function sauvegardeListerLogs() {
    try {
        const logs = await apiFetch('/sauvegarde/logs');
        const el = document.getElementById('logs-content');
        if (!Array.isArray(logs) || logs.length === 0) {
            el.innerHTML = '<p class="text-muted">Aucune restauration</p>';
            return;
        }
        el.innerHTML = `
            <table class="min-w-full">
                <thead><tr><th>Date</th><th>Utilisateur</th><th>Fichier</th><th>Statut</th><th>IP</th></tr></thead>
                <tbody>${logs.map(log => `
                    <tr>
                        <td>${log.created_at}</td>
                        <td>${log.user ? log.user.nom + ' ' + log.user.prenom : '--'}</td>
                        <td>${log.backup_file}</td>
                        <td>${log.status}</td>
                        <td>${log.ip || '--'}</td>
                    </tr>
                `).join('')}</tbody>
            </table>
        `;
    } catch(e) {
        document.getElementById('logs-content').innerHTML = '<p class="text-red-600">Erreur</p>';
    }
}
