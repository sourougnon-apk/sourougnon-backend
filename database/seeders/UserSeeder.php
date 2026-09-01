<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class UserSeeder extends Seeder
{
    public function run(): void
    {
        User::create([
            'uuid' => '00000000-0000-0000-0000-000000000001',
            'nom' => 'Admin',
            'prenom' => 'Gerante',
            'email' => 'gerante@sourougnon.com',
            'telephone' => '0000000000',
            'role' => 'gerante',
            'password' => bcrypt('admin123'),
        ]);

        $agents = [
            ['nom' => 'Koffi', 'prenom' => 'Jean', 'email' => 'jean.koffi@sourougnon.com'],
            ['nom' => 'Mensah', 'prenom' => 'Abla', 'email' => 'abla.mensah@sourougnon.com'],
            ['nom' => 'Akakpo', 'prenom' => 'Kodjo', 'email' => 'kodjo.akakpo@sourougnon.com'],
        ];

        foreach ($agents as $agent) {
            User::create([
                'uuid' => Str::uuid(),
                'nom' => $agent['nom'],
                'prenom' => $agent['prenom'],
                'email' => $agent['email'],
                'role' => 'agent',
                'password' => bcrypt('agent123'),
            ]);
        }
    }
}
