function loadRapports(c) {
    c.innerHTML = `
        <div class="fade-in space-y-6">
            <h3 class="text-xl font-bold">Rapports et Exports</h3>
            <div class="flex flex-wrap gap-2">
                <button class="chip chip--active" data-type="ventes" onclick="switchRapport('ventes')">Ventes</button>
                <button class="chip" data-type="recouvrements" onclick="switchRapport('recouvrements')">Paiements</button>
                <button class="chip" data-type="resume" onclick="switchRapport('resume')">Résumé</button>
            </div>
            <div id="rapport-filtres" class="flex flex-wrap gap-2">
                <select id="rapport-periode" class="chip">
                    <option value="mois">Mois</option>
                    <option value="jour">Jour</option>
                    <option value="annee">Année</option>
                </select>
                <input type="date" id="rapport-debut" class="chip" placeholder="Début">
                <input type="date" id="rapport-fin" class="chip" placeholder="Fin">
                <button class="small-btn small-btn--primary" onclick="chargerRapport()">Appliquer</button>
                <button class="small-btn small-btn--secondary" onclick="exporterCSV()">Export CSV</button>
                <button class="small-btn small-btn--primary" onclick="exporterPDF()">Export PDF</button>
            </div>
            <div id="rapport-contenu"></div>
        </div>
    `;
    switchRapport('ventes');
}

let rapportType = 'ventes';

function switchRapport(type) {
    rapportType = type;
    document.querySelectorAll('#rapport-filtres .chip').forEach(ch => ch.classList.remove('chip--active'));
    const btn = document.querySelector(`[data-type="${type}"]`);
    if (btn) btn.classList.add('chip--active');
    chargerRapport();
}

function chargerRapport() {
    const debut = document.getElementById('rapport-debut').value;
    const fin = document.getElementById('rapport-fin').value;
    let params = '';
    if (debut) params += '&date_debut=' + debut;
    if (fin) params += '&date_fin=' + fin;

    let endpoint = '/rapports/' + rapportType;
    if (rapportType === 'ventes') endpoint += '?' + params.slice(1);
    else if (rapportType === 'recouvrements') endpoint += '?' + params.slice(1);
    else endpoint = '/rapports/resume';

    apiFetch(endpoint).then(r => {
        if (rapportType === 'resume') {
            afficherResume(r);
        } else {
            afficherTableauRapport(r);
        }
    }).catch(e => showAlert('Erreur : ' + e.message));
}

function afficherTableauRapport(data) {
    const conteneur = document.getElementById('rapport-contenu');
    if (!Array.isArray(data) || data.length === 0) {
        conteneur.innerHTML = '<p class="text-muted text-center py-4">Aucune donnée</p>';
        return;
    }
    const f = v => new Intl.NumberFormat('fr-FR',{style:'currency',currency:'XOF',maximumFractionDigits:0}).format(v||0);

    let html = '<div class="table-wrapper"><table><thead><tr>';
    if (rapportType === 'ventes') {
        html += '<th>Date</th><th>Débiteur</th><th>Agent</th><th>Type</th><th>Montant</th><th>Payé</th><th>Restant</th><th>Statut</th>';
    } else if (rapportType === 'recouvrements') {
        html += '<th>Date</th><th>Débiteur</th><th>Agent</th><th>Montant</th><th>Mode</th><th>Statut</th>';
    }
    html += '</tr></thead><tbody>';

    data.forEach(v => {
        if (rapportType === 'ventes') {
            html += `<tr><td>${new Date(v.date_debut).toLocaleDateString('fr-FR')}</td><td>${v.debiteur?.nom || '--'} ${v.debiteur?.prenom || ''}</td><td>${v.agent?.nom || '--'}</td><td>${v.type_vente}</td><td>${f(v.montant_total)}</td><td>${f(v.total_paye)}</td><td>${f(v.reste_a_payer)}</td><td>${v.statut}</td></tr>`;
        } else if (rapportType === 'recouvrements') {
            html += `<tr><td>${new Date(v.date_recouvrement).toLocaleDateString('fr-FR')}</td><td>${v.vente?.debiteur?.nom || '--'} ${v.vente?.debiteur?.prenom || ''}</td><td>${v.agent?.nom || '--'}</td><td>${f(v.montant)}</td><td>${v.mode_paiement}</td><td>${v.statut}</td></tr>`;
        }
    });

    html += '</tbody></table></div>';
    conteneur.innerHTML = html;
}

function afficherResume(r) {
    const f = v => new Intl.NumberFormat('fr-FR',{style:'currency',currency:'XOF',maximumFractionDigits:0}).format(v||0);
    const conteneur = document.getElementById('rapport-contenu');
    conteneur.innerHTML = `
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div class="kpi-card"><div class="kpi-label">Encaissements (mois)</div><div class="kpi-value">${f(r.mois.encaissements)}</div></div>
            <div class="kpi-card"><div class="kpi-label">Paiements (mois)</div><div class="kpi-value">${r.mois.nb_paiements}</div></div>
            <div class="kpi-card"><div class="kpi-label">Ventes (mois)</div><div class="kpi-value">${r.mois.ventes_mois}</div></div>
            <div class="kpi-card"><div class="kpi-label">Créances</div><div class="kpi-value">${f(r.mois.creances)}</div></div>
        </div>
        <div class="panel mt-4"><h4>Top Agents du Mois</h4>
            <div class="table-wrapper"><table><thead><tr><th>Agent</th><th class="text-right">Total encaissé</th></tr></thead><tbody>
                ${r.top_agents_mois.map(a => `<tr><td>${a.agent?.nom || '--'} ${a.agent?.prenom || ''}</td><td class="text-right">${f(a.total)}</td></tr>`).join('')}
            </tbody></table></div>
        </div>
    `;
}

function exporterCSV() {
    const token = localStorage.getItem('sourougnon_token') || '';
    const debut = document.getElementById('rapport-debut').value;
    const fin = document.getElementById('rapport-fin').value;
    let url = `/api/rapports/${rapportType}?format=csv`;
    if (debut) url += '&date_debut=' + debut;
    if (fin) url += '&date_fin=' + fin;
    url += '&token=' + encodeURIComponent(token);
    window.open(url, '_blank');
}

function exporterPDF() {
    const token = localStorage.getItem('sourougnon_token') || '';
    const debut = document.getElementById('rapport-debut').value;
    const fin = document.getElementById('rapport-fin').value;
    let url = (rapportType === 'resume') ? '/api/rapports/resume-pdf' : `/api/rapports/${rapportType}?format=pdf`;
    if (debut) url += (url.includes('?')?'&':'?') + 'date_debut=' + debut;
    if (fin) url += (url.includes('?')?'&':'?') + 'date_fin=' + fin;
    url += (url.includes('?')?'&':'?') + 'token=' + encodeURIComponent(token);
    window.open(url, '_blank');
}

function loadResume(b) {
    b.textContent = 'Chargement...';
    apiFetch('/rapports/resume').then(r => afficherResume(r));
}
