<?php
namespace App\Http\Controllers\Api;
use App\Http\Controllers\Controller;
use App\Models\Alerte;
use App\Services\AlerteService;
use Illuminate\Http\Request;

class AlerteController extends Controller
{
    public function index(Request $request)
    {
        $query = Alerte::with(['vente.debiteur', 'produit'])->orderByDesc('date_alerte');
        if ($request->type) $query->where('type', $request->type);
        if ($request->niveau) $query->where('niveau', $request->niveau);
        if ($request->non_lues) $query->where('lue', false);
        if ($request->limit) $query->limit((int)$request->limit);
        return response()->json($query->get());
    }

    public function marquerLue(string $uuid)
    {
        Alerte::where('uuid', $uuid)->update(['lue' => true]);
        return response()->json(['success' => true]);
    }

    public function marquerToutesLues()
    {
        Alerte::where('lue', false)->update(['lue' => true]);
        return response()->json(['success' => true]);
    }

    public function generer()
    {
        $result = AlerteService::genererAlertes();
        return response()->json($result);
    }

    public function count()
    {
        return response()->json([
            'total' => Alerte::where('lue', false)->count(),
            'critiques' => Alerte::where('lue', false)->where('niveau', 'critique')->count(),
        ]);
    }
}
