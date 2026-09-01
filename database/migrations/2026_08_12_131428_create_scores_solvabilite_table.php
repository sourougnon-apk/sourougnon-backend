<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('scores_solvabilite', function (Blueprint $table) {
            $table->id();
            $table->foreignId('debiteur_id')->constrained('debiteurs')->onDelete('cascade');
            $table->integer('score')->default(100); // 0-100, 100 = excellent
            $table->integer('nb_credits_total')->default(0);
            $table->integer('nb_credits_termines')->default(0);
            $table->integer('nb_retards')->default(0);
            $table->decimal('montant_total_rembourse', 12, 2)->default(0);
            $table->decimal('montant_total_du', 12, 2)->default(0);
            $table->timestamp('date_calcul')->useCurrent();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('scores_solvabilite');
    }
};
