<?php
namespace App\Http\Controllers\Api;
use App\Http\Controllers\Controller;
use App\Models\Notification;
use App\Services\NotificationService;
use Illuminate\Http\Request;

class NotificationController extends Controller
{
    public function index(Request $request)
    {
        // Régénérer les notifications du jour (retards, échéances, stocks)
        NotificationService::generer();

        $query = Notification::where('user_id', $request->user()->id)->orderByDesc('created_at');
        if ($request->non_lues) $query->where('lue', false);
        return response()->json($query->limit(50)->get());
    }

    public function count(Request $request)
    {
        $nb = Notification::where('user_id', $request->user()->id)->where('lue', false)->count();
        return response()->json(['nb_non_lues' => $nb]);
    }

    public function marquerLue(string $uuid)
    {
        Notification::where('uuid', $uuid)->update(['lue' => true]);
        return response()->json(['success' => true]);
    }

    public function marquerToutesLues(Request $request)
    {
        Notification::where('user_id', $request->user()->id)->where('lue', false)->update(['lue' => true]);
        return response()->json(['success' => true]);
    }

    public function generer(Request $request)
    {
        $result = NotificationService::generer();
        return response()->json($result);
    }
}
