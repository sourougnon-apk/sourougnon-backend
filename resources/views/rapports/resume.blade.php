<!DOCTYPE html>
<html lang="fr">
<head><meta charset="utf-8"><title>Résumé Mensuel</title></head>
<body>
<h1>Résumé Mensuel</h1>
<p>Généré le {{ now()->format('d/m/Y H:i') }}</p>
<h2>Aujourd'hui</h2>
<p>Encaissements : {{ number_format($resume['aujourdhui']['encaissements'], 0, ',', ' ') }} FCFA</p>
<p>Nombre de paiements : {{ $resume['aujourdhui']['nb_paiements'] }}</p>
<p>Ventes du jour : {{ $resume['aujourdhui']['ventes_jour'] }}</p>
<h2>Ce mois</h2>
<p>Encaissements : {{ number_format($resume['mois']['encaissements'], 0, ',', ' ') }} FCFA</p>
<p>Nombre de paiements : {{ $resume['mois']['nb_paiements'] }}</p>
<p>Ventes du mois : {{ $resume['mois']['ventes_mois'] }}</p>
<p>Créances : {{ number_format($resume['mois']['creances'], 0, ',', ' ') }} FCFA</p>
<h2>Top Agents du Mois</h2>
<table border="1" cellpadding="5" cellspacing="0" width="100%">
<thead><tr><th>Agent</th><th>Total encaissé</th></tr></thead>
<tbody>
@foreach($resume['top_agents_mois'] as $a)
<tr><td>{{ $a->agent?->nom }} {{ $a->agent?->prenom }}</td><td>{{ number_format($a->total, 0, ',', ' ') }}</td></tr>
@endforeach
</tbody>
</table>
</body>
</html>
