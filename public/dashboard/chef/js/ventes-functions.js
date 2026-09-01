function loadVentes(c){apiFetch('/ventes').then(function(v){function f(x){return new Intl.NumberFormat('fr-FR',{style:'currency',currency:'XOF',maximumFractionDigits:0}).format(x);}c.innerHTML='<div class="fade-in space-y-6"><div class="flex items-center justify-between"><h3 class="text-xl font-bold">Ventes</h3></div><div class="panel"><div class="table-wrapper"><table><thead><tr><th>N</th><th>Debiteur</th><th>Type</th><th>Montant</th><th>Journalier</th><th>Restant</th><th>Statut</th><th>Penalite</th><th>Actions</th></tr></thead><tbody>'+(v.length>0?v.map(function(x){return '<tr><td class="font-mono text-xs">'+x.uuid.substring(0,8)+'</td><td class="font-medium">'+(x.debiteur?x.debiteur.nom+' '+(x.debiteur.prenom||''):'--')+'</td><td><span class="badge '+(x.type_vente==="comptant"?"badge-info":"badge-warning")+'">'+(x.type_vente==="comptant"?"Comptant":"Credit")+'</span></td><td class="font-semibold">'+f(x.montant_total)+'</td><td>'+f(x.montant_journalier)+'</td><td>'+f(x.montant_total-(x.total_paye||0))+'</td><td><span class="badge '+(x.statut==="en_cours"?"badge-success":x.statut==="termine"?"badge-info":"badge-danger")+'">'+x.statut+'</span></td><td>'+(x.statut==="en_cours"?'<button onclick="annulerVente(\''+x.uuid+'\')" class="text-red-600 text-xs">Annuler</button>':'--')+'</td></tr>';}).join(''):'<tr><td colspan="9" class="text-center text-muted py-4">Aucune vente</td></tr>')+'</tbody></table></div></div></div>';});}
async function annulerVente(u){if(!(await showConfirm('Annuler cette vente ?')))return;apiFetch('/ventes/'+u+'/annuler',{method:'PUT'}).then(function(){loadPage('ventes');});}

function openPenaliteModal(uuid, debiteur, montant) {
    document.getElementById('pen-vente-id').value = uuid;
    document.getElementById('pen-debiteur').textContent = debiteur;
    document.getElementById('pen-montant').textContent = new Intl.NumberFormat('fr-FR').format(montant || 1000);
    document.getElementById('pen-nouveau-montant').value = montant || 1000;
    document.getElementById('pen-motif').value = '';
    document.getElementById('penalite-modal').classList.remove('hidden');
}
function closePenaliteModal() {
    document.getElementById('penalite-modal').classList.add('hidden');
}
function submitPenalite(e) {
    e.preventDefault();
    var data = {
        penalite_par_jour: parseFloat(document.getElementById('pen-nouveau-montant').value) || 0,
        penalite_active: (parseFloat(document.getElementById('pen-nouveau-montant').value) > 0),
        motif_penalite: document.getElementById('pen-motif').value
    };
    var uuid = document.getElementById('pen-vente-id').value;
    apiFetch('/ventes/' + uuid, {method:'PUT', body:JSON.stringify(data)}).then(function(r) {
        if (r.success) {
            closePenaliteModal();
            showAlert('Pénalité mise à jour avec succès.');
            loadPage('ventes');
        }
    });
}
