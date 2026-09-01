<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('mouvements_stock', function (Blueprint $table) {
            if (!Schema::hasColumn('mouvements_stock', 'date_mouvement')) {
                $table->timestamp('date_mouvement')->nullable()->after('type');
            }
        });
    }
    public function down(): void
    {
        Schema::table('mouvements_stock', function (Blueprint $table) {
            $table->dropColumn('date_mouvement');
        });
    }
};
