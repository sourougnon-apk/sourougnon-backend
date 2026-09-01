var debStep1Data = {};

function showAddDebiteurModal(){
    window.debiteurEnModification = null;
    window.debiteurDataData = null;
    var form = document.querySelector("#deb-step1-modal form"); if(form) form.reset();
    document.getElementById('deb-step1-modal').classList.remove('hidden');
    setTimeout(function() {
        if (typeof chargerLocalisations === 'function') chargerLocalisations();
    }, 300);
}

function closeDebModals(){
    document.getElementById('deb-step1-modal').classList.add('hidden');
    document.getElementById('deb-step2-modal').classList.add('hidden');
}

function debStep1(e){
    e.preventDefault();
    debStep1Data = {
        nom: document.getElementById('deb-nom').value,
        prenom: document.getElementById('deb-prenom').value,
        telephone: document.getElementById('deb-telephone').value,
        quartier: typeof getLocalisationComplete === 'function' ? getLocalisationComplete() : '',
        adresse: document.getElementById('deb-adresse').value
    };
    document.getElementById('deb-step1-modal').classList.add('hidden');
    document.getElementById('deb-step2-modal').classList.remove('hidden');

    apiFetch('/agents').then(function(a){
        var agentSelect = document.getElementById('deb-agent');
        if (agentSelect) {
            agentSelect.innerHTML = '<option value="">Agent assigné...</option>' +
                a.filter(function(x){return x.actif;}).map(function(x){
                    return '<option value="'+x.uuid+'">'+x.nom+' '+(x.prenom||'')+'</option>';
                }).join('');
        }

        if (window.debiteurEnModification && window.debiteurDataData) {
            var d = window.debiteurDataData;
            var fAct = document.getElementById('deb-activite'); if(fAct) fAct.value = d.activite || '';
            var fRefNom = document.getElementById('deb-ref-nom'); if(fRefNom) fRefNom.value = d.personne_reference_nom || '';
            var fRefTel = document.getElementById('deb-ref-tel'); if(fRefTel) fRefTel.value = d.personne_reference_tel || '';
            var fLim = document.getElementById('deb-limite'); if(fLim) fLim.value = d.credits_autorises || 1;
            if (d.agent_id && agentSelect) agentSelect.value = d.agent_id;
        }
    });
}

function debStepBack(){
    document.getElementById('deb-step2-modal').classList.add('hidden');
    document.getElementById('deb-step1-modal').classList.remove('hidden');
}

function debStep2(e){
    e.preventDefault();
    var data = Object.assign(debStep1Data, {
        agent_id: document.getElementById('deb-agent').value,
        activite: document.getElementById('deb-activite').value,
        personne_reference_nom: document.getElementById('deb-ref-nom').value,
        personne_reference_tel: document.getElementById('deb-ref-tel').value,
        credits_autorises: parseInt(document.getElementById('deb-limite').value) || 1
    });

    var isEdit = !!window.debiteurEnModification;
    var url = isEdit ? '/debiteurs/' + window.debiteurEnModification : '/debiteurs';
    var method = isEdit ? 'PUT' : 'POST';

    apiFetch(url, {method: method, body: JSON.stringify(data)}).then(function(r){
        if(r.success) {
            closeDebModals();
            window.debiteurEnModification = null;
            window.debiteurDataData = null;
            showAlert(isEdit ? 'Débiteur modifié avec succès.' : 'Débiteur créé avec le code ' + (r.code_client || ''));
            loadPage('debiteurs');
        } else {
            showAlert('Erreur: ' + (r.error || 'inconnue'));
        }
    });
}

function loadDebiteurs(c){
    apiFetch('/debiteurs').then(function(d){
        c.innerHTML='<div class="fade-in space-y-6">'+
            '<div class="flex items-center justify-between"><h3 class="text-xl font-bold">Debiteurs</h3>'+
            '<button onclick="showAddDebiteurModal()" class="bg-accent text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-700">+ Nouveau Debiteur</button></div>'+
            '<div class="panel"><div class="table-wrapper"><table><thead><tr><th>Code</th><th>Nom</th><th>Telephone</th><th>Quartier</th><th>Agent</th><th>Score</th><th>Actions</th></tr></thead><tbody>'+
            (d.length>0?d.map(function(x){
                var score = x.score_solvabilite !== undefined && x.score_solvabilite !== null ? x.score_solvabilite : 50;
                var scoreColor = score >= 80 ? '#00c853' : score >= 60 ? '#0066ff' : score >= 40 ? '#f59e0b' : '#ef4444';
                return '<tr>'+
                    '<td class="font-mono text-xs">'+(x.code_client||'--')+'</td>'+
                    '<td class="font-medium">'+x.nom+' '+(x.prenom||'')+'</td>'+
                    '<td>'+(x.telephone||'--')+'</td>'+
                    '<td>'+(x.quartier||'--')+'</td>'+
                    '<td>'+(x.agent?x.agent.nom:'--')+'</td>'+
                    '<td><span class="badge" style="background:'+scoreColor+'20;color:'+scoreColor+';font-weight:bold">'+score+'%</span></td>'+
                    '<td><button onclick="voirDebiteur(\''+x.uuid+'\')" class="text-accent text-xs hover:underline font-semibold">Details</button></td>'+
                '</tr>';
            }).join(''):'<tr><td colspan="7" class="text-center text-muted py-4">Aucun debiteur</td></tr>')+
            '</tbody></table></div></div></div>';
    });
}

function voirDebiteur(uuid){
    var ancienModal = document.getElementById('detail-modal');
    if (ancienModal) ancienModal.remove();

    Promise.all([
        apiFetch('/debiteurs/'+uuid),
        apiFetch('/debiteurs/'+uuid+'/score').catch(function(){ return {score:50, label:'Neutre', details:{}}; }),
        apiFetch('/debiteurs/'+uuid+'/historique').catch(function(){ return {ventes:[], paiements:[], debiteur:{}}; })
    ]).then(function(resultats){
        var d = resultats[0];
        var scoreData = resultats[1] || {};
        var hist = resultats[2] || {};

        var score = scoreData.score !== undefined ? scoreData.score : (d.score_solvabilite || 50);
        var label = scoreData.label || 'Neutre';
        var details = scoreData.details || {};
        var scoreColor = score >= 80 ? '#00c853' : score >= 60 ? '#0066ff' : score >= 40 ? '#f59e0b' : '#ef4444';
        var strokeDash = (2 * Math.PI * 40 * score / 100).toFixed(2);

        var refNom = d.personne_reference_nom || d.reference_nom || d.pers_ref_nom || '--';
        var refTel = d.personne_reference_tel || d.reference_tel || d.pers_ref_tel || '--';
        var creditsAuth = d.credits_autorises !== undefined ? d.credits_autorises : (d.limite_credit || 1);

        var f = function(v){ return new Intl.NumberFormat('fr-FR',{style:'currency',currency:'XOF',maximumFractionDigits:0}).format(v); };

        var soldeTotal = (hist.debiteur && hist.debiteur.solde_total !== undefined && hist.debiteur.solde_total !== null)
            ? hist.debiteur.solde_total : null;

        var html = '<div class="fixed inset-0 z-50 flex items-start justify-center p-4 bg-black/50 overflow-y-auto py-8" id="detail-modal" onclick="if(event.target===this)this.remove()">';
        html += '<div class="bg-white rounded-2xl p-6 w-full max-w-lg shadow-2xl fade-in my-auto">';
        html += '<div class="flex items-center justify-between mb-4">';
        html += '<h3 class="text-lg font-bold">Fiche Debiteur</h3>';
        html += '<button onclick="document.getElementById(\'detail-modal\').remove()" class="text-slate-400 hover:text-slate-600 font-bold">✕</button>';
        html += '</div>';

        html += '<div class="flex items-center gap-4 mb-4 p-4 bg-slate-50 rounded-xl">';
        html += '<div style="width:100px;height:100px;position:relative;flex-shrink:0;">';
        html += '<svg viewBox="0 0 100 100" style="width:100%;height:100%;transform:rotate(-90deg)">';
        html += '<circle cx="50" cy="50" r="40" fill="none" stroke="#e2e8f0" stroke-width="10"/>';
        html += '<circle cx="50" cy="50" r="40" fill="none" stroke="'+scoreColor+'" stroke-width="10" stroke-dasharray="'+strokeDash+' 251.33" stroke-linecap="round"/>';
        html += '</svg>';
        html += '<div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);text-align:center;font-weight:bold;font-size:18px;color:'+scoreColor+'">'+score+'%</div>';
        html += '</div>';
        html += '<div><span class="text-sm font-semibold" style="color:'+scoreColor+'">'+label+'</span>';
        html += '<p class="text-xs text-muted mt-1">Score de solvabilité</p>';
        html += '<button onclick="recalculerScore(\''+uuid+'\')" class="mt-2 text-xs text-accent hover:underline font-medium">↺ Recalculer le score</button>';
        html += '</div></div>';

        if (details && details.comportement_paiement !== undefined) {
            html += '<div class="grid grid-cols-2 gap-2 text-xs mb-4">';
            html += '<div class="p-2 bg-slate-50 rounded-lg"><span class="text-muted">Comportement paiement</span><div class="font-semibold">'+details.comportement_paiement+'%</div></div>';
            html += '<div class="p-2 bg-slate-50 rounded-lg"><span class="text-muted">Sévérité retards</span><div class="font-semibold">'+details.severite_retards+'%</div></div>';
            html += '<div class="p-2 bg-slate-50 rounded-lg"><span class="text-muted">Crédits terminés</span><div class="font-semibold">'+details.credits_termines+'%</div></div>';
            html += '<div class="p-2 bg-slate-50 rounded-lg"><span class="text-muted">Ancienneté</span><div class="font-semibold">'+details.anciennete+'%</div></div>';
            html += '<div class="p-2 bg-slate-50 rounded-lg"><span class="text-muted">Régularité</span><div class="font-semibold">'+details.regularite+'%</div></div>';
            html += '<div class="p-2 bg-slate-50 rounded-lg"><span class="text-muted">Échéances observées</span><div class="font-semibold">'+details.nb_echeances+'</div></div>';
            html += '</div>';
        }

        html += '<div class="grid grid-cols-2 gap-3 text-sm border-t pt-3">';
        html += '<div><span class="text-muted">Code:</span> <strong>'+(d.code_client||'--')+'</strong></div>';
        html += '<div><span class="text-muted">Nom:</span> <strong>'+d.nom+' '+(d.prenom||'')+'</strong></div>';
        html += '<div><span class="text-muted">Tél:</span> '+(d.telephone||'--')+'</div>';
        html += '<div><span class="text-muted">Quartier:</span> '+(d.quartier||'--')+'</div>';
        html += '<div><span class="text-muted">Adresse:</span> '+(d.adresse||'--')+'</div>';
        html += '<div><span class="text-muted">Activité:</span> '+(d.activite||'--')+'</div>';
        html += '<div><span class="text-muted">Réf.:</span> <strong>'+refNom+'</strong></div>';
        html += '<div><span class="text-muted">Tél réf.:</span> <strong>'+refTel+'</strong></div>';
        html += '<div><span class="text-muted">Agent:</span> '+(d.agent?d.agent.nom:'--')+'</div>';
        html += '<div><span class="text-muted">Crédits autorisés:</span> <strong>'+creditsAuth+'</strong></div>';
        html += '</div>';

        // Solde restant — affiché même si 0 (correction du bug falsy)
        html += '<div class="mt-3 p-2 rounded-lg text-sm font-semibold '+(soldeTotal > 0 ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600')+'">';
        html += 'Solde restant total : ' + (soldeTotal !== null ? f(soldeTotal) : '--');
        html += '</div>';

        // Historique des achats
        // Situation des échéances
        html += '<div class="mt-3 border-t pt-3">';
        if (d.ventes && d.ventes.length > 0) {
            d.ventes.forEach(function(v) {
                html += '<div class="text-xs">Jours payés : ' + (v.jours_payes || 0) + '/' + (v.jours_total || 0) + '</div>';
                html += '<div class="text-xs">Impayés : ' + (v.jours_impayes || 0) + ' jour(s)</div>';
                html += '<div class="text-xs">Pénalités dues : ' + f(v.penalites_en_attente || 0) + '</div>';
            });
        } else {
            html += '<p class="text-xs text-muted">Aucune échéance</p>';
        }
        html += '</div>';
        
        html += '<div class="border-t pt-3 mt-3">';
        html += '<h4 class="font-semibold text-sm mb-2">Historique des achats</h4>';
        html += (hist.ventes && hist.ventes.length > 0)
            ? '<div class="space-y-1 max-h-32 overflow-y-auto">' + hist.ventes.map(function(v){
                return '<div class="flex justify-between text-xs p-1.5 bg-slate-50 rounded"><span>'+v.date+' | '+(v.produits_resume||v.produit||'--')+'</span><span class="font-semibold">'+f(v.montant_total)+' | '+v.statut+'</span></div>';
              }).join('') + '</div>'
            : '<p class="text-xs text-muted">Aucun achat</p>';
        html += '</div>';


        // Historique des paiements
        html += '<div class="mt-3">';
        html += '<h4 class="font-semibold text-sm mb-2">Historique des paiements</h4>';
        html += (hist.paiements && hist.paiements.length > 0)
            ? '<div class="space-y-1 max-h-32 overflow-y-auto">' + hist.paiements.map(function(p){
                return '<div class="flex justify-between text-xs p-1.5 bg-slate-50 rounded"><span>'+p.date+' | '+p.mode+'</span><span class="font-semibold text-green-600">'+f(p.montant)+' | '+p.statut+'</span></div>';
              }).join('') + '</div>'
            : '<p class="text-xs text-muted">Aucun paiement</p>';
        html += '</div>';

        html += '<div class="mt-4 flex gap-2">';
        html += '<button onclick="modifierDebiteur(\''+uuid+'\',\''+d.nom+'\',\''+(d.telephone||'')+'\')" class="flex-1 px-4 py-2.5 bg-amber-600 text-white rounded-xl text-sm font-semibold">Modifier</button>';
        html += '<button onclick="supprimerDebiteur(\''+uuid+'\',\''+d.nom+'\')" class="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-xl text-sm font-semibold">Supprimer</button>';
        html += '<button onclick="document.getElementById(\'detail-modal\').remove()" class="flex-1 px-4 py-2.5 bg-accent text-white rounded-xl text-sm font-semibold">Fermer</button>';
        html += '</div>';
        html += '</div></div>';
        document.body.insertAdjacentHTML('beforeend', html);
    });
}

function recalculerScore(uuid){
    apiFetch('/debiteurs/'+uuid+'/score/calculer', {method:'POST'}).then(function(r){
        if (r && r.score !== undefined) {
            showAlert('Score de solvabilité recalculé : ' + r.score + '% (' + (r.label || '') + ')');
            voirDebiteur(uuid);
        } else {
            showAlert('Erreur lors du recalcul du score de solvabilité.');
        }
    });
}

function modifierDebiteur(uuid) {
    apiFetch('/debiteurs/' + uuid).then(function(d) {
        window.debiteurEnModification = uuid;
        window.debiteurDataData = d;

        var fNom = document.getElementById('deb-nom'); if(fNom) fNom.value = d.nom || '';
        var fPrenom = document.getElementById('deb-prenom'); if(fPrenom) fPrenom.value = d.prenom || '';
        var fTel = document.getElementById('deb-telephone'); if(fTel) fTel.value = d.telephone || '';
        var fAdresse = document.getElementById('deb-adresse'); if(fAdresse) fAdresse.value = d.adresse || '';

        var modal = document.getElementById('detail-modal');
        if (modal) modal.remove();

        var m1 = document.getElementById('deb-step1-modal');
        if (m1) m1.classList.remove('hidden');

        if (typeof chargerLocalisations === 'function') {
            setTimeout(function(){ chargerLocalisations(); }, 300);
        }
    }).catch(function(err){
        showAlert('Impossible de charger les données du débiteur.');
    });
}

function supprimerDebiteur(uuid, nom) {
    confirmModal('Supprimer ' + nom + ' ?').then(function(ok){
        if(!ok) return;
        apiFetch('/debiteurs/'+uuid, {method:'DELETE'}).then(function(){
            loadPage('debiteurs');
        });
    });
}