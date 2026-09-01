<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('tournee_demarrages', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->foreignId('agent_id')->constrained('users')->cascadeOnDelete();
            $table->date('date_tournee');
            $table->dateTime('heure_demarrage');
            $table->dateTime('heure_fin')->nullable();
            $table->string('statut')->default('en_cours'); // en_cours, terminee
            $table->string('gps_depart')->nullable();
            $table->string('gps_arrivee')->nullable();
            $table->boolean('synced')->default(true);
            $table->string('sync_uuid')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('tournee_demarrages');
    }
};
