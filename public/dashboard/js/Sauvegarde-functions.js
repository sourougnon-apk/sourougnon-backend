function loadSauvegarde(c) {
    c.innerHTML = `
        <div class="fade-in space-y-6">
            <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h3 class="text-xl font-bold text-slate-800">Sauvegardes du système</h3>
                    <p class="text-sm text-muted mt-1">Gérez les points de restauration de votre base de données.</p>
                </div>
                <button onclick="sauvegardeLancer()" class="bg-accent text-white px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-blue-700 shadow-sm flex items-center gap-2">
                    <span>💾</span> Sauvegarder maintenant
                </button>
            </div>

            <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div class="lg:col-span-2 space-y-4">
                    <h4 class="text-lg font-bold text-slate-800">Fichiers disponibles</h4>
                    <div id="sauvegarde-liste" class="space-y-3">
                        <p class="text-muted text-sm">Chargement...</p>
                    </div>
                </div>
                <div class="space-y-4">
                    <h4 class="text-lg font-bold text-slate-800">Historique des restaurations</h4>
                    <div id="sauvegarde-logs" class="panel p-4">
                        <p class="text-muted text-sm">Chargement...</p>
                    </div>
                </div>
            </div>
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
            el.innerHTML = '<div class="panel text-center py-6 text-muted">Aucune sauvegarde disponible.</div>';
            return;
        }
        el.innerHTML = res.map(x => `
            <div class="panel p-4 flex items-center justify-between border-l-4 border-l-slate-400">
                <div>
                    <div class="font-mono text-sm font-semibold text-slate-800">${x.fichier}</div>
                    <div class="text-xs text-muted mt-1">${x.date} • ${x.taille} Ko</div>
                </div>
                <div class="flex gap-2">
                    <button onclick="sauvegardeTelecharger('${x.fichier}')" class="px-3 py-1.5 bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-200">Télécharger</button>
                    <button onclick="sauvegardeRestaurer('${x.fichier}')" class="px-3 py-1.5 bg-red-50 text-red-600 rounded-lg text-xs font-semibold hover:bg-red-100">Restaurer</button>
                </div>
            </div>
        `).join('');
    } catch(e) {
        document.getElementById('sauvegarde-liste').innerHTML = '<div class="text-red-500 text-sm">Erreur de chargement.</div>';
    }
}

async function sauvegardeListerLogs() {
    try {
        const logs = await apiFetch('/sauvegarde/logs');
        const el = document.getElementById('sauvegarde-logs');
        if (!Array.isArray(logs) || logs.length === 0) {
            el.innerHTML = '<p class="text-muted text-sm">Aucune restauration effectuée.</p>';
            return;
        }
        el.innerHTML = logs.map(log => `
            <div class="border-b border-slate-100 py-2 last:border-0">
                <div class="text-xs font-semibold text-slate-800">${log.backup_file}</div>
                <div class="text-xs text-muted flex justify-between mt-1">
                    <span>${new Date(log.created_at).toLocaleDateString('fr-FR')}</span>
                    <span class="badge ${log.status === 'success' ? 'badge-success' : 'badge-danger'}">${log.status}</span>
                </div>
            </div>
        `).join('');
    } catch(e) {
        document.getElementById('sauvegarde-logs').innerHTML = '<p class="text-red-500 text-sm">Erreur</p>';
    }
}

async function sauvegardeLancer() {
    if (!(await showConfirm('Voulez-vous vraiment créer une nouvelle sauvegarde ?'))) return;
    try {
        await apiFetch('/sauvegarde/run', {method:'POST'});
        showAlert('Sauvegarde lancée avec succès.');
        sauvegardeLister();
    } catch(e) {
        showAlert('Erreur : ' + e.message);
    }
}

function sauvegardeTelecharger(fichier) {
    apiDownload(`/sauvegarde/telecharger/${encodeURIComponent(fichier)}`, fichier);
}

async function sauvegardeRestaurer(fichier) {
    const dangerMsg = `⚠️ DANGER — RESTAURATION IRRÉVERSIBLE\n\nLe fichier ${fichier} va écraser TOUTES les données actuelles.\nCette action peut entraîner une perte définitive des opérations récentes.\n\nVoulez-vous vraiment continuer ?`;
    if (!(await showConfirm(dangerMsg, true))) return;

    const confirmation = await showPrompt(`Tapez exactement le nom du fichier pour confirmer :\n${fichier}`, '');
    if (confirmation !== fichier) {
        showAlert('Confirmation incorrecte. Restauration annulée.');
        return;
    }
    try {
        await apiFetch(`/sauvegarde/restaurer/${encodeURIComponent(fichier)}`, { method: 'POST', body: JSON.stringify({ confirmation }) });
        showAlert('Restauration lancée en arrière-plan.');
        sauvegardeListerLogs();
    } catch(e) {
        showAlert('Erreur : ' + e.message);
    }
}
