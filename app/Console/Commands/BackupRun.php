<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\File;

class BackupRun extends Command
{
    protected $signature = 'backup:run';
    protected $description = 'Crée une sauvegarde locale de la base MySQL';

    public function handle(): int
    {
        $backupDir = storage_path('app/backups');
        if (!File::isDirectory($backupDir)) {
            File::makeDirectory($backupDir, 0755, true);
        }

        $db = config('database.connections.mysql.database');
        $user = config('database.connections.mysql.username');
        $pass = config('database.connections.mysql.password');
        $host = config('database.connections.mysql.host');
        $port = config('database.connections.mysql.port') ?? 3306;

        $filename = 'sourougnon_db_' . now()->format('Ymd_His') . '.sql.gz';
        $path = $backupDir . '/' . $filename;

        $cmd = sprintf(
            'mysqldump -h %s -P %s -u %s %s %s --single-transaction --quick | gzip > %s',
            escapeshellarg($host),
            escapeshellarg((string)$port),
            escapeshellarg($user),
            $pass ? '-p' . escapeshellarg($pass) : '',
            escapeshellarg($db),
            escapeshellarg($path)
        );

        $output = null;
        $code = 0;
        exec($cmd, $output, $code);

        if ($code !== 0) {
            $this->error('Backup échoué');
            return self::FAILURE;
        }

        // Rotation : garder les 7 derniers fichiers
        $files = glob($backupDir . '/sourougnon_db_*.sql.gz');
        if (is_array($files)) {
            usort($files, fn($a, $b) => filemtime($b) - filemtime($a));
            foreach (array_slice($files, 7) as $old) {
                File::delete($old);
            }
        }

        $this->info('Backup créé : ' . $filename);
        return self::SUCCESS;
    }
}
