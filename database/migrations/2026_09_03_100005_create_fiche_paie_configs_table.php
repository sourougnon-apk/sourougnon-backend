<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('fiche_paie_configs', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('user_id')->unique();
            $table->json('retenues')->nullable();       // ex: [{"nom":"CNPS","type":"pourcentage","valeur":5}, ...]
            $table->json('mentions_libres')->nullable(); // ex: ["Prime de transport incluse"]
            $table->timestamps();

            $table->foreign('user_id')->references('id')->on('users')->onDelete('cascade');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('fiche_paie_configs');
    }
};
