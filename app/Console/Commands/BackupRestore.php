<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Artisan;

class BackupRestore extends Command
{
    protected $signature = 'backup:restore {file : Nom du fichier de sauvegarde (.sql.gz)}';
    protected $description = 'Restaure une sauvegarde après dump de sécurité et mode maintenance';

    public function handle(): int
    {
        $file = $this->argument('file');
        $backupDir = storage_path('app/backups');
        $path = $backupDir . '/' . basename($file);

        if (!File::exists($path)) {
            $this->error("Fichier introuvable : $file");
            return self::FAILURE;
        }

        // 1. Dump de sécurité automatique
        $safetyFile = 'pre_restore_' . now()->format('Ymd_His') . '.sql.gz';
        $safetyPath = $backupDir . '/' . $safetyFile;
        $this->info('Dump de sécurité en cours...');

        $db = config('database.connections.mysql.database');
        $user = config('database.connections.mysql.username');
        $pass = config('database.connections.mysql.password');
        $host = config('database.connections.mysql.host');
        $port = config('database.connections.mysql.port') ?? 3306;

        $dumpCmd = sprintf(
            'mysqldump -h %s -P %s -u %s %s %s --single-transaction --quick | gzip > %s',
            escapeshellarg($host),
            escapeshellarg((string)$port),
            escapeshellarg($user),
            $pass ? '-p' . escapeshellarg($pass) : '',
            escapeshellarg($db),
            escapeshellarg($safetyPath)
        );
        exec($dumpCmd, $out, $code);
        if ($code !== 0) {
            $this->error('Échec du dump de sécurité');
            return self::FAILURE;
        }

        // 2. Mode maintenance
        Artisan::call('down');

        // 3. Restauration
        $restoreCmd = sprintf(
            'gunzip < %s | mysql -h %s -P %s -u %s %s %s',
            escapeshellarg($path),
            escapeshellarg($host),
            escapeshellarg((string)$port),
            escapeshellarg($user),
            $pass ? '-p' . escapeshellarg($pass) : '',
            escapeshellarg($db)
        );
        exec($restoreCmd, $restoreOut, $restoreCode);

        // 4. Fin de maintenance
        Artisan::call('up');

        if ($restoreCode !== 0) {
            $this->error('Restauration échouée');
            return self::FAILURE;
        }

        $this->info('Restauration terminée');
        $this->info('Safety dump : ' . $safetyFile);
        return self::SUCCESS;
    }
}
