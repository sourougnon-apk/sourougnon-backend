function loadParametres(c) {
    c.innerHTML = `
        <div class="fade-in space-y-6">
            <div class="flex items-center justify-between">
                <div>
                    <h3 class="text-xl font-bold text-slate-800">Paramètres & Réseau</h3>
                    <p class="text-sm text-muted mt-1">Gérez vos agences et vos collaborateurs.</p>
                </div>
                <button onclick="showAddAgenceForm()" class="bg-accent text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-700 shadow-sm">+ Nouvelle Agence</button>
            </div>

            <!-- KPIs -->
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4" id="param-kpis">
                <div class="panel text-center py-4 text-muted text-sm">Chargement des statistiques...</div>
            </div>

            <!-- Agences Grid -->
            <h4 class="text-lg font-bold text-slate-800 mt-6 mb-2">Mes Agences</h4>
            <div id="agences-grid" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <p class="text-muted text-sm">Chargement...</p>
            </div>

            <!-- Utilisateurs -->
            <div class="panel mt-6">
                <div class="flex items-center justify-between mb-4">
                    <h4 class="text-lg font-bold text-slate-800">Utilisateurs</h4>
                    <button onclick="showAddUserForm()" class="bg-accent text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-700 shadow-sm">+ Nouvel Utilisateur</button>
                </div>
                <div class="table-wrapper">
                    <table>
                        <thead>
                            <tr><th>Nom</th><th>Email</th><th>Rôle</th><th>Agence</th><th>Actions</th></tr>
                        </thead>
                        <tbody id="users-tbody">
                            <tr><td colspan="5" class="text-center text-muted py-4">Chargement...</td></tr>
                        </tbody>
                    </table>
                </div>
            </div>

            <!-- Mon compte -->
            <div class="panel max-w-md mt-6">
                <h4 class="text-lg font-bold text-slate-800 mb-4">Sécurité du compte</h4>
                <form onsubmit="changeOwnPassword(event)" class="space-y-3">
                    <input type="password" id="own-password" placeholder="Nouveau mot de passe" required class="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm">
                    <input type="password" id="own-password-confirm" placeholder="Confirmer le mot de passe" required class="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm">
                    <div id="param-msg" class="text-sm"></div>
                    <button type="submit" class="w-full bg-slate-800 text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-slate-900">Modifier le mot de passe</button>
                </form>
            </div>
        </div>
    `;
    loadParametresData();
}

function loadParametresData() {
    apiFetch('/parametres').then(function(d) {
        var agences = d.agences || [];
        var users = d.utilisateurs || [];

        // 1. KPIs
        var agents = users.filter(u => u.role === 'agent' && u.actif).length;
        var chefs = users.filter(u => u.role === 'chef_agence' && u.actif).length;
        document.getElementById('param-kpis').innerHTML = `
            <div class="panel p-4 flex items-center gap-4 border-l-4 border-blue-500">
                <div class="w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center text-xl">🏢</div>
                <div><div class="text-xs text-muted font-semibold uppercase">Agences</div><div class="text-2xl font-bold text-slate-800">${agences.length}</div></div>
            </div>
            <div class="panel p-4 flex items-center gap-4 border-l-4 border-amber-500">
                <div class="w-12 h-12 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center text-xl">👔</div>
                <div><div class="text-xs text-muted font-semibold uppercase">Chefs d'agence</div><div class="text-2xl font-bold text-slate-800">${chefs}</div></div>
            </div>
            <div class="panel p-4 flex items-center gap-4 border-l-4 border-green-500">
                <div class="w-12 h-12 rounded-full bg-green-50 text-green-600 flex items-center justify-center text-xl">🏃</div>
                <div><div class="text-xs text-muted font-semibold uppercase">Agents actifs</div><div class="text-2xl font-bold text-slate-800">${agents}</div></div>
            </div>
        `;

        // 2. Grid des Agences
        var grid = document.getElementById('agences-grid');
        if (agences.length === 0) {
            grid.innerHTML = '<p class="text-muted text-sm col-span-3">Aucune agence configurée.</p>';
        } else {
            grid.innerHTML = agences.map(a => {
                var chef = users.find(u => u.role === 'chef_agence' && u.agence_id === a.id);
                var chefNom = chef ? chef.nom + ' ' + (chef.prenom || '') : '<span class="text-red-400 text-xs italic">Non assigné</span>';
                var agentsCount = users.filter(u => u.role === 'agent' && u.agence_id === a.id).length;

                return `
                    <div class="panel p-5 border-t-4 ${a.actif ? 'border-t-blue-600' : 'border-t-slate-300'} relative">
                        <div class="flex justify-between items-start mb-2">
                            <h3 class="font-bold text-lg text-slate-800">${a.nom}</h3>
                            <span class="badge ${a.actif ? 'badge-success' : 'badge-danger'}">${a.actif ? 'Active' : 'Inactive'}</span>
                        </div>
                        <p class="text-xs text-muted mb-4">${a.adresse || 'Aucune adresse'}</p>
                        
                        <div class="space-y-2 text-sm">
                            <div class="flex items-center gap-2"><span class="text-muted">👔 Chef :</span> <strong>${chefNom}</strong></div>
                            <div class="flex items-center gap-2"><span class="text-muted">🏃 Agents :</span> <strong>${agentsCount}</strong></div>
                        </div>

                        <div class="mt-4 pt-3 border-t border-slate-100 flex justify-end gap-2">
                            <button onclick="modifierAgence(${a.id}, '${a.nom}', '${a.adresse || ''}', '${a.telephone || ''}')" class="text-slate-500 hover:text-blue-600 text-xs font-semibold px-2 py-1">Modifier</button>
                        </div>
                    </div>
                `;
            }).join('');
        }

        // 3. Tableau des Utilisateurs
        var uTbody = document.getElementById('users-tbody');
        uTbody.innerHTML = users.map(x => {
            var ag = agences.find(a => a.id === x.agence_id);
            var agNom = ag ? ag.nom : '<span class="text-slate-300">-</span>';
            
            var roleBadge = 'badge-info';
            if (x.role === 'chef_agence') roleBadge = 'badge-warning';
            if (x.role === 'agent') roleBadge = 'badge-success';

            return `
                <tr>
                    <td class="font-medium text-slate-800">${x.nom} ${x.prenom || ''}</td>
                    <td class="text-xs text-muted">${x.email}</td>
                    <td><span class="badge ${roleBadge}">${x.role}</span></td>
                    <td class="font-semibold text-sm">${agNom}</td>
                    <td>
                        <div class="flex gap-2">
                            ${x.role !== 'gerante' ? `<button onclick="showAssignerAgenceModal('${x.uuid}', '${x.nom}', ${x.agence_id || 0})" class="text-blue-600 hover:underline text-xs font-semibold">Agence</button>` : '<span class="text-xs text-muted">Global</span>'}
                            ${x.role !== 'gerante' ? `<button onclick="showResetPasswordModal('${x.uuid}', '${x.nom}')" class="text-amber-600 hover:underline text-xs font-semibold">Réinit. MDP</button>` : ''}
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
        
        // Sauvegarder les agences pour les modales
        window._allAgences = agences;
        window._allUsers = users;

    }).catch(function(e) {
        showAlert('Erreur de chargement des paramètres : ' + e.message);
    });
}

function showAddAgenceForm() {
    var users = window._allUsers || [];
    var chefs = users.filter(u => u.role === 'chef_agence' || (u.role === 'agent' && !u.agence_id)); // On peut promouvoir un agent
    var options = '<option value="">-- Assigner un chef plus tard --</option>' + chefs.map(c => `<option value="${c.uuid}">${c.nom} ${c.prenom || ''} (${c.role})</option>`).join('');
    
    var html = `
        <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" id="modal-agence">
            <div class="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl fade-in">
                <div class="flex justify-between items-center mb-4">
                    <h3 class="text-lg font-bold">Nouvelle Agence</h3>
                    <button onclick="document.getElementById('modal-agence').remove()" class="text-slate-400 hover:text-slate-700">✕</button>
                </div>
                <form onsubmit="submitNewAgence(event)" class="space-y-4">
                    <div>
                        <label class="block text-xs font-semibold text-slate-600 mb-1">Nom de l'agence *</label>
                        <input type="text" id="ag-nom" placeholder="Ex: Agence Cotonou" required class="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-accent outline-none">
                    </div>
                    <div class="grid grid-cols-2 gap-3">
                        <div>
                            <label class="block text-xs font-semibold text-slate-600 mb-1">Téléphone</label>
                            <input type="text" id="ag-tel" placeholder="Téléphone" class="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-accent outline-none">
                        </div>
                        <div>
                            <label class="block text-xs font-semibold text-slate-600 mb-1">Adresse</label>
                            <input type="text" id="ag-adresse" placeholder="Adresse" class="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-accent outline-none">
                        </div>
                    </div>
                    <div>
                        <label class="block text-xs font-semibold text-slate-600 mb-1">Chef d'agence (Optionnel)</label>
                        <select id="ag-chef" class="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-accent outline-none">${options}</select>
                    </div>
                    <div class="flex gap-3 pt-2">
                        <button type="button" onclick="document.getElementById('modal-agence').remove()" class="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold hover:bg-slate-50">Annuler</button>
                        <button type="submit" class="flex-1 px-4 py-2.5 bg-accent text-white rounded-xl text-sm font-semibold hover:bg-blue-700 shadow-md">Créer l'agence</button>
                    </div>
                </form>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', html);
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
        loadParametres(document.getElementById('page-content'));
    }).catch(function(e){ showAlert('Erreur : ' + e.message); });
}

function modifierAgence(id, nom, adresse, tel) {
    var html = `
        <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" id="modal-agence-mod">
            <div class="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl fade-in">
                <div class="flex justify-between items-center mb-4">
                    <h3 class="text-lg font-bold">Modifier l'Agence</h3>
                    <button onclick="document.getElementById('modal-agence-mod').remove()" class="text-slate-400 hover:text-slate-700">✕</button>
                </div>
                <form onsubmit="submitUpdateAgence(event, ${id})" class="space-y-4">
                    <div>
                        <label class="block text-xs font-semibold text-slate-600 mb-1">Nom de l'agence</label>
                        <input type="text" id="mod-ag-nom" value="${nom}" required class="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-accent outline-none">
                    </div>
                    <div class="grid grid-cols-2 gap-3">
                        <div>
                            <label class="block text-xs font-semibold text-slate-600 mb-1">Téléphone</label>
                            <input type="text" id="mod-ag-tel" value="${tel}" class="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-accent outline-none">
                        </div>
                        <div>
                            <label class="block text-xs font-semibold text-slate-600 mb-1">Adresse</label>
                            <input type="text" id="mod-ag-adresse" value="${adresse}" class="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-accent outline-none">
                        </div>
                    </div>
                    <div class="flex gap-3 pt-2">
                        <button type="button" onclick="document.getElementById('modal-agence-mod').remove()" class="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold hover:bg-slate-50">Annuler</button>
                        <button type="submit" class="flex-1 px-4 py-2.5 bg-accent text-white rounded-xl text-sm font-semibold hover:bg-blue-700 shadow-md">Enregistrer</button>
                    </div>
                </form>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', html);
}

function submitUpdateAgence(e, id) {
    e.preventDefault();
    var data = {
        nom: document.getElementById('mod-ag-nom').value,
        adresse: document.getElementById('mod-ag-adresse').value,
        telephone: document.getElementById('mod-ag-tel').value,
    };
    apiFetch('/parametres/agences/' + id, {method:'PUT', body:JSON.stringify(data)}).then(function(r){
        document.getElementById('modal-agence-mod').remove();
        showAlert('Agence mise à jour.');
        loadParametres(document.getElementById('page-content'));
    }).catch(function(e){ showAlert('Erreur : ' + e.message); });
}

function showAssignerAgenceModal(userUuid, userName, currentAgenceId) {
    var agences = window._allAgences || [];
    var options = agences.map(a => `<option value="${a.id}" ${a.id === currentAgenceId ? 'selected' : ''}>${a.nom}</option>`).join('');
    
    var html = `
        <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" id="modal-assign-agence">
            <div class="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl fade-in">
                <div class="flex justify-between items-center mb-4">
                    <h3 class="text-lg font-bold">Assigner une agence</h3>
                    <button onclick="document.getElementById('modal-assign-agence').remove()" class="text-slate-400 hover:text-slate-700">✕</button>
                </div>
                <p class="text-sm text-slate-600 mb-4">Choisissez l'agence de <strong>${userName}</strong>.</p>
                <form onsubmit="submitAssignAgence(event, '${userUuid}')" class="space-y-4">
                    <select id="assign-agence-select" class="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-accent outline-none">
                        ${options}
                    </select>
                    <div class="flex gap-3 pt-2">
                        <button type="button" onclick="document.getElementById('modal-assign-agence').remove()" class="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold hover:bg-slate-50">Annuler</button>
                        <button type="submit" class="flex-1 px-4 py-2.5 bg-slate-800 text-white rounded-xl text-sm font-semibold hover:bg-slate-900 shadow-md">Confirmer</button>
                    </div>
                </form>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', html);
}

function submitAssignAgence(e, userUuid) {
    e.preventDefault();
    var agenceId = document.getElementById('assign-agence-select').value;
    apiFetch('/parametres/utilisateurs/' + userUuid + '/agence', {method:'PUT', body:JSON.stringify({agence_id: agenceId})}).then(function(r){
        document.getElementById('modal-assign-agence').remove();
        showAlert('Utilisateur assigné avec succès.');
        loadParametres(document.getElementById('page-content'));
    }).catch(function(e){ showAlert('Erreur : ' + e.message); });
}

// Fonction de changement de mot de passe (existante)

function showResetPasswordModal(uuid, nom) {
    var html = `
        <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" id="modal-reset-pwd">
            <div class="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl fade-in">
                <div class="flex justify-between items-center mb-4">
                    <h3 class="text-lg font-bold">Réinitialiser le mot de passe</h3>
                    <button onclick="document.getElementById('modal-reset-pwd').remove()" class="text-slate-400 hover:text-slate-700">✕</button>
                </div>
                <p class="text-sm text-slate-600 mb-4">Utilisateur : <strong>${nom}</strong></p>
                <form onsubmit="submitResetPassword(event, '${uuid}')" class="space-y-3">
                    <input type="password" id="reset-pass" placeholder="Nouveau mot de passe" required minlength="6" class="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm">
                    <input type="password" id="reset-pass-conf" placeholder="Confirmer le mot de passe" required minlength="6" class="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm">
                    <div id="reset-pass-msg" class="text-xs"></div>
                    <div class="flex gap-3 pt-2">
                        <button type="button" onclick="document.getElementById('modal-reset-pwd').remove()" class="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl text-sm">Annuler</button>
                        <button type="submit" class="flex-1 px-4 py-2.5 bg-amber-600 text-white rounded-xl text-sm font-semibold">Réinitialiser</button>
                    </div>
                </form>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', html);
}

function submitResetPassword(e, uuid) {
    e.preventDefault();
    var pass = document.getElementById('reset-pass').value;
    var conf = document.getElementById('reset-pass-conf').value;
    var msg = document.getElementById('reset-pass-msg');

    if (pass !== conf) {
        msg.innerHTML = '<span class="text-red-500">Les mots de passe ne correspondent pas.</span>';
        return;
    }

    apiFetch('/parametres/utilisateurs/' + uuid + '/password', {
        method: 'PUT',
        body: JSON.stringify({ password: pass, password_confirmation: conf })
    }).then(function(res) {
        document.getElementById('modal-reset-pwd').remove();
        showAlert('Mot de passe réinitialisé avec succès.');
    }).catch(function(err) {
        msg.innerHTML = '<span class="text-red-500">' + err.message + '</span>';
    });
}

function changeOwnPassword(e) {
    e.preventDefault();
    var pass = document.getElementById('own-password').value;
    var confirm = document.getElementById('own-password-confirm').value;
    var msg = document.getElementById('param-msg');
    if (pass !== confirm) {
        msg.innerHTML = '<span class="text-red-500">Les mots de passe ne correspondent pas.</span>';
        return;
    }
    apiFetch('/auth/change-password', {method:'POST', body:JSON.stringify({password: pass})}).then(function(r){
        msg.innerHTML = '<span class="text-green-500">Mot de passe mis à jour avec succès.</span>';
        document.getElementById('own-password').value = '';
        document.getElementById('own-password-confirm').value = '';
    }).catch(function(e){
        msg.innerHTML = '<span class="text-red-500">Erreur : ' + e.message + '</span>';
    });
}


function showAddUserForm() {
    var agences = window._allAgences || [];
    if (agences.length === 0) {
        showAlert('Veuillez créer une agence avant d\'ajouter des utilisateurs.');
        return;
    }

    var agenceOptions = agences.map(a => `<option value="${a.id}">${a.nom}</option>`).join('');
    
    var html = `
        <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" id="modal-user">
            <div class="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl fade-in max-h-[90vh] overflow-y-auto">
                <div class="flex justify-between items-center mb-4">
                    <h3 class="text-lg font-bold">Nouvel Utilisateur</h3>
                    <button onclick="document.getElementById('modal-user').remove()" class="text-slate-400 hover:text-slate-700">✕</button>
                </div>
                <form onsubmit="submitNewUser(event)" class="space-y-3">
                    <div class="grid grid-cols-2 gap-3">
                        <input type="text" id="usr-nom" placeholder="Nom *" required class="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm">
                        <input type="text" id="usr-prenom" placeholder="Prénom" class="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm">
                    </div>
                    <input type="email" id="usr-email" placeholder="Email *" required class="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm">
                    <input type="text" id="usr-tel" placeholder="Téléphone" class="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm">
                    
                    <div class="grid grid-cols-2 gap-3">
                        <div>
                            <label class="block text-xs font-semibold mb-1">Rôle</label>
                            <select id="usr-role" required class="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm">
                                <option value="agent">Agent</option>
                                <option value="chef_agence">Chef d'agence</option>
                            </select>
                        </div>
                        <div>
                            <label class="block text-xs font-semibold mb-1">Agence</label>
                            <select id="usr-agence" required class="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm">${agenceOptions}</select>
                        </div>
                    </div>

                    <input type="password" id="usr-password" placeholder="Mot de passe initial (min 6 car.) *" required minlength="6" class="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm">
                    
                    <div class="flex gap-3 pt-2">
                        <button type="button" onclick="document.getElementById('modal-user').remove()" class="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl text-sm">Annuler</button>
                        <button type="submit" class="flex-1 px-4 py-2.5 bg-accent text-white rounded-xl text-sm font-semibold">Créer</button>
                    </div>
                </form>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', html);
}

function submitNewUser(e) {
    e.preventDefault();
    var data = {
        nom: document.getElementById('usr-nom').value,
        prenom: document.getElementById('usr-prenom').value,
        email: document.getElementById('usr-email').value,
        telephone: document.getElementById('usr-tel').value,
        role: document.getElementById('usr-role').value,
        agence_id: parseInt(document.getElementById('usr-agence').value),
        password: document.getElementById('usr-password').value
    };

    apiFetch('/parametres/utilisateurs', { method: 'POST', body: JSON.stringify(data) }).then(function(res) {
        document.getElementById('modal-user').remove();
        showAlert('Utilisateur créé avec succès.');
        loadParametresData(); // Recharge la liste des utilisateurs
    }).catch(function(err) {
        showAlert('Erreur : ' + err.message);
    });
}
