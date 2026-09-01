<?php
namespace App\Http\Controllers\Api;
use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\Permission;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class ParametreController extends Controller
{
    public function index()
    {
        return response()->json([
            'agences' => $this->getAgences(),
            'utilisateurs' => User::all(['id', 'uuid', 'nom', 'prenom', 'email', 'role', 'actif'])->map(function($u) {
                $u->permissions = Permission::where('user_id', $u->id)->pluck('acces', 'page');
                return $u;
            }),
            'magasins' => $this->getMagasins(),
        ]);
    }

    private function getAgences()
    {
        $tableExists = DB::select("SHOW TABLES LIKE 'agences'");
        if (empty($tableExists)) {
            DB::statement("CREATE TABLE IF NOT EXISTS agences (id INT AUTO_INCREMENT PRIMARY KEY, uuid VARCHAR(36) UNIQUE, nom VARCHAR(150), adresse TEXT, telephone VARCHAR(20), actif TINYINT(1) DEFAULT 1, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)");
        }
        return DB::table('agences')->get();
    }

    private function getMagasins()
    {
        $tableExists = DB::select("SHOW TABLES LIKE 'magasins'");
        if (empty($tableExists)) {
            DB::statement("CREATE TABLE IF NOT EXISTS magasins (id INT AUTO_INCREMENT PRIMARY KEY, uuid VARCHAR(36) UNIQUE, nom VARCHAR(150), adresse TEXT, responsable VARCHAR(100), actif TINYINT(1) DEFAULT 1, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)");
        }
        return DB::table('magasins')->get();
    }

    public function storeAgence(Request $request)
    {
        $request->validate(['nom' => 'required']);
        DB::table('agences')->insert(['uuid' => Str::uuid(), 'nom' => $request->nom, 'adresse' => $request->adresse, 'telephone' => $request->telephone]);
        return response()->json(['success' => true], 201);
    }

    public function storeMagasin(Request $request)
    {
        $request->validate(['nom' => 'required']);
        DB::table('magasins')->insert(['uuid' => Str::uuid(), 'nom' => $request->nom, 'adresse' => $request->adresse, 'responsable' => $request->responsable]);
        return response()->json(['success' => true], 201);
    }

    public function togglePermission(Request $request)
    {
        $user = User::where('uuid', $request->user_uuid)->firstOrFail();
        
        Permission::updateOrCreate(
            ['user_id' => $user->id, 'page' => $request->page],
            ['acces' => $request->acces]
        );
        
        return response()->json(['success' => true]);
    }
}
