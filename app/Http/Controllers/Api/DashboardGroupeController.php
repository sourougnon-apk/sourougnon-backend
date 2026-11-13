<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\AlerteService;
use App\Services\IndicateursService;
use App\Services\SyntheseService;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;

class DashboardGroupeController extends Controller
{
    public function index(Request $request, IndicateursService $service)
    {
        $request->validate([
            'agence_id' => 'nullable|integer|exists:agences,id',
            'debut' => 'nullable|date_format:Y-m-d',
            'fin' => 'nullable|date_format:Y-m-d',
        ]);

        $fin = Carbon::parse($request->input('fin', now()->toDateString()))->startOfDay();
        $debut = Carbon::parse($request->input('debut', $fin->toDateString()))->startOfDay();
        if ($debut->gt($fin)) {
            [$debut, $fin] = [$fin, $debut];
        }
        if ($debut->diffInDays($fin) > 92) {
            $debut = $fin->copy()->subDays(92);
        }

        $agenceId = $request->filled('agence_id') ? (int) $request->input('agence_id') : null;

        $this->rafraichirAlertes();

        return response()->json($service->groupe($agenceId, $debut, $fin));
    }

    /** Génération des alertes et synthèses : au plus une fois toutes les 5 minutes, sans bloquer l'affichage. */
    private function rafraichirAlertes(): void
    {
        try {
            if (!Cache::add('dashboard:maj-alertes', 1, 300)) {
                return;
            }
            AlerteService::verifierEtGenerer();
            SyntheseService::generer();
        } catch (\Throwable $e) {
            report($e);
        }
    }
}
