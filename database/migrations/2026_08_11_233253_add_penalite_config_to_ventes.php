<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('ventes', function (Blueprint $table) {
            if (!Schema::hasColumn('ventes', 'penalite_active')) {
                $table->boolean('penalite_active')->default(true)->after('penalite_par_jour');
            }
            if (!Schema::hasColumn('ventes', 'motif_penalite')) {
                $table->text('motif_penalite')->nullable()->after('penalite_active');
            }
            if (!Schema::hasColumn('ventes', 'heure_creation')) {
                $table->time('heure_creation')->nullable()->after('date_fin');
            }
        });
        
        // Ajouter heure_mouvement aux mouvements de caisse
        Schema::table('mouvements_caisse', function (Blueprint $table) {
            if (!Schema::hasColumn('mouvements_caisse', 'heure_mouvement')) {
                $table->time('heure_mouvement')->nullable()->after('date_mouvement');
            }
        });
        
        // Ajouter heure_recouvrement aux recouvrements
        Schema::table('recouvrements', function (Blueprint $table) {
            if (!Schema::hasColumn('recouvrements', 'heure_recouvrement')) {
                $table->time('heure_recouvrement')->nullable()->after('date_recouvrement');
            }
        });
    }

    public function down(): void
    {
        Schema::table('ventes', function (Blueprint $table) {
            $table->dropColumn(['penalite_active', 'motif_penalite', 'heure_creation']);
        });
        Schema::table('mouvements_caisse', function (Blueprint $table) {
            $table->dropColumn('heure_mouvement');
        });
        Schema::table('recouvrements', function (Blueprint $table) {
            $table->dropColumn('heure_recouvrement');
        });
    }
};
