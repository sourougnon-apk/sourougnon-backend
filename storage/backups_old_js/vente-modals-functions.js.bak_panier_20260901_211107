function showVenteComptantModal(){
    var todayStr = new Date().toISOString().split('T')[0]; var dIn = document.getElementById('vc-date'); if(dIn){ dIn.value = todayStr; dIn.readOnly = true; }

    var todayStr = new Date().toISOString().split('T')[0];
    var dIn=document.getElementById('vc-date'); if(dIn){dIn.value=todayStr; dIn.max=todayStr;}
document.getElementById('vente-comptant-modal').classList.remove('hidden');apiFetch('/produits').then(function(p){document.getElementById('vc-produit').innerHTML='<option value="">-- Produit (optionnel) --</option>'+p.map(function(x){return '<option value="'+x.uuid+'" data-prix="'+x.prix_vente+'">'+x.nom+' - '+new Intl.NumberFormat('fr-FR',{style:'currency',currency:'XOF',maximumFractionDigits:0}).format(x.prix_vente)+'</option>';}).join('');});}
function closeVenteComptantModal(){document.getElementById('vente-comptant-modal').classList.add('hidden');}
function onProduitChangeComptant(){var s=document.getElementById('vc-produit');var p=s.options[s.selectedIndex].getAttribute('data-prix');if(p)document.getElementById('vc-montant').value=p;}
function submitVenteComptant(e){e.preventDefault();var data={nom:document.getElementById('vc-nom').value,telephone:document.getElementById('vc-telephone').value,produit_id:document.getElementById('vc-produit').value||null,montant:parseFloat(document.getElementById('vc-montant').value),mode_paiement:document.getElementById('vc-mode').value};apiFetch('/chef-agence/vente-comptant',{method:'POST',body:JSON.stringify(data)}).then(function(r){if(r.success){closeVenteComptantModal();var confElem=document.getElementById('conf-journalier');if(confElem)confElem.parentElement.style.display='none';var modalElem=document.getElementById('confirmation-vente-modal');if(modalElem)modalElem.classList.remove('hidden');if(typeof loadDashboard==='function')loadDashboard();}});}
function showVenteCreditModal(){
    var todayStr = new Date().toISOString().split('T')[0]; var dIn = document.getElementById('vcr-date-achat'); if(dIn){ dIn.value = todayStr; dIn.readOnly = true; }
    if(typeof vcrPanier !== 'undefined') { vcrPanier = []; renderPanier(); }

    var todayStr = new Date().toISOString().split('T')[0];
    var dIn=document.getElementById('vcr-date-achat'); if(dIn){dIn.value=todayStr; dIn.max=todayStr;}

    setTimeout(function(){
        var debSelect=document.getElementById("vcr-debiteur");
        if(debSelect) debSelect.onchange=onDebiteurChangeCredit;
    }, 200);document.getElementById('vente-credit-modal').classList.remove('hidden');apiFetch('/debiteurs').then(function(d){document.getElementById('vcr-debiteur').innerHTML='<option value="">-- Debiteur --</option>'+d.map(function(x){return '<option value="'+x.uuid+'">'+x.nom+' '+(x.prenom||'')+'</option>';}).join('');});apiFetch('/produits').then(function(p){document.getElementById('vcr-produit').innerHTML='<option value="">-- Produit (optionnel) --</option>'+p.map(function(x){return '<option value="'+x.uuid+'" data-prix="'+x.prix_vente+'">'+x.nom+' - '+new Intl.NumberFormat('fr-FR',{style:'currency',currency:'XOF',maximumFractionDigits:0}).format(x.prix_vente)+'</option>';}).join('');});}
function closeVenteCreditModal(){document.getElementById('vente-credit-modal').classList.add('hidden');}
function onProduitChangeCredit(){var s=document.getElementById('vcr-produit');var opt=s.options[s.selectedIndex];var p=opt.getAttribute('data-prix');if(p){document.getElementById('vcr-montant').value=p;document.getElementById('vcr-prix-vente').value=p;}calculerJournalier();}
function calculerJournalier(){var m=parseFloat(document.getElementById('vcr-montant').value)||0;var e=parseFloat(document.getElementById('vcr-epargne').value)||0;var j=parseInt(document.getElementById('vcr-jours').value)||20;var epargneTotal=e*j;var total=m+epargneTotal;var jr=Math.round(total/j);document.getElementById('vcr-journalier').textContent=new Intl.NumberFormat('fr-FR',{style:'currency',currency:'XOF',maximumFractionDigits:0}).format(jr);var recap=document.getElementById('vcr-recap');if(recap){recap.classList.remove('hidden');document.getElementById('vcr-recap-epargne').textContent=new Intl.NumberFormat('fr-FR',{style:'currency',currency:'XOF',maximumFractionDigits:0}).format(epargneTotal);document.getElementById('vcr-recap-total').textContent=new Intl.NumberFormat('fr-FR',{style:'currency',currency:'XOF',maximumFractionDigits:0}).format(total);}}
function showNewDebiteurModal(){document.getElementById('new-debiteur-modal').classList.remove('hidden');}
function closeNewDebiteurModal(){document.getElementById('new-debiteur-modal').classList.add('hidden');}
function submitNewDebiteur(e){e.preventDefault();apiFetch('/chef-agence/create-debiteur',{method:'POST',body:JSON.stringify({nom:document.getElementById('nd-nom').value,prenom:document.getElementById('nd-prenom').value,telephone:document.getElementById('nd-telephone').value,quartier:document.getElementById('nd-quartier').value,activite:document.getElementById('nd-activite').value})}).then(function(){closeNewDebiteurModal();apiFetch('/debiteurs').then(function(d){document.getElementById('vcr-debiteur').innerHTML='<option value="">-- Debiteur --</option>'+d.map(function(x){return '<option value="'+x.uuid+'">'+x.nom+' '+(x.prenom||'')+'</option>';}).join('');});});}
function submitVenteCredit(e){e.preventDefault();var motifEl=document.getElementById('vcr-motif');var data={debiteur_id:document.getElementById('vcr-debiteur').value,produit_id:document.getElementById('vcr-produit').value||null,montant:parseFloat(document.getElementById('vcr-montant').value),epargne_par_jour:parseFloat(document.getElementById('vcr-epargne').value)||300,jours:parseInt(document.getElementById('vcr-jours').value),penalite_par_jour:parseFloat(document.getElementById('vcr-penalite').value)||1000,motif_derogation:motifEl?motifEl.value.trim():'',produits:(typeof vcrPanier!=='undefined'&&vcrPanier.length>0)?vcrPanier.map(function(p){return {produit_id:p.produit_id,quantite:1};}):null};apiFetch('/chef-agence/vente-credit',{method:'POST',body:JSON.stringify(data)}).then(function(r){if(r.error){afficherErreur(r.error, document.getElementById('vcr-debiteur').value);return;}closeVenteCreditModal();loadPage('agent-space');if(r.success){closeVenteCreditModal();window.venteEnCours = {vente_id: r.vente_id || r.uuid, journalier: r.journalier || r.montant_journalier};
var confElem = document.getElementById('conf-journalier');
if (confElem) confElem.textContent = new Intl.NumberFormat('fr-FR',{style:'currency',currency:'XOF',maximumFractionDigits:0}).format(window.venteEnCours.journalier);
var modalElem = document.getElementById('confirmation-vente-modal');
if (modalElem) modalElem.classList.remove('hidden');}});}


function genererContrat(uuid) {
    apiFetch('/ventes/' + uuid + '/contrat').then(function(r) {
        if (!r.success) return showAlert('Une erreur est survenue. Veuillez réessayer.');
        var c = r.contrat;
        var html = '<html><head><meta charset="utf-8"><title>Contrat ' + c.numero + '</title><style>body{font-family:sans-serif;max-width:700px;margin:40px auto;padding:20px;line-height:1.6}h1{text-align:center;color:#0066ff}h2{color:#333}table{width:100%;border-collapse:collapse;margin:20px 0}td,th{border:1px solid #ddd;padding:8px;text-align:left}th{background:#f5f5f5}.signature{margin-top:60px;display:flex;justify-content:space-between}.signature div{width:200px;border-top:1px solid #000;padding-top:5px;text-align:center}</style></head><body><h1>SOUROUGNON</h1><h2>Contrat de Vente a Credit N°' + c.numero + '</h2><p>Date : ' + c.date + '</p><table><tr><th>Debiteur</th><td>' + c.debiteur_nom + '</td></tr><tr><th>Telephone</th><td>' + c.debiteur_tel + '</td></tr><tr><th>Quartier</th><td>' + c.debiteur_quartier + '</td></tr><tr><th>Produit</th><td>' + (c.produit || 'Non specifie') + '</td></tr><tr><th>Prix de vente</th><td>' + new Intl.NumberFormat("fr-FR",{style:"currency",currency:"XOF"}).format(c.prix_vente) + '</td></tr><tr><th>Epargne/jour</th><td>' + new Intl.NumberFormat("fr-FR",{style:"currency",currency:"XOF"}).format(c.epargne_par_jour) + '</td></tr><tr><th>Epargne totale</th><td>' + new Intl.NumberFormat("fr-FR",{style:"currency",currency:"XOF"}).format(c.epargne_total) + '</td></tr><tr><th>Total a rembourser</th><td><strong>' + new Intl.NumberFormat("fr-FR",{style:"currency",currency:"XOF"}).format(c.montant_total) + '</strong></td></tr><tr><th>Journalier</th><td><strong>' + new Intl.NumberFormat("fr-FR",{style:"currency",currency:"XOF"}).format(c.montant_journalier) + '</strong></td></tr><tr><th>Duree</th><td>' + c.nombre_jours + ' jours</td></tr><tr><th>Penalite/jour</th><td>' + new Intl.NumberFormat("fr-FR",{style:"currency",currency:"XOF"}).format(c.penalite_par_jour) + '</td></tr><tr><th>Date fin</th><td>' + c.date_fin + '</td></tr><tr><th>Agent</th><td>' + c.agent_nom + '</td></tr></table><div class="signature"><div>La Gerante</div><div>Le Client<br>(lu et approuve)</div></div></body></html>';
        var w = window.open('', '_blank');
        w.document.write(html);
        w.document.close();
        setTimeout(function() { w.print(); }, 500);
    });
}


function onDebiteurChangeCredit() {
    var debiteurId = document.getElementById('vcr-debiteur').value;
    var scoreBadge = document.getElementById('vcr-score-badge');
    var motifField = document.getElementById('vcr-motif');
    
    if (!debiteurId) {
        if (scoreBadge) scoreBadge.innerHTML = '';
        if (motifField) motifField.required = false;
        return;
    }
    
    apiFetch('/debiteurs/' + debiteurId + '/score').then(function(r) {
        if (scoreBadge && r.score !== undefined) {
            var color = r.score >= 80 ? '#00c853' : r.score >= 60 ? '#0066ff' : r.score >= 40 ? '#f59e0b' : '#ef4444';
            scoreBadge.innerHTML = '<span class="badge" style="background:'+color+'20;color:'+color+';font-weight:bold;font-size:12px;padding:4px 8px;border-radius:6px;display:inline-block;">Score: ' + r.score + '% (' + (r.label || '') + ')</span>';
            
            // Si le score est < 40, le motif devient obligatoire
            if (motifField) {
                if (r.score < 40) {
                    motifField.required = true;
                    motifField.placeholder = 'MOTIF OBLIGATOIRE - Score insuffisant (' + r.score + '%)';
                    motifField.classList.add('border-red-500');
                } else {
                    motifField.required = false;
                    motifField.placeholder = 'Ex: Client fidèle, situation exceptionnelle...';
                    motifField.classList.remove('border-red-500');
                }
            }
        }
    }).catch(function() {
        if (scoreBadge) scoreBadge.innerHTML = '';
    });
}

function fermerConfirmationVente() {
    var modalElem = document.getElementById('confirmation-vente-modal');
    if (modalElem) modalElem.classList.add('hidden');
    window.venteEnCours = null;
    if (typeof loadDashboard === 'function') loadDashboard();
    else if (typeof loadPage === 'function') loadPage('chef-agence');
}

function telechargerContratDirect() {
    if (!window.venteEnCours || !window.venteEnCours.vente_id) return;
    var venteId = window.venteEnCours.vente_id;
    apiFetch('/ventes/' + venteId + '/contrat').then(function(r) {
        if (!r || !r.success) return;
        var c = r.contrat;
        var html = '<html><head><meta charset="utf-8"><title>Contrat ' + c.numero + '</title><style>body{font-family:sans-serif;max-width:700px;margin:40px auto;padding:20px;line-height:1.6}h1{text-align:center;color:#059669}h2{color:#333}table{width:100%;border-collapse:collapse;margin:20px 0}td,th{border:1px solid #ddd;padding:8px;text-align:left}th{background:#f8fafc}.signature{margin-top:60px;display:flex;justify-content:space-between}.signature div{width:200px;border-top:1px solid #000;padding-top:5px;text-align:center}</style></head><body><h1>SOUROUGNON</h1><h2>Contrat de Vente à Crédit N°' + c.numero + '</h2><p>Date : ' + c.date + '</p><table><tr><th>Débiteurs</th><td>' + c.debiteur_nom + '</td></tr><tr><th>Téléphone</th><td>' + c.debiteur_tel + '</td></tr><tr><th>Quartier</th><td>' + c.debiteur_quartier + '</td></tr><tr><th>Produit</th><td>' + (c.produit || 'Non spécifié') + '</td></tr><tr><th>Total à rembourser</th><td><strong>' + new Intl.NumberFormat("fr-FR",{style:"currency",currency:"XOF"}).format(c.montant_total) + '</strong></td></tr><tr><th>Journalier</th><td><strong>' + new Intl.NumberFormat("fr-FR",{style:"currency",currency:"XOF"}).format(c.montant_journalier) + '</strong></td></tr><tr><th>Durée</th><td>' + c.nombre_jours + ' jours</td></tr><tr><th>Date fin</th><td>' + c.date_fin + '</td></tr></table><div class="signature"><div>La Gérante</div><div>Le Client<br>(lu et approuvé)</div></div></body></html>';
        var blob = new Blob([html], {type: 'text/html'});
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = 'Contrat_' + c.numero + '.html';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        fermerConfirmationVente();
    });
}

function afficherErreur(message, debiteurId){
    var msgEl=document.getElementById('erreur-message');
    if(msgEl)msgEl.textContent=message;
    var actionsEl=document.getElementById('erreur-actions');
    if(actionsEl)actionsEl.innerHTML='';
    
    // Détecter le cas "crédit en cours" pour proposer l'augmentation directe
    if(message.indexOf('crédit(s) en cours') > -1 || message.indexOf('credit(s) en cours') > -1){
        var maxMatch = message.match(/maximum autorisé : (\d+)/);
        var currentMatch = message.match(/déjà (\d+) crédit/);
        var debiteur = debiteurId || window.debiteurSelectionne || document.getElementById('vcr-debiteur')?.value;
        
        if(actionsEl && debiteur){
            var nouveauMax = maxMatch ? parseInt(maxMatch[1]) + 1 : 2;
            actionsEl.innerHTML = '<button onclick="augmenterCreditsAutorises(\''+debiteur+'\','+nouveauMax+')" class="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold transition-colors mb-2">✅ Autoriser '+nouveauMax+' crédits maintenant</button>';
        }
    }
    
    var modalEl=document.getElementById('erreur-modal');
    if(modalEl)modalEl.classList.remove('hidden');
}

function augmenterCreditsAutorises(debiteurId, nouveauNombre){
    apiFetch('/debiteurs/'+debiteurId, {method:'PUT', body:JSON.stringify({credits_autorises:nouveauNombre})}).then(function(r){
        if(r.success){
            fermerErreurModal();
            // Recharger la page des débiteurs ou rester sur la vente
            if(typeof loadPage === 'function') loadPage('debiteurs');
        } else {
            afficherErreur('Impossible d\'augmenter les crédits. Essayez via la fiche débiteur.');
        }
    });
}
function fermerErreurModal(){var modalEl=document.getElementById('erreur-modal');if(modalEl)modalEl.classList.add('hidden');}


var vcrPanier = [];

function ajouterAuPanier() {
    var select = document.getElementById('vcr-produit');
    if (!select || !select.value) return;
    
    var opt = select.options[select.selectedIndex];
    var produitId = select.value;
    var nom = opt.text.split(' - ')[0] || 'Produit';
    var prix = parseFloat(opt.getAttribute('data-prix')) || 0;
    
    vcrPanier.push({produit_id: produitId, nom: nom, prix: prix});
    renderPanierUI();
}

function retirerDuPanier(index) {
    vcrPanier.splice(index, 1);
    renderPanierUI();
}

function renderPanierUI() {
    var itemsEl = document.getElementById('vcr-panier-items');
    var countEl = document.getElementById('vcr-panier-count');
    if (countEl) countEl.textContent = vcrPanier.length;
    if (!itemsEl) return;
    
    if (vcrPanier.length === 0) {
        itemsEl.innerHTML = '<p class="text-xs text-slate-400 italic">Aucun produit dans le panier</p>';
        document.getElementById('vcr-montant').value = '';
        document.getElementById('vcr-prix-vente').value = '';
        if (typeof calculerJournalier === 'function') calculerJournalier();
        return;
    }
    
    var total = vcrPanier.reduce(function(sum, item) { return sum + item.prix; }, 0);
    
    itemsEl.innerHTML = vcrPanier.map(function(item, idx) {
        return '<div class="flex justify-between items-center p-2 bg-white border border-slate-200 rounded-lg text-xs shadow-sm">' +
               '<span class="font-medium text-slate-800">' + item.nom + '</span>' +
               '<div class="flex items-center gap-2">' +
               '<span class="font-bold">' + new Intl.NumberFormat('fr-FR', {style: 'currency', currency: 'XOF'}).format(item.prix) + '</span>' +
               '<button type="button" onclick="retirerDuPanier(' + idx + ')" class="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded font-semibold text-xs">✕ Retirer</button>' +
               '</div></div>';
    }).join('');
    
    document.getElementById('vcr-montant').value = total;
    document.getElementById('vcr-prix-vente').value = total;
    if (typeof calculerJournalier === 'function') calculerJournalier();
}
