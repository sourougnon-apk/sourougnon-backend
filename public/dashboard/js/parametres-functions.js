function loadParametres(c){
    c.innerHTML='<div class="fade-in space-y-6"><h3 class="text-xl font-bold">Paramétrage</h3>'+
        '<div class="panel"><div class="flex items-center justify-between mb-4"><h3>Agences</h3><button onclick="showAddAgenceForm()" class="bg-accent text-white px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-blue-700">+ Nouvelle Agence</button></div><div class="table-wrapper"><table><thead><tr><th>Nom</th><th>Adresse</th><th>Téléphone</th><th>Chef d\'agence</th><th>Statut</th><th>Actions</th></tr></thead><tbody id="agences-tbody"><tr><td colspan="6" class="text-center text-muted py-4">Chargement...</td></tr></tbody></table></div></div>'+
        '<div class="panel"><div class="flex items-center justify-between mb-4"><h3>Utilisateurs</h3><button onclick="showAddUserForm()" class="bg-accent text-white px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-blue-700">+ Ajouter</button></div><div class="table-wrapper"><table><thead><tr><th>Nom</th><th>Email</th><th>Rôle</th><th>Agence</th><th>Actions</th></tr></thead><tbody id="users-tbody"><tr><td colspan="5" class="text-center text-muted py-4">Chargement...</td></tr></tbody></table></div></div>'+
        '<div class="panel max-w-md"><h3>Mon compte</h3><form onsubmit="changeOwnPassword(event)" class="space-y-3 mt-4"><input type="password" id="own-password" placeholder="Nouveau mot de passe" required class="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm"><input type="password" id="own-password-confirm" placeholder="Confirmer le mot de passe" required class="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm"><div id="param-msg"></div><button type="submit" class="w-full bg-accent text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-700">Modifier le mot de passe</button></form></div></div>';
    loadParametresData();
}

function loadParametresData(){
    apiFetch('/parametres').then(function(d){
        var agences = d.agences || [];
        var users = d.utilisateurs || [];

        // 1. Tableau des agences
        var t=document.getElementById('agences-tbody');
        if(t) {
            t.innerHTML=agences.length>0?agences.map(function(a){
                var chef = users.find(function(u){ return u.role==='chef_agence' && u.agence_id===a.id; });
                var chefNom = chef ? chef.nom+' '+(chef.prenom||'') : 'Non assigné';
                return '<tr>'+
                    '<td class="font-medium">'+a.nom+'</td>'+
                    '<td>'+(a.adresse||'--')+'</td>'+
                    '<td>'+(a.telephone||'--')+'</td>'+
                    '<td>'+chefNom+'</td>'+
                    '<td><span class="badge '+(a.actif?'badge-success':'badge-danger')+'">'+(a.actif?'Active':'Inactive')+'</span></td>'+
                    '<td><button onclick="modifierAgence('+a.id+',\''+a.nom+'\',\''+(a.adresse||'')+'\',\''+(a.telephone||'')+'\')" class="text-amber-600 text-xs font-semibold">Modifier</button></td>'+
                '</tr>';
            }).join(''):'<tr><td colspan="6" class="text-center text-muted py-4">Aucune agence</td></tr>';
        }

        // 2. Tableau des utilisateurs
        var u=document.getElementById('users-tbody');
        if(u) {
            u.innerHTML=users.map(function(x){
                var ag = agences.find(function(a){ return a.id === x.agence_id; });
                var agNom = ag ? ag.nom : '--';
                return '<tr>'+
                    '<td class="font-medium text-xs">'+x.nom+' '+(x.prenom||'')+'</td>'+
                    '<td class="text-xs">'+x.email+'</td>'+
                    '<td><span class="badge '+(x.role==='gerante'?'badge-info':(x.role==='chef_agence'?'badge-warning':'badge-success'))+'">'+x.role+'</span></td>'+
                    '<td class="text-xs">'+agNom+'</td>'+
                    '<td>'+
                        (x.role!=='gerante' ? '<button onclick="assignerAgence(\''+x.uuid+'\',\''+(x.nom||'')+'\')" class="text-blue-600 text-xs">Assigner</button>' : '--')+
                    '</td>'+
                '</tr>';
            }).join('');
        }
    });
}

function showAddAgenceForm() {
    apiFetch('/agents').then(function(users){
        var chefs = users.filter(function(u){ return u.role === 'chef_agence'; });
        var options = '<option value="">-- Aucun chef --</option>' + chefs.map(function(c){ return '<option value="'+c.uuid+'">'+c.nom+' '+(c.prenom||'')+'</option>'; }).join('');
        
        var html = '<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50" id="modal-agence"><div class="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl fade-in"><h3 class="text-lg font-bold mb-4">Nouvelle Agence</h3><form onsubmit="submitNewAgence(event)" class="space-y-3"><input type="text" id="ag-nom" placeholder="Nom de l\'agence *" required class="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm"><input type="text" id="ag-adresse" placeholder="Adresse" class="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm"><input type="text" id="ag-tel" placeholder="Téléphone" class="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm"><label class="block text-sm font-medium text-slate-700 mb-1">Chef d\'agence (optionnel)</label><select id="ag-chef" class="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm">'+options+'</select><div class="flex gap-3 pt-2"><button type="button" onclick="document.getElementById(\'modal-agence\').remove()" class="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl text-sm">Annuler</button><button type="submit" class="flex-1 px-4 py-2.5 bg-accent text-white rounded-xl text-sm font-semibold">Créer</button></div></form></div></div>';
        document.body.insertAdjacentHTML('beforeend', html);
    });
}

function submitNewAgence(e) {
    e.preventDefault();
    var data = {
        nom: document.getElementById('ag-nom').value,
        adresse: document.getElementById('ag-adresse').value,
        telephone: document.getElementById('ag-tel').value,
        chef_uuid: document.getElementById('ag-chef').value
    };
    apiFetch('/parametres/agences', {method:'POST', body:JSON.stringify(data)}).then(function(r){
        document.getElementById('modal-agence').remove();
        showAlert('Agence créée avec succès.');
        loadParametres();
    }).catch(function(e){ showAlert('Erreur : ' + e.message); });
}

function modifierAgence(id, nom, adresse, tel) {
    var html = '<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50" id="modal-agence-mod"><div class="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl fade-in"><h3 class="text-lg font-bold mb-4">Modifier l\'Agence</h3><form onsubmit="submitUpdateAgence(event, '+id+')" class="space-y-3"><input type="text" id="ag-nom" value="'+nom+'" required class="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm"><input type="text" id="ag-adresse" value="'+adresse+'" class="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm"><input type="text" id="ag-tel" value="'+tel+'" class="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm"><div class="flex gap-3 pt-2"><button type="button" onclick="document.getElementById(\'modal-agence-mod\').remove()" class="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl text-sm">Annuler</button><button type="submit" class="flex-1 px-4 py-2.5 bg-accent text-white rounded-xl text-sm font-semibold">Enregistrer</button></div></form></div></div>';
    document.body.insertAdjacentHTML('beforeend', html);
}

function submitUpdateAgence(e, id) {
    e.preventDefault();
    var data = {
        nom: document.getElementById('ag-nom').value,
        adresse: document.getElementById('ag-adresse').value,
        telephone: document.getElementById('ag-tel').value,
    };
    apiFetch('/parametres/agences/' + id, {method:'PUT', body:JSON.stringify(data)}).then(function(r){
        document.getElementById('modal-agence-mod').remove();
        showAlert('Agence mise à jour.');
        loadParametres();
    });
}
