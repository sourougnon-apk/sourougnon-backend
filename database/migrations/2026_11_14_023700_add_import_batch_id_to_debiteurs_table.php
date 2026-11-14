<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('debiteurs', function (Blueprint $table) {
            $table->string('import_batch_id', 36)->nullable()->after('code_client');
        });
    }

    public function down(): void
    {
        Schema::table('debiteurs', function (Blueprint $table) {
            $table->dropColumn('import_batch_id');
        });
    }
};
