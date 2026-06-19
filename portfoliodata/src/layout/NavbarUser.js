import React, { useState } from 'react'; 
// Importation des utilitaires de routage pour gérer l'historique et les styles d'onglets actifs
import { NavLink, Link } from 'react-router-dom';
// Collection d'icônes Lucide-React pour l'expérience client standard (Panier, Accueil, Catalogue, Profil)
import { User, Settings, LogOut, ChevronDown, Home, Gauge, Library, Menu, X, ShoppingCart } from 'lucide-react';

/**
 * Component: NavbarUser
 * Description: Barre de navigation principale dédiée à l'espace utilisateur/client du site Tapis Auto.
 * Rôle : Gère l'accès aux pages vitrines (Accueil, Garage, Catalogue), affiche en temps réel le nombre
 * d'articles dans le panier, offre un menu de gestion de compte et prend en charge le responsive mobile.
 * 
 * @param {Object} props
 * @param {Object} props.session - Session utilisateur active transmise par l'authentification Supabase
 * @param {Function} props.onLogout - Callback gérant la déconnexion de l'utilisateur
 * @param {Function} props.resetCatalogue - Fonction de nettoyage permettant de réinitialiser les filtres du catalogue au clic
 * @param {number} props.cartCount - Nombre total d'articles présents dans le panier (valeur par défaut : 0)
 */
const NavbarUser = ({ 
  session, 
  onLogout,
  resetCatalogue,
  cartCount = 0 
}) => {
  // --- ÉTATS LOCAUX (LOCAL STATES) ---
  const [isProfileOpen, setIsProfileOpen] = useState(false);     // Déclencheur du menu déroulant Profil (Desktop)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false); // Déclencheur du tiroir de navigation (Mobile)

  /**
   * Method: handleNavClick
   * Rôle: Centralise les actions de routage. 
   * Si l'utilisateur clique sur le catalogue, appelle le reset des filtres pour offrir une vue propre.
   * Ferme les menus ouverts et force la fenêtre à remonter au sommet (Scroll to top).
   * 
   * @param {string} tabName - Identifiant de l'onglet cliqué (ex: 'catalogue', 'home')
   */
  const handleNavClick = (tabName) => {
    if (tabName === 'catalogue' && resetCatalogue) {
      resetCatalogue(); // Réinitialisation des états de filtrage du catalogue parent
    }
    setIsMobileMenuOpen(false); 
    setIsProfileOpen(false);
    window.scrollTo(0, 0); // Évite de charger la nouvelle vue au milieu de l'écran
  };

  /**
   * CONSTANTE DYNAMIQUE : displayName
   * Extrait la partie locale de l'adresse e-mail (avant le @) pour saluer l'utilisateur de manière personnalisée.
   * Se rabat sur "Utilisateur" si aucune session active n'est détectée.
   */
  const displayName = session?.user?.email?.split('@')[0] || "Utilisateur";

  return (
    <>
      {/* HEADER PRINCIPAL : Position collante (sticky top-0) avec effet de flou en arrière-plan (backdrop-blur-md) */}
      <nav className="h-20 bg-[#0A0C14]/80 backdrop-blur-md border-b border-white/5 sticky top-0 z-[50] px-4 md:px-6 flex items-center justify-between">
        
        {/* =========================================================================
            GAUCHE : LOGO ET IDENTITÉ BRANDING "TAPIS AUTO"
            ========================================================================= */}
        <Link 
          to="/"
          onClick={() => handleNavClick('home')}
          className="flex items-center gap-3 cursor-pointer group flex-shrink-0"
        >
          <div className="w-[50px] h-[50px] flex items-center justify-center overflow-hidden">
            <img 
              src="/assets/logos/tapis.png" 
              alt="Logo Tapis" 
              className="w-full h-full object-contain transition-transform group-hover:scale-110"
            />
          </div>
          <span className="text-white font-black italic uppercase tracking-tighter text-xl">
            Tapis<span className="text-indigo-500 underline decoration-2 underline-offset-4">AUTO</span>
          </span>
        </Link>

        {/* =========================================================================
            CENTRE : LIENS DE NAVIGATION PRINCIPALE (DESKTOP ONLY)
            ========================================================================= */}
        <div className="hidden md:flex items-center bg-white/5 border border-white/5 rounded-2xl p-1.5 gap-1 absolute left-1/2 -translate-x-1/2">
          <NavButton 
            to="/" 
            icon={<Home size={16} />} 
            label="Accueil" 
            onClick={() => handleNavClick('home')} 
          />
          <NavButton 
            to="/garage" 
            icon={<Gauge size={16} />} 
            label="Garage" 
            onClick={() => handleNavClick('garage')} 
          />
          <NavButton 
            to="/catalogue" 
            icon={<Library size={16} />} 
            label="Catalogue" 
            onClick={() => handleNavClick('catalogue')} 
          />
        </div>

        {/* =========================================================================
            DROITE : ACCÈS PANIER, COMPTE CLIENT ET CONTRÔLE BURGER
            ========================================================================= */}
        <div className="flex items-center gap-2 md:gap-4 flex-shrink-0">
          
          {/* BOUTON PANIER COMPORTANT LA BULLE DE NOTIFICATION DYNAMIQUE */}
          <Link 
            to="/panier"
            onClick={() => handleNavClick('panier')}
            className="relative p-3 rounded-xl bg-white/5 border border-white/10 text-slate-400 hover:text-white hover:bg-indigo-600/20 hover:border-indigo-500/30 transition-all group"
          >
            <ShoppingCart size={22} />
            {/* Rendu conditionnel du badge : Affiché uniquement si le panier contient au moins 1 article */}
            {cartCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-indigo-600 text-white text-[10px] font-black w-5 h-5 flex items-center justify-center rounded-full border-2 border-[#0A0C14] animate-in zoom-in duration-300">
                {cartCount}
              </span>
            )}
          </Link>

          {/* Séparateur vertical visuel (Desktop uniquement) */}
          <div className="hidden md:block w-px h-8 bg-white/5 mx-1" />

          {/* MENU COMPTE DROPDOWN (DESKTOP ONLY) */}
          <div className="relative hidden md:block">
            <button 
              onClick={() => setIsProfileOpen(!isProfileOpen)}
              className="flex items-center gap-3 p-1.5 pr-4 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all"
            >
              {/* Avatar basé sur la première lettre du nom d'affichage */}
              <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold text-xs uppercase">
                {displayName[0]}
              </div>
              <ChevronDown size={14} className={`text-slate-500 transition-transform ${isProfileOpen ? 'rotate-180' : ''}`} />
            </button>

            {isProfileOpen && (
              <>
                {/* Couche invisible interceptant les clics extérieurs pour refermer le menu (Click Away) */}
                <div className="fixed inset-0 z-[-1]" onClick={() => setIsProfileOpen(false)}></div>
                <div className="absolute top-full right-0 mt-3 w-64 bg-[#0F111A] border border-white/10 rounded-3xl shadow-2xl p-2 animate-in fade-in zoom-in-95 duration-200">
                  <p className="px-4 py-2 text-[8px] font-black text-slate-500 uppercase tracking-widest">Mon Espace</p>
                  {/* Injection du sous-composant de contenu partagé */}
                  <ProfileMenuContent handleNavClick={handleNavClick} onLogout={onLogout} />
                </div>
              </>
            )}
          </div>

          {/* DÉCLENCHEUR RESPONSIVE MOBILE (BOUTON BURGER) */}
          <button 
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden p-3 rounded-xl bg-white/5 border border-white/10 text-white"
          >
            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </nav>

      {/* =========================================================================
          TIROIR DE NAVIGATION MOBILE PLEIN ÉCRAN (RENDU CONDITIONNEL)
          ========================================================================= */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-[100] bg-[#0A0C14] p-6 flex flex-col animate-in slide-in-from-right duration-300 md:hidden">
          
          {/* Entête du tiroir mobile */}
          <div className="flex justify-between items-center mb-10">
              <div className="flex items-center gap-3">
                <img src="/assets/logos/tapis.png" alt="Logo" className="w-[40px] h-[40px] object-contain" />
                <span className="text-white font-black italic uppercase tracking-tighter text-xl">MENU</span>
              </div>
              <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 text-slate-400"><X size={32} /></button>
          </div>

          {/* Liste des boutons de navigation verticaux adaptés au tactile */}
          <div className="flex flex-col gap-4">
            <MobileNavButton to="/" icon={<Home size={24} />} label="Accueil" onClick={() => handleNavClick('home')} />
            <MobileNavButton to="/garage" icon={<Gauge size={24} />} label="Garage" onClick={() => handleNavClick('garage')} />
            <MobileNavButton to="/catalogue" icon={<Library size={24} />} label="Catalogue" onClick={() => handleNavClick('catalogue')} />
            
            {/* Rappel du panier au sein de la navigation mobile */}
            <MobileNavButton 
              to="/panier" 
              icon={<ShoppingCart size={24} />} 
              label={`Panier (${cartCount})`} 
              onClick={() => handleNavClick('panier')} 
            />
          </div>

          {/* Section basse : Informations de profil et actions de déconnexion */}
          <div className="mt-auto pt-10 border-t border-white/5">
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">Profil : {displayName}</p>
            <ProfileMenuContent handleNavClick={handleNavClick} onLogout={onLogout} isMobile />
          </div>
        </div>
      )}
    </>
  );
};

// =========================================================================
// UNDER-COMPONENTS : ENTRÉES DE MENUS ET CONTRÔLES INTERNES
// =========================================================================

/**
 * Sub-component: ProfileMenuContent
 * Rôle : Contenu factorisé pour les listes d'options du profil. 
 * Réduit la duplication en servant à la fois pour le dropdown Desktop et le pied de menu Mobile.
 */
const ProfileMenuContent = ({ handleNavClick, onLogout, isMobile }) => (
  <div className={isMobile ? "grid grid-cols-1 gap-2" : ""}>
    <Link 
      to="/settings"
      onClick={() => handleNavClick('settings')}
      className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-indigo-500/10 text-slate-300 hover:text-indigo-400 transition-all"
    >
      <User size={18} />
      <span className="text-[11px] font-black uppercase tracking-widest">Modifier Profil</span>
    </Link>
    
    <button className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 text-slate-400 transition-all">
      <Settings size={18} />
      <span className="text-[11px] font-black uppercase tracking-widest">Infos & Facturation</span>
    </button>
    
    {!isMobile && <div className="my-2 border-t border-white/5"></div>}
    
    <button 
      onClick={() => { onLogout?.(); }}
      className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-red-500/10 text-red-500 transition-all mt-2"
    >
      <LogOut size={18} />
      <span className="text-[11px] font-black uppercase tracking-widest">Déconnexion</span>
    </button>
  </div>
);

/**
 * Sub-component: NavButton (Boutons horizontaux Desktop)
 * Évalue la fonction dynamique `isActive` fournie par react-router-dom pour basculer 
 * l'affichage du style sélectionné (fond indigo avec ombre portée) ou inactif (slate neutre).
 */
const NavButton = ({ to, icon, label, onClick }) => (
  <NavLink 
    to={to} 
    onClick={onClick}
    className={({ isActive }) => 
      `flex items-center gap-2 px-6 py-2.5 rounded-xl transition-all ${
        isActive 
          ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' 
          : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
      }`
    }
  >
    {icon}
    <span className="text-[11px] font-bold uppercase tracking-widest">{label}</span>
  </NavLink>
);

/**
 * Sub-component: MobileNavButton (Boutons tactiles verticaux Mobile)
 * Utilise des dimensions accrues (p-5, text-lg) et des polices en italique gras (font-black italic) 
 * pour correspondre à la charte graphique agressive du back-office et faciliter le clic sur écran mobile.
 */
const MobileNavButton = ({ to, icon, label, onClick }) => (
  <NavLink 
    to={to} 
    onClick={onClick}
    className={({ isActive }) => 
      `flex items-center gap-4 w-full p-5 rounded-2xl transition-all ${
        isActive 
          ? 'bg-indigo-600 text-white shadow-xl' 
          : 'bg-white/5 text-slate-400'
      }`
    }
  >
    {icon}
    <span className="text-lg font-black uppercase tracking-widest italic">{label}</span>
  </NavLink>
);

export default NavbarUser;