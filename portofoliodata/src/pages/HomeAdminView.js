import React, { useState, useEffect } from 'react';
import {
  Code2, ChevronLeft, ChevronRight, ShieldCheck,
  Layers, Activity, CheckCircle2,
  Server, Cpu, DatabaseZap, AlertTriangle, ShoppingCart, PackageSearch,
  TrendingUp, History, BarChart3
} from 'lucide-react';

import { Bar, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
} from 'chart.js';

import { supabase } from '../services/SupabaseClient';
import StockModal from '../components/StockModal';

// Enregistrement global des composants Chart.js utilisés dans ce fichier.
// Sans cet appel, Bar et Doughnut lancent une erreur car Chart.js
// utilise un système de plugins à enregistrement explicite.
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

/**
 * HomeAdminView — Dashboard de supervision de l'inventaire et des ventes.
 *
 * Page principale de l'interface administrateur, composée de six sections :
 *   1. Hero Banner     — KPIs globaux (total modèles, total ventes, revenus)
 *   2. Validated Card  — Compteur des références validées en base
 *   3. Charts          — Distribution des types de tapis vendus (Bar) + revenus (Doughnut)
 *   4. Live Stream     — Flux temps réel des 5 dernières ventes via Supabase Realtime
 *   5. Stock Alerts    — Tableau des articles en rupture critique (stock ≤ 4 unités)
 *   6. Query Ledger    — Carrousel des requêtes SQL clés du projet (ETL + App)
 *      System Pulse    — Indicateurs visuels de l'état du système
 *
 * @param {number} grandTotal      - Nombre de références avec is_validated = true
 * @param {number} totalRowsInDB   - Nombre total de références dans inventory
 * @param {array}  lowStockItems   - Articles avec au moins un stock de tapis ≤ 4 unités
 */

const HomeAdminView = ({ grandTotal, totalRowsInDB, lowStockItems = [], session }) => {

 // 🕵️‍♂️ Extraction de l'email de l'utilisateur connecté
  const userEmail = session?.user?.email;

  // Index de la requête SQL affichée dans le carrousel "Query Ledger"
  const [sqlIndex, setSqlIndex] = useState(0);

  // Article sélectionné pour la modale de mise à jour de stock (null = modale fermée)
  const [selectedItem, setSelectedItem] = useState(null);

  // Les 5 dernières ventes affichées dans le flux Live Stream
  const [sales, setSales] = useState([]);

  // Nombre total de ventes toutes périodes confondues (affiché dans le hero)
  const [totalSalesCount, setTotalSalesCount] = useState(0);

  // Chiffre d'affaires total cumulé de toutes les ventes (affiché dans le hero)
  const [totalRevenue, setTotalRevenue] = useState(0);


  // ─────────────────────────────────────────────
  // CHARGEMENT INITIAL + ÉCOUTE REALTIME
  //
  // Deux mécanismes complémentaires :
  //
  // 1. fetchSalesData() — chargement ponctuel au montage :
  //    - Les 5 dernières ventes pour le Live Stream (tri DESC, limit 5)
  //    - Le total de ventes et le CA via count:'exact' + reduce sur total_price
  //
  // 2. salesChannel — listener Supabase Realtime :
  //    Écoute les événements INSERT sur sales_history en temps réel.
  //    À chaque nouvelle vente :
  //      - On la préfixe au tableau sales (slice(0,4) pour garder max 5 entrées)
  //      - On incrémente totalSalesCount de 1
  //      - On ajoute total_price au totalRevenue
  //    Cela évite un refetch complet à chaque vente et rend le dashboard
  //    réactif sans polling.
  //
  // Cleanup : supabase.removeChannel() désabonne le listener
  // quand le composant est démonté pour éviter les fuites mémoire.
  // ─────────────────────────────────────────────
  useEffect(() => {
    const fetchSalesData = async () => {
      // Récupère les 5 ventes les plus récentes pour le flux Live Stream
      const { data: recentData } = await supabase
        .from('sales_history')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);

      if (recentData) setSales(recentData);

      // Récupère tous les prix pour calculer le CA total
      // count:'exact' retourne le nombre de lignes dans le header de réponse
      const { data, count, error } = await supabase
        .from('sales_history')
        .select('total_price', { count: 'exact' });

      if (!error) {
        setTotalSalesCount(count || 0);
        const sum = data.reduce((acc, sale) => acc + (sale.total_price || 0), 0);
        setTotalRevenue(sum);
      }
    };

    fetchSalesData();

    // Abonnement Realtime : déclenché sur chaque INSERT dans sales_history
    const salesChannel = supabase
      .channel('realtime_sales')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'sales_history' },
        (payload) => {
          // Mise à jour optimiste : on insère la nouvelle vente en tête de liste
          // sans refetch, et on tronque à 5 entrées maximum
          setSales((currentSales) => [payload.new, ...currentSales.slice(0, 4)]);
          setTotalSalesCount((prev) => prev + 1);
          setTotalRevenue((prev) => prev + (payload.new.total_price || 0));
        }
      )
      .subscribe();

    // Nettoyage du channel à la destruction du composant
    return () => {
      supabase.removeChannel(salesChannel);
    };
  }, []); // [] = exécuté une seule fois au montage


  // ─────────────────────────────────────────────
  // CONFIGURATION DU GRAPHIQUE EN BARRES (Bar)
  // "Product Performance" — Distribution des types de tapis vendus
  //
  // Parse les 5 dernières ventes pour comptabiliser combien de fois
  // chaque type de tapis (AVT, R1, R2, PONT, COFFRE) a été vendu.
  //
  // Trois cas selon le type de pack :
  //   - "Complet"         → incrémente AVT + R1 + PONT + COFFRE
  //   - "Avant + Arrière" → incrémente AVT + R1 + PONT
  //   - Détail libre      → parse items_details pour détecter chaque type
  //
  // Note : cette logique est volontairement côté client car elle opère
  // uniquement sur les 5 dernières ventes déjà chargées en mémoire.
  // ─────────────────────────────────────────────
  const COLORS = ['#6366f1', '#8b5cf6', '#a78bfa', '#4f46e5', '#312e81'];

  const getChartData = () => {
    const counts = { "AVT": 0, "R1": 0, "R2": 0, "PONT": 0, "COFFRE": 0 };

    sales.forEach(sale => {
      const details = Array.isArray(sale.items_details) ? sale.items_details : [];
      const isPackComplet = sale.tapis_vendu?.includes("Complet");
      const isPackSimple  = sale.tapis_vendu?.includes("Avant + Arrière");

      if (isPackComplet) {
        // Pack complet : tous les types sauf R2 (pont arrière inclus mais pas 2ème rang)
        counts["AVT"] += 1; counts["R1"] += 1;
        counts["PONT"] += 1; counts["COFFRE"] += 1;
      } else if (isPackSimple) {
        // Pack avant + arrière : AVT, premier rang, pont (sans coffre ni R2)
        counts["AVT"] += 1; counts["R1"] += 1; counts["PONT"] += 1;
      } else {
        // Vente à l'unité : on parse les libellés de items_details
        details.forEach(item => {
          const i = item.toLowerCase();
          if (i.includes("avt")  || i.includes("avant")) counts["AVT"]   += 1;
          if (i.includes("r1"))                           counts["R1"]    += 1;
          if (i.includes("r2"))                           counts["R2"]    += 1;
          if (i.includes("pont"))                         counts["PONT"]  += 1;
          if (i.includes("coffre"))                       counts["COFFRE"]+= 1;
        });
      }
    });

    return {
      labels: Object.keys(counts),
      datasets: [{
        label: 'Ventes',
        data: Object.values(counts),
        backgroundColor: COLORS,
        borderRadius: 6,
        borderSkipped: false,
      }],
    };
  };


  // ─────────────────────────────────────────────
  // CONFIGURATION DU GRAPHIQUE DONUT (Doughnut)
  // "Répartition des Revenus" — CA estimé par type de tapis
  //
  // Pour chaque vente, on distribue le total_price équitablement
  // entre tous les types de tapis présents dans items_details
  // (division uniforme par nombre d'items).
  //
  // C'est une approximation volontaire : on ne dispose pas du prix
  // unitaire par type dans sales_history, seulement du total de la vente.
  // ─────────────────────────────────────────────
  const getRevenueData = () => {
    const rev = { "AVT": 0, "R1": 0, "R2": 0, "PONT": 0, "COFFRE": 0 };

    sales.forEach(sale => {
      const price   = sale.total_price || 0;
      const details = Array.isArray(sale.items_details) ? sale.items_details : [];

      if (details.length > 0) {
        // Distribution uniforme du prix entre tous les items de la vente
        const val = price / details.length;
        details.forEach(item => {
          const i = item.toLowerCase();
          if (i.includes("avt"))    rev["AVT"]    += val;
          if (i.includes("r1"))     rev["R1"]     += val;
          if (i.includes("r2"))     rev["R2"]     += val;
          if (i.includes("pont"))   rev["PONT"]   += val;
          if (i.includes("coffre")) rev["COFFRE"] += val;
        });
      }
    });

    return {
      labels: Object.keys(rev),
      datasets: [{
        data: Object.values(rev),
        backgroundColor: ['#6366f1', '#8b5cf6', '#a78bfa', '#4f46e5', '#312e81'],
        borderWidth: 0
      }]
    };
  };


  // ─────────────────────────────────────────────
  // OPTIONS COMMUNES DES GRAPHIQUES CHART.JS
  //
  // responsive + maintainAspectRatio:false permet au graphique
  // de remplir exactement son conteneur CSS (height fixée en Tailwind).
  // Sans maintainAspectRatio:false, Chart.js imposerait son propre ratio
  // et ignorerait la hauteur du conteneur.
  // ─────────────────────────────────────────────
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#0f172a',
        titleColor: '#fff',
        bodyColor: '#818cf8',
        borderColor: '#334155',
        borderWidth: 1,
        padding: 10,
        cornerRadius: 12,
        displayColors: false
      }
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { color: '#475569', font: { family: 'monospace', size: 11 } }
      },
      y: {
        grid: { color: 'rgba(255, 255, 255, 0.02)' },
        ticks: { color: '#475569', stepSize: 1, font: { family: 'monospace', size: 11 } }
      }
    }
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'right',
        labels: { color: '#94a3b8', font: { size: 10 } }
      },
      tooltip: {
        enabled: true,
        callbacks: {
          label: (context) => `${context.label}: ${context.raw.toFixed(2)} €`
        }
      }
    }
  };


  // ─────────────────────────────────────────────
  // MISE À JOUR DU STOCK VIA LA MODALE
  //
  // Appelé par StockModal quand l'admin valide une modification de stock.
  // Met à jour la table carpet_stock en filtrant par inventory_id.
  //
  // window.location.reload() après succès est un choix délibéré :
  // il force un rechargement complet pour resynchroniser lowStockItems
  // (qui vient du parent via props) sans implémenter un callback
  // de re-fetch complexe. C'est acceptable pour une action ponctuelle
  // d'administration qui ne nécessite pas une UX ultra-fluide.
  // ─────────────────────────────────────────────
const handleUpdateStock = async (id, newCounts) => {

  console.log("Email détecté par le composant :", userEmail);
    // 🛑 VERROU DE SÉCURITÉ : Bloquer l'écriture pour le compte démo recruteur
    if (userEmail === 'recruteur@tapisauto.fr') {
      alert("🔒 Mode Démo : La modification des stocks est désactivée pour ce compte de test afin de protéger la base de données.");
      setSelectedItem(null); // On ferme la modale proprement
      return; // On stoppe l'action ici, Supabase n'est pas appelé
    }

    try {
      const { error } = await supabase
        .from('carpet_stock')
        .update(newCounts)
        .eq('inventory_id', id);

      if (error) throw error;

      setSelectedItem(null);
      window.location.reload(); // Resynchronise lowStockItems depuis le parent
    } catch (error) {
      console.error("Erreur update:", error.message);
      alert("Erreur lors de la mise à jour du stock.");
    }
  };


  // ─────────────────────────────────────────────
  // DONNÉES DU CARROUSEL "QUERY LEDGER"
  //
  // Collection statique des requêtes SQL représentatives du projet,
  // catégorisées en deux types :
  //   - ETL  : scripts de data engineering (initialisation, seeding, casting)
  //   - APP  : requêtes applicatives (alertes stock, authentification)
  //
  // Chaque entrée contient du JSX pour le rendu coloré du code SQL
  // (coloration syntaxique manuelle via des spans Tailwind).
  // ─────────────────────────────────────────────
  const allQueries = [
    {
      cat: "ETL",
      title: "01. Carpet Stock Initialization",
      code: <>
        {/* Initialise carpet_stock pour chaque référence inventory existante */}
        <span className="text-pink-500">INSERT INTO</span> carpet_stock (inventory_id) <br/>
        <span className="text-pink-500">SELECT</span> id <span className="text-pink-500">FROM</span> inventory <br/>
        <span className="text-pink-500">ON CONFLICT</span> DO NOTHING;
      </>
    },
    {
      cat: "ETL",
      title: "02. Smart Stock Seeding (0-10)",
      code: <>
        {/* Alloue un stock aléatoire entre 0 et 10 uniquement aux types de tapis
            réellement fabriqués (tapis_r1 = true en base), null pour les autres */}
        <span className="text-pink-500">UPDATE</span> carpet_stock s <span className="text-pink-500">SET</span> <br/>
        &nbsp;&nbsp;tapis_r1_stock = <span className="text-pink-500">CASE WHEN</span> i.tapis_r1 <span className="text-pink-500">THEN</span> <span className="text-emerald-400 italic">FLOOR</span>(<span className="text-emerald-400 italic">RANDOM</span>()*11) <span className="text-pink-500">ELSE NULL END</span><br/>
        <span className="text-pink-500">FROM</span> inventory i <span className="text-pink-500">WHERE</span> s.inventory_id = i.id;
      </>
    },
    {
      cat: "ETL",
      title: "03. Date Integrity & ISO Casting",
      code: <>
        {/* Convertit les années brutes (string) en dates ISO et déduit
            is_active selon la présence ou absence d'une date de fin */}
        <span className="text-pink-500">UPDATE</span> inventory <span className="text-pink-500">SET</span> <br/>
        &nbsp;&nbsp;year_start = <span className="text-indigo-400 italic">TO_DATE</span>(year_raw, <span className="text-emerald-400">'YYYY'</span>), <br/>
        &nbsp;&nbsp;is_active = <span className="text-pink-500">CASE WHEN</span> year_end <span className="text-pink-500">IS NULL THEN</span> true <span className="text-pink-500">ELSE</span> false <span className="text-pink-500">END</span>;
      </>
    },
    {
      cat: "APP",
      title: "04. Join Multi-Stock Alert",
      code: <>
        {/* Requête d'alerte : joint inventory et carpet_stock pour
            identifier les véhicules avec un stock avant critique */}
        <span className="text-pink-500">SELECT</span> i.marque, s.tapis_avt_stock, s.tapis_coffre_stock <br/>
        <span className="text-pink-500">FROM</span> inventory i <br/>
        <span className="text-pink-500">JOIN</span> carpet_stock s <span className="text-pink-500">ON</span> i.id = s.inventory_id <br/>
        <span className="text-pink-500">WHERE</span> s.tapis_avt_stock <span className="text-pink-500">&lt;=</span> 4;
      </>
    },
    {
      cat: "APP",
      title: "05. Identity Handshake",
      code: <>
        {/* Vérifie l'identité de l'utilisateur courant via auth.uid()
            fonction native Supabase qui retourne l'UUID du JWT actif */}
        <span className="text-pink-500">SELECT</span> email <span className="text-pink-500">FROM</span> auth.users <span className="text-pink-500">WHERE</span> id <span className="text-pink-500">=</span> <span className="text-indigo-400 italic">auth.uid()</span>;
      </>
    }
  ];


  // ─────────────────────────────────────────────
  // RENDU
  // Structure en sections verticales espacées (space-y-12).
  // Chaque section utilise un grid CSS pour la mise en page responsive.
  // ─────────────────────────────────────────────
  return (
    <div className="space-y-12 animate-in fade-in duration-700 pb-10 p-6 md:p-10">

      {/* ── SECTION 1 : HERO BANNER + VALIDATED CARD ──────────────────────
          Grid 12 colonnes :
            - col-span-8 : bannière principale avec les 3 KPIs globaux
            - col-span-4 : carte "Validated Entries" en accent indigo
      ─────────────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

        {/* Bannière principale — KPIs globaux */}
        <div className="lg:col-span-8 bg-slate-900/40 p-8 md:p-12 rounded-[40px] border border-white/5 relative overflow-hidden shadow-2xl">
          <div className="absolute top-0 right-0 p-12 text-slate-800 opacity-10 hidden lg:block rotate-12">
            <DatabaseZap size={220} />
          </div>
          <div className="relative z-10">
            <div className="flex items-center gap-2 bg-indigo-500/10 border border-indigo-400/30 w-fit px-4 py-1.5 rounded-full text-indigo-400 text-[10px] font-black uppercase tracking-widest mb-8">
              <Server size={12} className="animate-pulse" /> Relational Stock System Active
            </div>
            <h1 className="text-5xl md:text-7xl lg:text-8xl font-black text-white mb-6 tracking-tighter italic uppercase leading-none">
              Stock <br /><span className="text-indigo-400">Control</span>
            </h1>
            <p className="text-slate-400 text-lg max-w-xl italic leading-relaxed mb-8">
              Supervision granulaire du stock : Alerte active à 4 unités ou moins.
            </p>

            {/* Trois KPIs : total modèles, total ventes, CA total */}
            <div className="flex flex-wrap items-center gap-4">
              <div className="bg-slate-950/50 px-6 py-3 rounded-2xl border border-white/5 backdrop-blur-sm">
                <span className="text-slate-500 text-[9px] font-black uppercase tracking-[0.2em] block mb-1">Total Models</span>
                <span className="text-white font-mono text-2xl font-bold italic">{totalRowsInDB || 0}</span>
              </div>
              <div className="bg-emerald-500/10 px-6 py-3 rounded-2xl border border-emerald-500/20 backdrop-blur-sm">
                <span className="text-emerald-500 text-[9px] font-black uppercase tracking-[0.2em] block mb-1">Total Sales</span>
                <span className="text-emerald-400 font-mono text-2xl font-bold italic">{totalSalesCount}</span>
              </div>
              <div className="bg-indigo-500/10 px-6 py-3 rounded-2xl border border-indigo-500/20 backdrop-blur-sm">
                <span className="text-indigo-400 text-[9px] font-black uppercase tracking-[0.2em] block mb-1">Revenus</span>
                {/* Intl.NumberFormat formate le CA en euros avec séparateurs locaux FR */}
                <span className="text-indigo-300 font-mono text-2xl font-bold italic">
                  {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(totalRevenue)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Carte "Validated Entries" — compteur accent */}
        <div className="lg:col-span-4 bg-indigo-600 rounded-[40px] p-10 text-white flex flex-col justify-center items-center shadow-2xl relative overflow-hidden group border-b-8 border-indigo-800 transition-all hover:translate-y-[-4px]">
          <div className="text-7xl md:text-9xl font-black italic tracking-tighter uppercase relative z-10 leading-none">
            {grandTotal || 0}
          </div>
          <div className="text-indigo-100 font-black uppercase text-[10px] tracking-[0.3em] opacity-80 italic mt-4 relative z-10">
            Validated Entries
          </div>
          {/* Icône décorative qui tourne au hover (CSS group) */}
          <Cpu className="absolute bottom-[-20px] left-[-20px] text-white/10 group-hover:rotate-90 transition-transform duration-1000" size={180} />
        </div>
      </div>


      {/* ── SECTION 2 : GRAPHIQUES + LIVE STREAM ──────────────────────────
          Grid 12 colonnes :
            - col-span-7 : graphiques Bar + Doughnut
            - col-span-5 : flux temps réel des 5 dernières ventes
      ─────────────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

        {/* Graphiques : Bar (distribution) + Doughnut (revenus) */}
        <div className="lg:col-span-7 bg-[#11141D] rounded-[40px] border border-white/5 shadow-2xl p-8 flex flex-col justify-between overflow-hidden">
          <div>
            <div className="flex items-center gap-4 mb-6">
              <div className="p-3 bg-indigo-500/10 rounded-2xl border border-indigo-500/20 text-indigo-400">
                <BarChart3 size={24} />
              </div>
              <div>
                <h3 className="text-white font-black italic uppercase tracking-wider text-xl">Product Performance</h3>
                <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mt-1">Live distribution of carpet types sold</p>
              </div>
            </div>

            {/* Graphique en barres : nombre de ventes par type de tapis */}
            <div className="w-full h-[220px] font-mono text-xs relative">
              <Bar data={getChartData()} options={chartOptions} />
            </div>

            {/* Graphique donut : répartition estimée du CA par type */}

            <div className="h-[150px] border-t border-white/5 pt-6">
              <h4 className="text-slate-500 text-[9px] font-black uppercase tracking-widest mb-2">Répartition des Revenus</h4>
              <Doughnut
                data={getRevenueData()}
                options={doughnutOptions}
              />
            </div>
          </div>
        </div>

        {/* Flux temps réel des 5 dernières ventes */}
        <div className="lg:col-span-5 bg-[#11141D] rounded-[40px] border border-indigo-500/10 shadow-2xl p-8">
          <div className="flex items-center gap-4 mb-6">
            <div className="p-3 bg-indigo-500/10 rounded-2xl border border-indigo-500/20 text-indigo-400">
              <TrendingUp size={24} className="animate-bounce" />
            </div>
            <div>
              <h3 className="text-white font-black italic uppercase tracking-wider text-xl">Live Stream</h3>
              <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mt-1">Pipeline stream active</p>
            </div>
          </div>

          <div className="space-y-3">
            {sales.length > 0 ? (
              sales.map((sale) => (
                <div
                  key={sale.id}
                  className="flex items-center justify-between p-4 bg-slate-950/40 rounded-2xl border border-white/5 hover:border-indigo-500/30 transition-all group"
                >
                  <div className="flex items-center gap-3">
                    {/* Point vert animé = indicateur "live" */}
                    <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <div>
                      <span className="text-white font-mono text-xs font-black uppercase tracking-tight block truncate max-w-[160px]">
                        {sale.marque}
                      </span>
                      <p className="text-[9px] text-slate-500 uppercase font-black tracking-wider">
                        {/* Supprime le suffixe '_stock' du nom du tapis pour l'affichage */}
                        <span className="text-indigo-400 font-mono">{sale.tapis_vendu.replace('_stock', '')}</span>
                      </p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-emerald-400 font-mono text-xs font-black">+1 Unit</span>
                    <p className="text-[9px] text-slate-600 font-mono">
                      {new Date(sale.created_at).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              // État vide : aucune vente récente
              <div className="text-center py-12 text-slate-600 font-mono text-xs italic tracking-widest uppercase opacity-40">
                <History className="inline-block mr-2 mb-1" size={14} /> Waiting...
              </div>
            )}
          </div>
        </div>
      </div>


      {/* ── SECTION 3 : TABLEAU DES ALERTES DE STOCK ─────────────────────
          Affiche tous les articles de lowStockItems dans un tableau scrollable.
          Chaque ligne montre les 5 types de stock avec un code couleur :
            - Rouge   : stock ≤ 2 (critique)
            - Ambre   : stock ≤ 4 (alerte)
            - Gris    : stock > 4 (sain, ne devrait pas apparaître ici)
            - "N.A"   : stock null (type non fabriqué pour ce véhicule)
          Le bouton "panier" ouvre StockModal pour corriger le stock.
      ─────────────────────────────────────────────────────────────────── */}
      <div className="bg-[#11141D] rounded-[40px] border border-red-500/20 shadow-2xl overflow-hidden">
        <div className="p-8 border-b border-white/5 flex justify-between items-center bg-red-500/5">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-red-500/20 rounded-2xl border border-red-500/30">
              <AlertTriangle className="text-red-500 animate-pulse" size={24} />
            </div>
            <div>
              <h3 className="text-white font-black italic uppercase tracking-wider text-xl">Stock Depletion Alerts</h3>
              <p className="text-red-500/60 text-[10px] font-bold uppercase tracking-widest leading-none mt-1">
                Threshold: ≤ 4 Units • Multi-Type Monitoring
              </p>
            </div>
          </div>
        </div>

        <div className="max-h-[500px] overflow-y-auto overflow-x-auto scrollbar-hide">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 bg-[#11141D] z-10 shadow-xl">
              <tr className="text-slate-500 text-[9px] font-black uppercase tracking-[0.2em] border-b border-white/5">
                <th className="px-8 py-4">Vehicle Model</th>
                <th className="px-4 py-4 text-center">AVT</th>
                <th className="px-4 py-4 text-center">R1</th>
                <th className="px-4 py-4 text-center">R2</th>
                <th className="px-4 py-4 text-center">PONT</th>
                <th className="px-4 py-4 text-center">COFFRE</th>
                <th className="px-8 py-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {lowStockItems.length > 0 ? (
                lowStockItems.map((item) => (
                  <tr key={item.id} className="hover:bg-red-500/5 transition-colors group">
                    <td className="px-8 py-4">
                      <div className="flex flex-col">
                        <span className="text-white text-xs font-black uppercase italic group-hover:text-red-400 transition-colors">
                          {item.marque}
                        </span>
                        <span className="text-slate-600 text-[10px] font-bold uppercase tracking-tighter">
                          {item.modele_voiture}
                        </span>
                      </div>
                    </td>

                    {/* Rendu des 5 colonnes de stock via un tableau ordonné
                        pour garantir l'alignement avec les headers */}
                    {[
                      item.tapis_avt_stock,
                      item.tapis_r1_stock,
                      item.tapis_r2_stock,
                      item.tapis_pont_stock,
                      item.tapis_coffre_stock
                    ].map((stock, idx) => (
                      <td key={idx} className="px-4 py-4 text-center">
                        {stock === null ? (
                          // Type non fabriqué pour ce véhicule
                          <span className="text-slate-800 font-black text-[9px]">N.A</span>
                        ) : (
                          // Badge coloré selon le niveau de criticité
                          <div className={`inline-block px-3 py-1 rounded-lg font-mono text-xs font-black ${
                            stock <= 2 ? 'bg-red-500/20 text-red-500 border border-red-500/30' :
                            stock <= 4 ? 'bg-amber-500/20 text-amber-500 border border-amber-500/30' :
                                         'bg-slate-800 text-slate-400'
                          }`}>
                            {stock}
                          </div>
                        )}
                      </td>
                    ))}

                    {/* Bouton d'ouverture de la modale de correction de stock */}
                    <td className="px-8 py-4 text-right">
                      <button
                        onClick={() => setSelectedItem(item)}
                        className="bg-slate-950 border border-white/10 hover:border-indigo-500/50 hover:bg-indigo-600 text-white p-2 rounded-xl transition-all group/btn active:scale-95 shadow-lg"
                      >
                        <ShoppingCart size={14} />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                // État vide : tous les stocks sont sains
                <tr>
                  <td colSpan="7" className="px-8 py-20 text-center">
                    <div className="flex flex-col items-center gap-3 opacity-20">
                      <PackageSearch size={48} className="text-slate-400" />
                      <span className="text-slate-400 font-black italic uppercase tracking-widest text-xs">Stock Levels Healthy</span>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>


      {/* ── SECTION 4 : QUERY LEDGER + SYSTEM PULSE ──────────────────────
          Grid 2 colonnes :
            - Gauche : carrousel des requêtes SQL clés du projet
            - Droite : indicateurs visuels de l'état du système
      ─────────────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

        {/* Carrousel "Query Ledger" */}
        <div className="bg-[#11141D] p-8 md:p-10 rounded-[40px] border border-white/5 shadow-xl relative overflow-hidden">
          <div className="flex justify-between items-center mb-8 relative z-10">
            <h3 className="text-lg font-bold text-white uppercase italic flex items-center gap-3 text-indigo-400">
              <Code2 size={20}/> Query Ledger
            </h3>
            {/* Navigation précédent/suivant avec modulo pour boucler sur le tableau */}
            <div className="flex gap-3">
              <button
                onClick={() => setSqlIndex((p) => (p - 1 + allQueries.length) % allQueries.length)}
                className="p-3 bg-slate-950 border border-white/10 rounded-xl hover:bg-indigo-600 transition-all active:scale-95"
              >
                <ChevronLeft size={18} />
              </button>
              <button
                onClick={() => setSqlIndex((p) => (p + 1) % allQueries.length)}
                className="p-3 bg-slate-950 border border-white/10 rounded-xl hover:bg-indigo-600 transition-all active:scale-95"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>

          {/* Bloc de code SQL avec coloration manuelle via JSX + spans Tailwind */}
          <div className="p-6 bg-slate-950 rounded-2xl border-l-4 border-indigo-500 min-h-[180px] shadow-inner font-mono relative z-10 overflow-hidden">
            <div className="flex justify-between items-center mb-4">
              <div className="text-[10px] font-black uppercase text-slate-500 tracking-widest italic">
                {allQueries[sqlIndex].cat} Sequence {sqlIndex + 1}
              </div>
              {/* Badge catégorie : rose pour ETL, vert pour APP */}
              <span className={`text-[9px] font-black px-2 py-0.5 rounded ${
                allQueries[sqlIndex].cat === 'ETL'
                  ? 'bg-pink-500/10 text-pink-500'
                  : 'bg-emerald-500/10 text-emerald-500'
              }`}>
                {allQueries[sqlIndex].cat === 'ETL' ? 'DATA_ENG' : 'APP_LOGIC'}
              </span>
            </div>
            <div className="text-white text-xs font-bold mb-3 uppercase tracking-tighter underline decoration-indigo-500/50">
              {allQueries[sqlIndex].title}
            </div>
            <code className="text-indigo-300 block text-sm leading-relaxed whitespace-pre-wrap scrollbar-hide">
              {allQueries[sqlIndex].code}
            </code>
          </div>
        </div>

        {/* "System Pulse" — indicateurs d'état du système */}
        <div className="bg-[#11141D] p-8 md:p-10 rounded-[40px] border border-white/5 shadow-xl">
          <h3 className="text-lg font-bold text-white uppercase italic mb-8 flex items-center gap-3 text-indigo-400">
            <Activity size={20}/> System Pulse
          </h3>
          <div className="grid grid-cols-1 gap-4">
            {[
              {
                t: "Data Isolation",
                d: "inventory ↔ carpet_stock JOIN active",
                c: "text-amber-400",
                i: <ShieldCheck size={20}/>
              },
              {
                t: "Stock Alerts",
                d: "Threshold logic: stock <= 4",
                c: "text-emerald-400",
                i: <CheckCircle2 size={20}/>
              },
              {
                t: "Cloud Sync",
                d: "PostgreSQL Relational Stream",
                c: "text-blue-400",
                i: <Layers size={20}/>
              }
            ].map((step, idx) => (
              <div
                key={idx}
                className="flex items-center gap-5 p-4 bg-slate-950/50 rounded-2xl border border-white/5 hover:bg-slate-900 transition-all group cursor-default"
              >
                <div className={`w-12 h-12 rounded-xl bg-slate-950 flex items-center justify-center shrink-0 shadow-lg group-hover:scale-110 transition-transform ${step.c} border border-white/5`}>
                  {step.i}
                </div>
                <div>
                  <h4 className={`text-xs font-black uppercase tracking-widest ${step.c}`}>{step.t}</h4>
                  <p className="text-[10px] text-slate-500 italic uppercase font-bold mt-1">{step.d}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>


      {/* ── MODALE DE MISE À JOUR DE STOCK ───────────────────────────────
          Rendue conditionnellement uniquement quand selectedItem est défini.
          onClose remet selectedItem à null pour fermer la modale.
          onSave appelle handleUpdateStock puis recharge la page.
      ─────────────────────────────────────────────────────────────────── */}
      {selectedItem && (
        <StockModal
          item={selectedItem}
          onClose={() => setSelectedItem(null)}
          onSave={handleUpdateStock}
        />
      )}

    </div>
  );
};

export default HomeAdminView;