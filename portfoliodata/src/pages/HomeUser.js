import React from 'react';
// Importation du hook useNavigate pour gérer le routage programmatique avec React Router DOM
import { useNavigate } from 'react-router-dom'; 
// Importation des icônes Lucide-React pour illustrer les catégories de véhicules
import { History, Car, Sparkles } from 'lucide-react';

/**
 * Component: HomeUser
 * Description: Tableau de bord d'accueil pour l'espace client authentifié.
 * Rôle principal : Présenter de manière ergonomique les trois grands segments de catalogue 
 * (Collection, Youngtimer, Récentes) et router l'utilisateur vers son choix avec un pré-filtrage.
 * * @param {Object} props
 * @param {Object} props.session - Objet contenant les données de session de l'utilisateur (fourni par Supabase Auth)
 * @param {string} props.firstName - Prénom de l'utilisateur récupéré depuis son profil en base de données
 */
const HomeUser = ({ session, firstName }) => {
  // Initialisation du hook de navigation pour déclencher des redirections côté client
  const navigate = useNavigate(); 

  // Protection Fallback : Si le prénom n'est pas renseigné ou est nul, on affiche une valeur générique par défaut
  const displayFirstName = firstName || "PASSIONNÉ";

  /**
   * Handler: handleCategorySelect
   * Rôle: Déclenche la redirection vers l'espace catalogue en transmettant la catégorie choisie.
   * * Stratégie d'Architecture : Plutôt que de polluer l'URL publique avec un paramètre d'URL (ex: /catalogue?filter=Collection),
   * on utilise le 'state history' sous-jacent. Le composant ciblé (Catalogue) pourra extraire 
   * cette valeur de manière invisible via 'useLocation().state.filter'.
   * * @param {string} category - L'identifiant technique de la catégorie (ex: 'Collection', 'Youngtimer', 'Recente')
   */
  const handleCategorySelect = (category) => {
    navigate('/catalogue', { state: { filter: category } });
  };

  return (
    <div className="flex flex-col items-center justify-center p-6 space-y-12 animate-in fade-in duration-700">
      
      {/* =========================================================================
          SECTION TITRE & BIENVENUE PERSONNALISÉE (HERO BANNER)
          ========================================================================= */}
      <div className="text-center space-y-4">
        {/* Titre au look brutaliste moderne avec interpolation du prénom */}
        <h1 className="text-4xl md:text-6xl font-black italic uppercase leading-[0.9] tracking-tighter text-white">
          BONJOUR {displayFirstName}, <br />
          <span className="text-slate-500">BIENVENUE SUR VOTRE</span> ATELIER
        </h1>
        {/* Paragraphe d'accroche valorisant le positionnement de la marque */}
        <p className="max-w-2xl mx-auto text-slate-400 text-xs md:text-sm leading-relaxed font-medium">
          Nous sommes ravis de vous accueillir sur notre plateforme spécialisée dans la <br />
          commande de tapis sur mesure, parfaitement adaptés aux voitures 
          <span className="text-white font-bold ml-1">Récentes</span>, 
          <span className="text-white font-bold ml-1">Youngtimers</span> et de 
          <span className="text-white font-bold ml-1">Collection</span>.
        </p>
      </div>

      {/* =========================================================================
          GRILLE DES CATÉGORIES : ARCHITECTURE DES CARTES INTERACTIVES
          ========================================================================= */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-6xl">
        {/*
          Définition d'un tableau d'objets anonymes à la volée représentant les catégories.
          Cette approche évite de dupliquer du code JSX en utilisant une boucle d'itération (.map)
        */}
        {[
          { 
            title: "COLLECTION", 
            id: "Collection", 
            icon: <History />, 
            desc: "L'élégance du passé préservée.", 
            color: "text-blue-500" 
          },
          { 
            title: "YOUNGTIMER", 
            id: "Youngtimer", 
            icon: <Car />, 
            desc: "Le style iconique des années 80-90.", 
            color: "text-indigo-500" 
          },
          { 
            title: "RÉCENTES", 
            id: "Recente", 
            icon: <Sparkles />, 
            desc: "Précision et modernité absolue.", 
            color: "text-blue-400" 
          }
        ].map((item) => (
          /* Carte cliquable. L'attribut 'key' est obligatoire en React lors d'une boucle (.map) pour l'optimisation du DOM virtuel. */
          <div 
            key={item.title} 
            onClick={() => handleCategorySelect(item.id)}
            className="group cursor-pointer bg-slate-900/40 border border-white/5 p-10 rounded-[40px] hover:border-indigo-500/30 transition-all text-center md:text-left shadow-xl hover:shadow-indigo-500/5 active:scale-95"
          >
            {/* Conteneur d'icône. L'utilisation de la classe 'group-hover' de Tailwind permet d'animer l'icône dès que la souris entre dans la carte globale */}
            <div className={`${item.color} mb-6 group-hover:scale-110 transition-transform flex justify-center md:justify-start`}>
              {/* React.cloneElement permet de cloner l'élément SVG Lucide tout en lui injectant des props à la volée (ici, la dimension unifiée de 32px) */}
              {React.cloneElement(item.icon, { size: 32 })}
            </div>
            
            {/* Titre du segment */}
            <h3 className="text-lg font-black italic uppercase mb-2 tracking-tight text-white">
              {item.title}
            </h3>
            
            {/* Description marketing courte */}
            <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">
              {item.desc}
            </p>
          </div>
        ))}
      </div>

      {/* =========================================================================
          FOOTER / NOTE DE GUIDAGE UTILISATEUR
          ========================================================================= */}
      <div className="pt-8 border-t border-white/5 w-full max-w-xs text-center">
        <p className="text-slate-600 text-[9px] uppercase tracking-[0.2em] font-bold">
          Sélectionnez une catégorie pour commencer
        </p>
      </div>
    </div>
  );
};

export default HomeUser;