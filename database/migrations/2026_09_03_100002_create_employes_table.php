<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('employes', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->unsignedBigInteger('user_id')->unique();
            $table->string('poste')->nullable();
            $table->date('date_embauche')->nullable();
            $table->decimal('salaire_base', 12, 2)->default(0);
            $table->enum('mode_calcul', ['fixe', 'journalier'])->default('journalier');
            $table->timestamps();

            $table->foreign('user_id')->references('id')->on('users')->onDelete('cascade');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('employes');
    }
};
