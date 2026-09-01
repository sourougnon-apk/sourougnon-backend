<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('ventes', function (Blueprint $table) {
            $table->decimal('epargne_par_jour', 8, 2)->default(0)->after('epargne');
            $table->decimal('epargne_total', 10, 2)->default(0)->after('epargne_par_jour');
            $table->decimal('penalite_par_jour', 8, 2)->default(1000)->after('epargne_total');
            $table->decimal('mise_agent', 8, 2)->default(0)->after('penalite_par_jour');
        });
    }

    public function down(): void
    {
        Schema::table('ventes', function (Blueprint $table) {
            $table->dropColumn(['epargne_par_jour', 'epargne_total', 'penalite_par_jour', 'mise_agent']);
        });
    }
};
