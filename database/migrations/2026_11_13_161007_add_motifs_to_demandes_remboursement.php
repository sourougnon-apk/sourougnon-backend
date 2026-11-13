<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('demandes_remboursement', function (Blueprint $table) {
            $table->text('motif_demande')->nullable()->after('statut');
            $table->text('motif_validation')->nullable()->after('motif_demande');
        });
    }

    public function down(): void
    {
        Schema::table('demandes_remboursement', function (Blueprint $table) {
            $table->dropColumn(['motif_demande', 'motif_validation']);
        });
    }
};
