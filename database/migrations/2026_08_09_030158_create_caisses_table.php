<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('caisses', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->foreignId('user_id')->constrained('users');
            $table->date('date_ouverture');
            $table->date('date_fermeture')->nullable();
            $table->decimal('solde_initial', 12, 2)->default(0);
            $table->decimal('solde_theorique', 12, 2)->default(0);
            $table->decimal('solde_reel', 12, 2)->nullable();
            $table->decimal('ecart', 12, 2)->nullable();
            $table->enum('statut', ['ouverte', 'fermee'])->default('ouverte');
            $table->text('notes')->nullable();
            $table->timestamps();
        });
        Schema::create('mouvements_caisse', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->foreignId('caisse_id')->constrained('caisses')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained('users');
            $table->foreignId('recouvrement_id')->nullable()->constrained('recouvrements')->nullOnDelete();
            $table->enum('type', ['encaissement', 'decaissement', 'depot', 'retrait', 'transfert']);
            $table->decimal('montant', 12, 2);
            $table->string('mode_paiement')->default('especes');
            $table->string('reference')->nullable();
            $table->text('motif')->nullable();
            $table->dateTime('date_mouvement');
            $table->timestamps();
        });
    }
    public function down(): void
    {
        Schema::dropIfExists('mouvements_caisse');
        Schema::dropIfExists('caisses');
    }
};
