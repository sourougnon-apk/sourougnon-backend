(function () {
    'use strict';

    function deplacerModales() {
        var ids = [
            'stock-entree-modal',
            'encaisser-modal',
            'stock-sortie-modal',
            'inventaire-modal',
            'caisse-decaissement-modal',
            'caisse-cloture-modal'
        ];

        ids.forEach(function (id) {
            var modale = document.getElementById(id);

            if (modale && modale.parentElement !== document.body) {
                document.body.appendChild(modale);
                modale.classList.add('hidden');
            }
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', deplacerModales);
    } else {
        deplacerModales();
    }
})();
