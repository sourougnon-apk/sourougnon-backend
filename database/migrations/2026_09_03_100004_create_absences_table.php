<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('absences', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->unsignedBigInteger('employe_id');
            $table->date('date_debut');
            $table->date('date_fin');
            $table->enum('type', ['conge', 'maladie', 'injustifiee'])->default('conge');
            $table->text('motif')->nullable();
            $table->timestamps();

            $table->foreign('employe_id')->references('id')->on('employes')->onDelete('cascade');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('absences');
    }
};
