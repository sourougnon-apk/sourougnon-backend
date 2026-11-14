<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Maatwebsite\Excel\Facades\Excel;
use App\Imports\ClientsImport;

class ImportClients extends Command
{
    protected $signature = 'clients:import {file=clients.xlsx}';
    protected $description = 'Importe la liste des clients depuis un fichier Excel';

    public function handle()
    {
        $file = storage_path('app/imports/' . $this->argument('file'));

        if (!file_exists($file)) {
            $this->error("Fichier introuvable : $file");
            return;
        }

        $this->info('Début de l\'importation...');
        
        try {
            Excel::import(new ClientsImport, $file);
            $this->info('Importation terminée avec succès.');
        } catch (\Exception $e) {
            $this->error('Erreur lors de l\'importation : ' . $e->getMessage());
        }
    }
}
