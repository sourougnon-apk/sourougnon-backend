<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('operations_bancaires', function (Blueprint $table) {
            $table->string('beneficiaire')->nullable()->after('motif');
        });
    }

    public function down(): void
    {
        Schema::table('operations_bancaires', function (Blueprint $table) {
            $table->dropColumn('beneficiaire');
        });
    }
};
