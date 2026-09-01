<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('clients_comptant', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->string('nom');
            $table->string('telephone')->nullable();
            $table->string('quartier')->nullable();
            $table->foreignId('agent_id')->constrained('users');
            $table->timestamps();
        });
    }
    public function down(): void { Schema::dropIfExists('clients_comptant'); }
};
