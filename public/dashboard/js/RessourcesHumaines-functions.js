function loadRessourcesHumaines(c) {
    c.innerHTML = `
        <div class="fade-in space-y-6">
            <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h3 class="text-xl font-bold text-slate-800">Ressources Humaines</h3>
                    <p class="text-sm text-muted mt-1">Gérez les employés, les présences et la paie.</p>
                </div>
            </div>
            
            <div class="flex gap-2 border-b border-slate-200 overflow-x-auto">
                <button onclick="switchRHTab('employes')" class="rh-tab px-4 py-2 text-sm font-semibold border-b-2 border-blue-600 text-blue-600" data-tab="employes">Employés</button>
                <button onclick="switchRHTab('presences')" class="rh-tab px-4 py-2 text-sm font-semibold border-b-2 border-transparent text-slate-500 hover:text-slate-800" data-tab="presences">Présences</button>
                <button onclick="switchRHTab('salaires')" class="rh-tab px-4 py-2 text-sm font-semibold border-b-2 border-transparent text-slate-500 hover:text-slate-800" data-tab="salaires">Salaires</button>
            </div>

            <div id="rh-content">
                <div class="text-center py-12 text-muted">Chargement...</div>
            </div>
        </div>
    `;
    chargerRHTab('employes');
}

function switchRHTab(tab) {
    document.querySelectorAll('.rh-tab').forEach(t => {
        t.classList.remove('border-blue-600', 'text-blue-600');
        t.classList.add('border-transparent', 'text-slate-500');
    });
    var btn = document.querySelector(`.rh-tab[data-tab="${tab}"]`);
    if (btn) {
        btn.classList.remove('border-transparent', 'text-slate-500');
        btn.classList.add('border-blue-600', 'text-blue-600');
    }
    chargerRHTab(tab);
}

function chargerRHTab(tab) {
    var el = document.getElementById('rh-content');
    el.innerHTML = '<div class="text-center py-8 text-muted">Chargement...</div>';
    var f = v => new Intl.NumberFormat('fr-FR', {style:'currency', currency:'XOF', maximumFractionDigits:0}).format(v || 0);

    if (tab === 'employes') {
        apiFetch('/rh/employes').then(data => {
            if (!data || data.length === 0) {
                el.innerHTML = '<div class="panel text-center py-8 text-muted">Aucun employé enregistré.</div>';
                return;
            }
            el.innerHTML = `<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                ${data.map(emp => `
                    <div class="panel p-5 border-t-4 border-t-blue-500">
                        <div class="flex justify-between items-start mb-2">
                            <h4 class="font-bold text-slate-800 text-lg">${emp.user ? emp.user.nom + ' ' + (emp.user.prenom||'') : 'Inconnu'}</h4>
                            <span class="badge badge-info">${emp.mode_calcul}</span>
                        </div>
                        <div class="text-xs text-muted mb-3">${emp.poste || 'Poste non défini'}</div>
                        <div class="text-sm font-semibold text-slate-700 mb-4">Salaire base : ${f(emp.salaire_base)}</div>
                        <div class="flex gap-2 pt-3 border-t border-slate-100 flex-wrap">
                            <button onclick="rhVoirFicheEmploye('${emp.uuid}')" class="text-blue-600 text-xs font-semibold hover:underline">Voir fiche</button>
                            <button onclick="rhFichePaieEmploye('${emp.uuid}')" class="text-green-600 text-xs font-semibold hover:underline">Fiche paie</button>
                            <button onclick="rhModifierEmployeModal('${emp.uuid}')" class="text-amber-600 text-xs font-semibold hover:underline">Modifier</button>
                            <button onclick="rhConfigurerFichePaieModal('${emp.uuid}')" class="text-purple-600 text-xs font-semibold hover:underline">Config</button>
                        </div>
                    </div>
                `).join('')}
            </div>`;
        }).catch(() => el.innerHTML = '<div class="text-red-500 text-center py-8">Erreur de chargement.</div>');
    }
    else if (tab === 'presences') {
        var mois = prompt('Période (YYYY-MM) :', new Date().toISOString().slice(0,7));
        if (!mois) return chargerRHTab('employes'); // On revient aux employés si annulé
        apiFetch('/rh/presences?mois=' + mois).then(data => {
            if (!Array.isArray(data) || data.length === 0) {
                el.innerHTML = '<div class="panel text-center py-8 text-muted">Aucune présence pour cette période.</div>';
                return;
            }
            el.innerHTML = `
                <div class="panel">
                    <h4 class="font-bold text-slate-800 mb-4">Présences pour ${mois}</h4>
                    <table class="w-full">
                        <thead><tr><th>Agent</th><th>Jours travaillés</th></tr></thead>
                        <tbody>${data.map(p => `
                            <tr>
                                <td class="font-medium">${p.user.nom} ${p.user.prenom || ''}</td>
                                <td class="font-bold text-green-600">${p.nb_jours_travailles} jours</td>
                            </tr>
                        `).join('')}</tbody>
                    </table>
                </div>`;
        });
    }
    else if (tab === 'salaires') {
        apiFetch('/rh/salaires').then(data => {
            if (!Array.isArray(data) || data.length === 0) {
                el.innerHTML = `<div class="panel text-center py-8 text-muted">Aucun salaire calculé. <br><button onclick="rhCalculerSalaires()" class="mt-2 text-blue-600 font-semibold hover:underline">Calculer pour un mois</button></div>`;
                return;
            }
            el.innerHTML = `
                <div class="flex justify-between items-center mb-4">
                    <h4 class="font-bold text-slate-800">Historique des Salaires</h4>
                    <button onclick="rhCalculerSalaires()" class="bg-slate-800 text-white px-3 py-1.5 rounded-lg text-xs font-semibold">Calculer un nouveau mois</button>
                </div>
                <div class="panel">
                    <table class="w-full">
                        <thead><tr><th>Période</th><th>Employé</th><th>Brut</th><th>Net</th><th>Statut</th><th>Actions</th></tr></thead>
                        <tbody>${data.map(s => `
                            <tr>
                                <td class="font-mono text-xs">${s.periode}</td>
                                <td class="font-medium">${s.employe?.user?.nom || '--'}</td>
                                <td>${f(s.salaire_brut)}</td>
                                <td class="font-bold text-green-600">${f(s.salaire_net)}</td>
                                <td><span class="badge ${s.statut === 'paye' ? 'badge-success' : 'badge-warning'}">${s.statut}</span></td>
                                <td class="flex gap-2">
                                    ${s.statut === 'pending' ? `<button onclick="rhPayerSalaire('${s.uuid}')" class="text-blue-600 text-xs font-semibold">Payer</button>` : ''}
                                    <button onclick="rhModifierRetenues('${s.uuid}')" class="text-slate-600 text-xs font-semibold">Retenues</button>
                                    <button onclick="rhFichePaie('${s.uuid}')" class="text-purple-600 text-xs font-semibold">Fiche</button>
                                </td>
                            </tr>
                        `).join('')}</tbody>
                    </table>
                </div>`;
        });
    }
}

// --- FONCTIONS EXISTANTES DE RH ---
async function rhCalculerSalaires() {
    const mois = prompt('Période (YYYY-MM) :', new Date().toISOString().slice(0,7));
    if (!mois) return;
    const res = await apiFetch('/rh/salaires/calculer', {method:'POST', body:JSON.stringify({periode:mois})});
    showAlert(res.message || 'Calcul terminé');
    chargerRHTab('salaires');
}

async function rhPayerSalaire(uuid) {
    if (!(await showConfirm('Payer ce salaire ?'))) return;
    const res = await apiFetch(`/rh/salaires/${uuid}/payer`, {method:'POST'});
    showAlert(res.success ? 'Salaire payé.' : (res.error || 'Erreur'));
    chargerRHTab('salaires');
}

async function rhModifierRetenues(uuid) {
    showPrompt('Retenues JSON (ex: [{"nom":"CNPS","type":"pourcentage","valeur":5}]):', '').then(async (jsonStr) => {
        if (!jsonStr) return;
        try {
            const retenues = JSON.parse(jsonStr);
            const res = await apiFetch(`/rh/salaires/${uuid}/retenues`, {method:'PUT', body:JSON.stringify({retenues})});
            showAlert('Retenues mises à jour.');
            chargerRHTab('salaires');
        } catch(e) { showAlert('JSON invalide'); }
    });
}

function rhFichePaie(uuid) {
    window.open('/api/rh/fiches-paie/' + uuid + '?token=' + encodeURIComponent(localStorage.getItem('sourougnon_token') || ''), '_blank');
}

function rhFichePaieEmploye(uuid) {
    window.open('/api/rh/employes/' + uuid + '/fiche-paie?token=' + encodeURIComponent(localStorage.getItem('sourougnon_token') || ''), '_blank');
}

async function rhVoirFicheEmploye(uuid) {
    const emp = await apiFetch(`/rh/employes/${uuid}`);
    if (!emp) return;
    const user = emp.user || {};
    const config = emp.fiche_paie_config || { retenues: [], mentions_libres: [] };

    const html = `
        <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" id="rh-modal">
            <div class="bg-white rounded-2xl p-6 w-full max-w-lg shadow-2xl fade-in max-h-[90vh] overflow-y-auto">
                <div class="flex justify-between items-center mb-4">
                    <h3 class="text-lg font-bold">Fiche Employé</h3>
                    <button onclick="document.getElementById('rh-modal').remove()" class="text-slate-400 hover:text-slate-700">✕</button>
                </div>
                <div class="grid grid-cols-2 gap-4 mb-4 text-sm">
                    <div><span class="text-muted block text-xs">Nom</span> <strong>${user.nom} ${user.prenom||''}</strong></div>
                    <div><span class="text-muted block text-xs">Poste</span> <strong>${emp.poste || '--'}</strong></div>
                    <div><span class="text-muted block text-xs">Email</span> ${user.email}</div>
                    <div><span class="text-muted block text-xs">Téléphone</span> ${user.telephone || '--'}</div>
                </div>
                <div class="border-t pt-4 text-sm">
                    <p><span class="text-muted">Retenues configurées :</span> ${config.retenues?.length ? config.retenues.map(r => `${r.nom} (${r.valeur}${r.type==='pourcentage'?'%':' F'})`).join(', ') : 'Aucune'}</p>
                </div>
                <div class="mt-6 flex justify-end">
                    <button onclick="document.getElementById('rh-modal').remove()" class="px-4 py-2 bg-slate-100 rounded-lg text-sm font-semibold">Fermer</button>
                </div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', html);
}

async function rhModifierEmployeModal(uuid) {
    const emp = await apiFetch(`/rh/employes/${uuid}`);
    if (!emp) return;
    const html = `
        <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" id="rh-modal-mod">
            <div class="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl fade-in">
                <div class="flex justify-between items-center mb-4">
                    <h3 class="text-lg font-bold">Modifier l'employé</h3>
                    <button onclick="document.getElementById('rh-modal-mod').remove()" class="text-slate-400 hover:text-slate-700">✕</button>
                </div>
                <form onsubmit="rhEnregistrerModificationEmploye(event, '${uuid}')" class="space-y-3">
                    <input type="text" id="rh-post" placeholder="Poste" value="${emp.poste || ''}" class="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm">
                    <input type="number" id="rh-salaire" placeholder="Salaire de base" value="${emp.salaire_base}" class="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm">
                    <select id="rh-mode" class="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm">
                        <option value="journalier" ${emp.mode_calcul === 'journalier' ? 'selected' : ''}>Journalier</option>
                        <option value="fixe" ${emp.mode_calcul === 'fixe' ? 'selected' : ''}>Fixe</option>
                    </select>
                    <div class="flex gap-3 pt-2">
                        <button type="button" onclick="document.getElementById('rh-modal-mod').remove()" class="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl text-sm">Annuler</button>
                        <button type="submit" class="flex-1 px-4 py-2.5 bg-accent text-white rounded-xl text-sm font-semibold">Enregistrer</button>
                    </div>
                </form>
            </div>
        </div>`;
    document.body.insertAdjacentHTML('beforeend', html);
}

async function rhEnregistrerModificationEmploye(e, uuid) {
    e.preventDefault();
    const data = {
        poste: document.getElementById('rh-post').value,
        salaire_base: parseFloat(document.getElementById('rh-salaire').value),
        mode_calcul: document.getElementById('rh-mode').value,
    };
    const res = await apiFetch('/rh/employes/' + uuid, {method:'PUT', body: JSON.stringify(data)});
    if (res.success) {
        document.getElementById('rh-modal-mod').remove();
        showAlert('Employé modifié.');
        chargerRHTab('employes');
    }
}

async function rhConfigurerFichePaieModal(empUuid) {
    const emp = await apiFetch('/rh/employes/' + empUuid);
    if (!emp) return;
    const config = emp.fiche_paie_config || { retenues: [], mentions_libres: [] };
    const html = `
        <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" id="rh-modal-config">
            <div class="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl fade-in">
                <div class="flex justify-between items-center mb-4">
                    <h3 class="text-lg font-bold">Configurer la fiche de paie</h3>
                    <button onclick="document.getElementById('rh-modal-config').remove()" class="text-slate-400 hover:text-slate-700">✕</button>
                </div>
                <form onsubmit="rhEnregistrerConfigFiche(event, '${emp.user?.uuid}')" class="space-y-3">
                    <div id="rh-retenues-container">
                        ${config.retenues?.length ? config.retenues.map((r, i) => `
                            <div class="flex gap-2 items-center" data-index="${i}">
                                <input type="text" value="${r.nom}" placeholder="Nom" class="flex-1 px-2 py-1 border rounded text-sm">
                                <select class="w-24 px-2 py-1 border rounded text-sm">
                                    <option value="pourcentage" ${r.type === 'pourcentage' ? 'selected' : ''}>%</option>
                                    <option value="fixe" ${r.type === 'fixe' ? 'selected' : ''}>Fixe</option>
                                </select>
                                <input type="number" value="${r.valeur}" class="w-20 px-2 py-1 border rounded text-sm">
                                <button type="button" onclick="this.parentElement.remove()" class="text-red-600 font-bold">✕</button>
                            </div>
                        `).join('') : '<p class="text-muted text-xs">Aucune retenue</p>'}
                    </div>
                    <button type="button" onclick="ajouterRetenue()" class="text-xs text-blue-600 font-semibold">+ Ajouter une retenue</button>
                    <input type="text" id="rh-mentions" value="${(config.mentions_libres || []).join('; ')}" placeholder="Mentions libres" class="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm mt-2">
                    <div class="flex gap-3 pt-2">
                        <button type="button" onclick="document.getElementById('rh-modal-config').remove()" class="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl text-sm">Annuler</button>
                        <button type="submit" class="flex-1 px-4 py-2.5 bg-accent text-white rounded-xl text-sm font-semibold">Enregistrer</button>
                    </div>
                </form>
            </div>
        </div>`;
    document.body.insertAdjacentHTML('beforeend', html);
}

function ajouterRetenue() {
    const container = document.getElementById('rh-retenues-container');
    const div = document.createElement('div');
    div.className = 'flex gap-2 items-center mt-2';
    div.innerHTML = `<input type="text" placeholder="Nom" class="flex-1 px-2 py-1 border rounded text-sm"><select class="w-24 px-2 py-1 border rounded text-sm"><option value="pourcentage">%</option><option value="fixe">Fixe</option></select><input type="number" class="w-20 px-2 py-1 border rounded text-sm"><button type="button" onclick="this.parentElement.remove()" class="text-red-600 font-bold">✕</button>`;
    container.appendChild(div);
}

async function rhEnregistrerConfigFiche(e, userUuid) {
    e.preventDefault();
    const retenues = [];
    document.querySelectorAll('#rh-retenues-container > div').forEach(div => {
        const inputs = div.querySelectorAll('input, select');
        retenues.push({ nom: inputs[0].value, type: inputs[1].value, valeur: parseFloat(inputs[2].value) });
    });
    const mentions = document.getElementById('rh-mentions').value.split(';').map(s => s.trim()).filter(Boolean);
    const res = await apiFetch(`/rh/employes/${userUuid}/fiche-paie-config`, { method:'PUT', body: JSON.stringify({ retenues, mentions_libres: mentions }) });
    if (res.success) {
        document.getElementById('rh-modal-config').remove();
        showAlert('Configuration enregistrée.');
        chargerRHTab('employes');
    }
}
