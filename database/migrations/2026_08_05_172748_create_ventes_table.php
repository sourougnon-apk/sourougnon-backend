<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('ventes', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->foreignId('debiteur_id')->constrained('debiteurs');
            $table->foreignId('agent_id')->constrained('users');
            $table->foreignId('produit_id')->nullable()->constrained('produits');
            $table->decimal('montant_total', 12, 2);
            $table->decimal('montant_journalier', 12, 2);
            $table->integer('nombre_jours');
            $table->date('date_debut');
            $table->date('date_fin');
            $table->enum('statut', ['en_cours', 'termine', 'defaut', 'annule'])->default('en_cours');
            $table->timestamps();
        });
    }
    public function down(): void { Schema::dropIfExists('ventes'); }
};
