function loadComptabilite(c) {
    c.innerHTML = `
        <div class="fade-in space-y-6">
            <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h3 class="text-xl font-bold text-slate-800">Comptabilité</h3>
                    <p class="text-sm text-muted mt-1">Journaux, Grand Livre et États Financiers.</p>
                </div>
                <div class="flex gap-2">
                    <button onclick="apiDownload('/comptabilite/export', 'journal.csv')" class="bg-slate-100 text-slate-700 px-4 py-2 rounded-lg text-sm font-semibold hover:bg-slate-200">Export Journal</button>
                    <button onclick="apiDownload('/comptabilite/export-etats-financiers', 'etats.csv')" class="bg-slate-100 text-slate-700 px-4 py-2 rounded-lg text-sm font-semibold hover:bg-slate-200">Export États</button>
                </div>
            </div>

            <!-- Tabs -->
            <div class="flex gap-2 border-b border-slate-200 overflow-x-auto">
                <button onclick="switchComptaTab('journal')" class="compta-tab px-4 py-2 text-sm font-semibold border-b-2 border-blue-600 text-blue-600" data-tab="journal">Journal</button>
                <button onclick="switchComptaTab('grand-livre')" class="compta-tab px-4 py-2 text-sm font-semibold border-b-2 border-transparent text-slate-500 hover:text-slate-800" data-tab="grand-livre">Grand Livre</button>
                <button onclick="switchComptaTab('balance')" class="compta-tab px-4 py-2 text-sm font-semibold border-b-2 border-transparent text-slate-500 hover:text-slate-800" data-tab="balance">Balance</button>
                <button onclick="switchComptaTab('etats')" class="compta-tab px-4 py-2 text-sm font-semibold border-b-2 border-transparent text-slate-500 hover:text-slate-800" data-tab="etats">États Financiers</button>
            </div>

            <div id="compta-content">
                <div class="text-center py-12 text-muted">Chargement des données...</div>
            </div>
        </div>
    `;
    chargerComptaTab('journal');
}

function switchComptaTab(tab) {
    document.querySelectorAll('.compta-tab').forEach(t => {
        t.classList.remove('border-blue-600', 'text-blue-600');
        t.classList.add('border-transparent', 'text-slate-500');
    });
    var btn = document.querySelector(`.compta-tab[data-tab="${tab}"]`);
    if (btn) {
        btn.classList.remove('border-transparent', 'text-slate-500');
        btn.classList.add('border-blue-600', 'text-blue-600');
    }
    chargerComptaTab(tab);
}

function chargerComptaTab(tab) {
    var el = document.getElementById('compta-content');
    el.innerHTML = '<div class="text-center py-8 text-muted">Chargement...</div>';
    
    var f = v => new Intl.NumberFormat('fr-FR', {style:'currency', currency:'XOF', maximumFractionDigits:0}).format(v || 0);

    if (tab === 'journal') {
        apiFetch('/comptabilite/journal').then(data => {
            var rows = data.data ? data.data : data; // Gérer la pagination ou non
            if (!Array.isArray(rows) || rows.length === 0) {
                el.innerHTML = '<div class="panel text-center py-8 text-muted">Aucune écriture enregistrée.</div>';
                return;
            }
            el.innerHTML = `
                <div class="panel">
                    <div class="table-wrapper">
                        <table>
                            <thead><tr><th>Date</th><th>N°</th><th>Débit</th><th>Crédit</th><th>Libellé</th><th class="text-right">Montant</th></tr></thead>
                            <tbody>${rows.map(r => `
                                <tr>
                                    <td class="text-xs">${new Date(r.date_ecriture).toLocaleDateString('fr-FR')}</td>
                                    <td class="text-xs font-mono">${r.numero_ecriture}</td>
                                    <td class="text-xs font-semibold">${r.compte_debit}</td>
                                    <td class="text-xs font-semibold">${r.compte_credit}</td>
                                    <td class="text-sm">${r.libelle}</td>
                                    <td class="text-right font-bold text-slate-800">${f(r.montant)}</td>
                                </tr>
                            `).join('')}</tbody>
                        </table>
                    </div>
                </div>
            `;
        }).catch(() => el.innerHTML = '<div class="panel text-center py-8 text-red-500">Erreur de chargement.</div>');
    } 
    else if (tab === 'grand-livre') {
        apiFetch('/comptabilite/grand-livre').then(data => {
            if (!Array.isArray(data) || data.length === 0) {
                el.innerHTML = '<div class="panel text-center py-8 text-muted">Aucune écriture.</div>';
                return;
            }
            el.innerHTML = `
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    ${data.map(c => `
                        <div class="panel border-t-4 ${c.solde >= 0 ? 'border-t-blue-500' : 'border-t-red-500'}">
                            <div class="flex justify-between items-center border-b pb-2 mb-3">
                                <h4 class="font-bold text-slate-800">${c.compte} - ${c.libelle}</h4>
                                <span class="text-lg font-bold ${c.solde >= 0 ? 'text-blue-600' : 'text-red-600'}">${f(c.solde)}</span>
                            </div>
                            <div class="text-xs text-muted flex justify-between">
                                <span>Débit : ${f(c.debit)}</span>
                                <span>Crédit : ${f(c.credit)}</span>
                            </div>
                        </div>
                    `).join('')}
                </div>
            `;
        });
    }
    else if (tab === 'balance') {
        apiFetch('/comptabilite/balance').then(data => {
            var totalD = 0, totalC = 0;
            data.forEach(d => { totalD += d.debit; totalC += d.credit; });
            el.innerHTML = `
                <div class="panel">
                    <div class="table-wrapper">
                        <table>
                            <thead><tr><th>Compte</th><th>Libellé</th><th class="text-right">Débit</th><th class="text-right">Crédit</th><th class="text-right">Solde</th></tr></thead>
                            <tbody>
                                ${data.map(b => `
                                    <tr>
                                        <td class="font-mono text-xs font-bold">${b.compte}</td>
                                        <td class="text-sm">${b.libelle}</td>
                                        <td class="text-right">${f(b.debit)}</td>
                                        <td class="text-right">${f(b.credit)}</td>
                                        <td class="text-right font-bold ${b.solde >= 0 ? 'text-slate-800' : 'text-red-600'}">${f(b.solde)}</td>
                                    </tr>
                                `).join('')}
                                <tr class="bg-slate-50 font-bold border-t-2 border-slate-200">
                                    <td colspan="2">TOTAUX</td>
                                    <td class="text-right">${f(totalD)}</td>
                                    <td class="text-right">${f(totalC)}</td>
                                    <td class="text-right">${f(totalD - totalC)}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            `;
        });
    }
    else if (tab === 'etats') {
        apiFetch('/comptabilite/etats-financiers').then(data => {
            // On suppose que data renvoie un objet avec des sections. Si c'est différent, on adapte.
            el.innerHTML = `
                <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div class="panel border-t-4 border-t-green-500">
                        <h4 class="text-lg font-bold text-green-700 mb-4">Produits (Recettes)</h4>
                        ${(data.produits || []).map(p => `<div class="flex justify-between py-1 border-b border-slate-100 text-sm"><span>${p.libelle}</span> <span class="font-semibold">${f(p.montant)}</span></div>`).join('') || '<p class="text-muted text-sm">Aucune donnée</p>'}
                        <div class="flex justify-between mt-4 pt-2 border-t-2 border-slate-200 font-bold text-green-700">
                            <span>Total Produits</span> <span>${f(data.total_produits || 0)}</span>
                        </div>
                    </div>
                    <div class="panel border-t-4 border-t-red-500">
                        <h4 class="text-lg font-bold text-red-700 mb-4">Charges (Dépenses)</h4>
                        ${(data.charges || []).map(p => `<div class="flex justify-between py-1 border-b border-slate-100 text-sm"><span>${p.libelle}</span> <span class="font-semibold">${f(p.montant)}</span></div>`).join('') || '<p class="text-muted text-sm">Aucune donnée</p>'}
                        <div class="flex justify-between mt-4 pt-2 border-t-2 border-slate-200 font-bold text-red-700">
                            <span>Total Charges</span> <span>${f(data.total_charges || 0)}</span>
                        </div>
                    </div>
                </div>
                <div class="panel mt-4 bg-slate-800 text-white text-center py-6">
                    <div class="text-sm uppercase tracking-wider opacity-80">Résultat Net de la période</div>
                    <div class="text-4xl font-extrabold mt-2">${f((data.total_produits || 0) - (data.total_charges || 0))}</div>
                </div>
            `;
        }).catch(() => {
            el.innerHTML = '<div class="panel text-center py-8 text-muted">Les états financiers nécessitent une configuration comptable plus poussée ou ne renvoient pas les données attendues.</div>';
        });
    }
}
