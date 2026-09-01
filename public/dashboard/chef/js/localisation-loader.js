// === CHARGEUR DE LOCALISATION SIMPLE ET ROBUSTE ===

function chargerLocalisations() {
    console.log('[LOC] Chargement des localisations...');
    
    var depSelect = document.getElementById('deb-departement');
    var comSelect = document.getElementById('deb-commune');
    var arrSelect = document.getElementById('deb-arrondissement');
    var vilSelect = document.getElementById('deb-village');
    
    if (!depSelect) {
        console.warn('[LOC] #deb-departement introuvable');
        return;
    }
    
    // Charger les départements
    fetch('/api/localisations?type=departement')
        .then(r => r.json())
        .then(data => {
            depSelect.innerHTML = '<option value="">-- Departement --</option>' +
                data.map(d => '<option value="' + d.nom + '">' + d.nom + '</option>').join('');
            console.log('[LOC] ' + data.length + ' departements charges');
        });
    
    // Quand on change de département
    depSelect.onchange = function() {
        comSelect.innerHTML = '<option value="">-- Commune --</option>';
        arrSelect.innerHTML = '<option value="">-- Arrondissement --</option>';
        vilSelect.innerHTML = '<option value="">-- Village/Quartier --</option>';
        
        if (!this.value) return;
        
        fetch('/api/localisations?type=commune&parent=' + encodeURIComponent(this.value))
            .then(r => r.json())
            .then(data => {
                comSelect.innerHTML = '<option value="">-- Commune --</option>' +
                    data.map(c => '<option value="' + c.nom + '">' + c.nom + '</option>').join('');
                console.log('[LOC] ' + data.length + ' communes charges');
            });
    };
    
    // Quand on change de commune
    if (comSelect) comSelect.onchange = function() {
        arrSelect.innerHTML = '<option value="">-- Arrondissement --</option>';
        vilSelect.innerHTML = '<option value="">-- Village/Quartier --</option>';
        
        if (!this.value) return;
        
        fetch('/api/localisations?type=arrondissement&parent=' + encodeURIComponent(this.value))
            .then(r => r.json())
            .then(data => {
                arrSelect.innerHTML = '<option value="">-- Arrondissement --</option>' +
                    data.map(a => '<option value="' + a.nom + '">' + a.nom + '</option>').join('');
                console.log('[LOC] ' + data.length + ' arrondissements charges');
            });
    };
    
    // Quand on change d'arrondissement
    if (arrSelect) arrSelect.onchange = function() {
        vilSelect.innerHTML = '<option value="">-- Village/Quartier --</option>';
        
        if (!this.value) return;
        
        fetch('/api/localisations?type=quartier&parent=' + encodeURIComponent(this.value))
            .then(r => r.json())
            .then(data => {
                vilSelect.innerHTML = '<option value="">-- Village/Quartier --</option>' +
                    data.map(q => '<option value="' + q.nom + '">' + q.nom + '</option>').join('');
                console.log('[LOC] ' + data.length + ' quartiers charges');
            });
    };
}

function getLocalisationComplete() {
    var parts = [];
    var ids = ['deb-departement', 'deb-commune', 'deb-arrondissement', 'deb-village'];
    ids.forEach(function(id) {
        var el = document.getElementById(id);
        if (el && el.value) parts.push(el.value);
    });
    return parts.join(' > ') || '';
}

// Exposer globalement
window.chargerLocalisations = chargerLocalisations;
window.getLocalisationComplete = getLocalisationComplete;
