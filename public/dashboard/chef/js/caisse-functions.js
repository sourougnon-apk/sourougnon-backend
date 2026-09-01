// === PAGE CAISSE AVEC CALENDRIER ET REMISES ===

let currentCaisseDate = new Date();
let currentCaissePeriod = 'mois';

function loadCaisse(c) {
    renderCaisseCalendrier(c);
    loadRemisesEnAttente();
    loadRestitutionsAttente();
}

function renderCaisseCalendrier(c) {
    const selector = `
        <div class="flex gap-2 overflow-x-auto pb-2">
            ${['jour','semaine','mois','annee'].map(p => `
                <button class="chip ${p===currentCaissePeriod?'chip--active':''}" onclick="setCaissePeriod('${p}')">
                    ${p.charAt(0).toUpperCase() + p.slice(1)}
                </button>`).join('')}
        </div>
    `;

    const nav = `
        <div class="flex items-center justify-between mb-3">
            <button class="text-btn" onclick="changeCaisseMonth(-1)">◀</button>
            <h4 class="font-semibold">${new Intl.DateTimeFormat('fr-FR', {month:'long', year:'numeric'}).format(currentCaisseDate)}</h4>
            <button class="text-btn" onclick="changeCaisseMonth(1)">▶</button>
        </div>
    `;

    c.innerHTML = `<div class="fade-in space-y-6">
        <div class="flex items-center justify-between">
            <h3 class="text-xl font-bold">Caisse</h3>
            <div class="flex gap-2">
                <button onclick="showDecaissementModal()" class="bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-red-700">- Dépense</button>
                <button onclick="showClotureModal()" class="bg-purple-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-purple-700">Clôturer</button>
                <button onclick="exportCaissePeriode()" class="bg-slate-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-slate-700">Export CSV</button>
            </div>
        </div>
        ${selector}
        <div class="panel p-4">
            ${nav}
            <div id="caisse-calendrier" class="grid grid-cols-7 gap-1"></div>
        </div>
        <div id="caisse-kpis" class="grid grid-cols-2 lg:grid-cols-5 gap-3"></div>
        <div id="remises-attente" class="panel p-4"></div>
        <div id="restitutions-attente" class="panel p-4"></div>
        <div class="panel">
            <h4 class="font-semibold p-4 pb-0">Mouvements</h4>
            <div class="table-wrapper" id="caisse-mouvements">
                <p class="text-center text-muted py-4">Sélectionnez un jour</p>
            </div>
        </div>
    </div>`;

    drawCaisseMonth();
    loadCaisseKPIs();
}

function setCaissePeriod(period) {
    currentCaissePeriod = period;
    document.querySelectorAll('.chip').forEach(ch => ch.classList.remove('chip--active'));
    event.target.classList.add('chip--active');
    renderCaisseCalendrier(document.getElementById('page-content'));
    loadRemisesEnAttente();
}

function changeCaisseMonth(delta) {
    currentCaisseDate.setMonth(currentCaisseDate.getMonth() + delta);
    renderCaisseCalendrier(document.getElementById('page-content'));
}

function drawCaisseMonth() {
    const year = currentCaisseDate.getFullYear();
    const month = currentCaisseDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startOffset = (firstDay.getDay() + 6) % 7;
    const daysInMonth = lastDay.getDate();
    const today = new Date();

    const container = document.getElementById('caisse-calendrier');
    container.innerHTML = '';

    for (let i = 0; i < startOffset; i++) {
        container.innerHTML += '<div></div>';
    }

    for (let d = 1; d <= daysInMonth; d++) {
        const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
        const isToday = d === today.getDate() && month === today.getMonth() && year === today.getFullYear();
        const dayBtn = document.createElement('button');
        dayBtn.className = `p-2 rounded-lg text-sm border ${isToday ? 'border-blue-500' : 'border-slate-200'} hover:bg-slate-50`;
        dayBtn.innerHTML = `<div class="font-medium">${d}</div><div id="solde-${dateStr}" class="text-xs mt-1">...</div><div id="pastille-${dateStr}" class="mt-1"><span class="w-2 h-2 inline-block rounded-full bg-gray-300"></span></div>`;
        dayBtn.onclick = () => selectCaisseDay(dateStr);
        container.appendChild(dayBtn);
    }

    loadCaissePeriode(year, month);
}

async function loadCaissePeriode(year, month) {
    const debut = `${year}-${String(month+1).padStart(2,'0')}-01`;
    const fin = new Date(year, month+1, 0).toISOString().split('T')[0];

    try {
        const res = await apiFetch(`/caisse/periode?debut=${debut}&fin=${fin}`);
        if (!Array.isArray(res)) return;

        res.forEach(item => {
            const soldeEl = document.getElementById(`solde-${item.jour}`);
            const pastilleEl = document.getElementById(`pastille-${item.jour}`);

            const encaissements = Number(item.encaissements || 0);
            const decaissements = Number(item.decaissements || 0);
            const epargnes = Number(item.epargnes || 0);
            const penalites = Number(item.penalites || 0);
            const ecart = Number(item.ecart || 0);
            const nbMouvements = Number(item.nb_mouvements || 0);
            const solde = encaissements + epargnes + penalites - decaissements;

            if (soldeEl) {
                soldeEl.textContent = nbMouvements > 0
                    ? new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(solde) + ' F'
                    : '';
            }

            if (!pastilleEl) return;

            let couleur = 'bg-gray-300';
            let titre = 'Aucun mouvement';

            if (item.non_cloture) {
                couleur = 'bg-red-500';
                titre = 'Caisse non clôturée';
            } else if (Math.abs(ecart) > 0.009) {
                couleur = 'bg-orange-500';
                titre = 'Écart de caisse : ' + ecart;
            } else if (nbMouvements > 0) {
                couleur = 'bg-green-500';
                titre = nbMouvements + ' mouvement(s)';
            }

            pastilleEl.innerHTML = `<span title="${titre}" class="w-2 h-2 inline-block rounded-full ${couleur}"></span>`;
        });
    } catch (e) {
        console.error('loadCaissePeriode', e);
    }
}

function selectCaisseDay(dateStr) {
    currentCaissePeriod = 'jour';
    currentCaisseDate = new Date(dateStr + 'T00:00:00');
    document.querySelectorAll('.chip').forEach(ch => ch.classList.remove('chip--active'));
    const jourChip = [...document.querySelectorAll('.chip')].find(ch => ch.textContent.trim() === 'Jour');
    if (jourChip) jourChip.classList.add('chip--active');

    loadCaisseKPIs(dateStr);
    loadCaisseMouvements(dateStr);
}

async function loadCaisseKPIs(date = null) {
    const debut = date || new Date(currentCaisseDate.getFullYear(), currentCaisseDate.getMonth(), 1).toISOString().split('T')[0];
    const fin = date || new Date(currentCaisseDate.getFullYear(), currentCaisseDate.getMonth()+1, 0).toISOString().split('T')[0];

    try {
        const data = await apiFetch(`/caisse/consolidee?debut=${debut}&fin=${fin}`);
        const f = v => new Intl.NumberFormat('fr-FR',{style:'currency',currency:'XOF',maximumFractionDigits:0}).format(v||0);

        document.getElementById('caisse-kpis').innerHTML = `
            <div class="kpi-card" style="border-left:3px solid #10b981"><div class="kpi-label">Encaissements</div><div class="kpi-value">${f(data.encaissements)}</div></div>
            <div class="kpi-card" style="border-left:3px solid #ef4444"><div class="kpi-label">Dépenses</div><div class="kpi-value">${f(data.decaissements)}</div></div>
            <div class="kpi-card" style="border-left:3px solid #3b82f6"><div class="kpi-label">Épargnes</div><div class="kpi-value">${f(data.epargnes)}</div></div>
            <div class="kpi-card" style="border-left:3px solid #f59e0b"><div class="kpi-label">Pénalités</div><div class="kpi-value">${f(data.penalites)}</div></div>
            <div class="kpi-card" style="border-left:3px solid #8b5cf6"><div class="kpi-label">Solde</div><div class="kpi-value">${f(data.solde)}</div></div>
        `;
    } catch(e) {
        console.warn('Erreur KPI caisse', e);
    }
}

async function loadCaisseMouvements(date) {
    try {
        const caisseData = await apiFetch('/caisse');
        const mouvements = (caisseData.caisse && caisseData.caisse.mouvements) || [];
        const f = v => new Intl.NumberFormat('fr-FR',{style:'currency',currency:'XOF',maximumFractionDigits:0}).format(v||0);

        document.getElementById('caisse-mouvements').innerHTML = mouvements.length === 0
            ? '<p class="text-center text-muted py-4">Aucun mouvement</p>'
            : `<table class="min-w-full"><thead><tr><th>Heure</th><th>Type</th><th>Montant</th><th>Mode</th><th>Motif</th></tr></thead><tbody>
                ${mouvements.map(m => `<tr><td class="text-xs">${new Date(m.date_mouvement).toLocaleTimeString('fr-FR')}</td><td><span class="badge ${m.type==='encaissement'?'badge-success':'badge-danger'}">${m.type}</span></td><td class="font-semibold">${f(m.montant)}</td><td>${m.mode_paiement||''}</td><td>${m.motif||''}</td></tr>`).join('')}
            </tbody></table>`;
    } catch(e) {
        console.warn('Erreur mouvements', e);
    }
}

async function loadRemisesEnAttente() {
    try {
        const remises = await apiFetch('/caisse/remises-en-attente');
        const f = v => new Intl.NumberFormat('fr-FR',{style:'currency',currency:'XOF',maximumFractionDigits:0}).format(v||0);
        const container = document.getElementById('remises-attente');
        if (!container) return;

        if (!Array.isArray(remises) || remises.length === 0) {
            container.innerHTML = '<p class="text-center text-muted py-2">Aucune remise en attente</p>';
            return;
        }

        container.innerHTML = `<h4 class="font-semibold mb-2">Remises en attente de validation</h4>
        <div class="table-wrapper"><table class="min-w-full">
            <thead><tr><th>Agent</th><th>Montant déclaré</th><th>Référence</th><th>Actions</th></tr></thead>
            <tbody>${remises.map(r => `<tr>
                <td>${r.user ? r.user.nom + ' ' + r.user.prenom : '-'}</td>
                <td>${f(r.montant_declare || r.montant)}</td>
                <td class="text-xs">${r.reference}</td>
                <td>
                    <button class="small-btn small-btn--primary" onclick="validerRemiseAction('${r.reference}')">Valider</button>
                    <button class="small-btn small-btn--secondary" onclick="rejeterRemiseAction('${r.reference}')">Rejeter</button>
                </td></tr>`).join('')}
            </tbody></table></div>`;
    } catch(e) {
        console.warn('Erreur remises attente', e);
    }
}

async function validerRemiseAction(reference) {
    if (!(await showConfirm('Valider cette remise ?'))) return;
    apiFetch(`/caisse/remise/${reference}/valider`, {method:'POST', body: JSON.stringify({statut:'valide'})}).then(() => {
        showAlert('Remise validée.');
        loadPage('caisse');
    }).catch(e => showAlert('Erreur : ' + e.message));
}

async function rejeterRemiseAction(reference) {
    const motif = await showPrompt('Motif du rejet :');
    if (!motif) return;
    apiFetch(`/caisse/remise/${reference}/valider`, {method:'POST', body: JSON.stringify({statut:'rejete', motif_rejet:motif})}).then(() => {
        showAlert('Remise rejetée.');
        loadPage('caisse');
    }).catch(e => showAlert('Erreur : ' + e.message));
}

function showDecaissementModal(){document.getElementById('caisse-decaissement-modal').classList.remove('hidden');}
function closeDecaissementModal(){document.getElementById('caisse-decaissement-modal').classList.add('hidden');}
function submitDecaissement(e){e.preventDefault();apiFetch('/caisse/decaisser',{method:'POST',body:JSON.stringify({montant:parseFloat(document.getElementById('caisse-decaissement-montant').value),motif:document.getElementById('caisse-decaissement-motif').value})}).then(function(){closeDecaissementModal();loadPage('caisse');});}
function showClotureModal(){document.getElementById('caisse-cloture-modal').classList.remove('hidden');}
function closeClotureModal(){document.getElementById('caisse-cloture-modal').classList.add('hidden');}
async function submitCloture(e){e.preventDefault();var solde = await showPrompt('Solde réel compté (FCFA) :', '0'); if(!solde) return;apiFetch('/caisse/cloturer',{method:'POST',body:JSON.stringify({solde_reel:parseFloat(solde),notes:document.getElementById('cloture-notes').value})}).then(function(r){closeClotureModal();showAlert('Caisse clôturée. Écart : '+new Intl.NumberFormat('fr-FR',{style:'currency',currency:'XOF',maximumFractionDigits:0}).format(r.ecart));loadPage('caisse');});}

function exportCaissePeriode() {
    const y = currentCaisseDate.getFullYear();
    const m = currentCaisseDate.getMonth();
    const debut = `${y}-${String(m+1).padStart(2,'0')}-01`;
    const fin = new Date(y, m+1, 0).toISOString().split('T')[0];
    if (typeof apiDownload === 'function') {
        apiDownload(`/caisse/export-periode?debut=${debut}&fin=${fin}`, `caisse_${debut}_au_${fin}.csv`);
    } else {
        window.location.href = `/api/caisse/export-periode?debut=${debut}&fin=${fin}`;
    }
async function loadRestitutionsAttente() {
    try {
        const restitutions = await apiFetch('/caisse/restitutions-attente');
        const container = document.getElementById('restitutions-attente');
        if (!container) return;

        const f = v => new Intl.NumberFormat('fr-FR',{style:'currency',currency:'XOF',maximumFractionDigits:0}).format(v||0);

        if (!Array.isArray(restitutions) || restitutions.length === 0) {
            container.innerHTML = '<p class="text-center text-muted py-2">Aucune restitution en attente</p>';
            return;
        }

        container.innerHTML = `<h4 class="font-semibold mb-2">Restitutions d\'épargne en attente</h4>
        <div class="table-wrapper"><table class="min-w-full">
            <thead><tr><th>Débiteur</th><th>Montant</th><th>Agent</th><th>Actions</th></tr></thead>
            <tbody>${restitutions.map(r => `<tr>
                <td>${r.debiteur ? r.debiteur.nom + ' ' + (r.debiteur.prenom||'') : '-'}</td>
                <td>${f(r.montant)}</td>
                <td>${r.vente && r.vente.agent ? r.vente.agent.nom + ' ' + (r.vente.agent.prenom||'') : '-'}</td>
                <td><button class="small-btn small-btn--primary" onclick="validerRestitutionAction('${r.uuid}')">Valider</button></td>
            </tr>`).join('')}
            </tbody></table></div>`;
    } catch(e) {
        console.warn('Erreur restitutions attente', e);
    }
}

async function validerRestitutionAction(uuid) {
    if (!(await showConfirm('Valider cette restitution ?'))) return;
    apiFetch(`/epargnes/${uuid}/valider-restitution`, {method:'POST', body: JSON.stringify({})})
        .then(() => {
            showAlert('Restitution validée.');
            loadPage('caisse');
        })
        .catch(e => showAlert('Erreur : ' + e.message));
}


}
