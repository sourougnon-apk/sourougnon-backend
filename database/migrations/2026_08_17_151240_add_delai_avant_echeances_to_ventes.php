<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('ventes', function (Blueprint $t) {
            $t->unsignedTinyInteger('delai_avant_echeances')->default(1)->after('nombre_jours');
        });
    }

    public function down(): void
    {
        Schema::table('ventes', function (Blueprint $t) {
            $t->dropColumn('delai_avant_echeances');
        });
    }
};
