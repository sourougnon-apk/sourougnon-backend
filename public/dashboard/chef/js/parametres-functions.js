var allPages = [
    {id:'dashboard', label:'Dashboard'},
    {id:'agent-space', label:'Mon Espace'},
    {id:'chef-agence', label:'Chef agence'},
    {id:'agents', label:'Agents'},
    {id:'debiteurs', label:'Debiteurs'},
    {id:'suivi', label:'Suivi'},
    {id:'caisse', label:'Caisse'},
    {id:'stocks', label:'Stocks'},
    {id:'produits', label:'Produits'},
    {id:'ventes', label:'Ventes'},
    {id:'comptant', label:'Ventes Comptant'},
    {id:'alertes', label:'Alertes'},
    {id:'parametres', label:'Parametres'},
    {id:'comptabilite', label:'Comptabilite'},
    {id:'statistiques', label:'Statistiques'},
    {id:'notifications', label:'Notifications'},
    {id:'rapports', label:'Rapports'}
];

function loadParametres(c){
    c.innerHTML='<div class="fade-in space-y-6"><h3 class="text-xl font-bold">Parametrage</h3>'+
        '<div class="panel"><div class="flex items-center justify-between mb-4"><h3>Agences</h3><button onclick="showAddAgenceForm()" class="bg-accent text-white px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-blue-700">+ Ajouter</button></div><div class="table-wrapper"><table><thead><tr><th>Nom</th><th>Adresse</th><th>Telephone</th><th>Statut</th></tr></thead><tbody id="agences-tbody"><tr><td colspan="4" class="text-center text-muted py-4">Chargement...</td></tr></tbody></table></div></div>'+
        '<div class="panel"><div class="flex items-center justify-between mb-4"><h3>Utilisateurs</h3><button onclick="showAddUserForm()" class="bg-accent text-white px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-blue-700">+ Ajouter</button></div><div class="table-wrapper"><table><thead><tr><th>Nom</th><th>Email</th><th>Role</th><th>Actions</th></tr></thead><tbody id="users-tbody"><tr><td colspan="4" class="text-center text-muted py-4">Chargement...</td></tr></tbody></table></div></div>'+
        '<div class="panel"><div class="flex items-center justify-between mb-4"><h3>Magasins</h3><button onclick="showAddMagasinForm()" class="bg-accent text-white px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-blue-700">+ Ajouter</button></div><div class="table-wrapper"><table><thead><tr><th>Nom</th><th>Adresse</th><th>Responsable</th><th>Statut</th></tr></thead><tbody id="magasins-tbody"><tr><td colspan="4" class="text-center text-muted py-4">Chargement...</td></tr></tbody></table></div></div>'+
        '<div class="panel max-w-md"><h3>Mon compte</h3><form onsubmit="changeOwnPassword(event)" class="space-y-3 mt-4"><input type="password" id="own-password" placeholder="Nouveau mot de passe" required class="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm"><input type="password" id="own-password-confirm" placeholder="Confirmer le mot de passe" required class="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm"><div id="param-msg"></div><button type="submit" class="w-full bg-accent text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-700">Modifier le mot de passe</button></form></div></div>';
    loadParametresData();
}

function loadParametresData(){
    apiFetch('/parametres').then(function(d){
        var t=document.getElementById('agences-tbody');
        if(t&&d.agences)t.innerHTML=d.agences.length>0?d.agences.map(function(a){return '<tr><td class="font-medium">'+a.nom+'</td><td>'+(a.adresse||'--')+'</td><td>'+(a.telephone||'--')+'</td><td><span class="badge '+(a.actif?'badge-success':'badge-danger')+'">'+(a.actif?'Actif':'Inactif')+'</span></td></tr>';}).join(''):'<tr><td colspan="4" class="text-center text-muted py-4">Aucune agence</td></tr>';
        
        var u=document.getElementById('users-tbody');
        if(u&&d.utilisateurs)u.innerHTML=d.utilisateurs.map(function(x){
            var actions = '<div class="flex gap-1">';
            actions += '<button onclick="openPermissionsModal(\''+x.uuid+'\',\''+(x.nom||'')+'\','+JSON.stringify(x.permissions||{})+')" class="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs hover:bg-blue-200">Permissions</button>';
            actions += '<button onclick="openPasswordModal(\''+x.uuid+'\',\''+(x.nom||'')+'\')" class="px-2 py-1 bg-amber-100 text-amber-700 rounded text-xs hover:bg-amber-200">MDP</button>';
            if(x.role!=='gerante') actions += '<button onclick="openSuspendreModal(\''+x.uuid+'\',\''+(x.nom||'')+'\','+x.actif+')" class="px-2 py-1 rounded text-xs font-medium '+(x.actif?'bg-red-100 text-red-700 hover:bg-red-200':'bg-green-100 text-green-700 hover:bg-green-200')+'">'+(x.actif?'Suspendre':'Reactivation')+'</button>';
            actions += '</div>';
            
            return '<tr>'+
                '<td class="font-medium text-xs">'+x.nom+' '+(x.prenom||'')+'</td>'+
                '<td class="text-xs">'+x.email+'</td>'+
                '<td><select onchange="updateUser(\''+x.uuid+'\',\'role\',this.value)" class="px-1 py-0.5 border rounded text-xs"><option value="gerante" '+(x.role==='gerante'?'selected':'')+'>Gerante</option><option value="chef_agence" '+(x.role==='chef_agence'?'selected':'')+'>Chef agence</option><option value="agent" '+(x.role==='agent'?'selected':'')+'>Agent</option></select></td>'+
                '<td>'+actions+'</td>'+
                '</tr>';
        }).join('');
        
        var m=document.getElementById('magasins-tbody');
        if(m&&d.magasins)m.innerHTML=d.magasins.length>0?d.magasins.map(function(x){return '<tr><td class="font-medium">'+x.nom+'</td><td>'+(x.adresse||'--')+'</td><td>'+(x.responsable||'--')+'</td><td><span class="badge '+(x.actif?'badge-success':'badge-danger')+'">'+(x.actif?'Actif':'Inactif')+'</span></td></tr>';}).join(''):'<tr><td colspan="4" class="text-center text-muted py-4">Aucun magasin</td></tr>';
    });
}

// === MODAL PERMISSIONS ===
function openPermissionsModal(uuid, nom, permissions) {
    var perms = permissions || {};
    var html = '<div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" id="perm-modal-overlay" onclick="if(event.target===this)closePermissionsModal()">';
    html += '<div class="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl fade-in max-h-96 overflow-y-auto">';
    html += '<h3 class="text-lg font-bold mb-4">Permissions de ' + nom + '</h3>';
    html += '<div class="grid grid-cols-2 gap-2">';
    allPages.forEach(function(p) {
        var checked = perms[p.id] !== undefined ? perms[p.id] : true;
        html += '<label class="flex items-center gap-2 p-2 bg-slate-50 rounded-lg cursor-pointer hover:bg-slate-100 text-sm"><input type="checkbox" '+(checked?'checked':'')+' onchange="togglePermission(\''+uuid+'\',\''+p.id+'\',this.checked)" class="w-4 h-4 text-accent">'+p.label+'</label>';
    });
    html += '</div>';
    html += '<div class="flex gap-3 pt-4"><button onclick="closePermissionsModal()" class="flex-1 px-4 py-2.5 bg-accent text-white rounded-xl text-sm font-semibold">Fermer</button></div>';
    html += '</div></div>';
    
    var existing = document.getElementById('perm-modal-overlay');
    if(existing) existing.remove();
    document.body.insertAdjacentHTML('beforeend', html);
}

function closePermissionsModal() {
    var el = document.getElementById('perm-modal-overlay');
    if(el) el.remove();
}

function togglePermission(uuid, page, acces) {
    apiFetch('/parametres/permissions', {method:'POST', body:JSON.stringify({user_uuid:uuid, page:page, acces:acces})});
}

// === MODAL MOT DE PASSE ===
function openPasswordModal(uuid, nom) {
    var html = '<div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" id="pwd-modal-overlay" onclick="if(event.target===this)closePasswordModal()">';
    html += '<div class="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl fade-in">';
    html += '<h3 class="text-lg font-bold mb-2">Modifier le mot de passe</h3>';
    html += '<p class="text-sm text-muted mb-4">Utilisateur : <strong>' + nom + '</strong></p>';
    html += '<input type="password" id="modal-new-pwd" placeholder="Nouveau mot de passe" class="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm mb-3">';
    html += '<div class="flex gap-3"><button onclick="closePasswordModal()" class="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl text-sm">Annuler</button>';
    html += '<button onclick="submitPasswordChange(\''+uuid+'\')" class="flex-1 px-4 py-2.5 bg-accent text-white rounded-xl text-sm font-semibold">Enregistrer</button></div>';
    html += '</div></div>';
    
    var existing = document.getElementById('pwd-modal-overlay');
    if(existing) existing.remove();
    document.body.insertAdjacentHTML('beforeend', html);
}

function closePasswordModal() {
    var el = document.getElementById('pwd-modal-overlay');
    if(el) el.remove();
}

function submitPasswordChange(uuid) {
    var pwd = document.getElementById('modal-new-pwd').value;
    if(!pwd) { showAlert('Veuillez saisir un mot de passe.'); return; }
    apiFetch('/agents/'+uuid, {method:'PUT', body:JSON.stringify({password:pwd})}).then(function(r){
        if(r.success) { closePasswordModal(); showAlert('Mot de passe modifie'); }
    });
}

// === MODAL SUSPENDRE ===
function openSuspendreModal(uuid, nom, actif) {
    var action = actif ? 'Suspendre' : 'Reactivation';
    var html = '<div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" id="susp-modal-overlay" onclick="if(event.target===this)closeSuspendreModal()">';
    html += '<div class="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl fade-in text-center">';
    html += '<div class="text-4xl mb-3">'+(actif?'🔒':'🔓')+'</div>';
    html += '<h3 class="text-lg font-bold mb-2">' + action + ' l\'utilisateur ?</h3>';
    html += '<p class="text-sm text-muted mb-6"><strong>' + nom + '</strong> sera ' + (actif ? 'bloque et ne pourra plus se connecter' : 'debloque et pourra se reconnecter') + '.</p>';
    html += '<div class="flex gap-3"><button onclick="closeSuspendreModal()" class="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl text-sm">Annuler</button>';
    html += '<button onclick="submitSuspendre(\''+uuid+'\','+actif+')" class="flex-1 px-4 py-2.5 '+(actif?'bg-red-600':'bg-green-600')+' text-white rounded-xl text-sm font-semibold">Confirmer</button></div>';
    html += '</div></div>';
    
    var existing = document.getElementById('susp-modal-overlay');
    if(existing) existing.remove();
    document.body.insertAdjacentHTML('beforeend', html);
}

function closeSuspendreModal() {
    var el = document.getElementById('susp-modal-overlay');
    if(el) el.remove();
}

function submitSuspendre(uuid, actif) {
    apiFetch('/agents/'+uuid, {method:'PUT', body:JSON.stringify({actif:!actif})}).then(function(r){
        if(r.success) { closeSuspendreModal(); loadParametresData(); }
    });
}

function updateUser(uuid, field, value) {
    apiFetch('/agents/'+uuid, {method:'PUT', body:JSON.stringify({[field]:value})}).then(function(r){
        if(!r.success) showAlert('Une erreur est survenue. Veuillez réessayer.');
    });
}

function showAddAgenceForm(){
    var row = document.getElementById('agences-tbody');
    row.innerHTML = '<tr><td colspan="4"><form onsubmit="submitAgence(event)" class="flex gap-2 p-2"><input type="text" id="new-agence-nom" placeholder="Nom *" required class="flex-1 px-3 py-1.5 border rounded-lg text-sm"><input type="text" id="new-agence-adresse" placeholder="Adresse" class="flex-1 px-3 py-1.5 border rounded-lg text-sm"><input type="text" id="new-agence-tel" placeholder="Tel" class="w-24 px-3 py-1.5 border rounded-lg text-sm"><button type="submit" class="bg-green-600 text-white px-3 py-1.5 rounded-lg text-xs">OK</button><button type="button" onclick="loadParametresData()" class="bg-slate-300 px-3 py-1.5 rounded-lg text-xs">X</button></form></td></tr>';
}
function submitAgence(e){e.preventDefault();apiFetch('/parametres/agences',{method:'POST',body:JSON.stringify({nom:document.getElementById('new-agence-nom').value,adresse:document.getElementById('new-agence-adresse').value,telephone:document.getElementById('new-agence-tel').value})}).then(function(){loadParametresData();});}

function showAddMagasinForm(){
    var row = document.getElementById('magasins-tbody');
    row.innerHTML = '<tr><td colspan="4"><form onsubmit="submitMagasin(event)" class="flex gap-2 p-2"><input type="text" id="new-magasin-nom" placeholder="Nom *" required class="flex-1 px-3 py-1.5 border rounded-lg text-sm"><input type="text" id="new-magasin-adresse" placeholder="Adresse" class="flex-1 px-3 py-1.5 border rounded-lg text-sm"><input type="text" id="new-magasin-resp" placeholder="Responsable" class="flex-1 px-3 py-1.5 border rounded-lg text-sm"><button type="submit" class="bg-green-600 text-white px-3 py-1.5 rounded-lg text-xs">OK</button><button type="button" onclick="loadParametresData()" class="bg-slate-300 px-3 py-1.5 rounded-lg text-xs">X</button></form></td></tr>';
}
function submitMagasin(e){e.preventDefault();apiFetch('/parametres/magasins',{method:'POST',body:JSON.stringify({nom:document.getElementById('new-magasin-nom').value,adresse:document.getElementById('new-magasin-adresse').value,responsable:document.getElementById('new-magasin-resp').value})}).then(function(){loadParametresData();});}

function showAddUserForm(){
    var row = document.getElementById('users-tbody');
    row.innerHTML = '<tr><td colspan="4"><form onsubmit="submitUser(event)" class="flex gap-2 p-2"><input type="text" id="new-user-nom" placeholder="Nom *" required class="w-24 px-2 py-1 border rounded text-xs"><input type="text" id="new-user-prenom" placeholder="Prenom" class="w-20 px-2 py-1 border rounded text-xs"><input type="email" id="new-user-email" placeholder="Email *" required class="w-36 px-2 py-1 border rounded text-xs"><select id="new-user-role" class="px-2 py-1 border rounded text-xs"><option value="agent">Agent</option><option value="chef_agence">Chef agence</option><option value="gerante">Gerante</option></select><input type="password" id="new-user-password" placeholder="MDP" value="agent123" class="w-16 px-2 py-1 border rounded text-xs"><button type="submit" class="bg-green-600 text-white px-2 py-1 rounded text-xs">OK</button><button type="button" onclick="loadParametresData()" class="bg-slate-300 px-2 py-1 rounded text-xs">X</button></form></td></tr>';
}
function submitUser(e){
    e.preventDefault();
    apiFetch('/agents',{method:'POST',body:JSON.stringify({nom:document.getElementById('new-user-nom').value,prenom:document.getElementById('new-user-prenom').value,email:document.getElementById('new-user-email').value,role:document.getElementById('new-user-role').value,password:document.getElementById('new-user-password').value})}).then(function(){loadParametresData();});
}

function changeOwnPassword(e){e.preventDefault();var p1=document.getElementById('own-password').value;var p2=document.getElementById('own-password-confirm').value;var m=document.getElementById('param-msg');if(p1!==p2){m.innerHTML='<p class="text-red-600 text-sm">Les mots de passe ne correspondent pas.</p>';return;}apiFetch('/auth/change-password',{method:'POST',body:JSON.stringify({password:p1})}).then(function(){m.innerHTML='<p class="text-green-600 text-sm">Mot de passe modifie.</p>';document.getElementById('own-password').value='';document.getElementById('own-password-confirm').value='';});}
