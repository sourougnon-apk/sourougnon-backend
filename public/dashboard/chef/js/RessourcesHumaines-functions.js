function loadRessourcesHumaines(c) {
    c.innerHTML = `
        <div class="fade-in space-y-6">
            <h3 class="text-xl font-bold">Ressources humaines</h3>
            <div class="flex flex-wrap gap-2">
                <button onclick="rhChargerEmployes()" class="chip chip--active">Employés</button>
                <button onclick="rhChargerPresences()" class="chip">Présences</button>
                <button onclick="rhChargerSalaires()" class="chip">Salaires</button>
            </div>
            <div id="rh-contenu" class="panel p-4"></div>
        </div>
    `;
    rhChargerEmployes();
}

// ==== GESTION DES MODALES ====
function rhOuvrirModale(html, style = '') {
    // Supprime toute modale existante
    const old = document.getElementById('rh-modale');
    if (old) old.remove();

    const overlay = document.createElement('div');
    overlay.id = 'rh-modale';
    overlay.className = 'fixed inset-0 z-50 flex items-start justify-center p-4 bg-black/50 overflow-y-auto py-8';
    overlay.style.cssText = style;
    overlay.innerHTML = `
        <div class="bg-white rounded-2xl p-6 w-full max-w-lg shadow-2xl fade-in my-auto">
            ${html}
        </div>
    `;
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) overlay.remove();
    });
    document.body.appendChild(overlay);
}

function rhFermerModale() {
    const m = document.getElementById('rh-modale');
    if (m) m.remove();
}

// ==== EMPLOYÉS ====
async function rhChargerEmployes() {
    const employes = await apiFetch('/rh/employes');
    const el = document.getElementById('rh-contenu');
    if (!Array.isArray(employes)) return;
    el.innerHTML = `
        <div class="flex justify-between mb-2"><h4>Employés</h4><button onclick="rhNouvelEmploye()" class="bg-accent text-white px-3 py-1 rounded text-sm">+ Ajouter</button></div>
        <table class="min-w-full">
            <thead><tr><th>Nom</th><th>Poste</th><th>Salaire base</th><th>Mode calcul</th><th>Actions</th></tr></thead>
            <tbody>${employes.map(emp => `
                <tr>
                    <td>${emp.user ? emp.user.nom + ' ' + emp.user.prenom : '--'}</td>
                    <td>${emp.poste || '--'}</td>
                    <td>${new Intl.NumberFormat('fr-FR').format(emp.salaire_base)} F</td>
                    <td>${emp.mode_calcul}</td>
                    <td>
                        <div class="flex flex-wrap gap-1">
                            <button class="px-2 py-1 rounded-md text-xs font-medium bg-blue-100 text-blue-700 hover:bg-blue-200" onclick="rhVoirFicheEmploye('${emp.uuid}')">Voir fiche</button>
                            <button class="px-2 py-1 rounded-md text-xs font-medium bg-green-100 text-green-700 hover:bg-green-200" onclick="rhFichePaieEmploye('${emp.uuid}')">Fiche paie</button>
                            <button class="px-2 py-1 rounded-md text-xs font-medium bg-amber-100 text-amber-700 hover:bg-amber-200" onclick="rhModifierEmployeModal('${emp.uuid}')">Modifier</button>
                            <button class="px-2 py-1 rounded-md text-xs font-medium bg-purple-100 text-purple-700 hover:bg-purple-200" onclick="rhConfigurerFichePaieModal('${emp.uuid}')">Config fiche</button>
                        </div>
                    </td>
                </tr>
            `).join('')}</tbody>
        </table>
    `;
}

async function rhVoirFicheEmploye(uuid) {
    const emp = await apiFetch(`/rh/employes/${uuid}`);
    if (!emp) return;
    const user = emp.user || {};
    const salaires = emp.salaires || [];
    const absences = emp.absences || [];
    const config = emp.fiche_paie_config || { retenues: [], mentions_libres: [] };

    const html = `
        <div class="flex items-center justify-between mb-4">
            <h3 class="text-lg font-bold">Fiche employé</h3>
            <button onclick="rhFermerModale()" class="text-slate-400 hover:text-slate-600 font-bold">✕</button>
        </div>
        <div class="space-y-4">
            <div class="grid grid-cols-2 gap-3">
                <div><span class="text-muted">Nom :</span> <strong>${user.nom} ${user.prenom}</strong></div>
                <div><span class="text-muted">Poste :</span> <strong>${emp.poste || '--'}</strong></div>
                <div><span class="text-muted">Email :</span> ${user.email || '--'}</div>
                <div><span class="text-muted">Téléphone :</span> ${user.telephone || '--'}</div>
                <div><span class="text-muted">Salaire base :</span> ${emp.salaire_base} F</div>
                <div><span class="text-muted">Mode calcul :</span> ${emp.mode_calcul}</div>
                <div><span class="text-muted">Date d'embauche :</span> ${emp.date_embauche || '--'}</div>
            </div>
            <div>
                <h4 class="font-semibold">Salaires récents</h4>
                ${salaires.length === 0 ? '<p class="text-muted">Aucun salaire</p>' : `
                <table class="min-w-full text-sm">
                    <thead><tr><th>Période</th><th>Net</th><th>Statut</th></tr></thead>
                    <tbody>${salaires.map(s => `<tr><td>${s.periode}</td><td>${s.salaire_net} F</td><td>${s.statut}</td></tr>`).join('')}</tbody>
                </table>`}
            </div>
            <div>
                <h4 class="font-semibold">Absences</h4>
                ${absences.length === 0 ? '<p class="text-muted">Aucune absence enregistrée</p>' : `
                <ul>${absences.map(a => `<li>${a.type} du ${a.date_debut} au ${a.date_fin}</li>`).join('')}</ul>`}
            </div>
            <div>
                <h4 class="font-semibold">Configuration fiche de paie</h4>
                <p><span class="text-muted">Retenues :</span> ${config.retenues?.length ? config.retenues.map(r => `${r.nom} (${r.type === 'pourcentage' ? r.valeur + '%' : r.valeur + ' F'})`).join(', ') : 'Aucune'}</p>
                <p><span class="text-muted">Mentions :</span> ${config.mentions_libres?.join(', ') || 'Aucune'}</p>
            </div>
            <button onclick="rhFermerModale()" class="w-full bg-slate-200 hover:bg-slate-300 py-2 rounded-lg text-sm font-semibold">Fermer</button>
        </div>
    `;
    rhOuvrirModale(html);
}

function rhFichePaieEmploye(uuid) {
    window.open('/api/rh/employes/' + uuid + '/fiche-paie?token=' + encodeURIComponent(localStorage.getItem('sourougnon_token') || ''), '_blank');
}

async function rhModifierEmployeModal(uuid) {
    const emp = await apiFetch('/rh/employes/' + uuid);
    if (!emp) return;

    const html = `
        <div class="flex items-center justify-between mb-4">
            <h3 class="text-lg font-bold">Modifier l'employé</h3>
            <button onclick="rhFermerModale()" class="text-slate-400 hover:text-slate-600 font-bold">✕</button>
        </div>
        <form onsubmit="rhEnregistrerModificationEmploye(event, '${uuid}')" class="space-y-3">
            <div>
                <label class="block text-xs text-muted mb-1">Poste</label>
                <input type="text" id="rh-post" value="${emp.poste || ''}" placeholder="Poste" class="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm">
            </div>
            <div>
                <label class="block text-xs text-muted mb-1">Salaire de base (FCFA)</label>
                <input type="number" id="rh-salaire" value="${emp.salaire_base || 0}" class="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm">
            </div>
            <div>
                <label class="block text-xs text-muted mb-1">Mode de calcul</label>
                <select id="rh-mode" class="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm">
                    <option value="journalier" ${emp.mode_calcul === 'journalier' ? 'selected' : ''}>Journalier</option>
                    <option value="fixe" ${emp.mode_calcul === 'fixe' ? 'selected' : ''}>Fixe</option>
                </select>
            </div>
            <div>
                <label class="block text-xs text-muted mb-1">Date d'embauche</label>
                <input type="date" id="rh-date-embauche" value="${emp.date_embauche ? emp.date_embauche.slice(0,10) : ''}" class="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm">
            </div>
            <div class="flex gap-3 pt-2">
                <button type="button" onclick="rhFermerModale()" class="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl text-sm">Annuler</button>
                <button type="submit" class="flex-1 px-4 py-2.5 bg-accent text-white rounded-xl text-sm font-semibold">Enregistrer</button>
            </div>
        </form>
    `;
    rhOuvrirModale(html);
}

async function rhEnregistrerModificationEmploye(e, uuid) {
    e.preventDefault();
    const data = {
        poste: document.getElementById('rh-post').value,
        salaire_base: parseFloat(document.getElementById('rh-salaire').value),
        mode_calcul: document.getElementById('rh-mode').value,
        date_embauche: document.getElementById('rh-date-embauche').value,
    };
    const res = await apiFetch('/rh/employes/' + uuid, {method:'PUT', body: JSON.stringify(data)});
    if (res.success) {
        rhFermerModale();
        showAlert('Employé modifié.');
        rhChargerEmployes();
    } else {
        showAlert(res.error || 'Erreur');
    }
}

async function rhConfigurerFichePaieModal(empUuid) {
    const emp = await apiFetch('/rh/employes/' + empUuid);
    if (!emp) return;
    const config = emp.fiche_paie_config || { retenues: [], mentions_libres: [] };

    const html = `
        <div class="flex items-center justify-between mb-4">
            <h3 class="text-lg font-bold">Configurer la fiche de paie</h3>
            <button onclick="rhFermerModale()" class="text-slate-400 hover:text-slate-600 font-bold">✕</button>
        </div>
        <form onsubmit="rhEnregistrerConfigFiche(event, '${emp.user?.uuid}')" class="space-y-3">
            <div id="rh-retenues-container">
                ${config.retenues?.length ? config.retenues.map((r, i) => `
                    <div class="flex gap-2 items-center" data-index="${i}">
                        <input type="text" value="${r.nom}" placeholder="Nom" class="flex-1 px-2 py-1 border rounded text-sm">
                        <select class="w-32 px-2 py-1 border rounded text-sm">
                            <option value="pourcentage" ${r.type === 'pourcentage' ? 'selected' : ''}>%</option>
                            <option value="fixe" ${r.type === 'fixe' ? 'selected' : ''}>Fixe</option>
                        </select>
                        <input type="number" value="${r.valeur}" class="w-24 px-2 py-1 border rounded text-sm">
                        <button type="button" onclick="rhSupprimerRetenue(this)" class="text-red-600">✕</button>
                    </div>
                `).join('') : '<p class="text-muted">Aucune retenue</p>'}
            </div>
            <button type="button" onclick="rhAjouterRetenue()" class="text-sm text-accent">+ Ajouter une retenue</button>
            <input type="text" id="rh-mentions" value="${(config.mentions_libres || []).join('; ')}" placeholder="Mentions libres séparées par ;" class="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm">
            <div class="flex gap-3 pt-2">
                <button type="button" onclick="rhFermerModale()" class="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl text-sm">Annuler</button>
                <button type="submit" class="flex-1 px-4 py-2.5 bg-accent text-white rounded-xl text-sm font-semibold">Enregistrer</button>
            </div>
        </form>
    `;
    rhOuvrirModale(html);
}

async function rhEnregistrerConfigFiche(e, userUuid) {
    e.preventDefault();
    const retenues = [];
    document.querySelectorAll('#rh-retenues-container > div').forEach(div => {
        const inputs = div.querySelectorAll('input, select');
        const nom = inputs[0].value.trim();
        const type = inputs[1].value;
        const valeur = parseFloat(inputs[2].value);
        if (nom && !isNaN(valeur)) retenues.push({ nom, type, valeur });
    });
    const mentions = document.getElementById('rh-mentions').value.split(';').map(s => s.trim()).filter(Boolean);
    const res = await apiFetch(`/rh/employes/${userUuid}/fiche-paie-config`, {
        method:'PUT', body: JSON.stringify({ retenues, mentions_libres: mentions })
    });
    if (res.success) {
        rhFermerModale();
        showAlert('Configuration enregistrée.');
        rhChargerEmployes();
    } else {
        showAlert(res.error || 'Erreur');
    }
}

// Les fonctions de présences, salaires, etc. restent inchangées mais avec des prompts limités
async function rhChargerPresences() {
    const mois = prompt('Période (YYYY-MM) :', new Date().toISOString().slice(0,7));
    if (!mois) return;
    const res = await apiFetch('/rh/presences?mois=' + mois);
    const el = document.getElementById('rh-contenu');
    el.innerHTML = `<table class="min-w-full">
        <thead><tr><th>Agent</th><th>Jours travaillés</th></tr></thead>
        <tbody>${Array.isArray(res) ? res.map(p => `<tr><td>${p.user.nom} ${p.user.prenom}</td><td>${p.nb_jours_travailles}</td></tr>`).join('') : ''}</tbody>
    </table>`;
}

async function rhChargerSalaires() {
    const salaires = await apiFetch('/rh/salaires');
    const el = document.getElementById('rh-contenu');
    el.innerHTML = `
        <div class="flex justify-between mb-2"><h4>Salaires</h4><button onclick="rhCalculerSalaires()" class="bg-blue-600 text-white px-3 py-1 rounded text-sm">Calculer pour un mois</button></div>
        <table class="min-w-full">
            <thead><tr><th>Période</th><th>Employé</th><th>Brut</th><th>Net</th><th>Statut</th><th>Actions</th></tr></thead>
            <tbody>${salaires.map(s => `
                <tr>
                    <td>${s.periode}</td>
                    <td>${s.employe?.user?.nom || '--'}</td>
                    <td>${s.salaire_brut} F</td>
                    <td>${s.salaire_net} F</td>
                    <td>${s.statut}</td>
                    <td>
                        ${s.statut === 'pending' ? `<button class="small-btn small-btn--primary" onclick="rhPayerSalaire('${s.uuid}')">Payer</button>` : ''}
                        <button class="small-btn small-btn--secondary" onclick="rhModifierRetenues('${s.uuid}')">Retenues</button>
                        <button class="small-btn small-btn--secondary" onclick="rhFichePaie('${s.uuid}')">Fiche</button>
                    </td>
                </tr>
            `).join('')}</tbody>
        </table>
    `;
}

async function rhCalculerSalaires() {
    const mois = prompt('Période (YYYY-MM) :', new Date().toISOString().slice(0,7));
    if (!mois) return;
    const res = await apiFetch('/rh/salaires/calculer', {method:'POST', body:JSON.stringify({periode:mois})});
    showAlert(res.message || 'Calcul terminé');
    rhChargerSalaires();
}

async function rhPayerSalaire(uuid) {
    if (!(await showConfirm('Payer ce salaire ?'))) return;
    const res = await apiFetch(`/rh/salaires/${uuid}/payer`, {method:'POST'});
    showAlert(res.success ? 'Salaire payé.' : (res.error || 'Erreur'));
    rhChargerSalaires();
}

async function rhModifierRetenues(uuid) {
    showPrompt('Retenues JSON (ex: [{"nom":"CNPS","type":"pourcentage","valeur":5}]):', '').then(async (jsonStr) => {
        if (!jsonStr) return;
        try {
            const retenues = JSON.parse(jsonStr);
            const res = await apiFetch(`/rh/salaires/${uuid}/retenues`, {method:'PUT', body:JSON.stringify({retenues})});
            showAlert('Retenues mises à jour.');
            rhChargerSalaires();
        } catch(e) {
            showAlert('JSON invalide');
        }
    });
}

function rhFichePaie(uuid) {
    window.open('/api/rh/fiches-paie/' + uuid + '?token=' + encodeURIComponent(localStorage.getItem('sourougnon_token') || ''), '_blank');
}

function rhNouvelEmploye() {
    showPrompt('UUID du user existant :', '').then(userId => {
        if (!userId) return;
        showPrompt('Poste :', '').then(poste => {
            showPrompt('Salaire base (FCFA) :', '').then(salaire => {
                showPrompt('Mode calcul (fixe ou journalier) :', 'journalier').then(mode => {
                    apiFetch('/rh/employes', {method:'POST', body:JSON.stringify({user_id:userId, poste:poste, salaire_base:parseFloat(salaire), mode_calcul:mode})})
                        .then(res => { if(res.success) { showAlert('Employé ajouté.'); rhChargerEmployes(); } else showAlert(res.error || 'Erreur'); });
                });
            });
        });
    });
}
