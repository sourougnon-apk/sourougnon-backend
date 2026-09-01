<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('debiteurs', function (Blueprint $table) {
            if (!Schema::hasColumn('debiteurs', 'ancien_agent_id')) {
                $table->foreignId('ancien_agent_id')->nullable()->constrained('users')->nullOnDelete();
            }
            if (!Schema::hasColumn('debiteurs', 'date_transfert')) {
                $table->timestamp('date_transfert')->nullable();
            }
            if (!Schema::hasColumn('debiteurs', 'taux_recouvrement_au_transfert')) {
                $table->decimal('taux_recouvrement_au_transfert', 5, 2)->nullable();
            }
            if (!Schema::hasColumn('debiteurs', 'reste_a_payer_au_transfert')) {
                $table->decimal('reste_a_payer_au_transfert', 12, 2)->nullable();
            }
        });
    }
    public function down(): void
    {
        Schema::table('debiteurs', function (Blueprint $table) {
            $table->dropForeign(['ancien_agent_id']);
            $table->dropColumn(['ancien_agent_id', 'date_transfert', 'taux_recouvrement_au_transfert', 'reste_a_payer_au_transfert']);
        });
    }
};
