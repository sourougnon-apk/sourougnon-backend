function loadRapports(c) {
    c.innerHTML = `
        <div class="fade-in space-y-6">
            <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h3 class="text-xl font-bold text-slate-800">Générateur de Rapports</h3>
                    <p class="text-sm text-muted mt-1">Extrayez les données de ventes et de recouvrement.</p>
                </div>
            </div>

            <div class="panel bg-slate-50 border-slate-200">
                <form onsubmit="genererRapport(event)" class="flex flex-wrap items-end gap-4">
                    <div>
                        <label class="block text-xs font-semibold text-slate-600 mb-1">Type de rapport</label>
                        <select id="rap-type" class="px-4 py-2 border border-slate-300 rounded-lg text-sm bg-white">
                            <option value="ventes">Ventes</option>
                            <option value="recouvrements">Recouvrements (Paiements)</option>
                        </select>
                    </div>
                    <div>
                        <label class="block text-xs font-semibold text-slate-600 mb-1">Date de début</label>
                        <input type="date" id="rap-debut" required class="px-4 py-2 border border-slate-300 rounded-lg text-sm bg-white">
                    </div>
                    <div>
                        <label class="block text-xs font-semibold text-slate-600 mb-1">Date de fin</label>
                        <input type="date" id="rap-fin" required class="px-4 py-2 border border-slate-300 rounded-lg text-sm bg-white">
                    </div>
                    <button type="submit" class="bg-accent text-white px-6 py-2 rounded-lg text-sm font-semibold hover:bg-blue-700 shadow-sm">Générer</button>
                    <button type="button" onclick="exporterRapportCSV()" class="bg-slate-800 text-white px-6 py-2 rounded-lg text-sm font-semibold hover:bg-slate-900 shadow-sm ml-auto">Exporter CSV</button>
                </form>
            </div>

            <div id="rapport-resultat" class="panel hidden">
                <!-- Les résultats s'afficheront ici -->
            </div>
        </div>
    `;
    // Initialiser les dates par défaut (aujourd'hui)
    var today = new Date().toISOString().split('T')[0];
    document.getElementById('rap-debut').value = today;
    document.getElementById('rap-fin').value = today;
    
    genererRapport(new Event('submit')); // Charger le rapport par défaut
}

var currentRapportData = [];

function genererRapport(e) {
    if (e) e.preventDefault();
    var type = document.getElementById('rap-type').value;
    var debut = document.getElementById('rap-debut').value;
    var fin = document.getElementById('rap-fin').value;
    var el = document.getElementById('rapport-resultat');
    
    el.classList.remove('hidden');
    el.innerHTML = '<div class="text-center py-8 text-muted">Génération en cours...</div>';

    apiFetch('/rapports/' + type + '?debut=' + debut + '&fin=' + fin).then(function(data) {
        currentRapportData = data;
        if (!data || data.length === 0) {
            el.innerHTML = '<div class="text-center py-8 text-muted">Aucun résultat pour cette période.</div>';
            return;
        }

        var f = v => new Intl.NumberFormat('fr-FR', {style:'currency', currency:'XOF', maximumFractionDigits:0}).format(v || 0);
        var html = '<div class="table-wrapper"><table><thead>';

        if (type === 'ventes') {
            html += '<tr><th>Date</th><th>Client</th><th>Type</th><th>Montant</th><th>Statut</th></tr></thead><tbody>';
            data.forEach(r => {
                html += `<tr>
                    <td class="text-xs">${new Date(r.date_debut).toLocaleDateString('fr-FR')}</td>
                    <td class="font-medium">${r.client || 'Client'}</td>
                    <td><span class="badge badge-info">${r.type_vente}</span></td>
                    <td class="font-bold">${f(r.montant_total)}</td>
                    <td><span class="badge ${r.statut === 'termine' ? 'badge-success' : 'badge-warning'}">${r.statut}</span></td>
                </tr>`;
            });
        } else {
            html += '<tr><th>Date</th><th>Client</th><th>Montant</th><th>Mode</th><th>Agent</th></tr></thead><tbody>';
            data.forEach(r => {
                html += `<tr>
                    <td class="text-xs">${new Date(r.date).toLocaleDateString('fr-FR')}</td>
                    <td class="font-medium">${r.client || 'Client'}</td>
                    <td class="font-bold text-green-600">${f(r.montant)}</td>
                    <td><span class="badge badge-info">${r.mode}</span></td>
                    <td class="text-xs">${r.agent || '-'}</td>
                </tr>`;
            });
        }
        html += '</tbody></table></div>';
        el.innerHTML = html;
    }).catch(function(err) {
        el.innerHTML = '<div class="text-center py-8 text-red-500">Erreur : ' + err.message + '</div>';
    });
}

function exporterRapportCSV() {
    if (currentRapportData.length === 0) {
        showAlert('Veuillez générer un rapport avant de l\'exporter.');
        return;
    }
    var type = document.getElementById('rap-type').value;
    apiDownload('/rapports/' + type + '?format=csv&debut=' + document.getElementById('rap-debut').value + '&fin=' + document.getElementById('rap-fin').value, 'rapport_' + type + '.csv');
}
