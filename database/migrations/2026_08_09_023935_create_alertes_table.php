<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('alertes', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->foreignId('vente_id')->nullable()->constrained('ventes')->nullOnDelete();
            $table->foreignId('debiteur_id')->nullable()->constrained('debiteurs')->nullOnDelete();
            $table->foreignId('produit_id')->nullable()->constrained('produits')->nullOnDelete();
            $table->string('type'); // retard, echeance_jour, stock_faible, credit_finissant
            $table->string('titre');
            $table->text('message')->nullable();
            $table->enum('niveau', ['info', 'avertissement', 'critique'])->default('info');
            $table->boolean('lue')->default(false);
            $table->timestamp('date_alerte')->useCurrent();
            $table->timestamps();
            $table->index(['lue', 'date_alerte']);
        });
    }
    public function down(): void { Schema::dropIfExists('alertes'); }
};
