import React from 'react';

const BrandCard = ({ item, activeCategory, grandTotal, onSelectMarque }) => {
  // Calcul dynamique du nombre de modèles à afficher selon le filtre actif
  const displayCount = activeCategory === 'all' 
    ? (item.segments?.collection?.length || 0) + 
      (item.segments?.youngtimer?.length || 0) + 
      (item.segments?.recente?.length || 0)
    : (item.segments?.[activeCategory]?.length || 0);

  // Pour la barre de progression, on garde le total de la marque
  const totalForProgress = (item.segments?.collection?.length || 0) + 
                           (item.segments?.youngtimer?.length || 0) + 
                           (item.segments?.recente?.length || 0);

  // Formate le nom pour le logo (slugification simple)
  const logoName = item.marque
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, '');

  return (
    <div 
      onClick={onSelectMarque} 
      className="bg-[#11141D] p-8 md:p-10 rounded-[40px] border border-white/5 hover:border-indigo-500/40 cursor-pointer transition-all active:scale-95 shadow-2xl group relative overflow-hidden h-full flex flex-col justify-between"
    >
      {/* HEADER : LOGO & COMPTEUR */}
      <div className="flex justify-between items-start mb-10 relative z-10">
        <div className="bg-white rounded-[20px] p-3 w-20 h-20 flex items-center justify-center shadow-2xl shrink-0 overflow-hidden group-hover:scale-110 transition-transform duration-500">
          <img 
            src={`/assets/logos/${logoName}.png`} 
            onError={(e) => { 
              // Fallback si l'image locale est manquante
              e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(item.marque)}&background=f8fafc&color=0f172a&bold=true`; 
            }} 
            className="max-w-full max-h-full object-contain" 
            alt={item.marque} 
          />
        </div>
        <div className="text-right">
          <div className="text-3xl md:text-4xl font-black text-white italic leading-none transition-all duration-300">
            {displayCount}
          </div>
          <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-2">
            {displayCount > 1 ? 'Modèles' : 'Modèle'}
          </div>
        </div>
      </div>
      
      {/* CORPS : NOM & BARRE DE PROGRESSION */}
      <div className="relative z-10">
        <h4 className="text-2xl md:text-3xl font-black text-white uppercase truncate group-hover:text-indigo-400 transition-colors tracking-tight mb-6">
          {item.marque}
        </h4>
        
        <div className="h-2 w-full bg-slate-950 rounded-full overflow-hidden border border-white/5">
          <div 
            className="h-full bg-indigo-600 transition-all duration-1000" 
            style={{ width: `${grandTotal > 0 ? (totalForProgress / grandTotal) * 100 : 0}%` }}
          ></div>
        </div>
      </div>

      {/* EFFET VISUEL DE FOND */}
      <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-indigo-600/5 rounded-full blur-3xl group-hover:bg-indigo-600/20 transition-all duration-700"></div>
    </div>
  );
};

export default BrandCard;