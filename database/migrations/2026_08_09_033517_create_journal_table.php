<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('journals', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->string('numero_ecriture');
            $table->date('date_ecriture');
            $table->string('compte_debit');
            $table->string('compte_credit');
            $table->decimal('montant', 12, 2);
            $table->string('libelle');
            $table->string('reference')->nullable();
            $table->foreignId('recouvrement_id')->nullable()->constrained('recouvrements')->nullOnDelete();
            $table->foreignId('vente_id')->nullable()->constrained('ventes')->nullOnDelete();
            $table->foreignId('mouvement_caisse_id')->nullable()->constrained('mouvements_caisse')->nullOnDelete();
            $table->foreignId('user_id')->constrained('users');
            $table->timestamps();
            $table->index('date_ecriture');
            $table->index('compte_debit');
            $table->index('compte_credit');
        });
    }
    public function down(): void { Schema::dropIfExists('journals'); }
};
