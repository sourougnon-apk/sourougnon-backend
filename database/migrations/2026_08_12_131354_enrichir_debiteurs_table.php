<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('debiteurs', function (Blueprint $table) {
            if (!Schema::hasColumn('debiteurs', 'code_client')) {
                $table->string('code_client', 20)->unique()->nullable()->after('uuid');
            }
            if (!Schema::hasColumn('debiteurs', 'adresse')) {
                $table->text('adresse')->nullable()->after('quartier');
            }
            if (!Schema::hasColumn('debiteurs', 'personne_reference_nom')) {
                $table->string('personne_reference_nom')->nullable()->after('adresse');
            }
            if (!Schema::hasColumn('debiteurs', 'personne_reference_tel')) {
                $table->string('personne_reference_tel')->nullable()->after('personne_reference_nom');
            }
            if (!Schema::hasColumn('debiteurs', 'credits_autorises')) {
                $table->integer('credits_autorises')->default(1)->after('limite_credit');
            }
        });
    }

    public function down(): void
    {
        Schema::table('debiteurs', function (Blueprint $table) {
            $table->dropColumn(['code_client', 'adresse', 'personne_reference_nom', 'personne_reference_tel', 'credits_autorises']);
        });
    }
};
