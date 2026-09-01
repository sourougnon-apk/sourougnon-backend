<!DOCTYPE html>
<html lang="fr">
<head><meta charset="utf-8"><title>Rapport Recouvrements</title></head>
<body>
<h1>Rapport des Paiements</h1>
<p>Généré le {{ now()->format('d/m/Y H:i') }}</p>
<table border="1" cellpadding="5" cellspacing="0" width="100%">
<thead><tr><th>Date</th><th>Débiteur</th><th>Agent</th><th>Montant</th><th>Mode</th><th>Statut</th><th>Commentaire</th></tr></thead>
<tbody>
@foreach($recouvrements as $r)
<tr>
<td>{{ $r->date_recouvrement->format('d/m/Y') }}</td>
<td>{{ $r->vente?->debiteur?->nom }} {{ $r->vente?->debiteur?->prenom }}</td>
<td>{{ $r->agent?->nom }}</td>
<td>{{ number_format($r->montant, 0, ',', ' ') }}</td>
<td>{{ $r->mode_paiement }}</td>
<td>{{ $r->statut }}</td>
<td>{{ $r->commentaire }}</td>
</tr>
@endforeach
</tbody>
</table>
</body>
</html>
