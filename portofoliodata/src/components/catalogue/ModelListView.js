import React, { useState, useEffect } from 'react';
import { supabase } from '../../services/SupabaseClient';
import { ChevronLeft, Search, Car, ChevronRight, Heart, Medal } from 'lucide-react';
import { useFavorites } from '../../hooks/useFavorites';

const ModelListView = ({ brand, activeFilter, onModelSelect, onBack, session, onFilterChange }) => {
  const [models, setModels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAuthWarning, setShowAuthWarning] = useState(false);

  const { garageIds, toggleFavorite } = useFavorites(session?.user?.id);

  useEffect(() => {
    fetchModels();
  }, [brand]);

  const fetchModels = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('inventory')
      .select('*') 
      .eq('marque', brand)
      .order('year_start', { ascending: false });

    if (!error) setModels(data);
    setLoading(false);
  };

  const getBadgeConfig = (startDate) => {
    if (!startDate) return null;
    const year = new Date(startDate).getFullYear();
    const currentYear = 2026;

    if (year < currentYear - 30) {
      return { label: 'Collection', value: 'collection', color: 'text-amber-400', class: 'bg-amber-500/10 text-amber-500 border-amber-500/20' };
    }
    if (year < currentYear - 15) {
      return { label: 'Youngtimer', value: 'youngtimer', color: 'text-slate-300', class: 'bg-slate-500/10 text-slate-400 border-slate-500/20' };
    }
    return { label: 'Récente', value: 'recente', color: 'text-orange-700', class: 'bg-orange-700/10 text-orange-600 border-orange-700/20' };
  };

  const handleFavoriteClick = async (e, carId) => {
    e.stopPropagation();
    const result = await toggleFavorite(carId);
    
    if (result?.error === "AUTH_REQUIRED") {
      setShowAuthWarning(true);
      setTimeout(() => setShowAuthWarning(false), 3000);
    }
  };

  const filteredModels = models.filter(m => {
    const matchesSearch = m.modele_voiture?.toLowerCase().includes(searchTerm.toLowerCase());
    const badge = getBadgeConfig(m.year_start);
    const matchesFilter = !activeFilter || activeFilter === 'all' || badge?.value === activeFilter;

    return matchesSearch && matchesFilter;
  });

  return (
    <div className="space-y-8 relative">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <button 
          onClick={onBack}
          className="flex items-center gap-2 text-slate-500 hover:text-white transition-colors group"
        >
          <ChevronLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
          <span className="text-xs font-black uppercase tracking-widest">Retour aux marques</span>
        </button>

        <div className="relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-indigo-500 transition-colors" size={18} />
          <input 
            type="text"
            placeholder={`Rechercher une ${brand}...`}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-slate-900 border border-white/5 rounded-2xl py-3 pl-12 pr-6 text-white text-sm w-full md:w-80 focus:outline-none focus:border-indigo-500/50 transition-all"
          />
        </div>
      </div>

      {/* --- BARRE DE FILTRES --- */}
      <div className="bg-[#0F111A]/50 p-2 rounded-2xl border border-white/5 flex items-center gap-2 max-w-fit flex-wrap">
        {/* BOUTON TOUTES AVEC MÉDAILLE BLEUE */}
        <button 
          onClick={() => onFilterChange('all')}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all ${
            (!activeFilter || activeFilter === 'all')
            ? 'border-blue-500 bg-blue-500/10 shadow-[0_0_15px_rgba(59,130,246,0.1)]' 
            : 'border-white/5 bg-white/5 hover:border-white/10'
          }`}
        >
          <Medal size={14} className={(!activeFilter || activeFilter === 'all') ? 'text-blue-500' : 'text-slate-500'} fill="currentColor" />
          <span className={`text-[9px] font-black uppercase tracking-widest ${(!activeFilter || activeFilter === 'all') ? 'text-white' : 'text-slate-400'}`}>
            Toutes ({models.length})
          </span>
        </button>

        <CategoryBtn 
          active={activeFilter === 'recente'} 
          onClick={() => onFilterChange('recente')}
          color="text-orange-700" 
          label="Récentes"
        />
        <CategoryBtn 
          active={activeFilter === 'youngtimer'} 
          onClick={() => onFilterChange('youngtimer')}
          color="text-slate-300" 
          label="Youngtimer"
        />
        <CategoryBtn 
          active={activeFilter === 'collection'} 
          onClick={() => onFilterChange('collection')}
          color="text-amber-400" 
          label="Collection"
        />
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map(n => (
            <div key={n} className="h-24 bg-white/5 rounded-3xl animate-pulse" />
          ))}
        </div>
      ) : filteredModels.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredModels.map((model) => {
            const badge = getBadgeConfig(model.year_start);
            
            return (
              <div
                key={model.id}
                onClick={() => onModelSelect(model)}
                className="group relative flex items-center justify-between p-6 bg-[#11141D] border border-white/5 rounded-[32px] hover:border-indigo-500/50 hover:bg-indigo-500/5 transition-all duration-300 text-left cursor-pointer"
              >
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-slate-900 rounded-2xl text-slate-500 group-hover:text-indigo-400 transition-colors">
                    <Car size={24} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="text-white font-black uppercase italic group-hover:text-indigo-100 transition-colors">
                        {model.modele_voiture}
                      </h4>
                      {badge && (
                        <span className={`text-[8px] px-2 py-0.5 rounded-full border font-black uppercase tracking-tighter ${badge.class}`}>
                          {badge.label}
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tighter">
                      {model.year_start?.substring(0,4)} — {model.year_end?.substring(0,4) || 'Présent'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={(e) => handleFavoriteClick(e, model.id)}
                    className={`p-2 rounded-full transition-all relative z-10 ${
                      garageIds.has(model.id) 
                      ? 'text-rose-500 bg-rose-500/10' 
                      : 'text-slate-700 hover:text-rose-400 bg-white/5 hover:bg-white/10'
                    }`}
                  >
                    <Heart 
                      size={18} 
                      fill={garageIds.has(model.id) ? "currentColor" : "none"} 
                      className={garageIds.has(model.id) ? "animate-pulse" : ""}
                    />
                  </button>
                  <ChevronRight size={20} className="text-slate-700 group-hover:text-indigo-500 group-hover:translate-x-1 transition-all" />
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 px-6 bg-white/5 rounded-[40px] border border-dashed border-white/10 animate-in fade-in zoom-in-95 duration-500">
          <div className="p-5 bg-slate-900 rounded-full mb-6 text-slate-600">
            <Search size={40} strokeWidth={1.5} />
          </div>
          <h3 className="text-white font-black uppercase italic text-xl mb-2 tracking-tighter">
            Aucun résultat trouvé
          </h3>
          <p className="text-slate-500 text-xs font-bold uppercase tracking-widest text-center max-w-xs leading-relaxed">
            Nous n'avons pas trouvé de <span className="text-indigo-400">{brand}</span> 
            {activeFilter !== 'all' && activeFilter ? ` en catégorie ${activeFilter}` : ""} correspondant à votre recherche.
          </p>
          <button 
            onClick={() => {
              setSearchTerm('');
              onFilterChange('all');
            }}
            className="mt-8 px-8 py-3 bg-white text-black text-[10px] font-black uppercase tracking-[0.2em] rounded-full hover:bg-indigo-500 hover:text-white transition-all duration-300"
          >
            Réinitialiser la recherche
          </button>
        </div>
      )}

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

const CategoryBtn = ({ active, onClick, color, label }) => (
  <button 
    onClick={onClick}
    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all ${
      active 
      ? 'border-indigo-500 bg-indigo-500/10 shadow-[0_0_15px_rgba(79,70,229,0.1)]' 
      : 'border-white/5 bg-white/5 hover:border-white/10'
    }`}
  >
    <Medal size={14} className={`${color}`} fill="currentColor" />
    <span className={`text-[9px] font-black uppercase tracking-widest ${active ? 'text-white' : 'text-slate-400'}`}>
      {label}
    </span>
  </button>
);

export default ModelListView;