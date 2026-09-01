<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('penalites', function (Blueprint $table) {
            $table->string('statut')->default('en_attente')->after('montant');
            $table->dateTime('date_paiement')->nullable()->after('statut');
            $table->string('mode_paiement')->nullable()->after('date_paiement');
            $table->boolean('refus_defalque_epargne')->default(false)->after('mode_paiement');
        });
    }

    public function down(): void
    {
        Schema::table('penalites', function (Blueprint $table) {
            $table->dropColumn(['statut', 'date_paiement', 'mode_paiement', 'refus_defalque_epargne']);
        });
    }
};
