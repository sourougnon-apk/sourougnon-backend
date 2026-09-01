<!DOCTYPE html>
<html lang="fr">
<head><meta charset="utf-8"><title>Rapport Ventes</title></head>
<body>
<h1>Rapport des Ventes</h1>
<p>Généré le {{ now()->format('d/m/Y H:i') }}</p>
<table border="1" cellpadding="5" cellspacing="0" width="100%">
<thead><tr><th>N° Vente</th><th>Date</th><th>Débiteur</th><th>Téléphone</th><th>Agent</th><th>Type</th><th>Montant</th><th>Journalier</th><th>Payé</th><th>Restant</th><th>Statut</th></tr></thead>
<tbody>
@foreach($ventes as $v)
<tr>
<td>{{ $v->uuid }}</td>
<td>{{ $v->date_debut->format('d/m/Y') }}</td>
<td>{{ $v->debiteur?->nom }} {{ $v->debiteur?->prenom }}</td>
<td>{{ $v->debiteur?->telephone }}</td>
<td>{{ $v->agent?->nom }} {{ $v->agent?->prenom }}</td>
<td>{{ $v->type_vente }}</td>
<td>{{ number_format($v->montant_total, 0, ',', ' ') }}</td>
<td>{{ number_format($v->montant_journalier, 0, ',', ' ') }}</td>
<td>{{ number_format($v->totalPaye(), 0, ',', ' ') }}</td>
<td>{{ number_format($v->resteAPayer(), 0, ',', ' ') }}</td>
<td>{{ $v->statut }}</td>
</tr>
@endforeach
</tbody>
</table>
</body>
</html>
