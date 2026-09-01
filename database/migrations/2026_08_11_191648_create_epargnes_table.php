<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('epargnes', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->foreignId('vente_id')->constrained('ventes')->onDelete('cascade');
            $table->foreignId('debiteur_id')->constrained('debiteurs')->onDelete('cascade');
            $table->decimal('montant', 10, 2);
            $table->date('date_collecte');
            $table->enum('statut', ['collecte', 'recuperee'])->default('collecte');
            $table->foreignId('recuperee_par')->nullable()->constrained('users')->onDelete('set null');
            $table->date('date_recuperation')->nullable();
            $table->boolean('confirmation_client')->default(false);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('epargnes');
    }
};
