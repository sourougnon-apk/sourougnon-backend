@php
    use Illuminate\Support\Carbon;

    $logoPath = public_path('images/logo-sourougnon.svg');
    $logo = is_file($logoPath)
        ? 'data:image/svg+xml;base64,' . base64_encode(file_get_contents($logoPath))
        : null;

    $fmt = fn ($v) => number_format((float) $v, 0, ',', ' ') . ' FCFA';

    $brut = (float) ($salaire->salaire_brut ?? 0);

    $lignes = $salaire->lignes_retenues ?? [];
    if (is_string($lignes)) {
        $lignes = json_decode($lignes, true) ?: [];
    }

    $totalRetenues = 0;
    $retenues = [];
    foreach ($lignes as $l) {
        $type    = $l['type'] ?? 'fixe';
        $valeur  = (float) ($l['valeur'] ?? 0);
        $montant = $type === 'pourcentage' ? $brut * $valeur / 100 : $valeur;
        $totalRetenues += $montant;
        $retenues[] = [
            'nom'     => $l['nom'] ?? 'Retenue',
            'base'    => $type === 'pourcentage'
                            ? rtrim(rtrim(number_format($valeur, 2, ',', ' '), '0'), ',') . ' %'
                            : '—',
            'montant' => $montant,
        ];
    }

    $net       = (float) ($salaire->salaire_net ?? ($brut - $totalRetenues));
    $ecart     = abs($net - ($brut - $totalRetenues)) > 1;
    $employe   = $salaire->employe;
    $user      = $employe->user ?? null;

    $trait = '<span class="trait"></span>';
@endphp
<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8">
<title>Fiche de paie — {{ $user->nom ?? '' }} {{ $user->prenom ?? '' }}</title>
<style>
    :root {
        --marine: #14304f;
        --gris:   #6b7280;
        --ligne:  #dcdfe4;
        --vert:   #1f6b3b;
        --fond:   #f7f8fa;
    }
    * { box-sizing: border-box; }
    body {
        font-family: 'Inter', -apple-system, 'Segoe UI', Arial, sans-serif;
        font-size: 11px;
        color: #1f2937;
        margin: 0;
        background: #eceef1;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
    }
    .page {
        width: 210mm;
        min-height: 297mm;
        margin: 12mm auto;
        padding: 14mm 14mm 10mm;
        background: #fff;
        box-shadow: 0 2px 14px rgba(0,0,0,.12);
    }

    .entete { display: table; width: 100%; }
    .entete > div { display: table-cell; vertical-align: top; }
    .col-logo { width: 58%; }
    .col-coord { width: 42%; text-align: right; }
    .logo { height: 74px; display: block; margin-bottom: 6px; }
    .raison {
        font-size: 21px;
        font-weight: 700;
        letter-spacing: .4px;
        color: var(--marine);
        margin: 0;
    }
    .sous-raison { color: var(--gris); font-size: 10px; margin-top: 2px; }
    .coord-ligne { margin-bottom: 5px; font-size: 10.5px; white-space: nowrap; }
    .coord-ligne b { color: var(--marine); font-weight: 600; }
    .trait {
        display: inline-block;
        width: 120px;
        border-bottom: 1px dotted #9aa1ab;
        height: 11px;
        vertical-align: bottom;
    }
    .valeur-soulignee {
        display: inline-block;
        min-width: 120px;
        border-bottom: 1px dotted #9aa1ab;
        text-align: right;
    }
    .separateur {
        height: 3px;
        background: linear-gradient(90deg, var(--marine) 0 62%, #c9a227 62% 100%);
        margin: 12px 0 4px;
        border-radius: 2px;
    }
    .titre-doc {
        text-align: center;
        font-size: 15px;
        font-weight: 700;
        letter-spacing: 2.5px;
        text-transform: uppercase;
        color: var(--marine);
        margin: 14px 0 4px;
    }
    .periode { text-align: center; color: var(--gris); margin-bottom: 16px; font-size: 11px; }

    .bloc { border: 1px solid var(--ligne); border-radius: 5px; margin-bottom: 14px; }
    .bloc-titre {
        background: var(--fond);
        border-bottom: 1px solid var(--ligne);
        padding: 6px 10px;
        font-weight: 600;
        font-size: 10px;
        letter-spacing: 1.2px;
        text-transform: uppercase;
        color: var(--marine);
    }
    .bloc-corps { padding: 10px; }
    table { width: 100%; border-collapse: collapse; }
    .infos td { padding: 5px 6px; vertical-align: top; width: 25%; }
    .infos .lab { color: var(--gris); font-size: 9.5px; text-transform: uppercase; letter-spacing: .5px; }
    .infos .val { font-weight: 600; }

    .montants th {
        text-align: left;
        background: var(--fond);
        border-bottom: 1px solid var(--ligne);
        padding: 7px 10px;
        font-size: 9.5px;
        text-transform: uppercase;
        letter-spacing: .8px;
        color: var(--gris);
    }
    .montants td { padding: 7px 10px; border-bottom: 1px solid #eef0f3; }
    .montants .num { text-align: right; font-variant-numeric: tabular-nums; }
    .ss-total td { background: #fafbfc; font-weight: 600; }
    .retenue .num { color: #a4262c; }

    .net {
        margin-top: 4px;
        display: table;
        width: 100%;
        background: var(--marine);
        color: #fff;
        border-radius: 5px;
    }
    .net > div { display: table-cell; padding: 12px 14px; vertical-align: middle; }
    .net .lib { font-size: 11px; letter-spacing: 1.5px; text-transform: uppercase; }
    .net .val { text-align: right; font-size: 20px; font-weight: 700; }

    .alerte {
        margin-top: 8px; padding: 7px 10px; font-size: 10px;
        background: #fff4d6; border: 1px solid #e6c34a; border-radius: 4px; color: #7a5b00;
    }

    .signatures { margin-top: 26px; display: table; width: 100%; }
    .signatures > div { display: table-cell; width: 50%; padding-top: 4px; }
    .signatures .droite { text-align: right; }
    .cadre-sign {
        display: inline-block; width: 210px; text-align: center;
    }
    .cadre-sign .zone { height: 52px; border-bottom: 1px solid #9aa1ab; }
    .cadre-sign .lib { margin-top: 5px; font-size: 10px; color: var(--gris); }

    .pied {
        margin-top: 22px; padding-top: 8px;
        border-top: 1px solid var(--ligne);
        font-size: 9px; color: var(--gris); text-align: center; line-height: 1.6;
    }

    .barre-actions { text-align: center; margin: 14px 0; }
    .btn {
        background: var(--marine); color: #fff; border: 0; padding: 9px 22px;
        border-radius: 6px; font-size: 12px; font-weight: 600; cursor: pointer;
        font-family: inherit;
    }

    @media print {
        body { background: #fff; }
        .page { margin: 0; box-shadow: none; width: auto; min-height: 0; padding: 8mm 10mm; }
        .no-print { display: none !important; }
        @page { size: A4 portrait; margin: 8mm; }
    }
</style>
</head>
<body>

<div class="barre-actions no-print">
    <button class="btn" onclick="window.print()">Imprimer / Enregistrer en PDF</button>
</div>

<div class="page">

    <div class="entete">
        <div class="col-logo">
            @if ($logo)
                <img src="{{ $logo }}" alt="Sourougnon Groupe" class="logo">
            @endif
            <p class="raison">{{ $agence->nom ?? 'Sourougnon Groupe' }}</p>
            <div class="sous-raison">{{ $agence->adresse ?? 'Adresse : ______________________' }}</div>
        </div>
        <div class="col-coord">
            <div class="coord-ligne">
                <b>Téléphone :</b>
                @if (!empty($agence->telephone))
                    <span class="valeur-soulignee">{{ $agence->telephone }}</span>
                @else {!! $trait !!} @endif
            </div>
            <div class="coord-ligne">
                <b>Email :</b>
                @if (!empty($agence->email))
                    <span class="valeur-soulignee">{{ $agence->email }}</span>
                @else {!! $trait !!} @endif
            </div>
            <div class="coord-ligne">
                <b>RCCM :</b>
                @if (!empty($agence->rccm))
                    <span class="valeur-soulignee">{{ $agence->rccm }}</span>
                @else {!! $trait !!} @endif
            </div>
            <div class="coord-ligne">
                <b>Fiche de paie N° :</b>
                @if (!empty($salaire->numero))
                    <span class="valeur-soulignee">{{ $salaire->numero }}</span>
                @else {!! $trait !!} @endif
            </div>
        </div>
    </div>

    <div class="separateur"></div>

    <div class="titre-doc">Bulletin de paie</div>
    <div class="periode">
        Période : <strong>{{ $salaire->periode ?? '—' }}</strong>
    </div>

    <div class="bloc">
        <div class="bloc-titre">Informations de l'employé</div>
        <div class="bloc-corps">
            <table class="infos">
                <tr>
                    <td><div class="lab">Nom &amp; prénom</div>
                        <div class="val">{{ trim(($user->nom ?? '') . ' ' . ($user->prenom ?? '')) ?: '—' }}</div></td>
                    <td><div class="lab">Poste</div>
                        <div class="val">{{ $employe->poste ?? '—' }}</div></td>
                    <td><div class="lab">Date d'embauche</div>
                        <div class="val">
                            {{ $employe->date_embauche ? Carbon::parse($employe->date_embauche)->format('d/m/Y') : '—' }}
                        </div></td>
                    <td><div class="lab">Matricule</div>
                        <div class="val">{{ $employe->matricule ?? ($employe->uuid ? substr($employe->uuid, 0, 8) : '—') }}</div></td>
                </tr>
                <tr>
                    <td colspan="2"><div class="lab">Email</div>
                        <div class="val">{{ $user->email ?? '—' }}</div></td>
                    <td colspan="2"><div class="lab">Téléphone</div>
                        <div class="val">{{ $user->telephone ?? '—' }}</div></td>
                </tr>
            </table>
        </div>
    </div>

    <div class="bloc">
        <div class="bloc-titre">Détail de la rémunération</div>
        <table class="montants">
            <thead>
                <tr>
                    <th style="width:52%">Libellé</th>
                    <th style="width:24%">Base / Taux</th>
                    <th style="width:24%" class="num">Montant</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td>Salaire de base mensuel</td>
                    <td>—</td>
                    <td class="num">{{ $fmt($employe->salaire_base ?? 0) }}</td>
                </tr>
                <tr>
                    <td>Jours travaillés</td>
                    <td>{{ $salaire->nb_jours_travailles ?? 0 }} / {{ $salaire->nb_jours_ouvrables ?? 0 }} jours ouvrables</td>
                    <td class="num">—</td>
                </tr>
                <tr class="ss-total">
                    <td>Salaire brut</td>
                    <td>—</td>
                    <td class="num">{{ $fmt($brut) }}</td>
                </tr>

                @forelse ($retenues as $r)
                    <tr class="retenue">
                        <td>{{ $r['nom'] }}</td>
                        <td>{{ $r['base'] }}</td>
                        <td class="num">- {{ $fmt($r['montant']) }}</td>
                    </tr>
                @empty
                    <tr>
                        <td colspan="2" style="color:var(--gris)">Aucune retenue appliquée</td>
                        <td class="num">{{ $fmt(0) }}</td>
                    </tr>
                @endforelse

                <tr class="ss-total retenue">
                    <td>Total des retenues</td>
                    <td>—</td>
                    <td class="num">- {{ $fmt($totalRetenues) }}</td>
                </tr>
            </tbody>
        </table>

        <div style="padding:10px">
            <div class="net">
                <div class="lib">Net à payer</div>
                <div class="val">{{ $fmt($net) }}</div>
            </div>

            @if ($ecart)
                <div class="alerte">
                    Écart détecté : brut moins retenues = {{ $fmt($brut - $totalRetenues) }},
                    alors que le net enregistré est {{ $fmt($net) }}. Vérifiez le calcul avant remise du bulletin.
                </div>
            @endif
        </div>
    </div>

    <div class="signatures">
        <div>
            <div class="cadre-sign">
                <div class="zone"></div>
                <div class="lib">L'employeur</div>
            </div>
        </div>
        <div class="droite">
            <div class="cadre-sign">
                <div class="zone"></div>
                <div class="lib">L'employé (lu et approuvé)</div>
            </div>
        </div>
    </div>

    <div class="pied">
        Document généré le {{ now()->timezone(config('app.timezone'))->format('d/m/Y à H:i') }}
        — {{ $agence->nom ?? 'Sourougnon Groupe' }}<br>
        Ce bulletin est à conserver sans limitation de durée.
    </div>

</div>
</body>
</html>
