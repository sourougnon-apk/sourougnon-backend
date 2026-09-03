<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\File;

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
}
