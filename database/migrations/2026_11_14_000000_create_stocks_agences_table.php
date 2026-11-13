<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('stocks_agences', function (Blueprint $table) {
            $table->id();
            // agences.id est un int(11) SIGNÉ, on utilise integer()
            $table->integer('agence_id');
            // produits.id est un bigint(20) unsigned
            $table->foreignId('produit_id')->constrained('produits')->cascadeOnDelete();
            
            $table->integer('quantite')->default(0);
            $table->integer('seuil_alerte')->default(5);
            $table->timestamps();

            $table->foreign('agence_id')->references('id')->on('agences')->cascadeOnDelete();
            $table->unique(['agence_id', 'produit_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('stocks_agences');
    }
};
