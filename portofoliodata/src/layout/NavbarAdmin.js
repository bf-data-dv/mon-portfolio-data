import React, { useState } from 'react';
// Importation du composant de routage pour gérer la navigation active
import { NavLink } from 'react-router-dom'; // Nettoyage : Link retiré pour supprimer le warning ESLint
// Collection d'icônes Lucide-React adaptées aux fonctionnalités d'un back-office (Back-office, Stocks, Profil)
import { 
  LogOut, 
  ChevronDown, 
  PlusCircle, 
  Layout, 
  LayoutDashboard,
  Menu,
  X,
  AlertCircle 
} from 'lucide-react';

/**
 * Component: NavbarAdmin
 * Description: Barre de navigation principale dédiée à la console d'administration.
 * Rôle : Gérer l'état des menus responsives (Desktop & Mobile), extraire les informations de profil
 * de la session Supabase, afficher visuellement l'onglet actif et centraliser la déconnexion de l'administrateur.
 * * @param {Object} props
 * @param {Object} props.session - Objet de session utilisateur actif (fourni par Supabase Auth)
 * @param {Function} props.onLogout - Callback déclenchant la déconnexion et la purge des tokens d'authentification
 */
const NavbarAdmin = ({ session, onLogout }) => {
  // --- ÉTATS (LOCAL STATES) ---
  const [isProfileOpen, setIsProfileOpen] = useState(false);     // Contrôle l'affichage du menu déroulant Profil (Desktop)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false); // Contrôle l'ouverture du menu de navigation plein écran (Mobile)

  /**
   * CONSTANTE DYNAMIQUE : displayName
   * Extrait le premier caractère de l'adresse e-mail de l'administrateur pour générer l'avatar.
   * Utilise une valeur de repli ('A' pour Admin) si la session n'est pas encore résolue.
   */
  const displayName = session?.user?.email?.charAt(0).toUpperCase() || 'A';

  /**
   * Method: handleNavClick
   * Rôle: Réinitialise l'état des menus lors d'un clic de navigation et force un retour au sommet de la page.
   * Améliore l'UX en évitant de conserver une page scrollée à moitié lors d'un changement d'onglet.
   */
  const handleNavClick = () => {
    setIsMobileMenuOpen(false);
    setIsProfileOpen(false);
    window.scrollTo(0, 0); // Reset du scroll vertical
  };

  return (
    <>
      {/* HEADER FIXE : Floutage de fond (backdrop-blur-md) et opacité à 80% pour un effet de transparence premium */}
      <nav className="h-20 bg-[#0A0C14]/80 backdrop-blur-md border-b border-white/5 sticky top-0 z-[50] px-4 md:px-6 flex items-center justify-between">
        
        {/* =========================================================================
            GAUCHE : IDENTITY BRANDING (LOGO CONSOLE)
            ========================================================================= */}
        <div className="flex items-center gap-4 flex-shrink-0">
          <h1 className="text-white font-black italic uppercase tracking-tighter text-xl">
            CONSOLE <span className="text-indigo-500">ADMIN</span>
          </h1>
        </div>

        {/* =========================================================================
            CENTRE : LIENS DE NAVIGATION PRINCIPALE (DESKTOP ONLY)
            ========================================================================= */}
        {/* Centrage absolu horizontal par rapport au viewport (.absolute.left-1/2.-translate-x-1/2) */}
        <div className="hidden md:flex items-center bg-white/5 border border-white/5 rounded-2xl p-1.5 gap-1 absolute left-1/2 -translate-x-1/2">
          <NavButton 
            to="/overview" 
            icon={<LayoutDashboard size={16} />} 
            label="Dashboard" 
            onClick={handleNavClick}
          />
          <NavButton 
            to="/add-product" 
            icon={<PlusCircle size={16} />} 
            label="Ajouter Découpe" 
            onClick={handleNavClick}
          />
          <NavButton 
            to="/alerts" 
            icon={<AlertCircle size={16} />} 
            label="Gestion Stock" 
            onClick={handleNavClick}
          />
          <NavButton 
            to="/" 
            icon={<Layout size={16} />} 
            label="Vue Client" 
            onClick={handleNavClick}
          />
        </div>

        {/* =========================================================================
            DROITE : PROFILE ACTION CONTROLS & DECLENCHEUR BURGER
            ========================================================================= */}
        <div className="flex items-center gap-2 md:gap-4 flex-shrink-0">
          
          {/* MENU DÉROULANT DE SESSION : (DESKTOP ONLY) */}
          <div className="relative hidden md:block">
            <button 
              onClick={() => setIsProfileOpen(!isProfileOpen)}
              className="flex items-center gap-3 p-1.5 pr-4 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all"
            >
              <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold text-xs shadow-lg shadow-indigo-500/20">
                {displayName}
              </div>
              <ChevronDown 
                size={14} 
                className={`text-slate-500 transition-transform duration-300 ${isProfileOpen ? 'rotate-180' : ''}`} 
              />
            </button>

            {/* CONTENEUR DROPDOWN PROFIL */}
            {isProfileOpen && (
              <>
                {/* Couche invisible d'arrière-plan servant à capturer les clics extérieurs (Click Away) pour refermer le menu */}
                <div className="fixed inset-0 z-[-1]" onClick={() => setIsProfileOpen(false)}></div>
                
                <div className="absolute top-full right-0 mt-3 w-64 bg-[#0F111A] border border-white/10 rounded-3xl shadow-2xl p-2 animate-in fade-in zoom-in-95 duration-200">
                  {/* Métadonnées de l'administrateur connecté */}
                  <div className="p-4 border-b border-white/5 mb-2">
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Session Admin</p>
                    <p className="text-xs text-white font-bold truncate mt-1">{session?.user?.email}</p>
                  </div>
                  
                  {/* Action d'interruption de session (Sign Out) */}
                  <button 
                    onClick={() => { onLogout(); setIsProfileOpen(false); }}
                    className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-red-500/10 text-red-500 transition-all group"
                  >
                    <LogOut size={18} className="group-hover:translate-x-1 transition-transform" />
                    <span className="text-[11px] font-black uppercase tracking-widest">Déconnexion</span>
                  </button>
                </div>
              </>
            )}
          </div>

          {/* DECLENCHEUR DU MENU MOBILE : Alterne dynamiquement entre l'icône Burger (Menu) et la croix (X) */}
          <button 
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden p-3 rounded-xl bg-white/5 border border-white/10 text-white transition-all active:scale-90"
          >
            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </nav>

      {/* =========================================================================
          OVERLAY DE NAVIGATION MOBILE FULLSCREEN (RENDU CONDITIONNEL)
          ========================================================================= */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-[100] bg-[#0A0C14] p-6 flex flex-col animate-in slide-in-from-right duration-300 md:hidden">
          
          {/* Entête du menu mobile */}
          <div className="flex justify-between items-center mb-10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-black italic">A</div>
                <span className="text-white font-black italic uppercase tracking-tighter text-xl">CONSOLE ADMIN</span>
              </div>
              <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 text-slate-400 active:rotate-90 transition-transform">
                <X size={32} />
              </button>
          </div>

          {/* Liste verticale des actions (Mobile) */}
          <div className="flex flex-col gap-4">
            <MobileNavButton 
              to="/overview" 
              icon={<LayoutDashboard size={24} />} 
              label="Dashboard" 
              onClick={handleNavClick} 
            />
            <MobileNavButton 
              to="/add-product" 
              icon={<PlusCircle size={24} />} 
              label="Ajouter Découpe" 
              onClick={handleNavClick} 
            />
            <MobileNavButton 
              to="/alerts" 
              icon={<AlertCircle size={24} />} 
              label="Gestion Stock" 
              onClick={handleNavClick} 
            />
            <MobileNavButton 
              to="/" 
              icon={<Layout size={24} />} 
              label="Vue Client" 
              onClick={handleNavClick} 
            />
          </div>

          {/* Section basse du menu mobile : Rappel de compte et bouton de déconnexion élargi */}
          <div className="mt-auto pt-10 border-t border-white/5">
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">Admin : {session?.user?.email}</p>
            <button 
              onClick={() => { onLogout(); setIsMobileMenuOpen(false); }}
              className="w-full flex items-center gap-4 p-5 rounded-2xl bg-red-500/10 text-red-500 transition-all active:scale-95"
            >
              <LogOut size={24} />
              <span className="text-lg font-black uppercase tracking-widest italic">Déconnexion</span>
            </button>
          </div>
        </div>
      )}
    </>
  );
};

// =========================================================================
// UNDER-COMPONENTS : CONTRÔLES INTERNES DE NAVIGATION
// =========================================================================

/**
 * Sub-component: NavButton (Desktop)
 * Rôle : Bouton de lien horizontal utilisant une fonction de callback de style de NavLink.
 * Évalue l'état `isActive` du routeur pour injecter à la volée l'arrière-plan Indigo et l'ombrage premium.
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
 * Sub-component: MobileNavButton (Mobile)
 * Rôle : Bouton vertical pleine largeur configuré avec un design et des typographies plus imposantes (text-lg) 
 * et une graisse de police lourde (font-black) pour faciliter les interactions tactiles sur smartphone.
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

export default NavbarAdmin;