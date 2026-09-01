<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::table('mouvements_caisse', function (Blueprint $table) {
            $table->string('statut_validation')->default('valide')->after('type');
            $table->foreignId('valide_par')->nullable()->constrained('users')->nullOnDelete()->after('statut_validation');
            $table->timestamp('valide_le')->nullable()->after('valide_par');
        });
    }

    public function down()
    {
        Schema::table('mouvements_caisse', function (Blueprint $table) {
            $table->dropConstrainedForeignId('valide_par');
            $table->dropColumn(['statut_validation', 'valide_le']);
        });
    }
};
