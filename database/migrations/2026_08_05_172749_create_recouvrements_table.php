<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('recouvrements', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->foreignId('vente_id')->constrained('ventes');
            $table->foreignId('agent_id')->constrained('users');
            $table->decimal('montant', 12, 2);
            $table->date('date_recouvrement');
            $table->enum('mode_paiement', ['especes', 'mobile', 'autre'])->default('especes');
            $table->enum('statut', ['paye', 'partiel', 'refus', 'absent', 'promesse'])->default('paye');
            $table->text('commentaire')->nullable();
            $table->boolean('synced')->default(false);
            $table->uuid('sync_uuid')->nullable();
            $table->timestamps();
        });
    }
    public function down(): void { Schema::dropIfExists('recouvrements'); }
};
