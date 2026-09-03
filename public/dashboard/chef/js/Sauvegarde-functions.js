function loadSauvegarde(c) {
    c.innerHTML = `
        <div class="fade-in space-y-6">
            <h3 class="text-xl font-bold">Sauvegarde</h3>
            <button onclick="sauvegardeLancer()" class="bg-accent text-white px-4 py-2 rounded-lg text-sm font-semibold">Sauvegarder maintenant</button>
            <div id="sauvegarde-liste" class="panel p-4">Chargement...</div>
        </div>
    `;
    sauvegardeLister();
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
                <thead><tr><th>Fichier</th><th>Taille (Ko)</th><th>Date</th><th>Action</th></tr></thead>
                <tbody>${res.map(x => `
                    <tr><td>${x.fichier}</td><td>${x.taille}</td><td>${x.date}</td>
                    <td><button class="small-btn small-btn--primary" onclick="sauvegardeTelecharger('${x.fichier}')">Télécharger</button></td></tr>
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
    const token = localStorage.getItem('sourougnon_token') || '';
    window.location.href = `/api/sauvegarde/telecharger/${encodeURIComponent(fichier)}?token=${token}`;
}
