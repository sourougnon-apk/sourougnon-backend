<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('synthese_journaliere', function (Blueprint $table) {
            $table->id();
            $table->date('date');
            $table->foreignId('agent_id')->constrained('users');
            $table->integer('nb_debiteurs')->default(0);
            $table->decimal('montant_attendu', 12, 2)->default(0);
            $table->decimal('montant_encaisse', 12, 2)->default(0);
            $table->decimal('montant_impaye', 12, 2)->default(0);
            $table->decimal('taux_recouvrement', 5, 2)->default(0);
            $table->timestamps();
            $table->unique(['date', 'agent_id']);
        });
    }
    public function down(): void { Schema::dropIfExists('synthese_journaliere'); }
};
