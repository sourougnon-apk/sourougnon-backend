<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // 1. Rendre debiteur_id nullable en préservant la clé étrangère
        DB::statement('ALTER TABLE ventes MODIFY debiteur_id BIGINT UNSIGNED NULL');

        // 2. Ajouter la colonne de traçabilité du client comptant
        Schema::table('ventes', function (Blueprint $table) {
            $table->unsignedBigInteger('client_comptant_id')->nullable()->after('debiteur_id');
            $table->foreign('client_comptant_id')
                  ->references('id')
                  ->on('clients_comptant')
                  ->onDelete('set null');
        });
    }

    public function down(): void
    {
        // Supprimer la colonne client_comptant_id et sa contrainte
        Schema::table('ventes', function (Blueprint $table) {
            $table->dropForeign(['client_comptant_id']);
            $table->dropColumn('client_comptant_id');
        });

        // Remettre debiteur_id NOT NULL, mais seulement s'il n'y a pas de vente comptant sans débiteur
        $count = DB::table('ventes')->whereNull('debiteur_id')->count();
        if ($count > 0) {
            throw new \RuntimeException(
                'Rollback impossible : ' . $count . ' vente(s) comptant sans débiteur existent. '
                . 'Supprimez-les avant de revenir en arrière.'
            );
        }

        DB::statement('ALTER TABLE ventes MODIFY debiteur_id BIGINT UNSIGNED NOT NULL');
    }
};