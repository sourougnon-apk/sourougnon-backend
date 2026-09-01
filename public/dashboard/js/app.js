console.log('JS chargé');

var API_BASE = '/api';
var authToken = '';
var currentUser = {};
var dashboardChart = null;
var currentDeleteAgentUuid = null;
var currentPasswordAgentUuid = null;

try { authToken = localStorage.getItem('sourougnon_token') || ''; } catch (e) {}
try { var b = localStorage.getItem('sourougnon_user'); currentUser = b ? JSON.parse(b) : {}; } catch (e) { localStorage.removeItem('sourougnon_user'); currentUser = {}; }
if (!authToken) window.location.href = '/dashboard/login.html';

document.addEventListener('DOMContentLoaded', function () {
    function S(id, v) { var e = document.getElementById(id); if (e) e.textContent = v; }
    if (currentUser && currentUser.nom) {
        S('user-name', currentUser.nom);
        S('user-initials', (currentUser.prenom || currentUser.nom).charAt(0).toUpperCase());
        var g = document.getElementById('greeting'); if (g) g.innerHTML = 'Bonjour ' + (currentUser.prenom || currentUser.nom);
    }
    S('current-date', new Date().toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }));
    var nav = document.querySelectorAll('.nav-item');
    nav.forEach(function (item) {
        item.addEventListener('click', function (e) {
            e.preventDefault();
            nav.forEach(function (n) { n.classList.remove('active'); });
            item.classList.add('active');
            loadPage(item.getAttribute('data-page'));
            if (window.innerWidth < 1024) toggleSidebar();
        });
    });
    loadPage('dashboard');
});

function toggleSidebar() { var s = document.getElementById('sidebar'); var o = document.getElementById('sidebar-overlay'); if (s) s.classList.toggle('-translate-x-full'); if (o) o.classList.toggle('hidden'); }

function apiFetch(endpoint, options) {
    options = options || {};
    options.headers = Object.assign({
        'Authorization': 'Bearer ' + authToken,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
    }, options.headers || {});

    if (options.body && typeof options.body === 'object') {
        options.body = JSON.stringify(options.body);
    }

    return fetch(API_BASE + endpoint, options).then(function (r) {
        if (r.status === 401) {
            localStorage.clear();
            window.location.href = '/dashboard/login.html';
            return Promise.reject(new Error('Session expirée'));
        }
        return r.text().then(function (txt) {
            var data;
            try { data = txt ? JSON.parse(txt) : {}; }
            catch (e) {
                console.error('Réponse non-JSON', r.status, txt.slice(0, 500));
                return Promise.reject(new Error('Erreur serveur ' + r.status));
            }
            if (!r.ok) {
                var msg = data.message || data.error ||
                    (data.errors ? Object.values(data.errors).flat().join('\n') : 'Erreur ' + r.status);
                return Promise.reject(Object.assign(new Error(msg), {status: r.status, data: data}));
            }
            return data;
        });
    });
}



async function apiDownload(endpoint, filename) {
    try {
        const res = await fetch(API_BASE + endpoint, {
            headers: {'Authorization': 'Bearer ' + authToken}
        });
        if (!res.ok) throw new Error('Erreur ' + res.status);
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
    } catch (e) {
        showAlert('Erreur export : ' + e.message);
    }
}
function showAlert(message) {
    return new Promise(function(resolve) {
        var overlay = document.createElement('div');
        overlay.className = 'fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4';
        overlay.innerHTML = '<div class="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl"><p class="text-slate-800 text-sm mb-4"></p><button class="w-full py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold">OK</button></div>';
        document.body.appendChild(overlay);
        overlay.querySelector('p').textContent = message;
        overlay.querySelector('button').onclick = function(){ overlay.remove(); resolve(); };
    });
}


function showPrompt(message, valeurParDefaut) {
    return new Promise(function(resolve) {
        var overlay = document.createElement('div');
        overlay.className = 'fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4';
        overlay.innerHTML = '<div class="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl"><p class="text-slate-800 text-sm mb-4"></p><input type="text" class="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm mb-4" /><div class="flex gap-2"><button data-act="cancel" class="flex-1 py-2.5 bg-slate-200 text-slate-700 rounded-xl text-sm font-semibold">Annuler</button><button data-act="ok" class="flex-1 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold">Valider</button></div></div>';
        document.body.appendChild(overlay);
        overlay.querySelector('p').textContent = message;
        var input = overlay.querySelector('input');
        input.value = valeurParDefaut || '';
        function close(val) { overlay.remove(); resolve(val); }
        overlay.querySelector('[data-act="cancel"]').onclick = function(){ close(null); };
        overlay.querySelector('[data-act="ok"]').onclick = function(){ close(input.value); };
    });
}
function showConfirm(message) {
    return new Promise(function(resolve) {
        var overlay = document.createElement('div');
        overlay.className = 'fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4';
        overlay.innerHTML = '<div class="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl"><p class="text-slate-800 text-sm mb-4"></p><div class="flex gap-2"><button data-act="cancel" class="flex-1 py-2.5 bg-slate-200 text-slate-700 rounded-xl text-sm font-semibold">Annuler</button><button data-act="ok" class="flex-1 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold">Confirmer</button></div></div>';
        document.body.appendChild(overlay);
        overlay.querySelector('p').textContent = message;
        function close(val) { overlay.remove(); resolve(val); }
        overlay.querySelector('[data-act="cancel"]').onclick = function(){ close(false); };
        overlay.querySelector('[data-act="ok"]').onclick = function(){ close(true); };
    });
}
function confirmLogout() { document.getElementById('logout-modal').classList.remove('hidden'); }
function cancelLogout() { document.getElementById('logout-modal').classList.add('hidden'); }
function logout() { document.getElementById('logout-modal').classList.add('hidden'); fetch(API_BASE + '/auth/logout', { method: 'POST', headers: { 'Authorization': 'Bearer ' + authToken } }).finally(function () { localStorage.clear(); window.location.href = '/dashboard/login.html'; }); }

function loadPage(page) {
    var c = document.getElementById('page-content');
    c.innerHTML = '<div style="text-align:center;padding:60px;"><div style="width:32px;height:32px;border:3px solid #e2e8f0;border-top-color:#0066ff;border-radius:50%;animation:spin 0.8s linear infinite;margin:0 auto;"></div></div>';
    var funcs = {
        'dashboard': loadDashboard,
        'chef-agence': loadChefAgence,
        'agents': loadAgents,
        'debiteurs': loadDebiteurs,
        'suivi': loadSuivi,
        'caisse': loadCaisse,
        'comptabilite': loadComptabilite,
        'remboursements': loadRemboursements,
        'stocks': loadStocks,
        'produits': loadProduits,
        'ventes': loadVentes,
        'comptant': loadComptant,
        'alertes': loadAlertes,
        'parametres': loadParametres,
        'statistiques': loadStatistiques,
        'notifications': loadNotificationsPage,
        'tournees': loadTournees,
        'epargnes': loadEpargnes,
        'penalites': loadPenalites,
        'rapports': loadRapports
    };
    if (funcs[page]) funcs[page](c);
    else c.innerHTML = '<div class="panel text-center py-12"><p class="text-muted">Page inconnue: ' + page + '</p></div>';
}

var style = document.createElement('style');
style.textContent = '@keyframes spin{to{transform:rotate(360deg)}}.chart-wrap{position:relative;width:100%;height:300px}.chart-wrap canvas{width:100%!important;height:100%!important}.kpi-card .kpi-value{font-size:0.9rem;white-space:normal;word-break:break-word;}.kpi-card{padding:0.75rem;}.kpi-card .kpi-label{font-size:0.6rem;}';
document.head.appendChild(style);
console.log('app.js pret');


function confirmModal(message, opts) {
    opts = opts || {};
    return new Promise(function(resolve) {
        var el = document.createElement('div');
        el.className = 'fixed inset-0 z-50 flex items-center justify-center bg-black/50';
        el.innerHTML =
            '<div class="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl">' +
            '<p class="text-sm mb-4"></p>' +
            '<div class="flex gap-2">' +
            '<button data-act="cancel" class="flex-1 px-4 py-2 bg-slate-200 rounded-xl text-sm font-semibold">Annuler</button>' +
            '<button data-act="ok" class="flex-1 px-4 py-2 ' + (opts.danger === false ? 'bg-blue-600' : 'bg-red-600') + ' text-white rounded-xl text-sm font-semibold">Confirmer</button>' +
            '</div></div>';
        el.querySelector('p').textContent = message;
        function close(v) { el.remove(); document.removeEventListener('keydown', onKey); resolve(v); }
        function onKey(e) { if (e.key === 'Escape') close(false); }
        el.addEventListener('click', function(e) {
            var a = e.target.getAttribute && e.target.getAttribute('data-act');
            if (a) close(a === 'ok');
            else if (e.target === el) close(false);
        });
        document.addEventListener('keydown', onKey);
        document.body.appendChild(el);
        el.querySelector('[data-act="ok"]').focus();
    });
}
