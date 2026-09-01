<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('permissions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->onDelete('cascade');
            $table->string('page'); // dashboard, agent-space, chef-agence, agents, debiteurs, suivi, caisse, stocks, produits, ventes, comptant, alertes, parametres, comptabilite, statistiques, notifications, etats-croises, rapports
            $table->boolean('acces')->default(true);
            $table->timestamps();
            $table->unique(['user_id', 'page']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('permissions');
    }
};
