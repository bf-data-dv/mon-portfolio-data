import React, { useState, useEffect } from 'react';
// Importation du client configuré pour communiquer avec l'API PostgreSQL de Supabase
import { supabase } from '../services/SupabaseClient';
// Importation d'icônes sémantiques issues du package lucide-react
import { Save, User as UserIcon } from 'lucide-react';

/**
 * Composant : Settings
 * Description : Page de gestion du profil utilisateur et de ses coordonnées de livraison.
 * * @param {Object} session - Objet d'authentification Supabase contenant le jeton (JWT) de l'utilisateur.
 * @param {string} firstName - Prénom actuel synchronisé avec l'application globale.
 * @param {Function} onProfileUpdate - Callback de notification permettant d'informer le composant parent (ex: App.js) 
 * qu'une modification a eu lieu afin de rafraîchir l'interface à chaud.
 */
const Settings = ({ session, firstName, onProfileUpdate }) => {
  // Flag d'état bloquant les interactions UI et les soumissions multiples pendant les requêtes réseau
  const [loading, setLoading] = useState(false);
  
  // Objet d'état structuré représentant le miroir exact des colonnes modifiables de la table 'profiles'
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    address_number: '',
    address_street: '',
    zip_code: '',
    city: ''
  });

  /**
   * CYCLE DE VIE : useEffect (Montage & Synchronisation)
   * * RESOLUTION DU WARNING ESLINT : La fonction de récupération 'getProfile' est encapsulée directement
   * à l'intérieur du hook. Cela isole son périmètre d'exécution et évite de la déclarer comme dépendance externe,
   * résolvant ainsi l'avertissement "react-hooks/exhaustive-deps".
   */
  useEffect(() => {
    async function getProfile() {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single(); // Utilisation de .single() car la relation Utilisateur <-> Profil est de type strict 1:1

      // Traitement des anomalies réseau ou de droits d'accès (RLS)
      if (error) {
        console.error("Erreur de récupération du profil :", error.message);
        return;
      }

      // Hydratation de l'état local avec repli (fallback) sur chaîne vide pour éviter qu'un input contrôlé React 
      // ne passe temporairement d'un état "undefined" (valeur nulle en BDR) à un état "defined".
      if (data) {
        setFormData({
          first_name: data.first_name || '',
          last_name: data.last_name || '',
          address_number: data.address_number || '',
          address_street: data.address_street || '',
          zip_code: data.zip_code || '',
          city: data.city || ''
        });
      }
    }

    // Sécurité : On n'exécute la requête de lecture que si l'identifiant unique de session est résolu
    if (session?.user?.id) {
      getProfile();
    }
  }, [session]); // Le hook s'exécute au montage et se synchronise uniquement si l'objet session change

  /**
   * GESTIONNAIRE D'ÉVÉNEMENT : handleUpdate
   * Déclenché lors de la soumission du formulaire. Transmet les données modifiées à Supabase Database.
   */
  const handleUpdate = async (e) => {
    e.preventDefault(); // Annulation du rechargement de page natif du navigateur HTML5
    setLoading(true);

    // Exécution de la requête de modification partielle (UPDATE) sur la table PostgreSQL
    const { error } = await supabase
      .from('profiles')
      .update(formData)
      .eq('id', session.user.id);

    // RESOLUTION DU WARNING ESLINT : Gestion explicite de la variable 'error' pour nettoyer le "no-unused-vars"
    if (!error) {
      alert("Profil mis à jour !");
      // Cycle de notification ascendant (Callback parent)
      if (onProfileUpdate) onProfileUpdate(); 
    } else {
      console.error("Échec de la mise à jour du profil :", error.message);
      alert("Une erreur est survenue lors de l'enregistrement.");
    }
    
    setLoading(false);
  };

  return (
    <div className="max-w-2xl mx-auto p-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Conteneur principal stylisé avec un floutage et des bordures translucides */}
      <div className="bg-slate-900/40 border border-white/5 rounded-[40px] p-8 md:p-12 shadow-2xl">
        
        {/* Entête de l'interface */}
        <div className="flex items-center gap-4 mb-8">
          <div className="p-3 bg-indigo-500/20 rounded-2xl text-indigo-400">
            <UserIcon size={24} />
          </div>
          <h2 className="text-2xl font-black italic uppercase tracking-tighter text-white">Mon Profil</h2>
        </div>

        <form onSubmit={handleUpdate} className="space-y-6">
          
          {/* CHAMP : ADRESSE EMAIL (Lecture seule / Sécurisé)
              Cette donnée provient directement du compte d'authentification (Supabase Auth Table) 
              et ne doit pas être altérée via le profil public. */}
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">Adresse Email</label>
            <input 
              type="text" 
              value={session?.user?.email} 
              disabled 
              className="w-full bg-white/5 border border-white/5 p-4 rounded-2xl text-slate-400 cursor-not-allowed text-sm"
            />
          </div>

          {/* GROUPE : IDENTITÉ */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">Prénom</label>
              <input 
                type="text" 
                required
                value={formData.first_name}
                // IMMUTABILITÉ DE L'ÉTAT : Utilisation du Spread Operator (...) pour dupliquer l'état existant 
                // et écraser uniquement la clé modifiée 'first_name'.
                onChange={(e) => setFormData({...formData, first_name: e.target.value})}
                className="w-full bg-slate-950 border border-white/10 p-4 rounded-2xl text-white focus:border-indigo-500 transition-all outline-none text-sm"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">Nom</label>
              <input 
                type="text" 
                value={formData.last_name}
                onChange={(e) => setFormData({...formData, last_name: e.target.value})}
                className="w-full bg-slate-950 border border-white/10 p-4 rounded-2xl text-white focus:border-indigo-500 transition-all outline-none text-sm"
              />
            </div>
          </div>

          {/* GROUPE : COORDONNÉES DE VOIE (Grille asymétrique 1col / 3col) */}
          <div className="grid grid-cols-4 gap-6">
            <div className="col-span-1 space-y-2">
              <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">N°</label>
              <input 
                type="text" 
                value={formData.address_number}
                onChange={(e) => setFormData({...formData, address_number: e.target.value})}
                className="w-full bg-slate-950 border border-white/10 p-4 rounded-2xl text-white focus:border-indigo-500 outline-none text-sm"
              />
            </div>
            <div className="col-span-3 space-y-2">
              <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">Rue</label>
              <input 
                type="text" 
                value={formData.address_street}
                onChange={(e) => setFormData({...formData, address_street: e.target.value})}
                className="w-full bg-slate-950 border border-white/10 p-4 rounded-2xl text-white focus:border-indigo-500 outline-none text-sm"
              />
            </div>
          </div>

          {/* GROUPE : LOCALISATION POSTALE */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">Code Postal</label>
              <input 
                type="text" 
                value={formData.zip_code}
                onChange={(e) => setFormData({...formData, zip_code: e.target.value})}
                className="w-full bg-slate-950 border border-white/10 p-4 rounded-2xl text-white focus:border-indigo-500 outline-none text-sm"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">Ville</label>
              <input 
                type="text" 
                value={formData.city}
                onChange={(e) => setFormData({...formData, city: e.target.value})}
                className="w-full bg-slate-950 border border-white/10 p-4 rounded-2xl text-white focus:border-indigo-500 outline-none text-sm"
              />
            </div>
          </div>

          {/* BOUTON D'ACTION PRINCIPAL (Verrouillé en cours de chargement asynchrone) */}
          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-black uppercase italic tracking-widest p-5 rounded-2xl transition-all flex items-center justify-center gap-3 shadow-xl shadow-indigo-600/20 mt-4 disabled:opacity-50 dynamic-btn"
          >
            <Save size={18} />
            {loading ? "Enregistrement..." : "Mettre à jour mon profil"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Settings;