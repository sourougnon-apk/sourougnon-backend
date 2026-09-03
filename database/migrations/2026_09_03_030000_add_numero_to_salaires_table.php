<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('salaires', function (Blueprint $table) {
            $table->string('numero')->nullable()->after('periode');
            $table->unique(['periode', 'numero']);
        });
    }

    public function down(): void
    {
        Schema::table('salaires', function (Blueprint $table) {
            $table->dropUnique(['periode', 'numero']);
            $table->dropColumn('numero');
        });
    }
};
