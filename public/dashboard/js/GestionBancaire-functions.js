function loadGestionBancaire(c) {
    c.innerHTML = `
        <div class="fade-in space-y-6">
            <h3 class="text-xl font-bold">Gestion bancaire</h3>
            <div class="flex flex-wrap gap-2">
                <button onclick="bancaireNouvelleOperation('depot')" class="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-semibold">+ Dépôt</button>
                <button onclick="bancaireNouvelleOperation('retrait')" class="bg-amber-600 text-white px-4 py-2 rounded-lg text-sm font-semibold">- Retrait</button>
                <button onclick="bancaireNouvelleOperation('transfert')" class="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold">⇄ Transfert</button>
            </div>
            <div id="bancaire-comptes" class="grid grid-cols-1 md:grid-cols-3 gap-3"></div>
            <div id="bancaire-historique" class="panel p-4"></div>
        </div>
    `;
    bancaireChargerComptes();
    bancaireChargerHistorique();
}

async function bancaireChargerComptes() {
    const comptes = await apiFetch('/bancaire/comptes');
    const el = document.getElementById('bancaire-comptes');
    if (!Array.isArray(comptes)) return;
    el.innerHTML = comptes.map(cpt => `
        <div class="panel p-3">
            <h4>${cpt.nom}</h4>
            <p class="text-sm text-muted">Solde : <span id="solde-${cpt.uuid}">...</span></p>
        </div>
    `).join('');
    for (const cpt of comptes) {
        try {
            const res = await apiFetch(`/bancaire/comptes/${cpt.uuid}/solde`);
            document.getElementById(`solde-${cpt.uuid}`).textContent = new Intl.NumberFormat('fr-FR',{style:'currency',currency:'XOF'}).format(res.solde);
        } catch(e) {}
    }
}

async function bancaireChargerHistorique() {
    try {
        const ops = await apiFetch('/bancaire/historique');
        const el = document.getElementById('bancaire-historique');
        if (!Array.isArray(ops) || ops.length === 0) {
            el.innerHTML = '<p class="text-muted">Aucune opération</p>';
            return;
        }
        el.innerHTML = `<table class="min-w-full">
            <thead><tr><th>Date</th><th>Type</th><th>Compte débit</th><th>Compte crédit</th><th>Montant</th><th>Source</th><th>Auteur</th></tr></thead>
            <tbody>${ops.map(op => `
                <tr>
                    <td>${new Date(op.date_operation).toLocaleString('fr-FR')}</td>
                    <td>${op.type}</td>
                    <td>${op.compte_debit?.nom || '-'}</td>
                    <td>${op.compte_credit?.nom || '-'}</td>
                    <td>${new Intl.NumberFormat('fr-FR',{style:'currency',currency:'XOF'}).format(op.montant)}</td>
                    <td>${op.source}</td>
                    <td>${op.user ? op.user.nom + ' ' + op.user.prenom : '--'}</td>
                </tr>
            `).join('')}</tbody>
        </table>`;
    } catch(e) {
        document.getElementById('bancaire-historique').innerHTML = '<p class="text-red-600">Erreur</p>';
    }
}

async function bancaireNouvelleOperation(type) {
    const montant = await showPrompt('Montant (FCFA) :', '');
    if (!montant) return;
    const montantNum = parseFloat(montant);
    if (isNaN(montantNum) || montantNum <= 0) { showAlert('Montant invalide'); return; }

    const motif = await showPrompt('Motif / description :', '');
    const beneficiaire = await showPrompt('Bénéficiaire / personne concernée :', '');

    if (type === 'transfert') {
        apiFetch('/bancaire/comptes').then(async comptes => {
            if (!comptes.length) { showAlert('Aucun compte'); return; }
            const options = comptes.map(c => c.uuid + ' : ' + c.nom).join('\n');
            const srcUuid = await showPrompt('Compte source (UUID) :\n' + options, '');
            if (!srcUuid) return;
            const destUuid = await showPrompt('Compte destinataire (UUID) :\n' + options, '');
            if (!destUuid) return;
            apiFetch('/bancaire/transfert', {
                method:'POST', body: JSON.stringify({
                    compte_source_uuid: srcUuid,
                    compte_destinataire_uuid: destUuid,
                    montant: montantNum,
                    motif: motif,
                    beneficiaire: beneficiaire
                })
            }).then(res => { if(res.success) { showAlert('Transfert effectué.'); bancaireChargerComptes(); bancaireChargerHistorique(); } else showAlert(res.error || 'Erreur'); });
        });
    } else {
        const isDepot = type === 'depot';
        const endpoint = isDepot ? '/bancaire/depot' : '/bancaire/retrait';
        const compteField = isDepot ? 'compte_destinataire_uuid' : 'compte_source_uuid';

        apiFetch('/bancaire/comptes').then(async comptes => {
            if (!comptes.length) { showAlert('Aucun compte'); return; }
            const options = comptes.map(c => c.uuid + ' : ' + c.nom).join('\n');
            const uuid = await showPrompt('Choisir un compte (UUID exact) :\n' + options, '');
            if (!uuid) return;
            const source = await showConfirm('Depuis la caisse ?') ? 'caisse' : 'externe';
            const body = { [compteField]: uuid, montant: montantNum, motif: motif, beneficiaire: beneficiaire, source: source };
            apiFetch(endpoint, {method:'POST', body: JSON.stringify(body)})
                .then(res => { if(res.success) { showAlert('Opération enregistrée.'); bancaireChargerComptes(); bancaireChargerHistorique(); } else showAlert(res.error || 'Erreur'); });
        });
    }
}

