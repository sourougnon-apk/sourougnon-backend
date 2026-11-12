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
            container.innerHTML = '<p class="text-center text-muted py-4">Aucune remise en attente de validation.</p>';
            return;
        }

        // On ajoute les styles pour la modale si ce n'est pas déjà fait
        if (!document.getElementById('remise-modal-styles')) {
            const style = document.createElement('style');
            style.id = 'remise-modal-styles';
            style.innerHTML = `
                .remise-card { background:#fff; border:1px solid #e2e8f0; border-radius:12px; padding:16px; margin-bottom:12px; box-shadow:0 2px 8px rgba(0,0,0,0.03); }
                .remise-header { display:flex; justify-content:space-between; align-items:center; border-bottom:1px dashed #e2e8f0; padding-bottom:12px; margin-bottom:12px; }
                .remise-totaux { display:flex; gap:10px; margin-bottom:12px; flex-wrap:wrap; }
                .remise-badge { padding:4px 8px; border-radius:6px; font-size:11px; font-weight:600; }
                .rb-enc { background:#ecfdf5; color:#047857; }
                .rb-pen { background:#fef2f2; color:#b91c1c; }
                .rb-epa { background:#eff6ff; color:#1d4ed8; }
            `;
            document.head.appendChild(style);
        }

        container.innerHTML = `<h4 class="font-semibold mb-3">Remises en attente de validation</h4>
        <div class="space-y-3">
            ${remises.map(r => `
                <div class="remise-card">
                    <div class="remise-header">
                        <div>
                            <h4 class="font-bold text-slate-800">${r.agent ? r.agent.nom + ' ' + r.agent.prenom : 'Agent inconnu'}</h4>
                            <p class="text-xs text-slate-500">${r.reference} • ${new Date(r.created_at).toLocaleDateString('fr-FR')}</p>
                        </div>
                        <div class="text-right">
                            <span class="block text-lg font-bold text-blue-600">${f(r.montant_declare)}</span>
                            <span class="text-xs text-slate-500">Déclaré</span>
                        </div>
                    </div>
                    <div class="remise-totaux">
                        <span class="remise-badge rb-enc">Encaissements: ${f(r.totaux.encaissements)}</span>
                        <span class="remise-badge rb-pen">Pénalités: ${f(r.totaux.penalites)}</span>
                        <span class="remise-badge rb-epa">Épargnes: ${f(r.totaux.epargnes)}</span>
                    </div>
                    <div class="flex justify-end gap-2 mt-3">
                        <button class="px-3 py-1.5 bg-slate-100 text-slate-700 rounded-lg text-sm hover:bg-slate-200" onclick="ouvrirDetailsRemise('${r.reference}')">Voir détails</button>
                        <button class="px-3 py-1.5 bg-green-600 text-white rounded-lg text-sm font-semibold hover:bg-green-700" onclick="validerRemiseAction('${r.reference}', ${r.montant_declare})">Valider</button>
                    </div>
                </div>
            `).join('')}
        </div>`;
    } catch(e) {
        console.warn('Erreur remises attente', e);
    }
}

async function ouvrirDetailsRemise(reference) {
    const remises = await apiFetch('/caisse/remises-en-attente');
    const remise = remises.find(r => r.reference === reference);
    if (!remise) return;

    const f = v => new Intl.NumberFormat('fr-FR',{style:'currency',currency:'XOF',maximumFractionDigits:0}).format(v||0);
    
    // Grouper par type
    const enc = remise.mouvements.filter(m => m.type === 'encaissement');
    const pen = remise.mouvements.filter(m => m.type === 'penalite');
    const epa = remise.mouvements.filter(m => m.type === 'epargne');

    const html = `
        <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" id="modal-detail-remise">
            <div class="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                <div class="bg-slate-800 text-white p-4 flex justify-between items-center">
                    <div>
                        <h3 class="font-bold text-lg">Détails de la remise</h3>
                        <p class="text-slate-300 text-xs">${remise.reference} - ${remise.agent.nom} ${remise.agent.prenom}</p>
                    </div>
                    <button onclick="document.getElementById('modal-detail-remise').remove()" class="text-slate-400 hover:text-white">✕</button>
                </div>
                
                <div class="p-4 overflow-y-auto flex-1">
                    ${enc.length > 0 ? `
                        <h4 class="font-bold text-green-700 mb-2 border-b pb-1">Encaissements (${f(remise.totaux.encaissements)})</h4>
                        <table class="w-full text-sm mb-4">
                            ${enc.map(m => `<tr class="border-b border-slate-100"><td class="py-1">${m.nom_debiteur}</td><td class="text-right font-medium">${f(m.montant)}</td></tr>`).join('')}
                        </table>
                    ` : ''}

                    ${pen.length > 0 ? `
                        <h4 class="font-bold text-red-700 mb-2 border-b pb-1">Pénalités (${f(remise.totaux.penalites)})</h4>
                        <table class="w-full text-sm mb-4">
                            ${pen.map(m => `<tr class="border-b border-slate-100"><td class="py-1">${m.nom_debiteur}</td><td class="text-right font-medium">${f(m.montant)}</td></tr>`).join('')}
                        </table>
                    ` : ''}

                    ${epa.length > 0 ? `
                        <h4 class="font-bold text-blue-700 mb-2 border-b pb-1">Épargnes (${f(remise.totaux.epargnes)})</h4>
                        <table class="w-full text-sm mb-4">
                            ${epa.map(m => `<tr class="border-b border-slate-100"><td class="py-1">${m.nom_debiteur}</td><td class="text-right font-medium">${f(m.montant)}</td></tr>`).join('')}
                        </table>
                    ` : ''}
                </div>

                <div class="p-4 bg-slate-50 border-t flex justify-end">
                    <button onclick="document.getElementById('modal-detail-remise').remove()" class="px-4 py-2 bg-slate-200 rounded-lg text-sm font-semibold">Fermer</button>
                </div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', html);
}

async function validerRemiseAction(reference, montantDeclare) {
    // Demander le montant réellement compté
    const montantRecuStr = await showPrompt(`Montant réellement reçu (Déclaré: ${montantDeclare} FCFA) :`, montantDeclare);
    if (montantRecuStr === null) return; // Annulé
    
    const montantRecu = parseFloat(montantRecuStr);
    if (isNaN(montantRecu) || montantRecu < 0) {
        showAlert('Montant invalide.');
        return;
    }

    if (!(await showConfirm('Confirmer la validation de cette remise ?'))) return;

    apiFetch(`/caisse/remise/${reference}/valider`, {
        method:'POST', 
        body: JSON.stringify({
            statut: 'valide',
            montant_recu: montantRecu
        })
    }).then(() => {
        showAlert('Remise validée avec succès.');
        loadPage('caisse'); // Recharge la page pour rafraichir les données
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
