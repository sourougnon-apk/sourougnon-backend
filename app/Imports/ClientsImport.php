<?php

namespace App\Imports;

use App\Models\Debiteur;
use Illuminate\Support\Str;
use Maatwebsite\Excel\Concerns\ToModel;
use Maatwebsite\Excel\Concerns\WithHeadingRow;

class ClientsImport implements ToModel, WithHeadingRow
{
    public static $batchId = null;

    public function model(array $row)
    {
        // Nettoyage des données
        $code = trim($row['code'] ?? '');
        $nomComplet = str_replace("\n", ' ', trim($row['nom_complet'] ?? ''));
        $telephone = trim($row['telephone'] ?? '');
        $quartier = trim($row['quartier'] ?? '');
        $sexe = trim($row['sexe'] ?? '');

        // Séparer le nom et le prénom (le premier mot est le nom, le reste est le prénom)
        $parts = explode(' ', $nomComplet, 2);
        $nom = $parts[0];
        $prenom = $parts[1] ?? '';

        // Vérifier si le client existe déjà par son code
        if (Debiteur::where('code_client', $code)->exists()) {
            return null; // Ignorer les doublons
        }

        return new Debiteur([
            'uuid' => (string) Str::uuid(),
            'import_batch_id' => self::$batchId,
            'code_client' => $code,
            'nom' => $nom,
            'prenom' => $prenom,
            'telephone' => $telephone,
            'quartier' => $quartier,
            'sexe' => $sexe,
            'sexe' => $sexe,
            'agent_id' => null,
            'agence_id' => null,
            'actif' => true,
            'score_solvabilite' => 50,
            'limites_credit' => 0,
            'credits_autorises' => 1,
        ]);
    }
}
