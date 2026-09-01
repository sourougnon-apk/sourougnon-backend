<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('echeances', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->foreignId('vente_id')->constrained('ventes')->cascadeOnDelete();
            $table->date('date_echeance');
            $table->decimal('montant_prevu', 12, 2);
            $table->decimal('montant_paye', 12, 2)->default(0);
            $table->enum('statut', ['en_attente','paye','partiel','en_retard','annule'])->default('en_attente');
            $table->integer('jours_retard')->default(0);
            $table->date('date_paiement')->nullable();
            $table->timestamps();
            $table->index(['vente_id','date_echeance']);
            $table->index(['statut','date_echeance']);
        });
    }
    public function down(): void { Schema::dropIfExists('echeances'); }
};
