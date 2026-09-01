<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('caisses', function (Blueprint $t) {
            if (!Schema::hasColumn('caisses', 'agence_id')) {
                $t->unsignedInteger('agence_id')->nullable();
            }
            if (!Schema::hasColumn('caisses', 'type_caisse')) {
                $t->string('type_caisse', 20)->default('agent');
            }
            if (!Schema::hasColumn('caisses', 'caisse_parente_id')) {
                $t->unsignedInteger('caisse_parente_id')->nullable();
            }
        });

        if (!Schema::hasColumn('agences', 'updated_at')) {
            DB::statement("ALTER TABLE agences ADD updated_at TIMESTAMP NULL");
        }

        DB::statement("ALTER TABLE mouvements_caisse MODIFY COLUMN type ENUM('encaissement','decaissement','depot','retrait','transfert','salaire','epargne','penalite','remise','versement')");
    }

    public function down(): void {}
};
