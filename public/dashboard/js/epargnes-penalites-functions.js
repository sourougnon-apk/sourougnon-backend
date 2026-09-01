// === PAGES ÉPARGNES & PÉNALITÉS (back-office gérante/chef) ===

let agentsGlobaux = [];
let debiteursGlobaux = [];
let chartEpargneEvolution = null;
let chartEpargneRepartition = null;
let chartPenaliteEvolution = null;
let chartPenaliteRepartition = null;

function formatMoney(v) {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF', maximumFractionDigits: 0 }).format(parseFloat(v || 0));
}

function formatDate(iso) {
    if (!iso) return '-';
    return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
}

function destroyChart(chart) {
    if (chart) { chart.destroy(); }
    return null;
}

async function chargerFiltres() {
    if (agentsGlobaux.length && debiteursGlobaux.length) return;
    try {
        const agents = await apiFetch('/agents');
        const debiteurs = await apiFetch('/debiteurs');
        agentsGlobaux = Array.isArray(agents) ? agents : [];
        debiteursGlobaux = Array.isArray(debiteurs) ? debiteurs : [];
    } catch (e) {
        console.warn('Erreur filtres', e);
    }
}

function remplirSelects(type) {
    const agentSelect = document.getElementById('filtre-agent-' + type);
    const debiteurSelect = document.getElementById('filtre-debiteur-' + type);
    if (!agentSelect || !debiteurSelect) return;

    agentSelect.innerHTML = '<option value="">Tous les agents</option>' +
        agentsGlobaux.map(a => `<option value="${a.uuid}">${a.nom} ${a.prenom || ''}</option>`).join('');

    debiteurSelect.innerHTML = '<option value="">Tous les débiteurs</option>' +
        debiteursGlobaux.map(d => `<option value="${d.uuid}">${d.nom} ${d.prenom || ''}</option>`).join('');
}

async function initFiltres(type) {
    await chargerFiltres();
    remplirSelects(type);
}

function getUrlFiltre(type, endpoint) {
    const agentSelect = document.getElementById('filtre-agent-' + type);
    const debiteurSelect = document.getElementById('filtre-debiteur-' + type);
    let url = endpoint + '?';
    if (agentSelect && agentSelect.value) url += 'agent_uuid=' + encodeURIComponent(agentSelect.value) + '&';
    if (debiteurSelect && debiteurSelect.value) url += 'debiteur_uuid=' + encodeURIComponent(debiteurSelect.value) + '&';
    return url;
}

async function exportEpargnes() {
    const url = getUrlFiltre('epargnes', '/epargnes/export');
    if (typeof apiDownload === 'function') apiDownload(url, 'epargnes.csv');
    else window.location.href = url;
}

async function exportPenalites() {
    const url = getUrlFiltre('penalites', '/penalites/export');
    if (typeof apiDownload === 'function') apiDownload(url, 'penalites.csv');
    else window.location.href = url;
}

function groupByDate(list, dateKey, montantKey) {
    const map = {};
    list.forEach(item => {
        const date = item[dateKey] ? new Date(item[dateKey]).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }) : 'Inconnu';
        map[date] = (map[date] || 0) + parseFloat(item[montantKey] || 0);
    });
    return map;
}

async function loadEpargnes(c) {
    const data = await apiFetch('/epargnes');
    if (!Array.isArray(data)) {
        c.innerHTML = '<div class="panel text-center py-12"><p class="text-muted">Erreur chargement épargnes</p></div>';
        return;
    }

    const totalCollecte = data.filter(e => e.statut === 'collecte').reduce((s, e) => s + parseFloat(e.montant || 0), 0);
    const totalRecupere = data.filter(e => e.statut === 'recuperee').reduce((s, e) => s + parseFloat(e.montant || 0), 0);
    const nbCollectes = data.length;
    const clientsUniques = new Set(data.map(e => e.debiteur_id)).size;
    const collectesParJour = groupByDate(data, 'date_collecte', 'montant');
    const labels = Object.keys(collectesParJour).sort();
    const values = labels.map(l => collectesParJour[l]);

    const rows = data.slice(0, 50).map(e => {
        const deb = e.debiteur ? (e.debiteur.nom + ' ' + (e.debiteur.prenom || '')) : '-';
        const statut = e.statut === 'recuperee' ? '<span class="badge badge-success">Récupérée</span>' : '<span class="badge badge-info">Collectée</span>';
        return `<tr><td>${deb}</td><td>${formatMoney(e.montant)}</td><td>${formatDate(e.date_collecte)}</td><td>${statut}</td></tr>`;
    }).join('');

    c.innerHTML = `
        <div class="fade-in space-y-6">
            <div class="flex items-center justify-between">
                <h3 class="text-xl font-bold">Épargne tontine</h3>
            </div>

            <div class="flex flex-wrap gap-2 items-end">
                <div>
                    <label class="block text-xs text-muted mb-1">Agent</label>
                    <select id="filtre-agent-epargnes" class="small-btn small-btn--secondary"><option value="">Tous les agents</option></select>
                </div>
                <div>
                    <label class="block text-xs text-muted mb-1">Débiteur</label>
                    <select id="filtre-debiteur-epargnes" class="small-btn small-btn--secondary"><option value="">Tous les débiteurs</option></select>
                </div>
                <button class="small-btn small-btn--primary" onclick="exportEpargnes()">📥 Export CSV</button>
            </div>

            <div class="grid grid-cols-2 lg:grid-cols-5 gap-4">
                <div class="kpi-card" style="border-left:3px solid #10b981"><div class="kpi-label">Épargne collectée en cours</div><div class="kpi-value">${formatMoney(totalCollecte)}</div></div>
                <div class="kpi-card" style="border-left:3px solid #3b82f6"><div class="kpi-label">Épargne restituée (client)</div><div class="kpi-value">${formatMoney(totalRecupere)}</div></div>
                <div class="kpi-card" style="border-left:3px solid #8b5cf6"><div class="kpi-label">Collectes</div><div class="kpi-value">${nbCollectes}</div></div>
                <div class="kpi-card" style="border-left:3px solid #f59e0b"><div class="kpi-label">Clients actifs</div><div class="kpi-value">${clientsUniques}</div></div>
                <div class="kpi-card" style="border-left:3px solid #ef4444"><div class="kpi-label">Moyenne/jour</div><div class="kpi-value">${formatMoney(totalCollecte / Math.max(1, labels.length))}</div></div>
            </div>

            <div class="grid lg:grid-cols-2 gap-6">
                <div class="panel p-4">
                    <h4 class="font-semibold mb-3">Évolution des collectes</h4>
                    <div style="position:relative; height:200px;"><canvas id="chartEpargneEvolution"></canvas></div>
                </div>
                <div class="panel p-4">
                    <h4 class="font-semibold mb-3">Répartition</h4>
                    <div style="position:relative; height:200px;"><canvas id="chartEpargneRepartition"></canvas></div>
                </div>
            </div>

            <div class="panel">
                <div class="table-wrapper">
                    <table>
                        <thead><tr><th>Débiteur</th><th>Montant</th><th>Date</th><th>Statut</th></tr></thead>
                        <tbody>${rows || '<tr><td colspan="4" class="text-center">Aucune épargne</td></tr>'}</tbody>
                    </table>
                </div>
            </div>
        </div>`;

    initFiltres('epargnes');

    destroyChart(chartEpargneEvolution);
    if (window.Chart) {
        chartEpargneEvolution = new Chart(document.getElementById('chartEpargneEvolution'), {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Montant collecté (FCFA)',
                    data: values,
                    borderColor: '#10b981',
                    backgroundColor: 'rgba(16,185,129,0.1)',
                    fill: true,
                    tension: 0.4,
                    pointRadius: 3,
                    pointBackgroundColor: '#10b981'
                }]
            },
            options: { responsive: true, maintainAspectRatio: false }
        });
    }

    destroyChart(chartEpargneRepartition);
    if (window.Chart) {
        chartEpargneRepartition = new Chart(document.getElementById('chartEpargneRepartition'), {
            type: 'doughnut',
            data: {
                labels: ['Collectée', 'Récupérée'],
                datasets: [{
                    data: [totalCollecte, totalRecupere],
                    backgroundColor: ['#10b981', '#3b82f6'],
                }]
            },
            options: { responsive: true, maintainAspectRatio: false }
        });
    }
}

async function loadPenalites(c) {
    const data = await apiFetch('/penalites');
    if (!Array.isArray(data)) {
        c.innerHTML = '<div class="panel text-center py-12"><p class="text-muted">Erreur chargement pénalités</p></div>';
        return;
    }

    const enAttente = data.filter(p => p.statut === 'en_attente');
    const payees = data.filter(p => p.statut === 'payee');
    const refusees = data.filter(p => p.statut === 'refusee');
    const totalEnAttente = enAttente.reduce((s, p) => s + parseFloat(p.montant || 0), 0);
    const totalPaye = payees.reduce((s, p) => s + parseFloat(p.montant || 0), 0);
    const totalRefuse = refusees.reduce((s, p) => s + parseFloat(p.montant || 0), 0);
    const total = totalEnAttente + totalPaye + totalRefuse;

    const parJour = groupByDate(data, 'date_appliquee', 'montant');
    const labels = Object.keys(parJour).sort();
    const values = labels.map(l => parJour[l]);

    const rows = enAttente.slice(0, 50).map(p => {
        const deb = p.debiteur ? (p.debiteur.nom + ' ' + (p.debiteur.prenom || '')) : '-';
        return `<tr><td>${deb}</td><td>${formatMoney(p.montant)}</td><td>${p.jours_retard || 0} j</td><td><span class="badge badge-warning">En attente</span></td></tr>`;
    }).join('');

    c.innerHTML = `
        <div class="fade-in space-y-6">
            <div class="flex items-center justify-between">
                <h3 class="text-xl font-bold">Pénalités à régulariser</h3>
            </div>

            <div class="flex flex-wrap gap-2 items-end">
                <div>
                    <label class="block text-xs text-muted mb-1">Agent</label>
                    <select id="filtre-agent-penalites" class="small-btn small-btn--secondary"><option value="">Tous les agents</option></select>
                </div>
                <div>
                    <label class="block text-xs text-muted mb-1">Débiteur</label>
                    <select id="filtre-debiteur-penalites" class="small-btn small-btn--secondary"><option value="">Tous les débiteurs</option></select>
                </div>
                <button class="small-btn small-btn--primary" onclick="exportPenalites()">📥 Export CSV</button>
            </div>

            <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div class="kpi-card" style="border-left:3px solid #ef4444"><div class="kpi-label">Total dû</div><div class="kpi-value">${formatMoney(total)}</div></div>
                <div class="kpi-card" style="border-left:3px solid #f59e0b"><div class="kpi-label">En attente</div><div class="kpi-value">${formatMoney(totalEnAttente)}</div></div>
                <div class="kpi-card" style="border-left:3px solid #10b981"><div class="kpi-label">Recouvré</div><div class="kpi-value">${formatMoney(totalPaye)}</div></div>
                <div class="kpi-card" style="border-left:3px solid #6b7280"><div class="kpi-label">Refusé / compensé</div><div class="kpi-value">${formatMoney(totalRefuse)}</div></div>
            </div>

            <div class="grid lg:grid-cols-2 gap-6">
                <div class="panel p-4">
                    <h4 class="font-semibold mb-3">Pénalités par jour</h4>
                    <div style="position:relative; height:200px;"><canvas id="chartPenaliteEvolution"></canvas></div>
                </div>
                <div class="panel p-4">
                    <h4 class="font-semibold mb-3">Répartition</h4>
                    <div style="position:relative; height:200px;"><canvas id="chartPenaliteRepartition"></canvas></div>
                </div>
            </div>

            <div class="panel">
                <h4 class="font-semibold p-4 pb-0">Pénalités en attente</h4>
                <div class="table-wrapper">
                    <table>
                        <thead><tr><th>Débiteur</th><th>Montant</th><th>Retard</th><th>Statut</th></tr></thead>
                        <tbody>${rows || '<tr><td colspan="4" class="text-center">Aucune pénalité</td></tr>'}</tbody>
                    </table>
                </div>
            </div>
        </div>`;

    initFiltres('penalites');

    destroyChart(chartPenaliteEvolution);
    if (window.Chart) {
        chartPenaliteEvolution = new Chart(document.getElementById('chartPenaliteEvolution'), {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Montant pénalités (FCFA)',
                    data: values,
                    borderColor: '#ef4444',
                    backgroundColor: 'rgba(239,68,68,0.1)',
                    fill: true,
                    tension: 0.4,
                    pointRadius: 3,
                    pointBackgroundColor: '#ef4444'
                }]
            },
            options: { responsive: true, maintainAspectRatio: false }
        });
    }

    destroyChart(chartPenaliteRepartition);
    if (window.Chart) {
        chartPenaliteRepartition = new Chart(document.getElementById('chartPenaliteRepartition'), {
            type: 'doughnut',
            data: {
                labels: ['En attente', 'Recouvrée', 'Refusée'],
                datasets: [{
                    data: [totalEnAttente, totalPaye, totalRefuse],
                    backgroundColor: ['#f59e0b', '#10b981', '#6b7280'],
                }]
            },
            options: { responsive: true, maintainAspectRatio: false }
        });
    }
}
