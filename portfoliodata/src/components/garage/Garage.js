import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from '../../services/SupabaseClient';
import { Trash2, Car, Loader2, Plus, ArrowRight } from 'lucide-react';

/**
 * Composant Garage
 * Rôle : Affiche les véhicules favoris de l'utilisateur (Collection Privée).
 * Permet de consulter les détails et de supprimer un véhicule du garage (table 'user_garage').
 */
const Garage = ({ session, setActiveTab }) => {
  const [myCars, setMyCars] = useState([]);
  const [loading, setLoading] = useState(true);

  /**
   * MEMOISATION : useCallback garantit que la fonction fetchGarage est stable.
   * Cela évite les redéclenchements inutiles et satisfait les règles de dépendances d'useEffect.
   */
  const fetchGarage = useCallback(async () => {
    if (!session?.user?.id) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('user_garage')
        .select(`
          id,
          inventory (
            id, 
            marque, 
            modele_voiture
          )
        `)
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      console.log("Données reçues du garage:", data);
      setMyCars(data || []);
    } catch (error) {
      console.error("Erreur lors de la récupération du garage:", error.message);
    } finally {
      setLoading(false);
    }
  }, [session?.user?.id]);

  // 1. Chargement des données au montage du composant
  useEffect(() => {
    fetchGarage();
  }, [fetchGarage]);

  // 2. Fonction pour supprimer une voiture du garage
  const removeFromGarage = async (garageEntryId) => {
    try {
      const { error } = await supabase
        .from('user_garage')
        .delete()
        .eq('id', garageEntryId);

      if (error) throw error;

      setMyCars(prev => prev.filter(item => item.id !== garageEntryId));
    } catch (error) {
      alert("Erreur lors de la suppression du véhicule");
    }
  };

  // 3. État de chargement
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <Loader2 className="animate-spin text-indigo-500 mb-4" size={40} />
        <p className="text-slate-500 font-black uppercase tracking-widest text-[10px]">Ouverture de votre garage...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-10">
      
      {/* HEADER DU GARAGE */}
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-[2px] bg-indigo-500"></div>
            <span className="text-indigo-500 font-black uppercase tracking-[0.3em] text-[10px]">
              Collection Privée
            </span>
          </div>
          <h2 className="text-6xl md:text-7xl font-black italic uppercase tracking-tighter text-white">
            Mon <span className="text-indigo-500">Garage</span>
            <span className="text-white/20 ml-4">{myCars.length}</span>
          </h2>
        </div>

        <button 
          onClick={() => setActiveTab?.('catalogue')}
          className="group flex items-center gap-3 bg-white/5 hover:bg-indigo-600 border border-white/10 hover:border-indigo-500 px-8 py-4 rounded-2xl text-white transition-all duration-300"
        >
          <span className="font-black uppercase tracking-widest text-[10px]">Ajouter un modèle</span>
          <Plus size={16} className="group-hover:rotate-90 transition-transform" />
        </button>
      </div>

      {/* GRILLE DE RÉSULTATS */}
      {myCars.length === 0 ? (
        <div className="bg-[#0F111A] border-2 border-dashed border-white/5 rounded-[50px] p-20 text-center flex flex-col items-center">
          <div className="w-24 h-24 bg-white/5 rounded-full flex items-center justify-center mb-8">
            <Car className="text-slate-700" size={40} />
          </div>
          <h3 className="text-2xl font-black text-white uppercase italic mb-2">Votre garage est vide</h3>
          <p className="text-slate-500 text-sm mb-10 max-w-sm">
            Vous n'avez pas encore sélectionné de véhicules. Parcourez le catalogue pour constituer votre collection.
          </p>
          <button 
            onClick={() => setActiveTab?.('catalogue')}
            className="flex items-center gap-2 text-indigo-500 hover:text-white font-black uppercase tracking-[0.2em] text-[11px] transition-colors"
          >
            Explorer le catalogue <ArrowRight size={14} />
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
          {myCars.map((entry) => (
            <div 
              key={entry.id} 
              className="group bg-[#11141D] rounded-[40px] border border-white/5 overflow-hidden hover:border-indigo-500/40 transition-all duration-500 flex flex-col h-full shadow-2xl"
            >
              <div className="aspect-[16/10] overflow-hidden bg-slate-900 relative flex items-center justify-center">
                <Car size={48} className="text-white/10 group-hover:text-indigo-500/30 transition-colors duration-500" />
                <div className="absolute inset-0 bg-gradient-to-t from-[#11141D] to-transparent opacity-80"></div>
              </div>

              <div className="p-10 pt-4 flex-1 flex flex-col">
                <div className="mb-8">
                  <h4 className="text-3xl font-black text-white uppercase italic leading-none mb-2">
                    {entry.inventory?.marque || "Marque"}
                  </h4>
                  <p className="text-indigo-500 font-bold uppercase text-xs tracking-widest">
                    {entry.inventory?.modele_voiture || "Modèle"}
                  </p>
                </div>

                <div className="mt-auto pt-6 border-t border-white/5">
                  <button 
                    onClick={() => removeFromGarage(entry.id)}
                    className="w-full py-4 bg-white/5 hover:bg-red-500/10 text-slate-500 hover:text-red-500 rounded-2xl transition-all duration-300 flex items-center justify-center gap-3 group/btn"
                  >
                    <Trash2 size={16} className="group-hover/btn:rotate-12 transition-transform" />
                    <span className="font-black uppercase tracking-[0.2em] text-[9px]">Retirer du garage</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Garage;