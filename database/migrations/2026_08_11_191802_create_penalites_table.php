<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('penalites', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->foreignId('vente_id')->constrained('ventes')->onDelete('cascade');
            $table->foreignId('echeance_id')->nullable()->constrained('echeances')->onDelete('cascade');
            $table->foreignId('recouvrement_id')->nullable()->constrained('recouvrements')->onDelete('cascade');
            $table->foreignId('debiteur_id')->constrained('debiteurs')->onDelete('cascade');
            $table->decimal('montant', 10, 2);
            $table->integer('jours_retard')->default(0);
            $table->date('date_appliquee');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('penalites');
    }
};
