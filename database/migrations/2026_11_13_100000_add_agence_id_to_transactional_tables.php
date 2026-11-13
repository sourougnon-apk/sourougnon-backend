<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    private function tables(): array
    {
        $models = [
            \App\Models\Vente::class,
            \App\Models\Debiteur::class,
            \App\Models\Recouvrement::class,
            \App\Models\MouvementCaisse::class,
            \App\Models\MouvementStock::class,
        ];

        $tables = [];
        foreach ($models as $model) {
            if (class_exists($model)) {
                $tables[] = (new $model)->getTable();
            }
        }
        return array_values(array_unique($tables));
    }

    public function up(): void
    {
        $nbAgences = DB::table('agences')->count();
        if ($nbAgences !== 1) {
            throw new \RuntimeException("Rattrapage prévu pour une seule agence. Agences trouvées : {$nbAgences}.");
        }
        $agenceId = (int) DB::table('agences')->value('id');

        foreach ($this->tables() as $table) {
            if (!Schema::hasColumn($table, 'agence_id')) {
                Schema::table($table, function (Blueprint $t) {
                    $t->unsignedInteger('agence_id')->nullable()->index();
                });
            }
            DB::table($table)->whereNull('agence_id')->update(['agence_id' => $agenceId]);
        }
    }

    public function down(): void
    {
        foreach ($this->tables() as $table) {
            if (Schema::hasColumn($table, 'agence_id')) {
                Schema::table($table, function (Blueprint $t) {
                    $t->dropIndex(['agence_id']);
                    $t->dropColumn('agence_id');
                });
            }
        }
    }
};
