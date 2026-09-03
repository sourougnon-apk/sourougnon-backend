<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Fiche de paie - {{ $salaire->periode }}</title>
    <style>
        body {
            font-family: 'Inter', system-ui, sans-serif;
            margin: 0;
            padding: 40px;
            color: #1e293b;
            background: #f8f9fb;
        }
        .fiche {
            max-width: 800px;
            margin: auto;
            background: white;
            border-radius: 16px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.08);
            padding: 32px;
        }
        .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 2px solid #e2e8f0;
            padding-bottom: 20px;
            margin-bottom: 24px;
        }
        .company h1 {
            margin: 0;
            font-size: 24px;
            font-weight: 800;
        }
        .company p {
            margin: 4px 0 0;
            color: #64748b;
            font-size: 14px;
        }
        .title {
            font-size: 20px;
            font-weight: 700;
            color: #0066ff;
        }
        .section {
            margin-bottom: 24px;
        }
        .section h2 {
            font-size: 16px;
            font-weight: 700;
            border-bottom: 1px solid #e2e8f0;
            padding-bottom: 8px;
            margin-bottom: 12px;
        }
        .grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 12px;
        }
        .line {
            display: flex;
            justify-content: space-between;
            padding: 8px 0;
            border-bottom: 1px dashed #e2e8f0;
        }
        .line:last-child {
            border-bottom: none;
        }
        .label {
            color: #64748b;
        }
        .value {
            font-weight: 600;
        }
        .total {
            display: flex;
            justify-content: space-between;
            padding: 12px 0;
            font-size: 18px;
            font-weight: 800;
            border-top: 2px solid #1e293b;
        }
        .net {
            color: #16a34a;
            font-size: 22px;
        }
        .footer {
            text-align: center;
            margin-top: 32px;
            color: #64748b;
            font-size: 12px;
            border-top: 1px solid #e2e8f0;
            padding-top: 16px;
        }
        .actions {
            text-align: center;
            margin-top: 24px;
        }
        .print-btn {
            padding: 12px 24px;
            background: #0066ff;
            color: white;
            border: none;
            border-radius: 8px;
            font-size: 16px;
            font-weight: 600;
            cursor: pointer;
        }
        .print-btn:hover {
            background: #0052cc;
        }
        @media print {
            body {
                background: white;
                padding: 0;
            }
            .fiche {
                box-shadow: none;
                border-radius: 0;
            }
            .actions {
                display: none;
            }
        }
    </style>
</head>
<body>
    <div class="fiche">
        <div class="header">
            <div class="company">
                <h1>{{ $agence?->nom ?? 'Sourougnon' }}</h1>
                <p>{{ $agence?->adresse ?? '' }}</p>
                <p>{{ $agence?->telephone ?? '' }}</p>
            </div>
            <div class="title">Fiche de paie<br><small style="font-size:14px;font-weight:500;">{{ $salaire->periode }}</small></div>
        </div>

        <div class="section">
            <h2>Informations employé</h2>
            <div class="grid">
                <div><span class="label">Nom :</span> <span class="value">{{ $salaire->employe->user->nom }} {{ $salaire->employe->user->prenom }}</span></div>
                <div><span class="label">Poste :</span> <span class="value">{{ $salaire->employe->poste ?? '--' }}</span></div>
                <div><span class="label">Email :</span> <span class="value">{{ $salaire->employe->user->email }}</span></div>
                <div><span class="label">Date d'embauche :</span> <span class="value">{{ optional($salaire->employe->date_embauche)->format('d/m/Y') ?? '--' }}</span></div>
            </div>
        </div>

        <div class="section">
            <h2>Détails du salaire</h2>
            <div class="line">
                <span class="label">Salaire de base mensuel</span>
                <span class="value">{{ number_format($salaire->employe->salaire_base, 2, ',', ' ') }} F</span>
            </div>
            <div class="line">
                <span class="label">Jours travaillés</span>
                <span class="value">{{ $salaire->nb_jours_travailles }} / {{ $salaire->nb_jours_ouvrables }} jours</span>
            </div>
            <div class="line">
                <span class="label">Salaire brut</span>
                <span class="value">{{ number_format($salaire->salaire_brut, 2, ',', ' ') }} F</span>
            </div>

            @if(!empty($salaire->lignes_retenues))
                @foreach($salaire->lignes_retenues as $retenue)
                    <div class="line">
                        <span class="label">{{ $retenue['nom'] }} ({{ $retenue['type'] === 'pourcentage' ? $retenue['valeur'].'%' : 'montant fixe' }})</span>
                        <span class="value">- {{ number_format(($retenue['type'] === 'pourcentage') ? $salaire->salaire_brut * $retenue['valeur'] / 100 : $retenue['valeur'], 2, ',', ' ') }} F</span>
                    </div>
                @endforeach
            @endif

            <div class="total">
                <span>Salaire net à payer</span>
                <span class="net">{{ number_format($salaire->salaire_net, 2, ',', ' ') }} F</span>
            </div>
        </div>

        @if(!empty($salaire->employe->user->agence?->nom))
        <div class="section">
            <h2>Mentions</h2>
            <p>{{ $salaire->employe->user->agence->nom }}</p>
        </div>
        @endif

        <div class="footer">
            Document généré le {{ now()->format('d/m/Y à H:i') }}
        </div>

        <div class="actions">
            <button class="print-btn" onclick="window.print()">Imprimer / Enregistrer en PDF</button>
        </div>
    </div>
</body>
</html>
