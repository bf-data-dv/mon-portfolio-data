import React, { useState, useEffect, useCallback } from 'react';
// Importation du hook useNavigate de react-router-dom pour gérer les redirections et retours en arrière
import { useNavigate } from 'react-router-dom'; 
// Collection d'icônes Lucide-React pour enrichir l'UI (Branding premium, Automobile et E-commerce)
import { ArrowLeft, Check, Info, Car, Box, ChevronRight, Heart } from 'lucide-react';
// Composant enfant affichant les grilles de prix par niveau de qualité (ex: Confort, Luxe, Premium)
import PricingCards from '../components/PricingCards';
// Importation de l'instance du client Supabase pour exécuter les requêtes de données et de garage utilisateur
import { supabase } from '../services/SupabaseClient';

/**
 * Component: ProductPage
 * Description: Page de configuration produit dédiée à un modèle de véhicule spécifique.
 * Rôle : Charger dynamiquement l'état d'inventaire d'une voiture, évaluer sa disponibilité d'options,
 * calculer les suppléments tarifaires à la volée selon la finition survolée/choisie et soumettre l'élément final au panier.
 * * @param {Object} props
 * @param {string} props.modelName - Nom unique du modèle de voiture ciblé (passé par l'URL ou le parent)
 * @param {Function} props.addToCart - Callback globale permettant d'injecter la configuration finale dans le panier e-commerce
 * @param {Object} props.session - Session active de l'utilisateur (Supabase Auth) permettant la gestion du "Garage / Favoris"
 */
const ProductPage = ({ modelName, addToCart, session }) => { 
  const navigate = useNavigate(); 

  // --- ÉTATS (STATES) DU COMPOSANT ---
  const [modelData, setModelData] = useState(null);       // Stocke les caractéristiques techniques du véhicule (ex: marque, catégorie, options dispo)
  const [pricingData, setPricingData] = useState([]);     // Stocke le référentiel des prix de base et des options issus de la table 'carpet_prices'
  const [loading, setLoading] = useState(true);           // Indicateur de chargement global pour les appels asynchrones (Parallel Fetching)
  const [activeTier, setActiveTier] = useState(null);     // Suit en temps réel la gamme active (soit survolée via hover, soit sélectionnée par défaut)

  // Options de composition du pack (Tapis Arrière ou Tapis de Coffre) cochées par l'utilisateur
  const [options, setOptions] = useState({
    rear: false,
    trunk: false
  });

  const [isFavorite, setIsFavorite] = useState(false);        // Indicateur d'appartenance du véhicule aux favoris ("Garage") de l'utilisateur connecté
  const [showAuthWarning, setShowAuthWarning] = useState(false); // Flag déclenchant le Toast d'avertissement si interaction favoris hors-connexion

  /**
   * Effect : fetchPageData
   * Déclenchement : Dès que la prop 'modelName' change.
   * Rôle : Exécute des requêtes de lecture asynchrones en parallèle (Promise.all) pour minimiser la latence réseau.
   */
  useEffect(() => {
    const fetchPageData = async () => {
      setLoading(true);
      
      // Préparation de la requête Inventaire : Filtre strict sur le nom du modèle
      const modelRequest = supabase
        .from('inventory')
        .select('*')
        .eq('modele_voiture', modelName)
        .single(); // On attend une ligne unique

      // Préparation de la requête Tarification : Tri ascendant par prix de base
      const pricingRequest = supabase
        .from('carpet_prices')
        .select('*')
        .order('prix_base', { ascending: true });

      // Exécution simultanée des deux requêtes (Optimisation Data / Performance réseau)
      const [modelRes, pricingRes] = await Promise.all([modelRequest, pricingRequest]);

      if (!modelRes.error && modelRes.data) {
        setModelData(modelRes.data);
      }
      if (!pricingRes.error && pricingRes.data) {
        setPricingData(pricingRes.data);
        // UX : Recherche et applique la finition 'Confort' comme tier actif par défaut,
        // ce qui permet d'afficher des prix d'options cohérents dès le premier coup d'œil.
        const defaultTier = pricingRes.data.find(p => p.nom_qualite === 'Confort') || pricingRes.data[0];
        setActiveTier(defaultTier);
      }
      
      setLoading(false);
    };

    if (modelName) {
      fetchPageData();
    }
  }, [modelName]);

  /**
   * Method: checkIfFavorite
   * Rôle: Interroge la table de jointure 'user_garage' pour savoir si l'utilisateur connecté possède déjà ce véhicule.
   * Enveloppée dans useCallback pour stabiliser sa référence mémoire et résoudre le warning eslint.
   */
  const checkIfFavorite = useCallback(async () => {
    if (!session?.user?.id || !modelData?.id) return;

    const { data } = await supabase
      .from('user_garage')
      .select('id')
      .eq('user_id', session.user.id)
      .eq('car_id', modelData.id)
      .maybeSingle(); // Prévient les exceptions si aucune ligne n'est retournée
    
    if (data) setIsFavorite(true);
  }, [session?.user?.id, modelData?.id]);

  /**
   * Effect : Reset de scroll & Synchronisation Favoris
   * Rôle : Force le scroll vertical au sommet au montage et déclenche la vérification du statut favori ("Garage").
   */
  useEffect(() => {
    window.scrollTo(0, 0);
    if (session?.user?.id && modelData?.id) {
      checkIfFavorite();
    }
  }, [modelData, session, checkIfFavorite]);

  /**
   * Method: toggleFavorite
   * Rôle: Gère l'insertion (Ajout) ou la suppression (Retrait) du véhicule dans le garage de l'utilisateur.
   * Sécurité : Si l'utilisateur n'est pas connecté, affiche temporairement un avertissement (Toast).
   */
  const toggleFavorite = async () => {
    if (!session?.user?.id) {
      setShowAuthWarning(true);
      setTimeout(() => setShowAuthWarning(false), 3000); // Auto-destruction du Toast après 3 secondes
      return;
    }

    if (isFavorite) {
      // Cas Supprimer : Retrait de la ligne de jointure correspondante
      const { error } = await supabase
        .from('user_garage')
        .delete()
        .eq('user_id', session.user.id)
        .eq('car_id', modelData.id);
      if (!error) setIsFavorite(false);
    } else {
      // Cas Insérer : Liaison de l'user_id et de la car_id
      const { error } = await supabase
        .from('user_garage')
        .insert([{ user_id: session.user.id, car_id: modelData.id }]);
      if (!error) setIsFavorite(true);
    }
  };

  // --- ÉTATS DE SÉCURITÉ ET CHARGEMENT VISUEL (GARDS) ---
  if (loading) return <div className="min-h-[60vh] flex items-center justify-center text-white font-black uppercase italic tracking-widest animate-pulse">Chargement des données...</div>;
  if (!modelData) return <div className="min-h-[60vh] flex items-center justify-center text-white">Modèle introuvable.</div>;

  /**
   * Helper: checkExistence
   * Rôle: Interprète de manière ultra-flexible les flags de disponibilité issus de la base de données PostgreSQL.
   * Permet d'accepter des formats hétérogènes (booléens, chaînes de caractères "oui", entiers 1).
   * @param {*} value - La valeur du champ de base de données à tester
   */
  const checkExistence = (value) => {
    if (value === null || value === undefined) return false;
    const s = value.toString().toLowerCase().trim();
    return s === 'true' || s === '1' || s === 'oui' || s === 'ok';
  };

  /**
   * Helper: getDisplayOptionPrice
   * Rôle: Calcule dynamiquement le prix d'option à afficher à gauche de l'écran en fonction
   * de la gamme que l'utilisateur est en train de survoler (activeTier).
   * @param {string} type - 'rear' (Tapis Arrière) ou 'trunk' (Tapis de Coffre)
   */
  const getDisplayOptionPrice = (type) => {
    if (!activeTier) return "0.00";
    return type === 'rear' ? activeTier.prix_arriere : activeTier.prix_coffre;
  };

  return (
    <div className="animate-in fade-in duration-500 max-w-7xl mx-auto px-4 md:px-6 py-12 space-y-12 relative">
      
      {/* =========================================================================
          SECTION ENTÊTE PRODUIT : TITRE, COMPATIBILITÉ & BOUTON FAVORIS
          ========================================================================= */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end border-b border-white/10 pb-8 gap-6">
        <div className="flex items-start gap-6">
          {/* Bouton retour : Utilise l'index de navigation -1 pour renvoyer au catalogue */}
          <button 
            onClick={() => navigate(-1)} 
            className="p-4 bg-slate-900 rounded-full text-white border border-white/5 shadow-lg hover:bg-indigo-600 transition-all shrink-0"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <div className="flex items-center gap-2 text-indigo-500 mb-2">
              <Car size={16} />
              <span className="text-[10px] font-black uppercase tracking-[0.2em]">Sur-mesure Garanti</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-black italic uppercase tracking-tighter text-white leading-none">
              {modelData.marque} <span className="text-indigo-500">{modelData.modele_voiture}</span>
            </h1>
            {/* Extraction et formatage de la plage de production (Années) du véhicule */}
            <p className="text-slate-500 font-bold uppercase text-[10px] mt-4 tracking-widest bg-white/5 w-fit px-3 py-1 rounded-lg">
              {modelData.year_start?.substring(0,4)} — {modelData.year_end?.substring(0,4) || 'Présent'} • {modelData.categorie}
            </p>
          </div>
        </div>
        
        {/* Actions d'entête : Bouton Garage (Favoris) & Badge d'expertise technique */}
        <div className="flex items-center gap-4">
          <button
            onClick={toggleFavorite}
            className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all border ${
              isFavorite 
              ? 'bg-rose-500/10 border-rose-500 text-rose-500' 
              : 'bg-slate-900 border-white/5 text-slate-400 hover:text-white'
            }`}
          >
            <Heart size={18} fill={isFavorite ? "currentColor" : "none"} className={isFavorite ? "animate-pulse" : ""} />
            {isFavorite ? "Dans mon garage" : "Ajouter au garage"}
          </button>

          <div className="bg-emerald-500/10 border border-emerald-500/20 px-6 py-3 rounded-2xl hidden md:block text-right">
            <span className="text-emerald-500 text-[10px] font-black uppercase block mb-1">Expertise Technique</span>
            <span className="text-white font-bold text-sm">Gabarit vérifié 100%</span>
          </div>
        </div>
      </div>

      {/* =========================================================================
          ZONING DE CONFIGURATION : LOGIQUE DES OPTIONS VS SÉLECTION DES FINITIONS
          ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
        
        {/* COLONNE GAUCHE (4/12) : COMPOSITION DU PACK ET SÉLECTION DES ZONES */}
        <div className="lg:col-span-4 space-y-8">
          <section className="space-y-6">
            <h3 className="text-white font-black uppercase italic tracking-tight flex items-center gap-2">
              <Box size={18} className="text-indigo-500" />
              1. Composition du pack
            </h3>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between p-5 bg-white/5 border border-white/10 rounded-3xl opacity-60">
                <div className="flex items-center gap-3">
                  <Check size={18} className="text-emerald-500" strokeWidth={3} />
                  <span className="text-xs font-black uppercase text-white tracking-wide">Tapis Avant</span>
                </div>
                <span className="text-[9px] font-black uppercase text-slate-500 bg-slate-800 px-2 py-1 rounded">Inclus</span>
              </div>

              {(checkExistence(modelData.tapis_r1) || checkExistence(modelData.tapis_r2)) ? (
                <button 
                  onClick={() => setOptions({ ...options, rear: !options.rear })}
                  className={`w-full flex items-center justify-between p-5 border transition-all rounded-3xl ${
                    options.rear ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-500/20' : 'bg-slate-900 border-white/5 text-slate-500 hover:border-white/20'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-5 h-5 rounded-lg border flex items-center justify-center transition-colors ${options.rear ? 'bg-white border-white' : 'border-white/10'}`}>
                      {options.rear && <Check size={14} className="text-indigo-600" strokeWidth={4} />}
                    </div>
                    <span className="text-xs font-black uppercase tracking-wide">Tapis Arrière</span>
                  </div>
                  <div className="text-right">
                    <span className={`text-[11px] font-black block ${options.rear ? 'text-white' : 'text-slate-500'}`}>
                      +{getDisplayOptionPrice('rear')}€
                    </span>
                    <span className="text-[7px] uppercase font-bold opacity-50 block text-white/40 italic">Finition {activeTier?.nom_qualite}</span>
                  </div>
                </button>
              ) : (
                <div className="p-5 border border-dashed border-white/5 rounded-3xl opacity-30 flex justify-between items-center text-white">
                   {/* Fallback : Option indisponible pour ce gabarit précis */}
                   <span className="text-xs font-bold uppercase italic">Arrière non dispo</span>
                   <span className="text-[18px]">×</span>
                </div>
              )}

              {checkExistence(modelData.tapis_coffre) ? (
                <button 
                  onClick={() => setOptions({ ...options, trunk: !options.trunk })}
                  className={`w-full flex items-center justify-between p-5 border transition-all rounded-3xl ${
                    options.trunk ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-500/20' : 'bg-slate-900 border-white/5 text-slate-500 hover:border-white/20'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-5 h-5 rounded-lg border flex items-center justify-center transition-colors ${options.trunk ? 'bg-white border-white' : 'border-white/10'}`}>
                      {options.trunk && <Check size={14} className="text-indigo-600" strokeWidth={4} />}
                    </div>
                    <span className="text-xs font-black uppercase tracking-wide">Tapis Coffre</span>
                  </div>
                  <div className="text-right">
                    <span className={`text-[11px] font-black block ${options.trunk ? 'text-white' : 'text-slate-500'}`}>
                      +{getDisplayOptionPrice('trunk')}€
                    </span>
                    <span className="text-[7px] uppercase font-bold opacity-50 block text-white/40 italic">Finition {activeTier?.nom_qualite}</span>
                  </div>
                </button>
              ) : (
                <div className="p-5 border border-dashed border-white/5 rounded-3xl opacity-30 flex justify-between items-center text-white">
                   {/* Fallback : Option indisponible pour ce gabarit précis */}
                   <span className="text-xs font-bold uppercase italic">Coffre non dispo</span>
                   <span className="text-[18px]">×</span>
                </div>
              )}
            </div>

            <div className="p-4 bg-indigo-500/5 rounded-2xl border border-indigo-500/10">
              <div className="flex gap-3">
                <Info size={16} className="text-indigo-500 shrink-0 mt-0.5" />
                <p className="text-[10px] text-indigo-300/70 leading-relaxed font-medium uppercase">
                  Le pont milieu (tunnel central) est inclus gratuitement avec l'option Arrière.
                </p>
              </div>
            </div>
          </section>
        </div>

        {/* COLONNE DROITE (8/12) : INJECTION DES TARIFS ET LOGIQUE D'AJOUT PANIER */}
        <div className="lg:col-span-8 space-y-6">
          <h3 className="text-white font-black uppercase italic tracking-tight flex items-center gap-2 ml-4">
            <ChevronRight size={18} className="text-indigo-500" />
            2. Choose your finish
          </h3>
          
          <PricingCards 
            selectedOptions={options} 
            pricingData={pricingData}
            onHoverTier={(tier) => setActiveTier(tier)} 
            onSelect={(tier) => {
              // --- CALCUL STRICT DU PRIX TOTAL CONFIGURÉ ---
              const base = Number(tier.prix_base);
              const extraRear = options.rear ? Number(tier.prix_arriere) : 0;
              const extraTrunk = options.trunk ? Number(tier.prix_coffre) : 0;
              const finalPrice = base + extraRear + extraTrunk;

              // Structure unifiée du modèle pour l'écosystème Cart (Panier)
              const item = {
                // Clé primaire composite artificielle garantissant l'unicité de lignes distinctes configurées pour un même modèle
                id: `${modelData.id}-${tier.nom_qualite}-${options.rear ? 'R' : ''}${options.trunk ? 'T' : ''}`,
                brand: modelData.marque,
                modelName: modelData.modele_voiture,
                finish: tier.nom_qualite,
                basePrice: base,
                optionPrices: { 
                  rear: Number(tier.prix_arriere), 
                  trunk: Number(tier.prix_coffre) 
                },
                price: finalPrice,
                options: { ...options }, // Deep-cloning superficiel de l'état des options pour briser les références mémoires
                quantity: 1
              };
              addToCart(item); // Envoi au store ou state global parent
            }}
          />
        </div>
      </div>

      {/* =========================================================================
          OVERLAY / NOTIFICATION FLOTTANTE (TOAST CONTROLS)
          ========================================================================= */}
      {showAuthWarning && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[100] bg-indigo-600 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-4 animate-in fade-in slide-in-from-bottom-5 duration-300 border border-white/20">
          <div className="bg-white/20 p-2 rounded-lg">
            <Heart size={18} fill="white" />
          </div>
          <span className="text-[10px] font-black uppercase tracking-widest">Connectez-vous pour ajouter ce modèle au garage</span>
        </div>
      )}
    </div>
  );
};

export default ProductPage;