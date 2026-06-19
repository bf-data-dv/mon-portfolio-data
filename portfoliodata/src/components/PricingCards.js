import React from 'react';
// Collection d'icônes Lucide-React pour contextualiser visuellement le niveau de gamme de chaque carte
import { ShoppingCart, Star, ShieldCheck, Zap, Crown } from 'lucide-react';

/**
 * Component: PricingCards
 * Description: Grille comparative affichant les cartes de tarifs selon les finitions disponibles.
 * Rôle : Calcule dynamiquement le prix final cumulé (Base + Options actives) pour chaque niveau 
 * de finition et gère les événements de survol (hover) ainsi que l'ajout final au panier.
 * * @param {Object} props
 * @param {Object} props.selectedOptions - État des options cochées par l'utilisateur (ex: { rear: true, trunk: false })
 * @param {Function} props.onSelect - Callback déclenchée au clic sur le bouton d'achat, transmettant l'objet tier complet et son prix calculé
 * @param {Array<Object>} props.pricingData - Référentiel des prix bruts récupérés depuis la table PostgreSQL 'carpet_prices'
 * @param {Function} props.onHoverTier - Callback déclenchée lors du survol d'une carte pour synchroniser l'affichage dynamique global
 */
const PricingCards = ({ selectedOptions, onSelect, pricingData, onHoverTier }) => {
  
  /**
   * DICTIONNAIRE VISUEL (MAPPING CONFIGURATION)
   * Associe chaque clé 'nom_qualite' issue de la base de données à des assets UI statiques, 
   * des styles Tailwind spécifiques et des listes de caractéristiques techniques (Hardcoded Marketing Data).
   */
  const tierVisuals = {
    'Classique +': {
      description: "L'essentiel du sur-mesure",
      caracteristiques: ['Épaisseur 6mm', 'Moquette Aiguilletée', 'Talonnette de renfort'],
      icon: <Zap className="text-blue-400" size={24} />,
      color: 'border-blue-500/20',
      btnClass: 'bg-blue-600 hover:bg-blue-700'
    },
    'Confort': {
      description: 'Le meilleur rapport qualité/prix',
      caracteristiques: ['Épaisseur 9mm', 'Moquette Velours', 'Finition ganse textile'],
      icon: <Star className="text-indigo-400" size={24} />,
      color: 'border-indigo-500/40',
      btnClass: 'bg-indigo-600 hover:bg-indigo-700',
      popular: true // Déclenche l'affichage du badge "Recommandé" et l'effet visuel Ring (mise en avant)
    },
    'Prestige': {
      description: 'Élégance et durabilité accrue',
      caracteristiques: ['Épaisseur 11mm', 'Velours Tufté dense', 'Dos antidérapant premium'],
      icon: <ShieldCheck className="text-emerald-400" size={24} />,
      color: 'border-emerald-500/30',
      btnClass: 'bg-emerald-600 hover:bg-emerald-700'
    },
    'Excellence': {
      description: 'Le luxe ultime pour votre habitacle',
      caracteristiques: ['Épaisseur 13mm', 'Velours Haute Densité', 'Personnalisation totale'],
      icon: <Crown className="text-amber-400" size={24} />,
      color: 'border-amber-500/50',
      btnClass: 'bg-amber-600 hover:bg-amber-700'
    }
  };

  // --- GARDE DE SÉCURITÉ (LOADING STATE) ---
  // Si le fetch asynchrone parent n'a pas encore résolu les données de la table 'carpet_prices'
  if (!pricingData || pricingData.length === 0) {
    return <div className="text-center py-10 text-slate-500">Chargement des tarifs...</div>;
  }

  return (
    // Grille Responsive adaptative : 1 col (Mobile) -> 2 cols (Tablette) -> 4 cols (Écrans ultra-larges XL)
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
      {pricingData.map((tierData) => {
        
        // Extraction sécurisée des configurations visuelles correspondantes. 
        // Si le nom SQL ne matche pas le dictionnaire, un objet vide prévient les crashs d'exécution.
        const visual = tierVisuals[tierData.nom_qualite] || {};
        
        // --- LOGIQUE DE CALCUL DYNAMIQUE DU PRIX DE COMPOSITION ---
        // Sécurisation des types par transtypage explicite (Casting en type Number) pour éviter les concaténations de chaînes.
        const base = Number(tierData.prix_base);
        const extraRear = selectedOptions.rear ? Number(tierData.prix_arriere) : 0;
        const extraTrunk = selectedOptions.trunk ? Number(tierData.prix_coffre) : 0;
        
        // Somme cumulative finale calculée en temps réel selon les dépendances du composant parent
        const finalPrice = base + extraRear + extraTrunk;
        
        return (
          <div 
            key={tierData.nom_qualite} // Clé d'identification unique requise par le moteur de réconciliation de React
            onMouseEnter={() => onHoverTier && onHoverTier(tierData)} // Notifie le parent du survol actuel pour mettre à jour les aperçus d'options latéraux
            className={`relative flex flex-col p-6 rounded-[32px] bg-[#11141D] border-2 transition-all duration-300 hover:scale-[1.02] ${visual.color} ${
              visual.popular ? 'ring-2 ring-indigo-500 ring-offset-4 ring-offset-slate-950' : ''
            }`}
          >
            {/* BADGE FLOTTANT "RECOMMANDÉ" : Rendu conditionnel si l'attribut popular est présent */}
            {visual.popular && (
              <span className="absolute -top-4 left-1/2 -translate-x-1/2 bg-indigo-500 text-white text-[10px] font-black px-4 py-1 rounded-full uppercase tracking-widest">
                Recommandé
              </span>
            )}

            {/* SECTION 1 : ENTÊTE DE CARTE (ICÔNE ET LABELS DE FINITION) */}
            <div className="mb-6">
              <div className="mb-4 p-3 bg-white/5 w-fit rounded-2xl">
                {visual.icon}
              </div>
              <h4 className="text-xl font-black text-white uppercase italic">{tierData.nom_qualite}</h4>
              <p className="text-slate-500 text-xs font-medium mt-1 leading-relaxed">{visual.description}</p>
            </div>

            {/* SECTION 2 : AFFICHAGE DU PRIX CALCULÉ ET CONTEXTUALISATION DES TAXES */}
            <div className="mb-8 min-h-[64px]">
              {/* .whitespace-nowrap empêche les ruptures de ligne inesthétiques entre la valeur et le symbole € */}
              <div className="flex items-baseline gap-1 whitespace-nowrap">
                {/* .tracking-tighter resserre le crénelage des caractères pour un rendu de prix premium condensé */}
                <span className="text-2xl md:text-3xl xl:text-4xl font-black text-white tracking-tighter">
                  {finalPrice.toFixed(2)}€
                </span>
                <span className="text-slate-500 text-[10px] font-black uppercase tracking-tighter">
                  TTC
                </span>
              </div>
              
              {/* Label informatif indiquant au client la composition exacte du prix calculé */}
              <p className="text-[10px] text-indigo-400 font-bold uppercase mt-1 tracking-tight leading-none">
                {selectedOptions.rear || selectedOptions.trunk ? 'Options incluses' : 'Set avant uniquement'}
              </p>
            </div>

            {/* SECTION 3 : LISTE DES CARACTÉRISTIQUES TECHNIQUES DU PRODUIT */}
            {/* .flex-grow pousse automatiquement le bouton d'action vers le bas, alignant parfaitement toutes les cartes de la ligne */}
            <ul className="space-y-3 mb-8 flex-grow">
              {visual.caracteristiques?.map((feat) => (
                <li key={feat} className="flex items-center gap-3 text-[11px] font-bold text-slate-300 uppercase tracking-tight">
                  {/* Puce customisée au design de l'écosystème */}
                  <div className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                  {feat}
                </li>
              ))}
            </ul>

            {/* SECTION 4 : BOUTON D'ACTION (SÉLECTION ET ENVOI AU PANIER) */}
            <button
              onClick={() => onSelect(tierData, finalPrice)} // Exécute le callback en transmettant l'objet de tarification d'origine et son prix calculé
              className={`w-full py-4 rounded-2xl flex items-center justify-center gap-3 text-white font-black uppercase text-xs tracking-widest transition-all active:scale-95 ${visual.btnClass}`}
            >
              <ShoppingCart size={16} />
              Choisir {tierData.nom_qualite}
            </button>
          </div>
        );
      })}
    </div>
  );
};

export default PricingCards;