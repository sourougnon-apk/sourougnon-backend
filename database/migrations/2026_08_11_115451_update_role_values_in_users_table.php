<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::statement("UPDATE users SET role = 'gerante' WHERE role = 'admin'");
        DB::statement("UPDATE users SET role = 'agent' WHERE role = 'comptable'");
        DB::statement("ALTER TABLE users MODIFY COLUMN role ENUM('gerante', 'chef_agence', 'agent') NOT NULL DEFAULT 'agent'");
    }

    public function down(): void
    {
        DB::statement("ALTER TABLE users MODIFY COLUMN role ENUM('gerante','agent','comptable','admin') NOT NULL DEFAULT 'agent'");
    }
};
