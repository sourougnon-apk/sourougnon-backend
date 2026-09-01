<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('sync_logs', function (Blueprint $table) {
            $table->id();
            $table->uuid('sync_uuid')->unique();
            $table->foreignId('agent_id')->constrained('users');
            $table->enum('status', ['pending', 'success', 'conflict', 'failed'])->default('pending');
            $table->json('payload')->nullable();
            $table->timestamps();
        });
    }
    public function down(): void { Schema::dropIfExists('sync_logs'); }
};
