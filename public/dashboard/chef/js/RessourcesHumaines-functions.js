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
                    <td><button class="small-btn small-btn--primary" onclick="rhModifierEmploye('${emp.uuid}')">Modifier</button></td>
                </tr>
            `).join('')}</tbody>
        </table>
    `;
}

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
    window.open('/api/rh/fiches-paie/' + uuid, '_blank');
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

async function rhModifierEmploye(uuid) {
    showPrompt('Nouveau salaire base :', '').then(salaire => {
        if (salaire) apiFetch('/rh/employes/' + uuid, {method:'PUT', body:JSON.stringify({salaire_base:parseFloat(salaire)})})
            .then(res => { showAlert('Modifié.'); rhChargerEmployes(); });
    });
}
