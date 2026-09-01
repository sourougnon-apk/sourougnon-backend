<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('mouvements_stock', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->foreignId('produit_id')->constrained('produits');
            $table->foreignId('user_id')->constrained('users');
            $table->enum('type', ['entree', 'sortie', 'inventaire', 'retour', 'perte']);
            $table->integer('quantite');
            $table->decimal('prix_unitaire', 12, 2)->default(0);
            $table->string('fournisseur')->nullable();
            $table->string('reference')->nullable();
            $table->text('motif')->nullable();
            $table->integer('stock_avant')->default(0);
            $table->integer('stock_apres')->default(0);
            $table->timestamps();
        });
    }
    public function down(): void { Schema::dropIfExists('mouvements_stock'); }
};
