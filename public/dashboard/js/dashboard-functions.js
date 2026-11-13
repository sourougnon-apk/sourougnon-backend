/* Dashboard Gérante : vue Groupe (toutes les agences), filtre agence et période. */
var gxEtat = { agence: '', preset: '7j', requete: 0, graphique: null, reprise: false };
try {
    var gxSauve = JSON.parse(localStorage.getItem('gx_filtres') || '{}');
    if (gxSauve.preset) gxEtat.preset = gxSauve.preset;
    if (gxSauve.agence) gxEtat.agence = String(gxSauve.agence);
} catch (e) {}

var GX_PRESETS = [['jour', 'Aujourd’hui'], ['7j', '7 jours'], ['30j', '30 jours'], ['mois', 'Ce mois']];

var GX_ICO = {
    wallet: '<svg viewBox="0 0 24 24"><path d="M20 12V8H6a2 2 0 0 1 0-4h12v4"/><path d="M4 6v12a2 2 0 0 0 2 2h14v-4"/><path d="M18 12a2 2 0 0 0 0 4h4v-4z"/></svg>',
    percent: '<svg viewBox="0 0 24 24"><line x1="19" y1="5" x2="5" y2="19"/><circle cx="6.5" cy="6.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/></svg>',
    file: '<svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="8" y1="13" x2="16" y2="13"/><line x1="8" y1="17" x2="14" y2="17"/></svg>',
    alert: '<svg viewBox="0 0 24 24"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
    refresh: '<svg viewBox="0 0 24 24"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>'
};

function gxEsc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
        return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
}
function gxNb(v) { return new Intl.NumberFormat('fr-FR').format(Math.round(Number(v) || 0)); }
function gxMontant(v) { return '<span class="gx-num">' + gxNb(v) + '</span> <small>FCFA</small>'; }
function gxPct(v) { return new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 1 }).format(v) + ' %'; }
function gxIso(d) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
function gxFr(iso) { return iso.slice(8, 10) + '/' + iso.slice(5, 7); }
function gxPluriel(n, mot) { return n + ' ' + mot + (n > 1 ? 's' : ''); }
function gxSauver() { try { localStorage.setItem('gx_filtres', JSON.stringify({ preset: gxEtat.preset, agence: gxEtat.agence })); } catch (e) {} }

function gxPeriode(p) {
    var fin = new Date(), debut = new Date();
    if (p === '7j') debut.setDate(debut.getDate() - 6);
    else if (p === '30j') debut.setDate(debut.getDate() - 29);
    else if (p === 'mois') debut = new Date(fin.getFullYear(), fin.getMonth(), 1);
    return { debut: gxIso(debut), fin: gxIso(fin) };
}

function gxDelta(v, pts) {
    if (v === null || v === undefined) return '';
    var cls = v > 0 ? 'up' : (v < 0 ? 'down' : 'flat');
    var f = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 1 }).format(Math.abs(v));
    return '<span class="gx-delta ' + cls + '" title="Par rapport à la période précédente">' +
        (v > 0 ? '▲ ' : (v < 0 ? '▼ ' : '= ')) + f + (pts ? ' pt' : ' %') + '</span>';
}

function gxCarte(o) {
    return '<div class="gx-kpi ' + (o.cls || '') + '">' +
        '<div class="gx-kpi-top"><span class="gx-kpi-label">' + o.titre + '</span>' +
        (o.icone ? '<span class="gx-kpi-ico ' + o.teinte + '">' + o.icone + '</span>' : '') + '</div>' +
        '<div class="gx-kpi-value">' + o.valeur + '</div>' +
        (o.barre !== undefined ? '<div class="gx-bar"><span class="' + o.barreCls + '" style="width:' + o.barre + '%"></span></div>' : '') +
        '<div class="gx-kpi-sub">' + (o.delta || '') + (o.sous ? '<span>' + o.sous + '</span>' : '') + '</div></div>';
}

function loadDashboard(c) {
    if (gxEtat.graphique) { gxEtat.graphique.destroy(); gxEtat.graphique = null; }
    c.innerHTML =
        '<div class="gx fade-in">' +
        '<div class="gx-head"><div class="gx-title"><h3>Tableau de bord du Groupe</h3><p id="gx-sub">Chargement…</p></div>' +
        '<div class="gx-filters">' +
        '<label class="gx-field"><span>Agence</span><select id="gx-agence"><option value="">Toutes les agences</option></select></label>' +
        '<div class="gx-seg" id="gx-seg">' + GX_PRESETS.map(function (p) {
            return '<button type="button" data-p="' + p[0] + '"' + (p[0] === gxEtat.preset ? ' class="on"' : '') + '>' + p[1] + '</button>';
        }).join('') + '</div>' +
        '<button type="button" class="gx-btn" id="gx-refresh" title="Actualiser">' + GX_ICO.refresh + '<span>Actualiser</span></button>' +
        '</div></div><div id="gx-body"></div></div>';

    document.getElementById('gx-agence').addEventListener('change', function () {
        gxEtat.agence = this.value; gxSauver(); gxCharger();
    });
    document.getElementById('gx-seg').addEventListener('click', function (e) {
        var b = e.target.closest('button[data-p]');
        if (!b) return;
        gxEtat.preset = b.getAttribute('data-p');
        Array.prototype.forEach.call(this.querySelectorAll('button'), function (x) { x.classList.toggle('on', x === b); });
        gxSauver(); gxCharger();
    });
    document.getElementById('gx-refresh').addEventListener('click', function () { gxCharger(); });
    document.getElementById('gx-body').addEventListener('click', function (e) {
        var r = e.target.closest('[data-agence]');
        if (r) gxChoisir(r.getAttribute('data-agence'));
    });
    gxCharger();
}

function gxChoisir(id) {
    var s = document.getElementById('gx-agence');
    gxEtat.agence = String(id);
    if (s) s.value = gxEtat.agence;
    gxSauver(); gxCharger();
}

function gxSquelette() {
    var h = '<div class="gx-kpis gx-kpis-1">', i;
    for (i = 0; i < 4; i++) h += '<div class="gx-skel" style="height:128px"></div>';
    h += '</div><div class="gx-kpis gx-kpis-2" style="margin-top:1.25rem">';
    for (i = 0; i < 6; i++) h += '<div class="gx-skel" style="height:92px"></div>';
    return h + '</div><div class="gx-skel" style="height:360px;margin-top:1.25rem"></div>';
}

function gxCharger() {
    if (!document.getElementById('gx-body')) return;
    var n = ++gxEtat.requete;
    if (gxEtat.graphique) { gxEtat.graphique.destroy(); gxEtat.graphique = null; }
    document.getElementById('gx-body').innerHTML = gxSquelette();
    var p = gxPeriode(gxEtat.preset);
    var q = '?debut=' + p.debut + '&fin=' + p.fin + (gxEtat.agence ? '&agence_id=' + encodeURIComponent(gxEtat.agence) : '');
    apiFetch('/dashboard/groupe' + q).then(function (d) {
        if (n !== gxEtat.requete || !document.getElementById('gx-body')) return;
        gxEtat.reprise = false;
        gxRendre(d);
    }).catch(function (err) {
        if (n !== gxEtat.requete || !document.getElementById('gx-body')) return;
        if (err && err.status === 422 && gxEtat.agence && !gxEtat.reprise) {
            gxEtat.reprise = true; gxEtat.agence = ''; gxSauver();
            var s = document.getElementById('gx-agence'); if (s) s.value = '';
            return gxCharger();
        }
        document.getElementById('gx-body').innerHTML =
            '<div class="gx-panel gx-erreur"><p>Le tableau de bord n’a pas pu être chargé.' +
            (err && err.message ? '<br><small>' + gxEsc(err.message) + '</small>' : '') +
            '</p><button type="button" class="gx-btn" onclick="gxCharger()">' + GX_ICO.refresh + '<span>Réessayer</span></button></div>';
    });
}

function gxMajAgences(liste) {
    var s = document.getElementById('gx-agence');
    if (!s) return;
    var sig = liste.map(function (a) { return a.id + ':' + a.nom + ':' + a.actif; }).join('|');
    if (s.getAttribute('data-sig') !== sig) {
        s.innerHTML = '<option value="">Toutes les agences</option>' + liste.map(function (a) {
            return '<option value="' + a.id + '">' + gxEsc(a.nom) + (a.actif ? '' : ' (inactive)') + '</option>';
        }).join('');
        s.setAttribute('data-sig', sig);
    }
    s.value = gxEtat.agence;
    if (s.value !== gxEtat.agence) { gxEtat.agence = s.value; gxSauver(); }
}

function gxRendre(d) {
    var k = d.kpis, m = d.meta;
    gxMajAgences(d.agences_liste || []);

    var lib = m.debut === m.fin
        ? (m.fin === gxIso(new Date()) ? 'aujourd’hui' : 'le ' + gxFr(m.fin))
        : 'du ' + gxFr(m.debut) + ' au ' + gxFr(m.fin);
    var heure = new Date(m.genere_le).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    document.getElementById('gx-sub').textContent = (m.agence_nom || 'Toutes les agences') + ' · ' + lib + ' · mis à jour à ' + heure;

    var tx = k.taux, txCls = tx.valeur === null ? '' : (tx.valeur >= 80 ? 'ok' : (tx.valeur >= 50 ? 'mid' : 'low'));
    var rt = k.retard;

    var h = '<div class="gx-kpis gx-kpis-1">' +
        gxCarte({ titre: 'Encaissé', teinte: 'gx-ico-blue', icone: GX_ICO.wallet, valeur: gxMontant(k.encaisse.valeur), delta: gxDelta(k.encaisse.variation), sous: 'encaissements validés' }) +
        gxCarte({
            titre: 'Taux de recouvrement', teinte: 'gx-ico-green', icone: GX_ICO.percent,
            valeur: tx.valeur === null ? '—' : gxPct(tx.valeur),
            barre: tx.valeur === null ? undefined : tx.valeur, barreCls: txCls,
            delta: gxDelta(tx.variation_pts, true),
            sous: tx.valeur === null ? 'aucune échéance sur la période' : gxNb(tx.regle) + ' réglés sur ' + gxNb(tx.attendu)
        }) +
        gxCarte({ titre: 'Créances', teinte: 'gx-ico-amber', icone: GX_ICO.file, valeur: gxMontant(k.creances.valeur), sous: gxPluriel(k.creances.ventes, 'vente') + ' en cours · ' + gxPluriel(k.creances.debiteurs, 'débiteur') }) +
        gxCarte({
            titre: 'En retard', teinte: 'gx-ico-red', icone: GX_ICO.alert, cls: rt.montant > 0 ? 'is-alert' : '',
            valeur: gxMontant(rt.montant),
            sous: rt.montant > 0 ? gxPluriel(rt.debiteurs, 'débiteur') + ' · ' + gxPluriel(rt.dossiers, 'dossier') : 'aucun retard'
        }) + '</div>';

    h += '<div class="gx-kpis gx-kpis-2">' +
        gxCarte({ titre: 'Attendu', valeur: gxMontant(k.attendu.valeur), delta: gxDelta(k.attendu.variation), sous: 'échéances de la période' }) +
        gxCarte({ titre: 'Ventes (hors épargne)', valeur: gxMontant(k.ventes.volume), delta: gxDelta(k.ventes.variation), sous: gxPluriel(k.ventes.nombre, 'vente') }) +
        gxCarte({ titre: 'Épargne collectée', valeur: gxMontant(k.epargne.valeur), delta: gxDelta(k.epargne.variation) }) +
        gxCarte({ titre: 'Pénalités encaissées', valeur: gxMontant(k.penalites.valeur), delta: gxDelta(k.penalites.variation) }) +
        gxCarte({
            titre: 'À valider', cls: k.a_valider.montant > 0 || k.a_valider.remises > 0 ? 'is-warn' : '',
            valeur: gxMontant(k.a_valider.montant),
            sous: gxPluriel(k.a_valider.nombre, 'mouvement') + (k.a_valider.remises ? ' · ' + gxPluriel(k.a_valider.remises, 'remise') : '')
        }) +
        gxCarte({ titre: 'Stocks faibles', cls: k.stocks_faibles > 0 ? 'is-warn' : '', valeur: '<span class="gx-num">' + k.stocks_faibles + '</span>', sous: 'produit(s) sous le seuil' + (m.agence_id ? ' · vue Groupe' : '') }) +
        '</div>';

    h += '<div class="gx-panel"><div class="gx-panel-head"><h3>Encaissé, attendu et impayés</h3><span class="gx-hint">du ' +
        gxFr(d.serie.debut) + ' au ' + gxFr(d.serie.fin) + '</span></div><div class="gx-chart"><canvas id="gx-canvas"></canvas></div></div>';

    if (!m.agence_id) h += gxTableAgences(d.agences);
    h += '<div class="gx-cols">' + gxPanelRetard(d) + gxPanelAgents(d.top_agents) + '</div>';
    h += gxPanelProduits(d.produits);

    document.getElementById('gx-body').innerHTML = h;
    gxGraphique(d.serie);
}

function gxGraphique(s) {
    var ctx = document.getElementById('gx-canvas');
    if (!ctx || typeof Chart === 'undefined') return;
    var compact = new Intl.NumberFormat('fr-FR', { notation: 'compact', maximumFractionDigits: 1 });
    gxEtat.graphique = new Chart(ctx, {
        type: 'line',
        data: {
            labels: s.labels,
            datasets: [
                { label: 'Encaissé', data: s.encaisse, borderColor: '#0066ff', backgroundColor: 'rgba(0,102,255,.10)', fill: true, tension: .35, borderWidth: 2, pointRadius: s.labels.length > 16 ? 0 : 3 },
                { label: 'Attendu', data: s.attendu, borderColor: '#94a3b8', borderDash: [6, 4], fill: false, tension: .35, borderWidth: 2, pointRadius: 0 },
                { label: 'Impayé', data: s.impaye, borderColor: '#ef4444', backgroundColor: 'rgba(239,68,68,.08)', fill: true, tension: .35, borderWidth: 2, pointRadius: 0 }
            ]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            plugins: {
                legend: { position: 'bottom', labels: { usePointStyle: true, boxWidth: 8 } },
                tooltip: { callbacks: { label: function (c) { return ' ' + c.dataset.label + ' : ' + gxNb(c.parsed.y) + ' FCFA'; } } }
            },
            scales: {
                y: { beginAtZero: true, ticks: { callback: function (v) { return compact.format(v); } } },
                x: { grid: { display: false } }
            }
        }
    });
}

function gxTableAgences(rows) {
    if (!rows.length) return '';
    var lignes = rows.map(function (a) {
        var cls = a.taux === null ? '' : (a.taux >= 80 ? 'ok' : (a.taux >= 50 ? 'mid' : 'low'));
        return '<tr' + (a.id ? ' class="gx-click" data-agence="' + a.id + '"' : '') + '>' +
            '<td data-label="Rang"><span class="gx-rang">' + a.rang + '</span></td>' +
            '<td data-label="Agence"><div><strong>' + gxEsc(a.nom) + '</strong>' + (a.actif ? '' : ' <span class="gx-badge off">Inactive</span>') +
            '<small>' + (a.chef ? 'Chef : ' + gxEsc(a.chef) : 'Aucun chef affecté') + '</small></div></td>' +
            '<td data-label="Agents" class="r">' + a.agents + '</td>' +
            '<td data-label="Encaissé" class="r">' + gxMontant(a.encaisse) + '</td>' +
            '<td data-label="Taux">' + (a.taux === null ? '<span class="gx-mut">—</span>' :
                '<div class="gx-taux"><div class="gx-bar"><span class="' + cls + '" style="width:' + a.taux + '%"></span></div><b>' + gxPct(a.taux) + '</b></div>') + '</td>' +
            '<td data-label="En retard" class="r">' + (a.retard_montant > 0
                ? '<div><span class="gx-neg">' + gxNb(a.retard_montant) + ' FCFA</span><small>' + gxPluriel(a.retard_debiteurs, 'débiteur') + '</small></div>'
                : '<span class="gx-mut">—</span>') + '</td>' +
            '<td data-label="Créances" class="r">' + gxMontant(a.creances) + '</td></tr>';
    }).join('');
    return '<div class="gx-panel"><div class="gx-panel-head"><h3>Performance par agence</h3><span class="gx-hint">Touchez une agence pour filtrer le tableau de bord</span></div>' +
        '<div class="gx-table-wrap"><table class="gx-table gx-stack"><thead><tr><th>#</th><th>Agence</th><th class="r">Agents</th><th class="r">Encaissé</th><th>Taux</th><th class="r">En retard</th><th class="r">Créances</th></tr></thead><tbody>' +
        lignes + '</tbody></table></div></div>';
}

function gxPanelRetard(d) {
    var l = d.dossiers_retard, tot = d.kpis.retard.dossiers;
    var corps = l.length ? l.map(function (x) {
        var nom = gxEsc(((x.nom || '—') + ' ' + (x.prenom || '')).trim());
        var ag = gxEsc(((x.agent_nom || '—') + ' ' + (x.agent_prenom || '')).trim());
        return '<tr><td data-label="Débiteur"><div><strong>' + nom + '</strong>' + (x.quartier ? '<small>' + gxEsc(x.quartier) + '</small>' : '') + '</div></td>' +
            '<td data-label="Agent"><div>' + ag + (x.agence ? '<small>' + gxEsc(x.agence) + '</small>' : '') + '</div></td>' +
            '<td data-label="Reste dû" class="r">' + gxMontant(x.montant) + '</td>' +
            '<td data-label="Retard" class="r"><span class="gx-badge ' + (x.jours >= 7 ? 'danger' : 'warn') + '">' + x.jours + ' j</span></td></tr>';
    }).join('') : '';
    return '<div class="gx-panel"><div class="gx-panel-head"><h3>Dossiers en retard</h3><span class="gx-hint">' + gxPluriel(tot, 'dossier') +
        (tot > l.length ? ' · les ' + l.length + ' plus anciens affichés' : '') + '</span></div>' +
        (l.length ? '<div class="gx-table-wrap"><table class="gx-table gx-stack"><thead><tr><th>Débiteur</th><th>Agent</th><th class="r">Reste dû</th><th class="r">Retard</th></tr></thead><tbody>' + corps + '</tbody></table></div>'
            : '<div class="gx-vide">Aucun dossier en retard.</div>') + '</div>';
}

function gxPanelAgents(l) {
    var corps = l.map(function (a, i) {
        return '<tr><td data-label="Rang"><span class="gx-rang">' + (i + 1) + '</span></td>' +
            '<td data-label="Agent"><div><strong>' + gxEsc(((a.nom || '') + ' ' + (a.prenom || '')).trim()) + '</strong>' + (a.agence ? '<small>' + gxEsc(a.agence) + '</small>' : '') + '</div></td>' +
            '<td data-label="Encaissé" class="r"><div>' + gxMontant(a.encaisse) + '<small>' + gxPluriel(a.nb, 'encaissement') + '</small></div></td></tr>';
    }).join('');
    return '<div class="gx-panel"><div class="gx-panel-head"><h3>Classement des agents</h3><span class="gx-hint">sur la période</span></div>' +
        (l.length ? '<div class="gx-table-wrap"><table class="gx-table gx-stack"><thead><tr><th>#</th><th>Agent</th><th class="r">Encaissé</th></tr></thead><tbody>' + corps + '</tbody></table></div>'
            : '<div class="gx-vide">Aucun encaissement validé sur la période.</div>') + '</div>';
}

function gxPanelProduits(l) {
    var corps = l.map(function (p) {
        return '<tr><td data-label="Produit"><strong>' + gxEsc(p.nom) + '</strong></td><td data-label="Quantité" class="r">' + gxNb(p.quantite) + '</td><td data-label="Total" class="r">' + gxMontant(p.total) + '</td></tr>';
    }).join('');
    return '<div class="gx-panel"><div class="gx-panel-head"><h3>Produits les plus vendus</h3><span class="gx-hint">sur la période</span></div>' +
        (l.length ? '<div class="gx-table-wrap"><table class="gx-table gx-stack"><thead><tr><th>Produit</th><th class="r">Quantité</th><th class="r">Total</th></tr></thead><tbody>' + corps + '</tbody></table></div>'
            : '<div class="gx-vide">Aucune vente sur la période.</div>') + '</div>';
}
