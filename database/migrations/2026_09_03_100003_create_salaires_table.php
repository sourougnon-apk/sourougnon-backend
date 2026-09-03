<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('salaires', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->unsignedBigInteger('employe_id');
            $table->unsignedBigInteger('user_id');
            $table->string('periode', 7); // YYYY-MM
            $table->integer('nb_jours_travailles')->default(0);
            $table->integer('nb_jours_ouvrables')->default(26);
            $table->decimal('salaire_brut', 12, 2)->default(0);
            $table->decimal('salaire_net', 12, 2)->default(0);
            $table->json('lignes_retenues')->nullable();
            $table->enum('statut', ['pending', 'paye'])->default('pending');
            $table->dateTime('date_paiement')->nullable();
            $table->unsignedBigInteger('created_by');
            $table->timestamps();

            $table->unique(['user_id', 'periode']);
            $table->foreign('employe_id')->references('id')->on('employes')->onDelete('cascade');
            $table->foreign('user_id')->references('id')->on('users')->onDelete('cascade');
            $table->foreign('created_by')->references('id')->on('users');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('salaires');
    }
};
