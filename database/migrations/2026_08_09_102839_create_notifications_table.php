<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('notifications', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->foreignId('user_id')->constrained('users');
            $table->string('type'); // echeance, retard, stock, vente, paiement
            $table->string('titre');
            $table->text('message');
            $table->string('lien')->nullable();
            $table->boolean('lue')->default(false);
            $table->boolean('envoyee_whatsapp')->default(false);
            $table->timestamp('date_envoi')->nullable();
            $table->timestamps();
            $table->index(['user_id','lue']);
        });
    }
    public function down(): void { Schema::dropIfExists('notifications'); }
};
