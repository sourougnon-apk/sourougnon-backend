<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('ventes', function (Blueprint $table) {
            if (!Schema::hasColumn('ventes', 'type_vente')) {
                $table->enum('type_vente', ['comptant', 'credit'])->default('credit')->after('produit_id');
            }
            if (!Schema::hasColumn('ventes', 'epargne')) {
                $table->decimal('epargne', 12, 2)->default(0)->after('nombre_jours');
            }
        });
    }
    public function down(): void
    {
        Schema::table('ventes', function (Blueprint $table) {
            $table->dropColumn(['type_vente', 'epargne']);
        });
    }
};
