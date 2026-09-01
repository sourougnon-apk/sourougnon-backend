<?php
namespace App\Http\Controllers\Api;
use App\Http\Controllers\Controller;
use App\Models\Localisation;
use Illuminate\Http\Request;

class LocalisationController extends Controller
{
    public function index(Request $request)
    {
        $type = $request->type ?? 'departement';
        $parent = $request->parent;
        
        $query = Localisation::where('type', $type);
        if ($parent) {
            $query->where('parent_nom', $parent);
        }
        
        return response()->json($query->orderBy('nom')->get());
    }
    
    public function seed()
    {
        // Cette methode remplit la table si elle est vide
        if (Localisation::count() > 0) {
            return response()->json(['message' => 'Deja rempli', 'count' => Localisation::count()]);
        }
        
        $departements = [
            "Alibori", "Atacora", "Atlantique", "Borgou", "Collines",
            "Couffo", "Donga", "Littoral", "Mono", "Oueme", "Plateau", "Zou"
        ];
        
        $communes = [
            "Alibori" => ["Banikoara","Gogounou","Kandi","Karimama","Malanville","Segbana"],
            "Atacora" => ["Boukoumbe","Cobly","Kerou","Kouande","Materi","Natitingou","Ouassa-Pehunco","Tanguieta","Toukountouna"],
            "Atlantique" => ["Abomey-Calavi","Allada","Kpomasse","Ouidah","So-Ava","Toffo","Tori-Bossito","Ze"],
            "Borgou" => ["Bembereke","Kalale","N'Dali","Nikki","Parakou","Perere","Sinende","Tchaourou"],
            "Collines" => ["Bante","Dassa-Zoume","Glazoue","Ouesse","Savalou","Save"],
            "Couffo" => ["Aplahoue","Djakotomey","Dogbo","Klouekanmey","Lalo","Toviklin"],
            "Donga" => ["Bassila","Copargo","Djougou","Ouake"],
            "Littoral" => ["Cotonou"],
            "Mono" => ["Athieme","Bopa","Come","Grand-Popo","Houeyogbe","Lokossa"],
            "Oueme" => ["Adjarra","Adjohoun","Aguegues","Akpro-Misserete","Avrankou","Bonou","Dangbo","Porto-Novo","Seme-Podji"],
            "Plateau" => ["Adja-Ouere","Ifangni","Ketou","Pobe","Sakete"],
            "Zou" => ["Abomey","Agbangnizoun","Bohicon","Cove","Djidja","Ouinhi","Zagnanado","Za-Kpota","Zogbodomey"]
        ];
        
        foreach ($departements as $dep) {
            Localisation::create(['type' => 'departement', 'nom' => $dep]);
        }
        
        foreach ($communes as $dep => $coms) {
            foreach ($coms as $com) {
                Localisation::create(['type' => 'commune', 'nom' => $com, 'parent_nom' => $dep, 'parent_type' => 'departement']);
            }
        }
        
        return response()->json(['message' => 'Base remplie', 'count' => Localisation::count()]);
    }
}
