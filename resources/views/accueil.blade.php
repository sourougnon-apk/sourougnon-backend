<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Sourougnon Groupe — Plateforme de recouvrement</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
    <script src="https://cdn.tailwindcss.com"></script>
    <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.7/dist/chart.umd.min.js"></script>
    <style>
        body { font-family: 'Inter', system-ui, sans-serif; background: #f8fafc; color: #0f172a; }
        .glass { background: rgba(255,255,255,0.12); backdrop-filter: blur(12px); border: 1px solid rgba(255,255,255,0.2); }
        .hero-gradient { background: radial-gradient(ellipse at top left, #0f172a 0%, #1e293b 55%, #0f172a 100%); }
        .card-hover { transition: transform .2s ease, box-shadow .2s ease; }
        .card-hover:hover { transform: translateY(-4px); box-shadow: 0 12px 30px rgba(0,0,0,0.08); }
        .stat-ring { background: conic-gradient(#10b981 var(--pct), #e2e8f0 0); }
    </style>
</head>
<body class="antialiased">

<!-- Navigation moderne -->
<nav class="hero-gradient text-white py-4 px-6">
    <div class="max-w-7xl mx-auto flex items-center justify-between">
        <div class="flex items-center gap-3">
            <img src="/images/logo-sourougnon.svg" alt="Sourougnon Groupe" class="h-14 w-auto" />
        </div>
        <div class="hidden md:flex gap-8 text-sm font-medium text-slate-300">
            <a href="#" class="hover:text-white transition">Accueil</a>
            <a href="#statistiques" class="hover:text-white transition">Statistiques</a>
            <a href="#classement" class="hover:text-white transition">Classement</a>
        </div>
        <div class="flex gap-2">
            <a href="/dashboard/login.html" class="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-sm font-semibold transition">Gérante</a>
            <a href="/dashboard/chef/login.html" class="px-4 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-sm font-semibold transition">Chef d'agence</a>
            <a href="/agent-app/login.html" class="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-sm font-semibold transition">Agent</a>
        </div>
    </div>
</nav>

<!-- Hero -->
<header class="hero-gradient text-white py-16 px-6 text-center">
    <div class="max-w-3xl mx-auto space-y-6">
        <img src="/images/logo-sourougnon.svg" alt="Sourougnon Groupe" class="h-28 lg:h-36 mx-auto drop-shadow-2xl" />
        <h1 class="text-3xl lg:text-5xl font-bold tracking-tight">Plateforme intelligente de gestion de recouvrement</h1>
        <p class="text-slate-300 text-sm lg:text-lg max-w-xl mx-auto">Suivi des crédits, épargnes, pénalités et performance des agents — en temps réel et hors-ligne.</p>
        <div class="flex flex-wrap justify-center gap-4">
            <a href="/dashboard/login.html" class="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 font-semibold shadow-lg shadow-blue-600/30 transition">👩‍💼 Espace Gérante</a>
            <a href="/dashboard/chef/login.html" class="px-6 py-3 rounded-xl bg-green-600 hover:bg-green-700 font-semibold shadow-lg shadow-green-600/30 transition">👔 Espace Chef d'agence</a>
            <a href="/agent-app/login.html" class="px-6 py-3 rounded-xl bg-amber-600 hover:bg-amber-700 font-semibold shadow-lg shadow-amber-600/30 transition">📱 Espace Agent</a>
        </div>
    </div>
</header>

<!-- KPI non sensibles -->
<section id="statistiques" class="max-w-7xl mx-auto px-6 py-16">
    <h2 class="text-2xl font-bold text-slate-900 mb-8 text-center">Vue d’ensemble</h2>
    <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <div class="bg-white rounded-2xl p-6 text-center card-hover shadow-sm">
            <div class="text-3xl font-bold text-blue-600">{{ $stats['nb_agents'] }}</div>
            <div class="text-xs uppercase text-slate-500 mt-1">Agents</div>
        </div>
        <div class="bg-white rounded-2xl p-6 text-center card-hover shadow-sm">
            <div class="text-3xl font-bold text-purple-600">{{ $stats['nb_debiteurs_actifs'] }}</div>
            <div class="text-xs uppercase text-slate-500 mt-1">Débiteurs actifs</div>
        </div>
        <div class="bg-white rounded-2xl p-6 text-center card-hover shadow-sm">
            <div class="text-3xl font-bold text-cyan-600">{{ $stats['visites_aujourdhui'] }}</div>
            <div class="text-xs uppercase text-slate-500 mt-1">Visites aujourd'hui</div>
        </div>
        <div class="bg-white rounded-2xl p-6 text-center card-hover shadow-sm">
            <div class="text-3xl font-bold text-green-600">{{ $stats['paiements_aujourdhui'] }}</div>
            <div class="text-xs uppercase text-slate-500 mt-1">Paiements validés</div>
        </div>
        <div class="bg-white rounded-2xl p-6 text-center card-hover shadow-sm">
            <div class="text-3xl font-bold text-amber-600">{{ $stats['nb_retards'] }}</div>
            <div class="text-xs uppercase text-slate-500 mt-1">Retards</div>
        </div>
        <div class="bg-white rounded-2xl p-6 text-center card-hover shadow-sm">
            <div class="text-3xl font-bold text-indigo-600">{{ $stats['taux_recouvrement'] }}%</div>
            <div class="text-xs uppercase text-slate-500 mt-1">Taux de recouvrement</div>
        </div>
    </div>

    <!-- Graphique -->
    <div class="bg-white rounded-2xl p-6 mt-8 shadow-sm">
        <h3 class="text-lg font-semibold mb-4 text-slate-800">Activité sur 7 jours</h3>
        <div style="height:250px;"><canvas id="chart-activite"></canvas></div>
    </div>
</section>

<!-- Classement sans montants -->
<section id="classement" class="max-w-7xl mx-auto px-6 pb-16">
    <div class="bg-white rounded-2xl p-6 shadow-sm">
        <h2 class="text-xl font-bold text-slate-900 mb-6">Classement des agents</h2>
        <div class="overflow-x-auto">
            <table class="min-w-full">
                <thead class="bg-slate-50">
                    <tr>
                        <th class="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Rang</th>
                        <th class="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Agent</th>
                        <th class="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Rôle</th>
                        <th class="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Débiteurs</th>
                        <th class="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Jours travaillés</th>
                        <th class="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Régularité</th>
                        <th class="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Score</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-slate-100">
                    @foreach($leaderboard as $index => $agent)
                    <tr class="hover:bg-slate-50">
                        <td class="px-4 py-3">
                            @if($index == 0) <span class="inline-flex items-center justify-center w-8 h-8 rounded-full bg-yellow-100 text-yellow-700 font-bold">🥇</span>
                            @elseif($index == 1) <span class="inline-flex items-center justify-center w-8 h-8 rounded-full bg-slate-200 text-slate-700 font-bold">🥈</span>
                            @elseif($index == 2) <span class="inline-flex items-center justify-center w-8 h-8 rounded-full bg-orange-100 text-orange-700 font-bold">🥉</span>
                            @else <span class="text-slate-400 font-medium">{{ $index + 1 }}</span>
                            @endif
                        </td>
                        <td class="px-4 py-3 font-medium text-slate-900">{{ $agent['nom'] }}</td>
                        <td class="px-4 py-3"><span class="px-2 py-1 rounded-full text-xs font-semibold {{ $agent['role'] == 'Gérante' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700' }}">{{ $agent['role'] }}</span></td>
                        <td class="px-4 py-3 text-slate-600">{{ $agent['nb_debiteurs'] }}</td>
                        <td class="px-4 py-3 text-slate-600">{{ $agent['jours_travailles'] }}</td>
                        <td class="px-4 py-3 text-slate-600">{{ $agent['regularite'] }}%</td>
                        <td class="px-4 py-3 font-bold {{ $agent['score'] >= 50 ? 'text-green-600' : 'text-amber-600' }}">{{ $agent['score'] }}</td>
                    </tr>
                    @endforeach
                </tbody>
            </table>
        </div>
    </div>
</section>

<footer class="hero-gradient text-white py-6 text-center text-sm text-slate-400">
    Sourougnon Groupe &copy; {{ date('Y') }} — Tous droits réservés
</footer>

<script>
document.addEventListener('DOMContentLoaded', function() {
    var ctx = document.getElementById('chart-activite');
    if (ctx) {
        new Chart(ctx, {
            type: 'line',
            data: {
                labels: {!! json_encode($activite['labels']) !!},
                datasets: [
                    {
                        label: 'Paiements validés',
                        data: {!! json_encode($activite['paiements']) !!},
                        borderColor: '#10b981',
                        backgroundColor: 'rgba(16,185,129,0.1)',
                        fill: true,
                        tension: 0.4,
                        pointRadius: 3,
                        pointBackgroundColor: '#10b981'
                    },
                    {
                        label: 'Visites planifiées',
                        data: {!! json_encode($activite['visites']) !!},
                        borderColor: '#3b82f6',
                        backgroundColor: 'rgba(59,130,246,0.1)',
                        fill: true,
                        tension: 0.4,
                        pointRadius: 3,
                        pointBackgroundColor: '#3b82f6'
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: true } },
                scales: { y: { beginAtZero: true } }
            }
        });
    }
});
</script>
</body>
</html>
