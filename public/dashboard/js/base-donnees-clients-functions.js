var clientsSelectionnes = [];

function loadBaseDonneesClients(c) {
    c.innerHTML = `
        <div class="fade-in space-y-6">
            <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h3 class="text-xl font-bold text-slate-800">Base de données clients</h3>
                    <p class="text-sm text-muted mt-1">Importez la liste globale et attribuez les clients aux agences.</p>
                </div>
                <div class="flex gap-2">
                    <button onclick="showImportModal()" class="bg-accent text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-700">📁 Importer Excel</button>
                </div>
            </div>

            <div class="panel">
                <h4 class="text-lg font-bold text-slate-800 mb-4">Recherche multiple</h4>
                <p class="text-sm text-muted mb-3">Entrez plusieurs codes clients séparés par des virgules (ex: SRG005, SRG010, SRG008).</p>
                <div class="flex gap-2">
                    <input type="text" id="recherche-clients" placeholder="SRG001, SRG002, ..." class="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl text-sm">
                    <button onclick="rechercherClients()" class="bg-slate-800 text-white px-6 py-2.5 rounded-xl text-sm font-semibold">Rechercher</button>
                </div>
            </div>

            <div id="resultats-recherche" class="hidden">
                <div class="flex items-center justify-between mb-3">
                    <h4 class="text-lg font-bold text-slate-800">Résultats</h4>
                    <div class="flex gap-2">
                        <button onclick="toutSelectionner()" class="text-blue-600 text-xs font-semibold">Tout sélectionner</button>
                        <button onclick="toutDeselectionner()" class="text-slate-600 text-xs font-semibold">Tout désélectionner</button>
                    </div>
                </div>
                <div class="panel">
                    <div class="table-wrapper">
                        <table>
                            <thead><tr><th><input type="checkbox" id="check-all" onchange="toggleAll(this)"></th><th>Code</th><th>Nom complet</th><th>Téléphone</th><th>Quartier</th><th>Agence actuelle</th></tr></thead>
                            <tbody id="resultats-tbody"></tbody>
                        </table>
                    </div>
                </div>
                <div class="flex justify-end mt-4">
                    <button onclick="showAttributionModal()" class="bg-green-600 text-white px-6 py-2.5 rounded-xl text-sm font-semibold hover:bg-green-700">✓ Attribuer à une agence</button>
                </div>
            </div>
        </div>
    `;
}

function showImportModal() {
    var html = `
        <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" id="modal-import">
            <div class="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl fade-in">
                <div class="flex justify-between items-center mb-4">
                    <h3 class="text-lg font-bold">Importer des clients</h3>
                    <button onclick="document.getElementById('modal-import').remove()" class="text-slate-400 hover:text-slate-700">✕</button>
                </div>
                <p class="text-sm text-muted mb-4">Sélectionnez un fichier Excel (.xlsx) contenant les colonnes : <strong>Code, Nom complet, Téléphone, Quartier, Sexe</strong>.</p>
                <form onsubmit="uploaderClients(event)" class="space-y-3">
                    <input type="file" id="import-file" accept=".xlsx,.xls,.csv" required class="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm">
                    <div id="import-progress" class="hidden text-sm text-blue-600">Importation en cours, veuillez patienter...</div>
                    <div class="flex gap-3 pt-2">
                        <button type="button" onclick="document.getElementById('modal-import').remove()" class="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl text-sm">Annuler</button>
                        <button type="submit" class="flex-1 px-4 py-2.5 bg-accent text-white rounded-xl text-sm font-semibold">Importer</button>
                    </div>
                </form>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', html);
}

function uploaderClients(e) {
    e.preventDefault();
    var fileInput = document.getElementById('import-file');
    var progress = document.getElementById('import-progress');
    var formData = new FormData();
    formData.append('file', fileInput.files[0]);

    progress.classList.remove('hidden');

    fetch(API_BASE + '/debiteurs/import', {
        method: 'POST',
        headers: { 'Authorization': 'Bearer ' + authToken, 'Accept': 'application/json' },
        body: formData
    }).then(r => r.json()).then(data => {
        progress.classList.add('hidden');
        document.getElementById('modal-import').remove();
        if (data.success) {
            showAlert('Importation réussie : ' + data.count + ' clients en base.');
        } else {
            showAlert('Erreur : ' + data.error);
        }
    }).catch(err => {
        progress.classList.add('hidden');
        showAlert('Erreur réseau : ' + err.message);
    });
}

function rechercherClients() {
    var q = document.getElementById('recherche-clients').value.trim();
    if (!q) { showAlert('Veuillez saisir au moins un code.'); return; }

    apiFetch('/debiteurs?codes=' + encodeURIComponent(q)).then(data => {
        var el = document.getElementById('resultats-recherche');
        el.classList.remove('hidden');
        var tbody = document.getElementById('resultats-tbody');

        if (!data || data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted py-4">Aucun client trouvé.</td></tr>';
            return;
        }

        clientsSelectionnes = [];

        tbody.innerHTML = data.map(c => {
            var agenceNom = c.agence ? c.agence.nom : '<span class="text-slate-400">Non assigné</span>';
            return `
                <tr>
                    <td><input type="checkbox" class="check-client" data-uuid="${c.uuid}" onchange="toggleSelection('${c.uuid}', this.checked)"></td>
                    <td class="font-mono text-xs">${c.code_client || '--'}</td>
                    <td class="font-medium">${c.nom} ${c.prenom || ''}</td>
                    <td>${c.telephone || '--'}</td>
                    <td>${c.quartier || '--'}</td>
                    <td>${agenceNom}</td>
                </tr>
            `;
        }).join('');
    });
}

function toggleSelection(uuid, checked) {
    if (checked) clientsSelectionnes.push(uuid);
    else clientsSelectionnes = clientsSelectionnes.filter(u => u !== uuid);
}

function toggleAll(chk) {
    document.querySelectorAll('.check-client').forEach(c => {
        c.checked = chk.checked;
        toggleSelection(c.dataset.uuid, chk.checked);
    });
}

function toutSelectionner() {
    document.getElementById('check-all').checked = true;
    toggleAll({checked: true});
}

function toutDeselectionner() {
    document.getElementById('check-all').checked = false;
    toggleAll({checked: false});
}

function showAttributionModal() {
    if (clientsSelectionnes.length === 0) {
        showAlert('Veuillez cocher au moins un client.');
        return;
    }

    apiFetch('/parametres').then(p => {
        var agences = p.agences || [];
        var options = agences.map(a => `<option value="${a.id}">${a.nom}</option>`).join('');

        var html = `
            <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" id="modal-attribution">
                <div class="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl fade-in">
                    <div class="flex justify-between items-center mb-4">
                        <h3 class="text-lg font-bold">Attribuer ${clientsSelectionnes.length} client(s)</h3>
                        <button onclick="document.getElementById('modal-attribution').remove()" class="text-slate-400 hover:text-slate-700">✕</button>
                    </div>
                    <form onsubmit="confirmerAttribution(event)" class="space-y-3">
                        <div>
                            <label class="block text-xs font-semibold mb-1">Agence destinataire</label>
                            <select id="attribution-agence" required class="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm">${options}</select>
                        </div>
                        <div class="flex gap-3 pt-2">
                            <button type="button" onclick="document.getElementById('modal-attribution').remove()" class="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl text-sm">Annuler</button>
                            <button type="submit" class="flex-1 px-4 py-2.5 bg-green-600 text-white rounded-xl text-sm font-semibold">Valider</button>
                        </div>
                    </form>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', html);
    });
}

function confirmerAttribution(e) {
    e.preventDefault();
    var agenceId = document.getElementById('attribution-agence').value;
    var agenceNom = document.getElementById('attribution-agence').options[document.getElementById('attribution-agence').selectedIndex].text;

    apiFetch('/debiteurs/attribuer-agence', {
        method: 'POST',
        body: JSON.stringify({ uuids: clientsSelectionnes, agence_id: agenceId })
    }).then(res => {
        document.getElementById('modal-attribution').remove();
        showAlert(`${clientsSelectionnes.length} client(s) attribué(s) à l'agence ${agenceNom}.`);
        clientsSelectionnes = [];
        document.getElementById('resultats-recherche').classList.add('hidden');
        document.getElementById('recherche-clients').value = '';
    }).catch(err => {
        showAlert('Erreur : ' + err.message);
    });
}
