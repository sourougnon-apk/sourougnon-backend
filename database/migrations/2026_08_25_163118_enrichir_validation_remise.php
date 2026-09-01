<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::table('mouvements_caisse', function (Blueprint $table) {
            // Changer le type de statut_validation en enum
            $table->enum('statut_validation', ['en_attente', 'valide', 'ecart', 'rejete'])
                  ->default('en_attente')
                  ->change();

            // Colonnes supplémentaires pour le contrôle de remise
            $table->decimal('montant_declare', 12, 2)->nullable()->after('montant');
            $table->decimal('montant_recu', 12, 2)->nullable()->after('montant_declare');
            $table->decimal('ecart_remise', 12, 2)->nullable()->after('montant_recu');
            $table->text('motif_rejet')->nullable()->after('motif');

            // Index composite pour les recherches de remises en attente
            $table->index(['type', 'statut_validation'], 'idx_remise_validation');
        });
    }

    public function down()
    {
        Schema::table('mouvements_caisse', function (Blueprint $table) {
            $table->dropIndex('idx_remise_validation');
            $table->dropColumn(['montant_declare', 'montant_recu', 'ecart_remise', 'motif_rejet']);
            $table->string('statut_validation')->default('valide')->change();
        });
    }
};
