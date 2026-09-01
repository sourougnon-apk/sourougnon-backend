<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('debiteurs', function (Blueprint $table) {
            $table->decimal('score_solvabilite', 5, 2)->default(1.00)->change();
        });
    }

    public function down(): void
    {
        Schema::table('debiteurs', function (Blueprint $table) {
            $table->decimal('score_solvabilite', 3, 2)->default(1.00)->change();
        });
    }
};
