<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('demandes_remboursement', function (Blueprint $t) {
            $t->id();
            $t->uuid('uuid')->unique();
            $t->foreignId('vente_id')->constrained('ventes')->cascadeOnDelete();
            $t->foreignId('demandeur_id')->constrained('users');
            $t->foreignId('validateur_id')->nullable()->constrained('users');
            $t->decimal('montant_credit_paye', 12, 2);
            $t->decimal('montant_rembourse', 12, 2);
            $t->decimal('montant_epargne_rembourse', 12, 2);
            $t->string('statut', 20)->default('en_attente');
            $t->text('commentaire_gerante')->nullable();
            $t->timestamp('date_validation')->nullable();
            $t->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('demandes_remboursement');
    }
};
