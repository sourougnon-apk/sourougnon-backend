<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('debiteurs', function (Blueprint $table) {
            $table->string('sexe', 10)->nullable()->after('quartier');
        });
    }

    public function down(): void
    {
        Schema::table('debiteurs', function (Blueprint $table) {
            $table->dropColumn('sexe');
        });
    }
};
