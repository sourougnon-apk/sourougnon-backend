<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\File;
use App\Models\BackupRestoreLog;

class SauvegardeController extends Controller
{
    public function run(Request $request)
    {
        if ($request->user()->role !== 'gerante') {
            return response()->json(['error' => 'Non autorisé'], 403);
        }

        $code = Artisan::call('backup:run');
        return response()->json(['success' => $code === 0, 'message' => $code === 0 ? 'Sauvegarde terminée' : 'Erreur']);
    }

    public function lister()
    {
        $dir = storage_path('app/backups');
        if (!File::isDirectory($dir)) return response()->json([]);

        $files = glob($dir . '/sourougnon_db_*.sql.gz');
        $result = [];
        foreach ($files as $f) {
            $result[] = [
                'fichier' => basename($f),
                'taille' => round(filesize($f) / 1024, 1),
                'date' => date('Y-m-d H:i:s', filemtime($f)),
            ];
        }
        usort($result, fn($a, $b) => strcmp($b['date'], $a['date']));
        return response()->json($result);
    }

    public function telecharger($filename)
    {
        $user = auth()->user();
        if ($user && $user->role !== 'gerante') {
            abort(403);
        }

        $path = storage_path('app/backups/' . basename($filename));
        if (!File::exists($path)) {
            abort(404);
        }
        return response()->download($path);
    }

    public function restaurer(Request $request, $filename)
    {
        $user = $request->user();
        if ($user->role !== 'gerante') {
            return response()->json(['error' => 'Non autorisé'], 403);
        }

        // Vérifier le fichier
        $path = storage_path('app/backups/' . basename($filename));
        if (!File::exists($path)) {
            return response()->json(['error' => 'Fichier introuvable'], 404);
        }

        // Confirmation forte : le nom doit correspondre exactement
        $confirmation = $request->input('confirmation');
        if ($confirmation !== basename($filename)) {
            return response()->json(['error' => 'Confirmation incorrecte'], 422);
        }

        // Créer une ligne de log
        $log = BackupRestoreLog::create([
            'user_id' => $user->id,
            'backup_file' => basename($filename),
            'safety_dump_path' => null,
            'status' => 'pending',
            'ip' => $request->ip(),
            'started_at' => now(),
        ]);

        // Lancer la restauration en arrière-plan
        $command = 'php ' . base_path('artisan') . ' backup:restore ' . escapeshellarg(basename($filename));
        exec('nohup ' . $command . ' > /dev/null 2>&1 &');

        return response()->json(['success' => true, 'message' => 'Restauration lancée', 'log_id' => $log->id]);
    }

    public function listerLogs()
    {
        $logs = BackupRestoreLog::with('user:id,nom,prenom')
            ->orderByDesc('created_at')
            ->limit(20)
            ->get();
        return response()->json($logs);
    }

}
