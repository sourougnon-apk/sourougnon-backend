<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('mouvements_stock', function (Blueprint $table) {
            if (!Schema::hasColumn('mouvements_stock', 'action')) {
                $table->string('action', 20)->default('creation')->after('type');
                // action: creation, modification, suppression, inventaire
            }
        });
    }

    public function down(): void
    {
        Schema::table('mouvements_stock', function (Blueprint $table) {
            $table->dropColumn('action');
        });
    }
};
