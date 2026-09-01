<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('debiteurs', function (Blueprint $table) {
            $table->foreignId('ancien_agent_id')->nullable()->constrained('users');
            $table->timestamp('date_transfert')->nullable();
            $table->decimal('taux_recouvrement_au_transfert',5,2)->nullable();
            $table->decimal('reste_a_payer_au_transfert',12,2)->nullable();
        });
    }
    public function down(): void
    {
        Schema::table('debiteurs', function (Blueprint $table) {
            $table->dropForeign(['ancien_agent_id']);
            $table->dropColumn(['ancien_agent_id','date_transfert','taux_recouvrement_au_transfert','reste_a_payer_au_transfert']);
        });
    }
};
