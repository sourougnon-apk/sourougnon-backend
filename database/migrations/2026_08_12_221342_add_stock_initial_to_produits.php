<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('produits', function (Blueprint $table) {
            if (!Schema::hasColumn('produits', 'categorie_id')) {
                $table->foreignId('categorie_id')->nullable()->after('uuid')->constrained('categories')->onDelete('set null');
            }
            if (!Schema::hasColumn('produits', 'stock_initial')) {
                $table->decimal('stock_initial', 10, 2)->default(0)->after('stock');
            }
        });
    }

    public function down(): void
    {
        Schema::table('produits', function (Blueprint $table) {
            $table->dropConstrainedForeignId('categorie_id');
            $table->dropColumn('stock_initial');
        });
    }
};
