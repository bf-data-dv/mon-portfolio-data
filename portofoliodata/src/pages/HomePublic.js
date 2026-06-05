import React, { useState } from 'react';
// Importation du client Supabase configuré pour interagir avec le BaaS (Backend-as-a-Service)
import { supabase } from '../services/SupabaseClient';
// Importation des icônes Lucide-React pour le branding "Tech/Data Engineering" de l'interface
import { 
  GraduationCap, 
  Briefcase, 
  Database, 
  Code2, 
  Layers, 
  Terminal, 
  LogIn, 
  UserPlus, 
  Eye, 
  EyeOff, 
  Loader2,
  FolderGit2,
  Cpu,
  ShieldCheck, 
  Globe 
} from 'lucide-react';

/**
 * Component: HomePublic
 * Description: Page d'accueil publique servant à la fois de Landing Page (Portfolio/CV) 
 * et de passerelle d'authentification (Gateway) pour l'espace d'administration.
 * * Spécificité technique : Ce composant est autonome et s'affranchit du contexte React Router 
 * pour éviter les erreurs de montage lors des redirections post-auth.
 */
const HomePublic = () => {
  // --- ÉTATS (STATES) DU COMPOSANT ---
  // isLogin: Permet de basculer l'interface du formulaire entre Connexion (true) et Inscription (false)
  const [isLogin, setIsLogin] = useState(true);
  // loading: Gère l'état de soumission asynchrone pour désactiver les boutons et afficher le spinner
  const [loading, setLoading] = useState(false);
  // Données du formulaire d'authentification
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  // showPassword: Gère la visibilité du mot de passe (Toggle type="text" / type="password")
  const [showPassword, setShowPassword] = useState(false);
  // error: Stocke le message d'erreur renvoyé par l'API Supabase pour l'afficher à l'utilisateur
  const [error, setError] = useState('');

  /**
   * Handler: handleAuth
   * Rôle: Gère la soumission du formulaire d'authentification auprès de Supabase Auth.
   * @param {Event} e - Événement natif de soumission de formulaire HTML
   */
  const handleAuth = async (e) => {
    e.preventDefault(); // Empêche le rechargement de page par défaut du navigateur
    setLoading(true);   // Active l'état visuel de chargement
    setError('');       // Réinitialise les erreurs précédentes
    
    try {
      // Déclenchement de la méthode Supabase appropriée selon le mode (Login vs SignUp)
      // Utilisation du Destructuring pour extraire directement l'objet 'user' et les erreurs d'API
      const { data: { user }, error: authError } = isLogin 
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password });
      
      // Si Supabase renvoie une erreur (ex: mauvais mot de passe), on lève une exception
      if (authError) throw authError;

      // REDIRECTION CRITIQUE : Si l'utilisateur est authentifié avec succès, on force une
      // redirection native. Cela garantit le rechargement propre de l'état global de l'application
      // et évite les conflits avec le contexte d'un Router React non initialisé à ce niveau.
      if (user) {
        window.location.href = '/'; 
      }

    } catch (err) {
      // Capture et assignation du message d'erreur pour affichage dans le composant
      setError(err.message);
    } finally {
      // S'exécute dans tous les cas : désactive le spinner de chargement
      setLoading(false);
    }
  };

  // Tableau d'objets statiques représentant la stack technique mise en valeur sur le portfolio
  const techStack = [
    { name: "React", icon: <Code2 size={16} />, color: "text-blue-400" },
    { name: "Java", icon: <Terminal size={16} />, color: "text-red-500" },
    { name: "Python", icon: <Terminal size={16} />, color: "text-yellow-500" },
    { name: "AWS S3", icon: <Layers size={16} />, color: "text-amber-500" },      
    { name: "AWS Lambda", icon: <Cpu size={16} />, color: "text-orange-400" },    
    { name: "AWS IAM", icon: <ShieldCheck size={16} />, color: "text-red-400" },
    { name: "PostgreSQL", icon: <Database size={16} />, color: "text-indigo-400" },
    { name: "Supabase", icon: <Database size={16} />, color: "text-emerald-400" },
    { name: "DBeaver", icon: <Layers size={16} />, color: "text-orange-500" },
    { name: "GitHub", icon: <FolderGit2 size={16} />, color: "text-white" },
    { name: "Vercel", icon: <Globe size={16} />, color: "text-slate-300" }
  ];

  return (
    <div className="min-h-screen bg-[#0A0C14] flex flex-col lg:flex-row font-sans">
      
      {/* =========================================================================
          SECTION GAUCHE : PRÉSENTATION PROFESSIONNELLE & PORTFOLIO (CV/Alternance)
          ========================================================================= */}
      <div className="lg:w-1/2 p-8 lg:p-20 flex flex-col justify-center text-white relative overflow-hidden">
        {/* Effet visuel d'arrière-plan (Glow effectindigo) */}
        <div className="absolute top-0 left-0 w-full h-full bg-indigo-600/5 blur-[120px] -z-10"></div>
        
        {/* Badge d'état avec puce animée (Ping) pour dynamiser l'UX */}
        <div className="mb-6 inline-flex items-center gap-2 px-4 py-2 bg-indigo-500/10 border border-indigo-500/20 rounded-full text-indigo-400 text-[10px] font-black uppercase tracking-[0.2em] w-fit">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
          </span>
          Profil Data Engineering
        </div>

        {/* Titre principal au design brutaliste/italique */}
        <h1 className="text-4xl lg:text-5xl font-black italic uppercase leading-none mb-6 tracking-tighter">
          CONCEPTEUR <br />
          <span className="text-indigo-500">SOLUTIONS DATA</span>
        </h1>

        {/* Accroche textuelle : Objectif professionnel (Recherche d'alternance) */}
        <p className="text-slate-400 text-sm leading-relaxed mb-10 max-w-lg italic border-l-2 border-indigo-500/30 pl-4">
          Passionné par l'architecture logicielle, le <span className="text-white font-bold">Cloud Computing</span> et l'exploitation des données (<span className="text-indigo-400 font-bold">Pipelines Python & Serveurless AWS</span>), je développe cet écosystème pour démontrer mon savoir-faire technique. Dans le cadre de ma future formation à la <span className="text-white font-bold">Wild Code School</span>, je suis activement à la recherche d'une <span className="text-indigo-400 font-bold">alternance</span> pour mettre mon expertise au service de vos défis data.
        </p>

        {/* Liste des atouts et diplômes clés */}
        <div className="space-y-6 text-slate-400 max-w-xl">
          {/* Atout 1 : Titre RNCP */}
          <div className="flex gap-5 items-start">
            <div className="p-3 bg-white/5 rounded-2xl border border-white/10 text-indigo-400 shrink-0">
              <GraduationCap size={20} />
            </div>
            <div>
              <h3 className="text-white font-bold uppercase text-[11px] tracking-widest">Titulaire RNCP 6</h3>
              <p className="text-[11px] mt-1 leading-relaxed opacity-80">
                Diplôme obtenu avec l'<strong>AFPA</strong>. Ce projet est une démonstration technique de mes capacités en architecture logicielle.
              </p>
            </div>
          </div>

          {/* Atout 2 : Recherche d'alternance */}
          <div className="flex gap-5 items-start">
            <div className="p-3 bg-white/5 rounded-2xl border border-white/10 text-emerald-400 shrink-0">
              <Briefcase size={20} />
            </div>
            <div>
              <h3 className="text-white font-bold uppercase text-[11px] tracking-widest">Alternance Data</h3>
              <p className="text-[11px] mt-1 leading-relaxed opacity-80">
                En formation à la <strong>Wild Code School</strong>, je recherche une alternance pour mettre mes compétences Data au service de votre entreprise.
              </p>
            </div>
          </div>
        </div>

        {/* Section Stack Technique : Itération sur le tableau des technos (Mapping) */}
        <div className="mt-12 pt-8 border-t border-white/5">
          <p className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-500 mb-6 italic text-left">Stack Technique & DevOps</p>
          <div className="flex flex-wrap gap-2.5 justify-start">
            {techStack.map((tech) => (
              <div 
                key={tech.name} 
                className="flex items-center gap-2 bg-white/5 px-3 py-2 rounded-xl border border-white/5 hover:border-indigo-500/30 hover:bg-indigo-500/5 transition-all group cursor-default"
              >
                {/* CloneElement injecte dynamiquement des props (ici la taille) dans l'icône SVG stockée dans l'objet */}
                <span className={`${tech.color} group-hover:scale-110 transition-transform`}>
                  {React.cloneElement(tech.icon, { size: 14 })}
                </span>
                <span className="text-[10px] font-black uppercase tracking-tight">{tech.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* =========================================================================
          SECTION DROITE : INTERFACE ET FORMULAIRE D'AUTHENTIFICATION (GATEWAY)
          ========================================================================= */}
      <div className="lg:w-1/2 flex items-center justify-center p-8">
        <div className="w-full max-w-md bg-slate-900/40 border border-white/5 p-10 rounded-[50px] backdrop-blur-3xl shadow-2xl">
          
          {/* Navigation par onglets (Tabs) : Permet de basculer l'état 'isLogin' */}
          <div className="flex bg-black/40 p-1.5 rounded-[22px] mb-10 border border-white/5">
            <button 
              type="button"
              onClick={() => setIsLogin(true)} 
              className={`flex-1 py-3.5 rounded-[18px] text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${isLogin ? 'bg-indigo-600 text-white shadow-xl' : 'text-slate-500 hover:text-slate-300'}`}
            >
              <LogIn size={14} /> Connexion
            </button>
            <button 
              type="button"
              onClick={() => setIsLogin(false)} 
              className={`flex-1 py-3.5 rounded-[18px] text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${!isLogin ? 'bg-indigo-600 text-white shadow-xl' : 'text-slate-500 hover:text-slate-300'}`}
            >
              <UserPlus size={14} /> Inscription
            </button>
          </div>

          {/* Formulaire d'envoi relié au handler d'authentification */}
          <form onSubmit={handleAuth} className="space-y-4 text-left">
            
            {/* Champ : E-mail */}
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase text-slate-500 ml-4">Identifiant Email</label>
              <input 
                type="email" 
                placeholder="votre@email.com" 
                className="w-full bg-slate-950 border border-white/5 rounded-2xl py-4 px-6 text-xs font-bold text-white outline-none focus:border-indigo-500/50 transition-all placeholder:text-slate-700"
                onChange={(e) => setEmail(e.target.value)} // Met à jour l'état email à chaque frappe
                required 
              />
            </div>

            {/* Champ : Mot de passe avec bouton toggle visibilité */}
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase text-slate-500 ml-4">Mot de passe</label>
              <div className="relative">
                <input 
                  type={showPassword ? "text" : "password"} // Bascule dynamique de type HTML
                  placeholder="••••••••" 
                  className="w-full bg-slate-950 border border-white/5 rounded-2xl py-4 px-6 text-xs font-bold text-white outline-none focus:border-indigo-500/50 transition-all placeholder:text-slate-700"
                  onChange={(e) => setPassword(e.target.value)} // Met à jour l'état password
                  required 
                />
                {/* Bouton de bascule de visibilité positionné en absolu à l'intérieur de l'input */}
                <button 
                  type="button" 
                  onClick={() => setShowPassword(!showPassword)} 
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-600 hover:text-slate-400"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Bloc d'affichage des erreurs conditionnel (Affiché uniquement si un message d'erreur existe) */}
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4">
                <p className="text-red-400 text-[10px] font-bold uppercase italic leading-tight text-center">{error}</p>
              </div>
            )}

            {/* Bouton de soumission : Se désactive automatiquement (disabled) si une requête est en cours */}
            <button 
              disabled={loading} 
              type="submit" 
              className="w-full bg-indigo-600 py-5 rounded-2xl text-white font-black uppercase tracking-[0.2em] text-[10px] hover:bg-indigo-500 transition-all flex justify-center shadow-lg shadow-indigo-600/20"
            >
              {/* Affichage conditionnel d'un spinner de chargement animé si loading === true */}
              {loading ? <Loader2 className="animate-spin" size={18} /> : (isLogin ? "Entrer dans l'Atelier" : "S'enregistrer")}
            </button>
          </form>

          {/* Footer de la carte avec mention légale et année figée pour la production */}
          <p className="mt-8 text-center text-slate-600 text-[9px] font-bold uppercase tracking-widest leading-relaxed">
            Infrastructure Cloud & Sécurité via Supabase <br />
            © 2026 — Portfolio Concepteur Solutions Data
          </p>
        </div>
      </div>
    </div>
  );
};

export default HomePublic;