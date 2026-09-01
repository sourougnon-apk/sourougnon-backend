<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // Solution 1 : Modifier l'enum (MySQL)
        DB::statement("ALTER TABLE users MODIFY COLUMN role ENUM('gerante', 'chef_agence', 'agent') NOT NULL DEFAULT 'agent'");
    }

    public function down(): void
    {
        // Pas nécessaire de revenir en arrière
    }
};