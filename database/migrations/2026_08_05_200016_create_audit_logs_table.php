<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('audit_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('gerante_id')->constrained('users');
            $table->foreignId('ancien_agent_id')->constrained('users');
            $table->foreignId('nouvel_agent_id')->constrained('users');
            $table->integer('nb_debiteurs_transferes')->default(0);
            $table->json('details')->nullable();
            $table->timestamps();
        });
    }
    public function down(): void
    {
        Schema::dropIfExists('audit_logs');
    }
};
