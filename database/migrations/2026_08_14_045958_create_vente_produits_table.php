<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('vente_produits')) {
            Schema::create('vente_produits', function (Blueprint $table) {
                $table->id();
                $table->foreignId('vente_id')->constrained('ventes')->onDelete('cascade');
                $table->foreignId('produit_id')->constrained('produits')->onDelete('cascade');
                $table->integer('quantite')->default(1);
                $table->decimal('prix_unitaire', 12, 2);
                $table->timestamps();
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('vente_produits');
    }
};
