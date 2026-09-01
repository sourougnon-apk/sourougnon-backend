(function () {
    'use strict';

    const SELECT_IDS = {
        departement: 'deb-departement',
        commune: 'deb-commune',
        arrondissement: 'deb-arrondissement',
        quartier: 'deb-village'
    };

    const API_URL = '/api/localisations';

    function getSelect(id) {
        return document.getElementById(id);
    }

    function resetSelect(id, placeholder, disabled) {
        const select = getSelect(id);
        if (!select) return;
        select.innerHTML = '';
        select.appendChild(new Option(placeholder, ''));
        select.disabled = Boolean(disabled);
    }

    function setLoading(id, placeholder) {
        const select = getSelect(id);
        if (!select) return;
        select.innerHTML = '';
        select.appendChild(new Option(placeholder, ''));
        select.disabled = true;
    }

    async function chargerOptions(type, parent, selectId, placeholder) {
        const select = getSelect(selectId);
        if (!select) {
            console.warn('[Localisation] Select introuvable : #' + selectId);
            return;
        }

        setLoading(selectId, 'Chargement...');

        const params = new URLSearchParams({ type: type });
        if (parent) params.set('parent', parent);

        try {
            const response = await fetch(API_URL + '?' + params.toString(), {
                headers: { 'Accept': 'application/json' },
                cache: 'no-store'
            });

            const contentType = response.headers.get('content-type') || '';
            const data = contentType.includes('application/json')
                ? await response.json()
                : null;

            if (!response.ok) throw new Error('Erreur HTTP ' + response.status);
            if (!Array.isArray(data)) throw new Error('Reponse non JSON');

            select.innerHTML = '';
            select.appendChild(new Option(placeholder, ''));
            data.forEach(item => select.appendChild(new Option(item.nom, item.nom)));
            select.disabled = false;
            console.log('[Localisation]', type, ':', data.length, 'element(s) charge(s)');
        } catch (error) {
            console.error('[Localisation] Echec chargement', { type, parent, erreur: error });
            select.innerHTML = '';
            select.appendChild(new Option('Erreur de chargement', ''));
            select.disabled = true;
        }
    }

    function initSelects(root) {
        const scope = root || document;
        const dep = scope.querySelector('#' + SELECT_IDS.departement);
        const com = scope.querySelector('#' + SELECT_IDS.commune);
        const arr = scope.querySelector('#' + SELECT_IDS.arrondissement);
        const quartier = scope.querySelector('#' + SELECT_IDS.quartier);

        if (!dep) {
            console.warn('[Localisation] #deb-departement introuvable');
            return false;
        }

        if (dep.dataset.localisationReady === '1') return true;
        dep.dataset.localisationReady = '1';

        if (com) com.disabled = true;
        if (arr) arr.disabled = true;
        if (quartier) quartier.disabled = true;

        chargerOptions('departement', '', SELECT_IDS.departement, '-- Departement --');

        dep.addEventListener('change', function () {
            resetSelect(SELECT_IDS.commune, '-- Commune --', true);
            resetSelect(SELECT_IDS.arrondissement, '-- Arrondissement --', true);
            resetSelect(SELECT_IDS.quartier, '-- Quartier --', true);
            if (this.value) chargerOptions('commune', this.value, SELECT_IDS.commune, '-- Commune --');
        });

        if (com) com.addEventListener('change', function () {
            resetSelect(SELECT_IDS.arrondissement, '-- Arrondissement --', true);
            resetSelect(SELECT_IDS.quartier, '-- Quartier --', true);
            if (this.value) chargerOptions('arrondissement', this.value, SELECT_IDS.arrondissement, '-- Arrondissement --');
        });

        if (arr) arr.addEventListener('change', function () {
            resetSelect(SELECT_IDS.quartier, '-- Quartier --', true);
            if (this.value) chargerOptions('quartier', this.value, SELECT_IDS.quartier, '-- Quartier --');
        });

        return true;
    }

    function initWhenAvailable() {
        if (initSelects()) return;
        const observer = new MutationObserver(function () {
            if (initSelects()) observer.disconnect();
        });
        observer.observe(document.body, { childList: true, subtree: true });
    }

    window.initLocalisationBenin = initSelects;
window.initSelects = initSelects;

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initWhenAvailable);
    } else {
        initWhenAvailable();
    }
})();
