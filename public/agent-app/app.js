const AgentApp = {
  API: 'https://sourougnon.alwaysdata.net',
  token: localStorage.getItem('agent_token'),
  user: JSON.parse(localStorage.getItem('agent_user') || '{}'),
  tourneeData: JSON.parse(localStorage.getItem('agent_tournee_cache') || 'null'),
  debiteursData: JSON.parse(localStorage.getItem('agent_debiteurs_cache') || '[]'),
  currentTab: 'tous',
  currentVente: null,
  currentClient: null,
  tourneeEnCours: false,
  _submitLock: false,
  _syncing: false,

  async login(identifiant, password) {
    try {
      const res = await fetch(this.API + '/api/auth/login', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({identifiant, password, role: 'agent'})
      });
      const data = await res.json();
      if (data.token) {
        localStorage.setItem('agent_token', data.token);
        localStorage.setItem('agent_user', JSON.stringify(data.user || {}));
        this.token = data.token;
        this.user = data.user || {};
        return {success: true};
      }
      return {error: data.error || 'Erreur de connexion'};
    } catch (e) {
      return {error: 'Réseau indisponible'};
    }
  },

  logout() {
    localStorage.removeItem('agent_token');
    localStorage.removeItem('agent_user');
    localStorage.removeItem('agent_tournee_cache');
    localStorage.removeItem('agent_debiteurs_cache');
    window.location.href = 'login.html';
  },

  async _call(path, options = {}) {
    let res;
    try {
      res = await fetch(this.API + '/api' + path, {
        ...options,
        headers: {
          ...(options.headers || {}),
          'Authorization': 'Bearer ' + (this.token || ''),
          'Accept': 'application/json'
        }
      });
    } catch (e) {
      return { error: 'Hors ligne ou réseau indisponible', networkError: true };
    }

    if (res.status === 401) {
      this.logout();
      return { error: 'Session expirée' };
    }

    try {
      const data = await res.json();
      if (!res.ok) {
        return { error: data.message || data.error || 'Erreur ' + res.status, httpError: res.status };
      }
      return data;
    } catch (e) {
      return { error: 'Réponse invalide du serveur', httpError: res.status };
    }
  },

  async apiGet(path) {
    const data = await this._call(path);
    if (data && !data.error) {
      try { await window.SourougnonDB.setCached(path, data); } catch (e) {}
      return data;
    }
    // Réseau mort ou erreur : tentative cache
    try {
      const cached = await window.SourougnonDB.getCached(path);
      if (cached) return cached;
    } catch (e) {}
    return data;
  },

  apiPost(path, body) {
    return this._call(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
  },

  async apiPostOrQueue(path, body) {
    // Idempotence : générer un sync_uuid unique et stable pour cette opération
    if (!body.sync_uuid) {
      body.sync_uuid = (crypto.randomUUID ? crypto.randomUUID() : 'sync-' + Date.now() + '-' + Math.random().toString(36).slice(2));
    }

    if (navigator.onLine) {
      const res = await this.apiPost(path, body);
      if (!res.networkError) {
        return res;
      }
      // Réseau mort détecté, on retombe dans la file
    }

    try {
      const op = {
        endpoint: path,
        body: body,
        createdAt: new Date().toISOString(),
        synced: false
      };
      const id = await window.SourougnonDB.addPending(op);
      console.log('Opération mise en attente hors ligne:', id, path, body.sync_uuid);
      return { success: true, offline: true, message: 'Opération enregistrée localement. Synchronisation requise.' };
    } catch (e) {
      console.error('Erreur IndexedDB:', e);
      return { error: 'Impossible de sauvegarder hors ligne.' };
    }
  },

  async confirmClearPending() {
    const pending = await window.SourougnonDB.getAllPending();
    if (pending.length === 0) {
      this.ui.showAlert('Aucune opération en attente.');
      return;
    }
    const ok = await this.ui.confirm(`Vider la file d'attente ? (${pending.length} opération(s) seront perdues.)`);
    if (!ok) return;
    await window.SourougnonDB.clearPending();
    this.ui.showAlert('File purgée.');
    await this.loadTournee();
  },

  async syncAll() {
    if (this._syncing) return false;
    if (!navigator.onLine) {
      this.ui.showAlert('Hors ligne. Synchronisation impossible.');
      return false;
    }

    this._syncing = true;
    try {
      const pending = await window.SourougnonDB.getAllPending();
      if (pending.length === 0) {
        this.ui.showAlert('Aucune opération en attente.');
        return true;
      }
      let successCount = 0;
      for (const op of pending) {
        try {
          const res = await this.apiPost(op.endpoint, op.body);
          if (res.error) {
            console.warn('Sync échouée pour', op.endpoint, res.error);
          } else {
            await window.SourougnonDB.deletePending(op.id);
            successCount++;
          }
        } catch (e) {
          console.error('Erreur réseau pendant sync:', e);
          break;
        }
      }
      const remaining = await window.SourougnonDB.getAllPending();
      if (remaining.length === 0) {
        this.ui.showAlert('Synchronisation terminée : ' + successCount + ' opération(s) envoyée(s).');
      } else {
        this.ui.showAlert('Synchronisation partielle : ' + successCount + ' envoyée(s), ' + remaining.length + ' restante(s).');
      }
      await this.loadTournee();
      await this.loadDebiteurs();
      return remaining.length === 0;
    } finally {
      this._syncing = false;
    }
  },

  showHome() { this.showScreen('home'); },

  async cacheDebiteurs(list) {
    try {
      const db = await openDB();
      const tx = db.transaction('debiteurs', 'readwrite');
      const store = tx.objectStore('debiteurs');
      if (!store) return;
      for (const d of list) {
        store.put(d);
      }
    } catch (e) {}
  },

  async getDebiteurLocal(uuid) {
    try {
      const db = await openDB();
      const tx = db.transaction('debiteurs', 'readonly');
      const store = tx.objectStore('debiteurs');
      if (!store) return null;
      const req = store.get(uuid);
      return new Promise((resolve, reject) => {
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => resolve(null);
      });
    } catch (e) { return null; }
  },

  async getAllDebiteursLocal() {
    try {
      const db = await openDB();
      const tx = db.transaction('debiteurs', 'readonly');
      const store = tx.objectStore('debiteurs');
      if (!store) return [];
      const req = store.getAll();
      return new Promise((resolve, reject) => {
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => resolve([]);
      });
    } catch (e) { return []; }
  },


  async init() {
    if (!this.token) { window.location.href = 'login.html'; return; }
    if (this.user.nom) {
      document.getElementById('greeting').textContent = 'Bonjour ' + this.user.nom + ' ' + (this.user.prenom || '') + ' 👋';
      document.getElementById('userInitials').textContent = (this.user.nom?.[0] || 'A') + (this.user.prenom?.[0] || 'G');
    }
    this.setToday();
    await this.preloadAllData();
    await this.loadTournee();
    await this.loadTourneeStatut();
    this.showHome();
  },

  setToday() {
    const now = new Date();
    document.getElementById('todayLabel').textContent = new Intl.DateTimeFormat('fr-FR', {weekday:'long', day:'numeric', month:'long', year:'numeric'}).format(now);
  },

  async loadTourneeStatut() {
    const res = await this.apiGet('/agent/tournee/statut');
    this.tourneeEnCours = res.en_cours || false;
    this.renderTourneeButton();
  },

  renderTourneeButton() {
    const btn = document.getElementById('btnToggleTournee');
    if (!btn) return;
    if (this.tourneeEnCours) {
      btn.textContent = '✓ Terminer la tournée';
      btn.classList.remove('cta--blue');
      btn.classList.add('cta--green');
    } else {
      btn.textContent = '➤ Démarrer la tournée';
      btn.classList.add('cta--blue');
      btn.classList.remove('cta--green');
    }
  },

  async _obtenirPosition() {
    // 1) Essaie via le plugin natif Capacitor (si disponible)
    try {
      if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.Geolocation) {
        const pos = await window.Capacitor.Plugins.Geolocation.getCurrentPosition({
          enableHighAccuracy: true,
          timeout: 8000,
          maximumAge: 60000,
        });
        if (pos && pos.coords && pos.coords.latitude != null && pos.coords.longitude != null) {
          return pos.coords.latitude.toFixed(6) + ',' + pos.coords.longitude.toFixed(6);
        }
      }
    } catch (e) {
      // on continue vers la géolocalisation web
    }

    // 2) Repli sur la géolocalisation web standard
    const position = await new Promise((resolve) => {
      if (!navigator.geolocation) return resolve(null);
      const timeout = setTimeout(() => resolve(null), 8000);
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          clearTimeout(timeout);
          resolve(pos.coords.latitude.toFixed(6) + ',' + pos.coords.longitude.toFixed(6));
        },
        () => {
          clearTimeout(timeout);
          resolve(null);
        },
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 }
      );
    });

    if (position) return position;

    // Fallback manuel si GPS indisponible ou refusé
    const manuel = await (this.ui.prompt ? this.ui.prompt('Coordonnées GPS (latitude, longitude) :', '') : prompt('Coordonnées GPS (latitude, longitude) :', ''));
    if (manuel && /^-?\d+(\.\d+)?\s*,\s*-?\d+(\.\d+)?$/.test(manuel)) {
      return manuel.replace(/\s/g, '');
    }
    return null;
  },

  async toggleTournee() {
    // Si on tente de terminer la tournée, vérifier qu'il ne reste aucune visite à traiter
    if (this.tourneeEnCours) {
      const aVisiter = (this.tourneeData && this.tourneeData.a_visiter) || [];
      if (aVisiter.length > 0) {
        this.ui.showAlert(`Impossible de terminer la tournée : ${aVisiter.length} visite(s) restante(s). Traitez-les d'abord.`);
        return;
      }
    }

    // Obtenir la position GPS (non bloquant)
    const position = await this._obtenirPosition();

    const endpoint = this.tourneeEnCours ? '/agent/tournee/terminer' : '/agent/tournee/demarrer';
    const body = {
      sync_uuid: crypto.randomUUID ? crypto.randomUUID() : 'sync-' + Date.now() + '-' + Math.random().toString(36).slice(2),
    };

    if (this.tourneeEnCours) {
      if (position) body.gps_arrivee = position;
    } else {
      if (position) body.gps_depart = position;
    }

    const res = await this.apiPostOrQueue(endpoint, body);
    if (res.error) { this.ui.showAlert(res.error); return; }
    this.tourneeEnCours = !this.tourneeEnCours;
    this.renderTourneeButton();
    this.ui.showAlert(res.offline ? 'Tournée enregistrée localement. Synchronisation requise.' : (this.tourneeEnCours ? 'Tournée démarrée.' : 'Tournée terminée.'));
  },

  async loadTournee() {
    // Si hors ligne et cache dispo, utiliser le cache
    if (!navigator.onLine && this.tourneeData) {
      this.renderHomeKPIs();
      this.renderHomeList();
      return;
    }
    const d = await this.apiGet('/agent-space/tournee');
    if (d.error) {
      if (this.tourneeData) {
        this.renderHomeKPIs();
        this.renderHomeList();
        this.ui.showAlert('Hors ligne. Affichage de la dernière tournée.');
      } else {
        this.ui.showAlert('Impossible de charger la tournée.');
      }
      return;
    }
    this.tourneeData = d;
    localStorage.setItem('agent_tournee_cache', JSON.stringify(d));
    this.renderHomeKPIs();
    this.renderHomeList();
  },

  async preloadAllData() {
    const res = await this.apiGet('/agent/bootstrap');
    if (!res || res.error) {
      console.warn('Bootstrap indisponible, préchargement classique');
      await this._legacyPreload();
      return;
    }

    const cache = window.SourougnonDB;
    const set = (k, v) => v !== undefined ? cache.setCached(k, v) : Promise.resolve();

    await Promise.all([
      set('/agent-space/tournee', res.tournee),
      set('/agent/debiteurs', res.debiteurs),
      set('/agent/epargnes', res.epargnes),
      set('/agent/penalites', res.penalites),
      set('/agent/tournee/statut', res.statut_tournee),
      set('/notifications', res.notifications),
      set('/auth/me', { user: res.user }),
      set('archives:' + new Date().toISOString().slice(0,7), res.archives_courant),
    ]);

    // Précharger les détails des débiteurs
    if (Array.isArray(res.debiteurs)) {
      for (const d of res.debiteurs) {
        try {
          const detail = await this.apiGet('/agent/debiteurs/' + d.uuid);
          if (!detail.error) {
            await cache.setCached('/agent/debiteurs/' + d.uuid, detail);
          }
        } catch (e) {}
      }
    }
    console.log('✅ Bootstrap préchargé');
  },

  async _legacyPreload() {
    const endpoints = [
      '/agent-space/tournee',
      '/agent/debiteurs',
      '/agent/epargnes',
      '/agent/penalites',
      '/notifications',
      '/agent/tournee/statut',
      '/auth/me',
    ];

    for (const endpoint of endpoints) {
      try {
        const data = await this.apiGet(endpoint);
        if (!data.error) {
          await window.SourougnonDB.setCached(endpoint, data);
        }
      } catch (e) {}
    }
  },

  async loadDebiteurs() {
    if (!navigator.onLine) {
      const cached = await window.SourougnonDB.getCached('/agent/debiteurs');
      if (cached) {
        this.debiteursData = cached;
        return;
      }
    }
    const d = await this.apiGet('/agent/debiteurs');
    if (!d.error) {
      this.debiteursData = d;
      try { await window.SourougnonDB.setCached('/agent/debiteurs', d); } catch(e) {}
    }
  },

  renderHomeKPIs() {
    const d = this.tourneeData || {};
    const stats = d.stats || {};
    const total = stats.nb_total || 0;
    const paye = stats.nb_paye || 0;
    const retards = stats.nb_retard ?? 0;
    const collecte = stats.montant_collecte_aujourdhui || 0;
    const soldeImpaye = stats.solde_impaye || 0;
    const attendu = stats.montant_attendu || 0;
    const montantRetard = stats.montant_retard || 0;
    const score = attendu > 0 ? Math.round((collecte / attendu) * 100) : 0;

    document.getElementById('heroVisits').textContent = total + ' visite(s) planifiée(s)';
    document.getElementById('heroSummary').textContent = (stats.nb_a_visiter || 0) + ' à visiter • ' + paye + ' payés • ' + retards + ' en retard';
    document.getElementById('heroScore').textContent = score + '%';
    document.getElementById('statVisites').textContent = total;
    document.getElementById('statPaiements').textContent = paye;
    document.getElementById('statRetards').textContent = retards;
    document.getElementById('statCollecte').textContent = collecte.toLocaleString('fr-FR') + ' F';
    document.getElementById('statSolde').textContent = soldeImpaye.toLocaleString('fr-FR') + ' F';
    document.getElementById('statRetardImpaye').textContent = montantRetard.toLocaleString('fr-FR') + ' F';
  },

  renderHomeList() {
    const d = this.tourneeData || {};
    const all = [...(d.a_visiter || []), ...(d.paye || []), ...(d.absent || []), ...(d.refus || []), ...(d.promesse || [])];
    const filters = ['tous', 'a_visiter', 'paye', 'retard', 'absent', 'refus', 'promesse'];
    const labels = {'tous':'Tous','a_visiter':'À visiter','paye':'Payés','retard':'Retards','absent':'Absents','refus':'Refus','promesse':'Promesses'};
    document.getElementById('homeFilters').innerHTML = filters.map(f => {
      let count = 0;
      if (f === 'tous') count = all.length;
      else if (f === 'retard') count = all.filter(v => v.statut_global === 'en_retard').length;
      else if (f === 'paye') count = all.filter(v => v.statut_visite === 'paye').length;
      else if (f === 'absent') count = all.filter(v => v.statut_visite === 'absent').length;
      else if (f === 'refus') count = all.filter(v => v.statut_visite === 'refus').length;
      else if (f === 'promesse') count = all.filter(v => v.statut_visite === 'promesse').length;
      else count = all.filter(v => !['paye','absent','refus','promesse'].includes(v.statut_visite)).length;
      return `<button class="chip ${f===this.currentTab?'chip--active':''}" data-filter="${f}">${labels[f]} <span>${count}</span></button>`;
    }).join('');

    document.querySelectorAll('#homeFilters .chip').forEach(chip => {
      chip.addEventListener('click', () => {
        this.currentTab = chip.dataset.filter;
        this.renderHomeList();
      });
    });

    const filtered = this.filterHome(all);
    const money = v => new Intl.NumberFormat('fr-FR', {style:'currency', currency:'XOF', maximumFractionDigits:0}).format(v||0);
    document.getElementById('clientList').innerHTML = filtered.length === 0
      ? '<p class="muted" style="text-align:center;padding:20px;">Aucun client</p>'
      : filtered.map(v => {
          let statutClass = 'status--success';
          let statutTexte = 'À jour';
          if (v.statut_global === 'en_retard') { statutClass = 'status--danger'; statutTexte = 'En retard'; }
          else if (v.statut_visite === 'paye') { statutTexte = 'Payé'; }
          else if (v.statut_visite === 'absent') { statutTexte = 'Absent'; statutClass = 'status--warning'; }
          else if (v.statut_visite === 'refus') { statutTexte = 'Refus'; statutClass = 'status--warning'; }
          else if (v.statut_visite === 'promesse') { statutTexte = 'Promesse'; statutClass = 'status--warning'; }
          else { statutTexte = 'À visiter'; statutClass = 'status--warning'; }
          return `<article class="client-card">
            <div class="avatar avatar--blue">${v.debiteur?.charAt(0) || '?'}${v.debiteur?.charAt(v.debiteur.indexOf(' ')+1) || ''}</div>
            <div class="client-card__main">
              <div class="client-card__title">
                <div><h3>${v.debiteur}</h3><p>${v.quartier || '-'}</p></div>
                <span class="status ${statutClass}">${statutTexte}</span>
              </div>
              <div class="client-card__meta"><span>📞 ${v.telephone || '-'}</span></div>
              <div class="client-card__bottom">
                <strong>${money(v.montant_journalier)}</strong>
                <button class="small-btn small-btn--primary" ${v.peut_encaisser === false ? 'disabled style="opacity:.5;cursor:not-allowed;"' : ''} onclick='AgentApp.openVenteFromTournee(${JSON.stringify(v)})'>${v.peut_encaisser === false ? 'Déjà payé' : 'Voir client'}</button>
              </div>
            </div>
          </article>`;
        }).join('');
  },

  filterHome(all) {
    if (this.currentTab === 'tous') return all;
    if (this.currentTab === 'retard') return all.filter(v => v.statut_global === 'en_retard');
    if (this.currentTab === 'paye') return all.filter(v => v.statut_visite === 'paye');
    if (this.currentTab === 'absent') return all.filter(v => v.statut_visite === 'absent');
    if (this.currentTab === 'refus') return all.filter(v => v.statut_visite === 'refus');
    if (this.currentTab === 'promesse') return all.filter(v => v.statut_visite === 'promesse');
    return all.filter(v => !['paye','absent','refus','promesse'].includes(v.statut_visite));
  },

  async openVenteFromTournee(v) {
    if (!this.tourneeEnCours) {
      this.ui.showAlert(`Démarrez votre tournée avant d'encaisser.`);
      return;
    }
    this.currentVente = v;
    await this.openClient(v.debiteur_uuid);
  },

  async openClient(uuid) {
    let deb = null;
    try {
      deb = await window.SourougnonDB.getCached('/agent/debiteurs/' + uuid);
    } catch (e) {}

    if (!deb && navigator.onLine) {
      const apiDeb = await this.apiGet('/agent/debiteurs/' + uuid);
      if (!apiDeb.error) {
        deb = apiDeb;
      }
    }

    if (!deb) {
      this.ui.showAlert('Fiche client non disponible hors-ligne.');
      return;
    }

    this.currentClient = deb;
    this.currentVente = deb.ventes && deb.ventes.length > 0 ? deb.ventes.find(v => v.statut === 'en_cours') : null;
    this.renderClientDetail(deb);
    this.showScreen('client');
  },

  renderClientDetail(deb) {
    const money = v => new Intl.NumberFormat('fr-FR', {style:'currency', currency:'XOF', maximumFractionDigits:0}).format(v||0);
    const initial = (deb.nom?.[0] || '') + (deb.prenom?.[0] || '');
    const score = deb.score_solvabilite ?? (deb.score?.score ?? '—');

    const ventesHtml = (deb.ventes || []).length === 0
      ? '<p class="muted">Aucune vente</p>'
      : deb.ventes.map(v => {
          const produits = v.vente_produits?.length
            ? v.vente_produits.map(vp => `<li>${vp.produit?.nom || '—'} × ${vp.quantite}</li>`).join('')
            : (v.produit ? `<li>${v.produit.nom} × 1</li>` : '');
          return `<div class="info-card">
            <div class="info-row"><span>Type</span><strong>${v.type_vente === 'credit' ? 'Crédit' : 'Comptant'}</strong></div>
            <div class="info-row"><span>Montant total</span><strong>${money(v.montant_total)}</strong></div>
            <div class="info-row"><span>Payé</span><strong>${money(v.total_paye || 0)}</strong></div>
            <div class="info-row"><span>Restant</span><strong>${money(v.reste_a_payer || 0)}</strong></div>
            <div class="info-row"><span>Jours payés</span><strong>${v.jours_payes || 0}/${v.jours_total || 0}</strong></div>
            <div class="info-row"><span>Statut</span><strong>${v.statut}</strong></div>
            <ul>${produits}</ul>
          </div>`;
        }).join('');

    document.getElementById('clientDetail').innerHTML = `
      <div class="profile-card">
        <div class="avatar avatar--xl avatar--blue">${initial}</div>
        <div><h2>${deb.nom} ${deb.prenom || ''}</h2><p class="muted">${deb.activite || '-'}</p><span class="status status--success">Client actif</span></div>
        <div class="hero-banner__score"><span class="hero-banner__score-label">Score</span><strong>${score}</strong></div>
      </div>
      <div class="detail-list">
        <div class="detail-item"><span>📞</span><div><small>Téléphone</small><strong>${deb.telephone || '-'}</strong></div></div>
        <div class="detail-item"><span>📍</span><div><small>Quartier</small><strong>${deb.quartier || '-'}</strong></div></div>
        <div class="detail-item"><span>📅</span><div><small>Client depuis</small><strong>${new Date(deb.created_at).toLocaleDateString('fr-FR')}</strong></div></div>
      </div>
      <h3 style="margin-top:16px;">Historique des ventes</h3>
      ${ventesHtml}
      <button class="cta cta--blue" onclick="AgentApp.showCollection()">💳 Encaisser un paiement</button>
    `;
  },

  showCollection() {
    if (!this.tourneeEnCours) {
      this.ui.showAlert(`Démarrez votre tournée avant d'encaisser.`);
      return;
    }
    if (!this.currentVente) {
      this.ui.showAlert('Veuillez d\'abord choisir un client dans la tournée ou la page débiteurs.');
      this.showScreen('home');
      return;
    }
    const money = v => new Intl.NumberFormat('fr-FR', {style:'currency', currency:'XOF', maximumFractionDigits:0}).format(v||0);
    document.getElementById('collectionClient').innerHTML = `
      <div class="collection-client">
        <div class="avatar avatar--blue">${(this.currentClient?.nom?.[0]||'')}</div>
        <div><h3>${this.currentClient?.nom || ''} ${this.currentClient?.prenom||''}</h3><p class="muted">Encours actuel</p></div>
        <strong>${money(this.currentVente.reste_a_payer || 0)}</strong>
      </div>
    `;
    document.getElementById('amount').value = (this.currentVente.montant_journalier || '').toString().replace(',', '.');
    document.getElementById('comment').value = '';
    this.showScreen('collection');
  },

  showScreen(name) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('is-active'));
    const map = {home:'screen-home', client:'screen-client', collection:'screen-collection', success:'screen-success', debtors:'screen-debtors', notifications:'screen-notifications', profile:'screen-profile', plus:'screen-plus', epargnes:'screen-epargnes', penalites:'screen-penalites', archives:'screen-archives', remise:'screen-remise'};
    document.getElementById(map[name]).classList.add('is-active');
    document.querySelectorAll('.nav-item').forEach(btn => btn.classList.toggle('is-active', btn.dataset.screen === name));
    window.scrollTo({top:0, behavior:'smooth'});
  },

  async openDebtors() {
    this.showScreen('debtors');
    document.getElementById('debtorsList').innerHTML =
      '<p class="muted" style="text-align:center;padding:20px;">Chargement…</p>';

    try { await this.loadDebiteurs(); } catch (e) { console.warn(e); }

    let d = this.debiteursData;
    if (!Array.isArray(d) || !d.length) {
      const cached = await window.SourougnonDB.getCached('/agent/debiteurs');
      d = Array.isArray(cached) ? cached : (cached?.debiteurs || cached?.data || []);
      this.debiteursData = d;
    }

    this.renderDebtors(d);
  },

  renderDebtors(d) {
    const money = v => new Intl.NumberFormat('fr-FR', {style:'currency', currency:'XOF', maximumFractionDigits:0}).format(v||0);
    document.getElementById('debtorsCount').textContent = (d || []).length + ' client(s) attitré(s)';
    document.getElementById('debtorsList').innerHTML = (!d || d.length === 0)
      ? '<p class="muted" style="text-align:center;padding:20px;">Aucun débiteur</p>'
      : d.map(deb => `<article class="debtor-card">
          <div class="avatar avatar--blue">${(deb.nom?.[0] || '')}${(deb.prenom?.[0] || '')}</div>
          <div class="debtor-main">
            <div class="client-card__title"><div><h3>${deb.nom} ${deb.prenom || ''}</h3><p>${deb.activite || '-'}</p></div><span class="status ${deb.statut_global === 'en_retard' ? 'status--danger' : 'status--success'}">${deb.statut_global === 'en_retard' ? 'EN RETARD' : 'À JOUR'}</span></div>
            <div class="debtor-grid">
              <div><small>Restant</small><strong>${money(deb.reste_a_payer_total || 0)}</strong></div>
            </div>
            <div class="debtor-actions">
              <button class="small-btn small-btn--secondary" onclick="AgentApp.callClient('${deb.telephone || ''}')">📞 Appeler</button>
              <button class="small-btn small-btn--primary" onclick="AgentApp.openClient('${deb.uuid}')">Voir</button>
            </div>
          </div>
        </article>`).join('');
  },

  callClient(tel) { if (tel) window.location.href = 'tel:' + tel; },

  async submitEncaisser(e) {
    e.preventDefault();
    if (this._submitLock) return;
    if (!this.currentVente) { this.ui.showAlert('Aucune vente sélectionnée'); return; }

    this._submitLock = true;
    const btn = document.querySelector('#collectionForm button[type="submit"]');
    if (btn) { btn.disabled = true; btn.textContent = 'Enregistrement…'; }

    try {
      const data = {
        vente_id: this.currentVente.uuid,
        montant: parseFloat(document.getElementById('amount').value) || 0,
        mode_paiement: document.getElementById('paymentMode').value,
        statut: document.getElementById('paymentStatus').value,
        commentaire: document.getElementById('comment').value,
        sync_uuid: crypto.randomUUID ? crypto.randomUUID() : 'sync-' + Date.now() + '-' + Math.random().toString(36).slice(2),
      };

      const res = await this.apiPostOrQueue('/agent-space/encaisser', data);
      if (res.error) { this.ui.showAlert(res.error); return; }
      if (res.offline) {
        this.ui.showAlert('Paiement enregistré localement.');
      } else {
        this.showSuccess(res, data);
      }
      await this.loadTournee();
    } finally {
      this._submitLock = false;
      if (btn) { btn.disabled = false; btn.textContent = '✓ Valider le paiement'; }
    }
  },

  showSuccess(res, data) {
    document.getElementById('successReceipt').innerHTML = `
      <div><small>Client</small><strong>${this.currentClient?.nom || '-'}</strong></div>
      <div><small>Montant</small><strong class="text-green">${data.montant.toLocaleString('fr-FR')} FCFA</strong></div>
      <div><small>Date</small><strong>${new Intl.DateTimeFormat('fr-FR', {day:'2-digit', month:'long', year:'numeric', hour:'2-digit', minute:'2-digit'}).format(new Date())}</strong></div>
      <div><small>Mode</small><strong>${data.mode_paiement}</strong></div>
    `;
    this.showScreen('success');
    setTimeout(() => this.loadTournee(), 1000);
  },

  async loadNotifications() {
    const notifs = await this.apiGet('/notifications');
    if (notifs.error) { this.ui.showAlert(notifs.error); return; }
    const list = Array.isArray(notifs) ? notifs : (notifs.notifications || []);
    document.getElementById('notifBadge').textContent = list.filter(n => !n.lue).length;
    document.getElementById('notifCountSmall').textContent = list.filter(n => !n.lue).length;
    document.getElementById('notificationList').innerHTML = list.length === 0
      ? '<p class="muted" style="text-align:center;padding:20px;">Aucune notification</p>'
      : list.map(n => `<article class="notification-card">
          <div class="notification-icon ${n.type === 'stock' ? 'notification-icon--red' : 'notification-icon--blue'}">${n.type === 'echeance' ? '⏰' : n.type === 'retard' ? '!' : n.type === 'stock' ? '📦' : '💬'}</div>
          <div><h3>${n.titre}</h3><p>${n.message}</p><time>${new Date(n.created_at).toLocaleDateString('fr-FR')}</time></div>
        </article>`).join('');
    this.showScreen('notifications');
  },

  async openEpargnes() {
    const list = await this.apiGet('/agent/epargnes');
    if (list.error) { this.ui.showAlert(list.error); return; }
    const money = v => new Intl.NumberFormat('fr-FR', {style:'currency', currency:'XOF', maximumFractionDigits:0}).format(v||0);

    const positives = list.filter(e => parseFloat(e.montant || 0) > 0);
    const negatives = list.filter(e => parseFloat(e.montant || 0) < 0);
    const totalCollecte = positives.reduce((sum, e) => sum + parseFloat(e.montant || 0), 0);
    const totalDefalques = Math.abs(negatives.reduce((sum, e) => sum + parseFloat(e.montant || 0), 0));

    document.getElementById('agentEpargnesContent').innerHTML = `
      <div class="stats-grid">
        <div class="metric-card"><div class="metric-card__icon metric-card__icon--green">₣</div><div><span>Épargne collectée</span><strong>${money(totalCollecte)}</strong></div></div>
        <div class="metric-card"><div class="metric-card__icon metric-card__icon--red">−</div><div><span>Défalques pénalités</span><strong>${money(totalDefalques)}</strong></div></div>
        <div class="metric-card"><div class="metric-card__icon metric-card__icon--blue">✓</div><div><span>Collectes</span><strong>${positives.length}</strong></div></div>
      </div>

      <h3 class="section-title" style="margin-top:18px;">Collectes</h3>
      <div class="client-list">
        ${positives.length === 0 ? '<p class="muted" style="text-align:center;padding:20px;">Aucune collecte</p>' :
          positives.map(e => `
            <div class="client-card">
              <div class="avatar avatar--green">${(e.debiteur?.nom?.[0] || '')}${(e.debiteur?.prenom?.[0] || '')}</div>
              <div class="client-card__main">
                <div class="client-card__title">
                  <div><h3>${e.debiteur?.nom} ${e.debiteur?.prenom}</h3><p>${new Date(e.date_collecte).toLocaleDateString('fr-FR')}</p></div>
                  <span class="status status--success">Collectée</span>
                </div>
                <strong>${money(e.montant)}</strong>
                ${e.statut === 'a_restituer' ? `<button class="small-btn small-btn--primary" style="margin-top:6px;" onclick="AgentApp.restituerEpargne('${e.uuid}')">Restituer</button>` : ''}
              </div>
            </div>`).join('')
        }
      </div>

      <h3 class="section-title" style="margin-top:18px;">Défalques de pénalités</h3>
      <div class="client-list">
        ${negatives.length === 0 ? '<p class="muted" style="text-align:center;padding:20px;">Aucun débit</p>' :
          negatives.map(e => `
            <div class="client-card">
              <div class="avatar avatar--red">${(e.debiteur?.nom?.[0] || '')}${(e.debiteur?.prenom?.[0] || '')}</div>
              <div class="client-card__main">
                <div class="client-card__title">
                  <div><h3>${e.debiteur?.nom} ${e.debiteur?.prenom}</h3><p>${new Date(e.date_collecte).toLocaleDateString('fr-FR')}</p></div>
                  <span class="status status--danger">Défalque</span>
                </div>
                <strong style="color:var(--red);">−${money(Math.abs(e.montant))}</strong>
              </div>
            </div>`).join('')
        }
      </div>
    `;
    this.showScreen('epargnes');
  },

  async restituerEpargne(uuid) {
    if (!(await this.ui.confirm("Demander la restitution de cette épargne ?"))) return;
    const res = await this.apiPostOrQueue(`/agent/epargnes/${uuid}/restituer`, {});
    if (res.error) { this.ui.showAlert(res.error); return; }
    this.ui.showAlert(res.offline ? 'Demande enregistrée localement.' : (res.message || 'Demande envoyée.'));
    this.openEpargnes();
  },

  async openPenalites() {
    const list = await this.apiGet('/agent/penalites');
    if (list.error) { this.ui.showAlert(list.error); return; }
    const money = v => new Intl.NumberFormat('fr-FR', {style:'currency', currency:'XOF', maximumFractionDigits:0}).format(v||0);
    const enAttente = list.filter(p => p.statut === 'en_attente');
    document.getElementById('agentPenalitesContent').innerHTML = `
      <div class="stats-grid">
        <div class="metric-card"><div class="metric-card__icon metric-card__icon--red">⚠</div><div><span>En attente</span><strong>${money(enAttente.reduce((sum,p)=>sum+parseFloat(p.montant||0),0))}</strong></div></div>
        <div class="metric-card"><div class="metric-card__icon metric-card__icon--green">✓</div><div><span>Recouvrées</span><strong>${list.filter(p => p.statut === 'payee').length}</strong></div></div>
      </div>
      <div class="client-list">
        ${enAttente.length === 0 ? '<p class="muted" style="text-align:center;padding:20px;">Aucune pénalité en attente</p>' :
          enAttente.map(p => `
            <div class="debtor-card">
              <div class="avatar avatar--red">${(p.debiteur?.nom?.[0] || '')}${(p.debiteur?.prenom?.[0] || '')}</div>
              <div class="debtor-main">
                <div class="client-card__title">
                  <div><h3>${p.debiteur?.nom} ${p.debiteur?.prenom}</h3><p>Retard: ${p.jours_retard} jour(s)</p></div>
                  <span class="status status--danger">${money(p.montant)}</span>
                </div>
                <div class="debtor-actions">
                  <button class="small-btn small-btn--primary" onclick="AgentApp.payerPenalite('${p.uuid}')">Payer</button>
                  <button class="small-btn small-btn--danger" onclick="AgentApp.refuserPenalite('${p.uuid}')">Refus</button>
                </div>
              </div>
            </div>`).join('')
        }
      </div>
    `;
    this.showScreen('penalites');
  },

  async payerPenalite(uuid) {
    if (!(await this.ui.confirm("Confirmer le paiement de cette pénalité ?"))) return;
    const res = await this.apiPostOrQueue(`/agent/penalites/${uuid}/payer`, {mode_paiement: 'especes'});
    if (res.error) { this.ui.showAlert(res.error); return; }
    this.ui.showAlert(res.offline ? 'Pénalité enregistrée localement.' : (res.message || 'Pénalité payée.'));
    this.openPenalites();
  },

  async refuserPenalite(uuid) {
    if (!(await this.ui.confirm("Signaler le refus de payer ? L'épargne sera débitée."))) return;
    const res = await this.apiPostOrQueue(`/agent/penalites/${uuid}/refuser`, {});
    if (res.error) { this.ui.showAlert(res.error); return; }
    this.ui.showAlert(res.offline ? 'Refus enregistré localement.' : (res.message || 'Refus enregistré.'));
    this.openPenalites();
  },


  currentArchiveMonth: null,
  selectedArchiveDay: null,
  archiveData: null,

  async openRemise() {
    this.showScreen('remise');
    await this.loadRemiseAgent();
  },

  async loadRemiseAgent() {
    const [encours, remises] = await Promise.all([
      this.apiGet('/agent/encaissements-attente'),
      this.apiGet('/agent/remises'),
    ]);

    const money = v => new Intl.NumberFormat('fr-FR', {style:'currency', currency:'XOF', maximumFractionDigits:0}).format(v||0);
    const totalAttente = (encours.error ? [] : encours).reduce((s, m) => s + parseFloat(m.montant || 0), 0);

    document.getElementById('remiseAgentContent').innerHTML = `
      <div class="panel p-4 mb-3">
        <h3 class="font-semibold">Encaissements en attente de remise</h3>
        <div class="text-sm text-muted">Total : ${money(totalAttente)}</div>
        <div id="listeEncaissementsAttente" class="mt-2">
          ${encours.error || encours.length === 0
            ? '<p class="text-muted text-sm">Aucun encaissement en attente.</p>'
            : encours.map(m => `<div class="flex justify-between text-sm py-1 border-b"><span>${m.reference || m.motif}</span><strong>${money(m.montant)}</strong></div>`).join('')}
        </div>
      </div>

      <div class="panel p-4">
        <h3 class="font-semibold">Mes remises</h3>
        <div id="listeRemisesAgent" class="mt-2">
          ${remises.error || remises.length === 0
            ? '<p class="text-muted text-sm">Aucune remise.</p>'
            : remises.map(r => `<div class="flex justify-between text-sm py-1 border-b">
                <span>${r.reference}</span>
                <span class="badge ${r.statut === 'valide' ? 'badge-success' : 'badge-warning'}">${r.statut}</span>
                <strong>${money(r.montant_declare)}</strong>
              </div>`).join('')}
        </div>
      </div>
    `;

    document.getElementById('btnTransmettreRemise').disabled = (encours.error || encours.length === 0);
  },

  async soumettreRemise() {
    const encours = await this.apiGet('/agent/encaissements-attente');
    const total = (Array.isArray(encours) ? encours : []).reduce((s, m) => s + parseFloat(m.montant || 0), 0);
    if (total <= 0) {
      this.ui.showAlert('Aucun encaissement à remettre.');
      return;
    }

    const ok = await this.ui.confirm(`Transmettre ${total} FCFA à l'agence ?`);
    if (!ok) return;

    const res = await this.apiPostOrQueue('/agent/remises', {
      montant: total,
      sync_uuid: crypto.randomUUID ? crypto.randomUUID() : 'sync-' + Date.now() + '-' + Math.random().toString(36).slice(2),
    });

    if (res.error) {
      this.ui.showAlert(res.error);
      return;
    }

    this.ui.showAlert(res.offline ? 'Remise enregistrée localement.' : 'Remise transmise. En attente de validation.');
    await this.loadRemiseAgent();
  },

  async openArchives() {
    if (!this.currentArchiveMonth) {
      this.currentArchiveMonth = new Date();
    }
    await this.loadArchiveMonth(0);
    this.showScreen('archives');
  },

  async changeArchiveMonth(delta) {
    await this.loadArchiveMonth(delta);
  },

  async loadArchiveMonth(delta = 0) {
    if (!this.currentArchiveMonth) this.currentArchiveMonth = new Date();
    this.currentArchiveMonth.setMonth(this.currentArchiveMonth.getMonth() + delta);

    const year = this.currentArchiveMonth.getFullYear();
    const month = String(this.currentArchiveMonth.getMonth() + 1).padStart(2, '0');
    const mois = `${year}-${month}`;
    const cacheKey = 'archives:' + mois;

    let data = null;
    if (!navigator.onLine) {
      data = await window.SourougnonDB.getCached(cacheKey);
      if (!data) {
        this.ui.showAlert('Archives non disponibles hors-ligne pour ce mois.');
        return;
      }
    } else {
      const res = await this.apiGet('/agent/archives?mois=' + mois);
      if (res.error) {
        // tenter le cache avant d'abandonner
        data = await window.SourougnonDB.getCached(cacheKey);
        if (!data) {
          this.ui.showAlert(res.error);
          return;
        }
      } else {
        data = res;
        await window.SourougnonDB.setCached(cacheKey, data);
      }
    }

    this.archiveData = data;
    this.renderArchiveCalendar(data);
  },

  renderArchiveCalendar(data) {
    const cal = document.getElementById('archiveCalendar');
    const my  = document.getElementById('archiveMonthYear');
    const tot = document.getElementById('archiveTotaux');
    if (!cal || !my) return;

    const N = v => Number(v) || 0;
    const money = v => new Intl.NumberFormat('fr-FR',{maximumFractionDigits:0}).format(N(v));
    const iso = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;

    const cur = this.currentArchiveMonth;
    my.textContent = new Intl.DateTimeFormat('fr-FR',{month:'long',year:'numeric'}).format(cur);

    const y = cur.getFullYear(), m = cur.getMonth();
    const offset = (new Date(y,m,1).getDay()+6)%7;
    const nb = new Date(y,m+1,0).getDate();
    const todayStr = iso(new Date());

    const map = {};
    (data.jours||[]).forEach(j => { map[j.date] = j; });

    let h = '<div class="arch-dow"><span>L</span><span>M</span><span>M</span><span>J</span><span>V</span><span>S</span><span>D</span></div><div class="arch-grid">';
    for (let i=0;i<offset;i++) h += '<div class="arch-cell arch-cell--empty"></div>';

    for (let d=1; d<=nb; d++) {
      const ds = `${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
      const j  = map[ds] || {};
      const total = N(j.total_recouvre) + N(j.total_penalites) + N(j.total_epargnes);
      const st = j.tournee_statut;

      let cls = 'arch-cell';
      if (st === 'terminee') { cls += ' arch-cell--done'; }
      else if (st === 'en_cours') { cls += ' arch-cell--run'; }
      else if (total > 0) { cls += ' arch-cell--ops'; }
      else if (ds > todayStr) { cls += ' arch-cell--future'; }
      else { cls += ' arch-cell--void'; }

      if (ds === todayStr) cls += ' arch-cell--today';
      if (ds === this.selectedArchiveDay) cls += ' arch-cell--sel';

      const clickable = ds <= todayStr;
      const onclickAttr = clickable ? ` data-day="${ds}"` : '';

      h += `<button type="button" class="${cls}"${onclickAttr}>
        <span class="arch-num">${d}</span>
        ${total>0 ? `<span class="arch-amt">${money(total/1000)}k</span>` : '<span class="arch-amt">&nbsp;</span>'}
      </button>`;
    }
    h += '</div>';
    h += `<div class="arch-legend">
      <span><i class="arch-dot" style="background:var(--green)"></i>Terminée</span>
      <span><i class="arch-dot" style="background:var(--orange)"></i>En cours</span>
      <span><i class="arch-dot" style="background:var(--blue)"></i>Opérations</span>
    </div>`;
    cal.innerHTML = h;

    // Délégation d'événement unique
    if (!cal.dataset.bound) {
      cal.addEventListener('click', e => {
        const btn = e.target.closest('[data-day]');
        if (btn) {
          this.showArchiveDetail(btn.dataset.day);
        }
      });
      cal.dataset.bound = '1';
    }

    if (tot) {
      const t = data.totaux || {};
      tot.innerHTML = `<div class="arch-kpis">
        <div class="arch-kpi"><span>Recouvrements</span><b style="color:var(--green)">${money(t.recouvre)} F</b></div>
        <div class="arch-kpi"><span>Pénalités</span><b style="color:var(--orange)">${money(t.penalites)} F</b></div>
        <div class="arch-kpi"><span>Épargnes</span><b style="color:var(--blue)">${money(t.epargnes)} F</b></div>
        <div class="arch-kpi"><span>Défalques</span><b style="color:var(--red)">-${money(t.defalques_penalites)} F</b></div>
        <div class="arch-kpi arch-kpi--full"><span>Jours travaillés</span><b>${N(t.jours_travailles)} / ${nb}</b></div>
      </div>`;
    }
  },  showArchiveDetail(ds) {
    this.selectedArchiveDay = ds;
    const el = document.getElementById('archiveDetail');
    if (!el || !this.archiveData) return;

    const N = v => Number(v) || 0;
    const money = v => new Intl.NumberFormat('fr-FR',{maximumFractionDigits:0}).format(N(v));
    const j = (this.archiveData.jours||[]).find(x => x.date === ds);
    const lib = new Date(ds+'T12:00:00').toLocaleDateString('fr-FR',{weekday:'long',day:'numeric',month:'long'});

    if (!j) {
      el.innerHTML = `<div class="arch-day"><h5>${lib}</h5><div class="arch-empty">Aucune donnée</div></div>`;
      this.renderArchiveCalendar(this.archiveData);
      return;
    }

    const st = j.tournee_statut;
    const badge = st === 'terminee'
      ? '<span class="arch-badge" style="background:#d1fae5;color:#065f46">Terminée</span>'
      : st === 'en_cours'
      ? '<span class="arch-badge" style="background:#fef3c7;color:#92400e">En cours</span>'
      : '<span class="arch-badge" style="background:#f1f5f9;color:#64748b">Pas de tournée</span>';

    el.innerHTML = `<div class="arch-day">
      <h5>${lib}</h5>
      <div class="arch-row"><span>Tournée</span>${badge}</div>
      <div class="arch-row"><span>Recouvré</span><b style="color:var(--green)">${money(j.total_recouvre)} F</b></div>
      <div class="arch-row"><span>Pénalités encaissées</span><b style="color:var(--orange)">${money(j.total_penalites)} F</b></div>
      <div class="arch-row"><span>Épargnes collectées</span><b style="color:var(--blue)">${money(j.total_epargnes)} F</b></div>
      <div class="arch-row"><span>Défalques épargne</span><b style="color:var(--red)">-${money(j.total_defalques_penalites)} F</b></div>
      <div class="arch-row"><span>Paiements</span><b>${N(j.nb_paiements)}</b></div>
      <div class="arch-row"><span>Absents / Refus / Promesses</span><b>${N(j.nb_absents)} / ${N(j.nb_refus)} / ${N(j.nb_promesses)}</b></div>
    </div>`;
    this.renderArchiveCalendar(this.archiveData);
    el.scrollIntoView({behavior:'smooth',block:'nearest'});
  },  async loadProfile() {
    const me = await this.apiGet('/auth/me');
    if (me.error) { this.ui.showAlert(me.error); return; }
    this.user = me.user || {};
    localStorage.setItem('agent_user', JSON.stringify(this.user));
    const u = this.user;
    document.getElementById('profileContent').innerHTML = `
      <div class="profile-card profile-card--big">
        <div class="avatar avatar--xxl avatar--blue">${(u.nom?.[0]||'')}${(u.prenom?.[0]||'')}</div>
        <div><h2>${u.nom} ${u.prenom}</h2><p class="muted">Agent terrain • Bénin</p><span class="status status--success">Actif</span></div>
      </div>
      <div class="info-card">
        <div class="info-row"><span>Téléphone</span><strong>${u.telephone || '-'}</strong></div>
        <div class="info-row"><span>Email</span><strong>${u.email || '-'}</strong></div>
        <div class="info-row"><span>Rôle</span><strong>${u.role || 'agent'}</strong></div>
      </div>
    `;
    this.showScreen('profile');
  },

  setupEvents() {
    document.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-screen]');
      if (btn) {
        const name = btn.dataset.screen;
        if (name === 'debtors') this.openDebtors();
        else if (name === 'notifications') this.loadNotifications();
        else if (name === 'profile') this.loadProfile();
        else if (name === 'plus') this.showScreen('plus');
        else if (name === 'epargnes') this.openEpargnes();
        else if (name === 'penalites') this.openPenalites();
        else if (name === 'archives') this.openArchives();
        else if (name === 'collection') this.showCollection();
        else this.showScreen(name);
      }
    });
  },

  updateNetwork() {
    const online = navigator.onLine;
    document.getElementById('networkPill').classList.toggle('network-pill--offline', !online);
    document.getElementById('networkPill').classList.toggle('network-pill--online', online);
    document.querySelector('.network-label').textContent = online ? 'En ligne' : 'Hors ligne';
    document.getElementById('offlineBar').classList.toggle('is-hidden', online);
  },

  ui: {
    showAlert(message) {
      const backdrop = document.getElementById('ui-modal-backdrop');
      if (!backdrop) return;
      document.getElementById('ui-modal-icon').textContent = 'ℹ️';
      document.getElementById('ui-modal-message').textContent = message;
      document.getElementById('ui-modal-actions').innerHTML = `<button class="cta cta--blue" style="margin-top:0;min-height:44px;" onclick="AgentApp.ui.closeAlert()">OK</button>`;
      backdrop.style.display = 'flex';
    },
    closeAlert() {
      document.getElementById('ui-modal-backdrop').style.display = 'none';
    },
    async confirm(message) {
      const backdrop = document.getElementById('ui-modal-backdrop');
      if (!backdrop) return false;
      return new Promise((resolve) => {
        document.getElementById('ui-modal-icon').textContent = '⚠️';
        document.getElementById('ui-modal-message').textContent = message;
        document.getElementById('ui-modal-actions').innerHTML = `
          <button class="cta cta--outline" style="margin-top:0;min-height:44px;" onclick="AgentApp.ui.resolveConfirm(false)">Annuler</button>
          <button class="cta cta--blue" style="margin-top:0;min-height:44px;" onclick="AgentApp.ui.resolveConfirm(true)">Confirmer</button>
        `;
        AgentApp.ui._resolve = resolve;
        backdrop.style.display = 'flex';
      });
    },
    resolveConfirm(value) {
      document.getElementById('ui-modal-backdrop').style.display = 'none';
      if (this._resolve) { this._resolve(value); this._resolve = null; }
    },
  },
};

document.getElementById('collectionForm').addEventListener('submit', (e) => AgentApp.submitEncaisser(e));
document.getElementById('syncBtn').addEventListener('click', () => AgentApp.syncAll());
window.addEventListener('online', () => { AgentApp.updateNetwork(); AgentApp.syncAll(); });
window.addEventListener('offline', () => AgentApp.updateNetwork());

if (document.getElementById('splash') && document.getElementById('app')) {
  setTimeout(() => {
    document.getElementById('splash').style.opacity = '0';
    document.getElementById('splash').style.transition = 'opacity .45s ease';
    setTimeout(() => {
      document.getElementById('splash').remove();
      document.getElementById('app').classList.remove('is-hidden');
      AgentApp.setupEvents();
      AgentApp.updateNetwork();
      AgentApp.init();
    }, 450);
  }, 1200);
}
