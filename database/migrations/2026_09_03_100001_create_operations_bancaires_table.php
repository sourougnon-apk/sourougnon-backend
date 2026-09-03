<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('operations_bancaires', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->unsignedBigInteger('compte_debit_id')->nullable();
            $table->unsignedBigInteger('compte_credit_id')->nullable();
            $table->enum('type', ['depot', 'retrait', 'transfert']);
            $table->decimal('montant', 12, 2);
            $table->dateTime('date_operation');
            $table->unsignedBigInteger('user_id');
            $table->enum('source', ['caisse', 'externe'])->default('externe');
            $table->unsignedBigInteger('mouvement_caisse_id')->nullable();
            $table->char('transfert_group', 36)->nullable();
            $table->string('reference')->nullable();
            $table->text('motif')->nullable();
            $table->timestamps();

            $table->foreign('compte_debit_id')->references('id')->on('comptes_bancaires')->onDelete('cascade');
            $table->foreign('compte_credit_id')->references('id')->on('comptes_bancaires')->onDelete('cascade');
            $table->foreign('user_id')->references('id')->on('users');
            $table->foreign('mouvement_caisse_id')->references('id')->on('mouvements_caisse')->onDelete('set null');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('operations_bancaires');
    }
};
